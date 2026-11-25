// 키보드·마우스·터치 입력. 왼쪽 화면을 끌면 조이스틱, 그 외에는 시점 회전.
import * as THREE from '../lib/three.js';
import { canvas, camera } from './engine.js';
import { S } from './state.js';
import { clamp, wrapA } from './util.js';
import { current, doAction, doAlt, stopActivity } from '../activities/registry.js';
import { hud } from '../ui/hud.js';

// (2026-11-25) 이동은 WASD만, 방향키는 전부 시점: ← → 좌우로 돌리기, ↑ ↓ 위아래로 보기
const KEYMAP = {KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',ArrowLeft:'camL',ArrowRight:'camR',ArrowUp:'camU',ArrowDown:'camD',ShiftLeft:'run',ShiftRight:'run'};
// (2026-11-24) 시점을 위로: 음수 피치면 카메라가 캐릭터보다 낮아져 올려다본다 (마우스 · 터치 같이)
export const PITCH_MIN = -.55;
export const freeMove = () => S.mode === 'walk' || !!(current() && current().free);
// 시점 돌리기 · 화면 조이스틱을 쓸 수 있는지 (자유 이동이거나, 놀이가 ctl을 켰을 때: 썰매)
export const camFree = () => freeMove() || !!(current() && current().ctl);

export function initInput({onEnter, onWave, onEscape, onMap}){
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'BUTTON' && (e.code === 'Enter' || e.code === 'Space')) return;
    if (S.mode === 'intro') { if (e.code === 'Enter') onEnter(); return; }
    if (KEYMAP[e.code]) { S.keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { if (!e.repeat && !hud.modalOpen()) doAction(); if (e.code === 'Space') e.preventDefault(); }
    else if (e.code === 'KeyR') { if (!e.repeat && !hud.modalOpen()) doAlt(); }
    else if (e.code === 'Digit1') onWave();
    else if (e.code === 'KeyM') { if (!e.repeat && onMap) onMap(); }   // (2026-11-24) 큰 지도
    else if (e.code === 'Escape') { if (!onEscape() && S.game) stopActivity(); }
  });
  window.addEventListener('keyup', e => { if (KEYMAP[e.code]) S.keys[KEYMAP[e.code]] = false; });
  window.addEventListener('blur', () => { for (const k in S.keys) S.keys[k] = false; });

  const ptrs = new Map(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), joyEl = document.getElementById('joy'), knob = joyEl.firstElementChild; let pinch = 0;
  canvas.addEventListener('pointerdown', e => {
    if (S.mode === 'intro') return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.pointerType === 'touch' && camFree() && !S.joy && e.clientX > window.innerWidth * .55) {   // (2026-11-25) UI 좌우 반전: 조이스틱은 오른쪽 (오른손 엄지)
      S.joy = {id:e.pointerId, sx:e.clientX, sy:e.clientY, vx:0, vy:0, m:0};
      joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; knob.style.transform = ''; joyEl.hidden = false; return;
    }
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, t:performance.now()});
    if (ptrs.size === 2) { const a = [...ptrs.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    if (camFree()) canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', e => {
    const J = S.joy;
    if (J && e.pointerId === J.id) { let dx = e.clientX - J.sx, dy = e.clientY - J.sy; const d = Math.hypot(dx, dy), R = 52; if (d > R) { dx *= R / d; dy *= R / d; }
      J.vx = dx / R; J.vy = dy / R; J.m = Math.min(1, d / R); knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; return; }
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2 && pinch) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); S.cam.dist = clamp(S.cam.dist * pinch / d, 3, 18); pinch = d; return; }
    if (camFree()) { const k = e.pointerType === 'touch' ? .008 : .006; S.cam.yaw = wrapA(S.cam.yaw - dx * k); S.cam.pitch = clamp(S.cam.pitch + dy * k * .8, PITCH_MIN, 1.2); }
  });
  const end = e => { if (S.joy && e.pointerId === S.joy.id) { S.joy = null; joyEl.hidden = true; return null; }
    const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0; if (!ptrs.size) canvas.classList.remove('drag'); return p; };
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerup', e => {
    const p = end(e), a = current(); if (!p || !a || !a.onTap) return;
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 10 || performance.now() - p.t > 600) return;
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); ray.setFromCamera(ndc, camera);
    a.onTap(ray.ray);
  });
  canvas.addEventListener('wheel', e => { S.cam.dist = clamp(S.cam.dist * (e.deltaY > 0 ? 1.1 : .9), 3, 18); e.preventDefault(); }, {passive:false});
}
// 방향키 ←→ 로 시점 돌리기
export function turnCamera(dt){ if (!camFree()) return; const K = S.keys; S.cam.yaw = wrapA(S.cam.yaw + ((K.camL ? 1 : 0) - (K.camR ? 1 : 0)) * 1.9 * dt);
  if (K.camU || K.camD) S.cam.pitch = clamp(S.cam.pitch + ((K.camD ? 1 : 0) - (K.camU ? 1 : 0)) * 1.1 * dt, PITCH_MIN, 1.2); }   // ↑ = 위를 본다(피치 감소), ↓ = 내려다본다
