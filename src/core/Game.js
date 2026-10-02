// Central simulation hub: map, entities, teams (with factions), fog, combat, abilities,
// superweapons and AI, plus the queries used by the UI and input layers.
import * as THREE from 'three';
import { LAYOUT, TEAM, MAP_W, MAP_H } from '../config.js';
import { BUILDINGS, UNITS, FACTIONS } from '../data/index.js';
import { EventBus, rand } from './util.js';
import { MapGrid } from '../world/MapGrid.js';
import { Terrain } from '../world/Terrain.js';
import { Pathfinder } from '../world/Pathfinder.js';
import { FogOfWar } from '../world/FogOfWar.js';
import { Effects } from '../fx/Effects.js';
import { Combat } from '../systems/Combat.js';
import { Abilities } from '../systems/Abilities.js';
import { Superweapons } from '../systems/Superweapons.js';
import { Team } from '../systems/Team.js';
import { AIController } from '../systems/AIController.js';
import { Building } from '../entities/Building.js';
import { Unit } from '../entities/Unit.js';
import { createModel } from '../models/index.js';
import { audio } from '../audio/Audio.js';

const _v = new THREE.Vector3();
const GOO = { allied: 0xffd84a, soviet: 0x8aff3a, yuri: 0xff7ad8 };

export class Game {
  constructor(renderer, camera, opts = {}) {
    const { playerFaction = 'allied', enemyFaction = 'soviet' } = opts;
    this.renderer = renderer;
    this.scene = renderer.scene;
    this.camera = camera;
    this.bus = new EventBus();
    this.time = 0;
    this.state = 'playing';
    this.map = new MapGrid();
    this.terrain = new Terrain(this.scene, this.map);
    this.pathfinder = new Pathfinder(this.map);
    this.fog = new FogOfWar();
    this.fx = new Effects(this.scene);
    this.combat = new Combat(this);
    this.abilities = new Abilities(this);
    this.superweapons = new Superweapons(this);
    this.teams = [new Team(this, 0, playerFaction), new Team(this, 1, enemyFaction)];
    this.units = [];
    this.buildings = [];
    this.primary = [{}, {}];
    this.tempSights = [];
    this.gaps = [];
    this.ai = new AIController(this, TEAM.ENEMY);
    this.fogT = 0;
    this.teamT = 0;
    this.regrowT = 0;
    this.endT = 0;
    this.sporeT = 0;
    this.evaCooldown = {};
    this.setupInitial();
    this.recomputeTeams();
    this.computeFog();
  }

  get player() { return this.teams[0]; }

  // ------------------------------------------------------------------ setup
  roleKind(team, role) {
    const f = FACTIONS[this.teams[team].faction];
    return f.roles[role];
  }

  setupInitial() {
    const P = LAYOUT.playerHQ, E = LAYOUT.enemyHQ;
    this.spawnBuilding(this.roleKind(0, 'cy'), 0, P.x, P.z, { instant: true, silent: true });
    this.spawnStartUnits(0, P.x + 1.5, P.z + 4.5, Math.PI * 1.25);

    this.spawnBuilding(this.roleKind(1, 'cy'), 1, E.x, E.z, { instant: true, silent: true });
    for (const [role, dx, dz] of LAYOUT.enemyBase) {
      const kind = this.roleKind(1, role);
      if (!kind || !BUILDINGS[kind]) continue;
      this.spawnBuilding(kind, 1, E.x + dx, E.z + dz, { instant: true, silent: true });
    }
    this.spawnStartUnits(1, E.x + 6, E.z + 9.5, 0.8);
    this.camera.centerOn(P.x + 1.5, P.z + 3);
  }

  spawnStartUnits(team, x, z, heading) {
    const f = FACTIONS[this.teams[team].faction];
    let i = 0;
    for (const [kind, n] of f.startUnits) {
      for (let k = 0; k < n; k++, i++) {
        const u = this.spawnUnit(kind, team, x + (i % 4) * 0.9 - 1.3, z + Math.floor(i / 4) * 0.9, heading);
        if (u.def.slaveMiner) { u.hWait = 1.5; }
      }
    }
  }

  // ------------------------------------------------------------------ spawning
  spawnBuilding(kind, team, tx, tz, opts = {}) {
    const b = new Building(this, kind, team, tx, tz, opts);
    this.map.setBuilding(b.id, tx, tz, b.w, b.h, !!b.def.walkable);
    this.buildings.push(b);
    if (team !== 0) { b.seen = false; b.root.visible = false; }
    if (opts.instant) this.onBuildingComplete(b, true);
    else if (team === 0) audio.play('place', b.position);
    return b;
  }

  spawnUnit(kind, team, x, z, heading = 0, force = false) {
    if (!force && UNITS[kind].loco !== 'hover' && !this.map.passable(Math.floor(x), Math.floor(z))) {
      const p = this.map.nearestPassable(Math.floor(x), Math.floor(z), 6);
      if (p) { x = p.x + 0.5; z = p.z + 0.5; }
    }
    const u = new Unit(this, kind, team, x, z, heading);
    this.units.push(u);
    const T = this.teams[team];
    if ((u.isInfantry && T.vetInfantry) || (u.isVehicle && T.vetVehicles)) u.makeVeteran();
    if (team !== 0) u.root.visible = false;
    return u;
  }

  producer(team, role) {
    let f = this.primary[team][role];
    if (!f || !f.alive || !f.isActive || f.team !== team) {
      f = this.buildings.find((b) => b.team === team && b.def.role === role && b.isActive && b.alive);
      this.primary[team][role] = f || null;
    }
    return f;
  }

  spawnProduced(team, kind) {
    const d = UNITS[kind];
    const role = d.type === 'infantry' ? 'barracks' : 'factory';
    const f = this.producer(team, role);
    if (!f) return false;
    const exit = f.dockPos(_v).clone();
    const u = this.spawnUnit(kind, team, exit.x, exit.z - (d.type === 'infantry' ? 0.6 : 0.9), 0, true);
    f.doorT = 2.0;
    const tgt = f.rally || exit;
    if (u.isHarvester || u.def.slaveMiner) u.setPath(exit.x, exit.z + 1);
    else u.moveTo(tgt.x + rand(-0.6, 0.6), tgt.z + rand(-0.4, 0.6));
    if (team === 0) {
      this.emitEva(0, 'Unit ready', 'ready');
      this.bus.emit('unitBuilt', u);
    }
    this.teams[team].stats.built++;
    // Dual Brood Pupa Chambers: free clone of every hatched infantry
    if (d.type === 'infantry' && !d.hero && !d.spy) {
      for (const vat of this.buildings) {
        if (vat.team !== team || !vat.def.clone || !vat.isActive || !vat.powered) continue;
        const e = vat.dockPos(new THREE.Vector3());
        const c = this.spawnUnit(kind, team, e.x, e.z - 0.5, 0, true);
        c.moveTo(e.x + rand(-0.8, 0.8), e.z + 1 + rand(0, 0.8));
        this.fx.goo(e.clone().setY(0.4), 0xff7ad8, 6);
      }
    }
    return true;
  }

  onBuildingComplete(b, silent = false) {
    this.recomputeTeams();
    if (b.def.freeUnit) {
      const d = b.dockPos(_v);
      const h = this.spawnUnit(b.def.freeUnit, b.team, d.x, d.z, Math.PI);
      h.hWait = 1.0;
    }
    if (b.def.produces && !this.primary[b.team][b.def.role]) this.primary[b.team][b.def.role] = b;
    this.superweapons.onBuilt(b);
    if (!silent && b.team === 0) this.bus.emit('buildingComplete', b);
  }

  onStructureReady(team, kind) {
    if (team === 0) {
      this.emitEva(0, 'Construction complete', 'ready');
      this.bus.emit('structureReady', kind);
    }
  }

  onBuildingSold(b) {
    const refund = Math.round(b.def.cost * 0.5 * (b.hp / b.maxHp));
    this.teams[b.team].credits += refund;
    this.removeBuilding(b);
    this.fx.dust(b.position, 8);
    if (b.team === 0) {
      this.emitEva(0, 'Structure sold', 'sell');
      this.bus.emit('floatText', { x: b.position.x, z: b.position.z, text: `+$${refund}`, color: '#ffe066' });
    }
  }

  removeBuilding(b) {
    b.alive = false;
    this.abilities.releaseControlled(b);
    this.map.clearBuilding(b.tx, b.tz, b.w, b.h);
    const i = this.buildings.indexOf(b);
    if (i >= 0) this.buildings.splice(i, 1);
    b.dispose();
    for (const r of Object.keys(this.primary[b.team])) if (this.primary[b.team][r] === b) this.primary[b.team][r] = null;
    for (const u of this.units) {
      if (u.dockRef === b) { u.dockRef = null; if (['unloading', 'docking', 'waitDock', 'toRefinery'].includes(u.hstate)) u.hstate = 'toRefineryStart'; }
      if (u.order.type === 'drain' && u.order.target === b) u.order = { type: 'idle' };
    }
    this.bus.emit('removed', b);
    this.recomputeTeams();
  }

  // silent removal (recycled, boarded, deployed, infiltrated…)
  removeUnit(u) {
    if (!u.alive) return;
    u.alive = false;
    this.abilities.releaseControlled(u);
    if (u.controller) u.controller.controlled = u.controller.controlled.filter((c) => c !== u);
    u.releaseDock?.();
    if (u.radField) u.radField.t = 4;
    if (u.inside) {
      const host = u.inside;
      host.passengers = host.passengers.filter((p) => p !== u);
      if (host.chargers) { host.chargers = host.chargers.filter((p) => p !== u); host.charges = host.chargers.length; }
    }
    if (u.status.drilled) {
      const mite = u.status.drilled.mite;
      if (mite && mite.alive) { mite.inside = null; mite.position.copy(u.position); mite.root.visible = true; mite.order = { type: 'idle' }; }
    }
    const i = this.units.indexOf(u);
    if (i >= 0) this.units.splice(i, 1);
    if (u.shrub) u.shrub.removeFromParent();
    u.dispose();
    this.bus.emit('removed', u);
  }

  // ------------------------------------------------------------------ damage & death
  onDamaged(e, attacker) {
    if (attacker && attacker.alive && attacker.team !== e.team) {
      for (const u of this.units) {
        if (u.team !== e.team || !u.hasWeapon || u.inside || u.order.type !== 'idle' || (u.target && u.target.alive)) continue;
        if (Math.abs(u.position.x - e.position.x) > 9 || Math.abs(u.position.z - e.position.z) > 9) continue;
        if (u.weaponFor(attacker) && this.canTarget(u, attacker)) u.target = attacker;
      }
    }
    if (e.team !== 0) {
      if (attacker && attacker.team === 0 && e.isBuilding && !e.seen) { e.seen = true; e.root.visible = true; }
      return;
    }
    if (e.isBuilding) {
      if (this.evaReady('baseAttack', 12)) { this.emitEva(0, 'Structure under attack', 'alarm'); this.bus.emit('ping', e.position.x, e.position.z); }
    } else if (e.isMiner) {
      if (this.evaReady('harvAttack', 12)) { this.emitEva(0, 'Harvester under attack', 'alarm'); this.bus.emit('ping', e.position.x, e.position.z); }
    } else if (this.evaReady('unitAttack', 25)) {
      this.emitEva(0, 'Unit under attack', null);
      this.bus.emit('ping', e.position.x, e.position.z);
    }
  }

  destroy(e, attacker) {
    if (!e.alive) return;
    const seen = e.team === 0 || this.fog.isVisible(e.position.x, e.position.z) || (e.isBuilding && e.seen);
    if (attacker && this.teams[attacker.team]) this.teams[attacker.team].stats.killed++;
    this.teams[e.team].stats.lost++;
    if (e.status.bomb) this.abilities.explodeBomb(e);
    if (e.status.drilled) {
      const mite = e.status.drilled.mite;
      if (mite && mite.alive) {
        mite.inside = null;
        mite.position.copy(e.position);
        mite.root.visible = true;
        mite.order = { type: 'idle' };
      }
    }
    if (e.isBuilding) {
      // garrisoned infantry escape a collapsing structure
      this.abilities.ejectAll(e);
      this.fx.buildingExplosion(e.position.x, e.position.z, e.w, e.h);
      this.fx.scorch(e.position.x, e.position.z, Math.max(e.w, e.h) * 0.9, 60);
      this.fx.addRubble(e.position.x, e.position.z, e.w, e.h);
      if (seen) { audio.play('bigExplode', e.position, 1); this.camera.shake = 0.18; }
      this.removeBuilding(e);
      if (e.team === 0) this.emitEva(0, 'Structure lost', null);
      return;
    }
    // transports take their passengers with them
    for (const p of e.passengers.slice()) if (p.alive) this.removeUnit(p);
    e.passengers = [];
    if (e.isInfantry) {
      this.fx.goo(e.position.clone().setY(e.hover ? e.flyH : 0.2), GOO[e.faction] || 0x8aff3a, 12);
      this.fx.splat(e.position.x, e.position.z, GOO[e.faction] || 0x8aff3a);
      if (seen) audio.play('squelch', e.position, 0.6);
    } else {
      const big = e.radius > 0.6 ? 1.6 : e.radius < 0.3 ? 0.6 : 1;
      this.fx.explosion(e.position.clone().setY(0.3 + (e.hover ? e.flyH : 0)), big);
      this.fx.goo(e.position.clone().setY(0.3), GOO[e.faction] || 0x8aff3a, 8);
      this.fx.scorch(e.position.x, e.position.z, 0.7 * big, 25);
      if (seen) { audio.play('explode', e.position, 0.9); this.camera.shake = Math.max(this.camera.shake, 0.08); }
    }
    this.removeUnit(e);
    if (e.team === 0 && !e.def.drone && this.evaReady('unitLost', 6)) this.emitEva(0, 'Unit lost', null);
  }

  // chrono erasure: removed from the timeline, no wreck
  erase(e, by) {
    if (!e.alive) return;
    this.fx.chronoFlash(e.position.clone().setY(0.5), e.isBuilding ? 2 : 1);
    if (this.isVisibleToPlayer(e)) audio.play('chrono', e.position, 0.8);
    if (by && this.teams[by.team]) this.teams[by.team].stats.killed++;
    this.teams[e.team].stats.lost++;
    if (e.isBuilding) { this.abilities.ejectAll(e); this.removeBuilding(e); if (e.team === 0) this.emitEva(0, 'Structure erased', null); }
    else { for (const p of e.passengers.slice()) if (p.alive) this.removeUnit(p); this.removeUnit(e); }
  }

  onTeamChanged(e, oldTeam) {
    if (e.isUnit) {
      e.releaseDock?.();
      e.target = null;
      if (e.isHarvester) { e.hstate = 'toRefineryStart'; e.order = { type: 'harvest' }; }
      if (e.def.slaveMiner) for (const d of e.drones) if (d.alive) d.setTeam(e.team);
      if (e.team !== 0) e.root.visible = this.fog.isVisible(e.position.x, e.position.z);
    } else {
      e.seen = true;
      e.root.visible = true;
      if (e.def.produces && this.primary[oldTeam][e.def.role] === e) this.primary[oldTeam][e.def.role] = null;
    }
    if (oldTeam === 0) this.bus.emit('removed', e, true);
    this.recomputeTeams();
  }

  // ------------------------------------------------------------------ economy
  addCredits(team, amt, ref) {
    const T = this.teams[team];
    const bonus = this.buildings.some((b) => b.team === team && b.alive && b.isActive && b.def.purifier) ? 1.25 : 1;
    amt *= bonus;
    T.credits += amt;
    T.stats.harvested += amt;
    if (team === 0) this.bus.emit('income', ref, amt);
  }

  recomputeTeams() { for (const t of this.teams) t.recompute(); }

  addTempSight(team, x, z, r, t) { if (team === 0) this.tempSights.push({ x, z, r, t }); }

  // ------------------------------------------------------------------ EVA announcer
  evaReady(key, cd) {
    const last = this.evaCooldown[key] ?? -999;
    if (this.time - last < cd) return false;
    this.evaCooldown[key] = this.time;
    return true;
  }

  emitEva(team, text, sound) {
    if (team !== 0) return;
    this.bus.emit('eva', text, sound);
  }

  // ------------------------------------------------------------------ queries
  isVisibleToPlayer(e) {
    if (e.team === 0) return true;
    return this.fog.isVisible(e.position.x, e.position.z);
  }
  isVisibleToPlayerPos(x, z) { return this.fog.isVisible(x, z); }

  inGap(team, x, z) {
    for (const g of this.gaps) if (g.team !== team && (g.x - x) ** 2 + (g.z - z) ** 2 < g.r * g.r) return true;
    return false;
  }

  mirageHidden(t) { return t.isUnit && t.def.mirage && t.stillT > 1.5; }

  canTarget(attacker, t, forced = false) {
    if (!t || !t.alive) return false;
    // a target being chrono-erased is out of time for everyone except its eraser
    if (!t.targetable && !(t.status.erasing && t.status.erasing.by === attacker && !t.inside)) return false;
    const dist = () => Math.hypot(t.position.x - attacker.position.x, t.position.z - attacker.position.z);
    if (t.team !== attacker.team) {
      if (this.mirageHidden(t) && dist() > 1.6) return false;
      if (t.isUnit && t.disguised) {
        const det = attacker.def && attacker.def.detector;
        if (!det && !forced) return false;
      }
    }
    if (attacker.team === 0) {
      if (t.isBuilding) return !!t.seen || this.fog.isVisible(t.position.x, t.position.z);
      return this.fog.isVisible(t.position.x, t.position.z);
    }
    if (t.team === 0 && this.inGap(attacker.team, t.position.x, t.position.z) && dist() > 3) return false;
    return true;
  }

  findTarget(e, range, opts = {}) {
    let best = null, bs = Infinity;
    const consider = (o) => {
      if (!o.alive || o === e || !o.targetable) return;
      if (!opts.any && o.team === e.team) return;
      if (o.isBuilding && o.state === 'selling') return;
      const w = e.weaponFor(o);
      if (!w) return;
      const d = e.distTo(o);
      if (d > range) return;
      if (w.minRange && d < w.minRange) return;
      if (!this.canTarget(e, o)) return;
      let s = d + (o.isBuilding ? 2.5 : 0) - (o.hasWeapon || o.weapon ? 0.8 : 0) - (o.isMiner ? 0.3 : 0);
      if (w.special === 'mc') s -= (o.def.cost || 0) / 600;
      if (o.isUnit && o.disguised) s -= 3;
      if (s < bs) { bs = s; best = o; }
    };
    for (const u of this.units) consider(u);
    for (const b of this.buildings) consider(b);
    return best;
  }

  entitiesNear(x, z, r) {
    const out = [];
    for (const u of this.units) if (!u.inside && Math.abs(u.position.x - x) < r && Math.abs(u.position.z - z) < r) out.push(u);
    for (const b of this.buildings) if (b.distFrom(x, z) < r) out.push(b);
    return out;
  }

  nearestBuildingRole(team, role, pos) {
    let best = null, bd = Infinity;
    for (const b of this.buildings) {
      if (b.team !== team || b.def.role !== role || !b.alive || !b.isActive) continue;
      const d = b.position.distanceTo(pos);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  claimedTiles(self) {
    const s = new Set();
    for (const u of this.units) {
      if (u === self || !u.alive) continue;
      if ((u.isHarvester && (u.hstate === 'toField' || u.hstate === 'harvesting')) || (u.def.drone && (u.dstate === 'toField' || u.dstate === 'dig'))) s.add(u.htile);
    }
    return s;
  }

  placementCheck(team, kind, tx, tz) {
    const def = BUILDINGS[kind];
    const map = this.map;
    const cells = [];
    let ok = true;
    for (let z = tz; z < tz + def.h; z++) for (let x = tx; x < tx + def.w; x++) {
      let c = map.inBounds(x, z);
      if (c) {
        const i = map.idx(x, z);
        c = map.blocked[i] === 0 && !map.occ[i] && map.res[i] <= 0;
        if (c && team === 0 && !this.fog.exploredTile[i]) c = false;
      }
      if (c) {
        for (const u of this.units) {
          if (u.inside || u.hover) continue;
          if (Math.floor(u.position.x) === x && Math.floor(u.position.z) === z) { c = false; break; }
        }
      }
      cells.push({ x, z, ok: c });
      if (!c) ok = false;
    }
    const exit = def.dock || def.exit;
    if (exit) {
      const ex = tx + exit.x, ez = tz + exit.z;
      const c = map.passable(ex, ez) && !map.occ[map.idx(ex, ez)];
      cells.push({ x: ex, z: ez, ok: c, exit: true });
      if (!c) ok = false;
    }
    let near = false;
    for (const b of this.buildings) {
      if (b.team !== team || !b.alive) continue;
      const dx = Math.max(b.tx - (tx + def.w), 0, tx - (b.tx + b.w));
      const dz = Math.max(b.tz - (tz + def.h), 0, tz - (b.tz + b.h));
      if (Math.max(dx, dz) <= 3) { near = true; break; }
    }
    if (!near) ok = false;
    return { ok, near, cells };
  }

  findPlacement(team, kind, around = null) {
    const def = BUILDINGS[kind];
    const home = around || this.buildings.find((b) => b.team === team && b.def.role === 'cy' && b.alive) || this.buildings.find((b) => b.team === team && b.alive);
    if (!home) return null;
    const cx = Math.floor(home.position.x), cz = Math.floor(home.position.z);
    const cands = [];
    for (let r = 2; r <= 13; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        cands.push({ x: cx + dx - Math.floor(def.w / 2), z: cz + dz - Math.floor(def.h / 2), r });
      }
    }
    const fallback = [];
    for (const c of cands) {
      if (!this.placementCheck(team, kind, c.x, c.z).ok) continue;
      let gapOk = true;
      for (let z = c.z - 1; z <= c.z + def.h && gapOk; z++) for (let x = c.x - 1; x <= c.x + def.w; x++) {
        if (x >= c.x && x < c.x + def.w && z >= c.z && z < c.z + def.h) continue;
        if (this.map.inBounds(x, z) && this.map.occ[this.map.idx(x, z)]) { gapOk = false; break; }
      }
      if (gapOk && Math.random() < 0.35) return c;
      fallback.push({ c, gapOk });
    }
    const pick = fallback.find((f) => f.gapOk) || fallback[0];
    return pick ? pick.c : null;
  }

  // ------------------------------------------------------------------ fog & visibility
  computeFog() {
    const src = [];
    const protect = [];
    for (const u of this.units) if (u.team === 0 && !u.inside) { src.push({ x: u.position.x, z: u.position.z, r: u.sight }); protect.push(u.position); }
    for (const b of this.buildings) if (b.team === 0) { src.push({ x: b.position.x, z: b.position.z, r: b.sight + Math.max(b.w, b.h) * 0.4 }); protect.push(b.position); }
    for (const s of this.tempSights) src.push(s);
    this.fog.compute(src);
    if (this.buildings.some((b) => b.team === 0 && b.def.revealMap && b.isActive && b.powered)) this.fog.exploreAll();
    this.gaps = [];
    for (const b of this.buildings) if (b.def.gap && b.isActive && b.powered) this.gaps.push({ x: b.position.x, z: b.position.z, r: b.def.gap, team: b.team });
    if (!this.fog.revealed) for (const g of this.gaps) if (g.team !== 0) this.fog.shroudCircle(g.x, g.z, g.r, protect);

    for (const u of this.units) {
      if (u.inside) continue;
      const vis = u.team === 0 || this.fog.isVisible(u.position.x, u.position.z);
      const hidden = this.mirageHidden(u);
      if (u.def.mirage) {
        if (hidden && !u.shrub) {
          u.shrub = createModel('mirageShrub', u.team).root;
          this.scene.add(u.shrub);
        }
        if (u.shrub) {
          u.shrub.visible = hidden && vis;
          u.shrub.position.set(u.position.x, 0, u.position.z);
          u.shrub.rotation.y = u.id;
        }
      }
      u.root.visible = vis && !hidden;
    }
    for (const b of this.buildings) {
      if (b.team === 0) continue;
      const f = this.fog;
      const anyVis = f.isVisible(b.position.x, b.position.z) || f.isVisible(b.tx + 0.5, b.tz + 0.5) || f.isVisible(b.tx + b.w - 0.5, b.tz + b.h - 0.5) ||
        f.isVisible(b.tx + 0.5, b.tz + b.h - 0.5) || f.isVisible(b.tx + b.w - 0.5, b.tz + 0.5);
      if (anyVis || (f.isExplored(b.position.x, b.position.z) && this.buildings.some((o) => o.team === 0 && o.def.revealMap && o.isActive && o.powered))) b.seen = true;
      const gapped = !anyVis && this.inGap(0, b.position.x, b.position.z);
      b.root.visible = !!b.seen && !gapped;
    }
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    this.time += dt;
    for (const t of this.teams) { t.update(dt); t.production.update(dt); }
    if (this.state === 'playing') this.ai.update(dt);

    for (const u of this.units.slice()) if (u.alive) u.update(dt);
    this.separate();
    for (const b of this.buildings.slice()) {
      if (!b.alive) continue;
      if (this.abilities.updateBuildingStatus(b, dt)) continue;
      if (b.alive) b.update(dt);
    }
    this.combat.update(dt);
    this.abilities.update(dt);
    this.superweapons.update(dt);

    this.regrowT += dt;
    if (this.regrowT > 0.5) { this.map.regrow(this.regrowT); this.regrowT = 0; }
    this.terrain.syncResources();

    for (let i = this.tempSights.length - 1; i >= 0; i--) { this.tempSights[i].t -= dt; if (this.tempSights[i].t <= 0) this.tempSights.splice(i, 1); }
    this.fogT -= dt;
    if (this.fogT <= 0) { this.fogT = 0.12; this.computeFog(); }
    this.fog.update(dt);

    this.teamT -= dt;
    if (this.teamT <= 0) { this.teamT = 0.5; this.recomputeTeams(); }

    this.ambient(dt);
    this.fx.update(dt);

    this.endT -= dt;
    if (this.endT <= 0) { this.endT = 1; this.checkEnd(); }
  }

  separate() {
    const us = this.units;
    const n = us.length;
    for (let i = 0; i < n; i++) {
      const a = us[i];
      if (a.inside || !a.alive) continue;
      for (let j = i + 1; j < n; j++) {
        const b = us[j];
        if (b.inside || !b.alive || a.hover !== b.hover) continue;
        let dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
        const minD = (a.radius + b.radius) * (a.isInfantry && b.isInfantry ? 0.95 : 0.9);
        if (Math.abs(dx) > minD || Math.abs(dz) > minD) continue;
        let d2 = dx * dx + dz * dz;
        if (d2 >= minD * minD) continue;
        // heavy crushers just roll over enemy infantry (handled by crush), don't shove
        if (d2 < 1e-6) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; d2 = dx * dx + dz * dz; }
        const d = Math.sqrt(d2);
        const push = (minD - d) * 0.5;
        const nx = dx / d, nz = dz / d;
        const fixedA = !a.canMove || a.hstate === 'unloading' || a.hstate === 'docking' || !!a.status.lifted;
        const fixedB = !b.canMove || b.hstate === 'unloading' || b.hstate === 'docking' || !!b.status.lifted;
        let wa = a.moving && !b.moving ? 0.25 : 0.5, wb = 1 - wa;
        if (a.isVehicle && b.isInfantry) { wa = 0.1; wb = 0.9; } else if (b.isVehicle && a.isInfantry) { wa = 0.9; wb = 0.1; }
        if (fixedA) { wa = 0; wb = 1; }
        if (fixedB) { wb = 0; wa = fixedA ? 0 : 1; }
        if (wa) a.tryMove(a.position.x - nx * push * wa * 2, a.position.z - nz * push * wa * 2);
        if (wb) b.tryMove(b.position.x + nx * push * wb * 2, b.position.z + nz * push * wb * 2);
      }
    }
  }

  ambient(dt) {
    this.sporeT -= dt;
    if (this.sporeT > 0) return;
    this.sporeT = 0.12;
    const src = this.terrain.sporeSources;
    if (!src.length) return;
    const t = this.camera.target;
    const r = this.camera.halfViewWidth * 1.1;
    for (let k = 0; k < 6; k++) {
      const f = src[(Math.random() * src.length) | 0];
      if (Math.abs(f.x - t.x) > r || Math.abs(f.z - t.z) > r) continue;
      if (!this.fog.isVisible(f.x, f.z)) continue;
      const color = f.kind === 'bulb' ? 0xe0a0ff : f.kind === 'mushroom' ? 0xfff0b0 : 0xd9ff6a;
      this.fx.spores(_v.set(f.x, f.kind === 'fern' ? 0.3 : 1.0, f.z), 1, 0.7, color);
    }
  }

  checkEnd() {
    if (this.state !== 'playing') return;
    const alive = (team) => ({
      b: this.buildings.filter((b) => b.team === team && b.alive).length,
      mcv: this.units.filter((u) => u.team === team && u.alive && u.def.deploy === 'mcv').length,
      u: this.units.filter((u) => u.team === team && u.alive && !u.def.drone && !u.isMiner).length,
    });
    const p = alive(0), e = alive(1);
    if (e.b === 0 && e.mcv === 0) {
      this.state = 'won';
      for (const u of this.units.filter((x) => x.team === 1)) this.fx.after(Math.random() * 1.5, () => u.alive && this.destroy(u, null));
      this.bus.emit('gameOver', 'won');
    } else if (p.b === 0 && p.mcv === 0 && p.u === 0) {
      this.state = 'lost';
      this.bus.emit('gameOver', 'lost');
    }
  }
}

export { MAP_W, MAP_H };
