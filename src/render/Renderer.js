// WebGL renderer, scene, 90s pre-rendered style lighting (hard warm sun + blue tinted ambient),
// and the post chain: RenderPass -> OutputPass (ACES) -> Retro (pixelate/dither/CRT).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RetroShader } from './RetroShader.js';
import { shared } from './fow.js';

export class Renderer {
  constructor(container) {
    this.container = container;
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.localClippingEnabled = true;
    container.appendChild(r.domElement);
    r.domElement.id = 'gl';
    this.gl = r;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    this.scene = scene;

    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    pmrem.dispose();

    // Lighting: strong midday key light + blue-tinted sky/ground fill for deep tinted shadows
    this.hemi = new THREE.HemisphereLight(0x8fb4ff, 0x3a2c22, 1.05);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff0d0, 3.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    const sc = sun.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 120;
    this.sunOffset = new THREE.Vector3(-18, 34, 10);
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;
    const rim = new THREE.DirectionalLight(0x6a8cff, 0.5);
    rim.position.set(30, 20, -30);
    scene.add(rim);

    this.retro = { pixelate: false, pixelSize: 3, dither: false, crt: false };
  }

  initComposer(camera) {
    this.camera = camera;
    const size = this.gl.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(this.gl, rt);
    composer.addPass(new RenderPass(this.scene, camera));
    composer.addPass(new OutputPass());
    this.retroPass = new ShaderPass(RetroShader);
    composer.addPass(this.retroPass);
    this.composer = composer;
    this.resize();
  }

  setRetro(opts) {
    Object.assign(this.retro, opts);
  }

  setShadowExtent(e) {
    e = Math.ceil(e / 4) * 4;
    if (e === this.shadowExtent) return;
    this.shadowExtent = e;
    const sc = this.sun.shadow.camera;
    sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e;
    sc.updateProjectionMatrix();
  }

  followShadow(target) {
    // snap shadow camera to texel grid to avoid shimmering while panning
    const texel = (2 * (this.shadowExtent || 26)) / 2048;
    const tx = Math.round(target.x / texel) * texel;
    const tz = Math.round(target.z / texel) * texel;
    this.sun.target.position.set(tx, 0, tz);
    this.sun.position.set(tx + this.sunOffset.x, this.sunOffset.y, tz + this.sunOffset.z);
    this.sun.target.updateMatrixWorld();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.gl.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
      const pr = this.gl.getPixelRatio();
      this.retroPass.uniforms.uResolution.value = [w * pr, h * pr];
    }
    return { w, h };
  }

  render(time) {
    const u = this.retroPass.uniforms;
    const pr = this.gl.getPixelRatio();
    u.uPixelate.value = this.retro.pixelate ? 1 : 0;
    u.uPixelSize.value = this.retro.pixelSize * pr;
    u.uDither.value = this.retro.dither ? 1 : 0;
    u.uCRT.value = this.retro.crt ? 1 : 0;
    u.uTime.value = time;
    shared.uTime.value = time;
    this.composer.render();
  }
}
