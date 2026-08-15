import { chromium } from 'playwright-core';

const EXECUTABLE =
  'C:/Users/IgnatMadalin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = process.env.SITE_URL ?? 'http://localhost:5177/';
const OUT = process.env.OUT_DIR ?? '.';

const SHOTS = [
  { name: '1-hero', selector: '#top' },
  { name: '2-trace', selector: '#trace' },
  { name: '3-scan', selector: '#scan' },
  { name: '4-explore', selector: '#explore' },
  { name: '5-social', selector: '#social' },
  { name: '6-coach', selector: '#coach' },
  { name: '7-pricing', selector: '#pricing' },
  { name: '8-footer', selector: '#footer' },
];

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: [
    // Software GL so WebGL works in a headless container/session with no GPU.
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const problems = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    problems.push(`[${msg.type()}] ${msg.text()}`);
  }
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });

// Wait for the loader to fade out — proof the WebGL scene produced a frame.
await page
  .waitForSelector('.loader--done', { timeout: 30_000 })
  .catch(() => problems.push('[fatal] loader never finished'));

await page.waitForTimeout(1500);

for (const shot of SHOTS) {
  const target = await page.$(shot.selector);
  if (!target) {
    problems.push(`[missing] ${shot.selector}`);
    continue;
  }
  await target.scrollIntoViewIfNeeded();
  // The scene damps toward its target pose; give it time to settle.
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${shot.name}.png` });
}

// Mid-transition frame, where acts overlap — the part most likely to look wrong.
await page.evaluate(() => {
  const scan = document.querySelector('#scan');
  const explore = document.querySelector('#explore');
  if (scan && explore) {
    window.scrollTo({ top: (scan.offsetTop + explore.offsetTop) / 2, behavior: 'instant' });
  }
});
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/9-transition.png` });

// Narrow viewport pass.
await page.setViewportSize({ width: 430, height: 932 });
await page.waitForTimeout(1200);
for (const shot of ['#top', '#scan', '#coach']) {
  const target = await page.$(shot);
  if (!target) continue;
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/mobile${shot.replace('#', '-')}.png` });
}

console.log(problems.length ? problems.join('\n') : 'no console errors');
await browser.close();
