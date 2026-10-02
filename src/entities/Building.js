// Structures: construction rise-up (clipping plane + scaffold), name-driven idle animation,
// defensive weapons (incl. prism chaining & mind-control towers), garrisons, depot repair,
// power drain, repair/sell, damage smoke & fire.
import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BUILDINGS, WEAPONS } from '../data/index.js';
import { TEAMS } from '../config.js';
import { clonePatched } from '../render/fow.js';
import { distToRect, rotateTowards, angleDiff, rand } from '../core/util.js';
import { animateRig } from '../models/animate.js';
import { weaponCanHit } from '../systems/targeting.js';
import { audio } from '../audio/Audio.js';

const _v = new THREE.Vector3();

export class Building extends Entity {
  constructor(game, kind, team, tx, tz, { instant = false } = {}) {
    const def = BUILDINGS[kind];
    super(game, kind, team, def);
    this.tx = tx; this.tz = tz;
    this.w = def.w; this.h = def.h;
    this.position.set(tx + def.w / 2, 0, tz + def.h / 2);
    this.makeModel();
    this.root.position.copy(this.position);
    this.state = instant ? 'active' : 'constructing';
    this.buildT = 0;
    this.buildDur = 1.6 + def.w * def.h * 0.12;
    this.weapon = def.weapon ? WEAPONS[def.weapon] : null;
    this.cd = 0;
    this.wTarget = null;
    this.retarget = 0;
    this.turretYaw = 0;
    this.spin = 0;
    this.spinT = 0;
    this.repairing = false;
    this.fxT = 0;
    this.dockUser = null;
    this.doorOpen = 0;
    this.doorT = 0;
    this.producing = false;
    this.charges = 0; // Spark Centipedes charging a Sting Pylon
    this.drainedBy = null;
    this.rally = null;
    if (def.exit) this.rally = new THREE.Vector3(tx + def.exit.x + 0.5, 0, tz + def.exit.z + 1.6);
    if (!instant) this.beginClip();
    this.box = new THREE.Box3(new THREE.Vector3(tx, 0, tz), new THREE.Vector3(tx + def.w, def.height, tz + def.h));
  }

  get isBuilding() { return true; }
  get radius() { return Math.max(this.w, this.h) * 0.6; }
  get isActive() { return this.state === 'active'; }
  get role() { return this.def.role; }
  get powered() {
    if (this.def.power > 0) return !this.drainedBy;
    if (this.charges > 0) return true;
    const T = this.game.teams[this.team];
    return !T.lowPower;
  }
  get operational() { return this.isActive && (!this.def.needsPower || this.powered) && !(this.drainedBy && this.def.role === 'defense'); }

  onModelRebuilt() { this.root.position.copy(this.position); }

  distFrom(x, z) { return distToRect(x, z, this.tx, this.tz, this.tx + this.w, this.tz + this.h); }

  aimPoint(out = new THREE.Vector3()) {
    return out.copy(this.position).setY(Math.min(1.2, this.def.height * 0.4));
  }

  dockPos(out = new THREE.Vector3()) {
    const d = this.def.dock || this.def.exit || { x: Math.floor(this.w / 2), z: this.h };
    return out.set(this.tx + d.x + 0.5, 0, this.tz + d.z + 0.5);
  }

  distTo(e) {
    if (e.isBuilding) {
      const dx = Math.max(e.tx - (this.tx + this.w), 0, this.tx - (e.tx + e.w));
      const dz = Math.max(e.tz - (this.tz + this.h), 0, this.tz - (e.tz + e.h));
      return Math.hypot(dx, dz);
    }
    return Math.max(0, this.distFrom(e.position.x, e.position.z) - (e.radius || 0.3) * 0.5);
  }

  weaponFor(t) {
    return this.weapon && weaponCanHit(this.weapon, t) ? this.weapon : null;
  }

  // ------------------------------------------------------------ construction clip anim
  beginClip() {
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    this.origMats = new Map();
    this.root.traverse((o) => {
      if (o.isMesh) {
        this.origMats.set(o, o.material);
        const c = clonePatched(o.material);
        c.clippingPlanes = [this.clipPlane];
        c.clipShadows = true;
        o.material = c;
      }
    });
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(this.w * 0.96, this.def.height, this.h * 0.96));
    const mat = new THREE.LineBasicMaterial({ color: TEAMS[this.team].glow, transparent: true, opacity: 0.8 });
    this.scaffold = new THREE.LineSegments(geo, mat);
    this.scaffold.position.set(this.position.x, this.def.height / 2, this.position.z);
    this.game.scene.add(this.scaffold);
    const ringGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(this.w * 1.02, this.h * 1.02).rotateX(-Math.PI / 2));
    this.scan = new THREE.LineSegments(ringGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    this.scan.position.copy(this.position);
    this.game.scene.add(this.scan);
  }

  endClip() {
    if (!this.origMats) return;
    for (const [o, m] of this.origMats) { o.material.dispose(); o.material = m; }
    this.origMats = null;
    this.scaffold.geometry.dispose(); this.scaffold.material.dispose(); this.scaffold.removeFromParent();
    this.scan.geometry.dispose(); this.scan.material.dispose(); this.scan.removeFromParent();
  }

  startSell() {
    if (this.state !== 'active') return false;
    this.game.abilities.ejectAll(this);
    this.state = 'selling';
    this.buildT = this.buildDur;
    this.beginClip();
    return true;
  }

  dispose() {
    this.endClip();
    super.dispose();
  }

  // ------------------------------------------------------------ update
  update(dt) {
    const g = this.game;
    this.anim += dt;
    this.firing = Math.max(0, this.firing - dt * 2);
    if (this.state === 'constructing' || this.state === 'selling') {
      const dir = this.state === 'constructing' ? 1 : -1.6;
      this.buildT += dt * dir;
      const k = Math.max(0, Math.min(1, this.buildT / this.buildDur));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const hgt = e * (this.def.height + 0.4);
      this.clipPlane.constant = hgt;
      this.scan.position.y = hgt;
      const seen = g.isVisibleToPlayer(this);
      this.scaffold.visible = this.scan.visible = seen;
      this.scaffold.material.opacity = 0.35 + 0.4 * Math.sin(this.anim * 20) ** 2;
      this.fxT -= dt;
      if (this.fxT <= 0 && seen) {
        this.fxT = 0.06;
        const side = Math.random() < 0.5;
        g.fx.sparks(_v.set(
          this.position.x + (side ? rand(-0.5, 0.5) * this.w : (Math.random() < 0.5 ? -0.5 : 0.5) * this.w),
          hgt,
          this.position.z + (side ? (Math.random() < 0.5 ? -0.5 : 0.5) * this.h : rand(-0.5, 0.5) * this.h)
        ), 2, 0xc8ff9a);
        if (Math.random() < 0.3) g.fx.dust(this.position, 1);
        if (Math.random() < 0.25) audio.play('build', this.position, 0.6);
      }
      if (this.state === 'constructing' && this.buildT >= this.buildDur) {
        this.state = 'active';
        this.endClip();
        g.onBuildingComplete(this);
      } else if (this.state === 'selling' && this.buildT <= 0) {
        g.onBuildingSold(this);
      }
      return;
    }

    this.animate(dt);
    if (this.weapon) this.updateWeapon(dt);
    if (this.def.depot && this.operational) g.abilities.depotTick(this, dt);

    if (this.repairing) {
      const team = g.teams[this.team];
      if (this.hp >= this.maxHp) this.repairing = false;
      else {
        const heal = 60 * dt;
        const cost = (this.def.cost / this.maxHp) * heal * 0.3;
        if (team.credits >= cost) {
          team.credits -= cost;
          this.heal(heal);
          if (Math.random() < 0.3) g.fx.heal(this.position);
          if (Math.random() < 0.05) audio.play('repair', this.position, 0.5);
        } else this.repairing = false;
      }
    }

    const hpk = this.hp / this.maxHp;
    if (hpk < 0.5 && Math.random() < dt * (hpk < 0.25 ? 10 : 4) && g.isVisibleToPlayer(this)) {
      _v.set(this.position.x + rand(-0.35, 0.35) * this.w, this.def.height * rand(0.5, 0.9), this.position.z + rand(-0.35, 0.35) * this.h);
      g.fx.smoke(_v, 0x2a2724, 0.35, 1.2, 0.55);
      if (hpk < 0.25) g.fx.fire(_v, 1.2);
    }
  }

  animate(dt) {
    const g = this.game, p = this.parts;
    this.doorT = Math.max(0, this.doorT - dt);
    this.doorOpen += ((this.doorT > 0 ? 1 : 0) - this.doorOpen) * Math.min(1, dt * 4);
    const sw = this.def.superweapon ? g.superweapons.chargeOf(this.team, this.def.superweapon) : 0;
    animateRig(this.rig, {
      t: this.anim, moving: false, firing: this.firing, deployed: 0, doorOpen: this.doorOpen,
      powered: this.powered, charge: sw, spinMul: this.powered ? (this.weapon && this.firing > 0 ? 6 + this.spin * 5 : 1) : 0.15,
      aim: this.firing,
    }, dt);
    this.fxT -= dt;
    if (this.fxT <= 0 && this.powered) {
      this.fxT = this.producing ? 0.25 : 0.8;
      if (g.isVisibleToPlayer(this)) {
        for (const name of ['smoke', 'smoke2']) {
          const m = p[name];
          if (!m) continue;
          m.getWorldPosition(_v);
          const tint = this.faction === 'soviet' ? 0x8fbf5a : this.faction === 'yuri' ? 0xb08ad0 : 0xd8d0b0;
          g.fx.smoke(_v, this.kind === 'sepiaEmitter' ? 0x141414 : tint, 0.22, 0.9, this.kind === 'sepiaEmitter' ? 0.7 : 0.4);
        }
      }
    }
    // idle crackle for electric defenses
    if ((this.kind === 'stingPylon') && this.powered && Math.random() < dt * 2.5 && g.isVisibleToPlayer(this) && p.muzzle) {
      p.muzzle.getWorldPosition(_v);
      const a = _v.clone();
      const b = _v.clone().add(new THREE.Vector3(rand(-0.4, 0.4), rand(-0.6, 0.1), rand(-0.4, 0.4)));
      g.fx.arc(a, b, { life: 0.15, width: 0.05, jitter: 0.2, segments: 7 });
    }
  }

  updateWeapon(dt) {
    const g = this.game, wd = this.weapon;
    this.cd -= dt;
    if (this.firing <= 0.01) this.spinT = Math.max(0, this.spinT - dt * 0.7);
    this.spin = this.spinT > 3 ? 2 : this.spinT > 1.5 ? 1 : 0;
    if (!this.operational) { this.wTarget = null; return; }
    if (wd.special === 'mc') { g.abilities.towerMindControl(this, dt); return; }
    this.retarget -= dt;
    const t0 = this.wTarget;
    if (this.retarget <= 0 || (t0 && (!t0.alive || !t0.targetable || this.distTo(t0) > wd.range + 0.3 || !g.canTarget(this, t0)))) {
      this.retarget = 0.35;
      if (!t0 || !t0.alive || !t0.targetable || this.distTo(t0) > wd.range + 0.3 || !g.canTarget(this, t0)) {
        this.wTarget = g.findTarget(this, wd.range);
      }
    }
    const t = this.wTarget;
    if (!t) {
      if (this.parts.turret) this.parts.turret.rotation.y += dt * 0.3;
      return;
    }
    let aligned = true;
    if (this.parts.turret) {
      const desired = Math.atan2(t.position.x - this.position.x, t.position.z - this.position.z);
      this.turretYaw = rotateTowards(this.parts.turret.rotation.y, desired, dt * 4);
      this.parts.turret.rotation.y = this.turretYaw;
      aligned = Math.abs(angleDiff(this.turretYaw, desired)) < 0.12;
    }
    if (aligned && this.cd <= 0) {
      const base = wd.spin ? wd.spin[this.spin] : wd.cooldown;
      this.cd = base;
      if (wd.spin) this.spinT = Math.min(4, this.spinT + base);
      this.root.updateMatrixWorld(true);
      const muzzle = (this.parts.muzzle || this.root).getWorldPosition(new THREE.Vector3());
      if (!this.parts.muzzle) muzzle.y += this.def.height * 0.8;
      let mul = 1 + this.charges * 0.5;
      if (wd.chain) mul *= g.abilities.prismChain(this, muzzle);
      g.combat.fire(this, t, wd, muzzle, mul);
      this.firing = 1;
    }
  }
}
