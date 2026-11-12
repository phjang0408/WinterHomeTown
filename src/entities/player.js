// 내 캐릭터: 생성, 옷 색·이름, 카메라 기준 이동, 빙판 미끄러짐.
import { scene } from '../core/engine.js';
import { S } from '../core/state.js';
import { rnd, wrapA, lerpAngle } from '../core/util.js';
import { flash } from '../core/fx.js';
import { SPEED, RUN, ADJ, NOUN, COLORS } from '../config.js';
import { W } from '../world/world.js';
import { makeChar } from './character.js';
import { SPAWN } from '../map/layout.js';

export const nameOf = (a, n) => ADJ[a] + ' ' + NOUN[n];
let saved = {}; try { saved = JSON.parse(sessionStorage.getItem('winter-town') || '{}'); } catch (e) {}
const pick = (v, n) => Number.isInteger(v) ? v % n : rnd(n);

export const me = S.me = {
  x:SPAWN.x0, z:SPAWN.z, y:0, r:0, st:0, vx:0, vz:0, ci:pick(saved.c, COLORS.length), a:pick(saved.a, ADJ.length), n:pick(saved.n, NOUN.length),
  em:[0, 0],     // [보낸 횟수, 감정 코드] 다른 사람에게 감정 표현을 알리는 카운터
  th:[0, 0, 0],  // 눈덩이 던진 횟수와 조준점
  sm:[0, 0], slot:0, ballR:0, sc:[0, 0, 0], char:null, iceHint:false,
  onStand:null,  // 앉아 있을 때 일어나는 방법 (벤치·그네가 넣는다)
};

export function dressMe(){
  if (me.char) scene.remove(me.char);
  me.char = makeChar(me.ci); me.char.visible = S.mode !== 'intro'; scene.add(me.char);
  document.getElementById('me-name').textContent = document.getElementById('intro-name').textContent = nameOf(me.a, me.n);
  document.getElementById('me-dot').style.background = COLORS[me.ci].css;
  try { sessionStorage.setItem('winter-town', JSON.stringify({a:me.a, n:me.n, c:me.ci})); } catch (e) {}
  extrasHooks.forEach(f => f(me.char));
}
export const extrasHooks = [];   // 캐릭터에 붙는 소품(썰매 등)을 만드는 함수들

export function standUp(){ if (me.onStand) { me.onStand(); me.onStand = null; } me.st = 0; }
export function wave(){ if (S.mode === 'intro' || me.st === 2) return false; me.em = [me.em[0] + 1, 1]; return true; }

export function movePlayer(dt, speedMul = 1){
  const K = S.keys, joy = S.joy;
  let f = (K.up ? 1 : 0) - (K.down ? 1 : 0), s = (K.right ? 1 : 0) - (K.left ? 1 : 0), mag = 1;
  if (!f && !s && joy && joy.m > .15) { s = joy.vx; f = -joy.vy; mag = Math.min(1, joy.m); }
  const len = Math.hypot(f, s), onIce = W.isSlippery(me.x, me.z);
  let ix = 0, iz = 0, sp = 0;
  if (len) {
    s /= len; f /= len;
    const sy = Math.sin(S.cam.yaw), cy = Math.cos(S.cam.yaw); ix = s * cy - f * sy; iz = -s * sy - f * cy;
    if (me.st !== 0 && me.onStand) standUp();
    sp = SPEED * mag * ((K.run || (joy && joy.m > .97)) ? RUN : 1) * speedMul;
  }
  if (onIce) { const k = Math.min(1, dt * (len ? 1.1 : .35)); me.vx += (ix * sp - me.vx) * k; me.vz += (iz * sp - me.vz) * k; }
  else { me.vx = ix * sp; me.vz = iz * sp; }
  if (Math.abs(me.vx) + Math.abs(me.vz) < .02) { me.vx = me.vz = 0; return 0; }
  const ox = me.x, oz = me.z, nx = me.x + me.vx * dt, nz = me.z + me.vz * dt;
  if (!W.blocked(nx, me.z)) me.x = nx; else me.vx = 0;
  if (!W.blocked(me.x, nz)) me.z = nz; else me.vz = 0;
  if (len) me.r = wrapA(lerpAngle(me.r, Math.atan2(ix, iz), Math.min(1, dt * (onIce ? 5 : 12))));
  if (onIce && !me.iceHint) { me.iceHint = true; flash('미끄러워요'); }
  return Math.hypot(me.x - ox, me.z - oz);
}
