// 화면 효과: 소리, 큰 글씨 알림, 눈 튀김, 눈덩이 비행, 지연 실행.
import * as THREE from '../lib/three.js';
import { root } from './engine.js';
import { M, mesh } from './gfx.js';
import { S } from './state.js';

let actx = null; export const audio = {on:true};
export function sfx(f0, f1, dur, type, vol){
  if (!audio.on) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || .07, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur); } catch (e) {}
}
export function flash(text){ const f = document.getElementById('flash'); f.textContent = text; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

const tiny = new THREE.SphereGeometry(.12,6,5), puffs = [], balls = [], timers = [];
export function puff(x, y, z, n){
  for (let i = 0; i < (n || 7); i++) { const m = mesh(tiny, M(0xfbfdfe), x, y, z); m.castShadow = false;
    puffs.push({m, vx:(Math.random() - .5) * 5, vy:Math.random() * 4 + 1, vz:Math.random() * 3 + .5, life:.45}); }
}
// 포물선으로 날아가는 눈덩이. 도착하면 onLand(x, y) 호출.
export function throwBall(s, e, onLand){ const m = mesh(new THREE.SphereGeometry(.2, 10, 8), M(0xfbfdfe), s[0], s[1], s[2]); balls.push({m, s, e, t:0, onLand}); }
// 진행 중인 놀이(S.game)가 바뀌면 취소되는 지연 실행
export const after = (ms, fn) => timers.push({at:performance.now() + ms, fn, g:S.game});

export function updateFx(dt, now){
  for (let i = timers.length - 1; i >= 0; i--) if (now >= timers[i].at) { const t = timers.splice(i, 1)[0]; if (t.g === S.game) t.fn(); }
  for (let i = balls.length - 1; i >= 0; i--) { const b = balls[i]; b.t += dt / .75; const u = Math.min(1, b.t);
    b.m.position.set(b.s[0] + (b.e[0] - b.s[0]) * u, b.s[1] + (b.e[1] - b.s[1]) * u + 8 * u * (1 - u), b.s[2] + (b.e[2] - b.s[2]) * u);
    if (u >= 1) { root.remove(b.m); balls.splice(i, 1); puff(b.e[0], b.e[1], b.e[2] + .1); if (b.onLand) b.onLand(b.e[0], b.e[1]); } }
  for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.life -= dt; p.vy -= 12 * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; p.m.scale.setScalar(Math.max(.01, p.life / .45));
    if (p.life <= 0) { root.remove(p.m); puffs.splice(i, 1); } }
}
