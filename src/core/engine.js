// 렌더러·장면·조명·메인 루프. 다른 모듈은 onFrame()으로 매 프레임 작업을 등록한다.
import * as THREE from '../lib/three.js';
import { setRoot } from './gfx.js';
import { setupRenderer, makeLights, makeEnvironment, LOOK } from './look.js';
import { QUALITY } from './quality.js';

export const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({canvas, antialias:QUALITY.aa, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.dpr));   // (2026-11-24) 화질 단계의 배율 상한 (core/quality.js)
renderer.shadowMap.enabled = true; renderer.shadowMap.type = QUALITY.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
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
sun.shadow.mapSize.set(QUALITY.shadow, QUALITY.shadow);
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.14;
// (2026-11-27 최적화) 그림자 전용 층(layer 1): LOD가 있는 소품(벤치 · 차 · 겨울나무)은 가까이서도 그림자만 단순 모델로 그린다 (world.js lodShadows)
sun.shadow.camera.layers.enable(1);
// (2026-11-27 최적화) 그림자 지도는 해(그림자 카메라)가 움직인 프레임엔 꼭, 아니면 두 프레임에 한 번만 다시 그린다 → 서 있을 때 그림자 패스 절반.
//   움직이는 차 · 사람 그림자는 초당 30번 갱신. camera.js snapSun이 해를 옮기면 SHADOW.moved를 켠다
export const SHADOW = {moved:true, n:0};
renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
export function shadowRange(r){ const c = sun.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 10; c.far = 340; c.updateProjectionMatrix(); }
shadowRange(280);

export const root = new THREE.Group(); scene.add(root); setRoot(root);

export function resize(){
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

const tasks = [];
// order가 작을수록 먼저 실행된다. (입력 0 → 이동 10 → 놀이 20 → 효과 30 → 카메라 90)
export const frameStats = {cpu:0};   // 한 프레임 CPU 시간(ms): 성능 창이 읽는다
export function onFrame(fn, order = 50){ tasks.push({fn, order}); tasks.sort((a, b) => a.order - b.order); }
// (2026-11-25) 후처리(core/post.js 필름 효과)가 화면 그리기를 맡을 수 있다. 없으면 바로 그린다.
let renderHook = null;
export function setRenderHook(fn){ renderHook = fn; }
export const FRAME = {cap:0};   // (2026-11-26) 절전(core/saver.js): 초당 그리기 상한. 0이면 화면 주사율 그대로
export function start(){
  let last = performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    if (FRAME.cap && now - last < 1000 / FRAME.cap - 3) return;   // 건너뛴 프레임은 계산도 그리기도 하지 않는다
    const dt = Math.min(.05, (now - last) / 1000); last = now; const t0 = performance.now();
    for (const t of tasks) t.fn(dt, now);
    renderer.shadowMap.needsUpdate = SHADOW.moved || FRAME.cap > 0 || (++SHADOW.n & 1) === 0; SHADOW.moved = false;
    if (renderHook) renderHook(scene, camera); else renderer.render(scene, camera);
    frameStats.cpu = performance.now() - t0;
  }
  requestAnimationFrame(frame);
}
