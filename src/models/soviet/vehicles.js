// SOVIET vehicles — brutal rust-red/black chitin, bone horns, iron fittings, toxic-green organs.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { PartBuilder, pivot, marker, eyes, chain, spikes, hexLegs, mandibles, antennae, sacs } from '../insectKit.js';

const F = 'soviet';

/** Rhinoceros Beetle Bruiser (Rhino tank) — r 0.46, h 0.7. Double horns, elytra, turret cannon. */
export function buildRhinoBeetle(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);
  const b = new PartBuilder();
  b.ellipsoid(m.chitinDark, 0.28, 0.12, 0.42, 0, 0.27, -0.02, 10);           // underbody
  b.dome(m.chitin, 0.33, 0.26, 0.38, 0, 0.29, -0.1, 14);                     // elytra shell
  b.box(m.chitinDark, 0.018, 0.02, 0.62, 0, 0.545, -0.12);                    // elytra seam
  for (const z of [-0.3, -0.16]) b.torus(m.team, 0.3 - Math.abs(z + 0.1) * 0.25, 0.022, 4, 14, 0, 0.31, z, 0, 0, 0, Math.PI);
  b.ellipsoid(m.chitinLight, 0.23, 0.14, 0.16, 0, 0.33, 0.28, 10);           // pronotum
  b.ellipsoid(m.chitinDark, 0.12, 0.09, 0.11, 0, 0.27, 0.42, 8);             // head
  eyes(b, m.eye, 0, 0.29, 0.49, 0.026, 0.085);
  chain(b, m.bone, [[0, 0.3, 0.5, 0.05], [0, 0.36, 0.63, 0.04], [0, 0.47, 0.73, 0.028], [0, 0.6, 0.76, 0.012]], 6); // nasal horn
  chain(b, m.bone, [[0, 0.44, 0.32, 0.04], [0, 0.55, 0.4, 0.025], [0, 0.59, 0.5, 0.01]], 6);                        // thoracic horn
  spikes(b, m.bone, [-0.3, 0.33, 0.05], [-0.3, 0.33, -0.35], 3, 0.06, 0.016, [-1, 0.4, 0]);
  spikes(b, m.bone, [0.3, 0.33, 0.05], [0.3, 0.33, -0.35], 3, 0.06, 0.016, [1, 0.4, 0]);
  body.add(b.build());

  // pneumatic shell cannon on the back
  const t = new PartBuilder();
  t.ellipsoid(m.metal, 0.11, 0.065, 0.12, 0, 0, 0, 8);
  t.cyl(m.metal, 0.032, 0.038, 0.4, 6, 0, 0.03, 0.2, Math.PI / 2, 0, 0);
  t.cyl(m.chitinDark, 0.05, 0.05, 0.06, 6, 0, 0.03, 0.4, Math.PI / 2, 0, 0);
  t.ellipsoid(m.organ, 0.05, 0.045, 0.06, 0, 0.055, -0.09, 6);
  t.torus(m.team, 0.06, 0.012, 4, 8, 0, 0.03, 0.12, 0, 0, 0);
  const turret = pivot('turret', t, 0, 0.56, -0.12);
  turret.add(marker('muzzle', 0, 0.03, 0.44));
  body.add(turret);

  for (const l of hexLegs(m.chitinDark, { pairs: 3, x: 0.2, y: 0.25, z0: 0.2, dz: 0.21, reach: 0.36, lift: 0.1, r: 0.026, footMat: m.bone })) root.add(l);
  for (const a of antennae(m.chitinDark, { y: 0.31, z: 0.5, len: 0.16, spread: 0.06, r: 0.007 })) body.add(a);
  return root;
}

// ============================================================================================ helpers

function setup(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);
  return { m, root, body };
}

/** Point at distance `t` along an axis from `o` pitched by `a` rad from +Z (a > 0 = down, a < 0 = up); `up` is offset across it. */
function fw(o, a, t, up = 0, side = 0) {
  return [o[0] + side, o[1] - Math.sin(a) * t + Math.cos(a) * up, o[2] + Math.cos(a) * t + Math.sin(a) * up];
}

/** Elliptical hoop around the Z axis (bands over abdomens & shells). arc = π draws only the upper half. */
function hoop(b, mat, x, y, z, rx, ry, tube, arc = Math.PI * 2, seg = 14) {
  const s = (rx + ry) / 2;
  b.add(mat, new THREE.TorusGeometry(1, tube / s, 3, seg, arc), [x, y, z], [0, 0, 0], [rx, ry, s]);
}

/** Radius factor of an ellipsoid cross-section at distance d from its centre along an axis of half-length r. */
const sect = (d, r) => Math.sqrt(Math.max(0, 1 - (d / r) ** 2));

/** Rename hexLegs pivots so a second set of legs gets unique indices (hexA0L -> hexA3L…). */
function shiftLegs(legs, by) {
  for (const l of legs) l.name = l.name.replace(/\d+/, (d) => String(Number(d) + by));
  return legs;
}

// ============================================================================================ Trench-Termite

/** Armored Trench-Termite (War Miner) — r 0.52, h 0.8. Plated bulldozer termite, multi-jaw scoop, rotary needle turret, paste hopper. */
export function buildTrenchTermite(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  // abdomen + armoured paste hopper
  b.ellipsoid(m.chitinDark, 0.34, 0.2, 0.42, 0, 0.42, -0.4, 10);
  const hx = 0.27, hz0 = -0.12, hz1 = -0.7, hy0 = 0.47, hy1 = 0.66;
  const hm = (hz0 + hz1) / 2, hd = hz0 - hz1, hh = hy1 - hy0;
  for (const s of [-1, 1]) {
    b.box(m.chitin, 0.05, hh + 0.02, hd, s * hx, hy0 + hh / 2, hm, 0, 0, -s * 0.12);              // side walls
    b.box(m.team, 0.056, 0.035, hd + 0.01, s * (hx + 0.008), hy1 - 0.01, hm, 0, 0, -s * 0.12);  // team rim
    for (let i = 0; i < 3; i++) {                                                               // overlapping flank plates
      const z = -0.2 - i * 0.2;
      b.ellipsoid(i === 1 ? m.chitinLight : m.chitin, 0.045, 0.13, 0.17, s * 0.335, 0.41, z, 8, 0.2, 0, s * 0.2);
    }
    spikes(b, m.bone, [s * hx, hy1 + 0.02, hz0 - 0.05], [s * hx, hy1 + 0.02, hz1 + 0.05], 3, 0.07, 0.016, [s * 0.5, 1, 0]);
  }
  b.box(m.chitin, 2 * hx + 0.05, hh, 0.05, 0, hy0 + hh / 2, hz1);                                // rear wall
  b.box(m.chitinLight, 2 * hx + 0.05, hh, 0.05, 0, hy0 + hh / 2, hz0);                           // front wall
  b.box(m.chitinDark, 2 * hx, 0.04, hd, 0, hy0, hm);                                             // floor
  b.ellipsoid(m.chitinDark, 0.16, 0.1, 0.1, 0, 0.32, -0.8, 8);                                     // abdomen tip
  // thorax
  b.ellipsoid(m.chitin, 0.25, 0.16, 0.2, 0, 0.42, 0.06, 10);
  b.dome(m.chitinDark, 0.24, 0.1, 0.18, 0, 0.5, 0.06, 10);
  // huge armoured soldier head
  b.ellipsoid(m.chitinLight, 0.22, 0.15, 0.24, 0, 0.38, 0.38, 10);
  b.dome(m.chitinDark, 0.23, 0.12, 0.25, 0, 0.42, 0.37, 10);
  b.box(m.team, 0.06, 0.02, 0.38, 0, 0.537, 0.37, 0.08, 0, 0);                                  // crest stripe
  for (const s of [-1, 1]) b.box(m.team, 0.025, 0.02, 0.3, s * 0.12, 0.505, 0.37, 0.08, 0, s * 0.45);
  chain(b, m.bone, [[0, 0.52, 0.52, 0.045], [0, 0.55, 0.64, 0.03], [0, 0.53, 0.73, 0.012]], 6);  // ram nasus
  eyes(b, m.eye, 0, 0.42, 0.6, 0.025, 0.12);
  // multi-jaw dozer: lower maxillae + toothed labium scoop
  for (const s of [-1, 1]) {
    chain(b, m.chitinDark, [[s * 0.12, 0.26, 0.55, 0.035], [s * 0.15, 0.22, 0.68, 0.028], [s * 0.08, 0.18, 0.78, 0.014]], 6, false);
    spikes(b, m.bone, [s * 0.15, 0.22, 0.66], [s * 0.1, 0.19, 0.76], 2, 0.04, 0.01, [-s, -0.3, 0.3]);
  }
  b.box(m.chitinDark, 0.56, 0.05, 0.26, 0, 0.12, 0.62, 0.22, 0, 0);                              // scoop plate
  b.box(m.team, 0.56, 0.02, 0.05, 0, 0.155, 0.51, 0.22, 0, 0);
  for (const s of [-1, 1]) b.box(m.chitin, 0.05, 0.14, 0.28, s * 0.29, 0.16, 0.6, 0.22, s * 0.2, 0);
  spikes(b, m.bone, [-0.24, 0.085, 0.76], [0.24, 0.085, 0.76], 6, 0.07, 0.018, [0, -0.35, 1]);
  body.add(b.build());

  for (const p of mandibles(m.chitinDark, { x: 0.13, y: 0.34, z: 0.58, len: 0.3, r: 0.04, curve: 1.0, teethMat: m.bone })) body.add(p);
  for (const p of antennae(m.chitinDark, { y: 0.47, z: 0.6, len: 0.22, spread: 0.1, r: 0.01, curve: 0.3 })) body.add(p);

  // integrated rotary needle turret
  const t = new PartBuilder();
  t.dome(m.chitinDark, 0.16, 0.1, 0.16, 0, 0, 0, 10);
  t.cyl(m.team, 0.165, 0.165, 0.03, 10, 0, 0.012, 0, 0, 0, 0, true);
  t.box(m.chitin, 0.15, 0.09, 0.16, 0, 0.09, 0.04);
  t.box(m.chitinLight, 0.16, 0.025, 0.17, 0, 0.14, 0.04);
  t.cyl(m.darkSteel, 0.055, 0.06, 0.12, 8, 0, 0.085, 0.17, Math.PI / 2, 0, 0);
  t.ellipsoid(m.organ, 0.05, 0.045, 0.06, 0, 0.11, -0.1, 7);
  t.torus(m.darkSteel, 0.05, 0.01, 3, 8, 0, 0.11, -0.1, 0, Math.PI / 2, 0);
  const turret = pivot('turret', t, 0, 0.56, 0.08);
  const g = new PartBuilder();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.cyl(m.bone, 0.011, 0.011, 0.24, 5, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.12, Math.PI / 2, 0, 0);
  }
  g.cyl(m.darkSteel, 0.048, 0.048, 0.025, 8, 0, 0, 0.21, Math.PI / 2, 0, 0, true);
  g.cyl(m.darkSteel, 0.045, 0.045, 0.02, 8, 0, 0, 0.06, Math.PI / 2, 0, 0, true);
  const spin = pivot('spinZ', g, 0, 0.085, 0.23);
  spin.userData.speed = 3;
  turret.add(spin);
  turret.add(marker('muzzle', 0, 0.085, 0.48));
  body.add(turret);

  // mineral paste load (scaled in Y by the game; origin at the hopper floor)
  const c = new PartBuilder();
  c.box(m.mud, 2 * hx - 0.04, 0.1, hd - 0.05, 0, 0.05, 0);
  c.dome(m.mud, 0.24, 0.09, 0.26, 0, 0.1, 0, 8);
  const rng = [[-0.12, 0.13, 0.12], [0.1, 0.15, 0.06], [0.02, 0.18, -0.08], [-0.08, 0.12, -0.17], [0.15, 0.11, -0.16], [0.0, 0.14, 0.18]];
  for (const [x, y, z] of rng) c.octa(m.crystal, 0.045, x, y, z, 0.8, 1.5, 0.8, x * 3, 0, z * 3);
  body.add(pivot('cargo', c, 0, hy0 + 0.02, hm));

  for (const l of hexLegs(m.chitinDark, { pairs: 3, x: 0.22, y: 0.32, z0: 0.24, dz: 0.3, reach: 0.42, lift: 0.12, r: 0.036, jointMat: m.chitin, footMat: m.bone, spread: 0.6 })) root.add(l);
  return root;
}

// ============================================================================================ Centipede Halftrack

/** Skittering Centipede Halftrack (Flak Track) — r 0.44. Fast many-legged carrier, passenger carapace, AA flak pod. */
export function buildCentipedeHalftrack(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  const segs = 9;
  for (let i = 0; i < segs; i++) {
    const z = 0.48 - i * 0.135, w = 0.2 - Math.max(0, i - 6) * 0.03;
    b.ellipsoid(m.chitinDark, w, 0.09, 0.085, 0, 0.21, z, 8);
    b.dome(i % 2 ? m.chitin : m.chitinLight, w * 1.02, 0.085, 0.08, 0, 0.23, z, 8);
    spikes(b, m.bone, [-w, 0.24, z], [w, 0.24, z], 2, 0.05, 0.012, [0, 0.3, -1]);
  }
  // passenger carapace compartment
  const cz = -0.28;
  b.dome(m.chitin, 0.26, 0.24, 0.36, 0, 0.27, cz, 12);
  b.dome(m.chitinDark, 0.27, 0.08, 0.37, 0, 0.27, cz, 12);                                       // skirt
  for (const dz of [-0.2, 0.0, 0.2]) {
    const k = sect(dz, 0.36);
    hoop(b, dz === 0 ? m.chitinLight : m.team, 0, 0.27, cz + dz, 0.26 * k + 0.012, 0.24 * k + 0.012, 0.018, Math.PI, 12);
  }
  for (const s of [-1, 1]) for (const dz of [-0.1, 0.1]) {                                       // firing ports
    b.box(m.eye, 0.02, 0.025, 0.07, s * 0.235, 0.39, cz + dz, 0, 0, s * 0.5);
  }
  b.box(m.chitinDark, 0.16, 0.14, 0.03, 0, 0.33, cz - 0.345, -0.4, 0, 0);                         // rear hatch
  b.box(m.team, 0.16, 0.025, 0.032, 0, 0.36, cz - 0.335, -0.4, 0, 0);
  spikes(b, m.bone, [0, 0.5, cz - 0.15], [0, 0.5, cz + 0.15], 3, 0.06, 0.014, [0, 1, -0.3]);
  // head
  b.ellipsoid(m.chitinLight, 0.15, 0.085, 0.13, 0, 0.2, 0.62, 8);
  b.dome(m.chitinDark, 0.155, 0.06, 0.12, 0, 0.23, 0.61, 8);
  eyes(b, m.eye, 0, 0.24, 0.71, 0.022, 0.08);
  b.taper(m.copper, [0, 0.21, -0.62], [0, 0.24, -0.78], 0.04, 0.006, 5);                         // tail spine
  for (const s of [-1, 1]) chain(b, m.chitinDark, [[s * 0.08, 0.2, -0.62, 0.022], [s * 0.18, 0.18, -0.72, 0.016], [s * 0.24, 0.12, -0.8, 0.008]], 5, false);
  body.add(b.build());
  for (const p of mandibles(m.bone, { x: 0.07, y: 0.17, z: 0.7, len: 0.15, r: 0.022, curve: 1.1 })) body.add(p);
  for (const p of antennae(m.chitinDark, { y: 0.26, z: 0.7, len: 0.32, spread: 0.06, r: 0.01, curve: 0.2 })) body.add(p);

  // anti-air flak pod on the thorax
  const t = new PartBuilder();
  const UP = -Math.PI / 4;
  t.cyl(m.darkSteel, 0.1, 0.12, 0.05, 10, 0, 0.025, 0);
  t.cyl(m.team, 0.105, 0.105, 0.02, 10, 0, 0.045, 0, 0, 0, 0, true);
  t.ellipsoid(m.chitinDark, 0.1, 0.07, 0.11, 0, 0.09, -0.01, 8);
  for (const s of [-1, 1]) {
    t.ellipsoid(m.organ, 0.035, 0.045, 0.05, s * 0.1, 0.1, -0.04, 6);                            // spore-flak sacs
    t.cyl(m.darkSteel, 0.03, 0.03, 0.02, 6, s * 0.1, 0.14, -0.04);
  }
  const o = [0, 0.1, 0.04];
  for (const sx of [-0.04, 0.04]) for (const up of [-0.028, 0.028]) {
    t.taper(m.darkSteel, fw(o, UP, 0.0, up, sx), fw(o, UP, 0.22, up, sx), 0.02, 0.016, 6);
    t.cyl(m.bone, 0.024, 0.02, 0.03, 6, ...fw(o, UP, 0.21, up, sx), Math.PI / 2 + UP, 0, 0);
  }
  t.box(m.chitinLight, 0.15, 0.1, 0.03, ...fw(o, UP, 0.03), UP, 0, 0);                             // gun shield
  const turret = pivot('turret', t, 0, 0.3, 0.3);
  turret.scale.setScalar(1.3);                                                                      // chunky silhouette
  turret.add(marker('muzzle', ...fw(o, UP, 0.24)));
  body.add(turret);

  for (const l of hexLegs(m.chitinDark, { pairs: 6, x: 0.16, y: 0.2, z0: 0.46, dz: 0.19, reach: 0.3, lift: 0.1, r: 0.019, jointMat: m.chitinLight, footMat: m.bone, spread: 0.5 })) root.add(l);
  return root;
}

// ============================================================================================ Bombardier Spider

/** Ballistic Bombardier Spider (V3) — r 0.45. Elongated spider; the abdomen + volatile toxic dart hinge up at the rear. */
export function buildBombardierSpider(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitin, 0.17, 0.1, 0.22, 0, 0.3, 0.2, 10);                                         // cephalothorax
  b.dome(m.chitinDark, 0.15, 0.06, 0.2, 0, 0.36, 0.19, 10);
  b.box(m.team, 0.04, 0.02, 0.26, 0, 0.42, 0.19);
  b.ellipsoid(m.chitinDark, 0.06, 0.05, 0.06, 0, 0.29, -0.02, 6);                                  // pedicel
  b.ellipsoid(m.chitinDark, 0.1, 0.08, 0.08, 0, 0.3, 0.42, 8);                                      // head
  eyes(b, m.eye, 0, 0.36, 0.47, 0.024, 0.035);
  eyes(b, m.eye, 0, 0.34, 0.49, 0.016, 0.07);
  eyes(b, m.eye, 0, 0.385, 0.43, 0.012, 0.05);
  for (const s of [-1, 1]) {                                                                         // chelicerae & palps
    chain(b, m.chitinDark, [[s * 0.04, 0.27, 0.47, 0.032], [s * 0.035, 0.2, 0.52, 0.024]], 6, false);
    b.taper(m.bone, [s * 0.035, 0.2, 0.52], [s * 0.015, 0.16, 0.5], 0.014, 0.002, 4);
    chain(b, m.chitin, [[s * 0.08, 0.28, 0.45, 0.016], [s * 0.13, 0.3, 0.55, 0.012], [s * 0.11, 0.22, 0.62, 0.008]], 5, false);
  }
  body.add(b.build());

  // abdomen node, hinged at the spinnerets so it tilts the dart's nose up when aiming
  const a = new PartBuilder();
  a.ellipsoid(m.chitinDark, 0.18, 0.13, 0.33, 0, 0.07, 0.33, 12);
  a.dome(m.chitin, 0.17, 0.08, 0.3, 0, 0.11, 0.33, 10);
  for (const dz of [-0.14, 0.0, 0.14]) {                                                              // team chevrons
    const k = sect(dz - 0.0, 0.3);
    hoop(a, m.team, 0, 0.11, 0.33 + dz, 0.17 * k + 0.01, 0.08 * k + 0.01, 0.014, Math.PI, 10);
  }
  for (const s of [-1, 1]) a.cone(m.chitinDark, 0.025, 0.06, 5, s * 0.03, 0.03, -0.01, -Math.PI / 2, 0, 0); // spinnerets
  for (const z of [0.15, 0.5]) for (const s of [-1, 1]) a.taper(m.bone, [s * 0.12, 0.13, z], [s * 0.07, 0.25, z], 0.014, 0.01, 4); // cradle ribs
  // the dart
  const dy = 0.27;
  a.cyl(m.bone, 0.034, 0.03, 0.62, 8, 0, dy, 0.33, Math.PI / 2, 0, 0);                                // shaft
  for (const z of [0.12, 0.3, 0.48]) a.cyl(m.team, 0.037, 0.037, 0.03, 8, 0, dy, z, Math.PI / 2, 0, 0, true);
  a.ellipsoid(m.acid, 0.072, 0.072, 0.16, 0, dy, 0.74, 10);                                          // toxic warhead
  for (const z of [0.66, 0.82]) a.cyl(m.darkSteel, 0.066, 0.066, 0.02, 8, 0, dy, z, Math.PI / 2, 0, 0, true);
  a.cyl(m.darkSteel, 0.05, 0.068, 0.04, 8, 0, dy, 0.6, Math.PI / 2, 0, 0);
  a.cone(m.bone, 0.045, 0.16, 8, 0, dy, 0.96, Math.PI / 2, 0, 0);                                   // barbed nose
  spikes(a, m.bone, [0, dy + 0.04, 0.9], [0, dy + 0.04, 0.9], 1, 0.05, 0.01, [0, 0.4, -1]);
  for (let i = 0; i < 4; i++) {                                                                       // tail fins
    const r = i * Math.PI / 2 + Math.PI / 4;
    const cx = Math.cos(r), cy = Math.sin(r);
    a.polygon(m.chitinLight, [[cx * 0.03, dy + cy * 0.03, 0.04], [cx * 0.11, dy + cy * 0.11, -0.02], [cx * 0.1, dy + cy * 0.1, 0.07], [cx * 0.03, dy + cy * 0.03, 0.17]]);
  }
  a.cone(m.fire, 0.03, 0.06, 6, 0, dy, -0.02, -Math.PI / 2, 0, 0);                                    // propellant gland
  a.ellipsoid(m.organ, 0.035, 0.035, 0.04, 0, dy, 0.02, 6);
  const abd = pivot('abdomen', a, 0, 0.26, -0.6);
  abd.add(marker('muzzle', 0, dy, 1.04));
  body.add(abd);

  for (const l of hexLegs(m.chitinDark, { pairs: 4, x: 0.12, y: 0.3, z0: 0.34, dz: 0.085, reach: 0.44, lift: 0.22, r: 0.02, jointMat: m.chitin, footMat: m.bone, spread: 1.3 })) root.add(l);
  return root;
}

// ============================================================================================ Drill Mite

/** Parasitic Drill Mite (Terror Drone) — r 0.24, h 0.3. Four-legged biomechanical borer with a diamond drill. */
export function buildDrillMite(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitinDark, 0.11, 0.075, 0.12, 0, 0.2, -0.02, 10);
  b.dome(m.chitin, 0.1, 0.065, 0.1, 0, 0.215, -0.03, 10);
  b.box(m.team, 0.03, 0.012, 0.18, 0, 0.278, -0.03, 0.08, 0, 0);
  for (const s of [-1, 1]) {
    b.box(m.darkSteel, 0.035, 0.05, 0.12, s * 0.1, 0.2, -0.02, 0, 0, s * 0.3);                      // armour cheeks
    b.box(m.team, 0.038, 0.012, 0.11, s * 0.105, 0.225, -0.02, 0, 0, s * 0.3);
  }
  b.ellipsoid(m.spark, 0.03, 0.022, 0.03, 0, 0.255, -0.11, 6);                                       // power cell
  b.cyl(m.darkSteel, 0.035, 0.035, 0.02, 6, 0, 0.235, -0.11);
  b.taper(m.darkSteel, [0, 0.27, -0.1], [0, 0.32, -0.14], 0.006, 0.003, 4);                          // sensor whip
  b.ellipsoid(m.eye, 0.012, 0.012, 0.012, 0, 0.32, -0.14, 5);
  b.cyl(m.metal, 0.06, 0.07, 0.06, 8, 0, 0.19, 0.1, Math.PI / 2, 0, 0);                              // drill collar
  b.torus(m.team, 0.065, 0.01, 3, 10, 0, 0.19, 0.08);
  eyes(b, m.eye, 0, 0.24, 0.085, 0.016, 0.05);
  eyes(b, m.eye, 0, 0.225, 0.095, 0.01, 0.075);
  body.add(b.build());

  // diamond-tipped drill (spins)
  const d = new PartBuilder();
  const DR = 0.064, DL = 0.19;
  d.cone(m.darkSteel, DR, DL, 7, 0, 0, DL / 2, Math.PI / 2, 0, 0);
  for (let i = 0; i < 8; i++) {
    const t = i / 8, ang = i * 1.4;
    const r = DR * (1 - t) + 0.006;
    d.box(m.steel, 0.014, 0.014, 0.035, Math.cos(ang) * r, Math.sin(ang) * r, t * DL, 0, 0, ang);   // helical flutes
    d.octa(m.crystal, 0.014, Math.cos(ang) * (r + 0.009), Math.sin(ang) * (r + 0.009), t * DL + 0.012);
  }
  d.octa(m.crystal, 0.024, 0, 0, DL + 0.005, 0.8, 0.8, 1.6);                                                 // diamond tip
  const drill = pivot('spinZ', d, 0, 0.19, 0.13);
  drill.userData.speed = 6;
  body.add(drill);
  for (const p of mandibles(m.steel, { x: 0.06, y: 0.16, z: 0.11, len: 0.1, r: 0.012, curve: 0.9, teethMat: m.crystal })) body.add(p);

  for (const l of hexLegs(m.darkSteel, { pairs: 2, x: 0.08, y: 0.18, z0: 0.05, dz: 0.12, reach: 0.27, lift: 0.13, r: 0.014, jointMat: m.chitin, footMat: m.bone, spread: 1.1 })) root.add(l);
  return root;
}

// ============================================================================================ Hercules Dreadnought

/** Titan Hercules Dreadnought (Apocalypse) — r 0.72, h 1.0. Juggernaut beetle: twin cannons, hydraulic mandibles, harpoon tubes. */
export function buildHerculesDreadnought(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitinDark, 0.5, 0.2, 0.92, 0, 0.42, -0.1, 12);                                    // underbody
  // layered armour: elytra, mesonotum, pronotum
  b.dome(m.chitin, 0.56, 0.4, 0.62, 0, 0.44, -0.42, 14);
  b.box(m.chitinDark, 0.03, 0.03, 1.1, 0, 0.84, -0.42);
  for (const dz of [-0.4, -0.15]) {
    const k = sect(dz + 0.0, 0.62);
    hoop(b, m.team, 0, 0.44, -0.42 + dz, 0.56 * k + 0.012, 0.4 * k + 0.012, 0.03, Math.PI, 14);
  }
  b.dome(m.chitinLight, 0.5, 0.33, 0.2, 0, 0.44, 0.14, 12);
  b.dome(m.chitin, 0.46, 0.3, 0.3, 0, 0.42, 0.36, 12);                                             // pronotum
  hoop(b, m.chitinDark, 0, 0.42, 0.5, 0.46 * sect(0.14, 0.3) + 0.01, 0.3 * sect(0.14, 0.3) + 0.01, 0.025, Math.PI, 12);
  for (const s of [-1, 1]) {                                                                        // side armour skirts
    for (let i = 0; i < 4; i++) {
      const z = 0.3 - i * 0.3;
      b.box(i % 2 ? m.chitinDark : m.chitin, 0.06, 0.24, 0.34, s * 0.55, 0.42, z, 0, 0, s * 0.22);
    }
    b.box(m.team, 0.065, 0.05, 1.2, s * 0.575, 0.5, -0.15, 0, 0, s * 0.22);
    spikes(b, m.bone, [s * 0.6, 0.56, 0.35], [s * 0.6, 0.56, -0.65], 4, 0.12, 0.03, [s, 0.5, -0.2]);
  }
  // head, Hercules horns
  b.ellipsoid(m.chitinDark, 0.24, 0.16, 0.2, 0, 0.38, 0.72, 10);
  eyes(b, m.eye, 0, 0.44, 0.84, 0.035, 0.17);
  chain(b, m.bone, [[0, 0.62, 0.48, 0.08], [0, 0.72, 0.72, 0.062], [0, 0.73, 0.95, 0.045], [0, 0.66, 1.12, 0.02]], 8); // thoracic horn
  spikes(b, m.bone, [0, 0.67, 0.8], [0, 0.68, 1.0], 3, 0.06, 0.016, [0, -1, 0.2]);
  chain(b, m.bone, [[0, 0.42, 0.86, 0.06], [0, 0.46, 0.98, 0.045], [0, 0.55, 1.07, 0.028], [0, 0.6, 1.09, 0.01]], 8);  // head horn
  // vertical harpoon tubes (AA)
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = s * (0.33 + (i % 2) * 0.06), z = -0.32 - i * 0.14;
    b.cyl(m.darkSteel, 0.045, 0.05, 0.34, 7, x, 0.82, z);
    b.cyl(m.team, 0.05, 0.05, 0.03, 7, x, 0.95, z, 0, 0, 0, true);
    b.cone(m.bone, 0.035, 0.12, 6, x, 1.05, z);
    b.cyl(m.metal, 0.052, 0.052, 0.02, 7, x, 0.99, z, 0, 0, 0, true);
  }
  for (const s of [-1, 1]) b.box(m.chitinDark, 0.18, 0.06, 0.4, s * 0.38, 0.68, -0.46);              // tube racks
  body.add(b.build());

  // self-regenerating heart organ
  const hb = new PartBuilder();
  hb.ellipsoid(m.organ, 0.11, 0.08, 0.1, 0, 0, 0, 8);
  sacs(hb, m.organ, 0, -0.02, 0, 5, 0.045, 0.1, 11);
  const heart = pivot('pulseHeart', hb, 0, 0.74, -0.88);
  body.add(heart);

  // front hydraulic crushing mandibles
  for (const s of [-1, 1]) {
    const mb = new PartBuilder();
    const pts = [[0, 0, 0, 0.07], [s * 0.05, -0.02, 0.18, 0.06], [-s * 0.01, -0.03, 0.34, 0.045], [-s * 0.12, -0.03, 0.44, 0.02]];
    mb.ellipsoid(m.chitinDark, 0.075, 0.075, 0.075, 0, 0, 0, 7);
    chain(mb, m.chitinDark, pts, 6, false);
    mb.ellipsoid(m.chitinDark, 0.055, 0.055, 0.055, ...pts[1].slice(0, 3), 6);
    spikes(mb, m.bone, pts[1], pts[3], 3, 0.07, 0.018, [-s, 0, 0.3]);
    mb.cyl(m.darkSteel, 0.03, 0.03, 0.2, 6, s * 0.09, 0.06, 0.06, Math.PI / 2 - 0.2, 0, 0);            // hydraulic ram
    mb.strut(m.steel, [s * 0.09, 0.08, 0.14], [s * 0.05, 0.03, 0.26], 0.014, 5);
    mb.torus(m.team, 0.065, 0.016, 3, 8, s * 0.02, -0.01, 0.12, 0, 0, 0);
    body.add(pivot(s < 0 ? 'mandL' : 'mandR', mb, s * 0.17, 0.3, 0.84));
  }

  // twin-cannon turret
  const t = new PartBuilder();
  t.dome(m.chitinDark, 0.34, 0.2, 0.36, 0, 0, 0, 12);
  t.cyl(m.team, 0.345, 0.345, 0.04, 12, 0, 0.02, 0, 0, 0, 0, true);
  t.box(m.chitin, 0.46, 0.14, 0.3, 0, 0.13, 0.12);                                                  // mantlet
  for (const x of [-0.07, 0.07]) t.box(m.team, 0.045, 0.03, 0.31, x, 0.2, 0.12);
  t.box(m.chitinLight, 0.47, 0.02, 0.05, 0, 0.2, 0.25);
  t.ellipsoid(m.organ, 0.09, 0.07, 0.1, 0, 0.17, -0.22, 8);                                         // breech gland
  spikes(t, m.bone, [-0.25, 0.1, -0.1], [-0.25, 0.1, 0.2], 2, 0.08, 0.02, [-1, 0.6, 0]);
  spikes(t, m.bone, [0.25, 0.1, -0.1], [0.25, 0.1, 0.2], 2, 0.08, 0.02, [1, 0.6, 0]);
  const gy = 0.13, gx = 0.15;
  for (const s of [-1, 1]) {
    t.cyl(m.bone, 0.07, 0.07, 0.24, 8, s * gx, gy, 0.36, Math.PI / 2, 0, 0);                         // bone sleeve
    t.cyl(m.darkSteel, 0.045, 0.05, 0.62, 8, s * gx, gy, 0.66, Math.PI / 2, 0, 0);                   // barrel
    t.cyl(m.chitinDark, 0.068, 0.068, 0.1, 8, s * gx, gy, 0.97, Math.PI / 2, 0, 0);                  // muzzle brake
    t.cyl(m.team, 0.072, 0.072, 0.03, 8, s * gx, gy, 0.5, Math.PI / 2, 0, 0, true);
  }
  const turret = pivot('turret', t, 0, 0.8, -0.12);
  turret.add(marker('muzzle', -gx, gy, 1.04));
  turret.add(marker('muzzle2', gx, gy, 1.04));
  body.add(turret);

  for (const p of antennae(m.chitinDark, { y: 0.47, z: 0.86, len: 0.24, spread: 0.13, r: 0.014, curve: 0.3 })) body.add(p);
  for (const l of hexLegs(m.chitinDark, { pairs: 3, x: 0.4, y: 0.38, z0: 0.36, dz: 0.43, reach: 0.5, lift: 0.14, r: 0.055, jointMat: m.chitin, footMat: m.bone, spread: 0.5 })) root.add(l);
  return root;
}

// ============================================================================================ Nexus Queen

/** Nexus Queen Crawler (MCV) — r 0.7, h 1.0. Bloated termite queen: pale ribbed abdomen, armoured head/thorax. */
export function buildNexusQueen(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  // physogastric abdomen: pale membrane, dark sclerite islands, rib hoops
  const az = -0.36, ay = 0.5, arx = 0.52, ary = 0.42, arz = 0.68;
  b.ellipsoid(m.bone, arx, ary, arz, 0, ay, az, 14);
  for (let i = 0; i < 6; i++) {
    const dz = 0.5 - i * 0.2, k = sect(dz, arz);
    hoop(b, i === 1 || i === 4 ? m.team : m.chitinDark, 0, ay, az + dz, arx * k + 0.01, ary * k + 0.01, 0.022, Math.PI * 2, 16);
    if (i < 5) {
      const zc = az + dz - 0.1, kc = sect(dz - 0.1, arz);
      b.dome(m.chitin, 0.2 * kc + 0.04, 0.05, 0.06, 0, ay + ary * kc - 0.02, zc, 8);                 // tergite island
      for (const s of [-1, 1]) b.ellipsoid(m.chitinDark, 0.06, 0.04, 0.05, s * arx * kc * 0.8, ay + ary * kc * 0.55, zc, 6, 0, 0, s * 0.8);
    }
  }
  sacs(b, m.membrane, 0, ay - 0.05, az - arz + 0.05, 4, 0.09, 0.12, 5);                              // egg-laying tip
  sacs(b, m.organ, 0, ay - 0.08, az - arz + 0.02, 5, 0.04, 0.1, 9);
  // hive-seed saddle: mud & mastic load with vents (becomes the Hive Nexus)
  b.dome(m.mud, 0.3, 0.12, 0.26, 0, ay + ary - 0.06, az + 0.2, 10);
  b.cyl(m.mud, 0.07, 0.1, 0.14, 7, -0.12, ay + ary + 0.06, az + 0.18);
  b.cyl(m.mud, 0.06, 0.09, 0.12, 7, 0.13, ay + ary + 0.04, az + 0.26);
  b.ellipsoid(m.acid, 0.05, 0.02, 0.05, -0.12, ay + ary + 0.13, az + 0.18, 6);
  b.ellipsoid(m.acid, 0.045, 0.02, 0.045, 0.13, ay + ary + 0.1, az + 0.26, 6);
  spikes(b, m.bone, [-0.22, ay + ary - 0.02, az + 0.1], [0.22, ay + ary - 0.02, az + 0.1], 4, 0.08, 0.016, [0, 1, -0.4]);
  // armoured thorax & head
  b.ellipsoid(m.chitinDark, 0.27, 0.19, 0.22, 0, 0.4, 0.42, 10);
  b.dome(m.chitin, 0.28, 0.13, 0.22, 0, 0.45, 0.42, 10);
  hoop(b, m.team, 0, 0.45, 0.48, 0.27 * sect(0.06, 0.22) + 0.01, 0.13 * sect(0.06, 0.22) + 0.01, 0.022, Math.PI, 12);
  for (const s of [-1, 1]) spikes(b, m.bone, [s * 0.26, 0.47, 0.5], [s * 0.26, 0.47, 0.32], 2, 0.08, 0.02, [s, 0.6, 0]);
  b.ellipsoid(m.chitinLight, 0.2, 0.15, 0.17, 0, 0.38, 0.74, 10);
  b.dome(m.chitinDark, 0.21, 0.1, 0.17, 0, 0.43, 0.73, 10);
  b.box(m.team, 0.05, 0.02, 0.26, 0, 0.528, 0.73);
  eyes(b, m.eye, 0, 0.42, 0.88, 0.03, 0.12);
  body.add(b.build());
  for (const p of mandibles(m.chitinDark, { x: 0.08, y: 0.3, z: 0.86, len: 0.18, r: 0.028, curve: 0.9, teethMat: m.bone })) body.add(p);
  for (const p of antennae(m.chitinDark, { y: 0.46, z: 0.86, len: 0.32, spread: 0.08, r: 0.012, curve: 0.4, tipMat: m.organ })) body.add(p);

  // glowing royal organ inside the abdomen (pulses)
  const g = new PartBuilder();
  g.ellipsoid(m.organ, 0.08, 0.06, 0.1, 0, 0, 0, 8);
  const pulse = pivot('pulseRoyal', g, 0, ay + ary - 0.01, az - 0.3);
  body.add(pulse);

  for (const l of hexLegs(m.chitinDark, { pairs: 3, x: 0.22, y: 0.36, z0: 0.6, dz: 0.16, reach: 0.4, lift: 0.14, r: 0.034, jointMat: m.chitin, footMat: m.bone, spread: 0.9 })) root.add(l);
  for (const l of shiftLegs(hexLegs(m.chitinDark, { pairs: 2, x: 0.42, y: 0.22, z0: -0.2, dz: 0.42, reach: 0.22, lift: 0.08, r: 0.03, jointMat: m.chitin, footMat: m.bone, spread: 0.4 }), 3)) root.add(l);
  return root;
}

export const MODELS = {
  trenchTermite: buildTrenchTermite,
  rhinoBeetle: buildRhinoBeetle,
  centipedeHalftrack: buildCentipedeHalftrack,
  bombardierSpider: buildBombardierSpider,
  drillMite: buildDrillMite,
  herculesDreadnought: buildHerculesDreadnought,
  nexusQueen: buildNexusQueen,
};
