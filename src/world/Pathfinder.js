// 8-directional A* over the tile grid with a binary heap, plus line-of-sight path smoothing.

class Heap {
  constructor(cap) { this.items = new Int32Array(cap); this.keys = new Float32Array(cap); this.size = 0; }
  clear() { this.size = 0; }
  push(item, key) {
    let i = this.size++;
    this.items[i] = item; this.keys[i] = key;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop() {
    const top = this.items[0];
    this.size--;
    if (this.size > 0) {
      this.items[0] = this.items[this.size]; this.keys[0] = this.keys[this.size];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.size && this.keys[l] < this.keys[m]) m = l;
        if (r < this.size && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  swap(a, b) {
    const ti = this.items[a]; this.items[a] = this.items[b]; this.items[b] = ti;
    const tk = this.keys[a]; this.keys[a] = this.keys[b]; this.keys[b] = tk;
  }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

export class Pathfinder {
  constructor(map) {
    this.map = map;
    const n = map.w * map.h;
    this.g = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    this.cur = 1;
    this.heap = new Heap(n * 8);
  }

  // returns array of {x,z} world points (tile centres) or null
  find(sx, sz, gx, gz, { allowGoalBlocked = null } = {}) {
    const map = this.map, W = map.w;
    sx = Math.floor(sx); sz = Math.floor(sz);
    gx = Math.floor(gx); gz = Math.floor(gz);
    if (!map.inBounds(sx, sz)) return null;
    if (!map.passable(sx, sz)) {
      const s = map.nearestPassable(sx, sz, 4);
      if (!s) return null;
      sx = s.x; sz = s.z;
    }
    if (!map.passable(gx, gz)) {
      const g = map.nearestPassable(gx, gz, 14, allowGoalBlocked ? null : null);
      if (!g) return null;
      gx = g.x; gz = g.z;
    }
    const start = sz * W + sx, goal = gz * W + gx;
    if (start === goal) return [{ x: gx + 0.5, z: gz + 0.5 }];

    const stamp = ++this.cur;
    const { g, parent, heap, closed } = this;
    heap.clear();
    g[start] = 0; parent[start] = -1; this.stamp[start] = stamp;
    const h = (x, z) => { const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); };
    heap.push(start, h(sx, sz));
    let best = start, bestH = h(sx, sz);
    let iter = 0;
    while (heap.size > 0 && iter++ < 12000) {
      const cur = heap.pop();
      if (closed[cur] === stamp) continue;
      closed[cur] = stamp;
      if (cur === goal) { best = goal; break; }
      const cx = cur % W, cz = (cur / W) | 0;
      const hc = h(cx, cz);
      if (hc < bestH) { bestH = hc; best = cur; }
      for (const [dx, dz, cost] of DIRS) {
        const nx = cx + dx, nz = cz + dz;
        if (!map.passable(nx, nz)) continue;
        if (dx !== 0 && dz !== 0 && (!map.passable(cx + dx, cz) || !map.passable(cx, cz + dz))) continue;
        const ni = nz * W + nx;
        if (closed[ni] === stamp) continue;
        const ng = g[cur] + cost;
        if (this.stamp[ni] !== stamp || ng < g[ni]) {
          this.stamp[ni] = stamp;
          g[ni] = ng;
          parent[ni] = cur;
          heap.push(ni, ng + h(nx, nz) * 1.001);
        }
      }
    }
    const out = [];
    let c = best;
    while (c !== -1 && c !== undefined) {
      out.push({ x: (c % W) + 0.5, z: ((c / W) | 0) + 0.5 });
      if (c === start) break;
      c = parent[c];
    }
    out.reverse();
    return this.smooth(out);
  }

  los(ax, az, bx, bz, margin = 0.3) {
    const map = this.map;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return true;
    const steps = Math.ceil(len / 0.2);
    const px = (-dz / len) * margin, pz = (dx / len) * margin;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = ax + dx * t, z = az + dz * t;
      if (!map.passable(Math.floor(x), Math.floor(z))) return false;
      if (!map.passable(Math.floor(x + px), Math.floor(z + pz))) return false;
      if (!map.passable(Math.floor(x - px), Math.floor(z - pz))) return false;
    }
    return true;
  }

  smooth(path) {
    if (path.length <= 2) return path;
    const out = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
      let j = Math.min(path.length - 1, i + 14);
      while (j > i + 1 && !this.los(path[i].x, path[i].z, path[j].x, path[j].z)) j--;
      out.push(path[j]);
      i = j;
    }
    return out;
  }
}
