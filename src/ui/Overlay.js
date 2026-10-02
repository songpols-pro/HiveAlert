// 2D canvas overlay above the WebGL view: RA2 pip health bars (smaller for infantry), veteran chevrons,
// mind-control links, bomb / caustic-charge timers, drilled / erasing / berserk indicators, passenger pips,
// Psionic Spire movement lines, drag box, rally flags and floating income text.
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _p = { x: 0, y: 0, visible: true };
const _q = { x: 0, y: 0, visible: true };

export class Overlay {
  constructor(canvas, game, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.input = input;
    this.floats = [];
    this.incomeAcc = new Map();
    game.bus.on('income', (ref, amt) => {
      const a = this.incomeAcc.get(ref) || { amt: 0, t: 0 };
      a.amt += amt;
      this.incomeAcc.set(ref, a);
    });
    game.bus.on('floatText', (f) => this.floats.push({ ...f, t: 0 }));
  }

  resize(w, h) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.dpr = dpr;
  }

  bar(x, y, w, k, kind = 'hp', h = 4) {
    const ctx = this.ctx;
    const pips = Math.max(3, Math.round(w / 4));
    const pw = w / pips;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    const lit = Math.ceil(k * pips);
    const col = kind === 'cargo' ? '#e8c64a' : kind === 'erase' ? '#8adfff' : k > 0.5 ? '#5fe03a' : k > 0.25 ? '#f0d020' : '#f03a20';
    for (let i = 0; i < pips; i++) {
      ctx.fillStyle = i < lit ? col : 'rgba(60,60,60,0.8)';
      ctx.fillRect(x + i * pw + 0.5, y, pw - 1, h);
    }
  }

  visible(e) {
    if (!e.alive || e.inside) return false;
    if (e.team === 0) return true;
    if (e.isUnit) return this.game.fog.isVisible(e.position.x, e.position.z) && !this.game.mirageHidden(e);
    return e.root.visible;
  }

  head(e, out) {
    const h = e.isBuilding ? e.def.height + 0.4 : (e.hover ? e.flyH : 0) + Math.max(0.55, e.def.height + 0.25);
    return this.game.camera.project(_v.copy(e.position).setY(h), out);
  }

  update(dt) {
    const ctx = this.ctx, g = this.game, cam = g.camera, input = this.input;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.textAlign = 'center';
    const hovered = input.hoverEntity;

    // psionic spire: enemy movement orders around the sensor
    const sensors = g.buildings.filter((b) => b.team === 0 && b.def.sensor && b.isActive && b.powered);
    if (sensors.length) {
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      for (const u of g.units) {
        if (u.team === 0 || !u.alive || u.inside) continue;
        const o = u.order;
        if (o.type !== 'move' && o.type !== 'attackMove' && o.type !== 'attack') continue;
        if (!sensors.some((s) => s.position.distanceTo(u.position) < s.def.sensor)) continue;
        const dest = o.type === 'attack' ? (o.target && o.target.alive ? o.target.position : null) : _v.set(o.x, 0, o.z).clone();
        if (!dest) continue;
        cam.project(_v.copy(u.position).setY(0.1), _p);
        cam.project(_v.copy(dest).setY(0.1), _q);
        ctx.strokeStyle = o.type === 'move' ? 'rgba(255,200,80,0.7)' : 'rgba(255,80,60,0.8)';
        ctx.beginPath(); ctx.moveTo(_p.x, _p.y); ctx.lineTo(_q.x, _q.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // mind-control links
    ctx.lineWidth = 1.5;
    for (const e of [...g.units, ...g.buildings]) {
      if (!e.alive || !e.controlled.length || !this.visible(e)) continue;
      cam.project(e.aimPoint(_v), _p);
      for (const c of e.controlled) {
        if (!c.alive || c.controller !== e || !this.visible(c)) continue;
        cam.project(c.aimPoint(_v), _q);
        const grd = ctx.createLinearGradient(_p.x, _p.y, _q.x, _q.y);
        grd.addColorStop(0, 'rgba(200,107,255,0.1)');
        grd.addColorStop(1, 'rgba(220,140,255,0.75)');
        ctx.strokeStyle = grd;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -g.time * 20;
        ctx.beginPath(); ctx.moveTo(_p.x, _p.y); ctx.lineTo(_q.x, _q.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const draw = (e) => {
      if (!this.visible(e)) return;
      const st = e.status;
      const recent = g.time - e.lastHit < 2.5;
      const flagged = st.bomb || st.c4 || st.drilled || st.erasing || st.berserk || e.controller || st.invuln;
      if (!e.selected && e !== hovered && !recent && !flagged) return;
      this.head(e, _p);
      if (!_p.visible) return;
      const inf = e.isUnit && e.isInfantry;
      const w = e.isBuilding ? 22 + e.w * 14 : inf ? 18 : 28;
      const x = _p.x - w / 2, y = _p.y - 6;
      if (e.selected || e === hovered || recent) this.bar(x, y, w, e.hp / e.maxHp, 'hp', inf ? 3 : 4);
      let ty = y - 4;
      ctx.textAlign = 'center';
      if (e.vet) { ctx.fillStyle = '#ffd84a'; ctx.fillText('★', x - 7, y + 5); }
      if (e.isUnit && e.isHarvester && e.team === 0 && (e.selected || e === hovered)) this.bar(x, y + 6, w, e.cargo / e.def.harvester.capacity, 'cargo', 3);
      if (st.erasing) this.bar(x, y + 6, w, Math.min(1, st.erasing.p), 'erase', 3);
      if (e.def.transport && e.passengers.length && (e.selected || e === hovered)) {
        for (let i = 0; i < e.def.transport; i++) {
          ctx.fillStyle = i < e.passengers.length ? '#7dff5a' : 'rgba(40,60,40,0.8)';
          ctx.fillRect(x + i * 5, y + 7, 4, 3);
        }
      }
      if (e.selected && e.group != null) { ctx.fillStyle = '#fff'; ctx.fillText(String(e.group), x + w + 7, y + 4); }
      if (st.bomb) {
        ctx.fillStyle = Math.sin(g.time * 14) > 0 ? '#ff4a2a' : '#ffd84a';
        ctx.fillText(`💣 ${Math.ceil(st.bomb.t)}`, _p.x, ty); ty -= 12;
      }
      if (st.c4) { ctx.fillStyle = '#9bff3a'; ctx.fillText(`☣ ${Math.ceil(st.c4.t)}`, _p.x, ty); ty -= 12; }
      if (st.drilled) { ctx.fillStyle = '#ffb060'; ctx.fillText('⚙ INFESTED', _p.x, ty); ty -= 12; }
      if (st.berserk) { ctx.fillStyle = '#d090ff'; ctx.fillText('‼ BERSERK', _p.x, ty); ty -= 12; }
      if (e.controller) { ctx.fillStyle = '#d090ff'; ctx.fillText('🧠', _p.x + w / 2 + 8, y + 5); }
      if (st.invuln) { ctx.fillStyle = '#ff6a5a'; ctx.fillText('◆', _p.x - w / 2 - 8, y + 5); }
      if (e.isBuilding) {
        if (e.repairing) { ctx.fillStyle = '#9dff6a'; ctx.fillText('🔧', _p.x, ty); ty -= 12; }
        if (e.team === 0 && !e.powered && e.def.power <= 0 && Math.sin(g.time * 6) > 0) { ctx.fillStyle = '#ffd84a'; ctx.fillText('⚡ LOW', _p.x, ty); ty -= 12; }
        if (e.selected && g.primary[0][e.def.role] === e && e.def.produces) { ctx.fillStyle = '#d8ffb8'; ctx.fillText('PRIMARY', _p.x, ty); ty -= 12; }
        if (e.passengers.length) { ctx.fillStyle = '#7dff5a'; ctx.fillText(`◉ ${e.passengers.length}`, _p.x + w / 2 + 10, y + 5); }
        if (e.charges) { ctx.fillStyle = '#7fe9ff'; ctx.fillText(`⚡×${e.charges}`, _p.x + w / 2 + 12, y + 5); }
      }
    };
    for (const u of g.units) draw(u);
    for (const b of g.buildings) draw(b);

    // rally line for selected producers
    for (const b of input.selected) {
      if (b.isBuilding && b.rally && b.team === 0 && b.alive) {
        cam.project(_v.copy(b.position).setY(0.1), _p);
        const ax = _p.x, ay = _p.y;
        cam.project(_v.copy(b.rally), _p);
        ctx.strokeStyle = 'rgba(160,255,120,0.8)';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(_p.x, _p.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#9dff6a';
        ctx.fillRect(_p.x - 1, _p.y - 14, 2, 14);
        ctx.beginPath(); ctx.moveTo(_p.x + 1, _p.y - 14); ctx.lineTo(_p.x + 10, _p.y - 10); ctx.lineTo(_p.x + 1, _p.y - 6); ctx.fill();
      }
    }

    // income ticker -> floating text
    for (const [ref, a] of this.incomeAcc) {
      a.t += dt;
      if (a.t > 0.6 && a.amt >= 1) {
        this.floats.push({ x: ref.position.x, z: ref.position.z, text: `+$${Math.round(a.amt)}`, color: '#ffe066', t: 0 });
        a.amt = 0; a.t = 0;
      }
      if (!ref.alive) this.incomeAcc.delete(ref);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t > 1.6) { this.floats.splice(i, 1); continue; }
      cam.project(_v.set(f.x, 2.4 + f.t * 0.9, f.z), _p);
      ctx.globalAlpha = 1 - f.t / 1.6;
      ctx.fillStyle = '#000';
      ctx.fillText(f.text, _p.x + 1, _p.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, _p.x, _p.y);
      ctx.globalAlpha = 1;
    }

    const box = input.dragBox;
    if (box) {
      const x = Math.min(box.x0, box.x1), y = Math.min(box.y0, box.y1);
      const w = Math.abs(box.x1 - box.x0), h = Math.abs(box.y1 - box.y0);
      ctx.fillStyle = 'rgba(110,255,80,0.08)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#7dff5a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      ctx.lineWidth = 2;
      const c = 8;
      ctx.beginPath();
      ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
      ctx.moveTo(x + w - c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + c);
      ctx.moveTo(x + w, y + h - c); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - c, y + h);
      ctx.moveTo(x + c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - c);
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    if (input.placing) {
      const ok = input.placementOk;
      ctx.fillStyle = ok ? '#9dff6a' : '#ff6a4a';
      ctx.fillText(ok ? 'Click to place  ·  Right-click to cancel' : (input.placementReason || 'Cannot place here'), input.mouse.x + 18, input.mouse.y + 26);
    } else if (input.sw) {
      ctx.fillStyle = '#ffb060';
      ctx.fillText(input.sw.src ? 'Click destination  ·  Right-click to cancel' : 'Click target  ·  Right-click to cancel', input.mouse.x + 18, input.mouse.y + 26);
    }
  }
}
