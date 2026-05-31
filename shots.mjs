import { chromium } from 'playwright';

const BASE = 'http://localhost:5173/singularity-cards/';
const OUT = 'screenshots';

const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // New-game screen (clear any saved game first).
  await page.goto(BASE + '?seed=playtest', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.newgame');
  await page.screenshot({ path: `${OUT}/newgame-${vp.name}.png`, fullPage: true });

  // Start a game and capture the board.
  await page.getByRole('button', { name: /Begin/ }).click();
  await page.waitForSelector('.board');
  // Above-the-fold view (what you see without scrolling).
  await page.screenshot({ path: `${OUT}/board-${vp.name}-fold.png`, fullPage: false });
  // Full layout.
  await page.screenshot({ path: `${OUT}/board-${vp.name}.png`, fullPage: true });

  await ctx.close();
  console.log(`captured ${vp.name}`);
}
await browser.close();
console.log('done');
