// 구역을 잇는 공용 지형: 간이역과 철길, 북쪽 도로(들어갈 수 없음), 육교, 남북 도로와 마을버스 순환 도로, 보도, 강변도로, 강변.
// 바닥 원칙(2026-11-14 사용자 요청): 걸을 수 있는 땅은 포장 · 화단 · 자갈밭 · 아스팔트 가운데 하나를 깐다. 맨 눈밭으로 비워 두지 않는다.
//   예외는 강변 둔치의 서쪽 눈밭과 눈썰매장. 바닥판은 재질별로 모아 그린다 (그리기 횟수 = 재질 수).
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { M, box as gbox, canvasTex } from '../core/gfx.js';
import { sr } from '../core/util.js';
import { W } from '../world/world.js';
import { flatXZ, box, Parts, tint } from '../core/meshkit.js';
import { schoolZoneMaterial, roadPaintMaterial, decalMaterial, asphaltMaterial, paverMaterial, brickPaveMaterial, bedMaterial, concreteMaterial, gravelMaterial, permeableMaterial, plasticMaterial, iceMaterial, antiTile } from '../core/texkit.js';
import { quadY, mulberry } from '../props/kit.js';
import { layTrack } from '../props/railway.js';
import { poleWires } from '../props/utilityPole.js';
import { decorateGround } from './groundDecor.js';
import { FONT_D, UNIT as U } from '../config.js';
import { WALK, BANK, ROAD, NROAD, RAILS, SIDING, PLAT, DOCK, BRIDGE, BRIDGE2, BRIDGES, RSIDE, STATION_X, LOOP, PATHS, SLED, BENCHES, CROSS_N, CROSS_S, BIG, SCHOOL, PHONES } from './layout.js';

const PI = Math.PI, R = mulberry(77);
// ── 바닥판 모음: 재질 키별로 모았다가 마지막에 한 번에 그린다 ──
export const GROUND = new Parts();
// 보도는 도로보다 한 단(약 13cm) 높다 (2026-11-16). 화단은 보도보다 조금 더 높은 경계석 안에 있다.
export const Y = {snowbed:.012, gravel:.014, road:.025, side:.15, bed:.05, path:.06, paint:.03};
export const REGIONS = [];                                                        // 바닥판 목록 [재질 키, x0, z0, x1, z1, 높이] (꾸밈 메쉬를 흩어 놓을 때 쓴다)
export const CURBS = [];                                                          // 경계석 목록 (눈 더미를 붙인다)
// 보도 높이 판(y가 Y.side인 바닥판)은 RAISED 칸 목록에 모아 걷는 높이로 쓴다 (prio -1: 계단 · 테라스 같은 소품 높이가 먼저)
const RAISED = new Map(), RC = 16, rkey = (i, j) => i * 4096 + j;
export const raise = (x0, z0, x1, z1, y = Y.side) => { for (let i = Math.floor(x0 / RC); i <= Math.floor(x1 / RC); i++) for (let j = Math.floor(z0 / RC); j <= Math.floor(z1 / RC); j++) { const k = rkey(i, j); if (!RAISED.has(k)) RAISED.set(k, []); RAISED.get(k).push([x0, z0, x1, z1, y]); } };
W.addHeight((x, z) => { const l = RAISED.get(rkey(Math.floor(x / RC), Math.floor(z / RC))); if (!l) return null; for (const r of l) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return r[4]; return null; }, -1);
export const slab = (key, x0, z0, x1, z1, y = Y.side) => { REGIONS.push([key, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), y]); if (y === Y.side) raise(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1));
  return GROUND.add(key, flatXZ(x0, z0, x1, z1, y), 0xffffff); };
// 경계석은 모아 두었다가 마무리할 때 그린다: 횡단보도 끝(CUTS)은 잘라 낸다 (턱 없이 건너게, 2026-11-16)
const CURB_RAW = []; export const CUTS = [];
export const curb = (x0, z0, x1, z1, h = .17, y = 0) => { CURB_RAW.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), h, y]); };   // y: 둔치처럼 낮은 바닥이면 그 높이
export const curbCut = (x0, z0, x1, z1) => CUTS.push([x0, z0, x1, z1]);
function buildCurbs(){
  for (const c of CURB_RAW) { const horiz = c[2] - c[0] >= c[3] - c[1], a0 = horiz ? c[0] : c[1], a1 = horiz ? c[2] : c[3];
    let segs = [[a0, a1]];
    for (const k of CUTS) { if (k[0] >= c[2] || k[2] <= c[0] || k[1] >= c[3] || k[3] <= c[1]) continue; const k0 = horiz ? k[0] : k[1], k1 = horiz ? k[2] : k[3];
      segs = segs.flatMap(([s0, s1]) => k1 <= s0 || k0 >= s1 ? [[s0, s1]] : [[s0, k0], [k1, s1]].filter(([p, q]) => q - p > .05)); }
    segs.forEach(([s0, s1]) => { const r = horiz ? [s0, c[1], s1, c[3]] : [c[0], s0, c[2], s1]; CURBS.push([...r, c[4], c[5]]); GROUND.add('curb', box(r[0], c[5], r[1], r[2], c[5] + c[4], r[3], .03), 0xc4c6c4); }); } }
// 경계석을 두른 화단 (나무 띠): 바깥 테두리 경계석 + 안쪽 화단 바닥
export function bedStrip(x0, z0, x1, z1){ const t = .3, h = .27; curb(x0, z0, x1, z0 + t, h); curb(x0, z1 - t, x1, z1, h); curb(x0, z0 + t, x0 + t, z1 - t, h); curb(x1 - t, z0 + t, x1, z1 - t, h); slab('bed', x0 + t, z0 + t, x1 - t, z1 - t, .21); }   // 보도(.15)보다 높게
const MATS = () => ({asphalt:asphaltMaterial(), paver:paverMaterial(), brick:brickPaveMaterial(), bed:bedMaterial(), gravel:gravelMaterial({seed:107, snow:.06, grass:.2}), perm:permeableMaterial(),
  bike:permeableMaterial({seed:127, tone:[.52, .3, .27], dust:.18}), paint:roadPaintMaterial(), curb:concreteMaterial(), zone:schoolZoneMaterial(), snowbed:bedMaterial({seed:83, grass:.08}), sled:bedMaterial({seed:91, grass:.03}), ice:iceMaterial(), board:plasticMaterial({rough:.5})});
const ANTI = {asphalt:{}, zone:{strength:.16}, gravel:{strength:.28}, bike:{strength:.18}, perm:{strength:.18}, snowbed:{strength:.12}, sled:{strength:.1}, bed:{strength:.14}};   // 반복 무늬 깨기를 쓰는 바닥
export function finishGround(){ const m = MATS(); for (const k of Object.keys(GROUND.m)) { const mat = m[k] || m.paver; if (ANTI[k]) antiTile(mat, ANTI[k]); root.add(GROUND.mesh(k, mat, {cast:false})); } }
// 가로수 · 나무를 줄로 심을 때 쓰는 목록 (마지막에 인스턴스로 한 번에)
export const TREES = {bare:[[], [], [], [], [], []], pine:[[], [], []]};          // 겨울 나무는 둥근 수형 여섯 가지
const tree = (x, z, s = .95, v = 0) => TREES.bare[v % 6].push({x, z, rot:R() * 6, s}), pine = (x, z, v = 0) => TREES.pine[v % 3].push({x, z, rot:R() * 6});
const run = (a, b, step) => { const out = []; for (let v = a; v <= b + 1e-6; v += step) out.push(v); return out; };
const near = (v, list, d) => list.some(c => Math.abs(v - c) < d);
const lamps = [];
// 울타리 한 줄 (2026-11-15): a부터 b까지 2m 칸을 고르게 나눠 양 끝이 정확히 맞게 놓는다 (칸끼리 살짝 겹칠 수 있다). axis 'x'면 x 방향 줄(z 고정)
export function fenceRun(out, a, b, c, axis = 'x', extra = {}){ const L = b - a, M = 2 * U; if (L < .5) return;
  const n = Math.max(1, Math.ceil(L / M)), step = n > 1 ? (L - M) / (n - 1) : 0;
  for (let i = 0; i < n; i++) { const t = n > 1 ? a + M / 2 + i * step : (a + b) / 2; out.push(axis === 'x' ? {x:t, z:c, ...extra} : {x:c, z:t, rot:PI / 2, ...extra}); } }
const fenceGaps = (out, a, b, c, gaps, axis, extra) => { let s = a; [...gaps].sort((p, q) => p[0] - q[0]).concat([[b, b]]).forEach(([g0, g1]) => { if (g0 > s) fenceRun(out, s, Math.min(g0, b), c, axis, extra); s = Math.max(s, g1); }); };

// ───────── 간이역과 철길 ─────────
export function buildRailway(){
  // 바닥: 벽돌벽부터 녹지 띠까지 자갈 · 마른 풀밭, 육교 발치는 포장
  // (2026-11-18) 자갈 바닥을 도로 경계석(z 77.7)까지 늘렸다: 녹지 띠(G1)와 육교 발치 벽돌 마당(FB · 동쪽 육교)은 없앰
  slab('gravel', -400, 31, 1040, 77.7, Y.gravel);   // (2026-11-17) 선로 쪽 바닥 · 벽 · 나무를 보이는 맵 끝까지
  // 동쪽 육교 발치: 승강장으로 올라가는 두 단
  const B2 = BRIDGE2.x;
  GROUND.add('curb', box(B2 - 1.3, 0, PLAT.z1, B2 + 1.3, .39, PLAT.z1 + .45, .02), 0xc9cbc8); GROUND.add('curb', box(B2 - 1.3, 0, PLAT.z1 + .45, B2 + 1.3, .2, PLAT.z1 + .9, .02), 0xc9cbc8);
  W.addHeight((x, z) => Math.abs(x - B2) < 1.3 && z > PLAT.z1 && z < PLAT.z1 + .9 ? (z < PLAT.z1 + .45 ? .39 : .2) : null);
  // 선로 쪽은 SW · ES 보도 선(x 186, 464) 사이만: 경계에 울타리
  const sf = []; STATION_X.forEach(x => { fenceGaps(sf, 31.3, 77.4, x, [[RAILS[0] - 3, RAILS[1] + 3]], 'z'); W.rect(x - .2, 31, x + .2, 77.4); });   // 선로 위는 울타리 없이 차막이만
  W.placeMany('roadFence', sf, {collide:false});
  // 도로 쪽 경계석 (울타리는 이 위에 선다). (2026-11-18) 녹지 띠 화단과 메타세쿼이아 줄은 자갈 바닥으로 바꿨다
  curb(-400, 77.7, 1040, 78, .27);
  // 북쪽 벽돌벽 (z 31) + 양 끝 꺾인 벽, 벽 너머 나무
  const walls = []; for (let x = -400 + 1.41; x < 1040; x += 2.4 * U) walls.push({x, z:31});
  W.placeMany('brickWall', walls, {collide:false}); W.rect(-400, 30.7, 1040, 31.3); W.mmRect(0, 30.6, 640, 31.4, '#b4705c');
  // (2026-11-18 4차) 벽 너머(R0) 나무는 모두 없앴다
  // 선로: 복선 본선(맵 밖까지)과 끊긴 측선, 차막이
  // 걷는 끝(SW · ES 선) 바깥 본선에 차막이와 출입 금지 바리케이드 (선로는 맵 끝까지 이어진다)
  RAILS.forEach(z => [[STATION_X[0] - 3, PI / 2], [STATION_X[1] + 3, -PI / 2]].forEach(([x, rot]) => { W.place('bufferStop', {x, z, rot, y:.35}); }));
  RAILS.forEach(z => { layTrack(root, {x0:-800, x1:1400, z, sx0:-400, sx1:1040}); W.mmRect(0, z - 1.2, 640, z + 1.2, '#8d9aa9'); });
  layTrack(root, {x0:SIDING.x0, x1:SIDING.x1, z:SIDING.z}); W.mmRect(SIDING.x0, SIDING.z - 1, SIDING.x1, SIDING.z + 1, '#8d9aa9');
  W.place('bufferStop', {x:SIDING.x1 - .6, z:SIDING.z, rot:-PI / 2, y:.35});
  // (2026-11-17) 선로 위 버려진 객차는 없앴다
  // 승강장 · 대합 지붕 · 난간 · 역명판 · 화물 홈
  const pl = (PLAT.x1 - PLAT.x0) / U, pw = (PLAT.z1 - PLAT.z0) / U;
  W.place('platformModule', {x:(PLAT.x0 + PLAT.x1) / 2, z:(PLAT.z0 + PLAT.z1) / 2, y:0, len:pl, wid:pw}); W.rect(PLAT.x0 + 3.6, PLAT.z1 - .1, B2 - 1.4, PLAT.z1 + .5); W.rect(B2 + 1.4, PLAT.z1 - .1, PLAT.x1 - 3.6, PLAT.z1 + .5);
  W.mmRect(PLAT.x0, PLAT.z0, PLAT.x1, PLAT.z1, '#d9cdb8'); W.mmLabel(272, 50.7, '동화역', 16);
  W.place('stationCanopy', {x:277, z:53.3, rot:PI, len:30 / U}); for (let i = 0; i < 7; i++) W.circle(277 + (-15 + .35 + (30 - .7) * i / 6), 53.3, .2);
  W.place('stationCanopy', {x:428, z:53.3, rot:PI, len:24 / U}); for (let i = 0; i < 6; i++) W.circle(428 + (-12 + .35 + (24 - .7) * i / 5), 53.3, .2);
  const fen = []; for (let x = PLAT.x0 + 3.6 + 1.18; x < PLAT.x1 - 3.6; x += 2 * U) if (Math.abs(x - B2) > 2.4) fen.push({x, z:53.58, y:.5 * U}); W.placeMany('railFence', fen, {collide:false});
  W.place('stationSign', {x:250, z:50.7});
  // (2026-11-18 2차) 공중전화 부스: 승강장 위, 서쪽 대합 지붕 맨 서쪽 기둥(x 262.35, z 53.3)에 등을 붙이고 열린 쪽이 승강장 가운데(북쪽)를 본다
  // (2026-11-27) 서쪽 부스는 기둥 가새와 겹쳐 기둥 서쪽(x 261.4)으로, 동쪽 대합 지붕 밑(맨 동쪽 기둥 안쪽 x 438.7)에 하나 더
  W.placeMany('phoneBooth', PHONES.slice(5, 7)); W.place('stationSign', {x:224.6, z:53, rot:PI / 2});
  W.place('platformModule', {x:(DOCK.x0 + DOCK.x1) / 2, z:(DOCK.z0 + DOCK.z1) / 2, y:0, len:(DOCK.x1 - DOCK.x0) / U, wid:(DOCK.z1 - DOCK.z0) / U, h:1, ramp:2});
  [[244, 53], [254, 53], [300, 53], [314, 53], [336, 53], [358, 53], [380, 53], [402, 53],   /* (2026-11-17) 승강장 가로등은 의자 줄(남쪽 난간 앞)로, 의자 사이에 */  /* 대합 지붕(x 262~292 · 416~440) 아래는 가로등을 두지 않는다 */ ].forEach(([x, z]) => lamps.push({x, z, y:W.groundY(x, z)}));   // (2026-11-18) 육교 발치 가로등 넷은 없앰
  // 육교 (북쪽 계단 → 도로 위 → 남쪽 육교 마당)
  BRIDGES.forEach(b => { W.place('footBridge', {x:b.x, z:b.z}); W.mmRect(b.x - 1.4, 54.6, b.x + 1.4, 105.4, '#7a98ad'); W.mmLabel(b.x + 8, 72, '육교', 12); });
}

// ───────── 도로와 보도 ─────────
export function buildStreets(){
  const L = LOOP, P = new Parts(), D = new Parts(), RY = Y.road, posts = [];
  const lin = (x0, z0, x1, z1, c = 0xf2f4f5, y = RY) => P.add('lin', flatXZ(x0, z0, x1, z1, y + .012), c);
  const mark = (x, z, w, h, ang, uv, y = RY) => { const g = quadY(-w / 2, -h / 2, w / 2, h / 2, y + .014, uv); g.rotateY(ang); g.translate(x, 0, z); D.add('m', g); };
  const DIA = [0, 0, .25, 1], TXT = [.25, 0, 1, 1], WH = 0xf2f4f5, YE = 0xe9b824, tact = [];
  // 횡단보도: 줄무늬는 차가 달리는 방향으로 길고(길이 = 횡단보도 폭), 건너는 방향으로 늘어선다.
  const crossX = (x, z0, z1, w = 5.2) => { for (let z = z0 + .45; z < z1 - .6; z += 1.05) lin(x - w / 2, z, x + w / 2, z + .55); tact.push({x, z:z0 - .55}, {x, z:z1 + .55}); curbCut(x - w / 2 - .2, z0 - .8, x + w / 2 + .2, z0 + .3); curbCut(x - w / 2 - .2, z1 - .3, x + w / 2 + .2, z1 + .8); };   // 동서 도로를 남북으로 건넌다
  const crossZ = (z, x0, x1, w = 4.6) => { for (let x = x0 + .3; x < x1 - .5; x += .95) lin(x, z - w / 2, x + .5, z + w / 2); tact.push({x:x0 - .55, z, rot:PI / 2}, {x:x1 + .55, z, rot:PI / 2}); curbCut(x0 - .8, z - w / 2 - .2, x0 + .3, z + w / 2 + .2); curbCut(x1 - .3, z - w / 2 - .2, x1 + .8, z + w / 2 + .2); };   // 남북 도로를 동서로 건넌다

  // ── 북쪽 도로 (역앞길): 맵 밖까지 이어지고, 양옆 울타리로 막는다 ──
  slab('asphalt', -800, NROAD.z0, 1400, NROAD.z1, RY); W.mmRect(0, NROAD.z0, 640, NROAD.z1, '#a3afbe');
  const NM = (NROAD.z0 + NROAD.z1) / 2; lin(-800, NM - .32, 1400, NM - .16, YE); lin(-800, NM + .16, 1400, NM + .32, YE); lin(-800, NROAD.z0 + .4, 1400, NROAD.z0 + .55); lin(-800, NROAD.z1 - .55, 1400, NROAD.z1 - .4);
  const fence = []; fenceRun(fence, 6, 634, NROAD.z0 - .3, 'x', {y:0}); fenceGaps(fence, 6, SCHOOL.x0, NROAD.z1 + .3, [[L.x0, L.x0 + L.w], [L.x1 - L.w, L.x1]], 'x', {y:Y.side});   /* (2026-11-18) 학교 북쪽은 학교 담 */   // y를 정해 둔다: 육교 밑에서 높이를 물으면 다리 위 높이가 나온다   // 육교 밑도 울타리로 막는다
  // 단지 북쪽 · 서쪽 바깥 띠 입구를 울타리로 닫는다 (보도에서 들어가지 못하게, 충돌 있음)
  W.placeMany('roadFence', fence, {collide:false});   // 북쪽 도로 울타리: 땅에서는 걷기 경계가 막고, 육교 위 사람은 지나가야 해서 충돌 없음
  fence.length = 0; fenceRun(fence, NROAD.z1 + .3, 95.3, 186, 'z'); fenceRun(fence, 250.6, ROAD.z0 - .2, 15.6, 'z');
  // 도로와 보도 사이 경계석: 북쪽 도로 양옆, 강변도로 북쪽, 동쪽 도로 양옆 · 서쪽 도로 동쪽 (교차로 · 횡단보도 · 차 길은 비운다)
  { const cr = (a, b, c0, c1, gaps, axis) => { let s = a; [...gaps].sort((p, q) => p[0] - q[0]).concat([[b, b]]).forEach(([g0, g1]) => { if (g0 - s > .3) (axis === 'x' ? curb(s, c0, g0, c1, .19) : curb(c0, s, c1, g0, .19)); s = Math.max(s, g1); }); };
    cr(6, 634, NROAD.z1, NROAD.z1 + .25, [[L.x0, L.x0 + L.w], [L.x1 - L.w, L.x1]], 'x');
    cr(6, 634, ROAD.z0 - .25, ROAD.z0, [[177 - 2.8, 177 + 2.8], [451 - 2.8, 451 + 2.8], [L.x0, L.x0 + L.w], [L.x1 - L.w, L.x1], BIG.meat.drive, BIG.mart.drive, BIG.bath.drive], 'x');
    // (2026-11-17) 동쪽 도로 동쪽(학교 앞)은 순환 도로가 들어오지 않으니 교차로 자리도 연석을 잇는다. 고원식 횡단보도(z 93.5~98.5)는 서쪽 도로에만
    const PW = [[PATHS.a - 2.4, PATHS.a + 2.4], [PATHS.b - 2.4, PATHS.b + 2.4]], LP = [[L.zN, L.zN + L.w], [L.zS, L.zS + L.w]];
    [[L.x0 + L.w, [[93.5, 98.5], ...LP, ...PW]], [L.x1 - L.w - .25, [...LP, ...PW]], [L.x1, PW]].forEach(([x, gaps]) => cr(NROAD.z1 + .25, ROAD.z0 - .25, x, x + .25, gaps, 'z')); }
  W.placeMany('roadFence', fence); [NROAD.z0, NROAD.z1].forEach(z => W.mmRect(6, z - .5, 634, z + .5, '#8a8f96'));
  // ── 서쪽 도로 (어린이 보호구역) · 동쪽 도로 · 순환 도로 (윗길 · 남쪽 뒷길) ──
  const SZ = {x0:L.x0, x1:L.x0 + L.w, z0:98, z1:250}, cx = L.x0 + L.w / 2, ex = L.x1 - L.w / 2, zN = L.zN, zS = L.zS, w = L.w;
  slab('asphalt', L.x0, NROAD.z1, L.x0 + w, SZ.z0, RY); slab('asphalt', L.x0, SZ.z1, L.x0 + w, ROAD.z0, RY); slab('zone', SZ.x0, SZ.z0, SZ.x1, SZ.z1, RY);
  slab('asphalt', L.x1 - w, NROAD.z1, L.x1, SZ.z0, RY); slab('zone', L.x1 - w, SZ.z0, L.x1, SZ.z1, RY); slab('asphalt', L.x1 - w, SZ.z1, L.x1, ROAD.z0, RY);
  slab('zone', L.x0 + w, zN, L.x1 - w, zN + w, RY); slab('zone', L.x0 + w, zS, L.x1 - w, zS + w, RY);   // (2026-11-15) 공원을 두른 도로도 어린이 보호구역: 아스팔트 대신 붉은 포장 한 장 (겹치지 않게)
  [[L.x0, NROAD.z1, L.x0 + w, ROAD.z0], [L.x1 - w, NROAD.z1, L.x1, ROAD.z0], [L.x0, zN, L.x1, zN + w], [L.x0, zS, L.x1, zS + w]].forEach(r => W.mmRect(r[0], r[1], r[2], r[3], '#b0bbc8'));
  W.mmRect(SZ.x0, SZ.z0, SZ.x1, SZ.z1, '#d3a39b'); W.mmRect(L.x1 - w, SZ.z0, L.x1, SZ.z1, '#d3a39b'); [zN, zS].forEach(z => W.mmRect(L.x0 + w, z, L.x1 - w, z + w, '#d3a39b'));
  // 순환 도로 중앙선(노랑 점선)과 바깥선, 교차로 정지선
  // (2026-11-16) 선은 횡단보도 · 과속방지턱 앞에서 끊는다 (칠이 겹치지 않게)
  const segsX = (a, b, gaps) => { const out = []; let s = a; [...gaps].sort((p, q) => p[0] - q[0]).concat([[b, b]]).forEach(([g0, g1]) => { if (g0 - s > .5) out.push([s, Math.min(g0, b)]); s = Math.max(s, g1); }); return out; };
  [[zN, CROSS_N, [292, 356]], [zS, CROSS_S, [277, 352]]].forEach(([z0, cx_, humps]) => { const gx = cx_.map(x => [x - 3.4, x + 3.4]), gh = humps.map(x => [x - 3, x + 3]);
    segsX(L.x0 + w + 3, L.x1 - w - 3, [...gx, ...gh]).forEach(([a, b]) => { for (let x = a; x + 3 <= b; x += 6) lin(x, z0 + w / 2 - .08, x + 3, z0 + w / 2 + .08, YE); });
    segsX(L.x0 + w + 1, L.x1 - w - 1, gx).forEach(([a, b]) => { lin(a, z0 + .3, b, z0 + .42); lin(a, z0 + w - .42, b, z0 + w - .3); });
    lin(L.x0 + w + .6, z0 + w / 2, L.x0 + w + 1, z0 + w - .2); lin(L.x1 - w - 1, z0 + .2, L.x1 - w - .6, z0 + w / 2); });
  // 동쪽 도로 중앙선
  [[NROAD.z1 + 1, zN - 1], [zN + w + 1, PATHS.a - 3.9], [PATHS.a + 3.9, PATHS.b - 3.9], [PATHS.b + 3.9, zS - 1], [zS + w + 1, ROAD.z0 - 1]].forEach(([a, b]) => { lin(ex - .22, a, ex - .06, b, YE); lin(ex + .06, a, ex + .22, b, YE); });   // 교차로 · 횡단보도에서 끊는다
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
  [108, 142, 198, 238].forEach(z => mark(L.x0 + w * .25, z, 3.0, 7.8, PI, TXT)); [110, 144, 200, 240].forEach(z => mark(L.x0 + w * .75, z, 3.0, 7.8, 0, TXT));
  W.mmLabel(cx, 170, '어린이 보호구역', 9);
  [[108, PI], [142, PI], [196, PI], [238, PI]].forEach(([z, a]) => mark(ex - w * .25, z + 2, 3.0, 7.8, a, TXT)); [110, 144, 200, 240].forEach(z => mark(ex + w * .25, z - 2, 3.0, 7.8, 0, TXT));   // 동쪽 도로
  [[zN, 244], [zN, 336], [zN, 404], [zS, 222], [zS, 292], [zS, 398]].forEach(([z0, x]) => { mark(x, z0 + w * .25, 3.0, 7.8, -PI / 2, TXT); mark(x + 8, z0 + w * .75, 3.0, 7.8, PI / 2, TXT); });   // 윗길 · 남쪽 뒷길

  // ── 강변도로: 맵 밖까지, 4차로. 양옆은 투명벽(횡단보도로만 건넌다) ──
  slab('asphalt', -800, ROAD.z0, 1400, ROAD.z1, RY); W.mmRect(0, ROAD.z0, 640, ROAD.z1, '#a3afbe');
  const RM = (ROAD.z0 + ROAD.z1) / 2, CW = [177, 451];
  [[-800, CW[0] - 4.4], [CW[0] + 4.4, CW[1] - 4.4], [CW[1] + 4.4, 1400]].forEach(([a, b]) => { lin(a, RM - .32, b, RM - .16, YE); lin(a, RM + .16, b, RM + .32, YE);
    for (let x = a + 2; x < b - 4; x += 9) [RM - 4, RM + 4].forEach(z => lin(x, z - .08, x + 4.5, z + .08)); });
  lin(-800, ROAD.z0 + .4, 1400, ROAD.z0 + .55); lin(-800, ROAD.z1 - .55, 1400, ROAD.z1 - .4);
  CW.forEach(x => { crossX(x, ROAD.z0, ROAD.z1);
    lin(x - 4.2, RM + .3, x - 3.8, ROAD.z1 - .3); lin(x + 3.8, ROAD.z0 + .3, x + 4.2, RM - .3);               // 정지선: 남쪽 차로는 동쪽으로, 북쪽 차로는 서쪽으로 달린다
    [RM + 2, RM + 6].forEach(z => mark(x - 15, z, 2.2, 6.4, PI / 2, DIA)); [RM - 2, RM - 6].forEach(z => mark(x + 15, z, 2.2, 6.4, PI / 2, DIA));   // 차로 가운데 (차선 RM ± 4와 겹치지 않게)
    for (let d = 6; d <= 21; d += 3) posts.push({x:x - d, z:RM, y:RY}, {x:x + d, z:RM, y:RY}); });
  // (2026-11-15) 강변도로 투명벽을 없앴다: 도로 안으로 걸어 들어갈 수 있다

  // 칠 · 표지 그리기
  const marks = new THREE.Mesh(D.geo('m'), decalMaterial(canvasTex(1024, 768, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); g.fillStyle = g.strokeStyle = 'rgba(244,246,247,.94)';
    g.lineWidth = 16; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(128, 14); g.lineTo(240, 384); g.lineTo(128, 754); g.lineTo(16, 384); g.closePath(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.translate(640, 0); g.scale(1, 1.55);
    g.font = '150px ' + FONT_D; g.fillText('어린이', 0, 76); g.fillText('보호구역', 0, 210); g.restore();
    g.lineWidth = 20; g.beginPath(); g.arc(640, 600, 118, 0, 7); g.stroke(); g.font = '150px ' + FONT_D; g.fillText('30', 640, 608); }), {alpha:true, rough:.9}));
  marks.receiveShadow = true; root.add(marks); root.add(P.mesh('lin', roadPaintMaterial(), {cast:false}));
  W.placeMany('laneDelineator', posts);
  W.placeMany('tactileStrip', tact.map(t => ({...t, y:Y.side + .005})), {cols:14, rows:2});

  // ── 신호등: 강변도로 횡단보도, 공원 둘레 교차로, 역 쪽 도로 교차로 ──
  CW.forEach(x => { W.place('trafficLight', {x:x + 5.2, z:ROAD.z1 + .9, rot:-PI / 2, arm:5.2}); W.place('trafficLight', {x:x - 5.4, z:ROAD.z0 - .7, rot:PI / 2, arm:5.6});
    W.place('pedSignal', {x:x + 3.4, z:ROAD.z0 - .7, rot:0}); W.place('pedSignal', {x:x - 3.4, z:ROAD.z1 + .7, rot:PI}); });
  // (2026-11-17) 공원 둘레는 어린이 보호구역이라 횡단보도 신호는 없애고, 순환 도로가 남북 도로와 만나는 교차로마다 차량 신호등 하나.
  //   우측 통행: 서쪽 교차로로 가는 차(서행)는 북쪽 차로 → 북쪽 연석에 세우고, 동쪽 교차로로 가는 차(동행)는 남쪽 차로 → 남쪽 연석.
  [zN, zS].forEach(z0 => { W.place('trafficLight', {x:L.x0 + w + 1.4, z:z0 - .8, rot:PI / 2, arm:3.6, state:'green'}); W.place('trafficLight', {x:L.x1 - w - 1.4, z:z0 + w + .8, rot:-PI / 2, arm:3.6}); });
  // 역 쪽 도로(북쪽 도로)도 강변도로처럼 차량 신호등만: 서쪽 · 동쪽 도로와 만나는 교차로 앞, 방향마다 하나
  [[L.x0, L.x0 + w], [L.x1 - w, L.x1]].forEach(([a, b]) => { W.place('trafficLight', {x:a - 1.6, z:NROAD.z1 + .8, rot:-PI / 2, arm:5.4}); W.place('trafficLight', {x:b + 1.6, z:NROAD.z0 - .9, rot:PI / 2, arm:5.4, state:'green'}); });

  // ── 전봇대와 전선 (2026-11-16, 11-17 높임): 북쪽 상가 블록 보도, 단지 앞 보도, 공원 서쪽 블록, 근린상가 뒤, 학교 앞 보도.
  //    전봇대를 1.25배로 높여 전선이 육교 위로 지나간다. 공원 쪽 줄과 단지 · 학교 쪽 줄을 도로 건너 잇는다.
  { const PS = 1.25, P_ = (x, z, rot, v = 0) => ({x, z, rot, v, s:PS});
    const A = run(212, 432, 30).filter(x => BRIDGES.every(b => Math.abs(x - b.x) > 7)).map((x, i) => P_(x, 92.3, PI / 2, i % 3 === 1 ? 1 : 0)),
      B = [102, 146, 194, 244].map((z, i) => P_(L.x0 - 7.7, z, 0, i === 1 ? 1 : i === 2 ? 2 : 0)),   // (2026-11-18) 7개 → 4개: 맨 북쪽 · 남쪽은 두고 하나 건너 잇는다
      /* (2026-11-22 15차) 동쪽 줄 뒤 보도 전봇대 줄(D)은 없앴다: 근린상가가 북쪽 줄로 옮겨 가 인입선이 필요 없다 */
      F = [238, 270, 299, 329, 358, 390, 422].map((x, i) => P_(x, 212.8, PI / 2, i === 3 ? 1 : 0));   // (2026-11-17) 공원 남쪽 보도 화단 띠 위 (나무 사이), 서쪽 길 · 동쪽 줄 전봇대와 잇는다
    // (2026-11-22) 상가로 들어가는 인입선(drops)은 없앴다: 상가는 보통 땅속으로 끌어온다
    // (2026-11-18 2차) 공원 서쪽 길(WP) 전봇대 셋은 모두 없앴다 (그리기 부담 우선): 공원 남쪽 줄(F)은 동쪽 줄에만 잇는다
    const links = [[A[0], B[0]]];
    [A, B, F].forEach(ps => [0, 1, 2].forEach(v => { const l = ps.filter(p => p.v === v); if (l.length) W.placeMany('utilityPole', l, {v}); }));
    root.add(poleWires(A, {links})); root.add(poleWires(B)); root.add(poleWires(F)); }
  // ── 보도 (연석까지 블록) ──
  const sideX = (x0, x1, z0, z1, holes = []) => { let a = z0; [...holes, [z1, z1]].forEach(([h0, h1]) => { if (h0 > a) slab('paver', x0, a, x1, h0); a = Math.max(a, h1); }); };
  sideX(186, L.x0, NROAD.z1, ROAD.z0, [[131, 139], [198, 206]]);   // 정문 · 후문 차 길은 단지 길이 바깥 도로까지 이어진다 (보도 선에는 횡단보도) curb(L.x0 - .25, NROAD.z1, L.x0, 131); curb(L.x0 - .25, 139, L.x0, 198); curb(L.x0 - .25, 206, L.x0, ROAD.z0);   // 단지 앞 (서쪽 도로 서쪽)
  sideX(L.x0 + w, 206, NROAD.z1, ROAD.z0, [[zN, zN + w], [zS, zS + w]]); sideX(434, L.x1 - w, NROAD.z1, ROAD.z0, [[zN, zN + w], [zS, zS + w]]);                         // 상가 블록 양옆
  sideX(L.x1, 464, NROAD.z1, ROAD.z0); slab('paver', 464, SCHOOL.z1, 634, ROAD.z0);
  // (2026-11-17) 맵 밖으로 보도를 늘린다: 북쪽 도로 남쪽(z 90~93), 강변도로 북쪽(z 250.5~256). 아파트 서쪽 · 학교 동쪽
  [[-400, NROAD.z1, 6, 93], [634, NROAD.z1, 1040, 93], [-400, 250.5, 15.6, ROAD.z0], [634, 250.5, 1040, ROAD.z0]].forEach(r => slab('paver', ...r));
  [[-400, 6], [634, 1040]].forEach(([a, b]) => { curb(a, NROAD.z1, b, NROAD.z1 + .25); curb(a, ROAD.z0 - .25, b, ROAD.z0); });   /* (2026-11-17) 학교를 북쪽으로 당겨 북쪽 보도는 없앰, 남쪽 보도는 넓힘 */                                              // 학교 쪽
  slab('paver', 206, NROAD.z1, 434, 94);                                                                                                                         // 상가 블록 북쪽
  slab('paver', 15.6, 250.5, 186, ROAD.z0); bedStrip(15.6, 245.8, 186, 250.5); { const dr = [BIG.meat.drive, BIG.mart.drive, BIG.bath.drive].sort((p, q) => p[0] - q[0]); let a = 206;      // 고깃집 · 마트 주차장 차 길은 보도를 끊고 아스팔트로
    [...dr, [434, 434]].forEach(([d0, d1]) => { if (d0 > a) slab('paver', a, 251, d0, ROAD.z0); if (d1 > d0) { slab('asphalt', d0, 251, d1, ROAD.z0, RY); curb(d0 - .25, 251, d0, ROAD.z0, .19); curb(d1, 251, d1 + .25, ROAD.z0, .19); } a = d1; }); }                                                 // 강변도로 북쪽 보도
  slab('paver', -400, 272, 1040, RSIDE); curb(-400, 272, 1040, 272.3);                                                                                                     // 강변 보도
  // 단지 북쪽 · 서쪽 바깥 띠 (들어갈 수 없음): 보도와 화단으로 채운다
  slab('paver', 6, NROAD.z1, 186, 93); bedStrip(6, 93, 186, 95.4);   /* (2026-11-17) 단지 서쪽 띠(AW)는 화단 · 나무 없이 비움 */
  /* (2026-11-17) 단지 북쪽 보도 나무는 방음벽과 겹쳐 뺐다 */
  // 가로수 (보도 화단 칸)
  const noTree = [PATHS.a, PATHS.b, 135, 202, 96, zN + 3.5, zS + 3.5];
  run(102, 250, 12).forEach(z => { if (!near(z, noTree, 6)) tree(436, z, .95, 2); });
  run(102, 250, 24).forEach(z => { if (!near(z, noTree, 6)) tree(204, z, .95, 1); });   // (2026-11-18 2차) 상가 블록 서쪽 보도(BW) 가로수는 절반
  // 단지 앞 · 학교 앞 보도 가로수는 도로 쪽 끝, 가로등 사이에 둘씩 (2026-11-17)
  [[L.x0 - 1.1, 100], [L.x1 + 1.1, 111]].forEach(([x, z0], k) => { const zs = []; for (let z = z0; z < 250; z += 22) [z + 5.5, z + 16.5].forEach(tz => { if (tz < 250 && !near(tz, noTree, 6)) zs.push(tz); });
    zs.filter((z, i) => k === 1 || i % 2 === 0).forEach((tz, i) => tree(x, tz, .95, i + k)); });   // (2026-11-18 2차) 단지 앞 보도(SW)는 하나 걸러 절반
  // (2026-11-17) 강변도로 북쪽 보도(AS · BS · SS) 가로수: 가로등과 가로등 사이, 도로 쪽 끝. 맵 밖으로 늘린 보도까지
  //   (2026-11-17 2차) 가로등은 40마다, 가로수는 그 사이에 둘(가로등에서 13씩 떨어짐). 횡단보도 · 교차로 · 차 길은 비움
  run(-380, 1020, 40).forEach((x0, i) => [13, 27].forEach((d, k) => { const x = x0 + d; if ((x < 6 || x > 634) && !near(x, [198, 441, ...CW], 6)) tree(x, 254.9, .95, i + k); }));   // 맵 밖으로 늘린 보도
  // (2026-11-18) 강변도로 양쪽 보도: 강변 보도(RG) 가로수(15 간격) 사이에 가로등. 길 건너 북쪽 보도(AS · SW · BW · BS · BE · ER · ES · SS)는 도로 쪽 끝에 같은 x로 대칭.
  //   횡단보도 · 교차로 입구 · 주차장 차 길은 비운다
  const okN = (x, m) => !near(x, CW, 9.5) && !near(x, [198.5, 441.5], 6) && ![BIG.meat.drive, BIG.mart.drive, BIG.bath.drive].some(([a, b]) => x > a - m && x < b + m);
  // (2026-11-18 2차) 양쪽 모두 절반으로: 가로수 30 간격(x 27부터), 가로등은 그 사이(x 42부터 30 간격)
  run(27, 630, 30).forEach((x, i) => { if (okN(x, 2.5)) tree(x, ROAD.z0 - 1.1, .95, i + 1); });
  // 맵 밖으로 늘린 북쪽 도로 남쪽 보도 (아파트 서쪽 · 학교 동쪽) 가로수
  run(646, 1035, 22).forEach((x, i) => tree(x, NROAD.z1 + 1.4, .95, i + 3));   // (2026-11-18 4차) 단지 북쪽 띠(AN)를 잇는 서쪽 줄은 없앰
  run(27, 630, 30).forEach((x, i) => { if (!near(x, CW, 9.5)) tree(x, ROAD.z1 + 1.1, .9, i + 2); });                       // 넓힌 강변 보도 가로수: 도로 쪽 끝
  // 가로등: 순환 도로 · 남북 도로 · 강변도로
  [...run(214, 430, 22).map(x => [x, zN - 1]), ...run(225, 430, 22).map(x => [x, zN + w + 1]),   /* 공원 남쪽 보도 · 남쪽 뒷길 남쪽 보도 가로등은 park.js에서 화단 위 · 나무 칸 사이에 */
    ...run(100, 250, 44).map(z => [L.x0 - 1.1, z]), ...run(111, 250, 22).map(z => [L.x1 + 1.1, z]), ...run(42, 630, 30).filter(x => okN(x, 3)).map(x => [x, ROAD.z0 - 1.1]), ...run(42, 630, 30).filter(x => !near(x, CW, 9.5)).map(x => [x, ROAD.z1 + 1.1])]
    .forEach(([x, z]) => { if (!near(x, [...CROSS_N, ...CROSS_S, ...CW], 3.5) && !near(z, [PATHS.a, PATHS.b], 3.5) && !(z > 250 && z < 256 && [BIG.meat.drive, BIG.mart.drive, BIG.bath.drive].some(([a, b]) => x > a - 3 && x < b + 3))) lamps.push({x, z}); });
}

// ───────── 강변 ─────────
export function buildRiverside(){
  const by = BANK;
  // 자전거 도로 (사면 아래 ~ 산책로 앞, 붉은 투수 포장): 가운데 흰 점선, 양 끝 흰 선, 자전거 그림
  // (2026-11-18) 사면(z 279 ~ 284)과 자전거 도로 사이에 강변 벤치 마당(BK, z 284 ~ 287.6)을 내고, 자전거 도로는 z 287.6 ~ 297로 좁혔다
  const BK = [284, 287.6], BM = (BK[1] + 297) / 2;
  slab('perm', -400, BK[0], 1040, BK[1] - .3, by + .03); W.mmRect(0, BK[0], 640, BK[1], '#e6dcc8');
  slab('bike', -400, BK[1], 1040, 297, by + .03); curb(-400, BK[1] - .3, 1040, BK[1], .1, by); curb(-400, 296.9, 1040, 297.2, .1, by);
  // 벤치: 등은 사면, 앉으면 강(썰매장)을 본다. 40마다 둘씩, 둔치 계단 앞은 비운다
  run(20, 620, 40).filter(c => !near(c, [177, 451], 10)).forEach(c => [c - 3.2, c + 3.2].forEach(x => BENCHES.push({x, z:BK[0] + 1.75, f:1})));
  // 걷는 끝(x 6.5 · 633.5): 벤치 마당 · 자전거 도로를 바리케이드로 막는다 (길은 맵 끝까지 보인다)
  [[8.2, PI / 2], [631.8, -PI / 2]].forEach(([x, r]) => [[285.8, '보행로 끝'], [289.6, '자전거도로 끝'], [BM, '자전거도로 끝'], [295.1, '자전거도로 끝']].forEach(([z, text]) => W.place('barricade', {x, z, y:by, rot:r, text})));   // 앞면이 맵 안쪽을 본다
  // (2026-11-21) 맵 동 · 서 끝: 자전거 도로 바리케이드와 나란히, 썰매장 눈밭 띠 · 물가 길까지 이어서 막는다 (맵 밖으로 못 나가게)
  { const ends = []; for (let z = 298.3; z < WALK.zRiver - .5; z += 1.95) [[8.2, PI / 2], [631.8, -PI / 2]].forEach(([x, r]) => ends.push({x, z, y:by, rot:r}));
    W.placeMany('barricade', ends, {text:'통행 금지'}); }
  // (2026-11-18) 강변 보도(RG) · 학교 남쪽 보도(SS) 동쪽 끝도 막는다
  [273.35, 275.5, 277.65, 242.5, 246.4, 250.3, 254.2].forEach(z => W.place('barricade', {x:631.8, z, rot:-PI / 2, text:'보도 끝'}));
  const P = new Parts(), lin = (x0, z0, x1, z1, c = 0xf2f4f5) => P.add('lin', flatXZ(x0, z0, x1, z1, by + .045), c);
  for (let x = -400; x < 1040; x += 6) lin(x, BM - .08, x + 3, BM + .08); lin(-400, BK[1] + .4, 1040, BK[1] + .52); lin(-400, 296.38, 1040, 296.5);
  const D = new Parts(); run(-380, 1020, 50).forEach(x => { [[(BM + 297) / 2, 0], [(BK[1] + BM) / 2, PI]].forEach(([z, a]) => { const g = quadY(-2.8, -1, 2.8, 1, by + .05); g.rotateY(a); g.translate(x, 0, z); D.add('b', g); }); });   // 남쪽 차로는 동쪽으로, 북쪽 차로는 서쪽으로
  const bike = new THREE.Mesh(D.geo('b'), decalMaterial(canvasTex(512, 192, g => { g.clearRect(0, 0, 512, 192); g.strokeStyle = g.fillStyle = 'rgba(244,246,247,.93)'; g.lineWidth = 9; g.lineCap = 'round';
    [[70, 120], [180, 120]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 34, 0, 7); g.stroke(); }); g.beginPath(); g.moveTo(70, 120); g.lineTo(110, 70); g.lineTo(160, 70); g.lineTo(180, 120); g.moveTo(110, 70); g.lineTo(125, 120); g.lineTo(160, 70); g.moveTo(100, 58); g.lineTo(122, 58); g.moveTo(160, 70); g.lineTo(156, 52); g.lineTo(172, 50); g.stroke();
    g.lineWidth = 16; g.beginPath(); g.moveTo(270, 96); g.lineTo(440, 96); g.stroke(); g.beginPath(); g.moveTo(492, 96); g.lineTo(430, 56); g.lineTo(430, 136); g.closePath(); g.fill(); }), {alpha:true, rough:.9}));   // 자전거 그림 앞(진행 방향)에 화살표
  bike.receiveShadow = true; root.add(bike); root.add(P.mesh('lin', roadPaintMaterial(), {cast:false})); W.mmRect(0, BK[1], 640, 297, '#c99a92');
  // (2026-11-17) 둔치: 산책로(OB2)와 가장자리 블록 띠를 걷어내고 '눈밭(OB1) · 얼음 썰매장 · 눈밭(OB1)'으로. 썰매장 폭은 공원(x 228~412)을 그대로 내린 것
  { const S = SLED; [[-400, 297.2, S.x0, 332], [S.x1, 297.2, 1040, 332], [S.x0, 297.2, S.x1, S.z0], [S.x0, S.z1, S.x1, 332]].forEach(r => slab('snowbed', ...r, by + .02)); }
  W.mmRect(0, 297, 640, 332, '#eef3ef');
  // 물가 길 (끊김 없이) + 갈대 띠
  slab('perm', -400, 332.4, 1040, 336, by + .03); curb(-400, 331.9, 1040, 332.4, .12, by); W.mmRect(0, 332, 640, 336, '#e6dcc8');
  const reeds = []; for (let x = -20; x < 660; x += 3.2 + R() * 2) reeds.push({x, z:337.6 + R() * 3, rot:R() * 6, s:.9 + R() * .45});
  reeds.forEach(r => r.y = by); W.placeMany('reedClump', reeds, {collide:false});
  // 둔치 계단 (예전 자리)과 난간
  [177, 451].forEach(x => W.place('parkStair', {x, z:RSIDE, y:0, w:4 / U, run:5 / U, rise:-BANK / U}));   // 둔치로 내려가는 계단 (공원 계단 소품, 사면 기울기와 같다)
  // (2026-11-17) 강변 보도 남쪽 끝(사면과 만나는 곳)에 경계석, 난간은 그 위에. 계단 옆벽에서 한 뼘 떨어져 끝난다
  { const g2 = [[177 - 2.4, 177 + 2.4], [451 - 2.4, 451 + 2.4]]; let a = -400; [...g2, [1040, 1040]].forEach(([g0, g1]) => { if (g0 > a) curb(a, RSIDE - .3, g0, RSIDE, .2); a = g1; }); }
  const gr = []; fenceGaps(gr, -400, 1040, RSIDE - .15, [[177 - 3, 177 + 3], [451 - 3, 451 + 3]], 'x', {y:.2}); W.placeMany('roadFence', gr, {light:true});
  const rf = []; fenceRun(rf, -400, 1040, 341.7, 'x', {y:by}); W.placeMany('roadFence', rf, {light:true});
  // 산책로 가로등 · 물가 쪽 나무
  /* (2026-11-17) 물가 길 · 갈대 쪽 나무(z 330)는 없앴다 */
  run(20, 120, 14).forEach((x, i) => pine(x, i % 2 ? 299.6 : 330.6, i));   // 눈밭 가장자리 (가운데는 눈덩이 과녁 마당)
  // 얼음 썰매장: 평평한 얼음판(미끄럽다). (2026-11-20 2차) 판자 벽은 없애고 낮은 고무 테두리(밟고 지나간다)만 둔다
  { const S = SLED, yI = by + .06, H = .95 * U, T = .25;
    slab('ice', S.x0, S.z0, S.x1, S.z1, yI); W.addSlippery((x, z) => x > S.x0 && x < S.x1 && z > S.z0 && z < S.z1); W.addHeight((x, z) => x > S.x0 && x < S.x1 && z > S.z0 && z < S.z1 ? yI : null, 1);
    const edge = (x0, z0, x1, z1) => GROUND.add('board', box(x0, by, z0, x1, by + .09, z1, .03), 0x2f6fb5);
    edge(S.x0, S.z0, S.x1, S.z0 + T); edge(S.x0, S.z1 - T, S.x1, S.z1); edge(S.x0, S.z0 + T, S.x0 + T, S.z1 - T); edge(S.x1 - T, S.z0 + T, S.x1, S.z1 - T);
    // (2026-11-24 21차) 둘레 조명은 없애고, 썰매장 북쪽 벤치 마당의 벤치 둘 사이(x 260 · 300 · 340 · 380)에 가로등 하나씩
    [260, 300, 340, 380].forEach(x => lamps.push({x, z:284 + 1.75, y:by}));
    W.mmRect(S.x0, S.z0, S.x1, S.z1, '#d6e8f2'); W.mmLabel((S.x0 + S.x1) / 2, S.zc, '얼음 썰매장', 13);
}
}

// 마지막에 바닥 · 나무 · 가로등을 한 번에 그린다 (구역 파일이 GROUND · TREES에 더한 것까지)
export function finishBase(){
  // (2026-11-17) 맵 서쪽 끝 띠(x 1 ~ 21, 단지 안쪽 제외)는 나무 · 가로등을 두지 않는다. 강변 · 강 건너에는 소나무를 두지 않는다
  const westEdge = p => p.x > 1 && p.x < 21 && p.z > 14 && p.z < 341 && !(p.x > 15.4 && p.z > 95.4 && p.z < 245.8);
  const keep = (list, pine) => list.filter(p => !westEdge(p) && !(pine && p.z > 297));
  TREES.bare.forEach((l, i) => { TREES.bare[i] = keep(l); }); TREES.pine.forEach((l, i) => { TREES.pine[i] = keep(l, true); }); { const k = lamps.filter(p => !westEdge(p)); lamps.length = 0; lamps.push(...k); }
  buildCurbs();
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
