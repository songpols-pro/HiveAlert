// True isometric orthographic RTS camera (pitch 35.264°, yaw 45°) with WASD/edge panning,
// cursor-anchored smooth zoom and screen->ground raycasting.
import * as THREE from 'three';
import { MAP_W, MAP_H } from '../config.js';
import { clamp } from '../core/util.js';

const ISO_PITCH = Math.atan(1 / Math.SQRT2); // 35.264°
const ISO_YAW = Math.PI / 4;
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export class RTSCamera {
  constructor() {
    this.viewSize = 11; // half-height of the view in world units at zoom 1
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
    this.target = new THREE.Vector3(MAP_W / 2, 0, MAP_H / 2);
    this.distance = 120;
    this.zoom = 1.3;
    this.zoomGoal = 1.3;
    this.minZoom = 0.55;
    this.maxZoom = 2.1;
    this.offset = new THREE.Vector3(
      Math.cos(ISO_PITCH) * Math.sin(ISO_YAW),
      Math.sin(ISO_PITCH),
      Math.cos(ISO_PITCH) * Math.cos(ISO_YAW)
    ).multiplyScalar(this.distance);
    // screen-aligned ground axes
    this.right = new THREE.Vector3(1, 0, -1).normalize();
    this.up = new THREE.Vector3(-1, 0, -1).normalize();
    this.raycaster = new THREE.Raycaster();
    this.zoomAnchor = null; // NDC point to keep fixed while zooming
    this.aspect = 1;
    this.shake = 0;
    this.apply();
  }

  setAspect(w, h) {
    this.aspect = w / Math.max(1, h);
    this.viewportW = w;
    this.viewportH = h;
    this.updateProjection();
  }

  updateProjection() {
    const vs = this.viewSize;
    const c = this.camera;
    c.left = -vs * this.aspect; c.right = vs * this.aspect; c.top = vs; c.bottom = -vs;
    c.zoom = this.zoom;
    c.updateProjectionMatrix();
  }

  // world units per screen pixel (vertical)
  get unitsPerPixel() { return (2 * this.viewSize) / this.zoom / Math.max(1, this.viewportH); }

  pan(dx, dy) {
    // dx/dy in world units along screen axes. Screen 'up' on the ground is foreshortened by sin(pitch).
    this.target.addScaledVector(this.right, dx);
    this.target.addScaledVector(this.up, dy / Math.sin(ISO_PITCH));
    this.clampTarget();
  }

  clampTarget() {
    this.target.x = clamp(this.target.x, 2, MAP_W - 2);
    this.target.z = clamp(this.target.z, 2, MAP_H - 2);
  }

  centerOn(x, z) {
    this.target.set(x, 0, z);
    this.clampTarget();
  }

  zoomBy(factor, anchorNdc) {
    this.zoomGoal = clamp(this.zoomGoal * factor, this.minZoom, this.maxZoom);
    this.zoomAnchor = anchorNdc ? anchorNdc.clone() : null;
  }

  update(dt) {
    if (Math.abs(this.zoomGoal - this.zoom) > 0.0005) {
      const before = this.zoomAnchor ? this.screenToGround(this.zoomAnchor.x, this.zoomAnchor.y) : null;
      this.zoom += (this.zoomGoal - this.zoom) * Math.min(1, dt * 12);
      this.updateProjection();
      this.apply();
      if (before) {
        const after = this.screenToGround(this.zoomAnchor.x, this.zoomAnchor.y);
        if (after) { this.target.x += before.x - after.x; this.target.z += before.z - after.z; this.clampTarget(); }
      }
    }
    this.apply();
  }

  apply() {
    const c = this.camera;
    c.position.copy(this.target).add(this.offset);
    if (this.shake > 0) {
      c.position.x += (Math.random() - 0.5) * this.shake;
      c.position.z += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - 0.02);
    }
    c.lookAt(c.position.x - this.offset.x, c.position.y - this.offset.y, c.position.z - this.offset.z);
    c.updateMatrixWorld();
  }

  screenToGround(ndcX, ndcY, out = new THREE.Vector3()) {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    return this.raycaster.ray.intersectPlane(GROUND, out);
  }

  ray(ndcX, ndcY) {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    return this.raycaster.ray;
  }

  // world -> CSS pixel coordinates within the viewport
  project(v, out = { x: 0, y: 0, visible: true }) {
    const p = _tmp.copy(v).project(this.camera);
    out.x = (p.x * 0.5 + 0.5) * this.viewportW;
    out.y = (-p.y * 0.5 + 0.5) * this.viewportH;
    out.visible = p.x > -1.1 && p.x < 1.1 && p.y > -1.1 && p.y < 1.1;
    return out;
  }

  // ground-plane quad currently visible (for the minimap)
  viewQuad() {
    return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => this.screenToGround(x, y) || new THREE.Vector3());
  }

  get halfViewWidth() { return (this.viewSize * this.aspect) / this.zoom; }
}

const _tmp = new THREE.Vector3();
