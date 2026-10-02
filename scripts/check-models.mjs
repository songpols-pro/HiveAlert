// Headless model validator.  Usage:  node scripts/check-models.mjs [allied|soviet|yuri|common|all]
// Builds every model for both teams and checks: build errors, required named parts, triangle budget,
// size vs. footprint/height, NaNs, and that every material is FoW-patched (from render/materials.js).
import * as THREE from 'three';
import { BUILDINGS, UNITS } from '../src/data/index.js';
import { bakeModel } from '../src/models/bake.js';

// arg: all | allied | soviet | yuri | common | <faction>/<file>  (e.g. allied/infantry)
const want = process.argv[2] || 'all';
const fileMode = want.includes('/');
const factions = want === 'all' ? ['allied', 'soviet', 'yuri', 'common'] : [fileMode ? want.split('/')[0] : want];
const FILE_FILTER = {
  structures: (d) => d.isBuilding && d.tab !== 'defense',
  defenses: (d) => d.isBuilding && d.tab === 'defense',
  infantry: (d) => d.isUnit && d.type === 'infantry',
  vehicles: (d) => d.isUnit && d.type === 'vehicle',
};

const BUDGET = { building: 9000, defense: 4000, infantry: 1800, vehicle: 5000, common: 5000 };
let problems = 0;

function analyse(root) {
  root.updateMatrixWorld(true);
  let tris = 0, meshes = 0, unpatched = 0, nan = false;
  const names = new Set();
  root.traverse((o) => {
    if (o.name) names.add(o.name);
    if (o.isMesh) {
      meshes++;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      const arr = g.attributes.position.array;
      for (let i = 0; i < arr.length; i += 97) if (!Number.isFinite(arr[i])) { nan = true; break; }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of mats) if (!mt.userData || !mt.userData.patch) unpatched++;
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  return { tris: Math.round(tris), meshes, unpatched, nan, names, box };
}

for (const f of factions) {
  const file = fileMode ? want.split('/')[1] : null;
  const path = f === 'common' ? 'common.js' : fileMode ? `${f}/${file}.js` : `${f}/index.js`;
  const mod = await import(`../src/models/${path}`);
  const reg = f === 'common' ? mod.COMMON_MODELS : fileMode ? mod.MODELS : mod[`${f.toUpperCase()}_MODELS`];
  const kinds = f === 'common'
    ? Object.keys(reg)
    : [...Object.values(BUILDINGS), ...Object.values(UNITS)]
      .filter((d) => d.faction === f && (!file || FILE_FILTER[file](d)))
      .map((d) => d.key);
  console.log(`\n=== ${f.toUpperCase()} (${Object.keys(reg).length}/${kinds.length} models) ===`);
  for (const kind of kinds) {
    const d = BUILDINGS[kind] || UNITS[kind];
    const fn = reg[kind];
    if (!fn) { console.log(`  MISSING  ${kind}`); problems++; continue; }
    const issues = [];
    let info = null;
    try {
      for (const team of [0, 1]) {
        const root = fn(team);
        if (!root || !root.isObject3D) throw new Error('builder did not return an Object3D');
        const a = analyse(root);
        if (team === 0) {
          info = a;
          const baked = bakeModel(root);
          let dc = 0, bones = 0;
          baked.traverse((o) => { if (o.isSkinnedMesh) dc++; if (o.isBone) bones++; });
          info.drawCalls = dc;
          info.bones = bones;
        }
      }
    } catch (e) {
      console.log(`  ERROR    ${kind}: ${e.message}`);
      problems++;
      continue;
    }
    const { tris, unpatched, nan, names, box, drawCalls, bones } = info;
    const size = box.getSize(new THREE.Vector3());
    if (d) {
      for (const p of d.parts || []) if (!names.has(p) && ![...names].some((n) => n.startsWith(p))) issues.push(`missing part '${p}'`);
      const cls = d.isBuilding ? (d.tab === 'defense' ? 'defense' : 'building') : d.type;
      if (tris > BUDGET[cls]) issues.push(`tris ${tris} > budget ${BUDGET[cls]}`);
      if (d.isBuilding) {
        const apron = d.dock || d.exit ? 1.3 : 0.35;
        if (size.x > d.w + 0.35) issues.push(`width ${size.x.toFixed(2)} > footprint ${d.w}`);
        if (size.z > d.h + apron) issues.push(`depth ${size.z.toFixed(2)} > footprint ${d.h}`);
        if (box.max.y < d.height * 0.6 || box.max.y > d.height * 1.4) issues.push(`height ${box.max.y.toFixed(2)} vs ${d.height}`);
        if (box.min.y < -0.05) issues.push(`below ground ${box.min.y.toFixed(2)}`);
      } else {
        const span = Math.max(size.x, size.z);
        if (span > d.radius * 2 * 1.9 + 0.1) issues.push(`span ${span.toFixed(2)} > ~${(d.radius * 2 * 1.9).toFixed(2)}`);
        if (span < d.radius * 2 * 0.6) issues.push(`span ${span.toFixed(2)} too small for radius ${d.radius}`);
        if (box.max.y > (d.height + (d.flyHeight || 0)) * 1.6 + 0.1) issues.push(`height ${box.max.y.toFixed(2)} vs ${d.height}`);
        if (box.min.y < -0.05) issues.push(`below ground ${box.min.y.toFixed(2)}`);
      }
    }
    if (nan) issues.push('NaN vertices');
    if (unpatched) issues.push(`${unpatched} mesh(es) use materials not from mats() (fog of war will break)`);
    if (bones > 48) issues.push(`${bones} bones (too many named nodes)`);
    problems += issues.length;
    const sz = `${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}`;
    console.log(`  ${issues.length ? 'WARN ' : 'ok   '}   ${kind.padEnd(22)} tris ${String(tris).padStart(5)}  draws ${drawCalls}  bones ${String(bones).padStart(2)}  size ${sz}${issues.length ? '\n           - ' + issues.join('\n           - ') : ''}`);
  }
}
console.log(`\n${problems ? problems + ' issue(s)' : 'All models OK'}`);
