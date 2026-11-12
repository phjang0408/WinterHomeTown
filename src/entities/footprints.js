// 눈 위 발자국: 40초 동안 남았다가 서서히 사라진다.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { PI } from '../core/util.js';
import { W } from '../world/world.js';
import { ROAD } from '../map/layout.js';

const N = 700, fp = {i:0, x:new Float32Array(N), y:new Float32Array(N), z:new Float32Array(N), r:new Float32Array(N), t:new Float64Array(N), tick:0};
let inst = null;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
export const noPrints = [(x, z) => z > ROAD.z0 - 1 && z < ROAD.z1 + 1];   // 발자국이 안 찍히는 곳 (도로 등)

export function initFootprints(){
  const g = new THREE.CircleGeometry(.15, 8); g.rotateX(-PI / 2); g.scale(1, 1, 1.7);
  inst = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({color:0xc6d2de}), N); inst.frustumCulled = false;
  const z0 = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < N; i++) inst.setMatrixAt(i, z0); root.add(inst);
}
function set(i, sc){ p.set(fp.x[i], fp.y[i], fp.z[i]); q.setFromAxisAngle(UP, fp.r[i]); s.set(sc, 1, sc); inst.setMatrixAt(i, m4.compose(p, q, s)); inst.instanceMatrix.needsUpdate = true; }
export function trackPrints(w, moved, now){
  w.fpD = (w.fpD || 0) + moved; if (w.fpD <= .85) return; w.fpD = 0;
  if (noPrints.some(f => f(w.x, w.z))) return;
  const i = fp.i = (fp.i + 1) % N, sd = w.fpS = -(w.fpS || 1);
  fp.x[i] = w.x + Math.cos(w.r) * sd * .16; fp.z[i] = w.z - Math.sin(w.r) * sd * .16; fp.y[i] = W.groundY(fp.x[i], fp.z[i]) + .06; fp.r[i] = w.r; fp.t[i] = now; set(i, 1);
}
export function agePrints(now){
  if (now - fp.tick < 500) return; fp.tick = now;
  for (let i = 0; i < N; i++) { if (!fp.t[i]) continue; const age = (now - fp.t[i]) / 1000; if (age > 40) { fp.t[i] = 0; set(i, 0); } else if (age > 30) set(i, 1 - (age - 30) / 10); }
}
