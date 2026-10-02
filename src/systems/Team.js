// Per-team state: faction, nutrients (credits), power balance (with drains, blackouts and
// Larval Vat garrisons), structure counts by kind & role, spy bonuses and stats.
import { START_CREDITS, TEAMS } from '../config.js';
import { FACTIONS } from '../data/index.js';
import { Production } from './Production.js';

export class Team {
  constructor(game, id, faction) {
    this.game = game;
    this.id = id;
    this.info = TEAMS[id];
    this.faction = faction;
    this.fdef = FACTIONS[faction];
    this.credits = START_CREDITS;
    this.powerSupply = 0;
    this.powerDemand = 0;
    this.lowPower = false;
    this.blackout = 0;
    this.counts = {};
    this.roles = {};
    this.vetInfantry = false;
    this.vetVehicles = false;
    this.production = new Production(game, id);
    this.stats = { built: 0, lost: 0, killed: 0, harvested: 0 };
    this.defeated = false;
  }

  has(kind) { return (this.counts[kind] || 0) > 0; }
  count(kind) { return this.counts[kind] || 0; }
  hasRole(role) { return (this.roles[role] || 0) > 0; }
  roleCount(role) { return this.roles[role] || 0; }

  update(dt) {
    if (this.blackout > 0) this.blackout = Math.max(0, this.blackout - dt);
  }

  recompute() {
    let sup = 0, dem = 0;
    const counts = {}, roles = {};
    for (const b of this.game.buildings) {
      if (b.team !== this.id || !b.alive || b.state !== 'active') continue;
      counts[b.kind] = (counts[b.kind] || 0) + 1;
      roles[b.def.role] = (roles[b.def.role] || 0) + 1;
      const p = b.def.power;
      if (p > 0) {
        if (!b.drainedBy) sup += p * (0.5 + 0.5 * (b.hp / b.maxHp)) + (b.def.garrisonPower || 0) * b.passengers.length;
      } else dem += -p;
    }
    // a deployed Brood Queen counts as a Yuri refinery
    for (const u of this.game.units) {
      if (u.team === this.id && u.alive && u.def.slaveMiner) roles.refinery = (roles.refinery || 0) + 1;
    }
    if (this.blackout > 0) sup = 0;
    this.counts = counts;
    this.roles = roles;
    this.powerSupply = Math.round(sup);
    this.powerDemand = dem;
    const wasLow = this.lowPower;
    this.lowPower = dem > sup;
    if (this.lowPower && !wasLow) this.game.emitEva(this.id, 'Low power', 'alarm');
    else if (!this.lowPower && wasLow) this.game.emitEva(this.id, 'Power restored', 'ready');
  }

  get hasRadar() {
    if (this.lowPower) return false;
    return this.game.buildings.some((b) => b.team === this.id && b.alive && b.isActive && b.def.radar);
  }
}
