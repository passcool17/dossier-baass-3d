#!/usr/bin/env node
// Per-zone perf for Dossier BAASS 3D (drives window.__game).
// Same Chrome and flags as /home/box/opt/perf3d/measure.mjs (that tool is
// coupled to __c204): /usr/bin/google-chrome --use-gl=angle --use-angle=gl,
// dpr 1, S20-like UA. Box GL = ANGLE / Mesa llvmpipe: NOT S20 FE fps.
// Usage: node tools/measure-zones.mjs '<url>' [--size 412x915] [--seconds 3] [--out f.json] [--shots dir]
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/workspace/tools3d/node_modules/playwright-core');

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--') && /^https?:/.test(a));
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const [W, H] = opt('size', '412x915').split('x').map(Number);
const seconds = +opt('seconds', '3');
const out = opt('out', '');
const shots = opt('shots', '');
const tag = opt('tag', 'v');
const UA = 'Mozilla/5.0 (Linux; Android 13; SM-G981W) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';

const VIEWS = [
  { id: 'ranch', label: 'Ranch', go: ['ranch'] },
  { id: 'hangar', label: 'Hangar', go: ['hangar'] },
  { id: 'entrance', label: 'Entrée du bunker', go: ['entrance'] },
  { id: 'ramp', label: 'Rampe', go: ['ramp'] },
  { id: 'lab', label: 'Laboratoire', go: ['lab'] },
  { id: 'lab-east', label: 'Laboratoire, regard est (couloir)', go: ['lab'], yaw: [Math.PI / 2, 0.3] },
  { id: 'servers', label: 'Serveurs', go: ['lab'], at: [56.4, 7.0], yaw: [-Math.PI / 2 + Math.PI, 0.3] },
  { id: 'cabinets', label: 'Classeurs', go: ['lab'], at: [47.6, 6.2], yaw: [Math.PI / 2, 0.3] },
  { id: 'wreck', label: 'Site de l’épave', go: ['wreck'] },
  { id: 'tr3b', label: 'TR-3B (vol stationnaire)', go: ['hangar'], at: [8, 0], yaw: [0, -0.35], tr3b: 'hover' },
];

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-precise-memory-info'],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'fr-CA', userAgent: UA, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [], http = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) http.push(r.status() + ' ' + r.url()); });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 180000 });
const version = await page.evaluate(() => __game.version);
await page.evaluate(() => {
  __game.startGame();
  document.getElementById('hint')?.classList.add('hidden');
});
if (shots) mkdirSync(shots, { recursive: true });
const rows = [];
for (const v of VIEWS) {
  await page.evaluate((v) => {
    __game.goto(v.go[0]);
    if (v.at) __game.setPlayer(v.at[0], v.at[1]);
    if (v.yaw) __game.setCamYaw(v.yaw[0], v.yaw[1]);
    __game.clearCamera();
    if (v.tr3b) __game.tr3bSnap(v.tr3b); else __game.tr3bSnap('gone');
    document.getElementById('hint')?.classList.add('hidden');
  }, v);
  await page.waitForTimeout(900);
  const s = await page.evaluate(async (ms) => {
    let maxC = 0, maxT = 0, n = 0;
    const fr = [];
    let last = performance.now();
    const t0 = last;
    await new Promise((res) => {
      const tick = (now) => {
        maxC = Math.max(maxC, __game.calls); maxT = Math.max(maxT, __game.tris);
        fr.push(now - last); last = now; n++;
        if (now - t0 >= ms) res(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    fr.sort((a, b) => a - b);
    const p95 = fr[Math.min(fr.length - 1, Math.ceil(fr.length * 0.95) - 1)];
    return { calls: __game.calls, tris: __game.tris, maxCalls: maxC, maxTris: maxT, fps: +(n * 1000 / ms).toFixed(1), frameP95: +p95.toFixed(1), char: __game.character && { state: __game.character.state, hidden: __game.character.hidden }, onScreen: __game.projectCharacter ? __game.projectCharacter().onScreen : null, zone: __game.zone };
  }, seconds * 1000);
  rows.push({ id: v.id, label: v.label, ...s });
  if (shots) await page.screenshot({ path: `${shots}/${tag}-${v.id}-${W}x${H}.png` });
}
const res = { url, version, size: `${W}x${H}`, gl: 'angle-gl (llvmpipe)', errors, http, rows, at: new Date().toISOString() };
if (out) writeFileSync(out, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res));
await browser.close();
