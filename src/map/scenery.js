// 하늘, 먼 산, 강 건너 마을, 맵 바깥 숲. 걸어갈 수 없는 배경.
import * as THREE from '../lib/three.js';
import { scene, root, onFrame, SKY, FOG, SUN_OFF } from '../core/engine.js';
import { M, box, canvasTex } from '../core/gfx.js';
import { sr, srand, TAU } from '../core/util.js';
import { W } from '../world/world.js';
import { BANK } from './layout.js';
import { TREES } from './base.js';

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
  // 강 건너 (2026-11-17): 아파트 줄 대신 눈 덮인 논밭. 바닥 한 장(논둑 격자 그림) + 비닐하우스 몇 동 + 작은 창고로 가볍게
  { const tex = canvasTex(512, 512, g => {
      g.fillStyle = '#eef2f4'; g.fillRect(0, 0, 512, 512);
      const R = (() => { let t = 7; return () => (t = (t * 16807) % 2147483647) / 2147483647; })();
      for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { const x = i * 171, y = j * 128, w = 171, h = 128;      // 논 한 배미: 그루터기 줄이 보이는 눈밭
        g.fillStyle = ['#e9eef0', '#f3f5f6', '#e4e9e6', '#eef0ea'][Math.floor(R() * 4)]; g.fillRect(x + 4, y + 4, w - 8, h - 8);
        g.strokeStyle = 'rgba(150,130,100,.35)'; g.lineWidth = 2; for (let k = 10; k < h - 8; k += 9) { g.beginPath(); g.moveTo(x + 8, y + k); g.lineTo(x + w - 8, y + k); g.stroke(); } }
      g.strokeStyle = '#b9a88c'; g.lineWidth = 7; for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(i * 171, 0); g.lineTo(i * 171, 512); g.stroke(); }   // 논둑
      for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(0, j * 128); g.lineTo(512, j * 128); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(i * 171 - 1, 0); g.lineTo(i * 171 - 1, 512); g.stroke(); } });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(14, 2.2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1500, 150), new THREE.MeshLambertMaterial({map:tex}));
    m.rotation.x = -Math.PI / 2; m.position.set(320, BANK + .14, 552); m.receiveShadow = false; root.add(m);
    const hs = new THREE.Group(), film = M(0xe3ecef);
    for (let x = -260; x < 900; x += sr(70, 130)) { const z = sr(492, 540), n = 2 + Math.floor(srand() * 3);
      for (let k = 0; k < n; k++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 26, 10, 1, false, 0, Math.PI), film); h.rotation.z = Math.PI / 2;   // 반원 비닐하우스 (길이는 x 방향)
        h.position.set(x, BANK + .1, z + k * 7.5); hs.add(h); } }
    root.add(hs); }
  // 맵 바깥 숲 (2026-11-17): 옛 방식 둥근 나무 · 원뿔 나무를 지우고 새 방식 겨울 나무 · 소나무로 (수를 줄여 가볍게)
  const deco = (x, z, i, y = 0) => (i % 2 ? TREES.bare[i % 6].push({x, z, y, rot:srand() * 6, s:.95 + srand() * .35}) : TREES.pine[i % 3].push({x, z, y, rot:srand() * 6}));
  // (2026-11-17) 아파트 서쪽 · 학교 동쪽 맵 밖 숲은 없앴다 (도로 위에도 나무가 섰다). 대신 base.js에서 보도를 맵 밖으로 늘려 가로수를 심는다
  // (2026-11-18 4차) 북쪽 벽 너머 숲(겨울 나무 · 소나무 40)도 없앴다
  // (2026-11-18) 강 건너 나무는 없앴다 (논 · 비닐하우스만)
}
