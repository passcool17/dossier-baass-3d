/* v0.3.2 — MANDATORY: all 8 evidence files reachable and collected with the
 * touch PAD ONLY (real CDP touch on #joyL, no teleport, no __game.collect).
 *  A. Reachability: __game.reachability() flood-fills the walkable grid with
 *     the game's own collideXZ; every file must be approachable within the
 *     pickup radius.
 *  B. Full run: start with a tap on « Commencer l'enquête », then for each
 *     file ask __game.navPath() for walkable waypoints (planning only) and
 *     steer the pad toward them, camera-relative (up = away from camera).
 *     Files are picked up by walking onto them (≤ 1.3 m) or a tap on
 *     « Collecter »; the evidence sheet is closed with a tap on « Continuer ».
 *     Asserts HUD « 8 / 8 » and the end screen, 0 page errors, 412x915 and
 *     915x412.
 * Usage: node tests/t-evidence.cjs [url] [--sizes 412x915,915x412] [--shots dir] */
const { chromium } = require('/workspace/tools3d/node_modules/playwright-core');
const fs = require('fs');
const args = process.argv.slice(2);
let BASE = 'http://127.0.0.1:8780/?t=ev', SIZES = ['412x915', '915x412'], SHOTS = '/tmp/t-evidence';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sizes') SIZES = args[++i].split(',');
  else if (args[i] === '--shots') SHOTS = args[++i];
  else BASE = args[i];
}
fs.mkdirSync(SHOTS, { recursive: true });
const ORDER = ['area-other', 'roswell-pio', 'roswell-debris', 'proj-engagement', 'area-materials', 'area-control', 'area-lift', 'area-spatial'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass });
  let d = ''; try { d = JSON.stringify(detail === undefined ? {} : detail); } catch {}
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} ${d.slice(0, 320)}`);
}

async function tapEl(page, client, sel) {
  const r = await page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width }; }, sel);
  if (!r || r.w < 2) return false;
  const pt = [{ x: r.x, y: r.y, id: 21, radiusX: 6, radiusY: 6, force: 1 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
  await sleep(40);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return true;
}

async function run(browser, size) {
  const [w, h] = size.split('x').map(Number);
  const pre = size + '.';
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, serviceWorkers: 'block', locale: 'fr-CA' });
  const page = await ctx.newPage();
  const errors = [], http = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) http.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 240000 });
  const client = await page.context().newCDPSession(page);
  await page.waitForSelector('#bPlay', { state: 'visible', timeout: 60000 });
  await sleep(700);
  await tapEl(page, client, '#bPlay');
  await page.waitForFunction(() => __game.running, null, { timeout: 30000 });
  await sleep(500);

  // A. reachability
  const reach = await page.evaluate(() => __game.reachability());
  const items = reach.filter((r) => r.id);
  for (const r of items) ok(pre + 'reach.' + r.id, r.reachable && r.visible, { zone: r.zone, minDist: r.minDist, radius: r.radius, at: [+r.x.toFixed(2), +r.z.toFixed(2)] });

  // B. pad-only run
  const pad = await page.evaluate(() => { document.getElementById('touch')?.classList.remove('hidden'); const r = document.getElementById('joyL').getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, r: r.width * 0.4 }; });
  const pt = (x, y) => [{ x, y, id: 7, radiusX: 8, radiusY: 8, force: 1 }];
  let down = false;
  const padTo = async (sx, sy) => {
    const x = pad.cx + sx * pad.r, y = pad.cy + sy * pad.r;
    if (!down) { await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(pad.cx, pad.cy) }); down = true; await sleep(16); }
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x, y) });
  };
  const padUp = async () => { if (down) { await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); down = false; } };
  const t0 = Date.now();
  let shotCollect = false;
  for (const id of ORDER) {
    const it = items.find((r) => r.id === id);
    const before = await page.evaluate(() => __game.collected.length);
    let plan = await page.evaluate(([x, z]) => __game.navPath(x, z), [it.x, it.z]);
    let wp = 1, lastP = null, lastMove = Date.now(), replans = 0, tapped = 0;
    const tItem = Date.now();
    let got = false;
    while (Date.now() - tItem < 420000) {
      const s = await page.evaluate(() => ({ p: __game.player, yaw: __game.camYaw, n: __game.collected.length, sheet: !document.getElementById('sheet').classList.contains('hidden'), act: !document.getElementById('bAct').classList.contains('hidden'), fx: __game.pickupFx, ended: !document.getElementById('result').classList.contains('hidden') }));
      if (s.n > before) {
        await padUp();
        if (!shotCollect) {
          await sleep(150);
          await page.screenshot({ path: `${SHOTS}/collect-${id}-${size}.png` });
          shotCollect = true;
        }
        // Close the evidence sheet with a tap on « Continuer ».
        for (let k = 0; k < 80; k++) {
          const open = await page.evaluate(() => !document.getElementById('sheet').classList.contains('hidden'));
          if (open) { if (k === 0 || k % 10 === 0) await page.screenshot({ path: `${SHOTS}/sheet-${id}-${size}.png` }); await tapEl(page, client, '#bSheetOk'); await sleep(300); const still = await page.evaluate(() => !document.getElementById('sheet').classList.contains('hidden')); if (!still) break; }
          else await sleep(150);
        }
        got = true; break;
      }
      const pth = plan.path;
      // Advance along the waypoints.
      while (wp < pth.length - 1 && Math.hypot(pth[wp][0] - s.p.x, pth[wp][1] - s.p.z) < 0.55) wp++;
      const target = pth[Math.min(wp, pth.length - 1)] || [it.x, it.z];
      const dx = target[0] - s.p.x, dz = target[1] - s.p.z, L = Math.hypot(dx, dz);
      if (wp >= pth.length - 1 && L < 0.5) {
        // At the file: tap « Collecter » if it did not auto-collect.
        await padUp();
        if (s.act && tapped < 3) { tapped++; await tapEl(page, client, '#bAct'); }
        await sleep(400);
        continue;
      }
      const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), rx = -Math.cos(s.yaw), rz = Math.sin(s.yaw);
      let sx = (dx * rx + dz * rz) / (L || 1), sy = -(dx * fx + dz * fz) / (L || 1);
      const k = L < 1.0 ? 0.55 : 1;
      await padTo(sx * k, sy * k);
      // Stuck → replan from where we are.
      if (!lastP || Math.hypot(s.p.x - lastP.x, s.p.z - lastP.z) > 0.08) { lastP = s.p; lastMove = Date.now(); }
      else if (Date.now() - lastMove > 6000 && replans < 6) {
        replans++; await padUp();
        plan = await page.evaluate(([x, z]) => __game.navPath(x, z), [it.x, it.z]); wp = 1; lastMove = Date.now();
      }
      await sleep(90);
    }
    await padUp();
    const st = await page.evaluate(() => ({ p: __game.player, zone: __game.zone, n: __game.collected.length }));
    ok(pre + 'pad.collect.' + id, got, { secs: Math.round((Date.now() - tItem) / 1000), replans, tapped, at: [+st.p.x.toFixed(2), +st.p.z.toFixed(2)], zone: st.zone, n: st.n });
    if (!got) break;
  }
  const hud = await page.evaluate(() => document.getElementById('hudEvidence').textContent.trim());
  await page.screenshot({ path: `${SHOTS}/hud-8of8-${size}.png` });
  ok(pre + 'hud.8of8', hud === '8 / 8', { hud });
  // End screen (needs the TR-3B sighting too; it flies over the hangar).
  let ended = false;
  for (let i = 0; i < 600 && !ended; i++) {
    ended = await page.evaluate(() => !document.getElementById('result').classList.contains('hidden'));
    if (!ended) await sleep(250);
  }
  await page.screenshot({ path: `${SHOTS}/end-8of8-${size}.png` });
  const fin = await page.evaluate(() => ({ body: document.getElementById('resBody').textContent, tr3b: __game.tr3bSeen, wreck: __game.wreckVisited }));
  ok(pre + 'end.screen', ended, fin);
  ok(pre + 'console.0', errors.length === 0, errors.slice(0, 5));
  ok(pre + 'http.0', http.length === 0, http.slice(0, 5));
  console.log(pre + 'run.seconds ' + Math.round((Date.now() - t0) / 1000));
  await client.detach().catch(() => {});
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--no-sandbox'] });
  try { for (const s of SIZES) await run(browser, s); } finally { await browser.close(); }
  const failed = results.filter((r) => !r.pass);
  console.log('SUMMARY ' + JSON.stringify({ total: results.length, failed: failed.length, failedNames: failed.map((r) => r.name) }));
  process.exit(failed.length ? 1 : 0);
})();
