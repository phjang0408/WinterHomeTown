// 바닥 꾸밈: 같은 바닥 무늬가 끝없이 되풀이되어 어색해 보이지 않게, 바닥판 위에 여러 가지 메쉬를 흩어 놓는다 (2026-11-15 사용자 요청).
//   얼룩 판 (납작한 메쉬, 가장자리가 흐려진다): 눈 쌓인 자리, 녹은 물 자국, 마른 풀 · 흙 드러난 자리, 밝고 어두운 큰 얼룩,
//     아스팔트 덧씌운 자리 · 금 · 바퀴 자국 · 길가 눈 줄. 모양은 매번 다르게(시드 고정) 만든다.
//   입체: 눈 더미(경계석 · 벽 · 나무 밑), 마른 풀 포기(화단 · 자갈밭).
//   붉은 벽돌 바닥은 꾸미지 않는다. 얼룩 판은 바닥판 바로 위(+8mm)에 깔리므로, 그 위에 더 높은 바닥(길 · 보도)이 덮으면 가려진다.
//   얼룩 판 전체가 그리기 1회, 입체는 종류별 인스턴스.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { W } from '../world/world.js';
import { noise2, normalTex, colorTex } from '../core/texkit.js';
import { mulberry } from '../props/kit.js';
import { LOOK } from '../core/look.js';
import { ROAD, NROAD, LOOP, PLAY } from './layout.js';

const R = mulberry(4242), rr = (a, b) => a + R() * (b - a);
const pos = [], col = [], uv = [], idx = [];
const C = {snow:[.97, .98, 1], slush:[.36, .38, .41], wet:[.3, .31, .33], grass:[.53, .49, .33], soil:[.44, .37, .3], dark:[.2, .21, .23], light:[1, 1, 1], patch:[.16, .17, .19], crack:[.12, .13, .14], leaf:[.5, .36, .22]};
// 불규칙한 얼룩: 가운데 → 안쪽 고리(진하게) → 바깥 고리(투명). rx · rz는 반지름, ang은 회전, a는 진하기.
function blot(x, z, y, rx, rz, ang, c, a, {n = 14, rough = .28, hard = .62} = {}){
  const base = pos.length / 3, ca = Math.cos(ang), sa = Math.sin(ang), ph = R() * 9, ph2 = R() * 9;
  const put = (lx, lz, al) => { pos.push(x + lx * ca - lz * sa, y, z + lx * sa + lz * ca); uv.push(x + lx, z + lz); col.push(c[0], c[1], c[2], al); };
  put(0, 0, a);
  for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2, w = 1 + rough * (Math.sin(t * 3 + ph) * .6 + Math.sin(t * 5 + ph2) * .4);
    put(Math.cos(t) * rx * w * hard, Math.sin(t) * rz * w * hard, a); put(Math.cos(t) * rx * w * (1 + rough * .5), Math.sin(t) * rz * w * (1 + rough * .5), 0); }
  for (let k = 0; k < n; k++) { const i0 = base + 1 + k * 2, i1 = base + 1 + ((k + 1) % n) * 2;
    idx.push(base, i1, i0, i0, i1, i1 + 1, i0, i1 + 1, i0 + 1); }
}
// 띠 (바퀴 자국 · 길가 눈 줄 · 금): 점 목록을 따라 폭 w, 가운데 진하고 양옆 투명
function strip(pts, y, w, c, a, soft = true){
  const base = pos.length / 3;
  pts.forEach((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    const ww = w * (.7 + R() * .6), end = i === 0 || i === pts.length - 1 ? 0 : 1;
    [[-1, 0], [0, a * end], [1, 0]].forEach(([s, al]) => { pos.push(p[0] + nx * ww * s, y, p[1] + nz * ww * s); uv.push(p[0], p[1]); col.push(c[0], c[1], c[2], soft ? al : a * end); }); });
  for (let i = 0; i < pts.length - 1; i++) { const b = base + i * 3; idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5); }
}
const line = (x0, z0, x1, z1, n, jit) => Array.from({length:n + 1}, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * t + (i && i < n ? rr(-jit, jit) : 0), z0 + (z1 - z0) * t + (i && i < n ? rr(-jit, jit) : 0)]; });

// 바닥 종류별로 무엇을 얼마나 흩을지 (넓이 100단위²당 개수)
const RULE = {
  asphalt:{blots:[['slush', .5, 1.2, 3.5, .35], ['dark', .25, 3, 7, .18], ['light', .2, 3, 6, .12], ['patch', .12, 1.2, 2.8, .82], ['snow', .25, .6, 1.6, .85]], cracks:.5},
  zone:{blots:[['slush', .4, 1, 3, .3], ['light', .2, 3, 6, .14], ['snow', .2, .5, 1.4, .8]]},
  paver:{blots:[['snow', 1.2, .5, 1.8, .9], ['wet', .5, .8, 2.2, .3], ['dark', .25, 2, 5, .15], ['leaf', .15, .4, 1, .5]]},
  bed:{blots:[['grass', .45, 1.5, 4.5, .55], ['soil', .15, .8, 2, .4], ['snow', .35, 1.2, 3.5, .9], ['light', .2, 3, 7, .25]], tufts:.5},
  snowbed:{blots:[['grass', .18, 1.2, 3.5, .45], ['light', .2, 3, 7, .3]], tufts:.12},
  gravel:{blots:[['snow', .9, .8, 4.5, .92], ['grass', .4, 1.5, 5, .55], ['wet', .3, 1.5, 4, .25], ['dark', .25, 3, 8, .18], ['light', .15, 4, 9, .15]], tufts:.7},
  perm:{blots:[['snow', .6, .6, 2.2, .88], ['wet', .35, 1, 2.6, .25], ['dark', .2, 3, 7, .14], ['leaf', .1, .5, 1.2, .45]]},
  bike:{blots:[['snow', .4, .6, 1.8, .85], ['wet', .3, 1, 2.6, .25], ['light', .15, 3, 6, .12]]},
};

export function decorateGround(regions, curbs, trees){
  const higher = (x, z, y) => regions.some(r => r[5] > y + .005 && x > r[1] && x < r[3] && z > r[2] && z < r[4]);   // 더 높은 바닥이 덮는 자리
  const tufts = [[], [], []], drifts = [[], [], [], []];
  // 아파트단지 맨바닥(화단)과 단지 안 도로도 같은 규칙으로 꾸민다 (단지 안 3D 소품은 빼고 얼룩만)
  const all = [...regions, ['bed', 13, 93, 186, 246, .012, 'flatOnly'], ['asphalt', 50, 131, 195, 139, .045, 'flatOnly'], ['asphalt', 50, 131, 58, 206, .045, 'flatOnly'], ['asphalt', 50, 198, 195, 206, .045, 'flatOnly']];
  for (const [key, x0, z0, x1, z1, y, flag] of all) {
    const rule = RULE[key]; if (!rule) continue;
    const area = (x1 - x0) * (z1 - z0), Y = y + .008, cx0 = Math.max(x0, -60), cx1 = Math.min(x1, 700);   // 맵 밖으로 길게 뻗은 바닥은 보이는 곳까지만
    const A = Math.max(0, (cx1 - cx0) * (z1 - z0));
    for (const [kind, per, r0, r1, a] of rule.blots) { const n = Math.round(A / 100 * per * (.8 + R() * .4));
      for (let i = 0; i < n; i++) { const r = rr(r0, r1), ar = rr(.5, 1), rx = Math.min(r, (cx1 - cx0) / 2), rz = Math.min(r * ar, (z1 - z0) / 2), x = rr(cx0 + rx * .6, cx1 - rx * .6), z = rr(z0 + rz * .6, z1 - rz * .6);
        const keep = [pos.length, col.length, uv.length, idx.length], inPlay = x + rx * 1.3 > PLAY[0] && x - rx * 1.3 < PLAY[2] && z + rx > PLAY[1] && z - rx < PLAY[3];
        if (kind === 'patch') blot(x, z, Y, rx * 1.3, rz * .8, R() < .5 ? 0 : Math.PI / 2, C.patch, a, {n:8, rough:.06, hard:.95});     // 덧씌운 아스팔트: 모서리가 또렷한 네모에 가깝게
        else blot(x, z, Y + (kind === 'snow' ? .002 : 0), rx, rz, R() * 6, C[kind], a * rr(.75, 1.1), {rough:kind === 'snow' ? .35 : .25});
        // (2026-11-27) 놀이터 바닥(높이 0.02)과 단지 얼룩(0.02)이 같은 높이라 번쩍였다 → 놀이터에 걸친 얼룩은 지운다 (난수 순서는 그대로 두려고 만든 뒤 되돌림)
        if (inPlay) { pos.length = keep[0]; col.length = keep[1]; uv.length = keep[2]; idx.length = keep[3]; } } }
    if (rule.cracks) for (let i = 0, n = Math.round(A / 100 * rule.cracks); i < n; i++) { const x = rr(cx0, cx1), z = rr(z0, z1), ang = R() * 6, L = rr(1.5, 5), m = 6;
      const pts = Array.from({length:m + 1}, (_, k) => [x + Math.cos(ang) * L * k / m + rr(-.15, .15), z + Math.sin(ang) * L * k / m + rr(-.15, .15)]).filter(p => p[1] > z0 + .2 && p[1] < z1 - .2);
      if (pts.length > 2) strip(pts, Y + .001, .035, C.crack, .8, false); }
    if (flag === 'flatOnly') continue;
    // 3D: 마른 풀 포기 (더 높은 바닥이 덮은 자리, 막힌 자리는 뺀다)
    if (rule.tufts) for (let i = 0, n = Math.round(A / 100 * rule.tufts); i < n; i++) { const x = rr(cx0 + .5, cx1 - .5), z = rr(z0 + .5, z1 - .5);
      if (!higher(x, z, y) && !W.rects.some(q => x > q[0] && x < q[2] && z > q[1] && z < q[3]) && !W.circles.some(c => Math.hypot(x - c[0], z - c[1]) < c[2] + .3)) tufts[i % 3].push({x, z, y, rot:R() * 6, s:rr(.7, 1.3)}); }
  }
  // 도로: 차가 다니는 자리에 녹은 눈 바퀴 자국, 길가(연석 쪽)에 눈 줄
  const RM = (ROAD.z0 + ROAD.z1) / 2, NM = (NROAD.z0 + NROAD.z1) / 2, wheel = .55;
  const tracks = (x0, x1, z, y, along = 'x') => { for (let x = x0; x < x1;) { const L = rr(8, 30); if (R() < .7) [-wheel, wheel].forEach(o => strip(along === 'x' ? line(x, z + o, Math.min(x1, x + L), z + o + rr(-.2, .2), Math.ceil(L / 3), .08) : line(z + o, x, z + o + rr(-.2, .2), Math.min(x1, x + L), Math.ceil(L / 3), .08), y, .22, C.slush, .32)); x += L + rr(2, 10); } };
  [RM - 6, RM - 2.2, RM + 2.2, RM + 6].forEach(z => tracks(-60, 700, z, .033)); [NM - 3, NM + 3].forEach(z => tracks(-60, 700, z, .033));
  [LOOP.zN + 1.75, LOOP.zN + 5.25, LOOP.zS + 1.75, LOOP.zS + 5.25].forEach(z => tracks(LOOP.x0 + 7, LOOP.x1 - 7, z, .033));
  [LOOP.x0 + 1.75, LOOP.x0 + 5.25, LOOP.x1 - 1.75, LOOP.x1 - 5.25].forEach(x => tracks(90, ROAD.z0, x, .033, 'z'));
  const edgeSnow = (x0, x1, z, y, along = 'x') => { for (let x = x0; x < x1;) { const L = rr(4, 18); if (R() < .75) strip(along === 'x' ? line(x, z, Math.min(x1, x + L), z, Math.ceil(L / 2), .12) : line(z, x, z, Math.min(x1, x + L), Math.ceil(L / 2), .12), y + .002, rr(.25, .55), C.snow, .9); x += L + rr(1, 6); } };
  [[ROAD.z0 + .5], [ROAD.z1 - .5], [NROAD.z0 + .45], [NROAD.z1 - .45], [LOOP.zN + .4], [LOOP.zN + 6.6], [LOOP.zS + .4], [LOOP.zS + 6.6]].forEach(([z]) => edgeSnow(z < 100 || z > 250 ? -60 : LOOP.x0 + 7, z < 100 || z > 250 ? 700 : LOOP.x1 - 7, z, .033));
  [LOOP.x0 + .4, LOOP.x0 + 6.6, LOOP.x1 - .4, LOOP.x1 - 6.6].forEach(x => edgeSnow(90, ROAD.z0, x, .033, 'z'));
  // 3D 눈 더미: 경계석을 따라 군데군데, 나무 밑
  for (const [x0, z0, x1, z1, h, cy] of curbs) { const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0); if (L < 3) continue;
    const a0 = along ? Math.max(Math.min(x0, x1), -60) : Math.min(z0, z1), a1 = along ? Math.min(Math.max(x0, x1), 700) : Math.max(z0, z1);
    for (let t = a0 + rr(0, 8); t < a1; t += rr(6, 16)) { const x = along ? t : (x0 + x1) / 2 + rr(-.4, .4), z = along ? (z0 + z1) / 2 + rr(-.4, .4) : t, gy = W.groundY(x, z, cy || 0);   // 육교 밑 경계석의 눈 더미가 육교 위로 올라가지 않게 (경계석 높이 기준)
      drifts[Math.floor(R() * 4)].push({x, z, y:gy + h * .2, rot:along ? rr(-.3, .3) : Math.PI / 2 + rr(-.3, .3), s:rr(.6, 1.2)}); } }
  trees.bare.forEach(list => list.forEach(t => { if (R() < .35) drifts[Math.floor(R() * 4)].push({x:t.x + rr(-.6, .6), z:t.z + rr(-.6, .6), y:(t.y ?? W.groundY(t.x, t.z, 0)) + .1, rot:R() * 6, s:rr(.5, .8)}); }));
  tufts.forEach((list, v) => W.placeMany('grassTuft', list, {v, collide:false}));
  drifts.forEach((list, v) => W.placeMany('snowDrift', list, {v, collide:false}));
  // 얼룩 판 그리기
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); { const n = g.getAttribute('normal'); for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); }
  const a = noise2(907, [32, 64, 128]), b = noise2(908, [8, 16]);
  const map = colorTex(256, 256, (u, v) => { const k = .86 + a(u, v) * .24 + (b(u, v) - .5) * .1; return [k, k, k]; }, [1 / 3, 1 / 3]);
  const mat = new THREE.MeshStandardMaterial({name:'groundDecal', vertexColors:true, transparent:true, depthWrite:false, map, normalMap:normalTex(128, 128, (u, v) => a(u, v), .005, [1 / 2, 1 / 2]), roughness:.92, metalness:0, envMapIntensity:LOOK.envIntensity});
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.renderOrder = 1; m.userData.split = {cell:110, far:300}; root.add(m);   // (2026-11-24) 맵 전체 한 장 → 110m 칸으로 잘라 화면 밖 · 먼 칸을 뺀다 (world/batch.js)
  return {blots:idx.length / 3, tufts:tufts.reduce((s, l) => s + l.length, 0), drifts:drifts.reduce((s, l) => s + l.length, 0)};
}
