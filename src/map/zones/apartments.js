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
import { zone, tower, spotLabel } from '../../world/builders.js';
import { flatXZ, box, loft, Parts } from '../../core/meshkit.js';
import { asphaltMaterial, roadPaintMaterial, concreteMaterial, brickPaveMaterial, bedMaterial, decalMaterial , antiTile } from '../../core/texkit.js';
import { canvasTex, flat, G } from '../../core/gfx.js';
import { quadY, mulberry } from '../../props/kit.js';
import { SHOP_LAYOUT } from '../../props/shops.js';
import { UNIT as U, FONT_D } from '../../config.js';
import { SLIDE, PHONES, PLAY } from '../layout.js';

const PI = Math.PI, A = .045, PV = .15;                        // A: 아스팔트 높이, PV: 보도 높이 (2026-11-16: 길보다 한 단 높게)
const BW = 2.5 * U, BD = 5 * U;                                // 주차 칸 2.5m × 5m
// 길: 북쪽 도로, 서쪽 통로, 남쪽 도로 (x0, z0, x1, z1). R1·R2는 꺾이는 곳의 바깥·안쪽 반지름.
const NR = [50, 131, 195, 139], WD = [50, 131, 58, 206], SR = [50, 198, 195, 206], R1 = 4.5, R2 = 1.5, CW = .35;
const PK = {x:44.5, n:125.1, nb:137, sb:200, s:211.9}, RP = 2.5, RF = 1.5;     // (2026-11-18) 103 · 105동 앞 넓힌 길: 서쪽 끝 x, 북서 길 북 · 남 끝, 남서 길 북 · 남 끝
const CROSS_Z = [175, 181], LOW = {road:null, bays:[]};       // 놀이터·공터, 104동 ↔ 놀이터 ↔ 상가 보행로
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
    // 걷는 높이: 단지 안은 보도 높이(PV), 길 · 주차칸 · 놀이터만 낮다 (길 · 주차칸은 아래에서 정해지면 LOW에 넣는다)
    const inRoad = (x, z) => { const road = LOW.road; if (!road) return false; let c = false; for (let i = 0, j = road.length - 1; i < road.length; j = i++) { const [xi, zi] = road[i], [xj, zj] = road[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const low = (x, z) => inRoad(x, z) || LOW.bays.some(r => x > r[0] && x < r[2] && z > r[1] && z < r[3]) || (x > PLAY[0] && x < PLAY[2] && z > PLAY[1] && z < PLAY[3] && !(z > CROSS_Z[0] && z < CROSS_Z[1]));
    W.addHeight((x, z) => x > 13 && x < 186 && z > 93 && z < 246 && !low(x, z) ? PV : null, -1);
    const R = mulberry(2026), P = new Parts(), D = new Parts();
    const line = (x0, z0, x1, z1, c = 0xe6eaed) => P.add('lin', flatXZ(x0, z0, x1, z1, A + .006), c);
    const paver = (x0, z0, x1, z1, mm = true) => { P.add('pav', flatXZ(x0, z0, x1, z1, PV), 0xffffff); if (mm) W.mmRect(x0, z0, x1, z1, '#e2cdc0'); };
    const curb = (x0, z0, x1, z1) => P.add('con', box(x0, 0, z0, x1, .17, z1, .03), 0xb4b8ba);
    const curbArc = (cx, cz, r0, r1, a0, a1) => P.add('con', loft(arc(cx, cz, 1, a0, a1, 10).map(([x, z]) => { const dx = x - cx, dz = z - cz;
      return [[r0, 0], [r1, 0], [r1, .17], [r0, .17]].map(([r, y]) => new THREE.Vector3(cx + dx * r, y, cz + dz * r)); })), 0xb4b8ba);
    // 경계석을 두른 화단 (나무 띠, 녹지)
    const bed = (x0, z0, x1, z1) => { [[x0, z0, x1, z0 + .3], [x0, z1 - .3, x1, z1], [x0, z0 + .3, x0 + .3, z1 - .3], [x1 - .3, z0 + .3, x1, z1 - .3]].forEach(r => P.add('con', box(r[0], 0, r[1], r[2], .27, r[3], .03), 0xb4b8ba));
      P.add('bed', flatXZ(x0 + .3, z0 + .3, x1 - .3, z1 - .3, .21), 0xffffff); };   // 보도(.15)보다 높게
    // 단지 맨바닥 (2026-11-16): 화단이 아닌 곳은 모두 벽돌. 놀이터 자리만 비운다 (놀이터 바닥이 따로 있다). 화단은 아래 '화단' 목록에서 경계석과 함께 올린다
    // (벽돌 맨바닥은 길 · 주차칸 · 놀이터를 빼고 맨 끝에서 깐다: groundRaster)

    // ── 동 7개 ──
    // 일자 동: rot 0이면 현관이 북쪽, π면 남쪽, -π/2면 동쪽. 'ㄱ'자: +π/2면 모서리가 북서, π면 남서.
    [[36.8, 116.8, PI / 2, {label:'103동', floors:16, shape:'L'}], [74, 106.6, PI, {label:'102동', floors:17, chunks:2}], [128, 106.6, PI, {label:'101동', floors:18, chunks:2}],
      [27.1, 178, -PI / 2, {label:'104동', floors:18, chunks:2}],
      [36.3, 224.7, PI, {label:'105동', floors:17, shape:'L'}], [90, 232, 0, {label:'106동', floors:16, chunks:2}], [140, 232, 0, {label:'107동', floors:17, chunks:2}]]
      .forEach(([x, z, r, o]) => tower(x, z, r, o));
    W.mmLabel(98, 116, '동화', 15);

    // ── 도로: 'ㄷ'자 한 장. 꺾이는 곳은 둥글게, 소방차 전용구역 자리는 도려낸다 (표지가 자기 바닥판을 들고 온다) ──
    // 길 (2026-11-16): 동쪽 끝은 단지 경계(x 186)까지 — 그 너머는 끊기지 않는 보도. 남서 모퉁이는 105동 현관 앞까지 넓혀 차를 댈 수 있다 (배치도)
    // 길 (2026-11-16): 정문 · 후문에서 바깥 서쪽 도로(x 195)까지 끊기지 않는다. 남서 모퉁이는 105동 현관 앞까지 넓힘 (배치도)
    // (2026-11-17) 남서 모퉁이 길을 x 44.5까지만: 105동 3·4호 현관 앞 보도를 넓힘
    // (2026-11-18) 103동 앞에도 105동 앞처럼 길을 넓혀 잇는다: 북서 · 남서 두 곳 다 바깥 모서리는 반지름 RP, 안쪽(보도 모서리)은 RF로 굴린다.
    //   북서: x 44.5 ~ 60, z 125.1 ~ 137 (북쪽 주차 줄 머리선과 같은 줄), 남서: x 44.5 ~ 61, z 200 ~ 211.9 (남쪽 주차 줄 머리선과 같은 줄)
    const road = [[195, NR[1]], [60, NR[1]], [60, PK.n], ...arc(PK.x + RP, PK.n + RP, RP, -90, -180), ...arc(PK.x + RP, PK.nb - RP, RP, 180, 90), ...arc(NR[0] - RF, PK.nb + RF, RF, -90, 0),
      ...arc(NR[0] - RF, PK.sb - RF, RF, 0, 90), ...arc(PK.x + RP, PK.sb + RP, RP, -90, -180), ...arc(PK.x + RP, PK.s - RP, RP, 180, 90), [61, PK.s], [61, SR[3]], [195, SR[3]], [195, SR[1]],
      ...arc(WD[2] + R2, SR[1] - R2, R2, 90, 180), ...arc(WD[2] + R2, NR[3] + R2, R2, 180, 270), [195, NR[3]]]; LOW.road = road;
    const fireHole = ([x, z, rot]) => { const hx = (rot ? 6 : 3) * U, hz = (rot ? 3 : 6) * U; return rectPts(x - hx, z - hz, x + hx, z + hz); };
    P.add('asp', slab(road, FIRE.map(fireHole), A), 0xffffff);
    [NR, WD, SR, [PK.x, PK.n, 60, PK.nb], [PK.x, PK.sb, 61, PK.s]].forEach(r => W.mmRect(r[0], r[1], r[2], r[3], '#c2c9d2'));
    FIRE.forEach(([x, z, rot]) => W.place('fireLane', {x, y:A, z, rot}));
    // 꺾이는 곳의 경계석과 보도 메움
    curbArc(WD[2] + R2, NR[3] + R2, R2 - CW, R2, 180, 270); curbArc(WD[2] + R2, SR[1] - R2, R2 - CW, R2, 90, 180);
    // 103 · 105동 앞 넓힌 길의 둥근 모서리 경계석 (바깥 모서리는 길 밖, 보도 모서리는 보도 쪽)
    curbArc(PK.x + RP, PK.n + RP, RP, RP + CW, -90, -180); curbArc(PK.x + RP, PK.nb - RP, RP, RP + CW, 180, 90); curbArc(NR[0] - RF, PK.nb + RF, RF - CW, RF, -90, 0);
    curbArc(NR[0] - RF, PK.sb - RF, RF - CW, RF, 0, 90); curbArc(PK.x + RP, PK.sb + RP, RP, RP + CW, -90, -180); curbArc(PK.x + RP, PK.s - RP, RP, RP + CW, 180, 90);
    P.add('pav', slab([[WD[2] + R2, NR[3] + R2], ...arc(WD[2] + R2, NR[3] + R2, R2 - CW, 180, 270)], [], PV), 0xffffff);
    P.add('pav', slab([[WD[2] + R2, SR[1] - R2], ...arc(WD[2] + R2, SR[1] - R2, R2 - CW, 90, 180)], [], PV), 0xffffff);

    // ── 보도 (붉은 벽돌) ──
    paver(40.5, 120.5, 181, 124.75);                              // 북쪽 줄 현관 앞
    paver(96.9, 124.75, 108.9, 130.65); paver(100, 130.65, 106, 131, false);          // 북쪽 횡단보도 머리
    paver(165, 124.75, 181, 130.65); paver(165.5, 130.65, 171.5, 131, false);         // 경비실 앞
    paver(40.5, 124.75, PK.x - CW, 212.25); paver(PK.x - CW, PK.nb + RF, NR[0] - CW, PK.sb - RF);   // 103 · 104 · 105동 앞 보도 (넓힌 길 바깥 띠 + 104동 앞 넓은 보도)
    paver(49.65, 174.5, 50, 181.5, false); paver(58, 174.5, 58.35, 181.5, false);     // 서쪽 통로 횡단보도 턱 낮춤
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
    paver(168, CROSS_Z[0], 186, CROSS_Z[1]);                      // 상가 뒤 → 단지 동쪽 보행로 (186부터는 보도판: 겹치지 않게)
    // (2026-11-15) 빈 땅 메움: 주민센터 옆(동쪽) · 상가 뒤와 녹지 화단 사이
    paver(162, 143, 169, 163); paver(168, 163, 169, CROSS_Z[0]); paver(168, CROSS_Z[1], 169, 194); paver(169, 174.5, 185.6, CROSS_Z[0]); paver(169, CROSS_Z[1], 185.6, 181.5);
    // 현관 앞마당: 현관 계단 · 경사로 둘레의 빈 땅까지 벽돌로 (동 정면 ~ 현관 앞 보도)
    [[59.9, 113.1, 88.1, 120.5], [113.9, 113.1, 142.1, 120.5], [43.1, 112.7, 54.9, 120.5], [32.7, 123.1, 40.5, 134.9], [33.6, 163, 40.5, 193],
      [75.9, 216.6, 104.1, 225.5], [125.9, 216.6, 154.1, 225.5], [42.6, 216.6, 54.5, 228.8], [32.2, 206.4, 40.5, 218.4]].forEach(r => paver(...r, false));
    // 동 사이 자전거 보관소 마당 (벽돌, 끝은 경계석)
    const bikePads = [[89.2, 107.5, 112.8, 120.5, 'n'], [106.5, 216.6, 123.5, 229, 's'], [56, 216.6, 74, 229, 's']], sheds = [];
    bikePads.forEach(([x0, z0, x1, z1, side]) => { paver(x0, z0, x1, z1);
      // (2026-11-17) 둘레 경계석은 없앴다: 마당과 둘레가 같은 벽돌 높이라 경계석이 튀어나와 보였다
      if (side === 'n') [x0 + 5.2, x1 - 5.2].forEach(x => sheds.push({x, z:z0 + 2.2, rot:0})); else [x0 + 5.2, x1 - 5.2].forEach(x => sheds.push({x, z:z1 - 2.2, rot:PI})); });

    // ── 주차 줄: 길 가장자리에서 칸이 바깥으로 이어진다 ──
    // axis 'x': x0부터 동쪽으로 n칸, 칸 깊이는 z0에서 dir 쪽으로. axis 'z': z0부터 남쪽으로 n칸, 깊이는 x0에서 dir 쪽으로.
    const stops = [], cars = {}, islands = [], bays = LOW.bays, car = (name, v, it, gd = name !== 'truck1t' && Math.floor(it.x * 7 + it.z * 13) % 3 === 0) => { const key = name + '/' + v + '/' + (gd ? 1 : 0); (cars[key] || (cars[key] = [])).push(it); };   // (2026-11-25) 세 대 중 한 대쯤 문콕 방지 스펀지
    // 절반쯤은 후면주차(앞이 길 쪽). 기존 난수 순서를 흐트리지 않게 위치로 따로 정한다.
    const backIn = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h) < .5; };
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
        const k = R(), jit = (R() - .5) * .3, it = {x:x + (axis === 'x' ? jit : -dir * .3), z:z + (axis === 'x' ? -dir * .3 : jit), rot:rot + (R() - .5) * .05 + (backIn(x, z) ? PI : 0), color:PAINT[Math.floor(R() * PAINT.length)]};
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
    car('deliveryVan', 0, {x:150.5, z:134.6, rot:-PI / 2 + .02, color:0xffffff});       // 택배차는 한 대: 101동 앞 길에 잠깐 세워 둠 (2026-11-17: 주차 칸 차와 겹치지 않게 길 가운데 쪽으로)
    // 경계석
    [[PK.x + RP, PK.n - CW, 60, PK.n], [60, 124.75, 95.28, 125.1], [110.5, 124.75, 163.42, 125.1], [PK.x - CW, PK.n + RP, PK.x, PK.nb - RP], [PK.x + RP, PK.nb, NR[0] - RF, PK.nb + CW], [96.9, 130.65, 100, 131], [106, 130.65, 108.9, 131], [165, 130.65, 165.5, 131], [171.5, 130.65, 181, 131],
      [59.5, 139, 100, 139.35], [106, 139, 165.5, 139.35], [171.5, 139, 186, 139.35],
      [49.65, PK.nb + RF, 50, 174.5], [49.65, 181.5, 50, PK.sb - RF], [PK.x + RP, PK.sb - CW, NR[0] - RF, PK.sb], [PK.x - CW, PK.sb + RP, PK.x, PK.s - RP], [PK.x + RP, PK.s, 61, PK.s + CW], [58, 140.5, 58.35, 144.65], [58, 144.65, 64.25, 145], [63.9, 145, 64.25, 171.5], [58, 171.5, 64.25, 171.85], [58, 171.85, 58.35, 174.5],
      [58, 181.5, 58.35, 183.15], [58, 183.15, 64.25, 183.5], [63.9, 183.5, 64.25, 195.3], [58, 195.3, 64.25, 195.65], [58, 195.65, 58.35, 196.5],
      [59.5, 197.65, 113, 198], [118, 197.65, 165.5, 198], [171.5, 197.65, 186, 198],
      [61, 211.9, 110.98, 212.25], [112.6, 206, 113, 206.35], [118, 206, 118.4, 206.35], [120, 211.9, 164.1, 212.25], [171.5, 206, 181, 206.35]]
      .forEach(r => curb(...r));
    W.placeMany('wheelStop', stops);
    W.placeMany('planterIsland', islands, {len:5, wid:1.2});
    Object.entries(cars).forEach(([key, list]) => { const [name, v, gd] = key.split('/'); W.placeMany(name, list, {v:+v, snow:+v === 2 ? .35 : 1, ...(gd === '1' ? {guard:1} : {})}); });

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
    W.place('aptGate', {x:185.3, z:135, rot:PI / 2}); W.place('aptGate', {x:185.3, z:202, rot:-PI / 2});
    // (2026-11-17) 단지 이름 벽은 문주에서 떼어 바로 옆 동쪽 녹지 화단 위에 (보행통로 끝을 막지 않게)
    W.place('aptNameWall', {x:184.4, z:148.6, rot:PI / 2, y:.21}); W.place('aptNameWall', {x:184.4, z:188.4, rot:-PI / 2, y:.21});
    // 경비실 · 분리수거장 (2026-11-17): 앞 보행로를 비우도록 방음벽 쪽으로 물리고, 바닥은 콘크리트 받침
    const pad = (x0, z0, x1, z1) => { P.add('con', box(x0, 0, z0, x1, PV + .03, z1, .03), 0xc9cac6); };
    // (2026-11-18) 경비실 자리를 남쪽 분리수거장과 대칭으로: 받침 x 161 ~ 177, 뒤(북쪽)는 같은 모양의 화단 띠
    W.place('guardHouse', {x:169, z:115.3}); W.mmLabel(169, 111.5, '경비실', 10);   // (2026-11-18 2차) 받침은 없앰

    // ── 분리수거장 두 곳 (북서 모퉁이 마당, 107동 동쪽), 음식물 쓰레기통 ──
    // (2026-11-17) 북쪽 분리수거장은 103동 앞 마당에서 103 · 104동 사이로: 자전거 보관소처럼 화단을 덜어 마당을 내고 넣는다 (열린 쪽이 동쪽 보도)
    pad(19, 136.2, 31, 147.4); W.place('recycleStation', {x:24.4, z:141.8, rot:PI / 2});
    pad(161, 220.8, 177, 229.8); W.place('recycleStation', {x:170.5, z:225.2, rot:PI});
    W.placeMany('foodWasteBin', [{x:29.6, z:145.8, rot:PI / 2}, {x:29.6, z:146.7, rot:PI / 2 + .08}, {x:163.2, z:228.6, rot:PI}, {x:164.1, z:228.6, rot:PI - .1}, {x:165, z:228.7, rot:PI + .06}]);
    W.mmLabel(25, 141.8, '분리수거장', 9); W.mmLabel(168.5, 226, '분리수거장', 9);

    // ── 주민센터와 상가 ──
    W.place('communityCenter', {x:150, z:156, rot:PI}); W.mmLabel(150, 155, '주민센터', 11);
    const SX = 158, SZ = 178, SR_ = PI / 2, sc = Math.cos(SR_), ss = Math.sin(SR_);        // 상가: (2026-11-17) 180° 돌려 정면(간판 · 계단)이 동쪽(단지 앞 길)을 본다. 가운데 통로로 놀이터까지 지나갈 수 있다
    SHOP_LAYOUT.forEach(([name, o, x, y, z, r]) => W.place(name, {...o, x:SX + (x * sc + z * ss) * U, y:y * U, z:SZ + (-x * ss + z * sc) * U, rot:SR_ + (r || 0)}));
    W.mmRect(149.9, 164.6, 163.4, 191.4, '#c9c3b5'); W.mmLabel(157, 170, '동화상가', 11);
    // (2026-11-18 2차) 공중전화 부스 셋: 상가 뒤(서쪽) 벽에 붙여 나란히, 열린 쪽이 서쪽. 가운데 통로 · 뒤 계단(z 175.8 ~ 180.2)은 비움
    W.placeMany('phoneBooth', PHONES.slice(0, 3));

    // ── 놀이터·공터 ──
    { const m = flat(PLAY[0], PLAY[1], PLAY[2], PLAY[3], G(0xf3ecdc).clone(), .02); m.material.polygonOffset = true; m.material.polygonOffsetUnits = -4; W.mmRect(PLAY[0], PLAY[1], PLAY[2], PLAY[3], '#efe5d0'); }   // 아래 땅(y 0)과 깜빡이지 않게 W.mmLabel(80, 150, '놀이터', 13); W.mmLabel(106, 188, '공터', 11);
    const PS = 1.55;   // 놀이기구 배율: 나선 미끄럼틀(높이 3.6m)과 어울리게
    W.place('spiralSlide', {x:SLIDE.x, z:SLIDE.z, rot:SLIDE.rot}); 
    spotLabel('아파트 놀이터', (PLAY[0] + PLAY[2]) / 2 - 6, 7.2, (PLAY[1] + PLAY[3]) / 2);   // (2026-11-21) 놀이기구마다 붙이지 않고 놀이터에 하나만

    // 시소 · 흔들 오리 · 뺑뺑이는 탈 수 있게 놀이(activities/playground.js)가 놓는다. 자리는 layout.js의 SEESAW · DUCKS · MERRY
    // 놀이터 둘레 생울타리: 변마다 두 줄, 드나드는 자리는 비운다
    [144.7, 192.3].forEach(z => [[77.5, 21], [106.5, 21]].forEach(([x, len]) => W.place('hedgeRow', {x, z, len:len / U})));
    [65.5, 118.6].forEach(x => [[159.5, 28], [187, 9.5]].forEach(([z, len]) => W.place('hedgeRow', {x, z, len:len / U, rot:PI / 2})));

    // ── 방음벽 ('ㄷ'자) ──
    const walls = [];
    // (2026-11-17) 줄마다 칸 수를 반올림하고 크기를 조금 맞춰 모퉁이까지 빈틈 없이 (105동 뒤 남서 모퉁이가 비던 것)
    const wallRow = (a, b, f) => { const n = Math.round((b - a) / (4 * U)), s = (b - a) / (n * 4 * U); for (let i = 0; i < n; i++) walls.push({...f(a + (i + .5) * (b - a) / n), s}); };
    wallRow(15.4, 186, x => ({x, z:95.2})); wallRow(15.4, 186, x => ({x, z:245.3})); wallRow(95.4, 245.15, z => ({x:15, z, rot:PI / 2}));
    W.placeMany('noiseBarrier', walls);

    // ── 화단과 나무: 줄을 맞춰 같은 간격으로 심는다 ──
    bed(47.2, 141.5, 49.65, 174.2); bed(47.2, 181.8, 49.65, 197.6);                // 104동 앞 나무 띠 (넓힌 길 모서리 앞에서 끊는다)
    bed(169, 143.5, 185.6, 174.5); bed(169, 181.5, 185.6, 193.5);                  // 동쪽 녹지
    // (2026-11-15) 같은 동 두 현관(1·2호 / 3·4호) 사이와 'ㄱ'자 동 안쪽 모퉁이를 경계석 화단으로
    const unitBeds = [[70.7, 113.3, 77.3, 120.4], [124.7, 113.3, 131.3, 120.4], [86.7, 218.2, 93.3, 225.4], [136.7, 218.2, 143.3, 225.4], [33.8, 174.6, 40.4, 181.4], [33, 113, 43.1, 123.1], [32.4, 218.4, 42.6, 228.6]];
    unitBeds.forEach(r => bed(...r));
    W.placeMany('bikeShelter', sheds);
    // (2026-11-17) 자전거 보관소 사이 벤치는 보관소와 겹쳐 뺐다
    // 화단 (배치도의 '녹지 · 화단'): 동 뒤 방음벽 앞 띠, 동 사이 뒤쪽, 서쪽 띠, 동쪽 띠, 103-104 · 104-105 사이, 107동 동쪽(분리수거장 뒤)
    const greens = [[15.6, 95.6, 186, 99], [54.2, 99, 59.6, 112.4], [88.4, 99, 113.6, 107.3], [142.4, 99, 185.6, 110.3],   /* (2026-11-18 3차) 101동 동쪽 화단 두 칸을 하나로 (경비실 뒤까지, 남쪽 분리수거장 뒤 화단과 같은 깊이) */
      [15.6, 99, 18.3, 242.9], [15.6, 242.9, 186, 245.1], [53.7, 229.3, 75.6, 242.9], [75.6, 239.6, 104.4, 242.9], [104.4, 229.3, 125.6, 242.9], [125.6, 239.6, 154.4, 242.9],
      [154.4, 230.2, 185.6, 242.9], [18.3, 148, 31.4, 162.4], [18.3, 193.6, 31.4, 206.4]];
    greens.forEach(r => bed(...r));
    const free = p => !W.blocked(p.x, p.z), row = (a, b, step) => { const out = []; for (let v = a; v <= b + .01; v += step) out.push(v); return out; };
    // 벽돌 맨바닥: 단지 안에서 길 · 주차칸 · 놀이터(가로지르는 길은 남김)를 뺀 곳을 0.25 격자로 칠해 줄 단위로 합친다. 걷는 높이도 같은 기준
    function groundRaster(){ const S = .25, X0 = 13, Z0 = 93, nx = Math.round((186 - X0) / S), nz = Math.round((246 - Z0) / S); let prev = new Map();
      const flush = (runs, zEnd) => runs.forEach(r => P.add('pav', flatXZ(X0 + r.a * S, Z0 + r.z0 * S, X0 + r.b * S, Z0 + zEnd * S, PV), 0xffffff));
      for (let j = 0; j <= nz; j++) { const cur = new Map();
        if (j < nz) { let a = -1; for (let i = 0; i <= nx; i++) { const on = i < nx && !low(X0 + (i + .5) * S, Z0 + (j + .5) * S); if (on && a < 0) a = i; if (!on && a >= 0) { const k = a + ':' + i, p = prev.get(k); cur.set(k, {a, b:i, z0:p ? p.z0 : j}); if (p) prev.delete(k); a = -1; } } }
        flush([...prev.values()], j); prev = cur; } }
    const bare = [[], [], [], []], pine = [[], [], []], T = (v, x, z, s = .9) => bare[v].push({x, z, rot:R() * 6, s}), Pn = (v, x, z) => pine[v % 3].push({x, z, rot:R() * 6});
    // (2026-11-18 4차) 동과 동 사이 화단은 소나무만, 수도 줄였다 (겨울 나무는 모두 뺌): 103-104 · 104-105 사이는 하나씩
    [[25, 155], [25, 200]].forEach(([x, z], i) => Pn(i, x, z));
    [145.5, 153, 160.5, 168, 186, 193.5].forEach(z => T(1, 48.4, z, .8));                               // 104동 앞 띠
    const gap = (x, list) => list.some(([a, b]) => x > a - 1 && x < b + 1);
    row(66, 176, 10).filter(x => !gap(x, [[100, 106], [165.5, 171.5]])).forEach(x => T(0, x, 140.05, .82));   // 북측 보행통로 가로수
    row(66, 176, 10).filter(x => !gap(x, [[113, 118], [165.5, 171.5]])).forEach(x => T(0, x, 196.95, .82));   // 남측 보행통로 가로수
    // (2026-11-18) 놀이터와 상가 사이(광장) 나무는 없앴다
    [155, 163, 171].forEach(z => T(2, 182.6, z));   // 이름 벽 자리(z 146 ~ 151, 186 ~ 191)는 비움                                   // 동쪽 녹지 바깥 줄
    [235].forEach((z, i) => Pn(i, 182.6, z));   // (2026-11-17) 107동 → 후문 쪽 화단은 보도로 바꿔 나무를 뺌 T(0, 182.6, 126.5);
    [56.9, 95, 107, 148.4, 161, 169, 177].forEach((x, i) => Pn(i, x, 104));                    // 북쪽 방음벽 앞: 102-103 사이 1, 101-102 사이 2 (3 → 2), 경비실 뒤 4
    [59.5, 69.5, 109.5, 120.5, 161, 169, 177].forEach((x, i) => Pn(i, x, 234.5));                // 남쪽 방음벽 앞: 105-106 · 106-107 사이 2씩 (3 → 2), 107동 동쪽 3
    bare.forEach((list, v) => W.placeMany('bareTree', list.filter(free), {v}));
    pine.forEach((list, v) => W.placeMany('pineTree', list.filter(free), {v}));
    // 동 베란다 쪽 생울타리
    [[74, 97.6, 26], [128, 97.6, 26], [44, 97.4, 16], [90, 240.6, 26], [140, 240.6, 26], [44, 243.9, 14]].forEach(([x, z, len]) => W.place('hedgeRow', {x, z, len}));
    [[17.4, 116, 26], [17.9, 178, 26], [17.4, 224, 26]].forEach(([x, z, len]) => W.place('hedgeRow', {x, z, len, rot:PI / 2}));
    // 관목: 동쪽 녹지 안쪽 줄, 주민센터 옆, 나무 띠 사이
    const balls = v => list => W.placeMany('shrubBall', list.map(([x, z]) => ({x, z, rot:R() * 6})).filter(free), {v});
    balls(1)([147, 155, 163, 171, 184.5, 190.5].map(z => [174.5, z]));
    balls(0)([...[151, 159, 167, 187.5].map(z => [178.5, z]), ...[149.2, 156.8, 164.2, 189.8].map(z => [48.4, z])]);
    balls(2)([[22, 100], [178, 240], [22, 241], ...unitBeds.flatMap(([x0, z0, x1, z1]) => [[(x0 * 2 + x1) / 3, (z0 + z1) / 2], [(x0 + x1 * 2) / 3, (z0 + z1) / 2]])]);
    [[171.5, 145.6, 0], [171.5, 172.4, 0], [171.5, 183.6, 0], [171.5, 191.4, 0]].forEach(([x, z, rot]) => W.place('shrubCluster', {x, z, rot}));

    // ── 가로등: 보행통로는 가로수 사이, 현관 앞 보도는 현관 사이 ──
    // (2026-11-18) 놀이터 북 · 남쪽 가로등은 가로수 줄 위 나무 사이로, 놀이터 서 · 동쪽 바깥 변에도 한 줄씩
    const lamps = [...row(71, 151, 20).flatMap(x => [{x, z:140.05}, {x, z:196.95}]), {x:180, z:142.2}, {x:180, z:194.8},
      ...[146, 155.5, 165, 173.5, 182.5, 191].flatMap(z => [{x:64.75, z}, {x:119.5, z}]),
      ...[57, 74, 103, 128, 147].map(x => ({x, z:124.1})), ...[60, 90, 113, 140, 160].map(x => ({x, z:212.9})),   // (2026-11-17) 현관 쪽이 아니라 주차장 쪽 보도 끝
      ...[149, 164.5, 189.5].map(z => ({x:46.5, z})), {x:145, z:162}, {x:145, z:192.5}];
    W.placeMany('parkLamp', lamps.filter(free));

    // ── 주차금지 오뚜기: 주차 칸 밖, 차를 세우면 안 되는 길가(횡단보도 옆·모퉁이·소방차 전용구역 옆)에 둔다 ──
    const inBay = p => bays.some(b => p.x > b[0] - .3 && p.x < b[2] + .3 && p.z > b[1] - .3 && p.z < b[3] + .3);
    W.placeMany('noParkingSign', [{x:98.6, z:131.7, rot:.3}, {x:107.4, z:131.7, rot:-.2}, {x:98.8, z:138.3}, {x:107.2, z:138.3, rot:.4}, {x:164.6, z:138.3}, {x:172.6, z:138.3, rot:-.3},
      {x:50.7, z:173.6, rot:PI / 2}, {x:50.7, z:182.4, rot:PI / 2 + .3}, {x:57.3, z:142.4, rot:-1.2}, {x:57.3, z:197, rot:1.1},
      {x:111.6, z:198.7}, {x:119.4, z:198.7, rot:.2}, {x:111.8, z:205.3, rot:-.3}, {x:119.2, z:205.3}, {x:164.6, z:198.7}, {x:172.6, z:205.3, rot:.3}].filter(p => !inBay(p) && free(p)));

    // ── 게시판, 현수막 게시대 ──
    W.place('noticeBoard', {x:156.5, z:148.8, rot:PI});   // (2026-11-17) 101동 건너편 게시판을 주민센터 앞(옛 나무 게시판 자리)으로
    // (2026-11-18 2차) 현수막 게시대 둘: 경비실 동쪽 단지 맨 끝, 남쪽은 남북 대칭(분리수거장 동쪽). 앞면이 단지 앞 보도(동쪽)를 본다
    [115.3, 225.2].forEach(z => W.place('bannerBoard', {x:184.2, z, rot:PI / 2}));

    // 바닥 메쉬
    // 정문 · 후문 앞: 단지 앞 보도를 가로지르는 횡단보도 (차 길은 끊기지 않고, 사람은 보도 선을 따라 건넌다)
    [[NR[1], NR[3]], [SR[1], SR[3]]].forEach(([z0, z1]) => { for (let z = z0 + .45; z < z1 - .4; z += 1.05) line(188.6, z, 192.6, z + .55, 0xf1f3f4);
      W.placeMany('tactileStrip', [{x:190.6, z:z0 - .45, y:PV + .005}, {x:190.6, z:z1 + .45, y:PV + .005}], {cols:8, rows:2}); });
    groundRaster();
    const asp = antiTile(asphaltMaterial().clone()); asp.polygonOffset = true; asp.polygonOffsetFactor = -1; asp.polygonOffsetUnits = -2;   // 벽돌 맨바닥보다 앞에 그린다
    [['asp', asp], ['pav', brickPaveMaterial()], ['bed', bedMaterial()], ['con', concreteMaterial()], ['lin', roadPaintMaterial()]].forEach(([k, m]) => root.add(P.mesh(k, m, {cast:k === 'con'})));
  },
};
