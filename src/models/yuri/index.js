// YURI faction model registry. Each file exports MODELS = { kind: (team) => THREE.Group }.
import { MODELS as STRUCTURES } from './structures.js';
import { MODELS as DEFENSES } from './defenses.js';
import { MODELS as INFANTRY } from './infantry.js';
import { MODELS as VEHICLES } from './vehicles.js';

export const YURI_MODELS = { ...STRUCTURES, ...DEFENSES, ...INFANTRY, ...VEHICLES };
