// 아파트 단지 소품 1: 주차 턱, 과속방지턱, 주차금지 오뚜기, 바닥 표지(장애인 전용·소방차 전용), 음식물 쓰레기통, 주차장 화단,
// 겨울 나무 4종, 소나무 3종, 덤불 조경(생울타리·둥근 관목·덤불 묶음), 방음벽, 단지 가로등.
// 모두 미터 단위로 만들고 UNIT을 곱한다. 원점은 바닥 중심, 정면은 +z.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, loft, tube, lathe, extrudeProfile, ridge, blob, xf, bakeAO, groundAO, roundedRect, flatXZ, tint, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, barkMaterial, clearMaterial, plasticMaterial, metalMaterial, asphaltMaterial } from '../core/texkit.js';
import { assemble, quadZ, quadY, mulberry } from './kit.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';

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

// ── 주차금지 오뚜기: 받침·목·둥근 머리가 한 몸으로 이어진 플라스틱 표지 ──
const noParkTex = () => once('nopark', () => decalMaterial(canvasTex(256, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#fbfbf8'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = '#d0312a'; g.lineWidth = 22; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke(); g.fillStyle = '#1c1f23'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '66px ' + FONT_D; g.fillText('주차', 128, 96); g.fillText('금지', 128, 164); }), {alpha:true, rough:.6}));
defineProp('noParkingSign', {label:'주차금지 오뚜기', category:'주차장', isNewStyle:true, colliders:[{c:[0, 0, .2 * U]}], build(){
  const P = new Parts(), N = 24, YC = .68, RH = .21, lv = [[0, .15, .15], [.012, .182, .182], [.06, .192, .192], [.12, .178, .178], [.18, .135, .13], [.24, .09, .082], [.31, .064, .052], [.39, .058, .038], [.46, .06, .034]];
  for (let i = 1; i <= 16; i++) { const th = (-72 + 158 * i / 16) * Math.PI / 180, c = Math.cos(th); lv.push([YC + RH * Math.sin(th), Math.max(.012, RH * c), .034 * Math.min(1, Math.sqrt(c * 4))]); }
  P.add('pla', loft(lv.map(([y, a, b]) => Array.from({length:N}, (_, j) => { const t = j / N * Math.PI * 2; return V(Math.cos(t) * a, y, Math.sin(t) * b); }))), 0xe9571f);
  P.bake('pla', groundAO(.12, .72));
  P.add('snw', xf(blob(.085, .03, .028, {seed:2, bump:.05, seg:10}), {y:YC + RH - .012})); P.add('snw', ridge([V(-.15, 0, .16), V(0, 0, .2), V(.15, 0, .16)], .09, .035));
  const d = new Parts(); d.add('d', quadZ(-.178, YC - .178, .178, YC + .178, .0346)); d.add('d', quadZ(-.178, YC - .178, .178, YC + .178, -.0346, undefined, true));
  return assemble(P, [['pla', plasticMaterial()], ['snw', snowMaterial({seed:36})]], [.42, .9, .39], [new THREE.Mesh(d.geo('d'), noParkTex())]); }});

// ── 바닥 표지: 장애인 전용 주차구역, 소방차 전용구역. 바닥에 깔리는 그림 한 장이고 기둥이나 충돌은 없다 ──
// 표지는 자기 아스팔트 바닥판(y 0)을 같이 들고 다니고, 그림은 그 위 1.4cm에 뜬다. 맵에서는 표지 자리의 도로 아스팔트를 도려내고
// 표지를 도로 높이(y)에 놓는다. (예전에는 그림이 도로 아스팔트보다 낮게 깔려서 가까이 가면 가려졌다.) base: false면 바닥판 없이 그림만.
const pad = (w, d, o, tex) => { const list = [new THREE.Mesh(quadY(-w / 2, -d / 2, w / 2, d / 2, .014), tex)];
  if (o.base !== false) { const b = new THREE.Mesh(tint(flatXZ(-w / 2, -d / 2, w / 2, d / 2, 0), 0xffffff), asphaltMaterial()); b.castShadow = false; list.unshift(b); } return list; };
function wheelchair(g, cx, cy, s, lw){
  g.strokeStyle = g.fillStyle = '#f4f6f7'; g.lineWidth = lw; g.lineCap = g.lineJoin = 'round';
  g.beginPath(); g.arc(cx - .02 * s, cy - .62 * s, .1 * s, 0, 7); g.fill();
  g.beginPath(); g.moveTo(cx - .04 * s, cy - .42 * s); g.lineTo(cx, cy - .02 * s); g.lineTo(cx + .34 * s, cy - .02 * s); g.lineTo(cx + .5 * s, cy + .42 * s); g.stroke();
  g.beginPath(); g.moveTo(cx - .03 * s, cy - .24 * s); g.lineTo(cx + .3 * s, cy - .24 * s); g.stroke();
  g.beginPath(); g.arc(cx - .04 * s, cy + .2 * s, .4 * s, -1.75, .45, true); g.stroke();
}
// 해진 자국: 칠이 벗겨진 얼룩과 바퀴가 지나간 줄을 지워 낸다
function wear(g, x, y, w, h, seed, n){
  const R = mulberry(seed); g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  for (let i = 0; i < n; i++) { const r = 1 + R() * R() * 7; g.globalAlpha = .5 + R() * .5; g.beginPath(); g.ellipse(x + R() * w, y + R() * h, r * (1 + R() * 2.5), r, R() * 3.14, 0, 7); g.fill(); }
  for (let i = 0; i < 7; i++) { const sx = x + R() * w, sw = 2 + R() * 5; g.globalAlpha = .75; for (let k = 0; k < 40; k++) if (R() < .3) g.fillRect(sx + (R() - .5) * 4, y + h * k / 40, sw, h / 40 * (.4 + R() * .8)); }
  g.restore();
}
const bayTex = floor => once('bay' + floor, () => decalMaterial(canvasTex(512, 776, (g, W, H) => { g.clearRect(0, 0, W, H);
  const AX = 155;                                                                    // 왼쪽 1m는 타고 내리는 빗금 구역
  if (floor) { g.fillStyle = '#3a66a6'; g.fillRect(AX, 0, W - AX, H); wear(g, AX, 0, W - AX, H, 7, 330); }
  g.fillStyle = g.strokeStyle = '#f1f4f5'; g.fillRect(0, 0, W, 14); g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H); g.fillRect(AX - 7, 0, 14, H);
  g.save(); g.beginPath(); g.rect(14, 14, AX - 21, H - 14); g.clip(); g.lineWidth = 14; for (let y = -160; y < H + 60; y += 70) { g.beginPath(); g.moveTo(8, y + 150); g.lineTo(AX, y); g.stroke(); } g.restore();
  wheelchair(g, (AX + W) / 2 + 6, H / 2 + 10, 150, 30); wear(g, 0, 0, W, H, 11, 150);
}), {alpha:true, rough:.9}));
defineProp('disabledBay', {label:'장애인 전용구역 (바닥 표지)', category:'주차장', isNewStyle:true, groundPreview:true,
  variants:[{label:'파란 바닥', opts:{}}, {label:'흰 표지만', opts:{floor:false}}],
  usage:"W.place('disabledBay', {x: 60, z: 150, rot: 0});  // 칸 3.3m × 5m. floor: false면 흰 표지만",
  build(o = {}){ return assemble(new Parts(), [], [3.3, .02, 5], pad(3.3, 5, o, bayTex(o.floor !== false))); }});
const fireTex = white => once('fire' + white, () => decalMaterial(canvasTex(512, 1024, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = g.strokeStyle = white ? '#f1f4f5' : '#f0bf2c';
  const B = 26;                                                                      // 테두리 30cm: 빗금
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(B, B, W - 2 * B, H - 2 * B); g.clip('evenodd'); g.lineWidth = 11; for (let d = -H; d < W + H; d += 30) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + H, H); g.stroke(); } g.restore();
  g.lineWidth = 5; g.strokeRect(2.5, 2.5, W - 5, H - 5); g.strokeRect(B, B, W - 2 * B, H - 2 * B);
  g.lineWidth = 16; g.beginPath(); g.arc(256, 215, 92, 0, 7); g.stroke(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '140px ' + FONT_D; g.fillText('P', 258, 222);
  g.font = '150px ' + FONT_D; g.fillText('소방차', 256, 520); g.fillText('전용', 256, 720); wear(g, 0, 0, W, H, 23, 240);
}), {alpha:true, rough:.9}));
defineProp('fireLane', {label:'소방차 전용구역 (바닥 표지)', category:'주차장', isNewStyle:true, groundPreview:true,
  variants:[{label:'노란색', opts:{}}, {label:'흰색', opts:{white:true}}],
  usage:"W.place('fireLane', {x: 120, z: 137.5, rot: Math.PI / 2});  // 6m × 12m. white: true면 흰색",
  build(o = {}){ return assemble(new Parts(), [], [6, .02, 12], pad(6, 12, o, fireTex(!!o.white))); }});

// ── 음식물 쓰레기통: 회색 몸통, 주황 뚜껑, 바퀴 둘 ──
const foodTex = () => once('food', () => decalMaterial(canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = '#e8742a'; g.fillRect(0, 0, W, 92);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '62px ' + FONT_D; g.fillText('음식물', 128, 50); g.fillStyle = '#2b2f33'; g.font = '62px ' + FONT_D; g.fillText('쓰레기', 128, 142);
  g.font = '22px ' + FONT_B; g.fillStyle = '#6b7278'; g.fillText('물기를 꼭 짜서 버려요', 128, 214); }), {rough:.6}));
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

// ── 겨울 나무: 잎이 진 활엽수 네 가지. 기둥은 밑동에서 첫 가지까지 곧게 서고, 그 기둥에 짚(잠복소)을 감았다 ──
//   v 0 둥근 수형 · 1 곧고 좁은 수형 · 2 두 갈래 · 3 옆으로 퍼진 수형
// 둥근 수형 여섯 가지 (2026-11-15 사용자 요청: 곧은 · 두 갈래 · 퍼진 수형은 없애고 둥근 수형만 여러 모양으로)
const TREE = [
  {th:2.5, kids:4, spread:.62, up:.16, len:1.0, leader:true},
  {th:2.2, kids:5, spread:.66, up:.14, len:.94, leader:false},
  {th:2.8, kids:4, spread:.56, up:.2, len:1.06, leader:true},
  {th:2.35, kids:4, spread:.7, up:.12, len:1.1, leader:false},
  {th:2.65, kids:5, spread:.6, up:.18, len:.9, leader:true},
  {th:2.05, kids:4, spread:.68, up:.15, len:.98, leader:true},
];
defineProp('bareTree', {label:'겨울 나무', category:'조경', isNewStyle:true, colliders:[{c:[0, 0, .28 * U]}],
  lod:{near:50, opts:{lite:true}},   // (2026-11-24) 먼 칸은 가지 세 단 (placeMany LOD). (2026-11-27 최적화) 70 → 50 — 50 밖에서는 잔가지 차이가 안 보인다
  variants:[1, 2, 3, 4, 5, 6].map(k => ({label:'둥근 수형 ' + k, opts:{v:k - 1}})),
  usage:"W.placeMany('bareTree', [{x: 50, z: 135, rot: 1.2}, ...], {v: 0});  // v: 0~5 (모두 둥근 수형). lite: 가지 세 단",
  build(o = {}){
    const v = (o.v || 0) % TREE.length, F = TREE[v], R = mulberry(17 + v * 101), P = new Parts(), H = o.h || 1, MD = o.lite ? 3 : 4, up = V(0, 1, 0), xa = V(1, 0, 0), LEN = [0, 1.7, 1.25, .95, .75], RAD = [0, 6, 4, 3, 3];
    const TH = F.th * H, r0 = .21 * H, rT = r0 * .72, tr = y => r0 + (rT - r0) * Math.min(1, y / TH);
    P.add('brk', tube([V(0, 0, 0), V(0, TH * .5, 0), V(0, TH, 0)], t => r0 + (rT - r0) * t, {radial:9}), 0xffffff);
    function grow(p, dir, depth, rad){
      const n = depth < 3 ? 3 : 2, pts = [p.clone()], d = dir.clone(), len = LEN[depth] * F.len * H * (.85 + R() * .3); let q = p;
      for (let i = 1; i <= n; i++) { d.add(V((R() - .5) * .3, .04 + F.up * .25, (R() - .5) * .3)).normalize(); q = q.clone().addScaledVector(d, len / n); pts.push(q); }
      const r1 = rad * .58;
      P.add('brk', tube(pts, t => rad + (r1 - rad) * t, {radial:o.lite ? Math.min(RAD[depth], 4) : RAD[depth], caps:depth === MD}), depth < 3 ? 0xe9e4de : 0xcfc8c0);
      if (depth <= (o.lite ? 2 : 3) && Math.abs(d.y) < .93) P.add('snw', ridge(pts.map((a, i) => a.clone().setY(a.y + (rad + (r1 - rad) * i / n) * .75)), rad * 1.7 + .02, rad * .7 + .012, depth === 3 ? 2 : 3));
      if (depth < MD) split(q, d, depth, r1, 2 + (R() < .6 ? 1 : 0), (.5 + R() * .32) * Math.min(1.15, .55 + F.spread * .75));
    }
    function split(q, d, depth, r, kids, sp0){
      const base = R() * 6.28, u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < .9 ? up : xa).normalize(), w = new THREE.Vector3().crossVectors(d, u);
      for (let k = 0; k < kids; k++) { const a = base + k / kids * 6.28 + (R() - .5) * .7, sp = sp0 * (.85 + R() * .3);
        const nd = d.clone().multiplyScalar(Math.cos(sp)).addScaledVector(u, Math.sin(sp) * Math.cos(a)).addScaledVector(w, Math.sin(sp) * Math.sin(a)); nd.y += F.up; nd.normalize();
        grow(q, nd, depth + 1, r * (.74 + R() * .12)); }
    }
    const top = V(0, TH, 0);
    split(top, up, 0, rT, F.kids, F.spread);
    if (F.leader) grow(top, V((R() - .5) * .2, 1, (R() - .5) * .2).normalize(), 1, rT * .9);
    P.add('brk', lathe([[r0 * 1.7, 0], [r0 * 1.32, .1], [r0 * 1.08, .32], [tr(.5) + .004, .5]], 10), 0xf2efea);
    P.add('brk', lathe([[tr(.55) + .012, .55], [tr(.6) + .024, .6], [tr(1.45) + .024, 1.45], [tr(1.5) + .012, 1.5]], 10), 0xf0cf7a);
    [.62, 1.0, 1.4].forEach(y => P.add('brk', lathe([[tr(y) + .022, y - .025], [tr(y) + .042, y], [tr(y) + .022, y + .025]], 10), 0xb89544));
    P.add('snw', xf(blob(.62 * H, .15, .58 * H, {seed:v + 3, bump:.1}), {}));
    return assemble(P, [['brk', barkMaterial()], ['snw', snowMaterial({seed:38})]], [5, 7, 5]); }});

// ── 소나무: 붉은 줄기가 굽어 오르고, 가지 끝마다 납작한 잎 뭉치에 눈이 얹힌다. v 0 곧은 · 1 굽은 · 2 낮고 넓은 ──
const PINE = [
  {path:[[0, 0, 0], [.06, 2.2, 0], [-.1, 4.4, .06], [0, 6.4, 0]], r:.2, br:[[.56, 1.7, 1.2], [.66, 1.5, 1.15], [.76, 1.25, 1.05], [.86, 1.0, .95], [.94, .7, .8]], top:1.2},
  {path:[[0, 0, 0], [.3, 1.3, 0], [.95, 2.5, .1], [1.05, 3.7, .2], [.5, 4.9, .1]], r:.19, br:[[.48, 1.8, 1.2], [.64, 1.5, 1.1], [.8, 1.25, 1.0], [.92, .9, .85]], top:1.15},
  {path:[[0, 0, 0], [-.12, 1.0, 0], [.1, 2.0, .08], [0, 2.8, 0]], r:.22, br:[[.46, 2.0, 1.35], [.58, 1.8, 1.25], [.7, 1.6, 1.2], [.82, 1.3, 1.1], [.92, .9, .95]], top:1.4},
];
function needlePad(rx, h, rz, seed){
  const g = new THREE.SphereGeometry(1, 12, 8), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .16 * (Math.sin(x * 4.7 + seed * 1.3) * Math.cos(z * 5.1 + seed * 2.1) + .5 * Math.sin(y * 6 + x * 3 + seed));
    p.setXYZ(i, x * k * rx, (y < 0 ? y * .4 : y) * k * h, z * k * rz); }
  g.computeVertexNormals(); return g;
}
defineProp('pineTree', {label:'소나무', category:'조경', isNewStyle:true, colliders:[{c:[0, 0, .3 * U]}],
  variants:[{label:'곧은 수형', opts:{v:0}}, {label:'굽은 수형', opts:{v:1}}, {label:'낮고 넓은 수형', opts:{v:2}}],
  usage:"W.placeMany('pineTree', [{x: 50, z: 135, rot: 1.2}, ...], {v: 1});  // v: 0~2",
  build(o = {}){
    const v = (o.v || 0) % PINE.length, F = PINE[v], R = mulberry(41 + v * 59), P = new Parts(), cv = new THREE.CatmullRomCurve3(F.path.map(p => V(p[0], p[1], p[2])));
    P.add('brk', tube(cv.getPoints(18), t => F.r * (1 - .6 * t), {radial:9}), 0xffc4a0);
    P.add('brk', lathe([[F.r * 1.75, 0], [F.r * 1.3, .12], [F.r * 1.05, .38]], 10), 0xffc4a0);
    let k = 0;
    const pad = (c, r) => { k++; P.add('mat', xf(needlePad(r, r * .42, r * (.85 + R() * .3), k), {x:c.x, y:c.y, z:c.z, ry:R() * 3}), k % 2 ? 0x385a41 : 0x2f4f3a);
      P.add('snw', xf(blob(r * .8, r * .27, r * .74, {seed:k + 3, bump:.1, seg:12}), {x:c.x, y:c.y + r * .19, z:c.z})); };
    F.br.forEach(([t, len, pr], i) => { const s = cv.getPoint(t), a = i * 2.4 + v * 1.3 + R() * .5, dir = V(Math.cos(a), 0, Math.sin(a)), rb = F.r * (1 - .6 * t) * .55;
      const mid = s.clone().addScaledVector(dir, len * .5).setY(s.y + len * .12), end = s.clone().addScaledVector(dir, len).setY(s.y + len * .3);
      P.add('brk', tube([s, mid, end], q => rb * (1 - .6 * q), {radial:6}), 0xf2c0a0);
      pad(end.clone().setY(end.y + .05), pr); pad(mid.clone().addScaledVector(dir, -len * .05).setY(mid.y + .34), pr * .6); });
    const tip = cv.getPoint(1); pad(tip.clone().setY(tip.y - .05), F.top); pad(tip.clone().add(V(.55, -.5, .35)), F.top * .62); pad(tip.clone().add(V(-.5, -.6, -.4)), F.top * .58);
    P.bake('mat', (p, n) => n.y < -.2 ? .6 : .82 + .18 * n.y);
    P.add('snw', xf(blob(.6, .14, .56, {seed:v + 5, bump:.1}), {}));
    return assemble(P, [['brk', barkMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:38})]], [5, 7, 5]); }});

// ── 덤불 조경: 다듬은 생울타리, 둥근 회양목, 덤불 묶음 (아파트 동 둘레에 따로 놓는다) ──
defineProp('hedgeRow', {label:'생울타리', category:'조경', isNewStyle:true, usage:"W.place('hedgeRow', {x: 60, z: 123, rot: 0, len: 6});  // len은 미터, x 방향으로 길다",
  build(o = {}){
    const L = o.len || 4, h = o.h || .8, w = o.wid || .7, P = new Parts(), n = Math.max(4, Math.round(L / .24)), M = 14, rings = [];
    for (let i = 0; i <= n; i++) { const x = -L / 2 + L * i / n, e = i === 0 || i === n ? .8 : i === 1 || i === n - 1 ? .95 : 1, ring = [];
      for (let j = 0; j < M; j++) { const a = j / M * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), sup = Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), -.25), k = e * (1 + .08 * Math.sin(x * 7 + j * 1.9) + .06 * Math.sin(x * 13.7 + j * 3.1 + 2));
        ring.push(V(x, Math.max(0, h / 2 + s * sup * h / 2 * k), c * sup * w / 2 * k)); } rings.push(ring); }
    P.add('mat', loft(rings), 0x45634c); P.bake('mat', groundAO(.35, .7));
    P.add('snw', ridge(Array.from({length:n + 1}, (_, i) => V(-L / 2 + .12 + (L - .24) * i / n, h * .96, Math.sin(i * 1.3) * .03)), w * .92, .15, 6));
    return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:37})]], [L, h + .1, w]); }});
defineProp('shrubBall', {label:'둥근 관목', category:'조경', isNewStyle:true,
  variants:[{label:'작은 회양목', opts:{v:0}}, {label:'큰 회양목', opts:{v:1}}, {label:'마른 관목', opts:{v:2}}],
  usage:"W.placeMany('shrubBall', [{x: 60, z: 123}, ...], {v: 0});  // v: 0~2",
  build(o = {}){
    const v = (o.v || 0) % 3, r = [.42, .68, .55][v], P = new Parts(), R = mulberry(7 + v);
    if (v < 2) { P.add('mat', xf(blob(r, r * 1.45, r * .96, {seed:v + 2, bump:.12, seg:16}), {}), [0x4a6950, 0x415f49][v]); P.add('snw', xf(blob(r * .84, r * .46, r * .8, {seed:v + 9, bump:.08, seg:12}), {y:r * 1.08})); }
    else for (let i = 0; i < 18; i++) {                                                // 잎이 진 관목: 밑에서 부채처럼 퍼지는 붉은 잔가지
      const a = i * 2.4 + R(), l = r * (1.5 + R() * .9), lean = .25 + R() * .55, dx = Math.cos(a), dz = Math.sin(a), base = V(dx * .06, 0, dz * .06);
      const mid = V(dx * l * lean * .45, l * .55, dz * l * lean * .45), tip = V(dx * l * lean, l, dz * l * lean);
      P.add('mat', tube([base, mid, tip], t => .016 * (1 - .6 * t), {radial:4}), i % 3 ? 0x8a4a3c : 0x6b4636);
      const f = mid.clone().lerp(tip, .3), a2 = a + (R() - .5) * 2; P.add('mat', tube([f, f.clone().add(V(Math.cos(a2) * l * .25, l * .32, Math.sin(a2) * l * .25))], .008, {radial:3}), 0x7a4538);
      if (i % 4 === 0) P.add('snw', xf(blob(.07, .04, .06, {seed:i, bump:.1, seg:8}), {x:f.x, y:f.y, z:f.z})); }
    P.bake('mat', groundAO(.3, .7));
    P.add('snw', xf(blob(r * 1.25, .07, r * 1.2, {seed:v + 4, bump:.1, seg:12}), {}));
    return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:37})]], [r * 2, r * 1.6, r * 2]); }});
defineProp('shrubCluster', {label:'덤불 묶음', category:'조경', isNewStyle:true, usage:"W.place('shrubCluster', {x: 60, z: 123, rot: 0.4});  // 2.6m × 1.6m",
  build(){
    const P = new Parts(), list = [[-.85, .1, .5, 0x4a6950], [-.1, -.25, .62, 0x3f5c47], [.7, .15, .45, 0x4f6f55], [.25, .45, .34, 0x6a7d4f], [-.45, -.45, .3, 0x466249], [1.05, -.3, .3, 0x415f49]];
    list.forEach(([x, z, r, c], i) => { P.add('mat', xf(blob(r, r * 1.4, r * .95, {seed:i + 2, bump:.13, seg:14}), {x, z}), c); P.add('snw', xf(blob(r * .84, r * .44, r * .8, {seed:i + 9, bump:.08, seg:10}), {x, y:r * 1.05, z})); });
    P.add('mat', xf(blob(.26, .2, .2, {seed:5, bump:.2, seg:8}), {x:-1.15, z:-.3}), 0x8f9496);                                    // 조경석
    P.bake('mat', groundAO(.3, .7)); P.add('snw', xf(blob(1.45, .08, .9, {seed:6, bump:.1, seg:14}), {}));
    return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:37})]], [2.6, .95, 1.6]); }});

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
  // (2026-11-18 3차) 기둥 가운데 흰 번호판은 없앴다
  P.add('snw', xf(blob(.19, .07, .19, {seed:6, bump:.06, seg:12}), {y:4.0})); P.add('snw', xf(blob(.2, .06, .2, {seed:8, bump:.08, seg:10}), {}));
  ao(P.m.mat[0], .4, .7);
  return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:36})]], [.46, 4.1, .46]); }});
