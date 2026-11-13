/* Dossier BAASS 3D v0.2.1 — Three.js r170. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getGPUTier } from './vendor/detect-gpu.esm.js';
import {
  VERSION, SAVE_KEY, SETTINGS_KEY, BANNER, DISCLAIMER,
  EVIDENCE, ZONES, CREDITS, ASSETS_USED, SOUND_CREDITS,
} from './data.js';
import { propUrl } from './props.js';
import {
  LAB_Y, LAB_CEIL, BUNKER, RAMP,
  groundY, isIndoors, reducedMotion,
  makeDesertGround, createLights, buildBunker, updateBunkerLights,
  AudioSys, setupFade, PickupFX, pulseCraft, fitProp, sanitizeMaterials,
  loadWorldTextures, buildHorizon, makeScorch, placeCameraSafe, addServerLeds,
} from './mood.js';

const qs = new URLSearchParams(location.search);
const showFps = qs.get('fps') === '1';
const wantFx = qs.get('fx') === '1';
const tierParam = qs.get('tier');
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let pixelRatioCap = 2;
let gpuInfo = { tier: 2, gpu: '?', type: 'default', fps: 0, isMobile: false };
let qualityLow = tierParam != null && tierParam !== '' && Number.isFinite(+tierParam) && +tierParam <= 1;
let lowTier = qualityLow;
let worldLights = null;
let bunkerFx = null;
let pickupFx = null;
let Fade = null;
let enteredBunker = false;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.setClearColor(0x7a90a8, 1);
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x7a90a8, 70, 200);
scene.background = new THREE.Color(0x7a90a8);

const camera = new THREE.PerspectiveCamera(60, 1, 0.15, 200);
const clock = new THREE.Clock();

let loader;
let mixer = null;
let player = {
  pos: new THREE.Vector3(-16, 0, 18),
  yaw: Math.PI,
  radius: 0.4,
  height: 1.7,
  speed: 5.2,
  object: null,
  actions: {},
  moving: false,
};
let camYaw = Math.PI;
let camPitch = 0.28;
let camDist = 5.2;
const look = { dragging: false, lx: 0, ly: 0, sens: 0.005 };

const input = { x: 0, z: 0, act: false, keys: Object.create(null) };
const joy = { active: false, id: -1, x: 0, y: 0, nx: 0, ny: 0 };
const lookTouch = { id: -1 };

const solids = []; // {minx,maxx,minz,maxz}
const labWalls = [];
let evidenceNodes = new Map();
let collected = new Set();
let tr3b = null;
let tr3bState = 'idle'; // idle | flying | hover | gone
let tr3bSeen = false;
let tr3bT = 0;
let tr3bClock = 0;
let wreckVisited = false;
let running = false;
let runStart = 0;
let elapsed = 0;
let ended = false;
let nearestEvidence = null;
let currentZone = 'ranch';
let muted = false; // miroir de AudioSys.muted, pour la sauvegarde
let lastCalls = 0;
let lastTris = 0;
let lastFps = 0;
let rafId = 0;
let ready = false;
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpBox = new THREE.Box3();
let camOverride = null;
let menuCine = true;

function $(id) { return document.getElementById(id); }

/* ---------- GPU & resize ---------- */
function applyQuality() {
  pixelRatioCap = qualityLow ? 1 : 2;
  lowTier = qualityLow;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = !!(wantFx && !qualityLow);
  if (worldLights) worldLights.applyQuality(qualityLow);
  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m) continue;
      if (m.envMapIntensity != null) m.envMapIntensity = qualityLow ? 0 : (m.userData._env0 ?? m.envMapIntensity);
      if (m.clearcoat != null) {
        if (m.userData._cc0 == null) m.userData._cc0 = m.clearcoat;
        m.clearcoat = qualityLow ? 0 : m.userData._cc0;
        m.needsUpdate = true;
      }
    }
  });
}

async function initGPU() {
  let info = null;
  try {
    info = await Promise.race([
      getGPUTier({ benchmarksURL: './detect-gpu-benchmarks' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
  } catch {
    info = null;
  }
  if (info) {
    gpuInfo = {
      tier: info.tier ?? 2,
      gpu: info.gpu || info.device || '?',
      type: info.type || 'unknown',
      fps: info.fps ?? 0,
      isMobile: !!info.isMobile,
    };
  } else {
    gpuInfo = { tier: 2, gpu: '?', type: 'fallback', fps: 0, isMobile: true };
  }
  if (tierParam != null && tierParam !== '' && Number.isFinite(+tierParam)) {
    gpuInfo.tier = +tierParam;
    gpuInfo.type = 'override';
  }
  qualityLow = gpuInfo.tier <= 1;
  lowTier = qualityLow;
  applyQuality();
}

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const pr = Math.min(pixelRatioCap, window.devicePixelRatio || 1);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w > h ? 55 : 62;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

let ktx2Loader = null;
function makeLoader() {
  ktx2Loader = new KTX2Loader().setTranscoderPath('./vendor/basis/').detectSupport(renderer);
  return new GLTFLoader().setKTX2Loader(ktx2Loader).setMeshoptDecoder(MeshoptDecoder);
}

/* ---------- Audio (Web Audio files, unlock on first gesture) ---------- */
function unlockAudio() { return AudioSys.unlock(); }
function sndClick() { AudioSys.play('ui_click', { gain: 0.28 }); }
function sndCollect() { AudioSys.play('pickup', { gain: 0.4 }); }
function sndOpen() { AudioSys.play('ui_open', { gain: 0.32 }); }
function sndTr3b() { AudioSys.setHum(true); }
function sndEnd() { AudioSys.play('ui_open', { gain: 0.36 }); }

['pointerdown', 'touchstart', 'keydown'].forEach((ev) => {
  window.addEventListener(ev, () => { AudioSys.unlock(); }, { once: true, passive: true });
});

/* ---------- Settings ---------- */
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    muted = !!s.muted;
    AudioSys.muted = muted;
  } catch { muted = false; AudioSys.muted = false; }
  syncMute();
}
function saveSettings() {
  muted = AudioSys.muted;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted })); } catch { /* ignore */ }
}
function getBest() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { score: s.bestScore || 0, time: s.bestTime || 0 };
  } catch { return { score: 0, time: 0 }; }
}
function saveBest(score, time) {
  const cur = getBest();
  if (score > cur.score || (score === cur.score && (cur.time === 0 || time < cur.time))) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ bestScore: score, bestTime: time })); } catch { /* ignore */ }
    return true;
  }
  return false;
}

function syncMute() {
  const b = $('bMute');
  if (!b) return;
  const m = AudioSys.muted;
  muted = m;
  b.textContent = m ? '🔇' : '🔊';
  b.setAttribute('aria-pressed', m ? 'true' : 'false');
  b.setAttribute('aria-label', m ? 'Activer le son' : 'Couper le son');
}
function toggleMute() {
  AudioSys.setMuted(!AudioSys.muted);
  syncMute();
  saveSettings();
}

/* ---------- Input ---------- */
window.addEventListener('keydown', (e) => {
  input.keys[e.code] = true;
  if (e.code === 'KeyM') {
    e.preventDefault();
    toggleMute();
    return;
  }
  if (e.code === 'KeyE' || e.code === 'Space') {
    if (e.code === 'Space') e.preventDefault();
    tryAction();
  }
  if (e.code === 'Escape') {
    if (!$('sheet').classList.contains('hidden')) closeSheet();
    else if (running && !ended) goMenu();
  }
});
window.addEventListener('keyup', (e) => { input.keys[e.code] = false; });

function pollKeys() {
  let x = 0, z = 0;
  if (input.keys.KeyW || input.keys.KeyZ || input.keys.ArrowUp) z -= 1;
  if (input.keys.KeyS || input.keys.ArrowDown) z += 1;
  if (input.keys.KeyA || input.keys.KeyQ || input.keys.ArrowLeft) x -= 1;
  if (input.keys.KeyD || input.keys.ArrowRight) x += 1;
  if (joy.active) { x += joy.nx; z += joy.ny; }
  // gamepad
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p) continue;
    const lx = Math.abs(p.axes[0]) > 0.18 ? p.axes[0] : 0;
    const ly = Math.abs(p.axes[1]) > 0.18 ? p.axes[1] : 0;
    x += lx; z += ly;
    const rx = Math.abs(p.axes[2]) > 0.12 ? p.axes[2] : 0;
    const ry = Math.abs(p.axes[3]) > 0.12 ? p.axes[3] : 0;
    camYaw -= rx * 0.04;
    camPitch = Math.max(-0.9, Math.min(0.85, camPitch + ry * 0.03));
    if (p.buttons[0] && p.buttons[0].pressed && !input._padAct) { input._padAct = true; tryAction(); }
    if (p.buttons[0] && !p.buttons[0].pressed) input._padAct = false;
  }
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  input.x = x; input.z = z;
}

/* mouse look when pointer locked or dragging on canvas */
canvas.addEventListener('mousedown', (e) => {
  if (!running || ended) return;
  if (e.button !== 0) return;
  look.dragging = true;
  look.lx = e.clientX; look.ly = e.clientY;
  canvas.requestPointerLock?.();
});
window.addEventListener('mouseup', () => { look.dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!running || ended) return;
  if (document.pointerLockElement === canvas) {
    camYaw -= e.movementX * look.sens;
    camPitch = Math.max(-0.9, Math.min(0.85, camPitch - e.movementY * look.sens));
    return;
  }
  if (!look.dragging) return;
  camYaw -= (e.clientX - look.lx) * look.sens;
  camPitch = Math.max(-0.9, Math.min(0.85, camPitch - (e.clientY - look.ly) * look.sens));
  look.lx = e.clientX; look.ly = e.clientY;
});

/* touch joystick + look */
const joyEl = $('joyL');
const joyKnob = joyEl.querySelector('i');
function joySet(clientX, clientY) {
  const r = joyEl.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = clientX - cx, dy = clientY - cy;
  const max = r.width * 0.42;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  joy.nx = dx / max;
  joy.ny = dy / max;
  joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}
function joyEnd() {
  joy.active = false; joy.id = -1; joy.nx = 0; joy.ny = 0;
  joyKnob.style.transform = '';
}
joyEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  joy.active = true; joy.id = e.pointerId;
  joyEl.setPointerCapture(e.pointerId);
  joySet(e.clientX, e.clientY);
  unlockAudio();
});
joyEl.addEventListener('pointermove', (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  joySet(e.clientX, e.clientY);
});
joyEl.addEventListener('pointerup', joyEnd);
joyEl.addEventListener('pointercancel', joyEnd);

canvas.addEventListener('pointerdown', (e) => {
  if (!isTouch || !running || ended) return;
  if (e.pointerId === joy.id) return;
  if (e.clientX < window.innerWidth * 0.42) return;
  lookTouch.id = e.pointerId;
  look.lx = e.clientX; look.ly = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerId !== lookTouch.id) return;
  camYaw -= (e.clientX - look.lx) * 0.006;
  camPitch = Math.max(-0.9, Math.min(0.85, camPitch - (e.clientY - look.ly) * 0.006));
  look.lx = e.clientX; look.ly = e.clientY;
});
window.addEventListener('pointerup', (e) => {
  if (e.pointerId === lookTouch.id) lookTouch.id = -1;
});

$('bAct').addEventListener('click', () => { unlockAudio(); tryAction(); });


/* ---------- Asset loading ---------- */
const gltfCache = new Map();
async function loadGLB(name) {
  if (gltfCache.has(name)) return gltfCache.get(name);
  const url = propUrl(name);
  const gltf = await loader.loadAsync(url);
  gltfCache.set(name, gltf);
  return gltf;
}

function cloneScene(gltf) {
  // SkeletonUtils handles skinned meshes; fine for static too
  return SkeletonUtils.clone(gltf.scene);
}

function prepareObject(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      o.frustumCulled = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.transmission || m.transmissionMap) {
          m.transmission = 0;
          m.transmissionMap = null;
          m.transparent = false;
        }
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        // keep author's side (e.g. doubleSided on the TR-3B body)
      }
    }
  });
  sanitizeMaterials(root);
  return root;
}

function addSolidFrom(object, pad = 0.05) {
  tmpBox.setFromObject(object);
  if (tmpBox.isEmpty()) return;
  solids.push({
    minx: tmpBox.min.x - pad, maxx: tmpBox.max.x + pad,
    minz: tmpBox.min.z - pad, maxz: tmpBox.max.z + pad,
    miny: tmpBox.min.y, maxy: tmpBox.max.y,
  });
}

function placeGLB(gltf, { x, z, y = 0, ry = 0, scale = 1, collide = true, name = '' }) {
  const obj = prepareObject(cloneScene(gltf));
  if (name) obj.name = name;
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  if (typeof scale === 'number') obj.scale.setScalar(scale);
  else obj.scale.set(scale.x, scale.y, scale.z);
  obj.updateMatrixWorld(true);
  scene.add(obj);
  if (collide) addSolidFrom(obj);
  obj.userData.static = collide || true;
  return obj;
}

/* Instanced repeats. */
/* Quantized (KHR_mesh_quantization) attributes must be decoded to
   Float32 before applyMatrix4 / InstancedMesh, or write-back clamps
   into the integer buffer and the mesh becomes kilometre-scale. */
function placeFitted(gltf, opts) {
  const floor = opts.y ?? 0;
  const obj = placeGLB(gltf, { ...opts, y: 0, scale: opts.scale ?? 1 });
  if (opts.rx) obj.rotation.x = opts.rx;
  if (opts.rz) obj.rotation.z = opts.rz;
  obj.updateMatrixWorld(true);
  if (opts.fit) {
    // world-scale so height == fit, then sit on floor
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) {
      const h = box.max.y - box.min.y || 1;
      const k = opts.fit / h;
      obj.scale.multiplyScalar(k);
      obj.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(obj);
      obj.position.y += floor - b2.min.y;
      obj.updateMatrixWorld(true);
    }
  } else {
    obj.position.y = floor;
  }
  if (opts.collide) {
    solids.pop();
    addSolidFrom(obj);
  }
  return obj;
}

function geometryToFloat32(g) {
  for (const name of g.attributes ? Object.keys(g.attributes) : []) {
    const a = g.getAttribute(name);
    if (!a || a.array instanceof Float32Array) continue;
    const itemSize = a.itemSize;
    const arr = new Float32Array(a.count * itemSize);
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < itemSize; k++) {
        arr[i * itemSize + k] = a.getComponent(i, k);
      }
    }
    g.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
  }
  if (g.index && !(g.index.array instanceof Uint16Array) && !(g.index.array instanceof Uint32Array) && !(g.index.array instanceof Uint8Array)) {
    /* keep existing index */
  }
  return g;
}

function bakedGeometry(mesh) {
  mesh.updateWorldMatrix(true, false);
  const g = geometryToFloat32(mesh.geometry.clone());
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function instanceFrom(gltf, transforms, { collide = false, name = 'inst' } = {}) {
  const src = gltf.scene;
  src.updateMatrixWorld(true);
  let mesh = null;
  src.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) return null;
  const geom = bakedGeometry(mesh);
  const mat = mesh.material;
  const inst = new THREE.InstancedMesh(geom, mat, transforms.length);
  inst.name = name;
  inst.frustumCulled = true;
  inst.castShadow = false;
  inst.receiveShadow = false;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  transforms.forEach((t, i) => {
    p.set(t.x, t.y || 0, t.z);
    e.set(0, t.ry || 0, 0);
    q.setFromEuler(e);
    const sc = t.scale ?? 1;
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
    if (collide) {
      // approximate solid using source bbox scaled
      tmpBox.setFromBufferAttribute(geom.getAttribute('position'));
      const w = (tmpBox.max.x - tmpBox.min.x) * sc;
      const d = (tmpBox.max.z - tmpBox.min.z) * sc;
      // after rotation around Y, swap if ~90°
      const c = Math.abs(Math.cos(t.ry || 0)), sn = Math.abs(Math.sin(t.ry || 0));
      const hx = (w * c + d * sn) / 2;
      const hz = (w * sn + d * c) / 2;
      solids.push({ minx: t.x - hx, maxx: t.x + hx, minz: t.z - hz, maxz: t.z + hz });
    }
  });
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
  return inst;
}

/* ---------- TR-3B ---------- */
function makePlaceholderTR3B() {
  const g = new THREE.Group();
  g.name = 'tr3b';
  const s = 36;
  const h = s * Math.sqrt(3) / 2;
  const shape = new THREE.Shape();
  // equilateral in XY, then rotate to XZ; tip toward +Z after rot? we'll rotate group
  shape.moveTo(0, h * 2 / 3);
  shape.lineTo(s / 2, -h / 3);
  shape.lineTo(-s / 2, -h / 3);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 1 });
  geom.rotateX(Math.PI / 2);
  geom.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0b0d11, metalness: 0.85, roughness: 0.32,
  });
  const body = new THREE.Mesh(geom, mat);
  body.name = 'tr3b_body';
  g.add(body);
  // underside dark
  const under = new THREE.Mesh(
    new THREE.CircleGeometry(s * 0.28, 3),
    new THREE.MeshStandardMaterial({ color: 0x05060a, metalness: 0.6, roughness: 0.4 }),
  );
  under.rotation.x = Math.PI / 2;
  under.position.y = -0.85;
  g.add(under);

  const corners = [
    new THREE.Vector3(0, -0.55, h * 2 / 3),
    new THREE.Vector3(s / 2, -0.55, -h / 3),
    new THREE.Vector3(-s / 2, -0.55, -h / 3),
  ];
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xa8e8ff, emissive: 0x66ccff, emissiveIntensity: 3, roughness: 0.4, metalness: 0,
  });
  corners.forEach((p, i) => {
    const sph = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), lightMat.clone());
    sph.position.copy(p);
    sph.name = 'tr3b_corner_' + i;
    g.add(sph);
    const pl = new THREE.PointLight(0x79d4ff, 0, 48);
    pl.position.copy(p);
    pl.name = 'tr3b_light_' + i;
    g.add(pl);
  });
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xfff2cc, emissive: 0xffcc66, emissiveIntensity: 2.2, roughness: 0.5,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), centerMat);
  core.position.set(0, -0.7, 0);
  core.name = 'tr3b_core';
  g.add(core);
  const cl = new THREE.PointLight(0xffdd88, 0, 55);
  cl.position.set(0, -0.7, 0);
  cl.name = 'tr3b_center_light';
  g.add(cl);
  g.userData.placeholder = true;
  return g;
}

/** Single loader. Final GLB is assets/tr3b-v1.glb (Dylusion, CC BY-NC 4.0).
 *  Placeholder is only used if that file fails to load. */
async function loadTR3B(url) {
  const path = url || './assets/tr3b-v1.glb';
  try {
    const gltf = await loader.loadAsync(path);
    const root = gltf.scene.getObjectByName('tr3b') || gltf.scene;
    root.name = 'tr3b';
    prepareObject(root);
    // Point lights on the named empties (tr3b_light1 tip +Z, light2 rear -X, light3 rear +X)
    // for a cheap flyover glow. Model already has unlit emissive on tr3b_lights.
    ['tr3b_light1', 'tr3b_light2', 'tr3b_light3'].forEach((nm, i) => {
      const n = root.getObjectByName(nm);
      if (!n) return;
      const pl = new THREE.PointLight(0xff9944, 0, 48);
      pl.name = 'tr3b_plight_' + (i + 1);
      n.add(pl);
    });
    root.userData.placeholder = false;
    return root;
  } catch (err) {
    console.warn('TR-3B GLB missing, placeholder:', err);
    return makePlaceholderTR3B();
  }
}

function setTR3BLights(on) {
  if (!tr3b) return;
  tr3b.traverse((o) => {
    if (o.isPointLight) o.intensity = on ? 3.4 : 0;
  });
}

function triggerTR3B() {
  if (tr3bState !== 'idle' && tr3bState !== 'gone') return;
  if (!tr3b) return;
  tr3b.visible = true;
  tr3bState = 'flying';
  tr3bT = 0;
  tr3bClock = performance.now();
  tr3b.position.set(10, 42, -70);
  tr3b.rotation.set(0, 0, 0); // front +Z, underside at Y
  setTR3BLights(true);
  AudioSys.setHum(true);
  showHint('Un engin triangulaire s’approche du hangar…');
}

function updateTR3B(dt) {
  if (!tr3b || tr3bState === 'idle' || tr3bState === 'gone') return;
  tr3bT = (performance.now() - tr3bClock) / 1000;
  if (tr3bState === 'flying') {
    // approach hangar yard (10, 22, 4)
    const t = Math.min(1, tr3bT / 5);
    const e = t * t * (3 - 2 * t);
    tr3b.position.lerpVectors(new THREE.Vector3(10, 42, -70), new THREE.Vector3(10, 22, 4), e);
    tr3b.rotation.y = Math.sin(tr3bT * 0.4) * 0.08;
    if (t >= 1) { tr3bState = 'hover'; tr3bClock = performance.now(); tr3bT = 0; tr3bSeen = true; showHint('L’engin reste en vol stationnaire au-dessus du hangar.'); }
  } else if (tr3bState === 'hover') {
    tr3b.position.y = 22 + Math.sin(tr3bT * 0.7 * Math.PI * 2) * 0.85;
    tr3b.rotation.y += dt * 0.12;
    if (tr3bT > 6) { tr3bState = 'leaving'; tr3bClock = performance.now(); tr3bT = 0; showHint('L’engin s’éloigne vers le nord.'); }
  } else if (tr3bState === 'leaving') {
    const t = Math.min(1, tr3bT / 4);
    const a = 1 - Math.pow(1 - t, 2);
    tr3b.position.lerpVectors(new THREE.Vector3(10, 22, 4), new THREE.Vector3(-8, 50, 90), a);
    if (t >= 1) {
      tr3bState = 'gone';
      setTR3BLights(false);
      tr3b.visible = false;
      AudioSys.setHum(false);
      maybeFinish();
    }
  }
}

/* ---------- Collision & movement ---------- */
function collideXZ(x, z) {
  const r = player.radius;
  const boxes = solids.concat(labWalls);
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const minx = b.minx - r, maxx = b.maxx + r, minz = b.minz - r, maxz = b.maxz + r;
    if (x > minx && x < maxx && z > minz && z < maxz) {
      const dxL = x - minx, dxR = maxx - x, dzB = z - minz, dzT = maxz - z;
      const m = Math.min(dxL, dxR, dzB, dzT);
      if (m === dxL) x = minx;
      else if (m === dxR) x = maxx;
      else if (m === dzB) z = minz;
      else z = maxz;
    }
  }
  // world bounds
  x = Math.max(-55, Math.min(62, x));
  z = Math.max(-30, Math.min(72, z));
  return { x, z };
}

function zoneAt(x, z) {
  for (const k of Object.keys(ZONES)) {
    const v = ZONES[k];
    if (x >= v.x0 && x <= v.x1 && z >= v.z0 && z <= v.z1) return k;
  }
  return currentZone;
}

function updatePlayer(dt) {
  pollKeys();
  const moving = Math.hypot(input.x, input.z) > 0.08;
  player.moving = moving;
  if (moving && running && !ended) {
    // movement relative to camera yaw (forward = -Z in camera space)
    const ca = Math.cos(camYaw), sa = Math.sin(camYaw);
    const fx = input.x * ca + input.z * sa;
    const fz = -input.x * sa + input.z * ca;
    const spd = player.speed;
    let nx = player.pos.x + fx * spd * dt;
    let nz = player.pos.z + fz * spd * dt;
    const c1 = collideXZ(nx, player.pos.z);
    const c2 = collideXZ(c1.x, nz);
    player.pos.x = c2.x;
    player.pos.z = c2.z;
    player.yaw = Math.atan2(fx, fz);
  }
  player.pos.y = groundY(player.pos.x, player.pos.z);
  if (player.object) {
    player.object.position.set(player.pos.x, player.pos.y, player.pos.z);
    player.object.rotation.y = player.yaw;
  }
  if (mixer) {
    const walk = player.actions.walk || player.actions.run;
    const idle = player.actions.idle || player.actions.stand;
    if (moving && walk) {
      if (idle) idle.fadeOut(0.15);
      walk.reset().fadeIn(0.15).play();
      // already playing? just keep
      if (!walk.isRunning()) walk.play();
      if (idle && idle.isRunning()) idle.fadeOut(0.15);
    } else if (idle) {
      if (walk && walk.isRunning()) walk.fadeOut(0.2);
      if (!idle.isRunning()) idle.reset().fadeIn(0.2).play();
    }
    mixer.update(dt);
  }
  // camera — collision so we never sit inside walls
  if (!camOverride) {
    const indoor = isIndoors(player.pos.x, player.pos.z, player.pos.y) || currentZone === 'lab';
    const dist = indoor ? 3.05 : camDist;
    const height = indoor ? 1.55 : 2.15;
    const offY = Math.sin(camPitch) * dist + height;
    const hd = Math.cos(camPitch) * dist;
    const cx = player.pos.x - Math.sin(camYaw) * hd;
    const cz = player.pos.z - Math.cos(camYaw) * hd;
    let cy = player.pos.y + offY;
    if (indoor && player.pos.y < -0.5) cy = Math.min(cy, LAB_CEIL - 0.28);
    tmpV2.set(player.pos.x, player.pos.y + (indoor ? 1.25 : 1.4), player.pos.z);
    const solidsAll = solids.concat(labWalls || []);
    placeCameraSafe(camera, { x: cx, y: cy, z: cz }, tmpV2, solidsAll, indoor ? 0.26 : 0.38);
  }

  const z = zoneAt(player.pos.x, player.pos.z);
  if (z !== currentZone) {
    currentZone = z;
    $('hudZone').textContent = ZONES[z]?.name || z;
    if (worldLights) worldLights.applyAtmos(z);
    AudioSys.setZone(z);
    if (z === 'lab' && running && !enteredBunker) {
      enteredBunker = true;
      AudioSys.play('door', { gain: 0.42 });
      AudioSys.play('bunker_blip', { gain: 0.22 });
      if (Fade && !reducedMotion()) Fade.dip(520);
    }
  }
  if (z === 'wreck') wreckVisited = true;
  if (z === 'hangar' && tr3bState === 'idle' && collected.size >= 2) triggerTR3B();
}

function nearestEv() {
  let best = null, bestD = 2.6;
  for (const ev of EVIDENCE) {
    if (collected.has(ev.id)) continue;
    const n = evidenceNodes.get(ev.id);
    if (!n || !n.visible) continue;
    const d = Math.hypot(n.position.x - player.pos.x, n.position.z - player.pos.z);
    if (d < bestD) { bestD = d; best = ev; }
  }
  return best;
}

function tryAction() {
  if (!running || ended) return;
  const ev = nearestEvidence || nearestEv();
  if (ev) collectEvidence(ev.id);
}

function collectEvidence(id, { silent = false } = {}) {
  const ev = EVIDENCE.find((e) => e.id === id);
  if (!ev || collected.has(id)) return false;
  collected.add(id);
  const n = evidenceNodes.get(id);
  $('hudEvidence').textContent = collected.size + ' / ' + EVIDENCE.length;
  const armTr3b = () => {
    if (collected.size >= 3 && tr3bState === 'idle') {
      if (currentZone === 'hangar' || currentZone === 'lab') triggerTR3B();
    }
    maybeFinish();
  };
  const finishCollect = () => {
    if (n) n.visible = false;
    if (!silent) openSheet(ev);
    armTr3b();
  };
  if (silent || reducedMotion() || !pickupFx || !n) {
    if (n) n.visible = false;
    if (!silent) { sndCollect(); openSheet(ev); }
    armTr3b();
    return true;
  }
  sndCollect();
  n.visible = true;
  const wp = new THREE.Vector3();
  n.getWorldPosition(wp);
  wp.y += 0.35;
  pickupFx.burst(wp, finishCollect);
  return true;
}

function computeScore(time) {
  const evPts = collected.size * 120;
  const bonus = (tr3bSeen ? 200 : 0) + (wreckVisited ? 150 : 0);
  const timePts = Math.max(0, 480 - Math.floor(time));
  return evPts + bonus + timePts;
}

function maybeFinish() {
  if (ended || !running) return;
  if (collected.size >= EVIDENCE.length && tr3bSeen && wreckVisited) {
    // wait a short beat if a sheet is open
    if (!$('sheet').classList.contains('hidden')) return;
    endRun();
  }
}

function endRun() {
  if (ended) return;
  ended = true;
  running = false;
  elapsed = (performance.now() - runStart) / 1000;
  const score = computeScore(elapsed);
  const isBest = saveBest(score, elapsed);
  const best = getBest();
  $('resTitle').textContent = 'Enquête terminée';
  $('resBody').textContent =
    'Tu as réuni ' + collected.size + ' preuves. ' +
    (tr3bSeen ? 'Tu as observé le survol du TR-3B. ' : '') +
    (wreckVisited ? 'Tu es allé au site de l’épave. ' : '') +
    'Les citations viennent du plan BAASS ; l’histoire du jeu est une fiction.';
  $('resScore').textContent = 'Score : ' + score + '  ·  temps : ' + formatTime(elapsed);
  $('resBest').textContent = isBest
    ? 'Nouveau meilleur score !'
    : (best.score ? 'Meilleur : ' + best.score + '  ·  ' + formatTime(best.time) : '');
  showPanel('result');
  hideGameplayUI();
  if (document.pointerLockElement) document.exitPointerLock();
  sndEnd();
}

function formatTime(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}


/* ---------- World ---------- */
function makeGround() {
  makeDesertGround(scene);
}

function lights() {
  worldLights = createLights(scene);
  worldLights.qualityLow = qualityLow;
  worldLights.applyAtmos('ranch');
}

async function buildWorld(onProg) {
  if (ktx2Loader) {
    try { await loadWorldTextures(ktx2Loader); }
    catch (e) { console.warn('textures', e); }
  }
  makeGround();
  lights();
  buildHorizon(scene);
  const names = [
    'barn','shed','truck','fence','metal-fence','debris','ufo','papers',
    'folder','folder-manilla','cabinet','lab-cabinet','lab-things','server-rack','paperclip','man',
    'building-l','building-a','building-f','building-s',
    'container-a','container-b','water-tower','chimney','tank',
    'room-wide','room-small','corridor-wide','corridor-wide-corner','corridor-wide-end','gate-door',
    'box-large','box-small','machine-outdoor','screen-panel',
    'tree-tall','tree','rock-sand','rock','barrel',
  ];
  const loaded = {};
  let n = 0;
  // Load sequentially: KTX2Loader's Basis transcoder is not safe under heavy parallelism.
  for (const nm of names) {
    loaded[nm] = await loadGLB(nm);
    n++;
    onProg(n / names.length * 0.85);
  }

  const S = 8; // Kenney industrial scale (kit is "toy" sized)
  // —— Ranch ——
  placeGLB(loaded.barn, { x: -24, z: 0, ry: 0, name: 'barn', collide: true });
  placeGLB(loaded.shed, { x: -13, z: 8, ry: 0.4, scale: 4.2, name: 'shed', collide: true });
  placeGLB(loaded.truck, { x: -12, z: -9, ry: Math.PI * 0.6, name: 'truck', collide: true });

  // wooden fences around ranch (instance)
  const fences = [];
  for (let i = 0; i < 6; i++) fences.push({ x: -36 + i * 5.9, z: -16, ry: 0, scale: 1 });
  for (let i = 0; i < 5; i++) fences.push({ x: -36, z: -16 + 5.9 * (i + 0.5), ry: Math.PI / 2, scale: 1 });
  for (let i = 0; i < 4; i++) fences.push({ x: -6, z: -16 + 5.9 * (i + 0.5), ry: Math.PI / 2, scale: 1 });
  instanceFrom(loaded.fence, fences, { collide: true, name: 'fences' });

  // trees & rocks
  const trees = [
    { x: -38, z: 10, scale: 3.6, ry: 0.2 },
    { x: -40, z: -6, scale: 4.0, ry: 1.1 },
    { x: -32, z: 20, scale: 3.4, ry: 0.7 },
    { x: -8, z: 22, scale: 3.8, ry: 2.1 },
    { x: -28, z: 28, scale: 3.5, ry: 0.4 },
    { x: 4, z: -18, scale: 3.2, ry: 1.4 },
    { x: 26, z: -18, scale: 3.7, ry: 0.3 },
    { x: 24, z: 26, scale: 3.4, ry: 2.0 },
    { x: -22, z: 36, scale: 3.3, ry: 0.9 },
    { x: 2, z: 58, scale: 4.1, ry: 1.7 },
    { x: -26, z: 58, scale: 3.6, ry: 0.1 },
    // distant scrub (small Survival Kit trees — Nature Kit download was 403)
    { x: -46, z: 24, scale: 1.7, ry: 0.5 },
    { x: -44, z: 4, scale: 1.5, ry: 1.8 },
    { x: -36, z: -16, scale: 1.85, ry: 0.3 },
    { x: -14, z: 64, scale: 1.6, ry: 2.2 },
    { x: 8, z: 66, scale: 1.9, ry: 0.9 },
    { x: -34, z: 52, scale: 1.55, ry: 1.1 },
    { x: 14, z: 54, scale: 1.7, ry: 0.2 },
    { x: -48, z: 44, scale: 2.0, ry: 1.4 },
    { x: 32, z: 30, scale: 1.65, ry: 0.6 },
    { x: -6, z: -22, scale: 1.8, ry: 2.4 },
  ];
  instanceFrom(loaded['tree-tall'], trees.slice(0, 6), { collide: true, name: 'trees-tall' });
  instanceFrom(loaded.tree, trees.slice(6), { collide: true, name: 'trees' });
  const rocks = [
    { x: -30, z: 14, scale: 3.2, ry: 0.4 },
    { x: -8, z: -14, scale: 2.8, ry: 1.2 },
    { x: 0, z: 32, scale: 3.6, ry: 0.8 },
    { x: -18, z: 50, scale: 4.0, ry: 2.0 },
    { x: 18, z: -14, scale: 2.6, ry: 0.2 },
    { x: -40, z: 40, scale: 3.5, ry: 1.5 },
    { x: -22, z: 44, scale: 2.2, ry: 0.7 },
    { x: -6, z: 54, scale: 2.8, ry: 1.9 },
    { x: 4, z: 48, scale: 2.1, ry: 0.3 },
    { x: -28, z: 8, scale: 2.4, ry: 1.3 },
    { x: -16, z: -16, scale: 1.9, ry: 2.1 },
    { x: 8, z: -20, scale: 2.5, ry: 0.5 },
    { x: -34, z: 32, scale: 2.0, ry: 0.8 },
    { x: 6, z: 38, scale: 1.8, ry: 1.6 },
    { x: -12, z: 62, scale: 2.7, ry: 0.1 },
    { x: -42, z: 18, scale: 2.3, ry: 2.5 },
  ];
  instanceFrom(loaded['rock-sand'], rocks, { collide: true, name: 'rocks' });
  const rocks2 = [
    { x: -24, z: 48, scale: 1.6, ry: 0.4 },
    { x: -2, z: 52, scale: 1.9, ry: 1.1 },
    { x: -14, z: 36, scale: 1.4, ry: 2.0 },
    { x: 12, z: 44, scale: 1.7, ry: 0.6 },
    { x: -36, z: -4, scale: 2.0, ry: 1.5 },
    { x: -20, z: 20, scale: 1.5, ry: 0.2 },
    { x: 20, z: 32, scale: 1.8, ry: 2.2 },
    { x: -8, z: 28, scale: 1.3, ry: 0.9 },
  ];
  instanceFrom(loaded.rock, rocks2, { collide: true, name: 'rocks-grey' });

  // —— Hangar compound (industrial × 8) ——
  // building-l ~2.08 × 1.87 × 1.92 → ×8 ≈ 16.6 × 15 × 15.4, origin not centered
  placeGLB(loaded['building-l'], { x: 10, z: 2, ry: 0, scale: S, name: 'hangar-main', collide: true });
  placeGLB(loaded['building-a'], { x: 10, z: 20, ry: Math.PI / 2, scale: S, name: 'hangar-a', collide: true });
  placeGLB(loaded['building-f'], { x: 22, z: 18, ry: 0, scale: S, name: 'hangar-f', collide: true });
  placeGLB(loaded['building-s'], { x: 22, z: -8, ry: 0, scale: S, name: 'hangar-s', collide: true });
  placeGLB(loaded['water-tower'], { x: 2, z: -10, ry: 0, scale: 6, name: 'water-tower', collide: true });
  placeGLB(loaded.chimney, { x: 1, z: 16, ry: 0, scale: 6, name: 'chimney', collide: true });
  placeGLB(loaded.tank, { x: 4, z: 22, ry: 0.3, scale: S, name: 'tank', collide: true });

  const containers = [
    { x: 2, z: -2, ry: 0, scale: S },
    { x: 2, z: 4, ry: 0, scale: S },
    { x: 8, z: 14, ry: Math.PI / 2, scale: S },
  ];
  instanceFrom(loaded['container-a'], containers, { collide: true, name: 'containers' });
  const boxes = [
    { x: 6, z: -8, ry: 0.2, scale: 1 },
    { x: 7.2, z: -8, ry: 0.1, scale: 1 },
    { x: 6.4, z: -6.9, ry: 0.7, scale: 1 },
    { x: 7.2, z: 10, ry: 0.4, scale: 1 },
    { x: 8.1, z: 10.6, ry: 0, scale: 1 },
  ];
  instanceFrom(loaded['box-large'], boxes, { collide: true, name: 'boxes' });
  placeGLB(loaded['machine-outdoor'], { x: 16, z: -8, ry: -0.4, name: 'machine-out', collide: true });
  placeGLB(loaded.barrel, { x: -10, z: 6, scale: 1, collide: true, name: 'barrel' });

  // —— Lab (space kit at LAB_Y, inside concrete bunker) ——
  const labY = LAB_Y;
  bunkerFx = buildBunker(scene, {
    addSolid(s) { solids.push(s); },
  });
  if (worldLights) worldLights.cones = bunkerFx.cones;
  // entrance blast door at the pavilion (surface)
  placeGLB(loaded['gate-door'], { x: 19.6, z: 9.4, y: 0, ry: Math.PI / 2, scale: 0.55, name: 'bunker-door', collide: false });
  function tintLabKit(obj) {
    const concrete = new THREE.Color(0x8c8880);
    obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        const nm = (m.name || '').toLowerCase();
        if ((m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity || 0) > 0.5) || /emission|emissive|light|glow/.test(nm)) return;
        m.map = null;
        m.normalMap = null;
        m.roughnessMap = null;
        m.metalnessMap = null;
        m.aoMap = null;
        m.vertexColors = false;
        m.color = concrete.clone();
        if (m.roughness != null) m.roughness = 0.88;
        if (m.metalness != null) m.metalness = 0.04;
        m.envMapIntensity = 0;
        m.needsUpdate = true;
        if (o.geometry && o.geometry.getAttribute('color')) o.geometry.deleteAttribute('color');
      });
    });
  }
  tintLabKit(placeGLB(loaded['corridor-wide'], { x: 30, z: 4, y: labY, ry: Math.PI / 2, name: 'lab-corridor', collide: false }));
  tintLabKit(placeGLB(loaded['corridor-wide'], { x: 38, z: 4, y: labY, ry: Math.PI / 2, name: 'lab-corridor-2', collide: false }));
  tintLabKit(placeGLB(loaded['room-wide'], { x: 50, z: 4, y: labY, ry: 0, name: 'lab-room', collide: false }));
  tintLabKit(placeGLB(loaded['room-small'], { x: 50, z: 16, y: labY, ry: 0, name: 'lab-room-2', collide: false }));
  tintLabKit(placeGLB(loaded['corridor-wide-corner'], { x: 50, z: 10, y: labY, ry: 0, name: 'lab-corner', collide: false }));
  // inner blast door at bottom of ramp
  placeGLB(loaded['gate-door'], { x: 26.2, z: 4, y: labY, ry: Math.PI / 2, name: 'lab-door', collide: false });
  // Sketchfab CC BY props (paths in props.js)
  placeFitted(loaded.cabinet, { x: 46, z: 8, y: labY, ry: Math.PI / 2, fit: 1.32, name: 'lab-cabinet-rusty', collide: true });
  placeFitted(loaded.cabinet, { x: 46, z: 9.35, y: labY, ry: Math.PI / 2, fit: 1.32, name: 'lab-cabinet-rusty-2', collide: true });
  placeFitted(loaded['lab-cabinet'], { x: 54.4, z: 1.4, y: labY, ry: Math.PI, fit: 1.7, name: 'lab-cabinet-glass', collide: true });
  placeFitted(loaded['lab-things'], { x: 47.4, z: 1.2, y: labY, ry: 0.15, fit: 1.45, name: 'lab-things', collide: true });
  const server1 = placeFitted(loaded['server-rack'], { x: 58.2, z: 6, y: labY, ry: -Math.PI / 2, fit: 1.95, name: 'server-1', collide: true });
  const server2 = placeFitted(loaded['server-rack'], { x: 58.2, z: 8.1, y: labY, ry: -Math.PI / 2, fit: 1.95, name: 'server-2', collide: true });
  const leds = addServerLeds([server1, server2], scene);
  if (bunkerFx && leds && leds.mats) bunkerFx.ledMats = leds.mats;
  placeFitted(loaded['lab-things'], { x: 53, z: 16.4, y: labY, ry: 0.4, fit: 1.35, name: 'lab-things-2', collide: true });
  placeFitted(loaded.paperclip, { x: 48.6, z: 7.2, y: labY, ry: 0.6, fit: 0.12, name: 'paperclip-1', collide: false });
  placeFitted(loaded.paperclip, { x: 51.2, z: 15.1, y: labY, ry: -0.3, fit: 0.12, name: 'paperclip-2', collide: false });
  // decorative folders on / near cabinets (instanced would drop extra mats; few clones, later merged)
  const folderSpots = [
    { x: 45.3, z: 7.4, ry: 0.4, manilla: false },
    { x: 45.55, z: 8.15, ry: 0.1, manilla: true },
    { x: 45.2, z: 9.0, ry: -0.3, manilla: false },
    { x: 47.8, z: 7.6, ry: 1.2, manilla: true },
    { x: 52.2, z: 15.6, ry: 0.7, manilla: false },
  ];
  folderSpots.forEach((s, i) => {
    const src = s.manilla ? loaded['folder-manilla'] : loaded.folder;
    placeFitted(src, { x: s.x, z: s.z, y: labY, ry: s.ry, fit: 0.34, rx: Math.PI / 2, name: 'prop-folder-' + i, collide: false });
  });
  placeGLB(loaded['box-large'], { x: 44, z: 0.4, y: labY, ry: 0.2, name: 'lab-box-1', collide: true });
  placeGLB(loaded['box-large'], { x: 45.1, z: 0.8, y: labY, ry: 0.5, name: 'lab-box-2', collide: true });

  // Lab walls (XZ), door gap on west of first corridor at z=4, x=26
  // corridor 8m: from x=26 to 34, z=0 to 8; then 34-42; room-wide 20×12 at (50,4) → x 40-60, z -2 to 10
  // room-small 12×12 at (50,16) → x 44-56, z 10-22
  const W = 0.35;
  function wall(minx, maxx, minz, maxz) { labWalls.push({ minx, maxx, minz, maxz }); }
  // corridor north/south walls, x 26-42, z around 0 and 8, opening none on sides
  wall(26, 42, 0 - W, 0 + W);
  wall(26, 42, 8 - W, 8 + W);
  // west wall of corridor with door gap z=2.3-5.7
  wall(26 - W, 26 + W, 0, 2.3);
  wall(26 - W, 26 + W, 5.7, 8);
  // room-wide walls (50,4): x 40-60, z -2-10 — west is open toward corridor at z=0-8, x=40
  wall(42, 60, -2 - W, -2 + W); // south
  wall(42, 60, 10 - W, 10 + W); // north, but leave gap x 44-56 for room-small
  // fix north: two segments leaving gap 44-56? room-small connects at z=10, x 44-56
  labWalls.pop();
  wall(42, 44, 10 - W, 10 + W);
  wall(56, 60, 10 - W, 10 + W);
  wall(60 - W, 60 + W, -2, 10); // east of room-wide
  // west of room-wide: closed except corridor z 0-8 at x=42
  wall(42 - W, 42 + W, -2, 0);
  wall(42 - W, 42 + W, 8, 10);
  // room-small (50,16): x 44-56, z 10-22
  wall(44 - W, 44 + W, 10, 22);
  wall(56 - W, 56 + W, 10, 22);
  wall(44, 56, 22 - W, 22 + W);

  // —— Wreck ——
  const ufo = placeGLB(loaded.ufo, {
    x: -8, z: 45, y: 1.1, ry: 0.4, name: 'ufo', collide: true,
  });
  ufo.rotation.z = 0.35;
  ufo.rotation.x = 0.18;
  ufo.updateMatrixWorld(true);
  ufo.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m) continue;
      if (m.metalness != null) m.metalness = Math.min(m.metalness ?? 1, 0.45);
      if (m.roughness != null) m.roughness = Math.max(m.roughness ?? 0, 0.42);
      if (m.color) m.color.lerp(new THREE.Color(0x6a7278), 0.55);
      m.envMapIntensity = 0;
      m.needsUpdate = true;
    }
  });
  // recompute solid
  solids.pop();
  addSolidFrom(ufo);
  scene.add(makeScorch());
  const debrisPlaces = [
    { x: -2.2, z: 48.2, ry: 0.5, scale: 1.65 },
    { x: -14.1, z: 50.0, ry: 2.1, scale: 1.35 },
    { x: -11.2, z: 40.4, ry: 1.2, scale: 1.15 },
    { x: 0.3, z: 44.1, ry: 0.8, scale: 1.05 },
    { x: -16.4, z: 43.2, ry: 2.8, scale: 1.45 },
    { x: -5.1, z: 52.0, ry: 0.3, scale: 1.1 },
    { x: -10.2, z: 48.4, ry: 1.7, scale: 0.95 },
    { x: 1.4, z: 50.2, ry: 0.2, scale: 0.9 },
    { x: -18.0, z: 46.1, ry: 2.4, scale: 1.2 },
    { x: -3.4, z: 41.6, ry: 0.9, scale: 0.85 },
    { x: -7.6, z: 53.2, ry: 1.5, scale: 1.05 },
    { x: 2.2, z: 47.0, ry: 2.0, scale: 0.8 },
  ];
  debrisPlaces.forEach((d, i) => {
    placeGLB(loaded.debris, { x: d.x, z: d.z, y: 0, ry: d.ry, scale: d.scale, name: 'debris-' + (i + 1), collide: true });
  });
  placeGLB(loaded.papers, { x: -10, z: 41, y: 0.02, ry: 0.7, scale: 1.4, name: 'papers', collide: false });
  const mf = [
    { x: -20, z: 36, ry: 0.15, scale: 1 },
    { x: -16.5, z: 36.4, ry: 0.15, scale: 1 },
    { x: -24, z: 40, ry: Math.PI / 2 + 0.1, scale: 1 },
    { x: 4, z: 36, ry: -0.2, scale: 1 },
    { x: 7, z: 42, ry: Math.PI / 2, scale: 1 },
  ];
  instanceFrom(loaded['metal-fence'], mf, { collide: true, name: 'metal-fences' });

  // —— Evidence props ——
  const evPos = {
    'area-other': { x: -13, z: 9.2, y: 0.85, zone: 'ranch' },      // by shed
    'proj-engagement': { x: -18, z: -8, y: 0.02, zone: 'ranch' },  // field / truck
    'area-materials': { x: 6.2, z: -7.2, y: 0.55, zone: 'hangar' },
    'area-control': { x: 16.4, z: -7.2, y: 0.55, zone: 'hangar' },
    'area-lift': { x: 47.2, z: 8, y: LAB_Y, zone: 'lab' },              // by cabinet
    'area-spatial': { x: 53, z: 15.2, y: LAB_Y, zone: 'lab' },
    'roswell-pio': { x: -11, z: 41.2, y: 0.02, zone: 'wreck' },
    'roswell-debris': { x: -4.2, z: 42.4, y: 0.4, zone: 'wreck' },
  };
  for (const ev of EVIDENCE) {
    const p = evPos[ev.id];
    const usePapers = ev.id === 'proj-engagement' || ev.id === 'roswell-pio';
    const src = usePapers ? loaded.papers : loaded.folder;
    const obj = usePapers
      ? placeGLB(src, {
          x: p.x, z: p.z, y: p.y,
          ry: ev.id.length * 0.4,
          scale: 1.3,
          collide: false,
          name: 'evidence-' + ev.id,
        })
      : placeFitted(src, {
          x: p.x, z: p.z, y: p.y,
          ry: ev.id.length * 0.4,
          fit: 0.36,
          rx: Math.PI / 2,
          collide: false,
          name: 'evidence-' + ev.id,
        });
    // glow
    obj.traverse((o) => {
      if (o.isMesh && o.material) {
        const m = o.material.clone();
        m.emissive = new THREE.Color(0xc9a23a);
        m.emissiveIntensity = 0.35;
        o.material = m;
      }
    });
    const mark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd4a04a, emissive: 0xd4a04a, emissiveIntensity: 1.4 }),
    );
    mark.position.set(0, usePapers ? 0.25 : 0.42, 0);
    obj.add(mark);
    evidenceNodes.set(ev.id, obj);
  }

  // —— Investigator ——
  const manGltf = loaded.man;
  const man = prepareObject(cloneScene(manGltf));
  man.name = 'investigator';
  // feet to y=0, height ~1.75
  tmpBox.setFromObject(man);
  const h = tmpBox.max.y - tmpBox.min.y || 1.8;
  const sc = 1.75 / h;
  man.scale.setScalar(sc);
  man.updateMatrixWorld(true);
  tmpBox.setFromObject(man);
  man.position.y -= tmpBox.min.y;
  man.position.x = player.pos.x;
  man.position.z = player.pos.z;
  scene.add(man);
  player.object = man;
  if (manGltf.animations && manGltf.animations.length) {
    mixer = new THREE.AnimationMixer(man);
    const clips = manGltf.animations;
    const find = (re) => clips.find((c) => re.test(c.name));
    const idleC = find(/Idle|Standing/i);
    const walkC = find(/Walk/i);
    const runC = find(/Run(?!ningJump)/i);
    if (idleC) { player.actions.idle = mixer.clipAction(idleC); player.actions.idle.play(); }
    if (walkC) { player.actions.walk = mixer.clipAction(walkC); player.actions.walk.setEffectiveWeight(0); }
    if (runC) { player.actions.run = mixer.clipAction(runC); }
  }

  // TR-3B (Dylusion CC BY-NC 4.0). Final GLB at assets/tr3b-v1.glb.
  tr3b = await loadTR3B();
  tr3b.visible = false;
  scene.add(tr3b);

  onProg(1);
}

/* ---------- Merge static meshes by material (lower draw calls) ---------- */
function mergeStaticByMaterial() {
  const groups = new Map();
  const toRemove = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    if (o.name && (o.name.startsWith('evidence-') || o.name.startsWith('tr3b') || o.name === 'investigator')) return;
    if (o.parent && (o.parent.name === 'investigator' || (o.parent.name && o.parent.name.startsWith('evidence-')))) return;
    let skip = false;
    o.traverseAncestors((a) => {
      if (a.name === 'investigator' || a.name === 'tr3b' || (a.name && a.name.startsWith('evidence-'))) skip = true;
    });
    if (skip) return;
    if (o.morphTargetInfluences) return;
    const mat = o.material;
    if (!mat || Array.isArray(mat)) return;
    const key = mat.uuid;
    if (!groups.has(key)) groups.set(key, { mat, geos: [], meshes: [] });
    o.updateWorldMatrix(true, false);
    const g = geometryToFloat32(o.geometry.clone());
    g.applyMatrix4(o.matrixWorld);
    groups.get(key).geos.push(g);
    groups.get(key).meshes.push(o);
  });
  const mergedGroup = new THREE.Group();
  mergedGroup.name = 'merged-static';
  for (const { mat, geos, meshes } of groups.values()) {
    if (geos.length < 2) continue;
    try {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = 'merged-' + (mat.name || 'mat');
      mesh.frustumCulled = true;
      mergedGroup.add(mesh);
      for (const m of meshes) { m.visible = false; toRemove.push(m); }
    } catch {
      /* keep originals if attributes mismatch */
    }
  }
  if (mergedGroup.children.length) scene.add(mergedGroup);
}

/* ---------- UI ---------- */
function showPanel(id) {
  ['menu', 'how', 'credits', 'result', 'sheet'].forEach((p) => {
    const el = $(p);
    if (p === id) el.classList.remove('hidden');
    else if (p !== 'sheet' || id !== 'sheet') {
      if (p !== id) el.classList.add('hidden');
    }
  });
  if (id && id !== 'sheet') $(id).querySelector('button, [href], h1, h2')?.focus?.();
}
function hidePanels() {
  ['menu', 'how', 'credits', 'result'].forEach((p) => $(p).classList.add('hidden'));
}

function fillCredits() {
  // SOUND_CREDITS are folded into CREDITS already; this keeps the list exact.
  const root = $('crdList');
  root.textContent = '';
  for (const c of CREDITS) {
    const art = document.createElement('article');
    const h = document.createElement('h3');
    h.textContent = c.name;
    art.appendChild(h);
    const meta = document.createElement('p');
    meta.textContent = (c.author ? c.author + ' · ' : '') + c.license;
    art.appendChild(meta);
    if (c.url) {
      const a = document.createElement('a');
      a.href = c.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = c.url;
      art.appendChild(a);
    }
    if (c.note) {
      const n = document.createElement('p');
      n.textContent = c.note;
      art.appendChild(n);
    }
    root.appendChild(art);
  }
}

function openSheet(ev) {
  sndOpen();
  $('shTitle').textContent = ev.title;
  $('shQuote').textContent = '« ' + ev.quote + ' »';
  $('shBody').textContent = ev.summary;
  $('shPage').textContent = ev.pdfPage + (ev.printedPage ? ' (folio ' + ev.printedPage + ')' : '');
  $('shRef').textContent = 'BAASS Project Management Plan, 2 décembre 2008, DOW-UAP-D168, page PDF ' + ev.pdfPage + '.';
  $('sheet').classList.remove('hidden');
  $('bSheetOk').focus();
}
function closeSheet() {
  $('sheet').classList.add('hidden');
  maybeFinish();
}

function showHint(text) {
  const el = $('hint');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(showHint._t);
  showHint._t = setTimeout(() => el.classList.add('hidden'), 4500);
}

function showGameplayUI() {
  $('hudStats').classList.remove('hidden');
  $('bar').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
}
function hideGameplayUI() {
  $('touch').classList.add('hidden');
  $('bar').classList.add('hidden');
  $('hint').classList.add('hidden');
  $('bAct').classList.add('hidden');
}

function setMenuCine(on) {
  menuCine = !!on;
  if (on) {
    if (tr3b) {
      tr3b.visible = true;
      tr3b.position.set(10, 16.2, 6);
      tr3b.rotation.set(0.06, 0, 0);
      setTR3BLights(true);
    }
    if (worldLights) worldLights.applyAtmos('dusk');
  } else if (tr3bState === 'idle' && tr3b) {
    tr3b.visible = false;
    setTR3BLights(false);
  }
}

function startGame() {
  hidePanels();
  closeSheet();
  running = true;
  ended = false;
  setMenuCine(false);
  runStart = performance.now();
  elapsed = 0;
  showGameplayUI();
  $('hudEvidence').textContent = collected.size + ' / ' + EVIDENCE.length;
  $('hudZone').textContent = ZONES[currentZone]?.name || currentZone;
  showHint('Explore le ranch. Approche-toi des dossiers dorés et appuie sur Collecter.');
  sndClick();
  AudioSys.setZone(currentZone);
  if (worldLights) worldLights.applyAtmos(currentZone);
  if (Fade && !reducedMotion()) Fade.toClear(520);
  else if (Fade) Fade.toClear(0);
}

function resetRun() {
  collected.clear();
  tr3bState = 'idle';
  tr3bSeen = false;
  wreckVisited = false;
  ended = false;
  running = false;
  elapsed = 0;
  currentZone = 'ranch';
  enteredBunker = false;
  player.pos.set(-16, 0, 18);
  player.pos.y = 0;
  player.yaw = Math.PI;
  camYaw = Math.PI;
  camPitch = 0.28;
  if (player.object) {
    player.object.position.set(player.pos.x, player.object.position.y, player.pos.z);
    player.object.rotation.y = player.yaw;
  }
  evidenceNodes.forEach((n) => { n.visible = true; });
  if (tr3b) { tr3b.visible = false; setTR3BLights(false); AudioSys.setHum(false); }
  if (worldLights) worldLights.applyAtmos('ranch');
  AudioSys.setZone('ranch');
  $('hudEvidence').textContent = '0 / ' + EVIDENCE.length;
  $('hudTime').textContent = '0:00';
  $('hudZone').textContent = 'Ranch';
  $('result').classList.add('hidden');
}

function goMenu() {
  running = false;
  if (document.pointerLockElement) document.exitPointerLock();
  hideGameplayUI();
  showPanel('menu');
  setMenuCine(true);
  $('bPlay').focus();
}

function replay() {
  resetRun();
  startGame();
}

/* ---------- Loop ---------- */
let frames = 0, fpsT = 0, fpsAcc = 0;
function loop() {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (running && !ended) {
    elapsed = (performance.now() - runStart) / 1000;
    $('hudTime').textContent = formatTime(elapsed);
    updatePlayer(dt);
    updateTR3B(dt);
    nearestEvidence = nearestEv();
    if (nearestEvidence) {
      $('bAct').classList.remove('hidden');
      $('bAct').textContent = 'Collecter';
      if (!$('hint').textContent.includes('Collecter') && $('sheet').classList.contains('hidden')) {
        // don't spam
      }
    } else {
      $('bAct').classList.add('hidden');
    }
    // bob evidence markers
    const t = performance.now() / 1000;
    evidenceNodes.forEach((n, id) => {
      if (!n.visible) return;
      const mark = n.children.find((c) => c.isMesh && c.geometry && c.geometry.type === 'SphereGeometry');
      if (mark) mark.position.y = 0.35 + Math.sin(t * 2.4 + id.length) * 0.08;
      n.rotation.y += dt * 0.5;
    });
  }
  if (pickupFx) pickupFx.update(dt, camera);
  updateBunkerLights(bunkerFx, performance.now() / 1000);
  if (tr3b && tr3b.visible) pulseCraft(tr3b, performance.now() / 1000, tr3bState !== 'gone');
  if (!running && !camOverride) {
    // cinematic: slow orbit of the TR-3B over the base at dusk
    const t = performance.now() / 1000;
    const ang = t * 0.085;
    const rad = 24;
    camera.position.set(10 + Math.cos(ang) * rad, 10.5, 6 + Math.sin(ang) * rad);
    camera.lookAt(10, 13.5, 6);
    if (tr3b && menuCine) {
      tr3b.position.set(10, 15.4 + Math.sin(t * 0.7) * 0.45, 6);
      tr3b.rotation.y = t * 0.08;
      tr3b.rotation.x = 0.06;
    }
  }
  if (camOverride) {
    camera.position.set(camOverride.x, camOverride.y, camOverride.z);
    camera.lookAt(camOverride.tx, camOverride.ty, camOverride.tz);
  }
  renderer.render(scene, camera);
  const info = renderer.info.render;
  lastCalls = info.calls;
  lastTris = info.triangles;
  frames++;
  fpsAcc += dt;
  if (fpsAcc >= 0.4) {
    lastFps = Math.round(frames / fpsAcc);
    frames = 0; fpsAcc = 0;
    if (showFps) {
      $('fps').textContent =
        lastFps + ' fps\n' +
        lastCalls + ' appels · ' + lastTris.toLocaleString('fr-CA') + ' tri\n' +
        'palier ' + gpuInfo.tier + (qualityLow ? ' (low)' : '') +
        (gpuInfo.type === 'override' ? ' override' : gpuInfo.type === 'fallback' ? ' FALLBACK' : '') + '\n' +
        (gpuInfo.gpu || '');
    }
  }
  renderer.info.reset();
}

/* ---------- Hook & boot ---------- */
function exposeHook() {
  window.__game = {
    get ready() { return ready; },
    version: VERSION,
    get calls() { return lastCalls; },
    get tris() { return lastTris; },
    get fps() { return lastFps; },
    get gpu() { return gpuInfo; },
    get collected() { return [...collected]; },
    get zone() { return currentZone; },
    get tr3bSeen() { return tr3bSeen; },
    get tr3bState() { return tr3bState; },
    get wreckVisited() { return wreckVisited; },
    get ended() { return ended; },
    get running() { return running; },
    get time() { return elapsed; },
    get score() { return computeScore(elapsed); },
    get player() { return { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw }; },
    get evidence() { return EVIDENCE.map((e) => e.id); },
    startGame, goMenu, replay, resetRun,
    collect(id) { return collectEvidence(id, { silent: false }); },
    collectSilent(id) { return collectEvidence(id, { silent: true }); },
    triggerTR3B,
    tr3bSnap(phase) {
      if (!tr3b) return false;
      tr3b.visible = true;
      setTR3BLights(true);
      if (phase === 'hover') {
        tr3bState = 'hover';
        tr3bSeen = true;
        tr3bClock = performance.now();
        tr3bT = 0;
        tr3b.position.set(10, 22, 4);
        tr3b.rotation.set(0, 0, 0);
      } else if (phase === 'flying') {
        triggerTR3B();
      } else if (phase === 'gone') {
        tr3bState = 'gone';
        tr3b.visible = false;
        setTR3BLights(false);
        AudioSys.setHum(false);
      } else {
        AudioSys.setHum(true);
      }
      if (phase === 'hover' || phase === 'flying') AudioSys.setHum(true);
      return tr3bState;
    },
    endRun,
    goto(zone) {
      const spots = {
        ranch: [-20, 14],
        hangar: [8, -6],
        lab: [36, 4],
        wreck: [-10, 40],
        entrance: [16.55, 1.85],
        ramp: [22.5, 4],
      };
      const s = spots[zone];
      if (!s) return false;
      const y = groundY(s[0], s[1]);
      player.pos.set(s[0], y, s[1]);
      if (player.object) player.object.position.set(s[0], y, s[1]);
      if (zone === 'entrance') {
        camYaw = 0.92;
        camPitch = 0.12;
      } else if (zone === 'ramp') {
        camYaw = Math.PI / 2;
        camPitch = 0.22;
      }
      currentZone = zone === 'entrance' || zone === 'ramp' ? (zoneAt(s[0], s[1]) || 'hangar') : zone;
      $('hudZone').textContent = ZONES[currentZone]?.name || currentZone;
      if (worldLights) worldLights.applyAtmos(currentZone === 'lab' ? 'lab' : currentZone);
      AudioSys.setZone(currentZone);
      if (zone === 'wreck' || currentZone === 'wreck') wreckVisited = true;
      return true;
    },
    get bunker() {
      return {
        loaded: !!(bunkerFx && bunkerFx.group),
        labY: LAB_Y,
        playerY: player.pos.y,
        indoors: isIndoors(player.pos.x, player.pos.z, player.pos.y),
      };
    },
    get pickupFx() { return !!(pickupFx && pickupFx.active); },
    get audio() {
      return {
        get unlocked() { return AudioSys.unlocked; },
        get muted() { return AudioSys.muted; },
        unlock() { return AudioSys.unlock(); },
        setMuted(v) { AudioSys.setMuted(v); syncMute(); saveSettings(); },
        get loops() { return Object.keys(AudioSys.loops); },
        get buffers() { return Object.keys(AudioSys.buffers); },
      };
    },
    get qualityLow() { return qualityLow; },
    debugMats(substr) {
      const out = [];
      scene.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const n = o.name || '';
        if (substr && !n.toLowerCase().includes(substr.toLowerCase()) && !(o.material.name||'').toLowerCase().includes((substr||'').toLowerCase())) {
          if (out.length > 40) return;
        }
        const list = Array.isArray(o.material) ? o.material : [o.material];
        out.push({
          name: n, type: o.type,
          mats: list.map(m => ({
            name: m && m.name, map: !!(m && m.map),
            vc: !!(m && m.vertexColors),
            color: m && m.color ? '#'+m.color.getHexString() : null,
            em: m && m.emissiveIntensity,
          })),
          hasColorAttr: !!(o.geometry && o.geometry.getAttribute('color')),
        });
      });
      return out;
    },

    debugBoxes() {
      const out = [];
      scene.traverse((o) => {
        if (!o.name || o.name === '') return;
        if (!(o.isMesh || o.isGroup || o.isInstancedMesh || o.isObject3D && o.children.length)) return;
        if (o.parent && o.parent.name && !/^(lab-|bunker|server|prop-|evidence-|pav-|ufo|debris|hangar|tank|merged)/.test(o.name) && !/cabinet|folder|things|paperclip|machine|door|ground/.test(o.name)) return;
        const b = new THREE.Box3().setFromObject(o);
        if (b.isEmpty()) return;
        out.push({
          name: o.name, type: o.type,
          min: [+b.min.x.toFixed(2), +b.min.y.toFixed(2), +b.min.z.toFixed(2)],
          max: [+b.max.x.toFixed(2), +b.max.y.toFixed(2), +b.max.z.toFixed(2)],
          size: [+(b.max.x-b.min.x).toFixed(2), +(b.max.y-b.min.y).toFixed(2), +(b.max.z-b.min.z).toFixed(2)],
        });
      });
      return out;
    },
    get solids() { return solids.slice(0, 80).map(s => ({...s, minx:+s.minx.toFixed(1), maxx:+s.maxx.toFixed(1), minz:+s.minz.toFixed(1), maxz:+s.maxz.toFixed(1)})); },

    applyTier(n) {
      gpuInfo.tier = n;
      gpuInfo.type = 'override';
      qualityLow = n <= 1;
      applyQuality();
      return { tier: gpuInfo.tier, qualityLow };
    },
    setCamera(x, y, z, tx, ty, tz) {
      camOverride = { x, y, z, tx, ty: ty ?? 2, tz };
    },
    clearCamera() { camOverride = null; },
    get tr3bInfo() {
      if (!tr3b) return { loaded: false };
      const b = new THREE.Box3().setFromObject(tr3b);
      return {
        loaded: true,
        placeholder: !!tr3b.userData.placeholder,
        visible: tr3b.visible,
        state: tr3bState,
        seen: tr3bSeen,
        pos: tr3b.position.toArray(),
        size: b.isEmpty() ? null : { x: b.max.x-b.min.x, y: b.max.y-b.min.y, z: b.max.z-b.min.z },
        names: (() => { const a=[]; tr3b.traverse((o)=>a.push(o.name)); return a; })(),
      };
    },
    hideUI(on) {
      ['menu','how','credits','result','sheet','hint','touch','bar','hudStats','loading'].forEach((id) => {
        const el = $(id);
        if (!el) return;
        if (on) el.classList.add('hidden');
      });
      if (!on) showGameplayUI();
    },
    showCredits() { fillCredits(); showPanel('credits'); },
    showSheet(id) {
      const ev = EVIDENCE.find((e) => e.id === id);
      if (ev) openSheet(ev);
    },
    credits: CREDITS,
    assets: ASSETS_USED,
    banner: BANNER,
    disclaimer: DISCLAIMER,
  };
}

async function boot() {
  exposeHook();
  loadSettings();
  fillCredits();
  $('banner').textContent = BANNER;
  Fade = setupFade();
  Fade.toBlack(0);
  AudioSys.load();
  resize();
  await initGPU();
  loader = makeLoader();
  try {
    await buildWorld((p) => { $('loadBar').style.width = Math.round(p * 100) + '%'; });
    mergeStaticByMaterial();
    scene.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const isLabKit = (o.name || '').startsWith('merged-colormap') || (o.name || '').startsWith('lab-') ||
        list.some((m) => m && /colormap|ColorMap|Kenney/i.test(m.name || ''));
      if (!isLabKit) return;
      const concrete = new THREE.Color(0x8c8880);
      list.forEach((m) => {
        if (!m) return;
        if (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity || 0) > 0.5) return;
        m.map = null; m.normalMap = null; m.vertexColors = false;
        m.color = concrete.clone();
        m.roughness = 0.88; m.metalness = 0.04;
        m.envMapIntensity = 0; m.needsUpdate = true;
      });
      if (o.geometry && o.geometry.getAttribute('color')) o.geometry.deleteAttribute('color');
    });
    pickupFx = new PickupFX(scene);
    applyQuality();
    if (worldLights) worldLights.applyAtmos('dusk');
  } catch (err) {
    console.error('buildWorld:', err);
    $('loading').querySelector('.load-sub').textContent = 'Erreur de chargement. Recharge la page.';
    return;
  }
  $('loading').classList.add('hidden');
  showPanel('menu');
  setMenuCine(true);
  ready = true;
  if (Fade && !reducedMotion()) Fade.toClear(700);
  else if (Fade) Fade.toClear(0);
  
  if (showFps) $('fps').classList.remove('hidden');
  clock.start();
  loop();

  // SW
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js?v=' + VERSION, { updateViaCache: 'none' });
    } catch (err) {
      console.warn('sw:', err);
    }
  }
}

/* buttons */
$('bPlay').addEventListener('click', () => { AudioSys.unlock(); if (!collected.size && !ended) { /* fresh */ } if (ended) resetRun(); startGame(); });
$('bHow').addEventListener('click', () => { sndClick(); showPanel('how'); });
$('bHowGo').addEventListener('click', () => { AudioSys.unlock(); if (ended) resetRun(); startGame(); });
$('bCredits').addEventListener('click', () => { sndClick(); fillCredits(); showPanel('credits'); });
$('bBarCredits').addEventListener('click', () => { sndClick(); running = false; hideGameplayUI(); fillCredits(); showPanel('credits'); });
$('bBarMenu').addEventListener('click', () => { sndClick(); goMenu(); });
$('bReplay').addEventListener('click', () => { AudioSys.unlock(); replay(); });
$('bResMenu').addEventListener('click', () => { sndClick(); resetRun(); goMenu(); });
$('bSheetOk').addEventListener('click', () => { sndClick(); closeSheet(); });
$('bMute').addEventListener('click', () => { if (!AudioSys.muted) AudioSys.unlock(); toggleMute(); });
$('bFull').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch { /* ignore */ }
});
document.querySelectorAll('[data-close]').forEach((b) => {
  b.addEventListener('click', () => {
    const id = b.getAttribute('data-close');
    $(id).classList.add('hidden');
    if (id === 'sheet') closeSheet();
    else if (!running) showPanel('menu');
  });
});

boot();
