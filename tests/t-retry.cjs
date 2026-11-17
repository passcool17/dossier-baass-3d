/* v0.3.1 — load failure UI. Blocks one GLB (container-b-v1.glb) on the first
 * load and checks that Réessayer is really VISIBLE (elementFromPoint at its
 * centre is the button, the screen is not a solid black fade), then unblocks
 * and clicks it: the game must reach __game.ready with the menu.
 * Usage: node tests/t-retry.cjs [url]   (412x915 and 915x412) */
const { chromium } = require('/workspace/tools3d/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8780/?t=retry';
const BLOCK = /container-b-v1\.glb/;
const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} ${JSON.stringify(detail || {}).slice(0, 300)}`);
}
async function run(browser, w, h) {
  const pre = `${w}x${h}.`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block', locale: 'fr-CA' });
  const page = await ctx.newPage();
  let block = true, blocked = 0;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.route(BLOCK, (route) => {
    if (block) { blocked++; return route.abort('internetdisconnected'); }
    return route.continue();
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // loadWithRetry tries 4 times with backoff: wait for the button.
  await page.waitForSelector('#bRetry:not(.hidden)', { timeout: 180000 });
  await page.waitForTimeout(400);
  const vis = await page.evaluate(() => {
    const b = document.getElementById('bRetry');
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const fade = document.getElementById('fade');
    const fo = fade ? +getComputedStyle(fade).opacity : 0;
    return { w: r.width, h: r.height, hit: top && (top.id || top.tagName), isBtn: top === b || b.contains(top), fadeOpacity: fo, msg: document.querySelector('#loading .load-sub')?.textContent };
  });
  ok(pre + 'retry.blockedRequests', blocked >= 1, { blocked });
  ok(pre + 'retry.buttonOnTop', vis.isBtn && vis.w >= 44 && vis.h >= 44, vis);
  ok(pre + 'retry.fadeCleared', vis.fadeOpacity < 0.05, vis);
  // Screen not solid black: sample the screenshot.
  await page.screenshot({ path: `/tmp/t-retry-${w}x${h}.png` });
  // Mean brightness and spread (ImageMagick): a solid fade is ~0 / ~0.
  const { execFileSync } = require('node:child_process');
  const [mean, sd] = execFileSync('magick', [`/tmp/t-retry-${w}x${h}.png`, '-colorspace', 'Gray', '-format', '%[fx:mean] %[fx:standard_deviation]', 'info:']).toString().trim().split(' ').map(Number);
  ok(pre + 'retry.notBlack', mean > 0.04 && sd > 0.02, { mean, sd });
  // Retry with the network back.
  block = false;
  await page.click('#bRetry');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 240000 });
  const after = await page.evaluate(() => ({ ready: __game.ready, version: __game.version, menu: !document.getElementById('menu').classList.contains('hidden'), loadingHidden: document.getElementById('loading').classList.contains('hidden') }));
  ok(pre + 'retry.recovers', after.ready && after.menu && after.loadingHidden, after);
  ok(pre + 'retry.noPageErrors', errors.length === 0, { errors });
  await ctx.close();
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--no-sandbox'] });
  try { await run(browser, 412, 915); await run(browser, 915, 412); } finally { await browser.close(); }
  const failed = results.filter((r) => !r.pass);
  console.log('SUMMARY ' + JSON.stringify({ total: results.length, failed: failed.length, failedNames: failed.map((r) => r.name) }));
  process.exit(failed.length ? 1 : 0);
})();
