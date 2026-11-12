// 마을버스와 강변도로 자동차. 앞에 사람이 있으면 멈춘다.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { M, box, mesh } from '../core/gfx.js';
import { PI, lerpAngle } from '../core/util.js';
import { S } from '../core/state.js';
import { makeCar } from '../props/basic.js';
import { LOOP } from '../map/layout.js';

const list = [];
function makePath(pts){ const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return {pts, cum, len:cum[cum.length - 1]}; }
function pathAt(P, s){ s = ((s % P.len) + P.len) % P.len; const c = P.cum; let i = 1; while (i < c.length - 1 && c[i] < s) i++;
  const a = P.pts[i - 1], b = P.pts[i], L = c[i] - c[i - 1], u = (s - c[i - 1]) / L; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (b[0] - a[0]) / L, (b[1] - a[1]) / L]; }
export function addVehicle(obj, pts, o = {}){ root.add(obj); list.push({obj, P:makePath(pts), s:o.s || 0, v:0, max:o.max || 8, r:o.r || 0, half:o.half || 2.2}); }

export function setupVehicles(){
  const bus = new THREE.Group();
  box(-1.15,-3.1,1.15,3.1,2.1,M(0xb5594a),.5,bus); box(-1.18,-3.0,1.18,3.0,.75,M(0xf3e7d3),1.55,bus); box(-1.2,-3.15,1.2,3.15,.16,M(0xf8fbfd),2.6,bus);
  [[-1.05,-2],[1.05,-2],[-1.05,2],[1.05,2]].forEach(p => mesh(new THREE.CylinderGeometry(.42,.42,.3,12).rotateZ(PI / 2), M(0x3c4654), p[0], .42, p[1], bus));
  const xl = LOOP.x0 + 3.5, xr = LOOP.x1 - 3.5, zt = LOOP.z0 + 3.5;
  addVehicle(bus, [[xl,260],[xl,zt],[xr,zt],[xr,260],[xl,260]], {max:6.5, half:3.2});
  [0xd9695c, 0x6f86b8, 0xe2a84b].forEach((c, i) => addVehicle(makeCar(c), [[-260,268],[900,268]], {s:i * 380, max:11, r:PI / 2}));
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
    const q = pathAt(V.P, V.s); V.obj.position.set(q[0], 0, q[1]); V.r = lerpAngle(V.r, Math.atan2(q[2], q[3]), Math.min(1, dt * 5)); V.obj.rotation.y = V.r;
  }
}
