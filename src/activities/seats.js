// 앉을 수 있는 곳: 벤치, 그네
import * as THREE from '../lib/three.js';
import { M, box, mesh } from '../core/gfx.js';
import { root } from '../core/engine.js';
import { PI } from '../core/util.js';
import { ST } from '../config.js';
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
    const wood = M(0xa8674f);
    box(SW.cx - 3.2, SW.z - .1, SW.cx + 3.2, SW.z + .1, .16, wood, SW.top);
    [SW.cx - 3.1, SW.cx + 3.1].forEach(x => [-.9, .9].forEach(dz => { mesh(new THREE.CylinderGeometry(.09,.09,SW.top,8), wood, x, SW.top / 2, SW.z + dz); W.circle(x, SW.z + dz, .12); }));
    SW.seats.forEach(sx => { const p = new THREE.Group(); p.position.set(sx, SW.top, SW.z);
      [-.3, .3].forEach(dx => mesh(new THREE.CylinderGeometry(.025,.025,SW.L,6), M(0x6b7684), dx, -SW.L / 2, 0, p));
      box(-.42,-.2,.42,.2,.08,M(0x3f8a97),-SW.L - .04,p); root.add(p); pivots.push(p); });
    spotLabel('그네', SW.cx, 4.7, SW.z);
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
