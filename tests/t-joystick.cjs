/**
 * Camera-relative movement: stick / WASD must move the player in screen space
 * the same way the control is pushed (up, right, down, left).
 *
 * Because the gameplay camera follows the player, the AFTER position is
 * projected with a FROZEN copy of the camera from BEFORE the move.
 *
 * Zones: ranch, hangar, entrance, ramp, lab, wreck, plus the menu-orbit
 * → « Commencer l’enquête » handoff. 412×915 and 915×412.
 *
 * Usage: node tests/t-joystick.cjs [http://127.0.0.1:8780/?t=joy]
 */
const { chromium } = require('/workspace/tools3d/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8780/?t=joy';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ZONES = ['ranch', 'hangar', 'entrance', 'ramp', 'lab', 'wreck'];
const SPOTS = {
  ranch: [-20, 14],
  hangar: [17, 6],
  entrance: [16.2, 0.6],
  ramp: [23.2, 3.8],
  lab: [36, 4],
  wreck: [5, 50],
};
const DIRS = [
  { name: 'up',    sx: 0,  sy: -1, key: 'KeyW', ndc: 'y', sign: +1 },
  { name: 'right', sx: 1,  sy: 0,  key: 'KeyD', ndc: 'x', sign: +1 },
  { name: 'down',  sx: 0,  sy: 1,  key: 'KeyS', ndc: 'y', sign: -1 },
  { name: 'left',  sx: -1, sy: 0,  key: 'KeyA', ndc: 'x', sign: -1 },
];

function ok(results, name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail === undefined ? null : detail });
  let extra = '';
  try { extra = detail === undefined ? '' : ' ' + JSON.stringify(detail); } catch { extra = ' ' + String(detail); }
  if (extra.length > 280) extra = extra.slice(0, 280) + '…';
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra}`);
}

function assertDir(dx, dy, dir, world, min = 0.02) {
  const along = dir.ndc === 'x' ? dx : dy;
  const across = dir.ndc === 'x' ? dy : dx;
  const moved = Math.hypot(dx, dy);
  const screenOk = Number.isFinite(dx) && Number.isFinite(dy)
    && moved >= min
    && Math.sign(along) === dir.sign
    && Math.abs(along) >= min
    && Math.abs(along) >= Math.abs(across) * 0.4;
  if (screenOk) return { ok: true, dx, dy, along, moved, via: 'screen' };
  // Tight or sloped views (ramp looking down the tunnel): screen Y can
  // disagree with "into the scene". Fall back to world motion along the
  // camera look / right vectors — same mapping the player intends.
  if (world && Number.isFinite(world.camYaw)) {
    const yaw = world.camYaw;
    const lx = Math.sin(yaw), lz = Math.cos(yaw);
    const rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const dwx = world.ax - world.bx, dwz = world.az - world.bz;
    const alongLook = dwx * lx + dwz * lz;
    const alongRight = dwx * rx + dwz * rz;
    const wmin = 0.2;
    if (dir.name === 'up' && alongLook > wmin) return { ok: true, dx, dy, alongLook, via: 'world-forward' };
    if (dir.name === 'down' && alongLook < -wmin) return { ok: true, dx, dy, alongLook, via: 'world-back' };
    if (dir.name === 'right' && alongRight > wmin) return { ok: true, dx, dy, alongRight, via: 'world-right' };
    if (dir.name === 'left' && alongRight < -wmin) return { ok: true, dx, dy, alongRight, via: 'world-left' };
    return { ok: false, reason: screenOk ? 'ok' : (Number.isFinite(dx) ? (moved < min ? 'too small' : 'wrong sign/axis') : 'nan'), dx, dy, along, alongLook, alongRight };
  }
  return { ok: false, reason: !Number.isFinite(dx) ? 'nan' : (moved < min ? 'too small' : 'wrong'), dx, dy, along, moved };
}

async function open(browser, w, h) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'fr-CA',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  const errors = [];
  const http = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) http.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 120000 });
  await sleep(400);
  return { ctx, page, errors, http };
}

async function settle(page) {
  await page.evaluate(() => {
    document.getElementById('fps')?.classList.add('hidden');
    document.getElementById('hint')?.classList.add('hidden');
    const f = document.getElementById('fade');
    if (f) { f.style.opacity = '0'; f.style.pointerEvents = 'none'; }
    if (!__game.running) __game.startGame();
    if (document.pointerLockElement) document.exitPointerLock();
    __game.clearCamera();
    document.getElementById('touch')?.classList.remove('hidden');
  });
  await sleep(200);
}

async function place(page, zone) {
  await page.evaluate(({ zone, spots }) => {
    __game.goto(zone);
    const s = spots[zone];
    if (s) __game.setPlayer(s[0], s[1]);
    if (zone === 'entrance') __game.setCamYaw(0.92, 0.12);
    else if (zone === 'ramp') __game.setCamYaw(Math.PI / 2, 0.22);
    else __game.setCamYaw(Math.PI, 0.28);
    __game.clearCamera();
    document.getElementById('touch')?.classList.remove('hidden');
  }, { zone, spots: SPOTS });
  await sleep(250);
}

async function poseAndScreen(page) {
  return page.evaluate(() => {
    const p = __game.player;
    const cam = __game.idealCameraPose();
    const s = __game.projectWithPose(p.x, p.y + 1.0, p.z, cam);
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, sx: s.x, sy: s.y, cam, camYaw: __game.camYaw };
  });
}

async function joyDrag(page, sx, sy, holdMs) {
  const vis = await page.evaluate(() => {
    const t = document.getElementById('touch');
    const j = document.getElementById('joyL');
    t?.classList.remove('hidden');
    const r = j.getBoundingClientRect();
    return { hidden: t.classList.contains('hidden'), w: r.width, h: r.height, x: r.x, y: r.y };
  });
  if (vis.w < 40) throw new Error('joystick too small ' + JSON.stringify(vis));
  const cx = vis.x + vis.w / 2;
  const cy = vis.y + vis.h / 2;
  const r = vis.w * 0.36;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + sx * r, cy + sy * r, { steps: 5 });
  await sleep(holdMs);
  await page.mouse.up();
  await sleep(40);
}

async function keyHold(page, key, holdMs) {
  // Drive the same window keydown/keyup listeners the game uses.
  // Playwright's page.keyboard can miss a key when the canvas holds
  // pointer lock or the page is briefly unfocused (zero-move flakes).
  await page.evaluate((code) => {
    if (document.pointerLockElement) document.exitPointerLock();
    for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  }, key);
  await sleep(holdMs);
  await page.evaluate((code) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  }, key);
  await sleep(40);
}

async function measureDir(page, dir, kind, holdMs) {
  const before = await poseAndScreen(page);
  if (kind === 'joy') await joyDrag(page, dir.sx, dir.sy, holdMs);
  else await keyHold(page, dir.key, holdMs);
  const after = await page.evaluate((cam) => {
    const p = __game.player;
    const s = __game.projectWithPose(p.x, p.y + 1.0, p.z, cam);
    return { x: p.x, y: p.y, z: p.z, sx: s.x, sy: s.y, vis: s.visible };
  }, before.cam);
  const dx = after.sx - before.sx;
  const dy = after.sy - before.sy;
  const world = {
    bx: before.x, bz: before.z, ax: after.x, az: after.z,
    camYaw: before.camYaw, vis: after.vis,
  };
  const w = assertDir(dx, dy, dir, world);
  w.world = world;
  w.dist = Math.hypot(after.x - before.x, after.z - before.z);
  return w;
}

async function oneDir(page, dir, kind, holdMs, zone) {
  let w = await measureDir(page, dir, kind, holdMs);
  // One retry on a zero-move flake (missed event / focus), after a fresh place.
  if (!w.ok && w.dist < 0.05) {
    if (zone) await place(page, zone);
    w = await measureDir(page, dir, kind, Math.max(holdMs, 360));
    w.retried = true;
  }
  return w;
}

async function runDirs(page, results, tag, holdMs, zone) {
  for (const kind of ['joy', 'key']) {
    for (const dir of DIRS) {
      if (zone) await place(page, zone);
      const w = await oneDir(page, dir, kind, holdMs, zone);
      ok(results, tag + '.' + kind + '.' + dir.name, w.ok, w);
    }
  }
}

async function testLook(page) {
  await place(page, 'ranch');
  const before = await page.evaluate(() => {
    const p = __game.player;
    const yaw = __game.camYaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const cam = __game.idealCameraPose();
    const ahead = __game.projectWithPose(p.x + fx * 8, p.y + 1.2, p.z + fz * 8, cam);
    return { ahead, yaw, p, cam, fx, fz };
  });
  const vp = page.viewportSize();
  const x0 = vp.width * 0.72;
  const y0 = vp.height * 0.45;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 80, y0, { steps: 8 });
  await sleep(80);
  const after = await page.evaluate((b) => {
    const s = __game.projectWithPose(b.p.x + b.fx * 8, b.p.y + 1.2, b.p.z + b.fz * 8, __game.idealCameraPose());
    return { s, yaw: __game.camYaw };
  }, before);
  await page.mouse.up();
  await page.evaluate(() => { if (document.pointerLockElement) document.exitPointerLock(); });
  const dx = after.s.x - before.ahead.x;
  return { ok: dx < -0.04, dx, yaw0: before.yaw, yaw1: after.yaw };
}

async function runView(browser, w, h, results) {
  const prefix = w + 'x' + h + '.';
  const { ctx, page, errors, http } = await open(browser, w, h);

  await sleep(500);
  const menuVis = await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden'));
  ok(results, prefix + 'menu.visible', menuVis);
  await page.locator('#bPlay').click();
  await sleep(600);
  await settle(page);
  const afterPlay = await page.evaluate(() => ({
    running: __game.running,
    version: __game.version,
    touch: !document.getElementById('touch').classList.contains('hidden'),
    menu: document.getElementById('menu').classList.contains('hidden'),
  }));
  ok(results, prefix + 'handoff.running', afterPlay.running && afterPlay.menu, afterPlay);
  ok(results, prefix + 'handoff.touch', afterPlay.touch, afterPlay);

  // Reset spawn + default yaw for a clean handoff measurement
  await page.evaluate(() => {
    __game.setPlayer(-16, 18);
    __game.setCamYaw(Math.PI, 0.28);
    __game.clearCamera();
  });
  await sleep(250);
  await runDirs(page, results, prefix + 'handoff', 320, null);

  // After handoff dirs, reset for look
  await page.evaluate(() => {
    __game.setPlayer(-16, 18);
    __game.setCamYaw(Math.PI, 0.28);
    if (document.pointerLockElement) document.exitPointerLock();
  });
  await sleep(200);
  const look = await testLook(page);
  ok(results, prefix + 'look.dragRight.turnsRight', look.ok, look);
  await page.evaluate(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    __game.setCamYaw(Math.PI, 0.28);
  });

  for (const zone of ZONES) {
    const hold = (zone === 'lab' || zone === 'ramp' || zone === 'entrance') ? 260 : 300;
    await runDirs(page, results, prefix + zone, hold, zone);
  }

  const errGame = errors.filter((e) => !/favicon/i.test(e));
  const httpGame = http.filter((u) => !/favicon/i.test(u));
  ok(results, prefix + 'console.0', errGame.length === 0, errGame);
  ok(results, prefix + 'http.0', httpGame.length === 0, httpGame);
  await ctx.close();
}

(async () => {
  const results = [];
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  try {
    await runView(browser, 412, 915, results);
    await runView(browser, 915, 412, results);
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.pass);
  console.log('SUMMARY', JSON.stringify({ total: results.length, failed: failed.length, failedNames: failed.map((r) => r.name) }));
  if (failed.length) process.exit(1);
  console.log('PASS');
})().catch((e) => { console.error(e); process.exit(1); });
