// 달리는 차: 노란 마을버스(순환 도로), 강변도로 · 북쪽 도로의 승용차 · SUV · 경차 · 트럭 · 탑차. 앞에 사람이 있으면 멈춘다.
// 모두 새 방식 차량 소품(props/cars.js, props/bus.js)을 쓴다. 우측 통행.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { PI, lerpAngle } from '../core/util.js';
import { S } from '../core/state.js';
import { buildProp } from '../props/registry.js';
import { LOOP, ROAD, NROAD } from '../map/layout.js';

const list = [];
function makePath(pts){ const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return {pts, cum, len:cum[cum.length - 1]}; }
function pathAt(P, s){ s = ((s % P.len) + P.len) % P.len; const c = P.cum; let i = 1; while (i < c.length - 1 && c[i] < s) i++;
  const a = P.pts[i - 1], b = P.pts[i], L = c[i] - c[i - 1], u = (s - c[i - 1]) / L; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (b[0] - a[0]) / L, (b[1] - a[1]) / L]; }
export function addVehicle(obj, pts, o = {}){ root.add(obj); list.push({obj, P:makePath(pts), s:o.s || 0, v:0, max:o.max || 8, r:o.r || 0, half:o.half || 2.2, wrap:!!o.wrap}); }
// 모서리를 둥글게 도는 사각 순환 경로 (시계 방향 점 목록, 반지름 r)
function roundLoop(corners, r, n = 5){
  const out = [];
  corners.forEach((c, i) => { const a = corners[(i + corners.length - 1) % corners.length], b = corners[(i + 1) % corners.length];
    const da = Math.hypot(c[0] - a[0], c[1] - a[1]), db = Math.hypot(b[0] - c[0], b[1] - c[1]);
    const p0 = [c[0] + (a[0] - c[0]) / da * r, c[1] + (a[1] - c[1]) / da * r], p1 = [c[0] + (b[0] - c[0]) / db * r, c[1] + (b[1] - c[1]) / db * r];
    for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); } });
  out.push(out[0].slice()); return out;
}

export function setupVehicles(){
  // 마을버스: 서쪽 도로를 북쪽으로 → 윗길 도로를 동쪽으로 → 동쪽 도로를 남쪽으로 → 남쪽 뒷길 도로를 서쪽으로 (오른쪽 차로)
  const xl = LOOP.x0 + LOOP.w * .75, xr = LOOP.x1 - LOOP.w * .75, zt = LOOP.zN + LOOP.w * .75, zb = LOOP.zS + LOOP.w * .25;
  addVehicle(buildProp('townBus'), roundLoop([[xl, zt], [xr, zt], [xr, zb], [xl, zb]], 4.5), {max:6.5, half:5.6});
  // 강변도로: 남쪽 두 차로는 동쪽으로, 북쪽 두 차로는 서쪽으로. 맵 밖에서 돌아 다시 들어온다.
  const RM = (ROAD.z0 + ROAD.z1) / 2, kinds = [['carSedan', 0xe8eaec], ['carSUV', 0x2b2e33], ['carMini', 0xd9a520], ['carSedan', 0x8f2f2a], ['truck1t', 0x2e5fa3], ['carSUV', 0x9aa3ab], ['deliveryVan', 0xeceeee], ['carSedan', 0x2f4a6e], ['carMini', 0xe9ebec], ['carSedan', 0x39424d]];
  const car = (i, v) => { const [n, c] = kinds[i % kinds.length]; return buildProp(n, {color:c, v, snow:.6}); };
  [[RM + 2.2, 1], [RM + 6, 1], [RM - 2.2, -1], [RM - 6, -1]].forEach(([z, d], lane) => { for (let k = 0; k < 2; k++) { const i = lane * 2 + k;
    addVehicle(car(i, i), d > 0 ? [[-260, z], [900, z]] : [[900, z], [-260, z]], {s:k * 580 + lane * 170, max:10 + (i % 3), r:d > 0 ? PI / 2 : -PI / 2, half:2.8}); } });
  // 북쪽 도로 (들어갈 수 없는 길): 차 넷
  const NM = (NROAD.z0 + NROAD.z1) / 2;
  [[NM + 3, 1], [NM - 3, -1]].forEach(([z, d], lane) => { for (let k = 0; k < 2; k++) { const i = 8 + lane * 2 + k;
    addVehicle(car(i, i), d > 0 ? [[-260, z], [900, z]] : [[900, z], [-260, z]], {s:k * 560 + lane * 260, max:11, r:d > 0 ? PI / 2 : -PI / 2, half:2.8}); } });
}
function walkerAhead(x, z, dx, dz, half){
  const test = w => { const rx = w.x - x, rz = w.z - z, along = rx * dx + rz * dz, lat = Math.abs(rx * dz - rz * dx); return along > 0 && along < half + 6 && lat < 2.4; };
  if (S.mode !== 'intro' && test(S.me)) return true;
  for (const R of S.remotes.values()) if (test(R)) return true;
  return false;
}
export function updateVehicles(dt){
  for (const V of list) {
    const p = pathAt(V.P, V.s), stop = walkerAhead(p[0], p[1], p[2], p[3], V.half);
    V.v += ((stop ? 0 : V.max) - V.v) * Math.min(1, dt * (stop ? 6 : 1.2)); V.s += V.v * dt;
    const q = pathAt(V.P, V.s), jump = Math.hypot(q[0] - V.obj.position.x, q[1] - V.obj.position.z) > 50;    // 맵 밖에서 처음으로 돌아갈 때는 방향을 바로 맞춘다
    V.obj.position.set(q[0], 0, q[1]); const want = Math.atan2(q[2], q[3]); V.r = jump ? want : lerpAngle(V.r, want, Math.min(1, dt * 5)); V.obj.rotation.y = V.r;
  }
}
