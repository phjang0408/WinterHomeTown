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
import { GROUND, slab, curb, bedStrip, TREES, LAMPS } from '../base.js';
import { mulberry } from '../../props/kit.js';
import { UNIT as U } from '../../config.js';
import { LOOP, SHOPS_N, SHOPS_S, CROSS_N, CROSS_S, EAST } from '../layout.js';

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

export default {
  id:'park', name:'공원과 상가',
  build(){
    const zN = LOOP.zN, zS = LOOP.zS, w = LOOP.w, B = 'brick';
    // ── 바닥: 벽돌 길 (육교 마당, 북쪽 상가 줄, 윗길 보도, 서쪽 · 동쪽 길, 아랫길 · 남쪽 뒷길 보도, 남쪽 상가 줄) ──
    slab(B, 206, 94, 434, zN); slab(B, 206, zN + w, 434, 132);
    slab(B, 206, 132, 224, 205); slab(B, 416, 132, 434, 205);
    slab(B, 206, 205, 434, zS); slab(B, 206, zS + w, 434, 251);
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
    edge(224, 416, CROSS_S.map(x => [x - 4, x + 4]), (a, b) => { bedStrip(a, 202, b, 205); W.place('hedgeRow', {x:(a + b) / 2, z:203.5, len:(b - a - 1) / U}); });
    edge(135, 202, [[152.5, 159.5], [178.5, 185.5]], (a, b) => bedStrip(224, a, 228, b));
    edge(135, 202, [[154.5, 161.5], [164, 178], [180.5, 187.5]], (a, b) => bedStrip(412, a, 416, b));
    // ── 공원 바닥: 눈 덮인 잔디 + 둘레 길 · 가로지르는 길 · 분수 광장 ──
    slab('bed', 228, 135, 412, 202, .05); W.mmRect(228, 135, 412, 202, '#d2e0d0'); W.mmLabel(320, 168, '공원', 22);
    const PY = .075; [[231, 138, 409, 141.5], [231, 195.5, 409, 199], [231, 141.5, 234.5, 195.5], [405.5, 141.5, 409, 195.5], [280, 141.5, 283.5, 195.5], [362, 141.5, 365.5, 195.5],
      [CROSS_N[0] - 2, 135, CROSS_N[0] + 2, 138], [300, 135, 346, 138], [CROSS_N[2] - 2, 135, CROSS_N[2] + 2, 138], ...CROSS_S.map(x => [x - 2, 199, x + 2, 202]),
      [224, 152.5, 231, 159.5], [224, 178.5, 231, 185.5], [409, 154.5, 416, 161.5], [409, 180.5, 416, 187.5], [405.5, 164, 416, 178]].forEach(r => slab('perm', ...r, PY));
    const fc = new THREE.CircleGeometry(14, 48); fc.rotateX(-PI / 2); fc.translate(253, PY + .005, 171); { const p = fc.getAttribute('position'), uv = fc.getAttribute('uv'); for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); }
    GROUND.add('paver', fc, 0xffffff);
    // 분수대 (예전 자리)
    mesh(new THREE.CylinderGeometry(6,6.2,.65,44), M(0xcfd8e3), 253, .325, 171).receiveShadow = true;
    mesh(new THREE.CylinderGeometry(5.3,5.3,.1,44), M(0xdfeaf2), 253, .66, 171);
    mesh(new THREE.CylinderGeometry(.7,.95,1.8,16), M(0xcfd8e3), 253, 1.4, 171);
    mesh(new THREE.CylinderGeometry(1.8,1,.5,20), M(0xcfd8e3), 253, 2.5, 171);
    mesh(new THREE.SphereGeometry(.55,16,10), M(0xf8fbfd), 253, 2.95, 171);
    W.circle(253,171,6.2); W.mmCircle(253,171,6.2,'#c9d4df');
    // 공원 나무 · 가로등 · 정자 · 쉼터
    run(240, 400, 13).forEach((x, i) => { if (!near(x, [262, 281.7, 323, 363.7, 388], 3)) { tree(x, 144.5, 1, i); if (x < 296 || x > 368) tree(x, 192, 1, i + 1); } });
    [[238, 160], [238, 182], [268, 158], [268, 184]].forEach(([x, z], i) => TREES.pine[i % 3].push({x, z, rot:R() * 6}));
    [...run(238, 402, 14).map(x => [x, 142.6]), ...run(238, 402, 14).map(x => [x, 194]), ...[157, 185].flatMap(z => [[236, z], [404, z]])].forEach(([x, z]) => { if (!near(x, [262, 281.7, 323, 363.7, 388], 2.5)) LAMPS.push({x, z}); });
    W.place('pavilion', {x:384, z:157, rot:PI}); W.mmRect(379, 152, 389, 162, '#cdb79e');
    [[372, 186, 0], [396, 186, 0]].forEach(([x, z, r]) => W.place('bench', {x, z, rot:r}));
    // ── 상가: 북쪽 줄(정면 남쪽) · 남쪽 줄(정면 북쪽). 가운데 통로로 앞뒤를 지나갈 수 있다 ──
    shopRow(SHOPS_N.xs, SHOPS_N.z, 0, [1]); shopRow(SHOPS_S.xs, SHOPS_S.z, PI, [1]);
    W.mmLabel(323, 101, '동화상가', 11); W.mmLabel(314, 243, '동화상가', 11);
    // ── 동쪽 줄 (정면 서쪽, 공원을 본다): 가운데 문구점, 북쪽 · 남쪽에 근린상가 두 동씩. 뒤쪽이 순환 도로 보도(x 434)에 맞닿는다 ──
    const R0 = -PI / 2, at = (cx, cz, lx, lz) => [cx + (lx * Math.cos(R0) + lz * Math.sin(R0)) * U, cz + (-lx * Math.sin(R0) + lz * Math.cos(R0)) * U];
    STATIONERY_LAYOUT.forEach(([name, o, lx, ly, lz, r]) => { const [x, z] = at(EAST.shop.x, EAST.shop.z, lx, lz); W.place(name, {...o, x, z, y:ly * U, rot:R0 + (r || 0)}); });
    EAST.towers.forEach(([k, z]) => placeTower(W, k, EAST.front + TOWER[k].D / 2 * U, z, R0));
    W.mmLabel(426, 171, '문구점', 9);
  },
};
