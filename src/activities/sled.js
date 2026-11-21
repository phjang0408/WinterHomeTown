// 강변 얼음 썰매장 (2026-11-17): 평평한 얼음판 위에서 앉은뱅이 썰매를 차처럼 몬다. (2026-11-20 2차) 벽 없음 · 밖으로 나가면 '내리기' · 시점 돌리기 됨
//   W(앞): 두 폴대로 얼음을 찍어 민다 (누르고 있으면 박자마다 한 번씩), A · D: 방향, S: 브레이크. E로 언제든 내린다.
//   얼음이라 옆으로 미끄러지며 천천히 방향이 따라온다. 판자 벽에 부딪히면 튕겨 나온다.
import * as THREE from '../lib/three.js';
import { M, box } from '../core/gfx.js';
import { S, setMode } from '../core/state.js';
import { PI, wrapA } from '../core/util.js';
import { sfx, flash, puff } from '../core/fx.js';
import { root } from '../core/engine.js';
import { ST } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me, extrasHooks } from '../entities/player.js';
import { SIT } from '../entities/character.js';
import { defineActivity, begin } from './registry.js';
import { SLED } from '../map/layout.js';
import { hud } from '../ui/hud.js';

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
// ── 별사탕 줍기 (2026-11-21 2차): 얼음판 곳곳에 별사탕이 떠 있고, 썰매로 지나가면 줍는다. 다 주우면 걸린 시간 · 최고 기록, 다시 뿌린다.
//    내 화면에만 보인다 (동기화 없음). 썰매에서 내리면 숨긴다.
const NC = 12, candies = [], CANDY_C = [0xff6b8b, 0xffd23f, 0x6ad0ff, 0x9be15d, 0xc88bff];
let best = 0; try { best = +localStorage.getItem('wt.sledBest') || 0; } catch (e) {}
function makeCandies(){
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647, geo = new THREE.IcosahedronGeometry(.32, 0);
  for (let i = 0; i < NC; i++) {
    const t = (i + .2 + rnd() * .6) / NC, x = SLED.x0 + 8 + (SLED.x1 - SLED.x0 - 16) * t, z = SLED.z0 + 3 + (SLED.z1 - SLED.z0 - 6) * rnd(), c = CANDY_C[i % CANDY_C.length];
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color:c, emissive:c, emissiveIntensity:.45})); m.position.set(x, W.groundY(x, z) + .9, z); m.visible = false; m.castShadow = true; root.add(m);
    candies.push({m, x, z, got:false, ph:rnd() * 6});
  }
}
const showCandies = on => candies.forEach(c => { c.got = false; c.m.visible = on; c.m.scale.setScalar(1); });
const candyStat = g => hud.stat('별사탕 ' + g.got + '/' + NC + ' · ' + g.clock.toFixed(1) + '초' + (best ? ' · 최고 ' + best.toFixed(1) + '초' : ''));
const stop = msg => { setMode('walk'); S.game = null; me.st = 0; me.vx = me.vz = 0; hud.hideGame(); showCandies(false); if (msg) flash(msg); };
const inRink = (x, z, m = 0) => x > SLED.x0 + m && x < SLED.x1 - m && z > SLED.z0 + m && z < SLED.z1 - m;
const myPoles = () => { const ex = me.char && me.char.userData.extras; if (!ex) return null; const s = ex.children.find(c => c.userData.st === ST.SLED); return s ? s.userData.poles : null; };

const sled = defineActivity({
  id:'sled', st:ST.SLED, hideLabels:true, ctl:true,   // ctl: 놀이 중에도 시점 돌리기 · 화면 조이스틱을 쓴다 (2026-11-20 2차)
  setup(){
    spotLabel('얼음 썰매 타는 곳', SLED.start.x, W.groundY(SLED.start.x, SLED.start.z) + 2.6, SLED.start.z);
    SIT.set(ST.SLED, {arm:-.7, y:-.22});
    extrasHooks.push(addSled); makeCandies();
  },
  offer(offer){ if (inRink(me.x, me.z, .5)) offer(1, 5, '얼음 썰매 타기', sled.start); else if (inRink(me.x, me.z, -3)) offer(Math.hypot(me.x - SLED.start.x, me.z - SLED.start.z), 5, '얼음 썰매 타기', sled.start); },   // 얼음 위 어디서나 탈 수 있다
  prompt(){ return inRink(me.x, me.z, -.2) ? null : {label:'썰매에서 내리기', run:() => stop()}; },   // (2026-11-20 2차) 얼음판을 벗어나면 내리기 버튼
  quit(){ me.vx = me.vz = 0; showCandies(false); },
  start(){ begin(sled, {t:0, stroke:0, h:0, speed:0, got:0, clock:0, spark:0}); showCandies(true); if (!inRink(me.x, me.z, 1)) { me.x = SLED.start.x; me.z = SLED.start.z; } me.r = PI / 2; me.vx = me.vz = 0;
    S.cam.yaw = -PI / 2; S.cam.pitch = .32; hud.showGame('얼음 썰매 · 별사탕 줍기'); candyStat(S.game); flash('썰매 출발이다~ 별사탕 주우러 가보자고!'); sfx(420, 300, .2, 'triangle', .05); },   // (2026-11-21) 키 설명 대신 옛날 말투, 그만하기 버튼은 놀이 카드에
  update(dt){
    const g = S.game, K = S.keys, joy = S.joy; g.t += dt;
    let f = (K.up ? 1 : 0) - (K.down ? 1 : 0), s = (K.right ? 1 : 0) - (K.left ? 1 : 0); if (!f && !s && joy && joy.m > .15) { s = joy.vx; f = -joy.vy; }
    // 방향: 차처럼 썰매 머리를 돌린다 (빠를수록 덜 돈다)
    const sp = Math.hypot(me.vx, me.vz); me.r = wrapA(me.r - s * TURN * dt * (1 - Math.min(.45, sp / VMAX * .45)));
    const hx = Math.sin(me.r), hz = Math.cos(me.r);
    // 밀기: 누르고 있으면 STROKE마다 한 번 폴대로 찍어 민다 (찍는 순간 속도가 붙는다)
    g.stroke = Math.max(0, g.stroke - dt);
    if (f > 0 && g.stroke === 0) { const k = inRink(me.x, me.z) ? 1 : .45; me.vx += hx * PUSH * k; me.vz += hz * PUSH * k; g.stroke = STROKE; sfx(180, 120, .08, 'square', .02); }
    // 얼음: 속도가 머리 방향으로 천천히 따라오고(옆 미끄러짐), 마찰은 작다. S는 브레이크
    const along = me.vx * hx + me.vz * hz, k = Math.min(1, GRIP * dt);
    me.vx += (hx * along - me.vx) * k; me.vz += (hz * along - me.vz) * k;
    const ice = inRink(me.x, me.z), v = Math.hypot(me.vx, me.vz), dec = ((ice ? FRICTION : 2.2) + (f < 0 ? BRAKE / Math.max(1, v) : 0)) * dt, m = Math.max(0, 1 - dec);   // 얼음 밖(눈 · 길)은 잘 안 나간다
    me.vx *= m; me.vz *= m; if (v > VMAX) { me.vx *= VMAX / v; me.vz *= VMAX / v; }
    // 폴대: 미는 순간 뒤로 젖혔다가 앞으로 돌아온다
    const poles = myPoles(); if (poles) { const t = g.stroke / STROKE, a = .35 - Math.sin(t * PI) * 1.1; poles.forEach(p => { p.rotation.x = a; }); }
    // 이동과 부딪힘 (2026-11-20 2차: 벽이 없어 얼음판 밖으로도 나간다. 다른 것에 부딪히면 튕겨 나온다)
    const ox = me.x, oz = me.z, nx = me.x + me.vx * dt, nz = me.z + me.vz * dt;
    if (!W.blocked(nx, me.z, me.y)) me.x = nx; else { me.vx *= -.4; if (Math.abs(me.vx) > 2) sfx(140, 90, .1, 'sine', .04); }
    if (!W.blocked(me.x, nz, me.y)) me.z = nz; else { me.vz *= -.4; if (Math.abs(me.vz) > 2) sfx(140, 90, .1, 'sine', .04); }
    me.y = W.groundY(me.x, me.z, me.y);
    const out = !inRink(me.x, me.z); if (out !== g.out) { g.out = out; if (out) flash('어이쿠, 얼음판 밖이로구먼'); }
    // 별사탕: 빙글빙글 떠 있다가 가까이 지나가면 줍는다
    g.clock += dt; const now = g.t;
    candies.forEach(c => { if (c.got) { if (c.m.visible) { const k = c.m.scale.x - dt * 5; if (k <= .05) c.m.visible = false; else { c.m.scale.setScalar(k); c.m.position.y += dt * 3; } } return; }
      c.m.rotation.y = now * 2 + c.ph; c.m.rotation.x = now * 1.3; c.m.position.y = W.groundY(c.x, c.z) + .9 + Math.sin(now * 3 + c.ph) * .15;
      if (Math.hypot(me.x - c.x, me.z - c.z) < 1.3) { c.got = true; g.got++; sfx(880 + g.got * 40, 1320 + g.got * 40, .12, 'triangle', .05); puff(c.x, c.m.position.y, c.z, 6);
        if (g.got === NC) { const t = g.clock, rec = !best || t < best; if (rec) { best = t; try { localStorage.setItem('wt.sledBest', String(t)); } catch (e) {} }
          flash(rec ? '별사탕 다 주웠다! 새 기록 ' + t.toFixed(1) + '초' : '별사탕 다 주웠다! ' + t.toFixed(1) + '초'); sfx(520, 1040, .5, 'triangle');
          setTimeout(() => { if (S.game === g) { g.got = 0; g.clock = 0; showCandies(true); } }, 1800); } } });
    candyStat(g);
    // 빠르면 썰매 날 뒤로 얼음 가루가 튄다
    if ((g.spark -= dt) < 0 && v > 5.5 && !out) { g.spark = .14; puff(me.x - Math.sin(me.r) * .8, me.y + .1, me.z - Math.cos(me.r) * .8, 2); }
    return Math.hypot(me.x - ox, me.z - oz);
  },
});
