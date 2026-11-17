// 구역 2: 공원과 상가 블록 (구획 2판 + 2026-11-15 사용자 수정).
//   북쪽 · 남쪽 상가 줄은 새 방식 상가(몸체 · 계단 · 간판)를 띄워 세우고, 정면이 마을버스 순환 도로(윗길 · 남쪽 뒷길)를 본다.
//   가게 사이와 뒤, 공원 둘레는 모두 벽돌 길이고 화단 띠와 나무로 나눈다. 동쪽 줄은 문구점 하나만 남겼다.
//   공원은 평지 (분수 광장 · 눈사람 잔디밭 · 정자 마당). 둘레 화단에는 횡단보도와 맞춘 입구를 낸다.
import * as THREE from '../../lib/three.js';
import { M, mesh } from '../../core/gfx.js';
import { W } from '../../world/world.js';
import { building } from '../../world/builders.js';
import { getProp } from '../../props/registry.js';
import { SHOP_LAYOUT } from '../../props/shops.js';
import { STATIONERY_LAYOUT } from '../../props/stationery.js';
import { placeTower, TOWER } from '../../props/shopTowers.js';
import { GROUND, slab, curb, bedStrip, TREES, LAMPS } from '../base.js';   // curb(x0, z0, x1, z1, 높이, 바닥 y)
import { mulberry } from '../../props/kit.js';
import { UNIT as U } from '../../config.js';
import { LOOP, SHOPS_N, SHOPS_S, CROSS_N, CROSS_S, EAST, PIT, BIG, BENCHES } from '../layout.js';
import { placeBig, MEAT, MART, BATH } from '../../props/bigShops.js';
import { flatXZ } from '../../core/meshkit.js';
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
  [['meat', MEAT.D], ['mart', MART.D]].forEach(([k, D]) => { const b = BIG[k], cz = BIG.back - D / 2 * U; placeBig(W, k, b.x, cz, PI);
    const [l0, l1] = b.lot, z0 = BIG.back + .2, z1 = 251;
    slab('asphalt', l0, BIG.back, l1, z1, .03); curb(l0 - .25, BIG.back, l0, z1, .19); curb(l1, BIG.back, l1 + .25, z1, .19); W.mmRect(l0, BIG.back, l1, z1, '#b9c2cc');
    const n = Math.floor((l1 - l0 - .6) / BW), x0 = (l0 + l1) / 2 - n * BW / 2;
    for (let i = 0; i <= n; i++) GROUND.add('paint', flatXZ(x0 + i * BW - .07, z0, x0 + i * BW + .07, z0 + BD, .045), 0xf2f4f5);
    GROUND.add('paint', flatXZ(x0, z0 + BD - .07, x0 + n * BW, z0 + BD + .07, .045), 0xf2f4f5);
    for (let i = 0; i < n; i++) { const x = x0 + (i + .5) * BW; stops.push({x, z:z0 + 1.05 * U, rot:0}); if (R2() > .6) continue; const it = {x:x + (R2() - .5) * .2, z:z0 + BD / 2 + .2, rot:PI + (R2() - .5) * .05, color:PAINT[Math.floor(R2() * PAINT.length)]};
      const t = R2(), key = t < .45 ? 'carSedan/' + Math.floor(R2() * 3) : t < .75 ? 'carSUV/' + Math.floor(R2() * 2) : 'carMini/' + Math.floor(R2() * 3); (cars[key] || (cars[key] = [])).push(it); }
    // 차 길 안내: 들어오는 화살표 두 개
    const [d0, d1] = b.drive; GROUND.add('paint', flatXZ((d0 + d1) / 2 - .12, 249.3, (d0 + d1) / 2 + .12, 250.8, .045), 0xf2f4f5); });
  W.placeMany('wheelStop', stops);
  Object.entries(cars).forEach(([key, list]) => { const [name, v] = key.split('/'); W.placeMany(name, list, {v:+v, snow:+v === 2 ? .35 : 1}); });
  W.mmLabel(BIG.meat.x, 236, '고깃집', 10); W.mmLabel(BIG.mart.x, 236, '마트', 10);
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
    { let a = 206; [BIG.meat.lot, BIG.mart.lot, [434, 434]].forEach(([l0, l1]) => { if (l0 > a) slab(B, a, BIG.back, l0, 251); a = l1; }); }
    [[206, zN - .25, 434, zN], [206, zN + w, 434, zN + w + .25], [206, zS - .25, 434, zS], [206, zS + w, 434, zS + w + .25]].forEach(r => curb(...r));
    W.mmRect(206, 94, 434, 132, '#e2cdc0'); W.mmRect(206, 205, 434, 251, '#e2cdc0'); W.mmRect(206, 132, 228, 205, '#e2cdc0'); W.mmRect(412, 132, 434, 205, '#e2cdc0');
    // ── 화단 띠 · 가로수 ──
    run(212, 430, 14).forEach((x, i) => { if (!near(x, [...CROSS_N, 230.5], 5)) { bedStrip(x - .8, zN - 2.7, x + .8, zN - 1.1); tree(x, zN - 1.9, .9, i); } });   // 윗길 북쪽 보도 나무 칸
    run(212, 430, 14).forEach((x, i) => { if (!near(x, [...CROSS_S], 5)) { bedStrip(x - .8, zS + w + 1.2, x + .8, zS + w + 2.8); tree(x, zS + w + 2, .9, i + 1); } });   // 남쪽 뒷길 남쪽 보도 나무 칸
    bedStrip(208, 211.8, 300, 213.8); bedStrip(328, 211.8, 432, 213.8); run(214, 296, 16).forEach((x, i) => tree(x, 212.8, .85, i + 2)); run(334, 430, 16).forEach((x, i) => tree(x, 212.8, .85, i + 3));
    bedStrip(213.8, 136, 216.2, 201); run(140, 198, 12).forEach((z, i) => tree(215, z, .9, i));                                                                // 서쪽 길
    // 북쪽 상가 사이 화단
    [[285, 300], [347, 365], [410, 432]].forEach(([a, b], i) => { if (b - a < 4) return; bedStrip(a + 1, 95, b - 1, 106); run(a + 4, b - 4, 9).forEach((x, k) => tree(x, 100.5, .95, i + k)); });
    [[206, 226], [254, 300], [327, 374], [402, 434]].forEach(([a, b], i) => { bedStrip(a + 1.5, 236, b - 1.5, 247); run(a + 5, b - 5, 10).forEach((x, k) => (k % 2 ? tree(x, 241.5, .9, i + k) : TREES.pine[(i + k) % 3].push({x, z:241.5, rot:R() * 6}))); });
    // ── 공원 둘레 화단 (입구는 횡단보도와 맞춘다) ──
    const edge = (a, b, gaps, mk) => { let s = a; [...gaps, [b, b]].forEach(([g0, g1]) => { if (g0 - s > 1) mk(s, g0); s = Math.max(s, g1); }); };
    edge(224, 416, [[CROSS_N[0] - 4, CROSS_N[0] + 4], [300, 346], [CROSS_N[2] - 4, CROSS_N[2] + 4]], (a, b) => { bedStrip(a, 132, b, 135); W.place('hedgeRow', {x:(a + b) / 2, z:133.5, len:(b - a - 1) / U}); });
    bedStrip(224, 202, 416, 205); W.place('hedgeRow', {x:320, z:203.5, len:(416 - 224 - 1) / U});   // (2026-11-17) 남쪽 계단을 없애 입구 없이 한 줄
    edge(135, 202, [[152.5, 159.5], [178.5, 185.5]], (a, b) => bedStrip(224, a, 228, b));
    edge(135, 202, [[154.5, 161.5], [164, 178], [180.5, 187.5]], (a, b) => bedStrip(412, a, 416, b));
    // ── 공원 바닥: 둘레 길은 땅 높이, 그 안쪽은 낮춘 마당(PIT). 옹벽(앉음벽) 위로는 못 넘고 계단으로 드나든다 ──
    sunkenPark();
    slab('bed', PIT.x0, PIT.z0, PIT.x1, PIT.z1, PIT.y + .05); W.mmRect(228, 135, 412, 202, '#d2e0d0'); W.mmRect(PIT.x0, PIT.z0, PIT.x1, PIT.z1, '#c8d8c6'); W.mmLabel(320, 168, '공원', 22);
    [[280, PIT.z0, 283.5, PIT.z1], [362, PIT.z0, 365.5, PIT.z1]].forEach(r => slab('perm', ...r, PIT.y + .13));
    const PY = .15; [[231, 138, 409, 141.5], [231, 195.5, 409, 199], [231, 141.5, 234.5, 195.5], [405.5, 141.5, 409, 195.5]].forEach(r => slab('perm', ...r, PIT.y + .13));   // 잔디보다 8cm 위 (겹쳐 깜빡이지 않게)   // 둘레 길 (낮춘 마당)
    [[CROSS_N[0] - 4, 132, CROSS_N[0] + 4, 135], [300, 132, 346, 135], [CROSS_N[2] - 4, 132, CROSS_N[2] + 4, 135],                // 둘레 화단 입구 (땅 높이, 계단 머리)
      [224, 152.5, 228, 159.5], [224, 178.5, 228, 185.5], [412, 154.5, 416, 161.5], [412, 180.5, 416, 187.5], [412, 164, 416, 178]].forEach(r => slab('perm', ...r, PY));
    const fc = new THREE.CircleGeometry(14, 48); fc.rotateX(-PI / 2); fc.translate(253, PIT.y + .08, 171); { const p = fc.getAttribute('position'), uv = fc.getAttribute('uv'); for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); }
    GROUND.add('paver', fc, 0xffffff);
    // 분수대 (예전 자리)
    const FY = PIT.y;
    mesh(new THREE.CylinderGeometry(6,6.2,.65,44), M(0xcfd8e3), 253, FY + .325, 171).receiveShadow = true;
    mesh(new THREE.CylinderGeometry(5.3,5.3,.1,44), M(0xdfeaf2), 253, FY + .66, 171);
    mesh(new THREE.CylinderGeometry(.7,.95,1.8,16), M(0xcfd8e3), 253, FY + 1.4, 171);
    mesh(new THREE.CylinderGeometry(1.8,1,.5,20), M(0xcfd8e3), 253, FY + 2.5, 171);
    mesh(new THREE.SphereGeometry(.55,16,10), M(0xf8fbfd), 253, FY + 2.95, 171);
    W.circle(253,171,6.2); W.mmCircle(253,171,6.2,'#c9d4df');
    // 공원 나무 · 가로등 · 정자 · 쉼터
    // (2026-11-17) 낮춘 마당 안의 나무 · 정자는 없앴다. 옹벽 밑(지금까지 벤치가 있던 자리)은 계단 둘레를 비우고 모두 화단, 벤치는 안쪽 네모 길로
    pitBeds();
    [[301, 143.3, 1], [343, 143.3, 1], [287, 193.4, -1], [329, 193.4, -1], [371, 193.4, -1]].forEach(([x, z, f]) => BENCHES.push({x, z, f}));
    [...run(238, 402, 14).map(x => [x, 142.6]), ...run(238, 402, 14).map(x => [x, 194]), ...[157, 185].flatMap(z => [[236, z], [404, z]])].forEach(([x, z]) => { if (!near(x, [262, 281.7, 323, 363.7, 388], 2.5)) LAMPS.push({x, z}); });
    // ── 상가: 북쪽 줄(정면 남쪽) · 남쪽 줄(정면 북쪽). 가운데 통로로 앞뒤를 지나갈 수 있다 ──
    placeBig(W, 'bath', SHOPS_S.xs[0], BIG.back - BATH.D / 2 * U, PI);   // (2026-11-17) 남쪽 줄 가운데 '동화상가'를 목욕탕으로
    // 북쪽 상가 3채 자리 (2026-11-16 삭제): 나무 화단과 벤치를 둔 쉼터
    SHOPS_N.xs.forEach((x, i) => { bedStrip(x - 9, 98.5, x + 9, 106.5); run(x - 6, x + 6, 6).forEach((tx, k) => tree(tx, 102.5, 1, i + k));
      [x - 5, x + 5].forEach(bx => BENCHES.push({x:bx, z:106.95, f:1})); });   // 등은 화단, 앉으면 공원 쪽 길을 본다
    // ── 고깃집 · 마트 (정면 북쪽) + 뒤 주차장 ──
    bigShopsAndLots();
    W.mmLabel(314, 236, '목욕탕', 10);
    // ── 동쪽 줄 (정면 서쪽, 공원을 본다): 가운데 문구점, 북쪽 · 남쪽에 근린상가 두 동씩. 뒤쪽이 순환 도로 보도(x 434)에 맞닿는다 ──
    const R0 = -PI / 2, at = (cx, cz, lx, lz) => [cx + (lx * Math.cos(R0) + lz * Math.sin(R0)) * U, cz + (-lx * Math.sin(R0) + lz * Math.cos(R0)) * U];
    STATIONERY_LAYOUT.forEach(([name, o, lx, ly, lz, r]) => { const [x, z] = at(EAST.shop.x, EAST.shop.z, lx, lz); W.place(name, {...o, x, z, y:ly * U, rot:R0 + (r || 0)}); });
    EAST.towers.forEach(([k, z]) => placeTower(W, k, EAST.front + TOWER[k].D / 2 * U, z, R0));
    W.mmLabel(426, 171, '문구점', 9);
  },
};
