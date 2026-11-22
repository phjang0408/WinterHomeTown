// 길거리 간식 (2026-11-20 4차): 윗길 북쪽 보도 화단 사이의 군고구마 포장마차(아저씨)와 호떡 노점(아주머니).
//   사면 손에 하나 들리고, '…먹기'(E, 가까이 다른 할 일이 있으면 그쪽이 먼저)로 바로 먹는다. 세 입에 다 먹는다.
//   목욕탕 앞 평상에 앉으면 바나나우유를 들고 가끔 한 모금씩 마신다 (seats.js가 me.it을 [2, …]로 바꾼다).
//   손에 든 것은 다른 사람에게도 보인다 (protocol의 it: [물건, 남은 입, 먹는 중]). 물건: 1 군고구마, 2 바나나우유, 3 호떡
import { sfx, flash, puff } from '../core/fx.js';
import { root } from '../core/engine.js';
import { buildProp } from '../props/registry.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me } from '../entities/player.js';
import { makeVendor, animVendor, say } from '../entities/npc.js';
import { ST } from '../config.js';
import { S } from '../core/state.js';
import { defineActivity } from './registry.js';
import { GOGUMA, HOTTEOK } from '../map/layout.js';

const U = 1 / .85, BITE = .55, PI2 = Math.PI * 2;
const at = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return {x:p.x + (lx * c + lz * s) * U, z:p.z + (-lx * s + lz * c) * U}; };
const STALLS = [
  {pos:GOGUMA, prop:'gogumaCart', item:1, name:'군고구마', vendor:'ajeossi', chim:[.75, -.35, 3.1], color:'#e0672c',
    lines:['따끈할 때 먹어라~', '호호 불어 먹어', '제일 큰 걸로 줬다!']},
  {pos:HOTTEOK, prop:'hotteokStall', item:3, name:'호떡', vendor:'ajumma', chim:[-.1, -.1, 1.1], color:'#d04a3a',
    lines:['꿀 뜨거우니 조심해~', '하나 더 얹었어!', '맛있게 먹어요~']},
];
const ITEMS = {1:{prop:'goguma', s:2.2, eat:'군고구마 먹기', done:'후~ 다 먹었다. 속까지 따뜻해!'}, 2:{prop:'bananaMilk', opts:{n:1, straw:true}, s:1.6}, 3:{prop:'hotteok', s:2.0, eat:'호떡 먹기', done:'꿀이 쭉~ 다 먹었다!'}};
STALLS.forEach(t => { t.front = at(t.pos, 0, 1.55); t.back = at(t.pos, 0, -1.05); });

// 손에 든 물건: 오른팔(armR) 끝에 붙인다. 남은 입(it[1])만큼 줄고, 먹는 중이면 팔을 입으로 올린다
function holdIn(w, ch, it, now){
  if (!ch) return;
  const u = ch.userData, id = it ? it[0] : 0, def = ITEMS[id];
  if (w.hand && (w.hand.parent !== u.armR || w.handId !== id)) { if (w.hand.parent) w.hand.parent.remove(w.hand); w.hand = null; }
  if (!def) return;
  if (!w.hand) { w.hand = buildProp(def.prop, def.opts); w.hand.scale.setScalar(def.s); const fz = id === 2 ? 1 : -1; if (fz > 0) w.hand.position.set(0, -.62, .12); else w.hand.position.set(0, -.5, -.03); w.hand.rotation.x = -1.2 * fz; u.armR.add(w.hand); w.handId = id; }   // (2026-11-22) 군고구마 · 호떡은 손바닥 쪽, 손 위쪽으로 올려 쥔다
  w.hand.visible = it[1] > 0; if (!w.hand.visible) return;
  if (id !== 2) w.hand.scale.set(def.s, def.s * (.45 + .55 * it[1] / 3), def.s);
  const st = w.st || 0;
  if (id === 2) { if (st !== ST.PLAT) return; const k = (now / 1000) % 4; const sip = k < 1.1 ? Math.sin(k / 1.1 * Math.PI) : 0;   // 평상: 4초마다 한 모금
    u.armR.rotation.x = -.5 - 1.75 * sip; u.armR.rotation.z = .25 + .35 * sip; w.hand.rotation.x = .5 + .45 * sip; return; }   // (2026-11-21) 병이 거꾸로 들리던 것: 팔 각도와 더해 평소엔 똑바로, 마실 땐 입 쪽으로 기울게
  if (st !== 0) return;                                                    // 다른 놀이 중에는 팔을 그 놀이에 맡긴다
  if (it[2]) { const k = Math.sin(now / 1000 * PI2 / BITE) * .5 + .5; u.armR.rotation.x = -2.1 - .35 * k; u.armR.rotation.z = .55; }
  else { u.armR.rotation.x = -.75; u.armR.rotation.z = .3; }
}
function eat(){
  if (!me.it || !ITEMS[me.it[0]] || !ITEMS[me.it[0]].eat || me.it[2]) return;
  me.it = [me.it[0], me.it[1], 1]; me.eatT = performance.now(); me.eatK = me.it[1];
  flash('호호 불어 가며 냠냠');
}
let steamT = 0;
defineActivity({
  id:'snack', st:undefined,
  setup(){
    STALLS.forEach(t => {
      W.place(t.prop, {x:t.pos.x, z:t.pos.z, rot:t.pos.rot});
      spotLabel(t.name, t.pos.x, W.groundY(t.pos.x, t.pos.z) + 3.4, t.pos.z);
      W.mmCircle(t.pos.x, t.pos.z, 1.4, t.color);
      t.npc = makeVendor(t.vendor); t.npc.position.set(t.back.x, W.groundY(t.back.x, t.back.z), t.back.z); t.npc.rotation.y = t.pos.rot; root.add(t.npc);
      W.circle(t.back.x, t.back.z, .45);
    });
  },
  offer(offer){
    if (S.mode !== 'walk' || me.st !== 0) return;
    const has = me.it && ITEMS[me.it[0]] && me.it[1] > 0;
    STALLS.forEach(t => { const d = Math.hypot(me.x - t.front.x, me.z - t.front.z);
      if (!has && d < 2.6) offer(d, 2.6, t.name + ' 사기', () => { me.it = [t.item, 3, 0]; sfx(880, 1320, .08, 'square', .03); flash('따끈따끈한 ' + t.name + ' 하나!');
        say(t.npc, t.lines[Math.floor(Math.random() * t.lines.length)]); puff(t.front.x, W.groundY(t.front.x, t.front.z) + 1.4, t.front.z, 6); }); });
    if (has && ITEMS[me.it[0]].eat && !me.it[2]) offer(60, 99, ITEMS[me.it[0]].eat, eat, 'food');   // 가장 나중 순위
  },
  frame(dt, now){
    STALLS.forEach(t => {
      const near = Math.hypot(me.x - t.front.x, me.z - t.front.z) < 6;
      animVendor(t.npc, dt, now, near, me.x, me.z, t.pos.rot);
    });
    if ((steamT -= dt) < 0) { steamT = .7; STALLS.forEach(t => { if (Math.hypot(me.x - t.pos.x, me.z - t.pos.z) < 45) { const c = at(t.pos, t.chim[0], t.chim[1]); puff(c.x, W.groundY(t.pos.x, t.pos.z) + t.chim[2], c.z, 2); } }); }
    if (me.it && me.it[2]) {
      const k = me.eatK - Math.floor((now - me.eatT) / 1000 / BITE);
      if (k !== me.it[1]) { me.it = [me.it[0], Math.max(0, k), 1]; sfx(300, 200, .07, 'triangle', .04); }
      if (k <= 0) { const d = ITEMS[me.it[0]]; me.it = [0, 0, 0]; flash(d && d.done || '다 먹었다!'); }
    }
    holdIn(me, me.char, me.it, now);
  },
  remote(R, p){ R.it = p.it; },
  remoteFrame(R){ holdIn(R, R.char, R.it, performance.now()); },
});
