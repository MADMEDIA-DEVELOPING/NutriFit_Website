/**
 * Turns the built SPA into a page that answers before JavaScript runs.
 *
 * Vite leaves `dist/index.html` as a shell: a `<div id="root">` and a script
 * tag. Google will render that eventually, but Bing, the social scrapers,
 * every RSS-shaped reader and the answer engines that increasingly sit between
 * a search and a click largely will not — and even Google indexes a rendered
 * page later and less confidently than a served one.
 *
 * So after the client build, `vite build --ssr` produces a Node-runnable copy
 * of the same React tree, this script renders it once, and the result is
 * written into the shell along with the `<head>` block, the JSON-LD graph,
 * `robots.txt`, `sitemap.xml` and the web manifest — all generated from
 * `src/lib/seo.ts`, which reads the same `content.ts` the page renders from.
 * Nothing here restates a fact that lives somewhere else.
 */

import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');

const bundle = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

/** Replaces the region between two HTML comment markers, markers included. */
function replaceRegion(html, name, replacement) {
  const pattern = new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`);
  if (!pattern.test(html)) {
    throw new Error(`index.html is missing the <!--${name}--> region`);
  }
  return html.replace(pattern, replacement);
}

/** Replaces a single self-closing marker comment. */
function replaceMarker(html, name, replacement) {
  const marker = `<!--${name}-->`;
  if (!html.includes(marker)) {
    throw new Error(`index.html is missing the ${marker} marker`);
  }
  return html.replace(marker, replacement);
}

const shellPath = join(dist, 'index.html');
let html = await readFile(shellPath, 'utf8');

// The head block first: it carries the title, and a failure here should stop
// the build before anything has been written.
html = replaceRegion(html, 'seo:head', bundle.buildHeadTags());

const jsonLd = JSON.stringify(bundle.buildJsonLd());
html = replaceMarker(
  html,
  'seo:jsonld',
  `<script type="application/ld+json">${jsonLd}</script>`
);

const app = bundle.renderApp();
html = replaceMarker(html, 'seo:app', app);

await writeFile(shellPath, html, 'utf8');

const today = new Date().toISOString().slice(0, 10);
await writeFile(join(dist, 'robots.txt'), bundle.buildRobots(), 'utf8');
await writeFile(join(dist, 'sitemap.xml'), bundle.buildSitemap(today), 'utf8');
await writeFile(
  join(dist, 'site.webmanifest'),
  `${JSON.stringify(bundle.buildManifest(), null, 2)}\n`,
  'utf8'
);

// The SSR bundle exists only to be rendered once. Leaving it in the tree
// invites someone to deploy it.
await rm(ssrDir, { recursive: true, force: true });

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(
  `prerendered dist/index.html — ${kb(Buffer.byteLength(html))} total, ` +
    `${kb(Buffer.byteLength(app))} of it page text, ` +
    `${kb(Buffer.byteLength(jsonLd))} of JSON-LD`
);
console.log('wrote dist/robots.txt, dist/sitemap.xml, dist/site.webmanifest');
