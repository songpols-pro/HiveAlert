// Model registry with template caching: geometry is merged once per (kind, team) and every
// spawned entity gets a cheap clone sharing geometry & materials, plus its own animation rig.
import * as THREE from 'three';
import { def } from '../data/index.js';
import { mats } from '../render/materials.js';
import { PartBuilder, pivot, marker } from './builder.js';
import { buildRig } from './animate.js';
import { bakeModel } from './bake.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { COMMON_MODELS } from './common.js';
import { ALLIED_MODELS } from './allied/index.js';
import { SOVIET_MODELS } from './soviet/index.js';
import { YURI_MODELS } from './yuri/index.js';

export const REGISTRY = { ...COMMON_MODELS, ...ALLIED_MODELS, ...SOVIET_MODELS, ...YURI_MODELS };

const templates = new Map();

export function hasModel(kind) { return !!REGISTRY[kind]; }

export function createModel(kind, team) {
  const key = kind + ':' + team;
  let tpl = templates.get(key);
  if (!tpl) {
    const fn = REGISTRY[kind];
    let raw;
    try {
      raw = fn ? fn(team) : placeholder(kind, team);
    } catch (e) {
      console.error('Model build failed for', kind, e);
      raw = placeholder(kind, team);
    }
    tpl = bakeModel(raw);
    // infantry are tiny from the iso camera: skip their shadow pass to save draw calls in big fights
    const d = def(kind);
    if (d && d.type === 'infantry') tpl.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    templates.set(key, tpl);
  }
  const root = cloneSkinned(tpl);
  const parts = {};
  root.traverse((o) => { if (o.name && !parts[o.name]) parts[o.name] = o; });
  return { root, parts, rig: buildRig(root) };
}

// Simple stand-in so the game stays playable while a model is missing.
function placeholder(kind, team) {
  const d = def(kind) || {};
  const m = mats(team, d.faction || 'allied');
  const root = new THREE.Group();
  const b = new PartBuilder();
  if (d.isBuilding) {
    b.box(m.chitinDark, d.w * 0.9, 0.2, d.h * 0.9, 0, 0.1, 0);
    b.box(m.chitin, d.w * 0.7, d.height * 0.8, d.h * 0.7, 0, d.height * 0.4 + 0.2, 0);
    b.box(m.team, d.w * 0.72, 0.08, d.h * 0.72, 0, d.height * 0.6, 0);
    root.add(b.build());
    const t = pivot('turret', null, 0, d.height * 0.8, 0);
    t.add(marker('muzzle', 0, 0, 0.4));
    root.add(t);
  } else {
    const r = d.radius || 0.3, h = d.height || 0.5;
    b.ellipsoid(m.chitin, r * 0.8, h * 0.4, r, 0, h * 0.45, 0, 8);
    b.ellipsoid(m.team, r * 0.4, h * 0.2, r * 0.4, 0, h * 0.8, 0, 6);
    root.add(b.build());
    const t = pivot('turret', null, 0, h * 0.7, 0);
    t.add(marker('muzzle', 0, 0, r + 0.1));
    root.add(t);
  }
  return root;
}
