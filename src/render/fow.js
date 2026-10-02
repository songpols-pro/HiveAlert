// Shared shader uniforms + material patching.
// Every scene material is patched so it samples the fog-of-war texture in world space
// (unexplored = black shroud, explored = desaturated blue-grey, visible = full colour).
// Foliage materials additionally get a vertex "sway" for organic wind motion.
import * as THREE from 'three';
import { MAP_W, MAP_H } from '../config.js';

export const shared = {
  uFowTex: { value: null },
  uFowEnabled: { value: 1 },
  uFowSize: { value: new THREE.Vector2(MAP_W, MAP_H) },
  uTime: { value: 0 },
};

export const FOW_GLSL = /* glsl */`
uniform sampler2D uFowTex;
uniform float uFowEnabled;
uniform float uTime;
varying vec2 vFowUv;
float fowSample() {
  if (uFowEnabled < 0.5) return 1.0;
  vec2 uv = vFowUv + 0.0035 * vec2(sin(vFowUv.y * 140.0 + uTime * 0.6), cos(vFowUv.x * 120.0 - uTime * 0.5));
  float f = texture2D(uFowTex, uv).r;
  vec2 inb = step(vec2(0.0), vFowUv) * step(vFowUv, vec2(1.0));
  return f * inb.x * inb.y;
}
vec3 fowApply(vec3 c) {
  if (uFowEnabled < 0.5) return c;
  float f = fowSample();
  float explored = smoothstep(0.03, 0.42, f);
  float vis = smoothstep(0.5, 0.92, f);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 shroud = vec3(lum) * vec3(0.40, 0.46, 0.60) * explored;
  return mix(shroud, c, vis);
}
`;

export function patchMaterial(mat, opts = {}) {
  const o = { fow: true, sway: 0, ...opts };
  mat.userData.patch = o;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFowTex = shared.uFowTex;
    shader.uniforms.uFowEnabled = shared.uFowEnabled;
    shader.uniforms.uFowSize = shared.uFowSize;
    shader.uniforms.uTime = shared.uTime;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec2 vFowUv;\nuniform vec2 uFowSize;\nuniform float uTime;'
    );
    if (o.sway) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 ip = modelMatrix[3].xyz;
          #ifdef USE_INSTANCING
            ip += instanceMatrix[3].xyz;
          #endif
          float h = max(position.y, 0.0);
          float ph = uTime * 1.7 + ip.x * 0.63 + ip.z * 0.41;
          transformed.x += sin(ph) * ${o.sway.toFixed(3)} * h;
          transformed.z += cos(ph * 0.83) * ${(o.sway * 0.6).toFixed(3)} * h;
        }`
      );
    }
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 fw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fw = instanceMatrix * fw;
        #endif
        fw = modelMatrix * fw;
        vFowUv = fw.xz / uFowSize;
      }`
    );
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + FOW_GLSL);
    if (o.fow) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\n  gl_FragColor.rgb = fowApply(gl_FragColor.rgb);'
      );
    }
  };
  mat.customProgramCacheKey = () => `bc_fow${o.fow ? 1 : 0}_sway${o.sway}`;
  return mat;
}

// Clone a patched material (Material.clone() does not copy onBeforeCompile).
export function clonePatched(mat) {
  const c = mat.clone();
  return patchMaterial(c, mat.userData.patch || {});
}
