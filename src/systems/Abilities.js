// Special mechanics from the GDD: mind control, chrono erasure & teleport, drill mites, enzyme bombs,
// caustic C4, chaos gas, magnetron lift, Goliath airstrikes, virus/radiation/gas fields, psychic wave,
// MCV deploy, transports & garrisons, spy infiltration, crushing, slave-miner drones, UFO draining,
// prism-tower chaining and depot repair.
import * as THREE from 'three';
import { BUILDINGS, UNITS, FACTIONS, WEAPONS } from '../data/index.js';
import { MAP_W, MAP_H } from '../config.js';
import { rand, clamp } from '../core/util.js';
import { createModel } from '../models/index.js';
import { audio } from '../audio/Audio.js';

const _v = new THREE.Vector3();
const FACTION_GOO = { allied: 0xffd84a, soviet: 0x8aff3a, yuri: 0xff7ad8 };

export class Abilities {
  constructor(game) {
    this.game = game;
    this.fields = [];
    this.strikes = [];
    this.fieldT = 0;
  }

  get fx() { return this.game.fx; }

  // dispatched from Combat.fire for weapons with a `special`
  special(s, t, w, muzzle, seen) {
    switch (w.special) {
      case 'mc': this.mindControl(s, t, w, muzzle, seen); return true;
      case 'chrono': this.chronoBeam(s, t, muzzle); return true;
      case 'drill': this.drill(s, t, seen); return true;
      case 'lunge': this.lunge(s, t, w, seen); return true;
      case 'bomb': this.attachBomb(s, t, w); return true;
      case 'c4': this.plantC4(s, t); return true;
      case 'gas': this.gasCloud(s, seen); return true;
      case 'magnet': this.magnet(s, t, muzzle); return true;
      case 'airstrike': this.airstrike(s, t, muzzle); return true;
      default: return false;
    }
  }

  // ------------------------------------------------------------------ mind control
  mindControl(s, t, w, muzzle, seen) {
    const cap = w.capacity || 1;
    s.controlled = s.controlled.filter((c) => c.alive && c.controller === s);
    if (s.controlled.length >= cap && !w.overload) return;
    if (!t.alive || t.controller || t.def.mcImmune) return;
    this.fx.mindBeam(muzzle, t.aimPoint(new THREE.Vector3()));
    const prev = t.team;
    t.mcPrevTeam = prev;
    t.controller = s;
    s.controlled.push(t);
    if (t.isUnit) { t.stop(); t.target = null; }
    t.setTeam(s.team);
    if (seen) audio.play('mindTake', t.position, 0.8);
    if (prev === 0) this.game.emitEva(0, t.isBuilding ? 'Structure captured by enemy' : 'Unit mind-controlled', 'alarm');
    else if (s.team === 0) this.game.emitEva(0, t.isBuilding ? 'Structure captured' : 'Unit acquired', null);
  }

  releaseControlled(controller) {
    for (const c of controller.controlled) {
      if (c.alive && c.controller === controller) {
        c.controller = null;
        if (c.isBuilding) continue; // captured structures stay captured
        c.setTeam(c.mcPrevTeam ?? c.origTeam);
        if (c.isUnit) c.stop();
        this.fx.ring(c.position, 0.8, 0xc86bff);
      }
    }
    controller.controlled = [];
  }

  towerMindControl(b, dt) {
    const w = b.weapon;
    b.controlled = b.controlled.filter((c) => c.alive && c.controller === b);
    if (b.cd > 0 || b.controlled.length >= (w.capacity || 3)) return;
    const g = this.game;
    let best = null, bd = Infinity;
    for (const u of g.units) {
      if (!u.alive || u.team === b.team || u.inside || u.def.mcImmune || u.controller || !u.targetable) continue;
      if (!g.canTarget(b, u)) continue;
      const d = b.distTo(u);
      if (d > w.range) continue;
      const score = d - (g.time - u.lastHit < 3 || u.target ? 2 : 0);
      if (score < bd) { bd = score; best = u; }
    }
    if (!best) return;
    b.cd = w.cooldown;
    const muzzle = (b.parts.muzzle || b.root).getWorldPosition(new THREE.Vector3());
    b.firing = 1;
    this.mindControl(b, best, w, muzzle, g.isVisibleToPlayer(b) || g.isVisibleToPlayer(best));
  }

  // ------------------------------------------------------------------ chrono
  chronoBeam(s, t, muzzle) {
    const aim = t.aimPoint(new THREE.Vector3());
    this.fx.beam(muzzle, aim, { color: 0x8adfff, width: 0.09, life: 0.12, jitter: 0.08 });
    if (Math.random() < 0.4) this.fx.add.emit({ x: aim.x, y: aim.y, z: aim.z, life: 0.3, size: 0.6, size1: 0.1, color: 0xc8f0ff, alpha: 0.9 });
    const st = t.status.erasing || (t.status.erasing = { p: 0 });
    st.by = s;
    st.last = this.game.time;
    st.p += (0.1 * 140) / t.maxHp;
    if (t.isUnit) { t.path = []; t.target = null; }
    if (st.p >= 1) this.game.erase(t, s);
  }

  teleport(u, x, z) {
    const g = this.game;
    x = clamp(x, 0.6, MAP_W - 0.6);
    z = clamp(z, 0.6, MAP_H - 0.6);
    if (!u.hover && !g.map.passable(Math.floor(x), Math.floor(z))) {
      const p = g.map.nearestPassable(Math.floor(x), Math.floor(z), 6);
      if (!p) return;
      x = p.x + 0.5; z = p.z + 0.5;
    }
    const d = Math.hypot(x - u.position.x, z - u.position.z);
    this.fx.chronoFlash(u.position.clone().setY(0.3), 0.6);
    u.position.set(x, 0, z);
    u.guard.set(x, 0, z);
    u.path = [];
    u.status.phasing = clamp(d * 0.1, 0.4, 3);
    this.fx.chronoFlash(u.position.clone().setY(0.3), 0.6);
    if (g.isVisibleToPlayer(u)) audio.play('chrono', u.position, 0.7);
  }

  // ------------------------------------------------------------------ drill mite / lunge
  drill(s, t, seen) {
    if (t.status.drilled || !t.alive) return;
    this.fx.goo(s.position.clone().setY(0.3), 0xc8c8c8, 6);
    this.board(s, t, true);
    t.status.drilled = { mite: s };
    if (seen) audio.play('drill', t.position, 0.8);
    if (t.team === 0) this.game.emitEva(0, 'Vehicle infested!', 'alarm');
  }

  lunge(s, t, w, seen) {
    s.position.lerp(t.position, 0.7);
    this.fx.goo(t.position.clone().setY(0.25), FACTION_GOO[t.faction] || 0x8aff3a, 10);
    this.game.combat.damage(t, w, s);
    if (seen) audio.play('bite', t.position, 0.8);
  }

  // ------------------------------------------------------------------ bombs & C4
  attachBomb(s, t, w) {
    if (t.status.bomb) return;
    t.status.bomb = { t: w.bombTime, dmg: w.bombDamage, owner: s, team: s.team };
    this.fx.sparks(t.aimPoint(new THREE.Vector3()), 6, 0xffa040);
  }

  explodeBomb(e) {
    const b = e.status.bomb;
    if (!b) return;
    delete e.status.bomb;
    const pos = e.position.clone().setY(0.3);
    this.fx.explosion(pos, 1.4);
    this.fx.scorch(pos.x, pos.z, 1, 30);
    if (this.game.isVisibleToPlayerPos(pos.x, pos.z)) { audio.play('explode', pos, 1); this.game.camera.shake = 0.12; }
    const w = { warhead: 'explosive', damage: b.dmg, air: false };
    if (e.alive) this.game.combat.damage(e, w, b.owner);
    for (const o of this.game.entitiesNear(pos.x, pos.z, 2.5)) {
      if (o === e || !o.alive || o.team === b.team) continue;
      const d = o.isBuilding ? o.distFrom(pos.x, pos.z) : o.position.distanceTo(pos);
      if (d < 1.3) this.game.combat.damage(o, w, b.owner, 0.5);
    }
  }

  plantC4(s, t) {
    if (t.status.c4) return;
    t.status.c4 = { t: 3, owner: s };
    this.fx.sparks(t.aimPoint(new THREE.Vector3()), 8, 0x9bff3a);
    if (t.team === 0) this.game.emitEva(0, 'Caustic charge detected!', 'alarm');
    // commandos move on after planting
    if (s.isUnit) { s.order = { type: 'idle' }; s.target = null; s.guard.copy(s.position); }
  }

  // ------------------------------------------------------------------ fields
  addField(f) { this.fields.push({ tick: 0, ...f }); return this.fields[this.fields.length - 1]; }

  gasCloud(s, seen) {
    this.addField({ type: 'gas', x: s.position.x, z: s.position.z, r: 2.4, t: 4, team: s.team });
    if (seen) audio.play('gas', s.position, 0.8);
  }

  virusCloud(pos, attacker) {
    this.addField({ type: 'virus', x: pos.x, z: pos.z, r: 1.6, t: 6, team: attacker ? attacker.team : -1, owner: attacker });
    this.fx.spores(pos.clone().setY(0.3), 20, 0.8, 0xd8ff4a);
  }

  radiate(u, on) {
    if (on) {
      u.radField = this.addField({ type: 'rad', x: u.position.x, z: u.position.z, r: 2.2, t: Infinity, team: u.team, owner: u });
      this.fx.goo(u.position.clone().setY(0.1), 0x9bff3a, 8);
    } else if (u.radField) {
      u.radField.t = 5;
      u.radField = null;
    }
  }

  // ------------------------------------------------------------------ magnetron
  magnet(s, t, muzzle) {
    const aim = t.aimPoint(new THREE.Vector3());
    this.fx.beam(muzzle, aim, { color: 0xb070ff, width: 0.1, life: 0.22, jitter: 0.12 });
    if (!t.status.lifted) {
      t.status.lifted = { by: s, h: 0, t: 0, last: this.game.time };
      t.path = [];
      if (this.game.isVisibleToPlayer(t)) audio.play('magnet', t.position, 0.8);
    }
    t.status.lifted.last = this.game.time;
  }

  // ------------------------------------------------------------------ Goliath airstrike
  airstrike(s, t, muzzle) {
    const g = this.game;
    const aim = t.aimPoint(new THREE.Vector3());
    this.fx.beam(muzzle, aim, { color: 0xff2a2a, width: 0.04, life: 1.5 });
    g.fx.after(1.5, () => {
      if (!t.alive) return;
      const entry = t.position.x < MAP_W / 2 ? -4 : MAP_W + 4;
      const moths = [];
      for (let i = 0; i < 2; i++) {
        const { root } = createModel('bomberMoth', s.team);
        root.scale.setScalar(0.9);
        g.scene.add(root);
        moths.push({ root, off: (i - 0.5) * 1.6 });
      }
      this.strikes.push({ moths, from: new THREE.Vector3(entry, 4.2, t.position.z - 6), to: t.position.clone(), t: 0, dur: 3.2, target: t, team: s.team, owner: s, dropped: 0 });
      if (t.team === 0) g.emitEva(0, 'Warning: bomber moths inbound', 'alarm');
    });
  }

  // ------------------------------------------------------------------ psychic wave / MCV / transports
  psiWave(u) {
    const g = this.game;
    this.fx.ring(u.position, 2.9, 0xc86bff, 0.6);
    this.fx.ring(u.position, 2.2, 0xffffff, 0.45);
    for (const e of g.units) {
      if (!e.alive || e === u || e.inside || !e.isInfantry || e.team === u.team) continue;
      if (e.position.distanceTo(u.position) < 2.8) {
        this.fx.goo(e.position.clone().setY(0.25), FACTION_GOO[e.faction], 8);
        e.takeDamage(9999, u);
      }
    }
    if (g.isVisibleToPlayer(u)) audio.play('psiWave', u.position, 1);
    u.deployCd = 12;
    return true;
  }

  deployMcv(u) {
    const g = this.game, kind = u.def.deploysInto;
    const d = BUILDINGS[kind];
    const tx = Math.round(u.position.x - d.w / 2), tz = Math.round(u.position.z - d.h / 2);
    for (let z = tz; z < tz + d.h; z++) for (let x = tx; x < tx + d.w; x++) {
      if (!g.map.inBounds(x, z) || g.map.blocked[g.map.idx(x, z)] || g.map.res[g.map.idx(x, z)] > 0) {
        if (u.team === 0) g.emitEva(0, 'Cannot deploy here', 'error');
        return false;
      }
    }
    for (const o of g.units) if (o !== u && o.alive && !o.inside && !o.hover && o.position.x > tx - 0.2 && o.position.x < tx + d.w + 0.2 && o.position.z > tz - 0.2 && o.position.z < tz + d.h + 0.2) {
      o.moveTo(o.position.x + (o.position.x - u.position.x) * 2, o.position.z + (o.position.z - u.position.z) * 2);
    }
    g.removeUnit(u);
    g.spawnBuilding(kind, u.team, tx, tz);
    return true;
  }

  canEnter(u, t) {
    if (!t || !t.alive || u === t || !u.isUnit) return false;
    if (t.team !== u.team) {
      return !!(u.def.spy && t.isBuilding && t.isActive);
    }
    if (t.isUnit) return !!(t.def.transport && u.isInfantry && !u.hover && !u.def.drone && t.passengers.length < t.def.transport);
    if (!t.isActive) return false;
    if (t.def.grinder) return !u.hover || true;
    if (t.def.garrison) return u.isInfantry && !u.hover && !u.def.drone && t.passengers.length < t.def.garrison;
    if (t.def.chargeable) return !!(u.def.chargesPylon && (t.chargers || []).length < 2);
    if (t.def.depot) return u.isVehicle;
    return false;
  }

  enter(u, t) {
    const g = this.game;
    u.order = { type: 'idle' };
    if (!this.canEnter(u, t)) return;
    if (t.team !== u.team && u.def.spy) { this.infiltrate(u, t); return; }
    if (t.isBuilding && t.def.grinder) { this.recycle(u, t); return; }
    if (t.isBuilding && t.def.chargeable) {
      t.chargers = (t.chargers || []).filter((c) => c.alive);
      t.chargers.push(u);
      t.charges = t.chargers.length;
      this.board(u, t, false);
      this.fx.arc(u.position.clone().setY(0.4), t.aimPoint(new THREE.Vector3()).setY(t.def.height), { life: 0.4, width: 0.1 });
      return;
    }
    this.board(u, t, false);
    t.passengers.push(u);
    if (t.isBuilding) g.recomputeTeams();
    if (g.isVisibleToPlayer(t)) audio.play('board', t.position, 0.6);
  }

  board(u, host, silent) {
    u.inside = host;
    u.root.visible = false;
    u.selected = false;
    u.path = [];
    u.target = null;
    this.game.bus.emit('removed', u, true);
    void silent;
  }

  unload(t) {
    const g = this.game;
    const list = t.passengers.slice();
    t.passengers.length = 0;
    let i = 0;
    for (const p of list) {
      if (!p.alive) continue;
      const a = (i++ / Math.max(1, list.length)) * Math.PI * 2;
      const r = (t.radius || 0.8) + 0.5;
      let x = t.position.x + Math.cos(a) * r, z = t.position.z + Math.sin(a) * r;
      if (!g.map.passable(Math.floor(x), Math.floor(z))) {
        const q = g.map.nearestPassable(Math.floor(x), Math.floor(z), 4);
        if (q) { x = q.x + 0.5; z = q.z + 0.5; }
      }
      p.inside = null;
      p.position.set(x, 0, z);
      p.guard.set(x, 0, z);
      p.root.visible = true;
      p.order = { type: 'idle' };
      p.syncModel();
    }
    if (t.isBuilding) g.recomputeTeams();
    if (list.length && g.isVisibleToPlayer(t)) audio.play('board', t.position, 0.6);
    return list.length > 0;
  }

  ejectAll(b) {
    if (b.passengers.length) this.unload(b);
    if (b.chargers) {
      b.passengers = b.chargers;
      b.chargers = [];
      b.charges = 0;
      this.unload(b);
    }
  }

  garrisonFire(t, dt) {
    const g = this.game;
    for (const p of t.passengers) {
      if (!p.alive || !p.def.weapon) continue;
      for (const k in p.cd) p.cd[k] -= dt;
      p.retarget -= dt;
      if (p.retarget <= 0 || !p.target || !p.target.alive) {
        p.retarget = 0.5;
        p.target = g.findTarget({ ...p, position: t.position, team: t.team, distTo: (e) => t.distTo(e), weaponFor: (e) => p.weaponFor(e) }, p.maxRange() + 0.6);
      }
      const tgt = p.target;
      if (!tgt || !tgt.alive) continue;
      const w = p.weaponFor(tgt);
      if (!w || t.distTo(tgt) > w.range + 0.6 || (p.cd[w.key] ?? 0) > 0) continue;
      p.cd[w.key] = w.cooldown;
      const muzzle = t.position.clone().add(new THREE.Vector3(rand(-0.4, 0.4), (t.def.height || 0.8) * 0.8, rand(-0.4, 0.4)));
      g.combat.fire(p, tgt, w, muzzle);
    }
  }

  recycle(u, chasm) {
    const g = this.game;
    const refund = u.def.cost || 0;
    g.teams[chasm.team].credits += refund;
    this.fx.goo(chasm.position.clone().setY(0.5), FACTION_GOO[u.faction] || 0xff7ad8, 14);
    this.fx.sparks(chasm.position.clone().setY(0.6), 10, 0xff9a6a);
    if (g.isVisibleToPlayer(chasm)) audio.play('grind', chasm.position, 0.9);
    if (chasm.team === 0) g.bus.emit('floatText', { x: chasm.position.x, z: chasm.position.z, text: `+$${refund}`, color: '#ffe066' });
    g.removeUnit(u);
  }

  // ------------------------------------------------------------------ spy
  infiltrate(spy, b) {
    const g = this.game;
    const victim = g.teams[b.team], owner = g.teams[spy.team];
    let msg = 'Building infiltrated';
    switch (b.def.role) {
      case 'refinery': {
        const s = Math.floor(victim.credits * 0.5);
        victim.credits -= s; owner.credits += s;
        msg = `Nutrients stolen: $${s}`;
        break;
      }
      case 'power': victim.blackout = 45; msg = 'Enemy power grid blacked out'; break;
      case 'radar': case 'cy':
        if (b.team === 0) g.fog.reshroud();
        g.addTempSight(spy.team, b.position.x, b.position.z, 12, 40);
        msg = 'Enemy radar compromised';
        break;
      case 'barracks': owner.vetInfantry = true; msg = 'Veteran infantry unlocked'; break;
      case 'factory': owner.vetVehicles = true; msg = 'Veteran vehicles unlocked'; break;
      case 'superweapon': g.superweapons.reset(b.team, b.def.superweapon); msg = 'Superweapon sabotaged'; break;
      default: g.addTempSight(spy.team, MAP_W / 2, MAP_H / 2, 80, 25); msg = 'Battlefield intel acquired'; break;
    }
    if (spy.team === 0) g.emitEva(0, msg, 'ready');
    if (b.team === 0) g.emitEva(0, 'Our base has been infiltrated', 'alarm');
    this.fx.ring(b.position, 1.4, 0x6dff4a, 0.5);
    g.removeUnit(spy);
  }

  // ------------------------------------------------------------------ crushing
  crush(u) {
    const g = this.game;
    const r = u.radius * 0.75;
    for (const e of g.units) {
      if (e === u || !e.alive || e.inside || e.team === u.team) continue;
      const dx = e.position.x - u.position.x, dz = e.position.z - u.position.z;
      if (Math.abs(dx) > r + 0.3 || Math.abs(dz) > r + 0.3) continue;
      const d = Math.hypot(dx, dz);
      if (e.crushable && d < r) {
        this.fx.goo(e.position.clone().setY(0.1), FACTION_GOO[e.faction], 10);
        if (g.isVisibleToPlayer(e)) audio.play('squish', e.position, 0.8);
        e.takeDamage(9999, u);
      } else if (u.def.crush >= 2 && e.isVehicle && !e.hover && (e.def.armor === 'light' || e.def.armor === 'medium') && d < r * 0.95) {
        if (g.isVisibleToPlayer(e)) audio.play('crunch', e.position, 0.9);
        e.takeDamage(9999, u);
      }
    }
  }

  // ------------------------------------------------------------------ slave miner
  slaveMinerDeploy(q, on) {
    const g = this.game;
    if (on) {
      for (let i = 0; i < q.storedDrones; i++) this.spawnDrone(q, i);
      q.storedDrones = 0;
      q.idleMinerT = 0;
    } else {
      for (const d of q.drones) if (d.alive) { d.dstate = 'return'; d.setPath(q.position.x, q.position.z); }
    }
    void g;
  }

  spawnDrone(q, i = 0) {
    const g = this.game;
    const a = (i / 5) * Math.PI * 2 + Math.random();
    const d = g.spawnUnit('workerDrone', q.team, q.position.x + Math.cos(a) * (q.radius + 0.3), q.position.z + Math.sin(a) * (q.radius + 0.3), a);
    d.queen = q;
    q.drones.push(d);
    return d;
  }

  boardDrone(q, d) {
    q.drones = q.drones.filter((x) => x !== d);
    q.storedDrones = Math.min(q.def.slaveMiner.drones, q.storedDrones + 1);
    this.game.removeUnit(d);
  }

  slaveMinerTick(q, dt) {
    const g = this.game, sm = q.def.slaveMiner;
    q.drones = q.drones.filter((d) => d.alive && d.team === q.team);
    if (q.drones.length < sm.drones) {
      q.droneT += dt;
      if (q.droneT >= sm.respawn) { q.droneT = 0; this.spawnDrone(q, q.drones.length); }
    }
    const idle = q.drones.length > 0 && q.drones.every((d) => d.dstate === 'idle');
    q.idleMinerT = idle ? (q.idleMinerT || 0) + dt : 0;
    if (q.idleMinerT > 4 && g.map.nearestResource(q.position.x, q.position.z, sm.radius) < 0) {
      // field exhausted: pack up and look for a new one
      q.setDeployed(false);
      q.order = { type: 'harvest' };
      q.hstate = 'seek';
      q.hWait = 3;
    }
  }

  // ------------------------------------------------------------------ Bio-UFO drain
  drainTick(ufo, b, dt) {
    const g = this.game;
    if (Math.random() < dt * 6) {
      const a = ufo.root.position.clone();
      a.y -= 0.2;
      this.fx.beam(a, b.position.clone().setY(b.def.height * 0.7), { color: 0x9bff6a, width: 0.08, life: 0.12, jitter: 0.1 });
    }
    if (b.def.role === 'refinery') {
      const amt = Math.min(g.teams[b.team].credits, 40 * dt);
      g.teams[b.team].credits -= amt;
      g.teams[ufo.team].credits += amt;
    }
  }

  // ------------------------------------------------------------------ prism chain
  prismChain(b, muzzle) {
    const g = this.game;
    let mul = 1, n = 0;
    for (const o of g.buildings) {
      if (o === b || o.team !== b.team || o.kind !== b.kind || !o.operational || o.cd > 0) continue;
      if (Math.hypot(o.position.x - b.position.x, o.position.z - b.position.z) > 6.5) continue;
      if (o.wTarget && o.wTarget.alive && o.distTo(o.wTarget) <= o.weapon.range) continue;
      const m = (o.parts.muzzle || o.root).getWorldPosition(new THREE.Vector3());
      this.fx.beam(m, muzzle, { color: 0xffe070, width: 0.08, life: 0.3 });
      o.cd = o.weapon.cooldown;
      o.firing = 1;
      mul += 0.7;
      if (++n >= 4) break;
    }
    return mul;
  }

  // ------------------------------------------------------------------ depot
  depotTick(b, dt) {
    for (const u of this.game.units) {
      if (!u.alive || u.inside || u.team !== b.team || !u.isVehicle || u.hover) continue;
      const p = u.position;
      if (p.x < b.tx || p.x > b.tx + b.w || p.z < b.tz || p.z > b.tz + b.h) continue;
      if (u.status.drilled) {
        const mite = u.status.drilled.mite;
        delete u.status.drilled;
        if (mite && mite.alive) { this.fx.goo(u.position.clone().setY(0.3), 0xc8c8c8, 8); this.game.removeUnit(mite); }
      }
      if (u.hp < u.maxHp) {
        u.heal(70 * dt);
        if (Math.random() < dt * 4) this.fx.heal(u.position);
      }
    }
  }

  // ------------------------------------------------------------------ status effects
  // returns true when the unit is frozen this frame (erasing, lifted, phasing)
  updateUnitStatus(u, dt) {
    const st = u.status, g = this.game;
    let frozen = false;
    if (st.invuln !== undefined) { st.invuln -= dt; if (st.invuln <= 0) delete st.invuln; }
    if (st.berserk !== undefined) { st.berserk -= dt; if (st.berserk <= 0) { delete st.berserk; u.target = null; } }
    if (st.phasing !== undefined) { st.phasing -= dt; frozen = true; if (st.phasing <= 0) { delete st.phasing; frozen = false; } }
    if (st.erasing) {
      if (g.time - st.erasing.last > 0.25) { st.erasing.p -= dt * 0.3; if (st.erasing.p <= 0) delete st.erasing; }
      if (st.erasing) frozen = true;
    }
    if (st.lifted) {
      const L = st.lifted;
      L.t += dt;
      const holding = L.by && L.by.alive && g.time - L.last < 0.5 && L.t < 6;
      if (holding) {
        L.h = Math.min(1.3, L.h + dt * 1.2);
        const dx = L.by.position.x - u.position.x, dz = L.by.position.z - u.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 1.8) { u.position.x += (dx / d) * dt * 0.9; u.position.z += (dz / d) * dt * 0.9; }
        frozen = true;
      } else {
        L.h -= dt * 4;
        frozen = true;
        if (L.h <= 0) {
          delete st.lifted;
          this.fx.impact(u.position.clone().setY(0.1), 1, true);
          if (!g.map.passable(Math.floor(u.position.x), Math.floor(u.position.z))) {
            const p = g.map.nearestPassable(Math.floor(u.position.x), Math.floor(u.position.z), 5);
            if (p) u.position.set(p.x + 0.5, 0, p.z + 0.5);
          }
          u.takeDamage(u.maxHp * 0.3 + 30, L.by);
        }
      }
    }
    if (st.drilled) {
      const mite = st.drilled.mite;
      if (Math.random() < dt * 5 && g.isVisibleToPlayer(u)) this.fx.sparks(u.aimPoint(_v), 3, 0xffd080);
      u.takeDamage(55 * dt, mite && mite.alive ? mite : null);
    }
    if (st.bomb) { st.bomb.t -= dt; if (st.bomb.t <= 0) this.explodeBomb(u); }
    return frozen && u.alive;
  }

  updateBuildingStatus(b, dt) {
    const st = b.status, g = this.game;
    if (st.invuln !== undefined) { st.invuln -= dt; if (st.invuln <= 0) delete st.invuln; }
    if (st.erasing && g.time - st.erasing.last > 0.25) { st.erasing.p -= dt * 0.3; if (st.erasing.p <= 0) delete st.erasing; }
    if (st.bomb) { st.bomb.t -= dt; if (st.bomb.t <= 0) this.explodeBomb(b); }
    if (st.c4) {
      st.c4.t -= dt;
      if (Math.random() < dt * 8) this.fx.sparks(b.position.clone().setY(0.3), 2, 0x9bff3a);
      if (st.c4.t <= 0) {
        const owner = st.c4.owner;
        delete st.c4;
        this.fx.goo(b.position.clone().setY(0.6), 0x9bff3a, 20);
        if (!st.invuln) { b.hp = 1; b.takeDamage(10, owner && owner.alive ? owner : null); }
      }
    }
    return !!st.erasing;
  }

  // ------------------------------------------------------------------ per-frame
  update(dt) {
    const g = this.game;
    this.fieldT += dt;
    const tick = this.fieldT >= 0.25;
    if (tick) this.fieldT = 0;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      if (f.owner && f.type === 'rad' && f.owner.alive && f.t === Infinity) { f.x = f.owner.position.x; f.z = f.owner.position.z; }
      if (f.type === 'rad' && f.owner && !f.owner.alive && f.t === Infinity) f.t = 5;
      f.t -= dt;
      if (f.t <= 0) { this.fields.splice(i, 1); continue; }
      this.fx.fieldVisual(f, dt, g.isVisibleToPlayerPos(f.x, f.z));
      if (!tick) continue;
      for (const u of g.units) {
        if (!u.alive || u.inside || u.hover) continue;
        if (Math.hypot(u.position.x - f.x, u.position.z - f.z) > f.r) continue;
        const enemy = u.team !== f.team;
        switch (f.type) {
          case 'gas':
            if (enemy && !u.def.mcImmune) u.status.berserk = 8;
            break;
          case 'virus':
            if (enemy && u.isInfantry) u.takeDamage(25 * 0.25, f.owner && f.owner.alive ? f.owner : null);
            break;
          case 'rad':
            if (enemy) u.takeDamage((u.isInfantry ? 45 : 4) * 0.25, f.owner && f.owner.alive ? f.owner : null);
            break;
          case 'fallout':
            if (u.isInfantry) u.takeDamage(30 * 0.25, null);
            else u.takeDamage(4 * 0.25, null);
            break;
          default: break;
        }
      }
    }
    // airstrikes
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t += dt;
      const k = s.t / s.dur;
      const dir = new THREE.Vector3().subVectors(s.to, s.from).setY(0).normalize();
      const pos = s.from.clone().lerp(s.to.clone().setY(4.2), Math.min(1, k * 0.85)).addScaledVector(dir, Math.max(0, k - 0.85) * 18);
      const yaw = Math.atan2(dir.x, dir.z);
      for (const m of s.moths) {
        m.root.position.set(pos.x + dir.z * m.off, pos.y + Math.sin(s.t * 3 + m.off) * 0.1, pos.z - dir.x * m.off);
        m.root.rotation.y = yaw;
        m.root.visible = g.isVisibleToPlayerPos(m.root.position.x, m.root.position.z) || g.fog.revealed;
      }
      if (k > 0.7 && s.dropped < 3 && s.t > 0.7 * s.dur + s.dropped * 0.15) {
        s.dropped++;
        const p = s.target.alive ? s.target.position.clone() : s.to.clone();
        p.x += rand(-0.6, 0.6); p.z += rand(-0.6, 0.6);
        g.fx.after(0.35, () => {
          g.fx.explosion(p.clone().setY(0.4), 1.6);
          g.fx.fireball(p.clone().setY(0.3), 1.2);
          if (g.isVisibleToPlayerPos(p.x, p.z)) { audio.play('bigExplode', p, 0.9); g.camera.shake = 0.15; }
          if (s.target.alive) g.combat.damage(s.target, { warhead: 'explosive', damage: 520 }, s.owner && s.owner.alive ? s.owner : null);
        });
      }
      if (k >= 1.6) {
        for (const m of s.moths) m.root.removeFromParent();
        this.strikes.splice(i, 1);
      }
    }
    // overmind overload: controlling more than its safe capacity burns its brain
    for (const u of g.units) {
      if (!u.alive || u.kind !== 'overmindBehemoth') continue;
      u.controlled = u.controlled.filter((c) => c.alive && c.controller === u);
      if (u.controlled.length > 3) {
        u.takeDamage(u.maxHp * 0.035 * dt, null);
        if (Math.random() < dt * 8) this.fx.sparks(u.aimPoint(_v).setY(1), 3, 0xff6af0);
      }
    }
  }
}

void UNITS; void FACTIONS; void WEAPONS;
