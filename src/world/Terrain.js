// Builds the instanced terrain: ground tiles (4 instanced meshes), resource beds, giant flora,
// and thousands of swaying grass tufts.
import * as THREE from 'three';
import { MAP_W, MAP_H, RES_MAX } from '../config.js';
import { makeTileTextures, commonMats } from '../render/materials.js';
import { patchMaterial } from '../render/fow.js';
import { foliageKinds, grassTuftGeometry } from '../models/foliage.js';
import { PartBuilder } from '../models/builder.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

export class Terrain {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    scene.add(this.group);
    this.buildTiles();
    this.buildResources();
    this.buildFoliage();
    this.buildGrass();
    map.dirtyRes = new Set();
  }

  buildTiles() {
    const map = this.map;
    const texs = makeTileTextures();
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < map.tiles.length; i++) counts[map.tiles[i]]++;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.tileMeshes = [];
    const tints = [[0.92, 1.08], [0.9, 1.1], [0.88, 1.08], [0.9, 1.06]];
    for (let t = 0; t < 4; t++) {
      const mat = patchMaterial(new THREE.MeshLambertMaterial({ map: texs[t] }));
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, counts[t]));
      mesh.receiveShadow = true;
      mesh.count = counts[t];
      let k = 0;
      for (let z = 0; z < MAP_H; z++) for (let x = 0; x < MAP_W; x++) {
        if (map.tiles[z * MAP_W + x] !== t) continue;
        const rot = ((x * 7 + z * 13) % 4) * (Math.PI / 2);
        _q.setFromAxisAngle(UP, t === 2 ? 0 : rot);
        _m.compose(_p.set(x + 0.5, 0, z + 0.5), _q, _s.set(1, 1, 1));
        mesh.setMatrixAt(k, _m);
        const [lo, hi] = tints[t];
        const v = lo + (((x * 928371 + z * 123457) % 1000) / 1000) * (hi - lo);
        _c.setRGB(v, v, v * 0.98);
        mesh.setColorAt(k, _c);
        k++;
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.tileMeshes.push(mesh);
    }
    // map border frame (riveted steel edging)
    const m = commonMats();
    const b = new PartBuilder();
    b.box(m.darkSteel, MAP_W + 0.6, 0.35, 0.3, MAP_W / 2, 0.05, -0.15);
    b.box(m.darkSteel, MAP_W + 0.6, 0.35, 0.3, MAP_W / 2, 0.05, MAP_H + 0.15);
    b.box(m.darkSteel, 0.3, 0.35, MAP_H, -0.15, 0.05, MAP_H / 2);
    b.box(m.darkSteel, 0.3, 0.35, MAP_H, MAP_W + 0.15, 0.05, MAP_H / 2);
    this.group.add(b.build({ castShadow: false }));
  }

  buildResources() {
    const map = this.map;
    const m = commonMats();
    const n = Math.max(1, map.resSlots.length);
    const peatGeo = new THREE.DodecahedronGeometry(0.42, 0);
    peatGeo.scale(1, 0.38, 1);
    const cb = new PartBuilder();
    cb.octa(m.crystal, 0.12, 0.12, 0.2, 0.05, 1, 2.2, 1, 0.2, 0, 0.15);
    cb.octa(m.crystal, 0.09, -0.15, 0.16, -0.1, 1, 2.0, 1, -0.2, 0.5, -0.25);
    cb.octa(m.crystal, 0.07, 0.02, 0.12, 0.22, 1, 1.8, 1, 0.3, 0, 0.2);
    const crystalGeo = cb.buildGeometries()[0].geo;
    // small sprouting moss tufts
    const sb = new PartBuilder();
    sb.leaf(m.leafLight, 0.22, 0.12, 2, -0.8, -0.12, 0.1, 0.12, 0.3, -0.9);
    sb.leaf(m.leafLight, 0.2, 0.12, 2, -0.8, 0.15, 0.1, -0.05, 2.4, -0.9);
    const sproutGeo = sb.buildGeometries()[0].geo;
    this.peat = new THREE.InstancedMesh(peatGeo, m.peat, n);
    this.crystals = new THREE.InstancedMesh(crystalGeo, m.crystal, n);
    this.sprouts = new THREE.InstancedMesh(sproutGeo, m.leafLight, n);
    for (const im of [this.peat, this.crystals, this.sprouts]) {
      im.castShadow = im !== this.sprouts;
      im.receiveShadow = true;
      im.frustumCulled = false;
      this.group.add(im);
    }
    this.resSeed = new Float32Array(n).map(() => Math.random());
    for (let s = 0; s < map.resSlots.length; s++) this.updateResourceSlot(s);
    this.flushResources();
  }

  updateResourceSlot(s) {
    const map = this.map;
    const i = map.resSlots[s];
    const x = i % MAP_W, z = (i / MAP_W) | 0;
    const amt = map.res[i] / RES_MAX;
    const seed = this.resSeed[s];
    const sc = amt <= 0 ? 0 : 0.35 + 0.75 * Math.sqrt(amt);
    _q.setFromAxisAngle(UP, seed * 6.28);
    _m.compose(_p.set(x + 0.5 + (seed - 0.5) * 0.2, 0.02, z + 0.5 + (seed - 0.5) * 0.2), _q, _s.set(sc * (0.9 + seed * 0.3), sc, sc));
    this.peat.setMatrixAt(s, _m);
    const cs = amt <= 0.15 ? 0 : sc * (0.6 + seed * 0.6);
    _q.setFromAxisAngle(UP, seed * 13.0);
    _m.compose(_p.set(x + 0.5 + (seed - 0.5) * 0.3, 0.08 * sc, z + 0.5 - (seed - 0.5) * 0.3), _q, _s.set(cs, cs, cs));
    this.crystals.setMatrixAt(s, _m);
    const ss = amt <= 0.05 ? 0 : 0.8 + seed * 0.5;
    _q.setFromAxisAngle(UP, seed * 9.0);
    _m.compose(_p.set(x + 0.3 + seed * 0.4, 0.1 * sc, z + 0.7 - seed * 0.4), _q, _s.set(ss, ss, ss));
    this.sprouts.setMatrixAt(s, _m);
  }

  flushResources() {
    this.peat.instanceMatrix.needsUpdate = true;
    this.crystals.instanceMatrix.needsUpdate = true;
    this.sprouts.instanceMatrix.needsUpdate = true;
  }

  syncResources() {
    const d = this.map.dirtyRes;
    if (!d || d.size === 0) return;
    for (const i of d) {
      const s = this.map.resSlot[i];
      if (s >= 0) this.updateResourceSlot(s);
    }
    d.clear();
    this.flushResources();
  }

  buildFoliage() {
    const kinds = foliageKinds();
    // bucket instances into spatial chunks so off-screen flora is frustum culled
    // (both in the main pass and the shadow pass)
    const CH = 18;
    const buckets = {};
    for (const f of this.map.foliage) {
      if (f.removed) continue;
      const key = `${f.kind}|${Math.floor(f.x / CH)}|${Math.floor(f.z / CH)}`;
      (buckets[key] ||= []).push(f);
    }
    this.foliageMeshes = [];
    for (const [key, list] of Object.entries(buckets)) {
      const parts = kinds[key.split('|')[0]];
      if (!parts) continue;
      for (const { mat, geo } of parts) {
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((f, k) => {
          _q.setFromAxisAngle(UP, f.rot);
          _m.compose(_p.set(f.x, 0, f.z), _q, _s.set(f.scale, f.scale, f.scale));
          im.setMatrixAt(k, _m);
        });
        im.castShadow = !mat.transparent;
        im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        this.group.add(im);
        this.foliageMeshes.push(im);
      }
    }
    // keep a list of foliage positions for ambient spore emission
    this.sporeSources = this.map.foliage.filter((f) => !f.removed && (f.kind === 'bulb' || f.kind === 'mushroom' || f.kind === 'fern'));
  }

  buildGrass() {
    const list = this.map.grass;
    const geo = grassTuftGeometry();
    const mat = commonMats().grass;
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    im.count = list.length;
    list.forEach((g, k) => {
      _q.setFromAxisAngle(UP, g.rot);
      _m.compose(_p.set(g.x, 0, g.z), _q, _s.set(g.scale, g.scale * (0.8 + (k % 5) * 0.12), g.scale));
      im.setMatrixAt(k, _m);
      const v = 0.75 + ((k * 7919) % 100) / 220;
      _c.setRGB(v * 0.95, v * 1.05, v * 0.7);
      im.setColorAt(k, _c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.receiveShadow = true;
    im.castShadow = false;
    im.frustumCulled = false;
    this.group.add(im);
    this.grassMesh = im;
  }
}
