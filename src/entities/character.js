// 캐릭터 모델과 애니메이션. 내 캐릭터와 다른 사람 캐릭터가 같이 쓴다.
import * as THREE from '../lib/three.js';
import { M, box, mesh } from '../core/gfx.js';
import { PI, TAU } from '../core/util.js';
import { COLORS } from '../config.js';
import { W } from '../world/world.js';

export const GEO = {
  body:new THREE.CylinderGeometry(.33,.43,.78,12), leg:new THREE.BoxGeometry(.24,.5,.28), arm:new THREE.CylinderGeometry(.11,.12,.5,8),
  mit:new THREE.SphereGeometry(.13,8,6), head:new THREE.SphereGeometry(.4,16,12), eye:new THREE.SphereGeometry(.045,6,6),
  beanie:new THREE.SphereGeometry(.42,16,8,0,TAU,0,PI / 2), brim:new THREE.CylinderGeometry(.435,.435,.13,16), pom:new THREE.SphereGeometry(.13,8,6),
  scarf:new THREE.TorusGeometry(.31,.1,8,16).rotateX(PI / 2), ball:new THREE.IcosahedronGeometry(1,1), tiny:new THREE.SphereGeometry(.12,6,5),
  pack:new THREE.BoxGeometry(.44,.5,.2),
};

// 앉은 자세로 그릴 상태 코드와, 위치를 직접 정하는 특수 자세(그네 등). 놀이 모듈이 등록한다.
export const SIT = new Map();     // st → {arm, y} 앉은 자세의 팔 각도와 몸 높이
export const POSES = new Map();   // st → (w, ch, now) => void

export function makeChar(ci){
  const col = COLORS[ci % COLORS.length], g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const jm = M(col.j), hm = M(col.h), dark = M(0x495567);
  const limb = (x, y, geo, mat, off) => { const p = new THREE.Group(); p.position.set(x, y, 0); mesh(geo, mat, 0, off, 0, p); inner.add(p); return p; };
  const legL = limb(-.17,.5,GEO.leg,dark,-.25), legR = limb(.17,.5,GEO.leg,dark,-.25);
  const armL = limb(-.44,1.14,GEO.arm,jm,-.24), armR = limb(.44,1.14,GEO.arm,jm,-.24);
  mesh(GEO.mit, M(0xfafcfd), 0, -.5, 0, armL); mesh(GEO.mit, M(0xfafcfd), 0, -.5, 0, armR);
  armL.rotation.z = -.18; armR.rotation.z = .18;
  mesh(GEO.body, jm, 0, .86, 0, inner); mesh(GEO.scarf, hm, 0, 1.24, 0, inner); mesh(GEO.pack, hm, 0, .95, -.42, inner);
  mesh(GEO.head, M(0xf6d9c2), 0, 1.62, 0, inner);
  mesh(GEO.eye, dark, -.14, 1.64, .37, inner); mesh(GEO.eye, dark, .14, 1.64, .37, inner);
  mesh(GEO.beanie, jm, 0, 1.7, 0, inner); mesh(GEO.brim, hm, 0, 1.72, 0, inner); mesh(GEO.pom, hm, 0, 2.16, 0, inner);
  const extras = new THREE.Group(); g.add(extras);   // 썰매처럼 상태에 따라 붙는 것
  g.userData = {inner, legL, legR, armL, armR, extras, phase:0, amp:0, em:null};
  return g;
}

export function animChar(ch, dt, moved, st, now){
  const u = ch.userData, sit = SIT.get(st);
  u.extras.children.forEach(e => { e.visible = e.userData.st === st; });
  if (sit) {
    u.legL.rotation.x = u.legR.rotation.x = -1.4; u.armL.rotation.x = u.armR.rotation.x = sit.arm; u.inner.position.y = sit.y;
  } else {
    u.phase += moved * 2.4; u.amp += ((moved > 1e-4 ? 1 : 0) - u.amp) * Math.min(1, dt * 10);
    const s = Math.sin(u.phase) * u.amp;
    u.legL.rotation.x = s * .8; u.legR.rotation.x = -s * .8; u.armL.rotation.x = -s * .6; u.armR.rotation.x = s * .6;
    u.inner.position.y = Math.abs(Math.cos(u.phase)) * .07 * u.amp;
  }
  let rz = .18;
  if (u.em) {
    const e = (now - u.em.t0) / 1000, k = u.em.k;
    if (k === 1) { if (e > 1.6) u.em = null; else { rz = 2.6 + Math.sin(e * 12) * .35; u.armR.rotation.x = 0; } }
    else if (k === 2 || k === 4) { if (e > .55) u.em = null; else u.armR.rotation.x = e < .2 ? -2.9 * (e / .2) : -2.9 + 2.1 * Math.min(1, (e - .2) / .1); }
    else if (k === 3) { if (e > .4) u.em = null; else u.armR.rotation.x = -2.7 * Math.sin(PI * e / .4); }
    else u.em = null;
  }
  u.armR.rotation.z += (rz - u.armR.rotation.z) * Math.min(1, dt * 14);
}
// 감정 표현 코드: 1 손 흔들기, 2 내려치기, 3 던지기, 4 딱지 성공
export const emote = (ch, k) => { ch.userData.em = {k, t0:performance.now()}; };

// 상태에 맞게 위치·자세를 잡는다. w는 내 캐릭터나 다른 사람 데이터 {x, z, r, st, y}.
export function placeChar(w, ch, dt, moved, now){
  const pose = POSES.get(w.st);
  if (pose) pose(w, ch, now);
  else { const gy = W.groundY(w.x, w.z); w.y = w.y === undefined ? gy : w.y + (gy - w.y) * Math.min(1, dt * 14); ch.position.set(w.x, w.y, w.z); ch.rotation.set(0, w.r, 0); }
  animChar(ch, dt, moved, w.st, now);
}
