// 아파트 동 사이 자전거 보관소 (2026-11-15): 반투명 지붕 쉼터 + 거치대 + 세워 둔 자전거. 길이 7m, 깊이 2.2m. 미터 단위, 원점은 바닥 가운데, 열린 쪽이 +z.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { box, tube, xf, Parts } from '../core/meshkit.js';
import { metalMaterial, plasticMaterial, clearMaterial, snowMaterial, matteMaterial } from '../core/texkit.js';
import { assemble, mulberry } from './kit.js';
import { UNIT } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
export const BIKE_SHELTER = {L:7, D:2.2, H:2.3};
const FRAME = [0x2f6fb5, 0xd83a2e, 0x2b2e31, 0xe9eaea, 0x3f8a5a, 0xf2b632, 0x8a5a9e];

// 자전거 한 대 (옆으로 선다: 바퀴가 z 방향으로 놓이고 앞바퀴가 +z)
function bike(P, x, z, c, lean = 0){
  const T = g => xf(g, {x, z, rz:lean});
  [-.52, .52].forEach(dz => { P.add('tire', T(xf(new THREE.TorusGeometry(.33, .028, 6, 20), {ry:Math.PI / 2, y:.36, z:dz})), 0x1e2023);
    P.add('met', T(xf(new THREE.TorusGeometry(.3, .008, 4, 18), {ry:Math.PI / 2, y:.36, z:dz})), 0xb8bec2); });
  const F = (pts, r = .022) => P.add('frm', T(tube(pts.map(p => V(0, p[0], p[1])), r, {radial:5})), c);
  F([[.36, -.52], [.62, -.12], [.4, .05], [.36, -.52]]); F([[.62, -.12], [.82, .3], [.62, .05]]); F([[.4, .05], [.86, .32]]); F([[.36, .52], [.82, .3]], .018);
  P.add('met', T(tube([V(-.24, .98, .28), V(.24, .98, .28)], .014, {radial:4})), 0x2b2e31); P.add('met', T(tube([V(0, .86, .32), V(0, .98, .28)], .014, {radial:4})), 0x9aa0a5);
  P.add('mat', T(box(-.07, .84, -.22, .07, .89, -.02, .02)), 0x1e2023); P.add('met', T(tube([V(0, .62, -.12), V(0, .84, -.12)], .012, {radial:4})), 0x9aa0a5);
  P.add('met', T(box(-.12, .78, .34, .12, .92, .5, .02)), 0x9aa0a5);   // 앞 바구니
}
defineProp('bikeShelter', {label:'자전거 보관소', category:'아파트단지', isNewStyle:true, colliders:[{r:[-3.55 * U, -1.15 * U, 3.55 * U, -.95 * U]}, {r:[-3.55 * U, -1.1 * U, -3.35 * U, 1.1 * U]}, {r:[3.35 * U, -1.1 * U, 3.55 * U, 1.1 * U]}],
  usage:"W.placeMany('bikeShelter', [{x, z, rot}]);  // 7m × 2.2m, 열린 쪽 +z. 벽돌 바닥 위에 둔다", build(){
    const {L, D, H} = BIKE_SHELTER, hl = L / 2, hd = D / 2, P = new Parts(), R = mulberry(17);
    // 기둥 · 보 · 기운 지붕 (뒤가 낮다)
    [-hl + .1, 0, hl - .1].forEach(x => { P.add('met', box(x - .05, 0, -hd + .05, x + .05, H - .2, -hd + .15), 0x6f7a80); P.add('met', box(x - .05, 0, hd - .2, x + .05, H, hd - .1), 0x6f7a80);
      P.add('met', xf(box(-.04, -.05, -hd, .04, .05, hd + .15), {rx:-Math.atan(.2 / D), x, y:H - .1}), 0x6f7a80); });
    P.add('roof', xf(box(-hl, 0, -hd - .1, hl, .025, hd + .25), {rx:-Math.atan(.2 / D), y:H}), 0xcfe0e6);
    P.add('snw', xf(box(-hl + .05, .025, -hd - .05, hl - .05, .08, hd + .2, .02), {rx:-Math.atan(.2 / D), y:H}));
    P.add('roof', box(-hl, .3, -hd + .05, hl, H - .25, -hd + .08), 0xcfe0e6);   // 뒤 판
    // 거치대: 바닥 레일 + 굽은 관
    P.add('met', box(-hl + .2, 0, -.3, hl - .2, .05, -.2), 0x9aa0a5);
    const n = 9; for (let i = 0; i < n; i++) { const x = -hl + .5 + i * (L - 1) / (n - 1);
      P.add('met', tube([V(x, 0, -.3), V(x, .55, -.3), V(x, .55, .1), V(x, .3, .1)], .018, {radial:5}), 0xb8bec2);
      if (R() < .75) bike(P, x + .14, 0, FRAME[Math.floor(R() * FRAME.length)], (R() - .5) * .08); }
    return assemble(P, [['met', metalMaterial({rough:.4})], ['frm', metalMaterial({rough:.35})], ['tire', matteMaterial({rough:.9})], ['mat', matteMaterial()],
      ['roof', clearMaterial({color:0xd9e8ee, opacity:.55}), false], ['snw', snowMaterial({seed:81}), false]], [L, H + .2, D + .4]); }});
