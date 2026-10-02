// Enemy AI for any of the three factions. Role-based build order, harvesters (incl. the Yuri
// slave-miner queen), a defense mix, an army that harasses early and sends escalating waves,
// base defense, and superweapon use.
import * as THREE from 'three';
import { BUILDINGS, UNITS, FACTIONS } from '../data/index.js';
import { DIFFICULTY } from '../config.js';

export class AIController {
  constructor(game, team) {
    this.game = game;
    this.team = team;
    this.t = 0;
    this.thinkT = 0;
    this.waveT = 0;
    this.wave = 0;
    this.harassDone = false;
    this.army = new Set();
    this.raiders = new Set();
    this.swReadyAt = {};
    this.setDifficulty('normal');
  }

  setDifficulty(name) {
    this.difficulty = name;
    this.cfg = DIFFICULTY[name] || DIFFICULTY.normal;
    this.nextWave = this.cfg.firstWave;
    this.game.teams[this.team].credits = this.cfg.aiCredits;
  }

  get T() { return this.game.teams[this.team]; }
  get F() { return FACTIONS[this.T.faction]; }

  kind(role) { return this.F.roles[role]; }

  update(dt) {
    this.t += dt;
    this.thinkT -= dt;
    if (this.thinkT > 0) return;
    this.thinkT = 1.0;
    const g = this.game, T = this.T, P = T.production;
    if (T.defeated) return;
    T.credits += this.cfg.subsidy;

    // ------------------------------------------------ place finished structures
    for (const q of ['structures', 'defense']) {
      const s = P.slots[q];
      if (!s || !s.ready) continue;
      const def = BUILDINGS[s.kind];
      const around = def.tab === 'defense' ? this.frontPoint() : null;
      const spot = g.findPlacement(this.team, s.kind, around) || g.findPlacement(this.team, s.kind);
      if (spot) { P.takeReady(s.kind); g.spawnBuilding(s.kind, this.team, spot.x, spot.z); }
      else P.cancel(s.kind);
    }

    // ------------------------------------------------ structures
    if (!P.slots.structures) {
      const want = this.nextStructure();
      if (want && P.available(want) && T.credits > BUILDINGS[want].cost * 0.35) P.start(want);
    }
    if (!P.slots.defense && T.credits > 1200) {
      const want = this.nextDefense();
      if (want && P.available(want)) P.start(want);
    }

    // ------------------------------------------------ units
    const myUnits = g.units.filter((u) => u.team === this.team && u.alive && !u.inside);
    const harvKind = this.kind('harvester');
    const miners = myUnits.filter((u) => u.isHarvester || u.def.slaveMiner).length + P.countQueued(harvKind);
    if (miners < this.cfg.maxHarvesters && P.available(harvKind)) P.start(harvKind);
    const armyCap = 7 + this.wave * this.cfg.waveGrowth;
    if (this.army.size < armyCap) {
      if (P.queues.infantry.length < 1 && T.credits > 400) { const k = this.pickUnit('infantry'); if (k) P.start(k); }
      if (P.queues.vehicles.length < 1 && T.credits > 900) { const k = this.pickUnit('vehicle'); if (k) P.start(k); }
    }

    // ------------------------------------------------ army bookkeeping
    for (const u of myUnits) {
      if (u.isMiner || u.def.drone || !u.hasWeapon || u.controller) continue;
      if (!this.army.has(u) && !this.raiders.has(u)) this.army.add(u);
    }
    for (const set of [this.army, this.raiders]) for (const u of set) if (!u.alive || u.team !== this.team || u.inside) set.delete(u);

    const threat = this.findThreat();
    if (threat) {
      for (const u of this.army) if (u.order.type === 'idle' && u.weaponFor(threat)) u.attack(threat);
    }

    if (!this.harassDone && this.t > this.cfg.harassAt) {
      const fast = [...this.army].filter((u) => u.def.speed > 2.8).slice(0, 2);
      const pick = fast.length ? fast : [...this.army].slice(0, 2);
      if (pick.length) {
        this.harassDone = true;
        const tgt = this.pickTarget(true);
        for (const s of pick) { this.army.delete(s); this.raiders.add(s); if (tgt) s.moveTo(tgt.x, tgt.z, true); }
      }
    }

    this.waveT += 1;
    const waveSize = Math.min(12, 4 + this.wave * this.cfg.waveGrowth);
    if (this.t > this.nextWave && (this.army.size >= waveSize || this.waveT > 120)) {
      const tgt = this.pickTarget(false);
      if (tgt && this.army.size >= 3) {
        this.wave++;
        this.waveT = 0;
        this.nextWave = this.t + this.cfg.waveGap + Math.random() * 40;
        const home = this.homePos();
        const sq = [...this.army].sort((a, b) => b.position.distanceTo(home) - a.position.distanceTo(home)).slice(0, waveSize);
        sq.forEach((u, i) => {
          this.army.delete(u);
          this.raiders.add(u);
          if (u.deployed) u.setDeployed(false);
          u.moveTo(tgt.x + ((i % 4) - 1.5) * 0.9, tgt.z + (Math.floor(i / 4) - 1) * 0.9, true);
        });
        g.emitEva(0, 'Warning: enemy forces approaching', 'alarm');
      }
    }
    for (const u of this.raiders) {
      if (u.order.type === 'idle') {
        const tgt = this.pickTarget(false, u.position);
        if (tgt) u.moveTo(tgt.x, tgt.z, true);
      }
    }

    this.useSuperweapons();
  }

  nextStructure() {
    const T = this.T, k = (r) => this.kind(r);
    const surplus = T.powerSupply - T.powerDemand;
    if (T.lowPower || surplus < 40) return k('power');
    if (k('refinery') && !T.has(k('refinery'))) return k('refinery');
    if (!T.has(k('barracks'))) return k('barracks');
    if (!T.has(k('factory'))) return k('factory');
    if (this.t > 60 && !T.has(k('radar'))) return k('radar');
    if (this.t > 150 && k('tech') && !T.has(k('tech')) && T.credits > 2200) return k('tech');
    if (k('refinery') && T.count(k('refinery')) < 2 && this.t > 300 && T.credits > 3000) return k('refinery');
    if (k('purifier') && T.has(k('tech')) && !T.has(k('purifier')) && T.credits > 3000) return k('purifier');
    if (k('depot') && !T.has(k('depot')) && this.t > 240) return k('depot');
    if (k('cloning') && !T.has(k('cloning')) && this.t > 300 && T.credits > 3000) return k('cloning');
    if (this.t > 360) {
      for (const sw of this.F.superweapons) if (!T.has(sw) && T.credits > BUILDINGS[sw].cost * 0.6) return sw;
    }
    if (T.count(k('barracks')) < 2 && this.t > 420 && T.credits > 2500) return k('barracks');
    if (T.count(k('factory')) < 2 && this.t > 480 && T.credits > 4000) return k('factory');
    return null;
  }

  nextDefense() {
    const T = this.T, k = (r) => this.kind(r);
    const want = [['antiInf', 2], ['antiArmor', 2], ['aa', 1], ['antiArmor', 4], ['antiInf', 3], ['gap', 1]];
    for (const [role, n] of want) {
      const kind = k(role);
      if (!kind || !BUILDINGS[kind]) continue;
      if (T.count(kind) < n && T.production.available(kind)) return kind;
    }
    return null;
  }

  pickUnit(type) {
    const P = this.T.production;
    const opts = this.F.aiMix.filter(([k]) => UNITS[k].type === type && P.available(k));
    if (!opts.length) return null;
    const tot = opts.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * tot;
    for (const [k, w] of opts) { r -= w; if (r <= 0) return k; }
    return opts[0][0];
  }

  homePos() {
    const g = this.game;
    const hq = g.buildings.find((b) => b.team === this.team && b.def.role === 'cy' && b.alive) || g.buildings.find((b) => b.team === this.team && b.alive);
    return hq ? hq.position : new THREE.Vector3(18, 0, 18);
  }

  // a point on the side of our base facing the enemy (for defenses)
  frontPoint() {
    const home = this.homePos();
    const enemy = this.game.buildings.find((b) => b.team !== this.team && b.alive);
    if (!enemy) return null;
    const d = new THREE.Vector3().subVectors(enemy.position, home).setY(0).normalize();
    return { position: home.clone().addScaledVector(d, 5) };
  }

  pickTarget(harass, from = null) {
    const g = this.game;
    if (harass) {
      const h = g.units.find((u) => u.team !== this.team && u.alive && !u.inside && u.isMiner);
      if (h) return h.position.clone();
    }
    const enemies = g.buildings.filter((b) => b.team !== this.team && b.alive);
    if (!enemies.length) {
      const u = g.units.find((x) => x.team !== this.team && x.alive && !x.inside);
      return u ? u.position.clone() : null;
    }
    const ref = from || this.homePos();
    enemies.sort((a, b) => {
      const pa = (a.def.role === 'refinery' ? -6 : 0) + (a.def.role === 'defense' ? 4 : 0);
      const pb = (b.def.role === 'refinery' ? -6 : 0) + (b.def.role === 'defense' ? 4 : 0);
      return a.position.distanceTo(ref) + pa - (b.position.distanceTo(ref) + pb);
    });
    return enemies[0].position.clone();
  }

  findThreat() {
    const g = this.game;
    for (const b of g.buildings) {
      if (b.team !== this.team || !b.alive) continue;
      if (g.time - b.lastHit < 4 && b.lastAttacker && b.lastAttacker.alive && b.lastAttacker.team !== this.team) return b.lastAttacker;
    }
    for (const u of g.units) {
      if (u.team !== this.team || !u.alive || !u.isMiner) continue;
      if (g.time - u.lastHit < 4 && u.lastAttacker && u.lastAttacker.alive && u.lastAttacker.team !== this.team) return u.lastAttacker;
    }
    return null;
  }

  densest(list, r) {
    let best = null, bn = 0;
    for (const a of list) {
      let n = 0;
      for (const b of list) if (a.position.distanceTo(b.position) < r) n += b.isBuilding ? 2 : 1;
      if (n > bn) { bn = n; best = a; }
    }
    return best ? best.position.clone() : null;
  }

  useSuperweapons() {
    const g = this.game, sws = g.superweapons;
    for (const s of sws.list(this.team)) {
      if (!s.ready) continue;
      this.swReadyAt[s.key] ??= this.t;
      if (this.t - this.swReadyAt[s.key] < this.cfg.swDelay) continue;
      const enemyB = g.buildings.filter((b) => b.team !== this.team && b.alive);
      const enemyU = g.units.filter((u) => u.team !== this.team && u.alive && !u.inside);
      let p = null, p2 = null;
      switch (s.key) {
        case 'nuke': case 'storm': p = this.densest(enemyB, 4) || this.densest(enemyU, 4); break;
        case 'mutator': p = this.densest(enemyU.filter((u) => u.isInfantry), 3); break;
        case 'dominator': p = this.densest(enemyU, 3.5) || this.densest(enemyB, 3.5); break;
        case 'ironCurtain': {
          const raid = [...this.raiders];
          if (raid.length >= 3) p = this.densest(raid, 2);
          break;
        }
        case 'chronoshift': {
          const army = [...this.army].filter((u) => !u.isInfantry);
          const src = this.densest(army, 1.6);
          const tgt = this.pickTarget(false);
          if (src && tgt) {
            const d = new THREE.Vector3().subVectors(this.homePos(), tgt).setY(0).normalize();
            p = src;
            p2 = tgt.clone().addScaledVector(d, 6);
          }
          break;
        }
        default: break;
      }
      if (p) { sws.launch(this.team, s.key, p, p2); delete this.swReadyAt[s.key]; }
    }
  }
}
