// Red Alert 2 style right sidebar (nutrients, radar, power meter, 4 tabbed cameo build queues with
// radial progress), superweapon panel, EVA ticker, selection panel with command buttons, help & game-over.
import { BUILDINGS, UNITS, WEAPONS, SUPERWEAPONS, FACTIONS, ARMOR_NAMES, def as defOf } from '../data/index.js';
import { Production } from '../systems/Production.js';
import { audio } from '../audio/Audio.js';
import { formatTime } from '../core/util.js';

const TAB_KEYS = ['structures', 'defense', 'infantry', 'vehicles'];
const $ = (id) => document.getElementById(id);

export class Hud {
  constructor(game, input, renderer, cameos) {
    this.game = game;
    this.input = input;
    this.renderer = renderer;
    this.cameos = cameos;
    this.faction = game.player.faction;
    this.tab = 'structures';
    this.creditsShown = game.player.credits;
    this.t = 0;
    this.flashTabs = new Set();
    this.evaList = $('eva');
    this.settings = { pixelate: false, dither: false, crt: false, mute: false, voice: true, edge: true, stats: false };
    this.paused = false;
    this.fps = { frames: 0, t: 0, value: 0 };
    document.body.dataset.faction = this.faction;
    $('powerName').textContent = FACTIONS[this.faction].power.toUpperCase();
    this.buildCameos();
    this.buildTabs();
    this.bindTools();
    this.bindEvents();
  }

  // ------------------------------------------------------------------ construction
  buildTabs() {
    document.querySelectorAll('#tabs button').forEach((b) => {
      b.onclick = () => { this.setTab(b.dataset.tab); audio.play('tab'); };
    });
    this.setTab('structures');
  }

  setTab(tab) {
    this.tab = tab;
    this.flashTabs.delete(tab);
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.cameo').forEach((c) => c.classList.toggle('hidden', c.dataset.tab !== tab));
  }

  buildCameos() {
    const host = $('cameos');
    host.innerHTML = '';
    this.cameoEls = {};
    const all = [...Object.values(BUILDINGS), ...Object.values(UNITS)].filter((d) => d.faction === this.faction && d.buildable !== false);
    for (const tab of TAB_KEYS) {
      for (const d of all.filter((x) => x.tab === tab)) {
        const el = document.createElement('button');
        el.className = 'cameo';
        el.dataset.kind = d.key;
        el.dataset.tab = tab;
        el.setAttribute('aria-label', `${d.name}, $${d.cost}`);
        el.innerHTML = `
          <img alt="" src="${this.cameos[d.key] || ''}">
          <div class="c-name">${d.name}</div>
          <div class="c-cost">$${d.cost}</div>
          <div class="c-clock"></div>
          <div class="c-status"></div>
          <div class="c-badge"></div>
          <div class="c-lock">🔒</div>`;
        el.addEventListener('click', (e) => { e.preventDefault(); this.onCameo(d.key, false); });
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onCameo(d.key, true); });
        el.addEventListener('mouseenter', () => this.showTip(d.key, el));
        el.addEventListener('mouseleave', () => this.hideTip());
        host.appendChild(el);
        this.cameoEls[d.key] = el;
      }
    }
  }

  showTip(kind, el) {
    const d = defOf(kind);
    const P = this.game.player.production;
    const miss = P.available(kind) ? null : P.missingPrereq(kind);
    const tip = $('tooltip');
    const pw = d.power ? `<span class="${d.power > 0 ? 'pos' : 'neg'}">⚡ ${d.power > 0 ? '+' : ''}${d.power}</span>` : '';
    const w = d.weapon ? WEAPONS[d.weapon] : null;
    const stats = d.isUnit
      ? `<span class="stat">HP ${d.hp} · ${ARMOR_NAMES[d.armor]} · speed ${d.speed}${w && w.damage ? ` · dmg ${w.damage} · range ${w.range}` : ''}</span><br>`
      : `<span class="stat">HP ${d.hp} · ${d.w}×${d.h}${w && w.damage ? ` · dmg ${w.damage} · range ${w.range}` : ''}</span><br>`;
    tip.innerHTML = `<b>${d.name}</b> <span class="cost">$${d.cost}</span> ${pw}<br>${stats}<span class="desc">${d.desc || ''}</span>${miss ? `<br><span class="req">Requires: ${miss}</span>` : ''}`;
    const r = el.getBoundingClientRect();
    tip.style.top = `${Math.min(r.top, window.innerHeight - 170)}px`;
    tip.style.right = `${window.innerWidth - r.left + 8}px`;
    tip.classList.remove('hidden');
  }
  hideTip() { $('tooltip').classList.add('hidden'); }

  onCameo(kind, right) {
    audio.init();
    const P = this.game.player.production;
    if (right) {
      const r = P.cancel(kind);
      if (r === 'hold') this.eva('On hold', 'click');
      else if (r === 'canceled') this.eva('Canceled', 'click');
      return;
    }
    const q = Production.queueOf(kind);
    if (q === 'structures' || q === 'defense') {
      const s = P.slots[q];
      if (s && s.kind === kind && s.ready) { this.input.beginPlacement(kind); audio.play('click'); return; }
    }
    switch (P.start(kind)) {
      case 'building': case 'resumed': this.eva('Building', 'click'); break;
      case 'queued': this.eva('Training', 'click'); break;
      case 'busy': this.eva('Unable to comply, building in progress', 'error'); break;
      default: audio.play('error');
    }
  }

  bindTools() {
    $('btnRepair').onclick = () => { audio.init(); this.input.setMode(this.input.mode === 'repair' ? 'normal' : 'repair'); };
    $('btnSell').onclick = () => { audio.init(); this.input.setMode(this.input.mode === 'sell' ? 'normal' : 'sell'); };
    $('btnPixel').onclick = () => this.toggle('pixelate');
    $('btnDither').onclick = () => this.toggle('dither');
    $('btnCRT').onclick = () => this.toggle('crt');
    $('btnSound').onclick = () => this.toggle('mute');
    $('btnHelp').onclick = () => this.toggleHelp();
    $('helpClose').onclick = () => this.toggleHelp(false);
    $('optVoice').onchange = (e) => { this.settings.voice = e.target.checked; audio.voiceOn = e.target.checked; };
    $('optEdge').onchange = (e) => { this.settings.edge = e.target.checked; this.input.edgeScroll = e.target.checked; };
    $('optPixelSize').oninput = (e) => { this.renderer.setRetro({ pixelSize: Number(e.target.value) }); };
    this.applySettings();
  }

  toggle(name) {
    if (name === 'stats') { this.settings.stats = !this.settings.stats; $('stats').classList.toggle('hidden', !this.settings.stats); return; }
    this.settings[name] = !this.settings[name];
    audio.play('tab');
    this.applySettings();
  }

  applySettings() {
    const s = this.settings;
    this.renderer.setRetro({ pixelate: s.pixelate, dither: s.dither, crt: s.crt });
    audio.setMuted(s.mute);
    $('btnPixel').classList.toggle('on', s.pixelate);
    $('btnDither').classList.toggle('on', s.dither);
    $('btnCRT').classList.toggle('on', s.crt);
    $('btnSound').classList.toggle('on', !s.mute);
    $('btnSound').textContent = s.mute ? '🔇' : '🔊';
    document.body.classList.toggle('crt', s.crt);
  }

  toggleHelp(force) {
    const h = $('help');
    const show = force ?? h.classList.contains('hidden');
    h.classList.toggle('hidden', !show);
    this.paused = show;
    $('timer').classList.toggle('paused', show);
  }

  bindEvents() {
    const bus = this.game.bus;
    bus.on('eva', (text, sound) => this.eva(text, sound));
    bus.on('ui:toggle', (n) => this.toggle(n));
    bus.on('ui:help', (v) => this.toggleHelp(v));
    bus.on('ui:mode', (m) => {
      $('btnRepair').classList.toggle('on', m === 'repair');
      $('btnSell').classList.toggle('on', m === 'sell');
    });
    bus.on('ui:selection', () => { this.selDirty = true; });
    bus.on('structureReady', (kind) => {
      const tab = BUILDINGS[kind].tab;
      if (tab !== this.tab) this.flashTabs.add(tab);
    });
    bus.on('gameOver', (r) => this.gameOver(r));
  }

  // ------------------------------------------------------------------ EVA ticker
  eva(text, sound) {
    if (sound) audio.play(sound);
    audio.announce(text);
    const el = document.createElement('div');
    el.className = 'eva-msg';
    el.textContent = text;
    this.evaList.prepend(el);
    while (this.evaList.children.length > 4) this.evaList.lastChild.remove();
    setTimeout(() => el.classList.add('fade'), 4200);
    setTimeout(() => el.remove(), 5200);
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game, T = g.player;
    this.t += dt;
    this.fps.frames++; this.fps.t += dt;
    if (this.fps.t >= 0.5) {
      this.fps.value = Math.round(this.fps.frames / this.fps.t);
      this.fps.frames = 0; this.fps.t = 0;
      if (this.settings.stats) {
        const info = this.renderer.gl.info;
        $('stats').textContent = `FPS ${this.fps.value} · draw ${info.render.calls} · tris ${(info.render.triangles / 1000).toFixed(0)}k · units ${g.units.length} · bldg ${g.buildings.length} · fx ${g.fx.add.count + g.fx.alpha.count}`;
      }
    }
    const diff = T.credits - this.creditsShown;
    if (Math.abs(diff) > 0.5) {
      const step = Math.sign(diff) * Math.max(1, Math.min(Math.abs(diff), Math.abs(diff) * dt * 6 + 40 * dt));
      this.creditsShown += step;
      if (Math.random() < 0.25) audio.play('cash', null, 0.35);
    } else this.creditsShown = T.credits;
    $('credits').textContent = '$' + Math.floor(this.creditsShown).toLocaleString('en-US');
    $('timer').textContent = this.paused ? 'PAUSED' : formatTime(g.time);

    const scale = Math.max(300, T.powerSupply, T.powerDemand) * 1.15;
    $('powerFill').style.height = `${(T.powerSupply / scale) * 100}%`;
    $('powerDemand').style.bottom = `${(T.powerDemand / scale) * 100}%`;
    $('power').classList.toggle('low', T.lowPower);
    $('powerText').textContent = `${T.powerDemand}/${T.powerSupply}`;
    $('radarOff').classList.toggle('hidden', T.hasRadar);

    document.querySelectorAll('#tabs button').forEach((b) => {
      b.classList.toggle('flash', this.flashTabs.has(b.dataset.tab) && Math.sin(this.t * 8) > 0);
    });
    this.updateCameos();
    this.updateSuperweapons();
    if (this.selDirty || Math.floor(this.t * 4) !== this.lastSelTick) {
      this.lastSelTick = Math.floor(this.t * 4);
      this.selDirty = false;
      this.updateSelection();
    }
  }

  updateCameos() {
    const P = this.game.player.production;
    for (const [kind, el] of Object.entries(this.cameoEls)) {
      const avail = P.available(kind);
      const item = P.itemFor(kind);
      const busy = P.isBusy(kind);
      el.classList.toggle('locked', !avail && !item);
      el.classList.toggle('busy', avail && busy);
      const clock = el.children[3], status = el.children[4], badge = el.children[5];
      let st = '';
      if (item) {
        const p = item.progress;
        clock.style.background = item.ready ? 'none' : `conic-gradient(from 0deg, rgba(0,0,0,0) ${p * 360}deg, rgba(4,14,4,0.72) ${p * 360}deg)`;
        clock.style.display = 'block';
        if (item.ready) st = Math.sin(this.t * 7) > -0.3 ? 'READY' : '';
        else if (item.hold) st = 'ON HOLD';
        el.classList.toggle('ready', !!item.ready);
      } else {
        clock.style.display = 'none';
        el.classList.remove('ready');
      }
      status.textContent = st;
      const n = UNITS[kind] ? P.countQueued(kind) : 0;
      badge.textContent = n > 1 ? n : '';
    }
  }

  updateSuperweapons() {
    const host = $('swPanel');
    const list = this.game.superweapons.list(0);
    const sig = list.map((s) => s.key).join(',');
    if (sig !== this.swSig) {
      this.swSig = sig;
      host.innerHTML = '';
      for (const s of list) {
        const d = SUPERWEAPONS[s.key];
        const el = document.createElement('button');
        el.className = 'sw';
        el.dataset.key = s.key;
        el.innerHTML = `<img alt="" src="${this.cameos[d.building] || ''}"><div class="sw-name">${d.name}</div><div class="sw-bar"><div></div></div><div class="sw-time"></div>`;
        el.onclick = () => { audio.init(); this.input.beginSW(s.key); };
        el.title = d.desc;
        host.appendChild(el);
      }
    }
    for (const el of host.children) {
      const s = list.find((x) => x.key === el.dataset.key);
      if (!s) continue;
      const d = SUPERWEAPONS[s.key];
      el.querySelector('.sw-bar div').style.width = `${s.charge * 100}%`;
      el.querySelector('.sw-time').textContent = s.ready ? 'READY' : formatTime((1 - s.charge) * d.charge);
      el.classList.toggle('ready', s.ready);
      el.classList.toggle('targeting', this.input.sw?.key === s.key);
    }
  }

  updateSelection() {
    const box = $('selinfo');
    const sel = [...this.input.selected].filter((e) => e.alive);
    const cmds = this.commandButtons(sel);
    if (!sel.length) {
      box.innerHTML = `<div class="sel-empty">No selection<br><small>Left-click / drag to select · Right-click to order</small></div>`;
      return;
    }
    if (sel.length === 1) {
      const e = sel[0];
      const img = this.cameos[e.kind] || '';
      const lines = [];
      if (e.isUnit) {
        lines.push(`${ARMOR_NAMES[e.armor]}${e.vet ? ' · ★ Veteran' : ''}${e.controller ? ' · <span class="psy">Mind-controlled</span>' : ''}`);
        if (e.isHarvester) lines.push(`Cargo ${Math.round(e.cargo)}/${e.def.harvester.capacity} · ${this.harvLabel(e)}`);
        if (e.def.slaveMiner) lines.push(e.deployed ? `Deployed · ${e.drones.length} drones` : 'Mobile (deploy at a field)');
        if (e.def.transport) lines.push(`Passengers ${e.passengers.length}/${e.def.transport}`);
        if (e.controlled.length) lines.push(`Controlling ${e.controlled.filter((c) => c.alive).length}`);
        if (e.def.deploy && !e.def.transport) lines.push(e.deployed ? 'DEPLOYED' : 'Deploy: F');
      } else {
        if (e.def.power) lines.push(`Power ${e.def.power > 0 ? '+' : ''}${e.def.power}${e.powered ? '' : ' · <span class="neg">OFFLINE</span>'}`);
        if (e.def.produces) lines.push('Right-click map: rally point');
        if (e.def.garrison) lines.push(`Garrison ${e.passengers.length}/${e.def.garrison}`);
        if (e.def.chargeable) lines.push(`Charged by ${e.charges || 0}/2 Spark Centipedes`);
        if (e.state === 'constructing') lines.push('Under construction…');
        if (e.drainedBy) lines.push('<span class="neg">Being drained!</span>');
      }
      const owner = e.team === 0 ? '' : '<span class="neg">ENEMY</span> ';
      box.innerHTML = `
        <div class="sel-one">
          <img src="${img}" alt="">
          <div>
            <div class="sel-name">${owner}${e.def.name}</div>
            <div class="sel-hp"><div style="width:${(e.hp / e.maxHp) * 100}%" class="${e.hp / e.maxHp > 0.5 ? 'g' : e.hp / e.maxHp > 0.25 ? 'y' : 'r'}"></div></div>
            <div class="sel-extra">${Math.ceil(e.hp)}/${e.maxHp} HP<br>${lines.join('<br>')}</div>
          </div>
        </div>${cmds}`;
    } else {
      const counts = {};
      for (const e of sel) counts[e.kind] = (counts[e.kind] || 0) + 1;
      box.innerHTML = `<div class="sel-multi">${Object.entries(counts).map(([k, n]) => `<div class="sel-chip" title="${defOf(k).name}"><img src="${this.cameos[k] || ''}" alt=""><span>×${n}</span></div>`).join('')}</div>${cmds}`;
    }
    box.querySelectorAll('button[data-cmd]').forEach((b) => {
      b.onclick = () => {
        audio.init();
        const units = this.input.selectedUnits();
        if (b.dataset.cmd === 'deploy') this.input.deploySelected();
        else if (b.dataset.cmd === 'stop') { for (const u of units) u.stop(); audio.play('click'); }
        else if (b.dataset.cmd === 'amove') this.input.setMode('attackMove');
        else if (b.dataset.cmd === 'unload') { for (const b2 of [...this.input.selected]) if (b2.isBuilding) this.game.abilities.ejectAll(b2); }
        this.selDirty = true;
      };
    });
  }

  commandButtons(sel) {
    const units = sel.filter((e) => e.isUnit && e.team === 0);
    const bldg = sel.find((e) => e.isBuilding && e.team === 0 && (e.passengers.length || (e.chargers && e.chargers.length)));
    const btn = [];
    if (units.some((u) => u.def.deploy)) {
      const label = units.some((u) => u.def.deploy === 'unload') ? 'UNLOAD' : units.some((u) => u.def.deploy === 'mcv') ? 'DEPLOY BASE' : units.some((u) => u.def.deploy === 'psiWave') ? 'PSI WAVE' : 'DEPLOY';
      btn.push(`<button data-cmd="deploy" title="F">${label}</button>`);
    }
    if (units.length) {
      btn.push('<button data-cmd="stop" title="X">STOP</button>');
      if (units.some((u) => u.hasWeapon)) btn.push('<button data-cmd="amove" title="Q / Ctrl+Right-click">ATK-MOVE</button>');
    }
    if (bldg) btn.push('<button data-cmd="unload">EVACUATE</button>');
    return btn.length ? `<div class="sel-cmds">${btn.join('')}</div>` : '';
  }

  harvLabel(h) {
    return {
      seek: 'Searching', toField: 'To field', harvesting: 'Harvesting', toRefinery: 'Returning', waitDock: 'Waiting',
      docking: 'Docking', unloading: 'Unloading', noRefinery: 'No refinery!', toRefineryStart: 'Returning',
    }[h.hstate] || (h.order.type === 'move' ? 'Moving' : 'Idle');
  }

  gameOver(result) {
    const g = this.game, s = g.player.stats;
    const el = $('gameover');
    const won = result === 'won';
    const ef = FACTIONS[g.teams[1].faction];
    el.innerHTML = `
      <div class="go-box ${won ? 'won' : 'lost'}">
        <h1>${won ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}</h1>
        <p>${won ? `The ${ef.name} hive (${ef.order}) has been exterminated.` : 'Your hive has been overrun.'}</p>
        <table>
          <tr><td>Time</td><td>${formatTime(g.time)}</td></tr>
          <tr><td>Units & structures produced</td><td>${s.built}</td></tr>
          <tr><td>Enemies destroyed</td><td>${s.killed}</td></tr>
          <tr><td>Losses</td><td>${s.lost}</td></tr>
          <tr><td>Nutrients harvested</td><td>$${Math.round(s.harvested).toLocaleString('en-US')}</td></tr>
        </table>
        <button onclick="location.reload()">PLAY AGAIN</button>
      </div>`;
    setTimeout(() => el.classList.remove('hidden'), 2200);
    setTimeout(() => this.eva(won ? 'Mission accomplished' : 'Mission failed', won ? 'ready' : 'alarm'), 1500);
  }
}
