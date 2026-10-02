// Model baking: converts an authored model (many meshes under named pivot Groups) into a few
// SkinnedMeshes — one per *shading class* — whose bones mirror the named pivots.
//
//   • every NAMED node becomes a Bone (same name & transform), so rigs/parts keep working;
//     unnamed groups are flattened into their nearest named ancestor
//   • opaque materials are folded into shared vertex-coloured class materials
//     (glossy / matte / emissive, single- or double-sided); transparent materials stay separate
//
// Result: ~3–5 draw calls per entity no matter how many limbs/materials a model uses.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMaterial } from '../render/fow.js';

const classMats = new Map();
function classMaterial(cls, side) {
  const key = cls + side;
  if (classMats.has(key)) return classMats.get(key);
  let m;
  if (cls === 'emissive') {
    m = new THREE.MeshBasicMaterial({ vertexColors: true, side });
  } else if (cls === 'glossy') {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.3, flatShading: true, envMapIntensity: 1.5, side });
  } else {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.82, flatShading: true, side });
  }
  patchMaterial(m);
  m.userData.baked = cls;
  classMats.set(key, m);
  return m;
}

const _c = new THREE.Color();
function classify(mat) {
  if (mat.transparent) return null;
  if (mat.isMeshBasicMaterial) return { cls: 'emissive', color: mat.color.clone() };
  const e = mat.emissive ? mat.emissive.r + mat.emissive.g + mat.emissive.b : 0;
  const ei = mat.emissiveIntensity ?? 1;
  if (e * ei > 0.9) {
    // glowing organs: bake emissive (HDR > 1 so bloom/tonemapping makes it glow)
    _c.copy(mat.emissive).multiplyScalar(ei * 0.75).add(mat.color.clone().multiplyScalar(0.25));
    return { cls: 'emissive', color: _c.clone() };
  }
  const col = mat.color.clone();
  if (e > 0) col.add(mat.emissive.clone().multiplyScalar(ei * 0.5));
  return { cls: (mat.metalness ?? 0) >= 0.35 ? 'glossy' : 'matte', color: col };
}

function prepGeometry(src, matrix, boneIndex, color) {
  let g = src.index ? src.toNonIndexed() : src.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.applyMatrix4(matrix);
  const n = g.attributes.position.count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    si[i * 4] = boneIndex; sw[i * 4] = 1;
    col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.clearGroups();
  return g;
}

export function bakeModel(src) {
  src.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(src.matrixWorld).invert();
  const bones = [];
  const boneIndexOf = new Map();
  const rootBone = new THREE.Bone();
  rootBone.name = '__root';
  bones.push(rootBone);
  boneIndexOf.set(src, 0);

  // 1. bones for every named node (hierarchy follows nearest named ancestor)
  const nodeWorld = new Map();
  const relWorld = (o) => {
    if (!nodeWorld.has(o)) nodeWorld.set(o, new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld));
    return nodeWorld.get(o);
  };
  const namedAncestor = (o) => {
    let p = o.parent;
    while (p && p !== src && !boneIndexOf.has(p)) p = p.parent;
    return p || src;
  };
  const visit = (o) => {
    for (const c of o.children) {
      if (!c.isMesh && c.name) {
        const parent = namedAncestor(c);
        const bone = new THREE.Bone();
        bone.name = c.name;
        bone.userData = JSON.parse(JSON.stringify(c.userData || {}));
        const local = new THREE.Matrix4().copy(relWorld(parent)).invert().multiply(relWorld(c));
        local.decompose(bone.position, bone.quaternion, bone.scale);
        bones[boneIndexOf.get(parent)].add(bone);
        boneIndexOf.set(c, bones.length);
        bones.push(bone);
      }
      visit(c);
    }
  };
  visit(src);

  // 2. gather geometry per (class|transparent material)
  const buckets = new Map();
  src.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const mat = mats[0];
    const owner = namedAncestor(o);
    const bi = boneIndexOf.get(owner) ?? 0;
    const c = classify(mat);
    const key = c ? c.cls + '|' + mat.side : 'T|' + mat.uuid;
    if (!buckets.has(key)) buckets.set(key, { geos: [], mat: c ? classMaterial(c.cls, mat.side) : mat, cast: false, receive: false });
    const bucket = buckets.get(key);
    bucket.geos.push(prepGeometry(o.geometry, relWorld(o), bi, c ? c.color : new THREE.Color(1, 1, 1)));
    bucket.cast ||= o.castShadow;
    bucket.receive ||= o.receiveShadow;
  });

  // 3. assemble skinned meshes sharing one skeleton
  const out = new THREE.Group();
  out.name = src.name;
  out.add(rootBone);
  out.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  for (const b of buckets.values()) {
    const geo = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    for (const g of b.geos) if (g !== geo) g.dispose();
    if (!b.mat.userData.baked && b.mat.transparent) {
      // keep transparent materials but make sure vertex colours don't tint them
      geo.deleteAttribute('color');
    }
    geo.computeBoundingSphere();
    geo.boundingSphere.radius *= 1.25;
    const mesh = new THREE.SkinnedMesh(geo, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    out.add(mesh);
    mesh.bind(skeleton, new THREE.Matrix4());
  }
  return out;
}
