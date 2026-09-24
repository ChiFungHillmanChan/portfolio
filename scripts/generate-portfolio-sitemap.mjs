import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITE_ORIGIN = 'https://hillmanchan.com';
const STATIC_PATHS = [
  '/',
  '/about',
  '/projects',
  '/contact',
  '/my-offer/services',
  '/my-offer/coaching',
  '/my-offer/coffee',
];

export function buildSitemap(projects) {
  const paths = [
    ...STATIC_PATHS,
    ...projects.filter((project) => project.category !== 'none')
      .map((project) => `/project/${project.id}`),
  ];
  const entries = paths.map((path) => `  <url><loc>${new URL(path, SITE_ORIGIN).href}</loc></url>`);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const projects = JSON.parse(readFileSync(new URL('../portfolio/src/projectData.json', import.meta.url), 'utf8'));
  writeFileSync(new URL('../portfolio/public/sitemap.xml', import.meta.url), buildSitemap(projects));
}
