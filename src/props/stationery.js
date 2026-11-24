// 공원 옆 문구점 (사용자 참고 사진: 붉은 벽돌 2층 건물 1층의 문구 · 슈퍼, 초록 줄무늬 차양, 앞에 뽑기 기계 · 작은 오락기 · 아이스크림 냉장고).
//   건물 몸체와 앞에 놓는 물건을 따로 만들고 STATIONERY_LAYOUT으로 맞춰 놓는다. 따로 쓸 수 있는 것: 차양, 뽑기 기계 줄, 작은 오락기,
//   아이스크림 냉장고, 음료 냉장고, 낮은 나무 걸상, 훌라후프 걸이.
//   가게 안에는 들어가지 않는다: 앞이 열린 진열장처럼 안이 보이고, 입구에는 보이지 않는 벽이 있다. 놀이는 가게 앞마당에서 한다.
//   상호 · 전화번호 · 오락기 게임 이름은 지어낸 것. 미터 단위, 원점은 바닥 가운데, 정면(가게 앞) +z.
import * as THREE from '../lib/three.js';
import { defineProp, buildProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, tube, lathe, fillet, ridge, blob, xf, groundAO, bakeAO, triCount, Parts } from '../core/meshkit.js';
import { matteMaterial, snowMaterial, decalMaterial, metalMaterial, concreteMaterial, plasticMaterial, glassMaterial, clearMaterial, brickWallMaterial, paintMaterial, woodMaterial } from '../core/texkit.js';
import { assemble, quad, quadZ, mulberry } from './kit.js';
import { UNIT, FONT_D, FONT_B } from '../config.js';
import { drawRpsFace, RPS_W, RPS_H } from './rpsArt.js';
import { drawStationeryWide, drawStationeryTall } from './signArt/otherSigns.js';
import { textSignMat } from './shops.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), U = UNIT;
const once = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();
const steel = () => paintMaterial(0xffffff, {seed:25, gloss:.5, metal:.3});
const glow = () => once('glow', () => new THREE.MeshBasicMaterial({vertexColors:true}));
const GOODS = [0xd83a2e, 0xf2b632, 0x2f6fb5, 0x3f8a5a, 0xe8742a, 0xb0558a, 0xf4f1e6, 0x7fc6e8, 0xf28fb0, 0x8bc34a, 0xffd23f, 0x6b4fa0];
// 진열 상품: 선반 하나(x0~x1, 높이 y, 깊이 z0~z1)에 크기가 제각각인 상자를 늘어놓는다
function goods(P, R, x0, x1, y, z0, z1, hmax = .26){
  for (let x = x0 + .02; x < x1 - .06;) { const w = .06 + R() * .16, h = .07 + R() * (hmax - .07), d = Math.min(z1 - z0 - .02, .1 + R() * .2), c = GOODS[Math.floor(R() * GOODS.length)];
    if (x + w > x1) break; P.add('pla', box(x, y, z1 - d - .01, x + w, y + h, z1 - .01), c); x += w + .005 + (R() < .1 ? .08 : 0); }
}

// ───────── 간판 그림: 가운데 흰 바탕에 큰 상호, 양옆 연노랑 칸에 파는 것 ─────────
const signMat = () => once('stSign', () => decalMaterial(canvasTex(2048, 272, g => {
  g.fillStyle = '#f7f6ee'; g.fillRect(0, 0, 2048, 272); g.fillStyle = '#e9e27a'; g.fillRect(0, 0, 470, 272); g.fillRect(1578, 0, 470, 272);
  g.strokeStyle = '#b9b48a'; g.lineWidth = 6; g.strokeRect(3, 3, 2042, 266); [470, 1578].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 272); g.stroke(); });
  g.fillStyle = '#2a2f36'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = '50px ' + FONT_B; ['문구 · 완구', '팬 시', '액세서리'].forEach((t, i) => g.fillText(t, 235, 62 + i * 76));
  g.font = '56px ' + FONT_B; g.fillText('복 사', 1690, 92); g.fillText('코 팅', 1690, 188);
  g.fillText('사 진', 1910, 92); g.fillText('인 화', 1910, 188);
  g.fillStyle = '#1f2a44'; g.font = '190px ' + FONT_D; g.fillText('별빛', 760, 118); g.font = '118px ' + FONT_D; g.fillText('문구', 1310, 82); g.fillText('슈퍼', 1310, 196);
  g.fillStyle = '#d83a2e'; g.beginPath(); g.arc(1110, 82, 24, 0, 7); g.fill(); g.fillStyle = '#c0392b'; g.fillRect(1100, 70, 20, 4);
  g.fillStyle = '#1f2a44'; g.font = '46px ' + FONT_B; g.textAlign = 'left'; g.fillText('T. 123-4567', 600, 232);
}), {rough:.55}));

// ───────── 건물 몸체: 붉은 벽돌 2층, 1층 앞이 통째로 열린 가게 (폭 11m, 깊이 7m, 높이 7.2m) ─────────
export const STN = {W:11, D:7, H1:3.4, H:6.6, top:7.2, open:4.7};
// 가게 안 그림 판 (진열대 · 상품 · 매단 장난감, 홍보물). 그림 한 장 = 그리기 한 번
const IMG = new Map();
function shopImg(kind){ if (IMG.has(kind)) return IMG.get(kind);
  const C = ['#d83a2e', '#f2b632', '#2f6fb5', '#3f8a5a', '#e8742a', '#b0558a', '#7fc6e8', '#f4f1e6', '#8e6bbf'], r = mulberry(kind.length * 17 + 3), pick = () => C[Math.floor(r() * C.length)];
  const [Wc, Hc] = kind === 'back' ? [1024, 512] : kind === 'side' ? [1024, 384] : kind === 'hang' ? [1024, 128] : kind === 'open' ? [256, 80] : kind === 'poster' ? [512, 352] : [160, 560];   // (2026-11-23) 포스터는 판 비율대로: 옆벽 1.6m × 1.1m, 앞 창 띠 0.4m × 1.4m
  const t = canvasTex(Wc, Hc, g => {
    if (kind === 'back' || kind === 'side') { g.fillStyle = '#ece8dc'; g.fillRect(0, 0, Wc, Hc); const rows = kind === 'back' ? 5 : 4, rh = Hc / rows;
      for (let i = 0; i < rows; i++) { const y = i * rh; g.fillStyle = '#b7bcc0'; g.fillRect(0, y + rh - 8, Wc, 8);
        for (let x = 4; x < Wc - 10;) { const w = 14 + r() * 34, h = rh * (.35 + r() * .5); g.fillStyle = pick(); g.fillRect(x, y + rh - 8 - h, w, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 2, y + rh - 8 - h + 3, w - 4, 4); x += w + 2; } }
      g.fillStyle = '#9aa0a5'; for (let x = 0; x < Wc; x += Wc / 4) g.fillRect(x, 0, 6, Hc); }
    else if (kind === 'hang') { g.clearRect(0, 0, Wc, Hc); for (let x = 10; x < Wc - 20; x += 22 + r() * 20) { const w = 16 + r() * 22, h = 30 + r() * 60; g.fillStyle = '#6f777e'; g.fillRect(x + w / 2 - 1, 0, 2, 14); g.fillStyle = pick(); g.fillRect(x, 14, w, h); } }
    else if (kind === 'open') { g.fillStyle = '#d83a2e'; g.fillRect(0, 0, Wc, Hc); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '44px ' + FONT_D; g.fillText('영업 중', Wc / 2, Hc / 2 + 2); }
    else if (kind === 'poster') drawStationeryWide(g);
    else drawStationeryTall(g, kind === 'poster3' ? 1 : 0); });
  const m = kind === 'hang' ? decalMaterial(t, {alpha:true, rough:.8}) : new THREE.MeshLambertMaterial({map:t}); if (kind === 'hang') m.side = THREE.DoubleSide; IMG.set(kind, m); return m; }

defineProp('stationeryShop', {label:'문구점 건물 (별빛문구)', category:'문구점', isNewStyle:true, blocksCamera:true, minimap:'#c58b6e', mmSize:6,
  colliders:[{r:[-5.5 * U, -3.5 * U, 5.5 * U, 3.95 * U]}],
  usage:"STATIONERY_LAYOUT으로 차양 · 뽑기 기계 · 오락기 등과 함께 놓는다. 가게 안은 들어갈 수 없다", build(){
    const {W, D, H1, H, top, open} = STN, hw = W / 2, hd = D / 2, P = new Parts(), R = mulberry(41);
    const brick = (...a) => P.add('brk', box(...a), 0xffffff), con = (g, c = 0xd9d7d0) => P.add('con', g, c);
    // 벽: 뒤 · 양옆 통벽, 앞 2층 벽(오른쪽 창 자리를 비운다), 1층 양옆 기둥
    brick(-hw, 0, -hd, hw, top, -hd + .24); brick(-hw, 0, -hd, -hw + .24, top, hd); brick(hw - .24, 0, -hd, hw, top, hd);
    brick(-hw, H1, hd - .24, 2.6, top, hd); brick(4.6, H1, hd - .24, hw, top, hd); brick(2.6, H1, hd - .24, 4.6, 4.6, hd); brick(2.6, 5.9, hd - .24, 4.6, top, hd);
    brick(-hw, 0, hd - .24, -open, H1, hd); brick(open, 0, hd - .24, hw, H1, hd);
    con(box(-hw - .02, -.02, -hd - .02, hw + .02, .35, hd + .02), 0xb8b4ab);                                     // 밑동
    con(box(-hw - .06, top, -hd - .06, hw + .06, top + .1, hd + .06), 0xdcd9d1);                                  // 옥상 갓돌
    con(box(-hw + .24, H, -hd + .24, hw - .24, H + .12, hd - .24), 0xc9c6bf);                                     // 옥상 바닥
    con(box(-open, H1 - .45, hd - .3, open, H1, hd + .02), 0xc9ccce);                                             // 1층 위 보 (셔터 상자)
    // 1층 가게 안: 바닥, 천장, 흰 벽, 형광등
    con(box(-open, 0, -hd + .24, open, .14, hd - .02), 0x8a8780); con(box(-open, H1 - .5, -hd + .24, open, H1 - .45, hd - .3), 0xf1f1ec);
    con(box(-open, .14, -hd + .24, open, H1 - .5, -hd + .3), 0xeceae2); [-1, 1].forEach(s => con(box(s * open - (s > 0 ? .06 : 0), .14, -hd + .3, s * open + (s < 0 ? .06 : 0), H1 - .5, hd - .24), 0xe7e4dc));
    [-2.6, 0, 2.6].forEach(x => P.add('glow', box(x - .6, H1 - .56, .2 - 1.6, x + .6, H1 - .5, .3 - 1.6), 0xf4f8ff)); [-2.6, 0, 2.6].forEach(x => P.add('glow', box(x - .6, H1 - .56, 1.3, x + .6, H1 - .5, 1.4), 0xf4f8ff));
    // 가게 안 (2026-11-17): 진열대 · 상품 · 매단 장난감을 입체 대신 그림 판으로 (뒤 벽 · 양옆 벽 · 천장 아래 매단 줄) — 안은 보이고 그리기 부담은 작다
    const inner = [];
    inner.push(new THREE.Mesh(quadZ(-open + .08, .14, open - .08, H1 - .5, -hd + .31, [0, 0, 1, 1]), shopImg('back')));
    [-1, 1].forEach(s => { const g = new THREE.PlaneGeometry(D - .6, H1 - .64); g.rotateY(-s * Math.PI / 2); g.translate(s * (open - .07), (H1 - .5 + .14) / 2, 0); inner.push(new THREE.Mesh(g, shopImg('side'))); });
    { const g = new THREE.PlaneGeometry(open * 2 - .3, .7); g.translate(0, H1 - .9, -.4); inner.push(new THREE.Mesh(g, shopImg('hang'))); }
    // 계산대 하나만 입체 (앞에서 보이는 자리)
    P.add('pla', box(-open + .2, .14, -.6, -open + 1.4, 1.0, .4, .03), 0xe9e2cf); P.add('met', box(-open + .4, 1.0, -.3, -open + .9, 1.25, 0, .02), 0x2b2e31);
    // 유리 미닫이 (가운데 두 짝은 열어 둠): 알루미늄 틀 + 투명 유리. 가게 안에는 들어가지 않는다
    const gz = hd - .36, nP = 4, pw = open * 2 / nP;
    for (let k = 0; k < nP; k++) { const x0 = -open + k * pw, open_ = k === 1 || k === 2, dz = k % 2 ? -.06 : 0, shift = open_ ? (k === 1 ? -pw * .8 : pw * .8) : 0;
      const a = x0 + shift, b = x0 + pw + shift; if (open_) continue;
      P.add('clr', box(a + .05, .2, gz + dz - .01, b - .05, H1 - .55, gz + dz + .01));
      [[a, a + .05], [b - .05, b]].forEach(([u, v]) => P.add('met', box(u, .14, gz + dz - .03, v, H1 - .5, gz + dz + .03), 0xb9c0c5));
      [[.14, .2], [H1 - .58, H1 - .5]].forEach(([u, v]) => P.add('met', box(a, u, gz + dz - .03, b, v, gz + dz + .03), 0xb9c0c5)); }
    P.add('met', box(-open, .14, gz - .1, open, .17, gz + .04), 0x9aa0a5);                                          // 문 레일
    // 입구 양옆 걸이판: 과자 · 장난감 봉지가 빽빽이 걸려 있다 (참고 사진의 앞모습)
    [-1, 1].forEach(s => { const xa = s * (open - 1.5), xb = s * (open - .05), x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
      P.add('met', box(x0, .5, hd - .5, x1, H1 - .55, hd - .46), 0xcfd3d6);
      for (let y = .6; y < H1 - .8; y += .3) for (let x = x0 + .06; x < x1 - .12;) { const w = .1 + R() * .14, h = .16 + R() * .1; P.add('pla', box(x, y, hd - .46, x + w, y + h, hd - .42 + R() * .03), GOODS[Math.floor(R() * GOODS.length)]); x += w + .02; } });
    P.add('met', box(-open, H1 - .62, hd - .28, open, H1 - .58, hd - .24), 0x8e959b);                             // 맨 앞 걸이 막대
    for (let x = -open + .2; x < open - .2; x += .22 + R() * .2) { if (Math.abs(x) < 1.2) continue; const h = .2 + R() * .3; P.add('pla', box(x, H1 - .62 - h, hd - .3, x + .14, H1 - .62, hd - .25), GOODS[Math.floor(R() * GOODS.length)]); }
    // 앞 턱
    con(box(-open - .1, 0, hd - .02, open + .1, .15, hd + .4, .02), 0xbdbab3);
    // 2층 창 (알루미늄 틀, 가운데 문살, 방범창)
    const wx0 = 2.65, wx1 = 4.55, wy0 = 4.65, wy1 = 5.85, wz = hd - .12;
    P.add('gls', box(wx0, wy0, wz - .02, wx1, wy1, wz), 0x2c3a46);
    [[wx0, wx0 + .06], [wx1 - .06, wx1], [(wx0 + wx1) / 2 - .03, (wx0 + wx1) / 2 + .03]].forEach(([a, b]) => P.add('met', box(a, wy0, wz - .01, b, wy1, wz + .03), 0xc5cbcf));
    [[wy0, wy0 + .06], [wy1 - .06, wy1]].forEach(([a, b]) => P.add('met', box(wx0, a, wz - .01, wx1, b, wz + .03), 0xc5cbcf));
    for (let x = wx0 + .15; x < wx1; x += .2) P.add('met', box(x - .01, wy0, hd + .02, x + .01, wy1, hd + .04), 0xeef0f2);
    con(box(wx0 - .08, wy0 - .1, hd - .02, wx1 + .08, wy0, hd + .1), 0xd8d6cf);                                  // 창턱
    // 왼쪽 2층 작은 창, 옆벽 창
    P.add('gls', box(-4.6, 4.9, hd - .12, -3.6, 5.7, hd - .1), 0x33424e); con(box(-4.68, 4.8, hd - .02, -3.52, 4.9, hd + .08), 0xd8d6cf);
    [-1, 1].forEach(s => P.add('gls', box(s * hw - (s > 0 ? -.005 : .02), 4.7, -1.2, s * hw + (s > 0 ? .02 : -.005), 5.8, .2), 0x33424e));
    // 가스관, 실외기 (2026-11-23 계량기 함은 앞 창 '뽑기' 포스터를 가려 지웠다)
    P.add('met', tube([V(-hw - .05, .4, 2), V(-hw - .05, 6.3, 2)], .03, {radial:6}), 0xd9b23a);
    P.add('met', box(-hw - .55, 4.2, -1.5, -hw - .02, 4.85, -.7, .02), 0xe6e8ea); P.add('mat', xf(new THREE.CylinderGeometry(.25, .25, .02, 18), {rz:Math.PI / 2, x:-hw - .56, y:4.52, z:-1.1}), 0x3a3f44);
    // 간판: 1층 위를 가로지르는 큰 판
    P.add('mat', box(-hw + .15, H1 - .4, hd, hw - .15, H1 + 1.15, hd + .16, .02), 0x3a3f45);
    // 눈: 옥상, 갓돌 이랑, 간판 위
    P.add('snw', box(-hw + .3, H + .12, -hd + .3, hw - .3, H + .22, hd - .3, .04));
    [[-hw, hd, hw, hd], [-hw, -hd, hw, -hd]].forEach(([a, z, b]) => P.add('snw', ridge([a, a / 2, 0, b / 2, b].map(x => V(x, top + .1, z)), .22, .07, 4)));
    P.add('snw', ridge([-hw + .3, -2, 0, 2, hw - .3].map(x => V(x, H1 + 1.15, hd + .08)), .16, .06, 4));
    P.bake('brk', (p, n) => (.75 + .25 * Math.min(1, p.y / 1.2)) * (.86 + .14 * (n.y * .5 + .5)));
    P.bake('con', groundAO(.4, .75));
    // 옆 · 앞 꾸밈 (2026-11-17): 빗물받이 관, 옆벽 홍보물, 방범창 단 작은 창, 앞 기둥 홍보물, 영업 중 팻말
    [-1, 1].forEach(s => { const x = s * (hw + .06); P.add('met', tube([V(x, .2, hd - .3), V(x, top + .05, hd - .3)], .045, {radial:8}), 0x8f969c); P.add('met', tube([V(x, .2, -hd + .3), V(x, top + .05, -hd + .3)], .045, {radial:8}), 0x8f969c);
      P.add('gls', box(s * hw - (s > 0 ? -.005 : .02), 1.4, -2.6, s * hw + (s > 0 ? .02 : -.005), 2.2, -1.6), 0x33424e);
      for (let z = -2.55; z < -1.6; z += .16) P.add('met', box(s * (hw + .03) - .01, 1.35, z - .01, s * (hw + .03) + .01, 2.25, z + .01), 0xe6e8ea); });
    inner.push(...[-1, 1].map(s => { const g = new THREE.PlaneGeometry(1.6, 1.1); g.rotateY(s * Math.PI / 2); g.translate(s * (hw + .015), 1.75, 1.2); return new THREE.Mesh(g, shopImg('poster')); }));
    [-1, 1].forEach(s => inner.push(new THREE.Mesh(quadZ(s > 0 ? open + .2 : -hw + .2, .9, s > 0 ? hw - .2 : -open - .2, 2.3, hd + .005, [0, 0, 1, 1]), shopImg(s > 0 ? 'poster2' : 'poster3'))));
    P.add('pla', box(open + .4, 2.45, hd, open + 1.3, 2.75, hd + .03, .01), 0xd83a2e); inner.push(new THREE.Mesh(quadZ(open + .42, 2.47, open + 1.28, 2.73, hd + .032, [0, 0, 1, 1]), shopImg('open')));
    const sign = new THREE.Mesh(quadZ(-hw + .25, H1 - .32, hw - .25, H1 + 1.07, hd + .165), signMat());
    return assemble(P, [['brk', brickWallMaterial({seed:113})], ['con', concreteMaterial()], ['mat', matteMaterial()], ['met', metalMaterial({rough:.4})], ['pla', plasticMaterial({rough:.5}), false],
      ['gls', glassMaterial()], ['clr', clearMaterial({color:0xdde9ee, opacity:.22}), false], ['glow', glow(), false], ['snw', snowMaterial({seed:71}), false]], [W, top + .2, D], [sign, ...inner]); }});

// ───────── 차양: 초록 · 흰 줄무늬 천, 앞 늘어뜨림, 철제 팔 (벽에 붙는 선이 원점, 앞으로 proj만큼) ─────────
defineProp('shopAwning', {label:'줄무늬 차양', category:'문구점', isNewStyle:true, small:true,
  variants:[{label:'빨강 · 흰', opts:{c:0xc8372d}}, {label:'파랑 · 흰', opts:{c:0x2f6fb5}}],
  usage:"W.place('shopAwning', {x, z, rot, w: 9.6, y: 0});  // 벽에 붙는 선 높이 3.05m, 앞으로 1.5m. c: 줄 색", build(o = {}){
    const w = o.w || 9.6, proj = o.proj || 1.9, y0 = o.y0 || 3.05, drop = .62, val = .34, sw = .3, n = Math.max(2, Math.round(w / sw)), P = new Parts(), C1 = o.c || 0x2f9a4a, C2 = 0xf4f4ee;
    const yAt = z => y0 - drop * z / proj;
    for (let i = 0; i < n; i++) { const x0 = -w / 2 + w * i / n, x1 = x0 + w / n, c = i % 2 ? C2 : C1, segs = 5;
      for (let k = 0; k < segs; k++) { const za = proj * k / segs, zb = proj * (k + 1) / segs, sag = z => Math.sin(Math.PI * z / proj) * .04;   // 천이 살짝 처진다
        P.add('cloth', quad([x0, yAt(zb) - sag(zb), zb], [x1, yAt(zb) - sag(zb), zb], [x1, yAt(za) - sag(za), za], [x0, yAt(za) - sag(za), za]), c); }
      const fy = yAt(proj); P.add('cloth', quad([x0, fy - val, proj], [x1, fy - val, proj], [x1, fy, proj], [x0, fy, proj]), c); }            // 앞 늘어뜨림
    // 철제 틀: 벽 쪽 막대, 앞 막대, 양 끝과 가운데 팔
    P.add('met', tube([V(-w / 2, y0 + .02, .03), V(w / 2, y0 + .02, .03)], .025, {radial:6}), 0x6f777e); P.add('met', tube([V(-w / 2, yAt(proj) + .01, proj), V(w / 2, yAt(proj) + .01, proj)], .022, {radial:6}), 0x6f777e);
    [-w / 2, 0, w / 2].forEach(x => { P.add('met', tube([V(x, y0 - .55, .02), V(x, yAt(proj * .85) - .02, proj * .85)], .018, {radial:5}), 0x6f777e); P.add('met', box(x - .06, y0 - .62, 0, x + .06, y0 - .48, .03), 0x6f777e); });
    // 눈: 천 위 군데군데
    const R = mulberry(5); for (let i = 0; i < Math.round(w / 1.4); i++) { const z = .3 + R() * (proj - .6); P.add('snw', xf(blob(.25 + R() * .35, .05, .2 + R() * .2, {seed:i, bump:.25, seg:8}), {x:-w / 2 + .4 + R() * (w - .8), y:yAt(z) + .01, z, rx:Math.atan2(drop, proj)})); }
    const cloth = once('awningCloth', () => new THREE.MeshStandardMaterial({name:'cloth', vertexColors:true, roughness:.8, metalness:0, side:THREE.DoubleSide}));
    return assemble(P, [['cloth', cloth], ['met', metalMaterial({rough:.5})], ['snw', snowMaterial({seed:72}), false]], [w, y0, proj]); }});

// ───────── 뽑기 기계 줄: 낮은 빨간 받침대 위에 캡슐 뽑기 기계 n대 ─────────
const GACHA_C = [0xd83a2e, 0x2f6fb5, 0xf2b632, 0xe8742a, 0x3f8a5a, 0xb0558a];
const gachaLabel = () => once('gachaLabel', () => decalMaterial(canvasTex(512, 128, g => { const T = ['공룡', '반지', '스티커', '탱탱볼', '캐릭터', '자동차'];
  T.forEach((t, i) => { const x = (i % 4) * 128, y = Math.floor(i / 4) * 64; g.fillStyle = ['#fff3a8', '#ffd1dc', '#c8f0ff', '#d8ffc8', '#ffe0b0', '#e8d8ff'][i]; g.fillRect(x, y, 128, 64);
    g.fillStyle = '#d83a2e'; g.font = '15px ' + FONT_B; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('500원', x + 64, y + 16); g.fillStyle = '#20252b'; g.font = '26px ' + FONT_D; g.fillText(t, x + 64, y + 44); }); }), {rough:.5}));
defineProp('gachaRow', {label:'뽑기 기계 줄', category:'문구점', isNewStyle:true, colliders:[{r:[-1.05 * U, -.3 * U, 1.05 * U, .3 * U]}],
  variants:[{label:'두 대', opts:{n:2}}],
  usage:"W.place('gachaRow', {x, z, rot, n: 4});  // 한 대 폭 0.42m, 받침대 높이 0.42m", build(o = {}){
    const n = o.n || 4, P = new Parts(), D = new Parts(), R = mulberry(9), sw = .42, W = n * sw + .1, sh = .42, cap = new THREE.IcosahedronGeometry(.032, 0);
    // 받침대 (빨간 철제)
    P.add('pnt', box(-W / 2, sh - .04, -.26, W / 2, sh, .26, .01), 0xc7322a); [-1, 1].forEach(sx => [-1, 1].forEach(sz => P.add('pnt', box(sx * (W / 2 - .03) - .02, 0, sz * .22 - .02, sx * (W / 2 - .03) + .02, sh - .04, sz * .22 + .02), 0xc7322a)));
    P.add('pnt', box(-W / 2 + .03, .08, -.22, W / 2 - .03, .1, .22), 0xc7322a);
    for (let i = 0; i < n; i++) { const x = -W / 2 + .05 + sw * (i + .5), c = GACHA_C[(i + (o.v || 0)) % GACHA_C.length], y0 = sh;
      P.add('pnt', box(x - .17, y0, -.17, x + .17, y0 + .4, .17, .02), c);                                               // 아래 몸통
      P.add('met', box(x - .13, y0 + .1, .17, x + .13, y0 + .34, .19, .01), 0xc9ced2);                                  // 동전 판
      P.add('met', xf(new THREE.CylinderGeometry(.055, .055, .04, 14), {rx:Math.PI / 2, x, y:y0 + .26, z:.21}), 0xdfe3e6); P.add('mat', box(x - .05, y0 + .25, .225, x + .05, y0 + .27, .235), 0x2a2e33);   // 돌리는 손잡이
      P.add('mat', box(x - .07, y0 + .03, .15, x + .07, y0 + .09, .2, .01), 0x1d2024);                                  // 나오는 구멍
      P.add('mat', box(x - .02, y0 + .33, .19, x + .02, y0 + .35, .2), 0x2a2e33);                                       // 동전 넣는 곳
      P.add('clr', box(x - .16, y0 + .41, -.16, x + .16, y0 + .79, .16, .02));                                          // 투명 통
      P.add('pnt', box(x - .17, y0 + .79, -.17, x + .17, y0 + .86, .17, .02), c); P.add('met', box(x - .06, y0 + .86, -.06, x + .06, y0 + .9, .06, .01), 0xc9ced2);
      for (let k = 0; k < 22; k++) { const g = cap.clone(); const cx = x + (R() - .5) * .24, cz = (R() - .5) * .24, cy = y0 + .45 + Math.pow(R(), 1.6) * .26; g.translate(cx, cy, cz); P.add('cap', g, GOODS[Math.floor(R() * GOODS.length)]); }
      const cell = i % 6, u0 = (cell % 4) * .25, v1 = 1 - Math.floor(cell / 4) * .5; D.add('d', quadZ(x - .15, y0 + .7 - .32, x + .15, y0 + .7 - .17, .171, [u0, v1 - .5, u0 + .25, v1])); }
    P.add('snw', ridge([-W / 2 + .1, 0, W / 2 - .1].map(x => V(x, sh + .9, 0)), .25, .05, 3));
    P.bake('pnt', groundAO(.3, .72));
    return assemble(P, [['pnt', plasticMaterial({rough:.35})], ['met', metalMaterial({rough:.3})], ['mat', matteMaterial(), false], ['cap', plasticMaterial({rough:.25}), false], ['clr', clearMaterial({color:0xe8f2f6, opacity:.22}), false], ['snw', snowMaterial({seed:73}), false]],
      [W, sh + .92, .52], [new THREE.Mesh(D.geo('d'), gachaLabel())]); }});

// ───────── 작은 오락기 (아이용): 브라운관 화면, 조이스틱과 버튼, 위 불 켜진 제목판 ─────────
const arcadeScreen = () => once('arcScreen', () => new THREE.MeshBasicMaterial({map:canvasTex(512, 512, g => {
  g.fillStyle = '#0b0f26'; g.fillRect(0, 0, 512, 256); const R = mulberry(3); for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,' + (.3 + R() * .7) + ')'; g.fillRect(R() * 512, R() * 256, 3, 3); }
  const px = (x, y, c, s = 8) => { g.fillStyle = c; g.fillRect(x, y, s, s); };
  [[0, 2], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]].forEach(([y, x]) => px(230 + x * 10, 200 + y * 10, '#7fe3ff'));                 // 내 비행기
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { const x = 90 + c * 50, y = 40 + r * 34; ['#ff5a5a', '#ffd23f', '#8bc34a'][r] && [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]].forEach(([a, b]) => px(x + b * 8, y + a * 8, ['#ff5a5a', '#ffd23f', '#8bc34a'][r], 7)); }
  g.fillStyle = '#ffffff'; g.font = '700 22px monospace'; g.fillText('1UP 001200', 14, 26);
  // 아래 절반: 제목판 (지어낸 게임 이름)
  const gr = g.createLinearGradient(0, 256, 0, 512); gr.addColorStop(0, '#ff4f8a'); gr.addColorStop(1, '#ffb23f'); g.fillStyle = gr; g.fillRect(0, 256, 512, 256);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '120px ' + FONT_D; g.fillText('별똥별', 256, 370); g.font = '34px ' + FONT_B; g.fillText('우주 대작전', 256, 460); })}));
defineProp('miniArcade', {label:'작은 오락기', category:'문구점', isNewStyle:true, colliders:[{r:[-.33 * U, -.3 * U, .33 * U, .3 * U]}],
  variants:[{label:'파랑', opts:{c:0x2f6fb5}}, {label:'노랑', opts:{c:0xf2b632}}],
  usage:"W.place('miniArcade', {x, z, rot, c});  // 폭 0.62m, 높이 1.3m. 앞(+z)에 낮은 걸상을 둔다", build(o = {}){
    const P = new Parts(), D = new Parts(), c = o.c || 0xd83a2e, w = .62, hw = w / 2;
    P.add('pnt', box(-hw, 0, -.28, hw, .62, .26, .02), c);                                                          // 아래 몸통
    P.add('pnt', xf(box(-hw, -.04, -.18, hw, .04, .18, .015), {rx:.32, y:.66, z:.2}), 0x2b2f35);                     // 조작판 (기울어짐)
    P.add('mat', xf(new THREE.CylinderGeometry(.012, .012, .12, 8), {x:-.14, y:.75, z:.24}), 0x1d2024); P.add('pla', xf(new THREE.SphereGeometry(.035, 10, 8), {x:-.14, y:.82, z:.24}), 0xd83a2e);
    [[.03, .25], [.11, .23], [.19, .25]].forEach(([x, z], i) => P.add('pla', xf(new THREE.CylinderGeometry(.025, .025, .02, 12), {x, y:.715 - (z - .2) * .3 + .01, z, rx:.32}), [0xf2b632, 0x2f6fb5, 0x3f8a5a][i]));
    P.add('pnt', box(-hw, .62, -.28, hw, 1.24, -.02, .02), c);                                                      // 화면 상자
    P.add('mat', box(-hw + .05, .74, -.04, hw - .05, 1.12, -.01), 0x15171a);                                        // 화면 테두리
    D.add('scr', quadZ(-hw + .08, .77, hw - .08, 1.09, -.005, [0, .5, 1, 1]));                                     // 화면 (게임)
    P.add('pnt', box(-hw, 1.24, -.28, hw, 1.42, .02, .02), 0x2b2f35); D.add('scr', quadZ(-hw + .03, 1.26, hw - .03, 1.4, .025, [0, 0, 1, .5]));      // 제목판 (불 켜짐)
    P.add('mat', box(-.08, .2, .26, .08, .36, .275, .01), 0x8e959b); P.add('pla', box(-.02, .3, .275, .02, .33, .28), 0xffd23f);                    // 동전 문
    [-1, 1].forEach(s => P.add('pla', box(s * hw - (s > 0 ? 0 : .005), .1, -.2, s * hw + (s > 0 ? .005 : 0), 1.1, .15), [0xf2b632, 0xffffff][s > 0 ? 0 : 1]));   // 옆 색띠
    P.add('snw', box(-hw + .03, 1.42, -.26, hw - .03, 1.47, 0, .02));
    P.bake('pnt', groundAO(.3, .72));
    return assemble(P, [['pnt', plasticMaterial({rough:.38})], ['pla', plasticMaterial({rough:.3}), false], ['mat', matteMaterial(), false], ['snw', snowMaterial({seed:74}), false]], [w, 1.47, .56], [new THREE.Mesh(D.geo('scr'), arcadeScreen())]); }});

// ───────── 가위바위보 오락기 (2026-11-22): 파란 앞판(원판 · 가운데 LED 손 · 동전 판), 아래 검은 턱에 빨간 버튼 셋, 철제 받침 ─────────
//   정체성: 파란 판의 큰 노란 제목, 숫자 칸 고리와 가운데 LED 손, 빨간 둥근 버튼 셋, 오른쪽 은색 동전 판. 앞판 그림은 props/rpsArt.js (놀이 화면과 같은 그림)
//   치수: 폭 0.64m, 높이 1.45m (받침 0.74m + 몸통), 깊이 0.34m. 재질: 칠(받침 · 몸통 · 턱), 플라스틱(버튼 · 동전 판), 눈, 앞판 그림
const rpsFace = () => once('rpsFace', () => decalMaterial(canvasTex(RPS_W, RPS_H, g => drawRpsFace(g, {hand:1})), {rough:.35}));
defineProp('rpsMachine', {label:'가위바위보 오락기', category:'문구점', isNewStyle:true, colliders:[{r:[-.33 * U, -.2 * U, .33 * U, .27 * U]}],
  usage:"W.place('rpsMachine', {x, z, rot});  // 폭 0.64m, 높이 1.45m. 앞(+z)에 서서 버튼을 누른다 (activities/arcade.js)", build(){
    const P = new Parts(), hw = .32, y0 = .74, y1 = 1.38;
    P.add('pnt', box(-.25, 0, -.15, .25, .05, .13, .01), 0x5d646b);                                             // 받침 발판
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => P.add('pnt', box(sx * .2 - .02, .05, sz * .1 - .02, sx * .2 + .02, y0, sz * .1 + .02, .006), 0x8e959b)));   // 받침 다리 넷
    P.add('pnt', box(-.26, .3, -.14, .26, .33, .12, .006), 0x8e959b);                                           // 다리 사이 선반
    P.add('pnt', box(-hw, y0, -.17, hw, y1, .15, .02), 0x1f56e6);                                               // 몸통 (파랑)
    P.add('pnt', box(-hw - .01, y1, -.18, hw + .01, y1 + .035, .16, .01), 0x2b2f35);                            // 윗 갓
    P.add('pnt', box(-hw, y0 - .02, .12, hw, y0 + .1, .27, .02), 0x15171a);                                     // 아래 검은 턱 (버튼 판)
    [-.1, 0, .1].forEach(x => { P.add('pla', xf(new THREE.CylinderGeometry(.052, .056, .014, 18), {x, y:y0 + .107, z:.2}), 0x2b2f35);
      P.add('pla', xf(new THREE.SphereGeometry(.046, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), {x, y:y0 + .112, z:.2, sy:.7}), 0xd91e1e); });   // 빨간 버튼 셋
    [-.26, .26].forEach(x => P.add('pla', xf(new THREE.SphereGeometry(.026, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), {x, y:y0 + .105, z:.2, sy:.6}), 0x9aa0a6));   // 양끝 나사 손잡이
    P.add('pla', box(.17, y0 + .3, .15, .28, y0 + .52, .175, .008), 0xb9bec4);                                  // 동전 판 (튀어나옴)
    P.add('pnt', box(.215, y0 + .44, .174, .235, y0 + .5, .18), 0x2c2f33);                                       // 동전 구멍
    P.add('snw', box(-hw + .02, y1 + .035, -.16, hw - .02, y1 + .07, .14, .02)); P.add('snw', xf(blob(.12, .03, .08, {seed:3, seg:8}), {x:-.12, y:y1 + .07}));
    P.bake('pnt', groundAO(.35, .7));
    const face = new THREE.Mesh(quadZ(-hw + .01, y0 + .1, hw - .01, y1 - .01, .152, [0, 0, 1, 1]), rpsFace());   // 앞판 그림 (600 × 480 비율에 가깝게)
    return assemble(P, [['pnt', plasticMaterial({rough:.36})], ['pla', plasticMaterial({rough:.22}), false], ['snw', snowMaterial({seed:78}), false]], [.66, 1.45, .45], [face]); }});

// ───────── 공기놀이 마당 (2026-11-23 2차): 3m 돗자리 + 큰 공기알 다섯 ─────────
//   돗자리는 엮은 짚 무늬 그림(지어낸 것) 한 장, 가장자리 천 띠. 공기알은 멀리서도 보이게 지름 약 13cm로 크게
const ggMat = () => once('ggMat', () => decalMaterial(canvasTex(512, 512, g => { g.fillStyle = '#e2c27a'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 8) { g.fillStyle = (y / 8) % 2 ? 'rgba(150,110,40,.22)' : 'rgba(255,240,190,.25)'; g.fillRect(0, y, 512, 4); }
  g.fillStyle = 'rgba(120,80,30,.35)'; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 3, 512);
  g.strokeStyle = '#b8282e'; g.lineWidth = 26; g.strokeRect(13, 13, 486, 486); g.strokeStyle = '#2f6fb5'; g.lineWidth = 6; g.strokeRect(34, 34, 444, 444);
  g.strokeStyle = 'rgba(184,40,46,.55)'; g.lineWidth = 5; g.beginPath(); g.arc(256, 256, 120, 0, 7); g.stroke(); }), {rough:.9}));
defineProp('gonggiSet', {label:'공기놀이 마당 (돗자리)', category:'문구점', isNewStyle:true, small:true, groundPreview:true,
  usage:"W.place('gonggiSet', {x, z, rot});  // 돗자리 3m, 공기알 5 (놀이: activities/arcade.js 공기놀이)", build(){
    const P = new Parts(), R = mulberry(31), C = [0xe8402a, 0xf2c51f, 0x2f8fd6, 0x5fb24a, 0xb05bd6];
    P.add('cus', box(-1.5, 0, -1.5, 1.5, .025, 1.5, .01), 0xc9a964);
    C.forEach((c, i) => { const a = i / 5 * Math.PI * 2 + R() * .5, r = .3 + R() * .4; P.add('pla', xf(new THREE.IcosahedronGeometry(.08, 0), {x:Math.cos(a) * r, y:.088, z:Math.sin(a) * r, rx:R() * 3, ry:R() * 3}), c); });
    P.bake('cus', groundAO(.02, .8));
    const top = new THREE.Mesh(quad([-1.49, .0262, 1.49], [1.49, .0262, 1.49], [1.49, .0262, -1.49], [-1.49, .0262, -1.49], [0, 0, 1, 1]), ggMat());
    return assemble(P, [['cus', matteMaterial()], ['pla', plasticMaterial({rough:.3}), false]], [3, .17, 3], [top]); }});

// ───────── 놀이 자리 바닥 표시 (2026-11-24 21차): 기계 앞 서는 자리에 회색 네모 + E 키 그림. 여기 서면 놀 수 있다는 표시 ─────────
const padMat = (w, d) => once('pad' + w + 'x' + d, () => decalMaterial(canvasTex(Math.round(256 * w / d), 256, g => {
  const W = g.canvas.width, H = g.canvas.height;
  g.fillStyle = 'rgba(72,76,82,.86)'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(236,234,228,.92)'; g.lineWidth = 9; g.strokeRect(16, 16, W - 32, H - 32);
  g.fillStyle = '#e3a53b'; g.fillRect(16, 16, W - 32, 12);                                     // 기계 쪽(위) 끝에 호박색 띠
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.strokeRect(W / 2 - 52, 78, 104, 104);             // E 키
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '84px ' + FONT_D; g.fillText('E', W / 2, 134);
}), {alpha:true, rough:.85}));
defineProp('playPad', {label:'놀이 자리 바닥 표시', category:'문구점', isNewStyle:true, small:true, groundPreview:true,
  usage:"W.place('playPad', {x, z, y, rot, w: .85, d: .8});  // 기계 앞 서는 자리 (위쪽 띠가 기계 쪽)", build(o = {}){
    const w = o.w || .85, d = o.d || .8;
    const top = new THREE.Mesh(quad([-w / 2, .004, d / 2], [w / 2, .004, d / 2], [w / 2, .004, -d / 2], [-w / 2, .004, -d / 2], [0, 0, 1, 1]), padMat(w, d));
    return assemble(new Parts(), [], [w, .004, d], [top]); }});

// ───────── 게임 설명판 (2026-11-23): 오락기 · 뽑기 · 가위바위보 위에 얹는 작은 판 (게임 이름 + 한 줄 설명) ─────────
defineProp('gameBoard', {label:'게임 설명판', category:'문구점', isNewStyle:true, small:true,
  usage:"W.place('gameBoard', {x, z, y, rot, text, sub, bg, fg, w: .9, h: .42});  // 기계 위에 얹는다", build(o = {}){
    o = {text:'벽돌 깨기', sub:'공을 튕겨 벽돌 부수기', bg:'#3b1d1a', fg:'#ffb74d', ...o};   // (2026-11-24) 갤러리처럼 글 없이 부를 때의 기본값
    const w = o.w || .9, h = o.h || .42, P = new Parts();
    P.add('frm', box(-w / 2, 0, -.03, w / 2, h, .03, .012), 0x2d3238);
    const face = new THREE.Mesh(quadZ(-w / 2 + .025, .025, w / 2 - .025, h - .025, .031), textSignMat(o, false, (w - .05) / (h - .05)));
    return assemble(P, [['frm', matteMaterial()]], [w, h, .06], [face]); }});

// ───────── 구역 표지 (2026-11-22): '게임존' · '키링존' ─────────
//   zoneSign: 기둥 둘 + 불 들어오는 간판 상자(테두리에 전구). 앞(+z)에 글. 폭 w(기본 2.2m), 높이 2.95m.
//   zoneMat : 바닥 고무 매트(두께 2cm) + 윗면 글 · 줄무늬 테두리. 폭 w × 깊이 d.
const zoneFace = (text, sub, bg, fg) => once('zf' + text, () => decalMaterial(canvasTex(1024, 288, g => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 288); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(22, 22, 980, 244);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '150px ' + FONT_D; g.lineJoin = 'round'; g.strokeStyle = '#1b1b1b'; g.lineWidth = 16; g.strokeText(text, 512, 128); g.fillStyle = fg; g.fillText(text, 512, 128);
  g.font = '40px ' + FONT_B; g.fillStyle = '#ffffff'; g.fillText(sub, 512, 236);
}), {rough:.4}));
defineProp('zoneSign', {label:'구역 표지 (불 간판)', category:'문구점', isNewStyle:true, colliders:[{c:[-1, 0, .08 * U]}, {c:[1, 0, .08 * U]}],
  variants:[{label:'게임존', opts:{text:'게임존'}}, {label:'키링존', opts:{text:'키링존', bg:'#c2185b', sub:'가위바위보 · 뽑기'}}],
  usage:"W.place('zoneSign', {x, z, rot, text:'게임존', sub:'오락기 · 딱지', bg:'#1f4fd0', fg:'#ffd23f', w:2.2});  // 높이 2.95m, 앞(+z)에 글", build(o = {}){
    const w = o.w || 2.2, hw = w / 2, y0 = 2.15, y1 = 2.8, P = new Parts(), text = o.text || '게임존', sub = o.sub || '오락기 · 딱지', bg = o.bg || '#1f4fd0', fg = o.fg || '#ffd23f';
    [-1, 1].forEach(sx => P.add('pnt', box(sx * (hw - .12) - .035, 0, -.035, sx * (hw - .12) + .035, y0 + .05, .035, .008), 0x5d646b));          // 기둥 둘
    P.add('pnt', box(-hw, y0, -.08, hw, y1, .07, .015), 0x2b2f35);                                                                     // 간판 상자
    P.add('pnt', box(-hw - .02, y1, -.09, hw + .02, y1 + .04, .08, .01), 0x1b1d21);
    for (let i = 0; i <= 14; i++) [y0 + .03, y1 - .03].forEach(y => P.add('glow', xf(new THREE.SphereGeometry(.022, 8, 6), {x:-hw + .05 + i * (w - .1) / 14, y, z:.075}), i % 2 ? 0xffe9a0 : 0xffffff));   // 전구 줄
    [0, 1, 2, 3].forEach(i => [-1, 1].forEach(sx => P.add('glow', xf(new THREE.SphereGeometry(.022, 8, 6), {x:sx * (hw - .03), y:y0 + .12 + i * .14, z:.075}), 0xffe9a0)));
    P.add('snw', box(-hw + .02, y1 + .04, -.08, hw - .02, y1 + .075, .07, .015));
    P.bake('pnt', groundAO(.4, .72));
    const face = new THREE.Mesh(quadZ(-hw + .03, y0 + .03, hw - .03, y1 - .03, .0712, [0, 0, 1, 1]), zoneFace(text, sub, bg, fg));
    return assemble(P, [['pnt', paintMaterial(0xffffff, {seed:27, gloss:.5, metal:.3})], ['glow', glow(), false], ['snw', snowMaterial({seed:79}), false]], [w, 2.95, .2], [face]); }});
const matTex = (text, col) => once('zm' + text, () => decalMaterial(canvasTex(512, 1024, g => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 1024);
  for (let i = -1024; i < 1536; i += 64) { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 + 24, 24); g.lineTo(i + 24, 24); g.fill(); }   // 위아래 노랑 빗금 띠
  g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 24, 1024); g.fillRect(488, 0, 24, 1024); g.fillRect(0, 1000, 512, 24); g.fillRect(0, 0, 512, 24);
  g.save(); g.translate(256, 640); g.rotate(-Math.PI / 2); g.font = '170px ' + FONT_D; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.88)'; g.fillText(text, 0, 0); g.restore();
  g.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(256, 120 + k * 4, 50 - k * 4, 0, 7); g.fill(); }
}), {rough:.85}));
defineProp('zoneMat', {label:'구역 바닥 매트', category:'문구점', isNewStyle:true, small:true, groundPreview:true,
  variants:[{label:'게임존', opts:{text:'게임존'}}, {label:'키링존', opts:{text:'키링존', col:'#8e1d4e'}}],
  usage:"W.place('zoneMat', {x, z, rot, w:3.7, d:6.6, text:'게임존', col:'#1d3a8a'});  // 두께 2cm 고무 매트, 글은 세로로", build(o = {}){
    const w = o.w || 3.7, d = o.d || 6.6, P = new Parts();
    P.add('rub', box(-w / 2, 0, -d / 2, w / 2, .02, d / 2, .006), 0x2a2d33);
    const top = new THREE.Mesh(quad([-w / 2 + .01, .0205, d / 2 - .01], [w / 2 - .01, .0205, d / 2 - .01], [w / 2 - .01, .0205, -d / 2 + .01], [-w / 2 + .01, .0205, -d / 2 + .01], [0, 0, 1, 1]), matTex(o.text || '게임존', o.col || '#1d3a8a'));
    return assemble(P, [['rub', matteMaterial(), false]], [w, .02, d], [top]); }});

// ───────── 아이스크림 냉장고: 흰 상자, 위 미닫이 유리, 안에 아이스크림 ─────────
const iceLabel = () => once('iceLabel', () => decalMaterial(canvasTex(512, 128, g => { g.fillStyle = '#2f6fb5'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '72px ' + FONT_D; g.fillText('눈꽃 아이스', 256, 66); g.fillStyle = '#ffd23f'; g.fillRect(0, 112, 512, 16); }), {rough:.5}));
defineProp('iceFreezer', {label:'아이스크림 냉장고', category:'문구점', isNewStyle:true, colliders:[{r:[-.5 * U, -.34 * U, .5 * U, .34 * U]}],
  usage:"W.place('iceFreezer', {x, z, rot});  // 1.0m × 0.65m, 높이 0.85m", build(){
    const P = new Parts(), D = new Parts(), R = mulberry(12), w = 1, d = .65, h = .82;
    P.add('pnt', box(-w / 2, .06, -d / 2, w / 2, h - .14, d / 2, .03), 0xf2f3f0); P.add('mat', box(-w / 2 + .02, 0, -d / 2 + .02, w / 2 - .02, .07, d / 2 - .02), 0x5a6067);
    [[-w / 2, -d / 2, w / 2, -d / 2 + .05], [-w / 2, d / 2 - .05, w / 2, d / 2], [-w / 2, -d / 2, -w / 2 + .05, d / 2], [w / 2 - .05, -d / 2, w / 2, d / 2]].forEach(([a, b, c, e]) => P.add('pnt', box(a, h - .16, b, c, h, e, .01), 0xf2f3f0));   // 위가 열린 테두리
    P.add('mat', box(-w / 2 + .05, h - .145, -d / 2 + .05, w / 2 - .05, h - .14, d / 2 - .05), 0x2d3a44);                // 안 (어두운 바닥)
    for (let i = 0; i < 26; i++) { const x = -w / 2 + .1 + R() * (w - .2), z = -d / 2 + .1 + R() * (d - .2); P.add('pla', box(x - .06, h - .14, z - .03, x + .06, h - .06 + R() * .03, z + .03), GOODS[Math.floor(R() * GOODS.length)]); }
    P.add('clr', box(-w / 2 + .03, h, -d / 2 + .03, w / 2 - .03, h + .02, d / 2 - .03)); P.add('met', box(-w / 2, h, -.01, w / 2, h + .03, .01), 0xc9ced2);
    [[-w / 2, -w / 2 + .03], [w / 2 - .03, w / 2]].forEach(([a, b]) => P.add('met', box(a, h, -d / 2, b, h + .03, d / 2), 0xc9ced2));
    D.add('d', quadZ(-w / 2 + .08, .4, w / 2 - .08, .62, d / 2 + .004));
    P.add('snw', xf(blob(.18, .03, .12, {seed:3, seg:8}), {x:.3, y:h + .02, z:-.15}));
    P.bake('pnt', groundAO(.3, .78));
    return assemble(P, [['pnt', plasticMaterial({rough:.3})], ['mat', matteMaterial(), false], ['pla', plasticMaterial({rough:.4}), false], ['met', metalMaterial({rough:.3}), false], ['clr', clearMaterial({color:0xdfeef4, opacity:.28}), false], ['snw', snowMaterial({seed:75}), false]], [w, h + .05, d], [new THREE.Mesh(D.geo('d'), iceLabel())]); }});

// ───────── 음료 냉장고: 흰 키 큰 냉장고, 유리문 안 음료병, 위 불 켜진 글씨판 ─────────
const drinkLabel = () => once('drinkLabel', () => decalMaterial(canvasTex(512, 128, g => { const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#d83a2e'); gr.addColorStop(1, '#f2603a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '68px ' + FONT_D; g.fillText('시원한 음료', 256, 66); }), {rough:.4}));
defineProp('drinkFridge', {label:'음료 냉장고', category:'문구점', isNewStyle:true, colliders:[{r:[-.38 * U, -.33 * U, .38 * U, .33 * U]}],
  usage:"W.place('drinkFridge', {x, z, rot});  // 0.75m × 0.65m, 높이 1.85m", build(){
    const P = new Parts(), D = new Parts(), R = mulberry(14), w = .75, d = .65, h = 1.85;
    P.add('pnt', box(-w / 2, 0, -d / 2, w / 2, h, -d / 2 + .05, .02), 0xf1f2ef); [-1, 1].forEach(sx => P.add('pnt', box(sx > 0 ? w / 2 - .05 : -w / 2, 0, -d / 2, sx > 0 ? w / 2 : -w / 2 + .05, h, d / 2, .02), 0xf1f2ef));
    P.add('pnt', box(-w / 2, 0, -d / 2, w / 2, .24, d / 2, .02), 0xf1f2ef); P.add('pnt', box(-w / 2, 1.62, -d / 2, w / 2, h, d / 2, .02), 0xf1f2ef);   // 앞이 열린 몸통
    P.add('mat', box(-w / 2 + .05, .24, -d / 2 + .05, w / 2 - .05, 1.62, -d / 2 + .07), 0x2b3a46);                            // 안쪽 뒷벽
    [.35, .62, .89, 1.16, 1.43].forEach(y => { P.add('met', box(-w / 2 + .06, y - .01, d / 2 - .28, w / 2 - .06, y, d / 2 - .04), 0xc9ced2);
      for (let x = -w / 2 + .1; x < w / 2 - .1; x += .085) P.add('pla', xf(lathe([[.03, 0], [.03, .14], [.012, .2], [.012, .23]], 8), {x, y, z:d / 2 - .14}), GOODS[Math.floor(R() * GOODS.length)]); });
    P.add('clr', box(-w / 2 + .05, .24, d / 2 - .015, w / 2 - .05, 1.62, d / 2 + .005)); P.add('met', box(w / 2 - .1, .7, d / 2, w / 2 - .07, 1.2, d / 2 + .05, .01), 0xc9ced2);
    P.add('pnt', box(-w / 2, 1.64, d / 2 - .02, w / 2, 1.85, d / 2 + .02), 0xf1f2ef); D.add('d', quadZ(-w / 2 + .03, 1.66, w / 2 - .03, 1.83, d / 2 + .024));
    P.add('snw', box(-w / 2 + .03, h, -d / 2 + .03, w / 2 - .03, h + .05, d / 2 - .03, .02));
    P.bake('pnt', groundAO(.3, .78));
    return assemble(P, [['pnt', plasticMaterial({rough:.3})], ['mat', matteMaterial(), false], ['met', metalMaterial({rough:.3}), false], ['pla', plasticMaterial({rough:.25}), false], ['clr', clearMaterial({color:0xdfeef4, opacity:.25}), false], ['snw', snowMaterial({seed:76}), false]], [w, h + .05, d], [new THREE.Mesh(D.geo('d'), drinkLabel())]); }});

// ───────── 낮은 나무 걸상 (노란 칠) ─────────
defineProp('kidStool', {label:'낮은 나무 걸상', category:'문구점', isNewStyle:true, small:true,
  usage:"W.place('kidStool', {x, z, rot});  // 0.6m × 0.3m, 높이 0.4m", build(){
    const P = new Parts(), Y = 0xe9c43a;
    P.add('w', box(-.3, .34, -.15, .3, .4, .15, .015), Y); [-1, 1].forEach(sx => P.add('w', box(sx * .24 - .03, 0, -.12, sx * .24 + .03, .34, .12, .008), Y)); P.add('w', box(-.21, .12, -.02, .21, .17, .02), Y);
    P.add('snw', xf(blob(.16, .03, .08, {seed:1, seg:8}), {x:.05, y:.4}));
    P.bake('w', groundAO(.2, .72));
    return assemble(P, [['w', paintMaterial(0xffffff, {seed:26, gloss:.55, metal:0})], ['snw', snowMaterial({seed:77}), false]], [.6, .43, .3]); }});

// ───────── 훌라후프 걸이: 기둥 고리에 색색 훌라후프 ─────────
defineProp('hulaHoops', {label:'훌라후프 걸이', category:'문구점', isNewStyle:true, small:true, colliders:[{c:[0, 0, .08 * U]}],
  usage:"W.place('hulaHoops', {x, z, rot});  // 높이 2m, 고리 지름 0.8m", build(){
    const P = new Parts(), C = [0xd83a2e, 0xf2b632, 0x3f8a5a, 0x2f6fb5, 0xb0558a, 0x7fc6e8];
    P.add('met', box(-.03, 0, -.03, .03, 2.05, .03), 0x8e959b); P.add('met', tube(fillet([V(0, 1.95, 0), V(0, 1.95, .14), V(0, 1.85, .16)], .03, 3), .012, {radial:5}), 0x8e959b);
    C.forEach((c, i) => { const t = new THREE.TorusGeometry(.4, .012, 5, 28); t.rotateY(.18 * (i - 2.5)); t.rotateX(.06 * i); t.translate(0, 1.55 - i * .005, .17 + i * .012); P.add('hoop', t, c); });
    return assemble(P, [['met', metalMaterial({rough:.4})], ['hoop', plasticMaterial({rough:.3})]], [.82, 2.05, .4]); }});

// ───────── 조립: 건물 + 앞에 놓는 물건. 맵에 놓을 때도 이 좌표대로 따로 놓는다 ─────────
// [소품, 옵션, x, y, z, 회전] (미터, 건물 원점 기준, 가게 앞이 +z)
export const STATIONERY_LAYOUT = [
  ['stationeryShop', {}, 0, 0, 0],   // (2026-11-24) 차양막은 뺐다 (기계 · 설명판을 가렸다)
  // (2026-11-23 3차) 놀이 기계는 1.3배 크기 그대로 가게 앞벽에 붙인다 (z 3.88m, 등이 벽). 가운데 문(x -2.6 ~ 2.6)은 비운다.
  //   기계마다 위에 게임 설명판(gameBoard)을 단다 (예전 '게임존' · '키링존' 이름표 대신).
  //   왼쪽(서): 벽돌 깨기(빨강) · 은하 대작전(파랑) + 걸상 · 음료 냉장고. 오른쪽(동): 뽑기 기계 셋 · 가위바위보
  ['miniArcade', {c:0xd83a2e, s:1.3}, -3.06, 0, 3.88], ['miniArcade', {c:0x2f6fb5, s:1.3}, -4.01, 0, 3.88], ['drinkFridge', {}, -4.97, 0, 3.85],
  ['kidStool', {}, -3.06, 0, 4.78], ['kidStool', {}, -4.01, 0, 4.78],
  // (2026-11-24 21차) 기계 앞 서는 자리 바닥 표시 (오락기 둘 · 뽑기 줄 · 가위바위보)
  ['playPad', {w:.85, d:.8}, -4.01, 0, 4.78], ['playPad', {w:.85, d:.8}, -3.06, 0, 4.78], ['playPad', {w:1.75, d:.8}, 3.54, 0, 4.83], ['playPad', {w:.85, d:.8}, 5.0, 0, 4.81],
  ['gachaRow', {n:3, s:1.3}, 3.54, 0, 3.88], ['rpsMachine', {s:1.3}, 5.0, 0, 3.86],
  ['hulaHoops', {}, -5.85, 0, 3.65],
  ['gameBoard', {text:'벽돌 깨기', sub:'공을 튕겨 벽돌 부수기', bg:'#3b1d1a', fg:'#ffb74d', w:.9}, -3.06, 1.93, 3.88],
  ['gameBoard', {text:'은하 대작전', sub:'비행기로 외계 함대 쏘기', bg:'#14213d', fg:'#7fd3ff', w:.9}, -4.01, 1.93, 3.88],
  ['gameBoard', {text:'행운 뽑기', sub:'손잡이 돌려 키링 뽑기 · 8가지', bg:'#a3154a', fg:'#ffe9a0', w:1.7}, 3.54, 1.76, 3.88],
  ['gameBoard', {text:'가위바위보', sub:'기계를 이기면 키링 상품', bg:'#173f9e', fg:'#ffd23f', w:.9}, 5.0, 1.91, 3.86]];
// 놀이 자리 (activities/arcade.js): 건물 원점 기준 미터, 기계 위치와 방향 r. 사람은 기계 앞(+z를 r만큼 돌린 쪽) d m(기본 0.8)에 선다. 공기놀이는 공원(layout.js GONGGI)
export const STATIONERY_ARCADES = [{kind:'cab', game:1, x:-4.01, z:3.88, d:.9}, {kind:'cab', game:2, x:-3.06, z:3.88, d:.9}, {kind:'gacha', x:3.54, z:3.88, d:.95}, {kind:'rps', x:5.0, z:3.86, d:.95}];
export const STATIONERY_ZONES = [];   // (2026-11-23 3차) '게임존' · '키링존' 이름표는 빼고 기계마다 설명판(gameBoard)을 단다
export const STATIONERY_PLAY = {ttakji:[-2.2, 6.9]};     // 딱지치기 자리 (건물 원점 기준, 미터)
defineProp('stationeryCorner', {label:'문구점 (조립 예시)', category:'문구점', isNewStyle:true, blocksCamera:true,
  usage:"STATIONERY_LAYOUT.forEach(([n, o, x, y, z, r]) => W.place(n, {...o, x: cx + x * UNIT, y: y * UNIT, z: cz + z * UNIT, rot: r || 0}));", build(){
    const g = new THREE.Group(); let draws = 0;
    STATIONERY_LAYOUT.forEach(([name, o, x, y, z, r]) => { const m = buildProp(name, o); m.position.set(x * U, y * U, z * U); m.rotation.y = r || 0; draws += m.userData.info.draws; g.add(m); });
    g.userData.info = {tris:triCount(g), draws, materials:draws, sizeMeters:[12, 7.4, 9]}; return g; }});
