/**
 * The prerender entry point.
 *
 * `npm run build` renders this once in Node and writes the result into
 * `dist/index.html`, so the served page carries its own text instead of an
 * empty `<div id="root">`. Google would eventually render the SPA anyway;
 * Bing, the social scrapers and the answer engines that now sit in front of
 * search largely would not.
 *
 * `renderToStaticMarkup`, not `renderToString`: the client throws this markup
 * away and mounts fresh rather than hydrating it, so the hydration bookkeeping
 * comments would be bytes nobody reads.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';

export function renderApp(): string {
  return renderToStaticMarkup(<App />);
}

export {
  buildHeadTags,
  buildJsonLd,
  buildManifest,
  buildRobots,
  buildSitemap,
} from './lib/seo';
