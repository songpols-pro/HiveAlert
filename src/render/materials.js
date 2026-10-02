// Material library: shared "common" materials + per-team palettes, and
// procedurally painted pixel-art tile textures (canvas generated, nearest filtered).
import * as THREE from 'three';
import { TEAMS } from '../config.js';
import { patchMaterial } from './fow.js';
import { mulberry32 } from '../core/util.js';

function std(params, opts) {
  return patchMaterial(new THREE.MeshStandardMaterial({ flatShading: true, ...params }), opts);
}
function lambert(params, opts) {
  return patchMaterial(new THREE.MeshLambertMaterial(params), opts);
}

let common = null;
export function commonMats() {
  if (common) return common;
  common = {
    steel: std({ color: 0x8a9096, metalness: 0.75, roughness: 0.38 }),
    darkSteel: std({ color: 0x3b3f44, metalness: 0.7, roughness: 0.5 }),
    rust: std({ color: 0x7a4a2e, metalness: 0.45, roughness: 0.8 }),
    rubber: std({ color: 0x1d1c1b, metalness: 0.0, roughness: 0.95 }),
    brass: std({ color: 0xc8963a, metalness: 0.85, roughness: 0.32 }),
    copper: std({ color: 0xc36b3b, metalness: 0.9, roughness: 0.3 }),
    concrete: std({ color: 0x9a968c, metalness: 0.0, roughness: 0.95 }),
    concreteDark: std({ color: 0x6b6862, metalness: 0.0, roughness: 0.95 }),
    hazard: std({ color: 0xe8b51e, metalness: 0.2, roughness: 0.6 }),
    wood: std({ color: 0x7b5434, metalness: 0.0, roughness: 0.9 }),
    soil: std({ color: 0x4a2f1c, metalness: 0.0, roughness: 1.0 }),
    peat: std({ color: 0x3a2618, metalness: 0.0, roughness: 1.0 }),
    seed: std({ color: 0x6e4a22, metalness: 0.1, roughness: 0.7 }),
    leaf: std({ color: 0x3f9a32, metalness: 0.0, roughness: 0.75 }, { sway: 0 }),
    leafDark: std({ color: 0x245e22, metalness: 0.0, roughness: 0.8 }),
    leafLight: std({ color: 0x7fcf3a, metalness: 0.0, roughness: 0.7 }),
    petal: std({ color: 0xffc21a, metalness: 0.0, roughness: 0.6, emissive: 0x3a2400 }),
    seedHead: std({ color: 0x3b2410, metalness: 0.1, roughness: 0.85 }),
    glass: patchMaterial(new THREE.MeshStandardMaterial({
      color: 0xb8f0ff, metalness: 0.15, roughness: 0.04, transparent: true, opacity: 0.3,
      depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 2.2,
    })),
    window: std({ color: 0x86d8f0, metalness: 0.5, roughness: 0.1, emissive: 0x0d2a33 }),
    water: std({ color: 0x3ab2e0, metalness: 0.2, roughness: 0.15, emissive: 0x06243a, transparent: true, opacity: 0.85 }),
    crystal: std({ color: 0x57f0d2, metalness: 0.2, roughness: 0.2, emissive: 0x1aa88f, emissiveIntensity: 0.9 }),
    growLight: std({ color: 0xff6cf2, emissive: 0xd23cff, emissiveIntensity: 2.2 }),
    pesticide: std({ color: 0x9be22d, metalness: 0.3, roughness: 0.35, emissive: 0x2a4d00 }),
    eye: std({ color: 0xff3b2f, emissive: 0xff2010, emissiveIntensity: 2.5 }),
    tesla: std({ color: 0x9ff6ff, emissive: 0x5ae4ff, emissiveIntensity: 2.4 }),
    wing: patchMaterial(new THREE.MeshStandardMaterial({
      color: 0xd8f6ff, transparent: true, opacity: 0.45, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false,
    })),
    white: std({ color: 0xe8e4d8, metalness: 0.1, roughness: 0.6 }),
    // foliage
    mushroomCap: std({ color: 0xd8423a, roughness: 0.6 }, { sway: 0.02 }),
    mushroomSpot: std({ color: 0xfff2d6, roughness: 0.6, emissive: 0x2a2a1a }, { sway: 0.02 }),
    mushroomStem: std({ color: 0xe9dcc0, roughness: 0.8 }, { sway: 0.02 }),
    fern: std({ color: 0x2f8f3a, roughness: 0.8, side: THREE.DoubleSide }, { sway: 0.07 }),
    fernLight: std({ color: 0x5cbf3a, roughness: 0.8, side: THREE.DoubleSide }, { sway: 0.07 }),
    stalk: std({ color: 0x4f7a2a, roughness: 0.8 }, { sway: 0.05 }),
    bulb: std({ color: 0xc86bff, emissive: 0x7a1fd0, emissiveIntensity: 1.6, roughness: 0.4 }, { sway: 0.05 }),
    monstera: std({ color: 0x1f7a3a, roughness: 0.7, side: THREE.DoubleSide }, { sway: 0.05 }),
    rock: std({ color: 0x77736a, roughness: 0.95 }),
    rockMoss: std({ color: 0x5d7a3a, roughness: 0.95 }),
    grass: lambert({ color: 0x5fa83a, side: THREE.DoubleSide }, { sway: 0.12 }),
  };
  return common;
}

const teamCache = new Map();
export function teamMats(team) {
  if (teamCache.has(team)) return teamCache.get(team);
  const t = TEAMS[team];
  const m = {
    team: std({ color: t.primary, metalness: 0.35, roughness: 0.45 }),
    teamDark: std({ color: t.secondary, metalness: 0.45, roughness: 0.55 }),
    glow: std({ color: t.glow, emissive: t.glow, emissiveIntensity: 1.8 }),
  };
  teamCache.set(team, m);
  return m;
}

// ---------- arthropod faction palettes ----------------------------------------------------
// Every faction exposes the same keys so model code can be shared:
//   chitin · chitinDark · chitinLight (highlight) · membrane (translucent wing/sac skin)
//   eye (compound eye) · organ (signature glowing organ) · bone · flesh · resin (translucent amber/jelly)
//   mud (nest mastic) · metal (bio-tech fittings)
const PALETTES = {
  allied: {
    chitin: [0x2a8fb0, 0.65, 0.28], chitinDark: [0x123a52, 0.6, 0.35], chitinLight: [0x7fe8d8, 0.7, 0.2],
    membrane: 0xbfe8ff, eye: [0x2a0f3a, 0.3, 0.08, 0x3a0a1a], organ: 0xd8ff5a, bone: 0xe8dcc0, flesh: 0xc8a070,
    resin: 0xffb340, mud: 0x8a6a4a, metal: [0xd9a441, 0.9, 0.3],
  },
  soviet: {
    chitin: [0x6a2a16, 0.45, 0.45], chitinDark: [0x22130f, 0.4, 0.55], chitinLight: [0xb04a1e, 0.5, 0.35],
    membrane: 0xd8a070, eye: [0xff2a10, 0.2, 0.2, 0xff2010], organ: 0x7dff3a, bone: 0xd8c8a8, flesh: 0x8a3a2a,
    resin: 0xc86a10, mud: 0x6b5236, metal: [0x5a5a5e, 0.8, 0.45],
  },
  yuri: {
    chitin: [0x5a2e80, 0.5, 0.35], chitinDark: [0x22103a, 0.45, 0.45], chitinLight: [0xb070e0, 0.55, 0.25],
    membrane: 0xd8a8ff, eye: [0xff6af0, 0.2, 0.15, 0xff3ae0], organ: 0xc86bff, bone: 0xe8dcc8, flesh: 0xd07aa8,
    resin: 0xb070ff, mud: 0x4a3a4a, metal: [0x7a7a8a, 0.8, 0.35],
  },
};

const factionCache = new Map();
export function factionMats(faction) {
  if (factionCache.has(faction)) return factionCache.get(faction);
  const p = PALETTES[faction] || PALETTES.allied;
  const shell = ([c, m, r]) => std({ color: c, metalness: m, roughness: r, envMapIntensity: 1.6 });
  const fm = {
    chitin: shell(p.chitin),
    chitinDark: shell(p.chitinDark),
    chitinLight: shell(p.chitinLight),
    membrane: patchMaterial(new THREE.MeshStandardMaterial({
      color: p.membrane, transparent: true, opacity: 0.42, roughness: 0.15, metalness: 0.1,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2,
    })),
    eye: std({ color: p.eye[0], metalness: p.eye[1], roughness: p.eye[2], emissive: p.eye[3], emissiveIntensity: faction === 'allied' ? 0.6 : 2.2 }),
    organ: std({ color: p.organ, emissive: p.organ, emissiveIntensity: 2.0, roughness: 0.4 }),
    bone: std({ color: p.bone, metalness: 0.05, roughness: 0.7 }),
    flesh: std({ color: p.flesh, metalness: 0.05, roughness: 0.55 }),
    resin: patchMaterial(new THREE.MeshStandardMaterial({
      color: p.resin, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.1, emissive: p.resin, emissiveIntensity: 0.35,
      depthWrite: false, envMapIntensity: 2,
    })),
    mud: std({ color: p.mud, metalness: 0.0, roughness: 0.95 }),
    metal: shell(p.metal),
  };
  factionCache.set(faction, fm);
  return fm;
}

// Shared emissive effect materials (same for everyone)
let fxm = null;
export function fxMats() {
  if (fxm) return fxm;
  fxm = {
    spark: std({ color: 0x9ff6ff, emissive: 0x5ae4ff, emissiveIntensity: 2.6 }),
    acid: std({ color: 0x9bff3a, emissive: 0x5adf10, emissiveIntensity: 2.0 }),
    fire: std({ color: 0xffb03a, emissive: 0xff6a10, emissiveIntensity: 2.4 }),
    psy: std({ color: 0xe0a0ff, emissive: 0xb050ff, emissiveIntensity: 2.4 }),
    photon: std({ color: 0xfff6c0, emissive: 0xffe070, emissiveIntensity: 2.6 }),
    chrono: std({ color: 0xc8f0ff, emissive: 0x6ac8ff, emissiveIntensity: 2.4 }),
    blood: std({ color: 0x6aff3a, emissive: 0x2a8a10, emissiveIntensity: 0.6, roughness: 0.3 }),
    dark: std({ color: 0x141414, metalness: 0.3, roughness: 0.6 }),
  };
  return fxm;
}

// Full material set for a model: common + faction palette + effects + team accents.
export function mats(team, faction = 'allied') {
  return { ...commonMats(), ...fxMats(), ...factionMats(faction), ...teamMats(team) };
}

// ---------- procedural pixel-art tile textures -------------------------------------------

function canvasTex(size, painter) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  painter(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function speckle(g, s, rng, colors, count, maxSize = 2) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[(rng() * colors.length) | 0];
    const w = 1 + ((rng() * maxSize) | 0);
    g.fillRect((rng() * s) | 0, (rng() * s) | 0, w, w);
  }
}

export function makeTileTextures() {
  const rng = mulberry32(1337);
  const S = 32;
  const grass = canvasTex(S, (g, s) => {
    g.fillStyle = '#4f8f2e'; g.fillRect(0, 0, s, s);
    speckle(g, s, rng, ['#5ea336', '#3f7a26', '#6bb23e', '#47852b', '#78bf45'], 260, 2);
    for (let i = 0; i < 14; i++) { // little blades
      g.fillStyle = rng() < 0.5 ? '#8ad14f' : '#356b20';
      const x = (rng() * s) | 0, y = (rng() * s) | 0;
      g.fillRect(x, y, 1, 3);
    }
    g.fillStyle = '#f2e35a'; g.fillRect(6, 21, 1, 1); // tiny wildflowers
    g.fillStyle = '#e2f0ff'; g.fillRect(24, 9, 1, 1);
  });
  const soil = canvasTex(S, (g, s) => {
    g.fillStyle = '#5b3a22'; g.fillRect(0, 0, s, s);
    speckle(g, s, rng, ['#6b4529', '#4a2e1a', '#7a5233', '#3e2615', '#866043'], 300, 3);
    // furrows
    g.fillStyle = 'rgba(30,18,8,0.35)';
    for (let y = 3; y < s; y += 8) g.fillRect(0, y, s, 1);
  });
  const brick = canvasTex(S, (g, s) => {
    g.fillStyle = '#5a3a2c'; g.fillRect(0, 0, s, s);
    const cols = ['#a4563a', '#94492f', '#b3653f', '#8c4630', '#a95d3c'];
    const bh = 4, bw = 8;
    for (let row = 0; row < s / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < s / bw + 1; col++) {
        g.fillStyle = cols[(rng() * cols.length) | 0];
        g.fillRect(col * bw + off + 1, row * bh + 1, bw - 1, bh - 1);
        if (rng() < 0.3) { g.fillStyle = 'rgba(255,220,180,0.18)'; g.fillRect(col * bw + off + 1, row * bh + 1, bw - 1, 1); }
      }
    }
    speckle(g, s, rng, ['rgba(60,90,40,0.6)', 'rgba(40,30,20,0.4)'], 30, 1); // moss & grime
  });
  const concrete = canvasTex(S, (g, s) => {
    g.fillStyle = '#8f8b82'; g.fillRect(0, 0, s, s);
    speckle(g, s, rng, ['#9d998f', '#837f76', '#a7a397', '#7a766e'], 280, 2);
    g.fillStyle = '#5f5c56';
    g.fillRect(0, 0, s, 1); g.fillRect(0, 0, 1, s); // slab seams
    // cracks
    g.fillStyle = '#4e4b46';
    let x = (rng() * s) | 0, y = 0;
    while (y < s) { g.fillRect(x, y, 1, 1); y++; x += ((rng() * 3) | 0) - 1; }
    x = 0; y = (rng() * s) | 0;
    while (x < s * 0.6) { g.fillRect(x, y, 1, 1); x++; y += ((rng() * 3) | 0) - 1; }
    speckle(g, s, rng, ['rgba(70,110,40,0.7)'], 10, 1); // weeds in cracks
  });
  return [grass, soil, brick, concrete];
}
