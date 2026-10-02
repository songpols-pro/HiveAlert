// Insect / arthropod modelling kit shared by all faction model files.
//
// Static helpers add merged geometry into a PartBuilder `b`.
// Articulated helpers return pivot Groups whose NAMES drive the generic animator (models/animate.js):
//   hexA*/hexB*  sideways walker legs (tripod gait)     bipA/bipB   biped legs (swing on X)
//   armA/armB    arms (swing / raise when firing)        wingL*/wingR*  wings (flap on Z)
//   antL/antR    antennae (twitch)                       mandL/mandR  mandibles (open when firing)
//   tail         scorpion tail (strikes when firing)     body         bobs while moving
// Coordinates: +Z is forward, +Y up, origin on the ground at the model centre.
import * as THREE from 'three';
import { PartBuilder, pivot, marker } from './builder.js';
import { mulberry32 } from '../core/util.js';

// ------------------------------------------------------------------ static helpers

/** Two compound eyes at (±spread, y, z). */
export function eyes(b, mat, x, y, z, r, spread, sy = 1) {
  b.ellipsoid(mat, r, r * sy, r, x - spread, y, z, 8);
  b.ellipsoid(mat, r, r * sy, r, x + spread, y, z, 8);
}

/** Chain of joints [[x,y,z,r], ...] linked by tapered segments (antennae, tails, tendrils, necks). */
export function chain(b, mat, pts, seg = 6, joints = true) {
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z, r] = pts[i];
    if (joints) b.ellipsoid(mat, r, r, r, x, y, z, seg);
    if (i > 0) {
      const p = pts[i - 1];
      b.taper(mat, [p[0], p[1], p[2]], [x, y, z], p[3] * 0.85, r * 0.85, seg);
    }
  }
}

/** n cone spikes evenly spaced from `from` to `to`, pointing along `dir`. */
export function spikes(b, mat, from, to, n, len, r, dir = [0, 1, 0]) {
  const d = new THREE.Vector3(...dir).normalize();
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const p = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    b.taper(mat, p, [p[0] + d.x * len, p[1] + d.y * len, p[2] + d.z * len], r, 0.002, 4);
  }
}

/** Honeycomb of hex prisms. facing 'z' = comb wall facing +Z (prisms along Z); 'y' = comb lying flat. */
export function comb(b, wallMat, cellMat, cx, cy, cz, cols, rows, cell = 0.18, depth = 0.1, facing = 'z') {
  const R = cell / 2;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const u = (c - (cols - 1) / 2) * R * 1.74;
    const v = (r - (rows - 1) / 2) * R * 1.52 + (c % 2) * R * 0.76;
    if (facing === 'z') {
      b.cyl(wallMat, R, R, depth, 6, cx + u, cy + v, cz, Math.PI / 2, 0, 0);
      if (cellMat) b.cyl(cellMat, R * 0.72, R * 0.72, depth * 0.2, 6, cx + u, cy + v, cz + depth * 0.45, Math.PI / 2, 0, 0);
    } else {
      b.cyl(wallMat, R, R, depth, 6, cx + u, cy, cz + v);
      if (cellMat) b.cyl(cellMat, R * 0.72, R * 0.72, depth * 0.2, 6, cx + u, cy + depth * 0.45, cz + v);
    }
  }
}

/** Cluster of n egg sacs / blisters around (cx,cy,cz). */
export function sacs(b, mat, cx, cy, cz, n, r, spread, seed = 7) {
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, d = rng() * spread;
    const rr = r * (0.7 + rng() * 0.5);
    b.ellipsoid(mat, rr, rr * (0.85 + rng() * 0.3), rr, cx + Math.cos(a) * d, cy + rng() * spread * 0.5, cz + Math.sin(a) * d, 8);
  }
}

/** n slanted stilts/legs ringed around a centre, from the ground up to height `top`. */
export function stilts(b, mat, cx, cz, radius, n, top, r = 0.06, lean = 0.3, jointMat = null, phase = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + phase;
    const fx = cx + Math.cos(a) * radius * (1 + lean), fz = cz + Math.sin(a) * radius * (1 + lean);
    const kx = cx + Math.cos(a) * radius * (1 + lean * 1.4), kz = cz + Math.sin(a) * radius * (1 + lean * 1.4);
    const tx = cx + Math.cos(a) * radius, tz = cz + Math.sin(a) * radius;
    b.taper(mat, [fx, 0, fz], [kx, top * 0.45, kz], r * 0.7, r, 5);
    b.taper(mat, [kx, top * 0.45, kz], [tx, top, tz], r, r * 1.2, 5);
    if (jointMat) b.ellipsoid(jointMat, r * 1.3, r * 1.3, r * 1.3, kx, top * 0.45, kz, 6);
  }
}

/** Half-hoop bone ribs arching over a centre (rib cages, vaults). */
export function ribs(b, mat, cx, cy, cz, radius, n, thick = 0.04, axis = 'z', length = 1) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * length;
    if (axis === 'z') b.torus(mat, radius, thick, 4, 12, cx, cy, cz + t, 0, 0, 0, Math.PI);
    else b.torus(mat, radius, thick, 4, 12, cx + t, cy, cz, 0, Math.PI / 2, 0, Math.PI);
  }
}

/** Overlapping carapace plates (domes) stacked along Z from z0 to z1. */
export function plates(b, mat, x, y, z0, z1, n, rx, ry, rz, seg = 8) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const k = 1 - Math.abs(t - 0.5) * 0.5;
    b.dome(mat, rx * k, ry * k, rz, x, y, z0 + (z1 - z0) * t, seg);
  }
}

// ------------------------------------------------------------------ articulated parts

/**
 * Sideways walker legs (insects/spiders). Returns pivots named hexA#L/hexB#R… (tripod gait groups).
 * x: hip offset from centre · y: hip height · z0: front hip z · dz: spacing to the next pair
 * reach: horizontal reach · lift: knee height above hip · spread: fore/aft fan of the feet
 */
export function hexLegs(mat, o = {}) {
  const { pairs = 3, x = 0.15, y = 0.22, z0 = 0.18, dz = 0.18, reach = 0.32, lift = 0.12, r = 0.022, jointMat = null, footMat = null, spread = 0.5 } = o;
  const out = [];
  for (let i = 0; i < pairs; i++) {
    const z = z0 - i * dz;
    const fan = pairs === 1 ? 0 : (0.5 - i / (pairs - 1)) * spread;
    for (const s of [-1, 1]) {
      const group = (i % 2 === 0) === (s < 0) ? 'A' : 'B';
      const b = new PartBuilder();
      const kx = s * reach * 0.5, ky = lift, kz = fan * reach * 0.5;
      const fx = s * reach, fy = -y + 0.015, fz = fan * reach;
      b.taper(mat, [0, 0, 0], [kx, ky, kz], r * 1.25, r, 5);
      b.ellipsoid(jointMat || mat, r * 1.3, r * 1.3, r * 1.3, kx, ky, kz, 6);
      b.taper(mat, [kx, ky, kz], [fx, fy, fz], r, r * 0.4, 5);
      if (footMat) b.ellipsoid(footMat, r * 0.9, r * 0.6, r * 0.9, fx, fy, fz, 5);
      out.push(pivot(`hex${group}${i}${s < 0 ? 'L' : 'R'}`, b, s * x, y, z));
    }
  }
  return out;
}

/** Biped legs (upright soldier insects). Returns [bipA, bipB]. Feet reach the ground (y=0). */
export function bipedLegs(mat, o = {}) {
  const { x = 0.06, y = 0.24, r = 0.022, knee = 0.05, jointMat = null, footMat = null } = o;
  return [-1, 1].map((s) => {
    const b = new PartBuilder();
    b.taper(mat, [0, 0, 0], [s * 0.01, -y * 0.5, knee], r * 1.3, r, 5);
    b.ellipsoid(jointMat || mat, r * 1.2, r * 1.2, r * 1.2, s * 0.01, -y * 0.5, knee, 6);
    b.taper(mat, [s * 0.01, -y * 0.5, knee], [s * 0.02, -y + 0.02, -0.01], r, r * 0.6, 5);
    b.ellipsoid(footMat || mat, r * 1.1, r * 0.5, r * 1.8, s * 0.02, -y + 0.015, 0.01, 5);
    return pivot(s < 0 ? 'bipA' : 'bipB', b, s * x, y, 0);
  });
}

/**
 * Arms from shoulders at (±x, y, z). `tool(b, side)` may add a weapon/scythe at the hand,
 * which sits at (0, -len*0.35, len*0.75) in the arm pivot's local space. Returns [armA, armB].
 */
export function arms(mat, o = {}, tool = null) {
  const { x = 0.07, y = 0.36, z = 0.02, len = 0.18, r = 0.018, jointMat = null } = o;
  return [-1, 1].map((s) => {
    const b = new PartBuilder();
    const ex = s * 0.02, ey = -len * 0.45, ez = len * 0.2;
    const hx = 0, hy = -len * 0.35, hz = len * 0.75;
    b.taper(mat, [0, 0, 0], [ex, ey, ez], r * 1.2, r, 5);
    b.ellipsoid(jointMat || mat, r * 1.1, r * 1.1, r * 1.1, ex, ey, ez, 5);
    b.taper(mat, [ex, ey, ez], [hx, hy, hz], r, r * 0.7, 5);
    if (tool) tool(b, s, [hx, hy, hz]);
    return pivot(s < 0 ? 'armA' : 'armB', b, s * x, y, z);
  });
}

/**
 * Wings hinged at (±x, y, z). len: span · width: chord · sweep: backward sweep factor.
 * pairs: 1 or 2 (dragonfly). Returns [wingL0, wingR0, wingL1, wingR1…].
 */
export function wings(mat, o = {}, veinMat = null) {
  const { x = 0.05, y = 0.3, z = 0.0, len = 0.4, width = 0.14, sweep = 0.35, pairs = 1, pairGap = 0.12, tilt = 0.12 } = o;
  const out = [];
  for (let k = 0; k < pairs; k++) {
    for (const s of [-1, 1]) {
      const b = new PartBuilder();
      const pts = [[0, 0, 0]];
      const N = 8;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.8);
        pts.push([s * len * t, t * tilt * len, w * 0.35 - sweep * len * t]);
      }
      for (let i = N; i >= 1; i--) {
        const t = i / N;
        const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.8);
        pts.push([s * len * t, t * tilt * len, -w * 0.65 - sweep * len * t]);
      }
      b.polygon(mat, pts);
      if (veinMat) b.taper(veinMat, [0, 0, 0], [s * len * 0.95, tilt * len * 0.95, -sweep * len * 0.95], 0.008, 0.003, 3);
      out.push(pivot(`wing${s < 0 ? 'L' : 'R'}${k}`, b, s * x, y, z - k * pairGap, { castShadow: false }));
    }
  }
  return out;
}

/** Antennae from (±spread, y, z), curving forward/up/out. Returns [antL, antR]. */
export function antennae(mat, o = {}) {
  const { x = 0, y = 0.4, z = 0.1, len = 0.25, spread = 0.03, curve = 0.5, r = 0.008, tipMat = null } = o;
  return [-1, 1].map((s) => {
    const b = new PartBuilder();
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      pts.push([s * len * 0.35 * t, len * (0.55 * t + curve * 0.3 * Math.sin(Math.PI * t)), len * 0.75 * t, r * (1 - t * 0.5)]);
    }
    chain(b, mat, pts, 4, false);
    if (tipMat) b.ellipsoid(tipMat, r * 2, r * 2, r * 2, ...pts[4].slice(0, 3), 5);
    return pivot(s < 0 ? 'antL' : 'antR', b, x + s * spread, y, z);
  });
}

/** Curved mandibles/pincers from (±x, y, z) hooking inward. Returns [mandL, mandR]. */
export function mandibles(mat, o = {}) {
  const { x = 0.04, y = 0.2, z = 0.2, len = 0.14, r = 0.018, curve = 0.7, teethMat = null } = o;
  return [-1, 1].map((s) => {
    const b = new PartBuilder();
    const pts = [];
    const Rm = len / Math.max(0.05, curve);
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const th = t * curve;
      pts.push([-s * Rm * (1 - Math.cos(th)), 0, Rm * Math.sin(th), r * (1 - t * 0.6)]);
    }
    chain(b, mat, pts, 5, false);
    if (teethMat) spikes(b, teethMat, pts[1], pts[3], 3, r * 1.4, r * 0.5, [-s, 0, 0.3]);
    return pivot(s < 0 ? 'mandL' : 'mandR', b, s * x, y, z);
  });
}

/** Segmented scorpion tail rising from (0, y, z) over the back, with a sting. Returns 'tail' pivot. */
export function scorpionTail(mat, stingMat, o = {}) {
  const { y = 0.2, z = -0.2, segments = 6, len = 0.45, r = 0.04, height = 0.4, curl = 1.15 } = o;
  const b = new PartBuilder();
  const R = height / 2, k = len / height;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = t * Math.PI * curl;
    pts.push([0, R * (1 - Math.cos(a)), -Math.sin(a) * R * k, r * (1 - t * 0.45)]);
  }
  chain(b, mat, pts, 6, true);
  const a = Math.PI * curl;
  const end = pts[pts.length - 1];
  const d = new THREE.Vector3(0, Math.sin(a), -Math.cos(a) * k).normalize();
  const bulb = [end[0] + d.x * r, end[1] + d.y * r, end[2] + d.z * r];
  b.ellipsoid(stingMat, r * 0.9, r * 0.9, r * 0.9, ...bulb, 6);
  b.taper(stingMat, bulb, [bulb[0] + d.x * r * 3, bulb[1] + d.y * r * 3, bulb[2] + d.z * r * 3], r * 0.5, 0.003, 4);
  return pivot('tail', b, 0, y, z);
}

export { PartBuilder, pivot, marker };
