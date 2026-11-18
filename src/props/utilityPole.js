// 전봇대 (콘크리트 전주, 2026-11-16): 위로 가늘어지는 회색 기둥, 아래 노랑 · 검정 띠, 발판 볼트, 완금 두 단과 애자, 통신선 받침, 전주 번호판.
//   변형: v 0 기본, v 1 변압기 둘(원통 · 부싱 · 받침대), v 2 통신 단자함 + 감아 둔 케이블.
//   전선은 맵에서 이웃 전봇대의 같은 자리(POLE_WIRES)끼리 처진 곡선으로 잇는다 (poleWires). 미터 단위, 원점은 바닥 가운데, 전선은 z 방향으로 지나간다.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, lathe, xf, Parts } from '../core/meshkit.js';
import { concreteMaterial, metalMaterial, matteMaterial, plasticMaterial, decalMaterial, snowMaterial } from '../core/texkit.js';
import { assemble, quadZ } from './kit.js';
import { UNIT, FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
export const POLE = {H:11, r0:.2, r1:.12};
// 전선이 걸리는 자리 [x, y, 굵기(m), 색]: 고압 둘(완금 양 끝), 저압 둘, 통신 둘(굵은 검정 다발). (2026-11-17) 맨 꼭대기 가운데 줄은 없앴다
export const POLE_WIRES = [[-1.05, 10.45, .012, 0x2b2e31], [1.05, 10.45, .012, 0x2b2e31],
  [-.6, 9.25, .014, 0x1e2023], [.6, 9.25, .014, 0x1e2023], [.32, 6.7, .03, 0x15171a], [-.32, 6.4, .022, 0x15171a]];
const rAt = y => POLE.r0 + (POLE.r1 - POLE.r0) * y / POLE.H;
let plate = null;
const plateMat = () => plate || (plate = decalMaterial(canvasTex(128, 192, g => { g.fillStyle = '#f4f4ef'; g.fillRect(0, 0, 128, 192); g.strokeStyle = '#1d4f91'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 184);
  g.fillStyle = '#1d4f91'; g.textAlign = 'center'; g.font = '800 30px ' + FONT_B; g.fillText('동화', 64, 52); g.font = '800 40px ' + FONT_B; g.fillText('3A', 64, 104); g.fillText('127', 64, 156); }), {rough:.6}));

defineProp('utilityPole', {label:'전봇대', category:'도로', isNewStyle:true, colliders:[{c:[0, 0, .3 * U]}],
  variants:[{label:'변압기', opts:{v:1}}, {label:'통신 단자함', opts:{v:2}}],
  usage:"W.placeMany('utilityPole', [{x, z, rot}], {v});  // 높이 11m. 전선은 poleWires(전봇대 줄)로 잇는다", build(o = {}){
    const {H} = POLE, P = new Parts(), v = o.v || 0, met = (g, c = 0x7d858b) => P.add('met', g, c);
    // 기둥: 위로 가늘어지는 회전체, 꼭대기 마개
    P.add('con', lathe([[0, 0], [POLE.r0, 0], [POLE.r0, .02], ...[.5, 2, 5, 8, H - .1].map(y => [rAt(y), y]), [rAt(H) * .7, H + .05], [0, H + .08]], 16), 0xbebfba);
    // 아래 띠 (노랑 · 검정, 차가 부딪히지 않게) — 기둥보다 2mm 크게
    for (let k = 0; k < 6; k++) { const y0 = .3 + k * .25, r = rAt(y0) + .004; P.add('band', xf(new THREE.CylinderGeometry(r, r, .25, 16, 1, true), {y:y0 + .125}), k % 2 ? 0x1e2023 : 0xf2c230); }
    // 발판 볼트 (2.6m부터 번갈아)
    for (let y = 2.6; y < H - 1.6; y += .45) { const a = ((y / .45) | 0) % 2 ? 1 : -1, r = rAt(y); met(xf(new THREE.CylinderGeometry(.012, .012, .22, 6), {rz:Math.PI / 2, x:a * (r + .1), y}), 0x6b7177); }
    // 완금 (고압 · 저압) + 애자
    const arm = (y, w) => { met(box(-w, y - .05, -.04, w, y + .05, .04)); [-1, 1].forEach(s => met(tube([V(0, y - .6, 0), V(s * w * .55, y - .04, 0)], .012, {radial:4}))); };
    arm(10.3, 1.25); arm(9.1, .8);
    const ins = (x, y, big) => { P.add('ins', xf(lathe([[0, 0], [.05, 0], [big ? .07 : .055, .04], [.04, .07], [big ? .065 : .05, .1], [.035, .14], [0, .16]], 10), {x, y}), big ? 0xd9dde0 : 0x6f6a64); };
    POLE_WIRES.slice(0, 2).forEach(([x, y]) => ins(x, y - .17, true));
    POLE_WIRES.slice(2, 4).forEach(([x, y]) => ins(x, y - .17, false));
    // 통신선 받침과 감아 둔 여유선
    met(box(-.42, 6.55, -.03, .42, 6.6, .03)); P.add('cab', xf(new THREE.TorusGeometry(.28, .025, 6, 18), {x:.36, y:5.9, rx:Math.PI / 2 * .1}), 0x15171a);
    // 번호판
    const plt = new THREE.Mesh(quadZ(-.1, 2.3, .1, 2.6, rAt(2.45) + .01, [0, 0, 1, 1]), plateMat());
    if (v === 1) {   // 변압기 둘: 받침대 + 원통 + 부싱 + 퓨즈
      met(box(-.55, 7.55, .18, .55, 7.62, .7)); [-1, 1].forEach(s => met(tube([V(s * .5, 7.6, .7), V(s * .1, 6.9, .2)], .015, {radial:4})));
      [-.3, .3].forEach(x => { P.add('tr', xf(new THREE.CylinderGeometry(.24, .24, .9, 18), {x, y:8.08, z:.45}), 0x9aa3a8); P.add('tr', xf(new THREE.CylinderGeometry(.25, .25, .05, 18), {x, y:8.55, z:.45}), 0x8d969b);
        [-.08, .08].forEach(dx => P.add('ins', xf(new THREE.CylinderGeometry(.03, .04, .18, 8), {x:x + dx, y:8.66, z:.45}), 0x6f6a64));
        P.add('met', tube([V(x, 8.75, .45), V(x * 1.6, 9.2, .05)], .008, {radial:4}), 0x2b2e31); });
      [-1, 1].forEach(s => P.add('ins', xf(new THREE.CylinderGeometry(.03, .03, .3, 8), {x:s * .9, y:9.6, z:.1}), 0x6f6a64));
    }
    if (v === 2) { P.add('box', box(-.2, 3.6, .2, .2, 4.2, .42, .02), 0x8f9a9e); met(box(-.2, 3.85, .19, .2, 3.9, .21)); P.add('cab', tube([V(.1, 4.2, .3), V(.12, 6.5, .1)], .02, {radial:5}), 0x15171a); }
    P.add('snw', xf(new THREE.SphereGeometry(rAt(H) * .9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), {y:H + .05}));
    [10.3, 9.1].forEach((y, k) => P.add('snw', box(-(k ? .8 : 1.25), y + .05, -.035, k ? .8 : 1.25, y + .08, .035)));
    return assemble(P, [['con', concreteMaterial({seed:97})], ['band', plasticMaterial({rough:.6}), false], ['met', metalMaterial({rough:.45})], ['ins', plasticMaterial({rough:.3}), false],
      ['cab', matteMaterial(), false], ['tr', metalMaterial({rough:.5})], ['box', plasticMaterial({rough:.5}), false], ['snw', snowMaterial({seed:95}), false]], [2.6, H + .2, 1.4], [plt]); }});

// 전봇대 줄: 이웃한 두 전봇대의 같은 자리를 처진 곡선으로 잇는다. poles: [{x, z, rot}] (게임 단위). 한 덩어리 메쉬로 돌려준다.
//   drops: [{from:번호, to:[x, y, z], k:전선 번호}] 가게로 들어가는 인입선.
//   links: [[전봇대, 전봇대]] 줄과 줄을 잇는 전선 (도로 건너). 전봇대의 s(크기 배율)만큼 전선 자리도 커진다.
export function poleWires(poles, {drops = [], links = [], sag = .04} = {}){
  const P = new Parts(), at = (p, [ax, ay]) => { const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0), k = (p.s || 1) * U; return V(p.x + ax * k * c, (p.y || 0) + ay * k, p.z - ax * k * s); };
  const span = (a, b, r, col) => { const L = a.distanceTo(b), n = Math.max(6, Math.round(L / 2)), pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, q = a.clone().lerp(b, t); q.y -= sag * L * 4 * t * (1 - t); pts.push(q); }
    P.add('w', tube(pts, Math.max(r, .02) * U, {radial:4, caps:false}), col); };   // 너무 가늘면 멀리서 사라져서 2cm보다 굵게
  for (let i = 0; i + 1 < poles.length; i++) POLE_WIRES.forEach((w, k) => span(at(poles[i], w), at(poles[i + 1], w), w[2], w[3]));
  links.forEach(([a, b]) => POLE_WIRES.forEach(w => span(at(a, w), at(b, w), w[2], w[3])));
  drops.forEach(d => { const w = POLE_WIRES[d.k ?? 3]; span(at(poles[d.from], w), V(...d.to), .01, 0x1e2023); });
  const m = new THREE.Mesh(P.geo('w'), new THREE.MeshStandardMaterial({vertexColors:true, roughness:.7, metalness:.1})); m.castShadow = false; m.receiveShadow = false; return m;
}
