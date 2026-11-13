/**
 * Camera-relative movement and look for dossier-baass-3d v0.2.5.
 *
 * Stick / WASD: frozen-camera screen projection, up/right/down/left.
 * Look: real CDP touch on the right half (Input.dispatchTouchEvent), plus
 * mouse and an emulated Standard gamepad. Drag right → a point that was
 * straight ahead ends at NDC x < 0 (view turned right). Drag left → NDC x > 0.
 * Drag up → camPitch decreases (look up, non-inverted).
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
  if (extra.length > 320) extra = extra.slice(0, 320) + '…';
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
  return {
    ok: false,
    reason: !Number.isFinite(dx) ? 'nan' : (moved < min ? 'too small' : 'wrong sign/axis'),
    dx, dy, along, moved,
    alongLook: world && world.alongLook,
    alongRight: world && world.alongRight,
  };
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
    else if (zone === 'ramp') __game.setCamYaw(Math.PI / 2, 0.68);
    else __game.setCamYaw(Math.PI, 0.28);
    __game.clearCamera();
    document.getElementById('touch')?.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
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
  await sleep(50);
}

async function keyHold(page, key, holdMs) {
  // Drive the window listeners the game / shared module use, and also
  // Playwright's keyboard, then wait until the player actually moves.
  await page.evaluate((code) => {
    if (document.pointerLockElement) document.exitPointerLock();
    for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  }, key);
  await page.keyboard.down(key).catch(() => {});
  const start = await page.evaluate(() => ({ x: __game.player.x, z: __game.player.z }));
  const deadline = Date.now() + Math.max(holdMs, 500);
  let moved = false;
  while (Date.now() < deadline) {
    await sleep(40);
    const p = await page.evaluate(() => ({ x: __game.player.x, z: __game.player.z }));
    if (Math.hypot(p.x - start.x, p.z - start.z) > 0.18) {
      moved = true;
      await sleep(90);
      break;
    }
  }
  if (!moved) await sleep(220);
  await page.keyboard.up(key).catch(() => {});
  await page.evaluate((code) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  }, key);
  await sleep(50);
}

function worldAlong(before, after) {
  const yaw = before.camYaw;
  const lx = Math.sin(yaw), lz = Math.cos(yaw);
  const rx = -Math.cos(yaw), rz = Math.sin(yaw);
  const dwx = after.x - before.x, dwz = after.z - before.z;
  return {
    bx: before.x, bz: before.z, ax: after.x, az: after.z,
    camYaw: yaw, vis: after.vis,
    alongLook: dwx * lx + dwz * lz,
    alongRight: dwx * rx + dwz * rz,
  };
}

async function measureDir(page, dir, kind, holdMs) {
  const before = await poseAndScreen(page);
  if (kind === 'joy') await joyDrag(page, dir.sx, dir.sy, holdMs);
  else await keyHold(page, dir.key, holdMs);
  const after = await page.evaluate((b) => {
    const p = __game.player;
    // If height changed a lot (walking down the ramp), project the after
    // XZ at the BEFORE height so screen axes measure "into the scenery"
    // (toward the lab door, up in a correctly framed ramp view) rather
    // than "fell with the floor" under a frozen camera.
    const py = Math.abs(p.y - b.y) > 0.22 ? b.y : p.y;
    const s = __game.projectWithPose(p.x, py + 1.0, p.z, b.cam);
    return { x: p.x, y: p.y, z: p.z, sx: s.x, sy: s.y, vis: s.visible };
  }, { cam: before.cam, y: before.y });
  const dx = after.sx - before.sx;
  const dy = after.sy - before.sy;
  const world = worldAlong(before, after);
  world.vis = after.vis;
  const w = assertDir(dx, dy, dir, world);
  w.world = world;
  w.dist = Math.hypot(after.x - before.x, after.z - before.z);
  return w;
}

async function oneDir(page, dir, kind, holdMs, zone) {
  let w = await measureDir(page, dir, kind, holdMs);
  if (!w.ok && w.dist < 0.08) {
    if (zone) await place(page, zone);
    else {
      await page.evaluate(() => {
        __game.setPlayer(-16, 18);
        __game.setCamYaw(Math.PI, 0.28);
        __game.clearCamera();
      });
      await sleep(200);
    }
    w = await measureDir(page, dir, kind, Math.max(holdMs, 550));
    w.retried = true;
  }
  // Second retry for leftover key flakes on live Pages.
  if (!w.ok && w.dist < 0.08) {
    if (zone) await place(page, zone);
    await sleep(120);
    w = await measureDir(page, dir, kind, 650);
    w.retried = 2;
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

async function touchDrag(page, x0, y0, x1, y1, steps = 12) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: x0, y: y0, id: 1, radiusX: 6, radiusY: 6, force: 1 }],
    });
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{
          x: x0 + (x1 - x0) * t,
          y: y0 + (y1 - y0) * t,
          id: 1, radiusX: 6, radiusY: 6, force: 1,
        }],
      });
      await sleep(18);
    }
    await sleep(40);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await client.detach().catch(() => {});
  }
  await sleep(80);
}

async function aheadSample(page) {
  return page.evaluate(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    const p = __game.player;
    const yaw = __game.camYaw;
    const pitch = __game.camPitch;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const cam = __game.idealCameraPose();
    const ahead = __game.projectWithPose(p.x + fx * 8, p.y + 1.2, p.z + fz * 8, cam);
    return { ahead, yaw, pitch, p, cam, fx, fz };
  });
}

async function aheadAfter(page, before) {
  return page.evaluate((b) => {
    const s = __game.projectWithPose(b.p.x + b.fx * 8, b.p.y + 1.2, b.p.z + b.fz * 8, __game.idealCameraPose());
    return { s, yaw: __game.camYaw, pitch: __game.camPitch };
  }, before);
}

async function resetLook(page) {
  await page.evaluate(() => {
    __game.setPlayer(-20, 14);
    __game.setCamYaw(Math.PI, 0.28);
    if (document.pointerLockElement) document.exitPointerLock();
    __game.clearCamera();
  });
  await sleep(200);
}

async function testLook(page, results, prefix) {
  const vp = page.viewportSize();
  const x0 = vp.width * 0.72;
  const y0 = vp.height * 0.45;

  // --- CDP touch, drag right: ahead NDC x must go negative ---
  await resetLook(page);
  let before = await aheadSample(page);
  await touchDrag(page, x0, y0, x0 + 110, y0);
  let after = await aheadAfter(page, before);
  const right = {
    ok: after.s.x < 0 && after.s.x < before.ahead.x - 0.04,
    x0: before.ahead.x, x1: after.s.x, yaw0: before.yaw, yaw1: after.yaw,
    path: 'cdp-touch',
  };
  ok(results, prefix + 'look.touch.dragRight.aheadGoesLeft', right.ok, right);

  // --- CDP touch, drag left: ahead NDC x must go positive ---
  await resetLook(page);
  before = await aheadSample(page);
  await touchDrag(page, x0, y0, x0 - 110, y0);
  after = await aheadAfter(page, before);
  const left = {
    ok: after.s.x > 0 && after.s.x > before.ahead.x + 0.04,
    x0: before.ahead.x, x1: after.s.x, yaw0: before.yaw, yaw1: after.yaw,
    path: 'cdp-touch',
  };
  ok(results, prefix + 'look.touch.dragLeft.aheadGoesRight', left.ok, left);

  // --- CDP touch, drag up: pitch decreases (look up) ---
  await resetLook(page);
  before = await aheadSample(page);
  await touchDrag(page, x0, y0, x0, y0 - 90);
  after = await aheadAfter(page, before);
  const up = {
    ok: after.pitch < before.pitch - 0.03,
    pitch0: before.pitch, pitch1: after.pitch,
    path: 'cdp-touch',
  };
  ok(results, prefix + 'look.touch.dragUp.looksUp', up.ok, up);

  // --- mouse drag right (no pointer lock) ---
  await resetLook(page);
  await page.evaluate(() => {
    const el = document.getElementById('c');
    if (el) el.requestPointerLock = () => {};
  });
  before = await aheadSample(page);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 110, y0, { steps: 12 });
  await sleep(80);
  await page.mouse.up();
  await page.evaluate(() => { if (document.pointerLockElement) document.exitPointerLock(); });
  after = await aheadAfter(page, before);
  const mouse = {
    ok: after.s.x < 0 && after.s.x < before.ahead.x - 0.04,
    x0: before.ahead.x, x1: after.s.x, yaw0: before.yaw, yaw1: after.yaw,
    path: 'mouse',
  };
  ok(results, prefix + 'look.mouse.dragRight.aheadGoesLeft', mouse.ok, mouse);

  // --- emulated Standard gamepad, right stick right ---
  await resetLook(page);
  before = await aheadSample(page);
  await page.evaluate(() => {
    const pad = {
      id: 'qa-standard', index: 0, connected: true, mapping: 'standard',
      axes: [0, 0, 0.9, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    window.__joyPrevPads = navigator.getGamepads.bind(navigator);
    navigator.getGamepads = () => [pad];
  });
  await sleep(280);
  after = await aheadAfter(page, before);
  await page.evaluate(() => {
    if (window.__joyPrevPads) navigator.getGamepads = window.__joyPrevPads;
    delete window.__joyPrevPads;
  });
  const pad = {
    ok: after.s.x < 0 && after.s.x < before.ahead.x - 0.04,
    x0: before.ahead.x, x1: after.s.x, yaw0: before.yaw, yaw1: after.yaw,
    path: 'gamepad',
  };
  ok(results, prefix + 'look.gamepad.rightStick.aheadGoesLeft', pad.ok, pad);

  await page.evaluate(() => {
    __game.setCamYaw(Math.PI, 0.28);
    if (document.pointerLockElement) document.exitPointerLock();
  });
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

  await page.evaluate(() => {
    __game.setPlayer(-16, 18);
    __game.setCamYaw(Math.PI, 0.28);
    __game.clearCamera();
  });
  await sleep(250);
  await runDirs(page, results, prefix + 'handoff', 360, null);

  await testLook(page, results, prefix);

  for (const zone of ZONES) {
    const hold = (zone === 'lab' || zone === 'ramp' || zone === 'entrance') ? 360 : 380;
    if (zone === 'ramp') {
      await place(page, 'ramp');
      const hud = await page.evaluate(() => document.getElementById('hudZone')?.textContent);
      ok(results, prefix + 'ramp.hud', hud === 'Rampe', { hud });
    }
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
