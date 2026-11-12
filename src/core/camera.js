// 3인칭 카메라: 캐릭터 뒤를 따라가고, 벽에 막히면 앞으로 당겨진다. 놀이가 camera()를 주면 그 고정 시점을 쓴다.
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
  if (S.mode === 'intro') { const t = (reduceMotion ? 0 : now * .00004) + .4; want.set(INTRO.x + Math.sin(t) * INTRO.r, INTRO.h, INTRO.z + Math.cos(t) * INTRO.r); look.set(INTRO.x, 0, INTRO.z); }
  else if (!(a && a.camera && a.camera(want, look))) {
    follow = true; const me = S.me;
    head.set(me.x, me.char.position.y + 1.6, me.z);
    const cp = Math.cos(C.pitch); dir.set(Math.sin(C.yaw) * cp, Math.sin(C.pitch), Math.cos(C.yaw) * cp);
    ray.set(head, dir); ray.far = C.dist + .6;
    const hit = ray.intersectObjects(W.blockers, true)[0], d = hit ? Math.max(1.4, hit.distance - .6) : C.dist;
    C.cur = d < C.cur ? d : C.cur + (d - C.cur) * Math.min(1, dt * 4);
    want.copy(head).addScaledVector(dir, C.cur);
    const gy = W.groundY(want.x, want.z) + .4; if (want.y < gy) want.y = gy;
    look.copy(head);
  }
  C.blend = Math.min(1, C.blend + dt * 1.6);
  if (follow && C.blend >= 1) { camPos.copy(want); camLook.copy(look); }
  else { const k = Math.min(1, dt * (S.mode === 'intro' ? 1.5 : 2 + 14 * C.blend * C.blend)); camPos.lerp(want, k); camLook.lerp(look, k); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  if (sky) sky.position.copy(camPos);
  const sx = S.mode === 'intro' ? INTRO.x : camLook.x, sz = S.mode === 'intro' ? INTRO.z : camLook.z;
  sun.target.position.set(sx, 0, sz); sun.position.set(sx + SUN_OFF.x, SUN_OFF.y, sz + SUN_OFF.z);
}
