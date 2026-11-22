// 연날리기 (2026-11-20): 얼음 썰매장 서쪽 연 가게에서 방패연을 받아 날린다.
//   (2026-11-21) 얼레 감기: E를 누르고 있거나 화면의 얼레를 빙빙 돌리면 연이 올라가고, 놓으면 조금씩 내려온다. 바람이 셀 때와 걸을 때 더 잘 뜬다.
//   R: 연 보기(서서 연을 올려다보는 시점) ↔ 걸으며 날리기(보통 시점, 방향키가 평소대로). 반납은 '그만하기'(Esc).
//   동기화(비용 절감): 내 연은 내 화면에서만 계산하고, 다른 사람에게는 높이(정수 m) 하나만 보낸다(protocol의 kt).
//   다른 사람 화면에서는 그 높이를 부드럽게 따라가면서, 흔들림은 각자 화면에서 반복 애니메이션으로 만든다.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { S } from '../core/state.js';
import { sfx, flash } from '../core/fx.js';
import { ST, UNIT } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { buildProp } from '../props/registry.js';
import { me } from '../entities/player.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, stopActivity } from './registry.js';
import { KITE } from '../map/layout.js';

const K = {MIN:1.5, MAX:45, SIZE:2.4, PULL:1.3};                // 높이(게임 단위), 연 배율, 한 번 당길 때 오르는 속도
const WD = new THREE.Vector3(KITE.wind[0], 0, KITE.wind[1]).normalize(), SIDE = new THREE.Vector3(-WD.z, 0, WD.x);
const ST_ = KITE.stall, front = (() => { const c = Math.cos(ST_.rot), s = Math.sin(ST_.rot); return {x:ST_.x + 1.3 * s, z:ST_.z + 1.3 * c}; })();
const wind = t => Math.max(.1, Math.min(1, .55 + .3 * Math.sin(t * .21) + .15 * Math.sin(t * .67 + 1)));
const TOPS = [0xd23c32, 0xe8b02a, 0x3c9a5a, 0x2f5fa8];

// 연 한 벌: 연 + 줄(처진 곡선). 내 것과 다른 사람 것 모두 이걸로 그린다
function makeFlyer(color){
  const kite = buildProp('bangpaeKite', {top:color}); kite.scale.setScalar(K.SIZE); kite.traverse(m => { if (m.isMesh) m.castShadow = false; }); root.add(kite);
  const N = 18, line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:N}, () => new THREE.Vector3())), new THREE.LineBasicMaterial({color:0x3a3f45}));
  line.frustumCulled = false; root.add(line);
  return {kite, line, N, h:3};
}
function dropFlyer(f){ if (!f) return; root.remove(f.kite); root.remove(f.line); f.line.geometry.dispose(); }
const A = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Vector3(), Q = new THREE.Vector3();
// 손(hand)에서 h 높이로 띄운 연 위치와 줄을 맞춘다. t: 흔들림 시간, seed: 사람마다 다른 흔들림
function placeFlyer(f, x, y, z, h, t, seed){
  A.set(x, y + 1.25, z);
  const dist = 2.5 + h * .75, sway = Math.sin(t * .9 + seed) * (.6 + h * .05), bob = Math.sin(t * 1.7 + seed * 2) * .3;
  P.copy(A).addScaledVector(WD, dist).addScaledVector(SIDE, sway); P.y = y + h + bob;
  f.kite.position.copy(P); f.kite.lookAt(A); f.kite.rotateZ(Math.sin(t * 1.3 + seed) * .25); f.kite.rotateX(-.25);
  C.copy(A).lerp(P, .5); C.y -= dist * .12 + 1;                                           // 줄이 아래로 처진다
  const pos = f.line.geometry.getAttribute('position');
  for (let i = 0; i < f.N; i++) { const u = i / (f.N - 1); Q.set(0, 0, 0).addScaledVector(A, (1 - u) * (1 - u)).addScaledVector(C, 2 * u * (1 - u)).addScaledVector(P, u * u); pos.setXYZ(i, Q.x, Q.y, Q.z); }
  pos.needsUpdate = true;
}
// 줄 잡은 오른팔
function holdArm(ch){ if (!ch) return; const u = ch.userData; u.armR.rotation.x = -1.9; u.armR.rotation.z = .35; }

let mine = null;
// ── 얼레 (2026-11-21): 연타 대신 '감기'. E(또는 화면 E 버튼)를 누르고 있거나, 얼레 그림을 빙빙 돌리면 줄이 감겨 연이 올라간다.
//    (2026-11-22) E 누르기는 없앴다: 얼레 원판만 돌린다. 시계 방향 = 감기(연이 오른다), 반대 방향 = 풀기(연이 내려온다).
//    가만두면 줄이 조금씩 풀리며 천천히 내려온다(바람이 세면 버틴다). 살은 돌린 만큼 그대로 돈다.
const REEL = {spin:0, ang:0, el:null, drag:null};
function makeReel(){
  const el = document.createElement('div'); el.id = 'reel'; el.hidden = true;
  // (2026-11-22 2차) 오른쪽으로: R 버튼(오른쪽 아래, 높이 약 44px) 바로 위에 붙인다. 화면이 낮으면(가로 모바일) 미니맵과 겹치지 않게 R 버튼 왼쪽에
  const small = innerHeight < 560;
  el.style.cssText = 'position:fixed;' + (small ? 'right:160px;bottom:64px' : 'right:14px;bottom:' + (matchMedia('(pointer:coarse)').matches ? 188 : 184) + 'px') + ';z-index:25;width:' + (small ? 140 : 170) + 'px;padding:8px 10px 10px;background:rgba(16,18,20,.8);border:1px solid rgba(255,255,255,.2);border-top:2px solid #e3a53b;' +
    'color:#eceae4;font:600 12px var(--body, sans-serif);touch-action:none;user-select:none';
  el.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>얼레</span><span id="reel-h"></span></div>' +
    '<svg id="reel-svg" viewBox="-50 -50 100 100" width="' + (small ? 112 : 148) + '" height="' + (small ? 112 : 148) + '" style="display:block;margin:0 auto;cursor:grab">' +
    '<circle r="46" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.35)" stroke-width="3"/><circle r="10" fill="#e3a53b"/>' +
    '<g id="reel-spokes" stroke="#eceae4" stroke-width="4">' + [0, 60, 120].map(a => '<line x1="-40" y1="0" x2="40" y2="0" transform="rotate(' + a + ')"/>').join('') + '</g>' +
    '<circle r="26" fill="none" stroke="#e3a53b" stroke-width="2" stroke-dasharray="4 5"/>' +
    // (2026-11-22) 화살표와 글을 원판 아래쪽에 둔다: 아래쪽에서 반시계(감기)는 오른쪽으로, 시계(풀기)는 왼쪽으로 움직이므로 글 위치와 도는 방향이 맞는다
    '<defs><marker id="rh" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="context-stroke"/></marker></defs>' +
    '<path d="M 10 46 A 47 47 0 0 0 36 30" fill="none" stroke="#e3a53b" stroke-width="3" marker-end="url(#rh)"/>' +
    '<path d="M -10 46 A 47 47 0 0 1 -36 30" fill="none" stroke="#a7adb0" stroke-width="3" marker-end="url(#rh)"/></svg>' +
    '<div style="display:flex;justify-content:space-between;margin-top:3px;color:#a7adb0;font-size:11px"><span>← 풀기</span><span style="color:#e3a53b">감기 →</span></div>' +
    '<div id="reel-w" style="text-align:center;margin-top:3px;color:#a7adb0"></div>';
  document.body.appendChild(el); REEL.el = el;
  // 빙빙 돌리기: 얼레 가운데를 기준으로 손가락 · 마우스가 돈 각도만큼. 시계 방향은 +(감기), 반대는 -(풀기)
  const svg = el.querySelector('#reel-svg'), angOf = e => { const r = svg.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2); };
  svg.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); svg.setPointerCapture(e.pointerId); REEL.drag = angOf(e); svg.style.cursor = 'grabbing'; });
  svg.addEventListener('pointermove', e => { if (REEL.drag === null) return; const a = angOf(e), d = Math.atan2(Math.sin(a - REEL.drag), Math.cos(a - REEL.drag)); REEL.drag = a; REEL.spin -= d; REEL.ang += d; });   // (2026-11-22) 반시계 = 감기
  const up = () => { REEL.drag = null; svg.style.cursor = 'grab'; }; svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
}
const kite = defineActivity({
  id:'kite', st:ST.KITE, free:true,
  get speedMul(){ return S.game && S.game.view ? .7 : .95; },             // (2026-11-22) 연 보기 중에도 천천히 걷는다 (W = 화면 앞)
  setup(){
    W.place('kiteStall', {x:ST_.x, z:ST_.z, rot:ST_.rot});
    spotLabel('연날리기', ST_.x, W.groundY(ST_.x, ST_.z) + 3.4, ST_.z);
    W.mmCircle(ST_.x, ST_.z, 1.6, '#e4572e');
  },
  offer(offer){ const d = Math.hypot(me.x - front.x, me.z - front.z); if (d < 2.6) offer(d, 2.6, '연 받기', kite.start); },
  start(){
    if (!REEL.el) makeReel();
    begin(kite, {h:3, v:0, best:3, view:false}); me.kt = [3]; REEL.spin = 0;
    dropFlyer(mine); mine = makeFlyer(TOPS[me.ci % TOPS.length]);
    hud.showGame('연날리기'); REEL.el.hidden = false;
    flash('얼레를 반시계 방향으로 돌리면 감기, 시계 방향은 풀기'); sfx(500, 700, .12);
  },
  // R: 연 보기 ↔ 연 날리기 (보기: 서서 연을 올려다보는 시점, 날리기: 걸어 다니는 보통 시점). 반납은 '그만하기'
  alt(){ const g = S.game; return {label:g && g.view ? '걸으며 날리기' : '연 보기', run:() => { g.view = !g.view; }}; },
  camera(want, look){ const g = S.game; if (!mine || !g || !g.view) return false; const k = mine.kite.position, y = me.char ? me.char.position.y : 0;
    want.set(me.x - WD.x * (6 + g.h * .2) + SIDE.x * 2.5, y + 2.2 + g.h * .15, me.z - WD.z * (6 + g.h * .2) + SIDE.z * 2.5); look.set(me.x + (k.x - me.x) * .7, y + 1.2 + (k.y - y - 1.2) * .7, me.z + (k.z - me.z) * .7);
    S.cam.yaw = Math.atan2(want.x - look.x, want.z - look.z); return true; },   // (2026-11-22) 이동 기준(yaw)을 지금 보는 방향에 맞춘다: W가 화면 앞(연 쪽)
  prompt(){ return null; },   // (2026-11-22) E는 쓰지 않는다: 얼레 원판만 돌린다
  quit(){ dropFlyer(mine); mine = null; me.kt = [0]; REEL.drag = null; if (REEL.el) REEL.el.hidden = true; flash('연을 돌려줬어요'); },
  frame(dt, now, moved){
    if (S.mode !== 'kite' || !mine) return;
    const g = S.game, t = now / 1000, w = wind(t), run = dt > 0 ? Math.min(1.5, moved / dt / 7) : 0;
    const reel = Math.max(-1, Math.min(1, REEL.spin / Math.max(dt, 1e-3) / 9)); REEL.spin = 0;   // 돌린 빠르기와 방향 (초당 9라디안이면 최대, +감기 · -풀기)
    g.v += ((reel > 0 ? reel * (1.6 + w * 1.8) : reel < 0 ? -.9 + w * .4 + reel * 2.6 : -.9 + w * .75) - g.h * .015 + run * .9) * dt; g.v *= Math.exp(-1.1 * dt);
    g.h = Math.min(K.MAX, Math.max(K.MIN, g.h + g.v * dt)); if (g.h <= K.MIN && g.v < 0) g.v = 0;
    g.best = Math.max(g.best, g.h); me.kt = [Math.round(g.h)];
    placeFlyer(mine, me.x, me.char ? me.char.position.y : W.groundY(me.x, me.z), me.z, g.h, t, 0); holdArm(me.char);
    if (REEL.drag === null) REEL.ang += Math.max(0, -g.v) * 1.5 * dt;                            // 손을 놓으면 줄이 풀리는 만큼 살이 거꾸로 돈다
    const sp = REEL.el.querySelector('#reel-spokes'); sp.setAttribute('transform', 'rotate(' + (REEL.ang * 57.3).toFixed(1) + ')');
    const m = Math.round(g.h * .85), wl = w > .75 ? '셈' : w > .45 ? '보통' : '약함';
    const ht = m + 'm', wt = '바람 ' + wl + (g.h < 2.5 ? ' · 감아요!' : '');
    if (g.ht !== ht) { g.ht = ht; REEL.el.querySelector('#reel-h').textContent = ht; hud.stat('최고 ' + Math.round(g.best * .85) + 'm'); }
    if (g.wt !== wt) { g.wt = wt; REEL.el.querySelector('#reel-w').textContent = wt; }
  },
  remote(R, p){ R.kt = p.kt ? p.kt[0] : 0; },
  remoteFrame(R, dt){
    const on = R.st === ST.KITE && R.kt > 0;
    if (on && !R.flyer) R.flyer = makeFlyer(TOPS[Math.max(0, R.ci) % TOPS.length]);
    if (!on) { if (R.flyer) { dropFlyer(R.flyer); R.flyer = null; } return; }
    R.flyer.h += (R.kt - R.flyer.h) * Math.min(1, dt * 1.5);
    placeFlyer(R.flyer, R.x, R.char ? R.char.position.y : W.groundY(R.x, R.z), R.z, R.flyer.h, performance.now() / 1000, ([...String(R.id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) * .9); holdArm(R.char);
  },
  remoteDrop(R){ dropFlyer(R.flyer); R.flyer = null; },
});
