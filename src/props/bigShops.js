// 공원 아래(남쪽 상가 줄)의 큰 가게 두 채 (2026-11-15 사용자 요청 · 참고 사진 '고기집사진'):
//   통창 고깃집(단층, 나무 루버 띠 · 금색 현관 · 차양 · 음식 사진 띠)과 동네 마트(2층, 홍보물로 덮인 통유리 · 파란 띠 판넬).
//   유리는 어둡게 하거나 홍보물로 덮어 안이 잘 보이지 않는다. 뒤편(-z)에 주차장이 붙고, 주차장은 강변도로에서 들어온다.
//   간판은 기존 signFascia(글자 옵션)를, 마트 앞 과일 좌판은 기존 fruitStand를 쓴다. 새 작은 소품: 카트 보관대, 주차장 표지.
//   미터 단위, 원점은 바닥 가운데, 정면 +z.
import * as THREE from '../lib/three.js';
import { defineProp, buildProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, xf, blob, groundAO, triCount, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, metalMaterial, concreteMaterial, plasticMaterial, glassMaterial, clearMaterial, woodMaterial, paintMaterial, brickWallMaterial } from '../core/texkit.js';
import { assemble, mulberry, quadZ } from './kit.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';
import { drawMartPosters, drawMeatStrip } from './signArt/otherSigns.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();
const glow = () => once('glow', () => new THREE.MeshBasicMaterial({vertexColors:true}));

// 실외기 (벽에 붙이거나 바닥에 놓는다)
function acUnit(P, x, y, z, ry = 0){ const T = g => xf(g, {ry, x, y, z});
  P.add('met', T(box(-.4, 0, -.15, .4, .58, .15, .02)), 0xe9eae7); P.add('mat', T(xf(new THREE.CylinderGeometry(.2, .2, .02, 16), {rx:Math.PI / 2, x:-.12, y:.29, z:.155})), 0x3a3f44);
  P.add('snw', T(box(-.4, .58, -.15, .4, .63, .15, .02))); }

// 홍보물 그림 한 장 (2026-11-23 새 그림: props/signArt/otherSigns.js). 음식 사진 띠 2048×156 (판 8.55m × 0.65m), 마트 창 포스터 2048×488 (판 8.2m × 1.95m)
const posterMat = kind => once('poster' + kind, () => decalMaterial(kind === 'food' ? canvasTex(2048, 156, g => drawMeatStrip(g)) : canvasTex(2048, 488, g => drawMartPosters(g))));

// ───────── 고깃집: 단층 (높이 4.6m), 폭 18m · 깊이 10m ─────────
export const MEAT = {W:18, D:10, H:4.6, glass:3.3};
defineProp('meatHouse', {label:'통창 고깃집 (몸체)', category:'큰 가게', isNewStyle:true, blocksCamera:true, minimap:'#8a6a52', mmSize:5,
  colliders:[{r:[-9.1 * U, -5.1 * U, 9.1 * U, 5.3 * U]}, {r:[1.2 * U, 5 * U, 4.6 * U, 6.3 * U]}],
  usage:"W.place('meatHouse', {x, z, rot});  // 18m × 10m 단층. 간판 · 차양은 BIG_SIGNS.meat", build(){
    const {W, D, H, glass:GH} = MEAT, hw = W / 2, hd = D / 2, P = new Parts(), R = mulberry(5);
    const con = (g, c = 0xbab7b0) => P.add('con', g, c), met = (g, c = 0x2c3034) => P.add('met', g, c);
    // 몸통: 옆 · 뒤는 회색 미장 벽, 아래는 벽돌 띠
    con(box(-hw, 0, -hd, hw, H, hd - .3)); P.add('brk', box(-hw - .02, 0, -hd - .02, hw + .02, .9, hd - .3), 0xa0523d);
    con(box(-hw - .05, 0, hd - .3, hw + .05, .25, hd + .2), 0xa7a49d);
    // 정면 통창 (어두운 유리, 안이 잘 안 보인다) + 검은 세로살, 아래 음식 사진 띠
    P.add('gls', box(-hw + .1, .25, hd - .3, hw - .1, GH, hd - .1), 0x1f2a32);
    for (let x = -hw + .1; x <= hw - .1 + 1e-6; x += (W - .2) / 12) met(box(x - .04, .25, hd - .12, x + .04, GH, hd - .04));
    met(box(-hw, GH - .05, hd - .3, hw, GH + .05, hd)); met(box(-hw, .25, hd - .14, hw, .33, hd - .04));
    const photos = new THREE.Mesh(quadZ(-hw + .25, .45, -.2, 1.1, hd - .035, [0, 0, 1, 1]), posterMat('food'));
    // 나무 루버 띠 (정면 · 옆): 어두운 바탕 위에 가로 각재
    P.add('mat', box(-hw - .02, GH, hd - .32, hw + .02, H, hd + .02), 0x2b2420);
    for (let y = GH + .08; y < H - .05; y += .13) { P.add('wood', box(-hw - .04, y, hd + .02, hw + .04, y + .08, hd + .09), 0x8a5a3a + Math.floor(R() * 3) * 0x050302);
      [-1, 1].forEach(s => P.add('wood', box(s > 0 ? hw + .02 : -hw - .09, y, -hd + .4, s > 0 ? hw + .09 : -hw - .02, y + .08, hd + .09), 0x8a5a3a)); }
    // 금색 현관 (앞으로 1.2m): 유리문 둘, 위 검은 띠
    const vx0 = 1.3, vx1 = 4.5, vz = hd + 1.2;
    P.add('gold', box(vx0, 0, hd - .1, vx0 + .12, 2.8, vz), 0xc9a24a); P.add('gold', box(vx1 - .12, 0, hd - .1, vx1, 2.8, vz), 0xc9a24a);
    P.add('mat', box(vx0 - .01, 2.8, hd - .1, vx1 + .01, 3.75, vz + .03), 0x1b1d20); P.add('gold', box(vx0 + .12, 2.72, vz - .06, vx1 - .12, 2.8, vz + .015), 0xc9a24a);
    P.add('gls', box(vx0 + .12, .25, vz - .05, vx1 - .12, 2.72, vz - .02), 0x34424f); [(vx0 + vx1) / 2].forEach(x => P.add('gold', box(x - .03, .25, vz - .06, x + .03, 2.72, vz), 0xc9a24a));
    [-1, 1].forEach(s => P.add('gold', box((vx0 + vx1) / 2 + s * .25 - .02, 1.0, vz, (vx0 + vx1) / 2 + s * .25 + .02, 1.6, vz + .06), 0xd8b65c));
    P.add('gls', box(vx0 + .12, .25, hd - .1, vx0 + .14, 2.72, vz - .05), 0x34424f); P.add('gls', box(vx1 - .14, .25, hd - .1, vx1 - .12, 2.72, vz - .05), 0x34424f);
    P.add('snw', box(vx0 - .05, 3.75, hd - .1, vx1 + .05, 3.82, vz + .05, .02));
    // 투명 차양: 현관 왼쪽 통창 위
    const cz = hd + 1.5, cy = 3.1;
    P.add('clr', xf(box(-hw + .2, -.02, 0, vx0 - .1, .02, 1.5), {rx:.12, y:cy, z:hd}));
    for (let x = -hw + .4; x < vx0; x += 2.4) met(tube([V(x, cy + .05, hd), V(x, cy - .15, cz - .05)], .03, {radial:5}), 0x8f969c);
    met(box(-hw + .2, cy - .22, cz - .08, vx0 - .1, cy - .14, cz), 0x8f969c);
    // 옥상: 난간벽, 숯불 연기 배기통, 실외기, 눈
    con(box(-hw, H, -hd, hw, H + .5, -hd + .2)); con(box(-hw, H, -hd, -hw + .2, H + .5, hd - .3)); con(box(hw - .2, H, -hd, hw, H + .5, hd - .3));
    P.add('snw', box(-hw + .2, H, -hd + .2, hw - .2, H + .08, hd - .35, .03));
    [[-5, -2], [-1, -2], [3, -2], [6, 1]].forEach(([x, z]) => { met(xf(new THREE.CylinderGeometry(.28, .28, 1.4, 14), {x, y:H + .7, z}), 0xb5bbbf); met(xf(new THREE.CylinderGeometry(.42, .3, .25, 14), {x, y:H + 1.5, z}), 0x9aa0a5); P.add('snw', xf(blob(.4, .06, .4, {seed:x + 9, seg:8}), {x, y:H + 1.62, z})); });
    acUnit(P, -6.5, H + .08, 2.6); acUnit(P, -5.4, H + .08, 2.6);
    // 뒤: 주방 문, 환기구, 실외기
    met(box(5, 0, -hd - .04, 6, 2.1, -hd), 0x5a6b6a); met(box(-2, 2.6, -hd - .25, -1, 3.2, -hd), 0xb5bbbf); acUnit(P, -6, 0, -hd - .3, Math.PI); acUnit(P, -4.9, 0, -hd - .3, Math.PI);
    // 옆 창 (어두운 유리)
    [-1, 1].forEach(s => [-2.5, 1].forEach(z => P.add('gls', box(s > 0 ? hw - .02 : -hw - .03, 1.2, z, s > 0 ? hw + .03 : -hw + .02, 2.6, z + 2.2), 0x26323b)));
    P.bake('con', groundAO(.4, .75)); P.bake('brk', groundAO(.4, .75));
    return assemble(P, [['con', concreteMaterial({seed:61})], ['brk', concreteMaterial({seed:62})], ['gls', glassMaterial()], ['met', metalMaterial({rough:.4})], ['mat', matteMaterial()],
      ['wood', woodMaterial({seed:23})], ['gold', metalMaterial({rough:.3})], ['clr', clearMaterial({color:0xe8f0f4, opacity:.35}), false], ['snw', snowMaterial({seed:76}), false]], [W, H + 1.7, D + 1.6], [photos]); }});

// ───────── 동네 마트: 2층 (높이 7.6m), 폭 22m · 깊이 11m ─────────
export const MART = {W:22, D:11, G:3.8, H:7.2};
defineProp('martBuilding', {label:'동네 마트 (몸체)', category:'큰 가게', isNewStyle:true, blocksCamera:true, minimap:'#7f9bbd', mmSize:5,
  colliders:[{r:[-11.1 * U, -5.6 * U, 11.1 * U, 5.8 * U]}],
  usage:"W.place('martBuilding', {x, z, rot});  // 22m × 11m 2층. 간판 · 앞 물건은 BIG_SIGNS.mart", build(){
    const {W, D, G, H} = MART, hw = W / 2, hd = D / 2, P = new Parts(), pan = (g, c = 0xeef0f1) => P.add('pan', g, c), met = (g, c = 0x8f969c) => P.add('met', g, c);
    // 몸통: 흰 알루미늄 판넬, 2층 아래 파란 띠, 1층 기둥
    pan(box(-hw, G, -hd, hw, H, hd)); P.add('con', box(-hw, 0, -hd, hw, G, hd - .6), 0xbab7b0);
    pan(box(-hw - .03, G + .1, hd - .02, hw + .03, G + .5, hd + .06), 0x1d5fb8); pan(box(-hw - .03, H - .35, -hd - .03, hw + .03, H - .2, hd + .06), 0x1d5fb8);
    for (let x = -hw; x <= hw + 1e-6; x += W / 6) P.add('pan', box(x - .02, G, hd, x + .02, H, hd + .03), 0xd9dcde);   // 판넬 줄눈
    [-hw, -2.2, 2.2, hw].forEach((x, i) => P.add('con', box(x - (i === 3 ? .5 : 0), 0, hd - .6, x + (i === 0 ? .5 : 0), G, hd), 0xd6d3cc));
    P.add('con', box(-hw - .05, 0, hd - .6, hw + .05, .2, hd + .3), 0xa7a49d);
    // 1층 통유리: 위는 어두운 유리, 아래는 할인 홍보물로 덮었다 (안이 보이지 않는다)
    [[-hw + .5, -2.2], [2.2, hw - .5]].forEach(([a, b]) => { P.add('gls', box(a, .2, hd - .5, b, G - .1, hd - .42), 0x24313a);
      for (let x = a; x <= b + 1e-6; x += (b - a) / 4) met(box(x - .04, .2, hd - .42, x + .04, G - .1, hd - .36), 0x9ea5ab); met(box(a, 2.3, hd - .42, b, 2.36, hd - .36), 0x9ea5ab); });
    const posters = [[-hw + .55, -2.25], [2.25, hw - .55]].map(([a, b]) => new THREE.Mesh(quadZ(a, .3, b, 2.25, hd - .355, [0, 0, 1, 1]), posterMat('mart')));
    // 자동문 (가운데): 유리문, 위 캐노피
    P.add('gls', box(-2.2, .2, hd - .55, 2.2, 2.6, hd - .5), 0x3d4a55); met(box(-.03, .2, hd - .5, .03, 2.6, hd - .45)); met(box(-2.2, 2.6, hd - .55, 2.2, 2.75, hd - .45), 0x9ea5ab);
    P.add('int', box(-2.2, 2.75, hd - .6, 2.2, G - .1, hd - .45), 0x2b2f33);
    P.add('pan', box(-3.2, 3.0, hd, 3.2, 3.18, hd + 1.8), 0xd9dcde); met(box(-3.2, 2.92, hd + 1.72, 3.2, 3.0, hd + 1.8)); [-3, 3].forEach(x => met(tube([V(x, 3.18, hd), V(x, 3.6, hd + 1.6)], .025, {radial:5})));
    P.add('snw', box(-3.15, 3.18, hd + .05, 3.15, 3.25, hd + 1.75, .02));
    // 2층: 작은 창 줄 (사무실 · 창고)
    for (let x = -hw + 1.6; x < hw - 1; x += 2.6) { P.add('gls', box(x, G + 1.2, hd - .02, x + 1.4, G + 2.3, hd + .05), 0x34424f); met(box(x - .04, G + 1.15, hd, x + 1.44, G + 1.2, hd + .1)); }
    // 옥상: 난간, 실외기 줄, 물탱크
    P.add('con', box(-hw, H, -hd, hw, H + .6, -hd + .2), 0xd8d6cf); P.add('con', box(-hw, H, hd - .2, hw, H + .6, hd), 0xd8d6cf);
    [-hw, hw - .2].forEach(x => P.add('con', box(x, H, -hd, x + .2, H + .6, hd), 0xd8d6cf));
    P.add('snw', box(-hw + .2, H, -hd + .2, hw - .2, H + .08, hd - .2, .03));
    for (let k = 0; k < 6; k++) acUnit(P, -8 + k * 1.1, H + .08, -3.5);
    // 뒤: 하역장 셔터, 작은 문
    met(box(-7, 0, -hd - .05, -3, 3, -hd), 0xc7ccd0); for (let y = .2; y < 3; y += .2) met(box(-7, y, -hd - .07, -3, y + .03, -hd - .05), 0xaeb4b8);
    met(box(-7.2, 3, -hd - .3, -2.8, 3.1, -hd), 0x6d757b); met(box(4, 0, -hd - .04, 5, 2.1, -hd), 0x5a6b6a);
    P.bake('con', groundAO(.4, .75));
    return assemble(P, [['pan', paintMaterial(0xffffff, {seed:33, gloss:.45, metal:.15})], ['con', concreteMaterial({seed:63})], ['gls', glassMaterial()], ['met', metalMaterial({rough:.4})],
      ['int', matteMaterial(), false], ['mat', matteMaterial()], ['snw', snowMaterial({seed:77}), false]], [W, H + 1.2, D + 2], posters); }});

// ───────── 장보기 카트 (2026-11-17, 따로 만든 소품): 철망 바구니(앞이 좁은 사다리꼴), 손잡이, 아래 받침대 · 다리 넷 · 바퀴 넷 ─────────
//   길이 0.9m, 폭 0.55m, 손잡이 높이 1.0m. 손잡이가 +z
export function cartParts(P, ox = 0, oz = 0, ry = 0){
  const T = g => xf(g, {ry, x:ox, z:oz}), m = (g, c = 0xc2c8cc) => P.add('met', T(g), c), wire = (a, b, r = .008) => m(tube([a, b], r, {radial:4}));
  const bz0 = -.45, bz1 = .35, y0 = .42, y1 = .9, wf = .2, wb = .28;   // 바구니 앞(-z)이 좁다
  const at = (t, side, y) => V(side * (wf + (wb - wf) * t), y, bz0 + (bz1 - bz0) * t);
  // 바구니 테두리 · 바닥 · 세로 철망
  [y0, y1].forEach(y => { [-1, 1].forEach(s => wire(at(0, s, y), at(1, s, y), .01)); wire(at(0, -1, y), at(0, 1, y), .01); wire(at(1, -1, y), at(1, 1, y), .01); });
  for (let t = 0; t <= 1.001; t += 1 / 6) [-1, 1].forEach(s => wire(at(t, s, y0), at(t, s, y1)));
  for (let k = -2; k <= 2; k++) { wire(V(k * wf / 2.5, y0, bz0), V(k * wf / 2.5, y1, bz0)); wire(V(k * wb / 2.5, y0, bz1), V(k * wb / 2.5, y1, bz1)); wire(V(k * wf / 2.5, y0, bz0), V(k * wb / 2.5, y0, bz1)); }
  for (let y = y0 + .12; y < y1; y += .12) wire(V(-wf, y, bz0), V(wf, y, bz0));
  // 손잡이 (빨간 플라스틱 덮개) + 받침 관
  [-1, 1].forEach(s => wire(V(s * wb, y1, bz1), V(s * (wb + .01), 1.0, bz1 + .14), .012));
  P.add('pla', T(xf(new THREE.CylinderGeometry(.018, .018, wb * 2 + .06, 10), {rz:Math.PI / 2, y:1.0, z:bz1 + .14})), 0xd32f2f);
  // 아래 틀: 뒤 다리 둘 · 앞 다리 둘 (바구니 아래에서 바퀴까지), 아래 짐받이
  [[-wf + .02, bz0 + .05], [wf - .02, bz0 + .05], [-wb + .02, bz1 - .02], [wb - .02, bz1 - .02]].forEach(([x, z]) => { wire(V(x, y0, z), V(x * 1.05, .1, z), .013);
    P.add('met', T(box(x - .025, .06, z - .03, x + .025, .1, z + .03)), 0x6f777e);
    P.add('tire', T(xf(new THREE.CylinderGeometry(.05, .05, .03, 12), {rz:Math.PI / 2, x, y:.05, z})), 0x2b2e31); });
  [-1, 1].forEach(s => wire(V(s * (wf - .02), .14, bz0 + .05), V(s * (wb - .02), .14, bz1 - .02), .012));
  wire(V(-wf + .02, .14, bz0 + .05), V(wf - .02, .14, bz0 + .05), .012); wire(V(-wb + .02, .14, bz1 - .02), V(wb - .02, .14, bz1 - .02), .012);
}
defineProp('shoppingCart', {label:'장보기 카트', category:'큰 가게', isNewStyle:true, small:true, colliders:[{r:[-.3 * U, -.48 * U, .3 * U, .52 * U]}],
  usage:"W.place('shoppingCart', {x, z, rot});  // 길이 0.9m, 손잡이가 +z", build(){
    const P = new Parts(); cartParts(P);
    return assemble(P, [['met', metalMaterial({rough:.3})], ['pla', plasticMaterial({rough:.45})], ['tire', matteMaterial({rough:.9})]], [.65, 1.05, 1]); }});

// ───────── 카트 보관대: 철제 난간 칸 + 지붕 판, 카트 한 대를 넣어 둔다 (카트는 장보기 카트와 같은 부품) ─────────
defineProp('cartCorral', {label:'카트 보관대', category:'큰 가게', isNewStyle:true, small:true, colliders:[{r:[-.5 * U, -1.2 * U, .5 * U, 1.2 * U]}],
  usage:"W.place('cartCorral', {x, z, rot});  // 1m × 2.4m, 열린 쪽이 +z", build(){
    const P = new Parts(), m = (g, c = 0xb9bfc4) => P.add('met', g, c);
    [-1, 1].forEach(s => { m(tube([V(s * .5, 0, -1.2), V(s * .5, .9, -1.2), V(s * .5, .9, 1.2), V(s * .5, 0, 1.2)], .025, {radial:5})); m(tube([V(s * .5, .45, -1.2), V(s * .5, .45, 1.2)], .018, {radial:4})); });
    m(tube([V(-.5, .9, -1.2), V(.5, .9, -1.2)], .025, {radial:5})); P.add('pla', box(-.5, .9, -1.22, .5, 1.25, -1.18), 0x1d5fb8);
    cartParts(P, 0, -.1, 0);
    P.add('snw', box(-.45, 1.25, -1.2, .45, 1.29, -1.15));
    return assemble(P, [['met', metalMaterial({rough:.3})], ['pla', plasticMaterial({rough:.45})], ['tire', matteMaterial({rough:.9})], ['snw', snowMaterial({seed:78}), false]], [1.1, 1.3, 2.5]); }});

// ───────── 주차장 표지: 기둥 위 파란 'P' 판 ─────────
const pMat = () => once('pSign', () => decalMaterial(canvasTex(256, 320, g => { g.fillStyle = '#1d5fb8'; g.fillRect(0, 0, 256, 320); g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(10, 10, 236, 300);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '190px ' + FONT_D; g.fillText('P', 128, 130); g.font = '800 40px ' + FONT_B; g.fillText('고객 주차장', 128, 262); })));
defineProp('parkingSign', {label:'주차장 표지', category:'큰 가게', isNewStyle:true, small:true, colliders:[{c:[0, 0, .2 * U]}],
  usage:"W.place('parkingSign', {x, z, rot});  // 높이 2.6m, 판이 +z를 본다", build(){
    // (2026-11-17) 기둥은 판 뒤(-z)로 빼고, 판은 두께 6cm 상자로: 앞에서 기둥이 판을 가리지 않는다
    const P = new Parts(); P.add('met', xf(new THREE.CylinderGeometry(.045, .05, 2.6, 10), {y:1.3, z:-.09}), 0x9aa0a5); P.add('met', box(-.06, 1.8, -.09, .06, 2.4, -.03), 0x9aa0a5); P.add('met', box(-.42, 1.55, -.03, .42, 2.6, .03, .01), 0x2b2e31);
    const face = new THREE.Mesh(quadZ(-.4, 1.57, .4, 2.58, .032, [0, 0, 1, 1]), pMat()); P.add('snw', box(-.42, 2.6, -.03, .42, 2.64, .03));
    return assemble(P, [['met', metalMaterial({rough:.35})], ['snw', snowMaterial({seed:79}), false]], [.85, 2.7, .1], [face]); }});

// ───────── 간판 · 앞 물건 (몸체 원점 기준 미터, 여섯째 값은 회전) ─────────
export const BIG_SIGNS = {
  meat:[['signFascia', {text:'솔밭 숯불갈비', sub:'생갈비 · 양념갈비 · 삼겹살', bg:'#2b2420', fg:'#f4e3c3', accent:[3, 7, '#ffb74d'], w:9.5, h:1.0}, -3.6, 3.45, 5.12],
    ['signFascia', {text:'점심 특선', bg:'#b71c1c', fg:'#ffffff', w:1.8, h:.5}, -6.8, 2.2, 4.92], ['foodWasteBin', {}, 7.6, 0, 6.2]],   // 주차장 표지는 뒤 주차장 입구(강변도로 쪽)에 둔다
  mart:[['signFascia', {text:'우리동네 마트', sub:'신선식품 · 생활용품 · 배달', bg:'#1d5fb8', fg:'#ffffff', accent:[0, 4, '#ffeb3b'], w:13, h:1.7}, 0, 4.85, 5.56],
    ['signFascia', {text:'24시', bg:'#ffeb3b', fg:'#1d5fb8', w:1.6, h:1.0}, 8.4, 5.2, 5.56],
    ['fruitStand', {}, -5.2, 0, 6.6], ['fruitStand', {}, -7.4, 0, 6.6], ['cartCorral', {}, 3.8, 0, 7.0, Math.PI / 2], ['shoppingCart', {}, 6.4, 0, 6.6, -.4], ['drinkFridge', {}, 8.6, 0, 6.2], ['drinkFridge', {}, 9.5, 0, 6.2],
    ['iceFreezer', {}, -9.6, 0, 6.4]],   // (2026-11-23) 아이스크림 냉장고는 문구점 앞에서 마트 앞(과일 좌판 서쪽)으로
};
export const BIG_PROP = {meat:'meatHouse', mart:'martBuilding'};
export function placeBig(W, key, cx, cz, rot){
  const c = Math.cos(rot), s = Math.sin(rot), at = (x, z) => [cx + (x * c + z * s) * U, cz + (-x * s + z * c) * U];
  W.place(BIG_PROP[key], {x:cx, z:cz, rot});
  BIG_SIGNS[key].forEach(([name, o, lx, ly, lz, r]) => { const [wx, wz] = at(lx, lz); W.place(name, {...o, x:wx, z:wz, y:ly * U + W.groundY(wx, wz), rot:rot + (r || 0)}); });
}
Object.keys(BIG_PROP).forEach(k => defineProp(BIG_PROP[k] + 'Set', {label:(k === 'meat' ? '통창 고깃집' : '동네 마트') + ' (간판 조립 예시)', category:'큰 가게', isNewStyle:true, blocksCamera:true,
  usage:`placeBig(W, '${k}', x, z, rot);  // 몸체와 BIG_SIGNS.${k}`, build(){
    const g = new THREE.Group(); let draws = 0;
    [[BIG_PROP[k], {}, 0, 0, 0, 0], ...BIG_SIGNS[k]].forEach(([name, o, x, y, z, r]) => { const m = buildProp(name, o); m.position.set(x * U, y * U, z * U); m.rotation.y = r || 0; draws += m.userData.info.draws; g.add(m); });
    g.userData.info = {tris:triCount(g), draws, materials:draws, sizeMeters:[24, 9, 14]}; return g; }}));

// ───────── 동네 목욕탕 (2026-11-17, 사용자 참고 그림): 크림색 2층 콘크리트 건물, 아래 하늘색 띠 벽, 기둥과 층 사이 처마 띠,
//   가운데 남탕 · 여탕 문과 ♨ 표지, 양옆 격자 창, 2층 창 셋, 옥상 계단실, 뒤 오른쪽 붉은 벽돌 굴뚝(세로 글씨 '목욕탕(湯)'), 앞 평상.
//   간판 글씨는 궁서체(사용자 컴퓨터의 궁서, 없으면 Song Myung). 미터 단위, 원점은 바닥 가운데, 정면 +z.
export const BATH = {W:14, D:10, G:3.6, H:7.2, chim:{x:3.2, z:-2.6, r:.75, h:15.5}};
const GUNG = '"Gungsuh","궁서","GungsuhChe","Song Myung",serif';
const bathMat = kind => once('bath' + kind, () => decalMaterial(canvasTex(...(kind === 'sign' ? [1024, 192] : kind === 'chim' ? [128, 640] : kind === 'mark' ? [128, 128] : [256, 128]), g => {
  if (kind === 'sign') { g.fillStyle = '#f3efe6'; g.fillRect(0, 0, 1024, 192); g.strokeStyle = '#6b6f73'; g.lineWidth = 10; g.strokeRect(5, 5, 1014, 182);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 132px ' + GUNG; const t = '동화목욕탕', col = ['#2d4a8a', '#2d4a8a', '#a8322d', '#a8322d', '#a8322d'];   // (2026-11-17) 이름은 '동화 목욕탕': 동화(파랑) · 목욕탕(빨강) 사이를 조금 띄운다
    [...t].forEach((c, i) => { g.fillStyle = col[i]; g.fillText(c, 512 - 2 * 172 + i * 172 + (i < 2 ? -24 : 24), 102); }); }
  else if (kind === 'chim') { g.clearRect(0, 0, 128, 640); g.fillStyle = '#f4efe6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 92px ' + GUNG; ['목', '욕', '탕'].forEach((c, i) => g.fillText(c, 64, 92 + i * 150)); g.font = '700 84px ' + GUNG; g.fillText('湯', 64, 560); }
  else if (kind === 'mark') { g.fillStyle = '#f3efe6'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#3a3f44'; g.lineWidth = 6; g.strokeRect(4, 4, 120, 120); g.fillStyle = '#a8322d'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '80px sans-serif'; g.fillText('♨', 64, 70); }
  else { g.clearRect(0, 0, 256, 128); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 78px ' + GUNG; g.fillStyle = kind === 'men' ? '#2f5fb0' : '#c0392b'; g.fillText(kind === 'men' ? '남탕' : '여탕', 128, 66); }
}), {alpha:kind !== 'sign' && kind !== 'mark', rough:.6}));
defineProp('bathhouse', {label:'동화 목욕탕 (몸체 · 간판 · 굴뚝)', category:'큰 가게', isNewStyle:true, blocksCamera:true, minimap:'#d9cdb4', mmSize:5,
  colliders:[{r:[-7.1 * U, -5.1 * U, 7.1 * U, 5.4 * U]}, {c:[3.2 * U, -2.6 * U, .8 * U]}],
  usage:"W.place('bathhouse', {x, z, rot});  // 14m × 10m 2층 + 굴뚝 15.5m. 앞 평상은 BIG_SIGNS.bath", build(){
    const {W, D, G, H, chim} = BATH, hw = W / 2, hd = D / 2, P = new Parts(), R = mulberry(23), extra = [];
    const wall = (g, c = 0xeee4cc) => P.add('wall', g, c), con = (g, c = 0xd9d3c4) => P.add('con', g, c), met = (g, c = 0x8f9aa2) => P.add('met', g, c);
    // 몸통: 아래 1.3m 하늘색, 위 크림색. (2026-11-17) 앞면은 가운데 입구(폭 3.6m, 높이 2.6m, 깊이 .6m)를 비워 들어가는 문이 보이게
    const DW = 1.8, DH = 2.6, DR = .6, body = (x0, x1, y0, y1, z1) => { if (y1 > y0 && x1 > x0) { if (y0 < 1.3) wall(box(x0, y0, -hd, x1, Math.min(1.3, y1), z1), 0xbcd3d6); if (y1 > 1.3) wall(box(x0, Math.max(1.3, y0), -hd, x1, y1, z1)); } };
    body(-hw, -DW, 0, H, hd); body(DW, hw, 0, H, hd); body(-DW, DW, DH, H, hd); body(-DW, DW, 0, DH, hd - DR);
    // 기둥(양 끝 · 문 양옆) 과 층 사이 처마 띠, 지붕 처마
    [-hw, -2.1, 2.1, hw].forEach((x, i) => { const a = i === 0 ? x - .12 : i === 3 ? x - .48 : x - .24, b = a + .6; con(box(a, 0, hd - .02, b, H + .1, hd + .22), 0xf0e8d4); });
    con(box(-hw - .5, G, hd - .02, hw + .5, G + .22, hd + .65), 0xe9e2d0); con(box(-hw - .5, G - .06, hd + .55, hw + .5, G, hd + .65), 0xcfc8b6);
    con(box(-hw - .2, H, -hd - .2, hw + .2, H + .35, hd + .3), 0xece5d3); con(box(-hw, H + .35, -hd, hw, H + .6, -hd + .2)); con(box(-hw, H + .35, hd + .1, hw, H + .6, hd + .3));
    // 창: 알루미늄 격자 창 (1층 양옆 크게, 2층 셋)
    const win = (x0, x1, y0, y1, cols, rows, c = 0x6d7a82) => { P.add('gls', box(x0, y0, hd - .05, x1, y1, hd + .02), c);
      for (let i = 0; i <= cols; i++) { const x = x0 + (x1 - x0) * i / cols; met(box(x - .03, y0, hd, x + .03, y1, hd + .06)); }
      for (let j = 0; j <= rows; j++) { const y = y0 + (y1 - y0) * j / rows; met(box(x0, y - .03, hd, x1, y + .03, hd + .06)); }
      con(box(x0 - .1, y0 - .1, hd, x1 + .1, y0, hd + .14), 0xd8d1c0); };
    win(-hw + .8, -2.6, 1.0, 2.9, 4, 3); win(2.6, hw - .8, 1.0, 2.9, 3, 2, 0x7c878e);
    win(-hw + 1.3, -3.4, 4.5, 6.1, 2, 1); win(-1.1, 1.1, 4.5, 6.1, 2, 1); win(3.4, hw - 1.3, 4.5, 6.1, 3, 1);
    P.add('int', box(4.6, 4.55, hd - .03, 5.4, 6.05, hd + .03), 0x2b2f33);   // 열어 둔 창 한 칸
    // 가운데 문: 미닫이 두 짝 (위 유리 · 아래 철 살), 위 ♨ 표지
    const dz = hd - DR + .02; con(box(-2.3, 0, dz - .02, 2.3, .14, hd + 1.1, .02), 0xc9c3b4); con(box(-2.6, 0, hd + 1.1, 2.6, .07, hd + 1.6, .02), 0xbab4a6);   // 디딤판 두 단
    P.add('int', box(-1.75, .14, dz - .08, 1.75, 2.55, dz - .02), 0x30353a);
    con(box(-2.4, DH + .1, hd, 2.4, DH + .28, hd + 1.4, .03), 0xe6dfcd); P.add('snw', box(-2.35, DH + .28, hd + .05, 2.35, DH + .38, hd + 1.35, .04));   // 입구 차양
    [-2.25, 2.25].forEach(x => met(box(x - .05, .14, hd + 1.25, x + .05, DH + .1, hd + 1.35), 0x8f9aa2));                                       // 차양 기둥
    P.add('int', box(-1.2, .14, hd + .1, 1.2, .16, hd + .9, .01), 0x3b4a3f);                                                                   // 발판
    [-1, 1].forEach(s => { const a = s < 0 ? -1.75 : .02, b = s < 0 ? -.02 : 1.75;
      P.add('gls', box(a, 1.1, dz, b, 2.45, dz + .04), 0x52616b); met(box(a, .12, dz, b, 1.1, dz + .05), 0x9aa3a8);
      for (let x = a + .12; x < b - .05; x += .14) met(box(x - .015, .2, dz + .05, x + .015, 1.02, dz + .07), 0x7d878e);
      [[a, a + .06], [b - .06, b]].forEach(([u, v]) => met(box(u, .12, dz - .01, v, 2.5, dz + .06), 0x7d878e)); met(box(a, 2.45, dz - .01, b, 2.52, dz + .06), 0x7d878e);
      extra.push(new THREE.Mesh(quadZ(a + .15, 1.45, b - .15, 2.05, dz + .045, [0, 0, 1, 1]), bathMat(s < 0 ? 'men' : 'women'))); });
    met(box(-.3, 2.98, hd - .02, .3, 3.48, hd + .04), 0x3a3f44); extra.push(new THREE.Mesh(quadZ(-.27, 3.01, .27, 3.45, hd + .045, [0, 0, 1, 1]), bathMat('mark')));   // 입구 차양 위로
    // 간판: 처마 띠 위 가운데
    con(box(-3.4, G + .25, hd + .2, 3.4, G + 1.45, hd + .32), 0x6b6f73); extra.push(new THREE.Mesh(quadZ(-3.32, G + .3, 3.32, G + 1.4, hd + .325, [0, 0, 1, 1]), bathMat('sign')));
    // 환기구 · 실외기 · 배관
    met(box(5.6, 2.1, hd + .02, 6.1, 2.6, hd + .1), 0xd8dde0); for (let y = 2.16; y < 2.58; y += .07) met(box(5.62, y, hd + .1, 6.08, y + .02, hd + .12), 0x9aa3a8);
    met(box(hw, 3.0, -3.2, hw + .3, 3.55, -2.4, .02), 0xe8e9e6); met(tube([V(-hw - .05, .3, -4.4), V(-hw - .05, H, -4.4)], .05, {radial:8}), 0x8f969c);
    // 옥상 계단실
    wall(box(-5.5, H + .35, -3.6, -3, H + 2.6, -1.2)); con(box(-5.7, H + 2.6, -3.8, -2.8, H + 2.75, -1), 0xe3dccb);
    P.add('gls', box(-4.7, H + 1.3, -1.22, -3.8, H + 2, -1.18), 0x52616b);
    // 굴뚝: 붉은 벽돌 원통(위로 조금 가늘게), 위 테두리 두 줄, 세로 글씨
    const {x:cx, z:cz, r:cr, h:chH} = chim;
    P.add('brk', xf(new THREE.CylinderGeometry(cr * .82, cr, chH, 20, 6, true), {x:cx, y:chH / 2, z:cz}), 0xffffff);
    [chH - .4, chH - 1.1].forEach(y => P.add('brk', xf(new THREE.CylinderGeometry(cr * .82 + .1, cr * .82 + .1, .25, 20), {x:cx, y, z:cz}), 0xd9b4a0));
    P.add('int', xf(new THREE.CylinderGeometry(cr * .7, cr * .7, .05, 16), {x:cx, y:chH - .02, z:cz}), 0x1d1f21);
    // 세로 글씨 띠: 굴뚝이 위로 가늘어지는 만큼 띠도 같이 가늘게 (벽돌 속에 묻혀 글자가 겹쳐 보이던 것)
    { const y0 = H + 1.6, y1 = H + 7.6, rAt = y => cr - cr * .18 * y / chH + .02, g = new THREE.CylinderGeometry(rAt(y1), rAt(y0), y1 - y0, 24, 1, true, -.6, 1.2);
      g.translate(cx, (y0 + y1) / 2, cz); extra.push(new THREE.Mesh(g, bathMat('chim'))); }
    // 눈: 옥상 · 처마 띠 · 계단실
    P.add('snw', box(-hw + .2, H + .35, -hd + .2, hw - .2, H + .43, hd + .1, .03)); P.add('snw', box(-hw - .45, G + .22, hd + .05, hw + .45, G + .28, hd + .6, .02)); P.add('snw', box(-5.6, H + 2.75, -3.7, -2.9, H + 2.82, -1.1, .02));
    P.bake('wall', (p, n) => (.8 + .2 * Math.min(1, p.y / 1.4)) * (.9 + .1 * Math.sin(p.x * 1.7 + p.y * 2.3) * Math.cos(p.z * 1.3)));
    P.bake('con', groundAO(.4, .75));
    return assemble(P, [['wall', concreteMaterial({seed:71})], ['con', concreteMaterial({seed:72})], ['met', metalMaterial({rough:.4})], ['gls', glassMaterial()], ['int', matteMaterial(), false],
      ['brk', brickWallMaterial({seed:131})], ['snw', snowMaterial({seed:83}), false]], [W + 1, chH, D + 1.5], extra); }});

// ───────── 평상: 나무 마루 상, 다리 넷, 위에 접힌 돗자리 ─────────
defineProp('woodenPlatform', {label:'평상', category:'큰 가게', isNewStyle:true, small:true, colliders:[{r:[-1.2 * U, -.75 * U, 1.2 * U, .75 * U]}],
  height:(x, z) => Math.abs(x) < 1.15 * U && Math.abs(z) < .7 * U ? .45 * U : null,
  usage:"W.place('woodenPlatform', {x, z, rot});  // 2.4m × 1.5m, 높이 0.45m (올라설 수 있다)", build(){
    const P = new Parts();
    [[-1.1, -.65], [1.1, -.65], [-1.1, .65], [1.1, .65], [0, -.65], [0, .65]].forEach(([x, z]) => P.add('wood', box(x - .05, 0, z - .05, x + .05, .38, z + .05, .01), 0x7a5a3e));
    P.add('wood', box(-1.2, .3, -.75, 1.2, .36, .75, .01), 0x6f5136);
    for (let z = -.72; z < .74; z += .12) P.add('wood', box(-1.2, .36, z, 1.2, .43, z + .1, .01), 0x9a7650);
    P.add('mat', box(-.1, .43, -.6, 1.05, .47, .55, .02), 0xb9a77a); P.add('mat', box(.1, .47, -.5, .9, .5, .45, .02), 0xc8b78a);
    P.add('snw', box(-1.15, .43, -.7, -.25, .46, .7, .02));
    return assemble(P, [['wood', woodMaterial({seed:29})], ['mat', matteMaterial({rough:.9})], ['snw', snowMaterial({seed:85}), false]], [2.4, .6, 1.5]); }});
// (2026-11-22) 양은 쟁반을 방석 위에 깔고 바나나우유 둘을 그 위에 (쟁반 높이 2.9cm)
BIG_SIGNS.bath = [['aluminumTray', {}, 4.72, .5, 6.42, .2], ['bananaMilk', {n:2, s:2}, 4.7, .529, 6.4, .3], ['bananaMilk', {n:1, straw:true, s:2}, 5.35, .5, 6.95, -.4], ['woodenPlatform', {}, 4.6, 0, 6.6]];   // 평상 방석(높이 0.5m) 위 바나나우유. 평상보다 먼저 놓아야 바닥 높이에 평상이 더해지지 않는다
BIG_PROP.bath = 'bathhouse';
defineProp('bathhouseSet', {label:'동화 목욕탕 (평상 조립 예시)', category:'큰 가게', isNewStyle:true, blocksCamera:true,
  usage:"placeBig(W, 'bath', x, z, rot);", build(){
    const g = new THREE.Group(); let draws = 0;
    [['bathhouse', {}, 0, 0, 0, 0], ...BIG_SIGNS.bath].forEach(([name, o, x, y, z, r]) => { const m = buildProp(name, o); m.position.set(x * U, y * U, z * U); m.rotation.y = r || 0; draws += m.userData.info.draws; g.add(m); });
    g.userData.info = {tris:triCount(g), draws, materials:draws, sizeMeters:[15, 16, 13]}; return g; }});
