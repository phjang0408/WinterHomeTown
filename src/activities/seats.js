// 앉을 수 있는 곳: 벤치, 그네, 목욕탕 앞 평상, 놀이터 옆 쉼터 마루
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { PI } from '../core/util.js';
import { ST, UNIT } from '../config.js';
import { buildProp } from '../props/registry.js';
import { W } from '../world/world.js';
import { me } from '../entities/player.js';
import { SIT, POSES } from '../entities/character.js';
import { defineActivity, seatTaken } from './registry.js';
import { BENCHES, SW, BIG, PAVILION } from '../map/layout.js';
import { PUMP, pumpStart, pumpStop, pumpFrame, phaser } from './pump.js';
import { flash } from '../core/fx.js';
import { BATH } from '../props/bigShops.js';

defineActivity({
  id:'bench', st:ST.BENCH,
  // 벤치 방향: rot(바라보는 쪽, 2026-11-21 원형 광장용)이 있으면 그것, 없으면 f(+1 남쪽 · -1 북쪽)
  setup(){ BENCHES.forEach(b => { b.rot = b.rot ?? (b.f > 0 ? 0 : PI); W.place('bench', {x:b.x, z:b.z, rot:b.rot}); }); SIT.set(ST.BENCH, {arm:-.45, y:.06}); },
  offer(offer){
    BENCHES.forEach(b => { const d = Math.hypot(me.x - b.x, me.z - b.z); if (d >= 2.6) return;
      const fx = Math.sin(b.rot), fz = Math.cos(b.rot), sx = Math.cos(b.rot), sz = -Math.sin(b.rot);   // 앞 방향 · 옆 방향
      const seat = o => ({x:b.x + sx * o + fx * .1, z:b.z + sz * o + fz * .1});
      const side = [-.65, .65].sort((p, q) => { const a = seat(p), c = seat(q); return Math.hypot(me.x - a.x, me.z - a.z) - Math.hypot(me.x - c.x, me.z - c.z); }).find(o => { const s = seat(o); return !seatTaken(s.x, s.z, ST.BENCH); });
      if (side !== undefined) offer(d, 2.6, '벤치에 앉기', () => { const s = seat(side); me.st = ST.BENCH; me.x = s.x; me.z = s.z; me.r = b.rot; me.onStand = () => { me.x = b.x + fx * 1.15 + sx * side; me.z = b.z + fz * 1.15 + sz * side; }; }); });
  },
});

// ── 그네 (2026-11-20 2차): 세 틀 여섯 자리. 타면 E(발 구르기)를 그네가 끝에 다다를 때 누를수록 높이 올라간다 (게이지) ──
const pivots = [], busy = [];
const swPhase = phaser(2.3, .6, 1.7);   // (2026-11-22) 세게 밀수록 빨리 왔다 갔다
const swAmp = w => w === me ? PUMP.amp : (w.sa === undefined ? .3 : w.sa);
const swingAngle = (i, now, a) => Math.sin(swPhase(i, now, a)) * (.2 + .78 * a);
const nearestSeat = (x, z) => SW.seats.reduce((b, s, i) => Math.hypot(x - s.x, z - s.z) < Math.hypot(x - SW.seats[b].x, z - SW.seats[b].z) ? i : b, 0);
defineActivity({
  id:'swing', st:ST.SWING,
  setup(){
    SW.sets.forEach(t => { W.place('swingSet', {x:t.cx, z:t.z, s:SW.s}); });   // (2026-11-21) 그네마다 붙던 이름표는 빼고 놀이터 하나로 (apartments.js)   // 틀 (props/aptStreet.js). 앉는 판은 흔들리도록 축마다 따로 매단다
    SW.seats.forEach(st => { const p = new THREE.Group(); p.position.set(st.x, SW.top - .1 * UNIT * SW.s, st.z); p.scale.setScalar(SW.s); p.add(buildProp('swingSeat')); root.add(p); pivots.push(p); busy.push(false); });
    SIT.set(ST.SWING, {arm:-.45, y:.06});
    POSES.set(ST.SWING, (w, ch, now) => {
      const i = w === me ? me.seat : nearestSeat(w.x, w.z), st = SW.seats[i], th = swingAngle(i, now, swAmp(w));
      ch.position.set(st.x, SW.top - SW.L * Math.cos(th) - .5, st.z - SW.L * Math.sin(th)); ch.rotation.set(th * .7, 0, 0); busy[i] = th; w.y = 0;   // (2026-11-22) 몸이 기우는 방향을 반대로 (주석이 busy 줄을 삼켜 좌석이 안 움직이던 것 수정)
    });
  },
  offer(offer){
    const i = nearestSeat(me.x, me.z), st = SW.seats[i], d = Math.hypot(me.x - st.x, me.z - st.z);
    if (d < 3.4 && !seatTaken(st.x, st.z, ST.SWING)) offer(d, 3.4, '그네 타기', () => {
      me.st = ST.SWING; me.seat = i; me.x = st.x; me.z = st.z; me.r = 0;
      pumpStart(.25, () => Math.abs(Math.sin(swPhase(i, performance.now(), PUMP.amp))) > .78, '그네');
      me.onStand = () => { me.z = st.z + 2.6; me.char.rotation.x = 0; pumpStop(); };
    });
  },
  frame(dt, now){
    pivots.forEach((p, i) => { p.rotation.x = busy[i] !== false ? busy[i] : p.rotation.x * (1 - Math.min(1, dt * 3)); busy[i] = false; });
    if (me.st === ST.SWING) pumpFrame(dt, Math.abs(Math.sin(swPhase(me.seat, now, PUMP.amp))));
  },
  remote(R, p){ R.sa = p.sa[0] / 100; },
});

// ── 걸터앉는 자리 (평상 · 쉼터 마루): 모서리에 앉아 바깥을 본다 ──
// 목욕탕 앞 평상 (2026-11-20): 평상 자리는 props/bigShops.js의 BIG_SIGNS.bath (건물 기준 4.6, 6.6, 건물은 180° 돌아 정면이 북쪽). 앞(북쪽) 모서리
const PLAT = (() => { const cx = BIG.bath.x, cz = BIG.back - BATH.D / 2 * UNIT; return {x:cx - 4.6 * UNIT, z:cz - 6.6 * UNIT}; })();
const EDGES = [
  {label:'평상에 앉기', r:PI, x:PLAT.x, z:PLAT.z, seats:[-.9, -.25, .35].map(lx => ({x:PLAT.x - lx * UNIT, z:PLAT.z - .62 * UNIT})), out:[0, -1.6],
    // (2026-11-20 4차) 목욕탕 평상에 앉으면 바나나우유를 들고 가끔 한 모금씩 (activities/goguma.js가 손에 그린다)
    onSit:() => { me.prevIt = me.it; me.it = [2, 1, 0]; }, onLeave:() => { if (me.it && me.it[0] === 2) me.it = me.prevIt && me.prevIt[0] !== 2 ? me.prevIt : [0, 0, 0]; }},   // (2026-11-22) 앉을 때 알림 글은 뺐다
  // 놀이터 옆 쉼터(정자) 마루 (2026-11-20 2차): 앞(+z) 마루 끝 세 자리
  (() => { const P = PAVILION, k = P.s * UNIT, c = Math.cos(P.rot), s = Math.sin(P.rot), at = (lx, lz) => ({x:P.x + (lx * c + lz * s) * k, z:P.z + (-lx * s + lz * c) * k});
    return {label:'마루에 앉기', r:P.rot, x:P.x, z:P.z, seats:[-.95, 0, .95].map(lx => at(lx, 1.62)), out:[Math.sin(P.rot) * 1.6 * P.s, Math.cos(P.rot) * 1.6 * P.s], reach:4.2 * P.s}; })(),
];
defineActivity({
  id:'edge', st:ST.PLAT,
  setup(){
    W.place('pavilion', {x:PAVILION.x, z:PAVILION.z, s:PAVILION.s, rot:PAVILION.rot});
    EDGES.forEach(e => { const p = e.seats[1]; e.y = W.groundY(p.x + Math.sin(e.r) * 2.5, p.z + Math.cos(e.r) * 2.5); });   // 앉은 자리 바로 앞 땅 높이 (마루 위는 올라설 수 있어 높이가 다르다)
    SIT.set(ST.PLAT, {arm:-.45, y:.06});
    POSES.set(ST.PLAT, (w, ch) => {
      const e = EDGES.reduce((b, q) => Math.hypot(w.x - q.x, w.z - q.z) < Math.hypot(w.x - b.x, w.z - b.z) ? q : b);
      ch.position.set(w.x, e.y, w.z); ch.rotation.set(0, e.r, 0); w.y = e.y;
    });
  },
  offer(offer){
    EDGES.forEach(e => { const d = Math.hypot(me.x - e.x, me.z - e.z), lim = e.reach || 3.2; if (d >= lim) return;
      const st = e.seats.filter(p => !seatTaken(p.x, p.z, ST.PLAT)).sort((a, b) => Math.hypot(me.x - a.x, me.z - a.z) - Math.hypot(me.x - b.x, me.z - b.z))[0];
      if (st) offer(d, lim, e.label, () => { me.st = ST.PLAT; me.x = st.x; me.z = st.z; me.r = e.r; me.onStand = () => { me.x = st.x + e.out[0]; me.z = st.z + e.out[1]; me.y = undefined; if (e.onLeave) e.onLeave(); }; if (e.onSit) e.onSit(); }); });
  },
});
