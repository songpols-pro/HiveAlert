// Model gallery (gallery.html): lays out every model of a faction on an isometric stage with
// labels, animation states (idle / walk / fire / deploy) and team-colour switching.
// URL params: ?f=allied|soviet|yuri|common&team=0|1&anim=walk|fire|deploy|idle&cat=structures|units
import * as THREE from 'three';
import { Renderer } from './render/Renderer.js';
import { RTSCamera } from './camera/RTSCamera.js';
import { shared } from './render/fow.js';
import { BUILDINGS, UNITS } from './data/index.js';
import { REGISTRY, createModel } from './models/index.js';
import { animateRig } from './models/animate.js';

const params = new URLSearchParams(location.search);
const state = {
  f: params.get('f') || 'allied',
  team: Number(params.get('team') || 0),
  anim: params.get('anim') || 'walk',
  cat: params.get('cat') || 'all',
};

shared.uFowEnabled.value = 0;
const view = document.getElementById('view');
const renderer = new Renderer(view);
const cam = new RTSCamera();
renderer.initComposer(cam.camera);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x3d5a32, roughness: 1 })
);
ground.receiveShadow = true;
renderer.scene.add(ground);
const grid = new THREE.GridHelper(200, 200, 0x2a3a24, 0x2a3a24);
grid.position.y = 0.005;
renderer.scene.add(grid);

let items = [];
const labels = document.getElementById('labels');

function kindsFor(f) {
  if (f === 'common') return Object.keys(REGISTRY).filter((k) => !BUILDINGS[k] && !UNITS[k]);
  const all = [...Object.values(BUILDINGS), ...Object.values(UNITS)].filter((d) => d.faction === f);
  return all
    .filter((d) => state.cat === 'all' || (state.cat === 'structures' ? d.isBuilding : d.isUnit))
    .map((d) => d.key);
}

function layout() {
  for (const it of items) it.root.removeFromParent();
  items = [];
  labels.innerHTML = '';
  const kinds = kindsFor(state.f);
  let x = 0, z = 0, rowDepth = 0;
  const maxRow = 22;
  for (const kind of kinds) {
    const d = BUILDINGS[kind] || UNITS[kind];
    const w = d ? (d.isBuilding ? d.w + 0.8 : Math.max(1.4, d.radius * 3.2)) : 2.5;
    const dep = d ? (d.isBuilding ? d.h + 1.6 : 1.8) : 2.5;
    if (x + w > maxRow) { x = 0; z += rowDepth; rowDepth = 0; }
    const { root, rig, parts } = createModel(kind, state.team);
    root.position.set(x + w / 2, d && d.flyHeight ? d.flyHeight : 0, z + dep / 2);
    renderer.scene.add(root);
    const el = document.createElement('div');
    el.className = 'lbl';
    el.innerHTML = `<b>${d ? d.name : kind}</b><br><i>${kind}${REGISTRY[kind] ? '' : ' (placeholder)'}</i>`;
    labels.appendChild(el);
    items.push({ kind, root, rig, parts, d, el, h: d ? (d.isBuilding ? d.height : d.height + (d.flyHeight || 0)) : 1 });
    x += w;
    rowDepth = Math.max(rowDepth, dep);
  }
  const cx = maxRow / 2, cz = (z + rowDepth) / 2;
  cam.centerOn(cx, cz);
  cam.zoom = cam.zoomGoal = Math.min(2.2, 26 / Math.max(10, z + rowDepth + 6));
  cam.updateProjection();
}

function buildBar() {
  const bar = document.getElementById('bar');
  bar.innerHTML = '';
  const group = (vals, key) => vals.forEach((v) => {
    const b = document.createElement('button');
    b.textContent = String(v);
    b.className = String(state[key]) === String(v) ? 'on' : '';
    b.onclick = () => { state[key] = typeof state[key] === 'number' ? Number(v) : v; buildBar(); layout(); };
    bar.appendChild(b);
  });
  group(['allied', 'soviet', 'yuri', 'common'], 'f');
  group(['all', 'structures', 'units'], 'cat');
  group([0, 1], 'team');
  group(['idle', 'walk', 'fire', 'deploy'], 'anim');
}

function resize() {
  const { w, h } = renderer.resize();
  cam.setAspect(w, h);
}
window.addEventListener('resize', resize);
view.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoomBy(e.deltaY > 0 ? 1 / 1.12 : 1.12); }, { passive: false });
let drag = null;
view.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY }; });
window.addEventListener('mouseup', () => { drag = null; });
window.addEventListener('mousemove', (e) => {
  if (!drag) return;
  cam.pan(-(e.clientX - drag.x) * cam.unitsPerPixel, (e.clientY - drag.y) * cam.unitsPerPixel);
  drag = { x: e.clientX, y: e.clientY };
});

buildBar();
resize();
layout();

const _v = new THREE.Vector3();
const _p = { x: 0, y: 0, visible: true };
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  cam.update(dt);
  renderer.setShadowExtent(cam.halfViewWidth * 1.4 + 6);
  renderer.followShadow(cam.target);
  for (const it of items) {
    const s = {
      t, moving: state.anim === 'walk', speed: 2, firing: state.anim === 'fire' ? Math.max(0, Math.sin(t * 3)) : 0,
      deployed: state.anim === 'deploy' ? 0.5 + 0.5 * Math.sin(t * 1.2) : 0, aim: state.anim === 'deploy' || state.anim === 'fire' ? 0.5 + 0.5 * Math.sin(t) : 0,
      doorOpen: state.anim === 'deploy' ? 0.5 + 0.5 * Math.sin(t) : 0, powered: true, flapping: state.anim === 'walk' || !!(it.d && it.d.loco === 'hover'),
      hover: !!(it.d && it.d.loco === 'hover'),
    };
    animateRig(it.rig, s, dt);
    if (it.parts.turret && state.anim !== 'idle') it.parts.turret.rotation.y = Math.sin(t * 0.7) * 1.2;
    cam.project(_v.copy(it.root.position).setY(-0.1), _p);
    it.el.style.left = _p.x + 'px';
    it.el.style.top = _p.y + 6 + 'px';
  }
  renderer.render(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__gallery = { state, items, cam, renderer };
