// 미니맵 (2026-11-25 3차 → 4차: 만화풍 지도). 월드 도형을 그대로 칠하지 않고 layout.js 값으로 단순한 안내도를 그린다.
//   - 구역(아파트 단지 · 공원 블록 · 학교 · 강변)은 옅은 면, 도로는 회색 띠, 건물은 회색 블록. 역은 선로 띠 + 승강장만, 육교는 파란색.
//   - 체험 공간은 호박색 면 + 테두리로 두드러지게, 이름과 할 수 있는 놀이를 적는다.
//   - 글자는 나눔고딕, 흰 테두리 없이 글자만. 작은 지도용(NK)과 큰 지도용(BK) 그림을 처음에 한 번씩 구워 두고,
//     작은 지도는 그중 내 주변을 잘라 그린 뒤 사람 · 화살촉만 얹는다.
//   오른쪽 위 작은 네모 지도는 '내 주변'(북쪽이 위, 반경 R). 누르거나 M 키면 가운데 '동네 지도' 창, Esc · 닫기 · 화면 누르기로 닫힌다.
import { S } from '../core/state.js';
import { COLORS } from '../config.js';
import { W } from '../world/world.js';
import { WORLD, NROAD, ROAD, RAILS, PLAT, BRIDGES, LOOP, PIT, SNOW, FOUNTAIN, TKS, GONGGI, TWIN, STN_AT, GOGUMA, HOTTEOK, SLED, KITE, BIG, SCHOOL } from '../map/layout.js';

const mini = document.getElementById('mini'), g = mini.getContext('2d');
const big = document.getElementById('bigmap'), bc = document.getElementById('bigmap-c'), bg = bc.getContext('2d');
const WX = WORLD.x1 - WORLD.x0, WZ = WORLD.z1 - WORLD.z0;
const N = 360, R = 45, NK = N / (2 * R);          // 작은 지도: 캔버스 한 변, 보이는 반경(게임 단위), 배율(px / 단위)
const BK = bc.width / WX;                         // 큰 지도 배율
const nearImg = document.createElement('canvas'), bigImg = document.createElement('canvas');
const FONT = '"Nanum Gothic","Apple SD Gothic Neo","Malgun Gothic",sans-serif', TFONT = '"Black Han Sans","Nanum Gothic",sans-serif';
// (2026-11-25 4차) 사용자 레퍼런스(만화풍 게임 지도: 굵은 외곽선 · 동글동글한 나무 · 굽은 길 · 아이콘 건물)를 겨울 동네로 옮김
// (2026-11-25 5차) 바탕은 내 UI처럼 검정 · 노랑, 강 · 강변 · 역 · 육교 · 잔디 · 썰매장은 제 색을 살린다
const C = {bg:'#2b2f34', zone:'#383d43', zoneEdge:'#50575e', plaza:'#40464d', plazaEdge:'#5b636b', lawn:'#476f50', lawnEdge:'#6c9a76',
  road:'#59616a', roadEdge:'#737c86', roadMark:'#f2b544', bike:'#8a4a40', bikeEdge:'#a8655a', bank:'#3c5466', bankSpeck:'#5a7488',
  ink:'#f4f2ec', inkDark:'#1d2a33', sub:'#c3c8cc', line:'#1c1f22',
  river:'#3f8cc2', riverEdge:'#8cc6ea', riverText:'#eef8ff', ice:'#d6eefa', iceEdge:'#a5d6ef',
  apt:'#7d8893', aptEdge:'#9aa5b0', school:'#a1705a', schoolEdge:'#c08a71', shop:'#5b636c',
  bridge:'#5c97e0', tie:'#8a6d55', rail:'#b4bcc4', plat:'#d3d8dd',
  badge:'#f2b544', title:'#ffd84a', titleEdge:'#1a1b1d', stepHi:'#f4f6f8', stepLo:'#646c75'};
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };
function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 지도 한 장을 k(px / 단위) 배율로 그린다. f: 글자 크기(게임 단위) {title, name, act, sub}
function drawMap(c, k, f){
  const X = x => (x - WORLD.x0) * k, Z = z => (z - WORLD.z0) * k, OL = Math.max(1.6, k * .75);
  const rr = (x0, z0, x1, z1, r) => { c.beginPath(); c.roundRect ? c.roundRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k, r * k) : c.rect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k); };
  const box = (x0, z0, x1, z1, fill, edge, r = 1.2, lw = OL) => { rr(x0, z0, x1, z1, r); c.fillStyle = fill; c.fill(); if (edge) { c.lineWidth = lw; c.strokeStyle = edge; c.stroke(); } };
  const text = (t, x, z, size, color, weight = 800, align = 'center') => { c.font = `${weight} ${Math.round(size * k)}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(t, X(x), Z(z)); };
  // 길: 테두리 색으로 넓게 한 번, 길 색으로 한 번 (만화 지도의 흙길처럼)
  const path = (pts, w, fill, edge) => { c.lineJoin = 'round'; c.lineCap = 'round';
    for (const [col, ww] of [[edge, w * k + OL * 2], [fill, w * k]]) { c.beginPath(); pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)))); c.lineWidth = ww; c.strokeStyle = col; c.stroke(); } };
  const R1 = rng(7);

  // 바탕: 눈밭 + 옅은 눈 결
  c.fillStyle = C.bg; c.fillRect(0, 0, c.canvas.width, c.canvas.height);

  // 구역 판: 아파트 단지 · 학교 (옅은 판 + 테두리), 공원 블록(포장) · 잔디
  box(13, 93, 186, 246, C.zone, C.zoneEdge, 4);
  box(SCHOOL.x0, SCHOOL.z0, SCHOOL.x1, SCHOOL.z1, C.zone, C.zoneEdge, 4);
  box(206, 94, 434, 251, C.plaza, C.plazaEdge, 3);
  box(PIT.x0, PIT.z0, PIT.x1, PIT.z1, C.lawn, C.lawnEdge, 6);
  // 강변 둔치: 눈 덮인 둑 (점점이 눈)
  c.fillStyle = C.bank; c.fillRect(0, Z(279), c.canvas.width, Z(338) - Z(279)); c.fillStyle = C.bankSpeck; for (let i = 0; i < 900; i++) { const x = R1() * WX, z = 297 + R1() * 38; c.beginPath(); c.ellipse(X(x), Z(z), k * .9, k * .5, 0, 0, Math.PI * 2); c.fill(); }
  // 계단: 내려가는 쪽(down: n · s · e · w)으로 디딤판을 밝은 색에서 어두운 색으로, 단마다 그림자 줄
  const stairs = (x0, z0, x1, z1, down, n = 6) => {
    for (let i = 0; i < n; i++) { const t = i / n, t1 = (i + 1) / n, col = mix(C.stepHi, C.stepLo, i / (n - 1));
      let r; if (down === 's') r = [x0, z0 + (z1 - z0) * t, x1, z0 + (z1 - z0) * t1]; else if (down === 'n') r = [x0, z1 - (z1 - z0) * t1, x1, z1 - (z1 - z0) * t];
      else if (down === 'e') r = [x0 + (x1 - x0) * t, z0, x0 + (x1 - x0) * t1, z1]; else r = [x1 - (x1 - x0) * t1, z0, x1 - (x1 - x0) * t, z1];
      c.fillStyle = col; c.fillRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * k, (r[3] - r[1]) * k);
      c.fillStyle = 'rgba(0,0,0,.45)'; const e = Math.max(1, k * .28);   // 단 끝 그림자 (내려가는 쪽 가장자리)
      if (down === 's') c.fillRect(X(r[0]), Z(r[3]) - e, (r[2] - r[0]) * k, e); else if (down === 'n') c.fillRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * k, e);
      else if (down === 'e') c.fillRect(X(r[2]) - e, Z(r[1]), e, (r[3] - r[1]) * k); else c.fillRect(X(r[0]), Z(r[1]), e, (r[3] - r[1]) * k); }
    c.lineWidth = Math.max(1, k * .3); c.strokeStyle = C.line; c.strokeRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k); };
  PIT.stairs.forEach(([side, a, b]) => { const L = PIT.L * 1.5;   // 지도에서는 조금 크게
    if (side === 'n') stairs(a, PIT.z0, b, PIT.z0 + L, 's', 5); else if (side === 's') stairs(a, PIT.z1 - L, b, PIT.z1, 'n', 5);
    else if (side === 'w') stairs(PIT.x0, a, PIT.x0 + L, b, 'e', 5); else stairs(PIT.x1 - L, a, PIT.x1, b, 'w', 5); });
  [177, 451].forEach(x => stairs(x - 3, 278, x + 3, 285.5, 's', 5));   // 강변 둔치로 내려가는 계단
  // 선로: 침목 + 레일 두 줄, 승강장
  c.fillStyle = C.tie; for (let x = 0; x < WX; x += 2.4) RAILS.forEach(z => c.fillRect(X(x), Z(z - 1.6), k * .9, k * 3.2));
  c.fillStyle = C.rail; RAILS.forEach(z => [-0.8, .8].forEach(o => c.fillRect(0, Z(z + o) - k * .25, c.canvas.width, Math.max(1, k * .5))));
  box(PLAT.x0, PLAT.z0, PLAT.x1, PLAT.z1, C.plat, C.line, .6);

  // 길: 역앞길 · 강변도로 · 마을버스 순환 길, 자전거 길
  const cx0 = LOOP.x0 + LOOP.w / 2, cx1 = LOOP.x1 - LOOP.w / 2, czN = LOOP.zN + LOOP.w / 2, czS = LOOP.zS + LOOP.w / 2, nz = (NROAD.z0 + NROAD.z1) / 2, sz = (ROAD.z0 + ROAD.z1) / 2;
  path([[-5, 291], [WX + 5, 291]], 10, C.bike, C.bikeEdge);
  // 길은 테두리를 모두 먼저, 길 색을 나중에 칠해 교차점이 하나로 이어지게 한다 (순환 길이 튀어나와 보이던 것)
  const roads = [[[[cx0, nz], [cx0, sz]], LOOP.w], [[[cx1, nz], [cx1, sz]], LOOP.w], [[[cx0, czN], [cx1, czN]], LOOP.w], [[[cx0, czS], [cx1, czS]], LOOP.w],
    [[[-5, nz], [WX + 5, nz]], NROAD.z1 - NROAD.z0], [[[-5, sz], [WX + 5, sz]], ROAD.z1 - ROAD.z0]];
  c.lineJoin = 'miter'; c.lineCap = 'square';
  for (const pass of [0, 1]) for (const [pts, w] of roads) { c.beginPath(); pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)))); c.lineWidth = pass ? w * k : w * k + OL * 2; c.strokeStyle = pass ? C.road : C.roadEdge; c.stroke(); }
  c.lineCap = 'round';
  // 큰 길 가운데 노란 점선 (UI 강조색)
  c.strokeStyle = C.roadMark; c.lineWidth = Math.max(1, k * .35); c.setLineDash([3 * k, 3 * k]); [nz, sz].forEach(z => { c.beginPath(); c.moveTo(0, Z(z)); c.lineTo(c.canvas.width, Z(z)); c.stroke(); }); c.setLineDash([]);

  // 강: 물결 둑 + 물결 무늬
  { const top = z => 337 + Math.sin(z / 11) * 1.6; c.beginPath(); c.moveTo(0, c.canvas.height); for (let x = 0; x <= WX; x += 2) c.lineTo(X(x), Z(top(x))); c.lineTo(c.canvas.width, c.canvas.height); c.closePath();
    c.fillStyle = C.river; c.fill(); c.lineWidth = OL * 1.3; c.strokeStyle = C.riverEdge; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1.2, k * .5); c.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const x = 12 + (i * 97) % (WX - 24), z = 347 + (i * 7) % 26; if (Math.abs(x - WX / 2) < 40 && Math.abs(z - 358) < 9) continue; c.beginPath(); c.moveTo(X(x), Z(z)); c.quadraticCurveTo(X(x + 3), Z(z - 1.6), X(x + 6), Z(z)); c.quadraticCurveTo(X(x + 9), Z(z + 1.6), X(x + 12), Z(z)); c.stroke(); } }

  // 육교 (파란색)
  BRIDGES.forEach(b => { box(b.x - 2, 54.6, b.x + 2, 105.4, C.bridge, C.line, .5); stairs(b.x - 2, 54.6, b.x + 2, 62, 'n', 5); stairs(b.x - 2, 98, b.x + 2, 105.4, 's', 5); });

  // 건물: 아파트 동 · 학교 본관은 월드 미니맵 도형 중 건물 색만 골라 만화풍 블록(지붕 띠 + 외곽선)으로
  // 건물: 단순한 면 + 얇은 테두리. 아파트 동은 회청색, 학교는 벽돌 갈색
  for (const sh of W.mm.shapes) { if (sh[0] === 'c') continue; if (sh[4] === '#a9b4c0') box(sh[0], sh[1], sh[2], sh[3], C.apt, C.aptEdge, .4, Math.max(1, k * .35)); else if (sh[4] === '#bfcddb') box(sh[0], sh[1], sh[2], sh[3], C.school, C.schoolEdge, .4, Math.max(1, k * .35)); }
  [[BIG.meat, '고깃집'], [BIG.bath, '목욕탕'], [BIG.mart, '마트']].forEach(([b, name]) => {
    const x0 = b.lot ? b.lot[0] : b.x - 12, x1 = b.lot ? b.lot[1] : b.x + 12; box(x0, 230, x1, 249, C.shop, C.badge, .4, Math.max(1, k * .35)); text(name, (x0 + x1) / 2, 239.5, f.name, C.ink, 800); });

  // ── 체험 공간: 호박색 동그란 배지 + 그림 + 이름 ──
  const icon = (kind, x, z, s) => { const px = X(x), pz = Z(z), u = s * k / 10; c.save(); c.translate(px, pz); c.lineWidth = Math.max(1.4, OL * .8); c.strokeStyle = C.line; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, 10 * u, 0, Math.PI * 2); c.fillStyle = C.badge; c.fill(); c.lineWidth = OL; c.stroke(); c.lineWidth = Math.max(1.2, OL * .7);
    const circ = (x, y, r, col) => { c.beginPath(); c.arc(x * u, y * u, r * u, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.stroke(); };
    if (kind === 'snowman') { circ(0, 3, 4.4, '#fff'); circ(0, -3.6, 3, '#fff'); c.fillStyle = '#e8742c'; c.fillRect(0, -3.8 * u, 2.4 * u, 1 * u); }
    else if (kind === 'swing') { c.beginPath(); c.moveTo(-6 * u, 6 * u); c.lineTo(-3.5 * u, -5 * u); c.lineTo(3.5 * u, -5 * u); c.lineTo(6 * u, 6 * u); c.moveTo(0, -5 * u); c.lineTo(0, 2 * u); c.stroke(); c.fillStyle = '#c0553f'; c.fillRect(-2 * u, 2 * u, 4 * u, 1.6 * u); c.strokeRect(-2 * u, 2 * u, 4 * u, 1.6 * u); }
    else if (kind === 'kite') { c.beginPath(); c.moveTo(0, -6 * u); c.lineTo(4.5 * u, -1 * u); c.lineTo(0, 4 * u); c.lineTo(-4.5 * u, -1 * u); c.closePath(); c.fillStyle = '#d9463c'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, 4 * u); c.quadraticCurveTo(3 * u, 6 * u, 1 * u, 8 * u); c.stroke(); }
    else if (kind === 'sled') { c.fillStyle = '#c0553f'; c.fillRect(-5.5 * u, -2.5 * u, 11 * u, 3.5 * u); c.strokeRect(-5.5 * u, -2.5 * u, 11 * u, 3.5 * u); c.beginPath(); c.moveTo(-6 * u, 3.5 * u); c.lineTo(5 * u, 3.5 * u); c.quadraticCurveTo(7.5 * u, 3.5 * u, 7 * u, 1 * u); c.stroke(); }
    else if (kind === 'arcade') { c.fillStyle = '#3d6fb8'; c.fillRect(-4 * u, -6 * u, 8 * u, 12 * u); c.strokeRect(-4 * u, -6 * u, 8 * u, 12 * u); c.fillStyle = '#bfe6ff'; c.fillRect(-2.6 * u, -4.4 * u, 5.2 * u, 3.8 * u); c.strokeRect(-2.6 * u, -4.4 * u, 5.2 * u, 3.8 * u); circ(-1.5, 2.6, .9, '#e8463c'); circ(1.6, 2.6, .9, '#f2d24a'); }
    else if (kind === 'ttakji') { c.save(); c.rotate(.35); c.fillStyle = '#3d6fb8'; c.fillRect(-5 * u, -5 * u, 7 * u, 7 * u); c.strokeRect(-5 * u, -5 * u, 7 * u, 7 * u); c.restore(); c.save(); c.rotate(-.2); c.fillStyle = '#d9463c'; c.fillRect(-1 * u, -1 * u, 7 * u, 7 * u); c.strokeRect(-1 * u, -1 * u, 7 * u, 7 * u); c.restore(); }
    else if (kind === 'gonggi') { [['#e8463c', -3.5, -2], ['#f2d24a', 0, -3.6], ['#4f9e58', 3.5, -2], ['#3d6fb8', -2, 2.6], ['#b06fd0', 2.2, 2.6]].forEach(([col, a, b]) => circ(a, b, 1.9, col)); }
    else if (kind === 'twin') { [-1, 1].forEach(sd => { c.fillStyle = '#d9b98a'; c.fillRect((sd * 2.6 - .8) * u, 2.5 * u, 1.6 * u, 4 * u); c.fillStyle = '#6b3d22'; c.fillRect((sd > 0 ? .3 : -5.3) * u, -6 * u, 5 * u, 9 * u); c.strokeRect((sd > 0 ? .3 : -5.3) * u, -6 * u, 5 * u, 9 * u); }); }   // (2026-11-25) 나눠바 반쪽 둘
    else if (kind === 'food') { c.beginPath(); c.ellipse(0, 1.5 * u, 6 * u, 3.2 * u, -.35, 0, Math.PI * 2); c.fillStyle = '#9a5b34'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(-2 * u, -3 * u); c.quadraticCurveTo(-3.4 * u, -5 * u, -2 * u, -7 * u); c.moveTo(1.5 * u, -3 * u); c.quadraticCurveTo(.1 * u, -5 * u, 1.5 * u, -7 * u); c.stroke(); }
    else if (kind === 'pavilion') { c.beginPath(); c.moveTo(-7 * u, -1 * u); c.lineTo(0, -6 * u); c.lineTo(7 * u, -1 * u); c.closePath(); c.fillStyle = '#b8664f'; c.fill(); c.stroke(); c.fillStyle = '#e9d3a6'; c.fillRect(-5 * u, -1 * u, 10 * u, 6 * u); c.strokeRect(-5 * u, -1 * u, 10 * u, 6 * u); }
    c.restore(); };
  const act = (kind, name, x, z, s = 5.2, col = C.ink) => { s *= 1.3; icon(kind, x, z, s); text(name, x, z + s + f.act * .75, f.act, col); };

  // 공원: 분수 광장
  c.beginPath(); c.arc(X(FOUNTAIN.x), Z(FOUNTAIN.z), 11 * k, 0, Math.PI * 2); c.fillStyle = C.plaza; c.fill(); c.lineWidth = OL; c.strokeStyle = C.plazaEdge; c.stroke();
  c.beginPath(); c.arc(X(FOUNTAIN.x), Z(FOUNTAIN.z), 4.5 * k, 0, Math.PI * 2); c.fillStyle = C.ice; c.fill(); c.strokeStyle = C.iceEdge; c.stroke();
  // 얼음 썰매장
  box(SLED.x0, SLED.z0, SLED.x1, SLED.z1, C.ice, C.iceEdge, 6);
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(1, k * .45); for (let i = 0; i < 9; i++) { const x = SLED.x0 + 12 + i * 20; c.beginPath(); c.moveTo(X(x), Z(SLED.z0 + 5)); c.lineTo(X(x + 8), Z(SLED.z0 + 3)); c.stroke(); }

  act('swing', '놀이터', 87, 176, 6.5);
  act('snowman', '눈사람 만들기', (SNOW.field.x0 + SNOW.field.x1) / 2, 176, 6.5);
  { const side = (kind, name, z) => { const r = 4.2 * 1.3, x = TWIN.x - 16; icon(kind, x, z, r); text(name, x + r + 1.8, z, f.act, C.ink, 800, 'left'); };   // (2026-11-25) 세 놀이를 위아래로, 이름은 오른쪽
    side('ttakji', '딱지치기', TKS[0].z - 7.5); side('twin', '나눠바', TWIN.z - 4.5); side('gonggi', '공기놀이', GONGGI.z - 1.5); }
  act('arcade', '문구점', STN_AT.x, STN_AT.z - 1);
  act('food', '노점', (GOGUMA.x + HOTTEOK.x) / 2, GOGUMA.z - 1);
  act('sled', '얼음 썰매장', (SLED.x0 + SLED.x1) / 2, SLED.zc - 5, 4.6, C.inkDark);
  KITE.stalls.forEach((s, i) => act('kite', '연날리기', i ? s.x + 4 : s.x - 4, 307, 4.8));

  // 큰 이름 (2026-11-25): 아파트 · 공원 · 학교는 한 줄(TZ)에, 동화역 · 강변은 공원 열(x 320)에 맞춘다. 노란 글씨 + 짙은 테두리
  const title = (t, x, z) => { c.font = `400 ${Math.round(f.title * 1.45 * k)}px ${TFONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = Math.max(3, f.title * .3 * k); c.strokeStyle = C.titleEdge; c.strokeText(t, X(x), Z(z)); c.fillStyle = C.title; c.fillText(t, X(x), Z(z)); };
  const TZ = 128, COL = 320;
  title('동화 아파트', 99, TZ); title('동화 공원', COL, TZ); title('학교', (SCHOOL.x0 + SCHOOL.x1) / 2, TZ);
  text('(방학 중이라 못 들어가)', (SCHOOL.x0 + SCHOOL.x1) / 2, TZ + f.title * 1.25, f.act, C.sub, 800);
  title('동화역', COL, 64); title('강변', COL, 291);
  text('은빛천', WX / 2, 358, f.title, C.riverText);
}

function bake(){
  nearImg.width = Math.ceil(WX * NK); nearImg.height = Math.ceil(WZ * NK);
  drawMap(nearImg.getContext('2d'), NK, {title:6.2, name:4.4, act:4.6, sub:3.6});
  bigImg.width = bc.width; bigImg.height = bc.height;
  drawMap(bigImg.getContext('2d'), BK, {title:11, name:7, act:7.6, sub:6.2});
}
export function drawMiniBase(){
  bake();
  // 나눔고딕이 늦게 오면 다시 굽는다
  if (document.fonts && document.fonts.load) document.fonts.load('800 20px "Nanum Gothic"').then(() => { bake(); drawMini(); if (!big.hidden) drawBig(); }).catch(() => {});
}
export const miniEvery = () => 2;
export const bigOpen = () => !big.hidden;
export function toggleBigMap(v){ big.hidden = typeof v === 'boolean' ? !v : !big.hidden; if (!big.hidden) drawBig(); }

const viewAng = () => Math.atan2(-Math.cos(S.cam.yaw), -Math.sin(S.cam.yaw));
function others(c, P, sz){ S.remotes.forEach(Rm => { const [px, pz] = P(Rm.x, Rm.z); c.fillStyle = COLORS[Math.max(0, Rm.ci)].css; c.fillRect(px - sz / 2, pz - sz / 2, sz, sz); c.lineWidth = 2; c.strokeStyle = '#27313c'; c.strokeRect(px - sz / 2, pz - sz / 2, sz, sz); }); }
// 나: 보는 방향을 가리키는 호박색 화살촉
function arrow(c, px, pz, s){ const a = viewAng(); c.save(); c.translate(px, pz); c.rotate(a);
  c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * .7, s * .62); c.lineTo(-s * .35, 0); c.lineTo(-s * .7, -s * .62); c.closePath();
  c.fillStyle = '#e3a53b'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#17191b'; c.stroke(); c.restore(); }

export function drawMini(){
  const me = S.me, x0 = me.x - R, z0 = me.z - R, P = (x, z) => [(x - x0) * NK, (z - z0) * NK];
  g.fillStyle = C.bg; g.fillRect(0, 0, N, N);
  // 구워 둔 그림에서 보이는 만큼만 잘라 온다 (그림 밖은 잘라 내고 그린다: Safari는 밖을 가리키면 아무것도 안 그림)
  const sx = (x0 - WORLD.x0) * NK, sz = (z0 - WORLD.z0) * NK;
  const ax = Math.max(0, sx), az = Math.max(0, sz), bx = Math.min(nearImg.width, sx + N), bz = Math.min(nearImg.height, sz + N);
  if (bx > ax && bz > az) g.drawImage(nearImg, ax, az, bx - ax, bz - az, ax - sx, az - sz, bx - ax, bz - az);
  others(g, P, 14);
  arrow(g, N / 2, N / 2, 17);
  g.fillStyle = 'rgba(23,25,27,.8)'; g.fillRect(6, 6, 26, 26); g.font = '800 17px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e3a53b'; g.fillText('N', 19, 20);   // 북쪽(위)
  if (!big.hidden && ++bigTick % 3 === 0) drawBig();
}
let bigTick = 0;
function drawBig(){
  const P = (x, z) => [(x - WORLD.x0) * BK, (z - WORLD.z0) * BK];
  bg.drawImage(bigImg, 0, 0);
  others(bg, P, 14);
  const [mx, mz] = P(S.me.x, S.me.z); arrow(bg, mx, mz, 18);
}
mini.addEventListener('click', () => toggleBigMap());
document.getElementById('bigmap-close').addEventListener('click', () => toggleBigMap(false));
document.getElementById('scene').addEventListener('pointerdown', () => { if (!big.hidden) toggleBigMap(false); });   // 화면을 누르면 닫힌다
export const mapCanvas = () => bigImg;   // 큰 지도 그림 (내보내기 · 확인용)
