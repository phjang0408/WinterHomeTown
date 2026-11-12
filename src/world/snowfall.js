// 카메라 주변에만 내리는 눈. 맑은 하늘에서 햇빛을 받으며 떨어지는 둥근 눈송이, 가까운 층과 먼 층 두 겹.
import * as THREE from '../lib/three.js';
import { scene } from '../core/engine.js';
import { canvasTex } from '../core/gfx.js';
import { reduceMotion } from '../config.js';
const layers = [];
export function initSnow(){
  const tex = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  [{n:reduceMotion ? 250 : 1100, size:.34, box:70, fall:2.2, op:.95}, {n:reduceMotion ? 250 : 1500, size:.2, box:150, fall:1.7, op:.8}].forEach(L => {
    const pos = new Float32Array(L.n * 3);
    for (let i = 0; i < L.n; i++) { pos[i * 3] = (Math.random() - .5) * L.box; pos[i * 3 + 1] = Math.random() * 50; pos[i * 3 + 2] = (Math.random() - .5) * L.box; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({map:tex, color:0xffffff, size:L.size, transparent:true, opacity:L.op, depthWrite:false, fog:false}));
    pts.frustumCulled = false; scene.add(pts); layers.push({pts, fall:L.fall});
  });
}
export function updateSnow(dt, now, center){
  for (const L of layers) {
    const a = L.pts.geometry.attributes.position, arr = a.array;
    for (let i = 0; i < arr.length; i += 3) { arr[i + 1] -= (L.fall + (i % 7) * .22) * dt; arr[i] += Math.sin(now / 900 + i) * .3 * dt; arr[i + 2] += Math.cos(now / 1300 + i * 1.7) * .18 * dt; if (arr[i + 1] < 0) arr[i + 1] = 50; }
    a.needsUpdate = true; L.pts.position.set(center.x, center.y - 12, center.z);
  }
}
