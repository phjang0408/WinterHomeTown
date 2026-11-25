// 3인칭 카메라: 캐릭터 뒤를 따라가고, 벽 · 소품 · 땅에 막히면 앞으로 당겨진다(2026-11-24 소품 · 땅 추가). 놀이가 camera()를 주면 그 고정 시점을 쓴다.
import * as THREE from '../lib/three.js';
import { camera, sun, SUN_OFF } from './engine.js';
import { S } from './state.js';
import { reduceMotion } from '../config.js';
import { W } from '../world/world.js';
import { current } from '../activities/registry.js';
import { INTRO } from '../map/layout.js';
import { sky } from '../map/scenery.js';

export const camPos = new THREE.Vector3(INTRO.x, INTRO.h, INTRO.z + INTRO.r), camLook = new THREE.Vector3(INTRO.x, 0, INTRO.z);
const head = new THREE.Vector3(), want = new THREE.Vector3(), look = new THREE.Vector3(), dir = new THREE.Vector3(), ray = new THREE.Raycaster();

export function updateCamera(dt, now){
  const C = S.cam, a = current(); let follow = false;
  if (S.dbgCam) { want.set(...S.dbgCam.p); look.set(...S.dbgCam.l); camPos.copy(want); camLook.copy(look); }   // 개발용: 고정 시점 (?debug)
  else if (S.mode === 'intro') { const t = (reduceMotion ? 0 : now * .00004) + .4; want.set(INTRO.x + Math.sin(t) * INTRO.r, INTRO.h, INTRO.z + Math.cos(t) * INTRO.r); look.set(INTRO.x, 0, INTRO.z); }
  else if (!(a && a.camera && a.camera(want, look))) {
    follow = true; const me = S.me;
    head.set(me.x, me.char.position.y + 1.6, me.z);
    const cp = Math.cos(C.pitch); dir.set(Math.sin(C.yaw) * cp, Math.sin(C.pitch), Math.cos(C.yaw) * cp);
    ray.set(head, dir); ray.far = C.dist + .6;
    const hit = ray.intersectObjects(W.blockers, true)[0]; let d = hit ? Math.max(1.4, hit.distance - .6) : C.dist;
    // (2026-11-24) 카메라 당기기: 캐릭터와 카메라 사이에 소품(차 · 벤치 · 담 · 가게 등)이 있으면 그 앞으로 당긴다 (world.js camRay, 상자 판정)
    const tb = W.camRay(head, dir, d + .3); if (tb !== null) d = Math.min(d, Math.max(.9, tb - .3));
    // 아래에서 올려다볼 때(시점을 위로) 카메라가 땅에 묻히지 않게, 땅에 닿는 자리까지 당긴다
    // (2026-11-25) 땅 · 계단 때문에 당길 때는 바로 튀지 않게 빠르게 따라간다 (계단 단마다 카메라가 툭툭 끊기던 것). 건물 · 소품은 그대로 바로 당긴다
    let dg = d; if (dir.y < .15) for (let t = .5; t < d; t += .3) { const y = head.y + dir.y * t; if (y < W.groundY(head.x + dir.x * t, head.z + dir.z * t, me.char.position.y) + .25) { dg = Math.max(.8, t - .25); break; } }
    C.gd = C.gd === undefined ? dg : C.gd + (dg - C.gd) * Math.min(1, dt * 9); d = Math.min(d, Math.max(dg, C.gd));
    C.cur = d < C.cur ? d : C.cur + (d - C.cur) * Math.min(1, dt * 4);
    want.copy(head).addScaledVector(dir, C.cur);
    const gy = W.groundY(want.x, want.z, me.char.position.y) + .25; C.fy = C.fy === undefined ? gy : C.fy + (gy - C.fy) * Math.min(1, dt * 10);   // 카메라 밑 땅 높이도 부드럽게
    if (want.y < Math.min(gy, C.fy)) want.y = Math.min(gy, C.fy);
    look.copy(head);
  }
  C.blend = Math.min(1, C.blend + dt * 1.6);
  if (follow && C.blend >= 1) { camPos.copy(want); camLook.copy(look); }
  else { const k = Math.min(1, dt * (S.mode === 'intro' ? 1.5 : 2 + 14 * C.blend * C.blend)); camPos.lerp(want, k); camLook.lerp(look, k); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  // (2026-11-17) 멀리서 볼수록 가까운 면(near)을 밀어 깊이 정밀도를 높인다: 첫 화면(높은 하늘 시점)에서 바닥 층이 깜빡이던 것
  { const nn = Math.min(8, Math.max(.3, camPos.distanceTo(camLook) * .02)); if (Math.abs(camera.near - nn) > .02) { camera.near = nn; camera.updateProjectionMatrix(); } }
  if (sky) sky.position.copy(camPos);
  const sx = S.mode === 'intro' ? INTRO.x : camLook.x, sz = S.mode === 'intro' ? INTRO.z : camLook.z;
  snapSun(sx, sz);
}
// (2026-11-25) 그림자 지도를 텍셀 크기만큼 끊어서 옮긴다: 걸을 때 그림자 가장자리가 지글지글 떨리던(깜빡이던) 것.
//   해 방향 기준 좌표로 바꿔 가로 · 세로를 텍셀 단위로 반올림하고 다시 세계 좌표로 돌린다.
const LROT = new THREE.Matrix4().lookAt(SUN_OFF, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)), LINV = LROT.clone().invert(), SV = new THREE.Vector3();
function snapSun(x, z){
  const c = sun.shadow.camera, tx = (c.right - c.left) / sun.shadow.mapSize.x;
  SV.set(x, 0, z).applyMatrix4(LINV); SV.x = Math.round(SV.x / tx) * tx; SV.y = Math.round(SV.y / tx) * tx; SV.applyMatrix4(LROT);
  sun.target.position.copy(SV); sun.position.copy(SV).add(SUN_OFF);
}
