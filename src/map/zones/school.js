// 구역 3: 학교단지 (닫음)
// 2026-11-17: 학교를 북쪽 도로 울타리(z 90.3)까지 당겨 학교 북쪽 보도를 없앴다. 남쪽은 담장 화단 띠 + 넓은 보도.
// 2026-11-18: 네 변을 높은 학교 담(schoolWall)으로 두르고, 학교 안 나무는 없앴다.
//   옛 방식 나무 · 가로등을 새 소품(겨울 나무 · 단지 가로등)으로 바꿨다. 북쪽 담장은 북쪽 도로 울타리가 대신한다.
import * as THREE from '../../lib/three.js';
import { M, box, mesh, pillSprite, flat, canvasTex } from '../../core/gfx.js';
import { FONT_D } from '../../config.js';
const PI = Math.PI;
import { root } from '../../core/engine.js';
import { W } from '../../world/world.js';
import { zone, solid, building } from '../../world/builders.js';
import { SCHOOL, BENCHES } from '../layout.js';
import { TREES, LAMPS, bedStrip } from '../base.js';

const DZ = SCHOOL.z0 - 93;            // 예전 좌표(z 93 ~ 243)에서 옮긴 만큼
const z = v => v + DZ;

export default {
  id:'school', name:'학교단지',
  build(){
    const {x0, x1, z0, z1} = SCHOOL;
    zone(x0, z0, x1, z1, 0xe2e9f4, '#e0e7f2');
    zone(480, z(138), 586, z(234), 0xedf1e4, '#e8ecdc', .02); W.mmLabel(533, z(205), '운동장', 20);
    [[480, 138, 586, 138.25], [480, 233.75, 586, 234], [480, 138, 480.25, 234], [585.75, 138, 586, 234], [480, 173.85, 586, 174.15]].forEach(l => flat(l[0], z(l[1]), l[2], z(l[3]), 0xc3ccb9, .03));
    building(480, z(104), 618, z(118), 18, {kind:'apt', base:'#d6e0ea', label:'학교 본관', sign:false, face:'s'});   // (2026-11-27) 벽의 '학교 본관' 글씨는 뺌 (사용자)
    building(604, z(118), 618, z(234), 18, {kind:'apt', base:'#d6e0ea', face:'w'});
    solid(522, z(124), 544, z(130), 1.2, 0xc9d3de); box(521.8, z(123.8), 544.2, z(130.2), .12, M(0xf8fbfd), 1.2);
    // 학교는 닫았다 (2026-11-16): 교문도 닫고(미닫이 철문), 걷기 경계로 막는다
    // (2026-11-18) 담을 높였다: 콘크리트 아랫담 + 철 세로살 (높이 2.35m). 북쪽(북쪽 도로 울타리 자리)과 동쪽까지 네 변을 같은 담으로 두른다
    const gz = z(172), U_ = 1 / .85;
    const wallRun = (a, b, c, axis) => { const n = Math.max(1, Math.round((b - a) / (2.4 * U_))), len = (b - a) / n / U_, list = [];
      for (let i = 0; i < n; i++) { const t = a + (i + .5) * len * U_; list.push(axis === 'x' ? {x:t, z:c, rot:0} : {x:c, z:t, rot:-Math.PI / 2}); }
      W.placeMany('schoolWall', list, {len, collide:false}); };
    wallRun(x0, x1, z0, 'x'); wallRun(x0, x1, z1, 'x'); wallRun(z0, z1, x1, 'z'); wallRun(z0, gz - 5.8, x0, 'z'); wallRun(gz + 5.8, z1, x0, 'z');
    W.placeMany('schoolWall', [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, q]) => ({x, z:q})), {pillar:true, collide:false});
    W.rect(x0, z0 - .4, x1, z0 + .4); W.rect(x0, z1 - .4, x1, z1 + .4); W.rect(x0 - .4, z0, x0 + .4, z1); W.rect(x1 - .4, z0, x1 + .4, z1);
    for (let q = gz - 4.2; q < gz + 4.4; q += .45) mesh(new THREE.CylinderGeometry(.04, .04, 2.5, 6), M(0x5f7387), x0 + .25, 1.25, q);
    box(x0 + .15, gz - 4.4, x0 + .35, gz + 4.6, .1, M(0x5f7387), 2.45); box(x0 + .15, gz - 4.4, x0 + .35, gz + 4.6, .1, M(0x5f7387), .2);
    solid(x0 - .8, gz - 5.8, x0 + .8, gz - 4.4, 3.1, 0xc9d3de); solid(x0 - .8, gz + 4.4, x0 + .8, gz + 5.8, 3.1, 0xc9d3de);
    // (2026-11-20 3차) 교문에 붙인 안내판. 시작 자리(교문 앞)에서 화면을 가리지 않게 낮게, 문에 붙인다
    { const t = canvasTex(512, 160, (g, W, H) => { g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, W, H); g.strokeStyle = '#b23a2c'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
        g.fillStyle = '#b23a2c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '74px ' + FONT_D; g.fillText('방학 중 출입 금지', W / 2, H / 2 + 4); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .5), new THREE.MeshLambertMaterial({map:t})); m.rotation.y = -PI / 2; m.position.set(x0 - .22, 1.35, gz); root.add(m); }
    [[527, 234], [539, 234]].forEach(p => { mesh(new THREE.CylinderGeometry(.1, .1, 2.4, 8), M(0xf8fbfd), p[0], 1.2, z(p[1])); W.circle(p[0], z(p[1]), .15); });
    box(527, z(233.9), 539, z(234.1), .2, M(0xf8fbfd), 2.3);
    // (2026-11-18) 학교 안(운동장 둘레) 나무는 없앴다
    // 남쪽 담장 화단 띠와 나무 (통학로 가운데 가로등은 없앰)
    bedStrip(x0 + .4, z1 + .4, x1, z1 + 2.6); for (let x = x0 + 8, i = 0; x < x1 - 4; x += 16, i++) TREES.bare[(i + 2) % 6].push({x, z:z1 + 1.5, rot:i * 2.3, s:.95});
    // (2026-11-17) 남쪽 보도(SS): 담장 화단 앞에 벤치 두 개씩, 그 사이에 가로등 (등은 화단, 앉으면 도로 쪽)
    [490, 538, 586, 620].forEach(c => { [c - 3.2, c + 3.2].forEach(x => BENCHES.push({x, z:z1 + 3.4, f:1})); LAMPS.push({x:c, z:z1 + 3.3}); });
  },
};
