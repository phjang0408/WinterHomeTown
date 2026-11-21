// 노점 사람 (2026-11-20 4차): 플레이어 캐릭터(character.js)와 같은 몸 모양을 바꿔 만든 군고구마 아저씨 · 호떡 아주머니.
//   아저씨: 갈색 점퍼, 귀마개 달린 털모자, 콧수염, 남색 앞치마. 집게로 고구마를 뒤적이듯 오른팔을 움직인다.
//   아주머니: 자줏빛 누빔 점퍼, 뽀글 파마머리, 꽃무늬 느낌 분홍 앞치마, 팔 토시. 누르개로 호떡을 누르듯 오른팔을 위아래로 움직인다.
//   가까이 오면 그쪽을 보고, 사면 머리 위에 말풍선이 잠깐 뜬다.
import * as THREE from '../lib/three.js';
import { M, mesh, pillSprite } from '../core/gfx.js';
import { GEO } from './character.js';

const SKIN = 0xf2d2b8, DARK = 0x3d4652;
export function makeVendor(kind){
  const aj = kind === 'ajeossi', g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const jm = M(aj ? 0x7a5a3e : 0x8e3a5c), pm = M(aj ? 0x3a4560 : 0xe58fa6), dark = M(DARK);
  const limb = (x, y, geo, mat, off) => { const p = new THREE.Group(); p.position.set(x, y, 0); mesh(geo, mat, 0, off, 0, p); inner.add(p); return p; };
  limb(-.17, .5, GEO.leg, dark, -.25); limb(.17, .5, GEO.leg, dark, -.25);
  const armL = limb(-.44, 1.14, GEO.arm, jm, -.24), armR = limb(.44, 1.14, GEO.arm, jm, -.24);
  mesh(GEO.mit, M(SKIN), 0, -.5, 0, armL); mesh(GEO.mit, M(SKIN), 0, -.5, 0, armR);
  if (!aj) [armL, armR].forEach(a => mesh(new THREE.CylinderGeometry(.13, .13, .2, 10), M(0xf2e6c8), 0, -.33, 0, a));   // 팔 토시
  armL.rotation.z = -.18; armR.rotation.z = .18;
  mesh(new THREE.CylinderGeometry(aj ? .36 : .37, aj ? .46 : .47, .8, 12), jm, 0, .86, 0, inner);                    // 점퍼 (조금 통통하게)
  const apron = mesh(new THREE.BoxGeometry(.56, .62, .04), pm, 0, .72, .43, inner); apron.rotation.x = -.1;           // 앞치마
  if (!aj) for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(.035, 6, 5), M(0xfff3f6), -.18 + (i % 3) * .18, .58 + Math.floor(i / 3) * .22, .45, inner);   // 꽃무늬 점
  mesh(GEO.head, M(SKIN), 0, 1.62, 0, inner);
  mesh(GEO.eye, dark, -.14, 1.64, .37, inner); mesh(GEO.eye, dark, .14, 1.64, .37, inner);
  if (aj) {
    mesh(new THREE.BoxGeometry(.22, .05, .05), dark, 0, 1.5, .38, inner);                                             // 콧수염
    mesh(GEO.beanie, M(0x5b4a3a), 0, 1.7, 0, inner); mesh(GEO.brim, M(0xd8cdb8), 0, 1.72, 0, inner);                    // 털모자
    [-1, 1].forEach(s => { const f = mesh(new THREE.BoxGeometry(.08, .3, .22), M(0xd8cdb8), s * .41, 1.55, 0, inner); f.rotation.z = s * .12; });   // 귀마개
  } else {
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = .36 + (i % 2) * .04;                         // 뽀글 파마
      mesh(new THREE.SphereGeometry(.11, 8, 6), M(0x2e2626), Math.cos(a) * r, 1.82 + (i % 3) * .05, Math.sin(a) * r - .02, inner); }
    mesh(new THREE.SphereGeometry(.34, 12, 8), M(0x2e2626), 0, 1.86, -.04, inner);
    mesh(new THREE.SphereGeometry(.05, 6, 5), M(0xd24a3a), -.16, 1.5, .36, inner); mesh(new THREE.SphereGeometry(.05, 6, 5), M(0xd24a3a), .16, 1.5, .36, inner);   // 볼 빨간
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  g.userData = {inner, armL, armR, kind, bubble:null, bubbleT:0, face:0};
  return g;
}
// 매 프레임: 일하는 손짓 + 가까운 사람 보기 + 말풍선 시간
export function animVendor(v, dt, now, near, nx, nz, baseRot){
  const u = v.userData, t = now / 1000;
  if (u.kind === 'ajeossi') { u.armR.rotation.x = -.9 + Math.sin(t * 2.2) * .35; u.armR.rotation.z = .35 + Math.sin(t * 1.1) * .15; }
  else { u.armR.rotation.x = -1.05 + Math.max(0, Math.sin(t * 3.1)) * .55; u.armR.rotation.z = .25; }
  u.armL.rotation.x = -.7;
  const want = near ? Math.atan2(nx - v.position.x, nz - v.position.z) - baseRot : 0, d = Math.atan2(Math.sin(want - u.face), Math.cos(want - u.face));
  u.face += d * Math.min(1, dt * 4); v.rotation.y = baseRot + Math.max(-.9, Math.min(.9, u.face));
  u.inner.position.y = Math.abs(Math.sin(t * 1.4)) * .02;
  if (u.bubble && (u.bubbleT -= dt) < 0) { v.remove(u.bubble); u.bubble.material.map.dispose(); u.bubble = null; }
}
export function say(v, text){
  const u = v.userData; if (u.bubble) { v.remove(u.bubble); u.bubble.material.map.dispose(); }
  u.bubble = pillSprite(text, 'rgba(255,255,255,.95)', '#7a3a1e', .55); u.bubble.position.y = 2.8; v.add(u.bubble); u.bubbleT = 3;
}
