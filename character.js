/* character.js — playable investigator for Dossier BAASS 3D v0.3.0.
 *
 * One loader for the provisional placeholder AND the final model.
 * To switch to the final detective (Jungle Jim, CC BY 4.0, via the 3D chain):
 *   1. copy the GLB to  assets/models/detective_v1.glb
 *   2. set CHARACTER.url = CHARACTER_FINAL_URL and CHARACTER.placeholder = false
 *   3. add './assets/models/detective_v1.glb' to sw.js PRECACHE, bump VERSION
 * Nothing else changes: clips are found by name (Idle / Walk / Run, exact name
 * first, then any name ending in idle / walk / run, e.g. "Armature|Man_Walk").
 * The model must face +Z in Three.js (−Y in Blender), feet at y = 0, 1 unit = 1 m;
 * it is scaled to CHARACTER.height anyway.
 * ?char=placeholder forces the provisional Quaternius detective (debug).
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const CHARACTER_FINAL_URL = './assets/models/detective_v1.glb';
export const CHARACTER_PLACEHOLDER_URL = './assets/man-v1.glb';

export const CHARACTER = {
  // v0.3.0: final detective from the 3D chain (Rendu, md5 257c20b5…).
  // Placeholder stays as the automatic fallback if this file fails to load.
  url: CHARACTER_FINAL_URL,
  placeholder: false,
  height: 1.8,
  // Game speeds (m/s). Pad magnitude 0..1 maps to 0..runSpeed.
  walkSpeed: 1.9,
  runSpeed: 5.2,
  // Speed the clips were authored at, for timeScale (less foot sliding).
  clipWalkSpeed: 1.5,
  clipRunSpeed: 4.2,
  credit: {
    name: 'Private Investigator (Detective)',
    author: 'Jungle Jim',
    license: 'CC BY 4.0',
    url: 'https://skfb.ly/oPEIo',
  },
};

/** Find Idle / Walk / Run among clip names (exact first, then suffix). */
export function pickClips(animations) {
  const list = animations || [];
  const exact = (n) => list.find((c) => c.name === n);
  const suffix = (re) => list.find((c) => re.test(c.name));
  return {
    idle: exact('Idle') || suffix(/(^|[|_\s.:-])idle$/i) || suffix(/(^|[|_\s.:-])(standing|stand)$/i) || suffix(/idle/i) || null,
    walk: exact('Walk') || suffix(/(^|[|_\s.:-])walk(ing)?$/i) || suffix(/walk/i) || null,
    run: exact('Run') || suffix(/(^|[|_\s.:-])run(ning)?$/i) || suffix(/run(?!ningjump)/i) || null,
  };
}

/** Target blend weights for a ground speed (m/s). */
export function blendWeights(speed, cfg = CHARACTER) {
  const s = Math.max(0, speed);
  if (s < 0.05) return { idle: 1, walk: 0, run: 0 };
  if (s <= cfg.walkSpeed) {
    const t = s / cfg.walkSpeed;
    return { idle: 1 - t, walk: t, run: 0 };
  }
  const t = Math.min(1, (s - cfg.walkSpeed) / (cfg.runSpeed * 0.78 - cfg.walkSpeed));
  return { idle: 0, walk: 1 - t, run: t };
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/* —— Placeholder dress-up: trench coat colours, fedora, coat skirt —— */
const COAT = 0x8a6d45;
const DARK = 0x2b241d;
function dressAsDetective(model) {
  const recolor = { shirt: COAT, pants: 0x3b3128, socks: 0x1d1814, hair: 0x2a2018 };
  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      const key = (m.name || '').toLowerCase();
      if (!(key in recolor)) return m;
      const c = m.clone();
      c.color = new THREE.Color(recolor[key]);
      c.map = null;
      c.roughness = 0.82;
      c.metalness = 0;
      return c;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  model.updateMatrixWorld(true);
  const bone = (re) => {
    let b = null;
    model.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; });
    return b;
  };
  const head = bone(/^head$/i) || bone(/head/i);
  const headEnd = bone(/head_?end|headtop/i);
  const hips = bone(/^(hips|pelvis|torso)$/i) || bone(/hips|pelvis/i);
  const coatMat = new THREE.MeshStandardMaterial({ color: COAT, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  coatMat.name = 'detective-coat';
  const hatMat = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.7, metalness: 0 });
  hatMat.name = 'detective-hat';
  model.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); o.boundingBox = null; } });
  const box = new THREE.Box3().setFromObject(model);
  const H = box.max.y - box.min.y;
  const w = new THREE.Vector3();
  if (head) {
    // Fedora: brim + slightly tapered crown + band, one mesh.
    const brim = new THREE.CylinderGeometry(0.19, 0.2, 0.018, 14);
    const crown = new THREE.CylinderGeometry(0.105, 0.125, 0.13, 12);
    crown.translate(0, 0.072, 0);
    const parts = [brim, crown];
    const g = mergeSimple(parts);
    const hat = new THREE.Mesh(g, hatMat);
    hat.name = 'detective-hat';
    const top = headEnd ? headEnd.getWorldPosition(new THREE.Vector3()) : head.getWorldPosition(w).add(new THREE.Vector3(0, H * 0.1, 0));
    hat.position.set(top.x, top.y - H * 0.035, top.z);
    hat.rotation.x = -0.08;
    hat.updateMatrixWorld(true); // parentless: world = local
    head.attach(hat);
  }
  if (hips) {
    const hp = hips.getWorldPosition(new THREE.Vector3());
    const len = H * 0.3;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.115, H * 0.15, len, 12, 1, true), coatMat);
    skirt.name = 'detective-coat';
    skirt.position.set(hp.x, hp.y + H * 0.06 - len / 2, hp.z);
    skirt.updateMatrixWorld(true);
    hips.attach(skirt);
  }
}

function mergeSimple(geos) {
  // tiny local merge (no BufferGeometryUtils import needed)
  let vCount = 0, iCount = 0;
  for (const g of geos) { vCount += g.attributes.position.count; iCount += g.index.count; }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count; io += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/**
 * Build the controller from a loaded GLTF.
 * @returns {{object, mixer, clips, update(dt, speed), setPose(x,y,z,yaw,snap), state, weights, setHidden(b)}}
 */
export function createCharacter(gltf, { placeholder = CHARACTER.placeholder, cfg = CHARACTER, prepare } = {}) {
  const model = SkeletonUtils.clone(gltf.scene);
  if (prepare) prepare(model);
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      // Skinned bounds follow the bind pose; never cull the player.
      o.frustumCulled = false;
    }
  });
  // Normalise: feet at 0, height cfg.height.
  // Skinned bounds need fresh bone matrices: before the first render they are
  // all zero, Box3 then sees a ~0-height model and the scale explodes (this is
  // why the v0.2.x investigator was never on screen).
  const box = new THREE.Box3();
  const measure = () => {
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (o.isSkinnedMesh) { o.skeleton.update(); o.boundingBox = null; o.boundingSphere = null; }
    });
    return box.setFromObject(model);
  };
  measure();
  let h = box.max.y - box.min.y;
  if (!(h > 1e-4 && h < 1e5)) h = cfg.height;
  model.scale.multiplyScalar(cfg.height / h);
  measure();
  model.position.y -= box.min.y;
  model.updateMatrixWorld(true);
  if (placeholder) dressAsDetective(model);

  const root = new THREE.Group();
  root.name = 'investigator';
  root.add(model);

  const clips = pickClips(gltf.animations);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const k of ['idle', 'walk', 'run']) {
    if (!clips[k]) continue;
    const a = mixer.clipAction(clips[k]);
    a.enabled = true;
    a.setEffectiveTimeScale(1);
    a.setEffectiveWeight(k === 'idle' ? 1 : 0);
    a.play();
    actions[k] = a;
  }
  // Missing clips fall back to their neighbour.
  const slot = {
    idle: actions.idle ? 'idle' : (actions.walk ? 'walk' : (actions.run ? 'run' : null)),
    walk: actions.walk ? 'walk' : (actions.run ? 'run' : (actions.idle ? 'idle' : null)),
    run: actions.run ? 'run' : (actions.walk ? 'walk' : (actions.idle ? 'idle' : null)),
  };
  // v0.3.3: one-shot clips from the final detective (Pickup: crouch and grab,
  // Inspect: look at the item), blended over the locomotion. The placeholder
  // has none, so playOnce() is then a no-op.
  const ONE_SHOT = { pickup: /(^|[|_\s.:-])(pickup|search)$/i, inspect: /(^|[|_\s.:-])inspect$/i };
  const once = {};
  for (const [k, re] of Object.entries(ONE_SHOT)) {
    const c = (gltf.animations || []).find((a) => re.test(a.name));
    if (!c) continue;
    const a = mixer.clipAction(c);
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    once[k] = a;
  }
  const SHOT_FADE = 0.2;
  let shot = null, shotT = 0, shotW = 0, shotOut = false, shotQueue = [];
  function startShot(k) {
    shot = once[k]; shotT = 0; shotOut = false;
    shot.reset(); shot.enabled = true; shot.setEffectiveTimeScale(1); shot.setEffectiveWeight(shotW); shot.play();
  }
  /** Play one-shot clips in sequence, e.g. playOnce('pickup', 'inspect'). false if none exists. */
  function playOnce(...names) {
    const list = names.filter((n) => once[n]);
    if (!list.length || hidden) return false;
    if (shot) shot.stop();
    shotQueue = list.slice(1);
    startShot(list[0]);
    return true;
  }
  const cur = { idle: 1, walk: 0, run: 0 };
  let yaw = 0;
  let state = 'idle';
  let hidden = false;

  function update(dt, speed) {
    const tgt = blendWeights(speed, cfg);
    const k = 1 - Math.exp(-dt * 9);
    for (const n of ['idle', 'walk', 'run']) cur[n] += (tgt[n] - cur[n]) * k;
    const sum = { idle: 0, walk: 0, run: 0 };
    for (const n of ['idle', 'walk', 'run']) if (slot[n]) sum[slot[n]] += cur[n];
    for (const n of Object.keys(actions)) actions[n].setEffectiveWeight(sum[n]);
    if (actions.walk) actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / cfg.clipWalkSpeed, 0.7, 1.6));
    if (actions.run) actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / cfg.clipRunSpeed, 0.75, 1.3));
    state = tgt.run > 0.5 ? 'run' : (tgt.walk > 0.5 ? 'walk' : (tgt.idle >= 0.5 ? 'idle' : 'walk'));
    if (shot) {
      shotT += dt;
      const dur = shot.getClip().duration;
      if (speed > 0.8) { shotOut = true; shotQueue = []; } // moving again: fade out
      // Chained clips start and end on the same Idle pose: no fade between them.
      const end = shotOut || (!shotQueue.length && shotT >= dur - SHOT_FADE);
      shotW = THREE.MathUtils.clamp(shotW + (end ? -dt : dt) / SHOT_FADE, 0, 1);
      shot.setEffectiveWeight(shotW);
      for (const n of Object.keys(actions)) actions[n].setEffectiveWeight(actions[n].getEffectiveWeight() * (1 - shotW));
      if (shotT >= dur || (shotOut && shotW <= 0)) {
        shot.stop(); shot = null;
        if (shotQueue.length) startShot(shotQueue.shift()); else shotW = 0;
      }
    }
    mixer.update(dt);
  }

  function setPose(x, y, z, targetYaw, dt = 0, snap = false) {
    root.position.set(x, y, z);
    if (targetYaw != null) {
      if (snap || dt <= 0) yaw = targetYaw;
      else yaw += wrapAngle(targetYaw - yaw) * (1 - Math.exp(-dt * 14));
      root.rotation.y = yaw;
    }
  }

  return {
    object: root,
    model,
    mixer,
    actions,
    clips: Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, c ? c.name : null])),
    update,
    setPose,
    playOnce,
    oneShots: Object.keys(once),
    get oneShot() { return shot ? shot.getClip().name : null; },
    setHidden(b) { if (b !== hidden) { hidden = b; model.visible = !b; } },
    get hidden() { return hidden; },
    get yaw() { return yaw; },
    get state() { return state; },
    get weights() { return { ...cur }; },
  };
}
