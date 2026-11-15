// 앉을 수 있는 곳: 벤치, 그네
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { PI } from '../core/util.js';
import { ST, UNIT } from '../config.js';
import { buildProp } from '../props/registry.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me } from '../entities/player.js';
import { SIT, POSES } from '../entities/character.js';
import { defineActivity, seatTaken } from './registry.js';
import { BENCHES, SW } from '../map/layout.js';

defineActivity({
  id:'bench', st:ST.BENCH,
  setup(){ BENCHES.forEach(b => W.place('bench', {x:b.x, z:b.z, rot:b.f > 0 ? 0 : PI})); SIT.set(ST.BENCH, {arm:-.45, y:.06}); },
  offer(offer){
    BENCHES.forEach(b => { const d = Math.hypot(me.x - b.x, me.z - b.z); if (d >= 2.6) return;
      const sz = b.z + b.f * .1, side = [-.65, .65].sort((p, q) => Math.abs(me.x - b.x - p) - Math.abs(me.x - b.x - q)).find(o => !seatTaken(b.x + o, sz, ST.BENCH));
      if (side !== undefined) offer(d, 2.6, '벤치에 앉기', () => { me.st = ST.BENCH; me.x = b.x + side; me.z = sz; me.r = b.f > 0 ? 0 : PI; me.onStand = () => { me.z = b.z + b.f * 1.15; }; }); });
  },
});

const pivots = [], busy = [false, false];
const swingAngle = (i, now) => Math.sin(now / 1000 * 2.3 + i * 1.7) * .55;
defineActivity({
  id:'swing', st:ST.SWING,
  setup(){
    W.place('swingSet', {x:SW.cx, z:SW.z});                      // 틀 (props/aptStreet.js). 앉는 판은 흔들리도록 축마다 따로 매단다
    SW.seats.forEach(sx => { const p = new THREE.Group(); p.position.set(sx, SW.top - .1 * UNIT, SW.z); p.add(buildProp('swingSeat')); root.add(p); pivots.push(p); });
    spotLabel('그네', SW.cx, 4.4, SW.z);
    SIT.set(ST.SWING, {arm:-.45, y:.06});
    POSES.set(ST.SWING, (w, ch, now) => {
      const i = w === me ? me.seat : (Math.abs(w.x - SW.seats[0]) < Math.abs(w.x - SW.seats[1]) ? 0 : 1), th = swingAngle(i, now);
      ch.position.set(SW.seats[i], SW.top - SW.L * Math.cos(th) - .5, SW.z - SW.L * Math.sin(th)); ch.rotation.set(-th * .7, 0, 0); busy[i] = true; w.y = 0;
    });
  },
  offer(offer){
    const d = Math.hypot(me.x - SW.cx, me.z - SW.z); if (d >= 3.6) return;
    const i = [0, 1].sort((p, q) => Math.abs(me.x - SW.seats[p]) - Math.abs(me.x - SW.seats[q])).find(k => !seatTaken(SW.seats[k], SW.z, ST.SWING));
    if (i !== undefined) offer(d, 3.6, '그네 타기', () => { me.st = ST.SWING; me.seat = i; me.x = SW.seats[i]; me.z = SW.z; me.r = 0; me.onStand = () => { me.z = SW.z + 2.2; me.char.rotation.x = 0; }; });
  },
  frame(dt, now){ pivots.forEach((p, i) => { p.rotation.x = busy[i] ? swingAngle(i, now) : p.rotation.x * (1 - Math.min(1, dt * 3)); busy[i] = false; }); },
});
