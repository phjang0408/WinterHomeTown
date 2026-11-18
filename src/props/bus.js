// 마을버스: 노란 중형 저상버스 (길이 9m, 폭 2.46m). 사용자 참고 그림(초록 시내버스 앞·뒤 모습)의 짜임을 노란색으로 옮겼다.
//   몸통은 차량과 같은 방식으로 단면 고리를 이어 만들고(loft), 바퀴 자리를 실제로 파낸다. 지붕은 흰색(정점 색).
//   앞: 큰 앞유리, 위 LED 행선판, 앞으로 뻗은 '벌레눈' 거울, 아래 검은 범퍼와 노란 영업용 번호판.
//   오른쪽(문 쪽, -x): 앞문·가운데문(유리 두 짝), 노선 안내판. 왼쪽(+x): 운전석 창, 회사 글씨, 뒤 엔진 통풍구.
//   뒤: 뒷유리, 노선 번호판, 세로 후미등, 검은 범퍼. 지붕 위 흰 냉방기와 쌓인 눈.
//   노선·회사·번호는 지어낸 것 (동화마을버스 01번). 그리기 5회: 도장 · 광택 · 무광 · 눈 · 그림. 미터 단위, 앞이 +z.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, loft, tube, fillet, xf, bakeAO, triCount, Parts } from '../core/meshkit.js';
import { carPaintMaterial, glassMaterial, matteMaterial, snowMaterial, decalMaterial } from '../core/texkit.js';
import { quad, quadZ } from './kit.js';
import { prof, ring, steps, wheel, C } from './cars.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const BUS = {L:9, W:2.46, H:2.98, z0:-4.5, z1:4.5, R:.46, tw:.29, fa:2.45, ra:-1.95, yel:0xf2bd1c, roof:0xf1f1ec};
const B = BUS;
// 곧은 구간은 점을 촘촘히 찍어 둔다 (곡선 보간이 가운데를 부풀리지 않게)
const flat = (a, b, v) => [-3, -1.5, 0, 1.5, 3].filter(z => z > a && z < b).map(z => [z, v]);
const hwP = prof([[-4.5, 1.1], [-4.44, 1.19], [-4.3, 1.23], ...flat(-4.3, 4.3, 1.23), [4.3, 1.23], [4.44, 1.19], [4.5, 1.1]]);
const topP = prof([[-4.5, 2.8], [-4.42, 2.93], [-4.2, 2.98], ...flat(-4.2, 4.2, 2.98), [4.2, 2.98], [4.42, 2.93], [4.5, 2.8]]);
const botP = prof([[-4.5, .42], [-4.32, .3], ...flat(-4.32, 4.32, .3), [4.32, .3], [4.5, .38]]);

// ── 그림 한 장 (1024 × 1024): 앞 행선판, 뒤 번호판, 노란 번호판, 옆 노선 안내판, 회사 글씨 ──
const R_ = {front:[0, 0, 1024, 150], rear:[0, 160, 512, 128], plate:[520, 160, 384, 192], side:[0, 360, 832, 256], logo:[0, 630, 1024, 170]};
const uvOf = ([x, y, w, h]) => [x / 1024, 1 - (y + h) / 1024, (x + w) / 1024, 1 - y / 1024];
let atlasMat = null;
function atlas(){
  if (atlasMat) return atlasMat;
  const t = canvasTex(1024, 1024, g => {
    g.clearRect(0, 0, 1024, 1024); g.textBaseline = 'middle';
    const led = (x, y, w, h, draw) => { g.fillStyle = '#121416'; g.fillRect(x, y, w, h); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.shadowColor = 'rgba(255,170,40,.9)'; g.shadowBlur = 10; g.fillStyle = '#ffb02e'; draw(); g.restore();
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let yy = y; yy < y + h; yy += 6) g.fillRect(x, yy, w, 2); };            // LED 점 느낌의 가로 줄
    // 앞 행선판: 큰 노선 번호 + 행선지
    led(...R_.front, () => { g.textAlign = 'left'; g.font = '112px ' + FONT_D; g.fillText('01', 30, 80); g.font = '74px ' + FONT_D; g.fillText('동화마을 · 강변공원', 220, 80); });
    // 뒤 노선 번호판
    led(...R_.rear, () => { g.textAlign = 'center'; g.font = '104px ' + FONT_D; g.fillText('01', 256, 228); });
    // 노란 영업용 번호판 (2000년대 두 줄 번호판)
    { const [x, y] = R_.plate; g.fillStyle = '#efe7b8'; g.fillRect(x, y, 384, 192); g.fillStyle = '#f1c21b'; g.fillRect(x + 7, y + 7, 370, 178);
      g.fillStyle = '#1d2a4a'; g.textAlign = 'center'; g.font = '62px ' + FONT_D; g.fillText('동화 70', x + 192, y + 50); g.font = '96px ' + FONT_D; g.fillText('자 3108', x + 192, y + 128);
      [[28, 26], [356, 26]].forEach(([a, b]) => { g.fillStyle = '#c8b25a'; g.beginPath(); g.arc(x + a, y + b, 7, 0, 7); g.fill(); }); }
    // 옆 노선 안내판: 흰 판에 노선 번호와 경유지
    { const [x, y, w, h] = R_.side; g.fillStyle = '#f7f7f2'; g.fillRect(x, y, w, h); g.fillStyle = '#1f6a45'; g.fillRect(x, y, 230, h);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '150px ' + FONT_D; g.fillText('01', x + 115, y + 130);
      g.fillStyle = '#20252b'; g.textAlign = 'left'; g.font = '58px ' + FONT_D; g.fillText('동화마을 ↔ 강변공원', x + 262, y + 70);
      g.font = '800 34px ' + FONT_B; g.fillStyle = '#4b5560'; g.fillText('동화아파트 · 동화상가 · 동화역 · 강변', x + 264, y + 150);
      g.strokeStyle = '#1f6a45'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 264, y + 205); g.lineTo(x + 800, y + 205); g.stroke();
      for (let i = 0; i < 6; i++) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + 274 + i * 104, y + 205, 13, 0, 7); g.fill(); g.stroke(); } }
    // 회사 글씨 (투명 바탕): 몸통 옆에 붙인다
    { const [x, y, w, h] = R_.logo; g.textAlign = 'left'; g.fillStyle = '#1f4f37'; g.font = '128px ' + FONT_D; g.fillText('동화마을버스', x + 20, y + 86);
      g.fillStyle = '#c6281f'; g.fillRect(x + 20, y + 150, 760, 10); }
  });
  atlasMat = decalMaterial(t, {rough:.5, alpha:true}); return atlasMat;
}

function buildBus(o = {}){
  const P = new Parts(), D = new Parts(), yel = o.color === undefined ? B.yel : o.color, ax = [B.fa, B.ra], Ra = B.R + .09;
  const arch = z => { let y = 0; for (const a of ax) { const d = Math.abs(z - a); if (d < Ra) y = Math.max(y, B.R + .02 + Math.sqrt(Ra * Ra - d * d)); } return y; };
  // 몸통: 위 모서리를 크게 굴린 단면. 지붕(높이 2.8m 위)은 흰색, 나머지는 노란색.
  const rings = steps(B.z0, B.z1, .09).map(z => ring(z, hwP(z), Math.max(botP(z), arch(z)), topP(z), .34, .06, .035));
  const body = loft(rings), pa = body.getAttribute('position'), col = new Float32Array(pa.count * 3), cy = new THREE.Color(yel), cw = new THREE.Color(B.roof);
  for (let i = 0; i < pa.count; i++) { const c = pa.getY(i) > 2.74 ? cw : cy; col.set([c.r, c.g, c.b], i * 3); }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3)); P.add('pnt', body);
  const hm = 1.23, side = s => s * (hm + .004);                                     // 옆면 바깥 x
  // ── 옆 창 띠: 검은 바탕 띠 위에 창마다 유리. 위쪽 작은 미닫이창 경계(가로 띠). ──
  const band = (s, z0, z1, y0 = 1.24, y1 = 2.56) => P.add('mat', box(Math.min(side(s), side(s) + s * .012), y0, z0, Math.max(side(s), side(s) + s * .012), y1, z1, .006), 0x16191c);
  const pane = (s, z0, z1, y0 = 1.32, y1 = 2.48, split = 2.08) => { const x0 = side(s) + s * .012, x1 = side(s) + s * .02;
    P.add('gls', box(Math.min(x0, x1), y0, z0 + .05, Math.max(x0, x1), y1, z1 - .05, .008), 0x24323c);
    if (split) P.add('mat', box(Math.min(x0, x1) - .002, split - .022, z0 + .05, Math.max(x0, x1) + .002, split + .022, z1 - .05), 0x16191c); };
  // 왼쪽 (+x, 운전석 쪽): 운전석 창은 아래로 더 내려온다
  band(1, -4.3, 4.34); pane(1, 3.55, 4.3, 1.05, 2.48, 0);
  [[2.3, 3.5], [.98, 2.25], [-.36, .93], [-1.72, -.41], [-3.08, -1.77], [-4.25, -3.13]].forEach(([a, b]) => pane(1, a, b));
  // 오른쪽 (-x, 문 쪽): 앞문, 창 둘, 가운데문, 창 둘
  band(-1, -4.3, 4.34);
  [[1.95, 3.12], [.64, 1.9], [.0, .6]].forEach(([a, b], i) => pane(-1, a, b, 1.32, 2.48, i < 2 ? 2.08 : 0));
  [[-2.62, -1.38], [-4.25, -2.68]].forEach(([a, b]) => pane(-1, a, b));
  const door = (z0, z1) => { const x = side(-1) - .014;
    P.add('mat', box(x - .006, .3, z0 - .04, side(-1) + .002, 2.62, z1 + .04, .006), 0x16191c);                    // 문틀 (검정)
    const mid = (z0 + z1) / 2; [[z0, mid], [mid, z1]].forEach(([a, b]) => {
      P.add('pnt', box(x - .02, .34, a + .02, x - .006, 2.58, b - .02, .008), yel);                                   // 문짝 테 (차체 색)
      [[1.28, 2.48], [.46, 1.16]].forEach(([y0, y1]) => P.add('gls', box(x - .03, y0, a + .09, x - .018, y1, b - .09, .006), 0x3a4b56)); });
    P.add('mat', box(x - .034, .34, mid - .012, x - .02, 2.58, mid + .012), 0x16191c); };
  door(3.22, 4.3); door(-1.3, -.08);
  // 바퀴 위 테두리 (검은 고무 몰딩)
  ax.forEach(z => [-1, 1].forEach(s => { const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * i / 14; pts.push(V(s * (hm + .012), B.R + .02 + Math.sin(a) * Ra, z + Math.cos(a) * Ra)); }
    P.add('mat', tube(pts, .035, {radial:6}), 0x1b1e21); }));
  // ── 앞 ──
  const fz = B.z1;
  P.add('mat', box(-1.12, .9, fz - .02, 1.12, 2.86, fz + .012, .02), 0x16191c);                                      // 앞유리·행선판 둘레
  P.add('gls', box(-1.06, .98, fz - .01, 1.06, 2.47, fz + .026, .03), 0x2c3c47);                                      // 앞유리
  D.add('d', quadZ(-.98, 2.54, .98, 2.82, fz + .02, uvOf(R_.front)));                                                 // 행선판
  P.add('mat', box(-1.21, .27, fz - .12, 1.21, .64, fz + .07, .06), 0x1b1e21);                                       // 범퍼
  P.add('mat', box(-.9, .66, fz + .004, .9, .74, fz + .02, .01), 0x2b2f34);                                           // 아래 그릴 띠
  [-1, 1].forEach(s => { P.add('gls', box(s * .78 - .26, .7, fz - .03, s * .78 + .26, .86, fz + .03, .03), C.head); P.add('gls', box(s * 1.07 - .08, .7, fz - .06, s * 1.07 + .07, .86, fz + .01, .02), C.amber);
    // 벌레눈 거울: 지붕 모서리에서 앞으로 뻗어 나와 아래로 늘어진다
    const m0 = V(s * 1.12, 2.66, fz - .15), m1 = V(s * 1.36, 2.72, fz + .32), m2 = V(s * 1.36, 2.44, fz + .42);
    P.add('mat', tube(fillet([m0, m1, m2], .12, 4), .025, {radial:6}), 0x1b1e21);
    P.add('mat', box(s * 1.36 - .13, 1.95, fz + .36, s * 1.36 + .13, 2.45, fz + .48, .04), 0x1b1e21); P.add('gls', box(s * 1.36 - .11, 1.98, fz + .35, s * 1.36 + .11, 2.42, fz + .362), 0x7f8d97);
    // 와이퍼 (앞유리 아래에서 위로)
    P.add('mat', tube([V(s * .18, 1.02, fz + .04), V(s * .62, 2.05, fz + .045)], .012, {radial:5}), 0x1b1e21); P.add('mat', tube([V(s * .16, 1.05, fz + .05), V(s * .5, 2.15, fz + .055)], .007, {radial:4}), 0x1b1e21); });
  P.add('mat', box(-.21, .34, fz + .07, .21, .54, fz + .085, .008), 0x6d6a4a); D.add('d', quadZ(-.18, .355, .18, .525, fz + .088, uvOf(R_.plate)));      // 앞 번호판
  // ── 뒤 ──
  const rz = B.z0;
  P.add('gls', box(-.98, 1.56, rz - .026, .98, 2.46, rz + .02, .03), 0x24323c);                                       // 뒷유리
  P.add('mat', box(-.66, 2.5, rz - .02, .66, 2.82, rz + .01, .01), 0x16191c); D.add('d', quadZ(-.6, 2.53, .6, 2.79, rz - .024, uvOf(R_.rear), true));
  P.add('mat', box(-1.2, .27, rz - .07, 1.2, .7, rz + .12, .06), 0x1b1e21);                                           // 범퍼
  [-1, 1].forEach(s => { const x = s * .98; P.add('gls', box(x - .1, .76, rz - .03, x + .1, 1.3, rz + .04, .03), C.tail); P.add('gls', box(x - .1, 1.3, rz - .03, x + .1, 1.46, rz + .04, .03), C.amber);
    P.add('gls', box(x - .1, 1.46, rz - .02, x + .1, 1.52, rz + .03, .01), 0xeef1f3); });
  for (let k = 0; k < 6; k++) P.add('mat', box(-.62, .86 + k * .085, rz - .016, .62, .9 + k * .085, rz + .01, .006), 0x2b2f34);       // 엔진 통풍구
  P.add('mat', box(-.21, .74, rz - .03, .21, .94, rz - .012, .008), 0x6d6a4a); D.add('d', quadZ(-.18, .755, .18, .925, rz - .033, uvOf(R_.plate), true));
  // 왼쪽 뒤 엔진 통풍구
  for (let k = 0; k < 5; k++) P.add('mat', box(hm - .005, .62 + k * .1, -3.85, hm + .014, .67 + k * .1, -2.95, .006), 0x2b2f34);
  // ── 옆 그림: 노선 안내판(오른쪽 문 사이), 회사 글씨(양쪽) ──
  const sideQuad = (s, z0, z1, y0, y1, uv) => { const x = side(s) + s * .006; D.add('d', s > 0 ? quad([x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1], uv) : quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], uv)); };
  sideQuad(-1, .04, 1.34, .62, 1.02, uvOf(R_.side));                                  // 노선 안내판: 가운데문(z -0.08) 바로 앞, 앞바퀴 자리(z 1.9~)와 떨어진다 sideQuad(1, -1.6, 1.3, .62, 1.1, uvOf(R_.logo)); sideQuad(-1, -4.2, -2.75, .7, .95, uvOf(R_.logo));
  // ── 지붕: 흰 냉방기, 앞뒤 둥근 덮개 ──
  P.add('pnt', box(-.86, 2.96, -2.5, .86, 3.24, .9, .1), B.roof); P.add('mat', box(-.7, 3.0, -2.56, .7, 3.16, -2.5), 0x9aa3aa);
  // ── 바퀴, 바닥 ──
  ax.forEach(z => [-1, 1].forEach(s => { const x = s * (hm - B.tw / 2 - .03); wheel(P, x, B.R, z, B.R, B.tw, s);
    // 버스 휠: 회색 강철 원판, 볼트 구멍 8개, 가운데 허브
    const fx = x + s * (B.tw / 2 - .03), disc = (r, t, c, dx = 0) => P.add('mat', xf(new THREE.CylinderGeometry(r, r, t, 20), {rz:Math.PI / 2, x:fx + s * dx, y:B.R, z}), c);
    disc(B.R - .14, .012, 0x8b9197); disc(.11, .05, 0x5b6167, .02);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P.add('mat', xf(new THREE.CylinderGeometry(.03, .03, .016, 8), {rz:Math.PI / 2, x:fx + s * .006, y:B.R + Math.sin(a) * .2, z:z + Math.cos(a) * .2}), 0x2a2e33); } }));
  [-1, 1].forEach(s => wheel(P, s * (hm - B.tw * 1.5 - .06), B.R, B.ra, B.R, B.tw * .9, s));                             // 뒤 복륜 안쪽
  P.add('mat', box(-hm + .4, .24, B.z0 + .3, hm - .4, .6, B.z1 - .3), 0x14171a);
  // ── 눈: 지붕과 냉방기 위 ──
  if (o.snow !== 0) { P.add('snw', box(-.98, 2.975, -4.25, .98, 3.04, -2.6, .03)); P.add('snw', box(-.98, 2.975, 1.0, .98, 3.045, 4.2, .03)); P.add('snw', box(-.78, 3.235, -2.4, .78, 3.3, .8, .04)); }
  // ── 조립 ──
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(UNIT); g.add(inner);
  const paint = P.geo('pnt'); bakeAO(paint, (p, n) => (n.y < -.35 ? .55 : 1) * (.8 + .2 * Math.min(1, p.y / .8)));
  const add = (geo, m, cast) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = cast; mesh.receiveShadow = true; inner.add(mesh); };
  add(paint, carPaintMaterial(), true); add(P.geo('gls'), glassMaterial(), true); add(P.geo('mat'), matteMaterial(), true);
  if (P.has('snw')) add(P.geo('snw'), snowMaterial({seed:46}), false);
  add(D.geo('d'), atlas(), false);
  g.userData.info = {tris:triCount(g), draws:inner.children.length, materials:inner.children.length, sizeMeters:[B.W, 3.3, B.L]};
  return g;
}
defineProp('townBus', {label:'마을버스 (노란색)', category:'차량', isNewStyle:true, colliders:[{r:[-1.25 * UNIT, -4.55 * UNIT, 1.25 * UNIT, 4.55 * UNIT]}],
  variants:[{label:'눈 없음', opts:{snow:0}}],
  usage:"addVehicle(buildProp('townBus'), 경로, {max: 6.5, half: 5.4});  // 9m × 2.46m. 문은 오른쪽(-x)", build:buildBus});
