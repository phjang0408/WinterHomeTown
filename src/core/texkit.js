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

// 정점 색(가짜 AO)을 받는 눈 재질. 눈사람 · 눈덩이처럼 눈 자체가 몸통인 소품에 쓴다.
export function snowAOMaterial({seed = 33} = {}){
  return once('snowAO' + seed, () => { const m = snowMaterial({seed}).clone(); m.name = 'snowAO'; m.vertexColors = true; return m; });
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
// 보도블록·벽돌 보도: 20×10cm 블록 엇갈려 쌓기, 줄눈에 눈이 낌. uv 1 = 1m. tones는 블록 색 네 가지.
function pavers(key, seed, P, dustAmt = .25){
  return once(key + seed, () => {
    const r = rng(seed), cols = 6, rows = 12, tone = Array.from({length:cols * rows * 2}, () => r()), a = noise2(seed + 1, [8, 16, 32]);
    const brick = (u, v) => { const row = Math.floor(v * rows), x = u * cols + (row % 2) * .5, col = Math.floor(x), fx = x - col, fy = v * rows - row;
      return {id:((col % cols) + cols) % cols + row * cols, edge:Math.min(fx, 1 - fx) * 2 * 2, edgeY:Math.min(fy, 1 - fy) * 2}; };
    const joint = (u, v) => { const q = brick(u, v); return cl(Math.min(q.edge * 8, q.edgeY * 5)); };
    const map = colorTex(256, 256, (u, v) => { const q = brick(u, v), c = P[Math.floor(tone[q.id] * 4)], j = joint(u, v), k = (.86 + a(u, v) * .2) * (.8 + tone[q.id + 72] * .2), dust = cl((a(u * .5, v * .5) - .5) * 3) * dustAmt;
      return [lerp(.84, c[0] * k, j) + dust, lerp(.87, c[1] * k, j) + dust, lerp(.9, c[2] * k, j) + dust]; }, [1 / 1.2, 1 / 1.2]);
    const normalMap = normalTex(256, 256, (u, v) => joint(u, v) * .8 + a(u, v) * .2, .004, [1 / 1.2, 1 / 1.2]);
    return new THREE.MeshStandardMaterial({name:key, map, normalMap, normalScale:new THREE.Vector2(.8, .8), roughness:.9, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
export const paverMaterial = ({seed = 61} = {}) => pavers('paver', seed, [[.56, .4, .34], [.52, .53, .55], [.47, .36, .31], [.6, .5, .42]]);
// 붉은 벽돌 보도 (단지 안 보도): 적벽돌 네 가지 색을 섞어 깐다.
export const brickPaveMaterial = ({seed = 63} = {}) => pavers('brickpave', seed, [[.57, .27, .2], [.5, .23, .18], [.63, .33, .25], [.44, .21, .17]], .12);
// 화단 바닥: 눈이 덮인 잔디밭. 넓이의 80%는 눈, 20%는 마른 겨울 잔디가 얼룩져 드러난다 (grass로 비율을 바꾼다). uv 1 = 1m.
export function bedMaterial({seed = 81, grass = .2} = {}){
  return once('bed' + seed + grass, () => {
    const a = noise2(seed, [5, 9, 17]), c = noise2(seed + 2, [28, 56]), d = noise2(seed + 3, [96, 192]), b = noise2(seed + 1, [128, 256]);
    const f = (u, v) => a(u, v) * .5 + c(u, v) * .3 + d(u, v) * .2;                       // 큰 얼룩 + 중간 얼룩 + 풀포기 낱알
    const vals = []; for (let i = 0; i < 128; i++) for (let j = 0; j < 128; j++) vals.push(f(i / 128, j / 128)); vals.sort((p, q) => p - q);
    const T = vals[Math.floor(vals.length * (1 - grass))];                                // 이 값보다 큰 곳(전체의 grass 비율)이 잔디
    const blade = (u, v) => cl((f(u, v) - T) * 34 + .5);
    const map = colorTex(512, 512, (u, v) => { const g = blade(u, v), k = .78 + b(u, v) * .44, s = .935 + b(u, v) * .05;
      return [lerp(s * .985, .52 * k, g), lerp(s * .995, .5 * k, g), lerp(s * 1.03, .33 * k, g)]; }, [1 / 26, 1 / 26]);
    const normalMap = normalTex(256, 256, (u, v) => b(u, v) * .5 - blade(u, v) * .5, .005, [1 / 26, 1 / 26]);
    return new THREE.MeshStandardMaterial({name:'bed', map, normalMap, normalScale:new THREE.Vector2(.6, .6), roughness:.96, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 얼음판 (2026-11-17, 강변 얼음 썰매장): 푸르스름한 반들 얼음과 눈가루 얼룩. uv 1 = 1m.
export function iceMaterial({seed = 141} = {}){
  return once('ice' + seed, () => {
    const a = noise2(seed, [3, 7, 13]), b = noise2(seed + 1, [64, 128]);
    const map = colorTex(512, 512, (u, v) => { const k = a(u, v), w = cl((k - .55) * 3); return [lerp(.56, .86, w) - b(u, v) * .04, lerp(.72, .92, w) - b(u, v) * .03, lerp(.86, .97, w)]; }, [1 / 30, 1 / 30]);   // 얼음은 눈보다 짙은 하늘빛, 군데군데 흰 눈가루
    return new THREE.MeshStandardMaterial({name:'ice', map, roughness:.12, metalness:.1, vertexColors:true, envMapIntensity:LOOK.envIntensity * 1.6});
  });
}
// 어린이 보호구역 붉은 포장: 암적색 미끄럼방지 포장에 골재 알갱이와 닳은 자국, 눈가루. uv 1 = 1m.
export function schoolZoneMaterial({seed = 91} = {}){
  return once('schoolzone' + seed, () => {
    const a = noise2(seed, [64, 128]), b = noise2(seed + 1, [3, 6, 12]), c = noise2(seed + 2, [128]);
    const map = colorTex(256, 256, (u, v) => { const sp = c(u, v) > .84 ? .1 : 0, dust = cl((b(u, v) - .58) * 4) * .3, wear = cl((b(u * 2, v * 2) - .5) * 2) * .12, k = .82 + a(u, v) * .2;
      return [(.6 - wear) * k + sp + dust, (.2 + wear * .3) * k + sp + dust, (.17 + wear * .3) * k + sp + dust]; }, [1 / 6, 1 / 6]);
    const normalMap = normalTex(128, 128, (u, v) => a(u, v), .006, [1 / 1.5, 1 / 1.5]);
    return new THREE.MeshStandardMaterial({name:'schoolzone', map, normalMap, normalScale:new THREE.Vector2(.7, .7), roughness:.95, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
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

// ───────── 추가 재질 (간이역 · 도로 · 강변) ─────────
// 비율 문턱값: 노이즈 값을 늘어놓고 위에서 frac 비율이 되는 값을 찾는다 (눈·풀이 덮는 넓이를 맞출 때 쓴다).
function quantile(f, frac){ const vals = []; for (let i = 0; i < 96; i++) for (let j = 0; j < 96; j++) vals.push(f(i / 96, j / 96)); vals.sort((p, q) => p - q); return vals[Math.min(vals.length - 1, Math.floor(vals.length * (1 - frac)))]; }
// 자갈: 선로 도상(회갈색 쇄석)과 철길 옆 자갈밭. snow는 눈이 덮은 넓이 비율, grass는 마른 풀 비율. uv 1 = 1m, 한 장이 3m.
export function gravelMaterial({seed = 101, snow = .25, grass = 0, tone = [1, .95, .88]} = {}){
  return once('gravel' + seed + snow + grass + tone, () => {
    const a = noise2(seed, [96, 192]), d = noise2(seed + 3, [192]), b = noise2(seed + 1, [3, 6, 12]), c = noise2(seed + 2, [12, 24, 48]), g = noise2(seed + 4, [6, 12, 48]);
    const sn = (u, v) => b(u, v) * .7 + c(u, v) * .3, gr = (u, v) => g(u, v);
    const Ts = snow > 0 ? quantile(sn, snow) : 9, Tg = grass > 0 ? quantile(gr, grass) : 9;
    const stone = (u, v) => cl((a(u, v) - .3) * 2.2);                                          // 돌 하나하나의 볼록함
    const sMask = (u, v) => cl((sn(u, v) - Ts) * 22 + .5 - stone(u, v) * .35), gMask = (u, v) => cl((gr(u, v) - Tg) * 18 + .5) * (1 - sMask(u, v));
    const map = colorTex(512, 512, (u, v) => { const k = .3 + stone(u, v) * .34 + (d(u, v) > .7 ? .1 : 0), s = sMask(u, v), q = gMask(u, v), w = .9 + d(u, v) * .08;
      const r = lerp(lerp(k * tone[0], .5 * (.8 + d(u, v) * .4), q), w, s), gg = lerp(lerp(k * tone[1], .46 * (.8 + d(u, v) * .4), q), w * 1.01, s), bb = lerp(lerp(k * tone[2], .3 * (.8 + d(u, v) * .4), q), w * 1.04, s); return [r, gg, bb]; }, [1 / 5, 1 / 5]);
    const normalMap = normalTex(256, 256, (u, v) => stone(u, v) * (1 - sMask(u, v) * .8), .01, [1 / 2, 1 / 2]);
    return new THREE.MeshStandardMaterial({name:'gravel', map, normalMap, normalScale:new THREE.Vector2(1, 1), roughness:.97, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 붉은 벽돌 벽: 22.5 × 7.5cm 벽돌을 반장씩 엇갈려 쌓은 길이쌓기, 줄눈은 밝은 회색. uv 1 = 1m, 한 장이 0.9m.
export function brickWallMaterial({seed = 111} = {}){
  return once('brickwall' + seed, () => {
    const r = rng(seed), cols = 4, rows = 12, tone = Array.from({length:cols * rows}, () => r()), a = noise2(seed + 1, [16, 32, 64]), b = noise2(seed + 2, [4, 8]);
    const at = (u, v) => { const row = Math.floor(v * rows), x = u * cols + (row % 2) * .5, col = Math.floor(x), fx = x - col, fy = v * rows - row;
      return {id:((col % cols) + cols) % cols + row * cols, j:cl(Math.min(Math.min(fx, 1 - fx) * 22, Math.min(fy, 1 - fy) * 9))}; };
    const map = colorTex(512, 512, (u, v) => { const q = at(u, v), t = tone[q.id], k = (.82 + a(u, v) * .26) * (.86 + t * .24), soot = Math.max(0, b(u, v) - .6) * .5;
      const c = t < .2 ? [.48, .24, .18] : t < .7 ? [.6, .3, .21] : [.55, .33, .24];
      return [lerp(.78, c[0] * k - soot * .1, q.j), lerp(.77, c[1] * k - soot * .08, q.j), lerp(.74, c[2] * k - soot * .06, q.j)]; }, [1 / .9, 1 / .9]);
    const normalMap = normalTex(256, 256, (u, v) => at(u, v).j * .8 + a(u, v) * .2, .006, [1 / .9, 1 / .9]);
    return new THREE.MeshStandardMaterial({name:'brickwall', map, normalMap, normalScale:new THREE.Vector2(.9, .9), roughness:.92, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}
// 투수 포장 (강변 산책로 · 자전거 도로): 잔 알갱이가 박힌 포장에 눈가루. tone이 바탕색. uv 1 = 1m, 한 장이 4m.
export function permeableMaterial({seed = 121, tone = [.78, .7, .58], dust = .25} = {}){
  return once('permeable' + seed + tone + dust, () => {
    const a = noise2(seed, [128, 256]), b = noise2(seed + 1, [3, 6, 12]), c = noise2(seed + 2, [256]);
    const map = colorTex(256, 256, (u, v) => { const sp = c(u, v) > .8 ? .07 : c(u, v) < .2 ? -.05 : 0, ds = cl((b(u, v) - .55) * 4) * dust, k = .9 + a(u, v) * .16 + sp;
      return [tone[0] * k + ds, tone[1] * k + ds, tone[2] * k + ds]; }, [1 / 4, 1 / 4]);
    const normalMap = normalTex(128, 128, (u, v) => a(u, v), .006, [1, 1]);
    return new THREE.MeshStandardMaterial({name:'permeable', map, normalMap, normalScale:new THREE.Vector2(.6, .6), roughness:.95, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}

// 타일 외벽: 20 × 10cm 타일을 줄 맞춰 붙이고 줄눈은 옅은 회색. 색은 정점 색으로 준다 (베이지 · 회색 · 녹회색). uv 1 = 1m, 한 장이 1m.
export function tileWallMaterial({seed = 131} = {}){
  return once('tilewall' + seed, () => {
    const r = rng(seed), cols = 5, rows = 10, tone = Array.from({length:cols * rows}, () => r()), a = noise2(seed + 1, [8, 16, 32]), b = noise2(seed + 2, [3, 6]);
    const at = (u, v) => { const row = Math.floor(v * rows), col = Math.floor(u * cols), fx = u * cols - col, fy = v * rows - row; return {id:col + row * cols, j:cl(Math.min(Math.min(fx, 1 - fx) * 30, Math.min(fy, 1 - fy) * 15))}; };
    const map = colorTex(256, 256, (u, v) => { const q = at(u, v), k = (.9 + tone[q.id] * .1) * (.95 + a(u, v) * .08) - Math.max(0, b(u, v) - .62) * .25; return [lerp(.7, k, q.j), lerp(.7, k, q.j), lerp(.7, k * 1.01, q.j)]; }, [1, 1]);
    const normalMap = normalTex(128, 128, (u, v) => at(u, v).j, .004, [1, 1]);
    return new THREE.MeshStandardMaterial({name:'tilewall', map, normalMap, normalScale:new THREE.Vector2(.6, .6), roughness:.6, metalness:0, vertexColors:true, envMapIntensity:LOOK.envIntensity});
  });
}

// 반복 무늬 깨기 (2026-11-17): 넓은 바닥 재질에서 같은 타일이 눈에 띄지 않게 한다.
//   ① 같은 텍스처를 돌리고 크기를 바꿔 한 번 더 읽어, 큰 얼룩 노이즈로 두 결과를 섞는다 ② 아주 큰 노이즈로 밝기를 조금씩 바꾼다.
//   세계 좌표(xz)를 써서 바닥판마다 이어진다. strength: 밝기 변화 폭.
export function antiTile(mat, {strength = .22, mixScale = .045, macroScale = .011} = {}){
  if (!mat || mat.userData.antiTile) return mat; mat.userData.antiTile = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vAtW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAtW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vAtW;
float atH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float atN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(atH(i), atH(i + vec2(1.0, 0.0)), f.x), mix(atH(i + vec2(0.0, 1.0)), atH(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 atA = texture2D(map, vMapUv);
  vec2 atUv = mat2(0.8, -0.6, 0.6, 0.8) * vMapUv * 0.73 + vec2(0.37, 0.19);
  vec4 atB = texture2D(map, atUv);
  float atM = smoothstep(0.3, 0.7, atN(vAtW * ${mixScale.toFixed(4)}) * 0.65 + atN(vAtW * ${(mixScale * 2.7).toFixed(4)} + 3.1) * 0.35);
  vec4 sampledDiffuseColor = mix(atA, atB, atM);
  sampledDiffuseColor.rgb *= 1.0 - ${(strength / 2).toFixed(3)} + ${strength.toFixed(3)} * atN(vAtW * ${macroScale.toFixed(4)} + 11.7);
  diffuseColor *= sampledDiffuseColor;
#endif`); };
  mat.customProgramCacheKey = () => 'antiTile' + strength + mixScale + macroScale;
  mat.needsUpdate = true; return mat;
}
