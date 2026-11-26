// 아파트 놀이터 탈것 (2026-11-20): 시소, 흔들 오리, 뺑뺑이(회전놀이기구)
//   시소: 두 자리. 한 사람만 타면 그쪽이 내려가고, 둘이 타면 번갈아 오르내린다.
//   흔들 오리: 타면 앞뒤로 흔들린다.
//   뺑뺑이: '타기'는 원판 위에 서서 같이 돈다(E로 발 굴러 조금 밀기). 누가 타고 있으면 옆 사람에게는 '돌리기'가 나오고,
//          E를 연타할수록 빨라진다. 이동하면 내린다.
//   동기화: 시소 · 오리는 자리(위치)만으로 충분하다. 뺑뺑이는 각자 '민 횟수'와 '탄 자리 각도'만 보내고(protocol의 mg),
//          회전 속도는 각자 화면에서 받은 민 횟수로 계산한다. 원판 각도가 사람마다 조금 달라도 탄 사람은 그 원판 위에 그려져 어긋나 보이지 않는다.
import * as THREE from '../lib/three.js';
import { PI } from '../core/util.js';
import { ST, UNIT } from '../config.js';
import { buildProp } from '../props/registry.js';
import { SEESAW_M } from '../props/aptYard.js';
import { W } from '../world/world.js';
import { me, standUp } from '../entities/player.js';
import { SIT, POSES, waving } from '../entities/character.js';
import { S } from '../core/state.js';
import { sfx, flash, puff } from '../core/fx.js';
import { hud } from '../ui/hud.js';
import { defineActivity, seatTaken } from './registry.js';
import { SEESAWS, DUCKS, MERRY } from '../map/layout.js';
import { PUMP, pumpStart, pumpStop, pumpFrame, phaser } from './pump.js';

const V = new THREE.Vector3(), atLocal = (obj, x, y, z) => { obj.updateMatrixWorld(true); return obj.localToWorld(V.set(x, y, z)).clone(); };
const yawToward = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);

// ── 시소 (2026-11-20 2차: 두 대) ──
// (2026-11-25 4차) 둘이 모으는 힘: 시소마다 힘 P(0~1) 하나. 내 쪽이 바닥에 닿을 때(노란 칸) E로 땅을 차면 +, 칸 밖에서 차면 −, 가만두면 점점 준다.
//   P가 클수록 빨리 · 크게 오르내리고, 1에 닿으면 탄 사람이 다 같이 붕 뜬다(그 뒤 P는 AFTER로).
//   (2026-11-25 5차) 혼자는 못 탄다: 앉아서 맞은편을 기다리고, 둘이 앉아야 땅 차기가 먹고 시소가 움직인다.
//   동기화: 각자 [P, 잘 찬 횟수, 헛찬 횟수]를 presence sa로 보낸다. 받는 쪽은 상대 횟수가 늘어난 만큼 같은 규칙으로 P에 더한다
//   → 두 화면이 같은 사건으로 같은 P를 계산하므로, 점프도 두 화면에서 함께 일어난다 (예전: 화면마다 자기 세기로 따로 판단해 한쪽만 뜨던 것).
const SS = {GOOD:.12, MISS:-.06, DECAY:.06, AFTER:.55};
const saws = SEESAWS.map(c => ({c, base:null, beam:null, th:SEESAW_M.tilt, busy:[false, false], used:[false, false], P:0, pop:0}));
const ssSeat = (q, i) => atLocal(q.beam, (i ? 1 : -1) * SEESAW_M.seat * UNIT, SEESAW_M.seatY * UNIT, 0);
const ssPhase = phaser(1.8, 1.2, 1.3);
const POP = {T:.95, H:1.6};   // 뜨는 시간(초) · 높이(m)
const popY = (t0, now) => { const t = (now - t0) / (POP.T * 1000); return t > 0 && t < 1 ? POP.H * UNIT * 4 * t * (1 - t) : 0; };
// 내 쪽이 얼마나 바닥에 가까운가 (1 = 바닥): 바늘 · 누를 때 판정
function ssLow(){ const q = saws[me.seat >> 1], i = me.seat & 1, M = SEESAW_M.tilt; return (1 + (i ? -1 : 1) * q.th / M) / 2; }
// (x, z)에서 가장 가까운 시소 자리 → [시소, 자리]
function ssNearest(x, z){ let best = null, bd = 1e9; saws.forEach(q => [0, 1].forEach(i => { const p = ssSeat(q, i), d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = [q, i, p, d]; } })); return best; }
const ssAdd = (q, v) => { q.P = Math.max(0, Math.min(1, q.P + v)); };
let myG = 0, myM = 0, ssAlone = null;
const ssPublish = q => { me.sa = [Math.round(q.P * 100), myG % 1000, myM % 1000]; };
defineActivity({
  id:'seesaw', st:ST.SEESAW,
  setup(){
    saws.forEach(q => { const c = q.c; q.base = W.place('seesaw', {x:c.x, z:c.z, rot:c.rot, s:c.s, part:'base'});
      q.beam = buildProp('seesaw', {part:'beam'}); q.beam.position.y = SEESAW_M.pivot * UNIT; q.base.add(q.beam); q.beam.rotation.z = q.th; });
    SIT.set(ST.SEESAW, {arm:-1.0, y:.06});
    POSES.set(ST.SEESAW, (w, ch, now) => {
      const [q, i] = w === me ? [saws[me.seat >> 1], me.seat & 1] : ssNearest(w.x, w.z), p = ssSeat(q, i), up = q.pop ? popY(q.pop, now) : 0;   // 뜰 때는 그 시소에 탄 사람이 다 같이
      ch.position.set(p.x, p.y - .5 + up, p.z); ch.rotation.set(0, q.c.rot + (i ? -PI / 2 : PI / 2), 0); q.busy[i] = true; w.y = p.y - .5 + up;
    });
  },
  offer(offer){
    const n = ssNearest(me.x, me.z); if (!n) return; const [q, i, p, d] = n;
    if (d < 3.2 && !seatTaken(p.x, p.z, ST.SEESAW)) offer(d, 3.2, '시소 타기', () => {
      me.st = ST.SEESAW; me.seat = saws.indexOf(q) * 2 + i; me.x = p.x; me.z = p.z; ssAlone = null;
      pumpStart(q.P, () => ssLow() > .78, '시소', '땅 차기', null, 0, ok => { if (!(q.used[0] && q.used[1])) return; ssAdd(q, ok ? SS.GOOD : SS.MISS); if (ok) myG++; else myM++; ssPublish(q); });
      ssPublish(q);
      me.onStand = () => { const s = ssSeat(q, i); me.x = s.x + Math.sin(q.c.rot) * 1.5; me.z = s.z + Math.cos(q.c.rot) * 1.5; me.y = undefined; pumpStop(); };
    });
  },
  frame(dt, now){
    saws.forEach((q, k) => { q.used[0] = q.busy[0]; q.used[1] = q.busy[1]; q.busy[0] = q.busy[1] = false;
      const M = SEESAW_M.tilt, both = q.used[0] && q.used[1], any = q.used[0] || q.used[1];
      if (both) q.P = Math.max(0, q.P - SS.DECAY * dt); else q.P = 0;                              // 혼자면 힘이 모이지 않는다
      if (q.pop && now - q.pop > POP.T * 1000) q.pop = 0;
      if (both && !q.pop && q.P >= 1) { q.pop = now; q.P = SS.AFTER; if (me.st === ST.SEESAW && saws[me.seat >> 1] === q) sfx(300, 760, .3, 'triangle', .06); }
      const ph = ssPhase(k, now, q.P), amp = Math.min(1, .15 + q.P);                // 힘이 클수록 빨리 · 크게
      let target = M;   // 아무도 없으면 왼쪽(-x)이 내려앉은 채
      if (both) target = M * Math.sin(ph) * (.45 + .55 * Math.min(1, q.P * 1.3));
      else if (any) target = q.used[1] ? -M : M;                                                   // 혼자: 앉은 쪽이 내려앉은 채 (왼쪽 자리 = -x = 기울기 +)
      q.th += (target - q.th) * Math.min(1, dt * (both ? 8 : 6)); q.beam.rotation.z = q.th; });
    if (me.st === ST.SEESAW) { const q = saws[me.seat >> 1], alone = !(q.used[0] && q.used[1]); PUMP.amp = q.P; pumpFrame(dt, alone ? 0 : ssLow()); ssPublish(q);
      if (alone !== ssAlone) { ssAlone = alone; hud.gaugeText(alone ? '시소 · 맞은편에 누가 앉으면 같이 탈 수 있어요' : '시소 · 둘이 모은 힘 ' + Math.round(q.P * 100) + '% · 바늘이 칸에 오면 E'); } }
  },
  // 다른 사람이 땅을 찬 만큼 그 사람 시소의 힘에 더한다 (처음 본 값은 기준으로만)
  remote(R, p){
    if (p.st !== ST.SEESAW) { R.ssG = R.ssM = undefined; return; }
    const g = p.sa[1], m = p.sa[2];
    if (R.ssG !== undefined) { const n = ssNearest(p.x, p.z); if (n) { const q = n[0], dg = (g - R.ssG + 1000) % 1000, dm = (m - R.ssM + 1000) % 1000;
      if (dg < 30 && dm < 30) ssAdd(q, dg * SS.GOOD + dm * SS.MISS); } }
    R.ssG = g; R.ssM = m;
  },
});

// ── 흔들 오리 (2026-11-20 2차: 넷). 타면 E(발 구르기)를 앞으로 기울 때 누를수록 크게 흔들리고 머리가 끄덕인다 (게이지) ──
const ducks = [], dkBusy = [];
const dkPhase = phaser(4.4, .7, 1);   // (2026-11-22) 세게 밀수록 빨리 흔들린다. (2026-11-26) 3.4 → 4.4: 더 빠르게 (각자 화면에서 계산, 서버 부담 없음)
const dkAmp = w => w === me ? PUMP.amp : (w.sa === undefined ? .3 : w.sa);
const dkSeat = i => atLocal(ducks[i], 0, .63 * UNIT, -.1 * UNIT);
const dkNearest = (x, z) => DUCKS.reduce((b, d, i) => Math.hypot(x - d.x, z - d.z) < Math.hypot(x - DUCKS[b].x, z - DUCKS[b].z) ? i : b, 0);
defineActivity({
  id:'duck', st:ST.DUCK,
  setup(){
    DUCKS.forEach(d => { const o = W.place('springRider', d); o.rotation.order = 'YXZ'; ducks.push(o); dkBusy.push(false); });
    SIT.set(ST.DUCK, {arm:-1.1, y:.06});
    POSES.set(ST.DUCK, (w, ch, now) => {
      const i = w === me ? me.seat : dkNearest(w.x, w.z), p = dkSeat(i), o = ducks[i];
      const da = dkAmp(w); dkBusy[i] = Math.sin(dkPhase(i, now, da)) * (.08 + .3 * da);
      ch.position.set(p.x, p.y - .5, p.z); ch.rotation.order = 'YXZ'; ch.rotation.set(o.rotation.x * 1.2, DUCKS[i].rot, Math.sin(dkPhase(i, now, da) * .5) * .08 * da); w.y = p.y - .5;
    });
  },
  offer(offer){
    const i = dkNearest(me.x, me.z), d = DUCKS[i], dd = Math.hypot(me.x - d.x, me.z - d.z);
    if (dd < 2.6 && !seatTaken(d.x, d.z, ST.DUCK)) offer(dd, 2.6, '오리 타기', () => { me.st = ST.DUCK; me.seat = i; me.x = d.x; me.z = d.z;
      pumpStart(.2, () => Math.sin(dkPhase(i, performance.now(), PUMP.amp)) > .78, '오리');
      me.onStand = () => { me.x = d.x + Math.cos(d.rot) * 1.6; me.z = d.z - Math.sin(d.rot) * 1.6; me.y = undefined; if (me.char) me.char.rotation.order = 'XYZ'; pumpStop(); }; });
  },
  frame(dt, now){
    ducks.forEach((o, i) => { o.rotation.x = dkBusy[i] !== false ? dkBusy[i] : o.rotation.x * (1 - Math.min(1, dt * 3)); dkBusy[i] = false; });
    if (me.st === ST.DUCK) pumpFrame(dt, Math.max(0, Math.sin(dkPhase(me.seat, now, PUMP.amp))));
  },
  remoteFrame(R){ if (!OWN_ORDER.has(R.st) && R.char && R.char.rotation.order !== 'XYZ') R.char.rotation.order = 'XYZ'; },
});

// 몸 기준 기울기(YXZ)를 스스로 관리하는 상태: 이 밖의 상태가 되면 XYZ로 되돌린다 (2026-11-25 HANG · TWIN 추가)
const OWN_ORDER = new Set([ST.DUCK, ST.SPIN, ST.HANG, ST.TWIN]);
// ── 뺑뺑이 ──
const MG = {obj:null, ang:0, w:0, R:1.25 * UNIT, ride:.8 * UNIT, top:.306 * UNIT, KICK:.28, PUSH:.55, MAX:3.4};
const sectors = [0, 1, 2, 3, 4, 5].map(i => (i + .5) * PI / 3);           // 손잡이 사이 여섯 자리 (원판 기준 각도)
const riderPhi = w => w === me ? me.mg[1] : (w.mgPhi || 0);
function push(power){ MG.w = Math.min(MG.MAX, MG.w + power); me.mg[0] = (me.mg[0] + 1) % 1000; me.pushT = performance.now(); sfx(260 + MG.w * 40, 320 + MG.w * 50, .06, 'triangle'); }
// (2026-11-25) 같이 타기 (슈퍼맨 자세): 돌리던 사람이 R(같이 타기) → 바깥 기둥 윗부분을 두 손으로 잡고 매달려 같이 돈다.
//   빠를수록 원심력처럼 몸이 바깥으로 눕는다(손을 축으로 앞으로 기울임). 느리면 발이 땅에 닿을 만큼만 기운다. E · 이동키로 손 놓기.
const HANG = {r:1.13 * UNIT, y:.78 * UNIT, L:1.62, MAX:1.45};
function hangPose(w, ch, now){
  const ph = riderPhi(w), H = atLocal(MG.obj, Math.cos(ph) * HANG.r, HANG.y, Math.sin(ph) * HANG.r);
  const ox = H.x - MERRY.x, oz = H.z - MERRY.z, ol = Math.hypot(ox, oz) || 1, ux = ox / ol, uz = oz / ol;   // 바깥 방향
  const gy = W.groundY(H.x + ux * 1.2, H.z + uz * 1.2), lo = Math.acos(Math.min(1, Math.max(-1, (H.y - gy - .02) / HANG.L)));
  const want = lo + (HANG.MAX - lo) * Math.min(1, MG.w / 2.4) ** .8;
  w.hangTh = w.hangTh === undefined ? lo : w.hangTh + (want - w.hangTh) * .08;
  const th = Math.max(lo, w.hangTh), sw = Math.sin(now / 1000 * 3.1) * .04 * Math.min(1, MG.w / 2);   // 빠를 때 살짝 출렁
  const rx = H.x + ux * HANG.L * Math.sin(th + sw), rz = H.z + uz * HANG.L * Math.sin(th + sw), ry = H.y - HANG.L * Math.cos(th + sw);
  ch.position.set(rx, ry, rz); ch.rotation.order = 'YXZ'; ch.rotation.set(th + sw, Math.atan2(-ux, -uz), 0); w.y = ry;
  if (w === me) { me.x = rx; me.z = rz; }
}
// 팔다리는 animChar 뒤에 (frame · remoteFrame에서) 덮어쓴다
function hangLimbs(ch, now){
  const u = ch.userData, f = Math.min(1, MG.w / 2), k = Math.sin(now / 1000 * 11) * .14 * f;
  u.armL.rotation.x = u.armR.rotation.x = -3.0; u.armL.rotation.z = .32; u.armR.rotation.z = -.32;   // 두 팔을 머리 위로 뻗어 기둥을 잡는다
  u.legL.rotation.x = .12 + k; u.legR.rotation.x = .12 - k; u.inner.position.y = 0;                    // 다리는 뒤로 쭉 (빠르면 파닥)
}
function hang(){
  const rw = MG.R * MERRY.s; MG.obj.updateMatrixWorld(true); const l = MG.obj.worldToLocal(V.set(me.x, 0, me.z)), want = Math.atan2(l.z, l.x);
  const taken = [...S.remotes.values()].filter(R => R.st === ST.HANG).map(R => R.mgPhi || 0), dist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const free = [0, 1, 2, 3, 4, 5].map(i => i * PI / 3).filter(a => !taken.some(t => dist(a, t) < .4)).sort((a, b) => dist(a, want) - dist(b, want));
  if (!free.length) return flash('잡을 기둥이 없어요');
  me.st = ST.HANG; me.mg[1] = free[0]; me.sitT = 0; me.hangTh = undefined; me.seatAlt = null;
  me.seatAct = {label:'손 놓기', run:standUp};
  me.onStand = () => { const a = Math.atan2(me.z - MERRY.z, me.x - MERRY.x), out = rw + 1.1 + Math.min(1.2, MG.w * .4); me.x = MERRY.x + Math.cos(a) * out; me.z = MERRY.z + Math.sin(a) * out; me.y = undefined;
    if (me.char) me.char.rotation.order = 'XYZ'; puff(me.x, W.groundY(me.x, me.z) + .3, me.z, 8); if (MG.w > 1.2) flash('으아~ 날아갔다!'); };
  sfx(330, 520, .15, 'triangle'); flash('꽉 잡아! 슈퍼맨~');
}
defineActivity({
  id:'merry', st:ST.RIDE,
  setup(){
    MG.obj = W.place('merryGoRound', {x:MERRY.x, z:MERRY.z, s:MERRY.s});
    POSES.set(ST.RIDE, (w, ch) => {   // 원판 위에 서서 가운데를 보고 손잡이를 잡는다
      const ph = riderPhi(w), p = atLocal(MG.obj, Math.cos(ph) * MG.ride, MG.top, Math.sin(ph) * MG.ride);
      ch.position.copy(p); ch.rotation.set(0, yawToward(p.x, p.z, MERRY.x, MERRY.z), 0); w.y = p.y;
    });
    POSES.set(ST.HANG, hangPose);
    POSES.set(ST.SPIN, (w, ch) => {   // 원판 옆 땅에 서서 원판이 도는 방향(시계 반대)을 본다
      const gy = W.groundY(w.x, w.z); ch.position.set(w.x, gy, w.z); w.y = gy;
      const a = Math.atan2(w.z - MERRY.z, w.x - MERRY.x); ch.rotation.set(0, yawToward(0, 0, Math.sin(a), -Math.cos(a)), 0);
    });
  },
  // (2026-11-25) 기본이 '타기'(E) + '밀기'(R). 누가 타 있든 없든 둘 다 되고, 빈 자리(여섯)가 있으면 여러 명이 같이 탄다.
  //   미는 중에는 E 연타로 밀기, R로 '같이 타기'(슈퍼맨 자세)
  offer(offer){
    const d = Math.hypot(me.x - MERRY.x, me.z - MERRY.z), rw = MG.R * MERRY.s; if (d >= rw + 2.4) return;
    offer(d - rw, 2.4, '뺑뺑이 타기', () => {
      MG.obj.updateMatrixWorld(true); const l = MG.obj.worldToLocal(V.set(me.x, 0, me.z)), want = Math.atan2(l.z, l.x);
      const taken = [...S.remotes.values()].filter(R => R.st === ST.RIDE).map(R => R.mgPhi || 0), dist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
      const free = sectors.filter(s => !taken.some(t => dist(s, t) < .5)).sort((a, b) => dist(a, want) - dist(b, want));
      if (!free.length) return flash('자리가 꽉 찼어요');
      me.st = ST.RIDE; me.mg[1] = free[0];
      me.seatAct = {label:'발 굴러 밀기', run:() => push(MG.KICK)};
      me.onStand = () => { const a = Math.atan2(me.z - MERRY.z, me.x - MERRY.x); me.x = MERRY.x + Math.cos(a) * (rw + .9); me.z = MERRY.z + Math.sin(a) * (rw + .9); me.y = undefined; };
    });
  },
  altOffer(){
    const d = Math.hypot(me.x - MERRY.x, me.z - MERRY.z), rw = MG.R * MERRY.s; if (d >= rw + 2.4) return null;
    return {label:'뺑뺑이 밀기', run:() => {
      me.st = ST.SPIN; const a = Math.atan2(me.z - MERRY.z, me.x - MERRY.x); me.x = MERRY.x + Math.cos(a) * (rw + .75); me.z = MERRY.z + Math.sin(a) * (rw + .75);
      me.seatAct = {label:'밀기 (연타)', run:() => push(MG.PUSH)}; me.seatAlt = {label:'같이 타기', run:hang}; me.onStand = () => {}; push(MG.PUSH); }};
  },
  frame(dt, now){
    MG.w *= Math.exp(-.35 * dt); if (MG.w < .01) MG.w = 0;
    MG.ang += MG.w * dt; MG.obj.rotation.y = MG.ang;
    // 미는 사람: 오른팔(armL)을 앞으로 (2026-11-23 놀이 손은 오른손, 왼손 armR은 흔드는 손), 밀 때마다 몸을 숙인다
    const lean = c => { const e = (performance.now() - (c.pushT || 0)) / 1000; return e < .25 ? .35 * Math.sin(e / .25 * PI) : 0; };
    // (2026-11-22) 미는 사람이 등으로 미는 것처럼 보이던 것: 기울기를 세계 x축이 아니라 몸 기준(YXZ)으로 줘서 얼굴 쪽(앞)으로 숙인다
    if (me.st === ST.SPIN && me.char) { const u = me.char.userData; u.armL.rotation.x = -1.35; me.char.rotation.order = 'YXZ'; me.char.rotation.x = lean(me); }
    else if (me.char && !OWN_ORDER.has(me.st) && me.char.rotation.order !== 'XYZ') me.char.rotation.order = 'XYZ';
    else if (me.st === ST.RIDE && me.char) { const u = me.char.userData; u.armL.rotation.x = -1.1; }
    if (me.st === ST.HANG && me.char) hangLimbs(me.char, now);
  },
  remote(R, p){
    R.mgPhi = p.mg[1];
    if (R.mgN !== undefined && p.mg[0] !== R.mgN) { const n = (p.mg[0] - R.mgN + 1000) % 1000; if (n < 30) { MG.w = Math.min(MG.MAX, MG.w + n * (R.st === ST.SPIN ? MG.PUSH : MG.KICK)); R.pushT = performance.now(); } }
    R.mgN = p.mg[0];
  },
  remoteFrame(R){
    if (!R.char) return; const u = R.char.userData;
    if (R.st === ST.SPIN) { u.armL.rotation.x = -1.35; const e = (performance.now() - (R.pushT || 0)) / 1000; R.char.rotation.order = 'YXZ'; R.char.rotation.x = e < .25 ? .35 * Math.sin(e / .25 * PI) : 0; }
    else if (R.st === ST.RIDE) u.armL.rotation.x = -1.1;
    else if (R.st === ST.HANG) hangLimbs(R.char, performance.now());
  },
});
