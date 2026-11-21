// 딱지 대결 (2026-11-20 2차): 공원 동쪽 잔디의 딱지 마당 두 곳. 두 사람이 서쪽 · 동쪽에 마주 서서 번갈아 내려친다.
//   내 차례: '위치 게이지'의 바늘이 바닥 딱지 위를 오간다. 색칠된 칸(딱지 모서리)에서 내려치면 넘어간다. 판이 갈수록 칸이 좁아진다.
//   다섯 번씩 치고 넘긴 수가 많은 쪽이 이긴다. 맞은편이 비어 있으면 기다리거나, '동네 형이랑 하기'(E)로 컴퓨터와 한다 (2026-11-21: 4초 뒤 자동 → 버튼).
//   동기화: 각자 [마당, 자리, 친 횟수, 넘긴 수, 마지막 결과]만 보낸다 (protocol의 tk). 차례는 친 횟수로 정해진다
//   (서쪽 자리가 먼저: 두 사람 횟수가 같으면 서쪽 차례, 다르면 동쪽 차례). 상대가 친 횟수가 늘면 그 결과로 같은 장면을 그린다.
import * as THREE from '../lib/three.js';
import { M, canvasTex } from '../core/gfx.js';
import { root } from '../core/engine.js';
import { S } from '../core/state.js';
import { PI, clamp } from '../core/util.js';
import { sfx, flash, after } from '../core/fx.js';
import { ST } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me, nameOf } from '../entities/player.js';
import { emote } from '../entities/character.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, finish, stopActivity } from './registry.js';
import { TKS } from '../map/layout.js';

const ROUNDS = 5, GAP = 2.1, COLORS = [['#d9695c', '#3f6fa8'], ['#3f8a97', '#e2a84b']];
const spot = (k, seat) => ({x:TKS[k].x + (seat ? GAP : -GAP), z:TKS[k].z});
const tex = (a, b) => new THREE.MeshLambertMaterial({map:canvasTex(64, 64, g => { g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.strokeStyle = b; g.lineWidth = 6;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); g.strokeRect(3, 3, 58, 58); })});
const arenas = [];   // {y, tk(바닥 딱지), thrown(던지는 딱지)}

// 마당 k에서 seat 쪽 사람이 던지는 장면. res: 0 꿈쩍 안 함, 1 아깝다(들썩), 2 넘어감
function throwAnim(k, seat, res){
  const A = arenas[k]; A.thrown.userData = {t0:performance.now(), seat}; A.thrown.visible = true;
  after(260, () => { A.tk.userData.anim = {k:res === 2 ? 1 : res === 1 ? 2 : 3, t:0}; if (res === 2) sfx(220, 660, .22, 'triangle'); else sfx(160, 90, .16, 'square', .05); });
  after(1100, () => { A.thrown.visible = false; });
}
// 상대: 같은 마당 맞은편 자리의 사람 (컴퓨터와 하는 중인 사람은 빼고)
function findOpp(k, seat){ for (const R of S.remotes.values()) if (R.st === ST.TTAKJI && R.tk && R.tk[0] === k && R.tk[1] === 1 - seat && !R.tk[5]) return R; return null; }
function publish(){ const g = S.game; me.tk = [g.k, g.seat, g.mine, g.myF, g.last, g.cpu ? 1 : 0]; }
const myTurn = g => g.seat === 0 ? g.mine === g.opp : g.mine < g.opp;
const over = g => g.mine >= ROUNDS && g.opp >= ROUNDS;
function stat(){ const g = S.game; hud.stat(g.waiting ? '맞은편을 기다리는 중…' : '나 ' + g.myF + ' : ' + g.oppF + ' ' + g.oppName + ' · ' + Math.min(ROUNDS, Math.max(g.mine, g.opp) + 1) + '/' + ROUNDS + '판'); }
function myRound(){
  const g = S.game, w = Math.max(.1, .26 - .035 * g.mine), side = Math.random() < .5;
  g.zw = w; g.zc = side ? w / 2 : 1 - w / 2; g.g = .5; g.dir = 1; g.speed = 1.1 + .18 * g.mine;
  hud.zone(g.zc - g.zw / 2, g.zw); hud.gauge('내 차례! 바늘이 딱지 모서리(색칠된 칸)에 올 때 내려치세요', true);
}
function waitText(){ const g = S.game; hud.zone(0, 0); hud.gauge(g.waiting ? '맞은편에 올 사람을 기다려요 · 혼자면 동네 형이랑 해요' : g.oppName + ' 차례…', false); }
// 한 번 친 뒤(나 · 상대 모두): 끝났는지 보고 다음 차례로
function next(){
  const g = S.game; if (S.mode !== 'ttakji' || !g) return; g.busy = false; stat();
  if (over(g)) { if (!g.ended) { g.ended = true; after(700, end); } return; }
  if (myTurn(g)) myRound(); else waitText();
}
function end(){
  const g = S.game; if (S.mode !== 'ttakji' || !g) return;
  const r = g.myF > g.oppF ? '이겼다!' : g.myF < g.oppF ? '졌다…' : '비겼다';
  finish(ttakji, '딱지 대결 · ' + r, g.myF, () => ttakji.start(g.k, g.seat));
}
function setOpp(g, R){ g.R = R; g.cpu = !R; g.waiting = false; g.oppName = R ? nameOf(R.a, R.n) : '동네 형'; g.seen = R ? R.tk[2] : 0; g.opp = 0; g.oppF = 0; publish(); stat();
  flash(R ? g.oppName + '와(과) 대결!' : '동네 형이 왔어요. 한판 해요!'); if (myTurn(g)) myRound(); else waitText(); }

const ttakji = defineActivity({
  id:'ttakji', st:ST.TTAKJI, score:{index:1, label:'딱지', unit:'장'}, hideLabels:true,
  setup(){
    TKS.forEach((c, k) => {
      const y = W.groundY(c.x, c.z);
      const mat = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), M(0xe6d2b0)); mat.rotation.x = -PI / 2; mat.position.set(c.x, y + .03, c.z); mat.receiveShadow = true;
      mat.material.polygonOffset = true; mat.material.polygonOffsetFactor = -2; mat.material.polygonOffsetUnits = -4; root.add(mat);
      const sd = M(0x8a7a66), [a, b] = COLORS[k % 2];
      const tk = new THREE.Mesh(new THREE.BoxGeometry(.8, .09, .8), [sd, sd, tex(a, '#fff'), tex(b, '#fff'), sd, sd]); tk.position.set(c.x, y + .1, c.z); tk.castShadow = true; tk.userData = {base:0, anim:null}; root.add(tk);
      const thrown = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, .7), [sd, sd, tex(b, '#fff'), tex(a, '#fff'), sd, sd]); thrown.visible = false; root.add(thrown);
      arenas.push({y, tk, thrown});
      spotLabel('딱지 대결', c.x, y + 3.2, c.z); W.mmCircle(c.x, c.z, 3.4, '#e6d2b0');
    });
  },
  offer(offer){
    TKS.forEach((c, k) => { const d = Math.hypot(me.x - c.x, me.z - c.z); if (d > 5) return;
      const at = s => [...S.remotes.values()].find(R => R.st === ST.TTAKJI && R.tk && R.tk[0] === k && R.tk[1] === s);
      if ([0, 1].some(s => at(s) && at(s).tk[5])) return;                                              // 누가 동네 형이랑 하는 중
      const free = [0, 1].filter(s => !at(s)).sort((p, q) => { const a = spot(k, p), b = spot(k, q); return Math.hypot(me.x - a.x, me.z - a.z) - Math.hypot(me.x - b.x, me.z - b.z); });
      if (free.length) offer(d, 5, at(1 - free[0]) ? '딱지 대결 (상대가 기다려요)' : '딱지 대결', () => ttakji.start(k, free[0])); });
  },
  start(k, seat){
    const p = spot(k, seat);
    begin(ttakji, {k, seat, mine:0, myF:0, last:0, opp:0, oppF:0, cpu:false, R:null, waiting:true, waitT:0, busy:false, g:.5, dir:1, cpuT:0, seen:0, oppName:''});
    me.x = p.x; me.z = p.z; me.r = seat ? -PI / 2 : PI / 2; publish(); hud.showGame('딱지 대결');
    const R = findOpp(k, seat); if (R) setOpp(S.game, R); else { stat(); waitText(); }
  },
  camera(want, look){ const g = S.game, c = TKS[g.k], y = arenas[g.k].y; want.set(c.x + (g.seat ? 2.5 : -2.5), y + 6.8, c.z + 8.6); look.set(c.x, y + .2, c.z - .6); return true; },
  update(){ const g = S.game, p = spot(g.k, g.seat); me.x = p.x; me.z = p.z; me.r = g.seat ? -PI / 2 : PI / 2; return 0; },
  onAction(){
    const g = S.game; if (g && g.waiting) { setOpp(g, null); return; }   // 기다리는 중 E: 동네 형 부르기
    if (!g || g.busy || !myTurn(g) || g.mine >= ROUNDS) return;
    g.busy = true; const d = Math.abs(g.g - g.zc), res = d <= g.zw / 2 ? 2 : d <= g.zw * 1.2 ? 1 : 0;
    me.em = [me.em[0] + 1, 2]; emote(me.char, 2); throwAnim(g.k, g.seat, res); hud.zone(0, 0);
    after(300, () => { g.mine++; if (res === 2) g.myF++; g.last = res; publish(); flash(res === 2 ? '넘어갔다!' : res === 1 ? '아깝다!' : '꿈쩍도 안 함'); });
    after(1300, next);
  },
  prompt(){ const g = S.game; return g && g.waiting ? {label:'동네 형이랑 하기', run:() => { if (S.game && S.game.waiting) setOpp(S.game, null); }} : null; },   // 내려치기는 E 또는 게이지의 '내려치기' 버튼(모바일)
  quit(){ me.tk = [9, 0, 0, 0, 0, 0]; arenas.forEach(A => { A.thrown.visible = false; }); },
  frame(dt, now){
    const g = S.game;
    if (S.mode === 'ttakji' && g) {
      if (g.waiting) {                                                         // 맞은편을 기다린다: 사람이 오면 대결 (동네 형은 버튼으로만)
        const R = findOpp(g.k, g.seat); if (R) setOpp(g, R);
      } else if (g.cpu) {
        if (!g.busy && !myTurn(g) && g.opp < ROUNDS && (g.cpuT += dt) > 1.2) { g.cpuT = 0; g.busy = true;
          const res = Math.random() < .38 ? 2 : Math.random() < .5 ? 1 : 0; throwAnim(g.k, 1 - g.seat, res);
          after(300, () => { g.opp++; if (res === 2) g.oppF++; }); after(1300, next); }
      } else {
        const R = findOpp(g.k, g.seat);
        if (!R) { flash('상대가 떠났어요'); stopActivity(); return; }
        const t = R.tk[2];
        if (t < g.seen) { g.seen = t; g.opp = t; g.oppF = R.tk[3]; }                                 // 상대가 새 판을 시작
        else if (t > g.seen && !g.busy) { g.seen = t; g.busy = true; throwAnim(g.k, 1 - g.seat, R.tk[4]);
          after(300, () => { g.opp = t; g.oppF = R.tk[3]; }); after(1300, next); }
      }
      if (!g.waiting && myTurn(g) && !g.busy && g.mine < ROUNDS) { g.g += g.dir * g.speed * dt; if (g.g > 1) { g.g = 1; g.dir = -1; } if (g.g < 0) { g.g = 0; g.dir = 1; } hud.needle(g.g); }
    }
    arenas.forEach((A, k) => {
      const u = A.tk.userData, an = u.anim;
      if (an) { an.t += dt; const q = Math.min(1, an.t / .6), s = Math.sin(q * PI);
        if (an.k === 1) { A.tk.position.y = A.y + .1 + s * 1.2; A.tk.rotation.z = u.base + PI * q; } else if (an.k === 2) { A.tk.position.y = A.y + .1 + s * .35; A.tk.rotation.z = u.base + s * .9; } else A.tk.position.y = A.y + .1 + s * .06;
        if (q >= 1) { if (an.k === 1) u.base += PI; A.tk.rotation.z = u.base; A.tk.position.y = A.y + .1; u.anim = null; } }
      if (A.thrown.visible) { const c = TKS[k], d = A.thrown.userData, sx = d.seat ? 1 : -1, e = (now - d.t0) / 1000, q = clamp((e - .14) / .12, 0, 1);
        A.thrown.position.set(c.x + sx * (1.3 - q * 1.1), A.y + (e > .26 ? .16 : 1.7 - q * 1.5), c.z); A.thrown.rotation.y = e < .26 ? e * 6 : 0; }
    });
    // 남이 하는 대결도 보이게: 다른 사람의 친 횟수가 늘면 그 마당에서 장면을 그린다 (내가 그 대결에 없을 때)
    S.remotes.forEach(R => { if (R.st !== ST.TTAKJI || !R.tk || R.tk[0] > 3) return; const t = R.tk[2];
      if (R.tkSeen !== undefined && t > R.tkSeen && !(S.mode === 'ttakji' && S.game && S.game.k === R.tk[0])) throwAnim(R.tk[0], R.tk[1], R.tk[4]); R.tkSeen = t; });
  },
  remote(R, p){ R.tk = p.tk; },
  remoteEmote(R, k){},
});
