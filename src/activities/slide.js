// 놀이터 U자 미끄럼틀 (2026-11-21 2차): 계단으로 탑에 올라가 E를 누르면 한 번 U턴해 내려온다.
//   빠르게(약 4초) 내려오고, 시점은 뒤에서 길을 따라가며 속도에 따라 화면이 조금 넓어진다(FOV).
// 길은 소품(props/aptStreet.js의 spiralPath, 미터)에서 받아 맵 좌표(map/layout.js의 SLIDE)로 옮긴다.
import { S, setMode } from '../core/state.js';
import { sfx, flash, puff } from '../core/fx.js';
import { camera as cam3 } from '../core/engine.js';
import { ST, UNIT } from '../config.js';
import { W } from '../world/world.js';
import { me } from '../entities/player.js';
import { SIT, POSES } from '../entities/character.js';
import { defineActivity, begin } from './registry.js';
import { SLIDE } from '../map/layout.js';
import { SPIRAL, spiralPath } from '../props/aptStreet.js';

const DUR = 4.2, c = Math.cos(SLIDE.rot), s = Math.sin(SLIDE.rot);
const world = (x, y, z) => [SLIDE.x + (x * c + z * s) * UNIT, y * UNIT, SLIDE.z + (-x * s + z * c) * UNIT];
// (2026-11-21) 예전 나선형의 R · out을 쓰던 자리가 NaN이 되어 '타기'가 안 떴다 → 탑 바닥 가운데와 착지 매트 끝으로 바꾼다
const D = SPIRAL.deck, RAW = spiralPath(480), END = RAW[RAW.length - 1], DIR = END.clone().sub(RAW[RAW.length - 8]).setY(0).normalize();
const TOP = world((D[0] + D[2]) / 2, SPIRAL.H, (D[1] + D[3]) / 2), OUT = world(END.x + DIR.x * 2.6, 0, END.z + DIR.z * 2.6);
const PATH = RAW.map(p => world(p.x, p.y, p.z)), N = PATH.length - 1;
// 길 위의 위치 u(0~1) → [x, y, z, 바라보는 방향]
function at(u){
  const f = Math.min(N - 1e-6, Math.max(0, u * N)), i = Math.floor(f), t = f - i, a = PATH[i], b = PATH[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, Math.atan2(b[0] - a[0], b[2] - a[2])];
}
const ease = u => u * (.25 + .75 * u);                              // 점점 빨라진다 (끝에서 가장 빠름)
const FOV0 = 55;
function endRide(){ cam3.fov = FOV0; cam3.updateProjectionMatrix(); }

const slide = defineActivity({
  id:'slide', st:ST.SLIDE, hideLabels:true,
  setup(){
    SIT.set(ST.SLIDE, {arm:-1.0, y:-.18});
    // 타는 자세: 내 캐릭터는 놀이 진행도를 쓰고, 다른 사람은 (x, z)에서 길 위의 가장 가까운 점을 찾아 높이를 맞춘다 (두 바퀴가 겹치므로 앞으로만 찾는다)
    POSES.set(ST.SLIDE, (w, ch, now) => {
      let u;
      if (w === me) u = me.slideU || 0;
      else { if (!(now - (w.slideSeen || 0) < 600)) w.slideI = 0; w.slideSeen = now;
        let best = w.slideI, bd = 1e9; for (let i = w.slideI; i <= Math.min(N, w.slideI + 80); i++) { const d = (PATH[i][0] - w.x) ** 2 + (PATH[i][2] - w.z) ** 2; if (d < bd) { bd = d; best = i; } }
        w.slideI = best; u = best / N; }
      const p = at(u); ch.position.set(p[0], p[1] + .12, p[2]); ch.rotation.set(0, p[3], 0); w.y = p[1];
    });
  },
  offer(offer){
    if (W.groundY(me.x, me.z) < SPIRAL.H * UNIT - .3) return;        // 탑 위에 있을 때만
    offer(Math.hypot(me.x - TOP[0], me.z - TOP[2]), 3.2, '미끄럼틀 타기', slide.start);
  },
  start(){ begin(slide, {t:0, puffT:0}); me.slideU = 0; sfx(300, 900, DUR, 'triangle', .04); flash('간다~ 꽉 잡아!'); },
  quit(){ endRide(); },
  // 시점: 타는 사람 뒤 · 위에서 길 앞쪽을 본다 (2026-11-21 2차)
  camera(want, look){ const u = me.slideU || 0, p = at(u), q = at(Math.min(1, u + .05)), b = at(Math.max(0, u - .07));
    const bx = p[0] - b[0], bz = p[2] - b[2], L = Math.hypot(bx, bz) || 1;
    want.set(p[0] - bx / L * 4.3, p[1] + 2.7, p[2] - bz / L * 4.3); look.set(q[0], q[1] + .3, q[2]); return true; },
  update(dt){
    const g = S.game; g.t += dt; const u = Math.min(1, g.t / DUR), p = at(ease(u)), ox = me.x, oz = me.z;
    me.slideU = ease(u); me.x = p[0]; me.z = p[2]; me.r = p[3];
    const v = .25 + 1.5 * u; cam3.fov = FOV0 + 12 * Math.min(1, v); cam3.updateProjectionMatrix();          // 빨라질수록 화면이 넓어진다
    if ((g.puffT -= dt) < 0 && u > .2) { g.puffT = .12; puff(p[0], p[1] + .2, p[2], 2); }                    // 엉덩이 뒤로 눈가루
    if (u >= 1) { endRide(); setMode('walk'); S.game = null; me.st = 0; me.x = OUT[0]; me.z = OUT[2]; me.y = W.groundY(OUT[0], OUT[2]); puff(me.x, me.y + .3, me.z, 10); sfx(200, 90, .25, 'triangle', .06); flash('슝~ 한 번 더?'); }
    return Math.hypot(me.x - ox, me.z - oz);
  },
});
