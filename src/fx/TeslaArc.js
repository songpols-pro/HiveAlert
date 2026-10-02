// Electrical arcs rendered as camera-facing ribbons with a custom glow line shader.
// The polyline is re-jittered every few frames (midpoint displacement) for crackling motion.
import * as THREE from 'three';
import { shared, FOW_GLSL } from '../render/fow.js';

const MAX_PTS = 20;

function makeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x7fe9ff) },
      uAlpha: { value: 1 },
      uFowTex: shared.uFowTex, uFowEnabled: shared.uFowEnabled, uFowSize: shared.uFowSize, uTime: shared.uTime,
    },
    vertexShader: /* glsl */`
      uniform vec2 uFowSize;
      varying vec2 vUv;
      varying vec2 vFowUv;
      void main() {
        vUv = uv;
        vFowUv = position.xz / uFowSize;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      ${FOW_GLSL}
      uniform vec3 uColor;
      uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        float d = abs(vUv.y * 2.0 - 1.0);
        float core = pow(1.0 - d, 6.0);
        float glow = pow(1.0 - d, 1.5);
        float flicker = 0.75 + 0.25 * sin(uTime * 90.0 + vUv.x * 40.0);
        vec3 col = mix(uColor * 1.6, vec3(3.0), core);
        float a = (core * 1.5 + glow * 0.55) * uAlpha * flicker;
        a *= smoothstep(0.5, 0.9, fowSample());
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

class Arc {
  constructor(scene) {
    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(MAX_PTS * 2 * 3);
    const uv = new Float32Array(MAX_PTS * 2 * 2);
    const idx = [];
    for (let i = 0; i < MAX_PTS; i++) {
      uv[i * 4] = i / (MAX_PTS - 1); uv[i * 4 + 1] = 0;
      uv[i * 4 + 2] = i / (MAX_PTS - 1); uv[i * 4 + 3] = 1;
      if (i < MAX_PTS - 1) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    this.aPos = new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, makeMaterial());
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 15;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.pts = Array.from({ length: MAX_PTS }, () => new THREE.Vector3());
    this.active = false;
    this.a = new THREE.Vector3();
    this.b = new THREE.Vector3();
  }
}

const _t = new THREE.Vector3(), _side = new THREE.Vector3(), _perp = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

export class ArcPool {
  constructor(scene, size = 28) {
    this.arcs = Array.from({ length: size }, () => new Arc(scene));
    this.viewDir = new THREE.Vector3(-1, -0.8, -1).normalize();
  }

  spawn(a, b, { life = 0.32, width = 0.14, color = 0x7fe9ff, jitter = 0.4, segments = 16, refresh = 0.035 } = {}) {
    const arc = this.arcs.find((x) => !x.active) || this.arcs[0];
    arc.active = true;
    arc.a.copy(a); arc.b.copy(b);
    arc.life = 0; arc.maxLife = life; arc.width = width; arc.jitter = jitter;
    arc.segments = Math.min(MAX_PTS - 1, segments);
    arc.refresh = refresh; arc.timer = 0;
    arc.mesh.material.uniforms.uColor.value.set(color);
    arc.mesh.visible = true;
    this.regen(arc);
    return arc;
  }

  regen(arc) {
    const n = arc.segments;
    _t.subVectors(arc.b, arc.a);
    const len = _t.length();
    _perp.crossVectors(_t, _up).normalize();
    if (_perp.lengthSq() < 0.01) _perp.set(1, 0, 0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const env = Math.sin(Math.PI * t);
      const p = arc.pts[i].copy(arc.a).addScaledVector(_t, t);
      if (i > 0 && i < n) {
        p.addScaledVector(_perp, (Math.random() - 0.5) * arc.jitter * env * Math.min(1.5, len * 0.25 + 0.4));
        p.y += (Math.random() - 0.5) * arc.jitter * env * 0.8;
      }
    }
    // pad remaining points onto the endpoint
    for (let i = n + 1; i < MAX_PTS; i++) arc.pts[i].copy(arc.b);
    const P = arc.posArr;
    for (let i = 0; i < MAX_PTS; i++) {
      const prev = arc.pts[Math.max(0, i - 1)], next = arc.pts[Math.min(MAX_PTS - 1, i + 1)];
      _t.subVectors(next, prev);
      if (_t.lengthSq() < 1e-6) _t.subVectors(arc.b, arc.a);
      _side.crossVectors(_t, this.viewDir).normalize().multiplyScalar(arc.width * 0.5);
      const p = arc.pts[i];
      P[i * 6] = p.x - _side.x; P[i * 6 + 1] = p.y - _side.y; P[i * 6 + 2] = p.z - _side.z;
      P[i * 6 + 3] = p.x + _side.x; P[i * 6 + 4] = p.y + _side.y; P[i * 6 + 5] = p.z + _side.z;
    }
    arc.aPos.needsUpdate = true;
  }

  update(dt) {
    for (const arc of this.arcs) {
      if (!arc.active) continue;
      arc.life += dt;
      if (arc.life >= arc.maxLife) { arc.active = false; arc.mesh.visible = false; continue; }
      arc.timer += dt;
      if (arc.timer >= arc.refresh) { arc.timer = 0; this.regen(arc); }
      const t = arc.life / arc.maxLife;
      arc.mesh.material.uniforms.uAlpha.value = (1 - t) * (0.6 + Math.random() * 0.4);
    }
  }
}
