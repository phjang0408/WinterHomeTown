// 구역 3: 학교단지 (닫음)
// 2026-11-17: 학교를 북쪽 도로 울타리(z 90.3)까지 당겨 학교 북쪽 보도를 없앴다. 남쪽은 담장 화단 띠 + 넓은 보도.
//   옛 방식 나무 · 가로등을 새 소품(겨울 나무 · 단지 가로등)으로 바꿨다. 북쪽 담장은 북쪽 도로 울타리가 대신한다.
import * as THREE from '../../lib/three.js';
import { M, box, mesh, pillSprite, flat } from '../../core/gfx.js';
import { root } from '../../core/engine.js';
import { W } from '../../world/world.js';
import { zone, solid, building, fence } from '../../world/builders.js';
import { SCHOOL } from '../layout.js';
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
    building(480, z(104), 618, z(118), 18, {kind:'apt', base:'#d6e0ea', label:'학교 본관', face:'s'});
    building(604, z(118), 618, z(234), 18, {kind:'apt', base:'#d6e0ea', face:'w'});
    solid(522, z(124), 544, z(130), 1.2, 0xc9d3de); box(521.8, z(123.8), 544.2, z(130.2), .12, M(0xf8fbfd), 1.2);
    const F = 0x9fb0c2;
    // 학교는 닫았다 (2026-11-16): 교문도 닫고(미닫이 철문), 걷기 경계로 막는다
    fence(x0, z0, x0, z1, 1.5, F, true);
    const gz = z(172);
    for (let q = gz - 4.2; q < gz + 4.4; q += .45) mesh(new THREE.CylinderGeometry(.04, .04, 1.7, 6), M(0x5f7387), x0 + .25, .85, q);
    box(x0 + .15, gz - 4.4, x0 + .35, gz + 4.6, .1, M(0x5f7387), 1.6); box(x0 + .15, gz - 4.4, x0 + .35, gz + 4.6, .1, M(0x5f7387), .2);
    fence(x0, z1, x1, z1, 1.5, F, true); fence(x1, z0, x1, z1, 1.5, F, true);
    solid(x0 - .8, gz - 5.8, x0 + .8, gz - 4.4, 2.8, 0xc9d3de); solid(x0 - .8, gz + 4.4, x0 + .8, gz + 5.8, 2.8, 0xc9d3de);
    const s = pillSprite('학교 · 방학 중 출입 금지', 'rgba(255,255,255,.92)', '#2b3f55', 1); s.position.set(x0, 3.9, gz); root.add(s);
    [[527, 234], [539, 234]].forEach(p => { mesh(new THREE.CylinderGeometry(.1, .1, 2.4, 8), M(0xf8fbfd), p[0], 1.2, z(p[1])); W.circle(p[0], z(p[1]), .15); });
    box(527, z(233.9), 539, z(234.1), .2, M(0xf8fbfd), 2.3);
    // 학교 안 나무 (새 방식 겨울 나무, 담장 안쪽)
    [[470, 100], [470, 140], [470, 210], [505, 239], [565, 239], [595, 128], [595, 200]].forEach(([x, q], i) => TREES.bare[i % 6].push({x, z:z(q), rot:i * 1.7, s:1}));
    // 남쪽 담장 화단 띠와 나무, 통학로 가로등
    bedStrip(x0 + .4, z1 + .4, x1, z1 + 2.6); for (let x = x0 + 8, i = 0; x < x1 - 4; x += 16, i++) TREES.bare[(i + 2) % 6].push({x, z:z1 + 1.5, rot:i * 2.3, s:.95});
    [[455, 165], [455, 180]].forEach(([x, q]) => LAMPS.push({x, z:q}));
  },
};
