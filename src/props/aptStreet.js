// 아파트 단지 소품 3 (2026-11-13): 회전놀이기구, 그네, 나선 미끄럼틀(두 바퀴), 공중전화 부스, 단지 게시판, 현수막 게시대,
// 차선규제봉, 차량 신호등, 보행자 신호등. 모두 미터 단위로 만들고 UNIT을 곱한다. 원점은 바닥 중심, 정면은 +z.
// 글자와 상호·전화번호는 모두 지어낸 것이다.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, loft, tube, lathe, fillet, ridge, blob, xf, groundAO, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, plasticMaterial, metalMaterial, glassMaterial, clearMaterial } from '../core/texkit.js';
import { assemble, quadZ, quad, mulberry } from './kit.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';
import { drawNotice, drawBannerAtlas } from './signArt/otherSigns.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT, PI = Math.PI;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();
const BLUE = 0x2f6fb5, RED = 0xd24a3a, YEL = 0xf0b429, GRN = 0x4f9e5a, WOOD = 0x7a5a42, STEEL = 0xe3e7ea;
const litMaterial = () => once('lit', () => new THREE.MeshBasicMaterial({name:'lit', vertexColors:true}));   // 켜진 신호등 불빛
const cyl = (r0, r1, h, seg = 12) => new THREE.CylinderGeometry(r0, r1, h, seg);

// ── 회전놀이기구 (뺑뺑이): 무늬 강판 원판, 가운데 기둥, 스테인리스 손잡이 틀 여섯 개 ──
defineProp('merryGoRound', {dynamic:true, label:'회전놀이기구', category:'놀이터', isNewStyle:true, colliders:[{c:[0, 0, 1.3 * U]}],
  usage:"W.place('merryGoRound', {x: 92, z: 168});  // 지름 2.5m", build(){
    const P = new Parts(), R = 1.25, Y = .3, HT = 1.0, st = (g, c = STEEL) => P.add('met', g, c);
    P.add('dsk', xf(cyl(R, R, .045, 48), {y:Y - .022}), 0xffffff); st(xf(new THREE.TorusGeometry(R, .034, 8, 48), {rx:PI / 2, y:Y - .022}));
    for (let i = 0; i < 40; i++) { const a = i * 2.39996, r = .28 + .9 * Math.sqrt((i + .5) / 40); P.add('dsk', xf(box(-.05, 0, -.012, .05, .006, .012), {ry:a * 3, x:Math.cos(a) * r, y:Y, z:Math.sin(a) * r}), 0xd9dde0); }   // 미끄럼 방지 돌기
    P.add('mat', xf(cyl(.3, .38, .2, 20), {y:.1}), 0x6f777d); P.add('mat', xf(cyl(.5, .5, .02, 24), {y:.01}), 0x8b9297);
    st(lathe([[.13, Y], [.125, Y + HT - .04], [.15, Y + HT - .02], [.15, Y + HT + .05], [.11, Y + HT + .09], [0, Y + HT + .09]], 20));
    for (let i = 0; i < 6; i++) { const ry = i * PI / 3;
      st(xf(tube(fillet([V(1.13, Y, 0), V(1.13, Y + HT - .08, 0), V(.12, Y + HT - .08, 0)], .13, 5), .022, {radial:8}), {ry}));
      st(xf(tube([V(.2, Y, 0), V(1.02, Y + HT - .1, 0)], .016, {radial:6}), {ry})); st(xf(xf(cyl(.04, .04, .012, 10), {x:1.13, y:Y + .006}), {ry}), 0xbfc5ca); }
    st(xf(new THREE.TorusGeometry(.42, .018, 6, 28), {rx:PI / 2, y:Y + HT - .08}));
    P.add('snw', xf(blob(.14, .05, .14, {seed:5, bump:.06, seg:10}), {y:Y + HT + .08}));
    return assemble(P, [['dsk', metalMaterial({color:0x9ea5aa, rough:.5})], ['met', metalMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [2.6, 1.45, 2.6]); }});

// ── 그네: 'A'자 다리 두 쌍과 가로대(강관), 고무 안전 매트. 앉는 판과 사슬(swingSeat)은 흔들리도록 따로 만든다 ──
export const SWING = {top:2.4, L:1.85, seats:[-.8, .8], span:1.85};
defineProp('swingSet', {label:'그네', category:'놀이터', isNewStyle:true, variants:[{opts:{seats:true}}],
  colliders:[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => ({c:[sx * (SWING.span + .12) * U, sz * 1.02 * U, .1 * U]})),
  usage:"W.place('swingSet', {x: 82, z: 189});  // 폭 4m. 앉는 판은 swingSeat을 가로대(y 2.4m)에 매단다", build(o = {}){
    const P = new Parts(), T = SWING.top, X = SWING.span, pl = (g, c) => P.add('pla', g, c);
    pl(tube([V(-X - .18, T, 0), V(X + .18, T, 0)], .05, {radial:10}), RED);
    [-1, 1].forEach(s => { const x = s * X;
      [-1, 1].forEach(k => pl(tube([V(x + s * .12, 0, k * 1.05), V(x, T - .02, k * .04)], .042, {radial:10}), BLUE));
      pl(tube([V(x + s * .075, .95, -.64), V(x + s * .075, .95, .64)], .026, {radial:8}), BLUE);
      pl(xf(cyl(.075, .075, .2, 12), {rz:PI / 2, x, y:T}), YEL); pl(xf(new THREE.SphereGeometry(.058, 10, 8), {x:s * (X + .18), y:T}), RED);
      [-1, 1].forEach(k => P.add('mat', xf(cyl(.09, .1, .03, 10), {x:x + s * .12, y:.015, z:k * 1.05}), 0x6f777d)); });
    SWING.seats.forEach(sx => [-.22, .22].forEach(dx => { P.add('mat', box(sx + dx - .03, T - .1, -.035, sx + dx + .03, T - .04, .035, .008), 0x3a4047); P.add('mat', xf(cyl(.014, .014, .1, 8), {rx:PI / 2, x:sx + dx, y:T - .1}), 0xc9ced2); }));
    P.add('mat', box(-X + .25, 0, -1.5, X - .25, .03, 1.5, .012), 0x5f9a6b);                                                    // 고무 안전 매트
    [[-1.2, 1.25, .5], [1.35, -1.2, .42], [0, 1.4, .35]].forEach(([x, z, r], i) => P.add('snw', xf(blob(r, .05, r * .6, {seed:i + 3, bump:.12, seg:12}), {x, y:.03, z})));
    P.add('snw', ridge(Array.from({length:13}, (_, i) => V(-X + 2 * X * i / 12, T + .045, Math.sin(i * 1.7) * .008)), .085, .04, 5));
    if (o.seats) SWING.seats.forEach(sx => { const g = seatGeo(); P.add('pla', xf(g.pla, {x:sx, y:T - .1}), 0xffffff); P.add('mat', xf(g.mat, {x:sx, y:T - .1}), 0xffffff); });   // 갤러리용: 앉는 판까지 한 몸으로
    P.bake('pla', groundAO(.3, .8));
    return assemble(P, [['pla', plasticMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [4.3, 2.5, 2.2]); }});
// 앉는 판 한 벌: 원점은 매달린 축(가로대 바로 아래), 아래로 사슬 두 줄과 고무 판
function seatGeo(){
  const P = new Parts(), L = SWING.L - .1;
  [-1, 1].forEach(s => { P.add('mat', tube([V(s * .22, 0, 0), V(s * .215, -L + .03, 0)], .009, {radial:5}), 0xb9bfc4);
    for (let i = 1; i < 12; i++) P.add('mat', xf(cyl(.014, .014, .02, 6), {x:s * (.22 - .005 * i / 12), y:-L * i / 12}), 0x8e959b);                // 사슬 마디
    P.add('mat', xf(cyl(.02, .02, .05, 8), {rx:PI / 2, x:s * .215, y:-L + .02}), 0x8e959b); });
  P.add('pla', box(-.25, -L - .02, -.1, .25, -L + .02, .1, .018), 0x24272b); P.add('pla', box(-.25, -L + .012, -.1, -.2, -L + .028, .1, .006), RED); P.add('pla', box(.2, -L + .012, -.1, .25, -L + .028, .1, .006), RED);
  return {pla:P.geo('pla'), mat:P.geo('mat')};
}
defineProp('swingSeat', {label:'그네 앉는 판', category:'놀이터', isNewStyle:true, small:true, hidden:true,
  usage:"const seat = buildProp('swingSeat');  // 원점이 매달린 축. 회전(rotation.x)으로 흔든다", build(){
    const g = seatGeo(), P = new Parts(); P.add('pla', g.pla); P.add('mat', g.mat);
    return assemble(P, [['pla', plasticMaterial()], ['mat', matteMaterial()]], [.5, SWING.L, .2]); }});

// ── 미끄럼틀 (2026-11-21 2차: U턴 하나 · 탑 3.2m로 줄였다. 아래는 4차 설명): 놀이터 북쪽 칸의 동쪽 절반을 차지한다. 5.4m 탑에서 출발해 앞뒤좌우로 크게 굽이치며
//    가팔랐다 완만했다 하고, 굽이마다 안쪽으로 기울어(뱅크) 돌다가 서쪽 끝 착지 매트로 내려온다 (길이 약 60m).
//    탑과 계단은 걸어 올라갈 수 있고(height), 미끄럼 길은 놀이(activities/slide.js)가 쓴다. 입구(탑 · 출발 부분 · 계단)를 넓혔다.
//   배치(미터): 원점은 놀이 칸 가운데. 탑 바닥 deck = [x0, z0, x1, z1], 계단 stair는 탑의 +z 쪽에서 +z로 내려간다. 미끄럼판은 탑의 -z 쪽으로 나간다.
//   WAY: 미끄럼 길이 지나는 점 [x, 높이, z]. 위에서 내려다볼 때 서로 겹치는 곳은 높이 차가 2.5m 넘게 둔다.
// (2026-11-21 2차) U턴 하나로 줄이고 낮췄다 (탑 3.2m): 북쪽으로 내려가다 서쪽으로 한 번 돌아 남쪽으로 내려온다 (길이 약 21m)
const WAY = [[7.7, 3.2, -.9], [7.7, 2.75, -3.8], [7.4, 2.35, -6.6], [6.3, 2.0, -8.5], [4.5, 1.7, -9.2], [2.7, 1.42, -8.6], [1.6, 1.12, -6.9], [1.4, .75, -4.0], [1.4, .36, -1.2]];
export const SPIRAL = {H:3.2, hw:.5, flare:.78, y1:.36, deck:[6.4, -.9, 9.0, 1.0], stair:[6.9, 1.0, 8.5, 1.0 + 3.2 * 1.35], WAY};
// 미끄럼 길의 가운데 선: [x, y, z] (미터), 고르게 n등분. 높이에 잔물결을 더해 롤러코스터처럼 출렁인다
export function spiralPath(n = 360){
  const c = new THREE.CatmullRomCurve3(WAY.map(([x, y, z]) => V(x, y, z)), false, 'centripetal'), pts = c.getSpacedPoints(n);
  return pts;   // (2026-11-21) 출렁임(잔물결)은 뺐다
}
// i번째 점에서 안쪽으로 기우는 정도 (굽은 정도에 비례, 끝 1.5m는 0)
export function spiralBank(pts, i){
  const n = pts.length - 1, a = pts[Math.max(0, i - 3)], b = pts[i], c = pts[Math.min(n, i + 3)];
  const t1 = b.clone().sub(a).setY(0).normalize(), t2 = c.clone().sub(b).setY(0).normalize(), t = t1.clone().add(t2).normalize(), lat = V(-t.z, 0, t.x);
  const curv = t2.clone().sub(t1).dot(lat) / Math.max(.05, a.distanceTo(c) / 2), fade = Math.min(1, i / 8, (n - i) / 12);
  return -Math.max(-.2, Math.min(.2, curv * .6)) * fade;   // (2026-11-21) 기울기도 절반쯤으로
}
defineProp('spiralSlide', {label:'U자 미끄럼틀', category:'놀이터', isNewStyle:true,
  // (2026-11-22) 발 높이(y)보다 한참 높은 탑 바닥 · 계단은 무시한다: 탑 밑으로 걸어 들어가면 탑 위로 순간이동하던 버그
  height:(x, z, y) => { const mx = x / U, mz = z / U, S = SPIRAL, D = S.deck, T = S.stair, low = h => y !== undefined && h - y > .8 ? null : h;
    if (mx >= D[0] && mx <= D[2] && mz >= D[1] && mz <= D[3]) return low(S.H * U);
    return mx >= T[0] && mx <= T[2] && mz > T[1] && mz <= T[3] ? low(S.H * (1 - (mz - T[1]) / (T[3] - T[1])) * U) : null; },
  colliders:(() => { const S = SPIRAL, D = S.deck, T = S.stair;
    return [[T[0] - .12, T[1], T[0], T[3]], [T[2], T[1], T[2] + .12, T[3]], [D[0] - .12, D[1], D[0], D[3]], [D[2], D[1], D[2] + .12, D[3]], [D[0], D[3] - .06, T[0], D[3] + .06], [T[2], D[3] - .06, D[2], D[3] + .06]]
      .map(r => ({r:r.map(v => v * U)})).concat([{r:[D[0], D[1] - .14, D[2], D[1] + .02].map(v => v * U), y0:(S.H - 1.2) * U}]); })(),   // (2026-11-21) 탑 앞(미끄럼판 쪽)은 탑 위에서만 막는다: 걸어 나가다 떨어지지 않게
  usage:"W.place('spiralSlide', {x: 106, z: 159, rot: 0});  // 약 9m × 15m (탑은 동쪽, 계단 +z, U턴 하나)", build(){
    const P = new Parts(), S = SPIRAL, H = S.H, pl = (g, c) => P.add('pla', g, c), mt = (g, c) => P.add('mat', g, c), pts = spiralPath(420), n = pts.length;
    // 미끄럼판: U자 단면을 길 따라 이어 붙인다. 출발 2m는 넓게 벌어진 입구(flare)
    const sec = [[-1, -.04], [1, -.04], [1, .4], [.89, .4], [.8, .02], [-.8, .02], [-.89, .4], [-1, .4]], rings = [], rimO = [], rimI = [];
    let dist = 0;
    for (let i = 0; i < n; i++) { const p = pts[i]; if (i) dist += p.distanceTo(pts[i - 1]);
      const t = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).setY(0).normalize(), lat = V(-t.z, 0, t.x), b = spiralBank(pts, i);
      const w = S.hw + (S.flare - S.hw) * Math.max(0, 1 - dist / 2.2);
      // 뱅크: 단면을 길 방향 축으로 b만큼 돌린다
      const at = (u, v) => V(p.x + lat.x * (u * Math.cos(b) - v * Math.sin(b)), p.y + v * Math.cos(b) + u * Math.sin(b), p.z + lat.z * (u * Math.cos(b) - v * Math.sin(b)));
      rings.push(sec.map(([u, v]) => at(u * w, v))); rimO.push(at(w * .94, .41)); rimI.push(at(-w * .94, .41)); }
    pl(loft(rings), YEL); [rimO, rimI].forEach(r => pl(tube(r.filter((_, i) => i % 2 === 0), .035, {radial:6}), RED));
    // 받침 다리: 1.6m마다 양옆 두 개 (낮은 끝은 생략)
    dist = 0; let next = 1.2;
    for (let i = 1; i < n - 4; i++) { const p = pts[i]; dist += p.distanceTo(pts[i - 1]); if (dist < next || p.y < .5) continue; next = dist + 1.6;
      const t = pts[i + 1].clone().sub(pts[i - 1]).setY(0).normalize(), lat = V(-t.z, 0, t.x);
      [-1, 1].forEach(k => pl(tube([V(p.x + lat.x * k * (S.hw + .05), 0, p.z + lat.z * k * (S.hw + .05)), V(p.x + lat.x * k * (S.hw + .05), p.y - .03, p.z + lat.z * k * (S.hw + .05))], .04, {radial:8}), BLUE)); }
    // 끝 턱과 착지 매트 (마지막 진행 방향으로)
    { const e = pts[n - 1], d = e.clone().sub(pts[n - 6]).setY(0).normalize(), ang = Math.atan2(d.x, d.z);
      const pad = box(-.9, 0, .05, .9, .035, 2.1, .012); pad.rotateY(ang); pad.translate(e.x, 0, e.z); mt(pad, 0x5f9a6b);
      const lip = box(-S.hw - .04, .1, -.1, S.hw + .04, .42, .12, .08); lip.rotateY(ang); lip.translate(e.x, 0, e.z); pl(lip, RED); }
    // 탑: 기둥 넷, 바닥, 가림판, 손잡이 봉, 뾰족지붕
    const [dx0, dz0, dx1, dz1] = S.deck, cx = (dx0 + dx1) / 2, cz = (dz0 + dz1) / 2;
    [[dx0, dz0], [dx1, dz0], [dx0, dz1], [dx1, dz1]].forEach(([x, z]) => pl(tube([V(x, 0, z), V(x, H + 2.15, z)], .055, {radial:10}), BLUE));
    mt(box(dx0, H - .07, dz0, dx1, H, dz1, .012), WOOD); [dx0, dx1].forEach(x => pl(tube([V(x, H - .12, dz0), V(x, H - .12, dz1)], .04, {radial:8}), BLUE)); [dz0, dz1].forEach(z => pl(tube([V(dx0, H - .12, z), V(dx1, H - .12, z)], .04, {radial:8}), BLUE));
    [[dx0, GRN], [dx1, 0xe8742a]].forEach(([x, c]) => { pl(box(x - .025, H + .08, dz0 + .08, x + .025, H + .95, dz1 - .08, .014), c); pl(tube([V(x, H + 1.05, dz0), V(x, H + 1.05, dz1)], .03, {radial:8}), RED); });
    [[dx0, T => T[0]], [dx1, T => T[2]]].forEach(([x, f]) => pl(box(Math.min(x, f(S.stair)), H + .08, dz1 - .025, Math.max(x, f(S.stair)), H + .95, dz1 + .025, .014), YEL));
    // (2026-11-24) 출발 쪽 위 빨간 손잡이 봉은 내려갈 때 앞을 가려 뺐다
    pl(xf(new THREE.ConeGeometry(1.55, .95, 4), {ry:PI / 4, x:cx, y:H + 2.6, z:cz}), RED); P.add('snw', xf(new THREE.ConeGeometry(1.42, .9, 4), {ry:PI / 4, x:cx, y:H + 2.72, z:cz}));
    pl(xf(new THREE.SphereGeometry(.09, 10, 8), {x:cx, y:H + 3.2, z:cz}), YEL);
    // 계단: 디딤판 18장, 옆판, 난간
    const [sx0, sz0, sx1, sz1] = S.stair, N = Math.round(H / .2), run = (sz1 - sz0) / N, rise = H / N;
    for (let k = 1; k <= N; k++) mt(box(sx0 + .04, H - k * rise - .04, sz0 + (k - 1) * run - .02, sx1 - .04, H - k * rise, sz0 + k * run, .008), WOOD);
    [sx0, sx1].forEach(x => { const g = new THREE.BoxGeometry(.05, .26, Math.hypot(sz1 - sz0, H)); g.rotateX(Math.atan2(H, sz1 - sz0)); g.translate(x, H / 2 - .06, (sz0 + sz1) / 2); pl(g, BLUE);
      pl(tube(fillet([V(x, 0, sz1), V(x, 1.0, sz1), V(x, H + 1.05, sz0 + .02)], .12, 4), .032, {radial:8}), RED); pl(tube([V(x, .52, sz1), V(x, H + .55, sz0)], .018, {radial:6}), RED);
      for (let i = 1; i <= 7; i++) { const t = i / 8, z = sz1 - (sz1 - sz0) * t, y = H * t; pl(tube([V(x, y, z), V(x, y + 1.0, z)], .016, {radial:6}), RED); } });
    [[-3.5, -3.2, .8], [4.0, 4.5, .6], [-6.2, -6.5, .55], [-1.5, 6.0, .6]].forEach(([x, z, r], i) => P.add('snw', xf(blob(r, r * .42, r * .8, {seed:i + 3, bump:.1}), {x, z})));
    P.bake('pla', groundAO(.4, .82)); P.bake('mat', groundAO(.1, .85));
    return assemble(P, [['pla', plasticMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [9, 6.6, 15]); }});

// ── 공중전화 부스: 옥색 알루미늄 틀, 유리 세 면, 앞은 열려 있다. 머리 간판, 전화기, 선반, 무늬 강판 바닥 ──
const boothTex = () => once('booth', () => decalMaterial(canvasTex(512, 512, (g, W, H) => { g.fillStyle = '#f3f5f4'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2f8f8a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '88px ' + FONT_D; g.fillText('공중전화', 300, 62);
  g.lineWidth = 12; g.strokeStyle = '#e0503c'; g.beginPath(); g.arc(74, 60, 34, 0, 7); g.stroke(); g.fillStyle = '#e0503c'; g.beginPath(); g.arc(74, 60, 14, 0, 7); g.fill();
  // 스티커 (아래 절반): 주황 안내, 긴급 전화 안내
  g.fillStyle = '#ef8a2c'; g.fillRect(0, 128, 256, 256); g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 208, 52, 0, 7); g.fill(); g.fillStyle = '#ef8a2c'; g.font = '54px ' + FONT_D; g.fillText('☎', 128, 212);
  g.fillStyle = '#fff'; g.font = '44px ' + FONT_D; g.fillText('공중전화', 128, 322);
  g.fillStyle = '#fbfbf7'; g.fillRect(256, 128, 256, 256); g.fillStyle = '#c8362c'; g.fillRect(256, 128, 256, 56); g.fillStyle = '#fff'; g.font = '34px ' + FONT_D; g.fillText('긴급 전화 무료', 384, 158);
  g.fillStyle = '#2c3136'; g.font = '26px ' + FONT_B; ['화재 · 구조  119', '범죄 신고  112', '동전 · 카드 겸용'].forEach((t, i) => g.fillText(t, 384, 224 + i * 48));
  // 전화기 앞면 (맨 아래)
  g.fillStyle = '#9aa2a8'; g.fillRect(0, 384, 256, 128); g.fillStyle = '#20262b'; g.fillRect(24, 398, 120, 36); g.fillStyle = '#7fd08a'; g.font = '20px ' + FONT_B; g.fillText('카드를 넣으세요', 84, 417);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { g.fillStyle = '#e9ecee'; g.fillRect(30 + c * 38, 444 + r * 16, 30, 12); }
  g.fillStyle = '#f08a2a'; g.fillRect(168, 398, 70, 100); g.fillStyle = '#2a2f34'; g.fillRect(182, 408, 42, 14);
}), {rough:.55}));
defineProp('phoneBooth', {label:'공중전화 부스', category:'거리', isNewStyle:true, blocksCamera:false, minimap:'#5aa7a0', mmSize:1,
  colliders:[[-.5, -.5, .5, -.42], [-.5, -.5, -.42, .46], [.42, -.5, .5, .46]].map(r => ({r:r.map(v => v * U)})),
  usage:"W.place('phoneBooth', {x: 146, z: 186, rot: 0});  // 0.95m × 0.95m × 2.4m, 열린 쪽이 +z", build(){
    const P = new Parts(), TEAL = 0x6fb3ad, DEEP = 0x5a9f99, W = .475, T = 2.38, fr = (g, c = TEAL) => P.add('fr', g, c);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => fr(box(sx * W - .032, .06, sz * W - .032, sx * W + .032, T - .3, sz * W + .032, .008)));
    fr(box(-W - .04, T - .32, -W - .04, W + .04, T, W + .04, .02)); fr(box(-W - .07, T, -W - .07, W + .07, T + .035, W + .07, .012), DEEP);      // 머리 상자와 지붕
    P.add('mat', box(-W - .03, 0, -W - .03, W + .03, .07, W + .03, .01), 0x8f6f66); P.add('met', box(-W + .03, .07, -W + .03, W - .03, .078, W - .03), 0x9aa1a6);   // 바닥
    const rail = (a, b, y, h = .04) => fr(box(Math.min(a.x, b.x) - .018, y - h / 2, Math.min(a.z, b.z) - .018, Math.max(a.x, b.x) + .018, y + h / 2, Math.max(a.z, b.z) + .018));
    [[V(-W, 0, -W), V(W, 0, -W)], [V(-W, 0, -W), V(-W, 0, W)], [V(W, 0, -W), V(W, 0, W)]].forEach(([a, b]) => { [.1, 1.02, T - .34].forEach(y => rail(a, b, y)); });
    // 유리: 뒤, 왼쪽, 오른쪽 (위·아래 두 장씩)
    const G = new Parts(); [[.13, .99], [1.05, T - .36]].forEach(([y0, y1]) => { G.add('g', box(-W + .03, y0, -W - .004, W - .03, y1, -W + .004)); [-1, 1].forEach(s => G.add('g', box(s * W - .004, y0, -W + .03, s * W + .004, y1, W - .03))); });
    // 전화기: 뒤 벽 오른쪽. 몸통, 수화기, 선반
    P.add('mat', box(.02, 1.12, -W + .01, .34, 1.58, -W + .17, .015), 0x8d959b); P.add('mat', box(.25, 1.2, -W + .17, .31, 1.52, -W + .215, .018), 0x2a2f34);
    P.add('mat', tube([V(.28, 1.2, -W + .19), V(.3, 1.02, -W + .16), V(.2, 1.0, -W + .1), V(.1, 1.13, -W + .1)], .008, {radial:5}), 0x2a2f34);
    P.add('met', box(-W + .03, .96, -W + .02, W - .03, .985, -W + .3, .006), 0xc9ced2); P.add('met', box(-.1, 1.62, -W + .01, .34, 1.9, -W + .05, .008), 0xd7dcdf);        // 선반, 안내판
    P.add('gls', box(-.3, T - .07, .05, .3, T - .045, .3, .01), 0xf2f1e6);                                                    // 천장 등
    P.add('snw', box(-W - .05, T + .03, -W - .05, W + .05, T + .13, W + .05, .05));
    const D = new Parts();
    D.add('d', quadZ(-W - .02, T - .29, W + .02, T - .03, W + .0415, [0, .75, 1, 1])); D.add('d', quadZ(-W - .02, T - .29, W + .02, T - .03, -W - .0415, [0, .75, 1, 1], true));
    D.add('d', quadZ(-.38, 1.5, -.12, 1.76, -W + .006, [0, .25, .5, .75])); D.add('d', quadZ(-.4, 1.12, -.14, 1.38, -W + .006, [.5, .25, 1, .75]));
    D.add('d', quadZ(.03, 1.3, .24, 1.56, -W + .172, [0, 0, .5, .25]));
    const glass = new THREE.Mesh(G.geo('g'), clearMaterial({color:0xcfe6e4, opacity:.3})), deco = new THREE.Mesh(D.geo('d'), boothTex());
    return assemble(P, [['fr', plasticMaterial({rough:.5})], ['mat', matteMaterial()], ['met', metalMaterial()], ['gls', glassMaterial(), false], ['snw', snowMaterial({seed:43})]], [1.1, 2.5, 1.1], [deco, glass]); }});

// ── 단지 안내 게시판: 철제 기둥 둘, 비 가림 지붕, 유리문 두 짝 안에 공고문과 광고지 ──
// (2026-11-23) 게시판 그림은 props/signArt/otherSigns.js drawNotice (1024×484, 판 2.48m × 1.16m 비율)
const noticeTex = () => once('notice', () => decalMaterial(canvasTex(1024, 484, g => drawNotice(g)), {rough:.75}));
defineProp('noticeBoard', {label:'단지 안내 게시판', category:'안내', isNewStyle:true, colliders:[{r:[-1.4 * U, -.16 * U, 1.4 * U, .16 * U]}],
  usage:"W.place('noticeBoard', {x: 140, z: 146, rot: 0});  // 폭 2.8m, 높이 2.3m", build(){
    const P = new Parts(), X = 1.3, Y0 = .82, Y1 = 2.0, RUST = 0x8d8479, FR = 0x9fa6aa, mt = (g, c) => P.add('met', g, c);
    [-X, X].forEach(x => { mt(box(x - .045, 0, -.045, x + .045, 2.18, .045, .006), FR); P.add('mat', box(x - .1, 0, -.1, x + .1, .03, .1), 0x8b9297); });
    mt(box(-X, Y0 - .05, -.07, X, Y1 + .05, .05, .008), FR); P.add('mat', box(-X + .05, Y0, .0, X - .05, Y1, .052), 0x35584c);
    mt(box(-.025, Y0, .05, .025, Y1, .075), FR); [Y0, Y1].forEach(y => mt(box(-X + .05, y - .02, .05, X - .05, y + .02, .075), FR));
    [-.06, .06].forEach(x => mt(box(x - .008, 1.38, .078, x + .008, 1.46, .09), 0x4b5258));                                 // 문 손잡이
    // 지붕: 앞으로 살짝 숙인 철판
    const roof = (y, t, c, key) => { const g = new THREE.BoxGeometry(2 * X + .5, t, .78); g.rotateX(.14); g.translate(0, y, .1); P.add(key, g, c); };
    roof(2.24, .05, RUST, 'mat'); roof(2.3, .09, undefined, 'snw'); [-1, 1].forEach(s => mt(box(s * X - .03, 2.1, -.26, s * X + .03, 2.2, .44), FR));
    P.add('snw', ridge([V(-X, Y0 - .04, .06), V(0, Y0 - .04, .07), V(X, Y0 - .04, .06)], .12, .035));
    const deco = new THREE.Mesh(quadZ(-X + .06, Y0 + .01, X - .06, Y1 - .01, .054), noticeTex());
    const glass = new THREE.Mesh(box(-X + .05, Y0, .07, X - .05, Y1, .076), clearMaterial({color:0xd7e6ea, opacity:.16}));
    return assemble(P, [['met', metalMaterial({rough:.45})], ['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [3.1, 2.4, .8], [deco, glass]); }});

// ── 현수막 게시대: 스테인리스 기둥 둘 사이에 현수막 세 장 ──
// (2026-11-23) 현수막 그림은 props/signArt/otherSigns.js drawBannerAtlas (2048×1024, 한 장 2048×336 = 판 4.76m × 0.78m 비율)
const BH = 336;
const bannerTex = () => once('banner', () => decalMaterial(canvasTex(2048, 1024, g => drawBannerAtlas(g)), {rough:.8}));
defineProp('bannerBoard', {label:'현수막 게시대', category:'안내', isNewStyle:true, colliders:[{c:[-2.5 * U, 0, .1 * U]}, {c:[2.5 * U, 0, .1 * U]}],
  usage:"W.place('bannerBoard', {x: 184, z: 146, rot: Math.PI / 2});  // 폭 5m, 높이 4.4m, 현수막 세 장", build(){
    const P = new Parts(), X = 2.5, T = 4.2, D = new Parts(), mt = (g, c = STEEL) => P.add('met', g, c);
    [-X, X].forEach(x => { mt(tube([V(x, 0, 0), V(x, T, 0)], .055, {radial:10})); P.add('mat', xf(cyl(.14, .16, .05, 12), {x, y:.025}), 0x8b9297); });
    mt(box(-X - .25, T, -.22, X + .25, T + .05, .22, .01), 0xcfd4d7); P.add('snw', box(-X - .22, T + .04, -.2, X + .22, T + .16, .2, .06));
    [0, 1, 2].forEach(i => { const y1 = 3.9 - i * 1.02, y0 = y1 - .78; [y0 - .03, y1 + .03].forEach(y => mt(tube([V(-X, y, 0), V(X, y, 0)], .016, {radial:6})));
      const uv = [0, 1 - (i + 1) * BH / 1024, 1, 1 - i * BH / 1024]; D.add('d', quadZ(-X + .12, y0, X - .12, y1, .012, uv)); D.add('d', quadZ(-X + .12, y0, X - .12, y1, -.012, uv, true));
      [[-1, y0], [-1, y1], [1, y0], [1, y1]].forEach(([s, y]) => P.add('mat', tube([V(s * (X - .12), y, .012), V(s * (X - .03), y + (y === y0 ? -.03 : .03), 0)], .006, {radial:4}), 0xe9e6dc)); });   // 묶은 끈
    return assemble(P, [['met', metalMaterial()], ['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [5.5, 4.4, .5], [new THREE.Mesh(D.geo('d'), bannerTex())]); }});

// ── 차선규제봉: 중앙선 위에 세우는 주황 봉. 반사띠 두 줄 ──
defineProp('laneDelineator', {label:'차선규제봉', category:'도로', isNewStyle:true,                  // 충돌 없음: 사람이 사이로 지나갈 수 있다
  usage:"W.placeMany('laneDelineator', zs.map(z => ({x: 198.5, z})));  // 높이 0.75m", build(){
    const P = new Parts(), ORG = 0xf2601c;
    // 받침: 넓고 낮은 원판이 매끈하게 기둥으로 이어진다 (참고 사진). 기둥은 위로 아주 조금 가늘어진다.
    P.add('pla', lathe([[.13, 0], [.136, .01], [.132, .022], [.11, .034], [.07, .052], [.052, .075], [.047, .11], [.042, .735], [.036, .75], [0, .753]], 20), ORG);
    [[.42, .5], [.585, .665]].forEach(([y0, y1]) => P.add('gls', xf(cyl(.0446, .0444, y1 - y0, 20), {y:(y0 + y1) / 2}), 0xdfe5ea));
    [.095, -.095].forEach(x => P.add('mat', xf(cyl(.016, .016, .006, 10), {x, y:.03, rz:x > 0 ? -.55 : .55}), 0x3a3f44));                             // 받침의 볼트 구멍 두 개
    P.bake('pla', groundAO(.1, .8));
    return assemble(P, [['pla', plasticMaterial()], ['gls', glassMaterial({rough:.2}), false], ['mat', matteMaterial(), false]], [.26, .75, .26]); }});

// ── 차량 신호등 (한국식): 오른쪽 길가 기둥에서 차로 위로 가로 팔을 내밀고, 가로로 늘어선 4색등(빨강·노랑·좌회전·초록) ──
defineProp('trafficLight', {label:'차량 신호등', category:'도로', isNewStyle:true, colliders:[{c:[0, 0, .16 * U]}],
  variants:[{label:'빨간불', opts:{}}, {label:'초록불', opts:{state:'green'}}],
  usage:"W.place('trafficLight', {x: 170, z: 255, rot: Math.PI / 2, arm: 5, state: 'red'});  // 불빛은 +z(다가오는 차)를 보고, 팔은 운전자가 볼 때 왼쪽(-x)으로 뻗는다", build(o = {}){
    const P = new Parts(), A = o.arm || 4.5, TOP = 5.9, AY = 5.25, GREY = 0x8d959b, DARK = 0x262a2f, on = o.state || 'red', mt = (g, c = GREY) => P.add('mat', g, c);
    mt(lathe([[.2, 0], [.2, .04], [.14, .1], [.115, .6], [.085, TOP - .05], [.09, TOP], [0, TOP + .03]], 14)); for (let i = 0; i < 4; i++) mt(xf(cyl(.02, .02, .04, 6), {x:Math.cos(i * PI / 2 + .78) * .16, y:.06, z:Math.sin(i * PI / 2 + .78) * .16}), 0x5f666c);
    mt(tube([V(0, AY - .25, 0), V(-.5, AY, 0), V(-A * .5, AY + .1, 0), V(-A, AY + .14, 0)], t => .075 - .025 * t, {radial:8})); mt(tube([V(0, TOP - .15, 0), V(-A * .55, AY + .12, 0)], .014, {radial:5}), 0x6b7379);   // 팔과 당김줄
    const hx = -(A - 1.0), hy = AY - .32, L = 1.62, LAMPS = [['red', 0xff3b2f, 0x4a1512], ['yellow', 0xffc21a, 0x4a3a10], ['arrow', 0x25e07a, 0x123a26], ['green', 0x25e07a, 0x123a26]];
    mt(box(hx - L / 2, hy - .2, -.1, hx + L / 2, hy + .2, .08, .03), DARK); [hx - .5, hx + .5].forEach(x => mt(box(x - .025, hy + .2, -.03, x + .025, AY + .1, .03), GREY));
    LAMPS.forEach(([name, lit, dim], i) => { const x = hx - L / 2 + .225 + i * .39, isOn = name === on;
      P.add(isOn ? 'lit' : 'gls', xf(cyl(.15, .15, .02, 20), {rx:PI / 2, x, y:hy, z:.085}), isOn ? lit : dim);
      if (name === 'arrow') P.add('gls', xf(box(-.08, -.018, 0, .08, .018, .006), {x, y:hy, z:.096}), 0x0d2a1b);
      mt(box(x - .17, hy + .15, .08, x + .17, hy + .175, .26, .008), DARK); [-1, 1].forEach(s => mt(box(x + s * .17 - .012, hy - .02, .08, x + s * .17 + .012, hy + .17, .2 , .006), DARK)); });
    mt(box(-.16, 2.4, .1, .16, 2.9, .2, .02), 0xf0c020); mt(box(-.12, 2.45, .2, .12, 2.85, .206), 0x2a2f34);                           // 기둥의 노란 제어함
    P.add('snw', box(hx - L / 2 + .02, hy + .195, -.09, hx + L / 2 - .02, hy + .27, .07, .035)); P.add('snw', xf(blob(.1, .05, .1, {seed:2, bump:.05, seg:8}), {y:TOP + .01}));
    P.bake('mat', groundAO(.3, .8));
    return assemble(P, [['mat', matteMaterial()], ['gls', glassMaterial({rough:.25}), false], ['lit', litMaterial(), false], ['snw', snowMaterial({seed:43})]], [A + .3, 6, .5]); }});

// ── 보행자 신호등: 세로 2색등(빨간 사람·초록 사람)과 남은 시간 표시 ──
const pedTex = green => once('ped' + green, () => { const t = canvasTex(128, 256, (g, W, H) => { g.fillStyle = '#0e1012'; g.fillRect(0, 0, W, H);
  const man = (cy, c, walk) => { g.fillStyle = g.strokeStyle = c; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.arc(64, cy - 38, 10, 0, 7); g.fill();
    g.beginPath(); g.moveTo(64, cy - 24); g.lineTo(64, cy + 8); g.stroke(); g.beginPath();
    if (walk) { g.moveTo(64, cy + 8); g.lineTo(46, cy + 42); g.moveTo(64, cy + 8); g.lineTo(82, cy + 40); g.moveTo(64, cy - 16); g.lineTo(42, cy - 2); g.moveTo(64, cy - 16); g.lineTo(84, cy - 4); }
    else { g.moveTo(58, cy + 8); g.lineTo(56, cy + 42); g.moveTo(70, cy + 8); g.lineTo(72, cy + 42); g.moveTo(64, cy - 18); g.lineTo(46, cy + 6); g.moveTo(64, cy - 18); g.lineTo(82, cy + 6); }
    g.stroke(); };
  man(64, green ? '#4a1a17' : '#ff4034', false); man(192, green ? '#35f08a' : '#143a26', true); }); return new THREE.MeshBasicMaterial({name:'ped', map:t}); });
defineProp('pedSignal', {label:'보행자 신호등', category:'도로', isNewStyle:true, colliders:[{c:[0, 0, .1 * U]}],
  variants:[{label:'초록불', opts:{}}, {label:'빨간불', opts:{state:'red'}}],
  usage:"W.place('pedSignal', {x: 177, z: 254.5, rot: 0});  // 높이 3.1m, 불빛은 +z(건너편)를 본다", build(o = {}){
    const P = new Parts(), GREY = 0x8d959b, DARK = 0x262a2f, mt = (g, c = GREY) => P.add('mat', g, c), green = o.state !== 'red';
    mt(lathe([[.12, 0], [.12, .03], [.075, .08], [.06, 2.2], [.055, 3.05], [0, 3.07]], 12));
    mt(box(-.19, 2.28, .02, .19, 3.02, .2, .025), DARK); [2.66, 3.0].forEach(y => mt(box(-.2, y, .2, .2, y + .02, .34, .006), DARK)); mt(box(-.04, 2.5, -.04, .04, 2.8, .04), GREY);
    mt(box(-.09, 1.15, .05, .09, 1.42, .13, .015), 0xf0c020); mt(xf(cyl(.035, .035, .02, 12), {rx:PI / 2, y:1.3, z:.135}), 0xd2342a);                // 누름 단추
    P.add('snw', box(-.18, 3.015, .03, .18, 3.07, .32, .025));
    const face = new THREE.Mesh(quadZ(-.16, 2.31, .16, 2.99, .2015), pedTex(green));
    return assemble(P, [['mat', matteMaterial()], ['snw', snowMaterial({seed:43})]], [.45, 3.1, .4], [face]); }});
