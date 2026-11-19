/* mood.js — bunker, audio, atmosphere, pickup FX. Dossier BAASS 3D v0.2.2 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const LAB_Y = -6.5;
export const LAB_CEIL = -1.85;
export const BUNKER = { x0: 25.6, x1: 62.4, z0: -5.0, z1: 24.4 };
export const RAMP = { x0: 19.85, x1: 26.15, z0: 2.08, z1: 5.92 };
export const PAVILION = { x0: 18.45, x1: 19.95, z0: 1.55, z1: 6.45 };

export function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export function groundY(x, z) {
  const r = RAMP;
  if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
    // v0.3.0: follow the visible ramp slab (a straight plane, top face
    // ~0.15 m above its centre line). The old smoothstep floated the now
    // visible detective up to 0.6 m above / below the concrete.
    const t = Math.min(1, Math.max(0, (x - r.x0) / (r.x1 - r.x0)));
    return t * LAB_Y + 0.15 * Math.min(1, 6 * t, 6 * (1 - t));
  }
  const b = BUNKER;
  if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return LAB_Y;
  return 0;
}

export function isIndoors(x, z, y) {
  if (y < -0.7) return true;
  const r = RAMP;
  if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
  const b = BUNKER;
  if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return true;
  return false;
}

/* ---------- canvas textures ---------- */
function rnd(s) { s[0] = (s[0] * 16807) % 2147483647; return (s[0] - 1) / 2147483646; }

export function makeConcreteTex(size = 512, tint = [138, 132, 122], seed = 17) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  const s = [seed];
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd(s) * 46 - 23) | 0;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + (n * 0.96) | 0));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + (n * 0.88) | 0));
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 22; i++) {
    g.fillStyle = `rgba(${30 + rnd(s) * 20 | 0},${24 + rnd(s) * 16 | 0},${18},${0.04 + rnd(s) * 0.12})`;
    g.beginPath();
    g.ellipse(rnd(s) * size, rnd(s) * size, 16 + rnd(s) * 90, 8 + rnd(s) * 50, rnd(s) * 6, 0, 7);
    g.fill();
  }
  g.strokeStyle = 'rgba(18,16,14,0.28)';
  g.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    let x = rnd(s) * size, y = rnd(s) * size;
    g.moveTo(x, y);
    for (let k = 0; k < 7; k++) { x += rnd(s) * 50 - 25; y += rnd(s) * 55; g.lineTo(x, y); }
    g.stroke();
  }
  // formwork seams
  g.strokeStyle = 'rgba(40,36,30,0.22)';
  g.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    g.beginPath(); g.moveTo((i * size) / 4, 0); g.lineTo((i * size) / 4, size); g.stroke();
    g.beginPath(); g.moveTo(0, (i * size) / 4); g.lineTo(size, (i * size) / 4); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function makeSandTex(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#c2a36a';
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  const s = [91];
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd(s) * 36 - 16) | 0;
    d[i] = Math.max(0, Math.min(255, 194 + n));
    d[i + 1] = Math.max(0, Math.min(255, 163 + (n * 0.85) | 0));
    d[i + 2] = Math.max(0, Math.min(255, 106 + (n * 0.55) | 0));
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(90,60,30,${0.03 + rnd(s) * 0.08})`;
    g.beginPath();
    g.ellipse(rnd(s) * size, rnd(s) * size, 8 + rnd(s) * 40, 5 + rnd(s) * 24, rnd(s) * 3, 0, 7);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(28, 28);
  tex.anisotropy = 4;
  return tex;
}

export function makeHazardTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1a14';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#d4a017';
  for (let i = -1; i < 10; i++) {
    g.beginPath();
    g.moveTo(i * 32, 0);
    g.lineTo(i * 32 + 18, 0);
    g.lineTo(i * 32 + 50, 64);
    g.lineTo(i * 32 + 32, 64);
    g.closePath();
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(4, 1);
  return tex;
}

export function makeSignTex() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1c1810';
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#c9a23a';
  g.lineWidth = 8;
  g.strokeRect(10, 10, 492, 236);
  g.fillStyle = '#c42a1a';
  g.font = 'bold 48px ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace';
  g.textAlign = 'center';
  g.fillText('ZONE RESTREINTE', 256, 82);
  g.fillStyle = '#e8d9b0';
  g.font = 'bold 32px ui-monospace, Menlo, Consolas, monospace';
  g.fillText('BAASS  ·  NIVEAU −1', 256, 140);
  g.fillStyle = '#a89870';
  g.font = '22px ui-monospace, Menlo, Consolas, monospace';
  g.fillText('LABORATOIRE SOUTERRAIN', 256, 192);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeFloorTex() {
  const tex = makeConcreteTex(512, [110, 108, 100], 42);
  // paint a yellow safety line into a second canvas composited? just darker concrete is fine.
  tex.repeat.set(8, 6);
  return tex;
}


/* ---------- PBR textures (ambientCG CC0, KTX2) ---------- */
export let worldTex = null;

const TEX_SETS = {
  wall: {
    c: './assets/tex/concrete-wall-color.ktx2',
    n: './assets/tex/concrete-wall-normal.ktx2',
    o: './assets/tex/concrete-wall-orm.ktx2',
  },
  floor: {
    c: './assets/tex/concrete-floor-color.ktx2',
    n: './assets/tex/concrete-floor-normal.ktx2',
    o: './assets/tex/concrete-floor-orm.ktx2',
  },
  sand: {
    c: './assets/tex/sand-color.ktx2',
    n: './assets/tex/sand-normal.ktx2',
    o: './assets/tex/sand-orm.ktx2',
  },
  grate: {
    c: './assets/tex/grate-color.ktx2',
    n: './assets/tex/grate-normal.ktx2',
    o: './assets/tex/grate-orm.ktx2',
  },
};

function prepTex(tex, srgb) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export async function loadWorldTextures(ktx2) {
  if (!ktx2) return null;
  async function loadSet(urls) {
    const map = prepTex(await ktx2.loadAsync(urls.c), true);
    const normalMap = prepTex(await ktx2.loadAsync(urls.n), false);
    const orm = prepTex(await ktx2.loadAsync(urls.o), false);
    return { map, normalMap, orm };
  }
  try {
    const wall = await loadSet(TEX_SETS.wall);
    const floor = await loadSet(TEX_SETS.floor);
    const sand = await loadSet(TEX_SETS.sand);
    const grate = await loadSet(TEX_SETS.grate);
    worldTex = { wall, floor, sand, grate };
    return worldTex;
  } catch (err) {
    console.warn('world textures:', err);
    worldTex = null;
    return null;
  }
}

export function pbrMat(maps, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    map: maps?.map || null,
    normalMap: maps?.normalMap || null,
    normalScale: new THREE.Vector2(opts.normal ?? 1, opts.normal ?? 1),
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0,
    roughnessMap: maps?.orm || null,
    metalnessMap: maps?.orm || null,
    aoMap: maps?.orm || null,
    aoMapIntensity: opts.ao ?? 1,
    envMapIntensity: 0,
    transparent: !!opts.transparent,
    alphaTest: opts.alphaTest ?? 0,
    depthWrite: opts.depthWrite ?? true,
    side: opts.side ?? THREE.FrontSide,
  });
  if (opts.name) m.name = opts.name;
  return m;
}

/** BoxGeometry with UVs in metres (1 tile = `tile` m) and uv2 for aoMap. */
export function tileBoxGeo(w, h, d, tile = 2.4) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const su = sizes[f][0] / tile, sv = sizes[f][1] / tile;
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv);
    }
  }
  uv.needsUpdate = true;
  g.setAttribute('uv2', uv.clone());
  return g;
}

function tilePlaneGeo(w, d, tile = 2.4) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  const su = w / tile, sv = d / tile;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  g.setAttribute('uv2', uv.clone());
  return g;
}

export function buildHorizon(scene) {
  const R = 170;
  const skyGeo = new THREE.SphereGeometry(R, 28, 18);
  const pos = skyGeo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const cZ = new THREE.Color(0x0a1028);
  const cM = new THREE.Color(0x4a2868);
  const cH = new THREE.Color(0xff6a32);
  const cG = new THREE.Color(0x140a08);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / R;
    if (y > 0.18) tmp.copy(cM).lerp(cZ, Math.min(1, (y - 0.18) / 0.82));
    else if (y > 0) tmp.copy(cH).lerp(cM, y / 0.18);
    else tmp.copy(cH).lerp(cG, Math.min(1, -y * 2.2));
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false,
  }));
  sky.name = 'sky-dusk';
  sky.renderOrder = -20;
  sky.frustumCulled = false;
  scene.add(sky);

  // Distant mountain silhouette (one merged mesh)
  const N = 72;
  const positions = [], indices = [];
  const rad = 118, width = 22;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const h = 6 + 20 * Math.pow(Math.abs(Math.sin(i * 0.55 + 0.3)), 1.15)
      * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.37 + 1.1)));
    const c = Math.cos(a), s = Math.sin(a);
    positions.push(c * rad, 0, s * rad);
    positions.push(c * (rad + width), 0, s * (rad + width));
    positions.push(c * (rad + width * 0.45), h, s * (rad + width * 0.45));
  }
  for (let i = 0; i < N; i++) {
    const a = i * 3, b = (i + 1) * 3;
    indices.push(a, b, a + 2, b, b + 2, a + 2);
    indices.push(a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);
  }
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mGeo.setIndex(indices);
  mGeo.computeVertexNormals();
  const mountains = new THREE.Mesh(mGeo, new THREE.MeshStandardMaterial({
    color: 0x1a1210, roughness: 1, metalness: 0, flatShading: true, envMapIntensity: 0,
  }));
  mountains.name = 'mountains';
  mountains.position.y = -0.5;
  scene.add(mountains);
  return { sky, mountains };
}

export function makeScorch() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 256, 8, 256, 256, 248);
  gr.addColorStop(0, 'rgba(8,6,4,0.96)');
  gr.addColorStop(0.18, 'rgba(22,12,6,0.88)');
  gr.addColorStop(0.42, 'rgba(40,20,8,0.55)');
  gr.addColorStop(0.7, 'rgba(60,32,12,0.22)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = 'multiply';
  const s = [77];
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = `rgba(10,6,2,${0.25 + rnd(s) * 0.45})`;
    g.lineWidth = 1 + rnd(s) * 3;
    g.beginPath();
    let x = 256 + (rnd(s) - 0.5) * 40, y = 256 + (rnd(s) - 0.5) * 40;
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (rnd(s) - 0.5) * 90;
      y += (rnd(s) - 0.5) * 90;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(8.2, 36),
    new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, fog: true, opacity: 0.95,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(-8, 0.05, 45);
  mesh.name = 'scorch';
  mesh.renderOrder = 1;
  return mesh;
}

/** Pull the camera in if the path from look-at to the desired camera hits a solid. */
export function placeCameraSafe(camera, desired, look, solids, pad = 0.32) {
  const dx = desired.x - look.x, dy = desired.y - look.y, dz = desired.z - look.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const steps = Math.max(6, Math.ceil(len / 0.18));
  let lx = look.x, ly = look.y, lz = look.z;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = look.x + dx * t, y = look.y + dy * t, z = look.z + dz * t;
    if (hitSolid(x, y, z, solids, pad)) {
      camera.position.set(lx, ly, lz);
      camera.lookAt(look.x, look.y, look.z);
      const d = Math.hypot(lx - look.x, ly - look.y, lz - look.z);
      if (d < 0.85) camera.near = 0.08;
      else if (camera.near !== 0.15) { camera.near = 0.15; camera.updateProjectionMatrix(); }
      return true;
    }
    lx = x; ly = y; lz = z;
  }
  camera.position.set(desired.x, desired.y, desired.z);
  camera.lookAt(look.x, look.y, look.z);
  if (camera.near !== 0.15) { camera.near = 0.15; camera.updateProjectionMatrix(); }
  return false;
}

function hitSolid(x, y, z, solids, pad) {
  if (!solids) return false;
  for (let i = 0; i < solids.length; i++) {
    const b = solids[i];
    const miny = (b.miny != null ? b.miny : -0.5) - 0.05;
    const maxy = (b.maxy != null ? b.maxy : 20) + 0.05;
    if (x > b.minx - pad && x < b.maxx + pad && z > b.minz - pad && z < b.maxz + pad && y > miny && y < maxy) {
      return true;
    }
  }
  return false;
}

export function addServerLeds(servers, scene) {
  if (!servers || !servers.length) return { mats: [], meshes: [] };
  const geo = new THREE.BoxGeometry(0.045, 0.03, 0.03);
  const mk = (hex, freq, phase, name) => {
    const m = new THREE.MeshStandardMaterial({
      color: hex, emissive: hex, emissiveIntensity: 3.2,
      roughness: 0.35, metalness: 0.1, envMapIntensity: 0,
    });
    m.name = name;
    m.userData._em0 = 3.2;
    m.userData.freq = freq;
    m.userData.phase = phase;
    return m;
  };
  const green = mk(0x3cff6a, 2.4, 0.1, 'led-green');
  const red = mk(0xff2a22, 1.15, 0.7, 'led-red');
  const amber = mk(0xffc030, 3.6, 1.4, 'led-amber');
  const mats = [green, red, amber];
  const places = [[], [], []];
  servers.forEach((obj, si) => {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const ctr = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(ctr);
    // front is the smallest horizontal extent's outward face toward -X for these racks
    const frontX = box.min.x - 0.02;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 2; col++) {
        const y = box.min.y + 0.28 + row * (size.y * 0.1);
        const z = ctr.z - 0.12 + col * 0.24;
        const which = (row + col + si) % 3;
        places[which].push({ x: frontX, y, z });
      }
    }
  });
  const meshes = [];
  const dummy = new THREE.Object3D();
  mats.forEach((mat, i) => {
    const list = places[i];
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    im.name = mat.name + '-inst';
    im.frustumCulled = false;
    list.forEach((p, k) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      im.setMatrixAt(k, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    meshes.push(im);
  });
  return { mats, meshes };
}


/* ---------- ground with entrance hole ---------- */
export function makeDesertGround(scene) {
  const sandMaps = worldTex && worldTex.sand;
  const mat = sandMaps
    ? pbrMat(sandMaps, { color: 0xe8d2a8, roughness: 0.95, metalness: 0, normal: 1.15, name: 'sand' })
    : new THREE.MeshStandardMaterial({
      color: 0xffffff, map: makeSandTex(), roughness: 0.97, metalness: 0, envMapIntensity: 0,
    });
  const s = new THREE.Shape();
  const H = 120;
  s.moveTo(-H, -H); s.lineTo(H, -H); s.lineTo(H, H); s.lineTo(-H, H); s.closePath();
  const hole = new THREE.Path();
  // hole for moved pavilion + ramp (x 18.25–26.35, z 2.0–6.0)
  const hx0 = 18.25, hx1 = 26.35, hz0 = 2.00, hz1 = 6.00;
  hole.moveTo(hx0, hz0); hole.lineTo(hx1, hz0); hole.lineTo(hx1, hz1); hole.lineTo(hx0, hz1); hole.closePath();
  s.holes.push(hole);
  const geo = new THREE.ShapeGeometry(s, 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const tile = 9;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
  }
  uv.needsUpdate = true;
  geo.setAttribute('uv2', uv.clone());
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'ground';
  mesh.receiveShadow = false;
  scene.add(mesh);

  // Ranch dirt circle — same material, different baked UVs (no extra material)
  const dirtGeo = new THREE.CircleGeometry(28, 32);
  const du = dirtGeo.attributes.uv;
  for (let i = 0; i < du.count; i++) du.setXY(i, du.getX(i) * 5.5, du.getY(i) * 5.5);
  du.needsUpdate = true;
  dirtGeo.setAttribute('uv2', du.clone());
  const dirt = new THREE.Mesh(dirtGeo, mat);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(-18, 0.02, 2);
  dirt.name = 'ranch-dirt';
  scene.add(dirt);

  // Hangar pad — concrete floor, kept west of the pavilion (x <= 16)
  const padMaps = worldTex && worldTex.floor;
  const padMat = padMaps
    ? pbrMat(padMaps, { color: 0xb0aaa0, roughness: 0.9, metalness: 0.05, normal: 0.85, name: 'hangar-pad' })
    : new THREE.MeshStandardMaterial({ color: 0x8a8878, roughness: 0.9, metalness: 0.05, envMapIntensity: 0 });
  const pad = new THREE.Mesh(tilePlaneGeo(22, 24, 3.2), padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(7.5, 0.035, 3);
  pad.name = 'hangar-pad';
  scene.add(pad);

  const wreckPad = new THREE.Mesh(
    (() => {
      const g = new THREE.CircleGeometry(18, 28);
      const u = g.attributes.uv;
      for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 6, u.getY(i) * 6);
      u.needsUpdate = true;
      g.setAttribute('uv2', u.clone());
      return g;
    })(),
    mat,
  );
  wreckPad.rotation.x = -Math.PI / 2;
  wreckPad.position.set(-8, 0.025, 44);
  wreckPad.name = 'wreck-pad';
  scene.add(wreckPad);
}

/* ---------- lights + atmosphere ---------- */
export const ATMOS = {
  dusk: {
    bg: 0x1a1028, fogN: 35, fogF: 145,
    ambC: 0xc09070, ambI: 0.36,
    hemiS: 0xffb080, hemiG: 0x2a1810, hemiI: 0.92,
    sunC: 0xff6020, sunI: 1.6, sunP: [-70, 8, 28],
    fillC: 0x3a5080, fillI: 0.42,
    lab1: 0, lab2: 0, door: 2.5, emer: 0.35,
  },
  ranch: {
    bg: 0x1a1020, fogN: 48, fogF: 145,
    ambC: 0xc09070, ambI: 0.36,
    hemiS: 0xffb080, hemiG: 0x2a1810, hemiI: 0.92,
    sunC: 0xff9040, sunI: 1.35, sunP: [-70, 14, 28],
    fillC: 0x3a5080, fillI: 0.42,
    lab1: 0, lab2: 0, door: 2.5, emer: 0.35,
  },
  hangar: {
    bg: 0x18141c, fogN: 32, fogF: 110,
    ambC: 0xb09880, ambI: 0.32,
    hemiS: 0xffc090, hemiG: 0x2a2018, hemiI: 0.7,
    sunC: 0xffa060, sunI: 0.75, sunP: [-50, 18, 20],
    fillC: 0xffaa55, fillI: 0.3,
    lab1: 0, lab2: 0, door: 2.8, emer: 0.55,
  },
  lab: {
    bg: 0x0c1014, fogN: 9, fogF: 38,
    ambC: 0x7a9aaa, ambI: 0.2,
    hemiS: 0xc8e0f0, hemiG: 0x141210, hemiI: 0.26,
    sunC: 0xffffff, sunI: 0, sunP: [44, 20, 4],
    fillC: 0xffffff, fillI: 0,
    lab1: 3.4, lab2: 2.6, door: 0.4, emer: 1.15,
  },
  wreck: {
    bg: 0x1c1418, fogN: 30, fogF: 120,
    ambC: 0xc09068, ambI: 0.4,
    hemiS: 0xffb070, hemiG: 0x2a1810, hemiI: 0.95,
    sunC: 0xff9038, sunI: 1.45, sunP: [-70, 12, 50],
    fillC: 0x4a6088, fillI: 0.4,
    lab1: 0, lab2: 0, door: 0, emer: 0,
  },
};

export function createLights(scene) {
  const amb = new THREE.AmbientLight(0xc09070, 0.36);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0xffb080, 0x2a1810, 0.92);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9040, 1.35);
  sun.position.set(-70, 14, 28);
  sun.castShadow = false;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x3a5080, 0.42);
  fill.position.set(50, 22, -40);
  fill.castShadow = false;
  scene.add(fill);
  // Cool fluorescent pools
  const labFill = new THREE.PointLight(0xc8eaff, 0, 28, 1.6);
  labFill.position.set(42, LAB_Y + 3.15, 4);
  labFill.name = 'labFill';
  scene.add(labFill);
  const labFill2 = new THREE.PointLight(0xd8f0ff, 0, 24, 1.6);
  labFill2.position.set(52, LAB_Y + 3.05, 16);
  labFill2.name = 'labFill2';
  scene.add(labFill2);
  // Warm doorway (visible from outside)
  const doorFill = new THREE.PointLight(0xffc078, 0, 16, 1.5);
  doorFill.position.set(18.2, 2.2, 4);
  doorFill.name = 'doorFill';
  scene.add(doorFill);
  // Red emergency accent
  const emerFill = new THREE.PointLight(0xff2a14, 0, 11, 2);
  emerFill.position.set(27, LAB_Y + 3.2, 4);
  emerFill.name = 'emerFill';
  scene.add(emerFill);
  const L = {
    amb, hemi, sun, fill, labFill, labFill2, doorFill, emerFill,
    zone: 'ranch', qualityLow: true, cones: null, emer: null,
  };

  L.applyAtmos = function applyAtmos(zone) {
    const a = ATMOS[zone] || ATMOS[zone === 'ramp' ? 'lab' : 'ranch'] || ATMOS.ranch;
    this.zone = zone;
    const q = this.qualityLow;
    const cut = q ? 0.62 : 1;
    scene.background = new THREE.Color(a.bg);
    scene.fog = new THREE.Fog(a.bg, a.fogN, a.fogF);
    this.amb.color.setHex(a.ambC); this.amb.intensity = a.ambI * (q ? 0.95 : 1);
    this.hemi.color.setHex(a.hemiS); this.hemi.groundColor.setHex(a.hemiG);
    this.hemi.intensity = a.hemiI * (q ? 0.85 : 1);
    this.sun.color.setHex(a.sunC); this.sun.intensity = a.sunI * cut;
    if (a.sunP) this.sun.position.set(a.sunP[0], a.sunP[1], a.sunP[2]);
    this.fill.color.setHex(a.fillC); this.fill.intensity = q ? a.fillI * 0.25 : a.fillI;
    this.labFill.intensity = a.lab1 * (q ? 0.75 : 1);
    this.labFill2.intensity = a.lab2 * (q ? 0.7 : 1);
    this.doorFill.intensity = (a.door || 0) * (q ? 0.7 : 1);
    this.emerFill.intensity = (a.emer || 0) * (q ? 0.65 : 1);
    if (this.cones) this.cones.visible = !q && (zone === 'lab' || zone === 'ramp');
  };

  L.applyQuality = function applyQuality(qualityLow) {
    this.qualityLow = !!qualityLow;
    this.applyAtmos(this.zone);
  };

  return L;
}

/* ---------- bunker geometry ---------- */
export function buildBunker(scene, { addSolid } = {}) {
  const group = new THREE.Group();
  group.name = 'bunker';
  const wallMaps = worldTex && worldTex.wall;
  const floorMaps = worldTex && worldTex.floor;
  const grateMaps = worldTex && worldTex.grate;
  const concMat = wallMaps
    ? pbrMat(wallMaps, { color: 0xc4c0b6, roughness: 0.9, metalness: 0.04, normal: 1.05, name: 'bunker-concrete' })
    : new THREE.MeshStandardMaterial({
      color: 0xc8c4bc, map: makeConcreteTex(512, [132, 128, 118], 17), roughness: 0.92, metalness: 0.04, envMapIntensity: 0,
    });
  concMat.name = 'bunker-concrete';
  const floorMat = floorMaps
    ? pbrMat(floorMaps, { color: 0xa8a69e, roughness: 0.92, metalness: 0.03, normal: 1.1, name: 'bunker-floor' })
    : new THREE.MeshStandardMaterial({
      color: 0xb0aea6, map: makeConcreteTex(512, [104, 102, 96], 55), roughness: 0.95, metalness: 0.03, envMapIntensity: 0,
    });
  floorMat.name = 'bunker-floor';
  const grateMat = grateMaps
    ? pbrMat(grateMaps, { color: 0x9a9aa0, roughness: 0.45, metalness: 0.75, normal: 1, alphaTest: 0.42, name: 'bunker-grate' })
    : new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.45, metalness: 0.7, envMapIntensity: 0 });
  const hazardMat = new THREE.MeshStandardMaterial({
    map: makeHazardTex(), roughness: 0.7, metalness: 0.15, envMapIntensity: 0,
    emissive: 0x3a2a00, emissiveIntensity: 0.25,
  });
  hazardMat.name = 'bunker-hazard';

  const b = BUNKER;
  const r = RAMP;
  const thick = 0.45;
  const floorY = LAB_Y;
  const ceilY = LAB_CEIL;
  const h = ceilY - floorY; // ~4.65
  const midY = (ceilY + floorY) / 2;

  function box(w, hgt, d, mat, x, y, z, name, tile = 2.5) {
    const m = new THREE.Mesh(tileBoxGeo(w, hgt, d, tile), mat);
    m.position.set(x, y, z);
    if (name) m.name = name;
    group.add(m);
    return m;
  }
  function solid(minx, maxx, minz, maxz) {
    if (addSolid) addSolid({ minx, maxx, minz, maxz, miny: floorY, maxy: ceilY });
  }

  // Floor (whole bunker)
  const fw = b.x1 - b.x0, fd = b.z1 - b.z0;
  box(fw, 0.28, fd, floorMat, (b.x0 + b.x1) / 2, floorY - 0.14, (b.z0 + b.z1) / 2, 'bunker-floor');

  // Ceiling
  box(fw, 0.28, fd, concMat, (b.x0 + b.x1) / 2, ceilY + 0.14, (b.z0 + b.z1) / 2, 'bunker-ceil');

  // Walls: east, north, south, west with door gap at ramp
  // East
  box(thick, h, fd, concMat, b.x1 + thick / 2, midY, (b.z0 + b.z1) / 2, 'bunker-east');
  solid(b.x1, b.x1 + thick, b.z0, b.z1);
  // North
  box(fw + thick * 2, h, thick, concMat, (b.x0 + b.x1) / 2, midY, b.z1 + thick / 2, 'bunker-north');
  solid(b.x0, b.x1, b.z1, b.z1 + thick);
  // South
  box(fw + thick * 2, h, thick, concMat, (b.x0 + b.x1) / 2, midY, b.z0 - thick / 2, 'bunker-south');
  solid(b.x0, b.x1, b.z0 - thick, b.z0);
  // West, two segments leaving ramp opening z=r.z0–r.z1
  const westX = b.x0 - thick / 2;
  const zA0 = b.z0, zA1 = r.z0;
  const zB0 = r.z1, zB1 = b.z1;
  box(thick, h, zA1 - zA0, concMat, westX, midY, (zA0 + zA1) / 2, 'bunker-west-s');
  box(thick, h, zB1 - zB0, concMat, westX, midY, (zB0 + zB1) / 2, 'bunker-west-n');
  solid(b.x0 - thick, b.x0, zA0, zA1);
  solid(b.x0 - thick, b.x0, zB0, zB1);

  // Ramp floor, walls, ceiling
  const dx = r.x1 - r.x0;
  const dy = LAB_Y - 0;
  const len = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx); // negative
  const rw = r.z1 - r.z0;
  const rcx = (r.x0 + r.x1) / 2;
  const rcy = (0 + LAB_Y) / 2;
  const rcz = (r.z0 + r.z1) / 2;

  const rampFloor = new THREE.Mesh(tileBoxGeo(len, 0.22, rw, 2.2), floorMat);
  rampFloor.name = 'bunker-ramp';
  rampFloor.position.set(rcx, rcy, rcz);
  rampFloor.rotation.z = ang;
  group.add(rampFloor);

  const wallH = 3.2;
  for (const z of [r.z0 - 0.12, r.z1 + 0.12]) {
    const w = new THREE.Mesh(tileBoxGeo(len, wallH, 0.28, 2.4), concMat);
    w.position.set(rcx, rcy + wallH * 0.35, z);
    w.rotation.z = ang;
    w.name = 'bunker-ramp-wall';
    group.add(w);
    solid(r.x0 - 0.2, r.x1 + 0.2, z - 0.2, z + 0.2);
  }
  const rampCeil = new THREE.Mesh(tileBoxGeo(len + 0.4, 0.22, rw + 0.6, 2.4), concMat);
  rampCeil.position.set(rcx, rcy + 2.85, rcz);
  rampCeil.rotation.z = ang;
  rampCeil.name = 'bunker-ramp-ceil';
  group.add(rampCeil);

  // Surface pavilion (entrance) — east of hangar-main (east face ~15)
  const pv = PAVILION;
  const px0 = pv.x0, px1 = pv.x1, pz0 = pv.z0, pz1 = pv.z1;
  const pyc = 1.7;
  // roof
  box(px1 - px0 + 1.2, 0.28, pz1 - pz0 + 1.0, concMat, (px0 + px1) / 2, 3.25, (pz0 + pz1) / 2, 'pav-roof');
  // north / south walls
  box(px1 - px0 + 0.4, 3.2, 0.35, concMat, (px0 + px1) / 2, pyc, pz1 + 0.1, 'pav-n');
  box(px1 - px0 + 0.4, 3.2, 0.35, concMat, (px0 + px1) / 2, pyc, pz0 - 0.1, 'pav-s');
  solid(px0, px1, pz1 - 0.05, pz1 + 0.4);
  solid(px0, px1, pz0 - 0.4, pz0 + 0.05);
  // west facade with door gap z 2.3–5.7
  box(0.4, 3.2, 2.3 - pz0 + 0.2, concMat, px0 - 0.15, pyc, (pz0 + 2.3) / 2, 'pav-w-s');
  box(0.4, 3.2, pz1 - 5.7 + 0.2, concMat, px0 - 0.15, pyc, (5.7 + pz1) / 2, 'pav-w-n');
  // lintel over door
  box(0.45, 0.85, 3.6, concMat, px0 - 0.15, 3.22, 4, 'pav-lintel');
  solid(px0 - 0.4, px0 + 0.15, pz0, 2.25);
  solid(px0 - 0.4, px0 + 0.15, 5.75, pz1);

  // Hazard stripes at mouth — thicker, on frame and ground
  // Hazard only on the jambs (sides), not a panel across the mouth
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.28), hazardMat);
  stripe.position.set(px0 - 0.42, 1.4, 2.28);
  stripe.name = 'pav-hazard';
  group.add(stripe);
  const stripeB = stripe.clone();
  stripeB.position.set(px0 - 0.42, 1.4, 5.72);
  group.add(stripeB);
  const stripeR = stripe.clone();
  stripeR.position.set(px0 + 0.22, 1.4, 2.28);
  group.add(stripeR);
  const stripeR2 = stripe.clone();
  stripeR2.position.set(px0 + 0.22, 1.4, 5.72);
  group.add(stripeR2);
  const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, rw + 0.4), hazardMat);
  stripe2.position.set(px0 - 1.4, 0.05, rcz);
  group.add(stripe2);
  const stripe3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, rw), hazardMat);
  stripe3.position.set(r.x0 + 0.5, 0.06, rcz);
  group.add(stripe3);

  // Metal grating on the ramp
  const grate = new THREE.Mesh(tilePlaneGeo(len * 0.96, rw * 0.92, 1.15), grateMat);
  grate.name = 'bunker-grate';
  grate.position.set(rcx, rcy + 0.13, rcz);
  grate.rotation.set(-Math.PI / 2, 0, ang);
  // Plane is XY; rotateX -90 then Z=ang to follow ramp. Use same rot as ramp floor (rotation.z = ang) after making it a thin box top.
  grate.rotation.set(0, 0, 0);
  grate.rotation.x = -Math.PI / 2;
  grate.rotation.y = 0;
  // align with ramp slope: rotate around Z after X, in local
  grate.rotation.z = 0;
  grate.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), ang);
  group.add(grate);

  // A short grate landing at the pavilion floor
  const grateLand = new THREE.Mesh(tilePlaneGeo(2.2, rw * 0.95, 1.1), grateMat);
  grateLand.rotation.x = -Math.PI / 2;
  grateLand.position.set(px0 + 0.7, 0.045, rcz);
  grateLand.name = 'pav-grate';
  group.add(grateLand);

  // Emissive door frame (lit doorway)
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xffe0a0, emissive: 0xffc060, emissiveIntensity: 2.4,
    roughness: 0.4, metalness: 0.15, envMapIntensity: 0,
  });
  frameMat.name = 'pav-frame';
  frameMat.userData._em0 = 2.4;
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.85, 0.08), frameMat);
  fl.position.set(px0 - 0.48, 1.45, 2.35);
  group.add(fl);
  const fr = fl.clone(); fr.position.set(px0 - 0.48, 1.45, 5.65); group.add(fr);
  const ft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.4), frameMat);
  ft.position.set(px0 - 0.48, 2.88, 4);
  group.add(ft);

  // Sign on west facade, south of door — more emissive
  const signMat = new THREE.MeshStandardMaterial({
    map: makeSignTex(), roughness: 0.5, metalness: 0.1,
    emissive: 0x4a2808, emissiveIntensity: 0.7, envMapIntensity: 0,
  });
  // On the lintel, above the opening — must not cover the doorway
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.78), signMat);
  sign.position.set(px0 - 0.55, 3.38, 4);
  sign.rotation.y = -Math.PI / 2;
  sign.name = 'pav-sign';
  group.add(sign);

  // Pipes (instanced)
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x6a736c, roughness: 0.45, metalness: 0.7, envMapIntensity: 0,
  });
  pipeMat.name = 'bunker-pipe';
  const pipeGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 8);
  pipeGeo.rotateZ(Math.PI / 2);
  const pipePlaces = [];
  for (let i = 0; i < 6; i++) {
    const x0 = 28 + i * 5;
    pipePlaces.push({ x: x0, y: ceilY - 0.35, z: 0.6, sx: 5.2, sy: 1, sz: 1 });
    pipePlaces.push({ x: x0, y: ceilY - 0.35, z: 7.4, sx: 5.2, sy: 1, sz: 1 });
  }
  // cross pipes along Z in the side room
  for (let i = 0; i < 3; i++) {
    pipePlaces.push({
      x: 50, y: ceilY - 0.45, z: 12 + i * 3,
      ry: Math.PI / 2, len: 8,
    });
  }
  const pipes = new THREE.InstancedMesh(pipeGeo, pipeMat, pipePlaces.length);
  pipes.name = 'bunker-pipes';
  const dummy = new THREE.Object3D();
  pipePlaces.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry || 0, p.rz || 0);
    const len = p.len || p.sx || 1;
    dummy.scale.set(len, 1, 1);
    dummy.updateMatrix();
    pipes.setMatrixAt(i, dummy.matrix);
  });
  pipes.instanceMatrix.needsUpdate = true;
  group.add(pipes);

  // Fluorescent fixtures (housing + emissive tube), instanced
  const fluoPositions = [
    [30, 4], [34, 4], [38, 4], [42, 4], [46, 4], [50, 4], [54, 4],
    [50, 12], [50, 16], [50, 20],
    [33, 4], [41, 4],
  ];
  // also along ramp (world y along slope)
  const fluoHousingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.28);
  const fluoHousingMat = new THREE.MeshStandardMaterial({
    color: 0xb8b4aa, roughness: 0.5, metalness: 0.4, envMapIntensity: 0,
  });
  const fluoTubeGeo = new THREE.BoxGeometry(1.45, 0.05, 0.16);
  const fluoTubeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff, emissive: 0xdceeff, emissiveIntensity: 2.8,
    roughness: 0.35, metalness: 0, envMapIntensity: 0,
  });
  fluoTubeMat.name = 'bunker-fluo';
  fluoTubeMat.userData._em0 = 2.8;
  const nF = fluoPositions.length + 3;
  const housings = new THREE.InstancedMesh(fluoHousingGeo, fluoHousingMat, nF);
  const tubes = new THREE.InstancedMesh(fluoTubeGeo, fluoTubeMat, nF);
  housings.name = 'bunker-fluo-house';
  tubes.name = 'bunker-fluo-tube';
  let fi = 0;
  fluoPositions.forEach(([x, z]) => {
    dummy.position.set(x, ceilY - 0.12, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    housings.setMatrixAt(fi, dummy.matrix);
    dummy.position.y -= 0.07;
    dummy.updateMatrix();
    tubes.setMatrixAt(fi, dummy.matrix);
    fi++;
  });
  // ramp lights: 3 along the slope
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.28;
    const x = r.x0 + (r.x1 - r.x0) * t;
    const y = groundY(x, 4) + 2.55;
    dummy.position.set(x, y, 4);
    dummy.rotation.set(0, 0, ang);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    housings.setMatrixAt(fi, dummy.matrix);
    dummy.position.y -= 0.07;
    dummy.updateMatrix();
    tubes.setMatrixAt(fi, dummy.matrix);
    fi++;
  }
  housings.instanceMatrix.needsUpdate = true;
  tubes.instanceMatrix.needsUpdate = true;
  group.add(housings);
  group.add(tubes);

  // Fake light cones (sprites) — hidden on low quality
  const coneGeo = new THREE.ConeGeometry(1.35, 3.0, 10, 1, true);
  coneGeo.rotateX(Math.PI); // tip up
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xc8e8ff, transparent: true, opacity: 0.09,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
  });
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, fluoPositions.length);
  cones.name = 'bunker-cones';
  cones.frustumCulled = false;
  fluoPositions.forEach(([x, z], i) => {
    dummy.position.set(x, ceilY - 1.65, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    cones.setMatrixAt(i, dummy.matrix);
  });
  cones.instanceMatrix.needsUpdate = true;
  group.add(cones);

  // Emergency red lights
  const emGeo = new THREE.SphereGeometry(0.09, 8, 6);
  const emMat = new THREE.MeshStandardMaterial({
    color: 0xff2210, emissive: 0xff1808, emissiveIntensity: 1.8,
    roughness: 0.4, metalness: 0.2, envMapIntensity: 0,
  });
  emMat.userData._em0 = 1.8;
  emMat.name = 'bunker-emergency';
  const emPos = [
    [27, ceilY - 0.25, 1.2], [27, ceilY - 0.25, 6.8],
    [42, ceilY - 0.25, -1.2], [59, ceilY - 0.25, 4],
    [50, ceilY - 0.25, 22], [18.55, 2.9, 4],
  ];
  const emer = new THREE.InstancedMesh(emGeo, emMat, emPos.length);
  emer.name = 'bunker-emergency';
  emPos.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    emer.setMatrixAt(i, dummy.matrix);
  });
  emer.instanceMatrix.needsUpdate = true;
  group.add(emer);

  scene.add(group);
  return { group, cones, emer, fluoMat: fluoTubeMat, emMat, frameMat, ledMats: [] };
}

export function updateBunkerLights(bunker, t) {
  if (!bunker) return;
  const pulse = 0.75 + 0.25 * Math.sin(t * 4.2);
  if (bunker.emMat) bunker.emMat.emissiveIntensity = (bunker.emMat.userData._em0 || 1.8) * pulse;
  if (bunker.fluoMat) {
    const f = 0.92 + 0.08 * Math.sin(t * 11) * Math.sin(t * 0.7);
    bunker.fluoMat.emissiveIntensity = (bunker.fluoMat.userData._em0 || 2.4) * f;
  }
  if (bunker.frameMat) {
    bunker.frameMat.emissiveIntensity = (bunker.frameMat.userData._em0 || 2.4) * (0.88 + 0.12 * Math.sin(t * 5.5));
  }
  if (bunker.ledMats) {
    for (const m of bunker.ledMats) {
      const freq = m.userData.freq || 2;
      const phase = m.userData.phase || 0;
      const on = Math.sin(t * freq * Math.PI * 2 + phase) > 0.15;
      m.emissiveIntensity = on ? (m.userData._em0 || 3) : 0.1;
    }
  }
}

/* ---------- Audio (Web Audio, unlock on first gesture, restart loops) ---------- */
const SFX_URLS = {
  ui_click: './assets/sfx/ui_click.ogg',
  ui_open: './assets/sfx/ui_open.ogg',
  pickup: './assets/sfx/pickup.ogg',
  tr3b_hum: './assets/sfx/tr3b_hum.ogg',
  door: './assets/sfx/door.ogg',
  bunker_blip: './assets/sfx/bunker_blip.ogg',
  amb_desert: './assets/sfx/amb_desert.mp3',
  amb_hangar: './assets/sfx/amb_hangar.mp3',
  amb_bunker: './assets/sfx/amb_bunker.mp3',
};
const ZONE_AMB = { ranch: 'amb_desert', hangar: 'amb_hangar', ramp: 'amb_bunker', lab: 'amb_bunker', wreck: 'amb_desert', entrance: 'amb_hangar' };
const LOOP_GAIN = {
  amb_desert: 0.22, amb_hangar: 0.18, amb_bunker: 0.2, tr3b_hum: 0.13,
};

export const AudioSys = {
  ctx: null,
  unlocked: false,
  muted: false,
  buffers: {},
  loops: {},
  master: null,
  _load: null,
  currentZone: 'ranch',
  humOn: false,
  load() {
    if (this._load) return this._load;
    this._load = (async () => {
      this._ensure();
      if (!this.ctx) return;
      const entries = Object.entries(SFX_URLS);
      await Promise.all(entries.map(async ([name, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          this.buffers[name] = await this.ctx.decodeAudioData(buf.slice(0));
        } catch { /* fichier manquant : on ignore */ }
      }));
    })();
    return this._load;
  },
  _ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  },
  async unlock() {
    try {
      this._ensure();
      if (!this.ctx) return false;
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.unlocked = this.ctx.state === 'running';
      if (this.unlocked && !this.muted) this._restartLoops();
      return this.unlocked;
    } catch {
      return false;
    }
  },
  play(name, { gain = 0.32 } = {}) {
    if (this.muted || !this.unlocked) return;
    const ctx = this._ensure();
    const buf = this.buffers[name];
    if (!ctx || !buf || !this.master) return;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = gain;
    src.connect(g); g.connect(this.master);
    try { src.start(0); } catch { /* already started */ }
  },
  startLoop(name, gain) {
    if (this.muted || !this.unlocked) return;
    if (this.loops[name]) return; // already running — don't duplicate
    const ctx = this._ensure();
    const buf = this.buffers[name];
    if (!ctx || !buf || !this.master) return;
    const g0 = gain ?? LOOP_GAIN[name] ?? 0.16;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    g.gain.value = 0;
    src.connect(g); g.connect(this.master);
    try { src.start(0); } catch { return; }
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(g0, now + 0.25);
    this.loops[name] = { src, g };
  },
  stopLoop(name, fade = 0.2) {
    const loop = this.loops[name];
    if (!loop) return;
    delete this.loops[name];
    try {
      const ctx = this.ctx;
      if (ctx && fade > 0) {
        loop.g.gain.cancelScheduledValues(ctx.currentTime);
        loop.g.gain.setValueAtTime(Math.max(0.0001, loop.g.gain.value), ctx.currentTime);
        loop.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
        setTimeout(() => { try { loop.src.stop(); } catch { /* already stopped */ } }, fade * 1000 + 40);
      } else {
        loop.src.stop();
      }
    } catch { /* already stopped */ }
  },
  setMuted(v) {
    this.muted = !!v;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
    if (this.muted) {
      Object.keys(this.loops).forEach((n) => this.stopLoop(n, 0.05));
    } else if (this.unlocked) {
      this._restartLoops();
    }
  },
  setZone(zone) {
    this.currentZone = zone || 'ranch';
    if (!this.unlocked || this.muted) return;
    const want = ZONE_AMB[this.currentZone] || 'amb_desert';
    for (const n of ['amb_desert', 'amb_hangar', 'amb_bunker']) {
      if (n !== want) this.stopLoop(n, 0.45);
    }
    this.startLoop(want);
  },
  setHum(on) {
    this.humOn = !!on;
    if (!this.unlocked || this.muted) return;
    if (this.humOn) this.startLoop('tr3b_hum');
    else this.stopLoop('tr3b_hum', 0.35);
  },
  _restartLoops() {
    if (this.muted || !this.unlocked) return;
    this.setZone(this.currentZone);
    if (this.humOn) this.startLoop('tr3b_hum');
  },
};

/* ---------- fade overlay (CSS, no extra render pass) ---------- */
export function setupFade() {
  let el = document.getElementById('fade');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fade';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  const reduce = reducedMotion();
  return {
    async toBlack(ms = 280) {
      if (reduce) { el.style.opacity = '1'; return; }
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = '1';
      await new Promise((r) => setTimeout(r, ms));
    },
    async toClear(ms = 420) {
      if (reduce) { el.style.opacity = '0'; return; }
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = '0';
      await new Promise((r) => setTimeout(r, ms));
    },
    async dip(ms = 480) {
      if (reduce) return;
      await this.toBlack(ms * 0.4);
      await this.toClear(ms * 0.6);
    },
  };
}

/* ---------- evidence pickup FX ---------- */
export class PickupFX {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.t = 0;
    this.dur = 1.2;
    this.onDone = null;
    this.origin = new THREE.Vector3();
    this._q = new THREE.Vector3();

    const n = 48;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = [];
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe8c45a, size: 0.12, transparent: true, opacity: 1,
      depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.name = 'pickup-fx';
    this.points.visible = false;
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.vel = vel;
    this.n = n;

    this.orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xf0d070, transparent: true, opacity: 0.95,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }),
    );
    this.orb.name = 'pickup-orb';
    this.orb.visible = false;
    scene.add(this.orb);

    this.dom = document.getElementById('pickup-orb');
    if (!this.dom) {
      this.dom = document.createElement('div');
      this.dom.id = 'pickup-orb';
      this.dom.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.dom);
    }
  }

  burst(worldPos, onDone) {
    this.origin.copy(worldPos);
    this.onDone = onDone;
    this.t = 0;
    this.active = true;
    const pos = this.points.geometry.attributes.position;
    this.vel.length = 0;
    for (let i = 0; i < this.n; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const sp = 1.6 + Math.random() * 2.8;
      this.vel.push(
        Math.sin(b) * Math.cos(a) * sp,
        Math.abs(Math.cos(b)) * sp + 0.6,
        Math.sin(b) * Math.sin(a) * sp,
      );
      pos.setXYZ(i, worldPos.x, worldPos.y, worldPos.z);
    }
    pos.needsUpdate = true;
    this.points.material.opacity = 1;
    this.points.visible = !reducedMotion();
    this.orb.position.copy(worldPos);
    this.orb.visible = true;
    this.orb.scale.setScalar(1);
    this.dom.classList.add('on');
    if (this._to) clearTimeout(this._to);
    this._to = setTimeout(() => { if (this.active) this.finish(); }, Math.ceil((this.dur + 0.2) * 1000));
    if (reducedMotion()) {
      this.finish();
    }
  }

  update(dt, camera) {
    if (!this.active) return;
    this.t += dt;
    const u = Math.min(1, this.t / this.dur);
    const pos = this.points.geometry.attributes.position;
    for (let i = 0; i < this.n; i++) {
      const vx = this.vel[i * 3], vy = this.vel[i * 3 + 1], vz = this.vel[i * 3 + 2];
      pos.setXYZ(
        i,
        this.origin.x + vx * this.t,
        this.origin.y + vy * this.t - 1.6 * this.t * this.t,
        this.origin.z + vz * this.t,
      );
    }
    pos.needsUpdate = true;
    this.points.material.opacity = 1 - u;
    this.points.material.size = 0.14 * (1 - u * 0.5);

    // orb flies toward HUD evidence chip
    const target = document.getElementById('hudEvidence');
    let tx = window.innerWidth * 0.5, ty = 24;
    if (target) {
      const r = target.getBoundingClientRect();
      tx = r.left + r.width / 2;
      ty = r.top + r.height / 2;
    }
    // unproject HUD point at a depth near the camera
    const ndcX = (tx / window.innerWidth) * 2 - 1;
    const ndcY = -(ty / window.innerHeight) * 2 + 1;
    this._q.set(ndcX, ndcY, 0.35).unproject(camera);
    const ease = 1 - (1 - u) * (1 - u);
    this.orb.position.lerpVectors(this.origin, this._q, ease);
    this.orb.scale.setScalar(1.15 - ease * 0.7);
    this.orb.material.opacity = 0.95 - ease * 0.4;

    // DOM orb follows for a crisp HUD hit
    const sp = this.orb.position.clone().project(camera);
    const sx = (sp.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-sp.y * 0.5 + 0.5) * window.innerHeight;
    this.dom.style.transform = `translate(${sx}px, ${sy}px) scale(${1.2 - ease * 0.6})`;
    this.dom.style.opacity = String(1 - ease * 0.15);

    if (u >= 1) this.finish();
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    if (this._to) { clearTimeout(this._to); this._to = null; }
    this.points.visible = false;
    this.orb.visible = false;
    this.dom.classList.remove('on');
    this.dom.style.opacity = '0';
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  }
}

/* ---------- TR-3B emissive + point-light pulse ---------- */
export function pulseCraft(obj, t, on) {
  if (!obj) return;
  const pulse = on ? (0.55 + 0.45 * Math.sin(t * 4.0)) : 0;
  obj.traverse((o) => {
    if (o.isPointLight) {
      if (o.userData._i0 == null) o.userData._i0 = o.intensity || 2.2;
      o.intensity = on ? o.userData._i0 * (0.7 + pulse * 0.9) : 0;
    }
    if (o.isMesh && o.material) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (!m || !m.emissive) continue;
        if (m.userData._em0 == null) m.userData._em0 = m.emissiveIntensity || 1;
        // pulse named lights more; others gently
        const name = (o.name || '').toLowerCase();
        const isLight = /light|glow|lamp|emi/.test(name) || (m.name && /light|glow/.test(m.name.toLowerCase()));
        m.emissiveIntensity = on
          ? m.userData._em0 * (isLight ? (0.55 + pulse) : (0.75 + pulse * 0.35))
          : m.userData._em0;
      }
    }
  });
}

/** Scale an object so its height is `height` metres, feet on y=0. */
export function fitProp(obj, height = 1.2) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return obj;
  const h = box.max.y - box.min.y || 1;
  const sc = height / h;
  obj.scale.multiplyScalar(sc);
  obj.updateMatrixWorld(true);
  box.setFromObject(obj);
  obj.position.y += -box.min.y;
  obj.updateMatrixWorld(true);
  return obj;
}

/** Strip KHR transmission if a material still has it; force glass to simple alpha. */
export function sanitizeMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m) continue;
      if (m.transmission != null && m.transmission > 0) {
        m.transmission = 0;
        m.transparent = true;
        m.opacity = Math.min(m.opacity ?? 1, 0.32);
        m.depthWrite = false;
        m.needsUpdate = true;
      }
      const nm = (m.name || o.name || '').toLowerCase();
      if (nm.includes('glass')) {
        m.transparent = true;
        m.opacity = Math.min(m.opacity ?? 1, 0.32);
        m.metalness = 0;
        m.roughness = Math.max(m.roughness ?? 0.2, 0.12);
        if (m.transmission != null) m.transmission = 0;
        m.depthWrite = false;
        m.side = THREE.DoubleSide;
        m.needsUpdate = true;
      }
    }
  });
  return root;
}

/* ---------- v0.3.3: décor kit (Blender, assets/decor-v1.glb) ----------
 * 20 low-poly kits, vertex colours, ONE material. Scattered per zone with a
 * seeded RNG (same layout every run), rejected near evidence / spawn spots /
 * the ramp and inside existing colliders, then merged into one mesh per zone
 * (+1 draw call each; mergeStaticByMaterial may fold them into one). */
const DECOR_CLEAR = [ // [x, z, r]: spawn spots, doors
  [-20, 14, 2.5], [9.5, -5.5, 2.5], [36, 4, 2.5], [-11.5, 37, 2.5], [16.55, 1.85, 2.8], [22.5, 4, 2.5],
  [19.6, 9.4, 2.5], [26.2, 4, 2.0], [40.2, 4, 2.0],
];
const DECOR_NO_RECTS = [ // surface keep-outs: ramp + pavilion (+margin)
  [RAMP.x0 - 2.5, RAMP.x1 + 1, RAMP.z0 - 1.5, RAMP.z1 + 1.5], [PAVILION.x0 - 2, PAVILION.x1 + 1, PAVILION.z0 - 1.5, PAVILION.z1 + 1.5],
];
// kit: [collider radius (m, 0 = walk-through), height (m)]
const DECOR_KITS = {
  saguaro: [0.35, 3.3], 'barrel-cactus': [0, 0.6], 'prickly-pear': [0, 1.0], sage: [0, 0.6], grass: [0, 0.6],
  rocks: [1.0, 1.3], crates: [1.1, 1.75], 'pallet-sacks': [0.7, 0.65], tyres: [0.7, 0.95], sign: [0.25, 1.85],
  pole: [0.25, 7.6], windmill: [1.3, 7.8], hay: [1.0, 1.2], spool: [0.55, 1.1], cables: [0, 0.08],
  hazard: [0, 0.02], 'dead-tree': [0.3, 2.9], shards: [0, 0.7], barricade: [0, 1.05], floodlight: [0.45, 4.3],
};
const DECOR_ZONES = [
  { zone: 'ranch', rects: [[-41, -3, -17, 23]], items: [['sage', 10, 0.8, 1.3], ['grass', 22, 0.8, 1.4], ['barrel-cactus', 3, 0.8, 1.1],
    ['prickly-pear', 3, 0.8, 1.2], ['hay', 2, 1, 1], ['crates', 1, 1, 1], ['dead-tree', 2, 0.9, 1.2], ['rocks', 2, 0.6, 0.9]],
    fixed: [['windmill', -33, -9, 0.6], ['pole', -40, -21, 0], ['pole', -31, -21, 0], ['pole', -22, -21, 0],
      ['pole', -13, -21, 0], ['pole', -4, -21, 0], ['pole', 5, -21, 0], ['pole', 14, -21, 0]] },
  { zone: 'hangar', rects: [[-1, 17.5, -15, 25]], items: [['crates', 3, 0.9, 1.1], ['pallet-sacks', 2, 1, 1], ['tyres', 2, 1, 1],
    ['spool', 2, 1, 1], ['grass', 10, 0.8, 1.3], ['sage', 3, 0.8, 1.1], ['barricade', 2, 1, 1]],
    fixed: [['sign', 17.4, 8.9, -Math.PI / 2], ['sign', 17.4, -0.9, -Math.PI / 2], ['floodlight', 15.5, 10.5, -2.4]] },
  { zone: 'wreck', rects: [[-27, 7, 29, 61]], items: [['shards', 10, 0.7, 1.3], ['rocks', 4, 0.8, 1.4], ['sage', 5, 0.8, 1.2],
    ['grass', 12, 0.8, 1.4], ['saguaro', 3, 0.9, 1.15], ['dead-tree', 2, 0.9, 1.2]],
    ring: { kit: 'barricade', x: -8, z: 45, r: 12.5, n: 7, face: true }, fixed: [['floodlight', -17.5, 52.5, 'face'], ['floodlight', 2.5, 53, 'face']] },
  { zone: 'outskirts', rects: [[-62, 68, 73, 96], [-62, 68, -50, -31], [-80, -56, -30, 72], [63, 82, -30, 72]],
    items: [['saguaro', 16, 1.1, 1.6], ['rocks', 8, 1.0, 2.4], ['sage', 6, 1, 1.5], ['prickly-pear', 4, 1, 1.4],
      ['barrel-cactus', 4, 1, 1.3], ['dead-tree', 4, 1, 1.4], ['grass', 10, 1, 1.5]], noCollide: true },
  { zone: 'lab', y: LAB_Y, rects: [[43.2, 58.8, -1.1, 9.0], [45.2, 54.8, 11.2, 20.8]], items: [['spool', 2, 0.9, 1], ['crates', 1, 0.7, 0.7]],
    furn: true, fixed: [['cables', 33, 0.75, 0], ['cables', 33, 7.25, 0], ['cables', 51, -1.5, 0], ['cables', 50, 21.5, 0],
      ['hazard', 26.9, 4, Math.PI / 2], ['hazard', 40.95, 4, Math.PI / 2], ['hazard', 50, 10.05, 0]] },
];

function decorRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function decorF32(g) {
  const out = new THREE.BufferGeometry();
  for (const [name, n] of [['position', 3], ['normal', 3], ['color', 3]]) {
    const a = g.getAttribute(name);
    if (!a) continue;
    const arr = new Float32Array(a.count * n);
    for (let i = 0; i < a.count; i++) { arr[i * n] = a.getX(i); arr[i * n + 1] = a.getY(i); arr[i * n + 2] = a.getZ(i); }
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  if (!out.getAttribute('color')) {
    const c = new Float32Array(out.getAttribute('position').count * 3).fill(0.7);
    out.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  if (g.index) out.setIndex(Array.from(g.index.array));
  else out.setIndex([...Array(out.getAttribute('position').count).keys()]);
  return out;
}

/** @returns {{ meshes: Object<string, THREE.Mesh>, stats: Object<string, {items, tris, solids}> }} */
export function buildDecor(scene, gltf, { addSolid = () => {}, isFree = () => true, keepClear = [] } = {}) {
  const kits = {};
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !/^kit_/.test(o.name)) return;
    const g = decorF32(o.geometry);
    g.applyMatrix4(o.matrixWorld);
    kits[o.name.slice(4)] = g;
  });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  mat.name = 'decor-vc';
  const clear = DECOR_CLEAR.concat(keepClear);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const meshes = {}, stats = {};
  DECOR_ZONES.forEach((Z, zi) => {
    const rnd = decorRng(20261118 + zi * 7919);
    const y = Z.y != null ? Z.y : 0;
    const placed = [], geos = [];
    let nSolids = 0;
    const ok = (x, z, rad, fixedFlat) => {
      if (Z.zone !== 'lab' && DECOR_NO_RECTS.some((r) => x > r[0] && x < r[1] && z > r[2] && z < r[3])) return false;
      if (clear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + rad)) return false;
      if (placed.some((p) => Math.hypot(x - p.x, z - p.z) < p.rad + rad + 0.4)) return false;
      return (Z.noCollide || fixedFlat) ? true : isFree(x, z, rad + 0.5);
    };
    const put = (kit, x, z, ry, s, fixed = false) => {
      const g0 = kits[kit];
      if (!g0) return false;
      const [cr, h] = DECOR_KITS[kit] || [0, 1];
      const rad = Math.max(cr, 0.3) * s;
      // fixed walk-through floor pieces (cables, stripes) may hug walls
      if (!ok(x, z, rad, fixed && cr === 0 && h < 0.1)) return false;
      const g = g0.clone();
      m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, ry), new THREE.Vector3(s, s, s));
      g.applyMatrix4(m4);
      geos.push(g);
      placed.push({ x, z, rad });
      if (cr > 0 && !Z.noCollide) {
        const r = cr * s;
        const sol = { minx: x - r, maxx: x + r, minz: z - r, maxz: z + r, miny: y, maxy: y + h * s, decor: true };
        if (Z.furn) sol.furn = true;
        addSolid(sol); nSolids++;
      }
      return true;
    };
    const faceRy = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    for (const [kit, x, z, ry] of Z.fixed || []) {
      // nudge up to 3 times along X if the exact spot is taken
      for (const dx of [0, 1.5, -1.5, 3]) {
        const r = ry === 'face' ? faceRy(x + dx, z, -8, 45) : ry;
        if (put(kit, x + dx, z, r, 1, true)) break;
      }
    }
    if (Z.ring) {
      const R = Z.ring;
      for (let i = 0; i < R.n; i++) {
        const a = (i / R.n) * Math.PI * 2 + 0.3;
        const x = R.x + Math.cos(a) * R.r, z = R.z + Math.sin(a) * R.r;
        put(R.kit, x, z, faceRy(x, z, R.x, R.z), 1);
      }
    }
    for (const [kit, count, s0, s1] of Z.items) {
      let n = 0;
      for (let t = 0; t < count * 25 && n < count; t++) {
        const rc = Z.rects[Math.floor(rnd() * Z.rects.length)];
        const x = rc[0] + rnd() * (rc[1] - rc[0]), z = rc[2] + rnd() * (rc[3] - rc[2]);
        if (put(kit, x, z, rnd() * Math.PI * 2, s0 + rnd() * (s1 - s0))) n++;
      }
    }
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = 'decor-' + Z.zone;
    mesh.castShadow = false; mesh.receiveShadow = false;
    scene.add(mesh);
    meshes[Z.zone] = mesh;
    stats[Z.zone] = { items: placed.length, tris: merged.index.count / 3, solids: nSolids };
  });
  return { meshes, stats };
}
