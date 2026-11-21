// 마을버스 타기 (2026-11-20 3차): 순환 도로를 도는 노란 마을버스에 탄다.
//   버스 옆에서 E(버스 타기) → 캐릭터가 안으로 들어가 버스와 함께 움직인다(보이지 않는다). 시점은 돌릴 수 있다.
//   E(버스에서 내리기) 또는 그만하기 → 그 자리 버스 오른쪽(문 쪽) 땅에 바로 내린다. 막혀 있으면 왼쪽.
//   다른 사람 화면: 탄 사람은 숨기고, 위치는 버스를 따라간다 (따로 보내는 값 없음, 상태 코드 BUS만).
import { ST } from '../config.js';
import { sfx, flash } from '../core/fx.js';
import { W } from '../world/world.js';
import { me } from '../entities/player.js';
import { townBus } from '../entities/vehicles.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, stopActivity } from './registry.js';

// 버스 기준 거리: 앞뒤(along) · 옆(lat)
function near(x, z){
  const V = townBus(); if (!V) return null;
  const o = V.obj.position, hx = Math.sin(V.r), hz = Math.cos(V.r), rx = x - o.x, rz = z - o.z;
  return {along:rx * hx + rz * hz, lat:Math.abs(rx * hz - rz * hx), d:Math.hypot(rx, rz)};
}
function getOff(){
  const V = townBus(), o = V.obj.position, hx = Math.sin(V.r), hz = Math.cos(V.r);
  for (const k of [1, -1]) for (const d of [2.9, 3.6, 4.4]) {                       // 오른쪽(문 쪽) 먼저: 진행 방향 × 위 = (-hz, hx)
    const x = o.x - hz * d * k, z = o.z + hx * d * k; if (!W.blocked(x, z, 0)) { me.x = x; me.z = z; me.r = Math.atan2(-hz * k, hx * k); return; } }
  me.x = o.x - hz * 3; me.z = o.z + hx * 3;
}
const bus = defineActivity({
  id:'bus', st:ST.BUS, ctl:true, hideLabels:false,
  offer(offer){
    const n = near(me.x, me.z); if (!n || n.d > 8) return;
    if (Math.abs(n.along) < 5.2 && n.lat < 3.6) offer(n.lat, 3.6, '마을버스 타기', bus.start);
  },
  start(){
    begin(bus, {}); me.char.visible = false; sfx(700, 900, .12, 'square', .04);
    hud.showGame('마을버스 타는 중'); hud.stat('창밖 구경 중… 내릴 때 E 또는 그만하기'); flash('삑! 마을버스에 탔어요');
  },
  update(){ const V = townBus(), o = V.obj.position; me.x = o.x; me.z = o.z; me.r = V.r; me.y = W.groundY(o.x, o.z); return 0; },
  prompt(){ return {label:'버스에서 내리기', run:() => stopActivity()}; },
  quit(){ getOff(); me.y = undefined; me.char.visible = true; sfx(900, 600, .12, 'square', .04); flash('내렸어요'); },
  remoteFrame(R){
    if (!R.char) return;
    if (R.st === ST.BUS) { R.char.visible = false; R.busHid = true; }
    else if (R.busHid) { R.char.visible = true; R.busHid = false; }
  },
});
