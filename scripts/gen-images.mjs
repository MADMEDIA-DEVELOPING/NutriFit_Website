/**
 * Rasterises the two SVG sources into the PNGs the platforms actually accept.
 *
 * `og.svg` is a perfectly good share card that no share surface will render:
 * Facebook, LinkedIn, X, Slack, Discord and WhatsApp all ignore SVG for
 * `og:image`, so a link to this site was previewing as a bare title with no
 * picture. Same story for the web manifest, which wants concrete 192 and 512
 * raster icons regardless of what the favicon does.
 *
 * Run it whenever the SVGs change:  npm run assets
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

/**
 * `og.svg` sets `font-family: Inter, Segoe UI, sans-serif`. Inter is a webfont
 * and is not installed on the machine doing the rendering, so resvg is pointed
 * at the system font directory and lands on the next name in the stack rather
 * than on its own default, which would be a serif.
 */
const fontOptions = {
  loadSystemFonts: true,
  defaultFontFamily: 'Segoe UI',
};

async function render(source, out, width) {
  const svg = await readFile(join(publicDir, source), 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: fontOptions,
    background: 'rgba(7, 11, 20, 1)',
  });
  const png = resvg.render().asPng();
  await writeFile(join(publicDir, out), png);
  console.log(`${out.padEnd(24)} ${width}px  ${(png.length / 1024).toFixed(1)} kB`);
}

// 1200x630 is the size every share surface crops against; og.svg is authored
// at exactly that ratio so the width is all that needs stating.
await render('og.svg', 'og.png', 1200);

// Manifest icons and the iOS home-screen icon, all from the square logo.
await render('logo.svg', 'icon-192.png', 192);
await render('logo.svg', 'icon-512.png', 512);
await render('logo.svg', 'apple-touch-icon.png', 180);
