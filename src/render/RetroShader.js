// Late-90s PC nostalgia pass: pixelation, ordered (Bayer) dithering with colour quantisation,
// CRT scanlines with slight RGB mask, barrel vignette. Runs after OutputPass (display space).
export const RetroShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: [1, 1] },
    uPixelSize: { value: 1 },
    uPixelate: { value: 0 },
    uDither: { value: 0 },
    uLevels: { value: 24 },
    uCRT: { value: 0 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uPixelSize, uPixelate, uDither, uLevels, uCRT, uTime;
    varying vec2 vUv;

    float bayer4(vec2 p) {
      int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
      int i = x + y * 4;
      float m[16];
      m[0]=0.0; m[1]=8.0; m[2]=2.0; m[3]=10.0; m[4]=12.0; m[5]=4.0; m[6]=14.0; m[7]=6.0;
      m[8]=3.0; m[9]=11.0; m[10]=1.0; m[11]=9.0; m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
      for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0 - 0.5;
      return 0.0;
    }

    vec2 barrel(vec2 uv, float k) {
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      return 0.5 + c * (1.0 + k * r2);
    }

    void main() {
      vec2 uv = vUv;
      if (uCRT > 0.5) uv = barrel(uv, 0.06);
      vec2 px = uv * uResolution;
      float ps = max(1.0, uPixelSize);
      vec2 cell = floor(px / ps);
      if (uPixelate > 0.5) uv = (cell * ps + ps * 0.5) / uResolution;
      vec3 col = texture2D(tDiffuse, uv).rgb;

      if (uCRT > 0.5) {
        // slight chromatic offset
        float off = 0.9 / uResolution.x;
        col.r = texture2D(tDiffuse, uv + vec2(off, 0.0)).r;
        col.b = texture2D(tDiffuse, uv - vec2(off, 0.0)).b;
      }

      if (uDither > 0.5) {
        vec2 dp = uPixelate > 0.5 ? cell : floor(px / 2.0);
        float d = bayer4(dp);
        col = floor(col * uLevels + 0.5 + d) / uLevels;
      }

      if (uCRT > 0.5) {
        float line = sin(gl_FragCoord.y * 3.14159 * 0.5) * 0.5 + 0.5;
        col *= mix(1.0, 0.72 + 0.28 * line, 0.85);
        float mask = mod(gl_FragCoord.x, 3.0);
        vec3 rgbMask = mask < 1.0 ? vec3(1.08, 0.94, 0.94) : mask < 2.0 ? vec3(0.94, 1.08, 0.94) : vec3(0.94, 0.94, 1.08);
        col *= rgbMask;
        vec2 vc = vUv - 0.5;
        col *= 1.0 - dot(vc, vc) * 0.9;
        col *= 0.98 + 0.02 * sin(uTime * 60.0);
        col *= 1.12;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
