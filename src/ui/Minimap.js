// Radar mini-map: the map is drawn rotated 45° (diamond) so it matches the isometric camera.
// Shows terrain, resource beds, shroud, units/buildings, camera frustum and attack pings.
// Left-click/drag pans the camera, right-click orders selected units.
import { MAP_W, MAP_H, TEAMS, TILE } from '../config.js';

const TILE_COLORS = {
  [TILE.GRASS]: [62, 112, 40],
  [TILE.SOIL]: [92, 62, 38],
  [TILE.BRICK]: [140, 76, 52],
  [TILE.CONCRETE]: [124, 120, 112],
};

export class Minimap {
  constructor(canvas, game, input) {
    this.canvas = canvas;
    this.game = game;
    this.input = input;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
    this.k = this.size / (MAP_W + MAP_H);
    this.base = document.createElement('canvas');
    this.base.width = MAP_W; this.base.height = MAP_H;
    this.fogC = document.createElement('canvas');
    this.fogC.width = MAP_W; this.fogC.height = MAP_H;
    this.fogImg = this.fogC.getContext('2d').createImageData(MAP_W, MAP_H);
    this.pings = [];
    this.mapVersion = -1;
    this.resVersion = -1;
    this.online = true;
    this.staticT = 0;
    game.bus.on('ping', (x, z) => this.pings.push({ x, z, t: 0 }));
    this.bindEvents();
  }

  toMini(x, z) {
    return [this.size / 2 + (x - z) * this.k, (x + z) * this.k];
  }
  fromMini(px, py) {
    const a = (px - this.size / 2) / this.k, b = py / this.k;
    return { x: (a + b) / 2, z: (b - a) / 2 };
  }

  bindEvents() {
    const c = this.canvas;
    let dragging = false;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return this.fromMini(((e.clientX - r.left) / r.width) * this.size, ((e.clientY - r.top) / r.height) * this.size);
    };
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('mousedown', (e) => {
      if (!this.online) return;
      const p = pos(e);
      if (e.button === 0) { dragging = true; this.game.camera.centerOn(p.x, p.z); }
      else if (e.button === 2) this.input.commandAt(p.x, p.z, e.ctrlKey);
    });
    window.addEventListener('mousemove', (e) => { if (dragging) { const p = pos(e); this.game.camera.centerOn(p.x, p.z); } });
    window.addEventListener('mouseup', () => { dragging = false; });
  }

  drawBase() {
    const map = this.game.map;
    const g = this.base.getContext('2d');
    const img = g.createImageData(MAP_W, MAP_H);
    for (let z = 0; z < MAP_H; z++) for (let x = 0; x < MAP_W; x++) {
      const i = z * MAP_W + x;
      let c = TILE_COLORS[map.tiles[i]];
      if (map.blocked[i] === 1) c = [34, 74, 34];
      if (map.res[i] > 0) {
        const k = Math.min(1, map.res[i] / 300);
        c = [40 + 30 * k, 150 + 60 * k, 130 + 50 * k];
      }
      img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  drawFog() {
    const f = this.game.fog;
    const d = this.fogImg.data;
    for (let i = 0; i < MAP_W * MAP_H; i++) {
      d[i * 4] = 0; d[i * 4 + 1] = 0; d[i * 4 + 2] = 6;
      d[i * 4 + 3] = f.visibleTile[i] ? 0 : f.exploredTile[i] ? 120 : 255;
    }
    this.fogC.getContext('2d').putImageData(this.fogImg, 0, 0);
  }

  update(dt) {
    const g = this.game, ctx = this.ctx, S = this.size, k = this.k;
    this.online = g.player.hasRadar;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05080a';
    ctx.fillRect(0, 0, S, S);
    if (!this.online) {
      // radar static
      this.staticT += dt;
      if (!this.staticC) {
        this.staticC = document.createElement('canvas');
        this.staticC.width = this.staticC.height = S / 4;
        this.staticImg = this.staticC.getContext('2d').createImageData(S / 4, S / 4);
      }
      const img = this.staticImg;
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 60;
        img.data[i] = v * 0.6; img.data[i + 1] = v; img.data[i + 2] = v * 0.7; img.data[i + 3] = 255;
      }
      this.staticC.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.staticC, 0, 0, S, S);
      return;
    }
    if (g.map.version !== this.mapVersion || g.map.resVersion !== this.resVersion) {
      this.mapVersion = g.map.version;
      this.resVersion = g.map.resVersion;
      this.drawBase();
    }
    this.drawFog();
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(k, k, -k, k, S / 2, 0);
    ctx.drawImage(this.base, 0, 0);
    // buildings
    for (const b of g.buildings) {
      if (b.team !== 0 && !b.root.visible) continue;
      ctx.fillStyle = TEAMS[b.team].css;
      ctx.fillRect(b.tx, b.tz, b.w, b.h);
    }
    // units
    for (const u of g.units) {
      if (u.inside) continue;
      if (u.team !== 0 && (!g.fog.isVisible(u.position.x, u.position.z) || g.mirageHidden(u))) continue;
      ctx.fillStyle = u.selected ? '#ffffff' : TEAMS[u.team].css;
      const s = u.isInfantry ? 0.5 : 0.75;
      ctx.fillRect(u.position.x - s, u.position.z - s, s * 2, s * 2);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogC, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // diamond border
    ctx.strokeStyle = 'rgba(120,220,120,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const corners = [[0, 0], [MAP_W, 0], [MAP_W, MAP_H], [0, MAP_H]].map(([x, z]) => this.toMini(x, z));
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    // camera view
    const q = g.camera.viewQuad();
    ctx.strokeStyle = '#e8ffe0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    q.forEach((p, i) => { const [x, y] = this.toMini(p.x, p.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.stroke();
    // pings
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i];
      p.t += dt;
      if (p.t > 2.4) { this.pings.splice(i, 1); continue; }
      const [x, y] = this.toMini(p.x, p.z);
      const r = 4 + ((p.t * 1.6) % 0.8) * 22;
      ctx.strokeStyle = `rgba(255,70,50,${1 - p.t / 2.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
}
