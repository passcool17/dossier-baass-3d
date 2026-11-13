/* mood.js — bunker, audio, atmosphere, pickup FX. Dossier BAASS 3D v0.2.0 */
import * as THREE from 'three';

export const LAB_Y = -6.5;
export const LAB_CEIL = -1.85;
export const BUNKER = { x0: 25.6, x1: 62.4, z0: -5.0, z1: 24.4 };
export const RAMP = { x0: 17.15, x1: 25.65, z0: 2.08, z1: 5.92 };

export function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export function groundY(x, z) {
  const r = RAMP;
  if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
    const t = Math.min(1, Math.max(0, (x - r.x0) / (r.x1 - r.x0)));
    const s = t * t * (3 - 2 * t);
    return s * LAB_Y;
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
  g.font = 'bold 42px ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace';
  g.textAlign = 'center';
  g.fillText('ACCÈS RESTREINT', 256, 80);
  g.fillStyle = '#e8d9b0';
  g.font = 'bold 36px ui-monospace, Menlo, Consolas, monospace';
  g.fillText('BAASS  ·  NIVEAU −1', 256, 140);
  g.fillStyle = '#a89870';
  g.font = '22px ui-monospace, Menlo, Consolas, monospace';
  g.fillText('LABORATOIRE SOUTERRAIN', 256, 190);
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

/* ---------- ground with entrance hole ---------- */
export function makeDesertGround(scene) {
  const sand = makeSandTex();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: sand, roughness: 0.97, metalness: 0, envMapIntensity: 0,
  });
  // Shape in XZ via XY then rotate: x,y of shape become x,z
  const s = new THREE.Shape();
  const H = 100;
  s.moveTo(-H, -H); s.lineTo(H, -H); s.lineTo(H, H); s.lineTo(-H, H); s.closePath();
  const hole = new THREE.Path();
  // hole for ramp + pavilion mouth (x 15.6–25.8, z 2.0–6.0)
  const hx0 = 16.95, hx1 = 25.85, hz0 = 2.00, hz1 = 6.00;
  hole.moveTo(hx0, hz0); hole.lineTo(hx1, hz0); hole.lineTo(hx1, hz1); hole.lineTo(hx0, hz1); hole.closePath();
  s.holes.push(hole);
  const geo = new THREE.ShapeGeometry(s, 2);
  geo.rotateX(-Math.PI / 2);
  // ShapeGeometry UVs aren't tiled; set them from xz
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + H) / 8, (pos.getZ(i) + H) / 8);
  }
  uv.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'ground';
  mesh.receiveShadow = false;
  scene.add(mesh);

  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(28, 24),
    new THREE.MeshStandardMaterial({ color: 0xb8945c, roughness: 1, metalness: 0, map: sand, envMapIntensity: 0 }),
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(-18, 0.02, 2);
  dirt.material.map = sand.clone();
  dirt.material.map.repeat.set(8, 8);
  scene.add(dirt);

  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshStandardMaterial({ color: 0x8a8878, roughness: 0.9, metalness: 0.05, envMapIntensity: 0 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(12, 0.03, 4);
  scene.add(pad);

  const wreckPad = new THREE.Mesh(
    new THREE.CircleGeometry(16, 20),
    new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 1, metalness: 0, envMapIntensity: 0 }),
  );
  wreckPad.rotation.x = -Math.PI / 2;
  wreckPad.position.set(-8, 0.02, 44);
  scene.add(wreckPad);
}

/* ---------- lights + atmosphere ---------- */
export const ATMOS = {
  ranch: {
    bg: 0x8a6e52, fogN: 50, fogF: 155,
    ambC: 0xc8a070, ambI: 0.48,
    hemiS: 0xffd4a0, hemiG: 0x6a4a28, hemiI: 1.05,
    sunC: 0xffc080, sunI: 1.5,
    fillC: 0x6a80a0, fillI: 0.28,
    lab1: 0, lab2: 0,
  },
  hangar: {
    bg: 0x5e584c, fogN: 36, fogF: 115,
    ambC: 0xb0a890, ambI: 0.4,
    hemiS: 0xd8c8a0, hemiG: 0x4a4030, hemiI: 0.82,
    sunC: 0xffd0a0, sunI: 0.9,
    fillC: 0xffaa55, fillI: 0.38,
    lab1: 0, lab2: 0,
  },
  lab: {
    bg: 0x1a2228, fogN: 22, fogF: 70,
    ambC: 0xb0c0c8, ambI: 0.72,
    hemiS: 0xd8e4ea, hemiG: 0x3a3830, hemiI: 0.95,
    sunC: 0xffffff, sunI: 0,
    fillC: 0xffffff, fillI: 0,
    lab1: 4.2, lab2: 3.4,
  },
  wreck: {
    bg: 0x7a6248, fogN: 32, fogF: 108,
    ambC: 0xc8a878, ambI: 0.58,
    hemiS: 0xffc090, hemiG: 0x5a3a20, hemiI: 1.1,
    sunC: 0xffb070, sunI: 1.65,
    fillC: 0x8090a8, fillI: 0.45,
    lab1: 0, lab2: 0,
  },
};

export function createLights(scene) {
  const amb = new THREE.AmbientLight(0xc8a070, 0.48);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0xffd4a0, 0x6a4a28, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc080, 1.5);
  sun.position.set(-40, 50, 20);
  sun.castShadow = false;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6a80a0, 0.28);
  fill.position.set(40, 25, -30);
  fill.castShadow = false;
  scene.add(fill);
  const labFill = new THREE.PointLight(0xd8eeff, 0, 42);
  labFill.position.set(44, LAB_Y + 3.4, 4);
  labFill.name = 'labFill';
  scene.add(labFill);
  const labFill2 = new THREE.PointLight(0xffe8c8, 0, 36);
  labFill2.position.set(50, LAB_Y + 3.2, 16);
  labFill2.name = 'labFill2';
  scene.add(labFill2);
  const L = { amb, hemi, sun, fill, labFill, labFill2, zone: 'ranch', qualityLow: true, cones: null, emer: null };

  L.applyAtmos = function applyAtmos(zone) {
    const a = ATMOS[zone] || ATMOS.ranch;
    this.zone = zone;
    const q = this.qualityLow;
    const cut = q ? 0.62 : 1;
    scene.background = new THREE.Color(a.bg);
    scene.fog = new THREE.Fog(a.bg, a.fogN, a.fogF);
    this.amb.color.setHex(a.ambC); this.amb.intensity = a.ambI * (q ? 0.9 : 1);
    this.hemi.color.setHex(a.hemiS); this.hemi.groundColor.setHex(a.hemiG);
    this.hemi.intensity = a.hemiI * (q ? 0.85 : 1);
    this.sun.color.setHex(a.sunC); this.sun.intensity = a.sunI * cut;
    this.fill.color.setHex(a.fillC); this.fill.intensity = q ? a.fillI * 0.25 : a.fillI;
    this.labFill.intensity = a.lab1 * (q ? 0.85 : 1);
    this.labFill2.intensity = a.lab2 * (q ? 0.85 : 1);
    if (this.cones) this.cones.visible = !q && zone === 'lab';
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
  const concTex = makeConcreteTex(512, [132, 128, 118], 17);
  concTex.repeat.set(2, 1.4);
  const concMat = new THREE.MeshStandardMaterial({
    color: 0xc8c4bc, map: concTex, roughness: 0.92, metalness: 0.04, envMapIntensity: 0,
  });
  concMat.name = 'bunker-concrete';
  const floorTex = makeConcreteTex(512, [104, 102, 96], 55);
  floorTex.repeat.set(6, 5);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xb0aea6, map: floorTex, roughness: 0.95, metalness: 0.03, envMapIntensity: 0,
  });
  floorMat.name = 'bunker-floor';
  const hazardMat = new THREE.MeshStandardMaterial({
    map: makeHazardTex(), roughness: 0.7, metalness: 0.15, envMapIntensity: 0,
  });
  hazardMat.name = 'bunker-hazard';

  const b = BUNKER;
  const r = RAMP;
  const thick = 0.45;
  const floorY = LAB_Y;
  const ceilY = LAB_CEIL;
  const h = ceilY - floorY; // ~4.65
  const midY = (ceilY + floorY) / 2;

  function box(w, hgt, d, mat, x, y, z, name) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), mat);
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

  const rampFloor = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, rw), floorMat);
  rampFloor.name = 'bunker-ramp';
  rampFloor.position.set(rcx, rcy, rcz);
  rampFloor.rotation.z = ang;
  group.add(rampFloor);

  const wallH = 3.2;
  for (const z of [r.z0 - 0.12, r.z1 + 0.12]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, 0.28), concMat);
    w.position.set(rcx, rcy + wallH * 0.35, z);
    w.rotation.z = ang;
    w.name = 'bunker-ramp-wall';
    group.add(w);
    solid(r.x0 - 0.2, r.x1 + 0.2, z - 0.2, z + 0.2);
  }
  const rampCeil = new THREE.Mesh(new THREE.BoxGeometry(len + 0.4, 0.22, rw + 0.6), concMat);
  rampCeil.position.set(rcx, rcy + 2.85, rcz);
  rampCeil.rotation.z = ang;
  rampCeil.name = 'bunker-ramp-ceil';
  group.add(rampCeil);

  // Surface pavilion (entrance)
  const px0 = 15.9, px1 = 17.35, pz0 = 1.55, pz1 = 6.45;
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
  box(0.45, 0.55, 3.6, concMat, px0 - 0.15, 3.0, 4, 'pav-lintel');
  solid(px0 - 0.4, px0 + 0.15, pz0, 2.25);
  solid(px0 - 0.4, px0 + 0.15, 5.75, pz1);

  // Hazard stripes at mouth
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 3.5), hazardMat);
  stripe.position.set(px0 - 0.38, 1.3, 4);
  stripe.name = 'pav-hazard';
  group.add(stripe);
  const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, rw), hazardMat);
  stripe2.position.set(r.x0 + 0.4, 0.06, rcz);
  group.add(stripe2);

  // Sign on west facade, south of door
  const signMat = new THREE.MeshStandardMaterial({
    map: makeSignTex(), roughness: 0.55, metalness: 0.1,
    emissive: 0x22180a, emissiveIntensity: 0.35, envMapIntensity: 0,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), signMat);
  sign.position.set(px0 - 0.42, 2.15, 2.55);
  sign.rotation.y = Math.PI / 2; // face west (-X)? Plane faces +Z; rot Y 90 looks toward +X. We want -X (toward hangar).
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
    color: 0xf4f8ff, emissive: 0xdceeff, emissiveIntensity: 5.5,
    roughness: 0.35, metalness: 0, envMapIntensity: 0,
  });
  fluoTubeMat.name = 'bunker-fluo';
  fluoTubeMat.userData._em0 = 5.5;
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
  const coneGeo = new THREE.ConeGeometry(1.15, 2.4, 8, 1, true);
  coneGeo.rotateX(Math.PI); // tip up
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xdceeff, transparent: true, opacity: 0.07,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
  });
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, fluoPositions.length);
  cones.name = 'bunker-cones';
  cones.frustumCulled = false;
  fluoPositions.forEach(([x, z], i) => {
    dummy.position.set(x, ceilY - 1.35, z);
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
    [50, ceilY - 0.25, 22], [16.15, 2.9, 4],
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
  return { group, cones, emer, fluoMat: fluoTubeMat, emMat };
}

export function updateBunkerLights(bunker, t) {
  if (!bunker) return;
  const pulse = 0.75 + 0.25 * Math.sin(t * 4.2);
  if (bunker.emMat) bunker.emMat.emissiveIntensity = (bunker.emMat.userData._em0 || 1.8) * pulse;
  if (bunker.fluoMat) {
    const f = 0.92 + 0.08 * Math.sin(t * 11) * Math.sin(t * 0.7);
    bunker.fluoMat.emissiveIntensity = (bunker.fluoMat.userData._em0 || 2.4) * f;
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
const ZONE_AMB = { ranch: 'amb_desert', hangar: 'amb_hangar', lab: 'amb_bunker', wreck: 'amb_desert' };
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
    this.dur = 0.62;
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
