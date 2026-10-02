// High-level VFX: muzzle flashes, explosions, water streams, pesticide spray, spore clouds,
// smoke stacks, tesla arcs, glowing selection rings, order markers, scorch decals & rubble.
import * as THREE from 'three';
import { ParticleSystem } from './Particles.js';
import { ArcPool } from './TeslaArc.js';
import { shared, FOW_GLSL, patchMaterial } from '../render/fow.js';
import { commonMats } from '../render/materials.js';
import { PartBuilder } from '../models/builder.js';
import { rand } from '../core/util.js';

const RING_VS = /* glsl */`
  uniform vec2 uFowSize;
  varying vec2 vUv;
  varying vec2 vFowUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vFowUv = wp.xz / uFowSize;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const RING_FS = /* glsl */`
  ${FOW_GLSL}
  uniform vec3 uColor;
  uniform float uAlpha, uDash, uThick, uFill;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float rr = 1.0 - uThick * 1.5;
    float ring = smoothstep(uThick, uThick * 0.3, abs(r - rr));
    float ang = atan(p.y, p.x);
    float dash = uDash > 0.5 ? (step(0.0, sin(ang * 6.0 + uTime * 2.5)) * 0.55 + 0.45) : 1.0;
    float inner = exp(-abs(r - rr) * 7.0) * 0.4 + uFill * (1.0 - r) * 0.25;
    float a = (ring * dash + inner) * uAlpha;
    a *= smoothstep(0.5, 0.9, fowSample());
    gl_FragColor = vec4(uColor * (1.0 + ring * 1.5), a);
  }
`;

function ringMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x6dff4a) }, uAlpha: { value: 1 }, uDash: { value: 1 }, uThick: { value: 0.12 }, uFill: { value: 0 },
      uFowTex: shared.uFowTex, uFowEnabled: shared.uFowEnabled, uFowSize: shared.uFowSize, uTime: shared.uTime,
    },
    vertexShader: RING_VS,
    fragmentShader: RING_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.55, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  // speckles
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * 6.28, r = Math.random() * 26;
    g.fillStyle = `rgba(20,12,6,${Math.random() * 0.5})`;
    g.fillRect(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const _v = new THREE.Vector3();
const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.add = new ParticleSystem(scene, 5000, true);
    this.alpha = new ParticleSystem(scene, 5000, false);
    this.arcs = new ArcPool(scene, 72);
    this.timers = [];

    // selection rings
    this.rings = [];
    this.ringUsed = 0;
    // order markers
    this.markers = [];
    // scorch decals
    this.scorchTex = radialTexture('rgba(18,12,8,0.85)', 'rgba(18,12,8,0)');
    this.decals = [];
    for (let i = 0; i < 40; i++) {
      const mat = patchMaterial(new THREE.MeshBasicMaterial({ map: this.scorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const m = new THREE.Mesh(PLANE, mat);
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.decals.push({ mesh: m, life: 0, max: 1, active: false });
    }
    // lobbed seed pods
    const cm = commonMats();
    const sb = new PartBuilder();
    sb.sphere(cm.seed, 0.12, 8, 6, 0, 0, 0, 1, 1.25, 1);
    sb.sphere(cm.seedHead, 0.1, 8, 4, 0, 0.08, 0, 1.1, 0.5, 1.1);
    this.seedTpl = sb.build({ castShadow: true });
    this.seedPool = [];
    // rubble templates
    this.rubbleTpl = new Map();
    this.rubble = [];
    // goo splat decals (tinted)
    this.splats = [];
    const splatTex = radialTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
    for (let i = 0; i < 40; i++) {
      const mat = patchMaterial(new THREE.MeshBasicMaterial({ map: splatTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const m = new THREE.Mesh(PLANE, mat);
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.splats.push({ mesh: m, life: 0, max: 1, active: false });
    }
    this.waves = [];
    this.auras = [];
    this.auraGeo = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  }

  // ------------------------------------------------------------------ scheduling
  after(t, fn) { this.timers.push({ t, fn }); }

  // ------------------------------------------------------------------ particle presets
  muzzle(p, dir, color = 0xffe08a, scale = 1) {
    this.add.emit({ x: p.x, y: p.y, z: p.z, life: 0.08, size: 0.9 * scale, size1: 0.3 * scale, color: 0xffffff, color1: color, alpha: 1.5 });
    for (let i = 0; i < 5; i++) {
      const s = rand(2, 5);
      this.add.emit({
        x: p.x, y: p.y, z: p.z, vx: dir.x * s + rand(-1, 1), vy: dir.y * s + rand(-0.5, 1.2), vz: dir.z * s + rand(-1, 1),
        life: rand(0.1, 0.25), size: 0.12 * scale, size1: 0.02, color, color1: 0xff5a10, alpha: 1.2, gravity: 4,
      });
    }
    this.alpha.emit({ x: p.x, y: p.y, z: p.z, vx: dir.x * 0.8, vy: 0.6, vz: dir.z * 0.8, life: 0.7, size: 0.25 * scale, size1: 0.8 * scale, color: 0x9a948a, alpha: 0.35, drag: 2 });
  }

  impact(p, scale = 1, soil = true) {
    this.add.emit({ x: p.x, y: p.y + 0.1, z: p.z, life: 0.12, size: 1.1 * scale, size1: 0.2, color: 0xffd27a, color1: 0xff6a20, alpha: 1.3 });
    for (let i = 0; i < 6 * scale; i++) {
      this.add.emit({ x: p.x, y: p.y + 0.1, z: p.z, vx: rand(-3, 3), vy: rand(1, 4), vz: rand(-3, 3), life: rand(0.2, 0.45), size: 0.09, size1: 0.02, color: 0xffc860, color1: 0xff4010, gravity: 9 });
    }
    if (soil) for (let i = 0; i < 6 * scale; i++) {
      this.alpha.emit({ x: p.x, y: p.y + 0.05, z: p.z, vx: rand(-2, 2), vy: rand(2, 4.5), vz: rand(-2, 2), life: rand(0.4, 0.8), size: rand(0.08, 0.16), color: 0x4a2f1c, alpha: 1, gravity: 10 });
    }
    this.alpha.emit({ x: p.x, y: p.y + 0.2, z: p.z, vy: 0.5, life: 0.9, size: 0.4 * scale, size1: 1.2 * scale, color: 0x6e665c, alpha: 0.45, drag: 1 });
  }

  explosion(p, scale = 1) {
    this.add.emit({ x: p.x, y: p.y + 0.3, z: p.z, life: 0.18, size: 2.6 * scale, size1: 1.0 * scale, color: 0xffffff, color1: 0xffa040, alpha: 1.6 });
    for (let i = 0; i < 18 * scale; i++) {
      const a = Math.random() * 6.28, s = rand(0.5, 2.5) * scale;
      this.add.emit({
        x: p.x, y: p.y + 0.3, z: p.z, vx: Math.cos(a) * s, vy: rand(0.5, 2.5) * scale, vz: Math.sin(a) * s,
        life: rand(0.35, 0.7), size: rand(0.4, 0.8) * scale, size1: 0.1, color: 0xffc34a, color1: 0xc8320a, alpha: 1.2, drag: 2.5,
      });
    }
    for (let i = 0; i < 14 * scale; i++) {
      this.add.emit({ x: p.x, y: p.y + 0.2, z: p.z, vx: rand(-5, 5), vy: rand(2, 7), vz: rand(-5, 5), life: rand(0.4, 0.9), size: 0.08, size1: 0.02, color: 0xfff0a0, color1: 0xff4010, gravity: 12 });
    }
    for (let i = 0; i < 10 * scale; i++) {
      this.alpha.emit({
        x: p.x + rand(-0.3, 0.3), y: p.y + 0.4, z: p.z + rand(-0.3, 0.3), vx: rand(-0.6, 0.6), vy: rand(0.8, 1.8), vz: rand(-0.6, 0.6),
        life: rand(1.4, 2.6), size: rand(0.5, 0.9) * scale, size1: rand(1.6, 2.6) * scale, color: 0x2e2a26, color1: 0x77706a, alpha: 0.55, drag: 1.2,
      });
    }
    // debris: soil clods, metal shards, leafy bits (it's a nursery after all)
    for (let i = 0; i < 10 * scale; i++) {
      const c = i % 3 === 0 ? 0x3f9a32 : i % 3 === 1 ? 0x3b3f44 : 0x4a2f1c;
      this.alpha.emit({ x: p.x, y: p.y + 0.3, z: p.z, vx: rand(-4, 4), vy: rand(3, 7), vz: rand(-4, 4), life: rand(0.8, 1.4), size: rand(0.1, 0.2), color: c, alpha: 1, gravity: 12 });
    }
    this.spores(p, Math.round(6 * scale), 0.8 * scale);
  }

  buildingExplosion(cx, cz, w, h) {
    const n = 4 + w * h;
    for (let i = 0; i < n; i++) {
      this.after(i * 0.12 + Math.random() * 0.15, () => {
        this.explosion(_v.set(cx + rand(-w / 2, w / 2) * 0.8, rand(0, 1), cz + rand(-h / 2, h / 2) * 0.8).clone(), rand(0.8, 1.5));
      });
    }
    this.after(0.4, () => this.explosion(new THREE.Vector3(cx, 0.6, cz), 2.2));
  }

  waterDrop(p, v) {
    this.add.emit({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, life: rand(0.25, 0.4), size: rand(0.12, 0.2), size1: 0.05, color: 0xbff2ff, color1: 0x3aa8e0, alpha: 0.9, gravity: 6 });
    if (Math.random() < 0.4) this.alpha.emit({ x: p.x, y: p.y, z: p.z, vx: v.x * 0.5, vy: v.y * 0.5, vz: v.z * 0.5, life: 0.5, size: 0.15, size1: 0.45, color: 0xd8f4ff, alpha: 0.25, drag: 3 });
  }

  splash(p, scale = 1, color = 0xe6fbff) {
    const c1 = color === 0xe6fbff ? 0x4ab8f0 : color;
    for (let i = 0; i < 12 * scale; i++) {
      const a = Math.random() * 6.28, s = rand(1, 3);
      this.add.emit({ x: p.x, y: p.y + 0.1, z: p.z, vx: Math.cos(a) * s, vy: rand(2, 4.5), vz: Math.sin(a) * s, life: rand(0.3, 0.55), size: rand(0.08, 0.15), color, color1: c1, alpha: 0.9, gravity: 11 });
    }
    this.alpha.emit({ x: p.x, y: p.y + 0.2, z: p.z, vy: 0.4, life: 0.7, size: 0.5, size1: 1.3, color, alpha: 0.35, drag: 2 });
  }

  spray(p, dir, color = 0xb6f24a) {
    for (let i = 0; i < 5; i++) {
      const s = rand(3, 5.5);
      this.alpha.emit({
        x: p.x, y: p.y, z: p.z, vx: dir.x * s + rand(-0.7, 0.7), vy: dir.y * s + rand(-0.2, 0.6), vz: dir.z * s + rand(-0.7, 0.7),
        life: rand(0.45, 0.75), size: 0.12, size1: rand(0.5, 0.8), color, color1: 0x5a5040, alpha: 0.55, drag: 3,
      });
    }
    this.add.emit({ x: p.x, y: p.y, z: p.z, vx: dir.x * 4, vy: dir.y * 4, vz: dir.z * 4, life: 0.3, size: 0.25, size1: 0.5, color, alpha: 0.35, drag: 3 });
  }

  dropTrail(p, color = 0x9bff3a, color1 = 0x4a8a10) {
    this.add.emit({ x: p.x + rand(-0.04, 0.04), y: p.y, z: p.z + rand(-0.04, 0.04), vx: rand(-0.3, 0.3), vy: rand(-0.2, 0.4), vz: rand(-0.3, 0.3), life: rand(0.2, 0.35), size: rand(0.08, 0.14), size1: 0.03, color, color1, alpha: 0.9, gravity: 5 });
  }

  fireball(p, scale = 1) {
    this.add.emit({ x: p.x, y: p.y + 0.2, z: p.z, life: 0.2, size: 1.6 * scale, size1: 0.5, color: 0xffffff, color1: 0xff9a30, alpha: 1.5 });
    for (let i = 0; i < 12 * scale; i++) {
      const a = Math.random() * 6.28, sp = rand(0.4, 1.6) * scale;
      this.add.emit({ x: p.x, y: p.y + 0.2, z: p.z, vx: Math.cos(a) * sp, vy: rand(0.6, 1.8), vz: Math.sin(a) * sp, life: rand(0.35, 0.65), size: rand(0.3, 0.6) * scale, size1: 0.05, color: 0xffd060, color1: 0xff3a08, alpha: 1.2, drag: 2 });
    }
    for (let i = 0; i < 4 * scale; i++) this.smoke(new THREE.Vector3(p.x + rand(-0.3, 0.3), p.y + 0.4, p.z + rand(-0.3, 0.3)), 0x3a3430, 0.4 * scale, 1.2, 0.5);
  }

  flakBurst(p) {
    this.add.emit({ x: p.x, y: p.y, z: p.z, life: 0.12, size: 0.9, size1: 0.3, color: 0xffe0a0, color1: 0xff7a20, alpha: 1.4 });
    for (let i = 0; i < 6; i++) this.add.emit({ x: p.x, y: p.y, z: p.z, vx: rand(-3, 3), vy: rand(-1, 3), vz: rand(-3, 3), life: rand(0.15, 0.3), size: 0.07, color: 0xffd080, color1: 0xff4010, gravity: 6 });
    this.alpha.emit({ x: p.x, y: p.y, z: p.z, vy: 0.3, life: 1.0, size: 0.5, size1: 1.2, color: 0x3a3836, alpha: 0.6, drag: 1.5 });
  }

  goo(p, color = 0x8aff3a, n = 10) {
    for (let i = 0; i < n; i++) {
      this.alpha.emit({ x: p.x, y: p.y, z: p.z, vx: rand(-2, 2), vy: rand(1.5, 3.5), vz: rand(-2, 2), life: rand(0.4, 0.8), size: rand(0.06, 0.13), color, color1: color, alpha: 1, gravity: 10 });
    }
    this.add.emit({ x: p.x, y: p.y, z: p.z, life: 0.15, size: 0.5, size1: 0.1, color, alpha: 0.7 });
  }

  splat(x, z, color = 0x8aff3a, r = 0.35, life = 25) {
    const d = this.splats.find((k) => !k.active) || this.splats.reduce((a, b) => (a.life / a.max > b.life / b.max ? a : b));
    d.active = true; d.life = 0; d.max = life;
    d.mesh.visible = true;
    d.mesh.position.set(x, 0.017, z);
    d.mesh.rotation.y = Math.random() * 6.28;
    d.mesh.scale.set(r * 2, 1, r * 2);
    d.mesh.material.color.set(color);
    d.mesh.material.opacity = 0.85;
  }

  // straight energy beam (prism, laser, chrono, magnet, paint) drawn with the arc ribbon shader
  beam(a, b, { color = 0xffffff, width = 0.08, life = 0.2, jitter = 0 } = {}) {
    const A = new THREE.Vector3(a.x, a.y, a.z), B = new THREE.Vector3(b.x, b.y, b.z);
    return this.arcs.spawn(A, B, { color, width, life, jitter, segments: jitter > 0 ? 10 : 4, refresh: jitter > 0 ? 0.04 : 99 });
  }

  mindBeam(a, b) {
    this.beam(a, b, { color: 0xc86bff, width: 0.12, life: 0.35, jitter: 0.15 });
    this.beam(a, b, { color: 0xffffff, width: 0.04, life: 0.25, jitter: 0.05 });
    this.ring(b, 0.7, 0xc86bff, 0.5);
    for (let i = 0; i < 10; i++) this.add.emit({ x: b.x, y: b.y + 0.2, z: b.z, vx: rand(-1, 1), vy: rand(0.5, 1.5), vz: rand(-1, 1), life: 0.6, size: 0.12, size1: 0.02, color: 0xe0a0ff, alpha: 1 });
  }

  chronoFlash(p, scale = 1) {
    this.add.emit({ x: p.x, y: p.y, z: p.z, life: 0.3, size: 2.2 * scale, size1: 0.2, color: 0xffffff, color1: 0x6ac8ff, alpha: 1.5 });
    for (let i = 0; i < 16 * scale; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.add.emit({ x: p.x + Math.cos(a) * 0.4 * scale, y: p.y + rand(-0.3, 0.6), z: p.z + Math.sin(a) * 0.4 * scale, vx: -Math.sin(a) * 2, vy: rand(0, 1), vz: Math.cos(a) * 2, life: rand(0.3, 0.6), size: 0.12, size1: 0.02, color: 0xc8f0ff, color1: 0x4a9aff, alpha: 1.2, drag: 3 });
    }
    this.ring(p, 0.9 * scale, 0x8adfff, 0.4);
  }

  sonicWave(a, b) {
    const d = new THREE.Vector3().subVectors(b, a);
    for (let i = 0; i < 5; i++) {
      this.after(i * 0.06, () => {
        this.add.emit({ x: a.x, y: a.y, z: a.z, vx: d.x * 2.6, vy: d.y * 2.6, vz: d.z * 2.6, life: 0.38, size: 0.3, size1: 1.2, color: 0xb8a0ff, color1: 0x6040ff, alpha: 0.7 });
      });
    }
  }

  // expanding shockwave ring on the ground
  ring(p, radius, color = 0xffffff, dur = 0.5) {
    let w = this.waves.find((k) => !k.active);
    if (!w) {
      const mesh = new THREE.Mesh(PLANE, ringMaterial());
      mesh.renderOrder = 7;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      w = { mesh, active: false };
      this.waves.push(w);
    }
    w.active = true; w.t = 0; w.dur = dur; w.r = radius;
    w.mesh.visible = true;
    w.mesh.position.set(p.x, 0.05, p.z);
    w.mesh.scale.set(0.01, 1, 0.01);
    const u = w.mesh.material.uniforms;
    u.uColor.value.set(color);
    u.uDash.value = 0;
    u.uThick.value = 0.08;
    u.uFill.value = 0.4;
    u.uAlpha.value = 1;
  }

  // translucent glowing shell around an entity (iron curtain)
  aura(e, color, dur) {
    const r = e.isBuilding ? Math.max(e.w, e.h) * 0.7 : e.radius * 1.6 + 0.1;
    const h = e.isBuilding ? e.def.height * 0.75 : (e.def.height || 0.5) * 1.1;
    const mesh = new THREE.Mesh(this.auraGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.scale.set(r, h, r);
    mesh.renderOrder = 11;
    this.scene.add(mesh);
    this.auras.push({ e, mesh, t: dur, h });
  }

  fieldVisual(f, dt, visible) {
    if (!visible) return;
    const rate = { gas: 14, virus: 8, rad: 10, fallout: 26 }[f.type] || 6;
    f.acc = (f.acc || 0) + dt * rate;
    while (f.acc >= 1) {
      f.acc -= 1;
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * f.r;
      const x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d;
      switch (f.type) {
        case 'gas':
          this.alpha.emit({ x, y: 0.2, z, vx: rand(-0.2, 0.2), vy: rand(0.1, 0.3), vz: rand(-0.2, 0.2), life: rand(1.2, 2), size: 0.5, size1: rand(1, 1.6), color: 0xb060ff, color1: 0x6a2aa0, alpha: 0.35, drag: 0.5 });
          break;
        case 'virus':
          this.alpha.emit({ x, y: 0.25, z, vy: rand(0.1, 0.25), life: rand(1, 1.6), size: 0.35, size1: 1.0, color: 0xd8ff4a, color1: 0x7a9a20, alpha: 0.35, drag: 0.5 });
          if (Math.random() < 0.4) this.add.emit({ x, y: 0.3, z, vy: 0.3, life: 1.2, size: 0.07, color: 0xd8ff4a, alpha: 0.9 });
          break;
        case 'rad':
          this.add.emit({ x, y: 0.05, z, vy: rand(0.2, 0.5), life: rand(0.6, 1.1), size: rand(0.06, 0.12), size1: 0.02, color: 0xb6ff5a, color1: 0x2a8a10, alpha: 0.9 });
          if (Math.random() < 0.35) this.alpha.emit({ x, y: 0.05, z, life: 1.5, size: 0.6, size1: 0.9, color: 0x5adf10, alpha: 0.2 });
          break;
        case 'fallout':
          this.alpha.emit({ x, y: rand(0.1, 0.8), z, vx: rand(-0.2, 0.2), vy: rand(0.05, 0.2), vz: rand(-0.2, 0.2), life: rand(1.5, 2.5), size: 0.6, size1: 1.6, color: 0x7dff3a, color1: 0x3a5a10, alpha: 0.25, drag: 0.4 });
          break;
        default: break;
      }
    }
  }

  stormCloud(s, dt) {
    s.acc = (s.acc || 0) + dt * 24;
    while (s.acc >= 1) {
      s.acc -= 1;
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (s.r + 1);
      this.alpha.emit({ x: s.x + Math.cos(a) * d, y: rand(5.5, 7), z: s.z + Math.sin(a) * d, vx: rand(-0.6, 0.6), vz: rand(-0.6, 0.6), life: rand(1.5, 2.5), size: 1.4, size1: 2.6, color: 0x2a2a3a, color1: 0x14141e, alpha: 0.7, drag: 0.3 });
      if (Math.random() < 0.08) this.add.emit({ x: s.x + Math.cos(a) * d, y: 6, z: s.z + Math.sin(a) * d, life: 0.1, size: 3, color: 0xd8e8ff, alpha: 0.6 });
    }
  }

  nukeBlast(p, r) {
    const P = new THREE.Vector3(p.x, 0.3, p.z);
    this.add.emit({ x: P.x, y: 1, z: P.z, life: 0.5, size: r * 3, size1: r, color: 0xffffff, color1: 0xb6ff5a, alpha: 2 });
    for (let i = 0; i < 6; i++) this.after(i * 0.12, () => this.explosion(new THREE.Vector3(P.x + rand(-r, r) * 0.5, 0.4, P.z + rand(-r, r) * 0.5), 2));
    this.ring(P, r * 1.3, 0xd8ff8a, 1.2);
    this.ring(P, r * 0.8, 0xffffff, 0.7);
    // toxic mushroom column + cap
    for (let i = 0; i < 70; i++) {
      const t = Math.random();
      this.alpha.emit({ x: P.x + rand(-0.4, 0.4), y: 0.4 + t * 5, z: P.z + rand(-0.4, 0.4), vx: rand(-0.2, 0.2), vy: 0.5 + t, vz: rand(-0.2, 0.2), life: rand(3, 5), size: 0.8, size1: 2.2, color: 0x8acf4a, color1: 0x2a3a1a, alpha: 0.6, drag: 0.6 });
    }
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2, d = rand(0.5, 2.5);
      this.alpha.emit({ x: P.x + Math.cos(a) * d * 0.5, y: 5.5, z: P.z + Math.sin(a) * d * 0.5, vx: Math.cos(a) * d * 0.5, vy: rand(0.2, 0.6), vz: Math.sin(a) * d * 0.5, life: rand(4, 6), size: 1.6, size1: 3.2, color: 0xb6ff5a, color1: 0x3a4a20, alpha: 0.55, drag: 0.4 });
    }
    this.scorch(P.x, P.z, r * 1.1, 90);
    this.spores(P.clone().setY(1), 60, r, 0xd8ff4a);
  }

  spores(p, n = 8, radius = 0.6, color = 0xd9ff6a) {
    for (let i = 0; i < n; i++) {
      this.add.emit({
        x: p.x + rand(-radius, radius), y: p.y + rand(0.1, 0.7), z: p.z + rand(-radius, radius),
        vx: rand(-0.25, 0.25), vy: rand(0.1, 0.45), vz: rand(-0.25, 0.25), life: rand(1.5, 3.2), size: rand(0.06, 0.12), size1: 0.03, color, color1: 0x7fdc5a, alpha: 0.9, drag: 0.6,
      });
    }
  }

  smoke(p, color = 0x8a847c, size = 0.4, vy = 0.9, alpha = 0.45) {
    this.alpha.emit({
      x: p.x + rand(-0.05, 0.05), y: p.y, z: p.z + rand(-0.05, 0.05), vx: rand(-0.15, 0.15) + 0.25, vy: vy * rand(0.8, 1.2), vz: rand(-0.15, 0.15) + 0.1,
      life: rand(1.8, 2.8), size, size1: size * 3.2, color, color1: 0x55524e, alpha, drag: 0.4,
    });
  }

  fire(p, scale = 1) {
    this.add.emit({ x: p.x + rand(-0.1, 0.1), y: p.y, z: p.z + rand(-0.1, 0.1), vy: rand(0.8, 1.6), life: rand(0.35, 0.6), size: 0.35 * scale, size1: 0.08, color: 0xffd060, color1: 0xff3a08, alpha: 1.1 });
  }

  sparks(p, n = 6, color = 0xfff2a0) {
    for (let i = 0; i < n; i++) {
      this.add.emit({ x: p.x, y: p.y, z: p.z, vx: rand(-2.5, 2.5), vy: rand(0.5, 3.5), vz: rand(-2.5, 2.5), life: rand(0.2, 0.5), size: 0.07, size1: 0.02, color, color1: 0xff7a20, gravity: 9 });
    }
  }

  dust(p, n = 3, color = 0x7a6248) {
    for (let i = 0; i < n; i++) {
      this.alpha.emit({ x: p.x + rand(-0.2, 0.2), y: 0.08, z: p.z + rand(-0.2, 0.2), vx: rand(-0.3, 0.3), vy: rand(0.2, 0.6), vz: rand(-0.3, 0.3), life: rand(0.6, 1.1), size: 0.15, size1: 0.6, color, alpha: 0.35, drag: 1.5 });
    }
  }

  clods(p, n = 2) {
    for (let i = 0; i < n; i++) {
      this.alpha.emit({ x: p.x, y: p.y, z: p.z, vx: rand(-1.2, 1.2), vy: rand(1.5, 3), vz: rand(-1.2, 1.2), life: rand(0.4, 0.7), size: rand(0.06, 0.11), color: Math.random() < 0.2 ? 0x57f0d2 : 0x3a2618, alpha: 1, gravity: 10 });
    }
  }

  clippings(p, dir) {
    this.alpha.emit({ x: p.x, y: 0.12, z: p.z, vx: -dir.x * 0.8 + rand(-0.6, 0.6), vy: rand(0.6, 1.4), vz: -dir.z * 0.8 + rand(-0.6, 0.6), life: rand(0.4, 0.7), size: 0.06, color: 0x7fcf3a, alpha: 1, gravity: 5 });
  }

  heal(p) {
    this.add.emit({ x: p.x + rand(-0.6, 0.6), y: p.y + rand(0.2, 1), z: p.z + rand(-0.6, 0.6), vy: 0.8, life: 0.8, size: 0.14, size1: 0.05, color: 0x9dff6a, alpha: 0.9 });
  }

  arc(a, b, opts) { return this.arcs.spawn(a, b, opts); }

  // ------------------------------------------------------------------ ground decals
  setRings(list) {
    let i = 0;
    for (const r of list) {
      let ring = this.rings[i];
      if (!ring) {
        ring = new THREE.Mesh(PLANE, ringMaterial());
        ring.renderOrder = 5;
        ring.frustumCulled = false;
        this.scene.add(ring);
        this.rings.push(ring);
      }
      ring.visible = true;
      ring.position.set(r.x, 0.035, r.z);
      const s = r.r * 2;
      ring.scale.set(s, 1, s);
      const u = ring.material.uniforms;
      u.uColor.value.set(r.color);
      u.uAlpha.value = r.alpha ?? 1;
      u.uDash.value = r.dash ? 1 : 0;
      u.uThick.value = r.thick ?? 0.1;
      u.uFill.value = r.fill ?? 0;
      i++;
    }
    for (; i < this.rings.length; i++) this.rings[i].visible = false;
  }

  orderMarker(x, z, color = 0x6dff4a) {
    let m = this.markers.find((k) => !k.active);
    if (!m) {
      const mesh = new THREE.Mesh(PLANE, ringMaterial());
      mesh.renderOrder = 6;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      m = { mesh, active: false, t: 0 };
      this.markers.push(m);
    }
    m.active = true; m.t = 0;
    m.mesh.visible = true;
    m.mesh.position.set(x, 0.04, z);
    const u = m.mesh.material.uniforms;
    u.uColor.value.set(color);
    u.uDash.value = 0;
    u.uThick.value = 0.18;
  }

  scorch(x, z, r = 1, life = 30) {
    const d = this.decals.find((k) => !k.active) || this.decals.reduce((a, b) => (a.life / a.max > b.life / b.max ? a : b));
    d.active = true; d.life = 0; d.max = life;
    d.mesh.visible = true;
    d.mesh.position.set(x, 0.015 + Math.random() * 0.005, z);
    d.mesh.rotation.y = Math.random() * 6.28;
    d.mesh.scale.set(r * 2, 1, r * 2);
    d.mesh.material.opacity = 1;
  }

  seed() {
    let s = this.seedPool.find((k) => !k.visible);
    if (!s) {
      s = this.seedTpl.clone();
      this.scene.add(s);
      this.seedPool.push(s);
    }
    s.visible = true;
    return s;
  }

  addRubble(x, z, w, h) {
    const key = w + 'x' + h;
    let tpl = this.rubbleTpl.get(key);
    if (!tpl) {
      const m = commonMats();
      const b = new PartBuilder();
      const n = 5 + w * h * 2;
      for (let i = 0; i < n; i++) {
        const mat = [m.concrete, m.concreteDark, m.rust, m.darkSteel, m.soil][i % 5];
        b.dodeca(mat, rand(0.12, 0.3), rand(-w / 2, w / 2) * 0.8, 0.05, rand(-h / 2, h / 2) * 0.8, 1, rand(0.4, 0.8), 1, rand(0, 3), rand(0, 3), 0);
      }
      for (let i = 0; i < w + 1; i++) b.strut(m.rust, [rand(-w / 2, w / 2) * 0.7, 0.05, rand(-h / 2, h / 2) * 0.7], [rand(-w / 2, w / 2) * 0.7, rand(0.3, 0.8), rand(-h / 2, h / 2) * 0.7], 0.03, 4);
      b.leaf(m.leafLight, 0.5, 0.25, 3, -1, 0, 0.05, 0, rand(0, 6), -0.7);
      tpl = b.build();
      this.rubbleTpl.set(key, tpl);
    }
    const r = tpl.clone();
    r.position.set(x, 0, z);
    r.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;
    this.scene.add(r);
    this.rubble.push({ obj: r, t: 0 });
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); }
    }
    this.add.update(dt);
    this.alpha.update(dt);
    this.arcs.update(dt);
    for (const m of this.markers) {
      if (!m.active) continue;
      m.t += dt;
      const k = m.t / 0.55;
      if (k >= 1) { m.active = false; m.mesh.visible = false; continue; }
      const s = 1.4 * (1 - k) + 0.3;
      m.mesh.scale.set(s, 1, s);
      m.mesh.material.uniforms.uAlpha.value = 1 - k * k;
    }
    for (const d of this.decals) {
      if (!d.active) continue;
      d.life += dt;
      if (d.life >= d.max) { d.active = false; d.mesh.visible = false; continue; }
      d.mesh.material.opacity = Math.min(1, (d.max - d.life) / 5);
    }
    for (const d of this.splats) {
      if (!d.active) continue;
      d.life += dt;
      if (d.life >= d.max) { d.active = false; d.mesh.visible = false; continue; }
      d.mesh.material.opacity = 0.85 * Math.min(1, (d.max - d.life) / 5);
    }
    for (const w of this.waves) {
      if (!w.active) continue;
      w.t += dt;
      const k = w.t / w.dur;
      if (k >= 1) { w.active = false; w.mesh.visible = false; continue; }
      const sc = w.r * 2 * (0.15 + 0.85 * Math.sqrt(k));
      w.mesh.scale.set(sc, 1, sc);
      w.mesh.material.uniforms.uAlpha.value = 1 - k;
    }
    for (let i = this.auras.length - 1; i >= 0; i--) {
      const a = this.auras[i];
      a.t -= dt;
      if (a.t <= 0 || !a.e.alive) { a.mesh.removeFromParent(); a.mesh.material.dispose(); this.auras.splice(i, 1); continue; }
      a.mesh.position.copy(a.e.root ? a.e.root.position : a.e.position);
      a.mesh.material.opacity = 0.18 + 0.1 * Math.sin(a.t * 6);
      a.mesh.visible = a.e.root ? a.e.root.visible : true;
    }
    for (let i = this.rubble.length - 1; i >= 0; i--) {
      const r = this.rubble[i];
      r.t += dt;
      if (r.t > 45) {
        r.obj.position.y -= dt * 0.1;
        if (r.t > 50) { this.scene.remove(r.obj); this.rubble.splice(i, 1); }
      }
    }
  }
}
