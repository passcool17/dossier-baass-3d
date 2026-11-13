/**
 * Shared virtual pad + move input for Arcade 3D (Three.js) and Arcade 2D (Phaser).
 * Framework-agnostic: no Three.js, no Phaser. One module, copied into each
 * game repo at publish time. Do not fork a private copy — fix it here.
 *
 * Sign convention (handled inside this module):
 *   Screen Y grows downward, but read().y = +1 means forward / stick-up / W.
 *   read().x = +1 means right / D. Values are in [-1, 1].
 *
 * Three.js camera (documented, exact):
 *   Camera sits at (px - sin(yaw)*hd, pz - cos(yaw)*hd) and looks at the
 *   player, so its look direction in XZ is (sin(yaw), cos(yaw)).
 *   Camera-right is (-cos(yaw), sin(yaw)).
 *   cameraRelative(x, y, yaw) returns world {x, z} where y=+1 walks away
 *   from the camera (forward on screen) and x=+1 walks camera-right.
 *
 * Phaser 2D:
 *   screenRelative2D(x, y) returns {x, y} with screen-up as -Y.
 */
export const VERSION = '1.0.1';

const DEFAULT_DEADZONE = 0.08;
const GAMEPAD_DEADZONE = 0.18;
const PAD_RADIUS = 0.42;

/** Stick / key axes in module space: y=+1 forward (already sign-corrected). */
export function padAxesFromDelta(dx, dy, max) {
  if (!(max > 0)) return { x: 0, y: 0 };
  let x = dx, y = dy;
  const len = Math.hypot(x, y);
  if (len > max) { x *= max / len; y *= max / len; }
  // Screen Y grows downward: up is negative dy → y = -dy/max = +1.
  return { x: x / max, y: -(y / max) };
}

/**
 * Camera-relative world motion for the Three.js third-person camera above.
 * @param {number} x  read().x  (+1 = camera right)
 * @param {number} y  read().y  (+1 = away from camera / forward on screen)
 * @param {number} yaw  camYaw in radians
 * @returns {{x:number, z:number}} displacement in XZ
 */
export function cameraRelative(x, y, yaw) {
  const ca = Math.cos(yaw), sa = Math.sin(yaw);
  return {
    x: -x * ca + y * sa,
    z:  x * sa + y * ca,
  };
}

/**
 * 2D / Phaser helper: module forward (y=+1) becomes screen-up (−Y).
 * @returns {{x:number, y:number}}
 */
export function screenRelative2D(x, y) {
  return { x, y: -y };
}

export function applyDeadzone(x, y, deadzone) {
  const dz = deadzone == null ? DEFAULT_DEADZONE : deadzone;
  const len = Math.hypot(x, y);
  if (len < dz) return { x: 0, y: 0 };
  return { x, y };
}

export function clampAxes(x, y) {
  const len = Math.hypot(x, y);
  if (len > 1) return { x: x / len, y: y / len };
  return { x, y };
}

/**
 * Look-sign helper. Raw deltas use screen / Standard-gamepad convention:
 *   drag or stick right = positive dx
 *   drag or stick down  = positive dy  (screen Y grows downward)
 *
 * For the documented third-person camera (yaw around Y, camera at
 *   (px - sin(yaw)*hd, pz - cos(yaw)*hd)):
 *   drag right → yaw decreases → view turns right → a point that was
 *     straight ahead moves LEFT on screen (NDC x decreases).
 *   drag up (dy < 0) → pitch decreases → look up (non-inverted).
 *
 * Through v0.2.4, games that did `camYaw += dx * sens` turned the view
 * the wrong way with a real finger (QA v0.2.4).
 */
export function lookDelta(dx, dy, sensYaw = 1, sensPitch = sensYaw) {
  return { yaw: -dx * sensYaw, pitch: dy * sensPitch };
}

/**
 * Apply a raw look-drag to yaw / pitch and clamp pitch.
 * @returns {{yaw:number, pitch:number}}
 */
export function applyLook(yaw, pitch, dx, dy, opts = {}) {
  const sy = opts.sensYaw != null ? opts.sensYaw : (opts.sens != null ? opts.sens : 1);
  const sp = opts.sensPitch != null ? opts.sensPitch : sy;
  const minP = opts.minPitch != null ? opts.minPitch : -0.9;
  const maxP = opts.maxPitch != null ? opts.maxPitch : 0.85;
  const d = lookDelta(dx, dy, sy, sp);
  return {
    yaw: yaw + d.yaw,
    pitch: Math.max(minP, Math.min(maxP, pitch + d.pitch)),
  };
}


function axisDead(v, dz) {
  return Math.abs(v) > dz ? v : 0;
}

/**
 * @param {object} opts
 * @param {Element} [opts.element]  pad root (the circle). Optional for keyboard-only.
 * @param {Element} [opts.knob]     inner knob; defaults to element.querySelector('i')
 * @param {number}  [opts.deadzone=0.08]
 * @param {boolean} [opts.keyboard=true]
 * @param {boolean} [opts.azerty=true]  also accept ZQSD (KeyZ / KeyQ) like WASD
 * @param {boolean} [opts.gamepad=true]
 * @param {Element} [opts.lookElement]  optional surface for look-drag (e.g. canvas)
 * @param {function} [opts.lookFilter]  (event) => boolean, whether this pointer starts a look
 * @param {function} [opts.onStart]     first pointer on the pad (e.g. unlock audio)
 * @param {number}  [opts.radius=0.42]  knob travel as a fraction of pad width
 * @param {Window}  [opts.win]
 * @returns {{read: function, readLook: function, reset: function, destroy: function, resize: function, active: boolean}}
 */
export function createMoveInput(opts = {}) {
  const win = opts.win || (typeof window !== 'undefined' ? window : null);
  const doc = win ? win.document : null;
  const element = opts.element || null;
  const knob = opts.knob || (element && element.querySelector && element.querySelector('i')) || null;
  const deadzone = opts.deadzone == null ? DEFAULT_DEADZONE : opts.deadzone;
  const useKeyboard = opts.keyboard !== false;
  const azerty = opts.azerty !== false;
  const useGamepad = opts.gamepad !== false;
  const lookElement = opts.lookElement || null;
  const lookFilter = opts.lookFilter || null;
  const onStart = opts.onStart || null;
  const radiusFrac = opts.radius == null ? PAD_RADIUS : opts.radius;

  const keys = Object.create(null);
  const pad = { active: false, id: -1, x: 0, y: 0 };
  const look = { id: -1, lx: 0, ly: 0, accx: 0, accy: 0 };
  let destroyed = false;
  let padRect = null;

  function measure() {
    if (!element || !element.getBoundingClientRect) { padRect = null; return; }
    padRect = element.getBoundingClientRect();
  }

  function setKnob(dx, dy) {
    if (knob && knob.style) knob.style.transform = (dx || dy) ? `translate(${dx}px, ${dy}px)` : '';
  }

  function padFromEvent(clientX, clientY) {
    measure();
    if (!padRect || !(padRect.width > 0)) { pad.x = 0; pad.y = 0; setKnob(0, 0); return; }
    const cx = padRect.left + padRect.width / 2;
    const cy = padRect.top + padRect.height / 2;
    let dx = clientX - cx, dy = clientY - cy;
    const max = padRect.width * radiusFrac;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    const axes = padAxesFromDelta(dx, dy, max);
    pad.x = axes.x;
    pad.y = axes.y;
    setKnob(dx, dy);
  }

  function endPad() {
    pad.active = false;
    pad.id = -1;
    pad.x = 0;
    pad.y = 0;
    setKnob(0, 0);
  }

  function endLook() {
    look.id = -1;
  }

  function clearKeys() {
    for (const k of Object.keys(keys)) keys[k] = false;
  }

  function reset() {
    endPad();
    endLook();
    clearKeys();
    look.accx = 0;
    look.accy = 0;
  }

  function onKeyDown(e) {
    keys[e.code] = true;
  }
  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function onPadDown(e) {
    if (destroyed) return;
    e.preventDefault();
    pad.active = true;
    pad.id = e.pointerId;
    if (element.setPointerCapture) {
      try { element.setPointerCapture(e.pointerId); } catch (_) { /* already captured */ }
    }
    padFromEvent(e.clientX, e.clientY);
    if (onStart) onStart(e);
  }
  function onPadMove(e) {
    if (!pad.active || e.pointerId !== pad.id) return;
    padFromEvent(e.clientX, e.clientY);
  }
  function onPadUp(e) {
    if (e.pointerId === pad.id) endPad();
  }

  function onLookDown(e) {
    if (destroyed) return;
    if (pad.active && e.pointerId === pad.id) return;
    if (lookFilter && !lookFilter(e)) return;
    look.id = e.pointerId;
    look.lx = e.clientX;
    look.ly = e.clientY;
  }
  function onLookMove(e) {
    if (e.pointerId !== look.id) return;
    // Drag right = positive dx; drag down = positive dy (screen Y).
    look.accx += e.clientX - look.lx;
    look.accy += e.clientY - look.ly;
    look.lx = e.clientX;
    look.ly = e.clientY;
  }
  function onLookUp(e) {
    if (e.pointerId === look.id) endLook();
  }

  function onResize() { measure(); }
  function onVisibility() {
    if (!doc || doc.visibilityState === 'hidden') reset();
  }

  if (win) {
    if (useKeyboard) {
      win.addEventListener('keydown', onKeyDown);
      win.addEventListener('keyup', onKeyUp);
    }
    win.addEventListener('resize', onResize);
    win.addEventListener('orientationchange', onResize);
    if (doc) doc.addEventListener('visibilitychange', onVisibility);
    win.addEventListener('blur', reset);
  }
  if (element) {
    element.addEventListener('pointerdown', onPadDown);
    element.addEventListener('pointermove', onPadMove);
    element.addEventListener('pointerup', onPadUp);
    element.addEventListener('pointercancel', onPadUp);
    element.addEventListener('lostpointercapture', onPadUp);
  }
  if (lookElement) {
    lookElement.addEventListener('pointerdown', onLookDown);
    if (win) {
      win.addEventListener('pointermove', onLookMove);
      win.addEventListener('pointerup', onLookUp);
      win.addEventListener('pointercancel', onLookUp);
    }
  }
  measure();

  function readKeys() {
    let x = 0, y = 0;
    if (keys.KeyW || keys.ArrowUp || (azerty && keys.KeyZ)) y += 1;
    if (keys.KeyS || keys.ArrowDown) y -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyA || keys.ArrowLeft || (azerty && keys.KeyQ)) x -= 1;
    return { x, y };
  }

  function readGamepad() {
    let x = 0, y = 0;
    if (!useGamepad || !win || !win.navigator || !win.navigator.getGamepads) return { x, y };
    let pads;
    try { pads = win.navigator.getGamepads(); } catch (_) { return { x, y }; }
    if (!pads) return { x, y };
    for (const p of pads) {
      if (!p || !p.axes) continue;
      // Standard mapping: axes[0] right-positive, axes[1] down-positive.
      const lx = axisDead(p.axes[0] || 0, GAMEPAD_DEADZONE);
      const ly = axisDead(p.axes[1] || 0, GAMEPAD_DEADZONE);
      x += lx;
      y += -ly; // down-positive → y=+1 is up / forward
    }
    return { x, y };
  }

  function read() {
    const k = useKeyboard ? readKeys() : { x: 0, y: 0 };
    const g = readGamepad();
    let x = k.x + g.x;
    let y = k.y + g.y;
    if (pad.active) { x += pad.x; y += pad.y; }
    const dz = applyDeadzone(x, y, deadzone);
    return clampAxes(dz.x, dz.y);
  }

  function readLook() {
    const out = { dx: look.accx, dy: look.accy };
    look.accx = 0;
    look.accy = 0;
    return out;
  }

  function destroy() {
    destroyed = true;
    reset();
    if (win) {
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      win.removeEventListener('resize', onResize);
      win.removeEventListener('orientationchange', onResize);
      win.removeEventListener('blur', reset);
      win.removeEventListener('pointermove', onLookMove);
      win.removeEventListener('pointerup', onLookUp);
      win.removeEventListener('pointercancel', onLookUp);
    }
    if (doc) doc.removeEventListener('visibilitychange', onVisibility);
    if (element) {
      element.removeEventListener('pointerdown', onPadDown);
      element.removeEventListener('pointermove', onPadMove);
      element.removeEventListener('pointerup', onPadUp);
      element.removeEventListener('pointercancel', onPadUp);
      element.removeEventListener('lostpointercapture', onPadUp);
    }
    if (lookElement) lookElement.removeEventListener('pointerdown', onLookDown);
  }

  return {
    read,
    readLook,
    reset,
    destroy,
    resize: measure,
    get active() { return pad.active; },
    get version() { return VERSION; },
  };
}
