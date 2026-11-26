// 놀이터 U자 미끄럼틀 (2026-11-21 2차): 계단으로 탑에 올라가 E를 누르면 한 번 U턴해 내려온다.
//   빠르게(약 4초) 내려오고, 시점은 뒤에서 길을 따라가며 속도에 따라 화면이 조금 넓어진다(FOV).
// 길은 소품(props/aptStreet.js의 spiralPath, 미터)에서 받아 맵 좌표(map/layout.js의 SLIDE)로 옮긴다.
import * as THREE from '../lib/three.js';
import { S, setMode } from '../core/state.js';
import { sfx, flash, puff } from '../core/fx.js';
import { camera as cam3, root } from '../core/engine.js';
import { mesh } from '../core/gfx.js';
import { snowAOMaterial, snowMaterial } from '../core/texkit.js';
import { ballGeo } from '../props/snowmanCoop.js';
import { hud } from '../ui/hud.js';
import { ST, UNIT } from '../config.js';
import { W } from '../world/world.js';
import { me } from '../entities/player.js';
import { SIT, POSES, waving } from '../entities/character.js';
import { defineActivity, begin, stopActivity } from './registry.js';
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
        w.slideI = best; u = best / N; if (u > .93 && !w.slideClr) { w.slideClr = true; clearSnow(); } if (u < .5) w.slideClr = false; }
      const p = at(u); ch.position.set(p[0], p[1] + .12, p[2]); ch.rotation.set(0, p[3], 0); w.y = p[1];
    });
  },
  offer(offer){
    if (W.groundY(me.x, me.z, me.y) < SPIRAL.H * UNIT - .3) return;  // 탑 위에 있을 때만 (2026-11-22: 발 높이로 판정, 탑 밑에서는 안 뜬다)
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
    if (ease(u) > .93 && !g.cleared) { g.cleared = true; g.snowHit = clearSnow(); }                                      // (2026-11-25) 끝에 쌓인 눈을 퐉
    if (u >= 1) { endRide(); setMode('walk'); S.game = null; me.st = 0; me.x = OUT[0]; me.z = OUT[2]; me.y = W.groundY(OUT[0], OUT[2]); puff(me.x, me.y + .3, me.z, 10); sfx(200, 90, .25, 'triangle', .06); flash(g.snowHit ? '퐉!\n쌓인 눈을 싹 치웠다' : '슝~ 한 번 더?'); }
    return Math.hypot(me.x - ox, me.z - oz);
  },
});

// ── 미끄럼틀에 눈 뿌리기 (2026-11-25) ──
// 계단 앞 눈 더미에서 '눈 모으기'(E) → 한 아름 머리 위로 들고 계단을 올라가면, 탑 위에서는 '미끄럼틀 타기' 대신 '눈 뿌리기'.
// 눈덩이 수십 개가 미끄럼판을 따라 흘러내려 착지 매트에 쌓였다가 녹는다. 다른 사람에게는 뿌린 횟수(presence sn)만 보내고 같은 장면을 그린다.
// 든 눈은 눈사람 놀이와 같은 모양(ST.CARRY + ball 크기)이라 다른 사람 화면에도 머리 위 눈덩이로 보인다 (snowman.js remoteFrame).
const PILE = world(5.2, 0, 6.4), GATHER = .9, HELD = .34, FLOW = {n:30, dur:3.4, burst:1.0}, MAXL = 4;
const onTop = () => W.groundY(me.x, me.z, me.y) >= SPIRAL.H * UNIT - .3 && Math.hypot(me.x - TOP[0], me.z - TOP[2]) < 3.2;
const BALL = new THREE.IcosahedronGeometry(1, 2), FLOWMAT = new THREE.MeshLambertMaterial({color:0xf8fbfd});
const flows = [], MX = new THREE.Matrix4(), QI = new THREE.Quaternion(), VP = new THREE.Vector3(), VS = new THREE.Vector3();
let heldM = null;
// (2026-11-25 3차) 뿌린 눈: 굵은 눈덩이 26개가 흘러내려 끝에 닿으면 하나의 매끈한 눈 무더기(mound)에 녹아든다(알갱이가 다닥다닥 모이지 않게).
//   무더기는 뿌릴 때마다 커지고(최대 MAXL번), 누가 타고 내려와 끝에 닿으면 '퐉' 덩어리 몇 개로 흩어지며 치워진다
const mound = {m:null, level:0, s:0}, ME = .035;   // ME: 무더기 자리 (미끄럼판 끝에서 3.5% 앞)
// (2026-11-25 4차) 더 풍성하게: 가운데 큰 무더기 + 옆 · 앞으로 넘쳐흐른 덩이 다섯(뿌린 횟수가 늘수록 하나씩 더 보인다). 메쉬는 여섯 개뿐
const LUMPS = [[0, 0, 0, 1, 1, 1, 0], [.62, -.03, .25, .48, .7, .5, 1], [-.6, -.03, .15, .45, .65, .48, 1], [.15, -.04, .78, .55, .62, .45, 2], [-.3, -.05, -.55, .42, .55, .42, 3], [.45, -.06, -.5, .36, .5, .36, 3]];
function makeMound(){
  const e = at(1 - ME), g = new THREE.Group(), sm = snowMaterial({seed:53}), geo = new THREE.SphereGeometry(1, 22, 12);
  g.position.set(e[0], e[1] + .03, e[2]); g.rotation.y = e[3]; g.visible = false; root.add(g);
  const parts = LUMPS.map(([x, y, z, a, b, c, need]) => { const m = new THREE.Mesh(geo, sm); m.position.set(x, y, z); m.userData = {a, b, c, need}; m.castShadow = m.receiveShadow = true; g.add(m); return m; });
  mound.m = g; mound.parts = parts;
}
function spawnFlow(){
  const im = new THREE.InstancedMesh(BALL, FLOWMAT, FLOW.n); im.castShadow = true; im.frustumCulled = false; root.add(im);
  const parts = Array.from({length:FLOW.n}, () => ({d:Math.random() * .7, o:(Math.random() * 2 - 1) * .3, k:.9 + Math.random() * .2, r:.15 + Math.random() * .12}));
  flows.push({t:0, im, parts, landed:false, burst:-1}); const p = at(0); puff(p[0], p[1] + .4, p[2], 10); sfx(500, 220, .5, 'triangle', .035);
}
const hw = SPIRAL.hw * UNIT;
// 쌓인 눈 치우기: 무더기를 없애고 그 자리에서 덩어리 몇 개가 튀어 오르며 작아진다. 치운 게 있으면 true
function clearSnow(){
  const flying = flows.filter(F => F.burst < 0); if (!mound.level && !flying.length) return false;
  flying.forEach(F => { root.remove(F.im); F.im.dispose(); flows.splice(flows.indexOf(F), 1); });
  // (2026-11-25 4차) 더 크게 '팍': 쌓인 만큼 덩이가 많고(14 + 9 × 쌓인 횟수), 미끄럼판 끝에서 앞 · 위로 세게 흩어진다. 눈가루도 두 번
  const e = at(1 - ME), L = Math.max(1, mound.level), n = 14 + L * 9, im = new THREE.InstancedMesh(BALL, FLOWMAT, n); im.castShadow = true; im.frustumCulled = false; root.add(im);
  const fx = Math.sin(e[3]), fz = Math.cos(e[3]);   // 미끄럼판이 나가는 쪽
  const parts = Array.from({length:n}, () => { const sp = 3 + Math.random() * 5; return {x:e[0] + (Math.random() - .5) * .8, y:e[1] + .3, z:e[2] + (Math.random() - .5) * .8,
    vx:fx * sp + (Math.random() - .5) * 6, vy:2.5 + Math.random() * 4.5, vz:fz * sp + (Math.random() - .5) * 6, r:.13 + Math.random() * .2}; });
  flows.push({t:0, im, parts, landed:true, burst:0}); mound.level = 0; mound.s = 0; mound.m.visible = false;
  puff(e[0], e[1] + .4, e[2], 26); puff(e[0] + fx * 1.2, e[1] + .3, e[2] + fz * 1.2, 20); sfx(320, 70, .35, 'triangle', .08); return true;
}
function stepFlows(dt){
  for (let i = flows.length - 1; i >= 0; i--) {
    const F = flows[i]; F.t += dt;
    if (F.burst >= 0) {
      F.burst += dt; const k = F.burst / FLOW.burst;
      if (k >= 1) { root.remove(F.im); F.im.dispose(); flows.splice(i, 1); continue; }
      F.parts.forEach((q, j) => { q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vy -= 14 * dt;
        MX.compose(VP.set(q.x, q.y, q.z), QI, VS.setScalar(q.r * (1 - k))); F.im.setMatrixAt(j, MX); });
      F.im.instanceMatrix.needsUpdate = true; continue;
    }
    let alive = 0;
    F.parts.forEach((q, j) => {
      const T = FLOW.dur / q.k, e = F.t - q.d, u = ease(Math.min(1, Math.max(0, e / T))) * (1 - ME), p = at(u), la = Math.cos(p[3]), lb = -Math.sin(p[3]);
      const gone = e > T ? Math.min(1, (e - T) / .4) : 0; if (gone < 1) alive++;                  // 끝에 닿으면 무더기 속으로 줄어든다
      MX.compose(VP.set(p[0] + la * q.o * hw, p[1] + .05 + q.r, p[2] + lb * q.o * hw), QI, VS.setScalar(q.r * (1 - gone))); F.im.setMatrixAt(j, MX);
    });
    F.im.instanceMatrix.needsUpdate = true;
    if (!F.landed && F.t > FLOW.dur * .9) { F.landed = true; mound.level = Math.min(MAXL, mound.level + 1); const e = at(1); puff(e[0], e[1] + .3, e[2], 6); sfx(240, 120, .3, 'triangle', .04); }
    if (F.landed && !alive) { root.remove(F.im); F.im.dispose(); flows.splice(i, 1); }
  }
  if (!mound.m) return;
  mound.s += (mound.level - mound.s) * Math.min(1, dt * 2.5); const s = mound.s, k = Math.min(1, s);
  mound.m.visible = s > .05; if (!mound.m.visible) return;
  mound.m.scale.set(hw * (.75 + .25 * k + .06 * s), 1, .5 + .22 * s);                                     // 미끄럼판 폭을 채우고, 쌓일수록 길어진다
  mound.parts.forEach(m => { const u = m.userData, f = Math.min(1, Math.max(0, s - u.need)); m.visible = f > .02;
    m.scale.set(u.a * (.6 + .4 * f), (.12 + .1 * s) * u.b * f, u.c * (.6 + .4 * f)); });
}
const snowPour = defineActivity({
  id:'snowpour', st:ST.CARRY, free:true,
  get speedMul(){ return S.game && S.game.phase === 'gather' ? 0 : .9; },
  setup(){
    const gy = W.groundY(PILE[0], PILE[2]), sm = snowMaterial({seed:52}), g = new THREE.Group(); g.position.set(PILE[0], gy, PILE[2]); root.add(g);
    [[0, .32, 0, 1.05, .42, .9], [.55, .2, .35, .45, .28, .4], [-.5, .18, -.3, .4, .24, .38]].forEach(([x, y, z, a, b, d]) => { const m = mesh(new THREE.SphereGeometry(1, 16, 10), sm, x, y, z, g); m.scale.set(a, b, d); m.castShadow = m.receiveShadow = true; });
    const red = new THREE.MeshLambertMaterial({color:0xd8432f});   // 꽂아 둔 장난감 삽 (빨간 플라스틱)
    const sh = new THREE.Group(); sh.position.set(.25, .55, .15); sh.rotation.set(.35, .6, -.25); g.add(sh);
    mesh(new THREE.CylinderGeometry(.035, .035, .75, 8), red, 0, .3, 0, sh); mesh(new THREE.BoxGeometry(.26, .3, .04), red, 0, -.18, 0, sh);
    W.mmCircle(PILE[0], PILE[2], 1.2, '#f4f8fb');
    makeMound();
  },
  offer(offer){ const d = Math.hypot(me.x - PILE[0], me.z - PILE[2]); if (d < 2.6) offer(d, 2.6, '눈 모으기', snowPour.start); },
  start(){
    begin(snowPour, {phase:'gather', t:0}); me.ballR = 0; me.r = Math.atan2(PILE[0] - me.x, PILE[2] - me.z);
    if (!heldM) { heldM = mesh(ballGeo(), snowAOMaterial(), 0, 0, 0, root); heldM.castShadow = true; }
    heldM.visible = true; sfx(180, 260, .4, 'triangle', .03);
  },
  prompt(){ const g = S.game; return g && g.phase === 'carry' && onTop() ? {label:'눈 뿌리기', run:snowPour.pour} : null; },
  pour(){ me.sn = (me.sn + 1) % 1000; spawnFlow(); stopActivity(); flash('눈이 미끄럼틀을 타고\n내려간다~'); },
  quit(){ me.ballR = 0; if (heldM) heldM.visible = false; },
  frame(dt, now){
    stepFlows(dt);
    if (S.mode !== 'snowpour' || !S.game || !me.char) return;
    const g = S.game, ch = me.char, u = ch.userData; g.t += dt;
    if (g.phase === 'gather') {                                    // 쪼그려 앞으로 손을 뻗어 긁어모은다: 눈덩이가 손 앞에서 커진다
      const k = Math.min(1, g.t / GATHER), sw = Math.sin(g.t * 13) * .25;
      u.armL.rotation.x = -.8 + sw; u.armR.rotation.x = -.8 - sw; u.inner.position.y = -.12 * Math.sin(k * Math.PI);
      heldM.scale.setScalar(.08 + (HELD - .08) * k); heldM.position.set(me.x + Math.sin(me.r) * .75, ch.position.y + .35 + HELD * k, me.z + Math.cos(me.r) * .75);
      if (k >= 1) { g.phase = 'carry'; me.ballR = HELD; hud.showGame('눈 한 아름'); hud.stat('미끄럼틀 탑에 올라가서 뿌려요'); flash('영차!\n미끄럼틀 위로 가져가요'); sfx(440, 660, .15); }
      return;
    }
    const dx = Math.sin(me.r), dz = Math.cos(me.r), bob = Math.abs(Math.sin(u.phase || 0)) * .06;   // 머리 위로 번쩍 (눈사람 holdBall과 같은 자리)
    heldM.scale.setScalar(HELD); heldM.position.set(me.x + dx * .12, ch.position.y + 2.05 + HELD * .92 + bob, me.z + dz * .12);
    u.armL.rotation.x = -2.95; u.armL.rotation.z = .28; if (!waving(ch)) { u.armR.rotation.x = -2.95; u.armR.rotation.z = -.28; }
  },
  remote(R, p){ if (R.snSeen !== undefined && p.sn !== R.snSeen) spawnFlow(); R.snSeen = p.sn; },
});
