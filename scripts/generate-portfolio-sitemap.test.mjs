import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildSitemap } from './generate-portfolio-sitemap.mjs';

const scriptUrl = new URL('./generate-portfolio-sitemap.mjs', import.meta.url);
const sitemapUrl = new URL('../portfolio/public/sitemap.xml', import.meta.url);

test('includes canonical page and available project URLs, omitting unavailable projects', () => {
  const xml = buildSitemap([
    { id: 123, category: 'website' },
    { id: 999, category: 'none' },
    { id: 456, category: 'game' },
  ]);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.deepEqual(urls, [
    'https://hillmanchan.com/',
    'https://hillmanchan.com/about',
    'https://hillmanchan.com/projects',
    'https://hillmanchan.com/contact',
    'https://hillmanchan.com/my-offer/services',
    'https://hillmanchan.com/my-offer/coaching',
    'https://hillmanchan.com/my-offer/coffee',
    'https://hillmanchan.com/project/123',
    'https://hillmanchan.com/project/456',
  ]);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.doesNotMatch(xml, /<lastmod>|<changefreq>|<priority>/);
});

test('CLI generates a nonempty main-domain sitemap outside the repository directory', () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, [scriptUrl.pathname], {
    cwd: '/tmp',
    stdio: 'pipe',
  }));

  const xml = readFileSync(sitemapUrl, 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.ok(urls.length > 7);
  assert.ok(urls.every((url) => {
    const parsed = new URL(url);
    return parsed.origin === 'https://hillmanchan.com' && !parsed.search && !parsed.hash;
  }));
  assert.match(xml, /<\/urlset>\s*$/);
});
