// 놀이터 나선 미끄럼틀: 계단으로 탑에 올라가 E를 누르면 기둥을 두 바퀴 돌아 내려온다.
// 길은 소품(props/aptStreet.js의 spiralPath, 미터)에서 받아 맵 좌표(map/layout.js의 SLIDE)로 옮긴다.
import { S, setMode } from '../core/state.js';
import { sfx, flash } from '../core/fx.js';
import { ST, UNIT } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me } from '../entities/player.js';
import { SIT, POSES } from '../entities/character.js';
import { defineActivity, begin } from './registry.js';
import { SLIDE } from '../map/layout.js';
import { SPIRAL, spiralPath } from '../props/aptStreet.js';

const DUR = 6.2, c = Math.cos(SLIDE.rot), s = Math.sin(SLIDE.rot);
const world = (x, y, z) => [SLIDE.x + (x * c + z * s) * UNIT, y * UNIT, SLIDE.z + (-x * s + z * c) * UNIT];
const PATH = spiralPath(240).map(p => world(p.x, p.y, p.z)), N = PATH.length - 1;
const TOP = world(-SPIRAL.R, SPIRAL.H, .6), OUT = world(-SPIRAL.R, 0, -SPIRAL.out - 1.1);
// 길 위의 위치 u(0~1) → [x, y, z, 바라보는 방향]
function at(u){
  const f = Math.min(N - 1e-6, Math.max(0, u * N)), i = Math.floor(f), t = f - i, a = PATH[i], b = PATH[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, Math.atan2(b[0] - a[0], b[2] - a[2])];
}
const ease = u => u * (.45 + .55 * u);                              // 점점 빨라진다

const slide = defineActivity({
  id:'slide', st:ST.SLIDE, hideLabels:true,
  setup(){
    spotLabel('미끄럼틀', TOP[0], SPIRAL.H * UNIT + 4.6, TOP[2]);
    SIT.set(ST.SLIDE, {arm:-1.0, y:-.18});
    // 타는 자세: 내 캐릭터는 놀이 진행도를 쓰고, 다른 사람은 (x, z)에서 길 위의 가장 가까운 점을 찾아 높이를 맞춘다 (두 바퀴가 겹치므로 앞으로만 찾는다)
    POSES.set(ST.SLIDE, (w, ch, now) => {
      let u;
      if (w === me) u = me.slideU || 0;
      else { if (!(now - (w.slideSeen || 0) < 600)) w.slideI = 0; w.slideSeen = now;
        let best = w.slideI, bd = 1e9; for (let i = w.slideI; i <= Math.min(N, w.slideI + 60); i++) { const d = (PATH[i][0] - w.x) ** 2 + (PATH[i][2] - w.z) ** 2; if (d < bd) { bd = d; best = i; } }
        w.slideI = best; u = best / N; }
      const p = at(u); ch.position.set(p[0], p[1] + .12, p[2]); ch.rotation.set(0, p[3], 0); w.y = p[1];
    });
  },
  offer(offer){
    if (W.groundY(me.x, me.z) < SPIRAL.H * UNIT - .3) return;        // 탑 위에 있을 때만
    offer(Math.hypot(me.x - TOP[0], me.z - TOP[2]), 2.4, '미끄럼틀 타기', slide.start);
  },
  start(){ begin(slide, {t:0}); me.slideU = 0; sfx(360, 140, 2.2, 'triangle', .05); },
  update(dt){
    const g = S.game; g.t += dt; const u = Math.min(1, g.t / DUR), p = at(ease(u)), ox = me.x, oz = me.z;
    me.slideU = ease(u); me.x = p[0]; me.z = p[2]; me.r = p[3];
    if (u >= 1) { setMode('walk'); S.game = null; me.st = 0; me.x = OUT[0]; me.z = OUT[2]; me.y = .2; flash('한 번 더?'); }
    return Math.hypot(me.x - ox, me.z - oz);
  },
});
