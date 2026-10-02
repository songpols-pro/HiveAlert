// Oversized alien botany used as map obstacles/decoration (rendered with InstancedMesh).
import * as THREE from 'three';
import { PartBuilder } from './builder.js';
import { commonMats } from '../render/materials.js';

export function foliageKinds() {
  const m = commonMats();
  const kinds = {};

  // Giant spotted mushroom
  let b = new PartBuilder();
  b.cyl(m.mushroomStem, 0.16, 0.24, 1.3, 8, 0, 0.65, 0);
  b.cyl(m.mushroomStem, 0.3, 0.3, 0.05, 8, 0, 1.0, 0);
  b.sphere(m.mushroomCap, 0.72, 12, 6, 0, 1.3, 0, 1, 0.55, 1);
  b.cyl(m.seedHead, 0.66, 0.66, 0.04, 12, 0, 1.27, 0);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39, r = 0.25 + (i % 3) * 0.14;
    b.sphere(m.mushroomSpot, 0.09, 6, 4, Math.cos(a) * r, 1.3 + Math.sqrt(Math.max(0, 0.72 * 0.72 - r * r)) * 0.55, Math.sin(a) * r, 1, 0.35, 1);
  }
  b.cyl(m.mushroomStem, 0.06, 0.08, 0.4, 6, 0.55, 0.2, 0.25);
  b.sphere(m.mushroomCap, 0.18, 8, 4, 0.55, 0.4, 0.25, 1, 0.55, 1);
  b.cyl(m.mushroomStem, 0.05, 0.06, 0.28, 6, -0.45, 0.14, 0.4);
  b.sphere(m.mushroomCap, 0.13, 8, 4, -0.45, 0.28, 0.4, 1, 0.55, 1);
  kinds.mushroom = b.buildGeometries();

  // Fern cluster
  b = new PartBuilder();
  for (let i = 0; i < 9; i++) {
    const yaw = i * 0.7 + (i % 2) * 0.2;
    b.leaf(i % 3 ? m.fern : m.fernLight, 1.1 + (i % 3) * 0.2, 0.42, 6, -1.3, 0, 0.05, 0, yaw, -0.9 - (i % 2) * 0.3);
  }
  b.cyl(m.stalk, 0.07, 0.1, 0.4, 6, 0, 0.2, 0);
  kinds.fern = b.buildGeometries();

  // Bioluminescent bulb flower
  b = new PartBuilder();
  b.strut(m.stalk, [0, 0, 0], [0.12, 0.9, 0.05], 0.07, 6);
  b.strut(m.stalk, [0.12, 0.9, 0.05], [0.05, 1.8, -0.05], 0.055, 6);
  b.strut(m.stalk, [0.05, 1.8, -0.05], [-0.15, 2.3, 0.05], 0.045, 6);
  b.sphere(m.bulb, 0.3, 10, 8, -0.2, 2.45, 0.06, 1, 1.25, 1);
  b.cone(m.monstera, 0.22, 0.35, 5, -0.2, 2.2, 0.06, Math.PI, 0, 0);
  for (let i = 0; i < 4; i++) b.leaf(m.monstera, 0.8, 0.45, 5, -1.0, 0, 0.1, 0, i * 1.57 + 0.4, -0.8);
  b.strut(m.stalk, [0.1, 0, 0.1], [0.4, 0.9, 0.3], 0.04, 5);
  b.sphere(m.bulb, 0.14, 8, 6, 0.42, 0.98, 0.32);
  kinds.bulb = b.buildGeometries();

  // Monstera giant leaves
  b = new PartBuilder();
  for (let i = 0; i < 6; i++) {
    const yaw = i * 1.05;
    b.strut(m.stalk, [0, 0, 0], [Math.sin(yaw) * 0.35, 0.8 + (i % 2) * 0.3, Math.cos(yaw) * 0.35], 0.035, 4);
    b.leaf(i % 2 ? m.monstera : m.fern, 1.0, 0.9, 5, -1.5, Math.sin(yaw) * 0.35, 0.8 + (i % 2) * 0.3, Math.cos(yaw) * 0.35, yaw, -0.4);
  }
  kinds.monstera = b.buildGeometries();

  // Giant sunflower
  b = new PartBuilder();
  b.strut(m.stalk, [0, 0, 0], [0.05, 2.4, 0.1], 0.08, 6);
  b.leaf(m.leaf, 0.6, 0.4, 4, -0.8, 0.03, 0.8, 0.03, 0.5, -0.6);
  b.leaf(m.leaf, 0.6, 0.4, 4, -0.8, 0.04, 1.4, 0.05, 3.6, -0.6);
  const petals = 16;
  b.add(m.seedHead, new THREE.CylinderGeometry(0.38, 0.34, 0.1, 14), [0.05, 2.5, 0.2], [1.0, 0, 0]);
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const geo = new THREE.ConeGeometry(0.1, 0.36, 4);
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, -Math.PI / 2));
    mat.compose(new THREE.Vector3(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55), q, new THREE.Vector3(0.35, 1, 1));
    const tilt = new THREE.Matrix4().makeRotationX(1.0);
    tilt.premultiply(new THREE.Matrix4().makeTranslation(0.05, 2.5, 0.2));
    b.addMatrix(m.petal, geo, tilt.multiply(mat));
  }
  kinds.sunflower = b.buildGeometries();

  // Mossy boulder / concrete rubble
  b = new PartBuilder();
  b.dodeca(m.rock, 0.55, 0, 0.3, 0, 1.2, 0.75, 1, 0.3, 0.5, 0);
  b.dodeca(m.rockMoss, 0.42, 0.05, 0.52, 0.02, 1.1, 0.4, 1.0, 0.3, 0.5, 0);
  b.dodeca(m.rock, 0.3, 0.55, 0.18, 0.35, 1, 0.8, 1, 1, 0.2, 0.4);
  kinds.rock = b.buildGeometries();

  b = new PartBuilder();
  b.box(m.concrete, 0.9, 0.5, 0.35, 0, 0.25, 0, 0, 0.1, 0.05);
  b.box(m.concreteDark, 0.5, 0.3, 0.3, 0.45, 0.15, 0.35, 0, 0.6, 0.15);
  b.strut(m.rust, [-0.2, 0.4, 0], [-0.25, 0.9, 0.1], 0.025, 4);
  b.strut(m.rust, [0.1, 0.4, 0], [0.18, 0.8, -0.05], 0.025, 4);
  b.leaf(m.fernLight, 0.5, 0.25, 4, -1.2, -0.3, 0.05, 0.3, 2.2, -0.8);
  b.leaf(m.fern, 0.45, 0.25, 4, -1.2, 0.3, 0.05, -0.25, 0.6, -0.8);
  kinds.ruin = b.buildGeometries();

  return kinds;
}

export function grassTuftGeometry() {
  const pos = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + Math.random() * 0.3;
    const lean = 0.06 + Math.random() * 0.06;
    const h = 0.22 + Math.random() * 0.16;
    const w = 0.035;
    const cx = Math.cos(a), cz = Math.sin(a);
    const ox = (Math.random() - 0.5) * 0.12, oz = (Math.random() - 0.5) * 0.12;
    pos.push(ox - cx * w, 0, oz - cz * w, ox + cx * w, 0, oz + cz * w, ox + cz * lean, h, oz - cx * lean);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // point normals up for soft, uniform lighting on blades
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}
