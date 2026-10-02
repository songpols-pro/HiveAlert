// Superweapon charging & effects for both teams:
// Tachyon Shift (chronosphere) · Swarm Storm (weather) · Acidic Spore (nuke) · Carapace Resonance (iron curtain)
// Cordyceps Bloom (genetic mutator) · Mind Shatter (psychic dominator).
import * as THREE from 'three';
import { SUPERWEAPONS, BUILDINGS } from '../data/index.js';
import { MAP_W, MAP_H } from '../config.js';
import { rand, clamp } from '../core/util.js';
import { createModel } from '../models/index.js';
import { audio } from '../audio/Audio.js';

export class Superweapons {
  constructor(game) {
    this.game = game;
    this.state = [{}, {}];
    this.storms = [];
    this.missiles = [];
  }

  keyFor(buildingKind) { return BUILDINGS[buildingKind]?.superweapon; }
  chargeOf(team, key) { return this.state[team][key]?.charge ?? 0; }
  isReady(team, key) { return !!this.state[team][key]?.ready; }
  reset(team, key) { const s = this.state[team][key]; if (s) { s.charge = 0; s.ready = false; s.announced = false; } }

  list(team) {
    return Object.entries(this.state[team]).map(([key, s]) => ({ key, ...s, def: SUPERWEAPONS[key] }));
  }

  update(dt) {
    const g = this.game;
    for (const team of [0, 1]) {
      const owned = new Set();
      for (const b of g.buildings) {
        if (b.team !== team || !b.alive || !b.isActive || !b.def.superweapon) continue;
        owned.add(b.def.superweapon);
      }
      const st = this.state[team];
      for (const key of Object.keys(st)) if (!owned.has(key)) delete st[key];
      for (const key of owned) {
        const s = st[key] || (st[key] = { charge: 0, ready: false, announced: false });
        if (s.ready) continue;
        if (g.teams[team].lowPower) continue;
        s.charge = Math.min(1, s.charge + (dt / SUPERWEAPONS[key].charge) * (g.cheatSpeed || 1));
        if (s.charge >= 1) {
          s.ready = true;
          const name = SUPERWEAPONS[key].name;
          if (team === 0) g.emitEva(0, `${name} ready`, 'ready');
          else g.emitEva(0, `Warning: enemy ${name} ready`, 'alarm');
        }
      }
    }
    this.updateStorms(dt);
    this.updateMissiles(dt);
  }

  onBuilt(b) {
    const key = b.def.superweapon;
    if (!key) return;
    if (b.team !== 0) this.game.emitEva(0, `Warning: ${b.def.name} detected`, 'alarm');
  }

  // ------------------------------------------------------------------ launch
  launch(team, key, p1, p2) {
    const s = this.state[team][key];
    if (!s || !s.ready) return false;
    s.ready = false;
    s.charge = 0;
    const g = this.game;
    const name = SUPERWEAPONS[key].name;
    if (team === 0) g.emitEva(0, `${name} activated`, null);
    else g.emitEva(0, `Warning: enemy ${name} activated`, 'alarm');
    g.bus.emit('ping', p1.x, p1.z);
    switch (key) {
      case 'chronoshift': this.chronoshift(team, p1, p2); break;
      case 'storm': this.storm(team, p1); break;
      case 'nuke': this.nuke(team, p1); break;
      case 'ironCurtain': this.ironCurtain(team, p1); break;
      case 'mutator': this.mutator(team, p1); break;
      case 'dominator': this.dominator(team, p1); break;
      default: break;
    }
    return true;
  }

  entitiesIn(x, z, r, filter = () => true) {
    const out = [];
    for (const u of this.game.units) if (u.alive && !u.inside && Math.hypot(u.position.x - x, u.position.z - z) <= r && filter(u)) out.push(u);
    for (const b of this.game.buildings) if (b.alive && b.distFrom(x, z) <= r && filter(b)) out.push(b);
    return out;
  }

  chronoshift(team, src, dst) {
    const g = this.game, r = SUPERWEAPONS.chronoshift.radius;
    const units = this.entitiesIn(src.x, src.z, r, (e) => e.isUnit && !e.def.drone);
    g.fx.chronoFlash(new THREE.Vector3(src.x, 0.5, src.z), 2.2);
    g.fx.chronoFlash(new THREE.Vector3(dst.x, 0.5, dst.z), 2.2);
    audio.play('chronoBig', null, 1);
    for (const u of units) {
      if (u.isInfantry) { g.fx.goo(u.position.clone().setY(0.3), 0x8adfff, 8); u.takeDamage(99999, null); continue; }
      let x = clamp(dst.x + (u.position.x - src.x), 0.6, MAP_W - 0.6);
      let z = clamp(dst.z + (u.position.z - src.z), 0.6, MAP_H - 0.6);
      if (!u.hover && !g.map.passable(Math.floor(x), Math.floor(z))) {
        const p = g.map.nearestPassable(Math.floor(x), Math.floor(z), 6);
        if (!p) continue;
        x = p.x + 0.5; z = p.z + 0.5;
      }
      u.position.set(x, 0, z);
      u.guard.set(x, 0, z);
      u.path = [];
      u.order = { type: 'idle' };
      u.status.phasing = 1.2;
      g.fx.chronoFlash(u.position.clone().setY(0.4), 0.8);
    }
  }

  storm(team, p) {
    const sw = SUPERWEAPONS.storm;
    this.storms.push({ x: p.x, z: p.z, r: sw.radius, t: sw.duration, strikeT: 0, team, dmg: sw.strikeDamage });
    audio.play('thunder', null, 1);
  }

  updateStorms(dt) {
    const g = this.game, fx = g.fx;
    for (let i = this.storms.length - 1; i >= 0; i--) {
      const s = this.storms[i];
      s.t -= dt;
      fx.stormCloud(s, dt);
      s.strikeT -= dt;
      if (s.strikeT <= 0 && s.t > 0.5) {
        s.strikeT = rand(0.12, 0.3);
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * s.r;
        const p = new THREE.Vector3(s.x + Math.cos(a) * d, 0.1, s.z + Math.sin(a) * d);
        fx.arc(new THREE.Vector3(p.x + rand(-1, 1), 7, p.z + rand(-1, 1)), p, { life: 0.35, width: 0.25, jitter: 1.2, segments: 18, color: 0xd8f0ff });
        fx.explosion(p, 0.7);
        fx.scorch(p.x, p.z, 0.6, 25);
        if (g.isVisibleToPlayerPos(p.x, p.z)) { audio.play('zap', p, 0.8); g.camera.shake = Math.max(g.camera.shake, 0.08); }
        for (const e of this.entitiesIn(p.x, p.z, 0.9)) g.combat.damage(e, { warhead: 'explosive', damage: s.dmg }, null);
      }
      if (s.t <= 0) this.storms.splice(i, 1);
    }
  }

  nuke(team, p) {
    const g = this.game;
    const silo = g.buildings.find((b) => b.team === team && b.kind === 'toxicCyst' && b.alive) || null;
    const from = silo ? silo.position.clone().setY(2) : new THREE.Vector3(p.x, 2, p.z);
    const { root } = createModel('acidSpore', team);
    root.position.copy(from);
    g.scene.add(root);
    this.missiles.push({ root, from, to: new THREE.Vector3(p.x, 0, p.z), t: 0, team });
    audio.play('missileLaunch', from, 1);
    g.emitEva(0, team === 0 ? 'Acidic spore launched' : 'Warning: acidic spore launched', 'alarm');
  }

  updateMissiles(dt) {
    const g = this.game, fx = g.fx;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.t += dt;
      const up = 2.2, down = 2.6;
      if (m.t < up) {
        m.root.position.set(m.from.x, m.from.y + (m.t / up) ** 2 * 26, m.from.z);
        m.root.rotation.set(0, m.t * 3, 0);
        fx.alpha.emit({ x: m.root.position.x, y: m.root.position.y - 0.5, z: m.root.position.z, vx: rand(-0.3, 0.3), vy: -0.5, vz: rand(-0.3, 0.3), life: 1.6, size: 0.4, size1: 1.4, color: 0x8aa860, alpha: 0.5, drag: 0.8 });
      } else if (m.t < up + down) {
        const k = (m.t - up) / down;
        m.root.position.set(m.to.x, 26 * (1 - k * k), m.to.z);
        m.root.rotation.set(Math.PI, m.t * 3, 0);
        fx.add.emit({ x: m.root.position.x, y: m.root.position.y + 0.6, z: m.root.position.z, life: 0.2, size: 1.2, color: 0xb6ff5a, alpha: 1.2 });
      } else {
        m.root.removeFromParent();
        this.missiles.splice(i, 1);
        this.detonate(m.team, m.to);
      }
    }
  }

  detonate(team, p) {
    const g = this.game, sw = SUPERWEAPONS.nuke;
    g.fx.nukeBlast(p, sw.radius);
    audio.play('nukeBlast', null, 1);
    g.camera.shake = 0.6;
    for (const e of this.entitiesIn(p.x, p.z, sw.radius)) {
      const d = e.isBuilding ? e.distFrom(p.x, p.z) : Math.hypot(e.position.x - p.x, e.position.z - p.z);
      const k = Math.max(0.15, 1 - d / sw.radius);
      g.combat.damage(e, { warhead: 'explosive', damage: sw.damage * k }, null);
    }
    g.abilities.addField({ type: 'fallout', x: p.x, z: p.z, r: sw.radius * 0.85, t: sw.fallout, team });
    void team;
  }

  ironCurtain(team, p) {
    const g = this.game, sw = SUPERWEAPONS.ironCurtain;
    g.fx.ring(new THREE.Vector3(p.x, 0, p.z), sw.radius + 0.4, 0xff2a2a, 0.8);
    audio.play('ironCurtain', null, 1);
    for (const e of this.entitiesIn(p.x, p.z, sw.radius, (e) => e.team === team)) {
      e.status.invuln = sw.duration;
      g.fx.aura(e, 0xff3a2a, sw.duration);
    }
  }

  mutator(team, p) {
    const g = this.game, sw = SUPERWEAPONS.mutator;
    g.fx.spores(new THREE.Vector3(p.x, 0.5, p.z), 120, sw.radius, 0xb6ff5a);
    g.fx.ring(new THREE.Vector3(p.x, 0, p.z), sw.radius, 0x9bff3a, 1);
    audio.play('gas', null, 1);
    for (const u of this.entitiesIn(p.x, p.z, sw.radius, (e) => e.isUnit && e.isInfantry && !e.hover && !e.def.hero && e.kind !== 'stagBrawler')) {
      const pos = u.position.clone(), heading = u.heading;
      g.fx.goo(pos.clone().setY(0.3), 0xb6ff5a, 10);
      g.removeUnit(u);
      const b = g.spawnUnit('stagBrawler', team, pos.x, pos.z, heading);
      b.guard.copy(pos);
    }
  }

  dominator(team, p) {
    const g = this.game, sw = SUPERWEAPONS.dominator;
    g.fx.ring(new THREE.Vector3(p.x, 0, p.z), sw.radius, 0xc86bff, 1.2);
    g.fx.ring(new THREE.Vector3(p.x, 0, p.z), sw.radius * 0.6, 0xffffff, 0.8);
    g.camera.shake = 0.3;
    audio.play('psiWave', null, 1);
    for (const e of this.entitiesIn(p.x, p.z, sw.radius, (e) => e.team !== team)) {
      if (e.isBuilding) {
        g.combat.damage(e, { warhead: 'special', damage: e.maxHp * sw.buildingDamage }, null);
      } else if (!e.def.drone) {
        if (e.controller) { e.controller.controlled = e.controller.controlled.filter((c) => c !== e); e.controller = null; }
        e.origTeam = team;
        e.setTeam(team);
        e.stop?.();
        g.fx.ring(e.position, 0.6, 0xc86bff, 0.5);
      }
    }
  }
}
