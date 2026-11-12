// 렌더러·장면·조명·메인 루프. 다른 모듈은 onFrame()으로 매 프레임 작업을 등록한다.
import * as THREE from '../lib/three.js';
import { setRoot } from './gfx.js';
import { setupRenderer, makeLights, makeEnvironment, LOOK } from './look.js';

export const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
setupRenderer(renderer);

// 맑은 겨울 낮: 파란 하늘빛이 그늘을 푸르게 물들이고, 낮게 뜬 해가 긴 그림자를 만든다.
export const SKY = {zenith:0x2f7bd2, mid:0x79b6ec, horizon:0xd5e9f6};
export const FOG = SKY.horizon;
export const scene = new THREE.Scene();
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.Fog(FOG, 170, 980);
export const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 1900);
const lights = makeLights();
export const hemi = lights.hemi, sun = lights.sun;
scene.add(hemi, lights.amb);
export const SUN_OFF = new THREE.Vector3(-70, 78, 75);
scene.environment = makeEnvironment(renderer, SUN_OFF);   // PBR 소품의 하늘 반사광
scene.add(sun, sun.target); sun.castShadow = true;
const small = Math.min(window.innerWidth, window.innerHeight) < 700;
sun.shadow.mapSize.set(small ? 2048 : 4096, small ? 2048 : 4096);
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.14;
export function shadowRange(r){ const c = sun.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 10; c.far = 340; c.updateProjectionMatrix(); }
shadowRange(280);

export const root = new THREE.Group(); scene.add(root); setRoot(root);

function resize(){
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

const tasks = [];
// order가 작을수록 먼저 실행된다. (입력 0 → 이동 10 → 놀이 20 → 효과 30 → 카메라 90)
export function onFrame(fn, order = 50){ tasks.push({fn, order}); tasks.sort((a, b) => a.order - b.order); }
export function start(){
  let last = performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (const t of tasks) t.fn(dt, now);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
