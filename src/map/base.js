// 세 구역을 잇는 공용 지형: 기찻길·폐역, 순환도로, 보행로, 강변도로, 강변 산책로, 경계.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { M, flat, box, mesh, canvasTex, pillSprite } from '../core/gfx.js';
import { sr, PI } from '../core/util.js';
import { W } from '../world/world.js';
import { zone, path, solid, building, fence } from '../world/builders.js';
import { BANK, ROAD, RAIL_Z, PLAT, DECK, LOOP, PATHS, HILL, POND, BENCHES } from './layout.js';
import { hillY } from './terrain.js';

export function buildRailway(){
  zone(6,19,634,80,0xe8edf1,'#e6ebef');
  box(-800,RAIL_Z - .83,1400,RAIL_Z - .67,.18,M(0x7c8a9a)); box(-800,RAIL_Z + .67,1400,RAIL_Z + .83,.18,M(0x7c8a9a));
  flat(-800,RAIL_Z - 2.4,1400,RAIL_Z + 2.4,0xd9dfe5,.012); W.mmRect(0,RAIL_Z - 1.2,640,RAIL_Z + 1.2,'#8d9aa9');
  const N = 900, ties = new THREE.InstancedMesh(new THREE.BoxGeometry(.45,.14,2.8), M(0x9fb0c2), N), m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) ties.setMatrixAt(i, m4.makeTranslation(-300 + i * 1.3, .07, RAIL_Z));
  ties.receiveShadow = true; ties.frustumCulled = false; root.add(ties);
  // 폐역 승강장과 역사
  box(PLAT.x0,PLAT.z0,PLAT.x1,PLAT.z1,.9,M(0xe5d7c3)); flat(PLAT.x0,48,PLAT.x1,48.35,0xe9cf7a,.915); W.mmRect(PLAT.x0,PLAT.z0,PLAT.x1,PLAT.z1,'#e5d7c3');
  [[254,48.5],[290,48.5],[254,53],[290,53]].forEach(p => { mesh(new THREE.CylinderGeometry(.13,.13,3.6,8), M(0x9a8372), p[0], 2.7, p[1]); W.circle(p[0], p[1], .15); });
  box(252,PLAT.z0,292,PLAT.z1,.25,M(0xc9b8a3),4.5); box(251.8,PLAT.z0 - .2,292.2,PLAT.z1 + .2,.18,M(0xf8fbfd),4.75);
  building(260,57,284,64,6,{kind:'shop', base:'#e6d6c0', label:'폐역', awn:'#8a6f5a', face:'s', mm:false}); W.mmLabel(272, 60.5, '폐역', 20);
  const st = pillSprite('폐역 · 승강장', 'rgba(255,250,240,.95)', '#34465c', 1.5); st.position.set(272, 6.6, 51); root.add(st);
  // 버려진 객차
  const tex = canvasTex(512, 96, g => { g.fillStyle = '#9b6a58'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#7c5546'; g.fillRect(0, 70, 512, 26);
    for (let i = 0; i < 9; i++) { g.fillStyle = i === 3 ? '#c9b8a3' : '#c3d3de'; g.fillRect(14 + i * 55, 18, 38, 34); } g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, 512, 6); });
  const side = M(0x9b6a58), face = new THREE.MeshLambertMaterial({map:tex});
  W.blockers.push(box(64,RAIL_Z - 1.4,88,RAIL_Z + 1.4,3.4,[side,side,M(0xf8fbfd),side,face,face],.45)); W.rect(64,RAIL_Z - 1.4,88,RAIL_Z + 1.4);
  box(63.8,RAIL_Z - 1.6,88.2,RAIL_Z + 1.6,.2,M(0xf8fbfd),3.85); W.mmRect(64,RAIL_Z - 1.4,88,RAIL_Z + 1.4,'#a7796a'); W.mmLabel(76, 36, '버려진 객차', 16);
  solid(7,RAIL_Z - 1.2,8.2,RAIL_Z + 1.2,1.2,0xb5594a);
  // 북쪽 경계와 동서 산울타리
  fence(6, 19, 634, 19, 1.1, 0xa58a74, true);
  [[3.5,19,6,252],[634,19,636.5,252]].forEach(h => { box(h[0], h[1], h[2], h[3], 1.4, M(0xc3d4c8)); box(h[0] - .1, h[1], h[2] + .1, h[3], .3, M(0xf8fbfd), 1.4); });
  for (let x = 10; x < 630; x += sr(7, 11)) W.tree(x, sr(22, 30));
  for (let x = 12; x < 630; x += sr(14, 22)) { if (x > 230 && x < 315) continue; W.tree(x, sr(58, 76)); }
  [[245,56],[300,56]].forEach(p => W.lamp(p[0], p[1]));
}

export function buildStreets(){
  const ROADC = 0xb4bfcc, L = LOOP;
  [[L.x0, L.z0, L.x0 + L.w, ROAD.z0],[L.x1 - L.w, L.z0, L.x1, ROAD.z0],[L.x0, L.z0, L.x1, L.z0 + L.w]].forEach((r, i) => { flat(r[0], r[1], r[2], r[3], ROADC, .025 + i * .001); W.mmRect(r[0], r[1], r[2], r[3], '#b0bbc8'); });
  flat(-800,ROAD.z0,1400,ROAD.z1,0xa5b1c0,.02); W.mmRect(0,ROAD.z0,640,ROAD.z1,'#a3afbe');
  flat(-800,ROAD.z0 - 4,1400,ROAD.z0,0xdfe6ec,.015); flat(-800,ROAD.z1,1400,ROAD.z1 + 3,0xd7dfe6,.02);
  for (let x = -200; x < 840; x += 7) flat(x, 263.85, x + 3.5, 264.15, 0xe9cf7a, .03);
  // 보행로: 동서 두 줄 + 남북 연결
  path(44, PATHS.a - 2, 461, PATHS.a + 2); path(44, PATHS.b - 2, 461, PATHS.b + 2);
  path(175, 66, 179, ROAD.z0); path(175, 66, 290, 70); path(270, 64, 274, 66); path(449, PATHS.a - 2, 453, ROAD.z0); path(449, 170, 480, 174);
  // 횡단보도
  [177, 451].forEach(cx => { for (let i = -2; i <= 2; i++) flat(cx + i * 1.1 - .35, ROAD.z0 + .6, cx + i * 1.1 + .35, ROAD.z1 - .6, 0xf6f8fa, .04); });
  [L.x0 + L.w / 2, L.x1 - L.w / 2].forEach(x => [PATHS.a, PATHS.b].forEach(z => { for (let i = -1; i <= 1; i++) flat(x - 3.3, z + i * .7 - .2, x + 3.3, z + i * .7 + .2, 0xf6f8fa, .045); }));
  [[182,100],[182,180],[182,240],[200,250],[440,250]].forEach(p => W.lamp(p[0], p[1]));
}

export function buildRiverside(){
  flat(6,296,634,300,0xfbfdfe,BANK + .01); flat(6,297.9,634,298.1,0x2f7f8c,BANK + .02); W.mmRect(6,296,634,300,'#b9d2d8');
  // 계단과 난간
  [177, 451].forEach(cx => { for (let i = 0; i < 7; i++) box(cx - 2, 275 + i, cx + 2, 276 + i, BANK * (i + .5) / 7 + 3.6, M(0xd3dbe3), BANK - .6); });
  [[6,175],[179,449],[453,634]].forEach(s => { fence(s[0] + .3, 274.7, s[1] - .3, 274.7, 1, 0x8f9cab); W.rect(s[0], 274.3, s[1], 275.1); });
  [[6,DECK.x0],[DECK.x1,POND.x - POND.r],[POND.x + POND.r,634]].forEach(s => fence(s[0] + .3, 341.8, s[1] - .3, 341.8, 1, 0x8f9cab));
  // 데크
  box(DECK.x0, DECK.z0, DECK.x1, DECK.z1, .3, M(0xb79d82), DECK.y - .3);
  for (let z = 345; z <= DECK.z1; z += 5) [DECK.x0 + .3, DECK.x1 - .3].forEach(x => mesh(new THREE.CylinderGeometry(.2,.2,1.6,8), M(0x8a6f5a), x, DECK.y - .9, z));
  fence(DECK.x0 + .2, 342, DECK.x0 + .2, DECK.z1 - .2, 1, 0x8a6f5a); fence(DECK.x1 - .2, 342, DECK.x1 - .2, DECK.z1 - .2, 1, 0x8a6f5a); fence(DECK.x0 + .2, DECK.z1 - .2, DECK.x1 - .2, DECK.z1 - .2, 1, 0x8a6f5a);
  W.mmRect(DECK.x0,DECK.z0,DECK.x1,DECK.z1,'#cdb79e'); W.mmLabel(340, 356, '데크', 14);
  // 눈썰매 둔덕 지형
  const hg = new THREE.PlaneGeometry(HILL.r * 2 + 4, HILL.r * 2 + 4, 40, 40); hg.rotateX(-PI / 2);
  const pa = hg.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, BANK + hillY(pa.getX(i) + HILL.x, pa.getZ(i) + HILL.z) + .012);
  hg.computeVertexNormals(); const hill = new THREE.Mesh(hg, M(0xf4f7f9)); hill.position.set(HILL.x, 0, HILL.z); hill.receiveShadow = true; root.add(hill);
  W.mmCircle(HILL.x, HILL.z, HILL.r, '#eef2ef');
  // 강가 빙판
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 48), new THREE.MeshPhongMaterial({color:0xd3e6f0, specular:0xffffff, shininess:90}));
  pond.rotation.x = -PI / 2; pond.position.set(POND.x, BANK + .03, POND.z); pond.receiveShadow = true; root.add(pond);
  const rim = new THREE.Mesh(new THREE.RingGeometry(POND.r, POND.r + .8, 48), M(0xeef3f6)); rim.rotation.x = -PI / 2; rim.position.set(POND.x, BANK + .035, POND.z); root.add(rim);
  for (let i = 0; i < 12; i++) { const a = PI + i / 11 * PI, x = POND.x + Math.cos(a) * (POND.r + 1.3), z = POND.z + Math.sin(a) * (POND.r + 1.3); if (z > 341) continue;
    const rk = mesh(new THREE.DodecahedronGeometry(sr(.45, .8), 0), M(0xb3bdc8), x, BANK + .3, z); rk.rotation.set(sr(0, 3), sr(0, 3), 0); W.circle(x, z, .6); }
  W.mmCircle(POND.x, POND.z, POND.r, '#dbeaf2'); W.mmLabel(POND.x, POND.z, '빙판', 14);
  // 나무와 가로등
  for (let x = 10; x < 630; x += sr(11, 16)) { if (Math.abs(x - 177) < 6 || Math.abs(x - 451) < 6) continue; W.tree(x, sr(285, 291)); }
  for (let x = 12; x < 630; x += sr(12, 18)) { if ((x > 48 && x < 128) || (x > DECK.x0 - 6 && x < DECK.x1 + 6) || (x > POND.x - POND.r - 4 && x < POND.x + POND.r + 4)) continue;
    if (BENCHES.some(b => Math.abs(b.x - x) < 3 && b.z > 290)) continue; W.tree(x, sr(333, 339.5)); }
  [[20,294],[110,294],[200,294],[290,294],[350,294],[460,294],[560,294],[625,294]].forEach(p => W.lamp(p[0], p[1]));
}
