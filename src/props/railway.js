// 간이역과 철길, 경계 시설. 사용자 참고 사진(역측면모습 · 역과정거장 · 역의끝 · 역에서본아파트모습) 기준.
//   부품: 선로(레일 · 침목 · 자갈 도상), 승강장, 대합 지붕(파란 골강판 외쪽지붕), 승강장 난간(회색 세로살), 역명판, 차막이,
//         육교(계단 두 벌 + 상판, 실제로 걸어서 건넌다), 붉은 벽돌벽, 도로변 울타리.
//   선로는 소품(10m 한 토막)과 맵용 함수 layTrack()이 같은 부품 함수를 쓴다. layTrack은 침목을 인스턴스로 깐다.
//   모두 미터 단위, 원점은 바닥 가운데, 정면 +z. 역 이름과 이웃 역은 지어낸 것.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, loft, lathe, fillet, ridge, blob, xf, extrudeProfile, uvMeters, groundAO, bakeAO, Parts, triCount } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, metalMaterial, concreteMaterial, asphaltMaterial, paintMaterial, woodMaterial, gravelMaterial, brickWallMaterial, roadPaintMaterial } from '../core/texkit.js';
import { assemble, quad, quadZ, mulberry } from './kit.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const steel = () => paintMaterial(0xffffff, {seed:23, gloss:.5, metal:.3});           // 도장한 강철 (색은 정점 색)
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();

// ───────── 선로 ─────────
// 단면 치수: 궤간 1.435m(레일 중심 ±0.7525), 도상 윗폭 3.4m · 아랫폭 4.6m · 높이 0.3m, 침목 2.6m × 0.24m, 레일 높이 0.172m.
export const TRACK = {ga:.7525, bTop:1.7, bBot:2.3, bH:.3, slY0:.12, slY1:.32, railY:.335, railH:.172, pitch:.6, top:.507};
const T = TRACK;
// 선로 방향이 x축인 부품들 (맵에 그대로 쓴다). 단면은 (z, y)로 그리고 x로 밀어낸다.
const prism = (pts, len) => uvMeters(extrudeProfile(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))), len, {bevel:0}));
const RAIL = [[-.075, 0], [.075, 0], [.075, .012], [.012, .03], [.009, .13], [.036, .14], [.036, .172], [-.036, .172], [-.036, .14], [-.009, .13], [-.012, .03], [-.075, .012]];
export function ballastGeo(len){ return prism([[-T.bBot, -.02], [T.bBot, -.02], [T.bTop, T.bH], [-T.bTop, T.bH]], len); }
export function railsGeo(len){ const P = new Parts(); [-T.ga, T.ga].forEach(z => P.add('r', xf(prism(RAIL.map(([a, y]) => [a + z, y + T.railY]), len)), 0x6e4e3c)); return P.geo('r'); }
export function railTopGeo(len){ const P = new Parts(); [-T.ga, T.ga].forEach(z => P.add('t', box(-len / 2, T.railY + .168, z - .033, len / 2, T.railY + .1735, z + .033), 0xd9dde0)); return P.geo('t'); }
export function sleeperGeo(){ const g = box(-.12, T.slY0, -1.3, .12, T.slY1, 1.3); bakeAO(g, (p, n) => .72 + .28 * Math.min(1, (p.y - T.slY0) / .2)); return g; }
export function plateGeo(){ const P = new Parts(); [-T.ga, T.ga].forEach(z => { P.add('p', box(-.15, T.slY1, z - .1, .15, T.railY, z + .1), 0x2f3236);
  P.add('p', box(-.05, T.railY, z - .075, .05, T.railY + .03, z + .075), 0x3a3d40); }); return P.geo('p'); }
const trackMats = () => once('trackMats', () => ({ballast:gravelMaterial({seed:103, snow:.1, tone:[.95, .9, .84]}), rail:matteMaterial({rough:.7, metal:.35}), top:metalMaterial({color:0xffffff, rough:.25}), sleeper:concreteMaterial(), plate:matteMaterial({rough:.6, metal:.3})}));
// 맵용: x0~x1 사이에 선로 한 줄을 깐다 (z는 선로 중심). 침목은 sx0~sx1 구간에만 깐다(멀리는 안 보이므로). 그리기 5회.
export function layTrack(parent, {x0, x1, z, sx0 = x0, sx1 = x1, y = 0, ballast = true}){
  const M = trackMats(), len = (x1 - x0) / U, g = new THREE.Group(); g.position.set((x0 + x1) / 2, y, z); g.scale.setScalar(U); parent.add(g);
  const add = (geo, mat, cast) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
  if (ballast) add(ballastGeo(len), M.ballast, false);
  add(railsGeo(len), M.rail, true); add(railTopGeo(len), M.top, false);
  const n = Math.floor((sx1 - sx0) / U / T.pitch), slp = new THREE.InstancedMesh(sleeperGeo(), M.sleeper, n), plt = new THREE.InstancedMesh(plateGeo(), M.plate, n), m4 = new THREE.Matrix4(), R = mulberry(Math.round(z * 10));
  for (let i = 0; i < n; i++) { const x = (sx0 - (x0 + x1) / 2) / U + (i + .5) * T.pitch + (R() - .5) * .02; m4.makeRotationY((R() - .5) * .012).setPosition(x, 0, 0); slp.setMatrixAt(i, m4); plt.setMatrixAt(i, m4); }
  [slp, plt].forEach(m => { m.receiveShadow = true; m.castShadow = false; m.computeBoundingSphere(); g.add(m); });
  return g;
}
defineProp('trackModule', {label:'선로 (10m 한 토막)', category:'간이역', isNewStyle:true,
  usage:"layTrack(root, {x0: -800, x1: 1400, z: 44.5, sx0: -150, sx1: 790});  // 맵에서는 함수로 길게 깐다", build(o = {}){
    const len = o.len || 10, P = new Parts(), M = trackMats(); P.add('bal', ballastGeo(len)); P.add('rail', railsGeo(len)); P.add('top', railTopGeo(len));
    for (let i = 0; i < Math.round(len / T.pitch); i++) { const x = -len / 2 + (i + .5) * T.pitch; P.add('slp', xf(sleeperGeo(), {x})); P.add('plt', xf(plateGeo(), {x})); }
    const g = assemble(P, [['bal', M.ballast, false], ['rail', M.rail], ['top', M.top, false], ['slp', M.sleeper, false], ['plt', M.plate, false]], [4.6, .51, len]);
    g.children[0].rotation.y = Math.PI / 2; return g; }});

// ───────── 차막이: 측선 끝. 침목을 잘라 만든 가로보를 노란 기둥 두 개가 받친다 (역의끝 사진) ─────────
defineProp('bufferStop', {label:'차막이', category:'간이역', isNewStyle:true, colliders:[{r:[-1.4 * U, -.25 * U, 1.4 * U, .25 * U]}],
  usage:"W.place('bufferStop', {x: 322, z: 57.2, rot: -Math.PI / 2});  // 정면(+z)이 열차가 오는 쪽", build(){
    const P = new Parts(), w = woodMaterial({seed:17, light:[.42, .31, .22], dark:[.24, .17, .12]});
    P.add('wood', box(-1.35, .62, -.12, 1.35, .9, .12, .02), 0xffffff); P.add('wood', box(-1.25, .32, -.1, 1.25, .5, .1, .015), 0xd8d2c8);         // 가로보 두 단
    [-1.05, 1.05].forEach(x => { P.add('pnt', box(x - .085, 0, -.085, x + .085, 1.12, .085, .012), 0xe9b71a);
      for (let k = 0; k < 3; k++) P.add('pnt', box(x - .088, .92 - k * .14, -.088, x + .088, .98 - k * .14, .088, .004), 0x1e2124);                 // 꼭대기 검은 띠
      P.add('pnt', xf(box(-.05, 0, -.05, .05, 1.0, .05, .01), {rx:.6, x, z:-.6}), 0xe9b71a); });                                                // 뒤 버팀대
    P.add('pnt', box(-.32, .92, .125, .32, 1.24, .14, .01), 0xf3f3ef); P.add('pnt', box(-.27, .97, .14, .27, 1.19, .146), 0xc6281f);              // 정지 표시판
    P.add('snw', ridge([-1.25, -.6, 0, .6, 1.25].map(x => V(x, .9, 0)), .2, .07)); P.add('snw', xf(blob(.28, .08, .14, {seed:4}), {x:-1.05, y:1.12}));
    P.bake('pnt', groundAO(.3, .7));
    return assemble(P, [['wood', w], ['pnt', steel()], ['snw', snowMaterial({seed:51}), false]], [2.7, 1.24, .9]); }});

// ───────── 승강장: 블록 쌓은 옆벽, 아스팔트 윗면, 노란 안전선, 점자블록 띠, 양 끝 경사로 ─────────
export const PLATFORM = {h:.5, ramp:3};
defineProp('platformModule', {label:'승강장', category:'간이역', isNewStyle:true,
  usage:"W.place('platformModule', {x: 272, z: 50.7, len: 59.5, wid: 5.1});  // len·wid는 미터. 양쪽 긴 변이 선로를 본다 (섬식). ramp: 끝 경사로 길이", build(o = {}){
    const L = o.len || 12, Wd = o.wid || 5, H = o.h || PLATFORM.h, ramp = o.ramp === undefined ? PLATFORM.ramp : o.ramp, hw = Wd / 2, hl = L / 2 - ramp, P = new Parts();
    // 윗면(가운데)과 끝 경사로: 단면 높이 함수
    const yAt = x => { const d = Math.abs(x) - hl; return d <= 0 ? H : Math.max(0, H * (1 - d / Math.max(ramp, .01))); };
    const xs = [-L / 2, -hl, hl, L / 2];
    P.add('asp', (() => { const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = []; xs.forEach((x, i) => { [-hw + .3, hw - .3].forEach(z => { pos.push(x, yAt(x) + .002, z); uv.push(x, z); }); });
      for (let i = 0; i < 3; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; })(), 0xffffff);
    // 옆벽 (콘크리트 블록): 긴 변 두 개와 경사로 아래 쐐기
    [-1, 1].forEach(s => { const sh = new THREE.Shape([[-L / 2, 0], [L / 2, 0], [L / 2, .02], [hl, H], [-hl, H], [-L / 2, .02]].map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(sh, {depth:.3, bevelEnabled:false}); g.translate(0, 0, s > 0 ? hw - .3 : -hw); P.add('con', uvMeters(g), 0xd9d6cf);
      for (let x = -hl + 1; x < hl; x += 1) P.add('mat', box(x - .006, .04, s * hw - .004, x + .006, H - .05, s * hw + .004), 0x8e8b84);                    // 블록 줄눈
      P.add('con', box(-hl, H - .06, s * hw - .32, hl, H + .02, s * hw + .02, .015), 0xe9e7e1);                                                            // 갓돌
      P.add('lin', box(-hl + .2, H + .021, s * (hw - .55) - .075, hl - .2, H + .024, s * (hw - .55) + .075), 0xe9b824); });                                 // 노란 안전선
    // 가운데 쐐기 채움 (경사로 아래)
    const fill = new THREE.Shape([[-L / 2, 0], [L / 2, 0], [hl, H], [-hl, H]].map(([x, y]) => new THREE.Vector2(x, y))); const fg = new THREE.ExtrudeGeometry(fill, {depth:Wd - .6, bevelEnabled:false}); fg.translate(0, -.004, -hw + .3); P.add('con', uvMeters(fg), 0xbfbcb5);
    // 점자블록 띠 (가운데 길게) 와 눈 얼룩
    P.add('lin', box(-hl + .5, H + .021, -.15, hl - .5, H + .026, .15), 0xe2b52a);
    const R = mulberry(7); for (let i = 0; i < Math.max(2, Math.round(L / 5)); i++) P.add('snw', xf(blob(.5 + R() * .9, .035, .3 + R() * .5, {seed:i, bump:.2}), {x:-hl + R() * hl * 2, y:H, z:(R() - .5) * (Wd - 1.4)}));
    P.bake('con', groundAO(.2, .7));
    return assemble(P, [['con', concreteMaterial(), false], ['asp', asphaltMaterial(), false], ['mat', matteMaterial(), false], ['lin', roadPaintMaterial(), false], ['snw', snowMaterial({seed:52}), false]], [L, H, Wd]); }});

// ───────── 대합 지붕: 뒤쪽 H형강 기둥, 앞(선로 쪽)으로 올라가는 파란 골강판 외쪽지붕 ─────────
// 기둥 줄이 원점(z = 0), 지붕은 앞(+z)으로 4.4m, 뒤로 0.5m 나온다. 처마 높이 뒤 2.9m · 앞 3.5m.
export const CANOPY = {back:-.5, front:4.4, yb:2.9, yf:3.5};
const corr = (L, z0, y0, z1, y1, pitch = .076, amp = .016) => {           // 골강판: x를 따라 물결, z(경사) 방향으로 곧은 골
  const n = Math.round(L / (pitch / 4)), pos = [], idx = [], uv = [];
  for (let i = 0; i <= n; i++) { const x = -L / 2 + L * i / n, w = Math.sin(i / 4 * Math.PI * 2) * amp; pos.push(x, y0 + w, z0, x, y1 + w, z1); uv.push(x, 0, x, Math.hypot(z1 - z0, y1 - y0)); }
  for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
defineProp('stationCanopy', {label:'대합 지붕 (파란 골강판)', category:'간이역', isNewStyle:true, blocksCamera:false,
  colliders:[],
  usage:"W.place('stationCanopy', {x: 277, z: 53.3, rot: Math.PI, len: 25.5});  // 기둥 줄이 원점, 지붕이 정면(+z)으로 4.4m", build(o = {}){
    const L = o.len || 25.5, C = CANOPY, n = Math.max(2, Math.round(L / 4.2)), P = new Parts(), BL = 0x2f6fb0, POST = 0x9fb3c4;
    const yAt = z => C.yb + (C.yf - C.yb) * (z - C.back) / (C.front - C.back), up = Math.atan2(C.yf - C.yb, C.front - C.back);
    // 지붕판 (윗면 파랑, 아랫면 옅은 회청색) — 두 장을 겹쳐 양면을 칠한다
    const top = corr(L, C.back, C.yb + .06, C.front, C.yf + .06); P.add('pnt', top, BL);
    const bot = corr(L, C.back, C.yb + .055, C.front, C.yf + .055); { const ix = bot.getIndex().array; for (let k = 0; k < ix.length; k += 3) { const q = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = q; } bot.computeVertexNormals(); } P.add('pnt', bot, 0x8fa6ba);
    // 테두리(물받이 판)와 뒤 물받이
    P.add('pnt', xf(box(-L / 2 - .03, -.12, -.02, L / 2 + .03, .1, .02), {rx:0, y:C.yf + .05, z:C.front}), BL);
    [-1, 1].forEach(s => P.add('pnt', xf(box(-.02, -.1, 0, .02, .1, Math.hypot(C.front - C.back, C.yf - C.yb)), {rx:-up, x:s * (L / 2 + .02), y:C.yb + .06, z:C.back}), BL));
    P.add('met', xf(tube([V(-L / 2, 0, 0), V(L / 2, 0, 0)], .06, {radial:8}), {y:C.yb - .02, z:C.back - .04}), 0xb9c0c6);
    // 기둥 (H형강) · 서까래 · 도리
    for (let i = 0; i < n; i++) { const x = -L / 2 + .3 + (L - .6) * i / (n - 1), h = Math.min(yAt(-.11), yAt(.11)) - .1;   // 기둥 끝은 서까래 밑 (지붕을 뚫지 않게)
      P.add('pst', box(x - .1, 0, -.11, x + .1, h, -.095), POST); P.add('pst', box(x - .1, 0, .095, x + .1, h, .11), POST); P.add('pst', box(x - .008, 0, -.095, x + .008, h, .095), POST);
      P.add('pst', box(x - .17, 0, -.17, x + .17, .02, .17), 0x7c8a96); P.add('con', box(x - .25, -.05, -.25, x + .25, .06, .25, .02), 0xcfccc4);
      P.add('pst', xf(box(-.05, -.09, 0, .05, .09, Math.hypot(C.front - C.back, C.yf - C.yb) - .06), {rx:-up, x, y:C.yb - .06, z:C.back}), POST);                // 서까래
      P.add('pst', tube([V(x, h - .85, .12), V(x, yAt(1.35) - .1, 1.35)], .035, {radial:6}), POST); }                                                       // 가새: 기둥 중간에서 서까래 밑으로
    [0, 1.4, 2.8, 4.1].forEach(z => P.add('pst', box(-L / 2 + .1, yAt(z) - .08, z - .04, L / 2 - .1, yAt(z) - .005, z + .04), POST));                          // 도리
    // 지붕 위 눈: 기운 판 위에 얇게, 가장자리는 얼룩지게
    const R = mulberry(5);                                                                                                       // 지붕 위 눈은 군데군데 (파란 골이 보이게)
    for (let i = 0; i < Math.round(L / 1.6); i++) { const z = C.back + .4 + R() * (C.front - C.back - .8); P.add('snw', xf(blob(.4 + R() * .7, .05, .3 + R() * .45, {seed:i, bump:.25}), {x:-L / 2 + .5 + R() * (L - 1), y:yAt(z) + .07, z})); }
    P.add('snw', ridge(Array.from({length:9}, (_, k) => V(-L / 2 + .3 + (L - .6) * k / 8, C.yb + .08, C.back + .12)), .25, .05));
    P.bake('pst', groundAO(.4, .75));
    return assemble(P, [['pnt', steel()], ['pst', steel()], ['met', metalMaterial()], ['con', concreteMaterial(), false], ['snw', snowMaterial({seed:53}), false]], [L, C.yf + .2, C.front - C.back]); }});

// ───────── 회색 세로살 난간 (2m 한 칸): 승강장 뒤, 철길 경계 ─────────
defineProp('railFence', {label:'회색 세로살 난간 (2m)', category:'간이역', isNewStyle:true, colliders:[{r:[-1 * U, -.05 * U, 1 * U, .05 * U]}],
  usage:"W.placeMany('railFence', [{x, z, rot}, ...]);  // 한 칸 2m, 높이 1.2m", build(o = {}){
    const P = new Parts(), h = o.h || 1.2, G = 0x8e989f;
    [-1, 1].forEach(x => P.add('st', box(x - .035, 0, -.035, x + .035, h + .05, .035, .008), G));
    [.12, h - .04].forEach(y => P.add('st', box(-1, y - .025, -.022, 1, y + .025, .022, .006), G));
    for (let x = -.92; x <= .92; x += .092) P.add('st', box(x - .009, .12, -.012, x + .009, h - .04, .012), G);
    P.add('snw', ridge([-.95, -.3, .3, .95].map(x => V(x, h + .02, 0)), .07, .035));
    P.bake('st', groundAO(.3, .7));
    return assemble(P, [['st', steel()], ['snw', snowMaterial({seed:54}), false]], [2, h, .1]); }});

// ───────── 역명판: 흰 판에 큰 역 이름, 아래 파란 띠에 이웃 역 ─────────
let signMat = null;
const stationSignMat = () => signMat || (signMat = decalMaterial(canvasTex(1024, 384, g => {
  g.fillStyle = '#f6f7f4'; g.fillRect(0, 0, 1024, 384); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1d2a3a'; g.font = '150px ' + FONT_D; g.fillText('동 화', 512, 120); g.fillStyle = '#5a6672'; g.font = '40px ' + FONT_B; g.fillText('Donghwa', 512, 214);
  g.fillStyle = '#2a5ea8'; g.fillRect(0, 262, 1024, 122); g.fillStyle = '#ffffff'; g.font = '62px ' + FONT_D; g.textAlign = 'left'; g.fillText('← 솔 내', 40, 324); g.textAlign = 'right'; g.fillText('강 변 →', 984, 324);
  g.strokeStyle = '#c9ced3'; g.lineWidth = 10; g.strokeRect(5, 5, 1014, 374); }), {rough:.5}));
defineProp('stationSign', {label:'역명판', category:'간이역', isNewStyle:true, colliders:[{c:[-1.31 * U, 0, .1 * U]}, {c:[1.31 * U, 0, .1 * U]}],
  usage:"W.place('stationSign', {x: 245, z: 50.7, rot: 0});  // 2.4m × 0.9m 판, 앞뒤 같은 그림", build(){
    const P = new Parts(), D = new Parts(), y0 = 1.25, y1 = 2.15;
    [-1.31, 1.31].forEach(x => { P.add('st', box(x - .08, 0, -.08, x + .08, y1 + .14, .08, .015), 0x2a5ea8); P.add('st', box(x - .09, y1 + .14, -.09, x + .09, y1 + .17, .09, .01), 0x234f8f); P.add('con', box(x - .18, -.04, -.18, x + .18, .06, .18, .02), 0xcfccc4); });   // 굵은 기둥이 판 끝을 감싼다
    P.add('st', box(-1.27, y0 - .04, -.045, 1.27, y1 + .04, .045, .02), 0x2b3138);
    D.add('d', quadZ(-1.2, y0, 1.2, y1, .047)); D.add('d', quadZ(-1.2, y0, 1.2, y1, -.047, undefined, true));
    P.add('snw', ridge([-1.2, -.4, .4, 1.2].map(x => V(x, y1 + .04, 0)), .1, .05)); [-1.31, 1.31].forEach(x => P.add('snw', xf(blob(.1, .05, .1, {seed:5, seg:8}), {x, y:y1 + .17})));
    return assemble(P, [['st', steel()], ['con', concreteMaterial(), false], ['snw', snowMaterial({seed:55}), false]], [2.8, 2.35, .36], [new THREE.Mesh(D.geo('d'), stationSignMat())]); }});

// ───────── 육교: 북쪽 계단 → 상판 → 남쪽 계단. 실제로 걸어 올라가 도로를 건넌다 ─────────
// 원점은 전체 가운데, 다리는 z 방향으로 놓인다. 바깥 기둥은 piers(상판 위 z 위치, m)에 선다.
export const FOOTBRIDGE = {hw:1.2, rise:4.6, run:8, deck:27.2, piers:[-13.6, -1.7, 8.5, 13.6]};
const FB = FOOTBRIDGE, FBL = FB.deck / 2 + FB.run;
// 충돌 (2026-11-15): 계단 낮은 쪽(높이 2m 아래)은 누구나 막고, 그 위 난간은 위에 선 사람만 막는다. 밑을 지나는 사람은 기둥과 낮은 계단 밑 입구에만 막힌다.
const FB_LOW = FB.run * 2 / FB.rise, FB_UP = 1.9 * UNIT;
const FB_COLLIDERS = [-1, 1].flatMap(s => { const xa = s < 0 ? -(FB.hw + .14) : FB.hw, xb = s < 0 ? -FB.hw : FB.hw + .14;
  return [{r:[xa * U, -FBL * U, xb * U, (-FBL + FB_LOW) * U]}, {r:[xa * U, (FBL - FB_LOW) * U, xb * U, FBL * U]}, {r:[xa * U, (-FBL + FB_LOW) * U, xb * U, (FBL - FB_LOW) * U], y0:1}]; })   // (2026-11-17) 난간은 발 높이 1 이상이면 막는다: 계단을 오르며 높이가 늦게 따라와도 난간을 뚫고 떨어지지 않게
  .concat([-1, 1].map(s => ({r:[-FB.hw * U, (s * (FBL - FB_LOW) - .15) * U, FB.hw * U, (s * (FBL - FB_LOW) + .15) * U], y1:1})))
  .concat(FB.piers.flatMap(z => [-1, 1].map(s => ({r:[(s * (FB.hw + .22) - .25) * U, (z - .25) * U, (s * (FB.hw + .22) + .25) * U, (z + .25) * U], y1:1}))));
export function footBridgeHeight(xm, zm){                                   // 다리 위 높이 (미터, 다리 밖이면 null)
  if (Math.abs(xm) > FB.hw || Math.abs(zm) > FBL) return null;
  const a = Math.abs(zm); return a <= FB.deck / 2 ? FB.rise : FB.rise * (FBL - a) / FB.run;
}
defineProp('footBridge', {label:'육교', category:'간이역', isNewStyle:true, blocksCamera:false,
  height:(x, z, y) => { const h = footBridgeHeight(x / U, z / U); if (h === null) return null; return y !== undefined && h * U > y + 1.2 ? null : h * U; },   // 1.2보다 높으면 밑으로 지나간다
  colliders:FB_COLLIDERS,
  usage:"W.place('footBridge', {x: 230.5, z: 80});  // 폭 2.4m, 높이 4.6m, 길이 43.2m. 계단 바닥이 양 끝", build(){
    const P = new Parts(), hw = FB.hw, H = FB.rise, D2 = FB.deck / 2, BL = 0x4f7d96, GR = 0xb9c3ca;
    const nSteps = 26, rs = H / nSteps, run = FB.run / nSteps;
    // 상판: 바닥판(미끄럼 방지 녹회색) + 양옆 거더 + 밑면
    P.add('deck', box(-hw, H - .03, -D2, hw, H, D2), 0x6d7b72);
    [-1, 1].forEach(s => { P.add('pnt', box(s * hw - (s > 0 ? 0 : .12), H - .75, -D2 - .1, s * hw + (s > 0 ? .12 : 0), H + .12, D2 + .1, .02), BL); });
    P.add('pnt', box(-hw, H - .62, -D2, hw, H - .03, D2), 0x5d7486);
    // 계단 두 벌 (북: -z, 남: +z): 디딤판 + 양옆 경사 보 + 논슬립 띠
    [-1, 1].forEach(dir => { for (let k = 0; k < nSteps; k++) { const y = H - (k + 1) * rs, z0 = dir * (D2 + k * run), z1 = dir * (D2 + (k + 1) * run);
        P.add('deck', box(-hw + .02, y, Math.min(z0, z1), hw - .02, y + rs, Math.max(z0, z1)), 0x8a948d);
        const ze = z1 - dir * .002; P.add('lin', box(-hw + .06, y + rs, Math.min(ze, ze - dir * .07), hw - .06, y + rs + .004, Math.max(ze, ze - dir * .07)), 0xd8b23a); }      // 논슬립 띠 (디딤판 앞 끝)
      const ang = Math.atan2(H, FB.run), len = Math.hypot(H, FB.run);
      [-1, 1].forEach(s => { const x = s * (hw + .02); P.add('pnt', loft([[H, dir * D2], [0, dir * FBL]].map(([y, z]) => [V(x - .06, y - .35, z), V(x + .06, y - .35, z), V(x + .06, y + .12, z), V(x - .06, y + .12, z)])), BL); }); });   // 계단 옆 경사 보
    // 기둥: 상판 양옆 바깥에 원형 강관 + 콘크리트 기초. 계단 바닥 쪽은 짧은 받침.
    FB.piers.forEach(z => [-1, 1].forEach(s => { P.add('pnt', xf(new THREE.CylinderGeometry(.16, .16, H - .6, 12), {x:s * (hw + .22), y:(H - .6) / 2, z}), BL);
      P.add('pnt', box(s * (hw + .22) - .35, H - .7, z - .2, s * (hw + .22) + .35, H - .55, z + .2), BL); P.add('con', box(s * (hw + .22) - .32, -.05, z - .32, s * (hw + .22) + .32, .25, z + .32, .03), 0xcac7bf); }));
    // 난간: 위 손잡이 관 + 세로살 (상판과 계단을 한 줄로)
    const rail = (s, pts) => { P.add('met', tube(pts.map(p => V(s * (hw + .06), p[1] + 1.1, p[0])), .03, {radial:8}), GR); P.add('met', tube(pts.map(p => V(s * (hw + .06), p[1] + .55, p[0])), .018, {radial:6}), GR);
      for (let i = 0; i < pts.length - 1; i++) { const [za, ya] = pts[i], [zb, yb] = pts[i + 1], n = Math.max(1, Math.round(Math.abs(zb - za) / .14));
        for (let k = 0; k < n; k++) { const t = (k + .5) / n, z = za + (zb - za) * t, y = ya + (yb - ya) * t; P.add('bar', box(s * (hw + .06) - .009, y + .05, z - .009, s * (hw + .06) + .009, y + 1.08, z + .009), GR); } } };
    [-1, 1].forEach(s => rail(s, [[-FBL, 0], [-D2, H], [D2, H], [FBL, 0]]));
    // 눈: 상판 가장자리 이랑, 거더 위
    [-1, 1].forEach(s => { P.add('snw', ridge([-D2, -D2 / 2, 0, D2 / 2, D2].map(z => V(s * (hw - .15), H, z)), .3, .06)); P.add('snw', ridge([-D2, 0, D2].map(z => V(s * (hw + .06), H + .12, z)), .14, .05)); });
    P.bake('pnt', groundAO(.6, .72));
    return assemble(P, [['pnt', steel()], ['deck', matteMaterial({rough:.9})], ['lin', matteMaterial(), false], ['met', metalMaterial({rough:.35})], ['bar', metalMaterial({rough:.4}), false], ['con', concreteMaterial(), false], ['snw', snowMaterial({seed:56}), false]], [2.9, H + 1.2, FBL * 2]); }});

// ───────── 붉은 벽돌벽 (2.4m 한 칸): 콘크리트 받침, 벽돌 몸통, 갓돌, 칸 끝 기둥 ─────────
export const BRICKWALL = {len:2.4, h:2.6};
defineProp('brickWall', {label:'붉은 벽돌벽 (2.4m)', category:'경계', isNewStyle:true, colliders:[{r:[-1.2 * U, -.2 * U, 1.2 * U, .2 * U]}],
  usage:"W.placeMany('brickWall', [{x, z, rot}, ...]);  // 한 칸 2.4m, 높이 2.6m. 칸 오른쪽(+x) 끝에 기둥", build(){
    const P = new Parts(), L = BRICKWALL.len, H = BRICKWALL.h;
    P.add('con', box(-L / 2, -.05, -.16, L / 2, .3, .16), 0xc9c5bc);
    P.add('brk', box(-L / 2, .3, -.12, L / 2 - .2, H - .08, .12), 0xffffff);
    P.add('con', box(-L / 2, H - .08, -.17, L / 2 - .2, H + .02, .17), 0xdcd8cf);
    P.add('brk', box(L / 2 - .2, .3, -.2, L / 2 + .2, H + .1, .2), 0xf0e4dc); P.add('con', box(L / 2 - .24, H + .1, -.24, L / 2 + .24, H + .2, .24), 0xdcd8cf);
    P.add('snw', ridge([-L / 2, 0, L / 2 - .2].map(x => V(x, H + .02, 0)), .3, .07, 3)); P.add('snw', xf(blob(.22, .08, .22, {seed:3, seg:8}), {x:L / 2, y:H + .2}));
    P.bake('brk', (p, n) => (.72 + .28 * Math.min(1, (p.y - .3) / .6)) * (.85 + .15 * (n.y * .5 + .5)));
    return assemble(P, [['brk', brickWallMaterial()], ['con', concreteMaterial()], ['snw', snowMaterial({seed:57}), false]], [L + .4, H + .2, .48]); }});

// ───────── 도로변 울타리 (2m 한 칸): 들어갈 수 없는 도로 양옆 ─────────
defineProp('roadFence', {label:'도로변 울타리 (2m)', category:'경계', isNewStyle:true, colliders:[{r:[-1 * U, -.05 * U, 1 * U, .05 * U]}],
  variants:[{label:'강변 난간 (세로살 없음)', opts:{light:true}}],
  usage:"W.placeMany('roadFence', [{x, z, rot}, ...], {light});  // 한 칸 2m, 높이 1.1m. 기둥에 노란 반사판. light면 위 · 가운데 관만 있는 강변 난간", build(o = {}){
    const P = new Parts(), G = 0x9aa4ab, h = 1.1;
    P.add('st', box(.96, 0, -.04, 1.04, h + .04, .04), G);
    P.add('st', tube([V(-1, h, 0), V(1, h, 0)], .03, {radial:6, caps:false}), G);
    if (o.light) P.add('st', tube([V(-1, h * .55, 0), V(1, h * .55, 0)], .022, {radial:5, caps:false}), G);
    else { P.add('st', box(.95, h - .25, .04, 1.05, h - .13, .05), 0xe9b824); P.add('st', box(-1, .16, -.02, 1, .2, .02), G); for (let x = -.9; x <= .9; x += .15) P.add('st', box(x - .011, .18, -.011, x + .011, h - .02, .011), G); }
    P.add('con', box(.86, -.03, -.1, 1.14, .05, .1), 0xcac6bd);
    P.add('snw', ridge([-.95, 0, .95].map(x => V(x, h + .02, 0)), .08, .035, 3));
    P.bake('st', groundAO(.3, .72));
    return assemble(P, [['st', steel(), !o.light], ['con', concreteMaterial(), false], ['snw', snowMaterial({seed:58}), false]], [2.1, h, .2]); }});
