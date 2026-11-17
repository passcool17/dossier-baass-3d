/* camgrid.js — tiny XZ triangle grid for the third-person camera (v0.3.0).
 * Static bunker meshes are baked to world-space triangles once; each frame the
 * camera asks for the first hit on the segment look → camera. Visits only the
 * grid cells the segment crosses (a few dozen triangles), so it stays cheap on
 * a Galaxy S20 FE, unlike Raycaster against ~28 k triangles. */
import * as THREE from 'three';

export function buildTriGrid(meshes, cell = 1.0) {
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const list = [];
  for (const m of meshes) {
    const g = m.geometry;
    const pos = g && g.attributes && g.attributes.position;
    if (!pos) continue;
    m.updateWorldMatrix(true, false);
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) {
      for (let k = 0; k < 3; k++) {
        const vi = idx ? idx.getX(i + k) : i + k;
        v[k].fromBufferAttribute(pos, vi).applyMatrix4(m.matrixWorld);
      }
      list.push(v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, v[2].x, v[2].y, v[2].z);
    }
  }
  const tris = new Float32Array(list);
  const count = tris.length / 9;
  const cells = new Map();
  const key = (ix, iz) => (ix + 2048) * 4096 + (iz + 2048);
  for (let t = 0; t < count; t++) {
    const o = t * 9;
    const minx = Math.min(tris[o], tris[o + 3], tris[o + 6]);
    const maxx = Math.max(tris[o], tris[o + 3], tris[o + 6]);
    const minz = Math.min(tris[o + 2], tris[o + 5], tris[o + 8]);
    const maxz = Math.max(tris[o + 2], tris[o + 5], tris[o + 8]);
    for (let ix = Math.floor(minx / cell); ix <= Math.floor(maxx / cell); ix++) {
      for (let iz = Math.floor(minz / cell); iz <= Math.floor(maxz / cell); iz++) {
        const k = key(ix, iz);
        let a = cells.get(k);
        if (!a) { a = []; cells.set(k, a); }
        a.push(t);
      }
    }
  }
  return { tris, count, cells, cell, key, stamp: new Uint32Array(count), frame: 1 };
}

/** Distance along from→to of the first triangle hit (double-sided), or -1. */
export function segmentHit(grid, fx, fy, fz, tx, ty, tz) {
  if (!grid || !grid.count) return -1;
  const dx = tx - fx, dy = ty - fy, dz = tz - fz;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return -1;
  const ux = dx / len, uy = dy / len, uz = dz / len;
  const { tris, cells, cell, key, stamp } = grid;
  grid.frame = (grid.frame + 1) >>> 0 || 1;
  const fr = grid.frame;
  let best = Infinity;
  const steps = Math.max(1, Math.ceil(len / (cell * 0.5)));
  let lastK = -1;
  for (let s = 0; s <= steps; s++) {
    const px = fx + dx * (s / steps), pz = fz + dz * (s / steps);
    const k = key(Math.floor(px / cell), Math.floor(pz / cell));
    if (k === lastK) continue;
    lastK = k;
    const a = cells.get(k);
    if (!a) continue;
    for (let i = 0; i < a.length; i++) {
      const t = a[i];
      if (stamp[t] === fr) continue;
      stamp[t] = fr;
      const o = t * 9;
      // Möller–Trumbore
      const e1x = tris[o + 3] - tris[o], e1y = tris[o + 4] - tris[o + 1], e1z = tris[o + 5] - tris[o + 2];
      const e2x = tris[o + 6] - tris[o], e2y = tris[o + 7] - tris[o + 1], e2z = tris[o + 8] - tris[o + 2];
      const px2 = uy * e2z - uz * e2y, py2 = uz * e2x - ux * e2z, pz2 = ux * e2y - uy * e2x;
      const det = e1x * px2 + e1y * py2 + e1z * pz2;
      if (det > -1e-9 && det < 1e-9) continue;
      const inv = 1 / det;
      const sx = fx - tris[o], sy = fy - tris[o + 1], sz = fz - tris[o + 2];
      const u = (sx * px2 + sy * py2 + sz * pz2) * inv;
      if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const w = (ux * qx + uy * qy + uz * qz) * inv;
      if (w < 0 || u + w > 1) continue;
      const d = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (d > 0.05 && d < best) best = d;
    }
  }
  return best <= len + 0.25 ? best : -1;
}
