// Weapons & projectiles with warhead-vs-armor damage. Visual styles (fx):
// needle · shell · pierce · fireBolt · flak · bile (lobbed fire) · missile (V3 toxic dart) · seeker (AA pods)
// acid (bile stream) · arc / bigArc (tesla) · prism (beam + refraction splinters) · laser · sonic · melee.
// Non-damage behaviours (mind control, chrono, drill, bombs, C4, gas, magnet, airstrike) → Abilities.
import * as THREE from 'three';
import { audio } from '../audio/Audio.js';
import { rand } from '../core/util.js';
import { weaponDamageMul } from '../data/index.js';

const _v = new THREE.Vector3();
const _d = new THREE.Vector3();

const NEEDLE_COLORS = { allied: 0xfff2a0, soviet: 0xb6ff5a, yuri: 0xe0a0ff };

export class Combat {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
  }

  fire(shooter, target, w, muzzle, mul = 1, burstIndex = 0) {
    const g = this.game, fx = g.fx;
    if (!target || !target.alive) return;
    const aim = target.aimPoint(new THREE.Vector3());
    if (target.isUnit) { aim.x += rand(-0.06, 0.06); aim.z += rand(-0.06, 0.06); }
    _d.subVectors(aim, muzzle).normalize();
    const seen = g.isVisibleToPlayer(shooter) || g.isVisibleToPlayer(target);
    if (seen && w.sound) audio.play(w.sound, muzzle);

    if (w.special && g.abilities.special(shooter, target, w, muzzle, seen)) return;

    if (w.burst && burstIndex === 0) {
      for (let i = 1; i < w.burst; i++) {
        fx.after(i * 0.14, () => {
          if (!shooter.alive || !target.alive) return;
          const m = shooter.parts && (shooter.parts[i % 2 ? 'muzzle2' : 'muzzle'] || shooter.parts.muzzle);
          const p = m ? m.getWorldPosition(new THREE.Vector3()) : muzzle;
          this.fire(shooter, target, w, p, mul, i);
        });
      }
    }

    const team = shooter.team;
    const base = { pos: muzzle.clone(), target, aim, w, shooter, team, mul, life: 3 };
    const faction = shooter.faction;
    switch (w.fx) {
      case 'needle': {
        fx.muzzle(muzzle, _d, NEEDLE_COLORS[faction] || 0xffe08a, 0.35);
        this.projectiles.push({ ...base, type: 'needle', speed: w.speed || 26, color: w.color || NEEDLE_COLORS[faction] });
        break;
      }
      case 'shell':
        fx.muzzle(muzzle, _d, 0xffd27a, 0.9);
        this.projectiles.push({ ...base, type: 'shell', speed: w.speed || 18 });
        break;
      case 'pierce':
        fx.muzzle(muzzle, _d, 0xe8f6ff, 0.6);
        this.projectiles.push({ ...base, type: 'pierce', speed: w.speed || 26 });
        break;
      case 'fireBolt':
        fx.muzzle(muzzle, _d, 0xff8a3a, 0.4);
        this.projectiles.push({ ...base, type: 'fireBolt', speed: w.speed || 14 });
        break;
      case 'flak':
        fx.muzzle(muzzle, _d, 0xffc860, 0.5);
        this.projectiles.push({ ...base, type: 'flak', speed: w.speed || 20 });
        break;
      case 'seeker':
        fx.muzzle(muzzle, _d, 0xffe0a0, 0.5);
        this.projectiles.push({ ...base, type: 'seeker', speed: w.speed || 14, vel: new THREE.Vector3(rand(-1, 1), 3, rand(-1, 1)), life: 4 });
        break;
      case 'bile': case 'missile': {
        const start = muzzle.clone();
        const end = target.isUnit ? target.position.clone().setY(target.hover ? target.flyH : 0.1) : aim.clone().setY(0.25);
        if (target.isUnit && target.moving) {
          end.x += Math.sin(target.heading) * target.speed * 0.5;
          end.z += Math.cos(target.heading) * target.speed * 0.5;
        }
        const dist = start.distanceTo(end);
        const missile = w.fx === 'missile';
        const dur = (missile ? 1.2 : 0.3) + dist / (w.speed || 10);
        this.projectiles.push({ ...base, type: w.fx, start, end, t: 0, dur, height: missile ? 3 + dist * 0.25 : 0.8 + dist * 0.15 });
        if (missile) { fx.smoke(start, 0x9a948a, 0.5, 1.2, 0.6); fx.muzzle(start, new THREE.Vector3(0, 1, 0), 0xb6ff5a, 1.2); }
        else fx.spray(start, _d, 0xffa040);
        break;
      }
      case 'acid':
        fx.spray(muzzle, _d, 0x9bff3a);
        this.projectiles.push({ ...base, type: 'stream', speed: 12, color: 0x9bff3a, color1: 0x4a8a10, life: 1.2, t: 0 });
        break;
      case 'arc': case 'bigArc': {
        const big = w.fx === 'bigArc';
        fx.arc(muzzle, aim, { life: big ? 0.38 : 0.22, width: big ? 0.2 : 0.09, jitter: big ? 0.7 : 0.35, segments: big ? 18 : 10 });
        if (big) {
          fx.arc(muzzle, aim, { life: 0.28, width: 0.08, jitter: 1.1, segments: 14, color: 0xd6a8ff });
          for (let i = 0; i < 2; i++) {
            const mid = muzzle.clone().lerp(aim, rand(0.4, 0.7));
            const fork = mid.clone().add(new THREE.Vector3(rand(-1, 1), rand(-0.6, 0.2), rand(-1, 1)));
            fork.y = Math.max(0.05, fork.y);
            fx.arc(mid, fork, { life: 0.22, width: 0.06, jitter: 0.4, segments: 8 });
          }
          if (seen) g.camera.shake = Math.max(g.camera.shake, 0.04);
        }
        fx.sparks(aim, big ? 14 : 5, 0xb8f6ff);
        fx.add.emit({ x: aim.x, y: aim.y, z: aim.z, life: 0.15, size: big ? 1.6 : 0.6, size1: 0.3, color: 0xd8fbff, color1: 0x5ae4ff, alpha: 1.4 });
        this.damage(target, w, shooter, mul);
        break;
      }
      case 'prism': {
        const width = 0.12 + Math.min(0.3, (mul - 1) * 0.08);
        fx.beam(muzzle, aim, { color: 0xfff0a0, width, life: 0.32 });
        fx.beam(muzzle, aim, { color: 0xffffff, width: width * 0.35, life: 0.22 });
        fx.add.emit({ x: aim.x, y: aim.y, z: aim.z, life: 0.2, size: 1.2 * mul, size1: 0.3, color: 0xffffff, color1: 0xffd040, alpha: 1.4 });
        fx.add.emit({ x: muzzle.x, y: muzzle.y, z: muzzle.z, life: 0.2, size: 0.9, size1: 0.2, color: 0xffffff, color1: 0xffe070, alpha: 1.3 });
        fx.sparks(aim, 8, 0xfff2a0);
        this.damage(target, w, shooter, mul);
        if (w.splinters) {
          const near = g.entitiesNear(aim.x, aim.z, w.splinterRange)
            .filter((e) => e !== target && e.alive && e.team !== shooter.team && e.targetable && !(e.isUnit && e.hover))
            .slice(0, w.splinters);
          for (const e of near) {
            const p = e.aimPoint(new THREE.Vector3());
            fx.beam(aim, p, { color: 0xffe080, width: 0.06, life: 0.25 });
            this.damage(e, w, shooter, mul * 0.5);
          }
        }
        break;
      }
      case 'laser':
        fx.beam(muzzle, aim, { color: w.color || 0xff3a2a, width: 0.06, life: 0.16 });
        fx.add.emit({ x: aim.x, y: aim.y, z: aim.z, life: 0.12, size: 0.5, size1: 0.1, color: 0xffffff, color1: w.color || 0xff3a2a, alpha: 1.2 });
        this.damage(target, w, shooter, mul);
        break;
      case 'sonic':
        fx.sonicWave(muzzle, aim);
        fx.after(0.35, () => { if (target.alive) { this.damage(target, w, shooter, mul); fx.impact(aim, 0.6, false); } });
        break;
      case 'melee':
        fx.impact(aim, 0.35, false);
        this.damage(target, w, shooter, mul);
        break;
      default:
        this.damage(target, w, shooter, mul);
    }
  }

  damage(target, w, attacker, mul = 1) {
    if (!target || !target.alive) return;
    const k = weaponDamageMul(w.warhead, target.armor);
    if (k <= 0) return;
    const vet = attacker && attacker.vet ? 1.25 : 1;
    const before = target.alive;
    target.takeDamage(w.damage * mul * k * vet * rand(0.9, 1.1), attacker);
    if (before && !target.alive && w.special === 'virus') this.game.abilities.virusCloud(target.position, attacker);
  }

  splash(pos, radius, w, team, attacker, mul = 1) {
    for (const e of this.game.entitiesNear(pos.x, pos.z, radius + 2)) {
      if (!e.alive || e.team === team || !e.targetable) continue;
      if (e.isUnit && e.hover && !w.air) continue;
      const d = e.isBuilding ? e.distFrom(pos.x, pos.z) : Math.hypot(e.position.x - pos.x, e.position.z - pos.z);
      if (d > radius) continue;
      this.damage(e, w, attacker, mul * (1 - (d / radius) * 0.6));
    }
  }

  update(dt) {
    const g = this.game, fx = g.fx;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      let done = false;
      if (p.type === 'bile' || p.type === 'missile') {
        p.t += dt;
        const k = Math.min(1, p.t / p.dur);
        const e = p.type === 'missile' ? k * k * (3 - 2 * k) : k;
        const x = p.start.x + (p.end.x - p.start.x) * e;
        const z = p.start.z + (p.end.z - p.start.z) * e;
        const y = p.start.y + (p.end.y - p.start.y) * k + Math.sin(Math.PI * k) * p.height;
        if (p.type === 'missile') {
          fx.add.emit({ x, y, z, life: 0.06, size: 0.45, color: 0xd8ff8a, alpha: 1.4 });
          if (Math.random() < 0.8) fx.alpha.emit({ x, y, z, vy: 0.2, life: 1.4, size: 0.25, size1: 0.9, color: 0x8a847a, alpha: 0.5, drag: 1 });
        } else {
          fx.add.emit({ x, y, z, life: 0.08, size: 0.3, size1: 0.1, color: 0xffd060, color1: 0xff4010, alpha: 1.3 });
          if (Math.random() < 0.5) fx.alpha.emit({ x, y, z, life: 0.4, size: 0.1, size1: 0.25, color: 0x553322, alpha: 0.5 });
        }
        if (k >= 1) {
          done = true;
          const seen = g.isVisibleToPlayerPos(p.end.x, p.end.z);
          if (p.type === 'missile') {
            fx.explosion(p.end, 1.3);
            fx.spores(p.end, 18, 1.2, 0xb6ff5a);
            fx.scorch(p.end.x, p.end.z, 1.2, 30);
            if (seen) { audio.play('explode', p.end, 0.9); g.camera.shake = Math.max(g.camera.shake, 0.12); }
          } else {
            fx.fireball(p.end, 0.8);
            fx.scorch(p.end.x, p.end.z, 0.6, 15);
            if (seen) audio.play('burn', p.end, 0.6);
          }
          this.splash(p.end, p.w.splash || 0.6, p.w, p.team, p.shooter, p.mul);
        }
      } else {
        if (p.target && p.target.alive) p.target.aimPoint(p.aim);
        _v.subVectors(p.aim, p.pos);
        const dist = _v.length();
        let step = p.speed * dt;
        p.life -= dt;
        if (p.type === 'seeker') {
          // homing pods: curve toward target
          _v.normalize().multiplyScalar(p.speed);
          p.vel.lerp(_v, Math.min(1, dt * 4));
          step = p.vel.length() * dt;
        }
        if (dist <= step || p.life <= 0) {
          done = true;
          p.pos.copy(p.aim);
          this.impact(p);
          if (p.target && p.target.alive) {
            if (p.w.splash) this.splash(p.pos, p.w.splash, p.w, p.team, p.shooter, p.mul);
            else this.damage(p.target, p.w, p.shooter, p.mul);
          }
        } else {
          if (p.type === 'seeker') p.pos.addScaledVector(p.vel, dt);
          else p.pos.addScaledVector(_v, step / dist);
          this.trail(p, dt);
        }
      }
      if (done) this.projectiles.splice(i, 1);
    }
  }

  trail(p) {
    const fx = this.game.fx;
    const { x, y, z } = p.pos;
    switch (p.type) {
      case 'needle':
        fx.add.emit({ x, y, z, life: 0.05, size: 0.14, size1: 0.04, color: p.color || 0xfff2a0, alpha: 1.3 });
        break;
      case 'shell':
        fx.add.emit({ x, y, z, life: 0.05, size: 0.3, color: 0xfff0b0, alpha: 1.2 });
        fx.alpha.emit({ x, y, z, life: 0.35, size: 0.08, size1: 0.22, color: 0xb8b0a0, alpha: 0.35 });
        break;
      case 'pierce':
        fx.add.emit({ x, y, z, life: 0.12, size: 0.22, size1: 0.05, color: 0xe8f6ff, color1: 0x6ac8ff, alpha: 1.3 });
        break;
      case 'fireBolt':
        fx.add.emit({ x, y, z, life: 0.18, size: 0.3, size1: 0.05, color: 0xffd060, color1: 0xff3a08, alpha: 1.3 });
        break;
      case 'flak':
        fx.add.emit({ x, y, z, life: 0.06, size: 0.18, color: 0xffd080, alpha: 1.1 });
        break;
      case 'seeker':
        fx.add.emit({ x, y, z, life: 0.06, size: 0.22, color: 0xfff0c0, alpha: 1.2 });
        fx.alpha.emit({ x, y, z, life: 0.8, size: 0.1, size1: 0.35, color: 0xaaa49a, alpha: 0.45, drag: 1 });
        break;
      case 'stream':
        p.t = (p.t || 0) + 0.016;
        for (let k = 0; k < 3; k++) fx.dropTrail(p.pos, p.color, p.color1);
        break;
      default: break;
    }
  }

  impact(p) {
    const g = this.game, fx = g.fx;
    const seen = g.isVisibleToPlayerPos(p.pos.x, p.pos.z);
    switch (p.type) {
      case 'needle': fx.impact(p.pos, 0.25, false); break;
      case 'shell': fx.impact(p.pos, 0.8, true); break;
      case 'pierce': fx.impact(p.pos, 0.6, false); fx.sparks(p.pos, 6, 0xe8f6ff); break;
      case 'fireBolt': fx.fireball(p.pos, 0.35); break;
      case 'flak': fx.flakBurst(p.pos); break;
      case 'seeker': fx.explosion(p.pos, 0.45); if (seen) audio.play('explode', p.pos, 0.4); break;
      case 'stream': fx.splash(p.pos, 0.6, p.color); break;
      default: fx.impact(p.pos, 0.4, false);
    }
  }
}
