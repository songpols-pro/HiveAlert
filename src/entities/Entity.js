// Base for units & buildings: health, armor, ownership (mind control swaps the model),
// status effects and veterancy.
import * as THREE from 'three';
import { createModel } from '../models/index.js';

let nextId = 1;

export class Entity {
  constructor(game, kind, team, def) {
    this.id = nextId++;
    this.game = game;
    this.kind = kind;
    this.team = team;
    this.origTeam = team;
    this.def = def;
    this.vet = 0;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.alive = true;
    this.selected = false;
    this.position = new THREE.Vector3();
    this.lastHit = -99;
    this.lastAttacker = null;
    this.root = null;
    this.parts = {};
    this.rig = null;
    // status effects: invuln, berserk, erasing, drilled, lifted, bomb, c4, phasing, drained…
    this.status = {};
    this.controlled = []; // units this entity mind-controls
    this.controller = null; // who mind-controls this entity
    this.passengers = [];
    this.anim = Math.random() * 10;
    this.firing = 0;
  }

  get isUnit() { return false; }
  get isBuilding() { return false; }
  get faction() { return this.def.faction; }
  get armor() { return this.def.armor; }
  get sight() { return this.def.sight || 5; }
  get name() { return this.def.name; }
  get targetable() { return this.alive && !this.status.erasing && !this.inside; }

  makeModel() {
    const { root, parts, rig } = createModel(this.kind, this.team);
    this.root = root;
    this.parts = parts;
    this.rig = rig;
    root.userData.entity = this;
    this.game.scene.add(root);
  }

  // change owner (mind control, capture, release) — rebuilds the house-coloured model
  setTeam(team) {
    if (team === this.team) return;
    const old = this.team;
    const pos = this.root.position.clone(), rot = this.root.rotation.clone(), vis = this.root.visible;
    this.root.removeFromParent();
    this.team = team;
    this.makeModel();
    this.root.position.copy(pos);
    this.root.rotation.copy(rot);
    this.root.visible = vis;
    this.onModelRebuilt?.();
    this.game.onTeamChanged(this, old);
  }

  takeDamage(dmg, attacker) {
    if (!this.alive || dmg <= 0) return;
    if (this.status.invuln || this.status.erasing) return;
    this.hp -= dmg;
    this.lastHit = this.game.time;
    if (attacker && attacker.alive) this.lastAttacker = attacker;
    this.game.onDamaged(this, attacker);
    if (this.hp <= 0) {
      this.hp = 0;
      this.game.destroy(this, attacker);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  makeVeteran() {
    if (this.vet) return;
    this.vet = 1;
    this.maxHp = Math.round(this.maxHp * 1.25);
    this.hp = Math.min(this.maxHp, this.hp * 1.25);
  }

  aimPoint(out = new THREE.Vector3()) {
    return out.copy(this.position).setY(0.3);
  }

  distFrom(x, z) {
    return Math.hypot(this.position.x - x, this.position.z - z);
  }

  dispose() {
    if (this.root) this.root.removeFromParent();
    if (this.aura) this.aura.removeFromParent();
  }
}
