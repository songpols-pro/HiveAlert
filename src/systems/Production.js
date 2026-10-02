// RA2-style production per team: one structure slot + one defense slot (build, then place),
// and infantry & vehicle queues produced in parallel. Credits drain progressively; low power halves speed;
// extra barracks/factories speed production up.
import { BUILDINGS, UNITS, def as defOf } from '../data/index.js';

const PRODUCER = { structures: 'cy', defense: 'cy', infantry: 'barracks', vehicles: 'factory' };

export class Production {
  constructor(game, team) {
    this.game = game;
    this.team = team;
    this.slots = { structures: null, defense: null };
    this.queues = { infantry: [], vehicles: [] };
    this.fundsWarned = false;
  }

  static queueOf(kind) { return defOf(kind).tab; }

  get T() { return this.game.teams[this.team]; }

  available(kind) {
    const T = this.T;
    const d = defOf(kind);
    if (!d || d.buildable === false || d.faction !== T.faction) return false;
    if (!T.hasRole(PRODUCER[d.tab])) return false;
    if (!(d.prereq || []).every((p) => T.has(p))) return false;
    if (d.hero && (this.game.units.some((u) => u.alive && u.team === this.team && u.kind === kind) || this.countQueued(kind) > 0)) return false;
    if (d.limit && T.count(kind) + (this.itemFor(kind) ? 1 : 0) >= d.limit) return false;
    return true;
  }

  missingPrereq(kind) {
    const T = this.T;
    const d = defOf(kind);
    const prodRole = PRODUCER[d.tab];
    if (!T.hasRole(prodRole)) {
      const k = Object.values(BUILDINGS).find((b) => b.faction === T.faction && b.role === prodRole);
      return k ? k.name : prodRole;
    }
    const miss = (d.prereq || []).find((p) => !T.has(p));
    if (miss) return BUILDINGS[miss].name;
    if (d.hero) return 'Only one hero at a time';
    if (d.limit) return `Limit ${d.limit}`;
    return null;
  }

  start(kind) {
    if (!this.available(kind)) return 'unavailable';
    const q = Production.queueOf(kind);
    if (q === 'infantry' || q === 'vehicles') {
      if (this.queues[q].length >= 15) return 'full';
      this.queues[q].push({ kind, progress: 0, paid: 0, hold: false });
      return 'queued';
    }
    const slot = this.slots[q];
    if (slot) {
      if (slot.kind === kind && slot.hold) { slot.hold = false; return 'resumed'; }
      if (slot.kind === kind && slot.ready) return 'ready';
      return 'busy';
    }
    this.slots[q] = { kind, progress: 0, paid: 0, hold: false, ready: false };
    return 'building';
  }

  // right-click: hold, then cancel (refund what was paid)
  cancel(kind) {
    const T = this.T;
    const q = Production.queueOf(kind);
    if (q === 'infantry' || q === 'vehicles') {
      const list = this.queues[q];
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i];
        if (it.kind !== kind) continue;
        if (i === 0 && it.progress > 0 && !it.hold) { it.hold = true; return 'hold'; }
        T.credits += it.paid;
        list.splice(i, 1);
        return 'canceled';
      }
      return null;
    }
    const slot = this.slots[q];
    if (!slot || slot.kind !== kind) return null;
    if (!slot.hold && !slot.ready) { slot.hold = true; return 'hold'; }
    T.credits += slot.paid;
    this.slots[q] = null;
    return 'canceled';
  }

  countQueued(kind) {
    const q = Production.queueOf(kind);
    if (q === 'infantry' || q === 'vehicles') return this.queues[q].filter((u) => u.kind === kind).length;
    return this.slots[q] && this.slots[q].kind === kind ? 1 : 0;
  }

  itemFor(kind) {
    const q = Production.queueOf(kind);
    if (q === 'infantry' || q === 'vehicles') return this.queues[q].find((u) => u.kind === kind) || null;
    const s = this.slots[q];
    return s && s.kind === kind ? s : null;
  }

  isBusy(kind) {
    const q = Production.queueOf(kind);
    if (q === 'infantry' || q === 'vehicles') return false;
    const s = this.slots[q];
    return !!s && s.kind !== kind;
  }

  tick(item, d, dt) {
    const T = this.T;
    const dp = dt / d.buildTime;
    const cost = d.cost * dp;
    if (T.credits >= cost) {
      T.credits -= cost;
      item.paid += cost;
      item.progress = Math.min(1, item.progress + dp);
      this.fundsWarned = false;
      return true;
    }
    if (!this.fundsWarned) {
      this.fundsWarned = true;
      this.game.emitEva(this.team, 'Insufficient funds', 'error');
    }
    return false;
  }

  update(dt) {
    const T = this.T;
    const mul = (T.lowPower ? 0.5 : 1) * (this.game.cheatSpeed || 1);
    for (const q of ['structures', 'defense']) {
      const s = this.slots[q];
      if (!s || s.ready || s.hold || !T.hasRole('cy')) continue;
      this.tick(s, BUILDINGS[s.kind], dt * mul);
      if (s.progress >= 1) {
        s.ready = true;
        this.game.onStructureReady(this.team, s.kind);
      }
    }
    for (const [q, role] of [['infantry', 'barracks'], ['vehicles', 'factory']]) {
      const list = this.queues[q];
      const producers = T.roleCount(role);
      if (!list.length || !producers) continue;
      const it = list[0];
      if (it.hold) continue;
      const fmul = 1 + (Math.min(4, producers) - 1) * 0.4;
      this.tick(it, UNITS[it.kind], dt * mul * fmul);
      if (it.progress >= 1 && this.game.spawnProduced(this.team, it.kind)) list.shift();
    }
    for (const b of this.game.buildings) {
      if (b.team !== this.team) continue;
      if (b.def.produces === 'infantry') b.producing = this.queues.infantry.length > 0;
      else if (b.def.produces === 'vehicles') b.producing = this.queues.vehicles.length > 0;
    }
  }

  takeReady(kind) {
    const q = Production.queueOf(kind);
    const s = this.slots[q];
    if (s && s.kind === kind && s.ready) { this.slots[q] = null; return true; }
    return false;
  }
}
