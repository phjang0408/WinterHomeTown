// 캐릭터 모델과 애니메이션. 내 캐릭터와 다른 사람 캐릭터가 같이 쓴다.
import * as THREE from '../lib/three.js';
import { M, box, mesh } from '../core/gfx.js';
import { merge } from '../core/meshkit.js';
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

// (2026-11-24 최적화) 통째로 움직이는 묶음(몸통 · 팔 · 다리)마다, 그 바로 아래 단색 Lambert 메쉬들을 정점 색 한 메쉬로 합친다.
//   사람 하나가 그리기 15회(+그림자 15회)에서 5회(+5회)로 준다. 노점 사람(npc.js)도 쓴다. 나중에 붙이는 것(키링 · 들고 있는 것)은 그대로 따로 붙는다.
const RIG = new THREE.MeshLambertMaterial({vertexColors:true});
export function bakeRig(g){
  const groups = []; g.traverse(o => { if (o.isGroup) groups.push(o); });
  for (const grp of groups) {
    const ms = grp.children.filter(m => m.isMesh && !m.isInstancedMesh && m.visible && m.material && m.material.isMeshLambertMaterial && !m.material.map && !m.material.transparent);
    if (ms.length < 2) continue;
    const geos = ms.map(m => { m.updateMatrix(); const ge = m.geometry.clone().applyMatrix4(m.matrix), c = m.material.color, n = ge.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } ge.setAttribute('color', new THREE.BufferAttribute(a, 3)); return ge; });
    const one = new THREE.Mesh(merge(geos), RIG); one.castShadow = ms.some(m => m.castShadow); one.receiveShadow = ms.some(m => m.receiveShadow);
    ms.forEach(m => grp.remove(m)); grp.add(one); geos.forEach(ge => ge.dispose());
  }
  return g;
}

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
  return bakeRig(g);
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
  // (2026-11-23 3차) 팔 이름 주의: 몸이 +z를 보므로 armR(x +0.44)은 캐릭터의 '왼팔', armL(x -0.44)이 '오른팔'이다 (뒤에서 보면 화면 오른쪽).
  //   손 흔들기는 왼팔(armR), 내려치기 · 던지기 · 놀이는 오른팔(armL)
  let rz = .18, lz = -.18;
  if (u.em) {
    const e = (now - u.em.t0) / 1000, k = u.em.k;
    if (k === 1) { if (e > 1.6) u.em = null; else { rz = 2.6 + Math.sin(e * 12) * .35; u.armR.rotation.x = 0; } }
    else if (k === 2 || k === 4) { if (e > .55) u.em = null; else u.armL.rotation.x = e < .2 ? -2.9 * (e / .2) : -2.9 + 2.1 * Math.min(1, (e - .2) / .1); }
    else if (k === 3) { if (e > .4) u.em = null; else u.armL.rotation.x = -2.7 * Math.sin(PI * e / .4); }
    else u.em = null;
  }
  u.armR.rotation.z += (rz - u.armR.rotation.z) * Math.min(1, dt * 14);
  u.armL.rotation.z += (lz - u.armL.rotation.z) * Math.min(1, dt * 14);   // (2026-11-20) 놀이가 바꾼 왼팔도 제자리로
  waveTrail(ch, now);
}
// (2026-11-24) 손 흔들기 잔상: 흔드는 손(armR 끝)을 따라 희미한 흰 띠. 최근 0.26초 동안의 손 자리를 캐릭터 기준 좌표로 모아
//   어깨→손 방향으로 폭을 준 띠(새것일수록 넓고 진하게)를 그린다. 흔들 때만 보이고, 한 사람당 메쉬 하나.
const TRAIL_LIFE = 260, TRAIL_MAX = 48, TRAIL_W = .05, TRAIL_A = .42;
const trailMat = new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, depthWrite:false, side:THREE.DoubleSide});
const tv = new THREE.Vector3(), ts = new THREE.Vector3();
function waveTrail(ch, now){
  const u = ch.userData, on = waving(ch); let T = u.trail;
  if (!T) { if (!on) return;
    const geo = new THREE.BufferGeometry(), idx = [];
    for (let i = 0; i < TRAIL_MAX - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 6), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 8), 4).setUsage(THREE.DynamicDrawUsage)); geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, trailMat); mesh.frustumCulled = false; mesh.renderOrder = 2; ch.add(mesh); T = u.trail = {pts:[], mesh}; }
  if (on) { u.armR.updateMatrix(); u.inner.updateMatrix();
    const p = tv.set(0, -.56, 0).applyMatrix4(u.armR.matrix).applyMatrix4(u.inner.matrix).clone(), sh = ts.set(0, 0, 0).applyMatrix4(u.armR.matrix).applyMatrix4(u.inner.matrix).clone();
    T.pts.push({p, d:p.clone().sub(sh).normalize(), t:now}); }
  while (T.pts.length && (now - T.pts[0].t > TRAIL_LIFE || T.pts.length > TRAIL_MAX)) T.pts.shift();
  const n = T.pts.length, geo = T.mesh.geometry; T.mesh.visible = n > 1; if (n < 2) return;
  const P = geo.attributes.position.array, C = geo.attributes.color.array;
  T.pts.forEach((q, i) => { const k = i / (n - 1), w = TRAIL_W * k, a = TRAIL_A * k * Math.max(0, 1 - (now - q.t) / TRAIL_LIFE);
    for (let s = 0; s < 2; s++) { const o = (i * 2 + s) * 3, sg = s ? w : -w; P[o] = q.p.x + q.d.x * sg; P[o + 1] = q.p.y + q.d.y * sg; P[o + 2] = q.p.z + q.d.z * sg;
      const c = (i * 2 + s) * 4; C[c] = C[c + 1] = C[c + 2] = 1; C[c + 3] = a; } });
  geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true; geo.setDrawRange(0, (n - 1) * 6);
}
// 손 흔드는 중인가: 놀이 자세가 흔드는 팔(armR = 캐릭터 왼팔)을 덮어쓰지 않게
export const waving = ch => !!(ch && ch.userData.em && ch.userData.em.k === 1);
// 감정 표현 코드: 1 손 흔들기, 2 내려치기, 3 던지기, 4 딱지 성공
export const emote = (ch, k) => { ch.userData.em = {k, t0:performance.now()}; };

// 상태에 맞게 위치·자세를 잡는다. w는 내 캐릭터나 다른 사람 데이터 {x, z, r, st, y}.
export function placeChar(w, ch, dt, moved, now){
  const pose = POSES.get(w.st);
  if (pose) pose(w, ch, now);
  else { const gy = W.groundY(w.x, w.z, w.y); w.y = w.y === undefined ? gy : w.y + (gy - w.y) * Math.min(1, dt * 14); ch.position.set(w.x, w.y, w.z); ch.rotation.set(0, w.r, 0); }
  animChar(ch, dt, moved, w.st, now);
}
