// 아파트 동 현관: 다섯 단 계단, 휘어 내려가는 경사로(흰 콘크리트 난간벽 + 스테인리스 손잡이), 두꺼운 캐노피와 둥근 기둥.
// 좌표(E): 원점은 계단실 벽 한가운데 바닥, +z가 바깥. 경사로는 side(+1/-1) 쪽으로 나간다. 미터 단위.
// 계단과 경사로는 실제로 걸어 올라갈 수 있다: entranceHeight(높이)와 entranceColliders(벽)를 동 건물이 월드에 등록한다.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, loft, tube, lathe, flatXZ, fillet, ridge, dome, blob, xf, mirrorX, bakeAO, triCount, Parts } from '../core/meshkit.js';
import { concreteMaterial, paverMaterial, metalMaterial, glassMaterial, matteMaterial, snowMaterial, decalMaterial } from '../core/texkit.js';
import { UNIT, FONT_D } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PH = .75, PW = 3, Z0 = -2.4, Z1 = 2.6, SW = 1.5, TREAD = .3, RISE = .15, STEPS = 4, WT = .14, WH = .55, RAIL = .28;
const RP = {z:1.0, l1:.9, r:2.2, l3:1.5, w:1.5}, RL = RP.l1 + Math.PI / 2 * RP.r + RP.l3, CX = PW + RP.l1, CZ = RP.z + RP.r;
const CAN = {y:PH + 2.55, t:.62, x:3.3, z1:2.95}, COLX = 2.55, COLZ = 2.12, BEDZ = Z1 + STEPS * TREAD + .12;
export const ENTRANCE = {depth:CZ + RP.l3 + .25, reach:CX + RP.r + RP.w / 2 + WT + .05, platform:PH};
const COL = {wall:0xd2d6d8, stone:0xa9adb0, step:0xb4b7b9, dark:0x6c7783, fascia:0xd9cfb8, soffit:0xeef0ee, ramp:0x9c6b5d, curb:0xa9adaf, accent:0x3f6fa8,
  steel:0xd6dbdf, frame:0x59646f, glass:0x2f3e4c, glassHi:0x3d5163, shrub:0x4d6b53, shrubDk:0x3f5a47, soil:0x5a4a40, red:0xc9392f, mat:0x39453f, yellow:0xe6b52c};

// 경사로 중심선: s(0~RL) → 위치, 진행 방향, 바깥쪽 법선
function rampAt(s){
  if (s <= RP.l1) return {x:PW + s, z:RP.z, tx:1, tz:0};
  const a = (s - RP.l1) / RP.r;
  if (a <= Math.PI / 2) return {x:CX + Math.sin(a) * RP.r, z:CZ - Math.cos(a) * RP.r, tx:Math.cos(a), tz:Math.sin(a)};
  return {x:CX + RP.r, z:CZ + (s - RP.l1 - Math.PI / 2 * RP.r), tx:0, tz:1};
}
const rampY = s => PH * (1 - Math.min(1, Math.max(0, s / RL)));
const off = (s, o) => { const p = rampAt(Math.min(RL, Math.max(0, s))), e = s < 0 ? s : s > RL ? s - RL : 0; return V(p.x + p.tx * e + p.tz * o, 0, p.z + p.tz * e - p.tx * o); };   // o > 0 이 바깥쪽

// 걸을 수 있는 높이 (m). 현관 밖이면 null.
export function entranceHeight(ex, ez, side = 1){
  const x = ex * side, z = ez;
  if (z < Z0 || z > ENTRANCE.depth || x < -PW || x > ENTRANCE.reach) return null;
  if (x <= PW && z <= Z1) return PH;
  if (Math.abs(x) <= SW && z <= Z1 + STEPS * TREAD + .1) return PH * Math.max(0, 1 - (z - Z1 + .12) / (STEPS * TREAD + .1));
  const h = RP.w / 2 + .04;
  if (x <= CX) return Math.abs(z - RP.z) <= h ? rampY(x - PW) : null;
  if (z <= CZ) { const d = Math.hypot(x - CX, z - CZ); return Math.abs(d - RP.r) <= h ? rampY(RP.l1 + Math.atan2(x - CX, CZ - z) * RP.r) : null; }
  return Math.abs(x - CX - RP.r) <= h ? rampY(RP.l1 + Math.PI / 2 * RP.r + z - CZ) : null;
}
// 충돌 영역 (m): {rects:[[x0,z0,x1,z1]], circles:[[x,z,r]]}
export function entranceColliders(side = 1){
  const ro = RP.w / 2, rects = [
    [-PW, Z0, -PW + WT, Z1], [-PW, Z1 - WT, -SW, Z1], [SW, Z1 - WT, PW, Z1], [PW - WT, Z0, PW, RP.z - ro], [PW - WT, RP.z + ro, PW, Z1],
    [PW, RP.z - ro - WT, CX, RP.z - ro], [PW, RP.z + ro, CX, RP.z + ro + WT],
    [CX + RP.r + ro, CZ, CX + RP.r + ro + WT, CZ + RP.l3], [CX + RP.r - ro - WT, CZ, CX + RP.r - ro, CZ + RP.l3],
    [SW, Z1, CX + RP.r - ro - WT, BEDZ], [PW, RP.z + ro + WT, CX + .5, Z1], [-PW, Z1, -SW, BEDZ]],
  circles = [[COLX, COLZ, .22], [-COLX, COLZ, .22], [CX + RP.r + ro + WT / 2, CZ + RP.l3 + .05, .13], [CX + RP.r - ro - WT / 2, CZ + RP.l3 + .05, .13]];
  [[RP.r + ro + WT / 2, 22], [RP.r - ro - WT / 2, 10]].forEach(([R, n]) => { for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; circles.push([CX + Math.sin(a) * R, CZ - Math.cos(a) * R, .08]); } });
  return {rects:rects.map(r => side > 0 ? r : [-r[2], r[1], -r[0], r[3]]), circles:circles.map(c => [c[0] * side, c[1], c[2]])};
}

// 점자블록 (노란 점형) 한 장 30cm
let tactile = null;
function tactileMat(){
  if (tactile) return tactile;
  const t = canvasTex(128, 128, (g, W, H) => { g.fillStyle = '#e2ae22'; g.fillRect(0, 0, W, H); g.strokeStyle = '#b98a12'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const x = 16 + i * 24, y = 16 + j * 24; g.fillStyle = '#b98a12'; g.beginPath(); g.arc(x + 1.5, y + 2, 8, 0, 7); g.fill(); g.fillStyle = '#f3c63f'; g.beginPath(); g.arc(x, y, 7.5, 0, 7); g.fill(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return tactile = decalMaterial(t, {rough:.75});
}
// 캐노피 글씨(파란 동·호수)와 게시판 그림을 한 장에 그린다. 왼쪽 3/4: 글씨(투명 바탕), 오른쪽 1/4: 게시판.
const signs = new Map();
function signMat(num, units){
  const key = num + '/' + units; if (signs.has(key)) return signs.get(key);
  const t = canvasTex(1024, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.textBaseline = 'middle'; g.fillStyle = '#2f5f9e';
    g.textAlign = 'left'; g.font = '700 78px ' + FONT_D; g.fillText(num, 150, 50); const w1 = g.measureText(num).width; g.font = '700 50px ' + FONT_D; g.fillText('동', 158 + w1, 56);
    g.textAlign = 'right'; g.font = '700 78px ' + FONT_D; g.fillText(units, 820, 50); g.font = '700 50px ' + FONT_D; g.textAlign = 'left'; g.fillText('호', 828, 56);
    g.save(); g.translate(0, 96); g.scale(174 / 256, 160 / 376); g.fillStyle = '#4f6b58'; g.fillRect(0, 0, 256, 376);
    g.fillStyle = '#e9e4d6'; g.fillRect(8, 8, 240, 34); g.fillStyle = '#34465c'; g.font = '700 22px ' + FONT_D; g.textAlign = 'center'; g.fillText('동화아파트 게시판', 128, 26);
    [[14, 56, 104, 128, '#fbfbf6', -2], [128, 54, 110, 96, '#f3ecc4', 1.5], [20, 204, 96, 150, '#f6f6f2', 1], [126, 170, 112, 186, '#fdfdfb', -1.5]].forEach(([x, y, w, h, c, r], k) => {
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(r * Math.PI / 180); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-w / 2 + 2, -h / 2 + 3, w, h); g.fillStyle = c; g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = k === 1 ? '#b8552f' : '#3f6fa8'; g.fillRect(-w / 2 + 8, -h / 2 + 8, w - 16, 9); g.fillStyle = '#9aa3ab'; for (let l = 0; l < Math.floor((h - 30) / 11); l++) g.fillRect(-w / 2 + 8, -h / 2 + 26 + l * 11, (w - 16) * (l % 3 === 2 ? .6 : 1), 4);
      g.fillStyle = ['#d9534f', '#3f8a97', '#e2a84b', '#d9534f'][k]; g.beginPath(); g.arc(0, -h / 2 + 3, 5, 0, 7); g.fill(); g.restore(); });
    g.restore();
  });
  const m = decalMaterial(t, {alpha:true, rough:.7}); signs.set(key, m); return m;
}
function quadGeo(x0, y0, x1, y1, z, u0, v0, u1, v1){   // +z를 보는 판
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0,y0,z, x1,y0,z, x1,y1,z, x0,y1,z], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0,0,1, 0,0,1, 0,0,1, 0,0,1], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0,v0, u1,v0, u1,v1, u0,v1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g;
}

// 경사로 난간벽: 모서리를 깎은 직사각 단면을 중심선에서 o만큼 떨어뜨려 따라간다. 윗면이 경사를 따라 내려간다.
function rampWall(o){
  const rings = [], b = .018, t = WT / 2, N = 34;
  for (let i = 0; i <= N; i++) { const s = -WT + (RL + WT) * i / N, c = off(s, o), p = rampAt(Math.min(RL, Math.max(0, s))), nx = p.tz, nz = -p.tx, y0 = -.03, y1 = rampY(s) + WH;
    rings.push([[-t + b, y0], [t - b, y0], [t, y0 + b], [t, y1 - b], [t - b, y1], [-t + b, y1], [-t, y1 - b], [-t, y0 + b]].map(([u, y]) => V(c.x + nx * u, y, c.z + nz * u))); }
  return loft(rings);
}
const railPath = (o, y) => { const out = []; for (let i = 0; i <= 30; i++) { const s = .05 + (RL - .2) * i / 30, c = off(s, o); out.push(V(c.x, rampY(s) + WH + y, c.z)); } return out; };

export function buildEntrance(o = {}){
  const side = o.side === -1 ? -1 : 1, num = o.num || '101', units = o.units || '1·2', P = new Parts(), ro = RP.w / 2, wo = ro + WT / 2, TOP = PH + WH;
  // ── 콘크리트: 단, 계단, 난간벽, 경사로, 캐노피, 기둥, 문틀 돌 ──
  P.add('con', box(-PW + .03, 0, Z0, PW - .03, PH, Z1 - .03), COL.stone); P.add('con', box(-SW, 0, Z1 - .3, SW, PH, Z1 + .015, .012), COL.step);
  for (let k = 1; k <= STEPS; k++) P.add('con', box(-SW, 0, Z1 + (k - 1) * TREAD, SW, PH - k * RISE, Z1 + k * TREAD + .015, .012), COL.step);
  [[-PW, Z0, -PW + WT, Z1], [-PW, Z1 - WT, -SW, Z1], [SW, Z1 - WT, PW, Z1], [PW - WT, Z0, PW, RP.z - ro], [PW - WT, RP.z + ro, PW, Z1]]
    .forEach(r => P.add('con', box(r[0], -.03, r[1], r[2], TOP, r[3], .018), COL.wall));
  [[-SW - .09, Z1 - .2, -SW + .09, Z1 + .04], [SW - .09, Z1 - .2, SW + .09, Z1 + .04]].forEach(r => P.add('con', box(r[0], 0, r[1], r[2], TOP + .06, r[3], .02), COL.wall));   // 계단 옆 끝기둥
  P.add('con', rampWall(wo), COL.wall); P.add('con', rampWall(-wo), COL.wall);
  [wo, -wo].forEach(q => { const c = off(RL + .05, q); P.add('con', box(c.x - .12, 0, c.z - .12, c.x + .12, WH + .07, c.z + .12, .02), COL.wall); });
  const deck = []; for (let i = 0; i <= 30; i++) { const s = RL * i / 30, y = rampY(s) + .004; deck.push([off(s, -ro).setY(y), off(s, ro).setY(y)]); }
  P.add('con', loft(deck, {closed:false, facing:V(0, 1, 0)}), COL.ramp);
  P.add('con', box(-CAN.x, CAN.y, -.02, CAN.x, CAN.y + CAN.t, CAN.z1, .035), COL.fascia);
  P.add('con', box(-CAN.x + .28, CAN.y - .035, .12, CAN.x - .28, CAN.y + .01, CAN.z1 - .28), COL.soffit);
  [[-CAN.x - .006, CAN.x + .006, CAN.z1 - .01, CAN.z1 + .006], [-CAN.x - .006, -CAN.x + .01, 0, CAN.z1], [CAN.x - .01, CAN.x + .006, 0, CAN.z1]]
    .forEach(([x0, x1, z0, z1]) => P.add('con', box(x0, CAN.y + .03, z0, x1, CAN.y + .1, z1), COL.accent));
  const CH = CAN.y - PH, colProf = [[.25, 0], [.25, .1], [.215, .135], [.2, .17], [.2, CH - .15], [.215, CH - .115], [.25, CH - .08], [.25, CH]];
  [-COLX, COLX].forEach(x => P.add('con', xf(lathe(colProf, 18), {x, y:PH, z:COLZ}), COL.wall));
  [[-1.5, PH, -1.2, CAN.y], [1.2, PH, 1.5, CAN.y], [-1.2, PH + 2.45, 1.2, CAN.y]].forEach(([x0, y0, x1, y1]) => P.add('con', box(x0, y0, -.02, x1, y1, .075, .012), COL.dark));
  // 화단 턱과 흙
  const bx1 = CX + RP.r - ro - WT;
  P.add('con', box(SW + .02, 0, BEDZ - .12, bx1, .2, BEDZ, .015), COL.curb); P.add('con', box(-PW, 0, BEDZ - .12, -SW - .02, .2, BEDZ, .015), COL.curb); P.add('con', box(-PW, 0, Z1, -PW + .12, .2, BEDZ, .015), COL.curb);
  const con = P.geo('con');
  bakeAO(con, (p, n) => { const under = p.y < CAN.y + .02 && p.z < CAN.z1 && p.z > -.1 && Math.abs(p.x) < CAN.x ? .86 : 1;
    return (.7 + .3 * Math.min(1, Math.max(0, p.y / .3))) * (n.y < -.5 ? .72 : 1) * under; });

  // ── 바닥 벽돌 ──
  P.add('pav', flatXZ(-PW + WT, Z0, PW - WT, Z1 - WT, PH + .004), 0xffffff); P.add('pav', flatXZ(-SW, Z1 - WT, SW, Z1 + .012, PH + .004), 0xffffff);
  bakeAO(P.m.pav[0], p => p.z < CAN.z1 ? .8 : 1);

  // ── 금속: 문틀, 손잡이, 난간 ──
  const D0 = PH, steel = (g, c = COL.steel) => P.add('met', g, c);
  [[-1.2, 0, -1.14, 2.45], [1.14, 0, 1.2, 2.45], [-1.2, 2.39, 1.2, 2.45], [-1.2, 2.08, 1.2, 2.13], [-.03, 2.13, .03, 2.39]].forEach(([x0, y0, x1, y1]) => steel(box(x0, D0 + y0, .0, x1, D0 + y1, .07), COL.frame));
  [-1, 1].forEach(s => { const a = s * .015, b = s * 1.135, x0 = Math.min(a, b), x1 = Math.max(a, b);
    [[x0, 0, x0 + .06, 2.08], [x1 - .06, 0, x1, 2.08], [x0, 2.02, x1, 2.08]].forEach(([p, q, r, t]) => steel(box(p, D0 + q, .015, r, D0 + t, .055), COL.frame));
    steel(box(x0 + .06, D0, .012, x1 - .06, D0 + .22, .058), COL.steel);                                    // 발판
    P.add('gls', box(x0 + .06, D0 + .22, .028, x1 - .06, D0 + 2.02, .042), s < 0 ? COL.glass : COL.glassHi);
    const hx = s * .13; steel(tube(fillet([V(hx, D0 + .86, .05), V(hx, D0 + .86, .105), V(hx, D0 + 1.46, .105), V(hx, D0 + 1.46, .05)], .03, 3), .014, {radial:8})); });
  P.add('gls', box(-1.14, D0 + 2.13, .028, -.03, D0 + 2.39, .042), COL.glass); P.add('gls', box(.03, D0 + 2.13, .028, 1.14, D0 + 2.39, .042), COL.glass);
  steel(box(1.27, D0 + 1.12, .07, 1.43, D0 + 1.46, .1, .008)); P.add('mat', box(1.29, D0 + 1.3, .1, 1.41, D0 + 1.44, .104), 0x1c242c);          // 공동현관 호출기
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) P.add('mat', box(1.3 + i * .04, D0 + 1.14 + j * .035, .1, 1.325 + i * .04, D0 + 1.165 + j * .035, .105), 0x3a444e);
  // 손잡이 난간: 벽 위를 따라가는 둥근 관 + 짧은 기둥
  const RY = TOP + RAIL, ri = railPath(-wo, RAIL), rout = railPath(wo, RAIL), tail = q => off(RL - .12, q).setY(WH - .02 + rampY(RL - .12)), rails = [
    fillet([V(-PW + WT / 2, TOP - .02, Z0 + .12), V(-PW + WT / 2, RY, Z0 + .12), V(-PW + WT / 2, RY, Z1 - WT / 2), V(-SW - .16, RY, Z1 - WT / 2), V(-SW - .16, TOP - .02, Z1 - WT / 2)], .09, 4),
    fillet([V(SW + .16, TOP - .02, Z1 - WT / 2), V(SW + .16, RY, Z1 - WT / 2), V(PW - WT / 2, RY, Z1 - WT / 2), V(PW - WT / 2, RY, RP.z + wo), ri[1]], .09, 4).concat(ri.slice(2), [tail(-wo)]),
    fillet([V(PW - WT / 2, TOP - .02, Z0 + .12), V(PW - WT / 2, RY, Z0 + .12), V(PW - WT / 2, RY, RP.z - wo), rout[1]], .09, 4).concat(rout.slice(2), [tail(wo)])];
  rails.forEach(pts => { steel(tube(pts, .021, {radial:8}));
    let acc = 0; for (let i = 1; i < pts.length - 1; i++) { acc += pts[i].distanceTo(pts[i - 1]); if (acc > 1.05 && pts[i].y > WH + .2) { acc = 0; steel(tube([pts[i].clone().setY(pts[i].y - RAIL - .01), pts[i]], .012, {radial:6, caps:false})); } } });
  // 계단 난간: 위아래 두 줄
  [-1, 1].forEach(s => { const x = s * (SW - .13), zt = Z1 + .02, zb = Z1 + STEPS * TREAD - .12, yb = RISE;
    steel(tube(fillet([V(x, PH, zt - .22), V(x, PH + .9, zt - .22), V(x, PH + .9, zt), V(x, yb + .9, zb), V(x, yb + .9, zb + .22), V(x, 0, zb + .22)], .07, 4), .021, {radial:8}));
    steel(tube([V(x, PH + .45, zt - .22), V(x, PH + .45, zt), V(x, yb + .45, zb), V(x, yb + .45, zb + .22)], .013, {radial:6}));
    steel(tube([V(x, PH - RISE * 2, Z1 + TREAD * 1.6), V(x, PH - RISE * 2 + 1.02, Z1 + TREAD * 1.6)], .016, {radial:6})); });
  // CCTV, 벽등
  steel(tube([V(-2.85, CAN.y - .03, 2.45), V(-2.85, CAN.y - .12, 2.45)], .02, {radial:6}), 0xe9ecee);
  steel(xf(lathe([[.0, 0], [.045, 0], [.05, .02], [.05, .2], [.04, .22], [0, .22]], 10), {rx:Math.PI / 2 + .45, x:-2.85, y:CAN.y - .15, z:2.37}), 0xeef1f3);

  // ── 무광: 디딤 미끄럼막이, 발매트, 게시판 틀, 소화기, 관목, 흙 ──
  const mat = (g, c) => P.add('mat', g, c);
  for (let k = 0; k <= STEPS; k++) mat(box(-SW + .03, PH - k * RISE, Z1 + k * TREAD - .06 + (k ? .015 : 0), SW - .03, PH - k * RISE + .006, Z1 + k * TREAD - .015 + (k ? .015 : 0)), 0x4b5158);
  mat(box(-.95, PH + .004, .14, .95, PH + .02, .78, .006), COL.mat);
  mat(box(-2.24, D0 + .98, .0, -1.58, D0 + 1.92, .03, .008), 0xc9ced2);
  mat(xf(lathe([[.0, 0], [.065, 0], [.07, .02], [.07, .36], [.05, .42], [.02, .44], [.02, .5], [0, .5]], 12), {x:1.95, y:PH, z:.16}), COL.red);       // 소화기
  mat(tube(fillet([V(1.95, PH + .47, .16), V(2.03, PH + .5, .16), V(2.05, PH + .3, .16)], .03, 3), .008, {radial:5}), 0x22262a); mat(box(1.86, PH, .08, 2.04, PH + .015, .25), 0x2a2f33);
  mat(xf(new THREE.CylinderGeometry(.17, .17, .012, 20), {y:CAN.y - .04, z:1.45}), 0xfff3d6); mat(xf(new THREE.CylinderGeometry(.2, .2, .01, 20), {y:CAN.y - .036, z:1.45}), 0xb9bec2);
  mat(box(SW + .02, .0, Z1, bx1, .16, BEDZ - .12), COL.soil); mat(box(PW, 0, RP.z + wo + .07, CX + .5, .16, Z1), COL.soil); mat(box(-PW + .12, 0, Z1, -SW - .02, .16, BEDZ - .12), COL.soil);
  const shrubs = [[2.15, 3.2, .42], [3.2, 3.24, .5], [4.3, 3.2, .44], [3.75, 2.3, .34], [-2.25, 3.22, .46]];
  shrubs.forEach(([x, z, r], i) => { const g = blob(r, r * 1.5, r * .95, {seed:i + 2}); g.translate(x, .1, z); mat(g, i % 2 ? COL.shrubDk : COL.shrub); });
  const matGeo = P.geo('mat'); bakeAO(matGeo, (p, n) => (.72 + .28 * Math.min(1, Math.max(0, (p.y - (p.z < Z1 && Math.abs(p.x) < PW ? PH : 0)) / .25))) * (p.y > PH + 1 && p.z < CAN.z1 ? .9 : 1));

  // ── 눈: 캐노피 위, 난간벽 위, 화단, 관목, 치워 쌓은 눈 ──
  const snow = g => P.add('snw', g);
  snow(box(-CAN.x + .04, CAN.y + CAN.t - .03, .0, CAN.x - .04, CAN.y + CAN.t + .17, CAN.z1 - .04, .085));
  const line = (a, b, n = 6) => Array.from({length:n + 1}, (_, i) => a.clone().lerp(b, i / n));
  [[V(-PW + WT / 2, TOP, Z0 + .3), V(-PW + WT / 2, TOP, Z1 - .3)], [V(-PW + .3, TOP, Z1 - WT / 2), V(-SW - .3, TOP, Z1 - WT / 2)], [V(SW + .3, TOP, Z1 - WT / 2), V(PW - .3, TOP, Z1 - WT / 2)],
    [V(PW - WT / 2, TOP, Z0 + .3), V(PW - WT / 2, TOP, RP.z - ro - .3)]].forEach(([a, b]) => snow(ridge(line(a, b), WT - .03, .045)));
  [wo, -wo].forEach(q => snow(ridge(Array.from({length:25}, (_, i) => { const s = .3 + (RL - .6) * i / 24; return off(s, q).setY(rampY(s) + WH); }), WT - .03, .045)));
  snow(box(SW + .02, .1, Z1 + .02, bx1, .22, BEDZ - .13, .05)); snow(box(PW + .02, .1, RP.z + wo + .09, CX + .5, .22, Z1, .05)); snow(box(-PW + .13, .1, Z1 + .02, -SW - .02, .22, BEDZ - .13, .05));
  shrubs.forEach(([x, z, r], i) => { const g = blob(r * .86, r * .5, r * .82, {seed:i + 9, bump:.08}); g.translate(x, .1 + r * 1.12, z); snow(g); });
  [[-SW - .75, BEDZ + .45, .6, .34], [bx1 - .5, BEDZ + .42, .7, .4]].forEach(([x, z, r, h]) => { const g = dome(r, h, r * .8, 12); g.translate(x, 0, z); snow(g); });

  // ── 조립 ──
  const g = new THREE.Group(), flip = geo => side > 0 ? geo : mirrorX(geo);
  const add = (geo, m, cast = true) => { const mesh = new THREE.Mesh(flip(geo), m); mesh.castShadow = cast; mesh.receiveShadow = true; g.add(mesh); return mesh; };
  add(con, concreteMaterial()); add(P.geo('pav'), paverMaterial(), false); add(P.geo('met'), metalMaterial(), false); add(P.geo('gls'), glassMaterial(), false);
  add(matGeo, matteMaterial()); add(P.geo('snw'), snowMaterial({seed:33}));
  // 그림: 점자블록과 글씨·게시판 (글씨는 뒤집지 않고 위치만 옮긴다)
  const tq = (x0, z0, x1, z1, y) => { const q = flatXZ(Math.min(x0, x1), z0, Math.max(x0, x1), z1, y), uv = q.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / .3, uv.getY(i) / .3); return q; };
  const endC = off(RL + .2, 0), T = new Parts();
  [tq(-SW, Z1 - .36, SW, Z1 - .06, PH + .008), tq(-SW, Z1 + STEPS * TREAD + .1, SW, Z1 + STEPS * TREAD + .4, .012), tq(side * (PW - .42), RP.z - .6, side * (PW - .12), RP.z + .6, PH + .008),
    tq(side * (endC.x - .6), endC.z, side * (endC.x + .6), endC.z + .3, .012)].forEach(q => T.add('t', q));
  const tm = new THREE.Mesh(T.geo('t'), tactileMat()); tm.receiveShadow = true; g.add(tm);
  const S = new Parts(); S.add('s', quadGeo(-2.34, CAN.y + .14, 2.34, CAN.y + CAN.t - .05, CAN.z1 + .012, 0, 1 - 94 / 256, 1, 1));
  S.add('s', quadGeo(side * -1.91 - .3, D0 + 1.01, side * -1.91 + .3, D0 + 1.89, .034, 0, 0, 174 / 1024, 160 / 256));
  const sm = new THREE.Mesh(S.geo('s'), signMat(num, units)); sm.receiveShadow = true; g.add(sm);
  g.userData.info = {tris:triCount(g), draws:g.children.length, materials:g.children.length, sizeMeters:[PW + ENTRANCE.reach, CAN.y + CAN.t, ENTRANCE.depth - Z0]};
  return g;
}

// 갤러리용: 뒤에 계단실 벽 한 토막을 세워 보여 준다.
defineProp('aptEntrance', {
  label:'아파트 현관 (계단·경사로)', category:'아파트', isNewStyle:true,
  usage:"// 아파트 동(aptTower)에 자동으로 붙는다\nbuildEntrance({side: 1, num: '103', units: '1·2'});",
  build(o){
    const g = new THREE.Group(), e = buildEntrance(o), wall = new THREE.Mesh(box(-2.3, 0, -2.4, 2.3, 5.6, 0), concreteMaterial());
    const c = new Float32Array(wall.geometry.getAttribute('position').count * 3).fill(.72); wall.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const inner = new THREE.Group(); inner.add(e, wall); inner.scale.setScalar(UNIT); inner.position.z = -UNIT; g.add(inner); g.userData.info = e.userData.info; return g;
  },
});
