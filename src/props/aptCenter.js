// 아파트 단지 건물: 주민센터(2층), 경비실, 정문 문주.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, lathe, fillet, ridge, blob, xf, bakeAO, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, metalMaterial, concreteMaterial, paverMaterial, glassMaterial } from '../core/texkit.js';
import { assemble, quadZ, quad, prism } from './kit.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();

// ── 주민센터: 1층 붉은 벽돌, 2층 미색 벽, 평지붕. 정면(+z)에 캐노피 현관 ──
const centerTex = () => once('center', () => decalMaterial(canvasTex(1024, 256, (g, W, H) => { g.clearRect(0, 0, W, H);
  g.fillStyle = '#27496d'; g.fillRect(0, 0, 820, 130); g.fillStyle = '#f4f6f7'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '92px ' + FONT_D; g.fillText('동화 주민센터', 450, 70);
  g.strokeStyle = '#8fc0e8'; g.lineWidth = 8; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(92, 66); g.lineTo(92 + Math.cos(a) * 38, 66 + Math.sin(a) * 38); g.stroke(); }
  g.fillStyle = '#2f7d5b'; g.fillRect(830, 0, 96, 256); g.fillStyle = '#fff'; g.font = '58px ' + FONT_D; ['주', '민', '센', '터'].forEach((c, i) => g.fillText(c, 878, 36 + i * 62));
  g.fillStyle = '#e9e4d6'; g.fillRect(0, 140, 400, 116); g.fillStyle = '#34465c'; g.font = '800 30px ' + FONT_B; g.fillText('우리 동네 소식', 200, 164);
  [[14, 186, 110, 62, '#fbfbf6'], [138, 184, 120, 66, '#f3ecc4'], [272, 188, 112, 60, '#fdfdfb']].forEach(([x, y, w, h, c], k) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.fillStyle = k === 1 ? '#b8552f' : '#3f6fa8'; g.fillRect(x + 8, y + 8, w - 16, 8); g.fillStyle = '#9aa3ab'; for (let l = 0; l < 3; l++) g.fillRect(x + 8, y + 24 + l * 11, (w - 16) * (l === 2 ? .6 : 1), 4); });
  g.fillStyle = '#f4f6f7'; g.fillRect(420, 140, 400, 116); g.fillStyle = '#2f7d5b'; g.font = '44px ' + FONT_D; g.fillText('경로당 · 작은도서관', 620, 198); }), {alpha:true, rough:.7}));
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
    P.add('mat', box(-3.22, 3.52, Z + .0, 3.22, 4.14, Z + .07, .01), 0x1f3b59);
    P.add('mat', box(-6.9, .5, Z + 1.55, -4.3, 1.75, Z + 1.63, .01), 0x6f5b46); [-6.75, -4.45].forEach(x => P.add('mat', box(x - .05, 0, Z + 1.55, x + .05, 1.95, Z + 1.63), 0x5d4c3b)); P.add('mat', box(-7.0, 1.93, Z + 1.45, -4.2, 1.99, Z + 1.75), 0x5d4c3b);
    P.add('snw', ridge(Array.from({length:7}, (_, i) => V(-6.95 + i * .45, 1.99, Z + 1.6)), .28, .07));
    [[-X - .5, -1.0], [-X - .5, .4]].forEach(([x, z]) => { P.add('mat', box(x - .38, .12, z - .45, x + .38, .92, z + .45, .03), 0xd4d8da); P.add('mat', xf(new THREE.CylinderGeometry(.28, .28, .02, 20), {rz:Math.PI / 2, x:x - .385, y:.52, z}), 0x30363b); P.add('mat', box(x - .3, 0, z - .4, x + .3, .12, z + .4), 0x8a9093);
      P.add('snw', box(x - .36, .9, z - .43, x + .36, 1.0, z + .43, .04)); });
    [[-X - .06, Z - .3], [X + .06, Z - .3], [-X - .06, -Z + .3], [X + .06, -Z + .3]].forEach(([x, z]) => met(tube([V(x, .1, z), V(x, H + .1, z)], .045, {radial:8}), 0x9aa3a8));
    [-2.9, 2.9].forEach(x => { P.add('mat', box(x - .07, 2.3, Z + .0, x + .07, 2.56, Z + .12, .02), 0x30363b); gls(box(x - .05, 2.32, Z + .12, x + .05, 2.54, Z + .135), 0xfff0cc); });
    bakeAO(P.geo('con'), (p, n) => (.74 + .26 * Math.min(1, p.y / .5)) * (n.y < -.5 ? .7 : 1)); bakeAO(P.geo('brk'), p => .78 + .22 * Math.min(1, p.y / .6));
    const d = new Parts(); d.add('d', quadZ(-3.15, 3.56, 3.15, 4.1, Z + .075, [0, 1 - 130 / 256, 820 / 1024, 1]));
    d.add('d', quadZ(-6.85, .55, -4.35, 1.7, Z + 1.635, [0, 0, 400 / 1024, 116 / 256]));
    return assemble(P, [['brk', paverMaterial()], ['con', concreteMaterial()], ['gls', glassMaterial(), false], ['met', metalMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:46})]], [15.9, 9.3, 11.4], [new THREE.Mesh(d.geo('d'), centerTex())]); }});

// ── 정문 문주: 돌 기둥 둘, 한쪽에 단지 이름 벽, 차단기 ──
const gateTex = () => once('gate', () => decalMaterial(canvasTex(1024, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#2b3a4a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '150px ' + FONT_D; g.fillText('동화아파트', 560, 120);
  g.strokeStyle = '#3f6fa8'; g.lineWidth = 14; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(110, 118); g.lineTo(110 + Math.cos(a) * 70, 118 + Math.sin(a) * 70); g.stroke(); }
  g.fillStyle = '#5f6b75'; g.font = '800 36px ' + FONT_B; g.fillText('DONGHWA APARTMENT', 560, 222); }), {alpha:true, rough:.6}));
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

// ── 경비실: 주민센터와 같은 붉은 벽돌·콘크리트 띠·짙은 알루미늄 창틀. 정면(+z)이 박공면이고 민원 창구와 유리문이 있다 ──
const guardTex = () => once('guard', () => decalMaterial(canvasTex(512, 256, g => { g.clearRect(0, 0, 512, 256);
  g.fillStyle = '#efece2'; g.fillRect(0, 0, 512, 150); g.strokeStyle = '#8f8a7c'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 144);
  g.fillStyle = '#2b3138'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '104px ' + FONT_D; g.fillText('경 비 실', 256, 80);
  g.fillStyle = '#fbfbf7'; g.beginPath(); g.arc(53, 203, 50, 0, 7); g.fill(); g.strokeStyle = '#30363b';
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineWidth = i % 3 ? 2 : 5; g.beginPath(); g.moveTo(53 + Math.sin(a) * 39, 203 - Math.cos(a) * 39); g.lineTo(53 + Math.sin(a) * 46, 203 - Math.cos(a) * 46); g.stroke(); }
  g.lineCap = 'round'; g.lineWidth = 6; g.beginPath(); g.moveTo(53, 203); g.lineTo(53 + Math.sin(5.4) * 24, 203 - Math.cos(5.4) * 24); g.stroke();
  g.lineWidth = 3.5; g.beginPath(); g.moveTo(53, 203); g.lineTo(53 + Math.sin(.7) * 36, 203 - Math.cos(.7) * 36); g.stroke(); }), {alpha:true, rough:.7}));
defineProp('guardHouse', {label:'경비실', category:'건물', isNewStyle:true, blocksCamera:true, colliders:[{r:[-2.65 * U, -2.05 * U, 2.65 * U, 2.4 * U]}], minimap:'#c9b7a5', mmSize:3,
  usage:"W.place('guardHouse', {x: 181, z: 131, rot: -Math.PI / 2});  // 5.2m × 4m, 정면 +z", build(){
    const P = new Parts(), X = 2.6, Z = 2.0, WH = 2.7, PK = 3.5, SL = (PK - WH) / X, con = (g, c) => P.add('con', g, c), met = (g, c) => P.add('met', g, c), gls = (g, c) => P.add('gls', g, c), mat = (g, c) => P.add('mat', g, c);
    const BR = 0xd0a892, FR = 0x4f5964, GL = 0x33475b, ROOF = 0x8c4a3e, yR = x => PK - Math.abs(x) * SL;
    P.add('brk', box(-X, 0, -Z, X, WH, Z), BR); P.add('brk', prism([[-X, WH], [X, WH], [0, PK]], -Z, Z), BR);
    con(box(-X - .04, 0, -Z - .04, X + .04, .3, Z + .04, .015), 0x9fa4a7);
    // 지붕: 낮은 박공, 처마 45cm. 박공 끝에는 흰 널, 처마에는 홈통
    const E = X + .5, chev = (lo, hi) => [[-E, yR(E) + lo], [0, PK + lo], [E, yR(E) + lo], [E, yR(E) + hi], [0, PK + hi], [-E, yR(E) + hi]];
    mat(prism(chev(.02, .14), -Z - .45, Z + .6), ROOF); mat(tube([V(0, PK + .15, -Z - .47), V(0, PK + .15, Z + .62)], .05, {radial:8}), 0x74392f);
    [-Z - .47, Z + .57].forEach(z => con(prism(chev(-.04, .17), z, z + .06), 0xe9ebe8));
    P.add('snw', prism(chev(.14, .29).map(([x, y]) => [x * .97, y]), -Z - .38, Z + .52, .05));
    [-1, 1].forEach(s => { met(tube([V(s * (E + .03), yR(E) + .0, -Z - .42), V(s * (E + .03), yR(E) + .0, Z + .56)], .05, {radial:8}), 0x9aa3a8);
      met(tube(fillet([V(s * (E + .03), yR(E) - .04, Z + .3), V(s * (E + .03), yR(E) - .3, Z + .3), V(s * (X + .07), 2.2, Z + .07), V(s * (X + .07), .12, Z + .07)], .1, 4), .035, {radial:8}), 0x9aa3a8); });
    // 정면 창구: 큰 창, 민원 선반, 아래 벽돌 턱
    met(box(-2.16, .99, Z - .02, .46, 2.26, Z + .05), FR); gls(box(-2.1, 1.05, Z + .04, .4, 2.2, Z + .058), GL);
    [[-1.3, 1.05, -1.24, 2.2], [-.46, 1.05, -.4, 2.2], [-.4, 1.52, .4, 1.58]].forEach(([a, b, c, d]) => met(box(a, b, Z + .05, c, d, Z + .075), FR));
    P.add('brk', box(-2.25, .3, Z, .55, .93, Z + .2), 0xc49a84); con(box(-2.3, .93, Z, .6, 1.01, Z + .36, .012), 0xdcdfe0);
    // 유리문과 디딤돌
    met(box(.74, .1, Z - .02, 1.81, 2.26, Z + .05), FR); gls(box(.82, .52, Z + .04, 1.73, 2.14, Z + .058), 0x3b5067); met(box(.82, .16, Z + .04, 1.73, .5, Z + .062), 0xd6dbdf);
    met(tube([V(.95, 1.0, Z + .1), V(.95, 1.45, Z + .1)], .014, {radial:8}), 0xd6dbdf); con(box(.55, 0, Z, 2.0, .1, Z + .75, .012), 0xb1b5b8); mat(box(.8, .1, Z + .1, 1.75, .115, Z + .6, .005), 0x39453f);
    // 차양
    mat(box(-2.4, 2.34, Z, 2.05, 2.46, Z + .9, .02), 0x9a5a48); [-2.2, -.2, 1.85].forEach(x => mat(prism([[0, 2.34], [.7, 2.34], [0, 2.02]], x - .03, x + .03).rotateY(-Math.PI / 2).translate(0, 0, Z), 0x7d463a));
    P.add('snw', box(-2.36, 2.44, Z + .02, 2.01, 2.56, Z + .86, .05));
    // 옆 창 (+x), 실외기 (-x)
    met(box(X - .02, 1.0, -1.16, X + .05, 2.16, .56), FR); gls(box(X + .04, 1.06, -1.1, X + .058, 2.1, .5), GL); met(box(X + .05, 1.06, -.33, X + .075, 2.1, -.27), FR); con(box(X, .9, -1.26, X + .12, .98, .66, .01), 0xdcdfe0);
    mat(box(-X - .82, .12, -.9, -X - .1, .86, 0, .03), 0xd4d8da); mat(xf(new THREE.CylinderGeometry(.26, .26, .02, 18), {rz:Math.PI / 2, x:-X - .825, y:.5, z:-.45}), 0x30363b); mat(box(-X - .75, 0, -.85, -X - .15, .12, -.05), 0x8a9093);
    P.add('snw', box(-X - .8, .84, -.88, -X - .12, .94, -.02, .04));
    // 간판, 시계, 빨간 함, 소화기, 문 위 등
    mat(box(-.86, 2.6, Z, .86, 3.12, Z + .05, .01), 0x8f8a7c); mat(xf(new THREE.CylinderGeometry(.2, .2, .05, 24), {rx:Math.PI / 2, x:2.22, y:1.95, z:Z + .025}), 0x30363b);
    mat(box(2.03, 1.05, Z, 2.42, 1.48, Z + .15, .02), 0xc9392f); mat(box(2.08, 1.36, Z + .15, 2.37, 1.4, Z + .156), 0x7a1f1a);
    mat(xf(lathe([[0, 0], [.065, 0], [.07, .02], [.07, .36], [.05, .42], [.02, .44], [.02, .5], [0, .5]], 12), {x:2.25, z:Z + .32}), 0xc9392f);
    mat(box(1.2, 2.28, Z + .9, 1.36, 2.33, Z + .78), 0xfff0cc);
    // 플라스틱 의자, 눈삽, 옥상 안테나
    const cx = -1.4, cz = Z + 1.15; [[-.19, -.18], [.19, -.18], [-.2, .2], [.2, .2]].forEach(([dx, dz]) => mat(tube([V(cx + dx * 1.1, 0, cz + dz * 1.1), V(cx + dx, .43, cz + dz)], .017, {radial:6}), 0xe9ebe8));
    mat(box(cx - .23, .42, cz - .22, cx + .23, .46, cz + .23, .018), 0xe9ebe8); mat(xf(box(-.23, 0, -.016, .23, .4, .016, .014), {rx:-.16, x:cx, y:.46, z:cz - .21}), 0xe9ebe8);
    mat(tube([V(-2.45, 0, Z + .32), V(-2.47, 1.25, Z + .08)], .016, {radial:6}), 0xb58e5c); mat(xf(box(-.2, 0, -.012, .2, .34, .012, .01), {rx:-.2, x:-2.45, z:Z + .34}), 0xd0312a);
    met(tube([V(1.6, yR(1.6) + .1, -1.2), V(1.6, yR(1.6) + 1.5, -1.2)], .014, {radial:6}), 0x9aa3a8); [1.1, 1.35].forEach(h => met(tube([V(1.25, yR(1.6) + h, -1.2), V(1.95, yR(1.6) + h, -1.2)], .009, {radial:5}), 0x9aa3a8));
    P.add('snw', xf(blob(.7, .28, .5, {seed:4, bump:.1}), {x:-3.2, z:Z + .5})); P.add('snw', ridge([V(-2.2, 1.01, Z + .2), V(-.8, 1.01, Z + .2), V(.5, 1.01, Z + .2)], .26, .05));
    P.bake('brk', p => .78 + .22 * Math.min(1, p.y / .6)); P.bake('con', p => .78 + .22 * Math.min(1, p.y / .4)); P.bake('mat', (p, n) => n.y < -.5 ? .7 : 1);
    const d = new Parts(); d.add('d', quadZ(-.83, 2.63, .83, 3.09, Z + .056, [0, 1 - 150 / 256, 1, 1])); d.add('d', quadZ(2.22 - .175, 1.95 - .175, 2.22 + .175, 1.95 + .175, Z + .052, [3 / 512, 3 / 256, 103 / 512, 103 / 256]));
    return assemble(P, [['brk', paverMaterial()], ['con', concreteMaterial()], ['gls', glassMaterial(), false], ['met', metalMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:46})]], [6.3, 3.7, 5.1], [new THREE.Mesh(d.geo('d'), guardTex())]); }});
