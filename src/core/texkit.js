// 재질 도구: 이미지 파일 없이 노이즈로 색·노멀·거칠기 텍스처를 만들고, PBR 재질 묶음을 돌려준다.
// 같은 시드면 항상 같은 무늬가 나온다.
import * as THREE from '../lib/three.js';
import { LOOK } from './look.js';

function rng(seed){ let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const sm = t => t * t * (3 - 2 * t), cl = v => v < 0 ? 0 : v > 1 ? 1 : v, lerp = (a, b, t) => a + (b - a) * t;

// 이어 붙여도 이음매가 없는 값 노이즈. octaves는 격자 크기 목록 (예: [4, 8, 16]).
export function noise2(seed, octaves){
  const r = rng(seed), grids = octaves.map(n => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = r(); return {n, a}; });
  const one = ({n, a}, u, v) => { const x = u * n, y = v * n, i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    const I = ((i % n) + n) % n, J = ((j % n) + n) % n, I1 = (I + 1) % n, J1 = (J + 1) % n;
    return lerp(lerp(a[J * n + I], a[J * n + I1], fx), lerp(a[J1 * n + I], a[J1 * n + I1], fx), fy); };
  let tot = 0; octaves.forEach((_, k) => { tot += 1 / (1 << k); });
  return (u, v) => { let s = 0; grids.forEach((g, k) => { s += one(g, u, v) / (1 << k); }); return s / tot; };
}

function tex(data, w, h, srgb, repeat){
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.repeat.set(repeat[0], repeat[1]); t.needsUpdate = true; return t;
}
// 높이 함수 → 노멀맵 (이웃 픽셀 차이로 기울기를 구한다)
export function normalTex(w, h, height, strength, repeat){
  const H = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = height((x + .5) / w, (y + .5) / h);
  const at = (x, y) => H[((y % h) + h) % h * w + ((x % w) + w) % w], d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = (at(x - 1, y) - at(x + 1, y)) * strength * w, sy = (at(x, y - 1) - at(x, y + 1)) * strength * h, l = Math.hypot(sx, sy, 1), i = (y * w + x) * 4;
    d[i] = (sx / l * .5 + .5) * 255; d[i + 1] = (sy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
  }
  return tex(d, w, h, false, repeat);
}
export function grayTex(w, h, fn, repeat){
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = cl(fn((x + .5) / w, (y + .5) / h)) * 255, i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  return tex(d, w, h, false, repeat);
}
export function colorTex(w, h, fn, repeat){
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn((x + .5) / w, (y + .5) / h), i = (y * w + x) * 4; d[i] = cl(c[0]) * 255; d[i + 1] = cl(c[1]) * 255; d[i + 2] = cl(c[2]) * 255; d[i + 3] = 255; }
  return tex(d, w, h, true, repeat);
}

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const tri = t => { const f = t - Math.floor(t); return f < .5 ? f * 2 : 2 - f * 2; };

// 나무 각재: 결이 길이 방향(u)으로 흐른다. uv는 미터 단위라고 보고 1m × 0.25m 한 장을 반복한다.
export function woodMaterial({seed = 11, light = [.56, .38, .24], dark = [.36, .22, .13], scale = 1} = {}){
  return once('wood' + seed + light + dark + scale, () => {
    const W = Math.round(512 * scale), H = Math.round(128 * scale), warp = noise2(seed, [2, 4]), fine = noise2(seed + 1, [8, 16, 32]);
    const ring = (u, v) => tri(v * 9 + (warp(u, v * .5) - .5) * 1.6 + (fine(u * 2, v) - .5) * .5);
    const rep = [1, 4];
    const map = colorTex(W, H, (u, v) => { const t = cl(sm(cl(ring(u, v) * 1.15 - .05)) * .55 + fine(u * 8, v * 2) * .5 + Math.max(0, fine(u * 16, v * 4) - .7));
      const k = .94 + warp(u * 3, v) * .12; return [lerp(light[0], dark[0], t) * k, lerp(light[1], dark[1], t) * k, lerp(light[2], dark[2], t) * k]; }, rep);
    const normalMap = normalTex(W / 2, H / 2, (u, v) => ring(u, v) * .5 + fine(u * 8, v * 2) * .35 + fine(u * 16, v * 4) * .15, .006, rep);
    const roughnessMap = grayTex(W / 4, H / 4, (u, v) => .62 + ring(u, v) * .12 + fine(u * 6, v) * .14, rep);
    return new THREE.MeshStandardMaterial({name:'wood', map, normalMap, normalScale:new THREE.Vector2(.8, .8), roughnessMap, roughness:1, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 도장한 강철: 아주 약한 귤껍질 요철과 군데군데 닳은 거칠기.
export function paintMaterial(color, {seed = 21, gloss = .45, metal = .25} = {}){
  return once('paint' + color + seed + gloss + metal, () => {
    const a = noise2(seed, [16, 32, 64]), b = noise2(seed + 1, [4, 8]);
    const normalMap = normalTex(128, 128, (u, v) => a(u, v), .0025, [6, 6]);
    const roughnessMap = grayTex(64, 64, (u, v) => gloss + (a(u, v) - .5) * .12 + Math.max(0, b(u, v) - .62) * .9, [3, 3]);
    return new THREE.MeshStandardMaterial({name:'paint', color, normalMap, normalScale:new THREE.Vector2(.5, .5), roughnessMap, roughness:1, metalness:metal, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 쌓인 눈: 거친 무광, 잔 알갱이 요철.
export function snowMaterial({seed = 31} = {}){
  return once('snow' + seed, () => {
    const a = noise2(seed, [8, 16, 32]);
    const normalMap = normalTex(128, 128, (u, v) => a(u, v), .004, [8, 8]);
    return new THREE.MeshStandardMaterial({name:'snow', color:0xffffff, normalMap, normalScale:new THREE.Vector2(.6, .6), roughness:1, metalness:0, envMapIntensity:LOOK.envIntensity * .5});
  });
}

// ───────── 추가 재질 (단지 소품용) ─────────
// 정점 색을 그대로 쓰는 무광 재질. 플라스틱·고무·잎·도색 부품을 한 번에 그릴 때 쓴다.
export function matteMaterial({rough = .85, metal = 0} = {}){
  return once('matte' + rough + metal, () => new THREE.MeshStandardMaterial({name:'matte', vertexColors:true, roughness:rough, metalness:metal, envMapIntensity:LOOK.envIntensity}));
}
// 칠한 콘크리트: 얼룩과 빗물 자국, 잔 요철. 색은 정점 색으로 준다.
export function concreteMaterial({seed = 41} = {}){
  return once('concrete' + seed, () => {
    const a = noise2(seed, [4, 8, 16]), b = noise2(seed + 1, [32, 64]), d = noise2(seed + 2, [24]);
    const map = colorTex(256, 256, (u, v) => { const streak = Math.max(0, d(u, .1) - .55) * (1 - v) * .5, k = .86 + a(u, v) * .14 - streak * .35 - Math.max(0, a(u * 2, v * 2) - .7) * .25; return [k, k, k * 1.01]; }, [.5, .5]);
    const normalMap = normalTex(128, 128, (u, v) => b(u, v) * .7 + a(u, v) * .3, .004, [2, 2]);
    return new THREE.MeshStandardMaterial({name:'concrete', map, normalMap, normalScale:new THREE.Vector2(.6, .6), roughness:.92, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 눈 치운 젖은 아스팔트: 어두운 바탕에 골재 알갱이, 군데군데 눈가루. uv 1 = 1m.
export function asphaltMaterial({seed = 51} = {}){
  return once('asphalt' + seed, () => {
    const a = noise2(seed, [64, 128]), b = noise2(seed + 1, [3, 6, 12]), c = noise2(seed + 2, [128]);
    const map = colorTex(256, 256, (u, v) => { const sp = c(u, v) > .82 ? .12 : 0, dust = cl((b(u, v) - .56) * 4) * .34, k = .2 + a(u, v) * .07 + sp + dust; return [k * .96, k * .99, k * 1.04]; }, [1 / 6, 1 / 6]);
    const normalMap = normalTex(128, 128, (u, v) => a(u, v), .006, [1 / 1.5, 1 / 1.5]);
    const roughnessMap = grayTex(64, 64, (u, v) => .78 + b(u, v) * .2, [1 / 6, 1 / 6]);
    return new THREE.MeshStandardMaterial({name:'asphalt', map, normalMap, normalScale:new THREE.Vector2(.7, .7), roughnessMap, roughness:1, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 보도블록: 20×10cm 벽돌 엇갈려 쌓기, 줄눈에 눈이 낌. uv 1 = 1m.
export function paverMaterial({seed = 61} = {}){
  return once('paver' + seed, () => {
    const r = rng(seed), cols = 6, rows = 12, tone = Array.from({length:cols * rows * 2}, () => r()), a = noise2(seed + 1, [8, 16, 32]);
    const brick = (u, v) => { const row = Math.floor(v * rows), x = u * cols + (row % 2) * .5, col = Math.floor(x), fx = x - col, fy = v * rows - row;
      return {id:((col % cols) + cols) % cols + row * cols, edge:Math.min(fx, 1 - fx) * 2 * 2, edgeY:Math.min(fy, 1 - fy) * 2}; };
    const joint = (u, v) => { const q = brick(u, v); return cl(Math.min(q.edge * 8, q.edgeY * 5)); };
    const P = [[.56, .4, .34], [.52, .53, .55], [.47, .36, .31], [.6, .5, .42]];
    const map = colorTex(256, 256, (u, v) => { const q = brick(u, v), c = P[Math.floor(tone[q.id] * 4)], j = joint(u, v), k = (.86 + a(u, v) * .2) * (.8 + tone[q.id + 72] * .2), dust = cl((a(u * .5, v * .5) - .5) * 3) * .25;
      return [lerp(.84, c[0] * k, j) + dust, lerp(.87, c[1] * k, j) + dust, lerp(.9, c[2] * k, j) + dust]; }, [1 / 1.2, 1 / 1.2]);
    const normalMap = normalTex(256, 256, (u, v) => joint(u, v) * .8 + a(u, v) * .2, .004, [1 / 1.2, 1 / 1.2]);
    return new THREE.MeshStandardMaterial({name:'paver', map, normalMap, normalScale:new THREE.Vector2(.8, .8), roughness:.9, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 스테인리스·알루미늄: 하늘이 비치는 금속.
export function metalMaterial({color = 0xc4cace, rough = .3} = {}){
  return once('metal' + color + rough, () => new THREE.MeshStandardMaterial({name:'metal', color, roughness:rough, metalness:.92, vertexColors:true, envMapIntensity:1}));
}
// 유리·광택 부품: 매끈해서 하늘이 비친다. 색은 정점 색으로 준다 (창은 어둡게, 전조등은 밝게).
export function glassMaterial({rough = .07, env = 1.3} = {}){
  return once('glass' + rough + env, () => new THREE.MeshStandardMaterial({name:'glass', vertexColors:true, roughness:rough, metalness:0, envMapIntensity:env}));
}
// 자동차 도장: 투명 코팅이 올라간 광택. 색은 인스턴스 색(또는 color)으로 준다.
export function carPaintMaterial(){
  return once('carpaint', () => new THREE.MeshPhysicalMaterial({name:'carpaint', color:0xffffff, roughness:.42, metalness:.3, clearcoat:1, clearcoatRoughness:.12, vertexColors:true, envMapIntensity:.8}));
}
// 나무껍질: 세로로 갈라진 결.
export function barkMaterial({seed = 71} = {}){
  return once('bark' + seed, () => {
    const a = noise2(seed, [4, 8]), b = noise2(seed + 1, [16, 32]);
    const ridge = (u, v) => tri(v * 7 + (a(u * .5, v) - .5) * 1.2) * .7 + b(u, v) * .3;
    const map = colorTex(128, 128, (u, v) => { const k = .55 + ridge(u, v) * .45; return [.36 * k, .31 * k, .28 * k]; }, [.5, 1]);
    const normalMap = normalTex(128, 128, ridge, .012, [.5, 1]);
    return new THREE.MeshStandardMaterial({name:'bark', map, normalMap, roughness:.95, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 그림(캔버스 텍스처)을 붙이는 판. 표면에서 살짝 띄워 놓고 쓴다.
export function decalMaterial(map, {rough = .8, alpha = false} = {}){
  return new THREE.MeshStandardMaterial({name:'decal', map, roughness:rough, metalness:0, transparent:alpha, alphaTest:alpha ? .35 : 0, envMapIntensity:LOOK.envIntensity,
    polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2});
}
// 색 플라스틱·분체도장: 살짝 번들거린다. 색은 정점 색.
export function plasticMaterial({rough = .42} = {}){
  return once('plastic' + rough, () => new THREE.MeshStandardMaterial({name:'plastic', vertexColors:true, roughness:rough, metalness:0, envMapIntensity:.7}));
}
// 비쳐 보이는 판 (방음벽 투명판)
export function clearMaterial({color = 0xbfd6df, opacity = .32} = {}){
  return once('clear' + color + opacity, () => new THREE.MeshStandardMaterial({name:'clear', color, roughness:.12, metalness:0, transparent:true, opacity, depthWrite:false, envMapIntensity:1.2, side:THREE.DoubleSide}));
}
// 바닥에 칠한 선·글씨: 바닥과 겹쳐 깜빡이지 않게 살짝 앞으로 당겨 그린다. 색은 정점 색.
export function roadPaintMaterial(){
  return once('roadpaint', () => new THREE.MeshStandardMaterial({name:'roadpaint', vertexColors:true, roughness:.88, metalness:0, envMapIntensity:LOOK.envIntensity, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2}));
}
