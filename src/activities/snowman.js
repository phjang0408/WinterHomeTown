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
import { waving } from '../entities/character.js';
import { root } from '../core/engine.js';
import { S } from '../core/state.js';
import { sfx, flash, puff } from '../core/fx.js';
import { mesh, pillSprite, canvasTex } from '../core/gfx.js';
import { ST, UNIT, RAD } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { snowmanRig, ballGeo, SNOWMAN } from '../props/snowmanCoop.js';
import { snowAOMaterial, snowMaterial } from '../core/texkit.js';
import { me } from '../entities/player.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, stopActivity } from './registry.js';
import { SNOW } from '../map/layout.js';

// BODY · HEAD: 몸통 · 머리에 필요한 눈덩이 수. (2026-11-23) 10 · 5로 늘림 (예전 5 · 3은 테스트용) (늘려도 크기는 비율로 계산되고, 동기화는 한 사람 99개 · 16명까지 받는다).
// ROLL: 다 굴리는 거리(게임 단위, 약 13.6m). MELT: 완성 뒤 녹을 때까지, FADE: 그중 녹는 모습을 보여 주는 시간.
export const RULE = {BODY:10, HEAD:5, ROLL:16, MELT:180000, FADE:15000};
const need = () => RULE.BODY + RULE.HEAD, R0 = .1 * UNIT, R1 = SNOWMAN.BALL * UNIT, SITE = SNOW.site, F = SNOW.field;
const inField = (x, z) => x > F.x0 && x < F.x1 && z > F.z0 && z < F.z1;
const axis = new THREE.Vector3();

// ── 같이 쓰는 눈사람 상태 ──
const SM = {t0:0, tc:0, c:new Map()};
const total = () => { let n = 0; SM.c.forEach(v => { n += v; }); return n; };
const dead = (tc, now) => tc > 0 && now > tc + RULE.MELT;
const sumOf = c => c.reduce((a, p) => a + p[1], 0);
function publish(){ const a = [SM.t0, SM.tc]; [...SM.c].sort((p, q) => q[1] - p[1]).slice(0, 16).forEach(([u, n]) => a.push(u, Math.min(99, n))); me.sw = SM.t0 ? a : []; }
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
const phase = n => n < RULE.BODY ? '몸통 ' + n + '/' + RULE.BODY : n < need() ? '머리 ' + (n - RULE.BODY) + '/' + RULE.HEAD : '완성';

// ── 화면에 보이는 것 ──
let rig, label, labelText = '', shown = -1, bumpAt = -1e9, hit, myBall;
function setLabel(text){
  if (text === labelText) return; labelText = text;
  if (label) { root.remove(label); label.material.map.dispose(); label.material.dispose(); }
  label = pillSprite(text, 'rgba(255,255,255,.92)', '#2b3f55', .8); label.position.set(SITE.x, W.groundY(SITE.x, SITE.z) + 6.2, SITE.z); root.add(label);
}
function rollBall(m, w, r, moved){
  const dx = Math.sin(w.r), dz = Math.cos(w.r); m.scale.setScalar(r); m.position.set(w.x + dx * (r + .5), W.groundY(w.x, w.z) + r * .96, w.z + dz * (r + .5));
  if (moved > 0) { axis.set(dz, 0, -dx); m.rotateOnWorldAxis(axis, moved / Math.max(.15, r)); }
}
// 든 눈덩이 (2026-11-20): 머리 위로 번쩍. 두 팔을 위로 뻗고, 걸을 때 조금 흔들린다
function holdBall(m, w, ch, r){
  const y = ch ? ch.position.y : W.groundY(w.x, w.z), dx = Math.sin(w.r), dz = Math.cos(w.r), bob = ch ? Math.abs(Math.sin(ch.userData.phase || 0)) * .06 : 0;
  m.scale.setScalar(r); m.position.set(w.x + dx * .12, y + 2.05 + r * .92 + bob, w.z + dz * .12);
  // 큰 눈덩이는 두 손으로 든다. 손을 흔드는 동안만 왼손(armR)을 뗀다 (2026-11-23 흔드는 손은 왼손)
  if (ch) { const u = ch.userData; u.armL.rotation.x = -2.95; u.armL.rotation.z = .28; if (!waving(ch)) { u.armR.rotation.x = -2.95; u.armR.rotation.z = -.28; } }
}
// 눈밭과 눈사람 자리 표시 (2026-11-20 3차 더 잘 보이게): 눈밭 전체를 잔디 없이 눈으로 덮고(겹침 방지 polygonOffset), 둘레 말뚝 줄,
// 자리는 눈을 걷어 낸 맨땅 원(2026-11-21, 예전 눈 단 · 깃발 말뚝 snowmanStage는 쓰지 않는다), 눈덩이를 들고 있으면 자리 위에 내려오는 화살표가 뜬다
let arrow = null;
function markArea(){
  const cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2, gy = W.groundY(cx, cz), w = F.x1 - F.x0, d = F.z1 - F.z0;
  const g = new THREE.PlaneGeometry(w, d, 1, 1); g.rotateX(-Math.PI / 2);
  const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * d / 4);   // 눈 무늬를 4단위마다 반복
  // (2026-11-21) 눈 덮개는 잔디 칸 전체(둘레 길 가장자리까지). 밑에 잔디를 깔지 않으므로 잔디 높이(+.05)에 바로 놓는다
  const m = snowMaterial({seed:49}).clone();
  const cover = new THREE.Mesh(g, m); cover.position.set(cx, gy + .05, cz); cover.receiveShadow = true; root.add(cover);
  W.place('snowFieldFence', {x:cx, z:cz, w:(w - .5) / UNIT, d:(d - .5) / UNIT, gap:5});   // 줄 테두리는 길 가장자리에 붙인다
  // 눈사람 자리: 밧줄 · 깃발 대신 눈을 걷어 낸 맨땅 원. 가장자리는 눈과 섞이며 흐려진다
  { const rad = (SNOWMAN.RB + 1.6) * UNIT, tex = canvasTex(256, 256, (c, W2, H2) => {
      const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(150,128,102,1)'); gr.addColorStop(.62, 'rgba(160,138,110,.95)'); gr.addColorStop(.8, 'rgba(196,182,160,.6)'); gr.addColorStop(1, 'rgba(240,244,246,0)');
      c.fillStyle = gr; c.fillRect(0, 0, W2, H2);
      let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 900; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 120, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;   // 흙 알갱이 · 남은 눈 부스러기
        c.fillStyle = rnd() < .35 ? 'rgba(246,248,250,' + (.25 + rnd() * .5) * (r / 120) + ')' : 'rgba(110,92,72,' + (.15 + rnd() * .25) + ')'; c.fillRect(x, y, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
    });
    const dg = new THREE.CircleGeometry(rad, 48); dg.rotateX(-Math.PI / 2);
    const dm = new THREE.MeshLambertMaterial({map:tex, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4});
    const disk = new THREE.Mesh(dg, dm); disk.position.set(SITE.x, gy + .06, SITE.z); disk.receiveShadow = true; disk.renderOrder = 1; root.add(disk); }
  // 화살표: 빨간 원뿔(아래를 가리킨다) + 고리
  arrow = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.1, 18), new THREE.MeshLambertMaterial({color:0xe4572e, emissive:0x5a1408})); cone.rotation.x = Math.PI; arrow.add(cone);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .09, 8, 24), cone.material); ring.rotation.x = Math.PI / 2; ring.position.y = .95; arrow.add(ring);
  arrow.position.set(SITE.x, W.groundY(SITE.x, SITE.z) + 8.7, SITE.z); arrow.visible = false; root.add(arrow);
  W.mmRect(F.x0, F.z0, F.x1, F.z1, '#f4f8fb'); W.mmCircle(SITE.x, SITE.z, (SNOWMAN.RB + 1.5) * UNIT, '#a8957a');
}
const newBall = () => { const m = mesh(ballGeo(), snowAOMaterial(), 0, 0, 0, root); m.castShadow = true; m.visible = false; return m; };

function updateSnowman(now){
  const wall = Date.now();
  if (SM.t0 && dead(SM.tc, wall)) reset();
  let n = total();
  if (n >= need() && !SM.tc) { SM.tc = wall; publish(); }
  n = Math.min(n, need());
  const melt = SM.tc ? Math.min(1, Math.max(0, (wall - (SM.tc + RULE.MELT - RULE.FADE)) / RULE.FADE)) : 0;
  if (n !== shown) {
    if (n > shown && shown >= 0) { bumpAt = now; puff(SITE.x, W.groundY(SITE.x, SITE.z) + 1.8, SITE.z, 12);
      if (n === need() && Math.hypot(me.x - SITE.x, me.z - SITE.z) < 60) { flash('눈사람 완성!\n' + Math.round(RULE.MELT / 60000) + '분 뒤에 녹아요'); sfx(520, 1040, .5, 'triangle'); } }
    shown = n;
  }
  rig.set(Math.min(n, RULE.BODY) / RULE.BODY, Math.max(0, n - RULE.BODY) / RULE.HEAD, n >= need(), melt);
  const e = (now - bumpAt) / 1000; rig.obj.scale.setScalar(e < .5 ? 1 + .09 * Math.sin(e * Math.PI * 4) * (1 - e / .5) : 1);   // 보탤 때 통 튀는 모습
  hit[2] = n > 0 && melt < .8 ? SNOWMAN.RB * Math.cbrt(Math.min(n, RULE.BODY) / RULE.BODY) * UNIT * .92 : 0;   // 충돌 반지름 (W.circle 항목을 직접 바꾼다)
  // 눈사람이 커지면서 옆에 선 사람을 덮으면 끼인다 → 충돌 반지름 바깥으로 살짝 밀어낸다
  if (hit[2] > 0) { const dx = me.x - SITE.x, dz = me.z - SITE.z, d = Math.hypot(dx, dz), rr = hit[2] + RAD + .05;
    if (d < rr) { const k = d > 1e-3 ? rr / d : 1; me.x = SITE.x + (d > 1e-3 ? dx * k : rr); me.z = SITE.z + (d > 1e-3 ? dz * k : 0); } }
  if (n >= need()) { const left = Math.max(0, Math.ceil((SM.tc + RULE.MELT - wall) / 1000)); setLabel(melt > 0 ? '녹는 중...' : '완성! 녹기까지 ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0')); }
  else setLabel(phase(n));   // (2026-11-24 21차) '눈덩이를 굴려 와요' 문구는 뺐다
}
const complete = () => total() >= need();

// ── 놀이 ──
// (2026-11-22) 위 카드에는 제목과 그만하기만 둔다: 진행은 눈사람 자리 위 이름표가 보여 주고, 모바일에서 게이지가 이동 조이스틱을 가리던 것
function hudRoll(){}
function deposit(){
  if (complete()) { flash('눈사람이 벌써\n다 만들어졌어요'); stopActivity(); return; }
  if (!SM.t0) SM.t0 = Date.now();
  SM.c.set(me.uid, Math.min(99, (SM.c.get(me.uid) || 0) + 1));
  if (total() >= need() && !SM.tc) SM.tc = Date.now();
  publish(); me.sc[2] = Math.min(100, me.sc[2] + 1);
  sfx(300, 460, .2); stopActivity();
  const n = Math.min(total(), need()); if (n < need()) flash('눈덩이를 보탰어요\n' + phase(n));
}

const snowman = defineActivity({
  id:'snow', st:ST.SNOW, score:{index:2, label:'눈사람', unit:'개'}, free:true,
  get speedMul(){ return S.game && S.game.carry ? .85 : .9; },
  setup(){
    rig = snowmanRig(); rig.obj.position.set(SITE.x, W.groundY(SITE.x, SITE.z) + .05, SITE.z); root.add(rig.obj);   // 맨땅 원 위 (2026-11-21: 눈 단 없앰)
    W.circle(SITE.x, SITE.z, 0); hit = W.circles[W.circles.length - 1];
    spotLabel('함께 눈사람 만들기', SITE.x, W.groundY(SITE.x, SITE.z) + 7.3, SITE.z);
    markArea();
    myBall = newBall(); reset(); updateSnowman(0);
  },
  offer(offer){
    if (complete() || !inField(me.x, me.z)) return;
    offer(Math.hypot(me.x - SITE.x, me.z - SITE.z) < 4 ? 0 : 50, 99, '눈덩이 굴리기', snowman.start);
  },
  start(){ begin(snowman, {rolled:0, carry:false}); me.ballR = R0; hud.topBar('눈덩이 굴리기'); },   // (2026-11-22 2차) 위 카드 없이: 눈덩이 막대 + 그만하기
  prompt(){
    if (!S.game.carry || Math.hypot(me.x - SITE.x, me.z - SITE.z) > SNOWMAN.RB * UNIT + 3.2) return null;
    if (complete()) return {label:'눈덩이 내려놓기', run:() => { puff(myBall.position.x, myBall.position.y, myBall.position.z, 8); stopActivity(); }};
    return {label:total() < RULE.BODY ? '몸통에 보태기' : '머리에 보태기', run:deposit};
  },
  quit(){ me.ballR = 0; myBall.visible = false; },
  frame(dt, now, moved){
    updateSnowman(now);
    if (arrow) { arrow.visible = S.mode === 'snow' && !!S.game && S.game.carry; if (arrow.visible) { arrow.position.y = W.groundY(SITE.x, SITE.z) + 8.7 + Math.sin(now / 1000 * 4) * .35; arrow.rotation.y = now / 1000; } }
    if (S.mode !== 'snow') return;
    const g = S.game; myBall.visible = true;
    if (!g.carry) {
      if (inField(me.x, me.z)) g.rolled = Math.min(RULE.ROLL, g.rolled + moved);
      me.ballR = R0 + (R1 - R0) * g.rolled / RULE.ROLL; rollBall(myBall, me, me.ballR, moved); hud.topSet(g.rolled / RULE.ROLL, inField(me.x, me.z) ? '눈덩이 굴리기' : '눈밭 안에서 굴려요');
      if (g.rolled >= RULE.ROLL) { g.carry = true; me.st = ST.CARRY; me.ballR = R1; hud.topSet(1, '눈사람 자리로 가져가요', '다 됐다'); sfx(440, 660, .15); flash('번쩍!\n눈사람 자리로 가져가요'); }
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
