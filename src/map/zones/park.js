// 구역 2: 공원과 상가 블록 (구획 2판 + 2026-11-15 사용자 수정).
//   북쪽 · 남쪽 상가 줄은 새 방식 상가(몸체 · 계단 · 간판)를 띄워 세우고, 정면이 마을버스 순환 도로(윗길 · 남쪽 뒷길)를 본다.
//   가게 사이와 뒤, 공원 둘레는 모두 벽돌 길이고 화단 띠와 나무로 나눈다.
//   (2026-11-22 15차) 근린상가 네 동과 문구점은 북쪽 쉼터 줄(NL)로 옮겼다. 동쪽 줄(EP)은 서쪽 길(WP)과 대칭인 벽돌 길 + 화단 띠 + 나무.
//   공원은 평지 (분수 광장 · 눈사람 잔디밭 · 정자 마당). 둘레 화단에는 횡단보도와 맞춘 입구를 낸다.
import * as THREE from '../../lib/three.js';
import { M, mesh } from '../../core/gfx.js';
import { W } from '../../world/world.js';
import { building, spotLabel } from '../../world/builders.js';
import { getProp } from '../../props/registry.js';
import { SHOP_LAYOUT } from '../../props/shops.js';
import { STATIONERY_LAYOUT, STATIONERY_ZONES } from '../../props/stationery.js';
import { placeTower, TOWER } from '../../props/shopTowers.js';
import { GROUND, slab, curb, bedStrip, TREES, LAMPS } from '../base.js';   // curb(x0, z0, x1, z1, 높이, 바닥 y)
import { mulberry } from '../../props/kit.js';
import { UNIT as U } from '../../config.js';
import { LOOP, SHOPS_N, SHOPS_S, CROSS_N, CROSS_S, NL_SHOPS, PIT, BIG, BENCHES, PHONES, FOUNTAIN, SNOW, STN_AT } from '../layout.js';
import { placeBig, MEAT, MART, BATH } from '../../props/bigShops.js';
import { flatXZ, lathe } from '../../core/meshkit.js';
import { paverMaterial, concreteMaterial } from '../../core/texkit.js';
import { root as scene0 } from '../../core/engine.js';
import { box } from '../../core/meshkit.js';

const PI = Math.PI, R = mulberry(11);
const run = (a, b, step) => { const out = []; for (let v = a; v <= b + 1e-6; v += step) out.push(v); return out; };
const near = (v, list, d) => list.some(c => Math.abs(v - c) < d);
const tree = (x, z, s = .9, v = 0) => TREES.bare[v % 6].push({x, z, rot:R() * 6, s});

// 상가 한 줄: SHOP_LAYOUT을 여러 자리에 놓되, 같은 소품끼리 인스턴스로 묶어 그린다 (높이 · 충돌 · 카메라 가림은 자리마다 등록)
function shopRow(xs, z0, rot, roofAt){
  const groups = new Map(), c = Math.cos(rot), s = Math.sin(rot);
  xs.forEach((sx, k) => SHOP_LAYOUT.forEach(([name, o, x, y, z, r]) => {
    if (name === 'signRoof' && !roofAt.includes(k)) return;
    const opts = name === 'signFascia' || name === 'signVertical' ? {...o, v:((o.v || 0) + k * 3) % (name === 'signFascia' ? 8 : 5)} : o, key = name + JSON.stringify(opts);
    if (!groups.has(key)) groups.set(key, {name, opts, list:[]});
    groups.get(key).list.push({x:sx + (x * c + z * s) * U, y:y * U, z:z0 + (-x * s + z * c) * U, rot:rot + (r || 0)}); }));
  for (const {name, opts, list} of groups.values()) { const def = getProp(name), g = W.placeMany(name, list, opts);
    if (def.blocksCamera) W.blockers.push(g);
    list.forEach(p => { if (def.height) { const cc = Math.cos(p.rot), ss = Math.sin(p.rot); W.addHeight((px, pz) => { const dx = px - p.x, dz = pz - p.z; return def.height(dx * cc - dz * ss, dx * ss + dz * cc); }); }
      if (def.minimap) W.mmCircle(p.x, p.z, def.mmSize || 1.6, def.minimap); }); }
}

// 고깃집 · 마트: 몸체 뒤를 BIG.back에 맞추고, 그 뒤 주차장(아스팔트 · 주차선 · 주차 턱 · 차)과 강변도로로 나가는 차 길
function bigShopsAndLots(){
  const BW = 2.5 * U, BD = 5 * U, R2 = mulberry(31), cars = {}, stops = [], PAINT = [0xe9ebec, 0xd9dcde, 0x8a9198, 0x2a2d31, 0x35393e, 0x2f4a6e, 0x6b2b2a, 0xc9c2b2];
  [['meat', MEAT.D], ['mart', MART.D], ['bath', BATH.D]].forEach(([k, D]) => { const b = BIG[k], cz = BIG.back - D / 2 * U; placeBig(W, k, b.x, cz, PI);
    const [l0, l1] = b.lot, [dd0, dd1] = b.drive, z0 = BIG.back + .2, z1 = 251;
    // 주차장 연석: 양옆은 뒤 끝부터 보도 끝까지 곧게, 보도와 만나는 남쪽 변은 차 길만 비운다 (2026-11-17)
    slab('asphalt', l0, BIG.back, l1, z1, .03); curb(l0 - .25, BIG.back, l0, z1, .19); curb(l1, BIG.back, l1 + .25, z1, .19); W.mmRect(l0, BIG.back, l1, z1, '#b9c2cc');
    if (dd0 > l0) curb(l0 - .25, z1, dd0, z1 + .25, .19); if (dd1 < l1) curb(dd1, z1, l1 + .25, z1 + .25, .19);   // 보도 쪽 끝에 (주차장 안으로 들어가지 않게)
    W.place('parkingSign', {x:dd0 > l0 + 1.5 ? dd0 - .9 : dd1 + .9, z:252.2, rot:0});   // 고객 주차장 표지는 강변도로 쪽 입구에
    const n = Math.floor((l1 - l0 - .6) / BW), x0 = (l0 + l1) / 2 - n * BW / 2;
    for (let i = 0; i <= n; i++) GROUND.add('paint', flatXZ(x0 + i * BW - .07, z0, x0 + i * BW + .07, z0 + BD, .045), 0xf2f4f5);
    GROUND.add('paint', flatXZ(x0, z0 + BD - .07, x0 + n * BW, z0 + BD + .07, .045), 0xf2f4f5);
    for (let i = 0; i < n; i++) { const x = x0 + (i + .5) * BW; stops.push({x, z:z0 + 1.05 * U, rot:0}); if (R2() > .6) continue; const it = {x:x + (R2() - .5) * .2, z:z0 + BD / 2 + .2, rot:(R2() - .5) * .05,   /* (2026-11-17) 후면 주차: 앞이 강변도로 쪽 */ color:PAINT[Math.floor(R2() * PAINT.length)]};
      const t = R2(), key = t < .45 ? 'carSedan/' + Math.floor(R2() * 3) : t < .75 ? 'carSUV/' + Math.floor(R2() * 2) : 'carMini/' + Math.floor(R2() * 3); (cars[key] || (cars[key] = [])).push(it); }
    // 차 길 안내: 들어오는 화살표 두 개
    const [d0, d1] = b.drive; GROUND.add('paint', flatXZ((d0 + d1) / 2 - .12, 249.3, (d0 + d1) / 2 + .12, 250.8, .045), 0xf2f4f5); });
  W.placeMany('wheelStop', stops);
  Object.entries(cars).forEach(([key, list]) => { const [name, v] = key.split('/'); W.placeMany(name, list, {v:+v, snow:+v === 2 ? .35 : 1}); });
  W.mmLabel(BIG.meat.x, 236, '고깃집', 10); W.mmLabel(BIG.mart.x, 236, '마트', 10); W.mmLabel(BIG.bath.x, 236, '목욕탕', 10);
}

// 낮춘 공원: 높이 함수(계단은 비탈로), 옹벽 · 계단 옆벽 · 계단 단, 충돌. 바닥판은 build()에서 깐다.
function sunkenPark(){
  const {x0, x1, z0, z1, y:PD, L, stairs} = PIT, WT = .35, TOP = .5, CON = 0xc9cbc8;
  const along = s => s === 'n' || s === 's', depth = (s, x, z) => s === 'n' ? z - z0 : s === 's' ? z1 - z : s === 'w' ? x - x0 : x1 - x;
  W.addHeight((x, z) => { if (x <= x0 || x >= x1 || z <= z0 || z >= z1) return null;
    for (const [s, a, b] of stairs) { const d = depth(s, x, z), t = along(s) ? x : z; if (t >= a && t <= b && d < L) return (PD + .05) * d / L + .15 * (1 - d / L); }
    return PD + .05; });
  // 상자 하나를 변 기준 좌표(t: 변을 따라, d: 안쪽으로)로 놓는다
  const sbox = (s, t0, t1, d0, d1, y0, y1, c = CON, col = false) => { let r;
    if (s === 'n') r = [t0, z0 + d0, t1, z0 + d1]; else if (s === 's') r = [t0, z1 - d1, t1, z1 - d0]; else if (s === 'w') r = [x0 + d0, t0, x0 + d1, t1]; else r = [x1 - d1, t0, x1 - d0, t1];
    GROUND.add('curb', box(r[0], y0, r[1], r[2], y1, r[3], .03), c); if (col) W.rect(r[0], r[1], r[2], r[3]); };
  [['n', x0, x1], ['s', x0, x1], ['w', z0, z1], ['e', z0, z1]].forEach(([s, a, b]) => {
    const gaps = stairs.filter(q => q[0] === s).map(q => [q[1] - WT, q[2] + WT]).sort((p, q) => p[0] - q[0]);
    let t = a + (along(s) ? 0 : WT); [...gaps, [b - (along(s) ? 0 : WT), b]].forEach(([g0, g1]) => { if (g0 - t > .05) sbox(s, t, g0, 0, WT, PD, TOP, CON, true); t = Math.max(t, g1); });   // 옹벽 (위는 앉음벽)
  });
  // 계단: 공원 계단 소품 (단 · 옆벽 · 손스침). 옆벽 자리는 충돌로 막는다
  const ROT = {n:0, s:PI, w:PI / 2, e:-PI / 2};
  stairs.forEach(([s, a, b]) => { const m = (a + b) / 2, [x, z] = s === 'n' ? [m, z0] : s === 's' ? [m, z1] : s === 'w' ? [x0, m] : [x1, m];
    W.place('parkStair', {x, z, y:.15, rot:ROT[s], w:(b - a) / U, run:L / U, rise:(.1 - PD) / U});   // 위는 보도 높이(.15), 아래는 마당 바닥(PD + .05)
    [[a - WT, a], [b, b + WT]].forEach(([t0, t1]) => { let r; if (s === 'n') r = [t0, z0, t1, z0 + L]; else if (s === 's') r = [t0, z1 - L, t1, z1]; else if (s === 'w') r = [x0, t0, x0 + L, t1]; else r = [x1 - L, t0, x1, t1]; W.rect(...r); }); });
}

// 낮춘 마당 옹벽 밑 화단 (2026-11-17): 계단 자리와 그 옆은 비우고, 경계석 + 화단 바닥 + 둥근 관목
function pitBeds(){
  const {x0, x1, z0, z1, y:PD, stairs} = PIT, WT = .35, D = 2.4, y = PD + .05, t = .3, balls = [];
  const bed = (a0, b0, a1, b1) => { if (a1 - a0 < 1.5 || b1 - b0 < 1.5) return; curb(a0, b0, a1, b0 + t, .27, y); curb(a0, b1 - t, a1, b1, .27, y); curb(a0, b0 + t, a0 + t, b1 - t, .27, y); curb(a1 - t, b0 + t, a1, b1 - t, .27, y);
    slab('bed', a0 + t, b0 + t, a1 - t, b1 - t, y + .21); const horiz = a1 - a0 > b1 - b0, L = horiz ? a1 - a0 : b1 - b0, n = Math.floor(L / 5);
    for (let i = 0; i < n; i++) { const u = (i + .5) / n; balls.push(horiz ? {x:a0 + (a1 - a0) * u, z:(b0 + b1) / 2, y:y + .21, rot:R() * 6} : {x:(a0 + a1) / 2, z:b0 + (b1 - b0) * u, y:y + .21, rot:R() * 6}); } };
  [['n', x0 + WT, x1 - WT], ['s', x0 + WT, x1 - WT], ['w', z0 + WT + D, z1 - WT - D], ['e', z0 + WT + D, z1 - WT - D]].forEach(([s, a, b]) => {
    const gaps = stairs.filter(q => q[0] === s).map(q => [q[1] - WT - .6, q[2] + WT + .6]).sort((p, q) => p[0] - q[0]); let st = a;
    [...gaps, [b, b]].forEach(([g0, g1]) => { const e = Math.min(g0, b); if (e - st > 1.5) { if (s === 'n') bed(st, z0 + WT, e, z0 + WT + D); else if (s === 's') bed(st, z1 - WT - D, e, z1 - WT); else if (s === 'w') bed(x0 + WT, st, x0 + WT + D, e); else bed(x1 - WT - D, st, x1 - WT, e); } st = Math.max(st, g1); }); });
  W.placeMany('shrubBall', balls, {v:1, collide:false});
}

export default {
  id:'park', name:'공원과 상가',
  build(){
    const zN = LOOP.zN, zS = LOOP.zS, w = LOOP.w, B = 'brick';
    // ── 바닥: 벽돌 길 (육교 마당, 북쪽 상가 줄, 윗길 보도, 서쪽 · 동쪽 길, 아랫길 · 남쪽 뒷길 보도, 남쪽 상가 줄) ──
    slab(B, 206, 94, 434, zN); slab(B, 206, zN + w, 434, 132);
    slab(B, 206, 132, 224, 205); slab(B, 416, 132, 434, 205);
    slab(B, 206, 205, 434, zS); slab(B, 206, zS + w, 434, BIG.back);
    { let a = 206; [BIG.meat.lot, BIG.bath.lot, BIG.mart.lot, [434, 434]].forEach(([l0, l1]) => { if (l0 > a) slab(B, a, BIG.back, l0, 251); a = l1; }); }
    [[206, zN - .25, 434, zN], [206, zN + w, 434, zN + w + .25], [206, zS - .25, 434, zS], [206, zS + w, 434, zS + w + .25]].forEach(r => curb(...r));
    W.mmRect(206, 94, 434, 132, '#e2cdc0'); W.mmRect(206, 205, 434, 251, '#e2cdc0'); W.mmRect(206, 132, 228, 205, '#e2cdc0'); W.mmRect(412, 132, 434, 205, '#e2cdc0');
    // ── 화단 띠 · 가로수 ──
    // (2026-11-18) 윗길 북쪽 보도(UN) · 남쪽 뒷길 남쪽 보도(SBs)의 도로 쪽 나무 칸은 없앴다 (가로등만 남김)
    [219, 261, 289, 331, 359, 401].forEach(x => LAMPS.push({x, z:zS + w + 2}));   // (2026-11-17) 이 보도의 가로등은 나무 칸과 나무 칸 사이에
    [222, 254, 286, 342, 374, 406].forEach(x => LAMPS.push({x, z:212.8, y:.21}));   // (2026-11-17) 공원 남쪽 보도 가로등은 화단 띠 위, 나무 사이에
    bedStrip(208, 211.8, 300, 213.8); bedStrip(328, 211.8, 432, 213.8); run(214, 296, 16).filter(x => !CROSS_S.some(c => Math.abs(x - c) < 4)).forEach((x, i) => tree(x, 212.8, .85, i + 2)); run(334, 430, 16).forEach((x, i) => tree(x, 212.8, .85, i + 3));
    bedStrip(213.8, 136, 216.2, 201); run(137.6, 199.4, 15.45).forEach((z, i) => tree(215, z, .9, i));
    bedStrip(423.8, 136, 426.2, 201); run(137.6, 199.4, 15.45).forEach((z, i) => tree(425, z, .9, i + 1));   // (2026-11-22 15차) 동쪽 길(EP): 서쪽 길과 대칭 (x 640 - x)   // (2026-11-18 3차) 나무 다섯: 양 끝을 화단 끝에, 사이는 같은 간격                                                                // 서쪽 길
    // 북쪽 상가 사이 화단
    // (2026-11-18 2차) 남쪽 큰 가게 줄(SG) 화단은 소나무만
    [[206, 226], [254, 300], [327, 374], [402, 434]].forEach(([a, b], i) => { bedStrip(a + 1.5, 236, b - 1.5, 247); run(a + 5, b - 5, 10).forEach((x, k) => TREES.pine[(i + k) % 3].push({x, z:241.5, rot:R() * 6})); });
    // ── 공원 둘레 화단 (입구는 횡단보도와 맞춘다) ──
    // (2026-11-20) 남쪽 둘레 화단 입구를 북쪽과 같게: 양쪽 좁은 입구 + 가운데 넓은 입구(300~346)
    const S_GAPS = [[CROSS_N[0] - 4, CROSS_N[0] + 4], [300, 346], [CROSS_N[2] - 4, CROSS_N[2] + 4]];
    const edge = (a, b, gaps, mk) => { let s = a; [...gaps, [b, b]].forEach(([g0, g1]) => { if (g0 - s > 1) mk(s, g0); s = Math.max(s, g1); }); };
    edge(224, 416, [[CROSS_N[0] - 4, CROSS_N[0] + 4], [300, 346], [CROSS_N[2] - 4, CROSS_N[2] + 4]], (a, b) => { bedStrip(a, 132, b, 135); W.place('hedgeRow', {x:(a + b) / 2, z:133.5, len:(b - a - 1) / U}); });
    edge(224, 416, S_GAPS, (a, b) => { bedStrip(a, 202, b, 205); W.place('hedgeRow', {x:(a + b) / 2, z:203.5, len:(b - a - 1) / U}); });   // (2026-11-17 2차) 남쪽 입구 계단을 되살림
    // (2026-11-18 2차) 서쪽 길(WP) 입구 계단을 동쪽 줄(EP)과 대칭으로. 계단 사이 작은 화단(길이 2.5)에는 둥근 관목 하나씩
    const EGAPS = [[154.5, 161.5], [164, 178], [180.5, 187.5]];
    edge(135, 202, EGAPS, (a, b) => bedStrip(224, a, 228, b));
    edge(135, 202, EGAPS, (a, b) => bedStrip(412, a, 416, b));
    W.placeMany('shrubBall', [226, 414].flatMap(x => [162.75, 179.25].map(z => ({x, z, y:.21, rot:R() * 6}))), {v:0, collide:false});
    // ── 공원 바닥: 둘레 길은 땅 높이, 그 안쪽은 낮춘 마당(PIT). 옹벽(앉음벽) 위로는 못 넘고 계단으로 드나든다 ──
    sunkenPark();
    // (2026-11-21) 눈사람 눈밭 칸(SNOW.field)은 잔디를 깔지 않는다: 눈 덮개(activities/snowman.js)와 겹쳐 깜빡이지 않게 잔디를 네 조각으로 나눈다
    { const F = SNOW.field; [[PIT.x0, PIT.z0, PIT.x1, F.z0], [PIT.x0, F.z1, PIT.x1, PIT.z1], [PIT.x0, F.z0, F.x0, F.z1], [F.x1, F.z0, PIT.x1, F.z1]].forEach(r => slab('bed', ...r, PIT.y + .05)); } W.mmRect(228, 135, 412, 202, '#d2e0d0'); W.mmRect(PIT.x0, PIT.z0, PIT.x1, PIT.z1, '#c8d8c6'); W.mmLabel(320, 168, '공원', 22);
    [[280, PIT.z0, 283.5, PIT.z1], [362, PIT.z0, 365.5, PIT.z1]].forEach(r => slab('perm', ...r, PIT.y + .13));
    const PY = .15; [[231, 138, 409, 141.5], [231, 195.5, 409, 199], [231, 141.5, 234.5, 195.5], [405.5, 141.5, 409, 195.5]].forEach(r => slab('perm', ...r, PIT.y + .13));   // 잔디보다 8cm 위 (겹쳐 깜빡이지 않게)   // 둘레 길 (낮춘 마당)
    [[CROSS_N[0] - 4, 132, CROSS_N[0] + 4, 135], [300, 132, 346, 135], [CROSS_N[2] - 4, 132, CROSS_N[2] + 4, 135], ...S_GAPS.map(([a, b]) => [a, 202, b, 205]),                // 둘레 화단 입구 (땅 높이, 계단 머리)
      ...[224, 412].flatMap(x => EGAPS.map(([a, b]) => [x, a, x + 4, b]))].forEach(r => slab('perm', ...r, PY));
    // (2026-11-17) 분수 둘레 원형 벽돌 포장은 없앴다 (잔디 마당 위에 분수만)
    // ── 공원 가운데 분수 광장 (2026-11-20 4차 조경) ──
    //   분수(props/parkFountain.js)를 둥근 포장 광장(반지름 12.5)이 두르고, 화강석 테두리를 낮게 세웠다. 광장에서 동서남북으로 폭 5의 길이 뻗어
    //   북쪽 · 남쪽 넓은 계단과 동서 산책길(x 280~283.5 · 362~365.5)에 닿는다. 길 양옆에 벤치(길을 본다)와 가로등, 광장 둘레엔 회양목 덩이.
    //   광장 안 벤치 여덟은 원을 따라 놓고 분수를 본다.
    { const F = FOUNTAIN, Y = PIT.y, RP = 12.5;
      W.place('parkFountain', {x:F.x, z:F.z}); W.mmCircle(F.x, F.z, RP, '#dcd6cc'); W.mmCircle(F.x, F.z, 5.2, '#c9d4df');
      const disk = new THREE.CircleGeometry(RP, 72); disk.rotateX(-PI / 2);
      { const p = disk.getAttribute('position'), uv = disk.getAttribute('uv'); for (let k = 0; k < p.count; k++) uv.setXY(k, (F.x + p.getX(k)) / 3, (F.z + p.getZ(k)) / 3);
        disk.setAttribute('color', new THREE.Float32BufferAttribute(new Array(p.count * 3).fill(1), 3)); }   // 포장 재질은 정점 색을 곱한다
      const dm = paverMaterial().clone(); dm.polygonOffset = true; dm.polygonOffsetFactor = -2; dm.polygonOffsetUnits = -4;
      const dmesh = new THREE.Mesh(disk, dm); dmesh.position.set(F.x, Y + .17, F.z); dmesh.receiveShadow = true; scene0.add(dmesh);
      const rim = lathe([[RP - .05, 0], [RP - .05, .16], [RP + .5, .16], [RP + .5, 0]], 72), rm = new THREE.Mesh((rim.getAttribute('color') || rim.setAttribute('color', new THREE.Float32BufferAttribute(new Array(rim.getAttribute('position').count * 3).fill(1), 3)), rim), concreteMaterial({seed:53})); rm.position.set(F.x, Y + .08, F.z); rm.receiveShadow = true; scene0.add(rm);
      // 동서남북 길 (광장 테두리에서 시작)
      const hw = 2.5; [[F.x - hw, 141.5, F.x + hw, F.z - RP], [F.x - hw, F.z + RP, F.x + hw, 195.5], [283.5, F.z - hw, F.x - RP, F.z + hw], [F.x + RP, F.z - hw, 362, F.z + hw]].forEach(r => slab('perm', ...r, Y + .13));
      W.mmRect(F.x - hw, 141.5, F.x + hw, 195.5, '#d9d2c6'); W.mmRect(283.5, F.z - hw, 362, F.z + hw, '#d9d2c6');
      // 벤치: 광장 안 분수를 보고 넷 + 동서 길 양옆 여덟 (길을 본다)
      // (2026-11-21) 광장 벤치는 둥글게: 네 귀퉁이에 둘씩, 분수를 본다
      [45, 135, 225, 315].flatMap(a0 => [-13, 13].map(d => (a0 + d) * PI / 180)).forEach(a => BENCHES.push({x:F.x + Math.cos(a) * 10.2, z:F.z + Math.sin(a) * 10.2, rot:Math.atan2(-Math.cos(a), -Math.sin(a))}));
      [-29, -20, 20, 29].forEach(dx => { BENCHES.push({x:F.x + dx, z:F.z - hw - 1.2, f:1}); BENCHES.push({x:F.x + dx, z:F.z + hw + 1.2, f:-1}); });
      // 가로등: 광장 네 귀 + 길 따라
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => W.place('parkLamp', {x:F.x + sx * 8.6, z:F.z + sz * 8.6}));
      [[-24.5, -hw - 1.3], [24.5, -hw - 1.3], [-34, hw + 1.3], [34, hw + 1.3], [hw + 1.3, -19], [-hw - 1.3, 19]].forEach(([dx, dz]) => W.place('parkLamp', {x:F.x + dx, z:F.z + dz}));
      // 광장 둘레 회양목 덩이 (길 사이 네 귀퉁이에 셋씩)
      W.placeMany('shrubBall', [45, 135, 225, 315].flatMap(a0 => [-14, 0, 14].map(da => { const a = (a0 + da) * PI / 180; return {x:F.x + Math.cos(a) * (RP + 1.6), z:F.z + Math.sin(a) * (RP + 1.6), y:Y + .05, rot:R() * 6}; })), {v:0, collide:false});
      // (2026-11-21) 네 귀퉁이 겨울나무는 지웠다: 광장이 탁 트여 보이게
    }
    // 공원 나무 · 가로등 · 정자 · 쉼터
    // (2026-11-17) 낮춘 마당 안의 나무 · 정자는 없앴다. 옹벽 밑(지금까지 벤치가 있던 자리)은 계단 둘레를 비우고 모두 화단, 벤치는 안쪽 네모 길로
    pitBeds();
    // (2026-11-18 2차) 피크닉 테이블은 없앴다 (너무 현대적)
    [[301, 143.3, 1], [343, 143.3, 1], [287, 193.4, -1], [329, 193.4, -1], [371, 193.4, -1]].forEach(([x, z, f]) => BENCHES.push({x, z, f}));
    // (2026-11-17) 공원 둘레 보도 벤치: 입구(계단 머리 · 횡단보도)를 피해, 등은 화단 쪽
    [238, 250, 278, 290, 356, 370, 402].forEach(x => BENCHES.push({x, z:210.95, f:-1}));   // (2026-11-20) 남쪽 입구가 북쪽과 같아져 벤치 자리도 북쪽과 같게                 // 남쪽 뒷길 북쪽 보도: 화단 띠 앞, 공원 쪽을 본다
    [238, 250, 278, 290, 356, 370, 402].forEach(x => BENCHES.push({x, z:130.9, f:-1}));                  // 윗길 남쪽 보도: 공원 둘레 화단 앞, 길 쪽을 본다
    [[262, 1], [276, 1], [290, 1], [338, 1], [350, 1], [362, 1]].forEach(([x]) => BENCHES.push({x, z:235.3, f:-1}));   // 남쪽 큰 가게 줄 화단 앞
    [...run(238, 402, 14).map(x => [x, 142.6]), ...run(238, 402, 14).map(x => [x, 194]), ...[157, 185].flatMap(z => [[236, z], [404, z]])].forEach(([x, z]) => { if (x > 282 && !near(x, [262, 281.7, 323, 363.7, 388], 2.5)) LAMPS.push({x, z}); });   // (2026-11-17) 서쪽 분수 광장(PK1, x < 282)은 가로등 없이
    // ── 상가: 북쪽 줄(정면 남쪽) · 남쪽 줄(정면 북쪽). 가운데 통로로 앞뒤를 지나갈 수 있다 ──
    // 북쪽 상가 3채 자리 (2026-11-16 삭제): 나무 화단과 벤치를 둔 쉼터
    // (2026-11-17) 북쪽 쉼터 화단은 모두 같은 모양: 폭 20, 가운데 가로등, 양옆 나무 둘, 앞에 벤치 둘 (동쪽 육교 계단 x 408~411은 비움)
    // (2026-11-22 15차) 상가 · 문구점이 들어와 동쪽 둘만 남긴다 (386 → 390: 초록 동과 간격). 나머지 자리는 벽돌 바닥
    [390, 423].forEach((x, i) => { bedStrip(x - 10, 98.5, x + 10, 106.5); [-6, 6].forEach((d, k) => tree(x + d, 102.5, 1, i + k)); LAMPS.push({x, z:102.5, y:.21});
      [x - 4.2, x + 4.2].forEach(bx => BENCHES.push({x:bx, z:106.95, f:1})); });   // 등은 화단, 앉으면 공원 쪽 길을 본다
    // ── 고깃집 · 마트 (정면 북쪽) + 뒤 주차장 ──
    bigShopsAndLots();
    // ── 북쪽 쉼터 줄(NL, 2026-11-22 15차 A안): 문구점(가운데 서쪽, 넓은 앞마당 · 오락기 · 딱지 마당)과 근린상가 네 동. 모두 정면이 남쪽(윗길) ──
    { const c = Math.cos(STN_AT.rot), s = Math.sin(STN_AT.rot), gy = W.groundY(STN_AT.x, STN_AT.z + 10);   // (2026-11-22) 문구점은 STN_AT 기준 (오락기 놀이와 같은 좌표)
      // (16차) 바닥 높이(벽돌 .15)에 맞춰 놓는다: 전에는 y 0이라 앞 물건이 15cm 묻히고 2cm 매트는 벽돌 밑에 숨었다
      STATIONERY_LAYOUT.forEach(([name, o, lx, ly, lz, r]) => W.place(name, {...o, x:STN_AT.x + (lx * c + lz * s) * U, z:STN_AT.z + (-lx * s + lz * c) * U, y:gy + ly * U, rot:STN_AT.rot + (r || 0)})); }
    NL_SHOPS.towers.forEach(([k, x]) => placeTower(W, k, x, NL_SHOPS.back + TOWER[k].D / 2 * U, 0));
    W.mmLabel(STN_AT.x, STN_AT.z + 1, '문구점', 9);
    // (16차) 게임존 · 키링존 이름표: 미니맵과 떠 있는 이름표 (놀이 중에는 숨는다)
    { const c = Math.cos(STN_AT.rot), s = Math.sin(STN_AT.rot); STATIONERY_ZONES.forEach(([t, lx, lz]) => { const x = STN_AT.x + (lx * c + lz * s) * U, z = STN_AT.z + (-lx * s + lz * c) * U; W.mmLabel(x, z, t, 7); spotLabel(t, x, 5.2, z); }); }
    // 공중전화 부스 둘: 문구점 동쪽 옆에 나란히, 열린 쪽이 남쪽 (2026-11-22 15차)
    W.placeMany('phoneBooth', PHONES.slice(3, 5));
  },
};
