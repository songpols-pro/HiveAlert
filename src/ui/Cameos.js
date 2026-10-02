// Renders real 3D cameo thumbnails of every buildable for the sidebar (one-off offscreen renderer).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createModel } from '../models/index.js';
import { shared } from '../render/fow.js';

export function renderCameos(kinds, team = 0) {
  const W = 128, H = 96;
  const out = {};
  let r;
  try {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) {
    return out;
  }
  r.setPixelRatio(1);
  r.setSize(W, H);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(r);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x3a2c22, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0d0, 3.2);
  sun.position.set(-6, 12, 8);
  scene.add(sun);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const dir = new THREE.Vector3(1, 0.82, 1).normalize();
  const prev = shared.uFowEnabled.value;
  shared.uFowEnabled.value = 0;
  for (const kind of kinds) {
    const { root } = createModel(kind, team);
    root.rotation.y = -0.35;
    scene.add(root);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const half = Math.max(s.x, s.y * 1.1, s.z) * 0.62;
    cam.left = -half * (W / H); cam.right = half * (W / H); cam.top = half; cam.bottom = -half;
    cam.updateProjectionMatrix();
    cam.position.copy(c).addScaledVector(dir, 30);
    cam.lookAt(c);
    r.render(scene, cam);
    out[kind] = r.domElement.toDataURL('image/png');
    scene.remove(root);
  }
  shared.uFowEnabled.value = prev;
  pmrem.dispose();
  r.dispose();
  r.forceContextLoss();
  return out;
}
