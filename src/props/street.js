// 바깥 도로와 강변 소품: 아스팔트 과속방지턱, 점자블록 띠, 갈대 무더기.
//   과속방지턱은 사용자 참고 사진처럼 아스팔트 둔덕에 노랑 · 흰 빗금을 칠한 형태 (단지 안의 고무 블록 방지턱과 다른 것).
//   점자블록은 횡단보도 앞 보도에 까는 노란 점형 블록(30cm 한 장에 점 25개). 미터 단위, 원점은 바닥 가운데.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { box, tube, blob, xf, Parts, groundAO, bakeAO } from '../core/meshkit.js';
import { asphaltMaterial, roadPaintMaterial, plasticMaterial, snowMaterial, matteMaterial, decalMaterial, metalMaterial } from '../core/texkit.js';
import { canvasTex } from '../core/gfx.js';
import { assemble, mulberry, quadZ } from './kit.js';
import { UNIT, FONT_D } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;

// ── 아스팔트 과속방지턱: 진행 방향(z) 길이 3.6m, 높이 10cm의 매끈한 둔덕. 폭(x)은 w. 윗면에 노랑 · 흰 빗금 ──
export const HUMP = {len:4.2, h:.16};
const humpY = z => { const t = Math.min(1, Math.max(0, z / HUMP.len + .5)); return HUMP.h * Math.sin(Math.PI * t) ** 1.4; };
defineProp('roadHump', {label:'과속방지턱 (아스팔트)', category:'도로', isNewStyle:true, groundPreview:true,
  height:(x, z) => Math.abs(z) <= HUMP.len / 2 * U && Math.abs(x) <= 3.6 * U ? humpY(z / U) * U : null,
  usage:"W.place('roadHump', {x: 300, z: 122, rot: Math.PI / 2, w: 6});  // 진행 방향이 z. w는 도로 폭(m)", build(o = {}){
    const w = o.w || 6, n = 24, P = new Parts();
    // 둔덕 윗면 (격자) + 양옆 마감
    const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) { const z = -HUMP.len / 2 + HUMP.len * i / n, y = humpY(z); [-w / 2, w / 2].forEach(x => { pos.push(x, y + .004, z); uv.push(x, z); }); }
    for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 2, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 1);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); P.add('asp', g, 0xd9dcde);
    [-1, 1].forEach(s => { const e = new THREE.BufferGeometry(), p = [], ii = []; for (let i = 0; i <= n; i++) { const z = -HUMP.len / 2 + HUMP.len * i / n; p.push(s * w / 2, 0, z, s * w / 2, humpY(z) + .004, z); }
      for (let i = 0; i < n; i++) s > 0 ? ii.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3) : ii.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      e.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); e.setIndex(ii); e.computeVertexNormals(); P.add('asp', e, 0x9aa0a6); });
    // 빗금: 폭 45cm 띠를 비스듬히(진행 방향과 45도) 노랑 · 흰 번갈아 칠한다. 둔덕 곡면을 따라 띄운다.
    const sw = .45, slope = 1, m = 20;                                                   // 띠 폭 45cm, 노랑 · 흰 띠가 사이 없이 붙는다
    for (let k = 0, x0 = -w / 2 - HUMP.len - sw; x0 < w / 2; k++, x0 += sw) {
      const sg = new THREE.BufferGeometry(), sp = [], si = [];
      for (let i = 0; i <= m; i++) { const z = -HUMP.len / 2 + .15 + (HUMP.len - .3) * i / m, y = humpY(z) + .009, a = Math.max(-w / 2, Math.min(w / 2, x0 + (z + HUMP.len / 2) * slope)), b = Math.max(-w / 2, Math.min(w / 2, x0 + sw + (z + HUMP.len / 2) * slope)); sp.push(a, y, z, b, y, z); }
      for (let i = 0; i < m; i++) si.push(i * 2, i * 2 + 2, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 1);
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); sg.computeVertexNormals(); P.add('lin', sg, k % 2 ? 0xf2f4f5 : 0xe9b824); }
    return assemble(P, [['asp', asphaltMaterial(), false], ['lin', roadPaintMaterial(), false]], [w, HUMP.h, HUMP.len]); }});

// ── 점자블록 띠 (점형): 30cm 노란 블록 cols × rows. 점은 낮은 사각뿔대 (높이 5mm) ──
// 점 하나: 바닥이 없는 낮은 사각뿔대 (삼각형 10개)
const dotGeo = (() => { let g = null; return () => g || (g = (() => { const a = .0125, b = .008, h = .006, P = [[-a, 0, -a], [a, 0, -a], [a, 0, a], [-a, 0, a], [-b, h, -b], [b, h, -b], [b, h, b], [-b, h, b]];
  const idx = [4, 5, 6, 4, 6, 7, 0, 5, 4, 0, 1, 5, 1, 6, 5, 1, 2, 6, 2, 7, 6, 2, 3, 7, 3, 4, 7, 3, 0, 4], c = new THREE.BufferGeometry();
  c.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3)); c.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(16).fill(0), 2)); c.setIndex(idx); c.computeVertexNormals(); return c; })()); })();
defineProp('tactileStrip', {label:'점자블록 띠 (횡단보도 앞)', category:'도로', isNewStyle:true, groundPreview:true,
  usage:"W.placeMany('tactileStrip', [{x, z, rot}], {cols: 14, rows: 2});  // 한 장 30cm. 기본 4.2m × 0.6m (x 방향으로 길다)", build(o = {}){
    const cols = o.cols || 14, rows = o.rows || 2, P = new Parts(), t = .3, R = mulberry(3);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const cx = (i - (cols - 1) / 2) * t, cz = (j - (rows - 1) / 2) * t, k = .94 + R() * .08;
      P.add('blk', box(cx - t / 2 + .004, -.01, cz - t / 2 + .004, cx + t / 2 - .004, .012, cz + t / 2 - .004), new THREE.Color(.92 * k, .72 * k, .13 * k).getHex());
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) P.add('blk', xf(dotGeo().clone(), {x:cx + (a - 1) * .09, y:.012, z:cz + (b - 1) * .09}), 0xe9b621); }
    P.add('snw', xf(blob(.35, .025, .2, {seed:2, bump:.2, seg:10}), {x:cols * t / 2 - .3, z:-rows * t / 2 + .1}));
    return assemble(P, [['blk', plasticMaterial({rough:.6}), false], ['snw', snowMaterial({seed:61}), false]], [cols * t, .02, rows * t]); }});

// ── 갈대 무더기: 마른 줄기 아홉 대와 이삭, 밑동의 눈 ──
defineProp('reedClump', {label:'갈대 무더기', category:'조경', isNewStyle:true,
  usage:"W.placeMany('reedClump', [{x, z, rot, s}, ...]);  // 높이 약 1.6m", build(o = {}){
    const P = new Parts(), R = mulberry(o.seed || 9);
    for (let i = 0; i < 7; i++) { const a = R() * Math.PI * 2, r = R() * .25, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 1.1 + R() * .6, lean = .15 + R() * .3, la = R() * Math.PI * 2;
      const pts = [0, .35, .7, 1].map(t => V(x + Math.cos(la) * lean * t * t, h * t, z + Math.sin(la) * lean * t * t));
      P.add('stk', tube(pts, t => .009 * (1 - t * .6), {radial:3, caps:false}), 0xb9a77f);
      const tip = pts[3], dir = pts[3].clone().sub(pts[2]).normalize(), pl = .26 + R() * .1;
      const plume = new THREE.ConeGeometry(.035, pl, 4, 1, true); plume.translate(0, pl / 2, 0); plume.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir)); plume.translate(tip.x - dir.x * .05, tip.y - dir.y * .05, tip.z - dir.z * .05);
      P.add('stk', plume, 0xd8c9a4); }
    for (let i = 0; i < 3; i++) { const a = i * 2.1, l = .35 + R() * .3; P.add('stk', tube([V(0, 0, 0), V(Math.cos(a) * l * .5, .25, Math.sin(a) * l * .5), V(Math.cos(a) * l, .3, Math.sin(a) * l)], .012, {radial:3, caps:false}), 0xa8976d); }  // 꺾인 잎
    P.add('snw', blob(.42, .12, .38, {seed:o.seed || 9, bump:.2, seg:7}));
    P.bake('stk', groundAO(.6, .62));
    return assemble(P, [['stk', matteMaterial({rough:.9})], ['snw', snowMaterial({seed:62}), false]], [1, 1.8, 1]); }});

// ── 눈 더미: 쓸어 모은 낮고 길쭉한 눈 (네 가지 모양). 길가 · 경계석 · 나무 밑에 흩어 놓는다 ──
defineProp('snowDrift', {label:'눈 더미', category:'조경', isNewStyle:true,
  variants:[1, 2, 3].map(v => ({label:'모양 ' + (v + 1), opts:{v}})),
  usage:"W.placeMany('snowDrift', [{x, z, rot, s}, ...], {v: 0});  // v: 0~3, 길이 약 1~2m", build(o = {}){
    const v = o.v || 0, P = new Parts(), R = mulberry(31 + v * 7), L = [1.2, 1.8, .9, 2.2][v % 4], H = [.16, .22, .13, .26][v % 4];
    P.add('snw', blob(L / 2, H, L * .28, {seed:v + 3, bump:.22, seg:9}));
    for (let i = 0; i < 1 + (v % 3); i++) P.add('snw', xf(blob(L * (.18 + R() * .12), H * (.5 + R() * .4), L * (.14 + R() * .1), {seed:v * 5 + i, bump:.25, seg:6}), {x:(R() - .5) * L * .8, z:(R() - .5) * L * .3}));
    if (v === 1 || v === 3) P.add('drt', xf(blob(L * .22, H * .35, L * .1, {seed:v + 9, bump:.3, seg:6}), {x:L * .2, y:.01, z:L * .2}), 0x8d8a84);     // 녹아 더러워진 자리
    return assemble(P, [['snw', snowMaterial({seed:63 + v}), false], ['drt', matteMaterial({rough:.95}), false]], [L, H, L * .56]); }});

// ── 마른 풀 포기: 화단 · 자갈밭에 흩어 놓는 겨울 풀 (세 가지) ──
defineProp('grassTuft', {label:'마른 풀 포기', category:'조경', isNewStyle:true,
  variants:[1, 2].map(v => ({label:'모양 ' + (v + 1), opts:{v}})),
  usage:"W.placeMany('grassTuft', [{x, z, rot, s}, ...], {v: 0});  // 높이 20~35cm", build(o = {}){
    const v = o.v || 0, P = new Parts(), R = mulberry(71 + v * 13), n = [9, 12, 7][v % 3], h = [.24, .3, .35][v % 3], COLS = [0xb9a77a, 0xa3925f, 0xc8b88c, 0x8f8a5a];
    for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, lean = .3 + R() * .5, hh = h * (.6 + R() * .5), bx = Math.cos(a) * .04, bz = Math.sin(a) * .04, tx = bx + Math.cos(a) * lean * hh, tz = bz + Math.sin(a) * lean * hh;
      const g = new THREE.BufferGeometry(), w = .012 + R() * .008, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      g.setAttribute('position', new THREE.Float32BufferAttribute([bx - px, 0, bz - pz, bx + px, 0, bz + pz, (bx + tx) / 2 + px * .6, hh * .6, (bz + tz) / 2 + pz * .6, (bx + tx) / 2 - px * .6, hh * .6, (bz + tz) / 2 - pz * .6, tx, hh, tz], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(10).fill(0), 2)); g.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4, 1, 0, 3, 1, 3, 2, 2, 3, 4]); g.computeVertexNormals();
      P.add('gr', g, COLS[Math.floor(R() * COLS.length)]); }
    P.add('snw', xf(blob(.09, .03, .08, {seed:v + 2, seg:8}), {x:.03}));
    P.bake('gr', groundAO(.2, .6));
    return assemble(P, [['gr', matteMaterial({rough:.9}), false], ['snw', snowMaterial({seed:66}), false]], [.4, h, .4]); }});

// ───────── 낮춘 공원 계단 (2026-11-16): 화강석 디딤판 · 노란 미끄럼 방지 줄 · 양옆 옆벽(앉음벽 높이) · 손스침 ─────────
//   원점은 위쪽 끝 가운데(땅 높이), +z로 내려간다. o.w 폭, o.run 길이, o.rise 높이 (미터). 폭이 6m를 넘으면 가운데에도 손스침.
import { concreteMaterial as _con, metalMaterial as _met } from '../core/texkit.js';
defineProp('parkStair', {label:'공원 계단 (낮춘 마당)', category:'공원', isNewStyle:true,
  colliders:[], usage:"W.place('parkStair', {x, z, y:0, rot, w, run, rise});  // 원점은 위쪽 가운데, +z로 내려간다", build(o = {}){
    const w = o.w || 4, run = o.run || 4, rise = o.rise || 2, hw = w / 2, n = Math.max(3, Math.round(rise / .16)), tr = run / n, rs = rise / n, P = new Parts(), WT = .3, TOP = .45;
    for (let k = 0; k < n; k++) { const z0 = k * tr, y = -(k + 1) * rs;
      P.add('stn', box(-hw, -rise, z0, hw, y, z0 + tr, .008), k % 2 ? 0xcfd0cc : 0xdcddd9);            // 단 하나 (디딤판 길이만큼, 바닥까지 채운 덩어리)
      P.add('yel', box(-hw + .05, y, z0 + tr - .11, hw - .05, y + .012, z0 + tr - .03), 0xe0b63a); }    // 디딤판 앞 끝의 미끄럼 방지 줄
    [-1, 1].forEach(s => { const x0 = s < 0 ? -hw - WT : hw, x1 = s < 0 ? -hw : hw + WT;
      for (let k = 0; k < n; k++) { const y = -k * rs + TOP; P.add('stn', box(x0, -rise, k * tr - (k ? 0 : .02), x1, y, (k + 1) * tr + (k === n - 1 ? .02 : 0), .01), 0xbfc1bd);   // 옆벽: 단을 따라 내려간다 (위는 앉음벽 높이)
        P.add('stn', box(x0 - .02, y, k * tr, x1 + .02, y + .05, (k + 1) * tr, .01), 0xd7d8d4); }
      const xr = s * (hw - .12); P.add('met', tube([new THREE.Vector3(xr, .9, -.2), new THREE.Vector3(xr, -rise + .9, run + .2)], .025, {radial:6}), 0x9aa3a8);
      [0, .5, 1].forEach(t => P.add('met', box(xr - .02, -rise * t, run * t - .02, xr + .02, -rise * t + .9, run * t + .02), 0x9aa3a8)); });
    if (w > 6) { P.add('met', tube([new THREE.Vector3(0, .9, .3), new THREE.Vector3(0, -rise + .9, run - .3)], .025, {radial:6}), 0x9aa3a8);
      [.1, .5, .9].forEach(t => P.add('met', box(-.02, -rise * t, run * t - .02, .02, -rise * t + .9, run * t + .02), 0x9aa3a8)); }
    return assemble(P, [['stn', _con({seed:91})], ['yel', matteMaterial()], ['met', _met({rough:.35})], ['snw', snowMaterial({seed:93}), false]], [w + .6, rise + 1, run]); }});

// ───────── 바리케이드 (2026-11-17): 걷는 끝을 막는 빨강 · 흰 줄무늬 가림막 + 글자 판. 폭 1.8m, 높이 1.1m, 판이 +z를 본다 ─────────
const barMats = new Map();
const barText = t => { if (!barMats.has(t)) barMats.set(t, decalMaterial(canvasTex(512, 128, g => { g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#c62828'; g.lineWidth = 10; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#c62828'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '64px ' + FONT_D; g.fillText(t, 256, 68); }), {rough:.6})); return barMats.get(t); };
const stripeMat = () => barMats.get('_s') || (barMats.set('_s', decalMaterial(canvasTex(256, 32, g => { for (let i = -2; i < 18; i++) { g.fillStyle = i % 2 ? '#d32f2f' : '#f5f5f2'; g.beginPath(); g.moveTo(i * 16, 32); g.lineTo(i * 16 + 16, 32); g.lineTo(i * 16 + 32, 0); g.lineTo(i * 16 + 16, 0); g.fill(); } }), {rough:.5})), barMats.get('_s'));
defineProp('barricade', {label:'바리케이드 (통행 금지)', category:'도로', isNewStyle:true, colliders:[{r:[-.95 * UNIT, -.25 * UNIT, .95 * UNIT, .25 * UNIT]}],
  usage:"W.place('barricade', {x, z, rot, text:'통행 금지'});  // 폭 1.8m", build(o = {}){
    const P = new Parts(), extra = [];
    // (2026-11-17) 기둥은 양쪽에 하나씩(굵은 각관 7cm)만: 판을 꿰어 잡는다. 판과 면이 겹치지 않게 기둥 면은 판보다 2cm 바깥
    [-.78, .78].forEach(x => { P.add('leg', box(x - .05, 0, -.05, x + .05, 1.08, .05, .012), 0x6f777e); P.add('foot', box(x - .14, 0, -.32, x + .14, .08, .32, .02), 0x2b2e31); });
    [.45, .8].forEach(y => { P.add('bd', box(-.9, y, -.03, .9, y + .16, .03, .01), 0xf5f5f2); extra.push(new THREE.Mesh(quadZ(-.9, y, .9, y + .16, .031, [0, 0, 1, 1]), stripeMat())); });
    // 안내판은 윗판 위에 바로 얹는다 (떠 보이지 않게)
    P.add('bd', box(-.55, .96, -.02, .55, 1.24, .02, .01), 0xfbfbf8); extra.push(new THREE.Mesh(quadZ(-.54, .97, .54, 1.23, .021, [0, 0, 1, 1]), barText(o.text || '통행 금지')));
    [[-.9, -.55], [.55, .9]].forEach(([a, b]) => P.add('snw', box(a, .96, -.03, b, .99, .03)));
    return assemble(P, [['leg', metalMaterial({rough:.4})], ['foot', matteMaterial()], ['bd', plasticMaterial({rough:.5})], ['snw', snowMaterial({seed:97}), false]], [1.9, 1.3, .6], extra); }});
