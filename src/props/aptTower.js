// 판상형 아파트 동 (1990년대 계단실형, 16~18층) — '동화' 단지
// 한 동은 덩어리(계단실 하나에 2세대) 1개 또는 2개로 이루어진다.
//   shape 'line': 덩어리를 일렬로 붙인다. 층수와 앞뒤 위치가 모두 같다.
//   shape 'L'   : 'ㄱ'자. 일자 동을 가운데서 직각으로 꺾은 모양. 현관(계단실)은 'ㄱ' 안쪽 마당을, 베란다는 바깥(북·동)을 본다.
//                 위 날개(덩어리 + 세대 한 칸) + 정사각 모서리 세대 + 아래 날개(세대 한 칸 + 덩어리). 두 날개는 안쪽 모서리를 지나는 대각선에 대해 대칭이라
//                 두 현관도 모서리에서 같은 거리(12m)에 마주 보고, 경사로는 각각 바깥 끝으로 나간다.
// 현관(props/aptEntrance.js)은 덩어리마다 하나씩 붙고, 경사로는 동의 바깥쪽 끝으로 나간다. 캐노피에 '103동 1·2호'를 시계방향 순서로 적는다.
// 미터 단위로 만들고 UNIT을 곱한다. 원점은 몸통 중심, 앞(+z)이 남향 베란다, 뒤(-z)가 현관.
// 창·난간·실외기까지 실제 입체(상자)이고, 색은 정점 색으로 넣어 불투명 부품 전체를 한 번에 그린다.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { triCount } from '../core/meshkit.js';
import { buildEntrance, entranceHeight, entranceColliders } from './aptEntrance.js';
import { LOOK } from '../core/look.js';
import { UNIT, FONT_D } from '../config.js';

export const APT_NAME = '동화';
const FH = 2.8, CW_ = 12, DEPTH = 11, BAY = 6;            // 층고, 덩어리 폭(2세대), 깊이, 세대 폭
const HX = CW_ / 2, HZ = DEPTH / 2, CORE_W = 4.6, CORE_D = 2.4;
const C = {wall:0xd6d9d9, rail:0xc6ccd0, base:0xa9b3bc, trim:0xe9ecec, joint:0x8fb4d6, accent:0x4f8fc6, unit:0xaab2ba, snow:0xf6f9fb,
  hedge:0x7f9a80, pipe:0xd9b450, door:0x3f556e, dark:0x596673};
const GLASS = [0x4f7396, 0x5b80a3, 0x446a8e, 0x587b9c, 0x3f6286], CURTAIN = [0xb9b5aa, 0xaab2b8, 0xb8ab94], LIT = 0xd9b56a;

function rng(seed){ let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

// 상자를 모으는 통. XF(회전·이동)를 적용해 넣으므로 돌아간 덩어리도 같은 통에 합쳐진다.
// 아랫면은 어둡게, 땅에 닿는 변은 살짝 어둡게 구워 넣는다(가짜 AO).
const bin = () => ({pos:[], nor:[], col:[]});
const tmpC = new THREE.Color();
let XF = {c:1, s:0, tx:0, tz:0};
const xp = p => [p[0] * XF.c + p[2] * XF.s + XF.tx, p[1], -p[0] * XF.s + p[2] * XF.c + XF.tz];
const xn = n => [n[0] * XF.c + n[2] * XF.s, n[1], -n[0] * XF.s + n[2] * XF.c];
function quad(S, v, n, hex, shade){
  tmpC.setHex(hex); const N = xn(n);
  [0, 1, 2, 0, 2, 3].forEach(k => { const p = xp(v[k]); S.pos.push(p[0], p[1], p[2]); S.nor.push(N[0], N[1], N[2]);
    const a = shade * (n[1] === 0 && v[k][1] < .02 ? .8 : 1); S.col.push(tmpC.r * a, tmpC.g * a, tmpC.b * a); });
}
function box(S, x0, y0, z0, x1, y1, z1, hex){
  quad(S, [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]], [1,0,0], hex, 1);  quad(S, [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]], [-1,0,0], hex, 1);
  quad(S, [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]], [0,1,0], hex, 1);  quad(S, [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]], [0,-1,0], hex, .6);
  quad(S, [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], [0,0,1], hex, 1);  quad(S, [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]], [0,0,-1], hex, 1);
}
// 위로 갈수록 좁아지는 모깎은 지붕 (옥탑 꼭대기)
function cap(S, x0, z0, x1, z1, y0, y1, inset, hex, topHex){
  const a = [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]], b = [[x0+inset,y1,z0+inset],[x1-inset,y1,z0+inset],[x1-inset,y1,z1-inset],[x0+inset,y1,z1-inset]];
  const L = Math.hypot(inset, y1 - y0), k = inset / L, u = (y1 - y0) / L;
  quad(S, [a[1], a[0], b[0], b[1]], [0, k, -u], hex, .96); quad(S, [a[2], a[1], b[1], b[2]], [u, k, 0], hex, 1);
  quad(S, [a[3], a[2], b[2], b[3]], [0, k, u], hex, 1);    quad(S, [a[0], a[3], b[3], b[0]], [-u, k, 0], hex, .96);
  quad(S, [b[3], b[2], b[1], b[0]], [0, 1, 0], topHex, 1);
}
function toGeo(S){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(S.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(S.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(S.col, 3)); return g;
}
const stdMat = map => new THREE.MeshStandardMaterial({map, roughness:.94, metalness:0, envMapIntensity:LOOK.envIntensity});

// 측벽 그림: 층 줄눈, 맨 위에 단지 표식·이름과 큰 동 번호, 파란 색띠, 세로 영문, 아래 회색 띠의 동 번호
function sideTex(h, floors, num){
  const P = 20, W = Math.round(DEPTH * P), H = Math.round(h * P);
  return canvasTex(W, H, g => {
    g.fillStyle = '#d6d9d9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#a9b3bc'; g.fillRect(0, H - 2 * FH * P, W, 2 * FH * P);
    g.fillStyle = 'rgba(120,135,150,.22)'; for (let f = 1; f <= floors; f++) g.fillRect(0, H - f * FH * P, W, 1.5);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const cx = W / 2, top = 1.3 * P;
    g.strokeStyle = '#3f6fa8'; g.lineWidth = 3; g.lineCap = 'round';                       // 눈 결정 표식
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, r = .8 * P, x = cx - 2.1 * P, y = top;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    g.fillStyle = '#34465c'; g.font = Math.round(1.6 * P) + 'px ' + FONT_D; g.fillText(APT_NAME, cx + .8 * P, top + 1);
    g.font = Math.round(2.8 * P) + 'px ' + FONT_D; g.fillText(num, cx, top + 2.9 * P);
    const bx = cx - .2 * P, bw = 2.6 * P; let y = top + 6.6 * P;                             // 색띠
    [['#7fb2d6', 2.6], ['#4f8fc6', 2.2], ['#93a6b6', 1.5], ['#6ea6d0', 1.9]].forEach(([c, hh]) => { g.fillStyle = c; g.fillRect(bx, y, bw, hh * P); y += (hh + .45) * P; });
    g.save(); g.translate(cx + 1.1 * P, H * .6); g.rotate(Math.PI / 2); g.fillStyle = '#eef1f3'; g.font = Math.round(1.5 * P) + 'px ' + FONT_D; g.fillText('DONGHWA', 0, 0); g.restore();
    g.fillStyle = '#4c5a69'; g.font = Math.round(2.4 * P) + 'px ' + FONT_D; g.fillText(num, cx, H - 1.25 * FH * P);
  });
}
// 현관 위 표지: '103동 1·2호'
function signTex(num, units){
  return canvasTex(256, 72, (g, W, H) => {
    g.fillStyle = '#34465c'; g.fillRect(0, 0, W, H); g.fillStyle = '#4f8fc6'; g.fillRect(0, H - 8, W, 8);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '34px ' + FONT_D;
    g.fillText(num + '동  ' + units + '호', W / 2, H / 2 - 3);
  });
}

// 베란다 한 줄: 로컬 좌표 x a~b, 벽면 z1에서 +z로 튀어나온다. 층마다 슬래브·난간벽·유리창·실외기, 맨 위 처마, 세대 사이 기둥.
// o.endA / o.endB: 그 끝에 파란 줄눈 기둥을 세울지.
function balconyRun(S, G, F, R, a, b, z1, o = {}){
  const H = F * FH, pick = arr => arr[Math.floor(R() * arr.length)], glass = () => { const k = R(); return k < .04 ? LIT : k < .3 ? pick(CURTAIN) : pick(GLASS); };
  const nb = Math.max(1, Math.round((b - a) / BAY)), bw = (b - a) / nb;
  for (let f = 0; f < F; f++) {
    const y = f * FH;
    box(S, a, y + (f ? -.3 : 0), z1, b, y + .14, z1 + .55, C.trim);
    box(S, a, y + .14, z1 + .4, b, y + 1.0, z1 + .55, f < 2 ? C.base : C.rail);
    box(S, a, y + 1.0, z1 + .38, b, y + 1.06, z1 + .6, C.trim);
    for (let k = 0; k < nb; k++) {
      const bx = a + k * bw, pane = (bw - .5) / 4;
      for (let p = 0; p < 4; p++) { const px = bx + .25 + p * pane; box(G, px + .04, y + 1.06, z1 + .43, px + pane - .04, y + 2.5, z1 + .47, glass()); }
      for (let p = 1; p < 4; p++) { const px = bx + .25 + p * pane; box(S, px - .04, y + 1.06, z1 + .41, px + .04, y + 2.5, z1 + .5, C.trim); }
      if (f > 0 && R() < .34) { const ux = bx + .7 + R() * (bw - 2.2);
        box(S, ux, y + .2, z1 + .55, ux + .82, y + .8, z1 + .9, C.unit); box(S, ux + .1, y + .28, z1 + .9, ux + .72, y + .72, z1 + .91, C.dark); box(S, ux - .03, y + .8, z1 + .53, ux + .85, y + .86, z1 + .93, C.snow); }
    }
  }
  box(S, a, H - .3, z1, b, H + .9, z1 + .55, C.trim);
  if (o.endA) box(S, a, 0, z1, a + .22, H + .9, z1 + .62, C.joint);
  if (o.endB) box(S, b - .22, 0, z1, b, H + .9, z1 + .62, C.joint);
  for (let k = 1; k < nb; k++) { const x = a + k * bw; box(S, x - .22, 0, z1, x + .22, H + .9, z1 + .62, C.trim); }
}

// 덩어리 하나를 로컬 좌표(앞 +z, 계단실 중심 x=0)로 그린다. 기본 폭은 x -6~6이고, o.x0·o.x1로 한쪽에 세대를 더 붙일 수 있다.
// o.neg/o.pos: 그 쪽 측벽이 밖으로 드러나는지. 드러나지 않은 쪽은 다른 몸통과 맞닿으므로 화단·눈을 끝까지 채운다.
function chunk(S, G, F, R, o){
  const x0 = o.x0 ?? -HX, x1 = o.x1 ?? HX, z0 = -HZ, z1 = HZ, H = F * FH, hx0 = o.neg ? x0 + .5 : x0, hx1 = o.pos ? x1 - .5 : x1;
  const pick = a => a[Math.floor(R() * a.length)], glass = () => { const k = R(); return k < .04 ? LIT : k < .3 ? pick(CURTAIN) : pick(GLASS); };
  box(S, x0, 0, z0, x1, 2 * FH, z1, C.base); box(S, x0, 2 * FH, z0, x1, H, z1, C.wall);
  // 앞: 유리로 막은 베란다와 화단
  balconyRun(S, G, F, R, x0, x1, z1, {endA:true, endB:true});
  box(S, hx0, 0, z1 + 1.3, hx1, .7, z1 + 2.4, C.hedge); box(S, hx0 - (o.neg ? .1 : 0), .7, z1 + 1.2, hx1 + (o.pos ? .1 : 0), .92, z1 + 2.5, C.snow);

  // 뒤: 창 두 개씩, 가스 배관, 계단실 탑
  const TOP = H + 3.6;
  for (let f = 0; f < F; f++) for (let b = 0; b < Math.round((x1 - x0) / BAY); b++) [.9, 4.1].forEach((dx, k) => {
    const wx = x0 + b * BAY + dx + (k ? -.35 : 0), ww = k ? 1.35 : 1.0; if (wx + ww > -CORE_W / 2 - .15 && wx < CORE_W / 2 + .15) return;
    const y = f * FH + 1.05; box(G, wx, y, z0 - .05, wx + ww, y + 1.2, z0, glass());
    box(S, wx - .08, y - .1, z0 - .14, wx + ww + .08, y, z0, C.trim); box(S, wx + ww / 2 - .03, y, z0 - .08, wx + ww / 2 + .03, y + 1.2, z0, C.trim); });
  [x0 + .45, x1 - .45].forEach(px => box(S, px - .04, .6, z0 - .1, px + .04, H - .6, z0 - .02, C.pipe));
  box(S, -CORE_W / 2, 0, z0 - CORE_D, CORE_W / 2, 2 * FH, z0, C.base); box(S, -CORE_W / 2, 2 * FH, z0 - CORE_D, CORE_W / 2, TOP, z0, C.wall);
  for (let f = 2; f <= F; f++) { const y = f * FH - .55; box(G, -.8, y, z0 - CORE_D - .05, .8, y + 1.0, z0 - CORE_D, pick(GLASS)); box(S, -.9, y - .1, z0 - CORE_D - .12, .9, y, z0 - CORE_D, C.trim); }
  [-1, 1].forEach(s => box(S, s * (CORE_W / 2 - .28) - .1, 2 * FH, z0 - CORE_D - .06, s * (CORE_W / 2 - .28) + .1, TOP, z0 - CORE_D, C.joint));
  // 옥상: 드러난 쪽에만 난간, 눈, 기계실과 모깎은 옥탑
  box(S, x0, H, z0, x1, H + .9, z0 + .25, C.trim);
  if (o.neg) box(S, x0, H, z0 + .25, x0 + .25, H + .9, z1, C.trim);
  if (o.pos) box(S, x1 - .25, H, z0 + .25, x1, H + .9, z1, C.trim);
  box(S, x0 + (o.neg ? .25 : 0), H, z0 + .25, x1 - (o.pos ? .25 : 0), H + .32, z1, C.snow);
  box(S, -CORE_W / 2 - .5, H, z0, CORE_W / 2 + .5, TOP, z0 + 3.6, C.wall);
  box(G, -1.1, H + 1.5, z0 + 3.6, 1.1, H + 2.5, z0 + 3.65, pick(GLASS));
  box(S, -CORE_W / 2 - .7, TOP, z0 - CORE_D - .2, CORE_W / 2 + .7, TOP + .3, z0 + 3.8, C.trim);
  cap(S, -CORE_W / 2 - .7, z0 - CORE_D - .2, CORE_W / 2 + .7, z0 + 3.8, TOP + .3, TOP + 1.9, 1.5, C.joint, C.snow);
  box(S, -.04, TOP + 1.9, z0 + .6, .04, TOP + 4.2, z0 + .68, C.dark);
  // 드러난 측벽의 세로 창 줄
  [[x0, -1, o.neg], [x1, 1, o.pos]].forEach(([sx, s, open]) => { if (!open) return;
    for (let f = 0; f < F; f++) { const y = f * FH + 1.05; box(G, Math.min(sx, sx + s * .05), y, z1 - 1.9, Math.max(sx, sx + s * .05), y + 1.25, z1 - .8, glass());
      box(S, Math.min(sx, sx + s * .12), y - .1, z1 - 1.98, Math.max(sx, sx + s * .12), y, z1 - .72, C.trim); } });
}
// 'ㄱ'자 모서리 세대: 정사각 몸통(DEPTH×DEPTH). 중심 (cx, cz), 바깥면은 북(-z)·동(+x).
// 베란다를 북쪽과 동쪽에 둘러 붙이고, 바깥 모서리에서 두 줄이 겹치지 않게 북쪽 줄이 모서리 칸을 맡는다.
// 안쪽 두 면(서·남)은 날개 몸통과 딱 맞닿으므로 그리지 않는다.
function corner(S, G, F, R, cx, cz, base){
  const H = F * FH, h = DEPTH / 2, x0 = cx - h, x1 = cx + h, z0 = cz - h, z1 = cz + h;
  const put = (rot, fn) => { XF = {c:Math.cos(rot), s:Math.sin(rot), tx:cx + base.tx, tz:cz + base.tz}; fn(); XF = {c:1, s:0, tx:base.tx, tz:base.tz}; };
  box(S, x0, 0, z0, x1, 2 * FH, z1, C.base); box(S, x0, 2 * FH, z0, x1, H, z1, C.wall);
  put(Math.PI, () => balconyRun(S, G, F, R, -h - .55, h, h, {endA:true, endB:true}));        // 북쪽 줄: 바깥 모서리 칸까지
  put(Math.PI / 2, () => balconyRun(S, G, F, R, -h, h, h, {endA:true, endB:true}));         // 동쪽 줄
  // 화단: 날개 화단과 같은 줄에 ㄱ자로 이어 붙인다 (북쪽 줄이 모서리를 맡는다)
  box(S, x0, 0, z0 - 2.4, x1 + 2.4, .7, z0 - 1.3, C.hedge); box(S, x0, .7, z0 - 2.5, x1 + 2.5, .92, z0 - 1.2, C.snow);
  box(S, x1 + 1.3, 0, z0 - 1.3, x1 + 2.4, .7, z1, C.hedge); box(S, x1 + 1.2, .7, z0 - 1.2, x1 + 2.5, .92, z1, C.snow);
  box(S, x0, H, z0, x1, H + .32, z1, C.snow);
}

const UNITS = ['1·2', '3·4', '5·6', '7·8'];
export function buildAptTower(o = {}){
  const F = o.floors || 17, num = ((o.label || '101동').match(/\d+/) || ['101'])[0], shape = o.shape || 'line', n = shape === 'L' ? 2 : Math.max(1, Math.min(4, o.chunks || 2));
  const R = rng(7 + (parseInt(num, 10) || 1) * 31), S = bin(), G = bin(), H = F * FH;
  // 덩어리 배치: 시계방향 순서. rot은 y축 회전, (cx, cz)는 몸통 중심
  let parts;
  const CC = HX + BAY + DEPTH / 2;   // 모서리 세대 중심 x (위 날개 중심에서)
  if (shape === 'L') parts = [{rot:Math.PI, cx:0, cz:0, x0:-HX - BAY, x1:HX, neg:false, pos:true, side:-1}, {rot:Math.PI / 2, cx:CC, cz:HZ + BAY + HX, x0:-HX, x1:HX + BAY, neg:true, pos:false, side:1}];
  else parts = Array.from({length:n}, (_, i) => ({rot:0, cx:(i - (n - 1) / 2) * CW_, cz:0, neg:i === 0, pos:i === n - 1, side:i < n / 2 ? 1 : -1}));
  // 'ㄱ'은 몸통 전체(x -6~23, z -5.5~23.5)의 가운데를 원점으로 옮긴다. 가로세로가 같아서 대각선 대칭이다.
  const ox = shape === 'L' ? -(CC + DEPTH / 2 - HX) / 2 : 0, oz = shape === 'L' ? -(HZ + BAY + CW_ - HZ) / 2 : 0;

  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(UNIT); g.add(inner);
  const colliders = [], footprints = [], circles = [], entrances = [], addRect = (a, b, c, d) => [Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)].map(v => v * UNIT);
  parts.forEach((p, i) => {
    XF = {c:Math.cos(p.rot), s:Math.sin(p.rot), tx:p.cx + ox, tz:p.cz + oz};
    chunk(S, G, F, R, p);
    // 측벽 그림과 현관 표지는 덩어리 그룹에 따로 붙인다
    const cg = new THREE.Group(); cg.rotation.y = p.rot; cg.position.set(XF.tx, 0, XF.tz); inner.add(cg);
    [[p.x0 ?? -HX, -1, p.neg], [p.x1 ?? HX, 1, p.pos]].forEach(([sx, s, open]) => { if (!open) return;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH - .02, H - .02), stdMat(sideTex(H, F, num))); m.rotation.y = s * Math.PI / 2; m.position.set(sx + s * .03, H / 2, 0); cg.add(m); });
    const P = q => xp([q[0], 0, q[1]]);
    const a = P([p.x0 ?? -HX, -HZ]), b = P([p.x1 ?? HX, HZ + 2.5]); colliders.push(addRect(a[0], a[2], b[0], b[2]));
    const ca = P([-CORE_W / 2, -HZ - CORE_D]), cb = P([CORE_W / 2, -HZ]); colliders.push(addRect(ca[0], ca[2], cb[0], cb[2]));
    // 현관: 덩어리 뒤(계단실 벽)에 180도 돌려 붙인다. E좌표 → 동 좌표 변환을 기억해 두고 충돌·높이에 쓴다.
    const ent = buildEntrance({side:p.side, num, units:UNITS[i]}); ent.rotation.y = Math.PI; ent.position.set(0, 0, -HZ - CORE_D); cg.add(ent);
    const eo = P([0, -HZ - CORE_D]), er = p.rot + Math.PI, ec = Math.cos(er), es = Math.sin(er), E = (x, z) => [x * ec + z * es + eo[0], -x * es + z * ec + eo[2]];
    const col = entranceColliders(p.side);
    col.rects.forEach(r => { const q0 = E(r[0], r[1]), q1 = E(r[2], r[3]); colliders.push(addRect(q0[0], q0[1], q1[0], q1[1])); });
    col.circles.forEach(c => { const q = E(c[0], c[1]); circles.push([q[0] * UNIT, q[1] * UNIT, c[2] * UNIT]); });
    entrances.push({ox:eo[0], oz:eo[2], c:ec, s:es, side:p.side});
    const fa = P([p.x0 ?? -HX, -HZ]), fb = P([p.x1 ?? HX, HZ]); footprints.push(addRect(fa[0], fa[2], fb[0], fb[2]));
  });
  if (shape === 'L') { XF = {c:1, s:0, tx:ox, tz:oz}; corner(S, G, F, R, CC, 0, XF);
    const h = DEPTH / 2; colliders.push(addRect(CC - h + ox, -h - 2.5 + oz, CC + h + 2.5 + ox, h + oz)); footprints.push(addRect(CC - h + ox, -h + oz, CC + h + ox, h + oz)); }
  XF = {c:1, s:0, tx:0, tz:0};

  const wallMat = new THREE.MeshStandardMaterial({name:'apt-wall', vertexColors:true, roughness:.94, metalness:0, envMapIntensity:LOOK.envIntensity});
  const glassMat = new THREE.MeshStandardMaterial({name:'apt-glass', vertexColors:true, roughness:.18, metalness:0, envMapIntensity:.55});
  inner.add(new THREE.Mesh(toGeo(S), wallMat), new THREE.Mesh(toGeo(G), glassMat));
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  let draws = 0; g.traverse(m => { if (m.isMesh) draws++; });
  g.userData.colliders = colliders; g.userData.footprints = footprints; g.userData.circles = circles;
  // 동 좌표(게임 단위) → 현관 계단·경사로 높이. 현관 밖이면 null.
  g.userData.heightAt = (lx, lz) => { for (const e of entrances) { const dx = lx / UNIT - e.ox, dz = lz / UNIT - e.oz, h = entranceHeight(dx * e.c - dz * e.s, dx * e.s + dz * e.c, e.side); if (h !== null) return h * UNIT; } return null; };
  g.userData.info = {tris:triCount(g), draws, materials:draws, floors:F};
  return g;
}

defineProp('aptTower', {
  label:'아파트 동 (17층, 2덩어리)', category:'건물', isNewStyle:true, blocksCamera:true,
  usage:"tower(72, 108, 0, {label: '102동', floors: 17, chunks: 2});",
  build:o => buildAptTower({label:'101동', floors:17, chunks:2, ...o}),
});
defineProp('aptTowerL', {
  label:"아파트 동 ('ㄱ'자, 17층)", category:'건물', isNewStyle:true, blocksCamera:true,
  usage:"tower(33, 160, 0, {label: '103동', floors: 16, shape: 'L'});",
  build:o => buildAptTower({label:'103동', floors:17, shape:'L', ...o}),
});
