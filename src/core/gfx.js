// 도형·재질·텍스처 도우미. 엔진(렌더러)에 의존하지 않아서 소품 갤러리에서도 그대로 쓴다.
import * as THREE from '../lib/three.js';
import { PI, rr, srand } from './util.js';
import { FONT_D } from '../config.js';

let root = null;
export const setRoot = g => { root = g; };

const cache = {};
export const M = c => cache[c] || (cache[c] = new THREE.MeshLambertMaterial({color:c}));
export const glow = c => cache['g' + c] || (cache['g' + c] = new THREE.MeshBasicMaterial({color:c}));

// 눈 덮인 바닥용 재질: 색 위에 옅은 눈결 무늬를 깐다. flat()이 월드 좌표로 무늬를 이어 붙인다.
const SNOW_TILE = 26;
let snowMap = null;
export function snowTex(){
  if (snowMap) return snowMap;
  snowMap = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    let s = 41; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const blot = (x, y, r, col) => { for (let dx = -W; dx <= W; dx += W) for (let dy = -H; dy <= H; dy += H) {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } };
    for (let i = 0; i < 26; i++) blot(R() * W, R() * H, 22 + R() * 46, 'rgba(176,200,228,' + (.10 + R() * .12).toFixed(3) + ')');   // 눈 둔덕 그늘
    for (let i = 0; i < 16; i++) blot(R() * W, R() * H, 10 + R() * 22, 'rgba(255,255,255,.55)');                                  // 볕 받는 등
    for (let i = 0; i < 160; i++) blot(R() * W, R() * H, 2 + R() * 3, 'rgba(170,196,226,' + (.10 + R() * .14).toFixed(3) + ')');                  // 잔 굴곡
  });
  snowMap.wrapS = snowMap.wrapT = THREE.RepeatWrapping; return snowMap;
}
export const G = c => cache['s' + c] || (cache['s' + c] = new THREE.MeshLambertMaterial({color:c, map:snowTex()}));

export function flat(x0, z0, x1, z1, c, y, parent){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), typeof c === 'number' ? M(c) : c);
  if (m.material.map && m.material.map === snowMap) { const uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0)) / SNOW_TILE, -(z0 + (1 - uv.getY(i)) * (z1 - z0)) / SNOW_TILE); }
  m.rotation.x = -PI / 2; m.position.set((x0 + x1) / 2, y === undefined ? 0.01 : y, (z0 + z1) / 2);
  m.receiveShadow = true; (parent || root).add(m); return m;
}
export function box(x0, z0, x1, z1, h, mat, y0, parent){
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), typeof mat === 'number' ? M(mat) : mat);
  m.position.set((x0 + x1) / 2, (y0 || 0) + h / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true; (parent || root).add(m); return m;
}
export function mesh(geo, mat, x, y, z, parent){
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? M(mat) : mat); m.position.set(x, y, z);
  m.castShadow = true; (parent || root).add(m); return m;
}
export function canvasTex(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function pillSprite(text, bg, fg, hgt){
  const c = document.createElement('canvas'), g = c.getContext('2d'), fs = 34;
  g.font = fs + 'px ' + FONT_D; const tw = Math.ceil(g.measureText(text).width);
  c.width = tw + 36; c.height = 54;
  g.font = fs + 'px ' + FONT_D; g.fillStyle = bg; rr(g, 1, 1, c.width - 2, c.height - 2, 26); g.fill();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true}));
  sp.scale.set(c.width / c.height * hgt, hgt, 1); sp.renderOrder = 10; return sp;
}
// 상자 여러 개를 지오메트리 하나로 합친다. 각 항목은 [x0,y0,z0,x1,y1,z1]. 부품이 많은 건물도 한 번에 그려진다.
export function boxesGeo(list){
  const pos = [], nor = [], N = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for (const [x0, y0, z0, x1, y1, z1] of list) {
    const F = [
      [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]], [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],
      [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],
      [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]]];
    F.forEach((q, i) => [0,1,2,0,2,3].forEach(k => { pos.push(q[k][0], q[k][1], q[k][2]); nor.push(N[i][0], N[i][1], N[i][2]); }));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g;
}
// 박공지붕 같은 삼각기둥. 용마루가 x축 방향.
export function prismGeo(w, d, h){
  const a = w / 2, b = d / 2, v = [
    -a,0,b,  a,0,b,  a,h,0,   -a,0,b,  a,h,0,  -a,h,0,
     a,0,-b, -a,0,-b, -a,h,0,  a,0,-b, -a,h,0,  a,h,0,
    -a,0,-b, -a,0,b, -a,h,0,   a,0,b,  a,0,-b,  a,h,0];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}

// 건물 외벽 텍스처: 상가(간판·차양·출입문) 또는 아파트(창문 격자)
export function facadeTex(w, h, o, label){
  const s = Math.min(o.kind === 'shop' ? 32 : 14, 1024 / Math.max(w, h));
  return canvasTex(Math.max(8, Math.round(w * s)), Math.max(8, Math.round(h * s)), (g, W, H) => {
    g.fillStyle = o.base; g.fillRect(0, 0, W, H);
    if (o.kind === 'shop') {
      if (!label) {
        g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, H - s * .5, W, s * .5);
        const n = Math.max(1, Math.round(w / 6));
        for (let i = 0; i < n; i++) { g.fillStyle = '#c6d6e0'; g.fillRect((i + .5) * W / n - s * .6, H * .35, s * 1.2, s * 1.1); }
        return;
      }
      g.fillStyle = '#fffaf0'; rr(g, s * .5, s * .3, W - s, s * 1.35, s * .3); g.fill();
      g.strokeStyle = 'rgba(60,70,90,.25)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#34465c'; g.font = (s * .92) + 'px ' + FONT_D; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, W / 2, s * 1.02);
      const n = Math.max(6, Math.round(w / 0.9));
      for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#fbf4e6' : (o.awn || '#c9705f'); g.fillRect(i * W / n, s * 1.85, W / n + 1, s * .5); }
      const gy = s * 2.65, gh = Math.min(H - gy - s * .4, s * 3.2), dw = s * 1.3, dx = W / 2 - dw / 2;
      g.fillStyle = '#cfe1ea'; g.fillRect(s * .6, gy, dx - s, gh * .82); g.fillRect(dx + dw + s * .4, gy, W - (dx + dw + s * .4) - s * .6, gh * .82);
      g.fillStyle = 'rgba(255,236,170,.5)'; g.fillRect(s * .6, gy + gh * .45, dx - s, gh * .37); g.fillRect(dx + dw + s * .4, gy + gh * .45, W - (dx + dw + s * .4) - s * .6, gh * .37);
      g.fillStyle = '#8b6b56'; g.fillRect(dx, gy, dw, H - gy);
      g.fillStyle = '#e9d9b8'; g.fillRect(dx + dw * .15, gy + s * .2, dw * .7, gh * .45);
      if (H - gy - gh > s * 2.2) {
        const cols = Math.max(2, Math.round(w / 3.2)), cw = (W - s) / cols, uy = gy + gh + s * .9;
        for (let q = 0; q < cols; q++) { g.fillStyle = srand() < .3 ? '#f7e2a6' : '#b9cadb'; g.fillRect(s * .5 + q * cw + cw * .2, uy, cw * .6, s * 1.2); }
      }
    } else {
      const fl = Math.max(2, Math.round(h / 2.9)), cols = Math.max(2, Math.round(w / 3));
      const top = label ? s * 2.4 : s * .9, cw = (W - s * 1.2) / cols, rh = (H - top - s * .6) / fl;
      for (let r = 0; r < fl; r++) for (let q = 0; q < cols; q++) {
        const x = s * .6 + q * cw + cw * .16, y = top + r * rh + rh * .2;
        g.fillStyle = srand() < .2 ? '#f7e2a6' : '#b9cadb'; g.fillRect(x, y, cw * .68, rh * .52);
        g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x - 2, y + rh * .52, cw * .68 + 4, rh * .09);
      }
      if (label) { g.fillStyle = '#4b607a'; g.font = (s * 1.7) + 'px ' + FONT_D; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, s * .8, s * 1.3); }
    }
  });
}
