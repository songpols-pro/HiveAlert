// Mouse / keyboard controller: selection (click, shift, double-click, drag box, control groups),
// contextual right-click orders (move / attack / enter / infiltrate / drain / harvest / dock / rally),
// deploy, attack-move, sell & repair modes, superweapon targeting, building placement with a
// holographic ghost + green/red footprint grid, and camera panning.
import * as THREE from 'three';
import { BUILDINGS, UNITS, WEAPONS, SUPERWEAPONS } from '../data/index.js';
import { createModel } from '../models/index.js';
import { audio } from '../audio/Audio.js';
import { pick } from '../core/util.js';

const _sphere = new THREE.Sphere();
const _hit = new THREE.Vector3();
const _p = { x: 0, y: 0, visible: true };
const _c = new THREE.Color();
const _m4 = new THREE.Matrix4();

const CELL_VS = /* glsl */`
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    vColor = instanceColor;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const CELL_FS = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vec2 d = abs(vUv - 0.5) * 2.0;
    float edge = max(d.x, d.y);
    float border = smoothstep(0.78, 0.95, edge);
    float a = 0.22 + border * 0.7;
    a *= 0.85 + 0.15 * sin(uTime * 6.0);
    gl_FragColor = vec4(vColor * (1.0 + border), a);
  }
`;

export class Input {
  constructor(game, dom) {
    this.game = game;
    this.dom = dom;
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0, inside: false, winX: 0, winY: 0 };
    this.keys = new Set();
    this.selected = new Set();
    this.groups = {};
    this.mode = 'normal';
    this.placing = null;
    this.placementOk = false;
    this.sw = null; // superweapon targeting { key, src }
    this.dragBox = null;
    this.hoverEntity = null;
    this.ground = new THREE.Vector3();
    this.lastClick = { t: 0, e: null };
    this.lastGroupKey = { k: null, t: 0 };
    this.edgeScroll = true;
    this.lastPing = null;
    this.uniforms = { uTime: { value: 0 } };
    this.buildCursorMeshes();
    this.bind();
    game.bus.on('removed', (e) => { this.selected.delete(e); e.selected = false; if (this.hoverEntity === e) this.hoverEntity = null; this.game.bus.emit('ui:selection', this.selected); });
    game.bus.on('ping', (x, z) => { this.lastPing = { x, z }; });
  }

  // ------------------------------------------------------------------ cursor meshes
  buildCursorMeshes() {
    const scene = this.game.scene;
    const plane = new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: CELL_VS, fragmentShader: CELL_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.cells = new THREE.InstancedMesh(plane, mat, 16);
    this.cells.count = 0;
    this.cells.frustumCulled = false;
    this.cells.renderOrder = 8;
    for (let i = 0; i < 16; i++) this.cells.setColorAt(i, _c.set(0xffffff));
    scene.add(this.cells);
    this.hoverTile = new THREE.InstancedMesh(plane, mat, 1);
    this.hoverTile.setColorAt(0, _c.set(0x9dff9a));
    this.hoverTile.frustumCulled = false;
    this.hoverTile.renderOrder = 8;
    this.hoverPos = new THREE.Vector3(-10, 0.03, -10);
    scene.add(this.hoverTile);
    this.holo = new THREE.MeshBasicMaterial({ color: 0x7dff5a, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
    this.ghost = null;
  }

  // ------------------------------------------------------------------ events
  bind() {
    const el = this.dom;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('mousemove', (e) => this.onMove(e));
    el.addEventListener('mousedown', (e) => this.onDown(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    el.addEventListener('mouseenter', () => { this.mouse.inside = true; });
    el.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 1 / 1.14 : 1.14;
      this.game.camera.zoomBy(f, new THREE.Vector2(this.mouse.ndcX, this.mouse.ndcY));
    }, { passive: false });
    window.addEventListener('mousemove', (e) => { this.mouse.winX = e.clientX; this.mouse.winY = e.clientY; this.mouse.inWindow = true; });
    document.addEventListener('mouseleave', () => { this.mouse.inWindow = false; });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.inWindow = false; });
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  updateMouse(e) {
    const r = this.dom.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    this.mouse.ndcX = (this.mouse.x / r.width) * 2 - 1;
    this.mouse.ndcY = -(this.mouse.y / r.height) * 2 + 1;
  }

  onMove(e) {
    this.updateMouse(e);
    this.mouse.inside = true;
    if (this.down && this.down.button === 0 && !this.placing && !this.sw) {
      const dx = this.mouse.x - this.down.x, dy = this.mouse.y - this.down.y;
      if (this.dragBox || Math.hypot(dx, dy) > 6) this.dragBox = { x0: this.down.x, y0: this.down.y, x1: this.mouse.x, y1: this.mouse.y };
    }
    if (this.down && this.down.button === 1) {
      const cam = this.game.camera;
      cam.pan(-e.movementX * cam.unitsPerPixel, e.movementY * cam.unitsPerPixel);
    }
  }

  onDown(e) {
    audio.init();
    this.updateMouse(e);
    this.down = { x: this.mouse.x, y: this.mouse.y, button: e.button, shift: e.shiftKey, ctrl: e.ctrlKey };
    if (e.button === 2) {
      this.down = null;
      if (this.placing) { this.cancelPlacement(); return; }
      if (this.sw) { this.cancelSW(); return; }
      if (this.mode !== 'normal') { this.setMode('normal'); return; }
      const target = this.pickEntity(this.mouse.ndcX, this.mouse.ndcY, this.mouse.x, this.mouse.y);
      const g = this.game.camera.screenToGround(this.mouse.ndcX, this.mouse.ndcY);
      if (g) this.commandAt(g.x, g.z, e.ctrlKey, target);
    }
  }

  onUp(e) {
    if (!this.down) return;
    const d = this.down;
    this.down = null;
    if (e.button !== d.button || d.button !== 0) return;
    if (this.placing) { this.tryPlace(); return; }
    if (this.sw) { this.swClick(); return; }
    if (this.dragBox) { this.boxSelect(this.dragBox, d.shift); this.dragBox = null; return; }
    this.clickAt(d.shift);
  }

  onKey(e, isDown) {
    const k = e.key.toLowerCase();
    if (isDown) this.keys.add(k); else this.keys.delete(k);
    if (!isDown) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    const g = this.game;
    if (/^[0-9]$/.test(k)) {
      e.preventDefault();
      if (e.ctrlKey) this.assignGroup(k); else this.recallGroup(k);
      return;
    }
    switch (k) {
      case 'escape': this.cancelPlacement(); this.cancelSW(); this.setMode('normal'); this.bus('help', false); break;
      case 'x': for (const u of this.selectedUnits()) u.stop(); audio.play('click'); break;
      case 'f': this.deploySelected(); break;
      case 'q': if (this.selectedUnits().some((u) => u.hasWeapon)) this.setMode('attackMove'); break;
      case 'r': this.setMode(this.mode === 'repair' ? 'normal' : 'repair'); break;
      case 'e': this.setMode(this.mode === 'sell' ? 'normal' : 'sell'); break;
      case 'h': { const hq = g.buildings.find((b) => b.team === 0 && b.def.role === 'cy') || g.buildings.find((b) => b.team === 0); if (hq) g.camera.centerOn(hq.position.x, hq.position.z); break; }
      case ' ': e.preventDefault(); if (this.lastPing) g.camera.centerOn(this.lastPing.x, this.lastPing.z); break;
      case 'p': this.bus('toggle', 'pixelate'); break;
      case 'c': this.bus('toggle', 'crt'); break;
      case 'b': this.bus('toggle', 'dither'); break;
      case 'm': this.bus('toggle', 'mute'); break;
      case 'i': this.bus('toggle', 'stats'); break;
      case 'f1': case '?': e.preventDefault(); this.bus('help'); break;
      case 'a': if (e.ctrlKey) { e.preventDefault(); this.selectAllCombat(); } break;
      case 'f9': e.preventDefault(); g.fog.revealAll(); break;
      case 'f10': e.preventDefault(); g.teams[0].credits += 10000; break;
      case 'f11': e.preventDefault(); for (const s of g.superweapons.list(0)) { g.superweapons.state[0][s.key].charge = 1; g.superweapons.state[0][s.key].ready = true; } break;
      default: break;
    }
  }

  bus(name, arg) { this.game.bus.emit('ui:' + name, arg); }

  setMode(m) {
    this.mode = m;
    this.game.bus.emit('ui:mode', m);
  }

  // ------------------------------------------------------------------ picking
  pickEntity(ndcX, ndcY, sx, sy) {
    const g = this.game;
    const ray = g.camera.ray(ndcX, ndcY);
    let best = null, bt = Infinity;
    const visibleUnit = (u) => u.alive && !u.inside && (u.team === 0 || (g.fog.isVisible(u.position.x, u.position.z) && !g.mirageHidden(u)));
    for (const u of g.units) {
      if (!visibleUnit(u)) continue;
      u.aimPoint(_sphere.center);
      _sphere.radius = Math.max(u.isInfantry ? 0.3 : 0.42, u.radius + 0.1);
      if (ray.intersectSphere(_sphere, _hit)) {
        const t = _hit.distanceTo(ray.origin) - 1.0;
        if (t < bt) { bt = t; best = u; }
      }
    }
    for (const b of g.buildings) {
      if (!b.alive || (b.team !== 0 && !b.root.visible)) continue;
      if (ray.intersectBox(b.box, _hit)) {
        const t = _hit.distanceTo(ray.origin);
        if (t < bt) { bt = t; best = b; }
      }
    }
    if (!best && sx != null) {
      let bd = 16;
      for (const u of g.units) {
        if (!visibleUnit(u)) continue;
        g.camera.project(u.aimPoint(_hit), _p);
        const d = Math.hypot(_p.x - sx, _p.y - sy);
        if (d < bd) { bd = d; best = u; }
      }
    }
    return best;
  }

  selectedUnits() { return [...this.selected].filter((e) => e.isUnit && e.alive && e.team === 0 && !e.inside); }

  // ------------------------------------------------------------------ selection
  setSelection(list, add = false) {
    if (!add) { for (const e of this.selected) e.selected = false; this.selected.clear(); }
    for (const e of list) { this.selected.add(e); e.selected = true; }
    this.game.bus.emit('ui:selection', this.selected);
  }

  clickAt(shift) {
    const g = this.game;
    const ground = g.camera.screenToGround(this.mouse.ndcX, this.mouse.ndcY);
    const e = this.pickEntity(this.mouse.ndcX, this.mouse.ndcY, this.mouse.x, this.mouse.y);
    if (this.mode === 'attackMove') {
      if (ground) this.commandAt(ground.x, ground.z, true, e && e.team !== 0 ? e : null);
      this.setMode('normal');
      return;
    }
    if (this.mode === 'sell' || this.mode === 'repair') {
      if (e && e.isBuilding && e.team === 0 && e.isActive) {
        if (this.mode === 'sell') { if (e.startSell()) { audio.play('sell', e.position); this.selected.delete(e); e.selected = false; } }
        else { e.repairing = !e.repairing && e.hp < e.maxHp; if (e.repairing) g.emitEva(0, 'Repairing', 'repair'); }
      } else audio.play('error');
      return;
    }
    if (!e) { if (!shift) this.setSelection([]); return; }
    const now = performance.now();
    const dbl = this.lastClick.e === e && now - this.lastClick.t < 320;
    this.lastClick = { t: now, e };
    if (e.team === 0 && e.isUnit) {
      if (dbl) {
        const same = g.units.filter((u) => u.team === 0 && u.kind === e.kind && u.alive && !u.inside && g.camera.project(u.position, _p).visible);
        this.setSelection(same, shift);
      } else if (shift) {
        if (this.selected.has(e)) { this.selected.delete(e); e.selected = false; }
        else { [...this.selected].filter((s) => !s.isUnit || s.team !== 0).forEach((s) => { this.selected.delete(s); s.selected = false; }); this.selected.add(e); e.selected = true; }
        g.bus.emit('ui:selection', this.selected);
      } else this.setSelection([e]);
      this.barkSelect(e);
    } else {
      this.setSelection([e]);
      audio.play('click');
      if (e.team === 0 && e.def.produces && e.isActive) g.primary[0][e.def.role] = e;
    }
  }

  boxSelect(box, add) {
    const g = this.game;
    const x0 = Math.min(box.x0, box.x1), x1 = Math.max(box.x0, box.x1);
    const y0 = Math.min(box.y0, box.y1), y1 = Math.max(box.y0, box.y1);
    const list = [];
    for (const u of g.units) {
      if (u.team !== 0 || !u.alive || u.inside || u.def.drone) continue;
      g.camera.project(u.aimPoint(_hit), _p);
      if (_p.x >= x0 && _p.x <= x1 && _p.y >= y0 && _p.y <= y1) list.push(u);
    }
    const combat = list.filter((u) => !u.isMiner);
    const sel = combat.length ? combat : list;
    if (!sel.length && !add) { this.setSelection([]); return; }
    this.setSelection(sel, add);
    if (sel.length) this.barkSelect(sel[0]);
  }

  selectAllCombat() {
    this.setSelection(this.game.units.filter((u) => u.team === 0 && u.alive && !u.inside && !u.isMiner && !u.def.drone && u.hasWeapon));
    audio.play('click');
  }

  assignGroup(k) {
    const units = this.selectedUnits();
    for (const u of this.game.units) if (u.group === Number(k)) u.group = null;
    for (const u of units) u.group = Number(k);
    this.groups[k] = units;
    audio.play('tab');
  }

  recallGroup(k) {
    const list = (this.groups[k] || []).filter((u) => u.alive && u.team === 0 && !u.inside);
    if (!list.length) return;
    const now = performance.now();
    if (this.lastGroupKey.k === k && now - this.lastGroupKey.t < 400) {
      const c = list.reduce((a, u) => a.add(u.position), new THREE.Vector3()).multiplyScalar(1 / list.length);
      this.game.camera.centerOn(c.x, c.z);
    }
    this.lastGroupKey = { k, t: now };
    this.setSelection(list);
    this.barkSelect(list[0]);
  }

  barkSelect(u) {
    audio.play('click');
    const b = u.def.barks;
    if (b && b.select && Math.random() < 0.85) audio.bark(pick(b.select), u.faction);
  }

  barkOrder(u, type) {
    const b = u.def.barks;
    const lines = b && (b[type] || b.move);
    if (lines && Math.random() < 0.7) audio.bark(pick(lines), u.faction);
    else audio.play('squawk');
  }

  deploySelected() {
    let any = false;
    for (const u of this.selectedUnits()) if (u.canDeploy() && u.deploy()) any = true;
    if (!any && this.selectedUnits().length) audio.play('error');
    this.game.bus.emit('ui:selection', this.selected);
  }

  // ------------------------------------------------------------------ orders
  commandAt(x, z, attackMove = false, target = null) {
    const g = this.game, ab = g.abilities;
    const sel = [...this.selected].filter((e) => e.alive && e.team === 0);
    const units = sel.filter((e) => e.isUnit && !e.inside && !e.def.drone);
    if (!units.length) {
      const f = sel.find((b) => b.isBuilding && b.def.produces);
      if (f) { f.rally = new THREE.Vector3(x, 0, z); g.fx.orderMarker(x, z, 0x9dff6a); audio.play('click'); }
      return;
    }
    let rest = units;
    if (target && target.alive) {
      // own transports / garrisons / grinders / pylons / depots
      if (target.team === 0) {
        const enter = units.filter((u) => ab.canEnter(u, target));
        if (enter.length) {
          for (const u of enter) u.enter(target);
          g.fx.orderMarker(target.position.x, target.position.z, 0x6dd8ff);
          this.barkOrder(enter[0], 'move');
          rest = units.filter((u) => !enter.includes(u));
        }
        if (target.isBuilding && target.def.role === 'refinery') {
          const harv = rest.filter((u) => u.isHarvester);
          for (const h of harv) h.returnTo(target);
          rest = rest.filter((u) => !harv.includes(u));
        }
        if (!rest.length) return;
      } else {
        const spies = units.filter((u) => u.def.spy && ab.canEnter(u, target));
        for (const s of spies) s.enter(target);
        const drainers = target.isBuilding ? units.filter((u) => u.def.drainer && ['power', 'refinery', 'defense'].includes(target.def.role)) : [];
        for (const d of drainers) d.drain(target);
        const attackers = units.filter((u) => !spies.includes(u) && !drainers.includes(u) && u.weaponFor(target));
        for (const u of attackers) u.attack(target);
        g.fx.orderMarker(target.position.x, target.position.z, 0xff4a3a);
        const lead = attackers[0] || spies[0] || drainers[0];
        if (lead) this.barkOrder(lead, 'attack');
        rest = units.filter((u) => !spies.includes(u) && !drainers.includes(u) && !attackers.includes(u) && !u.isMiner);
        if (!rest.length) return;
      }
    }
    const tx = Math.floor(x), tz = Math.floor(z);
    if (g.map.inBounds(tx, tz) && g.map.res[g.map.idx(tx, tz)] > 0) {
      const miners = rest.filter((u) => u.isHarvester || u.def.slaveMiner);
      for (const h of miners) h.harvestAt(g.map.idx(tx, tz));
      if (miners.length) { g.fx.orderMarker(tx + 0.5, tz + 0.5, 0xffd84a); this.barkOrder(miners[0], 'move'); }
      rest = rest.filter((u) => !miners.includes(u));
    }
    if (rest.length) {
      this.formationMove(rest, x, z, attackMove);
      g.fx.orderMarker(x, z, attackMove ? 0xffa03a : 0x6dff4a);
      this.barkOrder(rest[0], attackMove ? 'attack' : 'move');
    }
  }

  formationMove(units, x, z, attackMove) {
    const map = this.game.map;
    if (units.length === 1) { units[0].moveTo(x, z, attackMove); return; }
    const start = map.nearestPassable(Math.floor(x), Math.floor(z), 10);
    if (!start) return;
    // infantry share tiles (sub-cell spots), vehicles get a tile each
    const spots = [];
    const seen = new Set([start.z * map.w + start.x]);
    const q = [start];
    const need = units.reduce((s, u) => s + (u.isInfantry ? 0.34 : 1), 0) + 1;
    while (q.length && spots.length < need * 3) {
      const c = q.shift();
      spots.push({ x: c.x + 0.5, z: c.z + 0.5 });
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = c.x + dx, nz = c.z + dz;
        const i = nz * map.w + nx;
        if (!map.passable(nx, nz) || seen.has(i)) continue;
        seen.add(i);
        q.push({ x: nx, z: nz });
      }
      q.sort((a, b) => Math.hypot(a.x + 0.5 - x, a.z + 0.5 - z) - Math.hypot(b.x + 0.5 - x, b.z + 0.5 - z));
    }
    const slots = [];
    const SUB = [[-0.22, -0.2], [0.22, -0.2], [0, 0.24]];
    let si = 0;
    for (const s of spots) {
      if (slots.length >= units.length) break;
      slots.push({ x: s.x, z: s.z, sub: false });
      void si;
    }
    // assign: keep relative layout by sorting both lists across the move direction
    const cx = units.reduce((s, u) => s + u.position.x, 0) / units.length;
    const cz = units.reduce((s, u) => s + u.position.z, 0) / units.length;
    const dirx = x - cx, dirz = z - cz;
    const len = Math.hypot(dirx, dirz) || 1;
    const px = -dirz / len, pz = dirx / len;
    const us = [...units].sort((a, b) => ((a.position.x - cx) * px + (a.position.z - cz) * pz) - ((b.position.x - cx) * px + (b.position.z - cz) * pz));
    const inf = us.filter((u) => u.isInfantry), veh = us.filter((u) => !u.isInfantry);
    let k = 0;
    const assign = [];
    for (const v of veh) { const s = spots[k++] || spots[0]; assign.push([v, s.x, s.z]); }
    for (let i = 0; i < inf.length; i++) {
      const s = spots[k + Math.floor(i / 3)] || spots[0];
      const o = SUB[i % 3];
      assign.push([inf[i], s.x + o[0], s.z + o[1]]);
    }
    for (const [u, ax, az] of assign) u.moveTo(ax, az, attackMove);
  }

  // ------------------------------------------------------------------ superweapons
  beginSW(key) {
    if (!this.game.superweapons.isReady(0, key)) { audio.play('error'); return; }
    this.cancelPlacement();
    this.sw = { key, src: null };
    this.game.bus.emit('ui:sw', this.sw);
    this.game.emitEva(0, SUPERWEAPONS[key].twoStep ? 'Select units to shift' : 'Select target', null);
  }

  cancelSW() {
    if (!this.sw) return;
    this.sw = null;
    this.game.bus.emit('ui:sw', null);
  }

  swClick() {
    const g = this.game;
    const p = g.camera.screenToGround(this.mouse.ndcX, this.mouse.ndcY);
    if (!p) return;
    const def = SUPERWEAPONS[this.sw.key];
    if (def.twoStep && !this.sw.src) {
      this.sw.src = p.clone();
      g.fx.ring(p, def.radius, 0x8adfff, 0.6);
      g.emitEva(0, 'Select destination', null);
      return;
    }
    if (def.twoStep) g.superweapons.launch(0, this.sw.key, this.sw.src, p.clone());
    else g.superweapons.launch(0, this.sw.key, p.clone());
    this.cancelSW();
  }

  // ------------------------------------------------------------------ placement
  beginPlacement(kind) {
    this.cancelPlacement();
    this.cancelSW();
    this.placing = kind;
    this.setMode('normal');
    const { root } = createModel(kind, 0);
    root.traverse((o) => { if (o.isMesh) { o.material = this.holo; o.castShadow = false; o.receiveShadow = false; } });
    root.renderOrder = 9;
    this.ghost = root;
    this.game.scene.add(root);
    this.game.bus.emit('ui:placing', kind);
  }

  cancelPlacement() {
    if (this.ghost) { this.ghost.removeFromParent(); this.ghost = null; }
    if (this.placing) { this.placing = null; this.game.bus.emit('ui:placing', null); }
    this.cells.count = 0;
  }

  placementTile() {
    const def = BUILDINGS[this.placing];
    return { tx: Math.round(this.ground.x - def.w / 2), tz: Math.round(this.ground.z - def.h / 2) };
  }

  tryPlace() {
    const g = this.game, kind = this.placing;
    const { tx, tz } = this.placementTile();
    if (!g.placementCheck(0, kind, tx, tz).ok) { audio.play('error'); return; }
    if (!g.teams[0].production.takeReady(kind)) { this.cancelPlacement(); return; }
    g.spawnBuilding(kind, 0, tx, tz);
    this.cancelPlacement();
  }

  // ------------------------------------------------------------------ per-frame
  update(dt) {
    const g = this.game, cam = g.camera;
    this.uniforms.uTime.value += dt;
    const speed = (24 / cam.zoom) * dt;
    let px = 0, py = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) py += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) py -= 1;
    if ((this.keys.has('a') && !this.keys.has('control')) || this.keys.has('arrowleft')) px -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) px += 1;
    if (this.edgeScroll && this.mouse.inWindow && !this.down) {
      const m = 10, W = window.innerWidth, H = window.innerHeight;
      if (this.mouse.winX <= m) px -= 1;
      if (this.mouse.winX >= W - m) px += 1;
      if (this.mouse.winY <= m) py += 1;
      if (this.mouse.winY >= H - m) py -= 1;
    }
    if (px || py) cam.pan(px * speed, py * speed * 0.8);

    const gp = cam.screenToGround(this.mouse.ndcX, this.mouse.ndcY, this.ground);
    if (!gp) return;
    this.hoverEntity = this.mouse.inside ? this.pickEntity(this.mouse.ndcX, this.mouse.ndcY, this.mouse.x, this.mouse.y) : null;

    const tx = Math.floor(this.ground.x), tz = Math.floor(this.ground.z);
    this.hoverPos.lerp(new THREE.Vector3(tx + 0.5, 0.03, tz + 0.5), Math.min(1, dt * 18));
    this.hoverTile.setMatrixAt(0, _m4.makeTranslation(this.hoverPos.x, this.hoverPos.y, this.hoverPos.z));
    this.hoverTile.instanceMatrix.needsUpdate = true;
    let hc = 0x6a8f6a;
    if (this.mode === 'sell') hc = 0xffd84a;
    else if (this.mode === 'repair') hc = 0x6aff9a;
    else if (this.mode === 'attackMove' || this.sw) hc = 0xffa03a;
    else if (this.hoverEntity && this.hoverEntity.team !== 0) hc = 0xff4a3a;
    this.hoverTile.setColorAt(0, _c.set(hc));
    this.hoverTile.instanceColor.needsUpdate = true;
    this.hoverTile.visible = !this.placing && this.mouse.inside && g.map.inBounds(tx, tz);

    if (this.placing) {
      const def = BUILDINGS[this.placing];
      const { tx: bx, tz: bz } = this.placementTile();
      const chk = g.placementCheck(0, this.placing, bx, bz);
      this.placementOk = chk.ok;
      this.placementReason = !chk.near ? 'Too far from base' : 'Blocked';
      this.cells.count = chk.cells.length;
      chk.cells.forEach((c, i) => {
        this.cells.setMatrixAt(i, _m4.makeTranslation(c.x + 0.5, 0.04, c.z + 0.5));
        this.cells.setColorAt(i, _c.set(!c.ok ? 0xff3a2a : c.exit ? 0xffd84a : chk.near ? 0x5aff4a : 0xff9a2a));
      });
      this.cells.instanceMatrix.needsUpdate = true;
      this.cells.instanceColor.needsUpdate = true;
      if (this.ghost) {
        this.ghost.position.set(bx + def.w / 2, 0.02, bz + def.h / 2);
        this.holo.color.set(chk.ok ? 0x7dff5a : 0xff4a3a);
        this.holo.opacity = 0.3 + 0.1 * Math.sin(this.uniforms.uTime.value * 6);
      }
    }
    this.updateCursor();
  }

  updateCursor() {
    let c = 'default';
    const e = this.hoverEntity, g = this.game, ab = g.abilities;
    const units = this.selectedUnits();
    if (this.placing) c = 'place';
    else if (this.sw) c = 'sw';
    else if (this.mode === 'sell') c = e && e.team === 0 && e.isBuilding ? 'sell' : 'nogo';
    else if (this.mode === 'repair') c = e && e.team === 0 && e.isBuilding ? 'repair' : 'nogo';
    else if (this.mode === 'attackMove') c = 'attack';
    else if (e && units.length && e.team === 0 && units.some((u) => ab.canEnter(u, e))) c = 'enter';
    else if (e && e.team !== 0 && units.length) {
      if (units.some((u) => u.def.spy && ab.canEnter(u, e))) c = 'infiltrate';
      else if (units.some((u) => u.weaponFor(e)?.special === 'mc')) c = 'mind';
      else if (units.some((u) => u.weaponFor(e)?.special === 'c4')) c = 'c4';
      else if (units.some((u) => u.weaponFor(e))) c = 'attack';
      else if (units.some((u) => u.def.drainer) && e.isBuilding) c = 'enter';
      else c = 'nogo';
    } else if (e && e.team === 0) c = 'select';
    else if (units.length) {
      const tx = Math.floor(this.ground.x), tz = Math.floor(this.ground.z);
      if (units.some((u) => u.isHarvester || u.def.slaveMiner) && g.map.inBounds(tx, tz) && g.map.res[g.map.idx(tx, tz)] > 0) c = 'harvest';
      else if (!units.some((u) => u.hover) && !g.map.passable(tx, tz)) c = 'nogo';
      else c = 'move';
    }
    if (c !== this.cursor) { this.cursor = c; this.dom.dataset.cursor = c; }
  }
}

void UNITS; void WEAPONS;
