/**
 * Generate topic-index.json from topics/*.html files.
 *
 * Usage:
 *   node scripts/generate-topic-index.mjs
 *   aws s3 cp topic-index.json s3://sa-classroom-data/topic-index.json
 */

import { readdir, readFile } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

const TOPICS_DIR = join(import.meta.dirname, '..', 'topics');
const INDEX_HTML = join(import.meta.dirname, '..', 'index.html');
const METADATA = join(import.meta.dirname, '..', 'topic-metadata.json');
const OUTPUT = join(import.meta.dirname, '..', 'topic-index.json');

async function main() {
  // Read curated metadata
  const metadataRaw = JSON.parse(await readFile(METADATA, 'utf-8'));
  const metadataMap = {};
  for (const m of metadataRaw) {
    metadataMap[m.id] = m;
  }

  // Read index.html to extract data-category mapping
  const indexHtml = await readFile(INDEX_HTML, 'utf-8');
  const categoryMap = {};
  const catRegex = /data-topic="topics\/([^"]+)"\s+data-category="([^"]+)"/g;
  let m;
  while ((m = catRegex.exec(indexHtml)) !== null) {
    categoryMap[m[1]] = m[2];
  }

  // Read all topic files
  const files = (await readdir(TOPICS_DIR)).filter(
    (f) => f.endsWith('.html') && f !== 'welcome.html'
  );

  const index = [];

  for (const file of files) {
    const html = await readFile(join(TOPICS_DIR, file), 'utf-8');

    // Extract <title>
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    const fullTitle = titleMatch ? titleMatch[1].trim() : '';

    // Split title: usually "English — 中文" or just the title
    let titleEn = '';
    let title = fullTitle;
    if (fullTitle.includes('—')) {
      const parts = fullTitle.split('—').map((s) => s.trim());
      titleEn = parts[0];
      title = parts[1] || parts[0];
    } else if (fullTitle.includes('-')) {
      // Some titles use dash
      titleEn = fullTitle;
      title = fullTitle;
    }

    // Extract <h1>
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    let h1 = '';
    if (h1Match) {
      // Strip HTML tags and emojis patterns from h1
      h1 = h1Match[1].replace(/<[^>]*>/g, '').trim();
    }

    // Extract <header><p> description
    const headerPMatch = html.match(
      /<header[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/
    );
    let description = '';
    if (headerPMatch) {
      description = headerPMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    // Extract tab names as keywords
    const keywords = [];
    const tabRegex = /class="tab-btn[^"]*"[^>]*>([\s\S]*?)<\/button>/g;
    let tabMatch;
    while ((tabMatch = tabRegex.exec(html)) !== null) {
      const tabText = tabMatch[1].replace(/<[^>]*>/g, '').trim();
      if (tabText) keywords.push(tabText);
    }

    // Extract AI Viber prompts
    // Each prompt-card has: <h4>title</h4> then <div class="prompt-text" id="promptN">...text...</div>
    // We match the prompt-text divs and look backward for the nearest <h4>
    const prompts = [];
    const promptTextRegex = /<h4>([\s\S]*?)<\/h4>\s*<div class="prompt-text"[^>]*>([\s\S]*?)<\/div>/g;
    let pMatch;
    while ((pMatch = promptTextRegex.exec(html)) !== null) {
      const promptTitle = pMatch[1].replace(/<[^>]*>/g, '').trim();
      let text = pMatch[2]
        .replace(/<span class="placeholder">/g, '')
        .replace(/<\/span>/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
      prompts.push({ title: promptTitle, text });
    }

    const category = categoryMap[file] || '';
    const url = `topics/${file}`;
    const id = file.replace('.html', '');
    const meta = metadataMap[id] || {};

    index.push({
      id,
      url,
      file,
      title,
      titleEn,
      h1,
      description,
      category,
      difficulty: meta.difficulty || 1,
      prerequisites: meta.prerequisites || [],
      leads_to: meta.leads_to || [],
      related: meta.related || [],
      tags: meta.tags || [],
      keywords,
      prompts,
    });
  }

  // Sort by filename for consistency
  index.sort((a, b) => a.file.localeCompare(b.file));

  await writeFile(OUTPUT, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`Generated ${OUTPUT} with ${index.length} topics.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
