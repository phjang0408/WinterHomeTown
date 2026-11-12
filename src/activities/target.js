// 운동장 눈덩이 과녁: 움직이는 과녁 3개에 눈덩이 10개를 던진다.
import * as THREE from '../lib/three.js';
import { M, mesh, canvasTex } from '../core/gfx.js';
import { root } from '../core/engine.js';
import { S } from '../core/state.js';
import { PI, TAU, clamp } from '../core/util.js';
import { sfx, flash, throwBall, after } from '../core/fx.js';
import { ST } from '../config.js';
import { spotLabel } from '../world/builders.js';
import { me } from '../entities/player.js';
import { emote } from '../entities/character.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, finish } from './registry.js';
import { TG } from '../map/layout.js';

const boards = [];
const targetX = i => TG.b[i] + TG.A[i] * Math.sin(Date.now() / 1000 * TG.w[i] + TG.ph[i]);
const FIELD = {x0:480, x1:586};
const stat = () => hud.stat('남은 눈덩이 ' + S.game.shots + ' · ' + S.game.score + '점');

const target = defineActivity({
  id:'target', st:ST.TARGET, score:{index:0, label:'과녁', unit:'점'}, hideLabels:true,
  setup(){
    const ring = canvasTex(128, 128, g => [[64,'#fafafa'],[52,'#d9695c'],[36,'#fafafa'],[20,'#d9695c']].forEach(a => { g.fillStyle = a[1]; g.beginPath(); g.arc(64,64,a[0],0,TAU); g.fill(); }));
    TG.b.forEach((bx, i) => { const g = new THREE.Group(); g.position.set(bx, 0, TG.z);
      mesh(new THREE.CylinderGeometry(.09,.09,TG.y,8), M(0x8a6f5a), 0, TG.y / 2, -.12, g);
      mesh(new THREE.CylinderGeometry(TG.R[i] + .1, TG.R[i] + .1, .14, 28).rotateX(PI / 2), M(0x8a6f5a), 0, TG.y, -.09, g);
      const d = new THREE.Mesh(new THREE.CircleGeometry(TG.R[i], 32), new THREE.MeshLambertMaterial({map:ring})); d.position.set(0, TG.y, 0); g.add(d);
      root.add(g); boards.push(g); });
    spotLabel('눈덩이 과녁', TG.b[1], 6.8, TG.z);
  },
  offer(offer){ if (me.x > FIELD.x0 + 2 && me.x < FIELD.x1 - 2 && me.z > TG.line - 12 && me.z < 233) offer(Math.abs(me.z - TG.line), 40, '눈덩이 과녁 던지기', target.start); },
  start(){ begin(target, {shots:10, score:0, cool:0, flying:0}); me.x = TG.b[1]; me.z = TG.line; me.r = PI;
    hud.showGame('눈덩이 과녁'); hud.aim(true); stat(); flash('과녁을 눌러 던지기'); },
  camera(want, look){ want.set(TG.b[1], 6.2, TG.line + 8.5); look.set(TG.b[1], TG.y, TG.z); return true; },
  onTap(ray){
    const o = ray.origin, d = ray.direction; if (d.z > -1e-4) return;
    const t = (TG.z - o.z) / d.z, ax = clamp(o.x + d.x * t, FIELD.x0, FIELD.x1), ay = clamp(o.y + d.y * t, .3, 7.5), g = S.game, now = performance.now();
    if (!g || g.shots <= 0 || now < g.cool) return;
    g.shots--; g.cool = now + 350; g.flying++; me.em = [me.em[0] + 1, 3]; emote(me.char, 3); me.th = [me.th[0] + 1, +ax.toFixed(2), +ay.toFixed(2)];
    throwBall([me.x + .35, 1.5, me.z - .3], [ax, ay, TG.z + .1], land); sfx(500, 240, .18); stat();
  },
  frame(dt, now){ boards.forEach((g, i) => { g.position.x = targetX(i); const h = g.userData.hit ? (now - g.userData.hit) / 300 : 1; g.scale.setScalar(h < 1 ? 1 + Math.sin(h * PI) * .18 : 1); }); },
  remote(R, p){
    if (R.thQ !== undefined && p.th[0] !== R.thQ && R.x > FIELD.x0 - 2 && R.x < FIELD.x1 + 2 && R.z > TG.line - 16 && R.z < 236)
      throwBall([R.x + .35, 1.5, R.z - .3], [clamp(p.th[1], FIELD.x0, FIELD.x1), clamp(p.th[2], .3, 7.5), TG.z + .1]);
    R.thQ = p.th[0];
  },
});
function land(x, y){
  const g = S.game; if (!g || S.mode !== 'target') return;
  let pts = 0, hit = -1;
  for (let i = 0; i < 3; i++) { const d = Math.hypot(x - targetX(i), y - TG.y), R = TG.R[i]; if (d < R) { const p = d < R * .32 ? 10 : d < R * .66 ? 5 : 2; if (p > pts) { pts = p; hit = i; } } }
  if (hit >= 0) { g.score += pts; boards[hit].userData.hit = performance.now(); flash('+' + pts); sfx(pts === 10 ? 880 : 660, pts === 10 ? 1320 : 780, .2, 'triangle'); } else sfx(180, 120, .12);
  g.flying--; stat();
  if (g.shots <= 0 && g.flying <= 0) after(700, () => finish(target, '과녁 맞히기 끝', g.score, target.start));
}
