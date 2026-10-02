// Single entry point for game content.
import { BUILDINGS } from './buildings.js';
import { UNITS } from './units.js';
import { WEAPONS, WARHEADS, ARMOR_NAMES } from './weapons.js';
import { FACTIONS, FACTION_KEYS, SUPERWEAPONS } from './factions.js';

export { BUILDINGS, UNITS, WEAPONS, WARHEADS, ARMOR_NAMES, FACTIONS, FACTION_KEYS, SUPERWEAPONS };

for (const [k, d] of Object.entries(BUILDINGS)) { d.key = k; d.isBuilding = true; }
for (const [k, d] of Object.entries(UNITS)) { d.key = k; d.isUnit = true; }
for (const [k, w] of Object.entries(WEAPONS)) w.key = k;

export function def(kind) { return BUILDINGS[kind] || UNITS[kind] || null; }
export const isBuildingKind = (kind) => !!BUILDINGS[kind];
export const isUnitKind = (kind) => !!UNITS[kind];

export function kindsOf(faction, pred = () => true) {
  const out = [];
  for (const d of Object.values(BUILDINGS)) if (d.faction === faction && pred(d)) out.push(d.key);
  for (const d of Object.values(UNITS)) if (d.faction === faction && pred(d)) out.push(d.key);
  return out;
}

// production tab for a kind: 'structures' | 'defense' | 'infantry' | 'vehicles'
export function tabOf(kind) {
  const d = def(kind);
  return d.tab;
}

export function weaponDamageMul(warhead, armor) {
  const w = WARHEADS[warhead] || WARHEADS.special;
  return w[armor] ?? 1;
}
