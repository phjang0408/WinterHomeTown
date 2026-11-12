// 아파트 단지 소품 1: 주차 턱, 과속방지턱, 주차금지 표지판, 장애인 전용구역, 음식물 쓰레기통, 주차장 화단, 겨울 나무, 방음벽, 단지 가로등.
// 모두 미터 단위로 만들고 UNIT을 곱한다. 원점은 바닥 중심, 정면은 +z.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, loft, tube, lathe, extrudeProfile, ridge, blob, xf, bakeAO, groundAO, roundedRect, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, barkMaterial, clearMaterial, plasticMaterial, metalMaterial } from '../core/texkit.js';
import { assemble, quadZ, quadY, mulberry } from './kit.js';
import { UNIT, FONT_D } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();
const ao = (g, fade = .2, floor = .7) => bakeAO(g, groundAO(fade, floor));

// ── 주차 턱 (카스토퍼): 검정·노랑 고무 ──
defineProp('wheelStop', {label:'주차 턱', category:'주차장', isNewStyle:true, usage:"W.placeMany('wheelStop', [{x: 60, z: 150, rot: 0}, ...]);", build(o = {}){
  const P = new Parts(), L = o.len || 1.7, n = 7, seg = L / n, sh = new THREE.Shape([[-.08, 0], [.08, 0], [.06, .085], [.042, .1], [-.042, .1], [-.06, .085]].map(p => new THREE.Vector2(p[0], p[1])));
  for (let i = 0; i < n; i++) P.add('mat', xf(extrudeProfile(sh, seg - .012, {bevel:.005, bevelSegments:2}), {x:-L / 2 + seg * (i + .5)}), i % 2 ? 0xe2b21e : 0x1e2124);
  [-L * .32, L * .32].forEach(x => P.add('mat', xf(new THREE.CylinderGeometry(.02, .02, .008, 10), {x, y:.108}), 0x8d949a));
  return assemble(P, [['mat', matteMaterial()]], [L, .11, .16]); }});

// ── 과속방지턱: 노랑·검정 고무 블록을 이어 붙인 것 ──
defineProp('speedBump', {label:'과속방지턱', category:'도로', isNewStyle:true, usage:"W.place('speedBump', {x: 120, z: 137, rot: Math.PI / 2, len: 6});", build(o = {}){
  const P = new Parts(), L = o.len || 6, n = Math.round(L / .5), seg = L / n, pr = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; pr.push(new THREE.Vector2(Math.cos(a) * .22, Math.sin(a) * .055)); }
  const sh = new THREE.Shape(pr);
  for (let i = 0; i < n; i++) { const x = -L / 2 + seg * (i + .5), y = i % 2 === 0; P.add('mat', xf(extrudeProfile(sh, seg - .01, {bevel:.004, bevelSegments:1}), {x}), y ? 0xe5b520 : 0x202326);
    if (!y) [-.09, .09].forEach(z => P.add('mat', box(x - .09, .04, z - .03, x + .09, .058 - Math.abs(z) * .1, z + .03), 0xe9ecee)); }
  [-1, 1].forEach(s => P.add('mat', xf(blob(.16, .055, .22, {seed:3, bump:0, seg:10}), {x:s * (L / 2 + .02)}), 0x202326));
  return assemble(P, [['mat', matteMaterial()]], [L, .06, .44]); }});

// ── 주차금지 표지판: 주황 고깔 받침 + 둥근 머리판 ──
const noParkTex = () => once('nopark', () => decalMaterial(canvasTex(256, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#fbfbf8'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = '#d0312a'; g.lineWidth = 24; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke(); g.fillStyle = '#1c1f23'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 66px ' + FONT_D; g.fillText('주차', 128, 96); g.fillText('금지', 128, 164); }), {alpha:true, rough:.6}));
defineProp('noParkingSign', {label:'주차금지 표지판', category:'주차장', isNewStyle:true, colliders:[{c:[0, 0, .2 * U]}], build(){
  const P = new Parts(), Y = .98;
  P.add('mat', box(-.19, 0, -.19, .19, .035, .19, .014), 0x1f2225);
  P.add('pla', lathe([[.15, .035], [.156, .06], [.118, .25], [.092, .37], [.06, .52], [.046, .56], [0, .565]], 18), 0xe8641f);
  P.add('pla', lathe([[.121, .25], [.095, .37]], 18), 0xf4f4f1);
  P.add('mat', xf(new THREE.CylinderGeometry(.017, .017, .26, 10), {y:.67}), 0x9aa1a7);
  P.add('pla', xf(lathe([[0, -.012], [.2, -.012], [.213, 0], [.2, .012], [0, .012]], 28), {rx:Math.PI / 2, y:Y}), 0xd0312a);
  P.add('snw', xf(blob(.1, .035, .02, {seed:2, bump:.05, seg:10}), {y:Y + .2})); P.add('snw', ridge([V(-.16, .035, .15), V(0, .035, .16), V(.16, .035, .15)], .07, .025));
  const d = new Parts(); d.add('d', quadZ(-.19, Y - .19, .19, Y + .19, .0135)); d.add('d', quadZ(-.19, Y - .19, .19, Y + .19, -.0135, undefined, true));
  return assemble(P, [['mat', matteMaterial()], ['pla', plasticMaterial()], ['snw', snowMaterial({seed:36})]], [.38, 1.2, .38], [new THREE.Mesh(d.geo('d'), noParkTex())]); }});

// ── 장애인 전용 주차구역: 바닥 표시(파란 바탕 휠체어) + 안내판 ──
function wheelchair(g, cx, cy, s, lw){
  g.strokeStyle = g.fillStyle = '#f4f6f7'; g.lineWidth = lw; g.lineCap = g.lineJoin = 'round';
  g.beginPath(); g.arc(cx - .02 * s, cy - .62 * s, .1 * s, 0, 7); g.fill();
  g.beginPath(); g.moveTo(cx - .04 * s, cy - .42 * s); g.lineTo(cx, cy - .02 * s); g.lineTo(cx + .34 * s, cy - .02 * s); g.lineTo(cx + .5 * s, cy + .42 * s); g.stroke();
  g.beginPath(); g.moveTo(cx - .03 * s, cy - .24 * s); g.lineTo(cx + .3 * s, cy - .24 * s); g.stroke();
  g.beginPath(); g.arc(cx - .04 * s, cy + .2 * s, .4 * s, -1.75, .45, true); g.stroke();
}
const disabledTex = () => once('disabled', () => decalMaterial(canvasTex(512, 1024, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(240,243,245,.94)';
  g.fillRect(0, 0, 16, 768); g.fillRect(496, 0, 16, 768); g.fillRect(0, 0, 512, 16); g.fillRect(142, 16, 12, 752);
  g.save(); g.beginPath(); g.rect(16, 16, 126, 752); g.clip(); g.strokeStyle = 'rgba(240,243,245,.94)'; g.lineWidth = 13; for (let y = -160; y < 800; y += 64) { g.beginPath(); g.moveTo(8, y + 150); g.lineTo(150, y); g.stroke(); } g.restore();
  const rr = (x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill(); };
  rr(190, 214, 272, 272, 18, '#2a62b6'); wheelchair(g, 320, 356, 118, 22);
  g.fillStyle = 'rgba(240,243,245,.94)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 56px ' + FONT_D; g.fillText('장애인 전용', 326, 560);
  rr(0, 772, 192, 252, 14, '#f4f6f7'); rr(6, 778, 180, 240, 10, '#2a62b6'); wheelchair(g, 96, 852, 62, 11);
  g.fillStyle = '#f4f6f7'; g.font = '700 27px ' + FONT_D; g.fillText('장애인전용', 96, 940); g.fillText('주차구역', 96, 972); g.font = '700 13px ' + FONT_D; g.fillText('위반 시 과태료 10만원', 96, 1002); }), {alpha:true, rough:.85}));
defineProp('disabledBay', {label:'장애인 전용 주차구역', category:'주차장', isNewStyle:true, colliders:[{c:[0, -2.72 * U, .1 * U]}], usage:"W.place('disabledBay', {x: 60, z: 150, rot: 0});  // 칸 3.3m × 5m, 머리쪽(-z)에 안내판", build(){
  const P = new Parts(), d = new Parts(), z = -2.72;
  P.add('mat', xf(new THREE.CylinderGeometry(.028, .028, 2.3, 10), {y:1.15, z}), 0xaab1b6); P.add('mat', box(-.24, 1.6, z + .028, .24, 2.24, z + .042, .004), 0xd9dee1); P.add('mat', box(-.07, 0, z - .07, .07, .03, z + .07), 0x7d858b);
  P.add('snw', ridge([V(-.22, 2.24, z + .035), V(0, 2.24, z + .035), V(.22, 2.24, z + .035)], .04, .028));
  d.add('d', quadY(-1.65, -2.5, 1.65, 2.5, .014, [0, .25, 1, 1])); d.add('d', quadZ(-.225, 1.62, .225, 2.22, z + .0435, [0, 0, 192 / 512, 252 / 1024]));
  return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:36})]], [3.3, 2.3, 5.3], [new THREE.Mesh(d.geo('d'), disabledTex())]); }});

// ── 음식물 쓰레기통: 회색 몸통, 주황 뚜껑, 바퀴 둘 ──
const foodTex = () => once('food', () => decalMaterial(canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = '#e8742a'; g.fillRect(0, 0, W, 92);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 62px ' + FONT_D; g.fillText('음식물', 128, 50); g.fillStyle = '#2b2f33'; g.font = '700 62px ' + FONT_D; g.fillText('쓰레기', 128, 142);
  g.font = '700 22px ' + FONT_D; g.fillStyle = '#6b7278'; g.fillText('물기를 꼭 짜서 버려요', 128, 214); }), {rough:.6}));
defineProp('foodWasteBin', {label:'음식물 쓰레기통', category:'분리수거', isNewStyle:true, colliders:[{c:[0, 0, .3 * U]}], build(o = {}){
  const P = new Parts(), lv = [[.1, .19, .215], [.13, .2, .225], [.5, .22, .25], [.84, .238, .272], [.845, .255, .29], [.9, .255, .29]];
  P.add('pla', loft(lv.map(([y, hx, hz]) => roundedRect(hx * 2, hz * 2, .05, 3).map(p => V(p.x, y, p.y)))), 0x8b9297);
  P.add('pla', box(-.262, .9, -.3, .262, .945, .3, .02), 0xe8742a); P.add('pla', box(-.2, .94, -.22, .2, .968, .2, .012), 0xee8236); P.add('pla', box(-.11, .895, .29, .11, .93, .322, .012), 0xe8742a);
  P.add('pla', tube([V(-.2, .93, -.325), V(.2, .93, -.325)], .016, {radial:8}), 0x7b8287); [-.2, .2].forEach(x => P.add('pla', box(x - .02, .9, -.34, x + .02, .95, -.29, .008), 0x7b8287));
  [-.09, .09].forEach(x => P.add('pla', box(x - .012, .2, .228, x + .012, .8, .262), 0x7f868b)); P.add('pla', box(-.135, .32, .244, .135, .6, .258, .006), 0xdfe2e3);
  [-1, 1].forEach(s => P.add('mat', xf(lathe([[.03, -.022], [.085, -.022], [.1, -.012], [.1, .012], [.085, .022], [.03, .022]], 14), {rz:Math.PI / 2, x:s * .225, y:.1, z:-.2}), 0x1d1f22));
  P.add('mat', xf(new THREE.CylinderGeometry(.014, .014, .46, 8), {rz:Math.PI / 2, y:.1, z:-.2}), 0x6f767b);
  P.add('snw', xf(blob(.2, .06, .21, {seed:5 + (o.v || 0), bump:.1, seg:12}), {y:.965, z:-.01}));
  ao(P.m.pla[0], .25, .72);
  return assemble(P, [['pla', plasticMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:36})]], [.53, 1.02, .66], [new THREE.Mesh(quadZ(-.12, .335, .12, .585, .2595), foodTex())]); }});

// ── 주차장 화단: 둥근 끝의 긴 경계석 안에 눈 덮인 흙과 회양목 ──
function stadium(len, w, n = 8){
  const r = w / 2, h = Math.max(0, len / 2 - r), pts = []; const seg = Math.max(1, Math.round(h / .8));
  for (let i = 0; i < seg; i++) pts.push([r, -h + 2 * h * i / seg]);
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI; pts.push([Math.cos(a) * r, h + Math.sin(a) * r]); }
  for (let i = 1; i < seg; i++) pts.push([-r, h - 2 * h * i / seg]);
  for (let i = 0; i < n; i++) { const a = Math.PI + i / n * Math.PI; pts.push([Math.cos(a) * r, -h + Math.sin(a) * r]); }
  return pts;
}
defineProp('planterIsland', {label:'주차장 화단', category:'주차장', isNewStyle:true, usage:"W.place('planterIsland', {x: 54, z: 150, len: 5, wid: 1.4});  // len·wid는 미터",
  build(o = {}){
    const P = new Parts(), L = o.len || 5, Wd = o.wid || 1.4, loop = stadium(L, Wd), n = loop.length, R = mulberry(5 + Math.round(L * 10));
    const sec = [[-.075, -.02], [.075, -.02], [.075, .17], [.06, .19], [-.06, .19], [-.075, .17]];
    const rings = []; for (let i = 0; i <= n; i++) { const a = loop[(i - 1 + n) % n], b = loop[i % n], c = loop[(i + 1) % n], tx = c[0] - a[0], tz = c[1] - a[1], l = Math.hypot(tx, tz), nx = tz / l, nz = -tx / l;
      rings.push(sec.map(([u, y]) => V(b[0] + nx * (u - .075), y, b[1] + nz * (u - .075)))); }
    P.add('mat', loft(rings, {caps:false}), 0xa3a8ab);
    P.add('snw', loft([[.93, .13], [.86, .2], [.6, .26], [.25, .285]].map(([s, y]) => loop.map(p => V(p[0] * s * (1 - .15 / Wd), y, p[1] * (1 - (1 - s) * Wd / L) * (1 - .15 / L))))));
    const hl = L / 2 - Wd * .55, cnt = Math.max(1, Math.round(hl * 2 / .95));
    for (let i = 0; i <= cnt; i++) { const z = -hl + 2 * hl * i / cnt; if (o.gap && Math.abs(z % o.gap) < .5 && Math.abs(z) < hl - .5) continue; if (o.tree && Math.abs(z) < .5) continue;
      const r = Wd * (.27 + R() * .05), x = (R() - .5) * .08;
      P.add('mat', xf(blob(r, r * 1.25, .46, {seed:i + 1, bump:.1, seg:12}), {x, y:.18, z}), R() < .5 ? 0x4c6a52 : 0x415d49); P.add('snw', xf(blob(r * .88, r * .5, .42, {seed:i + 7, bump:.08, seg:12}), {x, y:.18 + r * .92, z})); }
    ao(P.geo('mat'), .3, .75);
    return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:37})]], [Wd, .9, L]); }});

// ── 겨울 나무: 잎이 진 가지에 눈이 얹힌 느티나무. 밑동은 짚으로 감쌌다. v(0~2)로 모양이 달라진다 ──
defineProp('bareTree', {label:'겨울 나무', category:'조경', isNewStyle:true, colliders:[{c:[0, 0, .28 * U]}], usage:"W.placeMany('bareTree', [{x: 50, z: 135, v: 0}, {x: 60, z: 135, v: 1, rot: 1.2}]);", build(o = {}){
  const R = mulberry(17 + (o.v || 0) * 101), P = new Parts(), H = o.h || 1, up = V(0, 1, 0), xa = V(1, 0, 0), LEN = [2.5, 1.7, 1.25, .95, .75], RAD = [7, 5, 4, 3, 3];
  (function grow(p, dir, depth, rad){
    const n = depth === 0 ? 4 : depth < 3 ? 3 : 2, pts = [p.clone()], d = dir.clone(), len = LEN[depth] * H * (.85 + R() * .3); let q = p;
    for (let i = 1; i <= n; i++) { d.add(V((R() - .5) * .3, depth ? .08 : 0, (R() - .5) * .3)).normalize(); q = q.clone().addScaledVector(d, len / n); pts.push(q); }
    const r1 = rad * (depth === 0 ? .7 : .58);
    P.add('brk', tube(pts, t => rad + (r1 - rad) * t, {radial:RAD[depth], caps:depth === 4}), depth === 0 ? 0xffffff : depth < 3 ? 0xe9e4de : 0xcfc8c0);
    if (depth >= 1 && depth <= 3 && Math.abs(d.y) < .93) P.add('snw', ridge(pts.map((a, i) => a.clone().setY(a.y + (rad + (r1 - rad) * i / n) * .75)), rad * 1.7 + .02, rad * .7 + .012, depth === 3 ? 2 : 3));
    if (depth >= 4) return;
    const kids = depth === 0 ? 3 + (R() < .6 ? 1 : 0) : 2 + (R() < .6 ? 1 : 0), base = R() * 6.28, u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < .9 ? up : xa).normalize(), w = new THREE.Vector3().crossVectors(d, u);
    for (let k = 0; k < kids; k++) { const a = base + k / kids * 6.28 + (R() - .5) * .7, sp = (depth === 0 ? .62 : .5) + R() * .32;
      const nd = d.clone().multiplyScalar(Math.cos(sp)).addScaledVector(u, Math.sin(sp) * Math.cos(a)).addScaledVector(w, Math.sin(sp) * Math.sin(a)); nd.y += .16; nd.normalize();
      grow(q, nd, depth + 1, r1 * (.74 + R() * .12)); }
    if (depth === 0) grow(q, V((R() - .5) * .3, 1, (R() - .5) * .3).normalize(), 1, r1 * .9);
  })(V(0, 0, 0), up, 0, .21 * H);
  P.add('brk', lathe([[.36 * H, 0], [.28 * H, .1], [.225 * H, .32], [.21 * H, .5]], 10), 0xf2efea);
  P.add('brk', lathe([[.215 * H, .55], [.222 * H, .6], [.212 * H, 1.45], [.2 * H, 1.5]], 10), 0xf0cf7a);
  [.62, 1.0, 1.4].forEach(y => P.add('brk', lathe([[.214 * H, y - .025], [.232 * H, y], [.214 * H, y + .025]], 10), 0xb89544));
  P.add('snw', xf(blob(.62 * H, .15, .58 * H, {seed:(o.v || 0) + 3, bump:.1}), {}));
  return assemble(P, [['brk', barkMaterial()], ['snw', snowMaterial({seed:38})]], [5, 7, 5]); }});

// ── 방음벽 한 칸 (4m): H형강 기둥, 콘크리트 기초, 흡음판 4단, 투명판 2단 ──
defineProp('noiseBarrier', {label:'방음벽 (한 칸 4m)', category:'경계', isNewStyle:true, colliders:[{r:[-2 * U, -.16 * U, 2 * U, .16 * U]}], usage:"W.placeMany('noiseBarrier', xs.map(x => ({x, z: 95, rot: 0})));  // 4.7단위(4m) 간격", build(){
  const P = new Parts(), TOP = 4.5;
  [-2, 2].forEach(x => { P.add('mat', box(x - .012, 0, -.075, x + .012, TOP + .08, .075), 0x5f6f69); [-.075, .075].forEach(z => P.add('mat', box(x - .075, 0, z - .012, x + .075, TOP + .08, z + .012), 0x64756e));
    P.add('mat', box(x - .11, 0, -.11, x + .11, .06, .11), 0x59625f); P.add('snw', xf(blob(.09, .05, .09, {seed:4, bump:0, seg:8}), {x, y:TOP + .08})); });
  P.add('mat', box(-1.99, 0, -.13, 1.99, .46, .13, .015), 0xb3b7b8);
  for (let i = 0; i < 4; i++) { const y = .47 + i * .5; P.add('mat', box(-1.985, y, -.055, 1.985, y + .485, .055, .012), i % 2 ? 0xb7c6bb : 0xc3cfc5);
    [.12, .24, .36].forEach(d => [-.056, .056].forEach(z => P.add('mat', box(-1.9, y + d - .012, z - .003, 1.9, y + d + .012, z + .003), 0x8fa094))); }
  [2.47, 3.47, 4.44].forEach(y => P.add('mat', box(-1.985, y, -.035, 1.985, y + .06, .035), 0x8e989d));
  for (let i = 0; i < 2; i++) { const y = 2.53 + i; P.add('clr', box(-1.985, y, -.006, 1.985, y + .94, .006)); for (let k = 1; k < 8; k++) P.add('mat', box(-1.97, y + k * .118 - .004, -.009, 1.97, y + k * .118 + .004, .009), 0xe8edf0); }
  P.add('snw', ridge(Array.from({length:9}, (_, i) => V(-1.9 + i * .475, TOP, 0)), .09, .05)); [-.1, .1].forEach(z => P.add('snw', ridge(Array.from({length:7}, (_, i) => V(-1.85 + i * .62, .455, z)), .07, .035)));
  ao(P.geo('mat'), .5, .78);
  return assemble(P, [['mat', matteMaterial()], ['clr', clearMaterial(), false], ['snw', snowMaterial({seed:39})]], [4, 4.6, .26]); }});

// ── 단지 가로등: 가는 기둥, 둥근 갓 ──
defineProp('parkLamp', {label:'단지 가로등', category:'조경', isNewStyle:true, colliders:[{c:[0, 0, .14 * U]}], usage:"W.placeMany('parkLamp', [{x: 50, z: 135}, ...]);", build(){
  const P = new Parts();
  P.add('mat', lathe([[.1, 0], [.1, .22], [.07, .28], [.05, 1.2], [.042, 3.5], [.06, 3.56], [.06, 3.6]], 12), 0x3b444b);
  P.add('mat', lathe([[.05, 3.6], [.15, 3.66], [.185, 3.9]], 16), 0xfff3d2); P.add('mat', lathe([[.2, 3.9], [.23, 3.93], [.2, 3.98], [.06, 4.06], [0, 4.07]], 16), 0x3b444b);
  P.add('mat', box(-.06, 1.9, .045, .06, 2.02, .055), 0xdfe3e5);
  P.add('snw', xf(blob(.19, .07, .19, {seed:6, bump:.06, seg:12}), {y:4.0})); P.add('snw', xf(blob(.2, .06, .2, {seed:8, bump:.08, seg:10}), {}));
  ao(P.m.mat[0], .4, .7);
  return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:36})]], [.46, 4.1, .46]); }});
