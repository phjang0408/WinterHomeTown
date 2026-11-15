// 아파트 상가: 건물 몸체, 앞 계단, 간판 세 가지(가로·세로 돌출·옥상)를 따로 만들고 맞춰 끼운다. 상호는 모두 지어낸 이름이다.
//   몸체: 2층, 21m × 9m. 1층 가게 네 칸이 0.9m 높은 단(테라스) 위에 있고, 테라스 난간 가운데 4.2m가 계단 자리로 비어 있다.
//   가운데 칸(폭 3.7m)은 건물을 앞뒤로 뚫은 통로다: 앞 계단 → 테라스 → 통로 → 뒤 계단으로 걸어서 지나갈 수 있다. 2층은 통로 위로 이어진다.
//   치수 약속: 가게 한 칸 4.2m, 가로 간판 자리는 칸마다 y 3.78~4.53m, 세로 간판은 2층 기둥(y 4.9m~), 옥상 간판은 지붕 바닥(y 7.86m).
import * as THREE from '../lib/three.js';
import { defineProp, buildProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, loft, tube, lathe, flatXZ, fillet, ridge, blob, xf, groundAO, triCount, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, metalMaterial, concreteMaterial, paverMaterial, glassMaterial } from '../core/texkit.js';
import { assemble, quad, quadZ, mulberry } from './kit.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();
const SB = {X:10.5, Z:4.5, PH:.9, TD:2.4, Y1:4.5, Y2:7.8, bays:[-8.4, -4.2, 0, 4.2, 8.4], gap:2.1, PW:1.85, PY:3.75};   // PW·PY: 가운데 통로의 반폭과 천장 높이

// ── 간판 그림: 한 장에 모아 그린다 (가로 8칸 512×96, 세로 5칸 96×384, 옥상 1024×256) ──
const SHOPS = [
  {n:'동화마트', sub:'식품 · 생활용품', bg:'#d83a2e', fg:'#fff8e0'}, {n:'참새분식', sub:'떡볶이 · 김밥', bg:'#f2b632', fg:'#5a2a12'},
  {n:'무지개세탁', sub:'드라이 · 수선', bg:'#2f6fb5', fg:'#ffffff'}, {n:'새봄약국', sub:'처방 조제', bg:'#f4f6f4', fg:'#2f8a5a'},
  {n:'별빛문구', sub:'문구 · 복사', bg:'#3f8a97', fg:'#ffffff'}, {n:'바삭치킨', sub:'후라이드 · 양념', bg:'#e8742a', fg:'#ffffff'},
  {n:'다정미용실', sub:'커트 · 파마', bg:'#b0558a', fg:'#ffffff'}, {n:'동화부동산', sub:'매매 · 전세', bg:'#f1e9c9', fg:'#27496d'}];
const VERT = [{n:'은하피아노', bg:'#27496d', fg:'#ffffff'}, {n:'으뜸태권도', bg:'#d83a2e', fg:'#fff8e0'}, {n:'새봄약국', bg:'#f4f6f4', fg:'#2f8a5a'}, {n:'속셈학원', bg:'#f2b632', fg:'#5a2a12'}, {n:'동화치과', bg:'#3f8a97', fg:'#ffffff'}];
const cell = (x, y, w, h) => [x / 2048, 1 - (y + h) / 1024, (x + w) / 2048, 1 - y / 1024];
const atlas = () => once('signs', () => decalMaterial(canvasTex(2048, 1024, g => {
  g.fillStyle = '#777'; g.fillRect(0, 0, 2048, 1024); g.textBaseline = 'middle';
  SHOPS.forEach((s, i) => { const x = (i % 2) * 512, y = (i >> 1) * 96; g.fillStyle = s.bg; g.fillRect(x, y, 512, 96); g.fillStyle = s.fg; g.fillRect(x + 12, y + 12, 7, 72);
    g.textAlign = 'left'; g.font = '62px ' + FONT_D; g.fillText(s.n, x + 32, y + 46); g.textAlign = 'right'; g.font = '800 21px ' + FONT_B; g.fillText(s.sub, x + 498, y + 72); });
  VERT.forEach((s, i) => { const x = 1024 + i * 96, ch = [...s.n], st = 350 / ch.length; g.fillStyle = s.bg; g.fillRect(x, 0, 96, 384); g.fillStyle = s.fg; g.textAlign = 'center'; g.font = '700 ' + Math.min(72, st * .92) + 'px ' + FONT_D;
    ch.forEach((c, k) => g.fillText(c, x + 48, 20 + st * (k + .5))); });
  g.fillStyle = '#27496d'; g.fillRect(0, 400, 1024, 256); g.strokeStyle = '#f4f6f7'; g.lineWidth = 8; g.strokeRect(12, 412, 1000, 232);
  g.lineWidth = 14; g.lineCap = 'round'; g.strokeStyle = '#8fc0e8'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(140, 528); g.lineTo(140 + Math.cos(a) * 70, 528 + Math.sin(a) * 70); g.stroke(); }
  g.fillStyle = '#f4f6f7'; g.textAlign = 'left'; g.font = '178px ' + FONT_D; g.fillText('동화상가', 262, 534);
}), {rough:.6}));
const face = (g, mat) => { const m = new THREE.Mesh(g, mat || atlas()); return m; };
// 글자를 직접 주는 간판 그림 (2026-11-15: 상가 건물 4동이 기존 간판 소품을 다시 쓰도록). 가로면 한 줄(+작은 줄), 세로면 한 글자씩.
//   o.text, o.sub, o.bg, o.fg, o.accent(글자 일부 색: [시작, 끝, 색]), o.border
const textSigns = new Map();
export function textSignMat(o, vertical, aspect){
  const key = [o.text, o.sub, o.bg, o.fg, o.accent, o.border, vertical, aspect.toFixed(2)].join('|'); if (textSigns.has(key)) return textSigns.get(key);
  const W = vertical ? 128 : 1024, H = vertical ? Math.round(128 * aspect) : Math.round(1024 / aspect);
  const t = canvasTex(W, H, g => { g.lineJoin = 'round'; const T = (str, x, y, lw) => { g.strokeStyle = g.fillStyle; g.lineWidth = lw; g.strokeText(str, x, y); g.fillText(str, x, y); };   // 글자를 같은 색 테두리로 굵게
    g.fillStyle = o.bg || '#f2b632'; g.fillRect(0, 0, W, H); g.fillStyle = o.fg || '#20252b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = vertical ? 8 : 10; g.strokeRect(6, 6, W - 12, H - 12); }
    const chars = [...o.text];
    if (vertical) { const st = (H - 30) / chars.length; const fs = Math.min(96, st * .86); g.font = fs + 'px ' + FONT_D; chars.forEach((c, k) => T(c, W / 2, 15 + st * (k + .5), fs * .07)); }
    else { const fs = Math.min(H * (o.sub ? .58 : .72), (W - 60) / (chars.length * .95)); g.font = fs + 'px ' + FONT_D; const ty = o.sub ? H * .42 : H * .53;
      if (o.accent) { const [a, b, c] = o.accent, tw = g.measureText(o.text).width; let x = W / 2 - tw / 2; g.textAlign = 'left';
        chars.forEach((ch, k) => { g.fillStyle = k >= a && k < b ? c : (o.fg || '#20252b'); T(ch, x, ty, fs * .06); x += g.measureText(ch).width; }); }
      else T(o.text, W / 2, ty, fs * .06);
      if (o.sub) { g.textAlign = 'center'; g.fillStyle = o.fg || '#20252b'; g.font = '800 ' + Math.round(H * .2) + 'px ' + FONT_B; T(o.sub, W / 2, H * .82, H * .012); } } });
  const m = decalMaterial(t, {rough:.6}); textSigns.set(key, m); return m;
}

// ── 상가 건물 몸체 ──
defineProp('shopBuilding', {label:'상가 건물 (몸체)', category:'상가', isNewStyle:true, blocksCamera:true, minimap:'#c9c3b5', mmSize:9,
  height:(x, z) => (Math.abs(x) <= SB.X * U && z >= SB.Z * U && z <= (SB.Z + SB.TD) * U) || (Math.abs(x) <= SB.PW * U && Math.abs(z) <= SB.Z * U) ? SB.PH * U : null,
  colliders:[[-SB.X, -SB.Z, -SB.PW, SB.Z], [SB.PW, -SB.Z, SB.X, SB.Z], [-SB.X, SB.Z + SB.TD - .12, -SB.gap, SB.Z + SB.TD], [SB.gap, SB.Z + SB.TD - .12, SB.X, SB.Z + SB.TD], [-SB.X, SB.Z, -SB.X + .12, SB.Z + SB.TD], [SB.X - .12, SB.Z, SB.X, SB.Z + SB.TD]].map(r => ({r:r.map(v => v * U)})),
  usage:"W.place('shopBuilding', {x: 300, z: 140, rot: 0});  // 21m × 9m + 테라스 2.4m, 정면 +z", build(){
    const P = new Parts(), {X, Z, PH, TD, Y1, Y2} = SB, R = mulberry(12), con = (g, c) => P.add('con', g, c), met = (g, c) => P.add('met', g, c), gls = (g, c) => P.add('gls', g, c), mat = (g, c) => P.add('mat', g, c);
    const WALL = 0xc4c0b6, TRIM = 0xdedbd2, FR = 0x4f5964, GL = [0x3a4e62, 0x445a70, 0x2f4257, 0x4d6076];
    const PW = SB.PW, PY = SB.PY;
    con(box(-X, 0, -Z, -PW, Y2, Z), WALL); con(box(PW, 0, -Z, X, Y2, Z), WALL); con(box(-PW, PY, -Z, PW, Y2, Z), WALL);          // 통로 양옆 덩어리와 통로 위 2층
    con(box(-PW, 0, -Z, PW, PH, Z), 0xa9adaf); P.add('pav', flatXZ(-PW, -Z, PW, Z, PH + .004), 0xffffff);                     // 통로 바닥
    [-1, 1].forEach(s => { con(box(s * PW - .02, PH, -Z, s * PW + .02, PH + .12, Z), 0x8f9496); mat(box(s * (PW - .012) - .012, PH + 1.5, -1.6, s * (PW - .012) + .012, PH + 2.3, 1.6, .006), 0x3f8a97); });   // 걸레받이, 벽 안내판
    [-2.2, 0, 2.2].forEach(z => gls(box(-.5, PY - .05, z - .12, .5, PY - .012, z + .12, .01), 0xf4f1e2));                           // 통로 천장 등
    con(box(-X - .03, 0, -Z - .03, X + .03, PH - .03, Z), 0x9fa4a7);
    con(box(-X, 0, Z, X, PH, Z + TD, .02), 0xa9adaf); P.add('pav', flatXZ(-X + .03, Z, X - .03, Z + TD - .03, PH + .004), 0xffffff);
    [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5].forEach(x => con(box(Math.max(-X, x - .25), PH, Z, Math.min(X, x + .25), Y2, Z + .12), 0xd3d0c8));
    con(box(-X, Y1 - .02, Z, X, Y1 + .14, Z + .16, .01), TRIM);
    SB.bays.forEach((c, i) => {
      const s = i % 2 ? -1 : 1, span = (a, b) => [Math.min(c + s * a, c + s * b), Math.max(c + s * a, c + s * b)], g1 = GL[i % 4], g2 = GL[(i + 2) % 4];
      // 1층 가게: 알루미늄 틀, 유리문, 진열창 두 장, 아래 가림판, 위 채광창 (가운데 칸은 통로라서 비운다)
      const shop = c !== 0;
      if (shop) { met(box(c - 1.85, PH, Z - .04, c + 1.85, 3.75, Z + .05), FR);
      let [a, b] = span(.8, 1.72); gls(box(a, PH + .12, Z + .05, b, PH + 2.1, Z + .066), g2); met(tube([V(c + s * .92, PH + .9, Z + .11), V(c + s * .92, PH + 1.4, Z + .11)], .014, {radial:6}), 0xd6dbdf);
      [a, b] = span(-1.72, -.52); gls(box(a, PH + .5, Z + .05, b, PH + 2.1, Z + .066), g1); [a, b] = span(-.44, .72); gls(box(a, PH + .5, Z + .05, b, PH + 2.1, Z + .066), g1);
      [a, b] = span(-1.72, .72); met(box(a, PH + .08, Z + .05, b, PH + .44, Z + .07), 0xbfc5c9); gls(box(c - 1.72, PH + 2.2, Z + .05, c + 1.72, PH + 2.78, Z + .066), i === 1 ? 0x9c9684 : g2); }
      con(box(c - 1.85, 3.75, Z, c + 1.85, 4.48, Z + .06), TRIM);                                                       // 가로 간판 자리
      // 2층 창: 세 쪽
      met(box(c - 1.7, 5.3, Z - .03, c + 1.7, 6.9, Z + .04), FR); [[-1.62, -.56], [-.5, .5], [.56, 1.62]].forEach(([p, q], k) => gls(box(c + p, 5.38, Z + .04, c + q, 6.82, Z + .056), k === 1 ? g2 : R() < .25 ? 0x8f8c80 : g1));
      con(box(c - 1.8, 5.2, Z, c + 1.8, 5.3, Z + .15, .01), TRIM); P.add('snw', ridge([V(c - 1.7, 5.3, Z + .1), V(c, 5.3, Z + .1), V(c + 1.7, 5.3, Z + .1)], .12, .04));
      // 뒷면: 2층 작은 창, 1층 뒷문
      met(box(c - .7, 5.5, -Z - .04, c + .7, 6.7, -Z + .02), FR); gls(box(c - .62, 5.58, -Z - .056, c + .62, 6.62, -Z - .04), g1);
      if (shop) { met(box(c - .5, 0, -Z - .04, c + .5, 2.1, -Z + .02), 0x8f989e); mat(box(c + .28, 1.0, -Z - .07, c + .36, 1.06, -Z - .04), 0x30363b); } });
    // 옆면: 창, 2층 계단 출입문(+x)과 작은 캐노피, 실외기(-x)
    [-1, 1].forEach(s => { [[-2.4, 5.4, 6.8], [1.6, 5.4, 6.8], [-2.4, 1.9, 3.3]].forEach(([z, y0, y1]) => { met(box(s * X - .03, y0, z - .8, s * X + .04, y1, z + .8), FR); gls(box(s * (X + .048) - .008, y0 + .08, z - .72, s * (X + .048) + .008, y1 - .08, z + .72), GL[1]); }); });
    met(box(X - .03, 0, 1.1, X + .05, 2.2, 2.3), FR); gls(box(X + .045, .5, 1.2, X + .06, 2.1, 2.2), GL[2]); con(box(X, 2.34, .8, X + 1.0, 2.46, 2.6, .02), TRIM); P.add('snw', box(X + .02, 2.44, .84, X + .96, 2.56, 2.56, .05));
    [-2.6, -1.3, 0].forEach(z => { mat(box(-X - .82, .12, z - .45, -X - .1, .9, z + .45, .03), 0xd4d8da); mat(xf(new THREE.CylinderGeometry(.27, .27, .02, 18), {rz:Math.PI / 2, x:-X - .825, y:.52, z}), 0x30363b);
      mat(box(-X - .75, 0, z - .4, -X - .15, .12, z + .4), 0x8a9093); P.add('snw', box(-X - .8, .88, z - .43, -X - .12, .98, z + .43, .04)); });
    // 옥상: 난간벽, 바닥, 옥탑, 노란 물탱크
    [[-X, -Z, X, -Z + .22], [-X, Z - .22, X, Z + .12], [-X, -Z + .22, -X + .22, Z - .22], [X - .22, -Z + .22, X, Z - .22]].forEach(r => { con(box(r[0], Y2, r[1], r[2], Y2 + .6, r[3]), WALL); con(box(r[0] - .04, Y2 + .6, r[1] - .04, r[2] + .04, Y2 + .68, r[3] + .04, .015), TRIM); });
    con(box(-X + .22, Y2, -Z + .22, X - .22, Y2 + .06, Z - .22), 0x8f9698); P.add('snw', box(-X + .26, Y2 + .04, -Z + .26, X - .26, Y2 + .22, Z - .26, .06));
    [[-X, X, -Z + .1], [-X, X, Z - .06]].forEach(([a, b, z]) => P.add('snw', ridge(Array.from({length:15}, (_, i) => V(a + (b - a) * i / 14, Y2 + .68, z)), .26, .08)));
    [-X + .1, X - .1].forEach(x => P.add('snw', ridge(Array.from({length:9}, (_, i) => V(x, Y2 + .68, -Z + .3 + (2 * Z - .6) * i / 8)), .24, .08)));
    con(box(4.6, Y2, -3.7, 8.2, Y2 + 2.5, -.7, .02), 0xc9c3b5); met(box(5.0, Y2 + .06, -.72, 5.9, Y2 + 2.05, -.66), 0x8f989e); P.add('snw', box(4.55, Y2 + 2.47, -3.75, 8.25, Y2 + 2.66, -.65, .07));
    mat(xf(lathe([[.95, 0], [.97, .04], [.97, .5], [.99, .53], [.97, .56], [.97, 1.0], [.99, 1.03], [.97, 1.06], [.97, 1.5], [.82, 1.7], [.25, 1.8], [.25, 1.86], [0, 1.86]], 20), {x:-6.2, y:Y2 + .55, z:-1.6}), 0xe6c34a);
    [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]].forEach(([dx, dz]) => met(box(-6.2 + dx - .05, Y2, -1.6 + dz - .05, -6.2 + dx + .05, Y2 + .56, -1.6 + dz + .05), 0x6b747b)); P.add('snw', xf(blob(.8, .16, .8, {seed:2, bump:.06}), {x:-6.2, y:Y2 + 2.28, z:-1.6}));
    // 테라스 난간: 가운데 4.2m는 계단 자리
    const TY = PH + 1.0, rail = (a, b) => { met(tube([a.clone().setY(TY), b.clone().setY(TY)], .026, {radial:8}), 0xd6dbdf); met(tube([a.clone().setY(PH + .55), b.clone().setY(PH + .55)], .015, {radial:6}), 0xd6dbdf);
      const n = Math.max(1, Math.round(a.distanceTo(b) / 1.4)); for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); met(tube([p.clone().setY(PH), p.clone().setY(TY)], .022, {radial:6}), 0xd6dbdf); } };
    const fz = Z + TD - .07; rail(V(-X + .07, 0, fz), V(-SB.gap, 0, fz)); rail(V(SB.gap, 0, fz), V(X - .07, 0, fz)); rail(V(-X + .07, 0, Z + .2), V(-X + .07, 0, fz)); rail(V(X - .07, 0, Z + .2), V(X - .07, 0, fz));
    [[-X + .7, Z + TD - .6, .5], [X - .8, Z + TD - .6, .45]].forEach(([x, z, r], i) => P.add('snw', xf(blob(r, r * .5, r * .8, {seed:i + 4, bump:.1}), {x, y:PH, z})));
    P.bake('con', (p, n) => (.78 + .22 * Math.min(1, p.y / .6)) * (n.y < -.5 ? .7 : 1));
    return assemble(P, [['con', concreteMaterial()], ['pav', paverMaterial(), false], ['gls', glassMaterial(), false], ['met', metalMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:48})]], [21.9, 10.5, 11.4]); }});

// ── 상가 앞 계단: 테라스(0.9m)로 오르는 다섯 단. 원점은 맨 윗단 끝(테라스 가장자리) 바닥, 내려가는 쪽이 +z ──
const ST = {rise:.9, run:1.6, n:5};
defineProp('shopStairs', {label:'상가 계단', category:'상가', isNewStyle:true, small:true,
  height:(x, z) => Math.abs(x) <= 1.85 * U && z >= 0 && z <= ST.run * U ? ST.rise * (1 - z / (ST.run * U)) * U : null,
  colliders:[[-2.2, 0, -1.85, 1.75], [1.85, 0, 2.2, 1.75]].map(r => ({r:r.map(v => v * U)})),
  usage:"W.place('shopStairs', {x: 300, z: 140 + 6.9 * UNIT, rot: 0});  // 폭 4m. 건물 테라스 끝(z +6.9m)에 붙인다", build(o = {}){
    const P = new Parts(), w = o.w || 4, hw = w / 2, T = ST.run / ST.n, RS = ST.rise / (ST.n + 1), con = (g, c) => P.add('con', g, c), met = (g, c) => P.add('met', g, c);
    for (let k = 0; k < ST.n; k++) { const y = ST.rise - (k + 1) * RS; con(box(-hw, 0, k * T, hw, y, (k + 1) * T + .015, .012), 0xb4b7b9); P.add('mat', box(-hw + .03, y, (k + 1) * T - .05, hw - .03, y + .006, (k + 1) * T - .01), 0x4b5158); }
    [-1, 1].forEach(s => { const x0 = s * hw, x1 = s * (hw + .2), a = Math.min(x0, x1), b = Math.max(x0, x1), top = z => ST.rise + .28 - (ST.rise - .1) * Math.min(1, Math.max(0, z / ST.run));
      con(loft([-.02, .3, .8, 1.3, ST.run, ST.run + .16].map(z => [V(a, -.02, z), V(b, -.02, z), V(b, top(z), z), V(a, top(z), z)])), 0xd2d6d8);
      const xr = s * (hw + .1), path = fillet([V(xr, top(0) - .02, .06), V(xr, top(0) + .62, .06), V(xr, top(ST.run) + .62, ST.run + .06), V(xr, top(ST.run) - .02, ST.run + .06)], .1, 4);
      met(tube(path, .024, {radial:8}), 0xd6dbdf); met(tube([V(xr, top(.8), .8), V(xr, top(.8) + .62, .8)], .014, {radial:6}), 0xd6dbdf);
      P.add('snw', ridge([.1, .5, .9, 1.3, ST.run].map(z => V(xr, top(z), z)), .18, .05)); });
    if (w >= 3) { met(tube(fillet([V(0, ST.rise - RS, .1), V(0, ST.rise - RS + .85, .1), V(0, .85, ST.run - .1), V(0, 0, ST.run - .1)], .1, 4), .024, {radial:8}), 0xd6dbdf); }
    P.add('pav', flatXZ(-hw, ST.run + .02, hw, ST.run + .5, .012), 0xf0c84a);                                             // 점자블록 자리 (노란 띠)
    P.add('snw', xf(blob(.6, .3, .45, {seed:3, bump:.1}), {x:hw + .75, z:1.3}));
    P.bake('con', groundAO(.25, .75));
    return assemble(P, [['con', concreteMaterial()], ['pav', paverMaterial(), false], ['met', metalMaterial()], ['mat', matteMaterial(), false], ['snw', snowMaterial({seed:48})]], [w + .4, 1.8, 1.8]); }});

// ── 간판 세 가지. 원점은 아래 가운데, 뒤(z = 0)가 벽에 붙는 면 ──
defineProp('signFascia', {label:'가로 간판', category:'상가', isNewStyle:true, small:true,
  variants:[{label:'동화마트', opts:{v:0}}, {label:'참새분식', opts:{v:1}}, {label:'새봄약국', opts:{v:3}}],
  usage:"W.place('signFascia', {x, z, y: 3.78 * UNIT, rot: 0, v: 0});  // 4m × 0.75m, v: 0~7 (가게 이름). 글자를 직접: {text, sub, bg, fg, accent, w, h}", build(o = {}){
    const i = (o.v || 0) % SHOPS.length, w = o.w || 4, h = o.h || .75, P = new Parts(), col = i % 2, row = i >> 1;
    P.add('mat', box(-w / 2, 0, 0, w / 2, h, .14, .02), 0x2d3238);
    [-w * .3, w * .3].forEach(x => { P.add('met', tube(fillet([V(x, h - .04, .03), V(x, h + .2, .03), V(x, h + .2, .4), V(x, h + .1, .43)], .08, 4), .012, {radial:6}), 0x3a4047); P.add('met', xf(lathe([[.07, 0], [.03, .09], [0, .095]], 10), {rx:.5, x, y:h + .02, z:.44}), 0x3a4047); });
    P.add('snw', ridge(Array.from({length:9}, (_, k) => V(-w / 2 + .1 + (w - .2) * k / 8, h, .07)), .13, .05));
    return assemble(P, [['mat', matteMaterial()], ['met', metalMaterial(), false], ['snw', snowMaterial({seed:48})]], [w, 1, .5], [o.text ? face(quadZ(-w / 2 + .03, .03, w / 2 - .03, h - .03, .1465), textSignMat(o, false, (w - .06) / (h - .06))) : face(quadZ(-w / 2 + .03, .03, w / 2 - .03, h - .03, .1465, cell(col * 512, row * 96, 512, 96)))]); }});
defineProp('signVertical', {label:'세로 돌출 간판', category:'상가', isNewStyle:true, small:true,
  variants:[{label:'은하피아노', opts:{v:0}}, {label:'으뜸태권도', opts:{v:1}}],
  usage:"W.place('signVertical', {x, z, y: 4.9 * UNIT, rot: 0, v: 0});  // 0.6m × 2.4m, 벽에서 0.76m 튀어나온다. v: 0~4. 글자를 직접: {text, bg, fg, len}", build(o = {}){
    const i = (o.v || 0) % VERT.length, P = new Parts(), uv = o.text ? [0, 0, 1, 1] : cell(1024 + i * 96, 0, 96, 384), x = .0915, L = o.len || 2.4;
    P.add('mat', box(-.09, 0, .14, .09, L, .76, .02), 0x2d3238);
    [.3, L - .3].forEach(y => { P.add('met', box(-.02, y - .02, 0, .02, y + .02, .15), 0x3a4047); P.add('met', box(-.08, y - .08, 0, .08, y + .08, .012), 0x3a4047); });
    P.add('snw', xf(blob(.1, .05, .32, {seed:2, bump:.06, seg:10}), {y:L - .01, z:.45}));
    const d = new Parts(); d.add('d', quad([x, .04, .73], [x, .04, .17], [x, L - .04, .17], [x, L - .04, .73], uv)); d.add('d', quad([-x, .04, .17], [-x, .04, .73], [-x, L - .04, .73], [-x, L - .04, .17], uv));
    return assemble(P, [['mat', matteMaterial()], ['met', metalMaterial(), false], ['snw', snowMaterial({seed:48})]], [.2, L + .05, .76], [face(d.geo('d'), o.text ? textSignMat(o, true, (L - .08) / .56) : null)]); }});
defineProp('signRoof', {label:'옥상 간판', category:'상가', isNewStyle:true, small:true,
  usage:"W.place('signRoof', {x, z, y: 7.86 * UNIT, rot: 0});  // 6.4m × 1.6m 판, 철골 다리 1.2m. 글자를 직접: {text, bg, fg}", build(o = {}){
    const P = new Parts(), ST_ = 0x6b747b, met = g => P.add('met', g, ST_);
    P.add('mat', box(-3.2, 1.2, -.1, 3.2, 2.8, .1, .02), 0x2d3238);
    [-2.8, -.95, .95, 2.8].forEach(x => { met(tube([V(x, 0, -.14), V(x, 2.75, -.14)], .035, {radial:6})); met(tube([V(x, 2.4, -.14), V(x, 0, -1.3)], .028, {radial:6})); met(tube([V(x, 0, -.14), V(x, 0, -1.3)], .028, {radial:6})); met(box(x - .1, 0, -1.4, x + .1, .03, -.04)); });
    [1.3, 2.6].forEach(y => met(tube([V(-3.1, y, -.14), V(3.1, y, -.14)], .025, {radial:6}))); met(tube([V(-2.8, 0, -1.3), V(2.8, 0, -1.3)], .025, {radial:6})); met(tube([V(-2.8, 1.25, -.14), V(-.95, 2.6, -.14)], .018, {radial:5})); met(tube([V(2.8, 1.25, -.14), V(.95, 2.6, -.14)], .018, {radial:5}));
    P.add('snw', ridge(Array.from({length:11}, (_, k) => V(-3.1 + 6.2 * k / 10, 2.8, 0)), .2, .08));
    return assemble(P, [['mat', matteMaterial()], ['met', metalMaterial()], ['snw', snowMaterial({seed:48})]], [6.4, 2.9, 1.5], [o.text ? face(quadZ(-3.15, 1.25, 3.15, 2.75, .1015), textSignMat(o, false, 6.3 / 1.5)) : face(quadZ(-3.15, 1.25, 3.15, 2.75, .1015, cell(0, 400, 1024, 256)))]); }});

// ── 조립 예시: 몸체 + 계단 + 가로 간판 5 + 세로 간판 3 + 옥상 간판. 맵에 놓을 때도 이 좌표대로 따로따로 놓으면 된다 ──
export const SHOP_LAYOUT = [
  ['shopBuilding', {}, 0, 0, 0], ['shopStairs', {}, 0, 0, SB.Z + SB.TD], ['shopStairs', {w:SB.PW * 2}, 0, 0, -SB.Z, Math.PI], ['signRoof', {}, 0, SB.Y2 + .06, 2.6],   // 여섯째 값은 돌리는 각도 (뒤 계단)
  ...SB.bays.map((c, i) => ['signFascia', {v:[0, 1, 3, 5, 2][i]}, c, 3.78, SB.Z + .06]).filter(e => e[2] !== 0),
  ...[[-6.3, 0], [2.1, 1], [6.3, 4]].map(([x, v]) => ['signVertical', {v}, x, 4.9, SB.Z + .12])];
defineProp('shopComplex', {label:'상가 (조립 예시)', category:'상가', isNewStyle:true, blocksCamera:true,
  usage:"SHOP_LAYOUT.forEach(([name, o, x, y, z, r]) => W.place(name, {...o, x: cx + x * UNIT, y: y * UNIT, z: cz + z * UNIT, rot: r || 0}));", build(){
    const g = new THREE.Group(); let draws = 0;
    SHOP_LAYOUT.forEach(([name, o, x, y, z, r]) => { const m = buildProp(name, o); m.position.set(x * U, y * U, z * U); m.rotation.y = r || 0; draws += m.userData.info.draws; g.add(m); });
    g.userData.info = {tris:triCount(g), draws, materials:7, sizeMeters:[21.9, 10.7, 13.1]}; return g; }});
