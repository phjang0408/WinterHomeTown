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
// (2026-11-21) 가운데 큰 글: 자동 줄바꿈을 끄고(left:50% 때문에 화면 절반 폭에서 꺾이던 문제),
// 화면 폭에 안 들어가는 글만 미리 띄어쓰기 자리에서 \n으로 나눈다. 모바일에서 '후~ 다 먹었다. 속까지 따뜻해!' 같은 글.
const emW = t => [...t].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 1 : .56), 0);
function wrapLines(text, maxEm){
  if (text.includes('\n') || emW(text) <= maxEm) return text;
  const cut = []; for (let i = 1; i < text.length - 1; i++) if (text[i] === ' ') cut.push(i);
  if (!cut.length) return text;
  let best = cut[0], bw = Infinity;
  for (const i of cut) { const w = Math.max(emW(text.slice(0, i)), emW(text.slice(i + 1))) + (text[i - 1] === '·' || text[i + 1] === '·' ? -.8 : 0); if (w < bw) { bw = w; best = i; } }
  const a = text.slice(0, best).replace(/\s*·$/, ''), b = text.slice(best + 1).replace(/^·\s*/, '');
  return wrapLines(a, maxEm) + '\n' + wrapLines(b, maxEm);
}
export function flash(text){
  const f = document.getElementById('flash'); f.style.whiteSpace = 'pre'; f.style.textAlign = 'center';
  const fs = parseFloat(getComputedStyle(f).fontSize) || 34, maxEm = (Math.min(innerWidth, 900) - 48) / (fs * 1.04);
  f.textContent = wrapLines(String(text), maxEm); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}

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
