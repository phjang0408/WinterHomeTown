// 건물 요소. 상자 하나에 그림을 붙이는 대신, 베란다·계단실·옥탑 같은 부품을 실제 입체로 세워 햇빛에 그림자가 지게 한다.
// 부품은 색깔별로 지오메트리 하나에 합쳐서(boxesGeo) 그리는 횟수를 줄인다.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { M, canvasTex, boxesGeo } from '../core/gfx.js';
import { FONT_D } from '../config.js';

const lam = map => new THREE.MeshLambertMaterial({map});
const texCache = {}, cached = (key, make) => texCache[key] || (texCache[key] = make());
const rng = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const PX = 16;   // 텍스처 해상도: 월드 1단위당 픽셀

/* ───────── 아파트 동 ─────────
   앞(+z)은 남향 베란다, 뒤(-z)는 계단실과 현관, 양 옆은 동 번호가 적힌 측벽. */
const APT = {wall:'#f7f1e5', wallHex:0xf7f1e5, band:'#e8dcc7', name:'겨울마을'};

function aptFront(w, h, n, cols){
  const fh = h / n, uw = w / cols, R = rng(11 + cols * 7 + n);
  return canvasTex(Math.round(w * PX), Math.round(h * PX), (g, W, H) => {
    g.fillStyle = APT.wall; g.fillRect(0, 0, W, H);
    for (let r = 0; r < n; r++) for (let c = 0; c < cols; c++) {
      const x = (c * uw + .4) * PX, ww = (uw - .8) * PX, y = H - (r + 1) * fh * PX + .3 * PX, hh = (fh - .5) * PX;
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, '#6f9cc6'); gr.addColorStop(1, '#b7d3e8');   // 유리에 비친 하늘
      g.fillStyle = gr; g.fillRect(x, y, ww, hh);
      const k = R();
      if (k < .5) { g.fillStyle = k < .22 ? '#efe4cc' : '#f7f4ec'; const cw = ww * (.22 + R() * .3); g.fillRect(R() < .5 ? x : x + ww - cw, y, cw, hh); }   // 커튼
      else if (k < .58) { g.fillStyle = 'rgba(255,220,150,.5)'; g.fillRect(x, y, ww, hh); }                                                              // 불 켜진 집
      g.strokeStyle = '#fdfdfd'; g.lineWidth = 2.5; g.strokeRect(x, y, ww, hh);
      g.lineWidth = 1.5; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + ww * i / 4, y); g.lineTo(x + ww * i / 4, y + hh); g.stroke(); }
      g.fillStyle = 'rgba(40,60,95,.2)'; g.fillRect(x, y, ww, .3 * PX);
    }
  });
}
function aptBack(w, h, n, cols){
  const fh = h / n, uw = w / cols, R = rng(5 + cols * 3 + n);
  return canvasTex(Math.round(w * PX), Math.round(h * PX), (g, W, H) => {
    g.fillStyle = APT.wall; g.fillRect(0, 0, W, H);
    for (let r = 0; r < n; r++) {
      const y0 = H - (r + 1) * fh * PX;
      g.fillStyle = 'rgba(120,105,85,.16)'; g.fillRect(0, y0, W, 1.5);
      for (let c = 0; c < cols; c++) [.3, .7].forEach(f => {
        const ww = 1.5 * PX, hh = 1.25 * PX, x = (c + f) * uw * PX - ww / 2, y = y0 + (fh - 2.35) * PX;
        g.fillStyle = R() < .12 ? '#f3dfa6' : '#8fb2d2'; g.fillRect(x, y, ww, hh);
        g.strokeStyle = '#fdfdfd'; g.lineWidth = 2; g.strokeRect(x, y, ww, hh); g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + hh); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - 2, y + hh, ww + 4, 3);
      });
    }
    g.fillStyle = '#d9b450'; for (let c = 0; c < cols; c += 2) g.fillRect(c * uw * PX + 3, H * .04, 2, H * .96);   // 외벽을 타고 오르는 가스 배관
  });
}
function aptSide(d, h, n, num, accent){
  const fh = h / n;
  return canvasTex(Math.round(d * PX), Math.round(h * PX), (g, W, H) => {
    g.fillStyle = APT.wall; g.fillRect(0, 0, W, H);
    const top = Math.min(H * .3, W * .62);
    g.fillStyle = APT.band; g.fillRect(W * .5 - 1.5 * PX, top, 3 * PX, H - top);
    for (let r = 0; r < n - 2; r++) { const y = H - (r + 1) * fh * PX + (fh - 2.2) * PX;
      g.fillStyle = '#8fb2d2'; g.fillRect(W / 2 - .6 * PX, y, 1.2 * PX, 1.05 * PX); g.strokeStyle = '#fdfdfd'; g.lineWidth = 2; g.strokeRect(W / 2 - .6 * PX, y, 1.2 * PX, 1.05 * PX); }
    g.fillStyle = accent; g.fillRect(0, 0, W, top); g.fillRect(0, top + 5, W, 4);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = Math.round(top * .2) + 'px ' + FONT_D; g.fillText(APT.name, W / 2, top * .2);
    g.font = Math.round(Math.min(top * .56, W * .4)) + 'px ' + FONT_D; g.fillText(num, W / 2, top * .62);
  });
}
function aptCore(cw, h, n, accent){
  const fh = h / n, S = 20;
  return canvasTex(Math.round(cw * S), Math.round(h * S), (g, W, H) => {
    g.fillStyle = accent; g.fillRect(0, 0, W, H);
    for (let r = 1; r < n; r++) { const y = H - r * fh * S - .55 * S;
      g.fillStyle = '#9dbdd9'; g.fillRect(W / 2 - .8 * S, y - .5 * S, 1.6 * S, 1.1 * S); g.strokeStyle = '#fdfdfd'; g.lineWidth = 2; g.strokeRect(W / 2 - .8 * S, y - .5 * S, 1.6 * S, 1.1 * S); }
    g.fillStyle = '#f6f1e6'; g.fillRect(W / 2 - 1.25 * S, H - 2.7 * S, 2.5 * S, 2.7 * S);                 // 현관 문틀
    g.fillStyle = '#4c6480'; g.fillRect(W / 2 - 1.05 * S, H - 2.5 * S, 2.1 * S, 2.5 * S);                 // 유리문
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(W / 2 - 1.05 * S, H - 2.5 * S, .95 * S, 2.5 * S);
    g.fillStyle = '#f6f1e6'; g.fillRect(W / 2 - 1, H - 2.5 * S, 2, 2.5 * S);
  });
}

export function buildApartment(o = {}){
  const w = o.w || 40, d = o.d || 14, h = o.h || 30, accent = o.accent || '#c06f5b', accentHex = parseInt(accent.slice(1), 16);
  const n = Math.max(3, Math.round(h / 2.9)), fh = h / n, cols = Math.max(2, Math.round(w / 6.6)), uw = w / cols;
  const hw = w / 2, hd = d / 2, B = 1.0, CD = 1.8, CW = 3.4, TOP = 2.6, num = ((o.label || '101동').match(/\d+/) || [''])[0];
  const g = new THREE.Group(), R = rng(3 + (parseInt(num, 10) || 1) * 13);
  const key = [w, d, h].join('x');
  const side = lam(cached('s' + key + num + accent, () => aptSide(d, h, n, num, accent))), roof = M(APT.wallHex);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof,
    lam(cached('f' + key, () => aptFront(w, h, n, cols))), lam(cached('b' + key, () => aptBack(w, h, n, cols)))]);
  body.position.y = h / 2; g.add(body);

  const wall = [], acc = [], snow = [], unit = [], hedge = [];
  // 베란다: 층마다 바닥판과 난간벽, 세대 사이 칸막이벽
  for (let i = 1; i <= n; i++) wall.push([-hw, i * fh - .11, hd, hw, i * fh + .11, hd + B]);
  for (let i = 0; i < n; i++) { wall.push([-hw, i ? i * fh + .11 : 0, hd + B - .14, hw, i * fh + 1.05, hd + B]); snow.push([-hw, i * fh + 1.05, hd + B - .17, hw, i * fh + 1.13, hd + B + .03]); }
  for (let j = 0; j <= cols; j++) { const x = -hw + j * uw; wall.push([Math.max(-hw, x - .11), 0, hd, Math.min(hw, x + .11), h, hd + B + .02]); }
  // 난간 밖에 매달린 실외기
  for (let i = 1; i < n; i++) for (let c = 0; c < cols; c++) if (R() < .3) { const x = -hw + c * uw + uw * (.2 + R() * .6); unit.push([x - .42, i * fh + .14, hd + B, x + .42, i * fh + .74, hd + B + .4]); }
  // 옥상: 난간, 쌓인 눈
  acc.push([-hw, h, hd + B - .3, hw, h + .8, hd + B], [-hw, h, -hd, hw, h + .8, -hd + .3], [-hw, h, -hd + .3, -hw + .3, h + .8, hd + B - .3], [hw - .3, h, -hd + .3, hw, h + .8, hd + B - .3]);
  snow.push([-hw + .3, h, -hd + .3, hw - .3, h + .35, hd + B - .3]);
  // 계단실(뒤쪽으로 튀어나온 탑)과 옥탑, 1층 현관 캐노피
  const cores = [], colliders = [[-hw, hd, hw, hd + B + 2.1]];
  for (let k = 0; k < Math.max(1, Math.floor(cols / 2)); k++) cores.push(-hw + (2 * k + 1) * uw);
  const coreMat = lam(cached('c' + h + accent, () => aptCore(CW, h, n, accent)));
  cores.forEach(cx => {
    acc.push([cx - CW / 2, 0, -hd - CD, cx + CW / 2, h, -hd + .01], [cx - CW / 2 - .5, h, -hd - CD, cx + CW / 2 + .5, h + TOP, -hd + 3.4]);
    snow.push([cx - CW / 2 - .6, h + TOP, -hd - CD - .1, cx + CW / 2 + .6, h + TOP + .3, -hd + 3.5]);
    wall.push([cx - 2.4, 2.8, -hd - CD - 2.4, cx + 2.4, 3.05, -hd - CD], [cx - 2.2, 0, -hd - CD - 2.25, cx - 2, 2.8, -hd - CD - 2.05], [cx + 2, 0, -hd - CD - 2.25, cx + 2.2, 2.8, -hd - CD - 2.05]);
    acc.push([cx - 2.42, 2.7, -hd - CD - 2.42, cx + 2.42, 2.82, -hd - CD - 2.36]);
    snow.push([cx - 2.5, 3.05, -hd - CD - 2.5, cx + 2.5, 3.27, -hd - CD]);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CW, h), coreMat); face.rotation.y = Math.PI; face.position.set(cx, h / 2, -hd - CD - .02); g.add(face);
    colliders.push([cx - CW / 2, -hd - CD, cx + CW / 2, -hd]);
  });
  // 베란다 앞 화단
  hedge.push([-hw + .6, 0, hd + B + .8, hw - .6, .75, hd + B + 2.1]); snow.push([-hw + .5, .75, hd + B + .7, hw - .5, 1, hd + B + 2.2]);

  [[wall, M(APT.wallHex)], [acc, M(accentHex)], [snow, M(0xfafcfe)], [unit, M(0xd8dee4)], [hedge, M(0x86a087)]].forEach(([list, mat]) => { if (list.length) g.add(new THREE.Mesh(boxesGeo(list), mat)); });
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.body = body; g.userData.colliders = colliders;
  return g;
}
defineProp('apartment', {label:'아파트 동', category:'건물', usage:"apartment(119, 108, 159, 122, 30, {label:'101동', face:'s'});", build:o => buildApartment({w:26.4, d:12, h:20.3, label:'101동', ...o})});
