// Generic name-driven animation rig. Model files only NAME their pivots; this animates them.
// See models/README.md for the full naming convention.

function base(o) {
  const u = o.userData;
  u.r0 = [o.rotation.x, o.rotation.y, o.rotation.z];
  u.p0 = [o.position.x, o.position.y, o.position.z];
  u.s0 = [o.scale.x, o.scale.y, o.scale.z];
  return o;
}

export function buildRig(root) {
  const rig = {
    hexA: [], hexB: [], bip: [], arm: [], wing: [], ant: [], mand: [], spin: [], pulse: [], glow: [],
    deployOn: [], deployOff: [], radar: [], tail: [], body: [], abdomen: [], door: [], core: [],
    phase: Math.random() * 10,
  };
  root.traverse((o) => {
    const n = o.name;
    if (!n) return;
    const side = n.includes('L') && !n.includes('R') ? -1 : 1;
    if (n.startsWith('hexA')) { base(o).userData.side = n.endsWith('L') ? -1 : 1; rig.hexA.push(o); }
    else if (n.startsWith('hexB')) { base(o).userData.side = n.endsWith('L') ? -1 : 1; rig.hexB.push(o); }
    else if (n === 'bipA' || n === 'bipB') { base(o).userData.sign = n === 'bipA' ? 1 : -1; rig.bip.push(o); }
    else if (n === 'armA' || n === 'armB') { base(o).userData.sign = n === 'armA' ? 1 : -1; rig.arm.push(o); }
    else if (n.startsWith('wingL') || n.startsWith('wingR')) { base(o).userData.side = n.startsWith('wingL') ? -1 : 1; o.userData.k = rig.wing.length; rig.wing.push(o); }
    else if (n === 'antL' || n === 'antR') { base(o).userData.side = n === 'antL' ? -1 : 1; rig.ant.push(o); }
    else if (n === 'mandL' || n === 'mandR') { base(o).userData.side = n === 'mandL' ? -1 : 1; rig.mand.push(o); }
    else if (n.startsWith('spinX') || n.startsWith('spinY') || n.startsWith('spinZ')) { base(o).userData.axis = n[4].toLowerCase(); rig.spin.push(o); }
    else if (n.startsWith('pulse')) { base(o).userData.k = rig.pulse.length; rig.pulse.push(o); }
    else if (n.startsWith('glow')) { base(o).userData.k = rig.glow.length; rig.glow.push(o); }
    else if (n.startsWith('deployOn')) rig.deployOn.push(base(o));
    else if (n.startsWith('deployOff')) rig.deployOff.push(base(o));
    else if (n.startsWith('radar')) rig.radar.push(base(o));
    else if (n.startsWith('tail')) rig.tail.push(base(o));
    else if (n === 'body') rig.body.push(base(o));
    else if (n.startsWith('abdomen')) rig.abdomen.push(base(o));
    else if (n.startsWith('door')) rig.door.push(base(o));
    else if (n.startsWith('core')) rig.core.push(base(o));
    void side;
  });
  return rig;
}

/**
 * s: { t, moving, speed, firing (0..1 decaying), deployed (0..1), aim (0..1), doorOpen (0..1),
 *      powered (bool), flapping (bool), hover (bool), spinMul }
 */
export function animateRig(rig, s, dt) {
  const t = s.t;
  const mv = s.moving ? 1 : 0;
  rig.phase += dt * (s.moving ? 5 + (s.speed || 1) * 3.5 : 0);
  const ph = rig.phase;
  const fire = s.firing || 0;
  for (const o of rig.hexA) {
    const r0 = o.userData.r0;
    o.rotation.y = r0[1] + Math.sin(ph) * 0.38 * mv;
    o.rotation.z = r0[2] + o.userData.side * Math.max(0, Math.cos(ph)) * 0.3 * mv;
  }
  for (const o of rig.hexB) {
    const r0 = o.userData.r0;
    o.rotation.y = r0[1] - Math.sin(ph) * 0.38 * mv;
    o.rotation.z = r0[2] + o.userData.side * Math.max(0, -Math.cos(ph)) * 0.3 * mv;
  }
  for (const o of rig.bip) o.rotation.x = o.userData.r0[0] + o.userData.sign * Math.sin(ph) * 0.55 * mv;
  for (const o of rig.arm) o.rotation.x = o.userData.r0[0] - o.userData.sign * Math.sin(ph) * 0.3 * mv - fire * 0.55;
  const flapRate = s.flapping ? 42 : 0;
  for (const o of rig.wing) {
    const r0 = o.userData.r0;
    o.rotation.z = r0[2] + o.userData.side * (s.flapping ? Math.sin(t * flapRate + o.userData.k * 1.7) * 0.6 : 0);
  }
  for (const o of rig.ant) {
    const r0 = o.userData.r0;
    o.rotation.x = r0[0] + Math.sin(t * 3.1 + o.userData.side) * 0.12;
    o.rotation.y = r0[1] + Math.sin(t * 2.3 + o.userData.side * 2) * 0.1;
  }
  for (const o of rig.mand) o.rotation.y = o.userData.r0[1] + o.userData.side * (fire * 0.45 + Math.max(0, Math.sin(t * 2.5)) * 0.05);
  for (const o of rig.tail) o.rotation.x = o.userData.r0[0] + fire * 0.55 + Math.sin(t * 1.7) * 0.04;
  for (const o of rig.body) o.position.y = o.userData.p0[1] + Math.abs(Math.sin(ph)) * 0.012 * mv + (s.hover ? Math.sin(t * 2.2) * 0.03 : 0);
  for (const o of rig.spin) {
    const sp = (o.userData.speed ?? 2) * (s.spinMul ?? 1) * dt;
    o.rotation[o.userData.axis] += sp;
  }
  for (const o of rig.pulse) {
    const k = 1 + 0.07 * Math.sin(t * 2.2 + o.userData.k * 1.3);
    const s0 = o.userData.s0;
    o.scale.set(s0[0] * k, s0[1] * k, s0[2] * k);
  }
  for (const o of rig.glow) {
    const k = 1 + 0.15 * Math.sin(t * 6 + o.userData.k * 2.1);
    const s0 = o.userData.s0;
    o.scale.set(s0[0] * k, s0[1] * k, s0[2] * k);
  }
  const dep = s.deployed || 0;
  for (const o of rig.deployOn) {
    const s0 = o.userData.s0, k = Math.max(0.001, dep);
    o.scale.set(s0[0] * k, s0[1] * k, s0[2] * k);
    o.visible = dep > 0.02;
  }
  for (const o of rig.deployOff) {
    const s0 = o.userData.s0, k = Math.max(0.001, 1 - dep);
    o.scale.set(s0[0] * k, s0[1] * k, s0[2] * k);
    o.visible = dep < 0.98;
  }
  for (const o of rig.radar) o.rotation.y += dt * (s.powered === false ? 0.08 : 1.1);
  for (const o of rig.abdomen) o.rotation.x = o.userData.r0[0] - (s.aim || 0) * 0.9;
  for (const o of rig.door) o.position.y = o.userData.p0[1] + (s.doorOpen || 0) * (o.userData.lift ?? 0.6);
  // superweapon cores: spin faster and swell as the charge builds (s.charge 0..1)
  const ch = s.charge ?? 0.3;
  for (const o of rig.core) {
    o.rotation.y += dt * (0.25 + ch * 2.2);
    const k = 1 + (0.03 + ch * 0.07) * Math.sin(t * (2 + ch * 6));
    const s0 = o.userData.s0;
    o.scale.set(s0[0] * k, s0[1] * k, s0[2] * k);
  }
}
