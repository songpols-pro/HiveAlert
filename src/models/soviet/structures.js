// SOVIET structures — Scorpiones, Araneae & Toxic Blattodea.
// Brutalist mud-and-mastic masonry, heavy rust/black iron-chitin plates, bone horns & spikes,
// toxic-green sacs and vents, cyan electric organs. Squat, armoured and menacing.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { mulberry32 } from '../../core/util.js';
import { PartBuilder, pivot, marker, chain, spikes, sacs, antennae } from '../insectKit.js';

const F = 'soviet';
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ local masonry helpers
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _mx = new THREE.Matrix4();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

/** Add a unit geometry: scaled (sx,sy,sz), then pitched (local X), then yawed (Y), then moved to (x,y,z). */
function put(b, mat, geo, x, y, z, sx = 1, sy = 1, sz = 1, yaw = 0, pitch = 0, roll = 0) {
  _e.set(pitch, yaw, roll, 'YXZ');
  _q.setFromEuler(_e);
  _mx.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  b.addMatrix(mat, geo, _mx);
}

/** Battered brutalist block: w×d base standing on (x,y,z), height h, top face = `top` × base. */
function block(b, mat, w, h, d, x, y, z, top = 0.8, yaw = 0, pitch = 0, roll = 0) {
  const g = new THREE.CylinderGeometry(top * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, 0.5, 0);
  put(b, mat, g, x, y, z, w, h, d, yaw, pitch, roll);
}

/** Octagonal plinth filling a w×d footprint, base at y. */
function plinth(b, mat, w, d, h, y = 0, top = 0.94) {
  const g = new THREE.CylinderGeometry(top, 1, 1, 8, 1);
  g.rotateY(Math.PI / 8);
  g.translate(0, 0.5, 0);
  const k = 1 / Math.cos(Math.PI / 8);
  put(b, mat, g, 0, y, 0, (w / 2) * k, h, (d / 2) * k);
}

/** Elliptic drum / tapered course standing on (x,y,z). */
function drum(b, mat, rx, rz, h, x, y, z, seg = 8, top = 1, yaw = 0) {
  const g = new THREE.CylinderGeometry(top, 1, 1, seg, 1);
  g.translate(0, 0.5, 0);
  put(b, mat, g, x, y, z, rx, h, rz, yaw);
}

/** Open elliptic belt (team bands, iron hoops) from y to y+h; `top` narrows the upper edge. */
function belt(b, mat, rx, rz, h, x, y, z, top = 1, seg = 16, yaw = 0) {
  const g = new THREE.CylinderGeometry(top, 1, 1, seg, 1, true);
  g.translate(0, 0.5, 0);
  put(b, mat, g, x, y, z, rx, h, rz, yaw);
}

/** Belt hugging a dome(rx,ry,rz) whose base centre is (cx,cy,cz), between heights y0..y1 above that base. */
function domeBelt(b, mat, rx, ry, rz, cx, cy, cz, y0, y1, seg = 16, grow = 1.03) {
  const k0 = Math.sqrt(Math.max(0, 1 - (y0 / ry) ** 2)), k1 = Math.sqrt(Math.max(0, 1 - (y1 / ry) ** 2));
  belt(b, mat, rx * k0 * grow, rz * k0 * grow, y1 - y0, cx, cy + y0, cz, k1 / k0, seg);
}

/** Lathe profile [[r,y],…] revolved around (x,y,z). Run the profile outside → over the lip → inside. */
function lathe(b, mat, pts, seg, x = 0, y = 0, z = 0) {
  const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  put(b, mat, g, x, y, z);
}

/** n spikes on a ring of radius r around (cx,cy,cz), leaning outward by `out`. */
function spikeRing(b, mat, cx, cy, cz, r, n, len, rad, out = 0.6, phase = 0) {
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    const d = new THREE.Vector3(c * out, 1, s * out).normalize().multiplyScalar(len);
    b.taper(mat, [cx + c * r, cy, cz + s * r], [cx + c * r + d.x, cy + d.y, cz + s * r + d.z], rad, 0.004, 5);
  }
}

/** Curved horn from p along dir, curling upward by `lift`. */
function horn(b, mat, p, dir, len, r, lift = 0.5, n = 4) {
  const d = new THREE.Vector3(...dir).normalize();
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([p[0] + d.x * len * t, p[1] + d.y * len * t + lift * len * t * t, p[2] + d.z * len * t, r * (1 - t * 0.85) + 0.004]);
  }
  chain(b, mat, pts, 5, false);
}

/** Flat strip on the ground from (x0,z0) to (x1,z1): apron markings. */
function strip(b, mat, x0, z0, x1, z1, y, w = 0.07, h = 0.012) {
  const dx = x1 - x0, dz = z1 - z0;
  b.box(mat, Math.hypot(dx, dz) + w * 0.5, h, w, (x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, 0, Math.atan2(-dz, dx), 0);
}

/** Flat dock/exit apron (top ≤ 0.05) with team chevrons pointing toward +Z (dir 1) or -Z (dir -1). */
function apron(b, m, x, z, w, d, dir = 1) {
  b.box(m.chitinDark, w + 0.08, 0.02, d + 0.06, x, 0.01, z);
  b.box(m.mud, w, 0.035, d, x, 0.0175, z);
  for (let i = 0; i < 2; i++) {
    const cz = z + (i - 0.5) * d * 0.42;
    for (const s of [-1, 1]) strip(b, m.team, x, cz + dir * 0.1, x + s * w * 0.3, cz - dir * 0.1, 0.035);
  }
  for (const s of [-1, 1]) strip(b, m.team, x + s * w * 0.44, z - d * 0.42, x + s * w * 0.44, z + d * 0.42, 0.035, 0.045);
}

/** Jagged lightning bolt (static arc) from a to c. */
function bolt(b, mat, a, c, n, jitter, r, seed) {
  const rng = mulberry32(seed);
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = i === n ? c : [
      a[0] + (c[0] - a[0]) * t + (rng() - 0.5) * jitter,
      a[1] + (c[1] - a[1]) * t + (rng() - 0.5) * jitter,
      a[2] + (c[2] - a[2]) * t + (rng() - 0.5) * jitter,
    ];
    b.taper(mat, prev, p, r, r * 0.8, 3);
    prev = p;
  }
}

// ==================================================================== structures

/** Central Hive Nexus (Construction Yard) — 3×3, h 2.8. Brutalist stepped termitary bristling with barbs and toxic vents. */
export function buildHiveNexus(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const cz = -0.05;
  // footing: black chitin kerb + mastic apron
  plinth(b, m.chitinDark, 3.0, 3.0, 0.08);
  plinth(b, m.mud, 2.86, 2.86, 0.12, 0.08, 0.93);
  // tier 1: battered mastic bastion, team band, black cornice
  block(b, m.mud, 2.1, 0.75, 2.1, 0, 0.2, cz, 0.86);
  block(b, m.team, 1.9, 0.12, 1.9, 0, 0.76, cz, 0.97);
  block(b, m.chitinDark, 1.98, 0.09, 1.98, 0, 0.95, cz, 0.95);
  // tier 2
  block(b, m.mud, 1.45, 0.62, 1.45, 0.05, 1.04, -0.22, 0.78);
  block(b, m.chitinDark, 1.24, 0.07, 1.24, 0.05, 1.64, -0.22, 0.94);
  // main termitary spire: lumpy mastic courses with iron hoops
  const sx = 0.05, sz = -0.25;
  let y = 1.71;
  [[0.48, 0.4, 0.26], [0.41, 0.32, 0.24], [0.33, 0.24, 0.22], [0.25, 0.13, 0.2]].forEach(([r0, r1, h], i) => {
    drum(b, m.mud, r0, r0 * 0.94, h, sx + (i % 2 ? 0.02 : -0.02), y, sz, 7, r1 / r0, i * 0.45);
    y += h;
    if (i < 3) belt(b, i === 1 ? m.team : m.chitinDark, r1 * 1.08, r1 * 1.02, 0.06, sx, y - 0.03, sz, 1, 7);
  });
  b.ellipsoid(m.mud, 0.15, 0.1, 0.14, sx, y, sz, 7);
  spikeRing(b, m.bone, sx, y - 0.05, sz, 0.12, 6, 0.26, 0.022, 1.2, 0.4);   // sensory barbs
  // side chimneys with toxic vents
  const vent = (x, z, y0, h, r, name) => {
    drum(b, m.mud, r, r, h * 0.55, x, y0, z, 7, 0.8);
    drum(b, m.mud, r * 0.8, r * 0.8, h * 0.45, x, y0 + h * 0.55, z, 7, 0.65, 0.3);
    belt(b, m.chitinDark, r * 0.88, r * 0.88, 0.07, x, y0 + h * 0.47, z, 1, 7);
    const yt = y0 + h;
    b.torus(m.chitinDark, r * 0.52 + 0.03, 0.05, 4, 8, x, yt, z, Math.PI / 2, 0, 0);
    b.cyl(m.organ, r * 0.5, r * 0.5, 0.03, 7, x, yt - 0.01, z);
    spikeRing(b, m.bone, x, yt - 0.03, z, r * 0.6, 5, 0.18, 0.026, 0.8, 0.3);
    root.add(marker(name, x, yt + 0.12, z));
  };
  vent(-0.8, -0.8, 0.98, 1.05, 0.26, 'smoke');
  vent(0.8, 0.48, 0.98, 0.62, 0.2, 'smoke2');
  // front maw gate framed by bone mandible tusks
  b.dome(m.dark, 0.34, 0.52, 0.08, 0, 0.2, 1.0, 10, -0.2, 0, 0);
  put(b, m.chitinDark, new THREE.TorusGeometry(1, 0.16, 5, 12, Math.PI), 0, 0.2, 1.01, 0.4, 0.58, 0.45, 0, -0.2);
  for (const s of [-1, 1]) {
    chain(b, m.bone, [[s * 0.44, 0.22, 1.08, 0.08], [s * 0.58, 0.5, 1.2, 0.062], [s * 0.46, 0.78, 1.33, 0.042], [s * 0.2, 0.86, 1.42, 0.018]], 6);
  }
  // iron-chitin scutes leaning on the bastion, each with a team stripe and a bone barb
  const scute = (yaw, along, w, h) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw), tx = Math.cos(yaw), tz = -Math.sin(yaw);
    const x = nx * 1.09 + tx * along, z = cz + nz * 1.09 + tz * along;
    block(b, m.chitinDark, w, h, 0.1, x, 0.17, z, 0.78, yaw, -0.2);
    block(b, m.team, w * 0.24, h * 0.82, 0.1, x + nx * 0.016, 0.19, z + nz * 0.016, 0.8, yaw, -0.2);
    const tip = [x - nx * h * 0.2, 0.17 + h * 0.98, z - nz * h * 0.2];
    b.taper(m.bone, tip, [tip[0] + nx * 0.24, tip[1] + 0.2, tip[2] + nz * 0.24], 0.045, 0.004, 5);
  };
  for (const a of [-0.7, 0.7]) scute(0, a, 0.5, 0.72);
  for (const a of [0.62, -0.08]) scute(Math.PI / 2, a, 0.52, 0.72);
  for (const a of [-0.55, 0.55]) scute(Math.PI, a, 0.6, 0.72);
  for (const a of [-0.55, 0.55]) scute(-Math.PI / 2, a, 0.6, 0.72);
  // great bone horns at the bastion corners
  for (const [kx, kz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    horn(b, m.bone, [kx * 0.98, 0.24, cz + kz * 0.98], [kx, 0.2, kz], 0.58, 0.1, 0.55);
  }
  // glowing toxic gill-slits in the tier-2 walls
  for (const yaw of [0, Math.PI / 2]) {
    const nx = Math.sin(yaw), nz = Math.cos(yaw), tx = Math.cos(yaw), tz = -Math.sin(yaw);
    for (const a of [-0.32, 0, 0.32]) {
      block(b, m.organ, 0.08, 0.32, 0.05, 0.05 + nx * 0.705 + tx * a, 1.14, -0.22 + nz * 0.705 + tz * a, 0.9, yaw, -0.252);
    }
  }
  // sensory barbs bristling from the tier-2 cornice
  const e = 0.6, ty = 1.7;
  spikes(b, m.bone, [sx - e * 0.8, ty, -0.22 + e], [sx + e * 0.8, ty, -0.22 + e], 4, 0.28, 0.03, [0, 1, 0.8]);
  spikes(b, m.bone, [sx + e, ty, -0.22 - e * 0.8], [sx + e, ty, -0.22 + e * 0.8], 4, 0.28, 0.03, [0.8, 1, 0]);
  spikes(b, m.bone, [sx - e, ty, -0.22 - e * 0.8], [sx - e, ty, -0.22 + e * 0.8], 3, 0.28, 0.03, [-0.8, 1, 0]);
  spikes(b, m.bone, [sx - e * 0.8, ty, -0.22 - e], [sx + e * 0.8, ty, -0.22 - e], 3, 0.28, 0.03, [0, 1, -0.8]);
  root.add(b.build());

  // toxic sac clutch nestled against the right flank
  const ps = new PartBuilder();
  ps.dome(m.chitinDark, 0.3, 0.12, 0.26, 0, 0, 0, 8);
  sacs(ps, m.organ, 0, 0.1, 0, 6, 0.11, 0.2, 11);
  root.add(pivot('pulseSacs', ps, 1.2, 0.2, 0.6));
  // twitching sensory antennae on the spire crown
  for (const a of antennae(m.chitinDark, { x: sx, y: y + 0.02, z: sz + 0.06, len: 0.55, spread: 0.06, curve: 0.6, r: 0.022, tipMat: m.organ })) root.add(a);
  return root;
}

/** Electrocyte Breeding Hive (Power) — 2×2, h 2.2. Bulbous egg sacs with electric organs in a chitin cradle. */
export function buildElectrocyteHive(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  plinth(b, m.chitinDark, 1.96, 1.96, 0.07);
  plinth(b, m.mud, 1.84, 1.84, 0.13, 0.07, 0.9);
  // squat mastic socket with team band
  drum(b, m.mud, 0.64, 0.64, 0.32, 0, 0.2, 0, 8, 0.84);
  belt(b, m.team, 0.62, 0.62, 0.1, 0, 0.3, 0, 0.955, 8);
  // electroplax columns: stacked electrocyte discs (electric-ray organs), bone electrode tips
  const tips = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * (Math.PI / 2), x = Math.cos(a) * 0.76, z = Math.sin(a) * 0.76;
    for (let k = 0; k < 6; k++) b.cyl(k % 2 ? m.spark : m.chitinDark, 0.14, 0.14, 0.07, 6, x, 0.235 + k * 0.07, z);
    b.cyl(m.chitinDark, 0.16, 0.14, 0.06, 6, x, 0.65, z);
    b.cone(m.bone, 0.06, 0.22, 5, x, 0.79, z);
    b.ellipsoid(m.spark, 0.045, 0.045, 0.045, x, 0.9, z, 5);
    tips.push([x, 0.9, z]);
  }
  // black chitin cradle claws holding the egg cluster, team-banded at the root
  const claws = [];
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2), c = Math.cos(a), s = Math.sin(a);
    const P = (r, yy, rr) => [c * r, yy, s * r, rr];
    chain(b, m.chitinDark, [P(0.5, 0.48, 0.09), P(0.74, 0.98, 0.075), P(0.7, 1.45, 0.06), P(0.48, 1.8, 0.045), P(0.3, 1.92, 0.025)], 6);
    b.torus(m.team, 0.095, 0.03, 4, 8, ...P(0.56, 0.6, 0).slice(0, 3), Math.PI / 2, 0, 0);
    spikes(b, m.bone, P(0.76, 1.0, 0).slice(0, 3), P(0.62, 1.6, 0).slice(0, 3), 3, 0.18, 0.03, [c, 0.5, s]);
    b.ellipsoid(m.spark, 0.04, 0.04, 0.04, ...P(0.3, 1.94, 0).slice(0, 3), 5);
    claws.push(P(0.74, 0.98, 0).slice(0, 3));
  }
  // crackling arcs from the electrode tips into the cradle
  for (let i = 0; i < 4; i++) bolt(b, m.spark, tips[i], claws[i], 4, 0.12, 0.012, 31 + i);
  root.add(b.build());

  // the core: vibrating egg-sac cluster with glowing electrocyte yolks
  const c = new PartBuilder();
  c.dome(m.chitinDark, 0.5, 0.24, 0.5, 0, 0.24, 0, 10, Math.PI);
  c.torus(m.team, 0.5, 0.045, 4, 14, 0, 0.24, 0, Math.PI / 2, 0, 0);
  c.ellipsoid(m.membrane, 0.38, 0.58, 0.38, 0, 0.8, 0, 12);
  c.ellipsoid(m.spark, 0.24, 0.42, 0.24, 0, 0.78, 0, 10);
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2) + 0.4, pts = [];
    for (let k = 0; k <= 4; k++) {
      const ph = 0.45 + k * 0.5;
      pts.push([Math.cos(a) * 0.39 * Math.sin(ph), 0.8 + 0.59 * Math.cos(ph), Math.sin(a) * 0.39 * Math.sin(ph), 0.024]);
    }
    chain(c, m.chitinDark, pts, 4, false);
  }
  for (let i = 0; i < 3; i++) {
    const a = i * (TAU / 3) + Math.PI / 6, x = Math.cos(a) * 0.38, z = Math.sin(a) * 0.38;
    const rx = Math.sin(a) * 0.4, rz = -Math.cos(a) * 0.4;
    c.ellipsoid(m.membrane, 0.2, 0.3, 0.2, x, 0.45, z, 10, rx, 0, rz);
    c.ellipsoid(m.spark, 0.12, 0.2, 0.12, x, 0.45, z, 8, rx, 0, rz);
    c.torus(m.chitinDark, 0.19, 0.025, 4, 10, x, 0.38, z, Math.PI / 2 + rx, 0, rz);
  }
  c.taper(m.bone, [0, 1.3, 0], [0, 1.6, 0], 0.07, 0.012, 6);
  for (let i = 0; i < 3; i++) {
    const a = i * (TAU / 3);
    c.taper(m.bone, [Math.cos(a) * 0.1, 1.3, Math.sin(a) * 0.1], [Math.cos(a) * 0.26, 1.48, Math.sin(a) * 0.26], 0.035, 0.004, 4);
  }
  c.ellipsoid(m.spark, 0.06, 0.06, 0.06, 0, 1.6, 0, 6);
  root.add(pivot('core', c, 0, 0.52, 0));

  // smaller pulsing egg clutches around the socket
  const clutch = (name, x, z) => {
    const p = new PartBuilder();
    p.dome(m.chitinDark, 0.2, 0.08, 0.2, 0, 0, 0, 8);
    p.ellipsoid(m.membrane, 0.15, 0.2, 0.15, 0, 0.17, 0, 8);
    p.ellipsoid(m.spark, 0.09, 0.13, 0.09, 0, 0.16, 0, 6);
    p.ellipsoid(m.membrane, 0.09, 0.12, 0.09, 0.13, 0.1, 0.06, 6);
    p.ellipsoid(m.spark, 0.05, 0.07, 0.05, 0.13, 0.1, 0.06, 5);
    root.add(pivot(name, p, x, 0.2, z));
  };
  clutch('pulseA', 0.02, 0.74);
  clutch('pulseB', 0.74, 0.02);
  clutch('pulseC', -0.74, -0.02);
  return root;
}

/** Grinding Chitin Mill (Refinery) — 3×3, h 2.6, dock in front. Rotating serrated jawbones over a digestive pit. */
export function buildChitinMill(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  plinth(b, m.chitinDark, 3.0, 3.0, 0.07);
  plinth(b, m.mud, 2.86, 2.86, 0.1, 0.07, 0.94);
  const pz = 0.28;
  // crater rim: mastic outside, black chitin throat inside, ringed with inward bone teeth
  lathe(b, m.mud, [[1.22, 0.1], [1.15, 0.36], [1.06, 0.52], [0.98, 0.55]], 16, 0, 0, pz);
  lathe(b, m.chitinDark, [[0.98, 0.55], [0.92, 0.5], [0.88, 0.3], [0.86, 0.14]], 16, 0, 0, pz);
  belt(b, m.team, 1.2, 1.2, 0.1, 0, 0.19, pz, 0.976, 16);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + 0.1, c = Math.cos(a), s = Math.sin(a);
    b.taper(m.bone, [c * 0.97, 0.5, pz + s * 0.97], [c * 0.72, 0.38, pz + s * 0.72], 0.05, 0.004, 4);
  }
  // dark digesting slurry with green froth
  b.cyl(m.dark, 0.88, 0.88, 0.04, 16, 0, 0.15, pz);
  b.torus(m.blood, 0.62, 0.03, 3, 16, 0, 0.175, pz, Math.PI / 2, 0, 0);
  b.torus(m.blood, 0.38, 0.025, 3, 12, 0, 0.175, pz, Math.PI / 2, 0, 0);
  const rng = mulberry32(5);
  for (let i = 0; i < 8; i++) {
    const a = rng() * TAU, d = 0.25 + rng() * 0.55, r = 0.03 + rng() * 0.04;
    b.ellipsoid(m.acid, r, r * 0.7, r, Math.cos(a) * d, 0.18, pz + Math.sin(a) * d, 5);
  }
  // feeding chute from the dock lip down into the pit
  b.box(m.chitinDark, 0.5, 0.05, 0.72, 0, 0.5, 1.2, -0.35, 0, 0);
  for (const s of [-1, 1]) b.box(m.bone, 0.05, 0.08, 0.72, s * 0.27, 0.55, 1.2, -0.35, 0, 0);
  // twin mandible silos at the back
  const silo = (x, z, h, name) => {
    drum(b, m.mud, 0.4, 0.4, h, x, 0.17, z, 8, 0.85);
    for (const t of [0.25, 0.7]) belt(b, m.chitinDark, 0.4 * (1 - 0.15 * t) * 1.04, 0.4 * (1 - 0.15 * t) * 1.04, 0.08, x, 0.17 + h * t, z, 0.99, 8);
    belt(b, m.team, 0.4 * (1 - 0.15 * 0.47) * 1.04, 0.4 * (1 - 0.15 * 0.47) * 1.04, 0.14, x, 0.17 + h * 0.47, z, 0.985, 8);
    const yt = 0.17 + h;
    b.dome(m.chitinDark, 0.37, 0.2, 0.37, x, yt, z, 8);
    spikeRing(b, m.bone, x, yt + 0.04, z, 0.3, 6, 0.24, 0.035, 0.8, 0.2);
    b.cyl(m.chitinDark, 0.08, 0.11, 0.24, 6, x, yt + 0.28, z);
    b.torus(m.organ, 0.085, 0.028, 4, 8, x, yt + 0.4, z, Math.PI / 2, 0, 0);
    root.add(marker(name, x, yt + 0.5, z));
  };
  silo(-0.95, -1.05, 1.95, 'smoke');
  silo(0.95, -1.05, 1.7, 'smoke2');
  block(b, m.mud, 1.2, 0.85, 0.42, 0, 0.17, -1.2, 0.8);
  block(b, m.chitinDark, 1.0, 0.07, 0.36, 0, 1.0, -1.2, 0.9);
  // digestion ducts from the pit into the silos
  for (const s of [-1, 1]) chain(b, m.flesh, [[s * 0.62, 0.5, -0.4, 0.07], [s * 0.78, 0.9, -0.68, 0.065], [s * 0.86, 1.15, -0.8, 0.06]], 6);
  // gantry beams from the silos to the jaw bearing
  const hubY = 1.98;
  for (const s of [-1, 1]) {
    b.taper(m.chitinDark, [s * 0.82, 1.9, -0.98], [s * 0.1, hubY, pz], 0.1, 0.07, 6);
    spikes(b, m.bone, [s * 0.66, 1.98, -0.68], [s * 0.26, 2.04, 0.0], 3, 0.18, 0.03, [0, 1, 0.2]);
  }
  b.cyl(m.metal, 0.17, 0.17, 0.12, 8, 0, hubY, pz);
  b.torus(m.team, 0.18, 0.035, 4, 10, 0, hubY, pz, Math.PI / 2, 0, 0);
  apron(b, m, 0, 2.0, 1.0, 0.9, -1);
  root.add(b.build());

  // the grinder: axle + three serrated jawbones sweeping through the slurry
  const j = new PartBuilder();
  j.cyl(m.chitinDark, 0.09, 0.12, 1.78, 7, 0, 0.15 + 0.89, 0);
  for (const yy of [0.55, 1.05]) j.cyl(m.metal, 0.15, 0.15, 0.07, 7, 0, yy, 0);
  j.dodeca(m.chitinDark, 0.22, 0, 1.32, 0, 1, 0.8, 1);
  for (let i = 0; i < 3; i++) {
    const a0 = i * (TAU / 3);
    const P = (r, yy, da, rr) => [Math.cos(a0 + da) * r, yy, Math.sin(a0 + da) * r, rr];
    const pts = [P(0.15, 1.32, 0, 0.11), P(0.5, 1.24, -0.08, 0.1), P(0.74, 0.98, -0.18, 0.085), P(0.79, 0.62, -0.3, 0.07), P(0.66, 0.3, -0.42, 0.05)];
    chain(j, m.bone, pts, 6);
    for (let k = 1; k < pts.length; k++) {
      const a = a0 + [0, -0.08, -0.18, -0.3, -0.42][k];
      const lead = [Math.sin(a), -0.25, -Math.cos(a)];
      spikes(j, m.bone, pts[k - 1].slice(0, 3), pts[k].slice(0, 3), 2, 0.15, 0.03, lead);
    }
    j.ellipsoid(m.chitinDark, 0.12, 0.09, 0.14, ...P(0.32, 1.3, -0.04, 0).slice(0, 3), 6);
  }
  const spin = pivot('spinYJaws', j, 0, 0, pz);
  spin.userData.speed = 0.45;
  root.add(spin);
  return root;
}

/** Swarm Hatchery (Barracks) — 2×2, h 1.6, exit front-left. Brood mound with spawning burrows and royal-jelly sacs. */
export function buildSwarmHatchery(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  plinth(b, m.chitinDark, 1.96, 1.96, 0.06);
  plinth(b, m.mud, 1.84, 1.84, 0.08, 0.06, 0.92);
  // the brood mound, banded and ribbed with black chitin
  const MX = 0.12, MZ = -0.18, RX = 0.82, RY = 1.0, RZ = 0.78;
  b.dome(m.mud, RX, RY, RZ, MX, 0.1, MZ, 14);
  domeBelt(b, m.team, RX, RY, RZ, MX, 0.1, MZ, 0.08, 0.2, 14);
  for (const dz of [-0.42, 0.0, 0.4]) {
    const k = Math.sqrt(1 - (dz / RZ) ** 2) * 1.03;
    put(b, m.chitinDark, new THREE.TorusGeometry(1, 0.07, 4, 12, Math.PI), MX, 0.1, MZ + dz, RX * k, RY * k, 1);
    spikes(b, m.bone, [MX - 0.3 * k, 0.1 + RY * k * 0.95, MZ + dz], [MX + 0.3 * k, 0.1 + RY * k * 0.95, MZ + dz], 3, 0.16, 0.03, [0, 1, 0.15]);
  }
  // spawning burrow holes on the flanks
  for (const [hx, hy, hz] of [[0.78, 0.45, -0.35], [0.5, 0.75, 0.15], [-0.4, 0.62, -0.6], [0.72, 0.3, 0.12]]) {
    b.ellipsoid(m.dark, 0.1, 0.09, 0.1, hx, hy, hz, 6);
  }
  // burrow tunnel: mastic barrel vault pushing out of the mound over the exit tile
  const GX = -0.45;
  const vault = (mat, rx, ry, len, z0) => put(b, mat, new THREE.CylinderGeometry(1, 1, 1, 10, 1, false, -Math.PI / 2, Math.PI), GX, 0.1, z0, rx, len, ry, 0, -Math.PI / 2);
  vault(m.mud, 0.44, 0.66, 0.72, 0.42);
  vault(m.chitinDark, 0.47, 0.69, 0.08, 0.7);
  vault(m.team, 0.475, 0.695, 0.06, 0.52);
  spikes(b, m.bone, [GX - 0.3, 0.62, 0.36], [GX + 0.3, 0.62, 0.36], 3, 0.2, 0.035, [0, 1, 0.2]);
  b.dome(m.dark, 0.28, 0.42, 0.05, GX, 0.1, 0.79, 10);
  for (const s of [-1, 1]) horn(b, m.bone, [GX + s * 0.4, 0.14, 0.82], [s * 0.4, 1, 0.5], 0.42, 0.06, -0.15);
  // brood pits with curled grubs swimming in royal jelly
  const pit = (px, pz, r) => {
    lathe(b, m.mud, [[r + 0.08, 0.13], [r + 0.04, 0.24], [r - 0.01, 0.25], [r - 0.03, 0.17]], 10, px, 0, pz);
    b.cyl(m.dark, r - 0.02, r - 0.02, 0.02, 10, px, 0.17, pz);
    b.cyl(m.resin, r - 0.02, r - 0.02, 0.02, 10, px, 0.19, pz);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + px * 3;
      b.torus(m.bone, r * 0.24, r * 0.12, 4, 8, px + Math.cos(a) * r * 0.45, 0.2, pz + Math.sin(a) * r * 0.45, Math.PI / 2, 0, a, 4.4);
    }
    b.ellipsoid(m.organ, r * 0.16, r * 0.1, r * 0.16, px, 0.2, pz, 5);
    root.add(marker(pz > 0 ? 'smoke' : 'smoke2', px, 0.3, pz));
  };
  pit(0.5, 0.64, 0.24);
  pit(0.8, -0.74, 0.17);
  // royal-jelly feeder: bone tripod over the mound with feeding ducts down into the pits
  const TX = MX, TZ = MZ + 0.05;
  for (let i = 0; i < 3; i++) {
    const a = i * (TAU / 3) + 0.5, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.bone, [[TX + c * 0.46, 0.88, TZ + s * 0.4, 0.05], [TX + c * 0.34, 1.12, TZ + s * 0.3, 0.04], [TX + c * 0.14, 1.26, TZ + s * 0.12, 0.03]], 5);
  }
  chain(b, m.flesh, [[TX + 0.1, 1.2, TZ + 0.12, 0.04], [0.32, 1.02, 0.3, 0.035], [0.46, 0.62, 0.52, 0.03], [0.5, 0.3, 0.62, 0.025]], 5, false);
  chain(b, m.flesh, [[TX + 0.14, 1.18, TZ - 0.06, 0.035], [0.62, 0.9, -0.42, 0.03], [0.8, 0.28, -0.72, 0.025]], 5, false);
  // reserve jelly sacs heaped at the back-left
  sacs(b, m.resin, -0.62, 0.18, -0.55, 5, 0.13, 0.22, 4);
  sacs(b, m.organ, -0.6, 0.16, -0.5, 3, 0.07, 0.18, 9);
  apron(b, m, GX, 1.28, 0.7, 0.5, 1);
  root.add(b.build());

  // pulsing royal-jelly sac in the feeder
  const js = new PartBuilder();
  js.ellipsoid(m.resin, 0.2, 0.18, 0.2, 0, 0.14, 0, 10);
  js.ellipsoid(m.organ, 0.11, 0.1, 0.11, 0, 0.14, 0, 8);
  js.dome(m.chitinDark, 0.13, 0.08, 0.13, 0, 0.29, 0, 8);
  js.taper(m.bone, [0, 0.33, 0], [0, 0.43, 0], 0.035, 0.004, 5);
  root.add(pivot('pulseJelly', js, TX, 1.18, TZ));

  // burrow shutter: banded chitin plate that lifts when troops emerge
  const d = new PartBuilder();
  d.dome(m.chitinDark, 0.3, 0.44, 0.07, 0, 0, 0, 10);
  d.box(m.team, 0.5, 0.06, 0.03, 0, 0.12, 0.06);
  d.box(m.team, 0.38, 0.06, 0.03, 0, 0.27, 0.05);
  spikes(d, m.bone, [-0.2, 0.33, 0.03], [0.2, 0.33, 0.03], 3, 0.12, 0.025, [0, 1, 0.4]);
  const door = pivot('door', d, GX, 0.1, 0.86);
  door.userData.lift = 0.5;
  root.add(door);
  return root;
}

/** Heavy Carapace Foundry (War Factory) — 3×3, h 2.8, exit front. Smouldering geothermal kiln mound. */
export function buildCarapaceFoundry(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  plinth(b, m.chitinDark, 3.0, 3.0, 0.05);
  plinth(b, m.mud, 2.86, 2.86, 0.05, 0.05, 0.96);
  // the kiln mound with iron hoops and glowing heat fissures
  const KZ = -0.3, RX = 1.3, RY = 1.75, RZ = 1.12;
  b.dome(m.mud, RX, RY, RZ, 0, 0.1, KZ, 16);
  domeBelt(b, m.team, RX, RY, RZ, 0, 0.1, KZ, 0.06, 0.22);
  domeBelt(b, m.chitinDark, RX, RY, RZ, 0, 0.1, KZ, 0.62, 0.74);
  domeBelt(b, m.chitinDark, RX, RY, RZ, 0, 0.1, KZ, 1.18, 1.28);
  const surf = (th, ph, k = 1.015) => [RX * Math.sin(ph) * Math.cos(th) * k, 0.1 + RY * Math.cos(ph) * k, KZ + RZ * Math.sin(ph) * Math.sin(th) * k];
  for (const [th, seed] of [[0.15, 1], [-0.75, 2], [2.55, 3], [-2.3, 4], [0.85, 5]]) {
    const rng = mulberry32(seed + 40);
    const pts = [];
    for (let k = 0; k < 6; k++) pts.push([...surf(th + (rng() - 0.5) * 0.22, 0.3 + k * 0.2), 0.034]);
    chain(b, m.fire, pts, 4, false);
  }
  // crater neck on top, belching heat
  lathe(b, m.mud, [[0.46, 0], [0.38, 0.3], [0.31, 0.42], [0.25, 0.38], [0.23, 0.2]], 10, 0, 1.68, KZ);
  b.cyl(m.fire, 0.24, 0.24, 0.03, 10, 0, 1.98, KZ);
  spikeRing(b, m.bone, 0, 2.05, KZ, 0.34, 7, 0.32, 0.045, 0.6, 0.2);
  // vent stacks at the back corners
  const stack = (x, z, h, name) => {
    drum(b, m.mud, 0.28, 0.28, h, x, 0.1, z, 7, 0.7);
    for (const t of [0.3, 0.75]) belt(b, m.chitinDark, 0.28 * (1 - 0.3 * t) * 1.06, 0.28 * (1 - 0.3 * t) * 1.06, 0.08, x, 0.1 + h * t, z, 0.98, 7);
    belt(b, m.team, 0.28 * (1 - 0.3 * 0.52) * 1.06, 0.28 * (1 - 0.3 * 0.52) * 1.06, 0.12, x, 0.1 + h * 0.52, z, 0.98, 7);
    const yt = 0.1 + h, rt = 0.28 * 0.7;
    b.torus(m.chitinDark, rt, 0.05, 4, 8, x, yt, z, Math.PI / 2, 0, 0);
    b.cyl(m.fire, rt * 0.9, rt * 0.9, 0.03, 7, x, yt - 0.01, z);
    spikeRing(b, m.bone, x, yt - 0.02, z, rt, 5, 0.2, 0.03, 0.8, 0.5);
    root.add(marker(name, x, yt + 0.12, z));
  };
  stack(-1.0, -1.05, 2.45, 'smoke');
  stack(1.0, -1.05, 2.2, 'smoke2');
  // front gatehouse: battered piers, iron-chitin lintel, glowing kiln throat
  for (const s of [-1, 1]) {
    block(b, m.mud, 0.5, 1.45, 0.82, s * 0.82, 0.1, 0.98, 0.82);
    b.box(m.fire, 0.04, 0.82, 0.04, s * 0.56, 0.52, 1.12);
    spikeRing(b, m.bone, s * 0.82, 1.55, 0.98, 0.1, 3, 0.22, 0.035, 0.5, s > 0 ? 0 : 1);
  }
  b.box(m.dark, 1.16, 0.95, 0.5, 0, 0.575, 0.85);
  b.box(m.fire, 1.1, 0.05, 0.06, 0, 0.13, 1.12);
  block(b, m.chitinDark, 1.75, 0.68, 0.78, 0, 1.02, 0.98, 0.88);
  block(b, m.team, 0.9, 0.2, 0.1, 0, 1.2, 1.36, 0.85, 0, -0.06);
  for (const s of [-1, 1]) horn(b, m.bone, [s * 0.55, 1.6, 1.1], [s * 0.5, 1, 0.4], 0.62, 0.09, -0.3);
  apron(b, m, 0, 2.0, 1.15, 0.95, 1);
  root.add(b.build());

  // heavy shutter: iron-ribbed chitin slab that slides up into the lintel
  const d = new PartBuilder();
  d.box(m.chitinDark, 1.12, 0.93, 0.07, 0, 0.465, 0);
  for (const yy of [0.18, 0.5, 0.82]) d.box(m.metal, 1.14, 0.05, 0.09, 0, yy, 0);
  for (const s of [-1, 1]) d.box(m.team, 0.42, 0.08, 0.02, s * 0.17, 0.66, 0.046, 0, 0, s * 0.5);
  spikes(d, m.bone, [-0.45, 0.02, 0.03], [0.45, 0.02, 0.03], 6, 0.08, 0.025, [0, -1, 0.3]);
  const door = pivot('door', d, 0, 0.1, 1.2);
  door.userData.lift = 0.62;
  root.add(door);
  return root;
}

/** Pheromone Antenna Lattice (Radar) — 2×2, h 3.6. Chitin lattice spire with a rotating cluster of plumed moth antennae. */
export function buildAntennaLattice(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  plinth(b, m.chitinDark, 1.96, 1.96, 0.07);
  plinth(b, m.mud, 1.84, 1.84, 0.12, 0.07, 0.9);
  block(b, m.mud, 1.05, 0.5, 1.05, 0, 0.19, 0, 0.72);
  block(b, m.team, 0.995, 0.1, 0.995, 0, 0.3, 0, 0.94);
  block(b, m.chitinDark, 0.82, 0.06, 0.82, 0, 0.68, 0, 0.95);
  // four battered chitin legs with lattice bracing
  const LEG = (y) => 0.7 - (0.7 - 0.17) * (y - 0.19) / 2.21;
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (const [kx, kz] of corners) {
    b.taper(m.chitinDark, [kx * 0.7, 0.19, kz * 0.7], [kx * 0.17, 2.4, kz * 0.17], 0.09, 0.05, 6);
    b.ellipsoid(m.bone, 0.09, 0.11, 0.09, kx * LEG(1.0), 1.0, kz * LEG(1.0), 6);
    b.ellipsoid(m.organ, 0.06, 0.08, 0.06, kx * (LEG(1.0) + 0.06), 0.9, kz * (LEG(1.0) + 0.06), 5);
    spikes(b, m.bone, [kx * LEG(0.5), 0.5, kz * LEG(0.5)], [kx * LEG(2.0), 2.0, kz * LEG(2.0)], 4, 0.2, 0.03, [kx, 0.6, kz]);
    block(b, m.chitinDark, 0.3, 0.2, 0.3, kx * 0.7, 0.19, kz * 0.7, 0.6);
  }
  const levels = [0.62, 1.0, 1.55, 2.05];
  for (let li = 0; li < levels.length; li++) {
    const yy = levels[li], r = LEG(yy);
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      b.strut(m.bone, [ax * r, yy, az * r], [bx * r, yy, bz * r], 0.026, 4);
      if (li > 0) {
        const y0 = levels[li - 1], r0 = LEG(y0);
        b.strut(m.chitinDark, [ax * r0, y0, az * r0], [bx * r, yy, bz * r], 0.02, 4);
        b.strut(m.chitinDark, [bx * r0, y0, bz * r0], [ax * r, yy, az * r], 0.02, 4);
      }
    }
  }
  // segmented flagellum spine inside the lattice
  for (let i = 0; i < 8; i++) {
    const yy = 0.78 + i * 0.21, r = 0.17 - i * 0.008;
    b.ellipsoid(i === 2 || i === 5 ? m.team : i % 2 ? m.chitin : m.chitinDark, r, 0.12, r, 0, yy, 0, 8);
  }
  b.cyl(m.chitinDark, 0.3, 0.22, 0.1, 8, 0, 2.43, 0);
  b.torus(m.team, 0.3, 0.035, 4, 12, 0, 2.48, 0, Math.PI / 2, 0, 0);
  spikeRing(b, m.bone, 0, 2.44, 0, 0.3, 8, 0.2, 0.03, 1.4, 0.2);
  root.add(b.build());

  // rotating sensor head
  const h = new PartBuilder();
  h.ellipsoid(m.chitinDark, 0.2, 0.14, 0.2, 0, 0.06, 0, 8);
  h.torus(m.team, 0.19, 0.03, 4, 10, 0, 0.04, 0, Math.PI / 2, 0, 0);
  h.ellipsoid(m.organ, 0.09, 0.1, 0.09, 0, 0.2, 0, 6);
  // three lesser segmented feelers sweeping forward and back
  for (const [a, len, up] of [[Math.PI * 0.5, 0.5, 0.45], [Math.PI * 1.22, 0.58, 0.6], [Math.PI * 1.78, 0.58, 0.6]]) {
    const c = Math.cos(a), s = Math.sin(a), pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      pts.push([c * (0.12 + len * t), 0.1 + up * len * t + 0.1 * Math.sin(Math.PI * t), s * (0.12 + len * t), 0.032 * (1 - t * 0.6)]);
    }
    chain(h, m.chitin, pts, 5);
    h.ellipsoid(m.organ, 0.04, 0.04, 0.04, ...pts[5].slice(0, 3), 5);
  }
  const radar = pivot('radar', h, 0, 2.5, 0);
  // two great plumed (bipectinate) moth antennae that twitch
  for (const s of [-1, 1]) {
    const f = new PartBuilder();
    const pts = [];
    for (let k = 0; k <= 7; k++) {
      const t = k / 7;
      pts.push([s * 0.62 * t, 0.82 * t + 0.06 * Math.sin(Math.PI * t), 0.1 * Math.sin(Math.PI * t), 0.042 * (1 - t * 0.6)]);
    }
    chain(f, m.chitinDark, pts, 5);
    for (let k = 1; k < 7; k++) {
      const [px, py, pz] = pts[k], t = k / 7, len = 0.07 + 0.24 * Math.sin(Math.PI * t);
      for (const dz of [-1, 1]) f.taper(m.chitin, [px, py, pz], [px - s * 0.06, py + len * 0.4, pz + dz * len], 0.018, 0.004, 3);
      if (k % 2) f.ellipsoid(m.bone, 0.045, 0.045, 0.045, px, py, pz, 5);
    }
    f.ellipsoid(m.organ, 0.05, 0.05, 0.05, ...pts[7].slice(0, 3), 5);
    radar.add(pivot(s < 0 ? 'antL' : 'antR', f, s * 0.1, 0.12, 0));
  }
  root.add(radar);
  return root;
}

/** Mutagenic Gene Forge (Battle Lab) — 3×3, h 2.8. Bone nest around a DNA splicing helix, mutating pupae, chemical glands. */
export function buildGeneForge(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  plinth(b, m.chitinDark, 3.0, 3.0, 0.07);
  plinth(b, m.mud, 2.86, 2.86, 0.13, 0.07, 0.93);
  plinth(b, m.team, 2.84, 2.84, 0.05, 0.1, 0.98);
  // splicing pedestal and the twin-strand helix with glowing rungs
  block(b, m.mud, 1.0, 0.45, 1.0, 0, 0.2, 0, 0.7);
  block(b, m.chitinDark, 0.78, 0.07, 0.78, 0, 0.63, 0, 0.94);
  const N = 18;
  let prevA = null, prevB = null;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), yy = 0.74 + t * 1.72, a = t * TAU * 1.6;
    const pa = [Math.cos(a) * 0.28, yy, Math.sin(a) * 0.28], pb = [-pa[0], yy, -pa[2]];
    b.ellipsoid(m.bone, 0.068, 0.068, 0.068, ...pa, 6);
    b.ellipsoid(m.chitinLight, 0.068, 0.068, 0.068, ...pb, 6);
    if (prevA) {
      b.taper(m.bone, prevA, pa, 0.045, 0.045, 5);
      b.taper(m.chitinLight, prevB, pb, 0.045, 0.045, 5);
    }
    if (i % 2 === 0) b.strut(m.organ, pa, pb, 0.028, 4);
    prevA = pa; prevB = pb;
  }
  b.cyl(m.chitinDark, 0.2, 0.3, 0.12, 8, 0, 0.72, 0);
  b.ellipsoid(m.organ, 0.15, 0.13, 0.15, 0, 2.58, 0, 8);
  b.dome(m.chitinDark, 0.17, 0.08, 0.17, 0, 2.62, 0, 8);
  spikeRing(b, m.bone, 0, 2.62, 0, 0.12, 5, 0.22, 0.03, 0.5, 0.3);
  // rust chitin nest ribs arching from the sides toward the helix crown
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2), c = Math.cos(a), s = Math.sin(a);
    const P = (r, yy, rr) => [c * r, yy, s * r, rr];
    chain(b, m.chitin, [P(1.32, 0.2, 0.08), P(1.3, 0.95, 0.07), P(1.05, 1.7, 0.055), P(0.62, 2.2, 0.04), P(0.34, 2.4, 0.025)], 6);
    spikes(b, m.bone, P(1.32, 0.6, 0).slice(0, 3), P(1.12, 1.6, 0).slice(0, 3), 3, 0.2, 0.03, [c, 0.4, s]);
  }
  // chemical gland vats on the four sides, plumbed into the pedestal
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2), vx = Math.cos(a) * 0.84, vz = Math.sin(a) * 0.84;
    drum(b, m.mud, 0.24, 0.24, 0.36, vx, 0.2, vz, 7, 0.88);
    belt(b, m.chitinDark, 0.23, 0.23, 0.07, vx, 0.47, vz, 0.98, 7);
    b.cyl(m.acid, 0.19, 0.19, 0.02, 7, vx, 0.555, vz);
    b.ellipsoid(m.organ, 0.15, 0.16, 0.15, vx, 0.64, vz, 8);
    b.ellipsoid(m.flesh, 0.08, 0.07, 0.08, vx + 0.1, 0.72, vz - 0.05, 5);
    chain(b, m.flesh, [[vx * 0.85, 0.66, vz * 0.85, 0.04], [vx * 0.62, 0.78, vz * 0.62, 0.035], [vx * 0.4, 0.66, vz * 0.4, 0.03]], 5, false);
  }
  root.add(b.build());

  // mutating pupae in team-banded sockets (pulse)
  const pupa = (name, x, z, seed) => {
    const p = new PartBuilder();
    const rng = mulberry32(seed);
    p.dome(m.chitinDark, 0.26, 0.14, 0.26, 0, 0, 0, 8);
    p.torus(m.team, 0.25, 0.035, 4, 10, 0, 0.06, 0, Math.PI / 2, 0, 0);
    p.ellipsoid(m.acid, 0.12, 0.3, 0.12, 0, 0.46, 0, 8);
    p.ellipsoid(m.membrane, 0.2, 0.42, 0.2, 0, 0.46, 0, 10);
    for (let k = 0; k < 4; k++) {
      const yy = 0.22 + k * 0.15, r = 0.2 * Math.sqrt(Math.max(0.05, 1 - ((yy - 0.46) / 0.42) ** 2));
      p.torus(m.chitinDark, r, 0.022, 3, 10, 0, yy, 0, Math.PI / 2, 0, 0);
    }
    for (let k = 0; k < 2; k++) {
      const a = rng() * TAU, yy = 0.3 + rng() * 0.35;
      p.ellipsoid(m.flesh, 0.08, 0.07, 0.08, Math.cos(a) * 0.17, yy, Math.sin(a) * 0.17, 5);
    }
    p.taper(m.chitinDark, [0, 0.84, 0], [0, 1.0, 0], 0.05, 0.005, 5);
    root.add(pivot(name, p, x, 0.2, z));
  };
  pupa('pulseA', 0.72, 0.72, 1);
  pupa('pulseB', -0.72, 0.72, 2);
  pupa('pulseC', 0.72, -0.72, 3);
  pupa('pulseD', -0.72, -0.72, 4);
  return root;
}

/** Caustic Toxic Queen Cyst (Nuke) — 3×3, h 3.2. Huge emerald blister (core) restrained in a mastic launch crater. */
export function buildToxicCyst(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  plinth(b, m.chitinDark, 3.0, 3.0, 0.07);
  plinth(b, m.mud, 2.88, 2.88, 0.1, 0.07, 0.95);
  // launch crater with team band and buttresses
  lathe(b, m.mud, [[1.4, 0.12], [1.28, 0.5], [1.12, 0.82], [1.02, 0.86]], 16);
  lathe(b, m.chitinDark, [[1.02, 0.86], [0.96, 0.8], [0.9, 0.5], [0.88, 0.3]], 16);
  belt(b, m.team, 1.355, 1.355, 0.12, 0, 0.3, 0, 0.973, 16);
  b.cyl(m.acid, 0.89, 0.89, 0.04, 16, 0, 0.3, 0);
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + i * (Math.PI / 4), c = Math.cos(a), s = Math.sin(a);
    const yaw = Math.atan2(c, s);
    block(b, m.mud, 0.34, 0.72, 0.46, c * 1.22, 0.12, s * 1.22, 0.6, yaw, -0.25);
    block(b, i % 2 ? m.chitinDark : m.team, 0.36, 0.08, 0.3, c * 1.12, 0.78, s * 1.12, 0.8, yaw, -0.25);
  }
  // restraining claws arching over the blister
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2), c = Math.cos(a), s = Math.sin(a);
    const P = (r, yy, rr = 0) => [c * r, yy, s * r, rr];
    chain(b, m.chitinDark, [P(1.08, 0.8, 0.12), P(1.13, 1.5, 0.1), P(1.0, 2.25, 0.08), P(0.74, 2.78, 0.06), P(0.46, 2.98, 0.04)], 6);
    b.taper(m.bone, P(0.46, 2.98).slice(0, 3), P(0.36, 2.84).slice(0, 3), 0.04, 0.004, 5);
    spikes(b, m.bone, P(1.14, 1.4).slice(0, 3), P(0.92, 2.45).slice(0, 3), 3, 0.24, 0.035, [c, 0.6, s]);
    b.ellipsoid(m.team, 0.14, 0.1, 0.14, ...P(1.1, 1.12).slice(0, 3), 6);
  }
  // fume vents on the rim
  for (const [a, name] of [[-0.35, 'smoke'], [Math.PI / 2 + 0.75, 'smoke2']]) {
    const x = Math.cos(a) * 1.2, z = Math.sin(a) * 1.2;
    drum(b, m.chitinDark, 0.13, 0.13, 0.72, x, 0.5, z, 6, 0.8);
    b.torus(m.acid, 0.1, 0.03, 4, 8, x, 1.22, z, Math.PI / 2, 0, 0);
    root.add(marker(name, x, 1.32, z));
  }
  root.add(b.build());

  // the pulsing blister of irradiated emerald fluid
  const c = new PartBuilder();
  c.dome(m.chitinDark, 0.82, 0.3, 0.82, 0, 0.3, 0, 12, Math.PI);
  c.torus(m.team, 0.82, 0.05, 4, 16, 0, 0.3, 0, Math.PI / 2, 0, 0);
  spikeRing(c, m.bone, 0, 0.26, 0, 0.8, 8, 0.2, 0.035, 1.2, 0.2);
  c.ellipsoid(m.acid, 0.7, 1.15, 0.7, 0, 1.45, 0, 14);
  c.ellipsoid(m.membrane, 0.86, 1.32, 0.86, 0, 1.45, 0, 14);
  for (let i = 0; i < 6; i++) {
    const a = i * (TAU / 6) + 0.2, pts = [];
    for (let k = 0; k <= 5; k++) {
      const ph = 0.35 + k * 0.48, w = Math.sin(k * 1.7 + i) * 0.12;
      pts.push([Math.cos(a + w) * 0.87 * Math.sin(ph), 1.45 + 1.33 * Math.cos(ph), Math.sin(a + w) * 0.87 * Math.sin(ph), 0.03]);
    }
    chain(c, m.flesh, pts, 4, false);
  }
  c.ellipsoid(m.flesh, 0.16, 0.1, 0.16, 0, 2.74, 0, 8);
  root.add(pivot('core', c, 0, 0.3, 0));
  return root;
}

/** Hardened Carapace Resonator (Iron Curtain) — 3×3, h 3.4. Four spiked monoliths channelling a red field into a resonator core. */
export function buildCarapaceResonator(team) {
  const m = mats(team, F);
  const red = m.eye; // deep red emissive
  const root = new THREE.Group();
  const b = new PartBuilder();
  // stepped brutalist platform
  block(b, m.chitinDark, 2.96, 0.08, 2.96, 0, 0, 0, 0.98);
  block(b, m.mud, 2.8, 0.16, 2.8, 0, 0.08, 0, 0.95);
  block(b, m.team, 2.78, 0.06, 2.78, 0, 0.12, 0, 0.978);
  block(b, m.mud, 1.9, 0.14, 1.9, 0, 0.24, 0, 0.9);
  // central emitter pedestal
  drum(b, m.chitinDark, 0.5, 0.5, 0.42, 0, 0.38, 0, 8, 0.7);
  b.cyl(red, 0.32, 0.26, 0.05, 8, 0, 0.82, 0);
  spikeRing(b, m.bone, 0, 0.8, 0, 0.36, 8, 0.24, 0.035, 0.7, 0.2);
  // field rings binding the monoliths
  b.torus(red, 0.98, 0.022, 3, 32, 0, 1.3, 0, Math.PI / 2, 0, 0);
  b.torus(red, 0.9, 0.02, 3, 32, 0, 2.35, 0, Math.PI / 2, 0, 0);
  // squat field capacitors in the platform corners
  for (const [kx, kz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const x = kx * 1.06, z = kz * 1.06;
    block(b, m.chitinDark, 0.42, 0.42, 0.42, x, 0.24, z, 0.62, Math.PI / 4);
    b.cyl(red, 0.1, 0.13, 0.06, 6, x, 0.68, z);
    b.taper(m.bone, [x, 0.66, z], [x + kx * 0.12, 1.02, z + kz * 0.12], 0.05, 0.005, 5);
    spikes(b, m.bone, [x - kx * 0.2, 0.3, z + kz * 0.12], [x + kx * 0.12, 0.3, z - kz * 0.2], 3, 0.16, 0.03, [kx, 0.8, kz]);
  }
  root.add(b.build());

  // four spiked monoliths leaning in toward the core
  const LEAN = 0.1, H = 3.0, W = 0.62, D = 0.4, TOP = 0.35;
  const face = (h) => (D / 2) * (1 - (1 - TOP) * h / H);
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2);
    const ox = Math.cos(a) * 1.25, oz = Math.sin(a) * 1.25;
    const mb = new PartBuilder();
    block(mb, m.chitinDark, W, H, D, 0, 0, 0, TOP);
    block(mb, m.chitin, W + 0.1, 0.9, D + 0.08, 0, 0, 0, 0.8);
    for (const h0 of [1.25, 2.15]) {
      const w0 = W * (1 - (1 - TOP) * h0 / H) + 0.025, d0 = D * (1 - (1 - TOP) * h0 / H) + 0.025;
      block(mb, m.team, w0, 0.14, d0, 0, h0, 0, 1 - (1 - TOP) * 0.14 / H / (1 - (1 - TOP) * h0 / H));
    }
    const slope = Math.atan((face(0) - face(H)) / H);
    block(mb, red, 0.12, 2.3, 0.03, 0, 0.45, face(0.45) + 0.004, 0.5, 0, -slope);
    mb.ellipsoid(red, 0.08, 0.11, 0.06, 0, 2.55, face(2.55) + 0.02, 6);
    spikes(mb, m.bone, [0, 0.6, -face(0.6)], [0, 2.5, -face(2.5)], 5, 0.22, 0.04, [0, 0.5, -1]);
    for (const s of [-1, 1]) spikes(mb, m.bone, [s * W * 0.47, 1.0, 0], [s * W * 0.25, 2.6, 0], 4, 0.2, 0.035, [s, 0.45, 0]);
    mb.taper(m.bone, [0, H - 0.05, 0], [0, H + 0.22, -0.06], 0.07, 0.006, 6);
    const g = new THREE.Group();
    g.position.set(ox, 0.24, oz);
    g.rotation.set(LEAN, Math.atan2(-ox, -oz), 0, 'YXZ');
    g.add(mb.build());
    root.add(g);
    // field arcs from each monolith's red node into the resonator
    g.updateMatrix();
    const node = new THREE.Vector3(0, 2.55, face(2.55) + 0.05).applyMatrix4(g.matrix);
    const fb = new PartBuilder();
    bolt(fb, red, node.toArray(), [0, 1.8, 0], 5, 0.14, 0.018, 70 + i);
    root.add(fb.build());
  }

  // the resonator core: spiked chitin orb with red crystal heart and gyroscopic rings
  const c = new PartBuilder();
  c.dodeca(m.chitinDark, 0.34, 0, 0, 0);
  c.octa(red, 0.46, 0, 0, 0);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const d = new THREE.Vector3(sx, sy, sz).normalize();
    c.taper(m.bone, d.clone().multiplyScalar(0.28).toArray(), d.clone().multiplyScalar(0.58).toArray(), 0.05, 0.005, 5);
  }
  c.torus(m.chitin, 0.66, 0.035, 4, 20, 0, 0, 0, 0.5, 0, 0.3);
  c.torus(m.team, 0.74, 0.032, 4, 20, 0, 0, 0, -0.6, 0, -0.4);
  root.add(pivot('core', c, 0, 1.75, 0));
  return root;
}

export const MODELS = {
  hiveNexus: buildHiveNexus,
  electrocyteHive: buildElectrocyteHive,
  chitinMill: buildChitinMill,
  swarmHatchery: buildSwarmHatchery,
  carapaceFoundry: buildCarapaceFoundry,
  antennaLattice: buildAntennaLattice,
  geneForge: buildGeneForge,
  toxicCyst: buildToxicCyst,
  carapaceResonator: buildCarapaceResonator,
};
