// 군고구마 포장마차와 군고구마 (2026-11-20 2차). 미터 단위, 원점은 바닥 중심, 정면 +z.
//
// 군고구마 포장마차 (gogumaCart)
//   치수: 2.2m × 2.5m × 1.3m. 나무 수레(바퀴 둘 · 손잡이), 그 위에 눕힌 검은 드럼통 화덕(문 두 짝 · 경첩),
//   뒤로 솟은 연통, 주황 천막 지붕, 앞 나무 팻말(지어낸 글씨 '군고구마 · 한 봉지 천 원'), 신문지 봉투 몇 개, 지붕 위 눈.
//   재질 5개(나무, 쇠, 천막, 팻말 글씨, 눈) · 그리기 6회
// 군고구마 (goguma): 길쭉한 자주색 껍질, 반쯤 벗겨 노란 속이 보이고 신문지로 감쌌다. 0.17m. 놀이가 손에 들린다.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, lathe, ridge, blob, xf, groundAO, Parts } from '../core/meshkit.js';
import { matteMaterial, woodMaterial, metalMaterial, snowMaterial, decalMaterial, plasticMaterial } from '../core/texkit.js';
import { assemble, quadZ, mulberry } from './kit.js';
import { FONT_D, FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
const signTex = () => canvasTex(512, 256, (g, W, H) => {
  g.fillStyle = '#f4ead2'; g.fillRect(0, 0, W, H); g.strokeStyle = '#6b4a2e'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#9b3a1e'; g.font = '104px ' + FONT_D; g.fillText('군고구마', W / 2, 104);
  g.fillStyle = '#3a2c20'; g.font = '800 40px ' + FONT_B; g.fillText('한 봉지 천 원', W / 2, 196);
});

defineProp('gogumaCart', {label:'군고구마 포장마차', category:'거리', isNewStyle:true, colliders:[{r:[-1.15, -.7, 1.15, .7].map(v => v / .85)}],
  usage:"W.place('gogumaCart', {x, z, rot});  // 앞(+z)에서 '군고구마 사기'. 연통 끝은 (0.75, 2.5, -0.35)m", build(){
    const P = new Parts(), R = mulberry(31), wd = (g, c = 0x8a6848) => P.add('wd', g, c), mt = (g, c = 0x2c2f33) => P.add('met', g, c);
    // 수레: 바닥판 · 옆판 · 바퀴 둘 · 손잡이
    wd(box(-1.05, .55, -.6, 1.05, .62, .6, .015), 0x7a5a3e);
    [-1, 1].forEach(s => wd(box(-1.05, .62, s * .6 - .03, 1.05, .82, s * .6 + .03, .01)));
    [-1.05, 1.05].forEach(x => wd(box(x - .03, .62, -.6, x + .03, .82, .6, .01)));
    [-1, 1].forEach(s => { mt(xf(new THREE.TorusGeometry(.3, .045, 8, 20), {ry:PI / 2, x:.35, y:.32, z:s * .68}), 0x3a3f45); mt(xf(new THREE.CylinderGeometry(.05, .05, .1, 10), {rx:PI / 2, x:.35, y:.32, z:s * .64}), 0x8a9196); });
    mt(xf(new THREE.CylinderGeometry(.025, .025, 1.42, 8), {rx:PI / 2, x:.35, y:.32}), 0x5a6066);
    [-.5, .5].forEach(z => wd(tube([V(-1.05, .6, z), V(-1.55, .78, z)], .03, {radial:6}), 0x6a4d35)); wd(tube([V(-1.55, .78, -.5), V(-1.55, .78, .5)], .03, {radial:6}), 0x6a4d35);
    [-.85, .85].forEach(x => wd(box(x - .04, 0, -.04, x + .04, .55, .04, .01), 0x6a4d35));                                   // 받침 다리 (수레를 세워 두는)
    // 드럼통 화덕: 눕힌 통 · 테 · 앞 문 두 짝 · 손잡이
    mt(xf(new THREE.CylinderGeometry(.36, .36, 1.3, 24, 1, false), {rz:PI / 2, y:1.2}));
    [-.5, 0, .5].forEach(x => mt(xf(new THREE.TorusGeometry(.365, .02, 6, 24), {ry:PI / 2, x, y:1.2}), 0x3d4247));
    [-.32, .32].forEach(x => { mt(box(x - .26, 1.2, .33, x + .26, 1.48, .37, .02), 0x40454a); mt(tube([V(x - .08, 1.42, .4), V(x + .08, 1.42, .4)], .012, {radial:5}), 0xa9b0b5); });
    [-.6, .6].forEach(x => mt(box(x - .04, .82, -.3, x + .04, .9, .3, .01), 0x3a3f45));                                       // 드럼 받침
    // 연통: 드럼 뒤에서 위로 꺾여 지붕 위로
    mt(tube([V(.75, 1.3, -.2), V(.75, 1.55, -.35), V(.75, 2.55, -.35)], .07, {radial:10}), 0x4a4f55);
    mt(xf(new THREE.CylinderGeometry(.13, .09, .1, 12), {x:.75, y:2.6, z:-.35}), 0x4a4f55);
    // 천막: 기둥 넷 + 지붕 (앞이 살짝 낮다)
    [[-1.0, -.62], [1.0, -.62], [-1.0, .62], [1.0, .62]].forEach(([x, z]) => wd(box(x - .025, .82, z - .025, x + .025, z > 0 ? 2.05 : 2.2, z + .025, .008), 0x6a4d35));
    const roof = new THREE.BufferGeometry(); { const w = 1.15, ys = [2.24, 2.07];
      const pos = [-w, ys[0], -.72, w, ys[0], -.72, w, ys[1], .78, -w, ys[1], .78]; roof.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      roof.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); roof.setIndex([0, 2, 1, 0, 3, 2, 0, 1, 2, 0, 2, 3]); roof.computeVertexNormals(); }
    P.add('tarp', roof, 0xe0672c); P.add('tarp', box(-1.15, 1.92, .74, 1.15, 2.08, .8, .01), 0xc95522);                       // 지붕과 앞 처마 띠
    // 신문지 봉투 · 고구마 몇 개 (드럼 옆 판 위)
    for (let i = 0; i < 3; i++) P.add('tarp', xf(new THREE.CylinderGeometry(.07, .05, .16, 8), {x:-.85 + i * .14, y:.9, z:.35 + R() * .1}), 0xdcd6c6);
    for (let i = 0; i < 4; i++) P.add('tarp', xf(new THREE.CapsuleGeometry(.035, .1, 4, 8), {rz:PI / 2 + R() * .4, ry:R() * 3, x:-.8 + R() * .3, y:.86, z:-.3 + R() * .3}), 0x7a3f4a);
    P.add('snw', xf(blob(1.0, .06, .65, {seed:5, bump:.08, seg:16}), {y:2.2, z:.02, rx:-.11}));
    P.bake('wd', groundAO(.3, .72)); P.bake('met', groundAO(.3, .8));
    const sign = new THREE.Mesh(quadZ(-.58, 1.66, .58, 1.98, .81), decalMaterial(signTex()));   // 앞 처마 아래 매단 팻말 (드럼 문이 보이게 위쪽에)
    wd(box(-.62, 1.63, .76, .62, 2.01, .8, .01), 0x7a5a3e);
    return assemble(P, [['wd', woodMaterial({seed:57})], ['met', metalMaterial({rough:.55})], ['tarp', matteMaterial({rough:.8})], ['snw', snowMaterial({seed:47})]], [2.6, 2.6, 1.6], [sign]); }});

// 손에 드는 군고구마: 원점이 쥐는 곳, +y가 먹는 쪽 끝
export function gogumaParts(P){
  P.add('skin', lathe([[0, -.12], [.03, -.11], [.04, -.06], [.043, 0], [.04, .05], [.032, .09], [0, .11]], 12), 0x6e3346);
  P.add('flesh', lathe([[0, .07], [.034, .075], [.036, .095], [.026, .12], [0, .13]], 12), 0xf0b847);                          // 벗겨진 끝: 노란 속
  P.add('paper', lathe([[.05, -.13], [.054, -.04], [.048, -.01], [.045, -.01], [.048, -.04], [.045, -.13]], 10), 0xd8d2c0);        // 감싼 신문지
}
defineProp('goguma', {label:'군고구마', category:'거리', isNewStyle:true, small:true,
  usage:"buildProp('goguma');  // 원점이 쥐는 곳. 놀이(activities/goguma.js)가 손에 들린다", build(){
    const P = new Parts(); gogumaParts(P);
    return assemble(P, [['skin', matteMaterial({rough:.75})], ['flesh', matteMaterial({rough:.6})], ['paper', matteMaterial({rough:.95})]], [.1, .2, .1]); }});

// 호떡 노점 (hotteokStall, 2026-11-20 4차)
//   치수: 1.9m × 2.4m × 1.2m. 작은 손수레 위 넓은 철판(호떡 다섯 장이 구워지는 중), 기름병 · 누르개 · 종이컵 더미,
//   빨강 · 흰 줄무늬 천막, 앞 팻말(지어낸 글씨 '꿀호떡 · 세 개 천 원'), 지붕 위 눈. 재질 5개 · 그리기 6회
const hotSign = () => canvasTex(512, 256, (g, W, H) => {
  g.fillStyle = '#fff6e2'; g.fillRect(0, 0, W, H); g.strokeStyle = '#b23a2c'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b23a2c'; g.font = '108px ' + FONT_D; g.fillText('꿀호떡', W / 2, 104);
  g.fillStyle = '#3a2c20'; g.font = '800 40px ' + FONT_B; g.fillText('세 개 천 원', W / 2, 196);
});
defineProp('hotteokStall', {label:'호떡 노점', category:'거리', isNewStyle:true, colliders:[{r:[-1.0, -.62, 1.0, .62].map(v => v / .85)}],
  usage:"W.place('hotteokStall', {x, z, rot});  // 앞(+z)에서 '호떡 사기'", build(){
    const P = new Parts(), R = mulberry(41), wd = (g, c = 0x8a6848) => P.add('wd', g, c), mt = (g, c = 0x2c2f33) => P.add('met', g, c);
    wd(box(-.95, .62, -.55, .95, .7, .55, .015), 0x7a5a3e);
    [[-.85, -.45], [.85, -.45], [-.85, .45], [.85, .45]].forEach(([x, z]) => mt(box(x - .03, 0, z - .03, x + .03, .62, z + .03, .008), 0x5a6066));
    [-1, 1].forEach(s => mt(xf(new THREE.TorusGeometry(.16, .035, 8, 16), {ry:PI / 2, x:-.6, y:.16, z:s * .58}), 0x3a3f45));
    mt(box(-.95, .7, -.55, .95, .95, -.5, .01), 0xc9ced2); [-.95, .95].forEach(x => mt(box(x - .025, .7, -.55, x + .025, .95, .55, .01), 0xc9ced2));   // 철판 둘레 막이
    mt(box(-.75, .72, -.42, .55, .76, .3, .01), 0x24272b);                                                             // 철판
    for (let i = 0; i < 5; i++) P.add('tarp', xf(new THREE.CylinderGeometry(.11, .11, .025, 14), {x:-.55 + (i % 3) * .3, y:.775, z:-.22 + Math.floor(i / 3) * .3}), 0xc0843c);   // 호떡
    mt(xf(new THREE.CylinderGeometry(.045, .05, .2, 10), {x:.75, y:.82, z:-.3}), 0xe8c55a);                            // 기름병
    mt(box(.65, .72, .05, .85, .74, .2, .005), 0xa9b0b5); mt(xf(new THREE.CylinderGeometry(.015, .015, .18, 6), {x:.75, y:.82, z:.12}), 0x6a4d35);   // 누르개
    for (let i = 0; i < 4; i++) P.add('tarp', xf(new THREE.CylinderGeometry(.045, .035, .09, 10), {x:.72 + (i % 2) * .1, y:.75 + Math.floor(i / 2) * .08, z:.38}), 0xf4f1ea);   // 종이컵
    [[-.95, -.55], [.95, -.55], [-.95, .55], [.95, .55]].forEach(([x, z]) => wd(box(x - .02, .7, z - .02, x + .02, z > 0 ? 1.95 : 2.08, z + .02, .006), 0x6a4d35));
    const roof = new THREE.BufferGeometry(); { const w = 1.08, ys = [2.12, 1.97];
      roof.setAttribute('position', new THREE.Float32BufferAttribute([-w, ys[0], -.66, w, ys[0], -.66, w, ys[1], .7, -w, ys[1], .7], 3));
      roof.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); roof.setIndex([0, 2, 1, 0, 3, 2, 0, 1, 2, 0, 2, 3]); roof.computeVertexNormals(); }
    P.add('tarp', roof, 0xf3efe6);
    for (let i = 0; i < 6; i++) P.add('tarp', box(-1.08 + i * .36, 1.82, .66, -1.08 + i * .36 + .36, 1.98, .72, .005), i % 2 ? 0xf3efe6 : 0xd04a3a);   // 줄무늬 처마
    P.add('snw', xf(blob(.95, .05, .6, {seed:6, bump:.08, seg:16}), {y:2.08, z:.02, rx:-.11}));
    P.bake('wd', groundAO(.3, .72)); P.bake('met', groundAO(.3, .8));
    wd(box(-.6, 1.45, .7, .6, 1.8, .74, .01), 0x7a5a3e);
    const sign = new THREE.Mesh(quadZ(-.56, 1.48, .56, 1.77, .75), decalMaterial(hotSign()));
    return assemble(P, [['wd', woodMaterial({seed:58})], ['met', metalMaterial({rough:.5})], ['tarp', matteMaterial({rough:.8})], ['snw', snowMaterial({seed:49})]], [2.2, 2.4, 1.4], [sign]); }});

// 손에 드는 호떡: 종이컵에 반 접힌 호떡. 원점이 쥐는 곳
defineProp('hotteok', {label:'호떡 (종이컵)', category:'거리', isNewStyle:true, small:true,
  usage:"buildProp('hotteok');  // 놀이(activities/goguma.js)가 손에 들린다", build(){
    const P = new Parts();
    P.add('paper', lathe([[.045, -.06], [.055, .05], [.05, .05], [.04, -.055], [0, -.055]], 14), 0xf4f1ea);
    const h = new THREE.CylinderGeometry(.06, .06, .018, 16); h.rotateX(PI / 2); h.scale(1, 1, 1); h.translate(0, .07, 0); P.add('skin', h, 0xb87432);
    P.add('flesh', xf(new THREE.SphereGeometry(.02, 8, 6), {y:.11, z:.012}), 0x5a2c14);                                // 흘러나온 꿀
    return assemble(P, [['skin', matteMaterial({rough:.6})], ['flesh', matteMaterial({rough:.4})], ['paper', matteMaterial({rough:.95})]], [.12, .2, .12]); }});
