// 하늘, 먼 산, 강 건너 마을, 맵 바깥 숲. 걸어갈 수 없는 배경.
import * as THREE from '../lib/three.js';
import { scene, root, onFrame, SKY, FOG, SUN_OFF } from '../core/engine.js';
import { M, box, canvasTex } from '../core/gfx.js';
import { sr, srand, TAU } from '../core/util.js';
import { W } from '../world/world.js';
import { BANK } from './layout.js';

export let sky = null;
// 하늘 셰이더는 색을 화면에 바로 쓰므로 색 관리 변환 없이 원래 sRGB 값을 그대로 넘긴다.
const raw = hex => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
export function buildScenery(){
  // 하늘: 천정은 짙은 파랑, 지평선은 옅은 하늘색. 해와 햇무리, 천천히 흐르는 뭉게구름을 셰이더로 그린다.
  const sunDir = SUN_OFF.clone().normalize();
  sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), new THREE.ShaderMaterial({
    side:THREE.BackSide, fog:false, depthWrite:false,
    uniforms:{uZen:{value:raw(SKY.zenith)}, uMid:{value:raw(SKY.mid)}, uHor:{value:raw(SKY.horizon)}, uSun:{value:sunDir}, uTime:{value:0}},
    vertexShader:'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:`
      uniform vec3 uZen, uMid, uHor, uSun; uniform float uTime; varying vec3 vDir;
      float hash(vec2 p){ p = fract(p * vec2(.1031, .1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
      float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.; a *= .5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float h = max(d.y, 0.);
        vec3 col = mix(uHor, uMid, smoothstep(0., .2, h)); col = mix(col, uZen, smoothstep(.12, .8, h));
        float sd = max(dot(d, uSun), 0.);
        col += vec3(1., .94, .8) * (pow(sd, 28.) * .22 + pow(sd, 5.) * .08);
        if (d.y > .015) {
          vec2 p = d.xz / (d.y + .14) * 1.25 + vec2(uTime * .004, uTime * .0016);
          float c = fbm(p), m = smoothstep(.5, .74, c) * smoothstep(.015, .14, d.y);
          float shade = smoothstep(.45, .95, fbm(p + uSun.xz * .22));
          col = mix(col, mix(vec3(1.), vec3(.78, .85, .93), shade * .7), m * .93);
        }
        col = mix(col, vec3(1., .98, .9), smoothstep(.99935, .9997, sd));
        col += vec3(1., .95, .82) * pow(sd, 420.) * .6;
        gl_FragColor = vec4(col, 1.);
      }`}));
  sky.renderOrder = -1; scene.add(sky);
  onFrame((dt, now) => { sky.material.uniforms.uTime.value = now / 1000; }, 95);

  // 먼 산: 뾰족한 봉우리 대신 겹겹이 포개진 능선. 멀수록 옅고 푸르게 보인다.
  const fogC = new THREE.Color(FOG);
  const ridge = (R, hMin, hMax, top, mid) => {
    const K = 48, N = 240, tab = []; for (let i = 0; i < K; i++) tab.push(srand());
    const n1 = t => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return tab[i % K] * (1 - u) + tab[(i + 1) % K] * u; };
    const rows = [[0, fogC], [.5, new THREE.Color(mid).lerp(fogC, .55)], [.86, new THREE.Color(mid)], [1, new THREE.Color(top)]];
    const pos = [], col = [], idx = [], c = new THREE.Color();
    for (let i = 0; i <= N; i++) { const a = i / N * TAU, t = i / N * K;
      const hgt = hMin + (hMax - hMin) * (n1(t) * .7 + n1(t * 2 + 7) * .22 + n1(t * 4 + 19) * .08), lum = .96 + n1(t * 2 + 3) * .08;
      rows.forEach((r, k) => { pos.push(320 + Math.cos(a) * R, -14 + (hgt + 14) * r[0], 190 + Math.sin(a) * R); c.copy(r[1]); if (k === 2) c.multiplyScalar(lum); col.push(c.r, c.g, c.b); }); }
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const p = i * 4 + k, q = p + 4; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors:true, fog:false, side:THREE.DoubleSide})); m.frustumCulled = false; root.add(m);
  };
  ridge(1080, 120, 215, 0xbcd3ea, 0xacc7e4);
  ridge(900, 70, 150, 0xa9c5e2, 0x93b4d8);
  ridge(740, 30, 95, 0x98b8da, 0x7ea2ca);
  for (let x = -400; x < 1000; x += sr(16, 30)) { const h = sr(8, 26), w = sr(8, 16), z = sr(485, 515);
    box(x, z, x + w, z + sr(6, 12), h, M(srand() < .5 ? 0xe6e2da : 0xdfe6ee), BANK + .1); }
  const deco = (x, z, i) => (i % 2 ? W.tree : W.pine).call(W, x, z, {collide:false, y:0});
  for (let i = 0; i < 120; i++) { const z = sr(-110, 272); if (z > 40 && z < 49) continue; deco(sr(-110, -4), z, i); }
  for (let i = 0; i < 120; i++) { const z = sr(-110, 272); if (z > 40 && z < 49) continue; deco(sr(644, 750), z, i); }
  for (let i = 0; i < 150; i++) deco(sr(-110, 750), sr(-110, 16), i);
  for (let i = 0; i < 100; i++) W.tree(sr(-300, 950), sr(458, 476), {collide:false, y:BANK + .1});
}
