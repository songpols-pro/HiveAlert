// CPU-simulated, GPU-drawn point particle system (one draw call per blend mode).
// Particles respect fog of war so enemy activity inside the shroud stays hidden.
import * as THREE from 'three';
import { shared, FOW_GLSL } from '../render/fow.js';

const colorCache = new Map();
function lin(hex) {
  let c = colorCache.get(hex);
  if (!c) { const col = new THREE.Color(hex); c = [col.r, col.g, col.b]; colorCache.set(hex, c); }
  return c;
}

export const particleScale = { value: 40 };

export class ParticleSystem {
  constructor(scene, max, additive) {
    this.max = max;
    this.count = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.sz = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.size1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3);
    this.c1 = new Float32Array(max * 3);
    this.alpha = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);

    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.sz, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aColor', this.aCol);
    geo.setAttribute('aSize', this.aSize);
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uScale: particleScale,
        uFowTex: shared.uFowTex, uFowEnabled: shared.uFowEnabled, uFowSize: shared.uFowSize, uTime: shared.uTime,
      },
      vertexShader: /* glsl */`
        attribute vec4 aColor;
        attribute float aSize;
        uniform float uScale;
        uniform vec2 uFowSize;
        varying vec4 vColor;
        varying vec2 vFowUv;
        void main() {
          vColor = aColor;
          vFowUv = position.xz / uFowSize;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(1.0, aSize * uScale);
        }
      `,
      fragmentShader: /* glsl */`
        ${FOW_GLSL}
        varying vec4 vColor;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          if (r > 1.0) discard;
          float a = ${additive ? 'pow(1.0 - r, 1.6)' : 'smoothstep(1.0, 0.35, r)'};
          float vis = smoothstep(0.5, 0.9, fowSample());
          gl_FragColor = vec4(vColor.rgb, vColor.a * a * vis);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 12 : 10;
    scene.add(this.points);
  }

  emit(o) {
    if (this.count >= this.max) return;
    const i = this.count++;
    const i3 = i * 3;
    this.pos[i3] = o.x; this.pos[i3 + 1] = o.y; this.pos[i3 + 2] = o.z;
    this.vel[i3] = o.vx || 0; this.vel[i3 + 1] = o.vy || 0; this.vel[i3 + 2] = o.vz || 0;
    this.life[i] = 0;
    this.maxLife[i] = o.life || 1;
    this.size0[i] = o.size ?? 0.3;
    this.size1[i] = o.size1 ?? this.size0[i];
    const a = lin(o.color ?? 0xffffff), b = lin(o.color1 ?? o.color ?? 0xffffff);
    this.c0[i3] = a[0]; this.c0[i3 + 1] = a[1]; this.c0[i3 + 2] = a[2];
    this.c1[i3] = b[0]; this.c1[i3 + 1] = b[1]; this.c1[i3 + 2] = b[2];
    this.alpha[i] = o.alpha ?? 1;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.write(i, 0);
  }

  write(i, t) {
    const i3 = i * 3, i4 = i * 4;
    this.col[i4] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * t;
    this.col[i4 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * t;
    this.col[i4 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * t;
    this.col[i4 + 3] = this.alpha[i] * Math.min(1, t * 10) * (1 - t);
    this.sz[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
  }

  copy(dst, src) {
    const s3 = src * 3, d3 = dst * 3;
    for (let k = 0; k < 3; k++) {
      this.pos[d3 + k] = this.pos[s3 + k]; this.vel[d3 + k] = this.vel[s3 + k];
      this.c0[d3 + k] = this.c0[s3 + k]; this.c1[d3 + k] = this.c1[s3 + k];
    }
    this.life[dst] = this.life[src]; this.maxLife[dst] = this.maxLife[src];
    this.size0[dst] = this.size0[src]; this.size1[dst] = this.size1[src];
    this.alpha[dst] = this.alpha[src]; this.grav[dst] = this.grav[src]; this.drag[dst] = this.drag[src];
  }

  update(dt) {
    let i = 0;
    while (i < this.count) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        this.count--;
        if (i !== this.count) this.copy(i, this.count);
        continue;
      }
      const i3 = i * 3;
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= dr; this.vel[i3 + 2] *= dr;
      this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.02 && this.grav[i] > 0) { this.pos[i3 + 1] = 0.02; this.vel[i3 + 1] *= -0.3; this.vel[i3] *= 0.6; this.vel[i3 + 2] *= 0.6; }
      this.write(i, this.life[i] / this.maxLife[i]);
      i++;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, this.count);
    if (this.count > 0) {
      this.aPos.clearUpdateRanges(); this.aPos.addUpdateRange(0, this.count * 3); this.aPos.needsUpdate = true;
      this.aCol.clearUpdateRanges(); this.aCol.addUpdateRange(0, this.count * 4); this.aCol.needsUpdate = true;
      this.aSize.clearUpdateRanges(); this.aSize.addUpdateRange(0, this.count); this.aSize.needsUpdate = true;
    }
  }
}
