// Tile grid: terrain types, obstacles, building occupancy and resource (peat/mineral) fields.
import { MAP_W, MAP_H, TILE, RES_MAX, LAYOUT } from '../config.js';
import { mulberry32, fbm } from '../core/util.js';

const FOLIAGE_WEIGHTS = [['fern', 5], ['mushroom', 3], ['monstera', 3], ['bulb', 2], ['sunflower', 2], ['rock', 2]];

export class MapGrid {
  constructor(seed = 20261002) {
    this.w = MAP_W;
    this.h = MAP_H;
    const n = MAP_W * MAP_H;
    this.tiles = new Uint8Array(n);
    this.blocked = new Uint8Array(n); // 1 = flora/rock, 2 = building
    this.buildingAt = new Int32Array(n).fill(-1);
    this.occ = new Uint8Array(n); // tile reserved by a structure footprint (incl. walkable depots)
    this.res = new Float32Array(n);
    this.resSlot = new Int32Array(n).fill(-1);
    this.resSlots = [];
    this.road = new Uint8Array(n);
    this.foliage = []; // {kind, x, z, rot, scale}
    this.foliageAt = new Int32Array(n).fill(-1);
    this.grass = []; // {x, z, rot, scale}
    this.version = 0; // bump when blocking changes (paths/minimap)
    this.resVersion = 0;
    this.rng = mulberry32(seed);
    this.seed = seed;
    this.generate();
  }

  idx(x, z) { return z * this.w + x; }
  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.w && z < this.h; }
  passable(x, z) { return this.inBounds(x, z) && this.blocked[z * this.w + x] === 0; }
  passableIdx(i) { return this.blocked[i] === 0; }

  generate() {
    const { w, h, rng, seed } = this;
    const P = LAYOUT.playerHQ, E = LAYOUT.enemyHQ;
    const bases = [{ x: P.x + 1.5, z: P.z + 1.5 }, { x: E.x + 1.5, z: E.z + 1.5 }];

    // 1. base terrain: grass with organic soil patches
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
      const v = fbm(x * 0.09, z * 0.09, seed % 1000, 3);
      this.tiles[this.idx(x, z)] = v > 0.6 ? TILE.SOIL : TILE.GRASS;
    }
    // 2. concrete plazas around bases + ruin slabs
    for (const b of bases) {
      for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
        const d = Math.max(Math.abs(x + 0.5 - b.x), Math.abs(z + 0.5 - b.z));
        const wob = fbm(x * 0.3, z * 0.3, 77, 2) * 2.2;
        if (d < 6.2 + wob) this.tiles[this.idx(x, z)] = TILE.CONCRETE;
      }
    }
    for (let i = 0; i < 9; i++) {
      const cx = 8 + rng() * (w - 16), cz = 8 + rng() * (h - 16);
      const rw = 1 + rng() * 2.5, rh = 1 + rng() * 2.5;
      for (let z = Math.floor(cz - rh); z <= cz + rh; z++) for (let x = Math.floor(cx - rw); x <= cx + rw; x++) {
        if (this.inBounds(x, z) && rng() < 0.85) this.tiles[this.idx(x, z)] = TILE.CONCRETE;
      }
    }
    // 3. brick roads: main road between bases + spurs to fields
    const mid = { x: 36, z: 36 };
    this.carveRoad(bases[0], { x: 44, z: 30 }, 2);
    this.carveRoad({ x: 44, z: 30 }, mid, 2);
    this.carveRoad(mid, { x: 28, z: 42 }, 2);
    this.carveRoad({ x: 28, z: 42 }, bases[1], 2);
    this.carveRoad(bases[0], { x: 20, z: 56 }, 1);
    this.carveRoad(bases[1], { x: 56, z: 17 }, 1);
    this.carveRoad(mid, { x: 18, z: 56 }, 1);
    this.carveRoad(mid, { x: 56, z: 17 }, 1);

    // 4. resource fields
    for (const f of LAYOUT.fields) {
      for (let z = Math.floor(f.z - f.r - 2); z <= f.z + f.r + 2; z++) for (let x = Math.floor(f.x - f.r - 2); x <= f.x + f.r + 2; x++) {
        if (!this.inBounds(x, z)) continue;
        const i = this.idx(x, z);
        const d = Math.hypot(x + 0.5 - f.x, z + 0.5 - f.z) + (fbm(x * 0.5, z * 0.5, 31, 2) - 0.5) * 1.6;
        if (d < f.r + 1.8 && this.resSlot[i] < 0) {
          this.resSlot[i] = this.resSlots.length;
          this.resSlots.push(i);
        }
        if (d < f.r) {
          this.res[i] = RES_MAX * (0.55 + 0.45 * (1 - d / f.r)) * (0.85 + rng() * 0.15);
          this.tiles[i] = TILE.SOIL;
        }
      }
    }

    // 5. obstacle flora / rocks
    const nearBase = (x, z) => bases.some((b) => Math.hypot(x + 0.5 - b.x, z + 0.5 - b.z) < 10.5);
    const nearField = (x, z) => LAYOUT.fields.some((f) => Math.hypot(x + 0.5 - f.x, z + 0.5 - f.z) < f.r + 2.2);
    const weighted = () => {
      const tot = FOLIAGE_WEIGHTS.reduce((s, k) => s + k[1], 0);
      let r = rng() * tot;
      for (const [k, wgt] of FOLIAGE_WEIGHTS) { r -= wgt; if (r <= 0) return k; }
      return 'fern';
    };
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
      const i = this.idx(x, z);
      if (this.road[i] || nearBase(x, z) || nearField(x, z)) continue;
      const edge = Math.min(x, z, w - 1 - x, h - 1 - z);
      const cluster = fbm(x * 0.13, z * 0.13, 999, 3);
      let p = 0;
      if (edge < 2) p = 0.85;
      else if (edge < 4) p = 0.35;
      else if (cluster > 0.62) p = 0.5;
      else if (cluster > 0.55) p = 0.12;
      else p = 0.012;
      if (rng() < p) {
        let kind = weighted();
        if (this.tiles[i] === TILE.CONCRETE && rng() < 0.6) kind = rng() < 0.5 ? 'ruin' : 'rock';
        this.addFoliage(kind, x, z);
      }
    }
    // 6. ensure fields and both bases are connected to the player base
    this.ensureConnectivity(bases, mid);

    // 7. decorative grass tufts
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
      const i = this.idx(x, z);
      if (this.blocked[i] || this.road[i] || this.res[i] > 0) continue;
      const t = this.tiles[i];
      const n = t === TILE.GRASS ? 3 : t === TILE.SOIL ? (rng() < 0.3 ? 1 : 0) : (rng() < 0.08 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        if (rng() < 0.75) this.grass.push({ x: x + 0.1 + rng() * 0.8, z: z + 0.1 + rng() * 0.8, rot: rng() * 6.28, scale: 0.7 + rng() * 0.8 });
      }
    }
  }

  addFoliage(kind, x, z) {
    const i = this.idx(x, z);
    if (this.blocked[i]) return;
    const rng = this.rng;
    const big = kind === 'mushroom' || kind === 'sunflower' || kind === 'bulb';
    this.foliageAt[i] = this.foliage.length;
    this.foliage.push({
      kind, x: x + 0.5 + (rng() - 0.5) * 0.3, z: z + 0.5 + (rng() - 0.5) * 0.3,
      rot: rng() * Math.PI * 2, scale: (big ? 0.8 : 0.85) + rng() * (big ? 0.6 : 0.5),
    });
    this.blocked[i] = 1;
  }

  removeFoliageAt(x, z) {
    const i = this.idx(x, z);
    const fi = this.foliageAt[i];
    if (fi >= 0) { this.foliage[fi].removed = true; this.foliageAt[i] = -1; }
    if (this.blocked[i] === 1) this.blocked[i] = 0;
  }

  carveRoad(a, b, width) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const wob = (fbm(t * 4, 0.5, 5 + a.x, 2) - 0.5) * 6 * Math.sin(t * Math.PI);
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = a.x + dx * t + (-dz / len) * wob;
      const pz = a.z + dz * t + (dx / len) * wob;
      for (let oz = -width; oz <= width; oz++) for (let ox = -width; ox <= width; ox++) {
        if (ox * ox + oz * oz > width * width + 0.5) continue;
        const x = Math.floor(px + ox * 0.5), z = Math.floor(pz + oz * 0.5);
        if (!this.inBounds(x, z)) continue;
        const i = this.idx(x, z);
        this.road[i] = 1;
        if (this.tiles[i] !== TILE.CONCRETE) this.tiles[i] = TILE.BRICK;
      }
    }
  }

  flood(sx, sz) {
    const seen = new Uint8Array(this.w * this.h);
    const q = [this.idx(sx, sz)];
    seen[q[0]] = 1;
    while (q.length) {
      const i = q.pop();
      const x = i % this.w, z = (i / this.w) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (!this.inBounds(nx, nz)) continue;
        const j = this.idx(nx, nz);
        if (!seen[j] && !this.blocked[j]) { seen[j] = 1; q.push(j); }
      }
    }
    return seen;
  }

  ensureConnectivity(bases, mid) {
    const targets = [...LAYOUT.fields, bases[1], mid];
    const start = { x: Math.floor(bases[0].x), z: Math.floor(bases[0].z) };
    for (const t of targets) {
      let seen = this.flood(start.x, start.z);
      const tx = Math.floor(t.x), tz = Math.floor(t.z);
      if (seen[this.idx(tx, tz)]) continue;
      // carve a straight corridor towards the player base until we hit reachable ground
      const steps = Math.ceil(Math.hypot(start.x - tx, start.z - tz) * 2);
      for (let s = 0; s <= steps; s++) {
        const x = Math.floor(tx + ((start.x - tx) * s) / steps);
        const z = Math.floor(tz + ((start.z - tz) * s) / steps);
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) if (this.inBounds(x + dx, z + dz)) this.removeFoliageAt(x + dx, z + dz);
        if (seen[this.idx(x, z)]) break;
      }
    }
  }

  // ---- building occupancy -----------------------------------------------------------
  footprintFree(tx, tz, w, h) {
    for (let z = tz; z < tz + h; z++) for (let x = tx; x < tx + w; x++) {
      if (!this.inBounds(x, z)) return false;
      const i = this.idx(x, z);
      if (this.blocked[i] || this.occ[i] || this.res[i] > 0) return false;
    }
    return true;
  }

  setBuilding(id, tx, tz, w, h, walkable = false) {
    for (let z = tz; z < tz + h; z++) for (let x = tx; x < tx + w; x++) {
      const i = this.idx(x, z);
      if (this.foliageAt[i] >= 0) this.removeFoliageAt(x, z);
      this.blocked[i] = walkable ? 0 : 2;
      this.occ[i] = 1;
      this.buildingAt[i] = id;
    }
    this.version++;
  }

  clearBuilding(tx, tz, w, h) {
    for (let z = tz; z < tz + h; z++) for (let x = tx; x < tx + w; x++) {
      const i = this.idx(x, z);
      if (this.blocked[i] === 2) this.blocked[i] = 0;
      this.occ[i] = 0;
      this.buildingAt[i] = -1;
    }
    this.version++;
  }

  // ---- resources --------------------------------------------------------------------
  harvest(i, amount) {
    const take = Math.min(this.res[i], amount);
    this.res[i] -= take;
    if (this.res[i] < 1) this.res[i] = 0;
    this.resVersion++;
    this.dirtyRes?.add(i);
    return take;
  }

  regrow(dt) {
    // peat & mineral beds slowly regrow and creep into neighbouring slot tiles
    for (const i of this.resSlots) {
      const r = this.res[i];
      if (r > 0 && r < RES_MAX) {
        this.res[i] = Math.min(RES_MAX, r + 7 * dt);
        this.dirtyRes?.add(i);
      } else if (r === 0 && !this.blocked[i] && !this.occ[i] && Math.random() < 0.0035 * dt) {
        const x = i % this.w, z = (i / this.w) | 0;
        let nb = 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.inBounds(x + dx, z + dz) && this.res[this.idx(x + dx, z + dz)] > 60) nb++;
        if (nb >= 2) { this.res[i] = 30; this.dirtyRes?.add(i); this.resVersion++; }
      }
    }
  }

  nearestResource(x, z, maxDist = 999, avoid = null) {
    let best = -1, bd = maxDist;
    for (const i of this.resSlots) {
      if (this.res[i] < 5 || this.blocked[i]) continue;
      if (avoid && avoid.has(i)) continue;
      const tx = i % this.w, tz = (i / this.w) | 0;
      const d = Math.hypot(tx + 0.5 - x, tz + 0.5 - z);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // nearest passable tile to (x,z) via ring search
  nearestPassable(x, z, maxR = 12, extra = null) {
    x = Math.max(0, Math.min(this.w - 1, x));
    z = Math.max(0, Math.min(this.h - 1, z));
    if (this.passable(x, z) && (!extra || extra(x, z))) return { x, z };
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = 1e9;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const nx = x + dx, nz = z + dz;
        if (!this.passable(nx, nz) || (extra && !extra(nx, nz))) continue;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { x: nx, z: nz }; }
      }
      if (best) return best;
    }
    return null;
  }
}
