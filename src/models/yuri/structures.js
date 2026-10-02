// YURI structures — Neuroptera, Cordyceps & Psionic Parasites.
// Violet chitin, pink brain-flesh, bone cages, fungal stalks & caps, translucent violet membranes
// and glowing psychic organs. Organic, asymmetric and unsettling.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { mulberry32 } from '../../core/util.js';
import { PartBuilder, pivot, chain, sacs, ribs, plates } from '../insectKit.js';

const F = 'yuri';
const TAU = Math.PI * 2;
const FLAT = Math.PI / 2; // rotX that lays a torus flat on the ground

// ------------------------------------------------------------------ local helpers

const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Point on a quadratic Bézier p0→p2 pulled toward p1. */
function bezPt(p0, p1, p2, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2],
  ];
}

/** Bézier as chain() points [x,y,z,r] with radius r0→r1. */
function bez(p0, p1, p2, n, r0, r1) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push([...bezPt(p0, p1, p2, i / n), r0 + (r1 - r0) * (i / n)]);
  return out;
}

/**
 * Psionic brain: two flesh hemispheres covered in meandering gyri ridges, glowing psy sulci in
 * the grooves and a luminous longitudinal fissure. Long axis along Z.
 */
function brain(b, m, cx, cy, cz, rx, ry, rz, o = {}) {
  const { ridges = 4, n = 7, seg = 12, rr = rx * 0.085, phase = 0 } = o;
  const a = rx * 0.55, hx = rx * 0.45;
  b.ellipsoid(m.psy, rx * 0.05, ry * 0.86, rz * 0.9, cx, cy + ry * 0.04, cz, 6);
  for (const s of [-1, 1]) {
    const hcx = cx + s * hx;
    b.ellipsoid(m.flesh, a, ry, rz, hcx, cy, cz, seg);
    const at = (be, al) => [
      hcx + a * s * Math.sin(be) * Math.cos(al),
      cy + ry * Math.cos(be) * Math.cos(al),
      cz + rz * Math.sin(al),
    ];
    const step = 1.5 / ridges;
    const beta = (k, u) => 0.14 + (k + 0.5) * step + 0.15 * Math.sin(u * 5.3 + k * 2.1 + s * 1.3 + phase);
    for (let k = 0; k < ridges; k++) {
      const pts = [], groove = [];
      for (let i = 0; i <= n; i++) {
        const u = -1 + (2 * i) / n, al = u * 1.05;
        pts.push([...at(beta(k, u), al), rr * (1 - 0.3 * Math.abs(u))]);
        if (k < ridges - 1) groove.push([...at((beta(k, u) + beta(k + 1, u)) / 2, al), rr * 0.4]);
      }
      chain(b, m.flesh, pts, 5, false);
      if (groove.length) chain(b, m.psy, groove, 3, false);
    }
  }
}

/** Cordyceps fruiting body: slender sinuous stalk ending in a swollen club with a glowing pore. */
function cordyceps(b, m, x, y0, z, h, lean, yaw, r = 0.03, o = {}) {
  const { stalk = m.bone, club = m.chitin, tip = m.organ } = o;
  const ox = Math.cos(yaw), oz = Math.sin(yaw);
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4, off = lean * h * t * t, wob = Math.sin(t * 4 + yaw * 3) * 0.03 * t;
    pts.push([x + ox * off - oz * wob, y0 + h * t, z + oz * off + ox * wob, r * (1 - 0.45 * t)]);
  }
  chain(b, stalk, pts, 5, false);
  const p = pts[3], e = pts[4];
  const d = new THREE.Vector3(e[0] - p[0], e[1] - p[1], e[2] - p[2]).normalize();
  const L = Math.max(0.08, h * 0.2);
  const end = [e[0] + d.x * L, e[1] + d.y * L, e[2] + d.z * L];
  b.taper(club, [e[0], e[1], e[2]], end, r * 1.25, r * 1.05, 6);
  b.ellipsoid(tip, r * 1.0, r * 1.35, r * 1.0, end[0], end[1], end[2], 5);
}

/** Small parasitic mushroom: pale stalk, gill disc and a domed cap. */
function mushroom(b, m, x, y0, z, h, capR, capMat, lean = 0, yaw = 0) {
  const tx = x + Math.cos(yaw) * lean, tz = z + Math.sin(yaw) * lean;
  b.taper(m.bone, [x, y0, z], [tx, y0 + h, tz], capR * 0.3, capR * 0.2, 6);
  b.cyl(m.chitinDark, capR * 0.9, capR * 0.25, capR * 0.18, 8, tx, y0 + h - capR * 0.06, tz);
  b.dome(capMat, capR, capR * 0.6, capR, tx, y0 + h, tz, 8);
  b.ellipsoid(m.mushroomSpot, capR * 0.18, capR * 0.1, capR * 0.18, tx + capR * 0.35, y0 + h + capR * 0.42, tz, 5);
}

/** Feathered (bipectinate) silken moth antenna from `base`, arching out along `yaw`, then up. */
function featherAntenna(b, m, base, yaw, H, W, o = {}) {
  const { r = 0.035, barbs = 9, barb = 0.17 } = o;
  const ox = Math.cos(yaw), oz = Math.sin(yaw), sx = -oz, sz = ox;
  const p0 = base;
  const p1 = [base[0] + ox * W * 0.12, base[1] + H * 0.8, base[2] + oz * W * 0.12];
  const p2 = [base[0] + ox * W, base[1] + H, base[2] + oz * W];
  chain(b, m.chitinDark, bez(p0, p1, p2, 6, r, r * 0.35), 5, false);
  const S = [], L = [], R = [];
  for (let k = 0; k < barbs; k++) {
    const t = 0.14 + (0.82 * k) / (barbs - 1);
    const p = bezPt(p0, p1, p2, t), q = bezPt(p0, p1, p2, Math.min(1, t + 0.02));
    const tg = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize();
    const len = barb * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, (t - 0.1) / 0.85)));
    S.push(p);
    for (const s of [-1, 1]) {
      const tip = [
        p[0] + (sx * s + tg.x * 0.45) * len,
        p[1] + tg.y * 0.45 * len + 0.02,
        p[2] + (sz * s + tg.z * 0.45) * len,
      ];
      b.taper(m.chitinLight, p, tip, 0.011, 0.003, 3);
      (s < 0 ? L : R).push(tip);
    }
  }
  // silken vanes stretched between the barbs
  for (const side of [L, R]) for (let k = 0; k < barbs - 1; k++) b.polygon(m.membrane, [S[k], side[k], side[k + 1], S[k + 1]]);
  b.ellipsoid(m.organ, r * 0.9, r * 0.9, r * 0.9, p2[0], p2[1], p2[2], 5);
}

/** Flesh tendril weeping down from (x,y,z), ending in a glowing droplet. */
function weep(b, m, x, y, z, L, rng) {
  const sw = (rng() - 0.5) * 0.12;
  chain(b, m.flesh, [
    [x, y, z, 0.034], [x + sw, y - L * 0.4, z + sw * 0.5, 0.026],
    [x + sw * 0.5, y - L * 0.75, z - sw * 0.4, 0.019], [x + sw * 1.2, y - L, z, 0.013],
  ], 5, false);
  b.ellipsoid(m.organ, 0.026, 0.042, 0.026, x + sw * 1.2, y - L - 0.03, z, 5);
}

/** Pointed bone arch spanning X at depth z, feet at ±halfW, apex at height h. */
function boneArch(b, mat, z, halfW, h, r0, r1) {
  for (const s of [-1, 1]) chain(b, mat, bez([s * halfW, r0, z], [s * halfW * 1.05, h * 0.8, z], [0, h, z], 6, r0, r1), 6, true);
}

// ------------------------------------------------------------------ structures

/** Neural Cortex Chamber (Construction Yard) — 3×3, h 3.0. Brain-mass floating in a ribbed bone cage. */
export function buildNeuralCortex(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const rng = mulberry32(11);
  // mycelial floor, chitin rim and house band
  b.dome(m.mud, 1.46, 0.16, 1.46, 0, 0, 0, 16);
  b.torus(m.chitinDark, 1.36, 0.07, 4, 24, 0, 0.05, 0, FLAT, 0, 0);
  b.torus(m.team, 1.17, 0.05, 4, 24, 0, 0.12, 0, FLAT, 0, 0);
  // fleshy pedestal that feeds the brain stem, ringed by psychic levitation halos
  b.dome(m.chitinDark, 0.46, 0.22, 0.46, 0, 0.1, 0, 10);
  b.taper(m.flesh, [0, 0.15, 0], [0, 0.56, 0], 0.3, 0.14, 8);
  b.torus(m.psy, 0.3, 0.025, 4, 14, 0, 0.66, 0, FLAT, 0, 0);
  b.torus(m.psy, 0.44, 0.022, 4, 18, 0, 0.82, 0, FLAT, 0, 0);
  for (let i = 0; i < 6; i++) { // veins creeping from the pedestal over the floor
    const a = (i / 6) * TAU + 0.3, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.flesh, [[c * 0.3, 0.22, s * 0.3, 0.05], [c * 0.6, 0.17, s * 0.6, 0.04], [c * 0.88, 0.14, s * 0.88 + 0.05, 0.03]], 5, false);
  }
  // ribbed bone cage: half-hoop ribs over the brain, bowed rib legs down to the floor
  const R = 1.2, CY = 1.26, top = CY + R;
  ribs(b, m.bone, 0, CY, 0, R, 5, 0.065, 'z', 2.2);
  for (let i = 0; i < 5; i++) {
    const z = -1.1 + i * 0.55;
    for (const s of [-1, 1]) {
      const foot = [s * 1.0, 0.1, z], knee = [s * 1.32, 0.68, z], hip = [s * R, CY, z];
      chain(b, m.bone, [[...foot, 0.085], [...knee, 0.075], [...hip, 0.065]], 6, false);
      b.ellipsoid(m.bone, 0.085, 0.085, 0.085, ...knee, 6);
      const p = lerp3(foot, knee, 0.75);
      b.torus(m.team, 0.095, 0.032, 4, 6, p[0], p[1], p[2], FLAT, 0, 0);
    }
  }
  // dorsal spine with vertebral spikes
  b.strut(m.bone, [0, top, -1.38], [0, top, 1.38], 0.055, 6);
  for (let i = 0; i < 7; i++) {
    const z = -1.32 + i * 0.44;
    b.ellipsoid(m.bone, 0.11, 0.085, 0.13, 0, top + 0.02, z, 6);
    b.taper(i % 2 ? m.chitinDark : m.team, [0, top + 0.06, z], [0, top + 0.4 - Math.abs(z) * 0.14, z - 0.14], 0.065, 0.008, 4);
  }
  // twin psychic feelers at the front of the spine
  for (const s of [-1, 1]) {
    chain(b, m.chitinDark, bez([s * 0.08, top + 0.02, 1.25], [s * 0.2, top + 0.45, 1.3], [s * 0.45, top + 0.5, 1.42], 4, 0.04, 0.012), 5, false);
    b.ellipsoid(m.psy, 0.035, 0.035, 0.035, s * 0.45, top + 0.5, 1.42, 5);
  }
  // weeping cordyceps tendrils hanging from the end ribs and the outer flanks
  for (const [th, z] of [[0.5, 1.1], [1.15, 1.1], [1.95, 1.1], [2.6, 1.1], [0.8, -1.1], [1.57, -1.1], [2.35, -1.1]]) {
    weep(b, m, Math.cos(th) * R, CY + Math.sin(th) * R, z + Math.sign(z) * 0.06, 0.45 + rng() * 0.5, rng);
  }
  for (const [th, z] of [[0.28, 0.55], [2.86, -0.55]]) {
    weep(b, m, Math.cos(th) * R, CY + Math.sin(th) * R, z, 0.4 + rng() * 0.25, rng);
  }
  // cordyceps fruiting clusters at the corners
  for (const [x, z] of [[1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2]]) {
    for (let k = 0; k < 2; k++) {
      const a = rng() * TAU;
      cordyceps(b, m, x + Math.cos(a) * 0.1, 0.02, z + Math.sin(a) * 0.1, 0.4 + rng() * 0.4, 0.25, Math.atan2(z, x) + (rng() - 0.5), 0.028);
    }
  }
  // larval sacs clustered at the rib feet
  sacs(b, m.membrane, 0.72, 0.14, 0.92, 3, 0.1, 0.18, 5);
  sacs(b, m.flesh, 0.72, 0.14, 0.92, 3, 0.05, 0.18, 5);
  sacs(b, m.membrane, -0.78, 0.14, -0.9, 3, 0.1, 0.18, 9);
  sacs(b, m.flesh, -0.78, 0.14, -0.9, 3, 0.05, 0.18, 9);
  root.add(b.build());

  // the brain — floats in the cage, slowly turning and swelling
  const c = new PartBuilder();
  brain(c, m, 0, 0, 0, 0.82, 0.54, 0.78, { ridges: 4, n: 7, seg: 12 });
  c.ellipsoid(m.flesh, 0.27, 0.19, 0.21, -0.19, -0.3, -0.48, 8); // cerebellum
  c.ellipsoid(m.flesh, 0.27, 0.19, 0.21, 0.19, -0.3, -0.48, 8);
  c.taper(m.flesh, [0, -0.25, -0.15], [0, -0.9, -0.02], 0.2, 0.1, 7); // brain stem
  c.ellipsoid(m.organ, 0.07, 0.07, 0.07, 0, -0.9, -0.02, 6);
  root.add(pivot('core', c, 0, 1.62, 0));
  return root;
}

/** Metabolic Larval Vat (Bio Reactor) — 2×2, h 1.8. Five translucent amber-fluid incubation pods. */
export function buildLarvalVat(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.dome(m.mud, 0.98, 0.12, 0.98, 0, 0, 0, 14);
  b.torus(m.chitinDark, 0.9, 0.05, 4, 20, 0, 0.04, 0, FLAT, 0, 0);
  // central metabolic column
  const colR = (y) => 0.3 - (0.14 * (y - 0.05)) / 1.2;
  b.taper(m.chitin, [0, 0.05, 0], [0, 1.25, 0], 0.3, 0.16, 8);
  for (let i = 0; i < 4; i++) {
    const y = 0.3 + i * 0.25;
    b.torus(i === 1 ? m.team : m.chitinLight, colR(y) + 0.01, 0.03, 4, 12, 0, y, 0, FLAT, 0, 0);
  }
  // bone claws caging the heart organ
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + TAU / 10, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.bone, [[c * 0.15, 1.2, s * 0.15, 0.04], [c * 0.3, 1.45, s * 0.3, 0.03], [c * 0.2, 1.74, s * 0.2, 0.012]], 5, true);
  }
  // five incubation pods with amber digestive fluid
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i / 5) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    const px = c * 0.62, pz = s * 0.62;
    chain(b, m.flesh, [[c * 0.22, 0.3, s * 0.22, 0.05], [c * 0.38, 0.2, s * 0.38, 0.045], [c * 0.48, 0.16, s * 0.48, 0.04]], 5, false);
    const p = new PartBuilder();
    p.cyl(m.chitinDark, 0.21, 0.27, 0.16, 8, 0, 0.08, 0);
    p.torus(m.team, 0.235, 0.03, 4, 12, 0, 0.15, 0, FLAT, 0, 0);
    p.ellipsoid(m.fire, 0.19, 0.3, 0.19, 0, 0.47, 0, 8);                 // glowing amber fluid
    chain(p, m.flesh, [[0.08, 0.74, 0, 0.05], [0.05, 0.78, 0.08, 0.055], [-0.04, 0.79, 0.08, 0.05], [-0.09, 0.76, 0, 0.04]], 6, true); // floating larva
    p.ellipsoid(m.chitinDark, 0.04, 0.035, 0.04, -0.1, 0.77, -0.04, 5);
    p.ellipsoid(m.membrane, 0.25, 0.5, 0.25, 0, 0.62, 0, 10);            // translucent pod skin
    p.torus(m.bone, 0.25, 0.022, 4, 12, 0, 0.62, 0, FLAT, 0, 0);
    p.dome(m.chitinDark, 0.13, 0.08, 0.13, 0, 1.08, 0, 8);
    chain(p, m.flesh, [[0, 1.12, 0, 0.035], [-c * 0.25, 1.22, -s * 0.25, 0.03], [-c * 0.46, 1.16, -s * 0.46, 0.03]], 5, false);
    root.add(pivot(`pulsePod${i}`, p, px, 0.04, pz));
  }
  root.add(b.build());
  // the metabolic heart
  const h = new PartBuilder();
  h.ellipsoid(m.organ, 0.17, 0.2, 0.17, 0, 0, 0, 10);
  h.ellipsoid(m.membrane, 0.23, 0.26, 0.23, 0, 0.02, 0, 10);
  h.taper(m.chitinLight, [0, 0.18, 0], [0, 0.38, 0], 0.05, 0.008, 6);
  root.add(pivot('glowHeart', h, 0, 1.42, 0));
  return root;
}

/** Cordyceps Incubator (Barracks) — 2×2, h 2.0. Fungal mound sprouting cordyceps; brood door at the front. */
export function buildCordycepsIncubator(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const rng = mulberry32(23);
  const DX = -0.28; // door leans toward the front-left exit tile
  b.dome(m.mud, 0.98, 0.12, 0.98, 0, 0, 0, 14);
  b.torus(m.team, 0.9, 0.035, 4, 20, 0, 0.05, 0, FLAT, 0, 0);
  // lumpy fungal mound
  const MC = [0.06, 0.04, -0.12], MR = [0.86, 0.95, 0.8];
  b.dome(m.chitin, MR[0], MR[1], MR[2], MC[0], MC[1], MC[2], 14);
  b.dome(m.chitinDark, 0.5, 0.6, 0.45, 0.45, 0.04, -0.42, 10);
  b.dome(m.chitinDark, 0.42, 0.5, 0.4, -0.5, 0.04, -0.45, 10);
  b.dome(m.mud, 0.38, 0.42, 0.36, 0.55, 0.04, 0.32, 8);
  const onMound = (th, ph, k = 1) => [
    MC[0] + MR[0] * Math.sin(th) * Math.cos(ph) * k, MC[1] + MR[1] * Math.cos(th) * k, MC[2] + MR[2] * Math.sin(th) * Math.sin(ph) * k,
  ];
  // flesh blisters and glowing spore pores on the mound
  for (const [th, ph] of [[0.7, -0.4], [0.9, 2.6], [0.5, 3.9], [1.1, -1.6], [0.35, 5.2]]) {
    const p = onMound(th, ph);
    b.ellipsoid(m.flesh, 0.12, 0.08, 0.12, p[0], p[1], p[2], 6);
    b.ellipsoid(m.organ, 0.04, 0.04, 0.04, p[0], p[1] + 0.07, p[2], 5);
  }
  // brood porch: chitin hood, dark tunnel mouth, bone frame and fleshy lip
  b.dome(m.chitin, 0.62, 0.32, 0.5, DX, 0.48, 0.42, 10, FLAT, 0, 0);
  b.ellipsoid(m.dark, 0.25, 0.3, 0.08, DX, 0.31, 0.72, 8);
  b.torus(m.flesh, 0.37, 0.06, 5, 12, DX, 0.3, 0.74, 0, 0, 0, Math.PI);
  b.torus(m.bone, 0.3, 0.045, 4, 10, DX, 0.3, 0.8, 0, 0, 0, Math.PI);
  for (const s of [-1, 1]) {
    b.strut(m.bone, [DX + s * 0.3, 0.02, 0.8], [DX + s * 0.3, 0.3, 0.8], 0.045, 5);
    b.ellipsoid(m.flesh, 0.07, 0.24, 0.07, DX + s * 0.37, 0.2, 0.74, 6);
  }
  b.ellipsoid(m.team, 0.34, 0.06, 0.07, DX, 0.7, 0.71, 8);              // house lintel
  b.ellipsoid(m.eye, 0.035, 0.035, 0.03, DX - 0.14, 0.7, 0.78, 5);
  b.ellipsoid(m.eye, 0.035, 0.035, 0.03, DX + 0.14, 0.7, 0.78, 5);
  // trodden exit trail
  b.box(m.mud, 0.55, 0.03, 0.5, DX - 0.1, 0.015, 1.12);
  // bracket fungi stacked on the flanks
  for (const [th, ph, r, mat] of [[1.0, -0.6, 0.17, m.chitinLight], [1.2, -0.45, 0.13, m.chitinLight], [0.95, 3.4, 0.16, m.flesh], [1.15, 3.6, 0.12, m.flesh], [1.05, 2.4, 0.14, m.chitinLight], [1.1, -1.9, 0.15, m.flesh]]) {
    const p = onMound(th, ph, 1.0);
    b.ellipsoid(mat, r, r * 0.22, r * 0.8, p[0] + Math.cos(ph) * r * 0.45, p[1], p[2] + Math.sin(ph) * r * 0.45, 8, 0, -ph, 0);
  }
  // cordyceps stalks erupting from the mound
  for (const [th, ph, h, lean] of [[0.1, 0.0, 0.95, 0.15], [0.5, 1.2, 0.8, 0.3], [0.55, 2.6, 0.75, 0.3], [0.6, -1.0, 0.8, 0.35], [0.7, 3.9, 0.62, 0.4], [0.45, -2.2, 0.88, 0.3], [0.8, 5.0, 0.52, 0.4], [0.3, 3.2, 0.7, 0.25], [0.85, -0.2, 0.45, 0.45]]) {
    const p = onMound(th, ph, 0.97);
    cordyceps(b, m, p[0], p[1], p[2], h, lean, ph + (rng() - 0.5) * 0.4, 0.045, { club: m.flesh });
  }
  // parasitic caps on the flanks (one wears the house colour)
  mushroom(b, m, 0.62, 0.3, -0.55, 0.34, 0.22, m.chitin, 0.06, -0.6);
  mushroom(b, m, -0.66, 0.24, -0.25, 0.3, 0.19, m.team, 0.05, 3.0);
  mushroom(b, m, 0.74, 0.12, 0.55, 0.24, 0.15, m.chitinLight, 0.05, 0.5);
  root.add(b.build());

  // larval sacs (pulsing)
  const sb = new PartBuilder();
  sacs(sb, m.membrane, 0, 0.03, 0, 5, 0.13, 0.2, 4);
  sacs(sb, m.flesh, 0, 0.03, 0, 5, 0.06, 0.2, 4);
  root.add(pivot('pulseSacs', sb, 0.42, 0.1, 0.62));

  // brood door: rounded chitin-scale shutter that lifts when infantry hatch
  const d = new PartBuilder();
  d.box(m.chitinDark, 0.5, 0.28, 0.04, 0, 0.16, 0);
  d.cyl(m.chitinDark, 0.25, 0.25, 0.04, 10, 0, 0.3, 0, FLAT, 0, 0);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - (r === 2 ? 1 : 0); k++) {
    const x = (k - (r === 2 ? 0.5 : 1)) * 0.15;
    d.ellipsoid(m.chitin, 0.085, 0.1, 0.03, x, 0.1 + r * 0.16, 0.03, 6);
  }
  d.box(m.team, 0.5, 0.04, 0.05, 0, 0.04, 0.01);
  const door = pivot('door', d, DX, 0.02, 0.82);
  door.userData.lift = 0.55;
  root.add(door);
  return root;
}

/** Chrysalis Bio-Foundry (War Factory) — 3×3, h 3.0. Chrysalis hanging from bone arches over a birthing pool. */
export function buildChrysalisFoundry(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  // floor and birthing pool under the chrysalis
  b.cyl(m.mud, 1.45, 1.48, 0.08, 12, 0, 0.04, 0);
  b.ellipsoid(m.organ, 0.6, 0.035, 0.52, 0, 0.09, -0.2, 12);
  b.torus(m.flesh, 0.62, 0.06, 4, 18, 0, 0.09, -0.2, FLAT, 0, 0);
  // carapace walls on the flanks and back
  for (const s of [-1, 1]) plates(b, m.chitin, s * 1.22, 0.05, -1.22, 0.7, 4, 0.24, 0.7, 0.34, 8);
  for (const x of [-0.8, -0.27, 0.27, 0.8]) b.dome(m.chitin, 0.32, 0.65, 0.24, x, 0.05, -1.24, 8);
  for (const s of [-1, 1]) b.dome(m.chitin, 0.3, 0.8, 0.26, s * 0.98, 0.05, 1.16, 8);
  // bone arches and the dorsal keel the chrysalis hangs from
  const AH = 2.8;
  for (const z of [-1.05, 0.7]) {
    boneArch(b, m.bone, z, 1.28, AH, 0.1, 0.06);
    for (const s of [-1, 1]) {
      const p = bezPt([s * 1.28, 0.05, z], [s * 1.344, AH * 0.8, z], [0, AH, z], 0.25);
      b.torus(m.team, 0.12, 0.035, 4, 8, p[0], p[1], p[2], FLAT, 0, 0);
    }
  }
  b.strut(m.bone, [0, AH, -1.3], [0, AH, 0.95], 0.06, 6);
  for (let i = 0; i < 5; i++) {
    const z = -1.2 + i * 0.5;
    b.taper(i % 2 ? m.team : m.chitinDark, [0, AH + 0.04, z], [0, AH + 0.25, z - 0.12], 0.05, 0.006, 4);
  }
  // silk threads anchoring the chrysalis
  for (const s of [-1, 1]) {
    b.strut(m.bone, [s * 0.5, 1.95, -0.2], [s * 1.18, 1.75, -1.05], 0.012, 3);
    b.strut(m.bone, [s * 0.5, 1.95, -0.2], [s * 1.14, 1.6, 0.7], 0.012, 3);
  }
  // dripping fluids
  for (const [x, y, z, r] of [[0.02, 0.5, -0.18, 0.04], [-0.04, 0.3, -0.22, 0.035], [0.3, 1.9, -1.05, 0.03], [-0.25, 2.2, 0.7, 0.03]]) {
    b.ellipsoid(m.resin, r, r * 1.5, r, x, y, z, 5);
  }
  for (const z of [-0.6, 0.2]) b.taper(m.resin, [0, AH - 0.05, z], [0, AH - 0.32, z], 0.03, 0.008, 4);
  // front gate: bone tusk posts and a chitin lintel banded in house colour
  for (const s of [-1, 1]) chain(b, m.bone, [[s * 0.64, 0.05, 1.3, 0.09], [s * 0.66, 0.6, 1.32, 0.08], [s * 0.6, 1.05, 1.3, 0.07], [s * 0.36, 1.22, 1.3, 0.05]], 6, true);
  b.ellipsoid(m.chitinDark, 0.74, 0.13, 0.16, 0, 1.18, 1.28, 10);
  b.ellipsoid(m.team, 0.62, 0.06, 0.17, 0, 1.12, 1.29, 8);
  // flat exit apron on the front tile
  b.box(m.chitinDark, 1.05, 0.04, 1.0, 0, 0.02, 1.98);
  for (const zz of [1.78, 2.18]) for (const s of [-1, 1]) b.box(m.team, 0.34, 0.01, 0.07, s * 0.15, 0.045, zz, 0, s * 0.6, 0);
  for (const s of [-1, 1]) b.strut(m.bone, [s * 0.53, 0.025, 1.5], [s * 0.53, 0.025, 2.46], 0.025, 5);
  root.add(b.build());

  // the hanging chrysalis (pivot at the attachment point so it swells downward)
  const c = new PartBuilder();
  c.taper(m.chitinDark, [0, 0.1, 0], [0, -0.22, 0], 0.05, 0.1, 6);
  c.ellipsoid(m.chitinLight, 0.52, 0.85, 0.48, 0, -1.0, 0, 12);
  for (const [y, mat] of [[-0.45, m.chitin], [-0.72, m.team], [-1.0, m.chitin], [-1.28, m.team], [-1.55, m.chitin]]) {
    const r = 0.52 * Math.sqrt(Math.max(0.02, 1 - ((y + 1.0) / 0.85) ** 2)) + 0.01;
    c.torus(mat, r, 0.03, 4, 14, 0, y, 0, FLAT, 0, 0);
  }
  for (const s of [-1, 1]) c.ellipsoid(m.chitin, 0.22, 0.5, 0.12, s * 0.22, -0.95, 0.36, 8, 0, 0, s * 0.15); // wing pads
  c.ellipsoid(m.psy, 0.045, 0.5, 0.05, 0, -0.95, 0.47, 6);                   // glowing ecdysial seam
  c.ellipsoid(m.membrane, 0.64, 0.98, 0.6, 0, -0.98, 0, 12);                  // silk veil
  c.taper(m.resin, [0, -1.8, 0], [0, -2.02, 0], 0.04, 0.01, 5);
  c.ellipsoid(m.resin, 0.035, 0.05, 0.035, 0, -2.08, 0, 5);
  root.add(pivot('pulseChrysalis', c, 0, AH - 0.08, -0.2));

  // gate shutter: overlapping chitin scales, lifts when a beast rolls out
  const d = new PartBuilder();
  d.box(m.chitinDark, 1.1, 0.95, 0.05, 0, 0.5, 0);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) d.ellipsoid(m.chitin, 0.15, 0.17, 0.035, (k - 1.5) * 0.27, 0.18 + r * 0.3, 0.03, 6);
  d.box(m.team, 1.1, 0.07, 0.06, 0, 0.92, 0.01);
  const door = pivot('door', d, 0, 0.02, 1.34);
  door.userData.lift = 0.85;
  root.add(door);
  return root;
}

/** Carnivorous Digestion Chasm (Grinder) — 3×3, h 1.4. Gaping maw with counter-rotating spiral tooth rings. */
export function buildDigestionChasm(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.dome(m.mud, 1.48, 0.14, 1.48, 0, 0, 0, 16);
  // throat floor with a bubbling acid pit
  b.cyl(m.dark, 0.95, 0.95, 0.04, 14, 0, 0.15, 0);
  b.ellipsoid(m.acid, 0.3, 0.03, 0.3, 0, 0.18, 0, 10);
  for (const [x, z, r] of [[0.1, 0.05, 0.05], [-0.12, -0.06, 0.04], [0.02, -0.15, 0.035]]) b.ellipsoid(m.acid, r, r, r, x, 0.2, z, 5);
  // fleshy lip, inner gums, chitin plates and the house band
  b.torus(m.flesh, 1.14, 0.25, 6, 22, 0, 0.3, 0, FLAT, 0, 0);
  b.torus(m.flesh, 0.82, 0.1, 5, 18, 0, 0.3, 0, FLAT, 0, 0);
  b.torus(m.flesh, 0.58, 0.08, 5, 16, 0, 0.22, 0, FLAT, 0, 0);
  b.torus(m.flesh, 0.36, 0.06, 5, 14, 0, 0.17, 0, FLAT, 0, 0);
  b.torus(m.team, 1.37, 0.05, 4, 24, 0, 0.24, 0, FLAT, 0, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    b.ellipsoid(i % 3 === 0 ? m.chitinLight : m.chitin, 0.24, 0.07, 0.17, Math.cos(a) * 1.2, 0.52, Math.sin(a) * 1.2, 6, 0, -a - Math.PI / 2, 0);
  }
  // great hooked fangs arching over the maw
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.bone, [[c * 1.18, 0.4, s * 1.18, 0.12], [c * 1.24, 0.85, s * 1.24, 0.095], [c * 1.06, 1.2, s * 1.06, 0.06], [c * 0.8, 1.36, s * 0.8, 0.022]], 6, true);
    const p = lerp3([c * 1.18, 0.4, s * 1.18], [c * 1.24, 0.85, s * 1.24], 0.5);
    b.torus(m.team, 0.12, 0.03, 4, 8, p[0], p[1], p[2], FLAT, 0, 0);
  }
  // acid pits at the corners
  for (const [x, z] of [[1.12, 1.12], [-1.12, 1.12], [1.12, -1.12], [-1.12, -1.12]]) {
    b.torus(m.chitinDark, 0.17, 0.06, 4, 12, x, 0.06, z, FLAT, 0, 0);
    b.ellipsoid(m.acid, 0.15, 0.04, 0.15, x, 0.05, z, 8);
    b.ellipsoid(m.acid, 0.04, 0.04, 0.04, x + 0.05, 0.1, z - 0.03, 5);
  }
  root.add(b.build());

  // concentric spiralling tooth rings, counter-rotating
  const rings = [
    { name: 'spinY', r: 0.84, y: 0.42, n: 18, len: 0.3, rad: 0.06, speed: 0.5, mat: m.chitinLight },
    { name: 'spinYMid', r: 0.6, y: 0.31, n: 14, len: 0.24, rad: 0.05, speed: -0.8, mat: m.bone },
    { name: 'spinYInner', r: 0.38, y: 0.23, n: 10, len: 0.18, rad: 0.04, speed: 1.2, mat: m.chitinLight },
  ];
  for (const R of rings) {
    const t = new PartBuilder();
    t.torus(m.chitinDark, R.r, R.rad * 0.9, 4, 18, 0, R.y, 0, FLAT, 0, 0);
    for (let i = 0; i < R.n; i++) {
      const a = (i / R.n) * TAU, c = Math.cos(a), s = Math.sin(a);
      const y = R.y - 0.05 + 0.1 * (i / R.n); // helical rise reads as a spiral when turning
      const base = [c * R.r, y, s * R.r];
      const tip = [c * (R.r - R.len) - s * R.len * 0.45, y + R.len * 0.35, s * (R.r - R.len) + c * R.len * 0.45];
      t.taper(R.mat, base, tip, R.rad, 0.004, 4);
    }
    const node = pivot(R.name, t);
    node.userData.speed = R.speed;
    root.add(node);
  }
  return root;
}

/**
 * Psionic Antenna Spire (Psychic Sensor / radar) — 2×2, h 3.6. Towering cluster of silken moth antennae
 * sprouting from a furry thorax mound, crowned by a turning moth head with two huge feathered antennae.
 */
export function buildPsionicSpire(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.dome(m.mud, 0.98, 0.14, 0.98, 0, 0, 0, 14);
  b.torus(m.team, 0.86, 0.04, 4, 20, 0, 0.06, 0, FLAT, 0, 0);
  // furry thorax mound and bone root claws
  b.dome(m.chitin, 0.56, 0.46, 0.56, 0, 0.08, 0, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + (i % 2) * 0.3, th = 0.6 + (i % 3) * 0.25;
    const x = Math.cos(a) * Math.sin(th) * 0.56, y = 0.08 + Math.cos(th) * 0.46, z = Math.sin(a) * Math.sin(th) * 0.56;
    b.taper(m.chitinLight, [x, y, z], [x * 1.25, y + 0.1, z * 1.25], 0.05, 0.006, 4);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.4, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.bone, [[c * 0.4, 0.3, s * 0.4, 0.07], [c * 0.65, 0.24, s * 0.65, 0.055], [c * 0.85, 0.07, s * 0.85, 0.035]], 6, true);
  }
  // segmented stalk (stacked abdominal rings)
  for (let k = 0; k < 6; k++) {
    const y = 0.55 + k * 0.28, r = 0.26 - k * 0.022;
    b.ellipsoid(k % 2 ? m.chitinDark : m.chitin, r, 0.17, r, 0, y, 0, 10);
    if (k === 1 || k === 4) b.torus(m.team, r + 0.005, 0.03, 4, 12, 0, y, 0, FLAT, 0, 0);
  }
  // the cluster: feathered antennae fanning out of the thorax
  for (let i = 0; i < 5; i++) {
    const yaw = (i / 5) * TAU + 0.95;
    const H = 1.45 + (i % 2) * 0.55 + (i === 2 ? 0.2 : 0);
    featherAntenna(b, m, [Math.cos(yaw) * 0.3, 0.42, Math.sin(yaw) * 0.3], yaw, H, 0.36, { r: 0.035, barbs: 10, barb: 0.22 });
  }
  root.add(b.build());

  // rotating moth head (radar): furry collar, compound eyes, minor antennae
  const rb = new PartBuilder();
  rb.ellipsoid(m.chitinLight, 0.2, 0.13, 0.2, 0, 0.05, 0, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    rb.taper(m.chitinLight, [Math.cos(a) * 0.17, 0.05, Math.sin(a) * 0.17], [Math.cos(a) * 0.28, 0.0, Math.sin(a) * 0.28], 0.045, 0.006, 4);
  }
  rb.torus(m.team, 0.19, 0.03, 4, 12, 0, 0.1, 0, FLAT, 0, 0);
  rb.ellipsoid(m.chitin, 0.17, 0.16, 0.19, 0, 0.24, 0.04, 10);
  for (const s of [-1, 1]) rb.ellipsoid(m.eye, 0.085, 0.1, 0.085, s * 0.13, 0.24, 0.12, 8);
  rb.torus(m.chitinDark, 0.05, 0.016, 3, 8, 0, 0.1, 0.22, 0, FLAT, 0); // coiled proboscis
  for (const s of [-1, 1]) featherAntenna(rb, m, [s * 0.05, 0.32, -0.08], -Math.PI / 2 + s * 0.6, 0.85, 0.36, { r: 0.03, barbs: 8, barb: 0.18 });
  const radar = pivot('radar', rb, 0, 2.12, 0);
  for (const [name, s] of [['antL', -1], ['antR', 1]]) {
    const ab = new PartBuilder();
    featherAntenna(ab, m, [0, 0, 0], s < 0 ? Math.PI - 0.3 : 0.3, 1.15, 0.75, { r: 0.045, barbs: 11, barb: 0.3 });
    radar.add(pivot(name, ab, s * 0.07, 0.34, 0.1));
  }
  const g = new PartBuilder();
  g.ellipsoid(m.psy, 0.06, 0.06, 0.06, 0, 0, 0, 8);
  g.ellipsoid(m.membrane, 0.1, 0.1, 0.1, 0, 0, 0, 8);
  radar.add(pivot('glowOrb', g, 0, 0.4, 0.0));
  root.add(radar);
  return root;
}

/** Dual Brood Pupa Chambers (Cloning Vats) — 2×2, h 2.4. Twin chrysalises linked by chemical veins. */
export function buildPupaChambers(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.dome(m.mud, 0.98, 0.12, 0.98, 0, 0, 0, 14);
  // flat exit apron (clones leave from the front-left tile)
  b.box(m.chitinDark, 1.7, 0.04, 0.85, -0.05, 0.02, 1.42);
  for (const zz of [1.25, 1.6]) for (const s of [-1, 1]) b.box(m.team, 0.3, 0.01, 0.07, -0.5 + s * 0.12, 0.045, zz, 0, s * 0.55, 0);
  b.strut(m.bone, [-0.88, 0.025, 1.83], [0.78, 0.025, 1.83], 0.025, 5);
  // rear pump gland feeding both chambers
  b.ellipsoid(m.flesh, 0.26, 0.3, 0.22, 0, 0.32, -0.62, 10);
  b.ellipsoid(m.organ, 0.1, 0.12, 0.06, 0, 0.36, -0.42, 6);
  sacs(b, m.membrane, 0, 0.12, -0.78, 4, 0.1, 0.2, 13);
  const Z = -0.12;
  for (const s of [-1, 1]) {
    const x = s * 0.47;
    b.cyl(m.chitinDark, 0.3, 0.36, 0.26, 10, x, 0.13, Z);
    b.torus(m.team, 0.31, 0.035, 4, 14, x, 0.24, Z, FLAT, 0, 0);
    for (let i = 0; i < 4; i++) { // bone talons cradling the chrysalis
      const a = (i / 4) * TAU + Math.PI / 4, c = Math.cos(a), sn = Math.sin(a);
      chain(b, m.bone, [[x + c * 0.28, 0.24, Z + sn * 0.28, 0.045], [x + c * 0.4, 0.62, Z + sn * 0.4, 0.04], [x + c * 0.3, 0.95, Z + sn * 0.3, 0.025]], 5, true);
    }
    chain(b, m.flesh, [[s * 0.12, 0.3, -0.5, 0.05], [s * 0.3, 0.26, -0.38, 0.045], [x, 0.24, Z - 0.22, 0.04]], 5, false);
  }
  // chemical veins arching between the twins
  for (const [y0, h, mat, r] of [[1.15, 0.35, m.organ, 0.045], [0.85, 0.18, m.flesh, 0.05], [1.45, 0.26, m.psy, 0.03]]) {
    chain(b, mat, bez([-0.22, y0, Z], [0, y0 + h, Z + 0.05], [0.22, y0, Z], 5, r, r), 5, false);
  }
  root.add(b.build());

  for (const [name, s] of [['pulseA', -1], ['pulseB', 1]]) {
    const p = new PartBuilder();
    p.ellipsoid(m.flesh, 0.2, 0.58, 0.19, 0, 0.82, 0, 10);                 // pupa
    for (let i = 0; i < 4; i++) {
      const y = 0.5 + i * 0.2;
      const r = 0.2 * Math.sqrt(Math.max(0.05, 1 - ((y - 0.82) / 0.58) ** 2)) + 0.006;
      p.torus(m.chitinLight, r, 0.018, 3, 12, 0, y, 0, FLAT, 0, 0);
    }
    p.ellipsoid(m.organ, 0.07, 0.1, 0.06, 0, 1.0, 0.14, 6);
    p.ellipsoid(m.chitin, 0.12, 0.13, 0.11, 0, 1.38, 0.05, 8);              // head capsule
    p.ellipsoid(m.eye, 0.03, 0.03, 0.03, -0.05, 1.4, 0.14, 5);
    p.ellipsoid(m.eye, 0.03, 0.03, 0.03, 0.05, 1.4, 0.14, 5);
    p.ellipsoid(m.membrane, 0.34, 0.86, 0.32, 0, 0.86, 0, 12);             // translucent chrysalis
    p.dome(m.chitinDark, 0.16, 0.1, 0.16, 0, 1.64, 0, 8);
    p.torus(m.team, 0.14, 0.025, 4, 10, 0, 1.67, 0, FLAT, 0, 0);
    p.taper(m.chitinDark, [0, 1.72, 0], [0, 2.08, 0], 0.05, 0.008, 5);     // cremaster
    root.add(pivot(name, p, s * 0.47, 0.25, Z));
  }
  return root;
}

/** Mutagenic Spore Diffuser (Genetic Mutator) — 3×3, h 3.6. Towering parasitic mushroom with swelling spore sacs. */
export function buildSporeDiffuser(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const rng = mulberry32(57);
  b.dome(m.mud, 1.48, 0.14, 1.48, 0, 0, 0, 16);
  b.torus(m.team, 1.36, 0.045, 4, 24, 0, 0.06, 0, FLAT, 0, 0);
  // mycelial roots
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.flesh, [[c * 0.5, 0.35, s * 0.5, 0.11], [c * 0.85, 0.2, s * 0.85, 0.08], [c * 1.15, 0.12, s * 1.15, 0.05], [c * 1.33, 0.08, s * 1.33, 0.03]], 6, true);
  }
  // bulbous volva and the bent stalk
  b.dome(m.flesh, 0.72, 0.55, 0.72, 0, 0.05, 0, 12);
  b.taper(m.bone, [0, 0.3, 0], [0.04, 1.4, 0.02], 0.5, 0.34, 10);
  b.taper(m.bone, [0.04, 1.4, 0.02], [0, 2.5, 0], 0.34, 0.3, 10);
  const stalkR = (y) => (y < 1.4 ? 0.5 - (0.16 * (y - 0.3)) / 1.1 : 0.34 - (0.04 * (y - 1.4)) / 1.1);
  for (let i = 0; i < 6; i++) { // glowing parasite veins spiralling up the stalk
    const a0 = (i / 6) * TAU;
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const y = 0.45 + k * 0.23, a = a0 + y * 0.7, r = stalkR(y) + 0.008;
      pts.push([Math.cos(a) * r + 0.03 * (y / 1.4), y, Math.sin(a) * r + 0.015 * (y / 1.4), 0.028]);
    }
    chain(b, m.organ, pts, 4, false);
  }
  // annulus skirt in house colour
  b.cyl(m.team, 0.36, 0.6, 0.24, 12, 0.03, 1.72, 0.01);
  b.torus(m.teamDark, 0.6, 0.03, 4, 16, 0.03, 1.6, 0.01, FLAT, 0, 0);
  // satellite mushrooms and cordyceps at the corners
  mushroom(b, m, 1.05, 0.03, 1.0, 0.45, 0.24, m.chitin, 0.08, 0.8);
  mushroom(b, m, -1.1, 0.03, 0.95, 0.35, 0.2, m.chitinLight, 0.06, 2.4);
  mushroom(b, m, -1.02, 0.03, -1.05, 0.55, 0.26, m.team, 0.08, -2.3);
  for (const [x, z] of [[1.1, -1.05], [0.15, 1.25], [-1.28, -0.1]]) {
    for (let k = 0; k < 3; k++) {
      const a = rng() * TAU;
      cordyceps(b, m, x + Math.cos(a) * 0.1, 0.03, z + Math.sin(a) * 0.1, 0.3 + rng() * 0.35, 0.25, Math.atan2(z, x) + (rng() - 0.5), 0.026);
    }
  }
  root.add(b.build());

  // the cap with its swelling spore sacs
  const c = new PartBuilder();
  c.cyl(m.chitinDark, 1.18, 0.3, 0.28, 14, 0, -0.08, 0);                  // gill underside
  c.torus(m.chitinLight, 0.6, 0.02, 3, 16, 0, -0.14, 0, FLAT, 0, 0);
  c.torus(m.chitinLight, 0.95, 0.02, 3, 20, 0, -0.04, 0, FLAT, 0, 0);
  c.dome(m.chitin, 1.25, 0.72, 1.25, 0, 0.05, 0, 16);
  c.torus(m.chitinDark, 1.2, 0.07, 4, 24, 0, 0.07, 0, FLAT, 0, 0);       // rolled rim
  const onCap = (th, ph, k = 1) => [1.25 * Math.sin(th) * Math.cos(ph) * k, 0.05 + 0.72 * Math.cos(th) * k, 1.25 * Math.sin(th) * Math.sin(ph) * k];
  for (let i = 0; i < 6; i++) { // house-coloured warts
    const p = onCap(1.12, (i / 6) * TAU + 0.5, 1.0);
    c.ellipsoid(m.team, 0.16, 0.07, 0.16, p[0], p[1], p[2], 6);
  }
  for (let i = 0; i < 9; i++) { // spore sacs
    const th = 0.45 + (i % 3) * 0.2, ph = (i / 9) * TAU + (i % 2) * 0.3;
    const p = onCap(th, ph, 1.0);
    const r = 0.12 + (i % 3) * 0.03;
    c.ellipsoid(m.organ, r * 0.8, r * 0.75, r * 0.8, p[0], p[1] + r * 0.2, p[2], 6);
    c.ellipsoid(m.membrane, r, r * 0.95, r, p[0], p[1] + r * 0.3, p[2], 6);
  }
  const bigSacs = [];
  for (let i = 0; i < 3; i++) { // the biggest sacs throb on their own
    const p = onCap(0.75, (i / 3) * TAU + 1.0, 1.0);
    const sb = new PartBuilder();
    sb.ellipsoid(m.psy, 0.13, 0.12, 0.13, 0, 0.06, 0, 8);
    sb.ellipsoid(m.membrane, 0.19, 0.17, 0.19, 0, 0.08, 0, 8);
    sb.ellipsoid(m.chitinDark, 0.04, 0.03, 0.04, 0, 0.25, 0, 5);
    bigSacs.push(pivot(`pulseSac${i}`, sb, p[0], p[1], p[2]));
  }
  // crowning spore bladder
  c.ellipsoid(m.organ, 0.22, 0.24, 0.22, 0, 0.88, 0, 10);
  c.ellipsoid(m.membrane, 0.3, 0.32, 0.3, 0, 0.9, 0, 10);
  c.torus(m.team, 0.28, 0.03, 4, 14, 0, 0.8, 0, FLAT, 0, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    c.ellipsoid(m.psy, 0.03, 0.03, 0.03, Math.cos(a) * 0.2, 1.08, Math.sin(a) * 0.2, 5);
  }
  const core = pivot('core', c, 0, 2.45, 0);
  for (const n of bigSacs) core.add(n);
  root.add(core);
  return root;
}

/** Mind-Shatter Cerebral Spire (Psychic Dominator) — 3×3, h 4.4. Metal pylon cage around a cerebral gland. */
export function buildCerebralSpire(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const O = Math.PI / 8; // octagonal alignment
  // stepped octagonal plinth
  b.cyl(m.chitinDark, 1.38, 1.46, 0.16, 8, 0, 0.08, 0, 0, O, 0);
  b.torus(m.team, 1.36, 0.04, 4, 8, 0, 0.17, 0, FLAT, 0, O);
  b.cyl(m.metal, 1.12, 1.25, 0.18, 8, 0, 0.25, 0, 0, O, 0);
  // central pillar with bio-circuit traces
  b.cyl(m.metal, 0.42, 0.55, 1.6, 8, 0, 1.15, 0, 0, O, 0);
  b.cyl(m.chitinDark, 0.52, 0.55, 0.12, 8, 0, 0.62, 0, 0, O, 0);
  b.cyl(m.team, 0.47, 0.49, 0.14, 8, 0, 1.4, 0, 0, O, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    b.strut(m.psy, [c * 0.53, 0.72, s * 0.53], [c * 0.47, 1.3, s * 0.47], 0.018, 3);
    b.strut(m.psy, [c * 0.46, 1.5, s * 0.46], [c * 0.43, 1.92, s * 0.43], 0.018, 3);
  }
  b.dome(m.chitinDark, 0.55, 0.22, 0.55, 0, 2.08, 0, 10, Math.PI, 0, 0);    // gland socket
  b.torus(m.psy, 0.52, 0.025, 4, 16, 0, 2.06, 0, FLAT, 0, 0);
  // four buttress pylons that bulge around the gland chamber and converge on the spike
  const prof = [[1.45, 0.3], [1.05, 1.4], [0.84, 2.0], [0.98, 2.75], [0.62, 3.45], [0.2, 4.0]];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.metal, prof.map(([r, y], k) => [c * r, y, s * r, 0.16 - k * 0.02]), 5, true);
    chain(b, m.psy, prof.map(([r, y], k) => [c * (r + 0.13 - k * 0.015), y, s * (r + 0.13 - k * 0.015), 0.022]), 3, false);
    // house plate low on each pylon
    const p = lerp3([c * 1.45, 0.3, s * 1.45], [c * 1.05, 1.4, s * 1.05], 0.45);
    b.box(m.team, 0.26, 0.42, 0.06, p[0] + c * 0.12, p[1], p[2] + s * 0.12, 0, -a + Math.PI / 2, 0);
    // flesh veins creeping up the inside of the pylon
    chain(b, m.flesh, [[c * 0.45, 2.0, s * 0.45, 0.05], [c * 0.72, 2.3, s * 0.72, 0.04], [c * 0.85, 2.75, s * 0.85, 0.035], [c * 0.7, 3.2, s * 0.7, 0.025]], 5, false);
  }
  // roof and the dominator spike
  b.cyl(m.chitinDark, 0.5, 0.78, 0.22, 8, 0, 3.55, 0, 0, O, 0);
  b.torus(m.team, 0.66, 0.04, 4, 8, 0, 3.5, 0, FLAT, 0, O);
  b.cone(m.metal, 0.45, 0.8, 8, 0, 4.0, 0, 0, O, 0);
  b.torus(m.psy, 0.55, 0.022, 4, 16, 0, 3.75, 0, FLAT, 0, 0);
  b.torus(m.psy, 0.3, 0.02, 4, 12, 0, 4.06, 0, FLAT, 0, 0);
  b.ellipsoid(m.membrane, 0.78, 0.8, 0.78, 0, 2.78, 0, 12); // vitreous capsule encasing the gland
  root.add(b.build());

  // the hyper-developed cerebral gland, wrapped in bio-circuits
  const c = new PartBuilder();
  brain(c, m, 0, 0, 0, 0.6, 0.6, 0.56, { ridges: 3, n: 6, seg: 12, phase: 1.3 });
  c.torus(m.psy, 0.64, 0.018, 3, 22, 0, 0, 0, FLAT + 0.45, 0, 0);
  c.torus(m.psy, 0.62, 0.018, 3, 22, 0, 0.05, 0, FLAT - 0.4, 0.9, 0);
  c.torus(m.metal, 0.5, 0.04, 4, 16, 0, -0.34, 0, FLAT, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    c.ellipsoid(m.psy, 0.035, 0.035, 0.035, Math.cos(a) * 0.5, -0.34, Math.sin(a) * 0.5, 5);
  }
  c.taper(m.flesh, [0, -0.4, 0], [0, -0.7, 0], 0.24, 0.14, 8);
  root.add(pivot('core', c, 0, 2.75, 0));
  return root;
}

export const MODELS = {
  neuralCortex: buildNeuralCortex,
  larvalVat: buildLarvalVat,
  cordycepsIncubator: buildCordycepsIncubator,
  chrysalisFoundry: buildChrysalisFoundry,
  digestionChasm: buildDigestionChasm,
  psionicSpire: buildPsionicSpire,
  pupaChambers: buildPupaChambers,
  sporeDiffuser: buildSporeDiffuser,
  cerebralSpire: buildCerebralSpire,
};
