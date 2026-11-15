// 구역을 잇는 공용 지형: 간이역과 철길, 북쪽 도로(들어갈 수 없음), 육교, 남북 도로와 마을버스 순환 도로, 보도, 강변도로, 강변.
// 바닥 원칙(2026-11-14 사용자 요청): 걸을 수 있는 땅은 포장 · 화단 · 자갈밭 · 아스팔트 가운데 하나를 깐다. 맨 눈밭으로 비워 두지 않는다.
//   예외는 강변 둔치의 서쪽 눈밭과 눈썰매장. 바닥판은 재질별로 모아 그린다 (그리기 횟수 = 재질 수).
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { M, box as gbox, canvasTex } from '../core/gfx.js';
import { sr } from '../core/util.js';
import { W } from '../world/world.js';
import { flatXZ, box, Parts, tint } from '../core/meshkit.js';
import { schoolZoneMaterial, roadPaintMaterial, decalMaterial, asphaltMaterial, paverMaterial, brickPaveMaterial, bedMaterial, concreteMaterial, gravelMaterial, permeableMaterial } from '../core/texkit.js';
import { quadY, mulberry } from '../props/kit.js';
import { layTrack } from '../props/railway.js';
import { decorateGround } from './groundDecor.js';
import { FONT_D, UNIT as U } from '../config.js';
import { BANK, ROAD, NROAD, RAILS, SIDING, PLAT, DOCK, BRIDGE, LOOP, PATHS, HILL, BENCHES, CROSS_N, CROSS_S } from './layout.js';

const PI = Math.PI, R = mulberry(77);
// ── 바닥판 모음: 재질 키별로 모았다가 마지막에 한 번에 그린다 ──
export const GROUND = new Parts();
const Y = {snowbed:.012, gravel:.014, road:.025, side:.04, bed:.05, path:.06, paint:.03};
export const REGIONS = [];                                                        // 바닥판 목록 [재질 키, x0, z0, x1, z1, 높이] (꾸밈 메쉬를 흩어 놓을 때 쓴다)
export const CURBS = [];                                                          // 경계석 목록 (눈 더미를 붙인다)
export const slab = (key, x0, z0, x1, z1, y = Y.side) => { REGIONS.push([key, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), y]); return GROUND.add(key, flatXZ(x0, z0, x1, z1, y), 0xffffff); };
export const curb = (x0, z0, x1, z1, h = .17) => { CURBS.push([x0, z0, x1, z1, h]); return GROUND.add('curb', box(x0, 0, z0, x1, h, z1, .03), 0xc4c6c4); };
// 경계석을 두른 화단 (나무 띠): 바깥 테두리 경계석 + 안쪽 화단 바닥
export function bedStrip(x0, z0, x1, z1){ const t = .3; curb(x0, z0, x1, z0 + t, .19); curb(x0, z1 - t, x1, z1, .19); curb(x0, z0 + t, x0 + t, z1 - t, .19); curb(x1 - t, z0 + t, x1, z1 - t, .19); slab('bed', x0 + t, z0 + t, x1 - t, z1 - t, .13); }
const MATS = () => ({asphalt:asphaltMaterial(), paver:paverMaterial(), brick:brickPaveMaterial(), bed:bedMaterial(), gravel:gravelMaterial({seed:107, snow:.06, grass:.2}), perm:permeableMaterial(),
  bike:permeableMaterial({seed:127, tone:[.52, .3, .27], dust:.18}), curb:concreteMaterial(), zone:schoolZoneMaterial(), snowbed:bedMaterial({seed:83, grass:.08})});
export function finishGround(){ const m = MATS(); for (const k of Object.keys(GROUND.m)) root.add(GROUND.mesh(k, m[k] || m.paver, {cast:false})); }
// 가로수 · 나무를 줄로 심을 때 쓰는 목록 (마지막에 인스턴스로 한 번에)
export const TREES = {bare:[[], [], [], [], [], []], pine:[[], [], []]};          // 겨울 나무는 둥근 수형 여섯 가지
const tree = (x, z, s = .95, v = 0) => TREES.bare[v % 6].push({x, z, rot:R() * 6, s}), pine = (x, z, v = 0) => TREES.pine[v % 3].push({x, z, rot:R() * 6});
const run = (a, b, step) => { const out = []; for (let v = a; v <= b + 1e-6; v += step) out.push(v); return out; };
const near = (v, list, d) => list.some(c => Math.abs(v - c) < d);
const lamps = [];

// ───────── 간이역과 철길 ─────────
export function buildRailway(){
  // 바닥: 벽돌벽부터 녹지 띠까지 자갈 · 마른 풀밭, 육교 발치는 포장
  slab('gravel', -60, 31, 700, 68, Y.gravel);
  slab('paver', 222, 47.5, 237, 68, Y.side); curb(222, 47.4, 237, 47.7, .12); curb(221.7, 47.4, 222, 68, .12);
  // 녹지 띠 (경계석 화단) + 메타세쿼이아 줄
  bedStrip(-60, 68, 700, 77.4);
  run(10, 630, 16).filter(x => Math.abs(x - BRIDGE.x) > 4).forEach((x, i) => tree(x, 72.7, 1.15 + (i % 3) * .08, 3));
  // 북쪽 벽돌벽 (z 31) + 양 끝 꺾인 벽, 벽 너머 나무
  const walls = []; for (let x = -60 + 1.41; x < 700; x += 2.4 * U) walls.push({x, z:31});
  [6, 634].forEach(x => { for (let z = 31 + 1.41 + .3; z < 77.4; z += 2.4 * U) walls.push({x, z, rot:PI / 2}); });
  W.placeMany('brickWall', walls, {collide:false}); W.rect(-60, 30.7, 700, 31.3); W.mmRect(0, 30.6, 640, 31.4, '#b4705c');
  run(-40, 680, 20).forEach((x, i) => tree(x + sr(-3, 3), sr(21, 27), 1.05 + R() * .3, i % 3));
  // 선로: 복선 본선(맵 밖까지)과 끊긴 측선, 차막이
  RAILS.forEach(z => { layTrack(root, {x0:-800, x1:1400, z, sx0:-60, sx1:700}); W.mmRect(0, z - 1.2, 640, z + 1.2, '#8d9aa9'); });
  layTrack(root, {x0:SIDING.x0, x1:SIDING.x1, z:SIDING.z}); W.mmRect(SIDING.x0, SIDING.z - 1, SIDING.x1, SIDING.z + 1, '#8d9aa9');
  W.place('bufferStop', {x:SIDING.x1 - .6, z:SIDING.z, rot:-PI / 2, y:.35});
  // 버려진 객차 (예전 자리)
  const tex = canvasTex(512, 96, g => { g.fillStyle = '#9b6a58'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#7c5546'; g.fillRect(0, 70, 512, 26);
    for (let i = 0; i < 9; i++) { g.fillStyle = i === 3 ? '#c9b8a3' : '#c3d3de'; g.fillRect(14 + i * 55, 18, 38, 34); } g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, 512, 6); });
  const side = M(0x9b6a58), face = new THREE.MeshLambertMaterial({map:tex}), cz = RAILS[1];
  W.blockers.push(gbox(64, cz - 1.4, 88, cz + 1.4, 3.4, [side, side, M(0xf8fbfd), side, face, face], .95)); W.rect(64, cz - 1.4, 88, cz + 1.4);
  gbox(63.8, cz - 1.6, 88.2, cz + 1.6, .2, M(0xf8fbfd), 4.35); W.mmRect(64, cz - 1.4, 88, cz + 1.4, '#a7796a'); W.mmLabel(76, 36, '버려진 객차', 16);
  // 승강장 · 대합 지붕 · 난간 · 역명판 · 화물 홈
  const pl = (PLAT.x1 - PLAT.x0) / U, pw = (PLAT.z1 - PLAT.z0) / U;
  W.place('platformModule', {x:(PLAT.x0 + PLAT.x1) / 2, z:(PLAT.z0 + PLAT.z1) / 2, y:0, len:pl, wid:pw}); W.rect(PLAT.x0 + 3.6, PLAT.z1 - .1, PLAT.x1 - 3.6, PLAT.z1 + .5);
  W.mmRect(PLAT.x0, PLAT.z0, PLAT.x1, PLAT.z1, '#d9cdb8'); W.mmLabel(272, 50.7, '동화역', 16);
  W.place('stationCanopy', {x:277, z:53.3, rot:PI, len:30 / U}); for (let i = 0; i < 7; i++) W.circle(277 + (-15 + .35 + (30 - .7) * i / 6), 53.3, .2);
  const fen = []; for (let x = PLAT.x0 + 3.6 + 1.18; x < PLAT.x1 - 3.6; x += 2 * U) fen.push({x, z:53.58, y:.5 * U}); W.placeMany('railFence', fen, {collide:false});
  W.place('stationSign', {x:250, z:50.7}); W.place('stationSign', {x:224.6, z:53, rot:PI / 2});
  W.place('platformModule', {x:(DOCK.x0 + DOCK.x1) / 2, z:(DOCK.z0 + DOCK.z1) / 2, y:0, len:(DOCK.x1 - DOCK.x0) / U, wid:(DOCK.z1 - DOCK.z0) / U, h:1, ramp:2});
  [[244, 49.6], [262, 49.6], [292, 49.6], [304, 49.6], [226, 66], [235, 66]].forEach(([x, z]) => lamps.push({x, z, y:W.groundY(x, z)}));
  // 육교 (북쪽 계단 → 도로 위 → 남쪽 육교 마당)
  W.place('footBridge', {x:BRIDGE.x, z:BRIDGE.z}); W.mmRect(BRIDGE.x - 1.4, 54.6, BRIDGE.x + 1.4, 105.4, '#7a98ad'); W.mmLabel(BRIDGE.x + 8, 72, '육교', 12);
}

// ───────── 도로와 보도 ─────────
export function buildStreets(){
  const L = LOOP, P = new Parts(), D = new Parts(), RY = Y.road, posts = [];
  const lin = (x0, z0, x1, z1, c = 0xf2f4f5, y = RY) => P.add('lin', flatXZ(x0, z0, x1, z1, y + .012), c);
  const mark = (x, z, w, h, ang, uv, y = RY) => { const g = quadY(-w / 2, -h / 2, w / 2, h / 2, y + .014, uv); g.rotateY(ang); g.translate(x, 0, z); D.add('m', g); };
  const DIA = [0, 0, .25, 1], TXT = [.25, 0, 1, 1], WH = 0xf2f4f5, YE = 0xe9b824, tact = [];
  // 횡단보도: 줄무늬는 차가 달리는 방향으로 길고(길이 = 횡단보도 폭), 건너는 방향으로 늘어선다.
  const crossX = (x, z0, z1, w = 5.2) => { for (let z = z0 + .45; z < z1 - .6; z += 1.05) lin(x - w / 2, z, x + w / 2, z + .55); tact.push({x, z:z0 - .55}, {x, z:z1 + .55}); };   // 동서 도로를 남북으로 건넌다
  const crossZ = (z, x0, x1, w = 4.6) => { for (let x = x0 + .3; x < x1 - .5; x += .95) lin(x, z - w / 2, x + .5, z + w / 2); tact.push({x:x0 - .55, z, rot:PI / 2}, {x:x1 + .55, z, rot:PI / 2}); };   // 남북 도로를 동서로 건넌다

  // ── 북쪽 도로 (역앞길): 맵 밖까지 이어지고, 양옆 울타리로 막는다 ──
  slab('asphalt', -800, NROAD.z0, 1400, NROAD.z1, RY); W.mmRect(0, NROAD.z0, 640, NROAD.z1, '#a3afbe');
  const NM = (NROAD.z0 + NROAD.z1) / 2; lin(-800, NM - .32, 1400, NM - .16, YE); lin(-800, NM + .16, 1400, NM + .32, YE); lin(-800, NROAD.z0 + .4, 1400, NROAD.z0 + .55); lin(-800, NROAD.z1 - .55, 1400, NROAD.z1 - .4);
  const fence = []; const fenceLine = (z, gaps) => { for (let x = 6 + 1.18; x < 634; x += 2 * U) if (!gaps.some(([a, b]) => x > a - 1.2 && x < b + 1.2)) fence.push({x, z}); };
  fenceLine(NROAD.z0 - .3, [[BRIDGE.x - 2.4, BRIDGE.x + 2.4]]); fenceLine(NROAD.z1 + .3, [[L.x0, L.x0 + L.w], [L.x1 - L.w, L.x1], [BRIDGE.x - 2.4, BRIDGE.x + 2.4]]);
  W.placeMany('roadFence', fence, {collide:false}); [NROAD.z0, NROAD.z1].forEach(z => W.mmRect(6, z - .5, 634, z + .5, '#8a8f96'));
  // ── 서쪽 도로 (어린이 보호구역) · 동쪽 도로 · 순환 도로 (윗길 · 남쪽 뒷길) ──
  const SZ = {x0:L.x0, x1:L.x0 + L.w, z0:98, z1:250}, cx = L.x0 + L.w / 2, ex = L.x1 - L.w / 2, zN = L.zN, zS = L.zS, w = L.w;
  slab('asphalt', L.x0, NROAD.z1, L.x0 + w, SZ.z0, RY); slab('asphalt', L.x0, SZ.z1, L.x0 + w, ROAD.z0, RY); slab('zone', SZ.x0, SZ.z0, SZ.x1, SZ.z1, RY);
  slab('asphalt', L.x1 - w, NROAD.z1, L.x1, ROAD.z0, RY);
  slab('asphalt', L.x0 + w, zN, L.x1 - w, zN + w, RY); slab('asphalt', L.x0 + w, zS, L.x1 - w, zS + w, RY);
  [[L.x0, NROAD.z1, L.x0 + w, ROAD.z0], [L.x1 - w, NROAD.z1, L.x1, ROAD.z0], [L.x0, zN, L.x1, zN + w], [L.x0, zS, L.x1, zS + w]].forEach(r => W.mmRect(r[0], r[1], r[2], r[3], '#b0bbc8'));
  W.mmRect(SZ.x0, SZ.z0, SZ.x1, SZ.z1, '#d3a39b');
  // 순환 도로 중앙선(노랑 점선)과 바깥선, 교차로 정지선
  [zN, zS].forEach(z0 => { for (let x = L.x0 + w + 3; x < L.x1 - w - 3; x += 6) lin(x, z0 + w / 2 - .08, x + 3, z0 + w / 2 + .08, YE);
    lin(L.x0 + w + 1, z0 + .3, L.x1 - w - 1, z0 + .42); lin(L.x0 + w + 1, z0 + w - .42, L.x1 - w - 1, z0 + w - .3);
    lin(L.x0 + w + .6, z0 + w / 2, L.x0 + w + 1, z0 + w - .2); lin(L.x1 - w - 1, z0 + .2, L.x1 - w - .6, z0 + w / 2); });
  // 동쪽 도로 중앙선
  lin(ex - .22, NROAD.z1 + 1, ex - .06, ROAD.z0 - 1, YE); lin(ex + .06, NROAD.z1 + 1, ex + .22, ROAD.z0 - 1, YE);
  // 서쪽 도로 북쪽 끝: 육교 마당으로 건너는 고원식 횡단보도 (노랑 · 흰 줄)
  for (let k = 0, x = L.x0 + .3; x < L.x0 + w - .5; x += .95, k++) lin(x, 94, x + .5, 98, k % 2 ? WH : YE, RY + .02);
  tact.push({x:L.x0 - .55, z:96, rot:PI / 2}, {x:L.x0 + w + .55, z:96, rot:PI / 2});
  // 남북 도로를 건너는 횡단보도 (기존 보행로 자리) + 정지선, 마름모(예고): 서쪽 차로는 남쪽으로, 동쪽 차로는 북쪽으로 달린다
  [L.x0, L.x1 - w].forEach(x0 => [PATHS.a, PATHS.b].forEach(z => { crossZ(z, x0, x0 + w);
    lin(x0 + .15, z - 3.9, x0 + w / 2 - .15, z - 3.5); lin(x0 + w / 2 + .15, z + 3.5, x0 + w - .15, z + 3.9);
    mark(x0 + w * .25, z - 11, 1.5, 3.6, 0, DIA); mark(x0 + w * .75, z + 11, 1.5, 3.6, 0, DIA); }));
  // 순환 도로를 건너는 횡단보도 (공원 입구 · 상가 계단 앞) + 과속방지턱
  CROSS_N.forEach(x => crossX(x, zN, zN + w)); CROSS_S.forEach(x => crossX(x, zS, zS + w));
  [[292, zN], [356, zN], [277, zS], [352, zS]].forEach(([x, z0]) => W.place('roadHump', {x, z:z0 + w / 2, y:RY, rot:PI / 2, w:(w - .3) / U}));
  // 어린이 보호구역: 노란 중앙선(교차로 · 횡단보도 앞은 끊는다), 중앙선 위 차선규제봉, 차로마다 흰 글자
  [[SZ.z0, zN - 1], [zN + w + 1, PATHS.a - 3.9], [PATHS.a + 3.9, PATHS.b - 3.9], [PATHS.b + 3.9, zS - 1], [zS + w + 1, SZ.z1]].forEach(([a, b]) => { if (b - a < 2) return;
    lin(cx - .22, a, cx - .06, b, YE); lin(cx + .06, a, cx + .22, b, YE); for (let z = a + 2; z <= b - 2; z += 3) posts.push({x:cx, z, y:RY}); });
  [108, 152, 182, 238].forEach(z => mark(L.x0 + w * .25, z, 2.6, 7.8, PI, TXT)); [110, 154, 186, 240].forEach(z => mark(L.x0 + w * .75, z, 2.6, 7.8, 0, TXT));
  W.mmLabel(cx, 170, '어린이 보호구역', 9);

  // ── 강변도로: 맵 밖까지, 4차로. 양옆은 투명벽(횡단보도로만 건넌다) ──
  slab('asphalt', -800, ROAD.z0, 1400, ROAD.z1, RY); W.mmRect(0, ROAD.z0, 640, ROAD.z1, '#a3afbe');
  const RM = (ROAD.z0 + ROAD.z1) / 2, CW = [177, 451];
  [[-800, CW[0] - 4.4], [CW[0] + 4.4, CW[1] - 4.4], [CW[1] + 4.4, 1400]].forEach(([a, b]) => { lin(a, RM - .32, b, RM - .16, YE); lin(a, RM + .16, b, RM + .32, YE);
    for (let x = a + 2; x < b - 4; x += 9) [RM - 4, RM + 4].forEach(z => lin(x, z - .08, x + 4.5, z + .08)); });
  lin(-800, ROAD.z0 + .4, 1400, ROAD.z0 + .55); lin(-800, ROAD.z1 - .55, 1400, ROAD.z1 - .4);
  CW.forEach(x => { crossX(x, ROAD.z0, ROAD.z1);
    lin(x - 4.2, RM + .3, x - 3.8, ROAD.z1 - .3); lin(x + 3.8, ROAD.z0 + .3, x + 4.2, RM - .3);               // 정지선: 남쪽 차로는 동쪽으로, 북쪽 차로는 서쪽으로 달린다
    mark(x - 13, RM + 4, 1.6, 4, PI / 2, DIA); mark(x + 13, RM - 4, 1.6, 4, PI / 2, DIA);
    for (let d = 6; d <= 21; d += 3) posts.push({x:x - d, z:RM, y:RY}, {x:x + d, z:RM, y:RY}); });
  [[ROAD.z0 - .4, ROAD.z0], [ROAD.z1, ROAD.z1 + .4]].forEach(([z0, z1]) => { W.rect(6, z0, CW[0] - 2.6, z1); W.rect(CW[0] + 2.6, z0, CW[1] - 2.6, z1); W.rect(CW[1] + 2.6, z0, 634, z1); });   // 투명벽
  CW.forEach(x => [[x - 2.9, x - 2.6], [x + 2.6, x + 2.9]].forEach(([a, b]) => W.rect(a, ROAD.z0, b, ROAD.z1)));   // 횡단보도 양옆도 투명벽 (차도로 걸어 나가지 못하게)

  // 칠 · 표지 그리기
  const marks = new THREE.Mesh(D.geo('m'), decalMaterial(canvasTex(1024, 768, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); g.fillStyle = g.strokeStyle = 'rgba(244,246,247,.94)';
    g.lineWidth = 16; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(128, 14); g.lineTo(240, 384); g.lineTo(128, 754); g.lineTo(16, 384); g.closePath(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.translate(640, 0); g.scale(1, 1.55);
    g.font = '150px ' + FONT_D; g.fillText('어린이', 0, 76); g.fillText('보호구역', 0, 210); g.restore();
    g.lineWidth = 20; g.beginPath(); g.arc(640, 600, 118, 0, 7); g.stroke(); g.font = '150px ' + FONT_D; g.fillText('30', 640, 608); }), {alpha:true, rough:.9}));
  marks.receiveShadow = true; root.add(marks); root.add(P.mesh('lin', roadPaintMaterial(), {cast:false}));
  W.placeMany('laneDelineator', posts);
  W.placeMany('tactileStrip', tact.map(t => ({...t, y:Y.side + .005})), {cols:14, rows:2});

  // ── 신호등: 강변도로 횡단보도와 서쪽 도로 보행로 ──
  CW.forEach(x => { W.place('trafficLight', {x:x + 5.2, z:ROAD.z1 + .9, rot:-PI / 2, arm:5.2}); W.place('trafficLight', {x:x - 5.2, z:ROAD.z0 - .9, rot:PI / 2, arm:5.2});
    W.place('pedSignal', {x:x + 3.4, z:ROAD.z0 - .7, rot:0}); W.place('pedSignal', {x:x - 3.4, z:ROAD.z1 + .7, rot:PI}); });
  [[PATHS.a, -4.6, -5.4], [PATHS.b, 4.6, -5.4]].forEach(([z, ds, dn]) => {
    W.place('trafficLight', {x:L.x0 - .8, z:z + ds, rot:PI, arm:3.4}); W.place('trafficLight', {x:L.x0 + w + .8, z:z + dn, rot:0, arm:3.4});
    W.place('pedSignal', {x:L.x0 - .7, z:z - 3, rot:PI / 2}); W.place('pedSignal', {x:L.x0 + w + .7, z:z + 3, rot:-PI / 2}); });

  // ── 보도 (연석까지 블록) ──
  const sideX = (x0, x1, z0, z1, holes = []) => { let a = z0; [...holes, [z1, z1]].forEach(([h0, h1]) => { if (h0 > a) slab('paver', x0, a, x1, h0); a = Math.max(a, h1); }); };
  sideX(186, L.x0, NROAD.z1, ROAD.z0, [[131, 139], [198, 206]]); curb(L.x0 - .25, NROAD.z1, L.x0, 131); curb(L.x0 - .25, 139, L.x0, 198); curb(L.x0 - .25, 206, L.x0, ROAD.z0);   // 단지 앞 (서쪽 도로 서쪽)
  sideX(L.x0 + w, 206, NROAD.z1, ROAD.z0, [[zN, zN + w], [zS, zS + w]]); sideX(434, L.x1 - w, NROAD.z1, ROAD.z0, [[zN, zN + w], [zS, zS + w]]);                         // 상가 블록 양옆
  sideX(L.x1, 464, NROAD.z1, ROAD.z0); slab('paver', 464, NROAD.z1, 634, 93); slab('paver', 464, 243, 634, ROAD.z0);                                              // 학교 쪽
  slab('paver', 206, NROAD.z1, 434, 94);                                                                                                                         // 상가 블록 북쪽
  slab('paver', 15.6, 250.5, 186, ROAD.z0); bedStrip(15.6, 245.8, 186, 250.5); slab('paver', 206, 251, 434, ROAD.z0);                                                 // 강변도로 북쪽 보도
  slab('paver', 6, 272, 634, 275); curb(6, 271.8, 634, 272.1);                                                                                                     // 강변 보도
  // 단지 북쪽 · 서쪽 바깥 띠 (들어갈 수 없음): 보도와 화단으로 채운다
  slab('paver', 6, NROAD.z1, 186, 93); bedStrip(6, 93, 186, 95.4); bedStrip(6, 95.4, 15.4, 250.5);
  run(24, 180, 13).forEach((x, i) => (i % 2 ? pine(x, 94.2, i) : tree(x, 94.2, 1, i))); run(104, 245, 13).forEach((z, i) => (i % 2 ? pine(10.6, z, i + 1) : tree(10.6, z, 1, i)));
  // 가로수 (보도 화단 칸)
  run(102, 250, 12).forEach(z => { if (!near(z, [130, 135, 202, 207, 96, zN + 3.5, zS + 3.5], 6)) [190.6, 204, 436, 450].forEach((x, i) => tree(x, z, .95, i)); });
  run(20, 630, 15).forEach((x, i) => { if (!near(x, [198, 441, ...CW], 7)) tree(x, 253.6, .95, i); });
  // 가로등: 순환 도로 · 남북 도로 · 강변도로
  [...run(214, 430, 22).map(x => [x, zN - 1]), ...run(225, 430, 22).map(x => [x, zN + w + 1]), ...run(214, 430, 22).map(x => [x, zS - 1]), ...run(225, 430, 22).map(x => [x, zS + w + 1]),
    ...run(100, 250, 22).map(z => [L.x0 - 1.1, z]), ...run(111, 250, 22).map(z => [L.x1 + 1.1, z]), ...run(14, 630, 22).map(x => [x, 254.8]), ...run(25, 630, 22).map(x => [x, 273.5])]
    .forEach(([x, z]) => { if (!near(x, [...CROSS_N, ...CROSS_S, ...CW], 3.5) && !near(z, [PATHS.a, PATHS.b], 3.5)) lamps.push({x, z}); });
}

// ───────── 강변 ─────────
export function buildRiverside(){
  const by = BANK;
  // 자전거 도로 (사면 아래 ~ 산책로 앞, 붉은 투수 포장): 가운데 흰 점선, 양 끝 흰 선, 자전거 그림
  slab('bike', -200, 284, 840, 297, by + .03); curb(-200, 283.8, 840, 284.1, .1); curb(-200, 296.9, 840, 297.2, .1);
  const P = new Parts(), lin = (x0, z0, x1, z1, c = 0xf2f4f5) => P.add('lin', flatXZ(x0, z0, x1, z1, by + .045), c);
  for (let x = -200; x < 840; x += 6) lin(x, 290.42, x + 3, 290.58); lin(-200, 284.5, 840, 284.62); lin(-200, 296.38, 840, 296.5);
  const D = new Parts(); run(20, 620, 50).forEach(x => { [[287.2, 0], [293.8, PI]].forEach(([z, a]) => { const g = quadY(-1.4, -1, 1.4, 1, by + .05); g.rotateY(a); g.translate(x, 0, z); D.add('b', g); }); });
  const bike = new THREE.Mesh(D.geo('b'), decalMaterial(canvasTex(256, 192, g => { g.clearRect(0, 0, 256, 192); g.strokeStyle = g.fillStyle = 'rgba(244,246,247,.93)'; g.lineWidth = 9; g.lineCap = 'round';
    [[70, 120], [180, 120]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 34, 0, 7); g.stroke(); }); g.beginPath(); g.moveTo(70, 120); g.lineTo(110, 70); g.lineTo(160, 70); g.lineTo(180, 120); g.moveTo(110, 70); g.lineTo(125, 120); g.lineTo(160, 70); g.moveTo(100, 58); g.lineTo(122, 58); g.moveTo(160, 70); g.lineTo(156, 52); g.lineTo(172, 50); g.stroke();
    g.beginPath(); g.moveTo(40, 22); g.lineTo(216, 22); g.stroke(); g.beginPath(); g.moveTo(216, 22); g.lineTo(196, 10); g.lineTo(196, 34); g.closePath(); g.fill(); }), {alpha:true, rough:.9}));
  bike.receiveShadow = true; root.add(bike); root.add(P.mesh('lin', roadPaintMaterial(), {cast:false})); W.mmRect(0, 284, 640, 297, '#c99a92');
  // 산책로 (둔치 동쪽, 베이지 투수 포장): 가장자리 회색 블록 띠
  slab('perm', 130, 297.2, 700, 331.6, by + .03); slab('paver', 130, 297.2, 700, 298.4, by + .04); slab('paver', 130, 330.4, 700, 331.6, by + .04); curb(129.7, 297.2, 130, 331.6, .12);
  W.mmRect(130, 297, 640, 332, '#e6dcc8'); W.mmLabel(390, 315, '강변 산책로', 14);
  // 둔치 서쪽 눈밭 · 눈썰매장 (평평한 눈밭)
  slab('snowbed', 6 - 80, 297.2, 130, 332, by + .02); W.mmRect(0, 297, 130, 332, '#eef3ef');
  // 물가 길 (끊김 없이) + 갈대 띠
  slab('perm', -200, 332.4, 840, 336, by + .03); curb(-200, 331.9, 840, 332.4, .12); W.mmRect(0, 332, 640, 336, '#e6dcc8');
  const reeds = []; for (let x = -20; x < 660; x += 3.2 + R() * 2) reeds.push({x, z:337.6 + R() * 3, rot:R() * 6, s:.9 + R() * .45});
  reeds.forEach(r => r.y = by); W.placeMany('reedClump', reeds, {collide:false});
  // 둔치 계단 (예전 자리)과 난간
  [177, 451].forEach(cx => { for (let i = 0; i < 7; i++) gbox(cx - 2, 275 + i, cx + 2, 276 + i, BANK * (i + .5) / 7 + 3.6, M(0xd3dbe3), BANK - .6); });
  const gr = []; for (let x = 6 + 1.18; x < 634; x += 2 * U) if (!near(x, [177, 451], 3.3)) gr.push({x, z:274.6}); W.placeMany('roadFence', gr, {light:true});
  const rf = []; for (let x = 6 + 1.18; x < 634; x += 2 * U) rf.push({x, z:341.7, y:by}); W.placeMany('roadFence', rf, {light:true});
  // 산책로 가로등 · 물가 쪽 나무
  run(140, 630, 20).forEach(x => lamps.push({x, z:298.9, y:by}));
  run(150, 630, 24).forEach((x, i) => TREES.bare[i % 6].push({x:x + sr(-3, 3), z:330.2, y:by, rot:R() * 6, s:1 + R() * .2}));
  run(20, 120, 14).forEach((x, i) => { if (Math.abs(x - HILL.x) > 20) pine(x, 302 + (i % 2) * 22, i); });
}

// 마지막에 바닥 · 나무 · 가로등을 한 번에 그린다 (구역 파일이 GROUND · TREES에 더한 것까지)
export function finishBase(){
  decorateGround(REGIONS, CURBS, TREES);            // 바닥 꾸밈 메쉬 (얼룩 · 눈 쌓인 자리 · 금 · 바퀴 자국 · 눈 더미 · 마른 풀)
  finishGround();
  const bounds = W.bounds; W.bounds = () => true;                       // 걸을 수 없는 띠(벽 너머 · 방음벽 바깥)에도 나무는 심는다. 다른 소품과 겹치는 자리만 뺀다
  const free = p => !W.blocked(p.x, p.z);
  TREES.bare.forEach((list, v) => W.placeMany('bareTree', list.filter(free), {v, lite:true}));          // 거리 · 공원 나무는 가지를 세 단까지만 (가벼운 나무)
  TREES.pine.forEach((list, v) => W.placeMany('pineTree', list.filter(free), {v}));
  const ls = lamps.filter(free); W.bounds = bounds;
  W.placeMany('parkLamp', ls);
}
export { lamps as LAMPS };
