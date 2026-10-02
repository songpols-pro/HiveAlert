// Shared non-buildable models: airstrike bomber moth, mirage disguise shrub, superweapon projectiles.
import * as THREE from 'three';
import { mats } from '../render/materials.js';
import { PartBuilder, pivot, marker, eyes, chain, wings, antennae } from './insectKit.js';

/** Heavy bombing moth summoned by the Goliath Stag's pheromone paint (flies at altitude). */
export function buildBomberMoth(team) {
  const m = mats(team, 'soviet');
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.ellipsoid(m.chitinDark, 0.22, 0.2, 0.55, 0, 0, -0.1, 10);
  b.ellipsoid(m.flesh, 0.24, 0.22, 0.32, 0, -0.02, -0.55, 10);
  for (let i = 0; i < 4; i++) b.torus(m.team, 0.2 - i * 0.02, 0.02, 4, 10, 0, -0.02, -0.4 - i * 0.12, 0, 0, 0);
  b.ellipsoid(m.chitin, 0.15, 0.14, 0.14, 0, 0.02, 0.42, 8);
  eyes(b, m.eye, 0, 0.06, 0.5, 0.06, 0.08);
  for (let i = 0; i < 3; i++) b.ellipsoid(m.organ, 0.06, 0.06, 0.06, 0, -0.2, -0.3 - i * 0.15, 6); // bomb sacs
  root.add(b.build());
  for (const w of wings(m.membrane, { x: 0.12, y: 0.05, z: 0.05, len: 1.0, width: 0.6, sweep: 0.15, tilt: 0.05 }, m.chitinDark)) root.add(w);
  for (const a of antennae(m.chitinDark, { y: 0.1, z: 0.5, len: 0.35, spread: 0.05, curve: 0.2, r: 0.012 })) root.add(a);
  root.add(marker('muzzle', 0, -0.25, -0.3));
  return root;
}

/** Harmless flowering shrub the Orchid Mantis turns into while motionless. */
export function buildMirageShrub(team) {
  const m = mats(team, 'allied');
  const root = new THREE.Group();
  const b = new PartBuilder();
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    b.leaf(i % 2 ? m.fern : m.fernLight, 0.55, 0.3, 4, -1.1, 0, 0.04, 0, a, -0.9);
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3, r = 0.18 + (i % 2) * 0.08;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 0.32 + (i % 3) * 0.06;
    b.strut(m.stalk, [x * 0.3, 0, z * 0.3], [x, y, z], 0.015, 4);
    for (let k = 0; k < 5; k++) {
      const pa = (k / 5) * Math.PI * 2;
      b.ellipsoid(m.petal, 0.05, 0.015, 0.03, x + Math.cos(pa) * 0.05, y, z + Math.sin(pa) * 0.05, 5, 0, -pa, 0);
    }
    b.ellipsoid(m.mushroomSpot, 0.025, 0.025, 0.025, x, y + 0.01, z, 5);
  }
  root.add(b.build());
  return root;
}

/** The Gargantuan Acidic Spore (Toxic Queen Cyst missile). */
export function buildAcidSpore(team) {
  const m = mats(team, 'soviet');
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.ellipsoid(m.flesh, 0.35, 0.6, 0.35, 0, 0, 0, 12);
  b.ellipsoid(m.acid, 0.28, 0.5, 0.28, 0, 0.05, 0, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    chain(b, m.chitinDark, [[Math.cos(a) * 0.3, -0.3, Math.sin(a) * 0.3, 0.04], [Math.cos(a) * 0.45, -0.7, Math.sin(a) * 0.45, 0.02]], 5);
  }
  root.add(pivot('spinY', b));
  return root;
}

export const COMMON_MODELS = {
  bomberMoth: buildBomberMoth,
  mirageShrub: buildMirageShrub,
  acidSpore: buildAcidSpore,
};
