// Mobile units: infantry, vehicles and hovering units. Path following with tank / walker / foot
// steering, attack / attack-move / guard behaviours, deploy modes, transports, crushing, and the
// three harvester styles (Scarab teleport, armed Trench-Termite, Brood Queen slave miner + drones).
import * as THREE from 'three';
import { Entity } from './Entity.js';
import { UNITS, WEAPONS } from '../data/index.js';
import { MAP_W, MAP_H } from '../config.js';
import { rotateTowards, angleDiff, rand, clamp } from '../core/util.js';
import { animateRig } from '../models/animate.js';
import { weaponCanHit } from '../systems/targeting.js';
import { audio } from '../audio/Audio.js';

const _v = new THREE.Vector3();
const _f = new THREE.Vector3();
const IMMOBILE_DEPLOY = new Set(['bunker', 'brace', 'radiate', 'slaveMiner']);

export class Unit extends Entity {
  constructor(game, kind, team, x, z, heading = 0) {
    super(game, kind, team, UNITS[kind]);
    const d = this.def;
    this.position.set(x, 0, z);
    this.heading = heading;
    this.radius = d.radius;
    this.hover = d.loco === 'hover';
    this.flyH = d.flyHeight || 0;
    this.path = [];
    this.pathIdx = 0;
    this.dest = null;
    this.order = { type: 'idle' };
    this.target = null;
    this.turretYaw = heading;
    this.speed = 0;
    this.moving = false;
    this.guard = this.position.clone();
    this.stuck = 0;
    this.lastDist = Infinity;
    this.repaths = 0;
    this.chaseT = 0;
    this.retarget = Math.random() * 0.5;
    this.cd = {};
    this.spin = 0;
    this.spinT = 0;
    this.deployed = false;
    this.deployT = 0;
    this.deployCd = 0;
    this.idleT = 0;
    this.stillT = 0;
    this.aimT = 0;
    this.inside = null;
    this.disguised = !!d.spy;
    if (d.harvester) {
      this.cargo = 0;
      this.hstate = 'seek';
      this.htile = -1;
      this.lastField = null;
      this.hWait = 0.5;
      this.dockRef = null;
      this.order = { type: 'harvest' };
    }
    if (d.slaveMiner) {
      this.drones = [];
      this.storedDrones = d.slaveMiner.drones;
      this.droneT = 0;
      this.order = { type: 'harvest' };
      this.hWait = 0.5;
    }
    if (d.drone) {
      this.cargo = 0;
      this.dstate = 'seek';
      this.order = { type: 'harvest' };
    }
    this.makeModel();
    this.syncModel();
  }

  get isUnit() { return true; }
  get isInfantry() { return this.def.type === 'infantry'; }
  get isVehicle() { return this.def.type === 'vehicle'; }
  get isHarvester() { return !!this.def.harvester; }
  get isMiner() { return !!(this.def.harvester || this.def.slaveMiner || this.def.drone); }
  get armor() { return this.deployed && (this.def.deploy === 'bunker' || this.def.deploy === 'brace') ? 'infHeavy' : this.def.armor; }
  get canMove() { return !(this.deployed && IMMOBILE_DEPLOY.has(this.def.deploy)); }
  get hasWeapon() { return !!(this.def.weapon || this.def.weaponDeployed); }
  get crushable() {
    if (this.hover || !this.isInfantry || !this.def.crushable) return false;
    return !(this.deployed && (this.def.deploy === 'bunker' || this.def.deploy === 'brace'));
  }
  get sight() { return this.def.sight; }

  onModelRebuilt() { this.syncModel(); }

  aimPoint(out = new THREE.Vector3()) {
    return out.copy(this.position).setY(this.hover ? this.flyH + 0.2 : Math.min(0.5, this.def.height * 0.55));
  }

  distTo(e) {
    if (e.isBuilding) return e.distFrom(this.position.x, this.position.z);
    return Math.max(0, Math.hypot(e.position.x - this.position.x, e.position.z - this.position.z) - e.radius * 0.5);
  }

  weaponFor(t) {
    const d = this.def;
    let key;
    if (this.deployed && d.weaponDeployed) key = d.weaponDeployed;
    else if (t.isBuilding && d.weaponBuilding) key = d.weaponBuilding;
    else if (t.isUnit && t.isInfantry && d.weaponInf) key = d.weaponInf;
    else if (t.isUnit && t.hover && d.weaponAir) key = d.weaponAir;
    else key = d.weapon;
    if (!key) return null;
    const w = WEAPONS[key];
    if (weaponCanHit(w, t)) return w;
    if (key !== d.weapon && d.weapon && !(this.deployed && d.weaponDeployed)) {
      const main = WEAPONS[d.weapon];
      if (weaponCanHit(main, t)) return main;
    }
    return null;
  }

  // ------------------------------------------------------------------ orders
  moveTo(x, z, attackMove = false) {
    if (this.deployed && IMMOBILE_DEPLOY.has(this.def.deploy)) this.setDeployed(false);
    if (this.def.teleport) {
      this.order = { type: 'idle' };
      this.game.abilities.teleport(this, x, z);
      return;
    }
    this.order = { type: attackMove && this.hasWeapon ? 'attackMove' : 'move', x, z };
    this.target = null;
    this.repaths = 0;
    this.setPath(x, z);
    if (this.isHarvester) this.releaseDock();
  }

  attack(target) {
    if (!this.weaponFor(target)) return false;
    if (this.deployed && IMMOBILE_DEPLOY.has(this.def.deploy) && this.distTo(target) > this.weaponFor(target).range) this.setDeployed(false);
    this.order = { type: 'attack', target };
    this.target = target;
    this.chaseT = 0;
    this.repaths = 0;
    return true;
  }

  enter(target) {
    if (this.deployed && IMMOBILE_DEPLOY.has(this.def.deploy)) this.setDeployed(false);
    this.order = { type: 'enter', target };
    this.target = null;
    this.chaseT = 0;
    this.repaths = 0;
  }

  drain(target) {
    this.order = { type: 'drain', target };
    this.target = null;
    this.setPath(target.position.x, target.position.z);
  }

  stop() {
    this.order = { type: 'idle' };
    this.target = null;
    this.path = [];
    this.guard.copy(this.position);
    if (this.isHarvester) this.releaseDock();
  }

  harvestAt(tile) {
    if (this.def.slaveMiner) {
      const m = this.game.map;
      if (this.deployed) this.setDeployed(false);
      this.order = { type: 'harvest' };
      this.hstate = 'toField';
      this.fieldGoal = { x: (tile % m.w) + 0.5, z: Math.floor(tile / m.w) + 0.5 };
      this.setPath(this.fieldGoal.x, this.fieldGoal.z);
      return;
    }
    if (!this.isHarvester) return;
    this.releaseDock();
    this.order = { type: 'harvest' };
    this.htile = tile;
    this.hstate = 'toField';
    const m = this.game.map;
    this.setPath((tile % m.w) + 0.5, Math.floor(tile / m.w) + 0.5);
  }

  returnTo(ref) {
    if (!this.isHarvester) return;
    this.releaseDock();
    this.order = { type: 'harvest' };
    this.dockRef = ref;
    this.hstate = 'toRefinery';
    const d = ref.dockPos(_v);
    this.setPath(d.x, d.z);
  }

  releaseDock() {
    if (this.dockRef && this.dockRef.dockUser === this) this.dockRef.dockUser = null;
  }

  canDeploy() {
    const d = this.def.deploy;
    if (!d || this.deployCd > 0) return false;
    if (d === 'unload') return this.passengers.length > 0;
    return true;
  }

  // toggle / trigger the unit's deploy ability
  deploy() {
    const d = this.def.deploy;
    if (!this.canDeploy()) return false;
    const ab = this.game.abilities;
    switch (d) {
      case 'bunker': case 'brace': case 'radiate':
        this.setDeployed(!this.deployed);
        this.path = [];
        this.order = { type: 'idle' };
        this.guard.copy(this.position);
        return true;
      case 'slaveMiner':
        if (this.deployed) { this.setDeployed(false); this.order = { type: 'idle' }; }
        else { this.order = { type: 'harvest' }; this.setDeployed(true); }
        return true;
      case 'psiWave': return ab.psiWave(this);
      case 'mcv': return ab.deployMcv(this);
      case 'unload': return ab.unload(this);
      default: return false;
    }
  }

  setDeployed(v) {
    if (this.deployed === v) return;
    this.deployed = v;
    this.deployCd = 0.6;
    this.path = [];
    if (this.def.slaveMiner) this.game.abilities.slaveMinerDeploy(this, v);
    if (this.def.deploy === 'radiate') this.game.abilities.radiate(this, v);
    if (this.team === 0 && this.game.isVisibleToPlayer(this)) audio.play(v ? 'deploy' : 'undeploy', this.position, 0.7);
  }

  // where to walk to reach a target: for structures, the free tile hugging the footprint nearest to us
  approachPoint(t) {
    if (!t.isBuilding || this.hover) return t.position;
    const map = this.game.map;
    let best = null, bd = Infinity;
    for (let z = t.tz - 1; z <= t.tz + t.h; z++) for (let x = t.tx - 1; x <= t.tx + t.w; x++) {
      if (x >= t.tx && x < t.tx + t.w && z >= t.tz && z < t.tz + t.h) continue;
      if (!map.passable(x, z)) continue;
      const d = (x + 0.5 - this.position.x) ** 2 + (z + 0.5 - this.position.z) ** 2;
      if (d < bd) { bd = d; best = { x: x + 0.5, z: z + 0.5 }; }
    }
    return best || t.position;
  }

  // ------------------------------------------------------------------ pathing / steering
  setPath(x, z) {
    x = clamp(x, 0.6, MAP_W - 0.6);
    z = clamp(z, 0.6, MAP_H - 0.6);
    if (this.hover) {
      this.path = [{ x, z }];
      this.pathIdx = 0;
      this.dest = this.path[0];
      this.stuck = 0;
      this.lastDist = Infinity;
      return;
    }
    const p = this.game.pathfinder.find(this.position.x, this.position.z, x, z);
    this.path = p || [];
    this.pathIdx = this.path.length > 1 ? 1 : 0;
    if (this.path.length) {
      const last = this.path[this.path.length - 1];
      if (Math.floor(last.x) === Math.floor(x) && Math.floor(last.z) === Math.floor(z)) this.path[this.path.length - 1] = { x, z };
    }
    this.dest = this.path.length ? this.path[this.path.length - 1] : null;
    this.stuck = 0;
    this.lastDist = Infinity;
  }

  followPath(dt) {
    if (!this.canMove) return true;
    if (this.pathIdx >= this.path.length) return true;
    const wp = this.path[this.pathIdx];
    const dx = wp.x - this.position.x, dz = wp.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    const last = this.pathIdx === this.path.length - 1;
    if (dist < (last ? 0.12 : 0.4)) {
      this.pathIdx++;
      this.lastDist = Infinity;
      this.stuck = 0;
      return this.pathIdx >= this.path.length;
    }
    this.steer(dx, dz, dist, dt, last);
    if (dist >= this.lastDist - 0.002) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt * 0.5);
    this.lastDist = dist;
    if (this.stuck > 2.2) {
      this.stuck = 0;
      this.repaths++;
      if (this.repaths > 3 || (last && dist < 1.2)) { this.path = []; this.repaths = 0; return true; }
      if (this.dest) this.setPath(this.dest.x, this.dest.z);
    }
    return false;
  }

  steer(dx, dz, dist, dt, slowDown) {
    const desired = Math.atan2(dx, dz);
    const diff = angleDiff(this.heading, desired);
    this.heading = rotateTowards(this.heading, desired, this.def.turnRate * dt);
    const ad = Math.abs(diff);
    const walker = this.def.loco !== 'track';
    let target = this.def.speed * (this.isInfantry || this.hover ? Math.max(0.3, Math.cos(Math.min(ad, 1.3))) : ad > 1.1 ? (walker ? 0.25 : 0.08) : Math.cos(ad));
    if (this.status.slow) target *= 0.5;
    if (slowDown && dist < 0.7) target *= Math.max(0.35, dist / 0.7);
    this.speed += (target - this.speed) * Math.min(1, dt * 5);
    const step = Math.min(Math.max(0, this.speed) * dt, dist);
    this.tryMove(this.position.x + Math.sin(this.heading) * step, this.position.z + Math.cos(this.heading) * step);
    this.moving = true;
  }

  tryMove(nx, nz) {
    const map = this.game.map;
    if (this.hover) {
      this.position.x = clamp(nx, 0.3, MAP_W - 0.3);
      this.position.z = clamp(nz, 0.3, MAP_H - 0.3);
      return true;
    }
    const px = this.position.x, pz = this.position.z;
    if (!map.passable(Math.floor(px), Math.floor(pz)) && map.inBounds(Math.floor(nx), Math.floor(nz))) {
      this.position.x = nx; this.position.z = nz; return true;
    }
    if (map.passable(Math.floor(nx), Math.floor(nz))) { this.position.x = nx; this.position.z = nz; return true; }
    if (map.passable(Math.floor(nx), Math.floor(pz))) { this.position.x = nx; return true; }
    if (map.passable(Math.floor(px), Math.floor(nz))) { this.position.z = nz; return true; }
    return false;
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (!this.alive || this.inside) return;
    this.anim += dt;
    this.firing = Math.max(0, this.firing - dt * 3);
    this.deployCd = Math.max(0, this.deployCd - dt);
    this.deployT += ((this.deployed ? 1 : 0) - this.deployT) * Math.min(1, dt * 5);
    this.moving = false;
    if (this.game.abilities.updateUnitStatus(this, dt)) {
      this.animate(dt);
      this.syncModel();
      return;
    }
    for (const k in this.cd) this.cd[k] -= dt;
    if (this.firing <= 0.01) { this.spinT = Math.max(0, this.spinT - dt * 0.7); }
    this.spin = this.spinT > 3 ? 2 : this.spinT > 1.5 ? 1 : 0;
    if (this.def.regen && this.hp < this.maxHp) {
      const r = this.def.regen < 1 ? (this.hp < this.maxHp * this.def.regen ? this.maxHp * 0.01 : 0) : this.def.regen;
      this.heal(r * dt);
    }
    if (this.vet && this.hp < this.maxHp) this.heal(this.maxHp * 0.003 * dt);

    if (this.status.berserk) this.updateBerserk(dt);
    else {
      switch (this.order.type) {
        case 'move':
          if (this.followPath(dt)) { this.order = { type: 'idle' }; this.guard.copy(this.position); }
          break;
        case 'attackMove': this.updateAttackMove(dt); break;
        case 'attack': this.updateAttack(dt); break;
        case 'enter': this.updateEnter(dt); break;
        case 'drain': this.updateDrain(dt); break;
        case 'harvest':
          if (this.def.slaveMiner) this.updateSlaveMiner(dt);
          else if (this.def.drone) this.updateDrone(dt);
          else this.updateHarvester(dt);
          break;
        default: this.updateIdle(dt);
      }
    }
    // armed harvesters & garrisoned transports shoot opportunistically
    if (this.isHarvester && this.def.weapon) this.opportunisticFire(dt);
    if (this.def.garrisonFire && this.passengers.length) this.game.abilities.garrisonFire(this, dt);
    if (!this.moving) this.speed *= Math.max(0, 1 - dt * 8);
    if (this.def.crush && this.moving) this.game.abilities.crush(this);
    if (this.def.mirage) {
      this.stillT = this.moving || this.firing > 0 ? 0 : this.stillT + dt;
    }
    this.animate(dt);
    this.syncModel();
  }

  updateIdle(dt) {
    if (this.isHarvester || this.def.slaveMiner) {
      this.idleT += dt;
      if (this.idleT > 8) { this.idleT = 0; this.order = { type: 'harvest' }; this.hstate = this.cargo > 0 ? 'toRefineryStart' : 'seek'; }
      return;
    }
    if (!this.hasWeapon) { this.walkHome(dt); return; }
    const g = this.game;
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = 0.45;
      if (!this.target || !this.target.alive || !g.canTarget(this, this.target)) {
        const range = this.maxRange() + (this.canMove ? 2.5 : 0);
        this.target = g.findTarget(this, range);
        if (!this.target && this.lastAttacker && this.lastAttacker.alive && g.time - this.lastHit < 3 && g.canTarget(this, this.lastAttacker) && this.weaponFor(this.lastAttacker)) {
          this.target = this.lastAttacker;
        }
      }
    }
    const t = this.target;
    if (t && t.alive) {
      const w = this.weaponFor(t);
      const leash = (w ? w.range : 4) + 7;
      if (!this.canMove && w && this.distTo(t) > w.range) { this.target = null; return; }
      if (Math.hypot(t.position.x - this.guard.x, t.position.z - this.guard.z) > leash) {
        this.target = null;
        this.setPath(this.guard.x, this.guard.z);
        return;
      }
      this.engage(t, dt);
      return;
    }
    this.walkHome(dt);
  }

  walkHome(dt) {
    if (!this.canMove) return;
    if (this.pathIdx < this.path.length) {
      if (this.followPath(dt)) this.path = [];
    } else if (Math.hypot(this.position.x - this.guard.x, this.position.z - this.guard.z) > 2.0) {
      this.setPath(this.guard.x, this.guard.z);
    }
  }

  maxRange() {
    const d = this.def;
    let r = 0;
    for (const k of [d.weapon, d.weaponDeployed, d.weaponBuilding, d.weaponInf, d.weaponAir]) if (k) r = Math.max(r, WEAPONS[k].range);
    if (this.deployed && d.weaponDeployed) r = WEAPONS[d.weaponDeployed].range;
    return r;
  }

  updateAttack(dt) {
    const t = this.order.target;
    if (!t || !t.alive || !this.game.canTarget(this, t, true) || !this.weaponFor(t)) {
      this.order = { type: 'idle' };
      this.target = null;
      this.guard.copy(this.position);
      return;
    }
    this.target = t;
    this.engage(t, dt);
  }

  updateAttackMove(dt) {
    const g = this.game;
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = 0.45;
      if (!this.target || !this.target.alive || !g.canTarget(this, this.target)) {
        this.target = g.findTarget(this, Math.max(this.maxRange() + 1.5, this.sight - 0.5));
      }
    }
    if (this.target && this.target.alive) {
      this.engage(this.target, dt);
      this.resumeAM = true;
      return;
    }
    if (this.resumeAM) { this.resumeAM = false; this.setPath(this.order.x, this.order.z); }
    if (this.followPath(dt)) { this.order = { type: 'idle' }; this.guard.copy(this.position); }
  }

  updateBerserk(dt) {
    this.retarget -= dt;
    if (this.retarget <= 0 || !this.target || !this.target.alive) {
      this.retarget = 0.5;
      this.target = this.game.findTarget(this, this.sight + 2, { any: true });
    }
    if (this.target && this.target.alive) this.engage(this.target, dt);
  }

  engage(t, dt) {
    const w = this.weaponFor(t);
    if (!w) { this.target = null; return false; }
    const d = this.distTo(t);
    if (d <= w.range && (!w.minRange || d >= w.minRange)) {
      this.path = [];
      this.pathIdx = 0;
      this.aimAndFire(t, w, dt);
      return true;
    }
    this.aimT = Math.max(0, this.aimT - dt);
    if (!this.canMove) return false;
    this.chaseT -= dt;
    if (w.minRange && d < w.minRange) {
      if (this.chaseT <= 0 || this.pathIdx >= this.path.length) {
        this.chaseT = 1.0;
        const ax = this.position.x - t.position.x, az = this.position.z - t.position.z;
        const l = Math.hypot(ax, az) || 1;
        this.setPath(this.position.x + (ax / l) * 3, this.position.z + (az / l) * 3);
      }
    } else if (this.chaseT <= 0 || this.pathIdx >= this.path.length) {
      this.chaseT = t.isBuilding ? 2.0 : 0.9;
      const ap = this.approachPoint(t);
      this.setPath(ap.x, ap.z);
    }
    this.followPath(dt);
    if (this.def.turret) this.aimTurret(t, dt);
    return false;
  }

  aimTurret(t, dt) {
    const desired = Math.atan2(t.position.x - this.position.x, t.position.z - this.position.z);
    this.turretYaw = rotateTowards(this.turretYaw, desired, 5 * dt);
    return Math.abs(angleDiff(this.turretYaw, desired)) < 0.15;
  }

  aimAndFire(t, w, dt) {
    let aligned;
    if (this.def.turret) aligned = this.aimTurret(t, dt);
    else {
      const desired = Math.atan2(t.position.x - this.position.x, t.position.z - this.position.z);
      this.heading = rotateTowards(this.heading, desired, this.def.turnRate * dt * (this.isInfantry ? 1.5 : 1));
      aligned = Math.abs(angleDiff(this.heading, desired)) < (this.isInfantry ? 0.35 : 0.2);
    }
    if (this.def.parts.includes('abdomen')) {
      this.aimT = Math.min(1, this.aimT + dt * 1.2);
      if (this.aimT < 0.95) return;
    }
    const cd = this.cd[w.key] ?? 0;
    if (aligned && cd <= 0) {
      const base = w.spin ? w.spin[this.spin] : w.cooldown;
      this.cd[w.key] = base * (0.9 + Math.random() * 0.2);
      if (w.spin) this.spinT = Math.min(4, this.spinT + base);
      this.root.updateMatrixWorld(true);
      const muzzle = (this.parts.muzzle || this.root).getWorldPosition(new THREE.Vector3());
      if (!this.parts.muzzle) muzzle.y += this.def.height * 0.6;
      this.game.combat.fire(this, t, w, muzzle);
      this.firing = 1;
      this.stillT = 0;
    }
  }

  opportunisticFire(dt) {
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = 0.6;
      const w = WEAPONS[this.def.weapon];
      this.oppTarget = this.game.findTarget(this, w.range);
    }
    const t = this.oppTarget;
    if (t && t.alive) {
      const w = this.weaponFor(t);
      if (w && this.distTo(t) <= w.range) {
        if (this.aimTurret(t, dt) && (this.cd[w.key] ?? 0) <= 0) {
          this.cd[w.key] = w.cooldown;
          this.root.updateMatrixWorld(true);
          const muzzle = (this.parts.muzzle || this.root).getWorldPosition(new THREE.Vector3());
          this.game.combat.fire(this, t, w, muzzle);
          this.firing = 1;
        }
      }
    }
  }

  updateEnter(dt) {
    const t = this.order.target;
    if (!t || !t.alive) { this.order = { type: 'idle' }; return; }
    const reach = (t.isBuilding ? 0.85 : t.radius + this.radius + 0.25);
    const d = t.isBuilding ? t.distFrom(this.position.x, this.position.z) : Math.hypot(t.position.x - this.position.x, t.position.z - this.position.z);
    if (t.isBuilding && t.def.walkable) {
      // depots: drive into the bowl and park
      const inside = this.position.x > t.tx + 0.2 && this.position.x < t.tx + t.w - 0.2 && this.position.z > t.tz + 0.2 && this.position.z < t.tz + t.h - 0.2;
      if (inside) { this.order = { type: 'idle' }; this.guard.copy(this.position); return; }
      if (this.chaseT <= 0 || this.pathIdx >= this.path.length) { this.chaseT = 1.5; this.setPath(t.position.x + rand(-0.6, 0.6), t.position.z + rand(-0.6, 0.6)); }
      this.chaseT -= dt;
      this.followPath(dt);
      return;
    }
    if (d <= reach) {
      this.game.abilities.enter(this, t);
      return;
    }
    this.chaseT -= dt;
    if (this.chaseT <= 0 || this.pathIdx >= this.path.length) {
      this.chaseT = t.isBuilding ? 2.0 : 0.8;
      const ap = this.approachPoint(t);
      this.setPath(ap.x, ap.z);
    }
    if (this.followPath(dt) && d > reach + 1.5) { this.repaths++; if (this.repaths > 4) this.order = { type: 'idle' }; }
  }

  updateDrain(dt) {
    const t = this.order.target;
    if (!t || !t.alive || t.team === this.team) {
      if (t && t.drainedBy === this) t.drainedBy = null;
      this.order = { type: 'idle' };
      return;
    }
    const d = Math.hypot(t.position.x - this.position.x, t.position.z - this.position.z);
    if (d > 0.3) {
      if (this.pathIdx >= this.path.length) this.setPath(t.position.x, t.position.z);
      this.followPath(dt);
      if (t.drainedBy === this && d > 1) t.drainedBy = null;
    } else {
      t.drainedBy = this;
      this.heading += dt * 0.6;
      this.game.abilities.drainTick(this, t, dt);
    }
  }

  // ------------------------------------------------------------------ harvester (Scarab / Trench-Termite)
  updateHarvester(dt) {
    const g = this.game, map = g.map, h = this.def.harvester;
    this.idleT = 0;
    this.harvesting = false;
    switch (this.hstate) {
      case 'seek': {
        this.hWait -= dt;
        if (this.hWait > 0) break;
        const from = this.lastField || this.position;
        const tile = map.nearestResource(from.x, from.z, 999, g.claimedTiles(this));
        if (tile < 0) { if (this.cargo > 0) this.goRefinery(); else this.hWait = 2; break; }
        this.htile = tile;
        this.hstate = 'toField';
        this.setPath((tile % map.w) + 0.5, Math.floor(tile / map.w) + 0.5);
        break;
      }
      case 'toField': {
        if (map.res[this.htile] < 5) { this.hstate = 'seek'; break; }
        const tx = (this.htile % map.w) + 0.5, tz = Math.floor(this.htile / map.w) + 0.5;
        const d = Math.hypot(tx - this.position.x, tz - this.position.z);
        if (d < 0.45) { this.hstate = 'harvesting'; this.path = []; break; }
        if (this.followPath(dt)) {
          if (d < 1.1) this.hstate = 'harvesting';
          else { this.hstate = 'seek'; this.hWait = 0.3; this.lastField = { x: this.position.x, z: this.position.z }; }
        }
        break;
      }
      case 'harvesting': {
        this.harvesting = true;
        this.cargo += map.harvest(this.htile, h.rate * dt);
        if (g.isVisibleToPlayer(this) && Math.random() < dt * 12) {
          g.fx.clods(_v.copy(this.position).setY(0.2), 1);
          if (Math.random() < 0.06) audio.play('harvest', this.position, 0.6);
        }
        if (this.cargo >= h.capacity) {
          this.cargo = h.capacity;
          this.lastField = { x: this.position.x, z: this.position.z };
          this.goRefinery();
        } else if (map.res[this.htile] < 5) {
          const next = map.nearestResource(this.position.x, this.position.z, 4, g.claimedTiles(this));
          if (next >= 0) {
            this.htile = next;
            this.hstate = 'toField';
            this.setPath((next % map.w) + 0.5, Math.floor(next / map.w) + 0.5);
          } else {
            this.lastField = { x: this.position.x, z: this.position.z };
            if (this.cargo > 0) this.goRefinery(); else this.hstate = 'seek';
          }
        }
        break;
      }
      case 'toRefineryStart': this.goRefinery(); break;
      case 'toRefinery': {
        const ref = this.dockRef;
        if (!ref || !ref.alive || !ref.isActive || ref.team !== this.team) { this.goRefinery(); break; }
        const dock = ref.dockPos(_v);
        const d = Math.hypot(dock.x - this.position.x, dock.z - this.position.z);
        const busy = ref.dockUser && ref.dockUser !== this && ref.dockUser.alive;
        if (busy && d < 2.2) { this.path = []; this.hstate = 'waitDock'; break; }
        if (d < 0.3) { this.hstate = 'docking'; ref.dockUser = this; this.path = []; break; }
        if (this.followPath(dt)) {
          if (d < 0.8) { this.hstate = 'docking'; ref.dockUser = this; }
          else this.setPath(dock.x, dock.z);
        }
        break;
      }
      case 'waitDock': {
        const ref = this.dockRef;
        if (!ref || !ref.alive) { this.goRefinery(); break; }
        const u = ref.dockUser;
        if (!u || u === this || !u.alive || u.dockRef !== ref || (u.hstate !== 'docking' && u.hstate !== 'unloading')) {
          ref.dockUser = null;
          this.hstate = 'toRefinery';
          const dock = ref.dockPos(_v);
          this.setPath(dock.x, dock.z);
        }
        break;
      }
      case 'docking': {
        const ref = this.dockRef;
        if (!ref || !ref.alive) { this.hstate = 'seek'; break; }
        const dock = ref.dockPos(_v);
        this.position.x += (dock.x - this.position.x) * Math.min(1, dt * 5);
        this.position.z += (dock.z - this.position.z) * Math.min(1, dt * 5);
        this.heading = rotateTowards(this.heading, Math.PI, 3 * dt);
        if (Math.abs(angleDiff(this.heading, Math.PI)) < 0.08) this.hstate = 'unloading';
        break;
      }
      case 'unloading': {
        const ref = this.dockRef;
        if (!ref || !ref.alive) { this.hstate = 'seek'; break; }
        const amt = Math.min(this.cargo, h.unload * dt);
        this.cargo -= amt;
        g.addCredits(this.team, amt, ref);
        if (this.cargo <= 0.5) {
          this.cargo = 0;
          if (ref.dockUser === this) ref.dockUser = null;
          this.hstate = 'seek';
          this.hWait = 0.2;
        }
        break;
      }
      case 'noRefinery':
        this.hWait -= dt;
        if (this.hWait <= 0) { this.hWait = 2; this.goRefinery(); }
        break;
      default:
        this.hstate = 'seek';
    }
  }

  goRefinery() {
    const ref = this.game.nearestBuildingRole(this.team, 'refinery', this.position);
    this.dockRef = ref;
    if (!ref) { this.hstate = 'noRefinery'; this.hWait = 2; return; }
    if (this.def.harvester.teleportHome && this.cargo > 0) {
      // Quantum Scarab: chrono-jump straight to the dock
      const dock = ref.dockPos(_v);
      this.game.fx.chronoFlash(this.position.clone().setY(0.4), 0.8);
      this.position.set(dock.x, 0, dock.z + 0.6);
      this.game.fx.chronoFlash(this.position.clone().setY(0.4), 0.8);
      if (this.game.isVisibleToPlayer(this)) audio.play('chrono', this.position, 0.6);
      this.path = [];
    }
    this.hstate = 'toRefinery';
    const dock = ref.dockPos(_v);
    this.setPath(dock.x, dock.z);
  }

  // ------------------------------------------------------------------ Brood Queen (slave miner)
  updateSlaveMiner(dt) {
    const g = this.game, map = g.map;
    if (this.deployed) {
      this.game.abilities.slaveMinerTick(this, dt);
      return;
    }
    this.hWait -= dt;
    if (this.hstate === 'toField' && this.fieldGoal) {
      const d = Math.hypot(this.fieldGoal.x - this.position.x, this.fieldGoal.z - this.position.z);
      if (this.followPath(dt) || d < 0.8) {
        this.fieldGoal = null;
        this.hstate = 'idle';
        this.setDeployed(true);
      }
      return;
    }
    if (this.hWait > 0) return;
    this.hWait = 2;
    // find a rich field centre not too far
    const tile = map.nearestResource(this.position.x, this.position.z, 999, null);
    if (tile < 0) return;
    const tx = (tile % map.w) + 0.5, tz = Math.floor(tile / map.w) + 0.5;
    // park next to the field (on a passable non-resource tile if possible)
    const spot = map.nearestPassable(Math.floor(tx), Math.floor(tz), 5, (x, z) => map.res[map.idx(x, z)] <= 0) || { x: Math.floor(tx), z: Math.floor(tz) };
    this.fieldGoal = { x: spot.x + 0.5, z: spot.z + 0.5 };
    this.hstate = 'toField';
    this.setPath(this.fieldGoal.x, this.fieldGoal.z);
  }

  // ------------------------------------------------------------------ Worker drone
  updateDrone(dt) {
    const g = this.game, map = g.map, q = this.queen;
    if (!q || !q.alive || q.team !== this.team) { this.takeDamage(9999, null); return; }
    const home = q.position;
    const rad = q.def.slaveMiner.radius;
    switch (this.dstate) {
      case 'seek': {
        if (!q.deployed) { this.dstate = 'return'; break; }
        const tile = map.nearestResource(this.position.x, this.position.z, rad + 1, g.claimedTiles(this));
        if (tile < 0 || Math.hypot((tile % map.w) + 0.5 - home.x, Math.floor(tile / map.w) + 0.5 - home.z) > rad) {
          this.dstate = this.cargo > 0 ? 'return' : 'idle';
          break;
        }
        this.htile = tile;
        this.dstate = 'toField';
        this.setPath((tile % map.w) + 0.5, Math.floor(tile / map.w) + 0.5);
        break;
      }
      case 'idle':
        this.hWait = (this.hWait || 0) - dt;
        if (this.hWait <= 0) { this.hWait = 1.5; this.dstate = 'seek'; }
        break;
      case 'toField': {
        if (map.res[this.htile] < 5) { this.dstate = 'seek'; break; }
        const tx = (this.htile % map.w) + 0.5, tz = Math.floor(this.htile / map.w) + 0.5;
        if (Math.hypot(tx - this.position.x, tz - this.position.z) < 0.35 || this.followPath(dt)) { this.dstate = 'dig'; this.digT = 0; }
        break;
      }
      case 'dig':
        this.harvesting = true;
        this.digT += dt;
        this.cargo += map.harvest(this.htile, 7 * dt);
        if (Math.random() < dt * 6 && g.isVisibleToPlayer(this)) g.fx.clods(_v.copy(this.position).setY(0.15), 1);
        if (this.cargo >= 30 || map.res[this.htile] < 5 || this.digT > 5) { this.harvesting = false; this.dstate = 'return'; this.setPath(home.x, home.z); }
        break;
      case 'return': {
        const d = Math.hypot(home.x - this.position.x, home.z - this.position.z);
        if (d < q.radius + 0.35) {
          if (this.cargo > 0) { g.addCredits(this.team, this.cargo, q); this.cargo = 0; }
          if (!q.deployed) { this.game.abilities.boardDrone(q, this); return; }
          this.dstate = 'seek';
          break;
        }
        if (this.pathIdx >= this.path.length) this.setPath(home.x, home.z);
        this.followPath(dt);
        break;
      }
      default: this.dstate = 'seek';
    }
  }

  // ------------------------------------------------------------------ visuals
  animate(dt) {
    const p = this.parts;
    if (p.turret) {
      if (!this.target || !this.target.alive) {
        if (!this.oppTarget || !this.oppTarget.alive) this.turretYaw = rotateTowards(this.turretYaw, this.heading, 2.5 * dt);
      }
      p.turret.rotation.y = this.turretYaw - this.heading;
    }
    if (this.rig) {
      animateRig(this.rig, {
        t: this.anim, moving: this.moving || this.harvesting, speed: this.speed, firing: this.firing,
        deployed: this.deployT, aim: this.aimT, flapping: this.hover || this.moving, hover: this.hover,
        spinMul: this.firing > 0 ? 6 + this.spin * 6 : this.moving ? 3 : 0.4,
      }, dt);
    }
    if (p.cargo && this.cargo !== undefined) {
      const cap = this.def.harvester ? this.def.harvester.capacity : 30;
      const k = Math.max(0.02, Math.min(1, this.cargo / cap));
      p.cargo.scale.set(k > 0.03 ? 1 : 0.001, k, k > 0.03 ? 1 : 0.001);
    }
  }

  syncModel() {
    const r = this.root;
    let y = 0;
    if (this.hover) y = this.flyH + Math.sin(this.anim * 2.1 + this.id) * 0.05;
    if (this.status.lifted) y += this.status.lifted.h;
    r.position.set(this.position.x, y, this.position.z);
    r.rotation.y = this.heading;
    if (this.status.lifted) { r.rotation.z = Math.sin(this.anim * 3) * 0.25; r.rotation.x = Math.cos(this.anim * 2.3) * 0.2; }
    else { r.rotation.z = 0; r.rotation.x = 0; }
  }
}

void _f;
