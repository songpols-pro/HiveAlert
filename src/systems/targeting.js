// Shared targeting rules: which weapon an entity uses against a target, and whether it can hit it.

export function targetClass(t) {
  if (t.isBuilding) return 'bldg';
  return t.def.type === 'infantry' ? 'inf' : 'veh';
}

export function weaponCanHit(w, t) {
  if (!w || !t || !t.alive) return false;
  if (w.targets && !w.targets.includes(targetClass(t))) return false;
  const air = t.isUnit && t.hover;
  if (air) { if (!w.air) return false; }
  else if (w.ground === false) return false;
  if (w.special === 'mc') {
    if (t.def.mcImmune || t.controller) return false;
    if (t.isBuilding && !w.targets.includes('bldg')) return false;
  }
  if (w.special === 'drill' && (t.isBuilding || t.def.type !== 'vehicle' || t.status.drilled || t.hover)) return false;
  if (w.special === 'magnet' && (t.hover || t.status.lifted || t.def.type !== 'vehicle')) return false;
  if (w.special === 'bomb' && t.status.bomb) return false;
  if (w.special === 'c4' && t.status.c4) return false;
  return true;
}
