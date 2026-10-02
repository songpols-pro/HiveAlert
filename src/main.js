// Hive Alert 2 — bootstrap, faction selection & main loop.
import './style.css';
import * as THREE from 'three';
import { Renderer } from './render/Renderer.js';
import { RTSCamera } from './camera/RTSCamera.js';
import { Game } from './core/Game.js';
import { Input } from './input/Input.js';
import { Hud } from './ui/Hud.js';
import { Overlay } from './ui/Overlay.js';
import { Minimap } from './ui/Minimap.js';
import { renderCameos } from './ui/Cameos.js';
import { particleScale } from './fx/Particles.js';
import { audio } from './audio/Audio.js';
import { BUILDINGS, UNITS, WEAPONS, FACTIONS, FACTION_KEYS, SUPERWEAPONS } from './data/index.js';

const $ = (id) => document.getElementById(id);
// yield so the loading text can paint (falls back to a timeout when the tab is hidden)
const nextFrame = () => new Promise((r) => { requestAnimationFrame(() => r()); setTimeout(r, 60); });

let chosen = 'allied';

function buildFactionCards() {
  const host = $('factionPick');
  host.innerHTML = '';
  for (const k of FACTION_KEYS) {
    const f = FACTIONS[k];
    const el = document.createElement('button');
    el.className = 'fcard' + (k === chosen ? ' on' : '');
    el.style.setProperty('--c', f.accent);
    el.setAttribute('role', 'radio');
    el.setAttribute('aria-checked', String(k === chosen));
    const units = Object.values(UNITS).filter((u) => u.faction === k && u.buildable !== false).slice(0, 6).map((u) => u.name).join(' · ');
    el.innerHTML = `<div class="fc-crest">${f.crest}</div><div class="fc-name">${f.name.toUpperCase()}</div><div class="fc-order">${f.order}</div>
      <div class="fc-desc">${f.paradigm}</div><div class="fc-units">${units}…</div>`;
    el.onclick = () => { chosen = k; buildFactionCards(); };
    host.appendChild(el);
  }
}

function boot() {
  buildFactionCards();
  const deploy = $('deploy');
  deploy.focus();
  deploy.addEventListener('click', () => start().catch((err) => {
    console.error(err);
    $('loading').textContent = 'Failed to start: ' + err.message;
  }), { once: true });
}

async function start() {
  audio.init();
  const loading = $('loading');
  $('deploy').disabled = true;
  let enemy = $('enemyPick').value;
  if (enemy === 'random') {
    const others = FACTION_KEYS.filter((k) => k !== chosen);
    enemy = others[(Math.random() * others.length) | 0];
  }
  const diff = document.querySelector('input[name="diff"]:checked')?.value || 'normal';
  loading.textContent = 'Hatching the brood…';
  await nextFrame();

  const viewport = $('viewport');
  const renderer = new Renderer(viewport);
  const cam = new RTSCamera();
  renderer.initComposer(cam.camera);

  loading.textContent = 'Painting cameos…';
  await nextFrame();
  const kinds = [...Object.keys(BUILDINGS), ...Object.keys(UNITS)].filter((k) => {
    const f = (BUILDINGS[k] || UNITS[k]).faction;
    return f === chosen || f === enemy;
  });
  const cameos = renderCameos(kinds, 0);

  loading.textContent = 'Seeding the battlefield…';
  await nextFrame();
  const game = new Game(renderer, cam, { playerFaction: chosen, enemyFaction: enemy });
  game.ai.setDifficulty(diff);
  const input = new Input(game, viewport);
  const hud = new Hud(game, input, renderer, cameos);
  const overlay = new Overlay($('overlay'), game, input);
  const minimap = new Minimap($('minimap'), game, input);
  $('crest').textContent = FACTIONS[chosen].crest;
  $('missionName').textContent = `${FACTIONS[chosen].name.toUpperCase()} vs ${FACTIONS[enemy].name.toUpperCase()}`;

  const resize = () => {
    const { w, h } = renderer.resize();
    cam.setAspect(w, h);
    overlay.resize(w, h);
  };
  new ResizeObserver(resize).observe(viewport);
  resize();
  renderer.gl.compile(renderer.scene, cam.camera);

  let last = performance.now();
  let miniT = 0;
  const viewDir = new THREE.Vector3();
  const rings = [];
  const size = new THREE.Vector2();
  renderer.gl.info.autoReset = false;

  function frame(now) {
    renderer.gl.info.reset();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!hud.paused) game.update(dt);
    input.update(dt);
    cam.update(dt);
    audio.listener.x = cam.target.x;
    audio.listener.z = cam.target.z;
    audio.listener.range = cam.halfViewWidth * 1.8 + 6;
    renderer.setShadowExtent(cam.halfViewWidth * 1.35 + 6);
    renderer.followShadow(cam.target);

    const c = cam.camera;
    particleScale.value = renderer.gl.getDrawingBufferSize(size).y / ((c.top - c.bottom) / c.zoom);
    c.getWorldDirection(viewDir);
    game.fx.arcs.viewDir.copy(viewDir);

    // glowing selection rings projected beneath selected entities
    rings.length = 0;
    for (const e of input.selected) {
      if (!e.alive || e.inside) continue;
      const col = e.team === 0 ? 0x6dff4a : 0xff4a3a;
      if (e.isBuilding) {
        rings.push({ x: e.position.x, z: e.position.z, r: Math.max(e.w, e.h) * 0.72, color: col, dash: true, thick: 0.05 });
        if (e.weapon) rings.push({ x: e.position.x, z: e.position.z, r: e.weapon.range + 0.5, color: col, alpha: 0.35, thick: 0.015, fill: 0.15 });
        if (e.def.gap) rings.push({ x: e.position.x, z: e.position.z, r: e.def.gap, color: 0x8888aa, alpha: 0.25, thick: 0.01, fill: 0.1 });
      } else {
        rings.push({ x: e.position.x, z: e.position.z, r: e.radius + (e.isInfantry ? 0.1 : 0.2), color: col, dash: false, thick: e.isInfantry ? 0.18 : 0.13 });
      }
    }
    const h = input.hoverEntity;
    if (h && !h.selected && h.alive) {
      const r = h.isBuilding ? Math.max(h.w, h.h) * 0.72 : h.radius + 0.15;
      rings.push({ x: h.position.x, z: h.position.z, r, color: h.team === 0 ? 0x6dff4a : 0xff4a3a, alpha: 0.4, thick: 0.08 });
    }
    if (input.placing && input.ghost) {
      const d = BUILDINGS[input.placing];
      if (d.weapon) rings.push({ x: input.ghost.position.x, z: input.ghost.position.z, r: WEAPONS[d.weapon].range + 0.5, color: 0x6dff4a, alpha: 0.4, thick: 0.015, fill: 0.2 });
      if (d.gap) rings.push({ x: input.ghost.position.x, z: input.ghost.position.z, r: d.gap, color: 0x8888aa, alpha: 0.4, thick: 0.015, fill: 0.12 });
    }
    if (input.sw) {
      const p = input.ground;
      const r = SUPERWEAPONS[input.sw.key].radius;
      rings.push({ x: p.x, z: p.z, r, color: 0xffa03a, alpha: 0.8, thick: 0.03, fill: 0.25, dash: true });
      if (input.sw.src) rings.push({ x: input.sw.src.x, z: input.sw.src.z, r, color: 0x8adfff, alpha: 0.8, thick: 0.03, fill: 0.25, dash: true });
    }
    game.fx.setRings(rings);

    renderer.render(now / 1000);
    overlay.update(dt);
    hud.update(dt);
    miniT -= dt;
    if (miniT <= 0) { minimap.update(Math.max(dt, 1 / 15)); miniT = 1 / 15; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  $('start').classList.add('gone');
  setTimeout(() => $('start').remove(), 900);
  audio.play('ready');
  setTimeout(() => hud.eva(`${FACTIONS[chosen].name} hive online. Welcome back, Commander.`, null), 400);
  window.__game = { game, input, renderer, cam, hud };
}

boot();
