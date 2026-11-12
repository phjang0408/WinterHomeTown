// 키보드·마우스·터치 입력. 왼쪽 화면을 끌면 조이스틱, 그 외에는 시점 회전.
import * as THREE from '../lib/three.js';
import { canvas, camera } from './engine.js';
import { S } from './state.js';
import { clamp, wrapA } from './util.js';
import { current, doAction, stopActivity } from '../activities/registry.js';
import { hud } from '../ui/hud.js';

const KEYMAP = {KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',KeyD:'right',ArrowLeft:'camL',ArrowRight:'camR',ShiftLeft:'run',ShiftRight:'run'};
export const freeMove = () => S.mode === 'walk' || !!(current() && current().free);

export function initInput({onEnter, onWave, onEscape}){
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'BUTTON' && (e.code === 'Enter' || e.code === 'Space')) return;
    if (S.mode === 'intro') { if (e.code === 'Enter') onEnter(); return; }
    if (KEYMAP[e.code]) { S.keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { if (!e.repeat && !hud.modalOpen()) doAction(); if (e.code === 'Space') e.preventDefault(); }
    else if (e.code === 'Digit1') onWave();
    else if (e.code === 'Escape') { if (!onEscape() && S.game) stopActivity(); }
  });
  window.addEventListener('keyup', e => { if (KEYMAP[e.code]) S.keys[KEYMAP[e.code]] = false; });
  window.addEventListener('blur', () => { for (const k in S.keys) S.keys[k] = false; });

  const ptrs = new Map(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), joyEl = document.getElementById('joy'), knob = joyEl.firstElementChild; let pinch = 0;
  canvas.addEventListener('pointerdown', e => {
    if (S.mode === 'intro') return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.pointerType === 'touch' && freeMove() && !S.joy && e.clientX < window.innerWidth * .45) {
      S.joy = {id:e.pointerId, sx:e.clientX, sy:e.clientY, vx:0, vy:0, m:0};
      joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; knob.style.transform = ''; joyEl.hidden = false; return;
    }
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, t:performance.now()});
    if (ptrs.size === 2) { const a = [...ptrs.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    if (freeMove()) canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', e => {
    const J = S.joy;
    if (J && e.pointerId === J.id) { let dx = e.clientX - J.sx, dy = e.clientY - J.sy; const d = Math.hypot(dx, dy), R = 52; if (d > R) { dx *= R / d; dy *= R / d; }
      J.vx = dx / R; J.vy = dy / R; J.m = Math.min(1, d / R); knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; return; }
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2 && pinch) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); S.cam.dist = clamp(S.cam.dist * pinch / d, 3, 18); pinch = d; return; }
    if (freeMove()) { const k = e.pointerType === 'touch' ? .008 : .006; S.cam.yaw = wrapA(S.cam.yaw - dx * k); S.cam.pitch = clamp(S.cam.pitch + dy * k * .8, .05, 1.2); }
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
export function turnCamera(dt){ if (freeMove()) S.cam.yaw = wrapA(S.cam.yaw + ((S.keys.camL ? 1 : 0) - (S.keys.camR ? 1 : 0)) * 1.9 * dt); }
