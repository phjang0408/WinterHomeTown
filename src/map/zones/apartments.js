// 구역 1: 아파트단지 ('동화') — 사용자 배치도(2026-11-13) 기준, 같은 날 바닥(도로·보도·화단)을 다시 만들고 배치를 정리했다.
//   테두리: 북·서·남 'ㄷ'자 방음벽, 동쪽은 외부도로(순환도로, 어린이 보호구역)와 녹지.
//   동: 북쪽 줄 103(ㄱ자, 북서 모서리)·102·101, 서쪽 104, 남쪽 줄 105(ㄱ자, 남서 모서리)·106·107. 현관은 모두 단지 안쪽 도로를 본다.
//   도로: 북동 입구 → 북쪽 도로(서쪽으로) → 서쪽 통로(남쪽으로) → 남쪽 도로(동쪽으로) → 남동 출구. 한 방향 통행, 꺾이는 곳은 둥글게 돈다.
//   보도: 붉은 벽돌. 104동 앞은 주차 줄을 없애고 넓은 보도(폭 약 9)와 나무 화단 띠로 바꿨다.
//   화단: 단지 맨바닥 전체가 눈 80% · 잔디 20% 바닥이고, 나무 띠와 동쪽 녹지는 경계석을 두른 화단이다.
//   가운데: 서쪽은 놀이터·공터, 동쪽은 주민센터와 상가. 104동 현관 → 횡단보도 → 놀이터 → 광장 → 상가 통로 → 동쪽 보행로로 이어진다.
// 좌표는 게임 단위(1단위 ≈ 0.85m). 소품은 미터로 만들어져 있어 간격을 잡을 때 U(= 1m)를 곱한다.
import * as THREE from '../../lib/three.js';
import { root } from '../../core/engine.js';
import { W } from '../../world/world.js';
import { zone, tower } from '../../world/builders.js';
import { flatXZ, box, loft, Parts } from '../../core/meshkit.js';
import { asphaltMaterial, roadPaintMaterial, concreteMaterial, brickPaveMaterial, bedMaterial, decalMaterial } from '../../core/texkit.js';
import { canvasTex } from '../../core/gfx.js';
import { quadY, mulberry } from '../../props/kit.js';
import { SHOP_LAYOUT } from '../../props/shops.js';
import { UNIT as U, FONT_D } from '../../config.js';
import { SLIDE } from '../layout.js';

const PI = Math.PI, A = .045, PV = .04;                        // A: 아스팔트 높이, PV: 보도 높이
const BW = 2.5 * U, BD = 5 * U;                                // 주차 칸 2.5m × 5m
// 길: 북쪽 도로, 서쪽 통로, 남쪽 도로 (x0, z0, x1, z1). R1·R2는 꺾이는 곳의 바깥·안쪽 반지름.
const NR = [50, 131, 195, 139], WD = [50, 131, 58, 206], SR = [50, 198, 195, 206], R1 = 4.5, R2 = 1.5, CW = .35;
const PLAY = [66, 144, 118, 193], CROSS_Z = [175, 181];       // 놀이터·공터, 104동 ↔ 놀이터 ↔ 상가 보행로
const PAINT = [0xe9ebec, 0xe9ebec, 0xd9dcde, 0xa3aab0, 0x8a9198, 0x2a2d31, 0x35393e, 0x2f4a6e, 0x6b2b2a, 0xc9c2b2, 0x46553f];
const FIRE = [[75, 135, PI / 2], [138, 135, PI / 2], [54, 158, 0], [88, 202, PI / 2]];       // 소방차 전용구역 (6m × 12m)

const rectPts = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const arc = (cx, cz, r, a0, a1, n = 8) => Array.from({length:n + 1}, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * PI / 180; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
// 바닥 한 장: 바깥 윤곽([x, z] 목록)과 도려낼 구멍들로 평평한 판을 만든다. uv는 맵 좌표.
function slab(outline, holes = [], y = 0){
  const sh = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  holes.forEach(h => sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z)))));
  const g = new THREE.ShapeGeometry(sh), p = g.getAttribute('position'), uv = g.getAttribute('uv'), n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = -p.getY(i); p.setXYZ(i, x, y, z); uv.setXY(i, x, z); n.setXYZ(i, 0, 1, 0); }
  return g;
}

export default {
  id:'apartments', name:'아파트단지',
  build(){
    W.mmRect(13, 93, 186, 246, '#e0e7f2');
    const R = mulberry(2026), P = new Parts(), D = new Parts();
    const line = (x0, z0, x1, z1, c = 0xe6eaed) => P.add('lin', flatXZ(x0, z0, x1, z1, A + .006), c);
    const paver = (x0, z0, x1, z1, mm = true) => { P.add('pav', flatXZ(x0, z0, x1, z1, PV), 0xffffff); if (mm) W.mmRect(x0, z0, x1, z1, '#e2cdc0'); };
    const curb = (x0, z0, x1, z1) => P.add('con', box(x0, 0, z0, x1, .17, z1, .03), 0xb4b8ba);
    const curbArc = (cx, cz, r0, r1, a0, a1) => P.add('con', loft(arc(cx, cz, 1, a0, a1, 10).map(([x, z]) => { const dx = x - cx, dz = z - cz;
      return [[r0, 0], [r1, 0], [r1, .17], [r0, .17]].map(([r, y]) => new THREE.Vector3(cx + dx * r, y, cz + dz * r)); })), 0xb4b8ba);
    // 경계석을 두른 화단 (나무 띠, 녹지)
    const bed = (x0, z0, x1, z1) => { [[x0, z0, x1, z0 + .3], [x0, z1 - .3, x1, z1], [x0, z0 + .3, x0 + .3, z1 - .3], [x1 - .3, z0 + .3, x1, z1 - .3]].forEach(r => P.add('con', box(r[0], 0, r[1], r[2], .19, r[3], .03), 0xb4b8ba));
      P.add('bed', flatXZ(x0 + .3, z0 + .3, x1 - .3, z1 - .3, .13), 0xffffff); };
    P.add('bed', flatXZ(13, 93, 186, 246, .012), 0xffffff);                                   // 단지 맨바닥: 눈 80% · 잔디 20%

    // ── 동 7개 ──
    // 일자 동: rot 0이면 현관이 북쪽, π면 남쪽, -π/2면 동쪽. 'ㄱ'자: +π/2면 모서리가 북서, π면 남서.
    [[36.8, 116.8, PI / 2, {label:'103동', floors:16, shape:'L'}], [74, 106.6, PI, {label:'102동', floors:17, chunks:2}], [128, 106.6, PI, {label:'101동', floors:18, chunks:2}],
      [27.1, 178, -PI / 2, {label:'104동', floors:18, chunks:2}],
      [36.3, 224.7, PI, {label:'105동', floors:17, shape:'L'}], [90, 232, 0, {label:'106동', floors:16, chunks:2}], [140, 232, 0, {label:'107동', floors:17, chunks:2}]]
      .forEach(([x, z, r, o]) => tower(x, z, r, o));
    W.mmLabel(98, 116, '동화', 15);

    // ── 도로: 'ㄷ'자 한 장. 꺾이는 곳은 둥글게, 소방차 전용구역 자리는 도려낸다 (표지가 자기 바닥판을 들고 온다) ──
    const road = [[195, NR[1]], ...arc(NR[0] + R1, NR[1] + R1, R1, -90, -180), ...arc(SR[0] + R1, SR[3] - R1, R1, 180, 90), [195, SR[3]], [195, SR[1]],
      ...arc(WD[2] + R2, SR[1] - R2, R2, 90, 180), ...arc(WD[2] + R2, NR[3] + R2, R2, 180, 270), [195, NR[3]]];
    const fireHole = ([x, z, rot]) => { const hx = (rot ? 6 : 3) * U, hz = (rot ? 3 : 6) * U; return rectPts(x - hx, z - hz, x + hx, z + hz); };
    P.add('asp', slab(road, FIRE.map(fireHole), A), 0xffffff);
    [NR, WD, SR].forEach(r => W.mmRect(r[0], r[1], r[2], r[3], '#c2c9d2'));
    FIRE.forEach(([x, z, rot]) => W.place('fireLane', {x, y:A, z, rot}));
    // 꺾이는 곳의 경계석과 보도 메움
    curbArc(NR[0] + R1, NR[1] + R1, R1, R1 + CW, -90, -180); curbArc(SR[0] + R1, SR[3] - R1, R1, R1 + CW, 180, 90);
    curbArc(WD[2] + R2, NR[3] + R2, R2 - CW, R2, 180, 270); curbArc(WD[2] + R2, SR[1] - R2, R2 - CW, R2, 90, 180);
    P.add('pav', slab([[NR[0] - CW, NR[1] - CW], ...arc(NR[0] + R1, NR[1] + R1, R1 + CW, -90, -180)], [], PV), 0xffffff);
    P.add('pav', slab([[SR[0] - CW, SR[3] + CW], ...arc(SR[0] + R1, SR[3] - R1, R1 + CW, 180, 90)], [], PV), 0xffffff);
    P.add('pav', slab([[WD[2] + R2, NR[3] + R2], ...arc(WD[2] + R2, NR[3] + R2, R2 - CW, 180, 270)], [], PV), 0xffffff);
    P.add('pav', slab([[WD[2] + R2, SR[1] - R2], ...arc(WD[2] + R2, SR[1] - R2, R2 - CW, 90, 180)], [], PV), 0xffffff);

    // ── 보도 (붉은 벽돌) ──
    paver(40.5, 120.5, 181, 124.75);                              // 북쪽 줄 현관 앞
    paver(40.5, 124.75, 58.4, 130.65);                            // 북서 모퉁이 마당 (분리수거장)
    paver(96.9, 124.75, 108.9, 130.65); paver(100, 130.65, 106, 131, false);          // 북쪽 횡단보도 머리
    paver(165, 124.75, 181, 130.65); paver(165.5, 130.65, 171.5, 131, false);         // 경비실 앞
    paver(40.5, 130.65, 49.65, 206.35);                           // 104동 앞 넓은 보도
    paver(49.65, 174.5, 50, 181.5, false); paver(58, 174.5, 58.35, 181.5, false);     // 서쪽 통로 횡단보도 턱 낮춤
    paver(40.5, 206.35, 59.4, 212.25);                            // 남서 모퉁이 마당
    paver(40.5, 212.25, 181, 216.6);                              // 남쪽 줄 현관 앞
    paver(112.6, 206.35, 118.4, 212.25); paver(113, 206, 118, 206.35, false);         // 남쪽 횡단보도 머리
    paver(165.7, 206.35, 181, 212.25); paver(165.7, 206, 171.5, 206.35, false);
    paver(59.5, 139.35, 186, 143); paver(58.35, 140.5, 59.5, 143, false); paver(58.35, 143, 64.25, 144.65, false);     // 북측 보행통로
    [[100, 106], [165.5, 171.5]].forEach(([a, b]) => paver(a, 139, b, 139.35, false));
    paver(64.25, 194, 186, 197.65); paver(58.35, 195.65, 64.25, 196.5, false); paver(59.5, 196.5, 64.25, 197.65, false); // 남측 보행통로
    [[113, 118], [165.5, 171.5]].forEach(([a, b]) => paver(a, 197.65, b, 198, false));
    paver(58.35, 171.85, 64.25, 183.15); paver(64.25, CROSS_Z[0], 120, CROSS_Z[1]);    // 104동 ↔ 놀이터 ↔ 광장
    paver(120, 143, 146, 194);                                    // 가운데 광장
    paver(146, 143, 162, 150.5); paver(146, 163, 168, 194);       // 주민센터 앞, 상가 마당
    paver(168, CROSS_Z[0], 188, CROSS_Z[1]);                      // 상가 뒤 → 단지 동쪽 보행로

    // ── 주차 줄: 길 가장자리에서 칸이 바깥으로 이어진다 ──
    // axis 'x': x0부터 동쪽으로 n칸, 칸 깊이는 z0에서 dir 쪽으로. axis 'z': z0부터 남쪽으로 n칸, 깊이는 x0에서 dir 쪽으로.
    const stops = [], cars = {}, islands = [], bays = [], car = (name, v, it) => (cars[name + '/' + v] || (cars[name + '/' + v] = [])).push(it);
    function bayRow({x0, z0, n, axis, dir, dis = [], fill = .5}){
      const along = (i, t = .5) => axis === 'x' ? [x0 + (i + t) * BW, z0 + dir * BD / 2] : [x0 + dir * BD / 2, z0 + (i + t) * BW];
      const rot = axis === 'x' ? (dir > 0 ? 0 : PI) : (dir > 0 ? PI / 2 : -PI / 2), d0 = Math.min(axis === 'x' ? z0 : x0, (axis === 'x' ? z0 : x0) + dir * BD), d1 = d0 + BD, s0 = axis === 'x' ? x0 : z0;
      const sep = i => { const p = s0 + i * BW; if (axis === 'x') line(p - .07, d0, p + .07, d1); else line(d0, p - .07, d1, p + .07); };
      for (let i = 0; i <= n; i++) if (!dis.includes(i - 1)) sep(i);
      // 칸 바닥: 장애인 전용구역 자리는 비운다 (표지가 자기 바닥판을 들고 온다)
      let from = s0; const seg = (a, b) => { if (b - a < .01) return; const r = axis === 'x' ? [a, d0, b, d1] : [d0, a, d1, b]; P.add('asp', flatXZ(r[0], r[1], r[2], r[3], A), 0xffffff); W.mmRect(r[0], r[1], r[2], r[3], '#c9d0d8'); };
      [...dis].sort((p, q) => p - q).forEach(i => { const c = s0 + (i + 1) * BW; seg(from, c - 1.65 * U); from = c + 1.65 * U; }); seg(from, s0 + n * BW);
      bays.push(axis === 'x' ? [s0, d0, s0 + n * BW, d1] : [d0, s0, d1, s0 + n * BW]);
      for (let i = 0; i < n; i++) {
        if (dis.includes(i - 1)) continue;
        if (dis.includes(i)) { const [x, z] = along(i, 1); W.place('disabledBay', {x, y:A, z, rot:rot + (dir > 0 ? 0 : PI)}); continue; }
        const [x, z] = along(i), hd = (BD / 2 - 1.05 * U) * dir;
        stops.push(axis === 'x' ? {x, z:z + hd, rot:0} : {x:x + hd, z, rot:PI / 2});
        if (R() > fill) continue;                                                              // 빈 칸
        const k = R(), jit = (R() - .5) * .3, it = {x:x + (axis === 'x' ? jit : -dir * .3), z:z + (axis === 'x' ? -dir * .3 : jit), rot:rot + (R() - .5) * .05, color:PAINT[Math.floor(R() * PAINT.length)]};
        if (k < .42) car('carSedan', Math.floor(R() * 3), it); else if (k < .66) car('carSUV', Math.floor(R() * 2), it);
        else if (k < .9) car('carMini', Math.floor(R() * 3), {...it, color:R() < .35 ? 0xd9a520 : it.color}); else car('truck1t', 0, {...it, color:[0x2e5fa3, 0xe6e8e9][Math.floor(R() * 2)]});
      }
      // 줄 양 끝의 화단 섬
      [-.8, n * BW + .8].forEach(o => { const [x, z] = axis === 'x' ? [x0 + o, z0 + dir * BD / 2] : [x0 + dir * BD / 2, z0 + o]; islands.push({x, z, rot:axis === 'x' ? 0 : PI / 2}); });
    }
    // 북쪽 줄 (102동 앞, 101동 앞): 칸 머리가 북쪽
    bayRow({x0:60, z0:131, n:12, axis:'x', dir:-1, dis:[9]});
    bayRow({x0:110.5, z0:131, n:18, axis:'x', dir:-1, fill:.55});
    // 서쪽 통로: 놀이터 쪽만. (104동 쪽 줄은 넓은 보도로 바꿨다)
    bayRow({x0:58, z0:145, n:9, axis:'z', dir:1, fill:.45});
    bayRow({x0:58, z0:183.5, n:4, axis:'z', dir:1});
    // 남쪽 줄 (106동·107동 앞): 칸 머리가 남쪽
    bayRow({x0:61, z0:206, n:17, axis:'x', dir:1, dis:[1, 13]});
    bayRow({x0:120, z0:206, n:15, axis:'x', dir:1, fill:.55});
    car('deliveryVan', 0, {x:150.5, z:132.3, rot:-PI / 2 + .02, color:0xffffff});       // 택배차는 한 대: 101동 앞 길가에 잠깐 세워 둠
    // 경계석
    [[60, 124.75, 95.28, 125.1], [110.5, 124.75, 163.42, 125.1], [54.5, 130.65, 58.4, 131], [96.9, 130.65, 100, 131], [106, 130.65, 108.9, 131], [165, 130.65, 165.5, 131], [171.5, 130.65, 181, 131],
      [59.5, 139, 100, 139.35], [106, 139, 165.5, 139.35], [171.5, 139, 186, 139.35],
      [49.65, 135.5, 50, 174.5], [49.65, 181.5, 50, 201.5], [58, 140.5, 58.35, 144.65], [58, 144.65, 64.25, 145], [63.9, 145, 64.25, 171.5], [58, 171.5, 64.25, 171.85], [58, 171.85, 58.35, 174.5],
      [58, 181.5, 58.35, 183.15], [58, 183.15, 64.25, 183.5], [63.9, 183.5, 64.25, 195.3], [58, 195.3, 64.25, 195.65], [58, 195.65, 58.35, 196.5],
      [59.5, 197.65, 113, 198], [118, 197.65, 165.5, 198], [171.5, 197.65, 186, 198],
      [54.5, 206, 59.4, 206.35], [61, 211.9, 110.98, 212.25], [112.6, 206, 113, 206.35], [118, 206, 118.4, 206.35], [120, 211.9, 164.1, 212.25], [171.5, 206, 181, 206.35]]
      .forEach(r => curb(...r));
    W.placeMany('wheelStop', stops);
    W.placeMany('planterIsland', islands, {len:5, wid:1.2});
    Object.entries(cars).forEach(([key, list]) => { const [name, v] = key.split('/'); W.placeMany(name, list, {v:+v, snow:+v === 2 ? .35 : 1}); });

    // ── 도로 표시: 횡단보도, 마름모(횡단보도 예고), 방향 화살표, 과속방지턱 ──
    // 횡단보도 줄무늬는 차가 달리는 방향으로 길고, 건너는 방향으로 늘어선다.
    const zebraX = (x0, x1, z0, z1) => { for (let z = z0 + .3; z < z1 - .4; z += 1.0) line(x0, z, x1, z + .5); };    // 동서 도로를 남북으로 건넘
    const zebraZ = (x0, x1, z0, z1) => { for (let x = x0 + .3; x < x1 - .4; x += 1.0) line(x, z0, x + .5, z1); };    // 남북 통로를 동서로 건넘
    zebraX(100.5, 105.5, NR[1], NR[3]); zebraX(166, 171, NR[1], NR[3]); zebraX(113, 118, SR[1], SR[3]); zebraX(166, 171, SR[1], SR[3]);
    zebraZ(WD[0], WD[2], CROSS_Z[0] + .4, CROSS_Z[1] - .4);
    const mark = (cx, cz, w, h, ang, uv) => { const g = quadY(-w / 2, -h / 2, w / 2, h / 2, A + .008, uv); g.rotateY(ang); g.translate(cx, 0, cz); D.add('m', g); };
    const arrow = [0, 0, .2, 1], text = [.2, 0, .8, 1], diamond = [.8, 0, 1, 1];
    [90, 124, 158].forEach(x => mark(x, 135, 1.5, 4.2, PI / 2, arrow));                          // 북쪽 도로: 서쪽으로
    [145.5, 190].forEach(z => mark(54, z, 1.5, 4.2, PI, arrow));                             // 서쪽 통로: 남쪽으로
    [74, 128, 150].forEach(x => mark(x, 202, 1.5, 4.2, -PI / 2, arrow));                          // 남쪽 도로: 동쪽으로
    mark(179.3, 135, 5.6, 2.2, PI / 2, text); mark(66, 202, 5.6, 2.2, -PI / 2, text);
    // 마름모: 차가 오는 쪽에서 횡단보도 앞에 그린다
    mark(113.5, 135, 1.7, 4, PI / 2, diamond); mark(54, 168.6, 1.7, 4, 0, diamond); mark(105, 202, 1.7, 4, PI / 2, diamond); mark(157.5, 202, 1.7, 4, PI / 2, diamond);
    const marks = new THREE.Mesh(D.geo('m'), decalMaterial(canvasTex(640, 128, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); g.fillStyle = g.strokeStyle = 'rgba(232,236,239,.92)';
      g.beginPath(); g.moveTo(64, 8); g.lineTo(110, 60); g.lineTo(80, 60); g.lineTo(80, 120); g.lineTo(48, 120); g.lineTo(48, 60); g.lineTo(18, 60); g.closePath(); g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '104px ' + FONT_D; g.fillText('천천히', 320, 68);
      g.lineWidth = 9; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(576, 5); g.lineTo(630, 64); g.lineTo(576, 123); g.lineTo(522, 64); g.closePath(); g.stroke(); }), {alpha:true, rough:.9}));
    marks.receiveShadow = true; root.add(marks);
    [[54, 172.6, 0], [54, 183.4, 0], [174, 135, PI / 2], [62, 202, PI / 2], [175, 202, PI / 2]].forEach(([x, z, rot]) => W.place('speedBump', {x, y:A, z, rot, len:6.9}));

    // ── 입구·출구 문주, 경비실 ──
    W.place('aptGate', {x:183.5, z:135, rot:PI / 2}); W.place('aptGate', {x:183.5, z:202, rot:-PI / 2});
    W.place('guardHouse', {x:171, z:121.2}); W.mmLabel(171, 117, '경비실', 10);

    // ── 분리수거장 두 곳 (북서 모퉁이 마당, 107동 동쪽), 음식물 쓰레기통 ──
    W.place('recycleStation', {x:53.6, z:127.4}); W.place('recycleStation', {x:168.5, z:220, rot:PI});
    W.placeMany('foodWasteBin', [{x:47.6, z:127.6, rot:0}, {x:48.6, z:127.7, rot:.08}, {x:164, z:224.4, rot:PI}, {x:164.9, z:224.4, rot:PI - .1}, {x:165.8, z:224.5, rot:PI + .06}]);
    W.mmLabel(53.6, 124, '분리수거장', 9); W.mmLabel(168.5, 226, '분리수거장', 9);

    // ── 주민센터와 상가 ──
    W.place('communityCenter', {x:150, z:156, rot:PI}); W.mmLabel(150, 155, '주민센터', 11);
    const SX = 158, SZ = 178, SR_ = -PI / 2, sc = Math.cos(SR_), ss = Math.sin(SR_);       // 상가: 정면(계단)이 서쪽(놀이터)을 본다. 가운데 통로로 동쪽 보행로까지 지나갈 수 있다
    SHOP_LAYOUT.forEach(([name, o, x, y, z, r]) => W.place(name, {...o, x:SX + (x * sc + z * ss) * U, y:y * U, z:SZ + (-x * ss + z * sc) * U, rot:SR_ + (r || 0)}));
    W.mmRect(149.9, 164.6, 163.4, 191.4, '#c9c3b5'); W.mmLabel(157, 170, '동화상가', 11);
    W.place('phoneBooth', {x:147.3, z:186.6, rot:-PI / 2});

    // ── 놀이터·공터 ──
    zone(PLAY[0], PLAY[1], PLAY[2], PLAY[3], 0xf3ecdc, '#efe5d0', .02); W.mmLabel(80, 150, '놀이터', 13); W.mmLabel(106, 188, '공터', 11);
    W.place('playSet', {x:78.5, z:154}); W.place('spiralSlide', {x:SLIDE.x, z:SLIDE.z, rot:SLIDE.rot}); W.place('pavilion', {x:111, z:152});
    W.place('seesaw', {x:76, z:168.5, rot:.1}); W.place('merryGoRound', {x:87.5, z:167});
    W.place('springRider', {x:70, z:161.5, rot:.9}); W.place('springRider', {x:96.5, z:170, rot:-.6, color:0xd24a3a});
    // 놀이터 둘레 생울타리: 변마다 두 줄, 드나드는 자리는 비운다
    [144.7, 192.3].forEach(z => [[77.5, 21], [106.5, 21]].forEach(([x, len]) => W.place('hedgeRow', {x, z, len:len / U})));
    [65.5, 118.6].forEach(x => [[159.5, 28], [187, 9.5]].forEach(([z, len]) => W.place('hedgeRow', {x, z, len:len / U, rot:PI / 2})));

    // ── 방음벽 ('ㄷ'자) ──
    const walls = [];
    for (let x = 15.4 + 2 * U; x < 186 - 2 * U + .1; x += 4 * U) { walls.push({x, z:95.2}); walls.push({x, z:245.3}); }
    for (let z = 95.2 + 2 * U + .2; z < 245.3 - 2 * U + .1; z += 4 * U) walls.push({x:15, z, rot:PI / 2});
    W.placeMany('noiseBarrier', walls);

    // ── 화단과 나무: 줄을 맞춰 같은 간격으로 심는다 ──
    bed(47.2, 141.5, 49.65, 174.2); bed(47.2, 181.8, 49.65, 201);                  // 104동 앞 나무 띠
    bed(169, 143.5, 185.6, 174.5); bed(169, 181.5, 185.6, 193.5);                  // 동쪽 녹지
    const free = p => !W.blocked(p.x, p.z), row = (a, b, step) => { const out = []; for (let v = a; v <= b + .01; v += step) out.push(v); return out; };
    const bare = [[], [], [], []], pine = [[], [], []], T = (v, x, z, s = .9) => bare[v].push({x, z, rot:R() * 6, s}), Pn = (v, x, z) => pine[v % 3].push({x, z, rot:R() * 6});
    [145.5, 153, 160.5, 168, 186, 193.5].forEach(z => T(1, 48.4, z, .8));                               // 104동 앞 띠
    const gap = (x, list) => list.some(([a, b]) => x > a - 1 && x < b + 1);
    row(66, 176, 10).filter(x => !gap(x, [[100, 106], [165.5, 171.5]])).forEach(x => T(0, x, 140.05, .82));   // 북측 보행통로 가로수
    row(66, 176, 10).filter(x => !gap(x, [[113, 118], [165.5, 171.5]])).forEach(x => T(0, x, 196.95, .82));   // 남측 보행통로 가로수
    [151, 161, 171, 187].forEach(z => T(3, 133, z, .95));                                              // 광장
    [147, 155, 163, 171, 184.5, 190.5].forEach(z => T(2, 182.6, z));                                   // 동쪽 녹지 바깥 줄
    [103, 111, 119, 211, 219, 227, 235].forEach((z, i) => Pn(i, 182.6, z)); T(0, 182.6, 126.5);
    [56.9, 94.5, 101, 107.5, 149, 157, 165].forEach((x, i) => Pn(i, x, 104));                           // 북쪽 방음벽 앞
    [58, 64.5, 71, 109, 115, 121, 161, 169, 177].forEach((x, i) => Pn(i, x, 234.5));                    // 남쪽 방음벽 앞
    bare.forEach((list, v) => W.placeMany('bareTree', list.filter(free), {v}));
    pine.forEach((list, v) => W.placeMany('pineTree', list.filter(free), {v}));
    // 동 베란다 쪽 생울타리
    [[74, 97.6, 26], [128, 97.6, 26], [44, 97.4, 16], [90, 240.6, 26], [140, 240.6, 26], [44, 243.9, 14]].forEach(([x, z, len]) => W.place('hedgeRow', {x, z, len}));
    [[17.4, 116, 26], [17.9, 178, 26], [17.4, 224, 26]].forEach(([x, z, len]) => W.place('hedgeRow', {x, z, len, rot:PI / 2}));
    // 관목: 동쪽 녹지 안쪽 줄, 주민센터 옆, 나무 띠 사이
    const balls = v => list => W.placeMany('shrubBall', list.map(([x, z]) => ({x, z, rot:R() * 6})).filter(free), {v});
    balls(1)([147, 155, 163, 171, 184.5, 190.5].map(z => [174.5, z]));
    balls(0)([...[151, 159, 167, 187.5].map(z => [178.5, z]), ...[143.5, 147, 150.5, 154, 157.5].map(x => [x, 162.5]), ...[149.2, 156.8, 164.2, 189.8].map(z => [48.4, z])]);
    balls(2)([[22, 100], [178, 240], [22, 241]]);
    [[171.5, 145.6, 0], [171.5, 172.4, 0], [171.5, 183.6, 0], [171.5, 191.4, 0]].forEach(([x, z, rot]) => W.place('shrubCluster', {x, z, rot}));

    // ── 가로등: 보행통로는 가로수 사이, 현관 앞 보도는 현관 사이 ──
    const lamps = [...row(71, 151, 20).flatMap(x => [{x, z:143.3}, {x, z:193.7}]), {x:180, z:142.2}, {x:180, z:194.8},
      ...[57, 74, 103, 128, 147].map(x => ({x, z:121.3})), ...[60, 90, 113, 140, 160].map(x => ({x, z:215.8})),
      ...[149, 164.5, 189.5].map(z => ({x:46.5, z})), {x:119.4, z:146}, {x:119.4, z:191}, {x:65, z:173.5}, {x:65, z:182.5}, {x:145, z:162}, {x:145, z:192.5}];
    W.placeMany('parkLamp', lamps.filter(free));

    // ── 주차금지 오뚜기: 주차 칸 밖, 차를 세우면 안 되는 길가(횡단보도 옆·모퉁이·소방차 전용구역 옆)에 둔다 ──
    const inBay = p => bays.some(b => p.x > b[0] - .3 && p.x < b[2] + .3 && p.z > b[1] - .3 && p.z < b[3] + .3);
    W.placeMany('noParkingSign', [{x:98.6, z:131.7, rot:.3}, {x:107.4, z:131.7, rot:-.2}, {x:98.8, z:138.3}, {x:107.2, z:138.3, rot:.4}, {x:164.6, z:138.3}, {x:172.6, z:138.3, rot:-.3},
      {x:50.7, z:173.6, rot:PI / 2}, {x:50.7, z:182.4, rot:PI / 2 + .3}, {x:57.3, z:142.4, rot:-1.2}, {x:57.3, z:197, rot:1.1},
      {x:111.6, z:198.7}, {x:119.4, z:198.7, rot:.2}, {x:111.8, z:205.3, rot:-.3}, {x:119.2, z:205.3}, {x:164.6, z:198.7}, {x:172.6, z:205.3, rot:.3}].filter(p => !inBay(p) && free(p)));

    // ── 게시판, 현수막 게시대 ──
    W.place('noticeBoard', {x:126, z:144.6}); W.place('noticeBoard', {x:45.6, z:137.4, rot:PI / 2}); W.place('noticeBoard', {x:106, z:217.5, rot:PI});
    W.place('bannerBoard', {x:186.9, z:148.5, rot:PI / 2}); W.place('bannerBoard', {x:186.9, z:189, rot:PI / 2});

    // 바닥 메쉬
    [['asp', asphaltMaterial()], ['pav', brickPaveMaterial()], ['bed', bedMaterial()], ['con', concreteMaterial()], ['lin', roadPaintMaterial()]].forEach(([k, m]) => root.add(P.mesh(k, m, {cast:k === 'con'})));
  },
};
