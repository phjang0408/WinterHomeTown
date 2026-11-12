// 아파트 단지 소품 2: 쓰레기 분리수거장, 쉼터(사각 정자), 놀이터 조합놀이대, 흔들 놀이기구, 시소.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, lathe, sweep, curveZY, extrudeProfile, fillet, ridge, blob, xf, bakeAO, groundAO, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, plasticMaterial, metalMaterial, woodMaterial } from '../core/texkit.js';
import { assemble, quadZ, grain, mulberry } from './kit.js';
import { UNIT, FONT_D } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();
const ao = (g, fade = .2, floor = .7) => bakeAO(g, groundAO(fade, floor));
// 기울인 판 (양 끝 점 a→b 방향으로 길이, 폭 w, 두께 t). 폭 방향은 axis('x' 또는 'z').
function slab(a, b, w, t, axis = 'x'){
  const len = a.distanceTo(b), g = axis === 'x' ? new THREE.BoxGeometry(w, t, len) : new THREE.BoxGeometry(len, t, w), d = b.clone().sub(a);
  if (axis === 'x') g.rotateX(-Math.atan2(d.y, d.z)); else g.rotateZ(Math.atan2(d.y, d.x));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g;
}

// ── 쓰레기 분리수거장: 철골 지붕 아래 마대 걸이 다섯 칸 ──
const KINDS = [['종이류', '#3f6fa8'], ['플라스틱', '#e8742a'], ['캔·고철', '#8a9299'], ['유리병', '#3f8a5a'], ['비닐류', '#b0558a']];
const recycleTex = () => once('recycle', () => decalMaterial(canvasTex(1024, 256, (g, W, H) => { g.fillStyle = '#2f7d5b'; g.fillRect(0, 0, W, 150); g.fillStyle = '#f4f6f4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 92px ' + FONT_D; g.fillText('재활용품 분리수거장', 512, 80); KINDS.forEach(([t, c], i) => { g.fillStyle = c; g.fillRect(i * 204.8, 152, 204.8, 104); g.fillStyle = '#fff'; g.font = '700 54px ' + FONT_D; g.fillText(t, i * 204.8 + 102.4, 206); }); }), {rough:.7}));
defineProp('recycleStation', {label:'쓰레기 분리수거장', category:'분리수거', isNewStyle:true, colliders:[{r:[-3.3 * U, -1.3 * U, 3.3 * U, 1.25 * U]}], build(){
  const P = new Parts(), W2 = 3.2, D2 = 1.2, HF = 2.75, HB = 2.3, R = mulberry(9), post = 0x4d5f58;
  [-W2, 0, W2].forEach(x => { P.add('mat', box(x - .04, 0, D2 - .04, x + .04, HF, D2 + .04), post); P.add('mat', box(x - .04, 0, -D2 - .04, x + .04, HB, -D2 + .04), post);
    P.add('mat', slab(V(x, HB + .04, -D2 - .25), V(x, HF + .04, D2 + .25), .07, .08), post); [D2, -D2].forEach(z => P.add('mat', box(x - .09, 0, z - .09, x + .09, .05, z + .09), 0x6c7570)); });
  P.add('mat', box(-W2, HF - .08, D2 - .04, W2, HF, D2 + .04), post); P.add('mat', box(-W2, HB - .08, -D2 - .04, W2, HB, -D2 + .04), post);
  P.add('mat', slab(V(0, HB + .075, -D2 - .32), V(0, HF + .12, D2 + .38), W2 * 2 + .5, .03), 0x9fb0b6);                                               // 지붕판
  for (let i = -4; i <= 4; i++) P.add('mat', slab(V(i * .78, HB + .1, -D2 - .32), V(i * .78, HF + .145, D2 + .38), .05, .03), 0x8799a0);
  P.add('snw', slab(V(0, HB + .15, -D2 - .26), V(0, HF + .19, D2 + .3), W2 * 2 + .36, .13)); P.add('snw', ridge(Array.from({length:9}, (_, i) => V(-W2 - .1 + i * (W2 * 2 + .2) / 8, HF + .19, D2 + .32)), .2, .07));
  // 뒷벽·옆벽: 골 진 판
  P.add('mat', box(-W2, .12, -D2 - .02, W2, 1.95, -D2 + .02), 0xc5cdcf); [-W2, W2].forEach(x => P.add('mat', box(x - .02, .12, -D2, x + .02, 1.95, D2 - .3), 0xc5cdcf));
  for (let x = -W2 + .2; x < W2; x += .4) P.add('mat', box(x - .03, .14, -D2 + .02, x + .03, 1.93, -D2 + .04), 0xaeb8bb);
  for (let z = -D2 + .2; z < D2 - .4; z += .4) [-1, 1].forEach(s => P.add('mat', box(s * W2 - .04 * s - .012, .14, z - .03, s * W2 - .04 * s + .012, 1.93, z + .03), 0xaeb8bb));
  // 마대 걸이 다섯 칸과 내용물
  KINDS.forEach((k, i) => { const x = -2.5 + i * 1.25, z = -.35, w = .46, col = [0xb79564, 0xd9dde0, 0x9aa3a9, 0x5d8f6c, 0xe6e8e4][i];
    [[-w, -w], [w, -w], [w, w], [-w, w]].forEach(([dx, dz]) => P.add('met', tube([V(x + dx, 0, z + dz), V(x + dx, 1.02, z + dz)], .016, {radial:6})));
    P.add('met', tube(fillet([V(x - w, 1.02, z - w), V(x + w, 1.02, z - w), V(x + w, 1.02, z + w), V(x - w, 1.02, z + w), V(x - w, 1.02, z - w + .01)], .05, 3), .016, {radial:6}));
    P.add('mat', xf(box(-w + .03, .02, -w + .03, w - .03, .98, w - .03, .09), {x, z}), 0xe6e3da); P.add('mat', box(x - w + .08, .9, z - w + .08, x + w - .08, .985, z + w - .08), 0x8f8a80);
    for (let j = 0; j < 5; j++) { const bx = x + (R() - .5) * .5, bz = z + (R() - .5) * .5, s = .08 + R() * .08; P.add('mat', xf(box(-s, 0, -s * .7, s, s * (i === 0 ? .25 : 1.3), s * .7, .012), {x:bx, y:.97 + j * .012, z:bz, ry:R() * 3}), i === 1 ? [0xe9eef0, 0x7fb6d6, 0xe6c85a][j % 3] : col); } });
  // 접은 종이상자 더미, 스티로폼 상자, 빗자루
  for (let j = 0; j < 6; j++) P.add('mat', xf(box(-.42, 0, -.3, .42, .035, .3), {x:-2.5 + (R() - .5) * .08, y:.02 + j * .037, z:.62, ry:(R() - .5) * .3}), j % 2 ? 0xb58e5c : 0xc19a66);
  [[2.3, .6, .5, .3], [2.35, .62, .44, .64], [1.7, .66, .4, .28]].forEach(([x, z, w, y]) => P.add('mat', box(x - w / 2, y - .28, z - .18, x + w / 2, y, z + .18, .02), 0xf1f2ee));
  P.add('mat', tube([V(3.05, 0, .55), V(3.12, 1.3, .75)], .014, {radial:6}), 0xb58e5c); P.add('mat', xf(box(-.16, 0, -.03, .16, .14, .03), {x:3.045, z:.54, ry:.3}), 0x4f8f6a);
  ao(P.geo('mat'), .3, .74);
  const d = new Parts(); d.add('d', quadZ(-2.2, HF + .34, 2.2, HF + .98, D2 + .236, [0, 106 / 256, 1, 1])); d.add('d', quadZ(-3.05, 1.48, 3.05, 1.86, -D2 + .045, [0, 0, 1, 104 / 256]));
  P.add('mat', box(-2.24, HF + .3, D2 + .2, 2.24, HF + 1.02, D2 + .232), 0x2a5f47); [-1.8, 1.8].forEach(x => P.add('mat', box(x - .03, HF, D2 + .16, x + .03, HF + .5, D2 + .2), 0x4d5f58));
  return assemble(P, [['mat', matteMaterial()], ['met', metalMaterial()], ['snw', snowMaterial({seed:41})]], [6.9, 3.5, 3.1], [new THREE.Mesh(d.geo('d'), recycleTex())]); }});

// ── 쉼터: 네 기둥 사각 정자. 마루에 올라설 수 있다 (앞쪽 디딤돌) ──
function hipRoof(b, y0, y1, t){
  const pos = [], tri = (a, c, d) => pos.push(...a, ...c, ...d), C = [[-b, y0, -b], [b, y0, -b], [b, y0, b], [-b, y0, b]], A = [0, y1, 0], C2 = C.map(p => [p[0], p[1] - t, p[2]]), A2 = [0, y1 - t, 0];
  for (let i = 0; i < 4; i++) { const p = C[i], q = C[(i + 1) % 4], p2 = C2[i], q2 = C2[(i + 1) % 4]; tri(p, A, q); tri(p2, q2, A2); tri(p, q, q2); tri(p, q2, p2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const PV = {deck:.34, half:1.75, post:1.55};
defineProp('pavilion', {label:'쉼터 (사각 정자)', category:'쉼터', isNewStyle:true,
  colliders:[{c:[-PV.post * U, -PV.post * U, .14 * U]}, {c:[PV.post * U, -PV.post * U, .14 * U]}, {c:[-PV.post * U, PV.post * U, .14 * U]}, {c:[PV.post * U, PV.post * U, .14 * U]},
    {r:[-1.8 * U, -1.8 * U, -1.28 * U, 1.45 * U]}, {r:[1.28 * U, -1.8 * U, 1.8 * U, 1.45 * U]}, {r:[-1.8 * U, -1.8 * U, 1.8 * U, -1.28 * U]}],
  height:(x, z) => Math.abs(x) <= PV.half * U && Math.abs(z) <= PV.half * U ? PV.deck * U : Math.abs(x) <= .7 * U && z > 0 && z <= 2.12 * U ? .17 * U : null,
  build(){
    const P = new Parts(), D = PV.deck, Hh = PV.half, PX = PV.post, TOP = 2.46, wd = (g, ax, c = 0xffffff) => P.add('wod', grain(g, ax), c), R = mulberry(4);
    for (let i = 0; i < 12; i++) { const z = -Hh + (i + .5) * (2 * Hh / 12); wd(box(-Hh, D - .045, z - .14, Hh, D, z + .14, .006), 'x', [0xf3ece2, 0xe6ddd0, 0xfaf4ea][i % 3]); }
    [[-Hh, -Hh, Hh, -Hh + .05], [-Hh, Hh - .05, Hh, Hh]].forEach(r => wd(box(r[0], .1, r[1], r[2], D - .045, r[3]), 'x', 0xc9bba8)); [[-Hh, -Hh, -Hh + .05, Hh], [Hh - .05, -Hh, Hh, Hh]].forEach(r => wd(box(r[0], .1, r[1], r[2], D - .045, r[3]), 'z', 0xc9bba8));
    [[-PX, -PX], [PX, -PX], [-PX, PX], [PX, PX]].forEach(([x, z]) => { wd(box(x - .075, .1, z - .075, x + .075, TOP, z + .075, .012), 'y', 0xd9cab6); P.add('mat', box(x - .14, 0, z - .14, x + .14, .2, z + .14, .02), 0xa9adaf);
      [[1, 0], [0, 1]].forEach(([ax, az]) => { const s = -Math.sign(ax ? x : z), a = V(x, TOP - .55, z), b = V(x + ax * s * .5, TOP - .08, z + az * s * .5); wd(ax ? slab(a, b, .06, .06, 'z') : slab(a, b, .06, .06, 'x'), 'y', 0xcbbba6); }); });
    [[-PX - .2, PX + .2, -PX], [-PX - .2, PX + .2, PX]].forEach(([a, b, z]) => wd(box(a, TOP - .16, z - .05, b, TOP, z + .05, .008), 'x', 0xd2c2ad)); [[-PX - .2, PX + .2, -PX], [-PX - .2, PX + .2, PX]].forEach(([a, b, x]) => wd(box(x - .05, TOP - .16, a, x + .05, TOP, b, .008), 'z', 0xd2c2ad));
    for (let i = -4; i <= 4; i++) { const t = i * .5; [-1, 1].forEach(s => { wd(slab(V(t, TOP + .2, s * 1.3), V(t * 1.02, TOP - .04, s * 2.3), .05, .07), 'z', 0xc4b39c); wd(slab(V(s * 1.3, TOP + .2, t), V(s * 2.3, TOP - .04, t * 1.02), .07, .05, 'z'), 'x', 0xc4b39c); }); }
    // 걸터앉는 자리: 세 면
    const seatY = D + .42;
    [[-1, 'z'], [1, 'z'], [-1, 'x']].forEach(([s, ax], k) => { const mk = (a0, a1, b0, b1, y0, y1, c) => wd(ax === 'z' ? box(Math.min(s * a0, s * a1), y0, b0, Math.max(s * a0, s * a1), y1, b1, .008) : box(b0, y0, Math.min(s * a0, s * a1), b1, y1, Math.max(s * a0, s * a1), .008), ax, c);
      mk(1.3, 1.48, -1.42, 1.42, seatY - .04, seatY, 0xeadfce); mk(1.5, 1.68, -1.42, 1.42, seatY - .04, seatY, 0xe0d4c1); [.26, .5].forEach(h => mk(1.5, 1.545, -1.48, 1.48, seatY + h, seatY + h + .09, 0xd6c8b4));
      [-1.2, 0, 1.2].forEach(t => { mk(1.34, 1.64, t - .03, t + .03, D, seatY - .04, 0xbfae98); }); });
    wd(box(-.6, 0, Hh + .02, .6, .17, Hh + .36, .015), 'x', 0xbfb09b);
    // 지붕: 모임지붕, 마루 기와선, 꼭대기 장식
    P.add('mat', hipRoof(2.4, TOP + .0, 3.5, .07), 0x4b4640);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => P.add('mat', tube([V(sx * 2.4, TOP + .02, sz * 2.4), V(0, 3.52, 0)], .045, {radial:6}), 0x3c3833));
    P.add('mat', lathe([[0, 3.46], [.12, 3.48], [.14, 3.56], [.06, 3.62], [.07, 3.7], [0, 3.78]], 10), 0x3c3833);
    const sn = hipRoof(2.3, TOP + .1, 3.62, .09); P.add('snw', sn);
    [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([ax, az, bx, bz]) => P.add('snw', ridge(Array.from({length:9}, (_, i) => V((ax + (bx - ax) * i / 8) * 2.32, TOP + .07, (az + (bz - az) * i / 8) * 2.32)), .22, .09)));
    P.add('snw', xf(blob(.2, .1, .2, {seed:3, bump:.05, seg:10}), {y:3.7}));
    ao(P.geo('wod'), .25, .72); bakeAO(P.geo('mat'), (p, n) => n.y < -.3 ? .6 : 1);
    return assemble(P, [['wod', woodMaterial({seed:14, light:[.74, .6, .44], dark:[.5, .38, .26]})], ['mat', matteMaterial()], ['snw', snowMaterial({seed:42})]], [4.8, 3.8, 4.8]); }});

// ── 놀이터 조합놀이대: 지붕 있는 높은 대 + 낮은 대, 다리, 계단, 미끄럼틀 둘, 암벽판. 고무 바닥 포함 ──
defineProp('playSet', {label:'놀이터 조합놀이대', category:'놀이터', isNewStyle:true,
  colliders:[{r:[.5 * U, -.72 * U, 1.9 * U, .72 * U]}, {r:[.88 * U, .7 * U, 1.52 * U, 3.55 * U]}, {r:[-2.55 * U, -.68 * U, -1.25 * U, .68 * U]}, {r:[-1.3 * U, -.38 * U, .55 * U, .38 * U]}, {r:[-3.6 * U, -.34 * U, -2.5 * U, .34 * U]}, {r:[-2.22 * U, .66 * U, -1.58 * U, 2.6 * U]}],
  usage:"W.place('playSet', {x: 150, z: 172, rot: 0});  // 고무 바닥 10m × 7.2m 포함", build(){
    const P = new Parts(), pl = (g, c) => P.add('pla', g, c), mt = (g, c) => P.add('mat', g, c), BLUE = 0x2f6fb5, RED = 0xd24a3a, YEL = 0xf0b429, GRN = 0x4f9e5a, ORG = 0xe8742a;
    // 고무 바닥과 경계석
    mt(box(-5, 0, -3.6, 5, .03, 3.6), 0x5f9a6b); [[-2.8, 1.6, 1.5, 0xd9a55a], [2.6, -1.4, 1.7, 0x5d8fbf], [3.2, 2.2, 1.0, 0xd9a55a]].forEach(([x, z, r, c]) => mt(xf(new THREE.CylinderGeometry(r, r, .034, 28), {x, y:.017, z}), c));
    [[-5.12, -3.72, 5.12, -3.6], [-5.12, 3.6, 5.12, 3.72], [-5.12, -3.6, -5, 3.6], [5, -3.6, 5.12, 3.6]].forEach(r => mt(box(r[0], 0, r[1], r[2], .1, r[3], .02), 0xa9adaf));
    // 높은 대 A (가운데 x=1.2, 바닥 1.2m, 지붕)
    const ax = 1.2, ah = 1.2, post = (x, z, h, c) => pl(tube([V(x, 0, z), V(x, h, z)], .05, {radial:10}), c);
    [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]].forEach(([dx, dz]) => post(ax + dx, dz, 2.75, BLUE));
    mt(box(ax - .62, ah - .06, -.62, ax + .62, ah, .62, .01), 0x7a5a42);
    [-1, 1].forEach(s => { pl(slab(V(ax, 3.2, 0), V(ax + s * .82, 2.72, 0), 1.56, .045, 'z'), RED); P.add('snw', slab(V(ax + s * .03, 3.27, 0), V(ax + s * .78, 2.83, 0), 1.5, .09, 'z')); });
    [-.75, .75].forEach(z => pl(xf(extrudeProfile(new THREE.Shape([new THREE.Vector2(-.7, 0), new THREE.Vector2(.7, 0), new THREE.Vector2(0, .42)]), .03, {bevel:.004, bevelSegments:1}), {ry:Math.PI / 2, x:ax, y:2.74, z}), YEL));
    pl(box(ax + .57, .04, -.56, ax + .61, ah - .06, .56, .01), 0x8fbf4a); const R = mulberry(8);                                                         // 암벽판과 손잡이돌
    for (let i = 0; i < 9; i++) mt(xf(blob(.05, .045, .06, {seed:i, bump:.2, seg:8}), {rz:-Math.PI / 2, x:ax + .61, y:.2 + (i % 3) * .34 + R() * .12, z:-.4 + Math.floor(i / 3) * .4 + (R() - .5) * .12}), [RED, BLUE, YEL, ORG][i % 4]);
    pl(box(ax + .57, ah + .06, -.56, ax + .61, ah + .78, .56, .012), YEL); P.add('gls', xf(blob(.2, .12, .2, {seed:1, bump:0, seg:14}), {rz:-Math.PI / 2, x:ax + .6, y:ah + .44}), 0x3b6ea3);
    pl(box(ax - .56, ah + .06, -.61, ax + .56, ah + .78, -.57, .012), BLUE); pl(xf(new THREE.TorusGeometry(.13, .022, 8, 18), {x:ax, y:ah + .46, z:-.53}), RED);
    [-.6, .6].forEach(dx => pl(tube([V(ax + dx, ah + .8, .6), V(ax + dx, ah + .8, -.6)], .025, {radial:8}), BLUE));
    // 미끄럼틀 (노랑 물결)
    const U8 = [[-.03, -.31], [-.03, .31], [.14, .31], [.14, .28], [0, .25], [0, -.25], [.14, -.28], [.14, -.31]].map(p => new THREE.Vector2(p[0], p[1]));
    pl(sweep(curveZY([[.56, ah], [.95, ah - .06], [1.55, .78], [2.15, .52], [2.7, .3], [3.15, .22], [3.5, .21]], ax), U8, {segments:28, up:V(0, 1, 0)}), YEL);
    [-.22, .22].forEach(dx => pl(tube([V(ax + dx, 0, 2.2), V(ax + dx, .48, 2.2)], .03, {radial:8}), BLUE)); pl(tube(fillet([V(ax - .33, ah, .6), V(ax - .33, ah + .75, .68), V(ax + .33, ah + .75, .68), V(ax + .33, ah, .6)], .12, 4), .025, {radial:8}), RED);
    // 낮은 대 B (가운데 x=-1.9, 바닥 0.8m)
    const bxc = -1.9, bh = .8;
    [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]].forEach(([dx, dz]) => { post(bxc + dx, dz, 1.75, GRN); P.add('snw', xf(blob(.07, .05, .07, {seed:2, bump:0, seg:8}), {x:bxc + dx, y:1.75, z:dz})); });
    mt(box(bxc - .62, bh - .06, -.62, bxc + .62, bh, .62, .01), 0x7a5a42);
    pl(box(bxc - .56, bh + .06, -.61, bxc + .56, bh + .74, -.57, .012), ORG); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pl(box(bxc - .3 + i * .3 - .09, bh + .14 + j * .2, -.565, bxc - .3 + i * .3 + .09, bh + .3 + j * .2, -.555, .01), [0xf4f4f1, RED, BLUE][(i + j) % 3]);
    [.6, -.6].forEach(z => pl(tube([V(bxc - .6, bh + .76, z), V(bxc + .6, bh + .76, z)], .025, {radial:8}), GRN));
    pl(sweep(curveZY([[.56, bh], [.9, bh - .05], [1.9, .3], [2.3, .22], [2.55, .21]], bxc), U8, {segments:18, up:V(0, 1, 0)}), RED);
    // 계단 (서쪽)
    for (let i = 0; i < 4; i++) mt(box(bxc - .6 - (i + 1) * .26, bh - (i + 1) * .2 - .04, -.3, bxc - .6 - i * .26, bh - (i + 1) * .2, .3, .008), 0x7a5a42);
    [-.32, .32].forEach(z => { pl(tube(fillet([V(bxc - .62, bh + .76, z), V(bxc - 1.66, .76, z), V(bxc - 1.66, 0, z)], .1, 4), .025, {radial:8}), GRN); pl(slab(V(bxc - 1.66, .0, z), V(bxc - .6, bh - .02, z), .03, .12, 'z'), GRN); });
    // 다리 (B → A, 오르막)
    for (let i = 0; i < 7; i++) { const t = (i + .5) / 7, x = bxc + .6 + t * (ax - .6 - bxc - .6); mt(xf(box(-.12, -.02, -.34, .12, .02, .34, .008), {x, y:bh + t * (ah - bh) - .02, rz:.2}), i % 2 ? 0x8a674a : 0x7a5a42); }
    [-.36, .36].forEach(z => { pl(tube(fillet([V(bxc + .6, bh + .76, z), V((bxc + ax) / 2, bh + 1.05, z), V(ax - .6, ah + .8, z)], .5, 6), .025, {radial:8}), RED);
      for (let i = 1; i < 6; i++) { const t = i / 6, x = bxc + .6 + t * (ax - 1.2 - bxc); pl(tube([V(x, bh + t * (ah - bh), z), V(x, bh + t * (ah - bh) + .78 + Math.sin(t * Math.PI) * .12, z)], .012, {radial:6}), RED); } });
    ao(P.geo('mat'), .12, .82); ao(P.geo('pla'), .3, .8);
    return assemble(P, [['pla', plasticMaterial()], ['mat', matteMaterial()], ['gls', plasticMaterial({rough:.15})], ['snw', snowMaterial({seed:43})]], [10.2, 3.3, 7.4]); }});

// ── 흔들 놀이기구: 용수철 위의 오리 ──
defineProp('springRider', {label:'흔들 놀이기구', category:'놀이터', isNewStyle:true, colliders:[{c:[0, 0, .34 * U]}], usage:"W.place('springRider', {x: 122, z: 166, rot: 1, color: 0xf0b429});", build(o = {}){
  const P = new Parts(), c = o.color || 0xf0b429, Y = .36;
  const out = new THREE.SplineCurve([[-.44, .06], [-.52, .22], [-.47, .4], [-.34, .33], [-.12, .3], [.06, .36], [.15, .54], [.29, .64], [.44, .58], [.56, .46], [.44, .41], [.4, .3], [.35, .12], [.18, 0], [-.2, -.02], [-.44, .06]].map(p => new THREE.Vector2(p[0], p[1]))).getPoints(60);
  [-.11, .11].forEach(x => P.add('pla', xf(extrudeProfile(new THREE.Shape(out), .035, {bevel:.01, bevelSegments:3}), {x, y:Y}), c));
  P.add('pla', box(-.11, Y + .2, -.28, .11, Y + .25, .06, .02), 0xd24a3a); P.add('pla', box(-.1, Y + .02, -.3, .1, Y + .2, .1), c);
  [-1, 1].forEach(s => { P.add('mat', xf(new THREE.CylinderGeometry(.028, .028, .012, 12), {rz:Math.PI / 2, x:s * .133, y:Y + .53, z:.33}), 0x1d1f22); P.add('pla', box(s * .13 - .004, Y + .44, .46, s * .13 + .004, Y + .5, .58), 0xe8742a); });
  P.add('mat', tube([V(-.24, Y + .47, .2), V(.24, Y + .47, .2)], .016, {radial:8}), 0x30363b); P.add('mat', tube([V(-.24, Y + .06, .1), V(.24, Y + .06, .1)], .018, {radial:8}), 0x30363b);
  [-.24, .24].forEach(x => P.add('pla', xf(new THREE.CylinderGeometry(.024, .024, .09, 10), {rz:Math.PI / 2, x:x * .92, y:Y + .47, z:.2}), 0xd24a3a));
  P.add('mat', tube(Array.from({length:73}, (_, i) => { const a = i / 72 * Math.PI * 9; return V(Math.cos(a) * .085, .03 + i / 72 * .33, Math.sin(a) * .085 - .08); }), .014, {radial:6}), 0x2c3237);
  P.add('mat', box(-.16, 0, -.24, .16, .03, .08, .008), 0x4a5157); P.add('snw', xf(blob(.09, .04, .22, {seed:2, bump:.1, seg:10}), {y:Y + .25, z:-.1}));
  return assemble(P, [['pla', plasticMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [.5, 1.02, 1.1]); }});

// ── 시소 ──
defineProp('seesaw', {label:'시소', category:'놀이터', isNewStyle:true, colliders:[{r:[-1.7 * U, -.3 * U, 1.7 * U, .3 * U]}], build(){
  const P = new Parts(), tilt = .13, T = g => { g.rotateZ(tilt); g.translate(0, .52, 0); return g; };
  P.add('pla', T(box(-1.6, -.035, -.07, 1.6, .035, .07, .02)), 0xd24a3a);
  [-1, 1].forEach(s => { P.add('pla', T(box(s * 1.42 - .18, .035, -.15, s * 1.42 + .18, .075, .15, .02)), s < 0 ? 0x2f6fb5 : 0xf0b429); P.add('pla', T(box(s * 1.6 - .02, .03, -.15, s * 1.6 + .02, .26, .15, .015)), s < 0 ? 0x2f6fb5 : 0xf0b429);
    P.add('mat', T(tube(fillet([V(s * 1.1, .03, -.12), V(s * 1.1, .28, -.12), V(s * 1.1, .28, .12), V(s * 1.1, .03, .12)], .05, 3), .014, {radial:6})), 0x30363b);
    P.add('mat', xf(new THREE.TorusGeometry(.2, .075, 8, 16, Math.PI), {ry:Math.PI / 2, x:s * 1.45, y:0}), 0x1d1f22); });
  [-.1, .1].forEach(z => P.add('pla', box(-.1, 0, z - .015, .1, .6, z + .015, .01), 0x4f9e5a)); P.add('mat', xf(new THREE.CylinderGeometry(.03, .03, .26, 10), {rx:Math.PI / 2, y:.52}), 0x30363b); P.add('mat', box(-.2, 0, -.16, .2, .03, .16), 0x4a5157);
  P.add('snw', T(xf(blob(.14, .035, .1, {seed:3, bump:.1, seg:10}), {x:1.42, y:.075})));
  return assemble(P, [['pla', plasticMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [3.4, .9, .5]); }});
