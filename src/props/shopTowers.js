// 공원 동쪽의 좁은 근린상가 4동 (사용자 참고 그림, 2026-11-15). 건물 몸체(토대)만 이 파일에서 만들고, 간판은 기존 간판 소품
//   (signFascia · signVertical · signRoof에 글자 옵션)을, 차양 · 음료 냉장고 · 음식물 쓰레기통도 기존 소품을 그대로 붙인다.
//   새로 만든 것은 기존에 없던 작은 소품 셋뿐: 이발소 회전등, 과일 좌판, 배달 오토바이.
//   몸체 4종: 붉은 벽돌 5층(물탱크 · 실외기 · 전선 다발), 베이지 타일 6층(유리 계단실 · 옥탑 · 십자가),
//             회색 타일 4층(옆면 벽돌 · 바깥 비상계단), 회색 콘크리트 5층(초록 타일 띠 · 옥탑 · 위성 안테나 · 옥상 난간).
//   치수 약속: 1층 높이 3.6m(유리 0~2.7m, 가로 간판 자리 2.8~3.52m), 2층부터 한 층 3m. 층마다 간판 자리는 층 바닥 +0.12~0.82m, 창은 +0.95~2.5m.
//   가게 안에는 들어가지 않는다(유리 너머로 안이 보이기만 한다). 상호는 모두 지어낸 이름. 미터 단위, 원점은 바닥 가운데, 정면 +z.
import * as THREE from '../lib/three.js';
import { defineProp, buildProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, lathe, ridge, blob, xf, groundAO, triCount, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, metalMaterial, concreteMaterial, plasticMaterial, glassMaterial, clearMaterial, brickWallMaterial, tileWallMaterial, paintMaterial, woodMaterial } from '../core/texkit.js';
import { assemble, mulberry } from './kit.js';
import { UNIT } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();
const glow = () => once('glow', () => new THREE.MeshBasicMaterial({vertexColors:true}));
const steel = () => paintMaterial(0xffffff, {seed:27, gloss:.4, metal:.35});
export const TW = {G:3.6, F:3, PAR:.9};
const GOODS = [0xd83a2e, 0xf2b632, 0x2f6fb5, 0x3f8a5a, 0xe8742a, 0xb0558a, 0xf4f1e6, 0x7fc6e8];
const WIN = [0x2c3a46, 0x34424f, 0x3d4a55, 0x6f7b84, 0x9c9480];        // 창 유리 색: 어두운 유리 셋, 블라인드, 커튼

// ───────── 몸체 4종의 치수와 꾸밈 ─────────
//   bays: 1층 칸 [x0, x1, 'shop' | 'door'] (칸 사이는 벽 기둥), wins: 정면 창 [x0, x1], side: 옆면 창의 z 범위, wall: 벽 재질 키, wc: 벽 정점 색, band: 층 띠
export const TOWER = {
  brick:{label:'붉은 벽돌 5층', W:8, D:11, n:5, wall:'brk', wc:0xffffff, band:['con', 0xd9d5cc], seed:11,
    bays:[[-3.7, 1.3, 'shop'], [1.7, 3.7, 'door']], wins:[[-3.4, -.35], [.35, 3.4]], side:[[-3.4, -2.2], [1.2, 2.4]], back:[[-2.6, -1.4], [1.4, 2.6]]},
  beige:{label:'베이지 타일 6층', W:8.6, D:11, n:6, wall:'tile', wc:0xe3d2b2, band:['tile', 0xc9b48e], seed:23,
    bays:[[-4, -.15, 'shop'], [.25, 2.4, 'shop'], [2.8, 4, 'door']], wins:[[-3.9, -1.45], [-.95, 1.95]], side:[[-3.4, -2.2], [-.6, .6]], back:[[-2.8, -1.6], [.4, 1.6]], stair:[2.55, 4.05]},
  gray:{label:'회색 타일 4층', W:7.4, D:10, n:4, wall:'tile', wc:0xc5c6c2, band:['tile', 0x9fa3a3], seed:37, sideBrick:true,
    bays:[[-3.4, 1, 'shop'], [1.4, 3.4, 'door']], wins:[[-3.1, -.4], [.4, 3.1]], side:[[-3, -1.8], [1.6, 2.8]], back:[[-2.4, -1.2], [1.2, 2.4]]},
  green:{label:'회색 콘크리트 5층 (초록 띠)', W:9, D:11, n:5, wall:'cw', wc:0xc2c1bb, band:['tile', 0x5a8a6b], seed:41,
    bays:[[-4.2, .2, 'shop'], [.6, 2.4, 'door'], [2.8, 4.2, 'shop']], wins:[[-4, -2.2], [-1.6, 1.4], [2, 4]], side:[[-3.4, -2.2], [1.2, 2.4]], back:[[-3, -1.8], [1.8, 3]]},
};
export const floorY = f => f <= 1 ? 0 : TW.G + (f - 2) * TW.F;        // f층 바닥 높이 (1층 = 0)
const topOf = S => TW.G + (S.n - 1) * TW.F;

function tower(S){
  const {W, D, n, wall:WK, wc} = S, {G, F, PAR} = TW, hw = W / 2, hd = D / 2, top = topOf(S), P = new Parts(), R = mulberry(S.seed);
  const wall = (g, c = wc) => P.add(WK, g, c), con = (g, c = 0xd5d3cc) => P.add('con', g, c), met = (g, c = 0xc5cbcf) => P.add('met', g, c);
  const band = (g) => P.add(S.band[0], g, S.band[1]);
  // 덩어리: 2층 이상 통짜, 1층은 가게 깊이(1.2m)만큼 앞을 비운다
  wall(box(-hw, G, -hd, hw, top, hd)); wall(box(-hw, 0, -hd, hw, G, hd - 1.2)); wall(box(-hw, 2.75, hd - 1.2, hw, G, hd));
  const edges = [-hw, ...S.bays.flatMap(b => [b[0], b[1]]), hw];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1] - edges[i] > .01) wall(box(edges[i], 0, hd - 1.2, edges[i + 1], 2.75, hd));   // 칸 사이 기둥
  con(box(-hw - .03, 0, -hd - .03, hw + .03, .3, hd + .03), 0xa9a8a2);                                          // 밑동
  con(box(-hw - .05, 0, hd, hw + .05, .12, hd + .45, .02), 0xbab7b0);                                           // 앞 턱
  if (S.sideBrick) P.add('brk', box(-hw - .03, .3, -hd, -hw, top + PAR, hd), 0xffffff);                          // 옆면만 붉은 벽돌
  // 1층 칸: 가게는 유리 너머로 바닥 · 천장 · 진열대가 보이고, 상가 입구는 어두운 계단이 보인다
  S.bays.forEach(([x0, x1, k]) => {
    const z0 = hd - 1.2, zg = hd - .25;
    con(box(x0, 0, z0, x1, .12, hd), k === 'door' ? 0x9c9a94 : 0x8a8780); P.add('int', box(x0, 2.6, z0, x1, 2.75, hd - .02), 0xeeeee8);
    if (k === 'shop') {
      P.add('int', box(x0, .12, z0, x1, 2.6, z0 + .02), 0xece8dc);
      [.45, .95, 1.45].forEach(y => { P.add('met', box(x0 + .1, y - .02, z0, x1 - .1, y, z0 + .4), 0xb7bcc0);
        for (let x = x0 + .14; x < x1 - .2;) { const w = .08 + R() * .16, h = .08 + R() * .2; P.add('pla', box(x, y, z0 + .05, x + w, y + h, z0 + .05 + .12 + R() * .2), GOODS[Math.floor(R() * GOODS.length)]); x += w + .01; } });
      P.add('glow', box(x0 + .3, 2.56, z0 + .5, x1 - .3, 2.6, z0 + .62), 0xf4f8ff);
      P.add('clr', box(x0 + .03, .12, zg - .01, x1 - .03, 2.7, zg + .01));
      [x0, (x0 + x1) / 2, x1].forEach((x, i) => met(box(x - (i === 2 ? .06 : 0) - (i === 1 ? .03 : 0), .12, zg - .04, x + (i === 0 ? .06 : 0) + (i === 1 ? .03 : 0), 2.75, zg + .04), 0x9ea5ab));
      [[.12, .2], [2.66, 2.75], [.9, .95]].forEach(([a, b]) => met(box(x0, a, zg - .04, x1, b, zg + .04), 0x9ea5ab));
    } else {
      P.add('int', box(x0, .12, z0, x1, 2.6, z0 + .02), 0x3d4247);
      for (let k = 0; k < 4; k++) con(box(x0 + .1, .12 + k * .18, z0 + .02 + (3 - k) * .22, x1 - .1, .12 + (k + 1) * .18, z0 + .9), 0xa7a59f);   // 안쪽 계단
      [x0, x1].forEach((x, i) => met(box(x - (i ? .07 : 0), .12, zg - .05, x + (i ? 0 : .07), 2.4, zg + .05), 0x7e868c)); met(box(x0, 2.33, zg - .05, x1, 2.4, zg + .05), 0x7e868c);
      P.add('clr', box(x0 + .07, .12, zg - .15, (x0 + x1) / 2 - .02, 2.33, zg - .13)); met(box((x0 + x1) / 2 - .06, .12, zg - .16, (x0 + x1) / 2 + .06, 2.33, zg - .1), 0x7e868c);   // 열어 둔 유리문
      P.add('pla', box(x0 + .15, 1.2, z0 + .02, x0 + .75, 1.8, z0 + .14), 0xc9cdd1);                                // 우편함
    }
  });
  // 층 띠: 층마다 건물을 한 바퀴 두른다
  for (let f = 2; f <= n; f++) { const y = floorY(f); band(box(-hw - .04, y - .1, -hd - .04, hw + .04, y + .08, hd + .04)); }
  // 창: 유리(색 제각각) + 알루미늄 틀 + 창턱. ax: 'z'면 정면 · 뒷면(s = ±1), 'x'면 옆면
  const win = (ax, s, a, b, ya, yb) => {
    const c = WIN[Math.floor(R() * WIN.length)], o = ax === 'z' ? hd : hw;
    const B = (u0, v0, w0, u1, v1, w1) => ax === 'z' ? box(u0, v0, s * w0, u1, v1, s * w1) : box(s * w0, v0, u0, s * w1, v1, u1);
    P.add('gls', B(a, ya, o - .06, b, yb, o + .015), c);
    [[a - .05, a], [b, b + .05], [(a + b) / 2 - .025, (a + b) / 2 + .025]].forEach(([p, q]) => met(B(p, ya, o, q, yb, o + .045)));
    [[ya - .05, ya], [yb, yb + .05]].forEach(([p, q]) => met(B(a - .05, p, o, b + .05, q, o + .045)));
    con(B(a - .1, ya - .13, o, b + .1, ya - .05, o + .1), 0xd2d0c9);
  };
  for (let f = 2; f <= n; f++) { const y = floorY(f);
    S.wins.forEach(([a, b]) => { if (!(S.stair && b > S.stair[0] - .05)) win('z', 1, a, b, y + .95, y + 2.5); });
    S.back.forEach(([a, b]) => win('z', -1, a, b, y + 1.1, y + 2.2));
    S.side.forEach(([a, b]) => { win('x', 1, a, b, y + 1.1, y + 2.2); if (!S.sideBrick) win('x', -1, a, b, y + 1.1, y + 2.2); }); }
  // 옥상: 바닥, 난간벽, 갓돌, 눈
  con(box(-hw + .2, top, -hd + .2, hw - .2, top + .1, hd - .2), 0xc4c2bb);
  [[-hw, -hd, hw, -hd + .2], [-hw, hd - .2, hw, hd], [-hw, -hd, -hw + .2, hd], [hw - .2, -hd, hw, hd]].forEach(([a, b, c, d]) => wall(box(a, top, b, c, top + PAR, d)));
  con(box(-hw - .05, top + PAR, -hd - .05, hw + .05, top + PAR + .08, hd + .05), 0xd8d6cf);
  P.add('snw', box(-hw + .25, top + .1, -hd + .25, hw - .25, top + .18, hd - .25, .03));
  [[-hw, hd, hw, hd], [-hw, -hd, hw, -hd]].forEach(([a, z, b]) => P.add('snw', ridge([a, a / 2, 0, b / 2, b].map(x => V(x, top + PAR + .08, z)), .2, .06, 4)));
  [-hw, hw].forEach(x => P.add('snw', ridge([-hd, -hd / 2, 0, hd / 2, hd].map(z => V(x, top + PAR + .08, z)), .2, .06, 4)));
  // 옥탑방 · 계단실: 벽, 문, 작은 창, 지붕 판과 눈
  const hut = (x0, z0, x1, z1, h, door = 0x5d7f72) => { const y = top + .1;
    wall(box(x0, y, z0, x1, y + h, z1)); con(box(x0 - .1, y + h, z0 - .1, x1 + .1, y + h + .12, z1 + .1), 0xd0cec7);
    met(box(x1 - 1.15, y, z1, x1 - .25, y + 2.05, z1 + .04), door); met(box(x1 - .4, y + 1, z1 + .04, x1 - .33, y + 1.08, z1 + .1), 0xd9dde0);
    P.add('gls', box(x0 + .35, y + 1.2, z1 - .02, x0 + 1.05, y + 1.8, z1 + .02), 0x34424f);
    P.add('snw', box(x0 - .05, y + h + .12, z0 - .05, x1 + .05, y + h + .2, z1 + .05, .03)); return y + h + .12; };
  // 실외기: 벽에 붙이거나 옥상에 놓는다 (ry로 방향)
  const ac = (x, y, z, ry = 0) => { const T = g => xf(g, {ry, x, y, z});
    P.add('met', T(box(-.4, 0, -.15, .4, .58, .15, .02)), 0xe9eae7); P.add('mat', T(xf(new THREE.CylinderGeometry(.2, .2, .02, 16), {rx:Math.PI / 2, x:-.12, y:.29, z:.155})), 0x3a3f44);
    for (let k = -2; k <= 2; k++) P.add('met', T(box(-.33, .29 + k * .07 - .008, .158, .09, .29 + k * .07 + .008, .17)), 0xc8cbcc);
    P.add('snw', T(box(-.4, .58, -.15, .4, .63, .15, .02))); };
  const wallAC = (x, y, z, ry) => { ac(x, y, z, ry); const T = g => xf(g, {ry, x, y, z}); [-.3, .3].forEach(u => P.add('met', T(box(u - .02, -.06, -.2, u + .02, 0, .2)), 0x8f969c)); };
  // ── 몸체별 꾸밈 ──
  if (S === TOWER.brick) {
    hut(1.2, -4.8, 3.6, -2.2, 2.6);
    // 파란 물탱크: 철골 받침 위 FRP 상자, 판 이음 줄
    const tx = -1.4, tz = -2.6, ty = top + .1;
    [[-1.1, -.7], [1.1, -.7], [-1.1, .7], [1.1, .7]].forEach(([a, b]) => met(box(tx + a - .05, ty, tz + b - .05, tx + a + .05, ty + .75, tz + b + .05), 0x6d757b));
    [-.7, .7].forEach(b => met(box(tx - 1.2, ty + .65, tz + b - .06, tx + 1.2, ty + .75, tz + b + .06), 0x6d757b));
    P.add('pla', box(tx - 1.25, ty + .75, tz - .85, tx + 1.25, ty + 2.2, tz + .85, .05), 0x2f86d0);
    for (let y = ty + 1.05; y < ty + 2.1; y += .36) P.add('pla', box(tx - 1.27, y, tz - .87, tx + 1.27, y + .05, tz + .87), 0x2a76b8);
    for (let x = -.8; x <= .8; x += .8) P.add('pla', box(tx + x - .025, ty + .75, tz + .85, tx + x + .025, ty + 2.2, tz + .87), 0x2a76b8);
    P.add('pla', box(tx - .3, ty + 2.2, tz - .3, tx + .3, ty + 2.28, tz + .3), 0x2a76b8); met(tube([V(tx + 1, ty + .8, tz), V(tx + 1.5, ty + .8, tz), V(tx + 1.5, ty + .1, tz)], .04, {radial:6}), 0x9aa0a5);
    P.add('snw', xf(blob(1.1, .1, .7, {seed:3, bump:.2, seg:10}), {x:tx, y:ty + 2.2, z:tz}));
    // 실외기: 오른쪽 옆벽에 층마다, 옥상에 둘
    for (let f = 2; f <= n - 1; f++) wallAC(hw + .2, floorY(f) + .5, -.4, Math.PI / 2);
    ac(-2.6, top + .1, 1.5); ac(-1.5, top + .1, 1.5);
    // 전선 다발: 옥상 오른쪽 앞 모서리에서 벽을 타고 내려와 1층 위 계량함으로
    for (let k = 0; k < 4; k++) { const dz = .08 + k * .05, dx = k * .03;
      P.add('mat', tube([V(hw - .1, top + PAR, hd + .05), V(hw + .08 + dx, top + .3, hd - dz), V(hw + .06 + dx, top - 3, hd - dz - .02), V(hw + .09 + dx, G + 2, hd - dz), V(hw + .07 + dx, 3.1, hd - dz)], .018, {radial:5, seg:24}), 0x2b2e31); }
    met(box(hw, 2.6, hd - .5, hw + .25, 3.2, hd - .05, .02), 0xb0b5b8);
  }
  if (S === TOWER.beige) {
    // 유리 계단실: 2층부터 옥상 난간까지 앞으로 튀어나온 녹색 유리 띠, 층마다 가로살
    const [a, b] = S.stair;
    P.add('gls', box(a, G - .1, hd - .05, b, top + PAR, hd + .2), 0x5b8a84);
    [a, b, (a + b) / 2].forEach(x => met(box(x - .04, G - .1, hd + .2, x + .04, top + PAR, hd + .25), 0xd6dadc));
    for (let f = 2; f <= n; f++) [floorY(f) + .02, floorY(f) + 1.5].forEach(y => met(box(a, y - .04, hd + .2, b, y + .04, hd + .25), 0xd6dadc));
    con(box(a - .06, top + PAR, hd - .1, b + .06, top + PAR + .1, hd + .28), 0xd8d6cf);
    // 옥탑(교회 사무실) + 붉은 십자가 탑
    const hy = hut(-1.6, -3.2, 2.2, .4, 2.8, 0x8a5a3c);
    const cx = .3, cz = -1.4;
    [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]].forEach(([p, q]) => met(tube([V(cx + p, hy, cz + q), V(cx + p * .4, hy + 3, cz + q * .4)], .03, {radial:5}), 0x8f969c));
    for (let k = 0; k < 5; k++) { const y = hy + .3 + k * .55, s = .25 * (1 - (y - hy) / 3 * .6); met(box(cx - s, y, cz - s, cx + s, y + .04, cz + s), 0x8f969c); }
    P.add('glow', box(cx - .07, hy + 2.6, cz - .07, cx + .07, hy + 4.5, cz + .07), 0xff3b30); P.add('glow', box(cx - .55, hy + 3.75, cz - .07, cx + .55, hy + 3.89, cz + .07), 0xff3b30);
    ac(2.6, top + .1, -4); ac(-3.4, top + .1, -4.2, Math.PI);
    for (let f = 3; f <= n - 1; f += 2) wallAC(-hw - .2, floorY(f) + .5, 1.6, -Math.PI / 2);
  }
  if (S === TOWER.gray) {
    hut(-.6, -4.4, 1.8, -2, 2.6);
    ac(2.3, top + .1, 2.4); ac(2.3, top + .1, 1.4); met(tube([V(-2.6, top + .1, -3.4), V(-2.6, top + 3.2, -3.4)], .03, {radial:6}), 0x9aa0a5);
    [[-2.6, top + 2.4], [-2.6, top + 2.9]].forEach(([x, y]) => met(box(x - .5, y, -3.42, x + .5, y + .03, -3.38), 0x9aa0a5));
    // 바깥 비상계단 (왼쪽 벽돌면): 층마다 작은 참을 앞 · 뒤 번갈아 두고 지그재그 계단으로 잇는다. 땅에서 첫 참까지도 계단
    const xo = -hw - .95, xi = -hw - .05, zA = -3.4, zB = 3.4, L = 1.2, stl = (g, c = 0x4f5c5c) => P.add('stl', g, c);
    const lv = [0]; for (let f = 2; f <= n; f++) lv.push(floorY(f));
    lv.forEach((y, i) => { if (!i) return; const atA = i % 2 === 1, z0 = atA ? zA : zB - L, z1 = atA ? zA + L : zB;
      stl(box(xo, y - .06, z0, xi, y, z1)); P.add('snw', box(xo + .03, y, z0 + .03, xi - .03, y + .05, z1 - .03, .02));
      [[xo, z0], [xo, z1]].forEach(([x, z]) => stl(box(x - .025, y, z - .025, x + .025, y + 1, z + .025)));
      stl(tube([V(xo, y + 1, z0), V(xo, y + 1, z1)], .022, {radial:5})); stl(tube([V(xo, y + 1, atA ? z0 : z1), V(xi, y + 1, atA ? z0 : z1)], .022, {radial:5}));
      met(box(-hw - .04, y, (z0 + z1) / 2 - .45, -hw, y + 2.05, (z0 + z1) / 2 + .45), 0x6a7a74); });
    for (let i = 0; i < lv.length - 1; i++) { const ya = lv[i], yb = lv[i + 1], up = i % 2 === 0, za = up ? zB - (i ? L : 0) : zA + L, zb = up ? zA + L : zB - L, steps = Math.round((yb - ya) / .2);
      [xo + .05, xi - .05].forEach(x => stl(tube([V(x, ya, za), V(x, yb, zb)], .035, {radial:5})));
      stl(tube([V(xo + .02, ya + 1, za), V(xo + .02, yb + 1, zb)], .022, {radial:5}));
      for (let k = 1; k < steps; k++) { const t = k / steps, y = ya + (yb - ya) * t, z = za + (zb - za) * t; stl(box(xo + .06, y - .03, z - .12, xi - .06, y, z + .12)); } }
  }
  if (S === TOWER.green) {
    const hy = hut(-3.9, -4.6, -.4, -1.4, 2.6, 0x46695a);
    // 위성 안테나: 옥탑 지붕 위, 접시는 남쪽(정면)으로
    met(tube([V(-1.4, hy, -2.6), V(-1.4, hy + .8, -2.6)], .03, {radial:6}), 0x9aa0a5);
    P.add('pla', xf(lathe([[0, -.12], [.2, -.1], [.38, -.04], [.45, 0], [.44, .01], [.37, -.03], [.19, -.09], [0, -.11]], 18), {rx:-1.2, x:-1.4, y:hy + .9, z:-2.5}), 0xe9eaea);
    met(tube([V(-1.4, hy + .75, -2.55), V(-1.4, hy + 1.05, -2.1)], .015, {radial:4}), 0x9aa0a5); met(box(-1.46, hy + 1.02, -2.16, -1.34, hy + 1.12, -2.04), 0x6d757b);
    // 옥상 난간: 난간벽 위 기둥과 손잡이 (정면 · 옆)
    const ry = top + PAR + .08, rail = (a, b) => { met(tube([a, b], .025, {radial:5}), 0xd0d4d6); };
    for (let x = -hw + .1; x <= hw - .1 + 1e-6; x += (W - .2) / 7) met(box(x - .02, ry, hd - .12, x + .02, ry + .9, hd - .08), 0xd0d4d6);
    rail(V(-hw + .1, ry + .9, hd - .1), V(hw - .1, ry + .9, hd - .1)); rail(V(-hw + .1, ry + .45, hd - .1), V(hw - .1, ry + .45, hd - .1));
    [-hw + .1, hw - .1].forEach(x => { for (let z = hd - .1; z >= -hd + .1 - 1e-6; z -= (D - .2) / 8) met(box(x - .02, ry, z - .02, x + .02, ry + .9, z + .02), 0xd0d4d6);
      rail(V(x, ry + .9, hd - .1), V(x, ry + .9, -hd + .1)); });
    ac(1.4, top + .1, -3.6); ac(2.4, top + .1, -3.6); ac(3.4, top + .1, -3.6);
    for (let f = 2; f <= n - 1; f++) wallAC(hw + .2, floorY(f) + .5, -2.4, Math.PI / 2);
    // 초록 타일 세로 기둥: 정면 양 끝
    [-hw, hw - .35].forEach(x => P.add('tile', box(x - .02, G, hd, x + .37, top + PAR, hd + .05), S.band[1]));
  }
  P.bake(WK, (p, nn) => (.78 + .22 * Math.min(1, p.y / 1.4)) * (.88 + .12 * (nn.y * .5 + .5)));
  if (P.has('brk') && WK !== 'brk') P.bake('brk', (p, nn) => (.78 + .22 * Math.min(1, p.y / 1.4)));
  P.bake('con', groundAO(.4, .75));
  const mats = [['brk', brickWallMaterial({seed:113 + S.seed})], ['tile', tileWallMaterial({seed:131 + S.seed})], ['cw', concreteMaterial({seed:43 + S.seed})], ['con', concreteMaterial()],
    ['met', metalMaterial({rough:.4})], ['stl', steel()], ['mat', matteMaterial()], ['pla', plasticMaterial({rough:.5}), false], ['int', matteMaterial({rough:.9}), false],
    ['gls', glassMaterial()], ['clr', clearMaterial({color:0xcfe0e6, opacity:.25}), false], ['glow', glow(), false], ['snw', snowMaterial({seed:73}), false]];
  return assemble(P, mats, [W, top + PAR, D]);
}

const PROP = {brick:'shopTowerBrick', beige:'shopTowerBeige', gray:'shopTowerGray', green:'shopTowerGreen'};
Object.entries(TOWER).forEach(([k, S]) => {
  const hw = S.W / 2, hd = S.D / 2, x0 = S.sideBrick ? -hw - 1 : -hw - .2, x1 = hw + .25;
  defineProp(PROP[k], {label:'근린상가 몸체 · ' + S.label, category:'근린상가', isNewStyle:true, blocksCamera:true, minimap:'#b9a99a', mmSize:6,
    colliders:[{r:[x0 * U, -hd * U, x1 * U, (hd + .45) * U]}],
    usage:`TOWER_SIGNS.${k}로 간판을 붙인다. 폭 ${S.W}m, 깊이 ${S.D}m, ${S.n}층 (옥상 바닥 ${topOf(S).toFixed(1)}m). 층 바닥 높이는 floorY(f)`, build(){ return tower(S); }});
});

// ───────── 간판 · 앞 물건 배치 (몸체 원점 기준 미터, 여섯째 값은 회전). 모두 기존 소품을 글자 옵션으로 다시 쓴다 ─────────
const fy = (f, d = .12) => floorY(f) + d;
export const TOWER_SIGNS = {
  brick:[
    ['signFascia', {text:'행복 부동산', sub:'아파트 · 상가 · 원룸 매매', bg:'#1f4e8c', fg:'#ffffff', w:4.9, h:.72}, -1.2, 2.8, 5.5],
    ['shopAwning', {w:4.9, proj:1.1, y0:2.72, c:0xe8742a}, -1.2, 0, 5.5],
    ['signFascia', {text:'상가 입구', bg:'#eceff1', fg:'#37474f', w:1.9, h:.42}, 2.7, 2.95, 5.5],
    ['signFascia', {text:'솔빛 피아노 학원', bg:'#fff3c4', fg:'#7a3b8f', w:7.4, h:.7}, 0, fy(2), 5.5],
    ['signFascia', {text:'우주 PC방', sub:'24시간 · 최신 사양', bg:'#111827', fg:'#39d0ff', accent:[3, 6, '#ffcc33'], w:7.6, h:1.5}, 0, fy(3, .1), 5.5],
    ['signVertical', {text:'우주PC방', bg:'#111827', fg:'#39d0ff', len:3}, 3.86, fy(4, .4), 5.5],
    ['signFascia', {text:'바른 세무회계', bg:'#ffffff', fg:'#263238', border:'#90a4ae', w:5, h:.6}, -1.2, fy(5), 5.5]],
  beige:[
    ['signFascia', {text:'꿈나무 분식', sub:'떡볶이 · 순대 · 튀김 · 김밥', bg:'#d83a2e', fg:'#fff6d5', w:6.5, h:.72}, -.85, 2.8, 5.5],
    ['signFascia', {text:'상가 입구', bg:'#eceff1', fg:'#37474f', w:1.3, h:.42}, 3.4, 2.95, 5.5],
    ['signFascia', {text:'하늘 바둑교실', bg:'#f4f1e6', fg:'#1b1b1b', border:'#1b1b1b', w:6.2, h:.7}, -1, fy(2), 5.5],
    ['signFascia', {text:'으뜸 보습학원', sub:'초 · 중 · 고 전과목', bg:'#1f4e8c', fg:'#ffffff', w:6.2, h:.7}, -1, fy(3), 5.5],
    ['signFascia', {text:'하얀 치과의원', bg:'#ffffff', fg:'#1d7fbf', border:'#1d7fbf', w:6.2, h:.7}, -1, fy(4), 5.5],
    ['signFascia', {text:'푸른 영어교습소', bg:'#3f8a5a', fg:'#ffffff', w:6.2, h:.7}, -1, fy(5), 5.5],
    ['signVertical', {text:'으뜸학원', bg:'#1f4e8c', fg:'#ffffff', len:2.4}, -4.16, fy(3, .3), 5.5],
    ['signRoof', {text:'새빛교회', bg:'#ffffff', fg:'#b71c1c'}, -.6, topOf(TOWER.beige) + .1, 3.8],
    ['foodWasteBin', {}, 3.1, 0, 6.35], ['foodWasteBin', {}, 3.75, 0, 6.35]],
  gray:[
    ['signFascia', {text:'희망 슈퍼', bg:'#2f9a4a', fg:'#ffffff', w:4.5, h:.72}, -1.2, 2.8, 5],
    ['shopAwning', {w:4.4, proj:1.3, y0:2.72, c:0x2f6fb5}, -1.2, 0, 5],
    ['fruitStand', {}, -2.1, 0, 6.15], ['drinkFridge', {}, .45, 0, 5.82],
    ['signFascia', {text:'상가 입구', bg:'#eceff1', fg:'#37474f', w:1.8, h:.42}, 2.4, 2.95, 5],
    ['barberPole', {}, 1.2, 1.35, 5],
    ['signFascia', {text:'장미 미용실', bg:'#f7d6e0', fg:'#b0306a', w:5.6, h:.7}, 0, fy(2), 5],
    ['signFascia', {text:'왕대박 당구장', bg:'#0f5132', fg:'#ffe066', w:6.8, h:.7}, 0, fy(3), 5],
    ['signVertical', {text:'당구장', bg:'#0f5132', fg:'#ffe066', len:1.8}, 3.56, fy(3, .5), 5],
    ['signFascia', {text:'동그라미 기원', bg:'#fafafa', fg:'#3e2723', border:'#6d4c41', w:5, h:.6}, 0, fy(4), 5]],
  green:[
    ['signFascia', {text:'만리장성', sub:'짜장 · 짬뽕 · 탕수육 · 배달', bg:'#c0262d', fg:'#ffe08a', w:4.5, h:.72}, -2, 2.8, 5.5],
    ['signFascia', {text:'상가 입구', bg:'#eceff1', fg:'#37474f', w:1.8, h:.42}, 1.5, 2.95, 5.5],
    ['signFascia', {text:'열쇠 · 철물', bg:'#f2b632', fg:'#2b2b2b', w:1.5, h:.72}, 3.5, 2.8, 5.5],
    ['signFascia', {text:'튼튼 내과의원', bg:'#ffffff', fg:'#0f7a5c', border:'#0f7a5c', w:6.8, h:.7}, 0, fy(2), 5.5],
    ['signFascia', {text:'용사 태권도', sub:'유아 · 초등 · 성인부', bg:'#1f2a44', fg:'#ffffff', accent:[0, 2, '#ff5a4f'], w:6.8, h:.7}, 0, fy(3), 5.5],
    ['signFascia', {text:'한마음 독서실', bg:'#5b3f8f', fg:'#ffffff', w:6.8, h:.7}, 0, fy(4), 5.5],
    ['signFascia', {text:'참좋은 요가', bg:'#fff8e1', fg:'#6d4c41', w:5, h:.6}, 0, fy(5), 5.5],
    ['signVertical', {text:'튼튼내과', bg:'#ffffff', fg:'#0f7a5c', len:2.2}, -4.1, fy(2, .4), 5.55],
    ['signVertical', {text:'용사태권도', bg:'#1f2a44', fg:'#ffffff', len:2.6}, 4.1, fy(3, .2), 5.55],
    ['signVertical', {text:'한마음독서실', bg:'#5b3f8f', fg:'#ffffff', len:2.8}, -4.1, fy(4, .1), 5.55],
    ['deliveryScooter', {}, 3.2, 0, 6.9, .5]],
};
export const TOWER_PROP = PROP;

// ───────── 이발소 회전등: 벽 받침, 유리 원통 속 빨강 · 파랑 · 흰 빗금, 위아래 금속 머리 (벽 면이 원점, 앞으로 0.2m) ─────────
const poleMat = () => once('barberPole', () => { const t = canvasTex(128, 256, g => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 256);
  for (let k = -4; k < 8; k++) { [['#d32f2f', 0], ['#1e4fb5', 42]].forEach(([c, o]) => { g.fillStyle = c; g.beginPath(); const y = k * 64 + o * .7; g.moveTo(0, y); g.lineTo(128, y + 64); g.lineTo(128, y + 84); g.lineTo(0, y + 20); g.fill(); }); } });
  return new THREE.MeshBasicMaterial({map:t}); });
defineProp('barberPole', {label:'이발소 회전등', category:'근린상가', isNewStyle:true, small:true,
  usage:"W.place('barberPole', {x, z, y: 1.35 * UNIT, rot});  // 벽에 붙인다. 높이 0.9m, 벽에서 0.2m", build(){
    const P = new Parts(), z = .2;
    P.add('met', box(-.08, .1, 0, .08, .16, z, .01), 0xc9ced2); P.add('met', box(-.08, .74, 0, .08, .8, z, .01), 0xc9ced2);
    P.add('met', xf(new THREE.CylinderGeometry(.1, .1, .1, 16), {y:.1, z}), 0xd7dbde); P.add('met', xf(lathe([[0, 0], [.1, 0], [.1, .04], [.06, .1], [0, .12]], 16), {y:.8, z}), 0xd7dbde);
    P.add('met', xf(new THREE.SphereGeometry(.035, 10, 6), {y:.94, z}), 0xd7dbde);
    const core = new THREE.Mesh(xf(new THREE.CylinderGeometry(.075, .075, .64, 18, 1, true), {y:.47, z}), poleMat());
    P.add('glass', xf(new THREE.CylinderGeometry(.085, .085, .64, 18, 1, true), {y:.47, z}));
    return assemble(P, [['met', metalMaterial({rough:.25})], ['glass', clearMaterial({color:0xffffff, opacity:.18}), false]], [.2, .97, .3], [core]); }});

// ───────── 과일 좌판: 비스듬한 나무 진열대에 플라스틱 바구니, 귤 · 사과 · 배 무더기, 가격표 (가게 앞 바닥) ─────────
const priceMat = () => once('fruitPrice', () => decalMaterial(canvasTex(512, 64, g => { g.fillStyle = '#fffdf2'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#c62828'; g.font = '800 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['귤 5,000', '사과 7,000', '배 9,000'].forEach((t, i) => g.fillText(t, 85 + i * 171, 34)); })));
defineProp('fruitStand', {label:'과일 좌판', category:'근린상가', isNewStyle:true, small:true, colliders:[{r:[-.9 * U, -.5 * U, .9 * U, .5 * U]}],
  usage:"W.place('fruitStand', {x, z, rot});  // 1.8m × 1.0m, 앞이 낮게 기운 진열대", build(){
    const P = new Parts(), R = mulberry(9), tilt = .32, yAt = z => .72 - (z + .45) * tilt;
    [[-.85, -.42], [.85, -.42], [-.85, .42], [.85, .42]].forEach(([x, z]) => P.add('wood', box(x - .04, 0, z - .04, x + .04, yAt(z), z + .04), 0x8b6a4a));
    P.add('wood', xf(box(-.9, -.03, -.47, .9, 0, .47), {rx:Math.atan(tilt), y:yAt(0)}), 0xa07a54);
    const KIND = [[0xf28c1e, .045, 0xe07a10], [0xc8282e, .05, 0xa81e24], [0xd9c26a, .055, 0xc9ae52]];
    [-.6, 0, .6].forEach((x, i) => { const [c, r, c2] = KIND[i];
      [-.22, .2].forEach(zc => { const y0 = yAt(zc);
        P.add('pla', xf(box(-.27, 0, -.19, .27, .09, .19, .01), {rx:Math.atan(tilt), x, y:y0, z:zc}), i === 1 ? 0x2f6fb5 : 0xd83a2e);
        for (let k = 0; k < 16; k++) { const dx = (R() - .5) * .44, dz = (R() - .5) * .3, h = .09 + r * (k < 9 ? 1 : 2.4) * .8;
          P.add('fruit', xf(new THREE.IcosahedronGeometry(r * (.9 + R() * .2), 1), {x:x + dx, y:y0 + h - dz * tilt, z:zc + dz}), R() < .3 ? c2 : c); } }); });
    const tag = new THREE.Mesh(xf(new THREE.PlaneGeometry(1.7, .2), {rx:-.15, y:yAt(.47) - .14, z:.49}), priceMat());
    P.add('wood', box(-.88, yAt(.47) - .26, .46, .88, yAt(.47) - .02, .48), 0x8b6a4a);
    P.add('snw', xf(box(-.86, .02, -.45, .86, .03, -.38), {rx:Math.atan(tilt), y:yAt(-.42)}));
    return assemble(P, [['wood', woodMaterial({seed:17})], ['pla', plasticMaterial({rough:.5})], ['fruit', plasticMaterial({rough:.55})], ['snw', snowMaterial({seed:74}), false]], [1.8, .9, 1], [tag]); }});

// ───────── 배달 오토바이: 작은 스쿠터 + 뒤 배달통 (중국집 앞에 세워 둠) ─────────
defineProp('deliveryScooter', {label:'배달 오토바이', category:'근린상가', isNewStyle:true, small:true, colliders:[{c:[0, 0, .55 * U]}],
  usage:"W.place('deliveryScooter', {x, z, rot});  // 길이 1.8m, 앞이 +z", build(){
    const P = new Parts(), wheel = (z) => { P.add('tire', xf(new THREE.TorusGeometry(.2, .065, 8, 18), {ry:Math.PI / 2, y:.265, z}), 0x222426); P.add('met', xf(new THREE.CylinderGeometry(.13, .13, .07, 14), {rz:Math.PI / 2, y:.265, z}), 0xb8bec2); };
    wheel(.62); wheel(-.6);
    P.add('body', box(-.17, .32, -.75, .17, .62, -.1, .07), 0xf1f1ee); P.add('body', box(-.14, .2, -.12, .14, .34, .45, .04), 0x34383c);     // 뒤 몸통, 발판
    P.add('body', xf(box(-.2, .2, -.06, .2, .95, .06, .05), {rx:-.28, y:0, z:.55}), 0xc62828);                                             // 앞 가림판
    P.add('mat', box(-.15, .62, -.7, .15, .7, -.18, .05), 0x1e2023);                                                                       // 안장
    P.add('met', tube([V(0, .45, .62), V(0, 1.0, .5)], .03, {radial:6}), 0x7a8086); P.add('met', tube([V(-.32, 1.02, .5), V(.32, 1.02, .5)], .022, {radial:6}), 0x2b2e31);
    [-1, 1].forEach(s => P.add('met', tube([V(s * .2, 1.03, .5), V(s * .24, 1.25, .48)], .01, {radial:4}), 0x2b2e31));
    P.add('met', box(-.07, .88, .58, .07, .98, .66, .02), 0xf5f6f2);                                                                       // 전조등
    // 배달통: 빨강 · 흰 상자와 짐받이
    P.add('met', box(-.22, .7, -.95, .22, .73, -.45), 0x6f777e);
    P.add('box', box(-.25, .73, -1, .25, 1.18, -.42, .03), 0xd32f2f); P.add('box', box(-.255, .9, -1.005, .255, .98, -.415), 0xf4f4ee);
    P.add('snw', box(-.23, 1.18, -.98, .23, 1.22, -.44, .02));
    return assemble(P, [['tire', matteMaterial({rough:.9})], ['met', metalMaterial({rough:.35})], ['body', paintMaterial(0xffffff, {seed:29, gloss:.6, metal:.2})], ['mat', matteMaterial()],
      ['box', plasticMaterial({rough:.4})], ['snw', snowMaterial({seed:75}), false]], [.64, 1.28, 1.9]); }});

// ───────── 조립: 몸체 + 간판 · 앞 물건 (갤러리 예시, 맵 배치도 같은 목록을 쓴다) ─────────
export function placeTower(W, key, cx, cz, rot){
  const c = Math.cos(rot), s = Math.sin(rot), at = (x, z) => [cx + (x * c + z * s) * U, cz + (-x * s + z * c) * U];
  const [x, z] = at(0, 0); W.place(PROP[key], {x, z, rot});
  TOWER_SIGNS[key].forEach(([name, o, lx, ly, lz, r]) => { const [wx, wz] = at(lx, lz); W.place(name, {...o, x:wx, z:wz, y:ly * U, rot:rot + (r || 0)}); });
}
Object.keys(TOWER).forEach(k => defineProp(PROP[k] + 'Set', {label:'근린상가 · ' + TOWER[k].label + ' (간판 조립 예시)', category:'근린상가', isNewStyle:true, blocksCamera:true,
  usage:`placeTower(W, '${k}', x, z, rot);  // 몸체와 TOWER_SIGNS.${k}의 간판 · 물건을 함께 놓는다`, build(){
    const g = new THREE.Group(); let draws = 0;
    [[PROP[k], {}, 0, 0, 0, 0], ...TOWER_SIGNS[k]].forEach(([name, o, x, y, z, r]) => { const m = buildProp(name, o); m.position.set(x * U, y * U, z * U); m.rotation.y = r || 0; draws += m.userData.info.draws; g.add(m); });
    g.userData.info = {tris:triCount(g), draws, materials:draws, sizeMeters:[TOWER[k].W + 1, topOf(TOWER[k]) + 4, TOWER[k].D + 2]}; return g; }}));
