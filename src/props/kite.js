// 방패연과 연 가게 (2026-11-20). 미터 단위, 원점은 바닥 중심(연은 한가운데), 정면 +z.
//
// 방패연 (bangpaeKite)
//   치수: 0.5m × 0.66m (게임에서는 하늘에서 잘 보이게 놀이가 2.4배로 띄운다). 가운데 둥근 방구멍, 위 가운데 붉은 꼭지(반달),
//   아래 양쪽 파란 치마 띠, 대나무 살 다섯(세로 · 가로 둘 · 대각 둘). 재질 2개(종이 무광 정점색, 대나무) · 그리기 2회 · 삼각형 약 900
// 연 가게 (kiteStall)
//   치수: 1.8m × 2.1m × 0.6m. 나무 기둥 둘 · 가로대 · 걸린 방패연 셋(꼭지 색이 다르다) · 아래 나무 팻말(지어낸 문구) · 가로대 위 눈.
//   재질 4개(나무, 종이, 대나무 · 팻말 글씨, 눈) · 그리기 5회
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, ridge, xf, Parts, groundAO } from '../core/meshkit.js';
import { matteMaterial, woodMaterial, snowMaterial, decalMaterial } from '../core/texkit.js';
import { assemble, quadZ } from './kit.js';
import { FONT_D, FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const KITE_M = {w:.5, h:.66, hole:.11};

// 연 한 장의 부품을 P에 넣는다. top: 꼭지 색. 원점은 연 한가운데, 앞면 +z
export function addKite(P, top = 0xd23c32, T = g => g){
  const {w, h, hole} = KITE_M, hw = w / 2, hh = h / 2;
  const sh = new THREE.Shape([V(-hw, -hh), V(hw, -hh), V(hw, hh), V(-hw, hh)].map(v => new THREE.Vector2(v.x, v.y)));
  const hp = new THREE.Path(); hp.absarc(0, .02, hole, 0, Math.PI * 2, true); sh.holes.push(hp);
  P.add('ppr', T(new THREE.ExtrudeGeometry(sh, {depth:.004, bevelEnabled:false, curveSegments:20})), 0xf3eee0);
  // 꼭지: 위 가운데 반달 (앞면에 살짝 띄워 붙인다)
  const tp = new THREE.Shape(); tp.moveTo(-.1, hh); tp.absarc(0, hh, .1, Math.PI, 0, false); tp.lineTo(-.1, hh);
  P.add('ppr', T(xf(new THREE.ExtrudeGeometry(tp, {depth:.002, bevelEnabled:false, curveSegments:12}), {z:.004})), top);
  // 치마: 아래 양쪽 파란 띠
  [-1, 1].forEach(s => P.add('ppr', T(box(s * hw - (s > 0 ? .07 : 0), -hh, .004, s * hw + (s < 0 ? .07 : 0), -hh + .2, .006)), 0x2f5fa8));
  // 대나무 살 (뒤쪽)
  const st = (a, b, r = .0045) => P.add('stk', T(tube([a, b], r, {radial:5})), 0x9a7a4a);
  st(V(0, -hh, -.004), V(0, hh, -.004)); st(V(-hw, hh - .01, -.004), V(hw, hh - .01, -.004)); st(V(-hw, .02, -.004), V(hw, .02, -.004));
  st(V(-hw, hh, -.006), V(hw, -hh, -.006), .0038); st(V(hw, hh, -.006), V(-hw, -hh, -.006), .0038);
}

defineProp('bangpaeKite', {label:'방패연', category:'겨울', isNewStyle:true, small:true,
  variants:[{label:'붉은 꼭지', opts:{}}, {label:'노란 꼭지', opts:{top:0xe8b02a}}, {label:'초록 꼭지', opts:{top:0x3c9a5a}}],
  usage:"buildProp('bangpaeKite', {top: 0xd23c32});  // 원점이 연 가운데, 앞면 +z. 놀이(activities/kite.js)가 하늘에 띄운다", build(o = {}){
    const P = new Parts(); addKite(P, o.top);
    return assemble(P, [['ppr', matteMaterial({rough:.9})], ['stk', matteMaterial({rough:.7})]], [KITE_M.w, KITE_M.h, .02]); }});

const signTex = () => canvasTex(512, 192, (g, W, H) => {
  g.fillStyle = '#f2e6cc'; g.fillRect(0, 0, W, H); g.strokeStyle = '#7a5532'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b23a2c'; g.font = '64px ' + FONT_D; g.fillText('연 빌려 가세요', W / 2, 78);
  g.fillStyle = '#4a3a2a'; g.font = '30px ' + FONT_B; g.fillText('날리고 나면 꼭 돌려주세요', W / 2, 146);
});
defineProp('kiteStall', {label:'연 가게', category:'겨울', isNewStyle:true, colliders:[{r:[-.95, -.3, .95, .3].map(v => v * (1 / .85))}],
  usage:"W.place('kiteStall', {x, z, rot});  // 1.8m 폭. 앞(+z)에서 '연 받기'", build(){
    const P = new Parts(), H = 2.05;
    [-.85, .85].forEach(x => { P.add('wd', box(x - .05, 0, -.05, x + .05, H, .05, .012), 0x7a5a3e); P.add('wd', box(x - .16, 0, -.22, x + .16, .06, .22, .01), 0x6a4d35); });
    P.add('wd', box(-.95, H - .12, -.05, .95, H - .02, .05, .012), 0x8a6848);
    P.add('wd', box(-.6, .28, -.03, .6, .7, .01, .01), 0x8a6848);                                      // 팻말 판 (글씨는 앞에 붙인다)
    [[-.52, 0xd23c32, .05], [0, 0xe8b02a, -.04], [.52, 0x3c9a5a, .03]].forEach(([x, top, r]) => {          // 걸린 연 셋: 가로대에 줄로 매단다
      const y = H - .55; addKite(P, top, g => xf(g, {rz:r, x, y, z:.06}));
      P.add('stk', tube([V(x, H - .12, .03), V(x + r * 2, y + KITE_M.h / 2, .065)], .003, {radial:4}), 0xd8d2c4); });
    P.add('snw', ridge(Array.from({length:9}, (_, i) => V(-.92 + 1.84 * i / 8, H - .02, Math.sin(i * 1.9) * .01)), .07, .035, 5));
    P.bake('wd', groundAO(.25, .72));
    const sign = new THREE.Mesh(quadZ(-.56, .3, .56, .68, .016), decalMaterial(signTex()));
    return assemble(P, [['wd', woodMaterial({seed:41})], ['ppr', matteMaterial({rough:.9})], ['stk', matteMaterial({rough:.7})], ['snw', snowMaterial({seed:44})]], [1.9, 2.1, .6], [sign]); }});
