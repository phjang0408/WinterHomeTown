// 공원 눈사람 만들기: 눈덩이를 굴려 키운 뒤 내 깃발 자리에 몸통과 머리를 쌓는다.
import * as THREE from '../lib/three.js';
import { M, mesh } from '../core/gfx.js';
import { root, scene } from '../core/engine.js';
import { S, setMode } from '../core/state.js';
import { sfx, flash } from '../core/fx.js';
import { ST } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { snowmanInto } from '../props/basic.js';
import { me } from '../entities/player.js';
import { GEO } from '../entities/character.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, finish } from './registry.js';
import { SNOW_SPOT, SLOTS } from '../map/layout.js';

const TB = .95, TH = .58, MAX = 1.5, axis = new THREE.Vector3();
let flag, myBall, mySnowman;
export function rollBall(m, w, r, moved){
  const dx = Math.sin(w.r), dz = Math.cos(w.r); m.scale.setScalar(r); m.position.set(w.x + dx * (r + .5), W.groundY(w.x, w.z) + r * .95, w.z + dz * (r + .5));
  if (moved > 0) { axis.set(dz, 0, -dx); m.rotateOnWorldAxis(axis, moved / Math.max(.2, r)); }
}
function hudStage(){
  const t = S.game.stage ? TH : TB, w = t * .16;
  hud.zone((t - w / 2) / MAX, w / MAX);
  hud.gauge((S.game.stage ? '머리' : '몸통') + ' 눈덩이를 굴려 알맞은 크기로 키운 뒤 내 깃발로 가져가세요', false);
  hud.stat(S.game.stage ? '2단계 · 머리' : '1단계 · 몸통');
}
function placeBall(){
  if (!S.game.stage) { me.sm = [+me.ballR.toFixed(2), 0]; S.game.stage = 1; me.ballR = .2; hudStage(); sfx(300, 420, .2); snowmanInto(mySnowman, me.sm[0], 0, me.ci); return; }
  me.sm = [me.sm[0], +me.ballR.toFixed(2)];
  const s = Math.round(Math.max(0, 100 - 120 * (Math.abs(me.sm[0] - TB) / TB + Math.abs(me.sm[1] - TH) / TH)));
  const keep = me.sm; setMode('walk'); finish(snowman, '눈사람 완성', s, snowman.start); me.sm = keep; me.ballR = 0; flag.visible = false;
  snowmanInto(mySnowman, keep[0], keep[1], me.ci);
}

const snowman = defineActivity({
  id:'snow', st:ST.SNOW, score:{index:2, label:'눈사람', unit:'점'}, free:true, speedMul:.85,
  setup(){
    W.place('snowman', {x:SNOW_SPOT.x, z:SNOW_SPOT.z, rb:1.35, rh:.82, ci:0});
    spotLabel('눈사람 만들기', SNOW_SPOT.x, 5.6, SNOW_SPOT.z);
    flag = new THREE.Group(); mesh(new THREE.CylinderGeometry(.05,.05,2.2,6), M(0x6b7684), 0, 1.1, 0, flag);
    flag.userData.cloth = mesh(new THREE.BoxGeometry(.9,.55,.04), new THREE.MeshLambertMaterial({color:0x3f8a97}), .5, 1.85, 0, flag); flag.visible = false; root.add(flag);
    mySnowman = new THREE.Group(); root.add(mySnowman);
    myBall = mesh(GEO.ball, M(0xfbfdfe), 0, 0, 0, scene); myBall.visible = false;
  },
  offer(offer){ offer(Math.hypot(me.x - SNOW_SPOT.x, me.z - SNOW_SPOT.z), 3.8, me.sm[1] > 0 ? '눈사람 다시 만들기' : '눈사람 만들기', snowman.start); },
  start(){
    const used = {}; S.remotes.forEach(R => { if (R.sm[0] > 0) used[R.slot] = 1; });
    if (used[me.slot]) for (let i = 0; i < SLOTS.length; i++) if (!used[i]) { me.slot = i; break; }
    begin(snowman, {stage:0}); me.sm = [0, 0]; me.ballR = .25; snowmanInto(mySnowman, 0, 0, 0);
    const s = SLOTS[me.slot]; mySnowman.position.set(s[0], 0, s[1]); flag.position.set(s[0] + 1.6, 0, s[1]); flag.visible = true;
    flag.userData.cloth.material.color.setHex(0x3f8a97);
    hud.showGame('눈사람 만들기'); hudStage(); flash('깃발이 내 자리예요');
  },
  prompt(){ const s = SLOTS[me.slot]; return Math.hypot(me.x - s[0], me.z - s[1]) < 3 ? {label:S.game.stage ? '머리 올리기' : '몸통 놓기', run:placeBall} : null; },
  quit(){ me.sm = [0, 0]; me.ballR = 0; snowmanInto(mySnowman, 0, 0, 0); flag.visible = false; },
  frame(dt, now, moved){
    if (S.mode === 'snow') { me.ballR = Math.min(MAX, me.ballR + moved * .014); myBall.visible = true; rollBall(myBall, me, me.ballR, moved); hud.needle(me.ballR / MAX); }
    else myBall.visible = false;
  },
  remote(R, p){
    if (!R.sman) { R.sman = new THREE.Group(); root.add(R.sman); R.sm = [0, 0]; R.slot = 0; }
    if (p.sm[0] !== R.sm[0] || p.sm[1] !== R.sm[1] || p.sl !== R.slot || R.smCi !== R.ci) {
      R.sm = p.sm; R.slot = p.sl; R.smCi = R.ci; R.sman.position.set(SLOTS[p.sl][0], 0, SLOTS[p.sl][1]); snowmanInto(R.sman, p.sm[0], p.sm[1], R.ci); }
    R.ball = p.ball;
  },
  remoteFrame(R, dt, moved){
    if (R.ball > 0 && R.st === ST.SNOW) { if (!R.ballM) R.ballM = mesh(GEO.ball, M(0xfbfdfe), 0, 0, 0, scene); R.ballM.visible = true; rollBall(R.ballM, R, R.ball, moved); }
    else if (R.ballM) R.ballM.visible = false;
  },
  remoteDrop(R){ if (R.sman) root.remove(R.sman); if (R.ballM) scene.remove(R.ballM); },
});
export { SLOTS };
