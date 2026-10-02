// Synthesised retro SFX (WebAudio) + speech-synthesis placeholder voice lines
// for the EVA-style announcer ("Unit ready", "Structure under attack") and unit barks.

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.voiceOn = true;
    this.master = null;
    this.lastPlay = new Map();
    this.listener = { x: 0, z: 0, range: 30 };
    this.voices = [];
    this.speaking = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if ('speechSynthesis' in window) {
      const load = () => { this.voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
    if (m && 'speechSynthesis' in window) speechSynthesis.cancel();
  }

  // ---------------------------------------------------------------- primitives
  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  osc(type, f0, f1, dur, vol, t = 0) {
    const c = this.ctx, now = c.currentTime + t;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + dur);
    this.env(g, now, 0.005, vol, dur);
    o.connect(g).connect(this.master);
    o.start(now); o.stop(now + dur + 0.05);
  }
  noise(dur, vol, filterType, f0, f1, q = 1, t = 0) {
    const c = this.ctx, now = c.currentTime + t;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = filterType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, now);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), now + dur);
    const g = c.createGain();
    this.env(g, now, 0.004, vol, dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(now, Math.random() * 0.5); s.stop(now + dur + 0.05);
  }

  // ---------------------------------------------------------------- sound bank
  play(name, pos = null, volume = 1) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    let v = volume;
    if (pos) {
      const d = Math.hypot(pos.x - this.listener.x, pos.z - this.listener.z);
      if (d > this.listener.range) return;
      v *= 1 - (d / this.listener.range) * 0.8;
    }
    // throttle identical sounds
    const now = performance.now();
    const minGap = { cannon: 50, spray: 90, water: 70, sting: 60, harvest: 400, explode: 60, needle: 45, gatling: 40, squelch: 60, chrono: 120, mind: 200 }[name] || 30;
    if (now - (this.lastPlay.get(name) || 0) < minGap) return;
    this.lastPlay.set(name, now);
    switch (name) {
      case 'click': this.osc('square', 1400, 900, 0.04, 0.12 * v); break;
      case 'tab': this.osc('square', 700, 1100, 0.05, 0.1 * v); break;
      case 'error': this.osc('square', 220, 150, 0.18, 0.15 * v); this.osc('square', 180, 120, 0.2, 0.12 * v, 0.1); break;
      case 'squawk':
        this.noise(0.12, 0.25 * v, 'bandpass', 2400, 1600, 4);
        this.osc('square', 900 + Math.random() * 300, 600, 0.08, 0.06 * v, 0.02);
        break;
      case 'engine': this.osc('sawtooth', 55, 120, 0.45, 0.12 * v); this.noise(0.35, 0.08 * v, 'lowpass', 300, 900, 1); break;
      case 'buzz': this.osc('sawtooth', 180, 260, 0.25, 0.08 * v); this.osc('square', 360, 340, 0.2, 0.04 * v); break;
      case 'cannon': this.noise(0.25, 0.5 * v, 'lowpass', 1800, 120, 1); this.osc('sine', 140, 40, 0.25, 0.4 * v); break;
      case 'lob': this.osc('triangle', 300, 90, 0.35, 0.25 * v); this.noise(0.15, 0.2 * v, 'highpass', 900, 3000, 1); break;
      case 'spray': this.noise(0.22, 0.12 * v, 'highpass', 3000, 5000, 0.7); break;
      case 'water': this.noise(0.3, 0.18 * v, 'bandpass', 1800, 900, 1.5); break;
      case 'sting': this.osc('square', 1800, 600, 0.06, 0.07 * v); break;
      case 'zap':
        this.noise(0.35, 0.35 * v, 'bandpass', 4000, 1200, 2);
        this.osc('sawtooth', 90, 60, 0.4, 0.25 * v);
        this.osc('square', 1200, 3000, 0.08, 0.08 * v);
        break;
      case 'crackle': this.noise(0.06, 0.05 * v, 'highpass', 5000, 6000, 1); break;
      case 'explode': this.noise(0.8, 0.7 * v, 'lowpass', 1400, 60, 0.8); this.osc('sine', 90, 30, 0.6, 0.5 * v); break;
      case 'bigExplode': this.noise(1.6, 0.9 * v, 'lowpass', 1200, 40, 0.7); this.osc('sine', 70, 25, 1.2, 0.6 * v); this.noise(0.6, 0.4 * v, 'lowpass', 600, 60, 1, 0.25); break;
      case 'splash': this.noise(0.25, 0.2 * v, 'bandpass', 1200, 400, 1); break;
      case 'place': this.osc('square', 300, 300, 0.06, 0.12 * v); this.osc('square', 450, 450, 0.06, 0.12 * v, 0.07); this.noise(0.3, 0.2 * v, 'lowpass', 600, 100, 1, 0.1); break;
      case 'build': this.noise(0.12, 0.12 * v, 'bandpass', 2500, 2000, 6); this.osc('square', 1600, 1600, 0.03, 0.05 * v, 0.05); break;
      case 'ready': this.osc('triangle', 660, 660, 0.09, 0.15 * v); this.osc('triangle', 880, 880, 0.12, 0.15 * v, 0.1); break;
      case 'harvest': this.noise(0.3, 0.06 * v, 'bandpass', 500, 300, 2); break;
      case 'cash': this.osc('square', 1500, 1500, 0.03, 0.05 * v); this.osc('square', 2000, 2000, 0.03, 0.05 * v, 0.04); break;
      case 'sell': this.osc('triangle', 900, 300, 0.4, 0.15 * v); break;
      case 'repair': this.osc('square', 500, 800, 0.08, 0.06 * v); break;
      case 'alarm': for (let i = 0; i < 3; i++) this.osc('square', 880, 660, 0.14, 0.1 * v, i * 0.18); break;
      // ---- arthropod arsenal
      case 'needle': this.noise(0.05, 0.12 * v, 'highpass', 4000, 6000, 1); this.osc('square', 2200, 1400, 0.03, 0.04 * v); break;
      case 'spike': this.noise(0.08, 0.2 * v, 'bandpass', 2600, 1200, 2); this.osc('triangle', 900, 300, 0.08, 0.12 * v); break;
      case 'rail': this.osc('sawtooth', 1800, 200, 0.18, 0.18 * v); this.noise(0.15, 0.25 * v, 'bandpass', 3000, 800, 2); break;
      case 'dart': this.osc('square', 2600, 1800, 0.04, 0.06 * v); break;
      case 'sniper': this.noise(0.2, 0.35 * v, 'bandpass', 2000, 400, 2); this.osc('sine', 600, 120, 0.25, 0.25 * v); break;
      case 'bigCannon': this.noise(0.4, 0.7 * v, 'lowpass', 1400, 80, 1); this.osc('sine', 110, 35, 0.4, 0.55 * v); break;
      case 'bile': this.noise(0.25, 0.25 * v, 'bandpass', 900, 300, 3); this.osc('sine', 260, 90, 0.2, 0.12 * v); break;
      case 'burn': this.noise(0.5, 0.25 * v, 'lowpass', 2500, 400, 0.7); break;
      case 'pyro': this.noise(0.25, 0.2 * v, 'bandpass', 1400, 600, 1.5); this.osc('triangle', 300, 600, 0.15, 0.08 * v); break;
      case 'prism': this.osc('sine', 1800, 2600, 0.25, 0.2 * v); this.osc('triangle', 900, 1300, 0.3, 0.12 * v); this.noise(0.2, 0.12 * v, 'highpass', 5000, 7000, 1); break;
      case 'laser': this.osc('sawtooth', 1500, 400, 0.12, 0.1 * v); break;
      case 'missile': this.noise(0.35, 0.22 * v, 'bandpass', 1200, 3000, 1.5); break;
      case 'missileLaunch': this.noise(1.0, 0.5 * v, 'lowpass', 600, 2400, 0.8); this.osc('sawtooth', 70, 140, 0.9, 0.2 * v); break;
      case 'flak': this.noise(0.18, 0.35 * v, 'lowpass', 2000, 200, 1); break;
      case 'zapSmall': this.noise(0.15, 0.2 * v, 'bandpass', 4000, 1500, 2); this.osc('square', 1500, 2400, 0.05, 0.05 * v); break;
      case 'chrono': this.osc('sine', 300, 1600, 0.35, 0.18 * v); this.osc('triangle', 1600, 200, 0.4, 0.1 * v, 0.1); break;
      case 'chronoBig': this.osc('sine', 120, 2400, 1.2, 0.3 * v); this.noise(1.2, 0.3 * v, 'bandpass', 600, 4000, 2); break;
      case 'plant': this.osc('square', 500, 500, 0.05, 0.08 * v); this.osc('square', 700, 700, 0.05, 0.08 * v, 0.08); break;
      case 'bite': this.noise(0.1, 0.35 * v, 'bandpass', 1500, 500, 2); break;
      case 'punch': this.noise(0.14, 0.5 * v, 'lowpass', 900, 100, 1); this.osc('sine', 120, 50, 0.15, 0.3 * v); break;
      case 'drill': this.osc('sawtooth', 220, 380, 0.5, 0.12 * v); this.noise(0.5, 0.12 * v, 'bandpass', 2200, 3400, 4); break;
      case 'paint': this.osc('sine', 1200, 1250, 1.2, 0.06 * v); break;
      case 'mind': this.osc('sine', 200, 700, 0.5, 0.15 * v); this.osc('sine', 203, 690, 0.5, 0.15 * v); break;
      case 'mindTake': this.osc('triangle', 400, 1200, 0.6, 0.18 * v); this.osc('sine', 800, 300, 0.6, 0.12 * v, 0.2); break;
      case 'gatling': this.noise(0.04, 0.15 * v, 'bandpass', 3000, 2500, 3); break;
      case 'gas': this.noise(0.8, 0.22 * v, 'highpass', 1500, 3500, 0.6); break;
      case 'magnet': this.osc('sawtooth', 60, 90, 0.8, 0.15 * v); this.osc('sine', 400, 380, 0.8, 0.08 * v); break;
      case 'sonic': this.osc('sine', 180, 60, 0.4, 0.3 * v); this.osc('sine', 360, 120, 0.4, 0.15 * v); break;
      case 'deploy': this.osc('square', 300, 200, 0.12, 0.1 * v); this.noise(0.2, 0.12 * v, 'lowpass', 800, 200, 1, 0.08); break;
      case 'undeploy': this.osc('square', 200, 320, 0.12, 0.1 * v); break;
      case 'board': this.osc('triangle', 500, 800, 0.1, 0.1 * v); break;
      case 'grind': this.noise(0.8, 0.4 * v, 'bandpass', 400, 1200, 2); this.osc('sawtooth', 70, 50, 0.8, 0.2 * v); break;
      case 'squish': this.noise(0.15, 0.35 * v, 'lowpass', 1200, 200, 2); break;
      case 'squelch': this.noise(0.18, 0.22 * v, 'bandpass', 700, 250, 3); break;
      case 'crunch': this.noise(0.3, 0.55 * v, 'lowpass', 2400, 200, 1); break;
      case 'psiWave': this.osc('sine', 80, 600, 0.8, 0.3 * v); this.osc('sine', 82, 590, 0.8, 0.3 * v); this.noise(0.6, 0.2 * v, 'bandpass', 500, 2500, 2); break;
      case 'thunder': this.noise(2.0, 0.8 * v, 'lowpass', 900, 40, 0.6); break;
      case 'nukeBlast': this.noise(3.0, 1.0 * v, 'lowpass', 800, 30, 0.6); this.osc('sine', 50, 20, 2.5, 0.8 * v); break;
      case 'ironCurtain': this.osc('sawtooth', 90, 180, 1.0, 0.25 * v); this.osc('square', 45, 45, 1.0, 0.1 * v); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- voice
  say(text, { pitch = 1, rate = 1.05, priority = 1, voiceIndex = 0 } = {}) {
    if (this.muted || !this.voiceOn || !('speechSynthesis' in window)) return;
    const s = speechSynthesis;
    if (s.speaking) {
      if (this.speaking && this.speaking.priority > priority) return;
      s.cancel();
    }
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = pitch; u.rate = rate; u.volume = 0.85;
    if (this.voices.length) u.voice = this.voices[voiceIndex % this.voices.length];
    this.speaking = { priority };
    u.onend = () => { this.speaking = null; };
    s.speak(u);
  }

  announce(text) { this.say(text, { pitch: 0.75, rate: 0.95, priority: 2, voiceIndex: 0 }); }
  // unit acknowledgement: radio squawk + a voice pitched by faction (bright Allied wasps,
  // gravelly Soviet bugs, eerie Yuri psionics)
  bark(text, faction = 'allied') {
    this.play('squawk');
    const v = { allied: [1.25, 1.2, 1], soviet: [0.6, 0.95, 2], yuri: [1.6, 0.85, 3] }[faction] || [1.1, 1.1, 1];
    setTimeout(() => this.say(text, { pitch: v[0] + Math.random() * 0.2, rate: v[1], priority: 1, voiceIndex: v[2] }), 90);
  }
}

export const audio = new AudioSystem();
