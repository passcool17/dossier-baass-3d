/**
 * Camera-relative movement and look for dossier-baass-3d v0.3.0.
 *
 * v0.3.0: the pad is also driven with REAL CDP touch (Input.dispatchTouchEvent
 * on #joyL, kind 'touch') in every zone, both orientations. For touch the
 * world motion must match the finger: up = away from the camera (alongLook > 0),
 * right = camera-right, etc. The visible character must follow the player,
 * face the walking direction and leave Idle while moving. Camera clearance:
 * in Rampe / Lab / Serveurs, at 4 yaws, no wall closer than 0.25 m on the
 * camera's view axis (the v0.2.x lab view east sat inside a corridor frame).
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
// The box GPU is llvmpipe and shared: wait for real rendered frames, not ms.
const frames = (page, n = 3) => page.evaluate((n) => new Promise((r) => {
  let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f);
}), n);

const ZONES = ['ranch', 'hangar', 'entrance', 'ramp', 'lab', 'wreck'];
const TIGHT = { ramp: [22.5, 4], lab: [36, 4], servers: [56.4, 7.0], labroom: [50, 4], corridor: [33, 4], corridorMid: [30, 4] };
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
  // Walking toward a close camera skews the screen projection: fall back to
  // the camera-relative world direction (up = away from the camera).
  if (world && Number.isFinite(world.alongLook) && Number.isFinite(world.alongRight)) {
    const wx = dir.ndc === 'y' ? world.alongRight : world.alongLook;
    // dir.sign for 'y' is NDC (+1 = up = away from camera = alongLook > 0).
    const want = dir.ndc === 'y' ? world.alongLook * dir.sign : world.alongRight * dir.sign;
    if (want >= 0.15 && Math.abs(want) >= Math.abs(wx) * 1.2) return { ok: true, dx, dy, along, moved, via: 'world', alongLook: world.alongLook, alongRight: world.alongRight };
  }
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
  await sleep(150);
  await frames(page, 3);
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

/** Real finger on the pad: CDP touchStart at the pad centre, move, hold, end.
 *  Samples the character mid-hold (state / weights / facing). */
async function touchPadHold(page, sx, sy, holdMs) {
  const vis = await page.evaluate(() => {
    const t = document.getElementById('touch');
    t?.classList.remove('hidden');
    const r = document.getElementById('joyL').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (vis.w < 40) throw new Error('joystick too small ' + JSON.stringify(vis));
  const cx = vis.x + vis.w / 2, cy = vis.y + vis.h / 2, r = vis.w * 0.36;
  const client = await page.context().newCDPSession(page);
  let mid = null;
  try {
    const pt = (x, y) => [{ x, y, id: 7, radiusX: 8, radiusY: 8, force: 1 }];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(cx, cy) });
    for (let i = 1; i <= 5; i++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(cx + sx * r * i / 5, cy + sy * r * i / 5) });
      await sleep(16);
    }
    const start = await page.evaluate(() => __game.player);
    const t0 = Date.now();
    await sleep(Math.round(holdMs * 0.6));
    // Hold until the detective really walked ~0.45 m (slow shared GPU).
    for (;;) {
      mid = await page.evaluate(() => ({ ch: __game.character, p: __game.player }));
      if (Math.hypot(mid.p.x - start.x, mid.p.z - start.z) > 0.45 || Date.now() - t0 > 3000) break;
      await sleep(60);
    }
    await sleep(Math.round(holdMs * 0.2));
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await client.detach().catch(() => {});
  }
  await sleep(50);
  return mid;
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
  const deadline = Date.now() + Math.max(holdMs, 2500);
  let moved = false;
  while (Date.now() < deadline) {
    await sleep(40);
    const p = await page.evaluate(() => ({ x: __game.player.x, z: __game.player.z }));
    if (Math.hypot(p.x - start.x, p.z - start.z) > 0.3) {
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
  let mid = null;
  if (kind === 'joy') await joyDrag(page, dir.sx, dir.sy, holdMs);
  else if (kind === 'touch') mid = await touchPadHold(page, dir.sx, dir.sy, holdMs);
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
  if (kind === 'touch') {
    // Finger direction in the world: up = away from camera, right = camera-right.
    const want = { up: ['alongLook', 1], down: ['alongLook', -1], right: ['alongRight', 1], left: ['alongRight', -1] }[dir.name];
    const along = world[want[0]] * want[1];
    const across = Math.abs(world[want[0] === 'alongLook' ? 'alongRight' : 'alongLook']);
    w.worldOk = along > 0.05 && along >= across;
    // Character: follows the player, faces the motion, not Idle mid-move.
    const ch = mid && mid.ch;
    if (ch) {
      const mvYaw = Math.atan2(world.ax - world.bx, world.az - world.bz);
      let dyaw = Math.abs(((ch.yaw - mvYaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      w.charFollow = Math.hypot(ch.x - mid.p.x, ch.z - mid.p.z) < 0.01;
      w.charFacing = dyaw < 0.6;
      w.charState = ch.state;
      w.charMoving = ch.state !== 'idle' && ch.speed > 0.5;
      w.dyaw = +dyaw.toFixed(3);
    } else {
      w.charFollow = w.charFacing = w.charMoving = false;
    }
    w.ok = w.ok && w.worldOk && w.charFollow && w.charFacing && w.charMoving;
  }
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
  for (const kind of ['touch', 'joy', 'key']) {
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
  await sleep(200);
  await frames(page, 4);
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

  // Camera clearance in tight spots, 4 yaws each.
  for (const [name, spot] of Object.entries(TIGHT)) {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      await page.evaluate(({ spot, yaw, name }) => {
        __game.goto(name === 'ramp' ? 'ramp' : 'lab');
        __game.setPlayer(spot[0], spot[1]);
        __game.setCamYaw(yaw, name === 'ramp' ? 0.68 : 0.3);
        __game.clearCamera();
      }, { spot, yaw, name });
      await sleep(200);
      await frames(page, 4);
      const r = await page.evaluate(() => {
        const hits = [];
        for (const [x, y] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.6]]) {
          const h = __game.debugRay(x, y).find((q) => !['mesh_0', 'mesh_0_1', 'mesh_0_2', 'mesh_0_3', 'mesh_0_4', 'mesh_0_5', 'detective-hat', 'detective-coat'].includes(q.name));
          hits.push(h ? h.d : 99);
        }
        return { near: Math.min(...hits), hits, cam: __game.cameraPos, p: __game.player, ch: __game.character && __game.character.hidden };
      });
      // No near-plane cut: every probe hits geometry beyond the near plane,
      // and the view axis has at least 0.25 m of room (or the character).
      ok(results, prefix + 'camera.clear.' + name + '.' + yaw.toFixed(2), r.near > r.cam.near + 0.01 && r.hits[0] > 0.25, r);
    }
  }
  // Character on screen in open zones.
  for (const zone of ['ranch', 'hangar', 'wreck']) {
    await place(page, zone);
    await frames(page, 4);
    const r = await page.evaluate(() => ({ pc: __game.projectCharacter(), b: __game.characterBounds() }));
    const hgt = r.b ? r.b.max[1] - r.b.min[1] : 0;
    ok(results, prefix + 'character.visible.' + zone, r.pc.onScreen && r.b && r.b.visible && hgt > 1.4 && hgt < 2.2, { pc: r.pc, hgt });
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
