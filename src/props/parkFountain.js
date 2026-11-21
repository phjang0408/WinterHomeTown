// 공원 분수 (2026-11-20 2차): 공원 가운데 광장. 겨울이라 물은 얼어 있고, 받침 그릇 가장자리에 고드름이 달려 있다.
// 미터 단위, 원점은 바닥 중심.
//   치수: 지름 8.6m, 높이 3.1m. 둥근 수반(돌 테두리 · 앉을 수 있는 높이 0.55m) · 얼음 수면과 눈 덩이 · 가운데 기둥 · 큰 그릇(지름 3.2m) ·
//         작은 그릇(지름 1.6m) · 꼭대기 장식, 그릇 가장자리 고드름 24개, 테두리 · 그릇 위 눈.
//   재질 3개(돌, 얼음, 눈) · 그리기 3회 · 삼각형 약 9천
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { lathe, ridge, blob, xf, groundAO, Parts } from '../core/meshkit.js';
import { concreteMaterial, plasticMaterial, snowMaterial } from '../core/texkit.js';
import { assemble, mulberry } from './kit.js';
import { UNIT as U } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), R0 = 4.3;
const ring = (r, y, n = 48) => Array.from({length:n + 1}, (_, i) => { const a = i / n * Math.PI * 2; return V(Math.cos(a) * r, y, Math.sin(a) * r); });

defineProp('parkFountain', {label:'공원 분수 (얼음)', category:'공원 안', isNewStyle:true, colliders:[{c:[0, 0, (R0 + .05) * U]}],
  usage:"W.place('parkFountain', {x, z});  // 지름 8.6m", build(){
    const P = new Parts(), st = (g, c = 0xd8d6cf) => P.add('stn', g, c), R = mulberry(7);
    // 수반: 바깥 벽 · 둥근 테두리 · 안쪽 벽 · 바닥 (회전체 단면)
    st(lathe([[0, .08], [R0 - .45, .08], [R0 - .42, .45], [R0 - .3, .53], [R0 - .1, .55], [R0, .5], [R0 + .02, .1], [R0 + .12, 0], [R0 + .12, -.02]], 64));
    // 가운데 기둥과 그릇 둘, 꼭대기
    st(lathe([[0, .1], [.62, .1], [.62, .22], [.42, .3], [.36, .7], [.3, 1.2], [.34, 1.32], [.2, 1.38]], 28));
    st(lathe([[0, 1.3], [.2, 1.3], [.9, 1.42], [1.45, 1.58], [1.6, 1.68], [1.6, 1.74], [1.5, 1.74], [.9, 1.62], [.2, 1.6], [0, 1.6]], 40), 0xcfcdc5);
    st(lathe([[0, 1.6], [.24, 1.6], [.2, 2.0], [.16, 2.3], [.2, 2.36], [.1, 2.4]], 20));
    st(lathe([[0, 2.32], [.12, 2.32], [.55, 2.44], [.8, 2.56], [.8, 2.6], [.72, 2.6], [.3, 2.5], [0, 2.5]], 28), 0xcfcdc5);
    st(lathe([[0, 2.5], [.1, 2.5], [.08, 2.7], [.14, 2.82], [.12, 2.94], [.05, 3.02], [0, 3.06]], 16));
    P.bake('stn', groundAO(.35, .72));
    // 얼음: 수반 · 큰 그릇 안의 언 물 (살짝 푸른 반투명 느낌), 고드름
    P.add('ice', xf(new THREE.CylinderGeometry(R0 - .43, R0 - .43, .04, 56), {y:.4}), 0xcfe4ee);
    P.add('ice', xf(new THREE.CylinderGeometry(1.48, 1.48, .03, 36), {y:1.69}), 0xcfe4ee);
    [[1.58, 1.7, 16, .32], [.78, 2.56, 8, .22]].forEach(([r, y, n, L]) => { for (let i = 0; i < n; i++) { const a = (i + R() * .4) / n * Math.PI * 2, l = L * (.55 + R() * .6);
      P.add('ice', xf(new THREE.ConeGeometry(.03 + R() * .02, l, 6), {rx:Math.PI, x:Math.cos(a) * r, y:y - l / 2, z:Math.sin(a) * r}), 0xe2f0f6); } });
    // 눈: 테두리 위 띠, 얼음 위 덩이, 그릇 위
    P.add('snw', ridge(ring(R0 - .2, .55, 64), .14, .05, 5));
    [[1.6, 1.1, .7], [-2.1, .3, .55], [.2, -2.4, .8], [2.6, -1.4, .5]].forEach(([x, z, r], i) => P.add('snw', xf(blob(r, .12, r * .8, {seed:i + 2, bump:.14, seg:12}), {x, y:.41, z})));
    P.add('snw', xf(blob(.9, .1, .9, {seed:9, bump:.1, seg:14}), {y:1.7})); P.add('snw', xf(blob(.45, .08, .45, {seed:11, bump:.1, seg:10}), {y:2.58}));
    return assemble(P, [['stn', concreteMaterial({seed:52})], ['ice', plasticMaterial({rough:.12})], ['snw', snowMaterial({seed:46})]], [8.6, 3.1, 8.6]); }});
