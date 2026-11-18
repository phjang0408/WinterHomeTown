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
