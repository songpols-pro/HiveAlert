// PartBuilder: accumulates primitive geometries per material and merges them so a
// complex low-poly model renders with one draw call per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function normalizeGeo(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  }
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  g.clearGroups();
  return g;
}

export class PartBuilder {
  constructor() { this.parts = new Map(); }

  add(mat, geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    const g = normalizeGeo(geo);
    geo.dispose();
    _e.set(rot[0], rot[1], rot[2]);
    _q.setFromEuler(_e);
    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _s.set(scale[0], scale[1], scale[2]));
    g.applyMatrix4(_m);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }

  addMatrix(mat, geo, matrix) {
    const g = normalizeGeo(geo);
    geo.dispose();
    g.applyMatrix4(matrix);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }

  box(mat, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new THREE.BoxGeometry(w, h, d), [x, y, z], [rx, ry, rz]);
  }
  cyl(mat, rt, rb, h, seg, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, open = false) {
    return this.add(mat, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), [x, y, z], [rx, ry, rz]);
  }
  cone(mat, r, h, seg, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new THREE.ConeGeometry(r, h, seg), [x, y, z], [rx, ry, rz]);
  }
  sphere(mat, r, ws, hs, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new THREE.SphereGeometry(r, ws, hs), [x, y, z], [rx, ry, rz], [sx, sy, sz]);
  }
  ico(mat, r, detail, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new THREE.IcosahedronGeometry(r, detail), [x, y, z], [rx, ry, rz], [sx, sy, sz]);
  }
  dodeca(mat, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new THREE.DodecahedronGeometry(r, 0), [x, y, z], [rx, ry, rz], [sx, sy, sz]);
  }
  octa(mat, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new THREE.OctahedronGeometry(r, 0), [x, y, z], [rx, ry, rz], [sx, sy, sz]);
  }
  torus(mat, r, tube, rs, ts, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2) {
    return this.add(mat, new THREE.TorusGeometry(r, tube, rs, ts, arc), [x, y, z], [rx, ry, rz]);
  }
  // A cylinder stretched between two points (struts, pipes, legs).
  strut(mat, a, b, r, seg = 5) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const dir = B.clone().sub(A);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
    _q.setFromUnitVectors(UP, dir.normalize());
    _m.compose(A.add(B).multiplyScalar(0.5), _q, _s.set(1, 1, 1));
    return this.addMatrix(mat, geo, _m);
  }
  // A tapered cylinder between two points (r0 at a, r1 at b): legs, tails, horns, tendrils.
  taper(mat, a, b, r0, r1, seg = 6) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const dir = B.clone().sub(A);
    const len = dir.length();
    if (len < 1e-5) return this;
    const geo = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false); // top = b, bottom = a
    _q.setFromUnitVectors(UP, dir.normalize());
    _m.compose(A.add(B).multiplyScalar(0.5), _q, _s.set(1, 1, 1));
    return this.addMatrix(mat, geo, _m);
  }
  // Upper half of an ellipsoid (carapace shells, domes). Flat side down at y.
  dome(mat, rx, ry, rz, x = 0, y = 0, z = 0, seg = 10, rotX = 0, rotY = 0, rotZ = 0) {
    const geo = new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg / 2)), 0, Math.PI * 2, 0, Math.PI / 2);
    return this.add(mat, geo, [x, y, z], [rotX, rotY, rotZ], [rx, ry, rz]);
  }
  // Ellipsoid (body segments, eyes, sacs).
  ellipsoid(mat, rx, ry, rz, x = 0, y = 0, z = 0, seg = 8, rotX = 0, rotY = 0, rotZ = 0) {
    return this.add(mat, new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg * 0.65))), [x, y, z], [rotX, rotY, rotZ], [rx, ry, rz]);
  }
  // Flat double-sided polygon from a list of [x,y,z] points (fan from the first point): wings, sails, membranes.
  polygon(mat, pts) {
    const pos = [];
    for (let i = 1; i < pts.length - 1; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return this.add(mat, geo);
  }
  // A leaf/blade quad bent along a curve (for ferns & foliage).
  leaf(mat, len, width, segs, curl, x, y, z, yaw, pitch, roll = 0) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const w = width * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)) * 0.5;
      const ang = curl * t * t;
      const py = Math.sin(ang) * len * t * 0.6;
      const pz = len * t;
      pos.push(-w, py, pz, w, py, pz);
      uv.push(0, t, 1, t);
      if (i < segs) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // pitch first, then yaw around the vertical axis
    _e.set(pitch, yaw, roll, 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_v.set(x, y, z), _q, _s.set(1, 1, 1));
    const n = pos.length;
    this.lastTip = new THREE.Vector3(0, pos[n - 2], pos[n - 1]).applyMatrix4(_m);
    return this.addMatrix(mat, geo, _m.clone());
  }

  // Merge into a Group of meshes (one per material).
  build({ castShadow = true, receiveShadow = true, name = '' } = {}) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, geos] of this.parts) {
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      for (const g of geos) if (g !== merged) g.dispose();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow && !mat.transparent;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }

  // Merge into one geometry per material (used for instanced foliage).
  buildGeometries() {
    const out = [];
    for (const [mat, geos] of this.parts) {
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      merged.computeBoundingSphere();
      out.push({ mat, geo: merged });
    }
    this.parts.clear();
    return out;
  }
}

// Create a named pivot node holding a built part.
export function pivot(name, builder, x = 0, y = 0, z = 0, opts) {
  const node = new THREE.Group();
  node.name = name;
  node.position.set(x, y, z);
  if (builder) node.add(builder.build(opts));
  return node;
}

export function marker(name, x, y, z) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  return o;
}
