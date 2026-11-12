// 강변 둔덕 눈썰매: 꼭대기에서 E를 누르면 강을 따라 동쪽으로 미끄러져 내려간다.
import * as THREE from '../lib/three.js';
import { M, box, flat } from '../core/gfx.js';
import { S, setMode } from '../core/state.js';
import { PI } from '../core/util.js';
import { sfx, flash } from '../core/fx.js';
import { ST } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me, extrasHooks } from '../entities/player.js';
import { SIT } from '../entities/character.js';
import { defineActivity, begin } from './registry.js';
import { SLED, HILL } from '../map/layout.js';

const DUR = 3.6;
export function addSled(ch){
  const sled = new THREE.Group(); sled.userData.st = ST.SLED; sled.visible = false;
  box(-.55,-.1,.55,1.5,.12,M(0xb5594a),.12,sled); [-.5, .5].forEach(x => box(x - .05,-.2,x + .05,1.6,.1,M(0x6b7684),0,sled));
  ch.userData.extras.add(sled);
}

const sled = defineActivity({
  id:'sled', st:ST.SLED, hideLabels:true,
  setup(){
    for (let x = SLED.x0 - 1; x < SLED.x1; x += 1.5) { const y0 = W.groundY(x, SLED.z), y1 = W.groundY(x + 1.5, SLED.z);
      const m = flat(x, SLED.z - 1.4, x + 1.5, SLED.z + 1.4, 0xdfe9f0, (y0 + y1) / 2 + .03); m.rotation.y = Math.atan2(y0 - y1, 1.5); }
    W.mmRect(SLED.x0, SLED.z - 1.4, SLED.x1, SLED.z + 1.4, '#cfdde7'); W.mmLabel(HILL.x, HILL.z, '눈썰매', 14);
    for (let i = 0; i < 18; i++) { const a = .7 + Math.random() * (2 * PI - 1.4), r = 5 + Math.random() * (HILL.r - 7); W.pine(HILL.x + Math.cos(a) * r, HILL.z + Math.sin(a) * r); }
    spotLabel('눈썰매', SLED.x0 - 1.5, W.groundY(SLED.x0, SLED.z) + 3.4, SLED.z);
    SIT.set(ST.SLED, {arm:-1.1, y:-.22});
    extrasHooks.push(addSled);
  },
  offer(offer){ offer(Math.hypot(me.x - (SLED.x0 - 1), me.z - SLED.z), 3.5, '눈썰매 타기', sled.start); },
  start(){ begin(sled, {t:0}); me.x = SLED.x0; me.z = SLED.z; me.r = PI / 2; S.cam.yaw = -PI / 2; S.cam.pitch = .3; sfx(300, 120, 1.6, 'triangle', .05); },
  update(dt){
    const g = S.game; g.t += dt; const u = Math.min(1, g.t / DUR), e = u * u * (3 - 2 * u), ox = me.x;
    me.x = SLED.x0 + (SLED.x1 - SLED.x0) * e; me.z = SLED.z + Math.sin(g.t * 3) * .25 * (1 - u);
    if (u >= 1) { setMode('walk'); S.game = null; me.st = 0; me.x = SLED.x1; me.z = SLED.z; flash('한 번 더?'); }
    return Math.abs(me.x - ox);
  },
});
