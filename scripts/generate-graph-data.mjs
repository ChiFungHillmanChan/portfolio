/**
 * Generate graph-data.json — lightweight subset of topic-index for Knowledge Graph.
 *
 * Usage:
 *   node scripts/generate-graph-data.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const index = JSON.parse(await readFile(join(root, 'topic-index.json'), 'utf8'));

const graphData = index.map(t => ({
  id: t.id,
  title: t.titleEn || t.title,
  titleZh: t.h1 ? t.h1.replace(/&#x[\dA-Fa-f]+;&#xFE0F;\s?/g, '').replace(/&#x[\dA-Fa-f]+;\s?/g, '') : t.title,
  category: t.category,
  difficulty: t.difficulty,
  prerequisites: t.prerequisites,
  leads_to: t.leads_to,
  related: t.related,
  url: t.url,
}));

const output = join(root, 'graph-data.json');
await writeFile(output, JSON.stringify(graphData, null, 2), 'utf8');
console.log(`Generated ${output} (${(JSON.stringify(graphData).length / 1024).toFixed(1)} KB, ${graphData.length} nodes)`);
