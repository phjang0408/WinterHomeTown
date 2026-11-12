// 구역 1: 아파트단지 ('동화')
// 북쪽부터: 방음벽 → 101·102동, 주민센터 → 보행로 → 단지 도로(정문은 동쪽 순환도로) → 주차장·놀이터, 103동 → 보행로 → 104~106동.
// 좌표는 게임 단위(1단위 ≈ 0.85m). 소품은 미터로 만들어져 있어 간격을 잡을 때 U(= 1m)를 곱한다.
import * as THREE from '../../lib/three.js';
import { root } from '../../core/engine.js';
import { W } from '../../world/world.js';
import { zone, tower } from '../../world/builders.js';
import { flatXZ, box, Parts } from '../../core/meshkit.js';
import { asphaltMaterial, roadPaintMaterial, concreteMaterial, paverMaterial, decalMaterial } from '../../core/texkit.js';
import { canvasTex } from '../../core/gfx.js';
import { quadY, mulberry } from '../../props/kit.js';
import { UNIT as U, FONT_D } from '../../config.js';

const ROADZ = [134, 141], LOT = {x0:53.3, x1:104.5, z0:141, z1:188, bx:55.5, n:14}, BW = 2.5 * U, BD = 5 * U, PLAY = {x0:110, z0:147, x1:171, z1:196};
// 주차 줄: [칸이 시작하는 z, 차 방향(0이면 앞이 남쪽)]. 방향이 0인 줄은 북쪽 통로에서, π인 줄은 남쪽 통로에서 들어온다.
const ROWS = [[141, 0], [148.5, Math.PI], [161.4, 0], [168.9, Math.PI], [181.8, 0]];
const PAINT = [0xe9ebec, 0xe9ebec, 0xdfe2e4, 0x9aa1a8, 0x8a9198, 0x2a2d31, 0x35393e, 0x5b6470, 0x2f4a6e, 0x7a2e2c, 0xc9c2b2];

export default {
  id:'apartments', name:'아파트단지',
  build(){
    zone(13,93,186,246,0xe2e9f4,'#e0e7f2');
    const R = mulberry(2024), P = new Parts();
    // ── 동 6개: 모두 남향, 16~18층. 103·105동은 'ㄱ'자 ──
    const towers = [[60, 116, {label:'102동', floors:17, chunks:2}], [112, 116, {label:'101동', floors:18, chunks:2}], [30.5, 161.5, {label:'103동', floors:16, shape:'L'}],
      [33, 225, {label:'104동', floors:18, chunks:1}], [80, 229.5, {label:'105동', floors:17, shape:'L'}], [140, 226, {label:'106동', floors:16, chunks:2}]].map(t => tower(t[0], t[1], 0, t[2]));
    // 동(현관·화단 포함) 둘레 1.5단위 안에는 나무·가로등·표지판을 놓지 않는다
    const free = p => !towers.some(t => t.userData.rects.some(r => p.x > r[0] - 1.5 && p.x < r[2] + 1.5 && p.z > r[1] - 1.5 && p.z < r[3] + 1.5));
    W.mmLabel(86, 100, '동화', 15);

    // ── 바닥: 단지 도로와 주차장(아스팔트), 경계석, 주민센터 앞마당(벽돌) ──
    const A = 0.045;
    P.add('asp', flatXZ(48, ROADZ[0], 195, ROADZ[1], A), 0xffffff); P.add('asp', flatXZ(LOT.x0, LOT.z0, LOT.x1, LOT.z1, A), 0xffffff);
    P.add('pav', flatXZ(139, 113.6, 161, 128, .04), 0xffffff); P.add('pav', flatXZ(96, 188, 110, 196.5, .04), 0xffffff);
    const curb = (x0, z0, x1, z1) => P.add('con', box(x0, 0, z0, x1, .17, z1, .03), 0xb4b8ba);
    curb(48, ROADZ[0] - .35, 174.6, ROADZ[0]); curb(179.4, ROADZ[0] - .35, 186, ROADZ[0]); curb(48, ROADZ[1], LOT.x0, ROADZ[1] + .35); curb(LOT.x1, ROADZ[1], 174.6, ROADZ[1] + .35); curb(179.4, ROADZ[1], 186, ROADZ[1] + .35);
    curb(47.65, ROADZ[0] - .35, 48, ROADZ[1] + .35); curb(LOT.x0 - .35, LOT.z0 + .35, LOT.x0, LOT.z1); curb(LOT.x1, LOT.z0 + .35, LOT.x1 + .35, LOT.z1); curb(LOT.x0 - .35, LOT.z1, 96, LOT.z1 + .35);
    W.mmRect(48, ROADZ[0], 195, ROADZ[1], '#c2c9d2'); W.mmRect(LOT.x0, LOT.z0, LOT.x1, LOT.z1, '#c9d0d8'); W.mmLabel(76, 164.5, '주차장', 14);

    // ── 주차장: 칸 선, 주차 턱, 차, 화단 ──
    const line = (x0, z0, x1, z1, c = 0xe6eaed) => P.add('lin', flatXZ(x0, z0, x1, z1, A + .006), c);
    const stops = [], cars = {}, islands = [], trees = [[], [], []], lamps = [], signs = [], car = (name, v, item) => (cars[name + '/' + v] || (cars[name + '/' + v] = [])).push(item);
    ROWS.forEach(([z0, rot], r) => {
      const dis = r === 0 || r === 2, zc = z0 + BD / 2, stopZ = rot ? z0 + 1.05 * U : z0 + BD - 1.05 * U;
      for (let i = 0; i <= LOT.n; i++) if (!(dis && i === LOT.n - 1)) line(LOT.bx + i * BW - .07, z0, LOT.bx + i * BW + .07, z0 + BD);
      line(LOT.bx, rot ? z0 - .07 : z0 + BD - .07, LOT.bx + LOT.n * BW, rot ? z0 + .07 : z0 + BD + .07);
      for (let i = 0; i < LOT.n; i++) {
        const x = LOT.bx + (i + .5) * BW;
        if (dis && i >= LOT.n - 2) { if (i === LOT.n - 2) W.place('disabledBay', {x:x + BW / 2, z:zc, rot:Math.PI}); continue; }
        stops.push({x, z:stopZ});
        if (R() > .58) continue;
        const k = R(), item = {x:x + (R() - .5) * .25, z:zc + (R() - .5) * .5 + (rot ? .25 : -.25), rot:rot + (R() - .5) * .05, color:PAINT[Math.floor(R() * PAINT.length)]};
        if (k < .5) car('carSedan', Math.floor(R() * 3), item); else if (k < .86) car('carSUV', Math.floor(R() * 2), item);
        else if (k < .95) car('truck1t', 0, {...item, color:[0x2e5fa3, 0xe6e8e9, 0x2e5fa3][Math.floor(R() * 3)]}); else car('deliveryVan', 0, {...item, color:0xeceeee});
      }
      [LOT.bx - 1.0, LOT.bx + LOT.n * BW + 1.0].forEach((x, e) => { islands.push({x, z:zc}); trees[(r + e) % 3].push({x, z:zc, rot:R() * 6, s:.8 + R() * .15}); });
    });
    car('deliveryVan', 0, {x:121, z:139.2, rot:Math.PI / 2 + .02, color:0xeceeee});                                      // 길가에 잠깐 세운 택배차
    [[LOT.bx + LOT.n * BW / 2, 147.7], [LOT.bx + LOT.n * BW / 2, 168.1]].forEach(([x, z]) => W.place('planterIsland', {x, z, rot:Math.PI / 2, len:LOT.n * 2.5 - .4, wid:1.2, gap:7}));
    for (let i = 0; i < 5; i++) [147.7, 168.1].forEach((z, k) => { const x = LOT.bx + (i + .5) * LOT.n * BW / 5; trees[(i + k) % 3].push({x, z, rot:R() * 6, s:.72 + R() * .12}); });
    W.placeMany('wheelStop', stops); W.placeMany('planterIsland', islands, {tree:true});
    Object.entries(cars).forEach(([key, list]) => { const [name, v] = key.split('/'); W.placeMany(name, list, {v:+v, snow:+v === 2 ? .35 : 1}); });

    // ── 도로 표시: 횡단보도, '천천히', 통로 화살표, 과속방지턱, 정문 ──
    for (let i = 0; i < 7; i++) line(173.6, ROADZ[0] + .35 + i * .98, 180.4, ROADZ[0] + .85 + i * .98);
    const D = new Parts(), arrow = [0, 0, .25, 1], text = [.25, 0, 1, 1];
    const mark = (cx, cz, w, h, ang, uv) => { const g = quadY(-w / 2, -h / 2, w / 2, h / 2, A + .008, uv); g.rotateY(ang); g.translate(cx, 0, cz); D.add('m', g); };
    mark(166, 137.5, 5.6, 2.2, Math.PI / 2, text); mark(60, 137.5, 5.6, 2.2, -Math.PI / 2, text);
    [[70, 157.9, Math.PI / 2], [86, 157.9, Math.PI / 2], [70, 178.3, -Math.PI / 2], [86, 178.3, -Math.PI / 2], [101.5, 150, 0], [101.5, 172, Math.PI]].forEach(([x, z, a]) => mark(x, z, 1.5, 4.2, a, arrow));
    const marks = new THREE.Mesh(D.geo('m'), decalMaterial(canvasTex(512, 128, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); g.fillStyle = 'rgba(232,236,239,.92)';
      g.beginPath(); g.moveTo(64, 8); g.lineTo(110, 60); g.lineTo(80, 60); g.lineTo(80, 120); g.lineTo(48, 120); g.lineTo(48, 60); g.lineTo(18, 60); g.closePath(); g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 104px ' + FONT_D; g.fillText('천천히', 320, 68); }), {alpha:true, rough:.9}));
    marks.receiveShadow = true; root.add(marks);
    W.place('speedBump', {x:128, z:137.5, rot:Math.PI / 2, len:5.9}); W.place('speedBump', {x:170, z:137.5, rot:Math.PI / 2, len:5.9}); W.place('speedBump', {x:101.5, z:160, len:4.9});
    W.place('aptGate', {x:187.5, z:137.5, rot:Math.PI / 2});

    // ── 분리수거장 (주차장 남쪽 끝), 음식물 쓰레기통 ──
    W.place('recycleStation', {x:101.5, z:193, rot:Math.PI}); W.mmLabel(101.5, 199, '분리수거장', 11);
    W.placeMany('foodWasteBin', [{x:107, z:191.6, rot:Math.PI}, {x:107.9, z:191.6, rot:Math.PI - .08}, {x:108.8, z:191.7, rot:Math.PI + .1}]);
    signs.push({x:96.8, z:189.4, rot:.3}, {x:106, z:189.3, rot:-.2}, {x:105.7, z:142.7, rot:Math.PI / 2}, {x:181.5, z:142.5, rot:1.2}, {x:50.5, z:142.2, rot:.5}, {x:134, z:133.1, rot:3.1}, {x:163, z:133.1, rot:3.3});

    // ── 주민센터와 앞마당 ──
    W.place('communityCenter', {x:150, z:108}); W.mmLabel(150, 108, '주민센터', 13);

    // ── 놀이터: 조합놀이대, 시소, 흔들 놀이기구, 쉼터 (그네는 activities/seats.js) ──
    zone(PLAY.x0, PLAY.z0, PLAY.x1, PLAY.z1, 0xf3ecdc, '#efe5d0', .02); W.mmLabel(140, 152, '놀이터', 15);
    W.place('playSet', {x:151, z:171}); W.place('seesaw', {x:120, z:184, rot:.2});
    W.place('springRider', {x:117, z:164, rot:.9}); W.place('springRider', {x:121.5, z:167.5, rot:-.6, color:0xd24a3a});
    W.place('pavilion', {x:163.5, z:188, rot:Math.PI}); W.place('pavilion', {x:110, z:228, rot:Math.PI / 2}); W.mmLabel(163.5, 193.5, '쉼터', 11);
    W.place('planterIsland', {x:140.5, z:144.2, rot:Math.PI / 2, len:50, wid:1.3});

    // ── 방음벽 (북쪽, 기찻길 쪽). 남북 보행로 자리는 비운다 ──
    const walls = []; for (let x = 15.4 + 2 * U; x < 186 - 2 * U; x += 4 * U) if (x + 2 * U < 173.5 || x - 2 * U > 180.5) walls.push({x, z:95.2});
    W.placeMany('noiseBarrier', walls);

    // ── 나무와 가로등 ──
    [[50, 126.4], [84, 126.4], [134, 126.4], [164, 126.4], [22, 132], [18, 190], [24, 204], [52, 198], [70, 200], [88, 203], [124, 202], [150, 200.5], [168, 150], [168, 176], [115, 150], [112, 176],
      [100, 240], [118, 238], [108, 216], [164, 216], [166, 240], [54, 240], [16, 244], [44, 100.5], [86, 100.5], [132, 100.5], [166, 101], [183, 150], [183, 196], [183, 222]]
      .forEach(([x, z], i) => trees[i % 3].push({x, z, rot:R() * 6, s:.85 + R() * .3}));
    trees.forEach((list, v) => W.placeMany('bareTree', list.filter(free), {v}));
    [[20, 128], [40, 136], [100, 232], [120, 246], [172, 232], [16, 216]].forEach(p => W.pine(p[0], p[1]));
    lamps.push({x:66, z:132.8}, {x:96, z:132.8}, {x:143, z:132.8}, {x:52.2, z:158}, {x:52.2, z:178.5}, {x:105.4, z:165}, {x:112, z:198}, {x:158, z:198}, {x:30, z:186}, {x:60, z:210.5}, {x:120, z:211}, {x:160, z:117}, {x:28, z:101}, {x:100, z:101});
    W.placeMany('parkLamp', lamps.filter(free)); W.placeMany('noParkingSign', signs.filter(free));

    // 바닥 메쉬
    [['asp', asphaltMaterial()], ['pav', paverMaterial()], ['con', concreteMaterial()], ['lin', roadPaintMaterial()]].forEach(([k, m]) => { const mesh = P.mesh(k, m, {cast:k === 'con'}); root.add(mesh); });
  },
};
