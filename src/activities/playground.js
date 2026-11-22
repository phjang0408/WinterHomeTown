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
import { me } from '../entities/player.js';
import { SIT, POSES } from '../entities/character.js';
import { S } from '../core/state.js';
import { sfx } from '../core/fx.js';
import { defineActivity, seatTaken } from './registry.js';
import { SEESAWS, DUCKS, MERRY } from '../map/layout.js';
import { PUMP, pumpStart, pumpStop, pumpFrame, phaser } from './pump.js';

const V = new THREE.Vector3(), atLocal = (obj, x, y, z) => { obj.updateMatrixWorld(true); return obj.localToWorld(V.set(x, y, z)).clone(); };
const yawToward = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);

// ── 시소 (2026-11-20 2차: 두 대) ──
const saws = SEESAWS.map(c => ({c, base:null, beam:null, th:SEESAW_M.tilt, busy:[false, false], used:[false, false]}));
const ssSeat = (q, i) => atLocal(q.beam, (i ? 1 : -1) * SEESAW_M.seat * UNIT, SEESAW_M.seatY * UNIT, 0);
// (x, z)에서 가장 가까운 시소 자리 → [시소, 자리]
function ssNearest(x, z){ let best = null, bd = 1e9; saws.forEach(q => [0, 1].forEach(i => { const p = ssSeat(q, i), d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = [q, i, p, d]; } })); return best; }
defineActivity({
  id:'seesaw', st:ST.SEESAW,
  setup(){
    saws.forEach(q => { const c = q.c; q.base = W.place('seesaw', {x:c.x, z:c.z, rot:c.rot, s:c.s, part:'base'});
      q.beam = buildProp('seesaw', {part:'beam'}); q.beam.position.y = SEESAW_M.pivot * UNIT; q.base.add(q.beam); q.beam.rotation.z = q.th; });
    SIT.set(ST.SEESAW, {arm:-1.0, y:.06});
    POSES.set(ST.SEESAW, (w, ch) => {
      const [q, i] = w === me ? [saws[me.seat >> 1], me.seat & 1] : ssNearest(w.x, w.z), p = ssSeat(q, i);
      ch.position.set(p.x, p.y - .5, p.z); ch.rotation.set(0, q.c.rot + (i ? -PI / 2 : PI / 2), 0); q.busy[i] = true; w.y = p.y - .5;
    });
  },
  offer(offer){
    const n = ssNearest(me.x, me.z); if (!n) return; const [q, i, p, d] = n;
    if (d < 3.2 && !seatTaken(p.x, p.z, ST.SEESAW)) offer(d, 3.2, '시소 타기', () => {
      me.st = ST.SEESAW; me.seat = saws.indexOf(q) * 2 + i; me.x = p.x; me.z = p.z;
      me.onStand = () => { const s = ssSeat(q, i); me.x = s.x + Math.sin(q.c.rot) * 1.5; me.z = s.z + Math.cos(q.c.rot) * 1.5; me.y = undefined; };
    });
  },
  frame(dt, now){
    saws.forEach((q, k) => { q.used[0] = q.busy[0]; q.used[1] = q.busy[1]; q.busy[0] = q.busy[1] = false;
      const M = SEESAW_M.tilt, both = q.used[0] && q.used[1], target = both ? M * Math.sin(now / 1000 * 1.7 + k) : q.used[1] ? -M : M;   // 앉은 쪽이 내려간다 (왼쪽 자리 = -x = 기울기 +)
      q.th += (target - q.th) * Math.min(1, dt * (both ? 8 : 3)); q.beam.rotation.z = q.th; });
  },
});

// ── 흔들 오리 (2026-11-20 2차: 넷). 타면 E(발 구르기)를 앞으로 기울 때 누를수록 크게 흔들리고 머리가 끄덕인다 (게이지) ──
const ducks = [], dkBusy = [];
const dkPhase = phaser(3.4, .7, 1);   // (2026-11-22) 세게 밀수록 빨리 흔들린다
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
      pumpStart(.2, () => Math.sin(dkPhase(i, performance.now(), PUMP.amp)) > .78, '오리', '오리가 앞으로 숙일 때 밀어요.');
      me.onStand = () => { me.x = d.x + Math.cos(d.rot) * 1.6; me.z = d.z - Math.sin(d.rot) * 1.6; me.y = undefined; if (me.char) me.char.rotation.order = 'XYZ'; pumpStop(); }; });
  },
  frame(dt, now){
    ducks.forEach((o, i) => { o.rotation.x = dkBusy[i] !== false ? dkBusy[i] : o.rotation.x * (1 - Math.min(1, dt * 3)); dkBusy[i] = false; });
    if (me.st === ST.DUCK) pumpFrame(dt, Math.max(0, Math.sin(dkPhase(me.seat, now, PUMP.amp))));
  },
  remoteFrame(R){ if (R.st !== ST.DUCK && R.st !== ST.SPIN && R.char && R.char.rotation.order !== 'XYZ') R.char.rotation.order = 'XYZ'; },
});

// ── 뺑뺑이 ──
const MG = {obj:null, ang:0, w:0, R:1.25 * UNIT, ride:.8 * UNIT, top:.306 * UNIT, KICK:.28, PUSH:.55, MAX:3.4};
const sectors = [0, 1, 2, 3, 4, 5].map(i => (i + .5) * PI / 3);           // 손잡이 사이 여섯 자리 (원판 기준 각도)
const riderPhi = w => w === me ? me.mg[1] : (w.mgPhi || 0);
function push(power){ MG.w = Math.min(MG.MAX, MG.w + power); me.mg[0] = (me.mg[0] + 1) % 1000; me.pushT = performance.now(); sfx(260 + MG.w * 40, 320 + MG.w * 50, .06, 'triangle'); }
const remoteRiders = () => [...S.remotes.values()].filter(R => R.st === ST.RIDE);
defineActivity({
  id:'merry', st:ST.RIDE,
  setup(){
    MG.obj = W.place('merryGoRound', {x:MERRY.x, z:MERRY.z, s:MERRY.s});
    POSES.set(ST.RIDE, (w, ch) => {   // 원판 위에 서서 가운데를 보고 손잡이를 잡는다
      const ph = riderPhi(w), p = atLocal(MG.obj, Math.cos(ph) * MG.ride, MG.top, Math.sin(ph) * MG.ride);
      ch.position.copy(p); ch.rotation.set(0, yawToward(p.x, p.z, MERRY.x, MERRY.z), 0); w.y = p.y;
    });
    POSES.set(ST.SPIN, (w, ch) => {   // 원판 옆 땅에 서서 원판이 도는 방향(시계 반대)을 본다
      const gy = W.groundY(w.x, w.z); ch.position.set(w.x, gy, w.z); w.y = gy;
      const a = Math.atan2(w.z - MERRY.z, w.x - MERRY.x); ch.rotation.set(0, yawToward(0, 0, Math.sin(a), -Math.cos(a)), 0);
    });
  },
  offer(offer){
    const d = Math.hypot(me.x - MERRY.x, me.z - MERRY.z), rw = MG.R * MERRY.s; if (d >= rw + 2.4) return;
    if (remoteRiders().length) offer(d - rw, 2.4, '뺑뺑이 돌리기', () => {
      me.st = ST.SPIN; const a = Math.atan2(me.z - MERRY.z, me.x - MERRY.x); me.x = MERRY.x + Math.cos(a) * (rw + .75); me.z = MERRY.z + Math.sin(a) * (rw + .75);
      me.seatAct = {label:'돌리기 (연타)', run:() => push(MG.PUSH)}; me.onStand = () => {};
    });
    else offer(d - rw, 2.4, '뺑뺑이 타기', () => {
      MG.obj.updateMatrixWorld(true); const l = MG.obj.worldToLocal(V.set(me.x, 0, me.z)), want = Math.atan2(l.z, l.x);
      const taken = remoteRiders().map(R => R.mgPhi || 0), dist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
      const free = sectors.filter(s => !taken.some(t => dist(s, t) < .5)).sort((a, b) => dist(a, want) - dist(b, want));
      if (!free.length) return;
      me.st = ST.RIDE; me.mg[1] = free[0];
      me.seatAct = {label:'발 굴러 밀기', run:() => push(MG.KICK)};
      me.onStand = () => { const a = Math.atan2(me.z - MERRY.z, me.x - MERRY.x); me.x = MERRY.x + Math.cos(a) * (rw + .9); me.z = MERRY.z + Math.sin(a) * (rw + .9); me.y = undefined; };
    });
  },
  frame(dt, now){
    MG.w *= Math.exp(-.35 * dt); if (MG.w < .01) MG.w = 0;
    MG.ang += MG.w * dt; MG.obj.rotation.y = MG.ang;
    // 미는 사람: 두 팔을 앞으로, 밀 때마다 몸을 숙인다
    const lean = c => { const e = (performance.now() - (c.pushT || 0)) / 1000; return e < .25 ? .35 * Math.sin(e / .25 * PI) : 0; };
    // (2026-11-22) 미는 사람이 등으로 미는 것처럼 보이던 것: 기울기를 세계 x축이 아니라 몸 기준(YXZ)으로 줘서 얼굴 쪽(앞)으로 숙인다
    if (me.st === ST.SPIN && me.char) { const u = me.char.userData; u.armL.rotation.x = u.armR.rotation.x = -1.35; me.char.rotation.order = 'YXZ'; me.char.rotation.x = lean(me); }
    else if (me.char && me.st !== ST.DUCK && me.char.rotation.order !== 'XYZ') me.char.rotation.order = 'XYZ';
    else if (me.st === ST.RIDE && me.char) { const u = me.char.userData; u.armL.rotation.x = u.armR.rotation.x = -1.1; }
  },
  remote(R, p){
    R.mgPhi = p.mg[1];
    if (R.mgN !== undefined && p.mg[0] !== R.mgN) { const n = (p.mg[0] - R.mgN + 1000) % 1000; if (n < 30) { MG.w = Math.min(MG.MAX, MG.w + n * (R.st === ST.SPIN ? MG.PUSH : MG.KICK)); R.pushT = performance.now(); } }
    R.mgN = p.mg[0];
  },
  remoteFrame(R){
    if (!R.char) return; const u = R.char.userData;
    if (R.st === ST.SPIN) { u.armL.rotation.x = u.armR.rotation.x = -1.35; const e = (performance.now() - (R.pushT || 0)) / 1000; R.char.rotation.order = 'YXZ'; R.char.rotation.x = e < .25 ? .35 * Math.sin(e / .25 * PI) : 0; }
    else if (R.st === ST.RIDE) u.armL.rotation.x = u.armR.rotation.x = -1.1;
  },
});
