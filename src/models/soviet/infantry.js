// SOVIET infantry — Scorpiones, Araneae & Toxic Blattodea foot soldiers.
// Brutal mass: rust/black chitin, bone spikes, toxic-green sacs, cyan-electric organs, team helmets & bands.
// Upright soldiers: legs on the root, torso/arms/head in `body`. Guns ride in the arm pivots and the
// `muzzle` marker sits inside the gun arm, so it follows the barrel when the arm raises to fire.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { PartBuilder, pivot, marker, chain, spikes, hexLegs, bipedLegs, arms, mandibles } from '../insectKit.js';

const F = 'soviet';

function setup(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);
  return { m, root, body };
}

/** Point at distance `t` along a gun axis starting at `o`, pitched down `a` rad from +Z; `up` is offset across the axis. */
function fw(o, a, t, up = 0, side = 0) {
  return [o[0] + side, o[1] - Math.sin(a) * t + Math.cos(a) * up, o[2] + Math.cos(a) * t + Math.sin(a) * up];
}

/** Ring around a gun axis pitched down `a` from +Z. */
function band(b, mat, r, tube, p, a = 0, seg = 8) {
  b.torus(mat, r, tube, 3, seg, p[0], p[1], p[2], a, 0, 0);
}

/** Hand position of an `arms()` pivot of length `len` (in the pivot's local space). */
const handOf = (len) => [0, -len * 0.35, len * 0.75];

/** Low-poly pair of compound eyes (infantry budget). */
function eyePair(b, mat, y, z, r, spread, seg = 6) {
  b.ellipsoid(mat, r, r, r, -spread, y, z, seg);
  b.ellipsoid(mat, r, r, r, spread, y, z, seg);
}

/** Cheap two-segment antennae pivots (antL/antR) rising from (±spread, y, z). */
function feelers(mat, o = {}, tipMat = null) {
  const { y = 0.4, z = 0.05, len = 0.13, spread = 0.02, r = 0.005, up = 0.65, out = 0.4 } = o;
  return [-1, 1].map((s) => {
    const b = new PartBuilder();
    const k = [s * len * out * 0.35, len * up * 0.7, len * 0.4];
    const t = [s * len * out, len * up, len * 0.85];
    b.taper(mat, [0, 0, 0], k, r, r * 0.8, 4);
    b.taper(mat, k, t, r * 0.8, r * 0.4, 4);
    if (tipMat) b.ellipsoid(tipMat, r * 2.2, r * 2.2, r * 2.2, ...t, 5);
    return pivot(s < 0 ? 'antL' : 'antR', b, s * spread, y, z);
  });
}

// ---------------------------------------------------------------------------------------------- Swarm Ant

/** Brood Swarm Ant (Conscript) — mass-produced red ant soldier, petiole waist, big mandibles, acid bio-rifle. */
export function buildSwarmAnt(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitin, 0.05, 0.072, 0.046, 0, 0.272, 0, 8);                       // mesosoma (upright)
  b.ellipsoid(m.chitinDark, 0.019, 0.022, 0.019, 0, 0.222, -0.042, 6);             // petiole node 1
  b.ellipsoid(m.chitinDark, 0.022, 0.024, 0.022, 0, 0.212, -0.07, 6);              // petiole node 2
  b.ellipsoid(m.chitinLight, 0.068, 0.06, 0.088, 0, 0.21, -0.15, 8, -0.35, 0, 0);  // gaster, hanging back
  b.torus(m.team, 0.062, 0.008, 3, 10, 0, 0.221, -0.122, -0.35, 0, 0);
  b.torus(m.team, 0.058, 0.008, 3, 10, 0, 0.198, -0.183, -0.35, 0, 0);
  b.taper(m.bone, [0, 0.182, -0.232], [0, 0.17, -0.262], 0.009, 0.002, 4);          // acidopore sting
  spikes(b, m.bone, [0, 0.31, -0.035], [0, 0.26, -0.045], 2, 0.035, 0.008, [0, 0.35, -1]); // propodeal spines
  for (const s of [-1, 1]) {
    b.dome(m.team, 0.033, 0.02, 0.035, s * 0.05, 0.318, 0, 6, 0, 0, -s * 0.6);     // shoulder pads
    b.taper(m.bone, [s * 0.062, 0.332, -0.01], [s * 0.09, 0.365, -0.03], 0.008, 0.002, 4);
  }
  b.ellipsoid(m.chitinDark, 0.022, 0.02, 0.022, 0, 0.345, 0.012, 6);              // neck
  b.ellipsoid(m.chitinLight, 0.047, 0.043, 0.045, 0, 0.385, 0.025, 8);            // head
  eyePair(b, m.eye, 0.39, 0.052, 0.013, 0.037);
  b.dome(m.teamDark, 0.053, 0.032, 0.05, 0, 0.402, 0.016, 8);                      // brood helmet
  b.cyl(m.team, 0.055, 0.055, 0.008, 8, 0, 0.404, 0.016);
  b.octa(m.glow, 0.012, 0, 0.416, 0.063, 1, 1, 0.45);                              // badge
  body.add(b.build());

  for (const p of mandibles(m.chitinDark, { x: 0.022, y: 0.362, z: 0.058, len: 0.08, r: 0.01, curve: 1.0, teethMat: m.bone })) body.add(p);
  for (const p of feelers(m.chitinDark, { y: 0.398, z: 0.062, len: 0.13, spread: 0.018, r: 0.005 })) body.add(p);

  const A = 0.22; // rifle carried at low-ready; raising the arm to fire brings it level
  const len = 0.13;
  const [armA, armB] = arms(m.chitin, { x: 0.058, y: 0.312, z: 0.01, len, r: 0.012, jointMat: m.chitinDark }, (ab, s, h) => {
    if (s > 0) { // caustic bio-rifle
      ab.box(m.chitinDark, 0.022, 0.03, 0.11, ...fw(h, A, 0.0), A, 0, 0);            // stock & body
      ab.box(m.metal, 0.017, 0.022, 0.06, ...fw(h, A, 0.07, 0.006), A, 0, 0);         // receiver
      ab.taper(m.bone, fw(h, A, 0.09, 0.008), fw(h, A, 0.18, 0.008), 0.008, 0.005, 5); // bone barrel
      ab.ellipsoid(m.acid, 0.013, 0.013, 0.024, ...fw(h, A, 0.035, 0.03), 6, A, 0, 0); // acid magazine
      band(ab, m.team, 0.014, 0.004, fw(h, A, 0.035, 0.03), A, 6);
      ab.taper(m.chitinLight, fw(h, A, 0.14, -0.006), fw(h, A, 0.205, -0.004), 0.006, 0.001, 4); // mandible bayonet
    } else { // hooked claw
      ab.taper(m.chitinDark, h, [h[0] - 0.006, h[1] + 0.022, h[2] + 0.03], 0.008, 0.002, 4);
      ab.taper(m.chitinDark, h, [h[0] + 0.006, h[1] - 0.018, h[2] + 0.032], 0.008, 0.002, 4);
    }
  });
  armB.add(marker('muzzle', ...fw(handOf(len), A, 0.185, 0.008)));
  body.add(armA, armB);
  for (const l of bipedLegs(m.chitinDark, { x: 0.032, y: 0.205, r: 0.013, jointMat: m.chitin, footMat: m.chitin })) root.add(l);
  return root;
}

// ---------------------------------------------------------------------------------------------- Bombardier Gunner

/** Bombardier Beetle Gunner (Flak Trooper) — hunchback with twin reactant chambers feeding an aerosol launcher. */
export function buildBombardierGunner(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitinLight, 0.06, 0.075, 0.055, 0, 0.27, 0.012, 8, 0.3, 0, 0);    // thorax, leaning forward
  b.ellipsoid(m.chitinDark, 0.07, 0.07, 0.07, 0, 0.225, -0.05, 8);                  // abdomen
  b.ellipsoid(m.chitinDark, 0.088, 0.095, 0.075, 0, 0.3, -0.065, 10, 0.45, 0, 0);   // elytra hump
  b.box(m.chitin, 0.012, 0.012, 0.15, 0, 0.36, -0.08, 0.95, 0, 0);                   // elytra seam
  b.dome(m.chitinLight, 0.085, 0.04, 0.07, 0, 0.325, 0.02, 8, 0.25, 0, 0);           // pronotum
  b.torus(m.team, 0.072, 0.009, 3, 10, 0, 0.33, 0.022, Math.PI / 2 + 0.25, 0, 0);    // pronotum team rim
  spikes(b, m.bone, [-0.06, 0.37, -0.03], [-0.04, 0.37, -0.11], 2, 0.03, 0.008, [-0.6, 1, -0.4]);
  spikes(b, m.bone, [0.06, 0.37, -0.03], [0.04, 0.37, -0.11], 2, 0.03, 0.008, [0.6, 1, -0.4]);

  // twin reactant chambers strapped to the hump: hydroquinone (acid) + peroxide (organ)
  for (const s of [-1, 1]) {
    const x = s * 0.045, y = 0.31, z = -0.135;
    b.ellipsoid(s < 0 ? m.acid : m.organ, 0.032, 0.062, 0.032, x, y, z, 7, -0.25, 0, 0);
    b.cyl(m.darkSteel, 0.025, 0.031, 0.022, 7, x, y + 0.058, z + 0.015, -0.25, 0, 0);
    b.cyl(m.darkSteel, 0.031, 0.025, 0.022, 7, x, y - 0.058, z - 0.015, -0.25, 0, 0);
    b.cyl(m.team, 0.035, 0.035, 0.014, 7, x, y, z, -0.25, 0, 0, true);
    b.cyl(m.metal, 0.008, 0.008, 0.03, 5, x, y + 0.08, z + 0.02, -0.25, 0, 0);       // valve stem
  }
  b.ellipsoid(m.metal, 0.03, 0.022, 0.026, 0, 0.235, -0.165, 6);                     // reaction chamber
  b.cone(m.fire, 0.014, 0.03, 5, 0, 0.22, -0.195, -Math.PI / 2 - 0.4, 0, 0);       // hot vent
  chain(b, m.rubber, [[0.045, 0.39, -0.115, 0.009], [0.06, 0.4, -0.05, 0.009], [0.075, 0.355, 0.0, 0.009]], 5, false); // feed hose
  b.ellipsoid(m.chitinDark, 0.04, 0.036, 0.042, 0, 0.32, 0.085, 8);                 // head, low & forward
  eyePair(b, m.eye, 0.328, 0.108, 0.012, 0.03);
  b.taper(m.bone, [-0.015, 0.305, 0.115], [-0.004, 0.296, 0.14], 0.007, 0.002, 4);  // stubby mandibles
  b.taper(m.bone, [0.015, 0.305, 0.115], [0.004, 0.296, 0.14], 0.007, 0.002, 4);
  body.add(b.build());
  for (const p of feelers(m.chitinDark, { y: 0.345, z: 0.11, len: 0.1, spread: 0.016, r: 0.005, up: 0.5 })) body.add(p);

  const len = 0.13;
  const [armA, armB] = arms(m.chitinLight, { x: 0.07, y: 0.318, z: 0.02, len, r: 0.013, jointMat: m.chitinDark }, (ab, s, h) => {
    if (s > 0) { // aerosol burst launcher
      ab.cyl(m.darkSteel, 0.024, 0.028, 0.17, 7, h[0], h[1] + 0.02, h[2] + 0.03, Math.PI / 2, 0, 0);
      ab.cyl(m.bone, 0.036, 0.026, 0.03, 7, h[0], h[1] + 0.02, h[2] + 0.125, Math.PI / 2, 0, 0); // flared bell
      ab.torus(m.organ, 0.03, 0.006, 3, 8, h[0], h[1] + 0.02, h[2] + 0.141);
      ab.cyl(m.team, 0.03, 0.03, 0.02, 7, h[0], h[1] + 0.02, h[2] - 0.02, Math.PI / 2, 0, 0);
      ab.ellipsoid(m.acid, 0.016, 0.016, 0.028, h[0], h[1] + 0.05, h[2] + 0.0, 6);   // feed sac
      ab.box(m.chitinDark, 0.012, 0.03, 0.02, h[0], h[1] - 0.01, h[2] + 0.01);      // grip
    } else { // pincer hand
      ab.taper(m.chitinDark, h, [h[0] + 0.012, h[1] + 0.015, h[2] + 0.03], 0.009, 0.002, 4);
      ab.taper(m.chitinDark, h, [h[0] + 0.012, h[1] - 0.015, h[2] + 0.03], 0.009, 0.002, 4);
    }
  });
  const h = handOf(len);
  armB.add(marker('muzzle', h[0], h[1] + 0.02, h[2] + 0.145));
  body.add(armA, armB);
  for (const l of bipedLegs(m.chitinDark, { x: 0.042, y: 0.2, r: 0.015, jointMat: m.chitin, footMat: m.chitin })) root.add(l);
  return root;
}

// ---------------------------------------------------------------------------------------------- Spark Centipede

/** Spark Centipede (Tesla Trooper) — armoured myriapod reared upright, copper rings, twin electrostatic stingers. */
export function buildSparkCentipede(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  // spine: rear segments on the ground, front half rearing upright
  const spine = [
    [0, 0.07, -0.27], [0, 0.073, -0.19], [0, 0.079, -0.11], [0, 0.11, -0.04],
    [0, 0.18, 0.0], [0, 0.26, 0.026], [0, 0.34, 0.042],
  ];
  for (let i = 0; i < spine.length; i++) {
    const [x, y, z] = spine[i];
    const p = spine[Math.max(0, i - 1)], n = spine[Math.min(spine.length - 1, i + 1)];
    const th = -Math.atan2(n[1] - p[1], n[2] - p[2]);                   // pitch so local Z follows the spine
    const w = 0.06 + Math.min(i, 5) * 0.004;
    b.ellipsoid(m.chitinDark, w * 0.88, 0.042, 0.046, x, y, z, 6, th, 0, 0);
    b.dome(i % 2 ? m.chitin : m.chitinLight, w, 0.054, 0.05, x, y, z, 6, th, 0, 0);               // armoured tergite
    b.add(i % 3 === 1 ? m.team : m.copper, new THREE.CylinderGeometry(1, 1, 0.016, 8, 1, true),    // conductive ring
      [x, y, z], [th + Math.PI / 2, 0, 0], [w * 1.04, 1, 0.057]);
    if (i >= 4 && i <= 5) for (const s of [-1, 1]) {                    // raised forelegs on the upright half
      b.taper(m.chitinDark, [s * w * 0.8, y, z], [s * (w + 0.06), y - 0.03, z + 0.07], 0.008, 0.002, 4);
    }
    if (i === 0 || i === 3) for (const s of [-1, 1]) {                   // static walking legs
      b.taper(m.chitinDark, [s * w * 0.8, y, z], [s * (w + 0.06), y + 0.035, z], 0.008, 0.006, 3);
      b.taper(m.chitinDark, [s * (w + 0.06), y + 0.035, z], [s * (w + 0.13), 0.005, z + 0.01], 0.006, 0.002, 3);
    }
    if (i === 2 || i === 5) for (const s of [-1, 1]) b.ellipsoid(m.spark, 0.011, 0.011, 0.011, s * w * 0.98, y, z, 5);
  }
  b.taper(m.copper, [0, 0.07, -0.3], [0, 0.085, -0.37], 0.02, 0.004, 5);               // tail spike
  for (const s of [-1, 1]) b.taper(m.copper, [s * 0.03, 0.07, -0.3], [s * 0.08, 0.12, -0.38], 0.007, 0.002, 4); // cerci
  // dorsal capacitor coils on the shoulders
  for (const s of [-1, 1]) {
    b.taper(m.copper, [s * 0.04, 0.3, -0.005], [s * 0.065, 0.46, -0.035], 0.01, 0.005, 5);
    for (const y of [0.37, 0.42]) b.cyl(m.copper, 0.017, 0.017, 0.012, 6, s * 0.0575, y, -0.027, 0, 0, 0, true);
    b.ellipsoid(m.spark, 0.018, 0.018, 0.018, s * 0.065, 0.472, -0.035, 5);
  }
  // armoured head
  b.ellipsoid(m.chitinDark, 0.058, 0.032, 0.05, 0, 0.395, 0.065, 7, 0.35, 0, 0);
  b.dome(m.team, 0.06, 0.022, 0.05, 0, 0.405, 0.06, 6, 0.35, 0, 0);
  eyePair(b, m.eye, 0.405, 0.1, 0.01, 0.038, 5);
  eyePair(b, m.eye, 0.395, 0.108, 0.007, 0.022, 5);
  body.add(b.build());

  // dual electrostatic stingers (forcipules) — open as mandibles when firing
  for (const s of [-1, 1]) {
    const sb = new PartBuilder();
    const pts = [[0, 0, 0, 0.013], [s * 0.012, -0.012, 0.05, 0.011], [-s * 0.002, -0.016, 0.1, 0.008], [-s * 0.018, -0.012, 0.135, 0.005]];
    sb.ellipsoid(m.copper, 0.014, 0.014, 0.014, 0, 0, 0, 5);
    chain(sb, m.copper, pts, 4, false);
    spikes(sb, m.chitinLight, pts[1], pts[1], 1, 0.02, 0.005, [s, 0.2, 0.3]);
    sb.ellipsoid(m.spark, 0.012, 0.012, 0.012, -s * 0.02, -0.011, 0.142, 5);
    body.add(pivot(s < 0 ? 'mandL' : 'mandR', sb, s * 0.03, 0.375, 0.1));
  }
  body.add(marker('muzzle', 0, 0.364, 0.25));
  for (const p of feelers(m.copper, { y: 0.42, z: 0.09, len: 0.17, spread: 0.02, r: 0.005, up: 0.55, out: 0.5 }, m.spark)) body.add(p);
  for (const l of hexLegs(m.chitinDark, { pairs: 2, x: 0.055, y: 0.075, z0: -0.11, dz: 0.08, reach: 0.15, lift: 0.05, r: 0.008, jointMat: m.copper, spread: 0.4 })) root.add(l);
  return root;
}

// ---------------------------------------------------------------------------------------------- Stink Bug

/** Caustic Stink Bug (Desolator) — shield-bug with a pressurised dorsal tank of radioactive bile. Deploy: injectors + slime puddle. */
export function buildStinkBug(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitin, 0.068, 0.08, 0.055, 0, 0.28, 0.0, 7);                        // thorax
  b.ellipsoid(m.chitinDark, 0.075, 0.065, 0.05, 0, 0.235, -0.05, 7);                 // abdomen
  b.ellipsoid(m.chitinLight, 0.105, 0.028, 0.062, 0, 0.338, 0.005, 8);               // broad pronotum
  for (const s of [-1, 1]) {
    b.taper(m.bone, [s * 0.09, 0.338, 0.0], [s * 0.145, 0.352, -0.012], 0.016, 0.003, 5); // humeral spines
    b.box(m.team, 0.03, 0.01, 0.07, s * 0.06, 0.362, 0.005, 0, 0, -s * 0.25);            // shoulder bands
  }
  // pentagonal scutellum shield on the back (point down)
  b.add(m.chitin, new THREE.CylinderGeometry(0.11, 0.11, 0.022, 5), [0, 0.265, -0.085], [Math.PI / 2 + 0.12, 0, 0], [1, 1, 1.25]);
  b.add(m.teamDark, new THREE.CylinderGeometry(0.118, 0.118, 0.012, 5), [0, 0.265, -0.077], [Math.PI / 2 + 0.12, 0, 0], [1, 1, 1.25]);
  // pressurised bile tank
  const tz = -0.14, ty = 0.29;
  b.cyl(m.acid, 0.042, 0.042, 0.13, 8, 0, ty, tz, 0, 0, 0, true);
  b.ellipsoid(m.darkSteel, 0.046, 0.03, 0.046, 0, ty + 0.067, tz, 6);
  b.ellipsoid(m.darkSteel, 0.046, 0.03, 0.046, 0, ty - 0.067, tz, 6);
  for (const y of [-0.03, 0.03]) b.cyl(m.darkSteel, 0.047, 0.047, 0.014, 8, 0, ty + y, tz, 0, 0, 0, true);
  b.cyl(m.hazard, 0.047, 0.047, 0.012, 8, 0, ty, tz, 0, 0, 0, true);
  b.cyl(m.metal, 0.012, 0.012, 0.03, 5, 0, ty + 0.1, tz);                             // valve
  b.torus(m.metal, 0.016, 0.005, 3, 6, 0, ty + 0.118, tz, Math.PI / 2, 0, 0);          // valve wheel
  b.cyl(m.darkSteel, 0.012, 0.012, 0.012, 6, -0.04, ty + 0.035, tz + 0.03, 0, 0, Math.PI / 2); // gauge
  b.cyl(m.glow, 0.009, 0.009, 0.004, 6, -0.047, ty + 0.035, tz + 0.03, 0, 0, Math.PI / 2);
  chain(b, m.rubber, [[0.02, ty + 0.06, tz + 0.03, 0.009], [0.07, ty + 0.07, -0.04, 0.009], [0.085, 0.33, 0.0, 0.009]], 5, false); // feed hose
  // head
  b.ellipsoid(m.chitinDark, 0.038, 0.03, 0.04, 0, 0.375, 0.05, 7);
  b.dome(m.chitinLight, 0.04, 0.016, 0.042, 0, 0.392, 0.045, 6);
  eyePair(b, m.eye, 0.38, 0.07, 0.012, 0.033);
  b.taper(m.chitinDark, [0, 0.36, 0.08], [0, 0.33, 0.1], 0.008, 0.003, 4);             // rostrum
  body.add(b.build());
  for (const p of feelers(m.chitinDark, { y: 0.39, z: 0.08, len: 0.12, spread: 0.018, r: 0.005, up: 0.5 })) body.add(p);

  const len = 0.13, A = 0.1;
  const [armA, armB] = arms(m.chitin, { x: 0.078, y: 0.318, z: 0.01, len, r: 0.013, jointMat: m.chitinDark }, (ab, s, h) => {
    if (s > 0) { // bile sprayer
      ab.cyl(m.darkSteel, 0.018, 0.02, 0.1, 7, ...fw(h, A, 0.02), Math.PI / 2 + A, 0, 0);
      ab.ellipsoid(m.acid, 0.016, 0.016, 0.03, ...fw(h, A, 0.01, 0.026), 6, A, 0, 0);
      ab.taper(m.metal, fw(h, A, 0.07), fw(h, A, 0.13), 0.011, 0.007, 6);
      ab.cyl(m.bone, 0.01, 0.014, 0.02, 6, ...fw(h, A, 0.135), Math.PI / 2 + A, 0, 0);  // nozzle
      band(ab, m.team, 0.02, 0.005, fw(h, A, -0.015), A, 7);
    } else {
      ab.taper(m.chitinDark, h, [h[0] + 0.01, h[1] + 0.012, h[2] + 0.03], 0.009, 0.002, 4);
      ab.taper(m.chitinDark, h, [h[0] + 0.01, h[1] - 0.016, h[2] + 0.028], 0.009, 0.002, 4);
    }
  });
  armB.add(marker('muzzle', ...fw(handOf(len), A, 0.15)));
  body.add(armA, armB);
  for (const l of bipedLegs(m.chitinDark, { x: 0.042, y: 0.205, r: 0.015, jointMat: m.chitin, footMat: m.chitin })) root.add(l);

  // deployed: ventral injectors plunged into the soil + radioactive bile puddle (flat, at ground level)
  const d = new PartBuilder();
  d.cyl(m.acid, 0.28, 0.28, 0.008, 14, 0, 0.004, 0);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3, r = 0.22 + (i % 3) * 0.03;
    d.cyl(m.acid, 0.08 + (i % 2) * 0.03, 0.08 + (i % 2) * 0.03, 0.007, 7, Math.cos(a) * r, 0.0035, Math.sin(a) * r);
    if (i < 4) d.dome(m.organ, 0.018, 0.012, 0.018, Math.cos(a + 0.6) * r * 0.75, 0.008, Math.sin(a + 0.6) * r * 0.75, 5); // bubbles
  }
  for (const [x, z] of [[-0.045, 0.03], [0.045, 0.03], [0, -0.065]]) {
    d.taper(m.darkSteel, [x * 0.4, 0.21, z * 0.4 - 0.03], [x, 0.07, z], 0.012, 0.009, 4);
    d.taper(m.bone, [x, 0.07, z], [x * 1.1, 0.0, z * 1.1], 0.009, 0.002, 4);
    d.cyl(m.organ, 0.02, 0.02, 0.01, 6, x * 1.1, 0.012, z * 1.1, 0, 0, 0, true);
  }
  root.add(pivot('deployOn', d));
  return root;
}

// ---------------------------------------------------------------------------------------------- Tick Saboteur

/** Bombardier Tick Saboteur (Crazy Ivan) — frenetic eight-legged tick laden with glowing enzyme bomb packs. */
export function buildTickSaboteur(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitinDark, 0.1, 0.075, 0.12, 0, 0.165, -0.025, 8);                  // engorged idiosoma
  b.dome(m.chitin, 0.085, 0.045, 0.07, 0, 0.2, 0.03, 8, 0.25, 0, 0);                  // scutum
  for (let i = 0; i < 7; i++) {                                                        // festoons on the rear rim
    const a = Math.PI * (0.15 + 0.7 * (i / 6));
    b.box(i % 2 ? m.chitin : m.team, 0.024, 0.028, 0.02, Math.cos(a) * 0.092, 0.15, -0.025 - Math.sin(a) * 0.112, 0, -(a - Math.PI / 2), 0);
  }
  b.ellipsoid(m.chitin, 0.035, 0.028, 0.035, 0, 0.16, 0.105, 7);                     // capitulum
  eyePair(b, m.eye, 0.18, 0.1, 0.012, 0.042);
  b.taper(m.bone, [0, 0.15, 0.13], [0, 0.125, 0.175], 0.01, 0.002, 4);               // barbed hypostome
  spikes(b, m.bone, [0, 0.145, 0.14], [0, 0.132, 0.165], 2, 0.012, 0.004, [0, 0.2, -1]);
  for (const s of [-1, 1]) chain(b, m.chitinLight, [[s * 0.02, 0.165, 0.125, 0.008], [s * 0.032, 0.15, 0.16, 0.007], [s * 0.02, 0.125, 0.19, 0.005]], 4, false); // palps
  b.ellipsoid(m.fire, 0.022, 0.022, 0.022, 0, 0.12, 0.2, 6);                          // clutched bomb
  b.cyl(m.darkSteel, 0.008, 0.008, 0.012, 5, 0, 0.145, 0.2);
  // harness
  b.torus(m.teamDark, 0.088, 0.009, 3, 10, 0, 0.17, -0.03, 0, 0, 0);
  b.torus(m.teamDark, 0.09, 0.009, 3, 10, 0, 0.17, -0.03, 0, Math.PI / 2, 0);
  body.add(b.build());

  // bomb pack (pulses frantically): enzyme sacks, fuses, timer
  const g = new PartBuilder();
  const sack = [[-0.045, 0.0, 0.0, m.fire], [0.045, 0.0, 0.0, m.fire], [0, 0.015, -0.055, m.organ], [0, 0.02, 0.045, m.organ]];
  for (const [x, y, z, mt] of sack) {
    g.ellipsoid(mt, 0.037, 0.043, 0.037, x, y, z, 6);
    g.cyl(m.darkSteel, 0.02, 0.026, 0.014, 6, x, y + 0.04, z);
    g.taper(m.rubber, [x, y + 0.045, z], [x * 0.5, y + 0.075, z * 0.5 + 0.005], 0.004, 0.003, 4);
  }
  g.box(m.darkSteel, 0.05, 0.03, 0.035, 0, 0.055, 0.0);                                  // detonator timer
  g.box(m.glow, 0.035, 0.012, 0.004, 0, 0.058, 0.018);
  g.ellipsoid(m.spark, 0.009, 0.009, 0.009, 0, 0.085, 0.0, 5);                          // fuse spark
  g.taper(m.team, [-0.085, -0.01, 0.0], [0.085, -0.01, 0.0], 0.009, 0.009, 4);
  body.add(pivot('glowPack', g, 0, 0.25, -0.035));

  for (const l of hexLegs(m.chitinDark, { pairs: 4, x: 0.07, y: 0.15, z0: 0.06, dz: 0.05, reach: 0.18, lift: 0.09, r: 0.01, jointMat: m.chitin, spread: 0.9 })) root.add(l);
  return root;
}

// ---------------------------------------------------------------------------------------------- Goliath Stag

/** Goliath Stag Commando (Boris, HERO) — hulking four-armed armoured scarab with a rotary bone-shard cannon. */
export function buildGoliathStag(team) {
  const { m, root, body } = setup(team);
  const b = new PartBuilder();
  b.ellipsoid(m.chitinDark, 0.1, 0.09, 0.095, 0, 0.32, -0.04, 8);                    // abdomen
  b.ellipsoid(m.chitin, 0.11, 0.11, 0.085, 0, 0.4, 0.0, 8);                           // thorax
  b.dome(m.chitin, 0.105, 0.13, 0.06, 0, 0.385, -0.075, 8, -Math.PI / 2 + 0.15, 0, 0); // elytra slab on the back
  b.box(m.chitinDark, 0.01, 0.2, 0.01, 0, 0.39, -0.138, 0.15, 0, 0);
  // striped Goliath pronotum in team colours
  b.dome(m.chitinDark, 0.135, 0.07, 0.1, 0, 0.45, 0.01, 8);
  for (const x of [-0.065, 0, 0.065]) {
    const yt = 0.45 + 0.07 * Math.sqrt(1 - (x / 0.135) ** 2);
    b.box(x === 0 ? m.bone : m.team, 0.026, 0.012, 0.16, x, yt - 0.006, 0.01, 0, 0, -x * 4);
  }
  spikes(b, m.bone, [-0.12, 0.47, 0.03], [-0.12, 0.47, -0.05], 2, 0.05, 0.012, [-1, 0.6, 0]);
  spikes(b, m.bone, [0.12, 0.47, 0.03], [0.12, 0.47, -0.05], 2, 0.05, 0.012, [1, 0.6, 0]);
  // bone-shard ammo drum on the back + feed belt
  b.cyl(m.darkSteel, 0.06, 0.06, 0.06, 8, 0, 0.42, -0.16, 0, 0, Math.PI / 2);
  b.cyl(m.team, 0.062, 0.062, 0.015, 8, 0, 0.42, -0.16, 0, 0, Math.PI / 2, true);
  spikes(b, m.bone, [-0.02, 0.48, -0.16], [0.02, 0.48, -0.16], 3, 0.04, 0.008, [0, 1, -0.3]);
  chain(b, m.bone, [[0.045, 0.43, -0.12, 0.012], [0.12, 0.44, -0.06, 0.012], [0.14, 0.43, 0.0, 0.011]], 5, false);
  // head with Y-horn
  b.ellipsoid(m.chitinDark, 0.055, 0.045, 0.055, 0, 0.515, 0.08, 8);
  eyePair(b, m.eye, 0.525, 0.11, 0.014, 0.045);
  chain(b, m.bone, [[0, 0.55, 0.1, 0.018], [0, 0.6, 0.13, 0.013], [0, 0.64, 0.12, 0.009]], 6, false);
  for (const s of [-1, 1]) b.taper(m.bone, [0, 0.635, 0.12], [s * 0.025, 0.67, 0.105], 0.008, 0.002, 4);
  body.add(b.build());
  for (const p of mandibles(m.chitinLight, { x: 0.035, y: 0.5, z: 0.12, len: 0.11, r: 0.015, curve: 0.9 })) body.add(p);

  // upper arms: rotary bone-shard cannon (right) and pheromone painter (left)
  const L1 = 0.17;
  const [upA, upB] = arms(m.chitin, { x: 0.125, y: 0.45, z: 0.02, len: L1, r: 0.02, jointMat: m.chitinDark }, (ab, s, h) => {
    if (s > 0) {
      const [hx, hy, hz] = h;
      ab.cyl(m.darkSteel, 0.042, 0.046, 0.12, 8, hx, hy + 0.015, hz + 0.01, Math.PI / 2, 0, 0);   // receiver
      ab.cyl(m.team, 0.048, 0.048, 0.02, 8, hx, hy + 0.015, hz - 0.03, Math.PI / 2, 0, 0, true);
      ab.ellipsoid(m.organ, 0.022, 0.018, 0.035, hx, hy + 0.058, hz + 0.0, 6);                 // shard gland
      for (let i = 0; i < 6; i++) {                                                            // rotary bone barrels
        const a = (i / 6) * Math.PI * 2;
        const bx = hx + Math.cos(a) * 0.024, by = hy + 0.015 + Math.sin(a) * 0.024;
        ab.cyl(m.bone, 0.009, 0.009, 0.16, 4, bx, by, hz + 0.14, Math.PI / 2, 0, 0);
      }
      ab.cyl(m.darkSteel, 0.036, 0.036, 0.016, 8, hx, hy + 0.015, hz + 0.19, Math.PI / 2, 0, 0, true); // barrel clamps
      ab.cyl(m.darkSteel, 0.036, 0.036, 0.012, 8, hx, hy + 0.015, hz + 0.105, Math.PI / 2, 0, 0, true);
    } else {
      ab.box(m.darkSteel, 0.03, 0.03, 0.06, h[0], h[1] + 0.01, h[2] + 0.02);
      ab.cyl(m.glow, 0.012, 0.012, 0.012, 6, h[0], h[1] + 0.01, h[2] + 0.056, Math.PI / 2, 0, 0); // pheromone lens
      ab.taper(m.copper, [h[0], h[1] + 0.026, h[2]], [h[0], h[1] + 0.06, h[2] - 0.01], 0.004, 0.002, 4);
    }
  });
  const h1 = handOf(L1);
  upB.add(marker('muzzle', h1[0], h1[1] + 0.015, h1[2] + 0.225));
  // lower arms: crushing pincers
  const [loA, loB] = arms(m.chitinDark, { x: 0.1, y: 0.37, z: 0.04, len: 0.13, r: 0.016, jointMat: m.chitin }, (ab, s, h) => {
    ab.taper(m.chitinLight, h, [h[0] - s * 0.01, h[1] + 0.03, h[2] + 0.04], 0.013, 0.002, 4);
    ab.taper(m.chitinLight, h, [h[0] - s * 0.01, h[1] - 0.025, h[2] + 0.04], 0.013, 0.002, 4);
  });
  body.add(upA, upB, loA, loB);
  for (const l of bipedLegs(m.chitinDark, { x: 0.06, y: 0.28, r: 0.024, knee: 0.06, jointMat: m.chitin, footMat: m.bone })) root.add(l);
  return root;
}

export const MODELS = {
  swarmAnt: buildSwarmAnt,
  bombardierGunner: buildBombardierGunner,
  sparkCentipede: buildSparkCentipede,
  stinkBug: buildStinkBug,
  tickSaboteur: buildTickSaboteur,
  goliathStag: buildGoliathStag,
};
