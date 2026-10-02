// Fog of war for the player team. A 2x-resolution visibility field is computed from unit/building
// sight radii, accumulated into an "explored" mask, and eased into a DataTexture every frame so the
// shroud recedes smoothly. All patched materials sample this texture (see render/fow.js).
import * as THREE from 'three';
import { MAP_W, MAP_H } from '../config.js';
import { shared } from '../render/fow.js';

export const FOW_RES = 2;
const EXPLORED_LEVEL = 112;

export class FogOfWar {
  constructor() {
    this.fw = MAP_W * FOW_RES;
    this.fh = MAP_H * FOW_RES;
    const n = this.fw * this.fh;
    this.target = new Float32Array(n);
    this.explored = new Uint8Array(n);
    this.display = new Uint8Array(n);
    this.visibleTile = new Uint8Array(MAP_W * MAP_H);
    this.exploredTile = new Uint8Array(MAP_W * MAP_H);
    this.tex = new THREE.DataTexture(this.display, this.fw, this.fh, THREE.RedFormat, THREE.UnsignedByteType);
    this.tex.magFilter = THREE.LinearFilter;
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.wrapS = this.tex.wrapT = THREE.ClampToEdgeWrapping;
    this.tex.needsUpdate = true;
    shared.uFowTex.value = this.tex;
    this.revealed = false;
    this.version = 0;
  }

  // sources: [{x, z, r}]
  compute(sources) {
    const { fw, fh, target, explored } = this;
    target.fill(0);
    this.visibleTile.fill(0);
    if (this.revealed) { target.fill(1); explored.fill(1); this.visibleTile.fill(1); this.exploredTile.fill(1); return; }
    for (const s of sources) {
      const r = s.r;
      const x0 = Math.max(0, Math.floor((s.x - r - 1) * FOW_RES));
      const x1 = Math.min(fw - 1, Math.ceil((s.x + r + 1) * FOW_RES));
      const z0 = Math.max(0, Math.floor((s.z - r - 1) * FOW_RES));
      const z1 = Math.min(fh - 1, Math.ceil((s.z + r + 1) * FOW_RES));
      for (let z = z0; z <= z1; z++) {
        const wz = (z + 0.5) / FOW_RES - s.z;
        for (let x = x0; x <= x1; x++) {
          const wx = (x + 0.5) / FOW_RES - s.x;
          const d = Math.sqrt(wx * wx + wz * wz);
          const v = (r - d) / 1.1;
          if (v <= 0) continue;
          const i = z * fw + x;
          const c = v > 1 ? 1 : v;
          if (c > target[i]) target[i] = c;
          if (c > 0.25) explored[i] = 1;
        }
      }
      // gameplay visibility per tile
      const tr = r - 0.4;
      const tx0 = Math.max(0, Math.floor(s.x - tr)), tx1 = Math.min(MAP_W - 1, Math.floor(s.x + tr));
      const tz0 = Math.max(0, Math.floor(s.z - tr)), tz1 = Math.min(MAP_H - 1, Math.floor(s.z + tr));
      for (let z = tz0; z <= tz1; z++) for (let x = tx0; x <= tx1; x++) {
        const dx = x + 0.5 - s.x, dz = z + 0.5 - s.z;
        if (dx * dx + dz * dz <= tr * tr) {
          this.visibleTile[z * MAP_W + x] = 1;
          this.exploredTile[z * MAP_W + x] = 1;
        }
      }
    }
    this.version++;
  }

  update(dt) {
    const { target, explored, display } = this;
    const k = Math.min(1, dt * 6);
    let changed = false;
    for (let i = 0; i < display.length; i++) {
      const goal = Math.max(target[i] * 255, explored[i] ? EXPLORED_LEVEL : 0);
      const cur = display[i];
      if (cur !== goal) {
        let nv = cur + (goal - cur) * k;
        nv = goal > cur ? Math.ceil(nv) : Math.floor(nv);
        display[i] = nv;
        changed = true;
      }
    }
    if (changed) this.tex.needsUpdate = true;
  }

  isVisible(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= MAP_W || tz >= MAP_H) return false;
    return this.visibleTile[tz * MAP_W + tx] === 1;
  }
  isExplored(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= MAP_W || tz >= MAP_H) return false;
    return this.exploredTile[tz * MAP_W + tx] === 1;
  }
  revealAll() { this.revealed = true; }

  // satellite: lift the shroud everywhere (terrain/structures known) without granting live vision
  exploreAll() {
    this.explored.fill(1);
    this.exploredTile.fill(1);
  }

  // spy in our radar: forget everything not currently seen
  reshroud() {
    this.explored.fill(0);
    this.exploredTile.fill(0);
  }

  // enemy gap generator: black out a circle except right around our own entities
  shroudCircle(cx, cz, r, protect) {
    const { fw, fh, target, explored } = this;
    const x0 = Math.max(0, Math.floor((cx - r) * FOW_RES)), x1 = Math.min(fw - 1, Math.ceil((cx + r) * FOW_RES));
    const z0 = Math.max(0, Math.floor((cz - r) * FOW_RES)), z1 = Math.min(fh - 1, Math.ceil((cz + r) * FOW_RES));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const wx = (x + 0.5) / FOW_RES, wz = (z + 0.5) / FOW_RES;
      if ((wx - cx) ** 2 + (wz - cz) ** 2 > r * r) continue;
      let near = false;
      for (const p of protect) if ((wx - p.x) ** 2 + (wz - p.z) ** 2 < 2.2) { near = true; break; }
      if (near) continue;
      const i = z * fw + x;
      target[i] = 0;
      explored[i] = 0;
    }
    const tr = r;
    for (let z = Math.max(0, Math.floor(cz - tr)); z <= Math.min(MAP_H - 1, Math.floor(cz + tr)); z++) {
      for (let x = Math.max(0, Math.floor(cx - tr)); x <= Math.min(MAP_W - 1, Math.floor(cx + tr)); x++) {
        if ((x + 0.5 - cx) ** 2 + (z + 0.5 - cz) ** 2 > tr * tr) continue;
        let near = false;
        for (const p of protect) if ((x + 0.5 - p.x) ** 2 + (z + 0.5 - p.z) ** 2 < 2.2) { near = true; break; }
        if (near) continue;
        this.visibleTile[z * MAP_W + x] = 0;
        this.exploredTile[z * MAP_W + x] = 0;
      }
    }
  }
}
