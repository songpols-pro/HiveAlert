// YURI defenses — Neuroptera, Cordyceps & Psionic Parasites (violet chitin, brain-flesh, psychic organs).
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { PartBuilder, pivot, marker, chain, spikes, eyes, mandibles } from '../insectKit.js';

const F = 'yuri';
const TAU = Math.PI * 2;
const FLAT = Math.PI / 2; // rotX that lays a torus flat on the ground

/**
 * Psionic brain: two flesh hemispheres covered in meandering gyri ridges, glowing psy sulci in
 * the grooves and a luminous longitudinal fissure. Long axis along Z.
 */
function brain(b, m, cx, cy, cz, rx, ry, rz, o = {}) {
  const { ridges = 3, n = 6, seg = 10, rr = rx * 0.085, phase = 0 } = o;
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

/** Needle-Tail Gatling Larva (Gatling Cannon) — 1×1, h 1.4. Grub with a jointed scorpion tail carrying three spinning venom tubes. */
export function buildGatlingLarva(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  // burrow socket
  b.dome(m.mud, 0.48, 0.1, 0.48, 0, 0, 0, 12);
  b.cyl(m.chitinDark, 0.3, 0.38, 0.2, 10, 0, 0.1, 0);
  b.torus(m.team, 0.33, 0.035, 4, 14, 0, 0.2, 0, FLAT, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.26, c = Math.cos(a), s = Math.sin(a);
    b.taper(m.bone, [c * 0.34, 0.1, s * 0.34], [c * 0.47, 0.2, s * 0.47], 0.045, 0.006, 4);
  }
  root.add(b.build());

  // turret: the grub body, its head and the multi-jointed tail
  const t = new PartBuilder();
  const segs = [[0.17, 0.11, 0.18, 0.12], [0.03, 0.15, 0.2, 0.13], [-0.11, 0.17, 0.2, 0.13], [-0.24, 0.15, 0.17, 0.12]];
  segs.forEach(([z, ry, rx, rz], i) => {
    t.ellipsoid(i % 2 ? m.chitinDark : m.chitin, rx, ry, rz, 0, 0.1, z, 10);
    if (i === 1 || i === 3) t.torus(m.team, rx * 0.95, 0.025, 4, 12, 0, 0.1, z, 0, 0, 0);
  });
  t.ellipsoid(m.chitinLight, 0.12, 0.1, 0.1, 0, 0.1, 0.3, 8);           // head
  eyes(t, m.eye, 0, 0.14, 0.37, 0.035, 0.065);
  // jointed tail: segments alternate violet chitin and house-coloured joints
  const tail = [[0, 0.22, -0.28, 0.1], [0, 0.45, -0.36, 0.09], [0, 0.68, -0.3, 0.08], [0, 0.86, -0.15, 0.072], [0, 0.94, 0.02, 0.066]];
  for (let i = 0; i < tail.length; i++) {
    const [x, y, z, r] = tail[i];
    t.ellipsoid(i % 2 ? m.team : m.chitinDark, r * 1.05, r * 1.05, r * 1.05, x, y, z, 8);
    if (i > 0) {
      const p = tail[i - 1];
      t.taper(m.chitin, [p[0], p[1], p[2]], [x, y, z], p[3] * 0.95, r * 0.95, 7);
      const mid = [(p[0] + x) / 2, (p[1] + y) / 2, (p[2] + z) / 2];
      spikes(t, m.bone, mid, mid, 1, 0.12, 0.025, [0, (y - p[1]) * 0.3 + 0.5, -(z - p[2]) - 0.6]); // dorsal barb
    }
  }
  // gun mount and venom bladder
  t.ellipsoid(m.chitinDark, 0.1, 0.09, 0.13, 0, 0.93, 0.12, 8);
  t.ellipsoid(m.organ, 0.07, 0.06, 0.08, 0, 1.03, 0.04, 8);
  t.ellipsoid(m.membrane, 0.09, 0.08, 0.1, 0, 1.03, 0.04, 8);
  const turret = pivot('turret', t, 0, 0.2, 0);
  for (const md of mandibles(m.chitinDark, { x: 0.045, y: 0.07, z: 0.38, len: 0.1, r: 0.015, curve: 0.8, teethMat: m.bone })) turret.add(md);

  // three spinning venom tubes
  const g = new PartBuilder();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU, x = Math.cos(a) * 0.065, y = Math.sin(a) * 0.065;
    g.cyl(m.chitinLight, 0.026, 0.032, 0.44, 6, x, y, 0.22, FLAT, 0, 0);
    g.torus(m.organ, 0.03, 0.01, 3, 6, x, y, 0.44, 0, 0, 0);
  }
  g.cyl(m.chitinDark, 0.04, 0.04, 0.46, 6, 0, 0, 0.22, FLAT, 0, 0);
  g.torus(m.bone, 0.1, 0.022, 4, 10, 0, 0, 0.08, 0, 0, 0);
  g.torus(m.bone, 0.1, 0.02, 4, 10, 0, 0, 0.36, 0, 0, 0);
  const spin = pivot('spinZ', g, 0, 0.93, 0.2);
  spin.userData.speed = 5;
  turret.add(spin);
  turret.add(marker('muzzle', 0, 0.93, 0.68));
  root.add(turret);
  return root;
}

/** Hypnotic Pheromone Monolith (Psychic Tower) — 1×1, h 2.6. Fleshy spire crowned by a pulsing brain in luminous mist. */
export function buildPheromoneMonolith(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.dome(m.mud, 0.48, 0.1, 0.48, 0, 0, 0, 12);
  b.torus(m.team, 0.4, 0.035, 4, 14, 0, 0.05, 0, FLAT, 0, 0);
  for (let i = 0; i < 5; i++) { // bone roots
    const a = (i / 5) * TAU + 0.3, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.bone, [[c * 0.14, 0.35, s * 0.14, 0.05], [c * 0.3, 0.2, s * 0.3, 0.04], [c * 0.43, 0.05, s * 0.43, 0.025]], 5, false);
  }
  // stacked fleshy spire with chitin collars
  const segR = (i) => 0.24 - i * 0.022;
  for (let i = 0; i < 6; i++) {
    const y = 0.28 + i * 0.27, r = segR(i);
    b.ellipsoid(m.flesh, r, 0.17, r, 0, y, 0, 8);
    b.torus(i === 1 || i === 4 ? m.team : m.chitinDark, r * 0.86, 0.028, 4, 10, 0, y + 0.13, 0, FLAT, 0, 0);
  }
  // bone ribs clasping the spire
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.bone, [[c * 0.24, 0.25, s * 0.24, 0.035], [c * 0.25, 0.85, s * 0.25, 0.03], [c * 0.19, 1.45, s * 0.19, 0.025], [c * 0.12, 1.9, s * 0.12, 0.018]], 5, false);
  }
  // psychic vein spiralling up the flesh
  const helix = [];
  for (let k = 0; k <= 10; k++) {
    const y = 0.2 + k * 0.165, a = k * 0.9;
    const r = segR(Math.min(5, (y - 0.28) / 0.27)) + 0.01;
    helix.push([Math.cos(a) * r, y, Math.sin(a) * r, 0.02]);
  }
  chain(b, m.psy, helix, 3, false);
  // chitin calyx claws cradling the brain
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitinLight, [[c * 0.1, 1.85, s * 0.1, 0.05], [c * 0.26, 2.0, s * 0.26, 0.035], [c * 0.32, 2.18, s * 0.32, 0.012]], 5, false);
  }
  b.taper(m.flesh, [0, 1.8, 0], [0, 2.0, 0], 0.13, 0.15, 7);
  root.add(b.build());

  // the pulsing brain organ
  const br = new PartBuilder();
  brain(br, m, 0, 0, 0, 0.42, 0.3, 0.38, { ridges: 3, n: 6, seg: 10 });
  root.add(pivot('pulseBrain', br, 0, 2.17, 0));

  // luminous mist secreted around it
  const mi = new PartBuilder();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.4, y = (i % 2) * 0.16 - 0.04;
    mi.ellipsoid(m.membrane, 0.15, 0.1, 0.15, Math.cos(a) * 0.4, y, Math.sin(a) * 0.4, 6);
    mi.ico(m.psy, 0.022, 0, Math.cos(a + 0.5) * 0.5, y + 0.12, Math.sin(a + 0.5) * 0.5);
  }
  mi.torus(m.psy, 0.5, 0.012, 3, 20, 0, 0, 0, FLAT + 0.25, 0, 0);
  mi.ellipsoid(m.membrane, 0.12, 0.1, 0.12, 0.05, 0.36, -0.02, 6);
  root.add(pivot('glowMist', mi, 0, 2.17, 0));
  root.add(marker('muzzle', 0, 2.2, 0));
  return root;
}

export const MODELS = {
  gatlingLarva: buildGatlingLarva,
  pheromoneMonolith: buildPheromoneMonolith,
};
