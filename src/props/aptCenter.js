// 아파트 단지 건물: 주민센터(2층), 정문 문주.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, lathe, fillet, ridge, blob, xf, bakeAO, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, metalMaterial, concreteMaterial, paverMaterial, glassMaterial } from '../core/texkit.js';
import { assemble, quadZ, quad } from './kit.js';
import { UNIT, FONT_D } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();

// ── 주민센터: 1층 붉은 벽돌, 2층 미색 벽, 평지붕. 정면(+z)에 캐노피 현관 ──
const centerTex = () => once('center', () => decalMaterial(canvasTex(1024, 256, (g, W, H) => { g.clearRect(0, 0, W, H);
  g.fillStyle = '#27496d'; g.fillRect(0, 0, 820, 130); g.fillStyle = '#f4f6f7'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 92px ' + FONT_D; g.fillText('동화 주민센터', 450, 70);
  g.strokeStyle = '#8fc0e8'; g.lineWidth = 8; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(92, 66); g.lineTo(92 + Math.cos(a) * 38, 66 + Math.sin(a) * 38); g.stroke(); }
  g.fillStyle = '#2f7d5b'; g.fillRect(830, 0, 96, 256); g.fillStyle = '#fff'; g.font = '700 58px ' + FONT_D; ['주', '민', '센', '터'].forEach((c, i) => g.fillText(c, 878, 36 + i * 62));
  g.fillStyle = '#e9e4d6'; g.fillRect(0, 140, 400, 116); g.fillStyle = '#34465c'; g.font = '700 30px ' + FONT_D; g.fillText('우리 동네 소식', 200, 164);
  [[14, 186, 110, 62, '#fbfbf6'], [138, 184, 120, 66, '#f3ecc4'], [272, 188, 112, 60, '#fdfdfb']].forEach(([x, y, w, h, c], k) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.fillStyle = k === 1 ? '#b8552f' : '#3f6fa8'; g.fillRect(x + 8, y + 8, w - 16, 8); g.fillStyle = '#9aa3ab'; for (let l = 0; l < 3; l++) g.fillRect(x + 8, y + 24 + l * 11, (w - 16) * (l === 2 ? .6 : 1), 4); });
  g.fillStyle = '#f4f6f7'; g.fillRect(420, 140, 400, 116); g.fillStyle = '#2f7d5b'; g.font = '700 44px ' + FONT_D; g.fillText('경로당 · 작은도서관', 620, 198); }), {alpha:true, rough:.7}));
defineProp('communityCenter', {label:'주민센터', category:'건물', isNewStyle:true, blocksCamera:true, colliders:[{r:[-7.5 * U, -4.5 * U, 7.5 * U, 4.5 * U]}, {r:[-2.3 * U, 4.5 * U, 2.3 * U, 6.6 * U]}, {c:[-5.6 * U, 6.2 * U, .5 * U]}],
  minimap:'#c9b7a5', mmSize:7, usage:"W.place('communityCenter', {x: 150, z: 110, rot: 0});  // 15m × 9m, 정면 +z", build(){
    const P = new Parts(), X = 7.5, Z = 4.5, F1 = 3.4, H = 6.8, con = (g, c) => P.add('con', g, c), met = (g, c) => P.add('met', g, c), gls = (g, c) => P.add('gls', g, c);
    P.add('brk', box(-X, 0, -Z, X, F1, Z), 0xd0a892); con(box(-X, F1, -Z, X, H, Z), 0xcfc9ba); con(box(-X - .05, F1 - .1, -Z - .05, X + .05, F1 + .16, Z + .05, .02), 0xdcdfe0); con(box(-X - .04, 0, -Z - .04, X + .04, .35, Z + .04, .015), 0x9fa4a7);
    [[-X - .06, -Z - .06, X + .06, -Z + .16], [-X - .06, Z - .16, X + .06, Z + .06], [-X - .06, -Z + .16, -X + .16, Z - .16], [X - .16, -Z + .16, X + .06, Z - .16]].forEach(r => con(box(r[0], H, r[1], r[2], H + .55, r[3], .02), 0xd9dcdc));
    con(box(-X + .16, H, -Z + .16, X - .16, H + .08, Z - .16), 0x8f9698); P.add('snw', box(-X + .18, H + .04, -Z + .18, X - .18, H + .24, Z - .18, .06));
    [[-X, -Z + .05, X, -Z + .05], [-X, Z - .05, X, Z - .05]].forEach(([a, z, b]) => P.add('snw', ridge(Array.from({length:13}, (_, i) => V(a + (b - a) * i / 12, H + .55, z)), .2, .07)));
    [-X + .05, X - .05].forEach(x => P.add('snw', ridge(Array.from({length:9}, (_, i) => V(x, H + .55, -Z + .2 + (2 * Z - .4) * i / 8)), .2, .07)));
    con(box(-1.6, H + .55, -2.6, 1.6, H + 2.3, -.4, .02), 0xc9c3b5); P.add('snw', box(-1.66, H + 2.27, -2.66, 1.66, H + 2.45, -.34, .06));                              // 옥탑
    // 창: 틀(짙은 알루미늄) + 유리 + 가운데 살 + 창대. face: 0 앞, 1 뒤, 2 왼쪽, 3 오른쪽
    const win = (face, c, y, w, h) => { const d = .05, f = (x0, y0, x1, y1, z0, z1, k, col) => { const g = face < 2 ? box(x0, y0, (face ? -1 : 1) * (Z + z0), x1, y1, (face ? -1 : 1) * (Z + z1)) : box((face === 2 ? -1 : 1) * (X + z0), y0, x0, (face === 2 ? -1 : 1) * (X + z1), y1, x1); P.add(k, g, col); };
      f(c - w / 2 - .06, y - .06, c + w / 2 + .06, y + h + .06, -.02, d, 'met', 0x4f5964); f(c - w / 2, y, c + w / 2, y + h, d - .01, d + .012, 'gls', [0x2f4257, 0x3a5068, 0x29394b][Math.abs(Math.round(c * 7 + y)) % 3]);
      f(c - .025, y, c + .025, y + h, d, d + .03, 'met', 0x4f5964); f(c - w / 2, y + h * .68, c + w / 2, y + h * .68 + .04, d, d + .03, 'met', 0x4f5964); f(c - w / 2 - .12, y - .14, c + w / 2 + .12, y - .06, -.02, .12, 'con', 0xdcdfe0); };
    [-5.9, -3.7, 3.7, 5.9].forEach(c => win(0, c, 1.0, 1.7, 1.75)); [-6, -3, 0, 3, 6].forEach(c => { win(0, c, 4.3, 1.9, 1.65); win(1, c, 4.3, 1.9, 1.65); win(1, c, 1.0, 1.9, 1.75); });
    [-2.4, 2.4].forEach(c => [1.0, 4.3].forEach(y => { win(2, c, y, 1.8, 1.7); win(3, c, y, 1.8, 1.7); }));
    // 현관: 낮은 단, 유리문, 캐노피와 기둥, 손잡이 난간
    con(box(-2.2, 0, Z, 2.2, .3, Z + 2.0, .015), 0xb1b5b8); con(box(-1.5, 0, Z + 2.0, 1.5, .15, Z + 2.32, .012), 0xbcc0c2); P.add('brk', box(-2.16, .3, Z + .0, 2.16, .306, Z + 1.98), 0xffffff);
    met(box(-1.56, .3, Z - .02, 1.56, 2.72, Z + .06), 0x4f5964); [-1, 1].forEach(s => { gls(box(Math.min(s * .03, s * 1.48), .42, Z + .05, Math.max(s * .03, s * 1.48), 2.2, Z + .07), 0x33475b); met(tube([V(s * .16, 1.15, Z + .13), V(s * .16, 1.75, Z + .13)], .016, {radial:8}), 0xd6dbdf);
      met(box(Math.min(s * .03, s * 1.48), .3, Z + .05, Math.max(s * .03, s * 1.48), .42, Z + .075), 0xd6dbdf); con(xf(lathe([[.13, 0], [.13, .08], [.1, .12], [.1, 2.5], [.13, 2.56], [.13, 2.62]], 14), {x:s * 1.95, y:.3, z:Z + 1.75}), 0xdfe2e2);
      met(tube(fillet([V(s * 2.14, .3, Z + .1), V(s * 2.14, 1.2, Z + .1), V(s * 2.14, 1.2, Z + 1.9), V(s * 2.14, .3, Z + 1.9)], .1, 4), .02, {radial:8}), 0xd6dbdf); });
    gls(box(-1.48, 2.26, Z + .05, 1.48, 2.66, Z + .07), 0x33475b); met(box(-1.56, 2.2, Z + .04, 1.56, 2.26, Z + .085), 0x4f5964);
    con(box(-2.5, 2.92, Z - .02, 2.5, 3.2, Z + 2.15, .03), 0xdfe2e2); con(box(-2.52, 2.9, Z + 2.13, 2.52, 3.0, Z + 2.17), 0x27496d); P.add('snw', box(-2.44, 3.17, Z + .0, 2.44, 3.34, Z + 2.1, .07));
    P.add('mat', box(-.9, .306, Z + .2, .9, .32, Z + .8, .006), 0x39453f);
    // 간판 받침, 세로 간판, 게시판, 실외기, 홈통, 벽등
    P.add('mat', box(-3.22, 3.52, Z + .0, 3.22, 4.14, Z + .07, .01), 0x1f3b59); P.add('mat', box(X - .9, 3.9, Z + .0, X - .42, 6.5, Z + .1, .01), 0x256649);
    P.add('mat', box(-6.9, .5, Z + 1.55, -4.3, 1.75, Z + 1.63, .01), 0x6f5b46); [-6.75, -4.45].forEach(x => P.add('mat', box(x - .05, 0, Z + 1.55, x + .05, 1.95, Z + 1.63), 0x5d4c3b)); P.add('mat', box(-7.0, 1.93, Z + 1.45, -4.2, 1.99, Z + 1.75), 0x5d4c3b);
    P.add('snw', ridge(Array.from({length:7}, (_, i) => V(-6.95 + i * .45, 1.99, Z + 1.6)), .28, .07));
    [[-X - .5, -1.0], [-X - .5, .4]].forEach(([x, z]) => { P.add('mat', box(x - .38, .12, z - .45, x + .38, .92, z + .45, .03), 0xd4d8da); P.add('mat', xf(new THREE.CylinderGeometry(.28, .28, .02, 20), {rz:Math.PI / 2, x:x - .385, y:.52, z}), 0x30363b); P.add('mat', box(x - .3, 0, z - .4, x + .3, .12, z + .4), 0x8a9093);
      P.add('snw', box(x - .36, .9, z - .43, x + .36, 1.0, z + .43, .04)); });
    [[-X - .06, Z - .3], [X + .06, Z - .3], [-X - .06, -Z + .3], [X + .06, -Z + .3]].forEach(([x, z]) => met(tube([V(x, .1, z), V(x, H + .1, z)], .045, {radial:8}), 0x9aa3a8));
    [-2.9, 2.9].forEach(x => { P.add('mat', box(x - .07, 2.3, Z + .0, x + .07, 2.56, Z + .12, .02), 0x30363b); gls(box(x - .05, 2.32, Z + .12, x + .05, 2.54, Z + .135), 0xfff0cc); });
    bakeAO(P.geo('con'), (p, n) => (.74 + .26 * Math.min(1, p.y / .5)) * (n.y < -.5 ? .7 : 1)); bakeAO(P.geo('brk'), p => .78 + .22 * Math.min(1, p.y / .6));
    const d = new Parts(); d.add('d', quadZ(-3.15, 3.56, 3.15, 4.1, Z + .075, [0, 1 - 130 / 256, 820 / 1024, 1])); d.add('d', quadZ(X - .88, 3.95, X - .44, 6.45, Z + .105, [830 / 1024, 0, 926 / 1024, 1]));
    d.add('d', quadZ(-6.85, .55, -4.35, 1.7, Z + 1.635, [0, 0, 400 / 1024, 116 / 256])); d.add('d', quadZ(3.0, 2.0, 5.2, 2.64, Z + .012, [420 / 1024, 0, 820 / 1024, 116 / 256]));
    return assemble(P, [['brk', paverMaterial()], ['con', concreteMaterial()], ['gls', glassMaterial(), false], ['met', metalMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:46})]], [15.9, 9.3, 11.4], [new THREE.Mesh(d.geo('d'), centerTex())]); }});

// ── 정문 문주: 돌 기둥 둘, 한쪽에 단지 이름 벽, 차단기 ──
const gateTex = () => once('gate', () => decalMaterial(canvasTex(1024, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#2b3a4a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 150px ' + FONT_D; g.fillText('동화아파트', 560, 120);
  g.strokeStyle = '#3f6fa8'; g.lineWidth = 14; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(110, 118); g.lineTo(110 + Math.cos(a) * 70, 118 + Math.sin(a) * 70); g.stroke(); }
  g.fillStyle = '#5f6b75'; g.font = '700 36px ' + FONT_D; g.fillText('DONGHWA APARTMENT', 560, 222); }), {alpha:true, rough:.6}));
defineProp('aptGate', {label:'단지 정문 문주', category:'경계', isNewStyle:true, usage:"W.place('aptGate', {x: 186, z: 137.5, rot: Math.PI / 2});  // 기둥 사이 7.6m, 이름 벽은 -x 쪽",
  colliders:[{r:[-4.5 * U, -.5 * U, -3.6 * U, .5 * U]}, {r:[3.6 * U, -.5 * U, 4.5 * U, .5 * U]}, {r:[-9.6 * U, -.3 * U, -4.5 * U, .3 * U]}, {c:[3.2 * U, 1.2 * U, .3 * U]}], build(){
    const P = new Parts(), con = (g, c) => P.add('con', g, c);
    [-4.05, 4.05].forEach(x => { con(box(x - .45, 0, -.45, x + .45, 3.3, .45, .03), 0xb9b4a8); con(box(x - .52, 0, -.52, x + .52, .4, .52, .02), 0x8f9193); con(box(x - .55, 3.3, -.55, x + .55, 3.48, .55, .03), 0xd4d7d8);
      [.9, 1.7, 2.5].forEach(y => con(box(x - .46, y, -.46, x + .46, y + .03, .46), 0x9d988d)); P.add('mat', lathe([[.1, 3.48], [.2, 3.56], [.22, 3.8], [.12, 3.9], [0, 3.92]].map(([r, y]) => [r, y]), 14).translate(x, 0, 0), 0xfff3d2);
      P.add('snw', xf(blob(.5, .14, .5, {seed:3, bump:.06}), {x, y:3.46})); P.add('snw', xf(blob(.2, .07, .2, {seed:5, bump:.05, seg:10}), {x, y:3.9})); });
    con(box(-9.6, 0, -.22, -4.5, 1.9, .22, .03), 0xc9c4b8); con(box(-9.66, 0, -.28, -4.5, .35, .28, .02), 0x8f9193); con(box(-9.66, 1.9, -.28, -4.5, 2.04, .28, .03), 0xd4d7d8);
    P.add('snw', ridge(Array.from({length:11}, (_, i) => V(-9.55 + i * .5, 2.04, 0)), .5, .13));
    // 차단기
    P.add('mat', box(2.95, 0, .95, 3.45, 1.05, 1.45, .03), 0xe8a020); P.add('mat', box(2.9, 1.05, .9, 3.5, 1.1, 1.5, .02), 0x30363b); P.add('snw', box(2.92, 1.09, .92, 3.48, 1.17, 1.48, .035));
    for (let i = 0; i < 8; i++) P.add('mat', box(2.9 - (i + 1) * .7, .88, 1.16, 2.9 - i * .7, .98, 1.22), i % 2 ? 0xf2f2ee : 0xd0312a);
    bakeAO(P.geo('con'), (p, n) => .76 + .24 * Math.min(1, p.y / .5));
    const d = new Parts(); d.add('d', quadZ(-9.4, .55, -4.7, 1.72, .225)); d.add('d', quadZ(-9.4, .55, -4.7, 1.72, -.225, undefined, true));
    return assemble(P, [['con', concreteMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:47})]], [14.2, 3.95, 1.6], [new THREE.Mesh(d.geo('d'), gateTex())]); }});
