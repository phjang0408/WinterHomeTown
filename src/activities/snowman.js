// 함께 만드는 눈사람 (2026-11-19)
//   1) 공원 가운데 눈밭에서 E로 눈덩이를 굴린다. 정해진 거리(ROLL)를 굴리면 정해진 크기가 되고 저절로 든다.
//   2) 들고 가서 눈사람 자리에 보탠다. 몸통 5개 → 머리 3개. 머리까지 다 차면 눈 · 코 · 입 · 팔이 저절로 붙는다.
//   3) 완성되고 3분이 지나면 녹아 없어지고 처음부터 다시 만든다 (마지막 15초 동안 녹는 모습).
//
// 동기화: 서버 없이 각자의 상태(presence)에 눈사람 상태를 같이 싣는다 → net/protocol.js의 sw
//   sw = [시작 시각, 완성 시각, 사람 번호, 보탠 개수, ...]. 같은 눈사람(시작 시각이 같음)이면 사람별 개수를 큰 쪽으로 합친다.
//   그래서 동시에 보태도 개수가 사라지지 않고, 보탠 사람이 나가도 남은 사람이 계속 들고 있다.
//   다른 눈사람이면 개수가 많은 쪽, 같으면 나중에 시작한 쪽을 따른다. 다 녹은 상태는 받지 않는다.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { S } from '../core/state.js';
import { sfx, flash, puff } from '../core/fx.js';
import { mesh, pillSprite } from '../core/gfx.js';
import { ST, UNIT } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { snowmanRig, ballGeo, SNOWMAN } from '../props/snowmanCoop.js';
import { snowAOMaterial } from '../core/texkit.js';
import { me } from '../entities/player.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, stopActivity } from './registry.js';
import { SNOW } from '../map/layout.js';

export const RULE = {BODY:5, HEAD:3, ROLL:16, MELT:180000, FADE:15000};   // ROLL: 다 굴리는 거리(게임 단위, 약 13.6m)
const NEED = RULE.BODY + RULE.HEAD, R0 = .1 * UNIT, R1 = SNOWMAN.BALL * UNIT, SITE = SNOW.site, F = SNOW.field;
const inField = (x, z) => x > F.x0 && x < F.x1 && z > F.z0 && z < F.z1;
const axis = new THREE.Vector3();

// ── 같이 쓰는 눈사람 상태 ──
const SM = {t0:0, tc:0, c:new Map()};
const total = () => { let n = 0; SM.c.forEach(v => { n += v; }); return n; };
const dead = (tc, now) => tc > 0 && now > tc + RULE.MELT;
const sumOf = c => c.reduce((a, p) => a + p[1], 0);
function publish(){ const a = [SM.t0, SM.tc]; [...SM.c].sort((p, q) => q[1] - p[1]).slice(0, 8).forEach(([u, n]) => a.push(u, Math.min(8, n))); me.sw = SM.t0 ? a : []; }
function reset(){ SM.t0 = 0; SM.tc = 0; SM.c.clear(); publish(); }
function consider(w){
  if (!w || dead(w.tc, Date.now())) return;
  if (w.t0 === SM.t0) {
    let ch = false;
    w.c.forEach(([u, n]) => { if ((SM.c.get(u) || 0) < n) { SM.c.set(u, n); ch = true; } });
    if (w.tc && (!SM.tc || w.tc < SM.tc)) { SM.tc = w.tc; ch = true; }
    if (ch) publish(); return;
  }
  const a = sumOf(w.c), b = total();
  if (!SM.t0 || a > b || (a === b && w.t0 > SM.t0)) { SM.t0 = w.t0; SM.tc = w.tc; SM.c = new Map(w.c); publish(); }
}
const phase = n => n < RULE.BODY ? '몸통 ' + n + '/' + RULE.BODY : n < NEED ? '머리 ' + (n - RULE.BODY) + '/' + RULE.HEAD : '완성';

// ── 화면에 보이는 것 ──
let rig, label, labelText = '', shown = -1, bumpAt = -1e9, hit, myBall;
function setLabel(text){
  if (text === labelText) return; labelText = text;
  if (label) { root.remove(label); label.material.map.dispose(); label.material.dispose(); }
  label = pillSprite(text, 'rgba(255,255,255,.92)', '#2b3f55', .8); label.position.set(SITE.x, W.groundY(SITE.x, SITE.z) + 4.3, SITE.z); root.add(label);
}
function rollBall(m, w, r, moved){
  const dx = Math.sin(w.r), dz = Math.cos(w.r); m.scale.setScalar(r); m.position.set(w.x + dx * (r + .5), W.groundY(w.x, w.z) + r * .96, w.z + dz * (r + .5));
  if (moved > 0) { axis.set(dz, 0, -dx); m.rotateOnWorldAxis(axis, moved / Math.max(.15, r)); }
}
// 든 눈덩이: 가슴 앞, 두 팔을 앞으로
function holdBall(m, w, ch, r){
  const dx = Math.sin(w.r), dz = Math.cos(w.r), y = ch ? ch.position.y : W.groundY(w.x, w.z);
  m.scale.setScalar(r); m.position.set(w.x + dx * (r + .38), y + 1.05, w.z + dz * (r + .38));
  if (ch) { const u = ch.userData; u.armL.rotation.x = u.armR.rotation.x = -1.15; u.armL.rotation.z = -.42; u.armR.rotation.z = .42; }
}
const newBall = () => { const m = mesh(ballGeo(), snowAOMaterial(), 0, 0, 0, root); m.castShadow = true; m.visible = false; return m; };

function updateSnowman(now){
  const wall = Date.now();
  if (SM.t0 && dead(SM.tc, wall)) reset();
  let n = total();
  if (n >= NEED && !SM.tc) { SM.tc = wall; publish(); }
  n = Math.min(n, NEED);
  const melt = SM.tc ? Math.min(1, Math.max(0, (wall - (SM.tc + RULE.MELT - RULE.FADE)) / RULE.FADE)) : 0;
  if (n !== shown) {
    if (n > shown && shown >= 0) { bumpAt = now; puff(SITE.x, W.groundY(SITE.x, SITE.z) + 1.4, SITE.z, 10);
      if (n === NEED && Math.hypot(me.x - SITE.x, me.z - SITE.z) < 60) { flash('눈사람 완성! 3분 뒤에 녹아요'); sfx(520, 1040, .5, 'triangle'); } }
    shown = n;
  }
  rig.set(Math.min(n, RULE.BODY) / RULE.BODY, Math.max(0, n - RULE.BODY) / RULE.HEAD, n >= NEED, melt);
  const e = (now - bumpAt) / 1000; rig.obj.scale.setScalar(e < .5 ? 1 + .09 * Math.sin(e * Math.PI * 4) * (1 - e / .5) : 1);   // 보탤 때 통 튀는 모습
  hit[2] = n > 0 && melt < .8 ? SNOWMAN.RB * Math.cbrt(Math.min(n, RULE.BODY) / RULE.BODY) * UNIT * .92 : 0;   // 충돌 반지름 (W.circle 항목을 직접 바꾼다)
  if (n >= NEED) { const left = Math.max(0, Math.ceil((SM.tc + RULE.MELT - wall) / 1000)); setLabel(melt > 0 ? '녹는 중...' : '완성! 녹기까지 ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0')); }
  else setLabel(n === 0 ? '눈덩이를 굴려 와요 · 몸통 0/' + RULE.BODY : phase(n));
}
const complete = () => total() >= NEED;

// ── 놀이 ──
function hudRoll(){
  const g = S.game, near = inField(me.x, me.z);
  hud.stat('지금 눈사람: ' + phase(Math.min(total(), NEED)));
  hud.gauge(g.carry ? '다 굴렸어요! 눈사람 자리로 가져가세요' : near ? '눈밭을 걸어 눈덩이를 굴려요' : '눈밭 안에서 굴려야 커져요', false);
}
function deposit(){
  if (complete()) { flash('눈사람이 벌써 다 만들어졌어요'); stopActivity(); return; }
  if (!SM.t0) SM.t0 = Date.now();
  SM.c.set(me.uid, Math.min(8, (SM.c.get(me.uid) || 0) + 1));
  if (total() >= NEED && !SM.tc) SM.tc = Date.now();
  publish(); me.sc[2] = Math.min(100, me.sc[2] + 1);
  sfx(300, 460, .2); stopActivity();
  const n = Math.min(total(), NEED); if (n < NEED) flash('눈덩이를 보탰어요 · ' + phase(n));
}

const snowman = defineActivity({
  id:'snow', st:ST.SNOW, score:{index:2, label:'눈사람', unit:'개'}, free:true,
  get speedMul(){ return S.game && S.game.carry ? .85 : .9; },
  setup(){
    rig = snowmanRig(); rig.obj.position.set(SITE.x, W.groundY(SITE.x, SITE.z), SITE.z); root.add(rig.obj);
    W.circle(SITE.x, SITE.z, 0); hit = W.circles[W.circles.length - 1];
    spotLabel('함께 눈사람 만들기', SITE.x, W.groundY(SITE.x, SITE.z) + 5.4, SITE.z);
    myBall = newBall(); reset(); updateSnowman(0);
  },
  offer(offer){
    if (complete() || !inField(me.x, me.z)) return;
    offer(Math.hypot(me.x - SITE.x, me.z - SITE.z) < 4 ? 0 : 50, 99, '눈덩이 굴리기', snowman.start);
  },
  start(){ begin(snowman, {rolled:0, carry:false}); me.ballR = R0; hud.showGame('눈사람 만들기'); hud.zone(0, 0); hud.needle(0); hudRoll(); },
  prompt(){
    if (!S.game.carry || Math.hypot(me.x - SITE.x, me.z - SITE.z) > hit[2] + 3.2) return null;
    if (complete()) return {label:'눈덩이 내려놓기', run:() => { puff(myBall.position.x, myBall.position.y, myBall.position.z, 8); stopActivity(); }};
    return {label:total() < RULE.BODY ? '몸통에 보태기' : '머리에 보태기', run:deposit};
  },
  quit(){ me.ballR = 0; myBall.visible = false; },
  frame(dt, now, moved){
    updateSnowman(now);
    if (S.mode !== 'snow') return;
    const g = S.game; myBall.visible = true;
    if (!g.carry) {
      if (inField(me.x, me.z)) g.rolled = Math.min(RULE.ROLL, g.rolled + moved);
      me.ballR = R0 + (R1 - R0) * g.rolled / RULE.ROLL; rollBall(myBall, me, me.ballR, moved); hud.needle(g.rolled / RULE.ROLL);
      if (g.rolled >= RULE.ROLL) { g.carry = true; me.st = ST.CARRY; me.ballR = R1; sfx(440, 660, .15); flash('번쩍! 눈사람 자리로 가져가요'); }
    } else holdBall(myBall, me, me.char, R1);
    const key = g.carry + '|' + inField(me.x, me.z) + '|' + total(); if (g.key !== key) { g.key = key; hudRoll(); }
  },
  remote(R, p){ consider(p.sw); R.ball = p.ball; },
  remoteFrame(R, dt, moved){
    const on = R.ball > 0 && (R.st === ST.SNOW || R.st === ST.CARRY);
    if (on && !R.ballM) R.ballM = newBall();
    if (!R.ballM) return;
    R.ballM.visible = on; if (!on) return;
    if (R.st === ST.CARRY) holdBall(R.ballM, R, R.char, R.ball); else rollBall(R.ballM, R, R.ball, moved);
  },
  remoteDrop(R){ if (R.ballM) { root.remove(R.ballM); R.ballM = null; } },
});
