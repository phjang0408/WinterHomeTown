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
  x:SPAWN.x, z:SPAWN.z, y:0, r:0, st:0, vx:0, vz:0, ci:pick(saved.c, COLORS.length), a:pick(saved.a, ADJ.length), n:pick(saved.n, NOUN.length),
  em:[0, 0],     // [보낸 횟수, 감정 코드] 다른 사람에게 감정 표현을 알리는 카운터
  th:[0, 0, 0],  // 눈덩이 던진 횟수와 조준점
  uid:1 + Math.floor(Math.random() * 2147483646), sw:[], ballR:0, mg:[0, 0], kt:[0], sa:[0], it:[0, 0, 0], tk:[9, 0, 0, 0, 0, 0], ar:[0], kr:0, sn:0, sb:[9, 0, 0, 0, 0, 0, 0, 0], sitT:0, sitHold:false, seatAct:null, sc:[0, 0, 0], char:null, iceHint:false,
  onStand:null,  // 앉아 있을 때 일어나는 방법 (벤치·그네가 넣는다)
};

export function dressMe(){
  if (me.char) scene.remove(me.char);
  me.char = makeChar(me.ci); scene.add(me.char);   // (2026-11-26) 시작 화면에서도 보인다 (옷 색 미리 보기)
  nameMe();
  extrasHooks.forEach(f => f(me.char));
}
// 이름 · 색 점만 바꾼다. 불러오는 동안(캐릭터를 만들기 전)에도 '다시 뽑기'가 되게 따로 둔다.
export function nameMe(){
  const name = nameOf(me.a, me.n), css = COLORS[me.ci].css;
  document.getElementById('me-name').textContent = document.getElementById('intro-name').textContent = name;
  document.getElementById('me-dot').style.background = document.getElementById('intro-dot').style.background = css;
  try { sessionStorage.setItem('winter-town', JSON.stringify({a:me.a, n:me.n, c:me.ci})); } catch (e) {}
}
// 이름과 옷 색을 같이 다시 뽑는다 (옷 색은 지금과 다른 것으로)
export function rerollMe(){ me.a = rnd(ADJ.length); me.n = rnd(NOUN.length); me.ci = (me.ci + 1 + rnd(COLORS.length - 1)) % COLORS.length; }
export const extrasHooks = [];   // 캐릭터에 붙는 소품(썰매 등)을 만드는 함수들

export function standUp(){ if (me.onStand) { me.onStand(); me.onStand = null; } me.st = 0; me.seatAct = null; me.seatAlt = null; unstick(); }
// (2026-11-24) 일어선 자리가 충돌체 안이면(비스듬한 벤치의 충돌 상자 등) 가장 가까운 빈자리로 옮긴다: 끼여서 못 움직이던 것
function unstick(){
  if (!W.blocked(me.x, me.z, me.y)) return;
  for (let r = .25; r <= 4; r += .25) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, x = me.x + Math.cos(a) * r, z = me.z + Math.sin(a) * r;
    if (!W.blocked(x, z, me.y)) { me.x = x; me.z = z; return; } }
}
export function wave(){ if (S.mode === 'intro' || me.st === 2) return false; me.em = [me.em[0] + 1, 1]; return true; }

export function movePlayer(dt, speedMul = 1){
  const K = S.keys, joy = S.joy;
  let f = (K.up ? 1 : 0) - (K.down ? 1 : 0), s = (K.right ? 1 : 0) - (K.left ? 1 : 0), mag = 1;
  if (!f && !s && joy && joy.m > .15) { s = joy.vx; f = -joy.vy; mag = Math.min(1, joy.m); }
  // (2026-11-20) 걸어가다 타면 바로 내려지던 것: 탄 뒤 0.6초 동안, 그리고 탈 때 누르고 있던 이동 입력을 한 번 뗄 때까지 이동을 받지 않는다
  if (me.st !== 0 && me.onStand) {
    const t = performance.now();
    if (!me.sitT) { me.sitT = t; me.sitHold = !!(f || s); }
    if (!f && !s) me.sitHold = false;
    if (t - me.sitT < 600 || me.sitHold) f = s = 0;
  } else me.sitT = 0;
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
  // (2026-11-17) 한 번에 0.25씩 나눠 움직인다: 빨리 달리거나 프레임이 늦으면 얇은 난간 · 울타리를 건너뛰어 끼이던 것
  const ox = me.x, oz = me.z, n = Math.max(1, Math.ceil(Math.hypot(me.vx, me.vz) * dt / .25)), sx = me.vx * dt / n, sz = me.vz * dt / n;
  for (let i = 0; i < n; i++) {
    if (sx && !W.blocked(me.x + sx, me.z, me.y)) me.x += sx; else if (sx) me.vx = 0;
    if (sz && !W.blocked(me.x, me.z + sz, me.y)) me.z += sz; else if (sz) me.vz = 0;
    if (me.y !== undefined) me.y = Math.max(me.y, Math.min(W.groundY(me.x, me.z, me.y), me.y + .6));   // 오르막(계단)에서 발 높이가 늦게 따라와 난간 높이 판정이 어긋나지 않게
  }
  if (len) me.r = wrapA(lerpAngle(me.r, Math.atan2(ix, iz), Math.min(1, dt * (onIce ? 5 : 12))));
  if (onIce && !me.iceHint) { me.iceHint = true; flash('미끄러워요'); }
  return Math.hypot(me.x - ox, me.z - oz);
}
