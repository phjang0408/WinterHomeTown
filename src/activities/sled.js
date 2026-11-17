// 강변 얼음 썰매장 (2026-11-17): 평평한 얼음판 위에서 앉은뱅이 썰매를 차처럼 몬다.
//   W(앞): 두 폴대로 얼음을 찍어 민다 (누르고 있으면 박자마다 한 번씩), A · D: 방향, S: 브레이크. E로 언제든 내린다.
//   얼음이라 옆으로 미끄러지며 천천히 방향이 따라온다. 판자 벽에 부딪히면 튕겨 나온다.
import * as THREE from '../lib/three.js';
import { M, box } from '../core/gfx.js';
import { S, setMode } from '../core/state.js';
import { PI, wrapA } from '../core/util.js';
import { sfx, flash } from '../core/fx.js';
import { ST } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me, extrasHooks } from '../entities/player.js';
import { SIT } from '../entities/character.js';
import { defineActivity, begin } from './registry.js';
import { SLED } from '../map/layout.js';

const STROKE = .55, PUSH = 2.4, VMAX = 9, TURN = 1.9, GRIP = 1.6, FRICTION = .12, BRAKE = 5;
// 썰매 + 두 폴대. 폴대는 어깨 높이 축(pivot)에 달려 밀 때 뒤로 젖혀진다.
export function addSled(ch){
  const sled = new THREE.Group(); sled.userData.st = ST.SLED; sled.visible = false;
  box(-.5, -.15, .5, 1.25, .1, M(0x8a5a3c), .14, sled); box(-.52, 1.15, .52, 1.3, .14, M(0x8a5a3c), .1, sled);       // 나무 앉음판과 앞 턱
  [-.42, .42].forEach(x => box(x - .04, -.25, x + .04, 1.35, .06, M(0x9aa3a8), .02, sled));                              // 쇠 날
  const poles = [];
  [-1, 1].forEach(s => { const p = new THREE.Group(); p.position.set(s * .42, .62, .35); sled.add(p);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.0, 6), M(0x3a4048)); stick.position.y = -.42; p.add(stick);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .14, 8), M(0xd83a2e)); grip.position.y = .02; p.add(grip);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.03, .1, 6), M(0xc4cace)); tip.rotation.x = PI; tip.position.y = -.95; p.add(tip);
    p.rotation.x = .35; poles.push(p); });
  sled.userData.poles = poles; ch.userData.extras.add(sled);
}
const stop = msg => { setMode('walk'); S.game = null; me.st = 0; me.vx = me.vz = 0; if (msg) flash(msg); };
const inRink = (x, z, m = 0) => x > SLED.x0 + m && x < SLED.x1 - m && z > SLED.z0 + m && z < SLED.z1 - m;
const myPoles = () => { const ex = me.char && me.char.userData.extras; if (!ex) return null; const s = ex.children.find(c => c.userData.st === ST.SLED); return s ? s.userData.poles : null; };

const sled = defineActivity({
  id:'sled', st:ST.SLED, hideLabels:true,
  setup(){
    spotLabel('얼음 썰매 타는 곳', SLED.start.x, W.groundY(SLED.start.x, SLED.start.z) + 2.6, SLED.start.z);
    SIT.set(ST.SLED, {arm:-.7, y:-.22});
    extrasHooks.push(addSled);
  },
  offer(offer){ if (inRink(me.x, me.z, .5)) offer(1, 5, '얼음 썰매 타기', sled.start); else if (inRink(me.x, me.z, -3)) offer(Math.hypot(me.x - SLED.start.x, me.z - SLED.start.z), 5, '얼음 썰매 타기', sled.start); },   // 얼음 위 어디서나 탈 수 있다
  prompt(){ return {label:'썰매에서 내리기', run:() => stop()}; },
  start(){ begin(sled, {t:0, stroke:0, h:0, speed:0}); if (!inRink(me.x, me.z, 1)) { me.x = SLED.start.x; me.z = SLED.start.z; } me.r = PI / 2; me.vx = me.vz = 0;
    S.cam.yaw = -PI / 2; S.cam.pitch = .32; flash('W: 폴대로 밀기 · A D: 방향 · S: 멈추기'); sfx(420, 300, .2, 'triangle', .05); },
  update(dt){
    const g = S.game, K = S.keys, joy = S.joy; g.t += dt;
    let f = (K.up ? 1 : 0) - (K.down ? 1 : 0), s = (K.right ? 1 : 0) - (K.left ? 1 : 0); if (!f && !s && joy && joy.m > .15) { s = joy.vx; f = -joy.vy; }
    // 방향: 차처럼 썰매 머리를 돌린다 (빠를수록 덜 돈다)
    const sp = Math.hypot(me.vx, me.vz); me.r = wrapA(me.r - s * TURN * dt * (1 - Math.min(.45, sp / VMAX * .45)));
    const hx = Math.sin(me.r), hz = Math.cos(me.r);
    // 밀기: 누르고 있으면 STROKE마다 한 번 폴대로 찍어 민다 (찍는 순간 속도가 붙는다)
    g.stroke = Math.max(0, g.stroke - dt);
    if (f > 0 && g.stroke === 0) { me.vx += hx * PUSH; me.vz += hz * PUSH; g.stroke = STROKE; sfx(180, 120, .08, 'square', .02); }
    // 얼음: 속도가 머리 방향으로 천천히 따라오고(옆 미끄러짐), 마찰은 작다. S는 브레이크
    const along = me.vx * hx + me.vz * hz, k = Math.min(1, GRIP * dt);
    me.vx += (hx * along - me.vx) * k; me.vz += (hz * along - me.vz) * k;
    const v = Math.hypot(me.vx, me.vz), dec = (FRICTION + (f < 0 ? BRAKE / Math.max(1, v) : 0)) * dt, m = Math.max(0, 1 - dec);
    me.vx *= m; me.vz *= m; if (v > VMAX) { me.vx *= VMAX / v; me.vz *= VMAX / v; }
    // 폴대: 미는 순간 뒤로 젖혔다가 앞으로 돌아온다
    const poles = myPoles(); if (poles) { const t = g.stroke / STROKE, a = .35 - Math.sin(t * PI) * 1.1; poles.forEach(p => { p.rotation.x = a; }); }
    // 이동과 부딪힘 (판자 벽에서 튕겨 나온다)
    const ox = me.x, oz = me.z, nx = me.x + me.vx * dt, nz = me.z + me.vz * dt;
    if (!W.blocked(nx, me.z, me.y) && inRink(nx, me.z, .4)) me.x = nx; else { me.vx *= -.4; if (Math.abs(me.vx) > 2) sfx(140, 90, .1, 'sine', .04); }
    if (!W.blocked(me.x, nz, me.y) && inRink(me.x, nz, .4)) me.z = nz; else { me.vz *= -.4; if (Math.abs(me.vz) > 2) sfx(140, 90, .1, 'sine', .04); }
    return Math.hypot(me.x - ox, me.z - oz);
  },
});
