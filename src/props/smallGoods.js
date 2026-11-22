// 작은 물건 · 경계 (2026-11-18). 피크닉 테이블은 너무 현대적이라 지웠다 (2026-11-18 2차)
//   bananaMilk  : 단지 모양 바나나우유. 사용자 원본(food_0001_bananamilk.obj, mm)에서 크기와 비율만 쟀다:
//                 높이 101mm, 가장 굵은 배 지름 79mm(높이 46mm), 바닥 지름 55mm, 목 지름 32mm, 뚜껑 지름 36mm(연두).
//                 몸통(회전체) · 뚜껑 · 라벨 그림 세 부분으로 가볍게 다시 만들었다. 상표는 지어낸 '동화 바나나우유'.
//   schoolWall  : (2026-11-18) 학교 담. 콘크리트 아랫담(0.55m) + 갓돌 + 초록 도장 철 세로살 울타리(꼭대기 2.35m). 한 칸 기본 2.4m, 칸 오른쪽(+x) 끝에 기둥.
//                 pillar 옵션이면 모퉁이 콘크리트 기둥.
// 미터 단위, 원점은 바닥 가운데, 정면 +z.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, lathe, xf, tube, merge, groundAO, Parts } from '../core/meshkit.js';
import { plasticMaterial, decalMaterial, metalMaterial, paintMaterial, snowMaterial, concreteMaterial } from '../core/texkit.js';
import { assemble, mulberry } from './kit.js';
import { FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const once = (() => { const m = new Map(); return (k, f) => m.get(k) || (m.set(k, f()), m.get(k)); })();

// ── 바나나우유 ──
// 옆모습 [반지름, 높이] (원본 실측): 바닥 → 배(46mm에서 가장 굵다) → 원뿔 어깨 → 목 띠 → 잘록한 목 → 입구 (뚜껑이 덮는다)
const MILK = {H:.101, LID:[.0972, .101, .0181], PROFILE:[[0, 0], [.0255, 0], [.0274, .0015], [.0285, .004], [.0297, .008], [.0309, .014], [.0332, .026], [.0368, .036], [.039, .042], [.0395, .046],
  [.039, .05], [.0375, .0535], [.0352, .0565], [.0305, .066], [.028, .07], [.023, .08], [.0198, .0845], [.0204, .0862], [.0182, .09], [.0162, .093], [.0158, .0962], [.0172, .0972], [0, .0972]]};
const rAt = y => { const p = MILK.PROFILE; for (let i = 1; i < p.length; i++) if (p[i][1] >= y) { const [r0, y0] = p[i - 1], [r1, y1] = p[i]; return r0 + (r1 - r0) * (y - y0) / Math.max(1e-6, y1 - y0); } return 0; };
const milkTex = kind => once('milk' + kind, () => decalMaterial(canvasTex(...(kind === 'band' ? [512, 128] : [128, 128]), g => {
  if (kind === 'band') {   // 몸통 글씨 띠 (투명 바탕): 초록 글씨 상표 + 갈색 작은 글씨
    g.clearRect(0, 0, 512, 128); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#2f7d3a'; g.font = '900 52px ' + FONT_B; g.fillText('동화 바나나우유', 256, 52);
    g.fillStyle = '#7a4a1e'; g.font = '700 22px ' + FONT_B; g.fillText('BANANA · 240ml', 256, 100);
  } else {                 // 은박 뚜껑: 은색 원 + 바나나 그림 + 글씨
    g.fillStyle = '#86c35c'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#7ab652'; for (let i = 0; i < 128; i += 6) g.fillRect(0, i, 128, 2);   // 연두 은박 (원본 뚜껑 색)
    g.strokeStyle = '#f4f7ef'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#f2c230'; g.beginPath(); g.ellipse(64, 54, 30, 12, -.35, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = '800 20px ' + FONT_B; g.textAlign = 'center'; g.fillText('동화', 64, 98);
  } }), {alpha:kind === 'band'}));

defineProp('bananaMilk', {label:'바나나우유', category:'큰 가게', isNewStyle:true, small:true, far:40,
  variants:[{label:'둘', opts:{n:2}}, {label:'빨대 꽂은 것', opts:{n:1, straw:true}}],
  usage:"W.place('bananaMilk', {x, z, y, rot, n: 2});  // 높이 10cm, 지름 8cm. n개를 옆으로 나란히 (평상 · 진열대 위)", build(o = {}){
    const n = o.n || 1, P = new Parts(), tops = [], bands = [], R = mulberry(7);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .09, z = (R() - .5) * .02, ry = (R() - .5) * .6;
      P.add('body', xf(lathe(MILK.PROFILE, 24), {x, z}), 0xf7e7a6);                                                   // (2026-11-18 2차) 연한 노랑 단색 몸통 (명암 굽기 없음)
      const [l0, l1, lr] = MILK.LID;
      P.add('lid', xf(new THREE.CylinderGeometry(lr, lr, l1 - l0, 20), {x, y:(l0 + l1) / 2, z}), 0x8fca66);                // 연두 은박 뚜껑 (입구 테를 덮는다)
      tops.push(xf(new THREE.CircleGeometry(lr - .0004, 20).rotateX(-Math.PI / 2), {x, y:l1 + .0003, z, ry}));
      // 라벨 그림: 배 부분 앞쪽 120°, 몸통 곡면을 따라 1mm 띄운다
      { const y0 = .028, y1 = .062, seg = 16, a0 = -Math.PI / 3, a1 = Math.PI / 3, pos = [], uv = [], idx = [];
        for (let j = 0; j <= 6; j++) { const y = y0 + (y1 - y0) * j / 6, r = rAt(y) + .001;
          for (let k = 0; k <= seg; k++) { const a = a0 + (a1 - a0) * k / seg + ry; pos.push(x + Math.sin(a) * r, y, z + Math.cos(a) * r); uv.push(k / seg, j / 6); } }
        for (let j = 0; j < 6; j++) for (let k = 0; k < seg; k++) { const p = j * (seg + 1) + k; idx.push(p, p + 1, p + seg + 1, p + 1, p + seg + 2, p + seg + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
        bands.push(g); }
      if (o.straw && i === 0) P.add('body', tube([V(x + .005, .095, z), V(x + .012, .155, z + .006), V(x + .018, .17, z + .02)], .0028, {radial:6}), 0xeef2f3);   // 하얀 빨대
    }
    return assemble(P, [['body', plasticMaterial({rough:.55})], ['lid', metalMaterial({color:0xe2e5e7, rough:.35})]], [.09 * n, MILK.H, .08], [new THREE.Mesh(merge(tops), milkTex('lid')), new THREE.Mesh(merge(bands), milkTex('band'))]); }});   // 여러 개여도 그리기 4번

// ── 학교 담 ──
// 아랫담은 둥근 모서리, 살 · 가로대는 수가 많아 각진 상자로 (한 칸 약 400 삼각형). 위를 향한 갓돌에 눈.
const SW_ = {base:.55, cap:.62, top:2.35, rail:[.72, 2.2], gap:.12};
defineProp('schoolWall', {label:'학교 담', category:'경계', isNewStyle:true, colliders:[{r:[-1.2 / .85, -.15 / .85, 1.2 / .85, .15 / .85]}],
  variants:[{label:'모퉁이 기둥', opts:{pillar:true}}],
  usage:"W.placeMany('schoolWall', list, {len, collide:false});  // 한 칸 len m(기본 2.4), 높이 2.35m. 칸 오른쪽(+x) 끝에 기둥. {pillar:true}는 모퉁이 기둥", build(o = {}){
    const P = new Parts(), STEEL = 0x3d6a55, CON = 0xc9cbc6;
    if (o.pillar) {
      P.add('con', box(-.22, 0, -.22, .22, SW_.top + .1, .22, .025), CON); P.add('con', box(-.26, SW_.top + .1, -.26, .26, SW_.top + .2, .26, .015), 0xd6d7d3);
      P.add('snw', box(-.24, SW_.top + .2, -.24, .24, SW_.top + .25, .24, .02));
      P.bake('con', groundAO(.4, .7));
      return assemble(P, [['con', concreteMaterial()], ['snw', snowMaterial({seed:61}), false]], [.52, SW_.top + .25, .52]); }
    const L = o.len || 2.4, h = L / 2, n = Math.max(2, Math.round(L / SW_.gap));
    P.add('con', box(-h, 0, -.12, h, SW_.base, .12, .02), CON); P.add('con', box(-h, SW_.base, -.15, h, SW_.cap, .15, .012), 0xd6d7d3);   // 아랫담 + 갓돌
    P.add('snw', box(-h + .01, SW_.cap, -.13, h - .01, SW_.cap + .035, .13, .012));                                                           // 갓돌 위 눈
    P.add('stl', box(h - .035, SW_.cap - .02, -.035, h + .035, SW_.top, .035), STEEL);                                                        // 기둥
    SW_.rail.forEach(y => P.add('stl', box(-h, y, -.02, h, y + .04, .02), STEEL));                                                           // 가로대 둘
    for (let i = 0; i < n; i++) { const x = -h + (i + .5) * L / n; if (Math.abs(x - h) < .05) continue; P.add('stl', box(x - .011, SW_.cap - .02, -.011, x + .011, SW_.top - .04, .011), STEEL); }   // 세로살
    P.bake('con', groundAO(.35, .7));
    return assemble(P, [['con', concreteMaterial()], ['stl', paintMaterial(0xffffff, {seed:45, gloss:.4, metal:.3})], ['snw', snowMaterial({seed:61}), false]], [L, SW_.top, .3]); }});

// ── 양은 쟁반 (2026-11-22) ──
//   참고: 사용자 사진(둥근 은색 알루미늄 쟁반, 가운데 모란 꽃다발 인쇄, 위에 '大' 크기 표시). 꽃 그림은 사진을 베끼지 않고 새로 그렸고 상표 · 도장은 넣지 않았다.
//   정체성: 은색 얕은 원판, 말아 올린 둥근 테두리, 가운데 붉은 · 자주 모란과 초록 잎 꽃다발, 위쪽 '大'.
//   치수: 大 지름 0.42m · 높이 2.9cm (s:'M'이면 지름 0.34m). 옆모습을 돌린 얇은 판 한 장(안 · 바깥 · 말린 테두리). 재질: 금속(정점 색) + 꽃 그림(투명 바탕) 두 개.
//   옵션: n 쌓은 개수, lean 벽에 기댄 기울기(라디안, 0이면 눕힘). 기대 놓을 때 앞(+z)이 그림 쪽, 뒤(-z)가 벽 쪽.
const TRAY = {L:.21, M:.17};
const trayProfile = R => { const k = R / .21; return [[0, .004], [.172 * k, .004], [.184 * k, .0075], [.197 * k, .0235], [.2015 * k, .0285], [.2065 * k, .029], [.2095 * k, .0255], [.2085 * k, .021], [.2045 * k, .0205], [.192 * k, .006], [.181 * k, 0], [0, 0]]; };
function peony(g, x, y, r, c1, c2, c3, R){
  for (let ring = 4; ring >= 0; ring--) { const rr = r * (.35 + ring * .17), n = 7 + ring * 2;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring * .4 + R() * .3, px = x + Math.cos(a) * rr * .55, py = y + Math.sin(a) * rr * .45;
      g.fillStyle = ring > 2 ? c1 : ring > 0 ? c2 : c3; g.beginPath(); g.ellipse(px, py, rr * .42, rr * .3, a + Math.PI / 2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,235,240,.55)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(px, py, rr * .36, rr * .22, a + Math.PI / 2, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
}
function aster(g, x, y, r, c, R){
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + R() * .1; g.fillStyle = i % 2 ? c : '#6a3fb8'; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, r * .14, a, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#f2c51f'; g.beginPath(); g.arc(x, y, r * .25, 0, Math.PI * 2); g.fill();
}
function leaf(g, x, y, len, a){
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#3f9a3a'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .5, -len * .32, len, 0); g.quadraticCurveTo(len * .5, len * .32, 0, 0); g.fill();
  g.strokeStyle = '#a8dc7a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(2, 0); g.lineTo(len * .9, 0); g.stroke(); g.restore();
}
const trayPrint = () => once('trayPrint', () => { const m = decalMaterial(canvasTex(512, 512, g => {
  g.clearRect(0, 0, 512, 512); const R = mulberry(23);
  [[150, 300, 80, -2.6], [360, 320, 90, -.4], [200, 380, 70, 2.2], [330, 200, 70, -1.2], [140, 220, 75, -2.2], [270, 400, 60, 1.6], [400, 250, 60, -.3], [110, 330, 55, 2.8], [250, 150, 55, -1.7]].forEach(([x, y, l, a]) => leaf(g, x, y, l, a));
  g.strokeStyle = '#3f8a3a'; g.lineWidth = 3; [[230, 300, 300, 140], [260, 300, 380, 200], [240, 310, 160, 180]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2 + 20, (b + d) / 2, c, d); g.stroke(); });
  [[300, 140], [322, 150], [342, 162], [360, 176], [376, 192]].forEach(([x, y]) => { g.fillStyle = '#d8283a'; g.beginPath(); g.ellipse(x, y + 8, 7, 9, 0, 0, Math.PI * 2); g.fill(); });   // 늘어진 붉은 봉오리 줄
  peony(g, 200, 300, 62, '#b01e34', '#d83a52', '#f07a8c', R);       // 큰 붉은 모란
  peony(g, 330, 270, 58, '#a2287e', '#c8409a', '#ef8ac8', R);       // 자주 모란
  peony(g, 175, 190, 36, '#9c1c30', '#c8344a', '#f08a98', R);       // 작은 붉은 모란 (위)
  peony(g, 300, 395, 30, '#b8309a', '#dc5cba', '#f6a6dc', R);       // 분홍 (아래)
  aster(g, 280, 175, 26, '#8a5ce0', R); aster(g, 255, 330, 22, '#7d52d6', R);
  [[245, 285], [262, 300], [238, 305]].forEach(([x, y]) => { g.fillStyle = '#f2b632'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = '#3a3a3a'; g.font = '700 30px ' + FONT_B; g.textAlign = 'center'; g.fillText('大', 256, 92);
}), {rough:.55, alpha:true}); m.depthWrite = false; m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4; return m; });
defineProp('aluminumTray', {label:'양은 쟁반', category:'큰 가게', isNewStyle:true, small:true, far:60,
  variants:[{label:'눕힘 (大)', opts:{}}, {label:'세 개 쌓음', opts:{n:3}}, {label:'벽에 기댐', opts:{lean:1.22}}, {label:'中', opts:{s:'M'}}],
  usage:"W.place('aluminumTray', {x, z, y, rot, n: 1, lean: 0, s: 'L'});  // 지름 0.42m(中 0.34m), 높이 2.9cm. lean이면 뒤(-z)를 벽에 기댄다", build(o = {}){
    const Rr = TRAY[o.s || 'L'], n = o.n || 1, lean = o.lean || 0, P = new Parts(), prof = trayProfile(Rr);
    // 기댈 때: 앞 끝이 바닥에 닿도록 들어 올리고, 뒤 끝은 -z로 간다
    const place = (g, i) => lean ? xf(g, {rx:lean, y:Rr * Math.sin(lean) + .002, z:.004}) : xf(g, {y:i * .009});
    for (let i = 0; i < n; i++) { const t = lathe(prof, 56); P.add('met', place(t, i), [0xdfe3e6, 0xd4d9dd, 0xe6e9eb][i % 3]); }
    P.bake('met', groundAO(.03, .78));
    const pr = new THREE.CircleGeometry(Rr * .78, 40); pr.rotateX(-Math.PI / 2); place(pr, n - 1); pr.translate(0, .0048, 0);   // 맨 위 쟁반 바닥에만 그림
    if (lean) { pr.translate(0, -.0048, 0); const nrm = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), lean); pr.translate(nrm.x * .0048, nrm.y * .0048, nrm.z * .0048); }
    const print = new THREE.Mesh(pr, trayPrint()); print.renderOrder = 2;
    return assemble(P, [['met', metalMaterial({color:0xffffff, rough:.34})]], [Rr * 2, lean ? Rr * 2 * Math.sin(lean) : .03 + n * .009, Rr * 2], [print]); }});
