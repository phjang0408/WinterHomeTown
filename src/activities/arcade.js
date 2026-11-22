// 문방구 앞 오락기 (2026-11-22): 왼쪽 끝 작은 오락기, 오른쪽 끝 가위바위보 오락기.
//   작은 오락기: 게임 고르기 → '은하 대작전'(좌우로 움직이며 쏘는 비행기 게임) 또는 예비 게임 '벽돌 깨기'. 한 판 즐기고 끝 (저장 없음).
//   가위바위보: 가위 · 바위 · 보 버튼 → 기계와 가위바위보. 이기면 가방 뒤에 키링이 달린다 ("이겼다! 상품은 키링이다!").
//   조작: ← → 또는 A D 이동, 스페이스 · E · J 발사(누르고 있으면 연사), 1 · 2 · 3 고르기, Enter 다시 하기, Esc 그만하기. 모바일은 화면 버튼.
//   구경하기: 누가 하고 있으면 옆 사람에게 '구경하기'. 하는 사람이 화면 상태를 presence의 ar에 싣고(초당 약 10번),
//     구경하는 쪽은 같은 그리기 함수로 다시 그린다. 적이 내려오는 길 · 적 총알은 (적 번호, 시작 시각, 목표 x)로 정해지므로 몇 개 숫자면 된다.
//   그림 · 이름은 모두 지어낸 것 (실제 게임의 그림을 본뜨지 않는다).
import * as THREE from '../lib/three.js';
import { ST, UNIT, FONT_D, FONT_B } from '../config.js';
import { S } from '../core/state.js';
import { sfx, flash, puff } from '../core/fx.js';
import { W } from '../world/world.js';
import { me, nameOf } from '../entities/player.js';
import { defineActivity, begin, stopActivity } from './registry.js';
import { STN_AT } from '../map/layout.js';
import { STATIONERY_ARCADES } from '../props/stationery.js';
import { drawRpsFace, RPS_W, RPS_H } from '../props/rpsArt.js';

const U = UNIT, cl = (v, a, b) => Math.max(a, Math.min(b, v));
// ── 기계 자리 (문구점 기준 → 세계 좌표). sx · sz = 사람이 서는 곳 ──
// (2026-11-22 2차) 기계마다 방향 r: 사람은 기계 앞(기계 +z를 r만큼 돌린 쪽) 0.8m에 선다
const MACH = STATIONERY_ARCADES.map((m, i) => {
  const c = Math.cos(STN_AT.rot), s = Math.sin(STN_AT.rot), w = (lx, lz) => [STN_AT.x + (lx * c + lz * s) * U, STN_AT.z + (-lx * s + lz * c) * U], r = m.r || 0;
  const [x, z] = w(m.x, m.z), [sx, sz] = w(m.x + Math.sin(r) * .8, m.z + Math.cos(r) * .8);
  return {id:i + 1, kind:m.kind, x, z, sx, sz, face:Math.atan2(x - sx, z - sz)};
});
const NAME = {cab:'작은 오락기', rps:'가위바위보 오락기', gacha:'행운 뽑기'};

// ───────────────────────── 은하 대작전 (논리 화면 240 × 320) ─────────────────────────
const LW = 240, LH = 320, DUR = 3.4;
const slot = (i, t) => { const col = i % 8, row = i / 8 | 0; return [120 + (col - 3.5) * 22 + 14 * Math.sin(t * .9), 44 + row * 20 + 3 * Math.sin(t * 1.7 + col * .6)]; };
// 내려오는 적: 제 자리에서 살짝 솟았다가 목표 x 쪽으로 물결치며 내려가고, 화면 위에서 다시 제 자리로
function diverPos(d, t){
  const u = (t - d.t0) / DUR, side = d.i % 2 ? 1 : -1;
  if (u < .7) { const k = Math.max(0, u / .7), p0 = slot(d.i, d.t0); return [p0[0] + (d.tx - p0[0]) * k + 34 * Math.sin(k * Math.PI * 2) * side, p0[1] - 18 * Math.sin(Math.min(1, k * 4) * Math.PI) + (350 - p0[1]) * Math.pow(k, 1.5)]; }
  const k = Math.min(1, (u - .7) / .3), e = k * k * (3 - 2 * k), sl = slot(d.i, t); return [sl[0] + side * 40 * (1 - e), -20 + (sl[1] + 20) * e];
}
const shotsOf = wave => wave >= 3 ? [.3, .46] : [.34];
function enemyBullets(G, t){
  const out = [];
  G.divers.forEach(d => shotsOf(G.wave).forEach(us => { const ts = d.t0 + us * DUR; if (t < ts) return; const p = diverPos(d, ts), dt = t - ts, y = p[1] + 150 * dt;
    if (y < 330) out.push([p[0] + cl((d.tx - p[0]) * .3, -40, 40) * dt, y]); }));
  return out;
}
const galaxyNew = () => ({kind:1, t:0, x:120, lives:3, score:0, wave:1, alive:Array(32).fill(true), divers:[], pb:[], cd:0, next:2.2, dead:-9, over:false, clearT:0, boom:[]});
function galaxyStep(G, dt, K){
  if (G.over) return; G.t += dt; const t = G.t, live = t > G.dead;
  if (live) G.x = cl(G.x + ((K.r ? 1 : 0) - (K.l ? 1 : 0)) * 140 * dt, 12, 228);
  G.cd -= dt; if (K.f && live && G.cd <= 0 && G.pb.length < 2) { G.pb.push({x:G.x, y:290}); G.cd = .26; sfx(980, 520, .06, 'square', .025); }
  G.pb.forEach(b => { b.y -= 300 * dt; }); G.pb = G.pb.filter(b => b.y > -10);
  G.divers = G.divers.filter(d => (t - d.t0) / DUR < 1);
  if (t > G.next && live && !G.clearT) {
    const cand = []; G.alive.forEach((a, i) => { if (a && !G.divers.some(d => d.i === i)) cand.push(i); });
    if (cand.length && G.divers.length < Math.min(3, 1 + G.wave)) G.divers.push({i:cand[Math.random() * cand.length | 0], t0:Math.round(t * 10) / 10, tx:Math.round(G.x)});
    G.next = t + Math.max(.6, 2.1 - G.wave * .25) * (.7 + Math.random() * .6);
  }
  const pos = i => { const d = G.divers.find(q => q.i === i); return d ? diverPos(d, t) : slot(i, t); };
  for (const b of G.pb) for (let i = 0; i < 32; i++) {
    if (!G.alive[i]) continue; const p = pos(i);
    if (Math.abs(p[0] - b.x) < 9 && Math.abs(p[1] - b.y) < 9) { const dv = G.divers.some(d => d.i === i); G.alive[i] = false; b.y = -99; G.score += (i < 8 ? 150 : 100) + (dv ? 100 : 0);
      G.divers = G.divers.filter(d => d.i !== i); G.boom.push({x:p[0], y:p[1], t}); sfx(300, 90, .18, 'sawtooth', .03); break; }
  }
  if (live && t > G.dead + 2.4) {   // 다시 나온 뒤 0.8초는 무적
    const hit = G.divers.some(d => { const p = diverPos(d, t); return Math.abs(p[0] - G.x) < 11 && Math.abs(p[1] - 298) < 11; }) || enemyBullets(G, t).some(([x, y]) => Math.abs(x - G.x) < 7 && Math.abs(y - 298) < 9);
    if (hit) { G.lives--; G.boom.push({x:G.x, y:298, t, big:true}); G.divers = []; G.dead = t + 1.6; sfx(200, 50, .6, 'sawtooth', .05); if (G.lives <= 0) { G.over = true; sfx(400, 100, 1, 'triangle', .05); } }
  }
  if (!G.alive.some(a => a) && !G.divers.length) { if (!G.clearT) G.clearT = t + 1.6; else if (t > G.clearT) { G.wave++; G.alive.fill(true); G.clearT = 0; G.next = t + 1.5; sfx(520, 1040, .3, 'triangle'); } }
  G.boom = G.boom.filter(b => t - b.t < .5);
}
const STARS = Array.from({length:44}, (_, i) => [(i * 97) % 240, (i * 53) % 320, 20 + (i * 37) % 50, i % 3]);
function drawEnemy(g, x, y, row, t){
  const flap = Math.sin(t * 8 + x) > 0 ? 1 : 0, C = [['#5fd36b', '#2f7fe0'], ['#e8402a', '#ffd23f'], ['#e8402a', '#ffd23f'], ['#3fa9f5', '#f2f2f2']][row];
  g.fillStyle = C[0]; g.fillRect(x - 3, y - 5, 6, 10);                                       // 몸통
  g.fillStyle = C[1]; g.fillRect(x - 8, y - 3 + flap * 2, 4, 6 - flap * 2); g.fillRect(x + 4, y - 3 + flap * 2, 4, 6 - flap * 2);   // 날개 (펄럭)
  g.fillStyle = '#fff'; g.fillRect(x - 2, y - 3, 1.5, 2); g.fillRect(x + .5, y - 3, 1.5, 2);   // 눈
}
function drawShip(g, x, y){
  g.fillStyle = '#f4f4f4'; g.fillRect(x - 1.5, y - 9, 3, 15); g.fillRect(x - 6, y - 1, 12, 5); g.fillRect(x - 9, y + 2, 3, 5); g.fillRect(x + 6, y + 2, 3, 5);
  g.fillStyle = '#e8402a'; g.fillRect(x - 1.5, y - 3, 3, 3); g.fillRect(x - 9, y + 5, 3, 2); g.fillRect(x + 6, y + 5, 3, 2);
}
function galaxyDraw(g, G){
  const t = G.t; g.fillStyle = '#05060a'; g.fillRect(0, 0, LW, LH);
  STARS.forEach(([x, y, sp, c]) => { const yy = (y + t * sp) % LH; g.fillStyle = ['#7d8cff', '#ff8c8c', '#e6e6a0'][c]; g.globalAlpha = .5 + .5 * Math.sin(t * 3 + x); g.fillRect(x, yy, 1.5, 1.5); }); g.globalAlpha = 1;
  const dv = new Map(G.divers.map(d => [d.i, d]));
  G.alive.forEach((a, i) => { if (!a) return; const p = dv.has(i) ? diverPos(dv.get(i), t) : slot(i, t); drawEnemy(g, p[0], p[1], i / 8 | 0, t); });
  g.fillStyle = '#ff5050'; enemyBullets(G, t).forEach(([x, y]) => g.fillRect(x - 1, y - 3, 2, 6));
  g.fillStyle = '#ffe14d'; G.pb.forEach(b => g.fillRect(b.x - 1, b.y - 5, 2, 8));
  if (t > G.dead && !G.over && (t > G.dead + 2.4 || Math.sin(t * 30) > 0)) drawShip(g, G.x, 298);
  G.boom.forEach(b => { const k = (t - b.t) / .5, r = (b.big ? 16 : 9) * (.4 + k); g.strokeStyle = `rgba(255,${200 - k * 150 | 0},60,${1 - k})`; g.lineWidth = 2;
    for (let j = 0; j < 8; j++) { const a = j * .785; g.beginPath(); g.moveTo(b.x + Math.cos(a) * r * .4, b.y + Math.sin(a) * r * .4); g.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); g.stroke(); } });
  g.font = '700 11px ' + FONT_B; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#ff5050'; g.fillText('점수', 6, 4); g.fillStyle = '#fff'; g.fillText(String(G.score), 34, 4);
  g.textAlign = 'right'; g.fillStyle = '#7fd0ff'; g.fillText(G.wave + '판', 234, 4);
  for (let i = 0; i < G.lives - (t > G.dead ? 1 : 0); i++) drawShip(g, 12 + i * 16, 312);
  if (G.clearT && !G.over) center(g, G.wave + 1 + '판 준비!', '#7fd0ff');
  if (G.over) { center(g, '게임 끝', '#ff5050'); g.font = '700 12px ' + FONT_B; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('점수 ' + G.score + ' · 발사 · Enter: 한 판 더', 120, 180); }
}
function center(g, text, col){ g.font = '22px ' + FONT_D; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeText(text, 120, 150); g.fillStyle = col; g.fillText(text, 120, 150); }

// ───────────────────────── 벽돌 깨기 (예비 게임, 같은 화면 크기) ─────────────────────────
const BC = 8, BR = 6, brick = i => [8 + (i % BC) * 28.2, 46 + (i / BC | 0) * 12];
const brickNew = () => ({kind:2, t:0, px:120, bx:120, by:291, vx:0, vy:0, stuck:true, lives:3, score:0, alive:Array(BC * BR).fill(true), over:false, lvl:1});
function brickStep(G, dt, K){
  if (G.over) return; G.t += dt;
  G.px = cl(G.px + ((K.r ? 1 : 0) - (K.l ? 1 : 0)) * 190 * dt, 22, 218);
  if (G.stuck) { G.bx = G.px; G.by = 291; if (K.f) { G.stuck = false; G.vx = (Math.random() < .5 ? -1 : 1) * 70; G.vy = -165; sfx(600, 800, .06, 'square', .03); } return; }
  const n = Math.ceil(Math.hypot(G.vx, G.vy) * dt / 3);
  for (let k = 0; k < n; k++) {
    G.bx += G.vx * dt / n; G.by += G.vy * dt / n;
    if (G.bx < 5) { G.bx = 5; G.vx = Math.abs(G.vx); } if (G.bx > 235) { G.bx = 235; G.vx = -Math.abs(G.vx); } if (G.by < 24) { G.by = 24; G.vy = Math.abs(G.vy); }
    if (G.vy > 0 && G.by > 293 && G.by < 301 && Math.abs(G.bx - G.px) < 23) {
      const sp = 165 + G.lvl * 15 + G.score / 40, a = cl((G.bx - G.px) / 23, -.9, .9) * 1.05; G.vx = Math.sin(a) * sp; G.vy = -Math.cos(a) * sp; G.by = 292; sfx(500, 520, .04, 'square', .03);
    }
    for (let i = 0; i < BC * BR; i++) { if (!G.alive[i]) continue; const [x, y] = brick(i);
      if (G.bx > x - 3 && G.bx < x + 29 && G.by > y - 3 && G.by < y + 13) { G.alive[i] = false; G.score += 10 * (BR - (i / BC | 0)); sfx(800 - (i / BC | 0) * 80, 700, .05, 'square', .03);
        const ox = Math.min(G.bx - (x - 3), x + 29 - G.bx), oy = Math.min(G.by - (y - 3), y + 13 - G.by); if (ox < oy) G.vx = -G.vx; else G.vy = -G.vy; break; } }
    if (G.by > 330) { G.lives--; G.stuck = true; sfx(300, 80, .4, 'triangle', .05); if (G.lives <= 0) G.over = true; break; }
  }
  if (!G.alive.some(a => a)) { G.lvl++; G.alive.fill(true); G.stuck = true; sfx(520, 1040, .3, 'triangle'); }
}
const BRICK_C = ['#e8402a', '#f28c28', '#f2c51f', '#5fb24a', '#2f8fd6', '#8a5fd6'];
function brickDraw(g, G){
  g.fillStyle = '#0a0d16'; g.fillRect(0, 0, LW, LH); g.fillStyle = '#262c3a'; g.fillRect(0, 18, LW, 2);
  G.alive.forEach((a, i) => { if (!a) return; const [x, y] = brick(i); g.fillStyle = BRICK_C[i / BC | 0]; g.fillRect(x, y, 26, 10); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, 26, 2); });
  g.fillStyle = '#e6e6e6'; g.fillRect(G.px - 20, 296, 40, 6); g.fillStyle = '#e8402a'; g.fillRect(G.px - 20, 296, 5, 6); g.fillRect(G.px + 15, 296, 5, 6);
  if (!G.over) { g.fillStyle = '#fff'; g.beginPath(); g.arc(G.bx, G.by, 3.5, 0, 7); g.fill(); }
  g.font = '700 11px ' + FONT_B; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#ffd23f'; g.fillText('점수 ' + G.score, 6, 4); g.textAlign = 'right'; g.fillStyle = '#7fd0ff'; g.fillText(G.lvl + '단계 · 공 ' + G.lives, 234, 4);
  if (G.stuck && !G.over) { g.font = '700 11px ' + FONT_B; g.textAlign = 'center'; g.fillStyle = '#cfd6e0'; g.fillText('발사로 공 띄우기', 120, 250); }
  if (G.over) { center(g, '게임 끝', '#ff5050'); g.font = '700 12px ' + FONT_B; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('점수 ' + G.score + ' · 발사 · Enter: 한 판 더', 120, 180); }
}

// ───────────────────────── 가위바위보 ─────────────────────────
const HANDS = ['', '가위', '바위', '보'];
const beats = (a, b) => (a === 1 && b === 3) || (a === 2 && b === 1) || (a === 3 && b === 2);
const rpsNew = () => ({kind:3, t:0, phase:0, pick:0, cpu:0, res:0, t0:0});
function rpsView(R){
  const t = R.t, sh = R.phase === 1;
  return {hand:R.phase === 2 ? R.cpu : sh ? 1 + (t * 12 | 0) % 3 : 1 + (t * 1.6 | 0) % 3, lit:sh ? (t * 14 | 0) % 12 : R.phase === 2 ? -1 : (t * 2 | 0) % 12, res:R.phase === 2 ? R.res : 0, blink:R.phase === 2 ? ((t * 4 | 0) % 2) : 1};
}
function rpsStep(R, dt){
  R.t += dt;
  if (R.phase === 1 && R.t - R.t0 > 1.4) {
    R.phase = 2; R.t0 = R.t; R.res = beats(R.pick, R.cpu) ? 1 : R.pick === R.cpu ? 2 : 3;
    if (R.res === 1) { me.kr = 1 + (Math.random() * 5 | 0); setKeyring(me.char, me.kr); flash('이겼다! 상품은 키링이다!'); sfx(660, 1320, .5, 'triangle', .06); }
    else if (R.res === 2) { flash('비겼다! 한 번 더!'); sfx(440, 440, .25, 'square', .04); }
    else { flash('졌다~ 다시 해 볼까?'); sfx(300, 120, .5, 'triangle', .05); }
  } else if (R.phase === 2 && R.t - R.t0 > 2.4) { R.phase = 0; R.pick = 0; R.res = 0; }
}
function rpsPick(R, k){ if (R.phase !== 0) return; R.phase = 1; R.pick = k; R.cpu = 1 + (Math.random() * 3 | 0); R.t0 = R.t; sfx(520, 700, .1, 'square', .04); }

// ───────────────────────── 행운 뽑기 (2026-11-22 2차) ─────────────────────────
//   손잡이를 한 바퀴 돌리면(끌기 · E/스페이스/화살표 누르고 있기) 캡슐이 '덜컥' 떨어지고, 캡슐을 누르면(E) 열려서 키링이 나온다.
//   단계: 0 돌리기 → 1 떨어지는 중 → 2 열기 기다림 → 3 상품 보기 → 0
const CAP_C = ['#e8402a', '#2f8fd6', '#f2c51f', '#5fb24a', '#b05bd6', '#f28c28'];
const KX = 120, KY = 214;
const gachaNew = () => ({kind:4, t:0, phase:0, turn:0, t0:0, prize:0, cap:CAP_C[Math.random() * CAP_C.length | 0], wob:0});
function gachaTurn(G, d){ if (G.phase !== 0 || d <= 0) return; G.turn += d; G.wob = .4; if ((G.turn / (Math.PI / 2) | 0) !== ((G.turn - d) / (Math.PI / 2) | 0)) sfx(260, 240, .05, 'square', .03);
  if (G.turn >= Math.PI * 2) { G.phase = 1; G.t0 = G.t; sfx(180, 90, .25, 'triangle', .06); } }
function gachaOpen(G){ if (G.phase !== 2) return; G.phase = 3; G.t0 = G.t; G.prize = 1 + (Math.random() * KR_N | 0); me.kr = G.prize; setKeyring(me.char, me.kr);
  flash('뽑았다! ' + KR_NAME[G.prize] + ' 키링이다!'); sfx(660, 1320, .45, 'triangle', .06); }
function gachaStep(G, dt, K){
  G.t += dt; G.wob = Math.max(0, G.wob - dt);
  if (G.phase === 0 && (K.f || K.r || K.l)) gachaTurn(G, dt * 4.5);
  if (G.phase === 1 && G.t - G.t0 > .8) G.phase = 2;
  if (G.phase === 3 && G.t - G.t0 > 2.6) { G.phase = 0; G.turn = 0; G.cap = CAP_C[Math.random() * CAP_C.length | 0]; }
}
function drawCharm(g, k, x, y, s){
  g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 2; g.strokeStyle = '#222';
  g.strokeStyle = '#c9ced3'; g.beginPath(); g.arc(0, -34, 7, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, -27); g.lineTo(0, -16); g.stroke(); g.strokeStyle = '#222';
  const fill = (c, f) => { g.fillStyle = c; g.beginPath(); f(); g.fill(); g.stroke(); };
  if (k === 1) fill('#ffd23f', () => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 16; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); });
  else if (k === 2) fill('#e8402a', () => { g.moveTo(0, 14); g.bezierCurveTo(-18, 2, -14, -14, 0, -6); g.bezierCurveTo(14, -14, 18, 2, 0, 14); });
  else if (k === 3) { fill('#e8b830', () => g.arc(0, 0, 13, 0, 7)); g.beginPath(); g.moveTo(-13, 0); g.lineTo(13, 0); g.stroke(); }
  else if (k === 4) fill('#3f8fe0', () => { g.ellipse(2, 0, 15, 9, 0, 0, 7); g.moveTo(-12, 0); g.lineTo(-22, -8); g.lineTo(-22, 8); g.closePath(); });
  else if (k === 5) { fill('#f4f6f8', () => g.arc(0, 6, 11, 0, 7)); fill('#f4f6f8', () => g.arc(0, -10, 8, 0, 7)); }
  else if (k === 6) { fill('#e02a3a', () => { g.moveTo(-12, -6); g.quadraticCurveTo(0, 26, 12, -6); g.closePath(); }); fill('#3f9a3a', () => { g.moveTo(-9, -6); g.lineTo(0, -14); g.lineTo(9, -6); g.closePath(); }); }
  else if (k === 7) { fill('#f7f1ea', () => g.ellipse(-6, -14, 4, 11, -.2, 0, 7)); fill('#f7f1ea', () => g.ellipse(6, -14, 4, 11, .2, 0, 7)); fill('#f7f1ea', () => g.arc(0, 2, 12, 0, 7)); g.fillStyle = '#222'; g.fillRect(-5, 0, 2, 2); g.fillRect(3, 0, 2, 2); }
  else { fill('#f4f4f0', () => g.rect(-12, -12, 24, 24)); g.fillStyle = '#222'; [[-6, -6], [6, 6], [0, 0], [6, -6], [-6, 6]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 2, 0, 7); g.fill(); }); }
  g.restore();
}
function capsule(g, x, y, r, col, open){
  g.save(); g.translate(x, y);
  if (open) { g.fillStyle = col; g.beginPath(); g.arc(-r * 1.4, 0, r, Math.PI * .5, Math.PI * 1.5); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(r * 1.4, 0, r, -Math.PI * .5, Math.PI * .5); g.fill(); }
  else { g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
  g.restore();
}
const CAPS = Array.from({length:22}, (_, i) => [74 + (i * 37) % 94, 62 + (i * 23) % 70, CAP_C[i % CAP_C.length]]);
function gachaDraw(g, G){
  const t = G.t, wob = Math.sin(t * 40) * G.wob * 3;
  g.fillStyle = '#14161b'; g.fillRect(0, 0, LW, LH);
  g.fillStyle = '#c0262d'; g.fillRect(44, 150, 152, 150); g.fillStyle = '#9a1c22'; g.fillRect(44, 290, 152, 10); g.fillRect(36, 146, 168, 10);   // 몸통 · 받침
  g.save(); g.beginPath(); g.arc(120, 96, 66, 0, 7); g.clip(); g.fillStyle = '#cfe8f4'; g.fillRect(40, 20, 160, 160);
  CAPS.forEach(([x, y, c], i) => capsule(g, x + wob * (i % 3 - 1), y + 26 + (i % 2 ? wob : -wob), 11, c, false)); g.restore();
  g.strokeStyle = '#e6eef2'; g.lineWidth = 4; g.beginPath(); g.arc(120, 96, 66, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(94, 66, 10, 22, -.5, 0, 7); g.fill();
  g.fillStyle = '#ffd23f'; g.fillRect(64, 160, 112, 24); g.fillStyle = '#c0262d'; g.font = '16px ' + FONT_D; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('행운 뽑기 100원', 120, 173);
  // 손잡이 (돌린 만큼 돈다)
  g.fillStyle = '#e8eaec'; g.beginPath(); g.arc(KX, KY, 26, 0, 7); g.fill(); g.strokeStyle = '#7d848b'; g.lineWidth = 3; g.stroke();
  g.save(); g.translate(KX, KY); g.rotate(G.turn); g.fillStyle = '#4a5058'; g.fillRect(-24, -6, 48, 12); g.restore();
  if (G.phase === 0) { g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5; g.beginPath(); g.arc(KX, KY, 36, -Math.PI * .8, -Math.PI * .8 + Math.max(.05, G.turn)); g.stroke();
    g.font = '700 11px ' + FONT_B; g.fillStyle = '#fff'; g.fillText('손잡이를 한 바퀴 돌려요', 120, 318 - 8); }
  // 나오는 구멍 + 캡슐
  g.fillStyle = '#1b1d21'; g.fillRect(96, 258, 48, 30);
  if (G.phase === 1) { const k = Math.min(1, (t - G.t0) / .8); capsule(g, 120, 236 + k * 37, 13, G.cap, false); }
  if (G.phase === 2) { capsule(g, 120, 273, 13 + Math.sin(t * 6) * 1, G.cap, false); g.font = '700 11px ' + FONT_B; g.fillStyle = '#ffd23f'; g.fillText('캡슐을 눌러 열기 (E)', 120, 310); }
  if (G.phase === 3) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, LW, LH); const k = Math.min(1, (t - G.t0) / .4);
    capsule(g, 120, 150, 26, G.cap, true); drawCharm(g, G.prize, 120, 146 - k * 10, 1.6 + k * .6);
    g.font = '20px ' + FONT_D; g.fillStyle = '#ffd23f'; g.fillText('뽑았다!', 120, 62); g.font = '700 13px ' + FONT_B; g.fillStyle = '#fff'; g.fillText(KR_NAME[G.prize] + ' 키링이 가방에 달렸어요', 120, 236); }
}

// ───────────────────────── 가방 키링 (상품) ─────────────────────────
// 1 별 · 2 하트 · 3 방울 · 4 물고기 · 5 눈사람 · 6 딸기 · 7 토끼 · 8 주사위 (모두 지어낸 단순한 모양). 가방(캐릭터 등 뒤 상자) 오른쪽 위 고리에 매달려 흔들린다
const KR_NAME = ['', '별', '하트', '방울', '물고기', '눈사람', '딸기', '토끼', '주사위'], KR_N = 8;
const KR_MAT = new Map(), KR_GEO = new Map();
const krMat = c => { if (!KR_MAT.has(c)) KR_MAT.set(c, new THREE.MeshLambertMaterial({color:c, emissive:c, emissiveIntensity:.12})); return KR_MAT.get(c); };
function shapeGeo(k){
  if (KR_GEO.has(k)) return KR_GEO.get(k); const sh = new THREE.Shape();
  if (k === 1) { for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .045 : .1; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
  else { sh.moveTo(0, -.08); sh.bezierCurveTo(-.11, -.01, -.09, .08, -.045, .08); sh.bezierCurveTo(-.015, .08, 0, .06, 0, .045); sh.bezierCurveTo(0, .06, .015, .08, .045, .08); sh.bezierCurveTo(.09, .08, .11, -.01, 0, -.08); }
  const geo = new THREE.ExtrudeGeometry(sh, {depth:.03, bevelEnabled:true, bevelSize:.008, bevelThickness:.008, bevelSegments:1}); geo.center(); KR_GEO.set(k, geo); return geo;
}
function keyringMesh(k){
  const g = new THREE.Group(), ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .007, 6, 12), krMat(0xc9ced3)); g.add(ring);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .07, 4), krMat(0xc9ced3)); chain.position.y = -.06; g.add(chain);
  const c = new THREE.Group(); c.position.y = -.15; g.add(c);
  if (k === 1) c.add(new THREE.Mesh(shapeGeo(1), krMat(0xffd23f)));
  else if (k === 2) c.add(new THREE.Mesh(shapeGeo(2), krMat(0xe8402a)));
  else if (k === 3) { const b = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), krMat(0xe8b830)); c.add(b); const s = new THREE.Mesh(new THREE.TorusGeometry(.056, .006, 4, 16), krMat(0x8a6a20)); s.rotation.x = Math.PI / 2; c.add(s); }
  else if (k === 4) { const b = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 6), krMat(0x3f8fe0)); b.scale.set(1.5, .8, .5); c.add(b); const t = new THREE.Mesh(new THREE.ConeGeometry(.05, .07, 4), krMat(0x2f6fb5)); t.rotation.z = Math.PI / 2; t.position.x = -.11; c.add(t); }
  else if (k === 5) { const a = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), krMat(0xf4f6f8)), b = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), krMat(0xf4f6f8)); b.position.y = .08; c.add(a, b); }
  else if (k === 6) { const b = new THREE.Mesh(new THREE.ConeGeometry(.055, .11, 10), krMat(0xe02a3a)); b.rotation.x = Math.PI; c.add(b); const l = new THREE.Mesh(new THREE.ConeGeometry(.045, .025, 6), krMat(0x3f9a3a)); l.position.y = .066; c.add(l); }
  else if (k === 7) { const h = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), krMat(0xf7f1ea)); c.add(h); [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), krMat(0xf7f1ea)); e.scale.set(1, 2.6, .7); e.position.set(sx * .026, .085, 0); c.add(e); }); }
  else { const d = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .08), krMat(0xf4f4f0)); d.rotation.set(.5, .6, .2); c.add(d); }
  c.rotation.y = Math.PI / 2;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function setKeyring(ch, k){
  if (!ch) return; const u = ch.userData;
  if (u.keyring) { u.inner.remove(u.keyring); u.keyring = null; }
  if (!k) return; u.keyring = keyringMesh(k); u.keyring.position.set(.14, 1.16, -.53); u.inner.add(u.keyring); u.krK = k;
}
const swingKeyring = (ch, now, moved) => { const k = ch && ch.userData.keyring; if (k) { k.rotation.x = Math.sin(now / 160) * (.08 + Math.min(.4, moved * 6)); k.rotation.z = Math.sin(now / 230) * .1; } };

// ───────────────────────── 화면 (DOM 판) ─────────────────────────
const touch = () => matchMedia('(pointer:coarse)').matches;
const K = {l:false, r:false, f:false};
let ui = null, cv = null, cx = null;
function makeUI(){
  ui = document.createElement('div'); ui.id = 'arcade'; ui.hidden = true;
  ui.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;pointer-events:none';
  const btn = 'pointer-events:auto;cursor:pointer;border-radius:0;font:700 13px var(--body, sans-serif);touch-action:manipulation;user-select:none;';
  ui.innerHTML = '<div style="pointer-events:auto;background:rgba(12,13,15,.93);border:1px solid rgba(255,255,255,.2);border-top:2px solid #e3a53b;padding:9px 10px 10px;display:flex;flex-direction:column;align-items:center;gap:8px">' +
    '<div style="display:flex;justify-content:space-between;gap:16px;width:100%;color:#eceae4;font:700 14px var(--body, sans-serif)"><span id="ar-title"></span><span id="ar-info" style="font-weight:600;color:#a7adb0"></span></div>' +
    '<canvas id="ar-cv" style="display:block;background:#000;image-rendering:pixelated"></canvas>' +
    '<div id="ar-menu" style="display:flex;gap:8px"></div>' +
    '<div id="ar-pad" style="display:flex;gap:10px"><button data-k="l" style="' + btn + 'width:64px;height:48px;background:#2b2f35;color:#fff;border:1px solid #555">◀</button>' +
      '<button data-k="r" style="' + btn + 'width:64px;height:48px;background:#2b2f35;color:#fff;border:1px solid #555">▶</button>' +
      '<button data-k="f" style="' + btn + 'width:84px;height:48px;background:#c0262d;color:#fff;border:1px solid #ff8a80">발사</button></div>' +
    '<div id="ar-rps" style="display:flex;gap:14px">' + [1, 2, 3].map(k => '<button data-p="' + k + '" style="' + btn + 'width:76px;height:76px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c0101a 60%,#7a0a10);color:#fff;border:3px solid #222;box-shadow:0 4px 0 #111;font-size:15px">' + HANDS[k] + '</button>').join('') + '</div>' +
    '<button id="ar-quit" type="button" style="' + btn + 'padding:6px 14px;background:rgba(8,9,11,.92);color:#fff;border:1px solid rgba(255,255,255,.55)">그만하기' + (touch() ? '' : ' <kbd style="margin-left:6px;padding:0 5px;border:1px solid rgba(255,255,255,.45);font:600 11px var(--body, sans-serif)">Esc</kbd>') + '</button></div>';
  document.body.appendChild(ui);
  cv = ui.querySelector('#ar-cv'); cx = cv.getContext('2d');
  ui.querySelector('#ar-quit').addEventListener('click', () => stopActivity());
  // 뽑기: 캔버스 위 손잡이를 끌어 돌리고, 캡슐을 눌러 연다
  const lp = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * LW, (e.clientY - r.top) / r.height * LH]; };
  let drag = null;
  cv.addEventListener('pointerdown', e => { const g = S.game; if (!g || g.watch || !g.G || g.G.kind !== 4) return; e.preventDefault(); const [x, y] = lp(e);
    if (g.G.phase === 2 && Math.hypot(x - 120, y - 273) < 30) { gachaOpen(g.G); return; }
    if (Math.hypot(x - KX, y - KY) < 60) { drag = Math.atan2(y - KY, x - KX); cv.setPointerCapture(e.pointerId); } });
  cv.addEventListener('pointermove', e => { if (drag === null || !S.game || !S.game.G) return; const [x, y] = lp(e), a = Math.atan2(y - KY, x - KX), d = Math.atan2(Math.sin(a - drag), Math.cos(a - drag)); drag = a; gachaTurn(S.game.G, Math.abs(d)); });
  const up = () => { drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  ui.querySelectorAll('#ar-pad button').forEach(b => {
    const k = b.dataset.k, on = v => e => { e.preventDefault(); K[k] = v; if (v && k === 'f') action(); };
    b.addEventListener('pointerdown', on(true)); b.addEventListener('pointerup', on(false)); b.addEventListener('pointerleave', on(false)); b.addEventListener('pointercancel', on(false));
  });
  ui.querySelectorAll('#ar-rps button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); const g = S.game; if (g && g.R && !g.watch) rpsPick(g.R, +b.dataset.p); b.animate([{transform:'translateY(3px)'}, {transform:'none'}], {duration:160}); }));
  // 키: 열려 있는 동안 이동 · 발사 · 고르기 키를 가로챈다 (걷기 · 손 흔들기로 가지 않게). Esc는 그대로 둔다
  const MAP = {ArrowLeft:'l', KeyA:'l', ArrowRight:'r', KeyD:'r', Space:'f', KeyE:'f', KeyJ:'f', ArrowUp:'f', KeyW:'f'};
  window.addEventListener('keydown', e => {
    if (ui.hidden || !S.game || S.mode !== 'arcade') return;
    const k = MAP[e.code], d = {Digit1:1, Digit2:2, Digit3:3, Numpad1:1, Numpad2:2, Numpad3:3}[e.code];
    if (!k && !d && e.code !== 'Enter') return;
    e.preventDefault(); e.stopImmediatePropagation(); if (S.game.watch) return;
    if (k) { if (k === 'f' && !e.repeat) action(); K[k] = true; }
    else if (d) choose(d); else if (e.code === 'Enter') again();
  }, true);
  window.addEventListener('keyup', e => { const k = MAP[e.code]; if (k) K[k] = false; }, true);
}
function layout(kind, watch){
  const rps = kind === 'rps', small = innerHeight < 560;
  const h = rps ? Math.min(innerHeight * .46, 330) : Math.min(innerHeight * (touch() ? .52 : .66), 460), w = rps ? h * RPS_W / RPS_H : h * LW / LH, dpr = Math.min(2, devicePixelRatio || 1);
  cv.style.width = Math.round(w) + 'px'; cv.style.height = Math.round(h) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cx.setTransform(cv.width / (rps ? RPS_W : LW), 0, 0, cv.height / (rps ? RPS_H : LH), 0, 0);
  ui.querySelector('#ar-pad').style.display = !rps && !watch && touch() ? 'flex' : 'none';
  ui.querySelectorAll('#ar-pad button').forEach(b => { b.style.display = kind === 'gacha' && b.dataset.k !== 'f' ? 'none' : ''; if (b.dataset.k === 'f') b.textContent = kind === 'gacha' ? '돌리기 · 열기' : '발사'; });
  ui.querySelector('#ar-rps').style.display = rps && !watch ? 'flex' : 'none';
  ui.querySelectorAll('#ar-rps button').forEach(b => { b.style.width = b.style.height = (small ? 58 : 76) + 'px'; });
}
function menu(on){
  const m = ui.querySelector('#ar-menu'); m.innerHTML = ''; m.style.display = on ? 'flex' : 'none'; if (!on) return;
  [[1, '1 · 은하 대작전'], [2, '2 · 벽돌 깨기']].forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    b.style.cssText = 'pointer-events:auto;cursor:pointer;padding:8px 12px;border-radius:0;background:#1f2a44;color:#fff;border:1px solid #7fd0ff;font:700 13px var(--body, sans-serif)';
    b.addEventListener('click', () => choose(k)); m.appendChild(b); });
}
function drawMenu(g, t){
  g.fillStyle = '#05060a'; g.fillRect(0, 0, LW, LH); STARS.forEach(([x, y, sp, c]) => { g.fillStyle = ['#7d8cff', '#ff8c8c', '#e6e6a0'][c]; g.fillRect(x, (y + t * sp) % LH, 1.5, 1.5); });
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '26px ' + FONT_D; g.fillStyle = '#ffd23f'; g.fillText('별빛 오락', 120, 70);
  g.font = '700 12px ' + FONT_B; g.fillStyle = '#fff'; g.fillText('게임을 골라요', 120, 104);
  g.font = '18px ' + FONT_D; g.fillStyle = '#7fd0ff'; g.fillText('1  은하 대작전', 120, 150); g.fillStyle = '#f28c28'; g.fillText('2  벽돌 깨기', 120, 184);
  if ((t * 2 | 0) % 2) { g.font = '700 11px ' + FONT_B; g.fillStyle = '#cfd6e0'; g.fillText('100원 넣었다 치고~', 120, 240); }
  drawEnemy(g, 60, 150, 1, t); drawShip(g, 120, 280);
}

// 놀이 상태: S.game = {m 기계, R (가위바위보) | G (게임) | menu, watch 구경 대상(다른 사람)}
function choose(k){ const g = S.game; if (!g || g.watch) return; if (g.m.kind === 'rps') { if (g.R) rpsPick(g.R, k); return; }
  if (g.menu && (k === 1 || k === 2)) { g.menu = false; g.G = k === 1 ? galaxyNew() : brickNew(); menu(false); sfx(600, 900, .12, 'square', .04); } }
function again(){ const g = S.game; if (g && g.G && g.G.kind !== 4 && g.G.over) { g.G = g.G.kind === 1 ? galaxyNew() : brickNew(); } }
function action(){ const g = S.game; if (!g || g.watch) return; if (g.G && g.G.kind === 4) { gachaOpen(g.G); return; } if (g.G && g.G.over) again(); }

// ── 구경: 받은 ar로 같은 그리기 상태를 만든다 ──
// 살아 있는 적 · 벽돌을 16칸씩 묶은 숫자로 (presence 숫자 범위 안: 최대 65535)
const pack = arr => { const out = []; arr.forEach((v, i) => { const j = i >> 4; out[j] = (out[j] || 0) | (v ? 1 << (i & 15) : 0); }); return out.map(v => v || 0); };
const unpack = (ws, n) => Array.from({length:n}, (_, i) => !!(((ws[i >> 4] || 0) >> (i & 15)) & 1));
function shareState(g){
  if (g.R) { const R = g.R; return [g.m.id, 3, R.phase, R.pick, R.cpu, R.res, Math.round(R.t * 10), Math.round(R.t0 * 10)]; }
  if (!g.G) return [g.m.id, 0];
  if (g.G.kind === 4) return [g.m.id, 4, g.G.phase];   // 뽑기는 구경하지 않는다 (줄에 넷이라 여럿이 같이 한다)
  const G = g.G;
  if (G.kind === 1) { const [a, b] = pack(G.alive), d = [0, 1, 2].flatMap(j => G.divers[j] ? [G.divers[j].i, Math.round(G.divers[j].t0 * 10), G.divers[j].tx] : [-1, 0, 0]), p = [0, 1].flatMap(j => G.pb[j] ? [Math.round(G.pb[j].x), Math.round(G.pb[j].y)] : [-1, -1]);
    return [g.m.id, 1, Math.round(G.t * 10), Math.round(G.x), G.score, G.lives, a, b, G.wave, G.over ? 1 : 0, ...d, ...p, Math.round(G.dead * 10), G.clearT ? 1 : 0]; }
  const [a, b, c] = pack(G.alive);
  return [g.m.id, 2, Math.round(G.t * 10), Math.round(G.px), Math.round(G.bx), Math.round(G.by), Math.round(G.vx), Math.round(G.vy), G.score, G.lives, a, b, c, G.stuck ? 1 : 0, G.over ? 1 : 0, G.lvl];
}
function watchState(Rm, w){
  const a = Rm.ar || [], el = Math.min(.6, (performance.now() - (Rm.arT || 0)) / 1000), k = a[1];
  if (k === 3) { const R = {t:a[6] / 10 + el, phase:a[2], pick:a[3], cpu:a[4], res:a[5], t0:a[7] / 10}; return {R}; }
  if (k === 1) {
    const t = a[2] / 10 + el, G = w.G && w.G.kind === 1 ? w.G : galaxyNew(), alive = unpack([a[6], a[7]], 32);
    alive.forEach((v, i) => { if (G.alive[i] && !v) { const p = slot(i, t); G.boom.push({x:p[0], y:p[1], t}); } });   // 새로 떨어진 적은 터지는 모습
    G.t = t; G.x += (a[3] - G.x) * .35; G.score = a[4]; G.lives = a[5]; G.alive = alive; G.wave = a[8]; G.over = !!a[9]; G.dead = a[23] / 10; G.clearT = a[24] ? 1 : 0;
    G.divers = [0, 1, 2].map(j => ({i:a[10 + j * 3], t0:a[11 + j * 3] / 10, tx:a[12 + j * 3]})).filter(d => d.i >= 0);
    G.pb = [0, 1].map(j => ({x:a[19 + j * 2], y:a[20 + j * 2] - 300 * el})).filter(b => b.x >= 0 && b.y > -10); G.boom = G.boom.filter(b => t - b.t < .5);
    return {G};
  }
  if (k === 2) {
    const G = w.G && w.G.kind === 2 ? w.G : brickNew();
    G.t = a[2] / 10 + el; G.px += (a[3] - G.px) * .35; G.stuck = !!a[13]; G.bx = G.stuck ? G.px : cl(a[4] + a[6] * el, 4, 236); G.by = G.stuck ? 291 : a[5] + a[7] * el;
    G.score = a[8]; G.lives = a[9]; G.alive = unpack([a[10], a[11], a[12]], BC * BR); G.over = !!a[14]; G.lvl = a[15]; return {G};
  }
  return {menu:true};
}
const watchedBy = m => { for (const R of S.remotes.values()) if (R.st === ST.ARCADE && R.ar && R.ar[0] === m.id && Math.hypot(R.x - m.sx, R.z - m.sz) < 3) return R; return null; };

const arcade = defineActivity({
  id:'arcade', st:ST.ARCADE, hideLabels:true,
  offer(offer){
    for (const m of MACH) {
      const d = Math.hypot(me.x - m.sx, me.z - m.sz); if (d > 2.4) continue;
      if (m.kind === 'gacha') { offer(d, 2.4, '뽑기 하기', () => arcade.start(m)); continue; }
      const R = watchedBy(m);
      if (R) offer(d, 2.4, '구경하기', () => arcade.start(m, R));
      else offer(d, 2.2, m.kind === 'rps' ? '가위바위보 하기' : '오락기 하기', () => arcade.start(m));
    }
  },
  start(m, watch){
    if (!ui) makeUI();
    begin(arcade, {m, watch:watch || null, menu:!watch && m.kind === 'cab', R:!watch && m.kind === 'rps' ? rpsNew() : null, G:m.kind === 'gacha' ? gachaNew() : null, t:0});
    if (watch) { me.st = 0; const side = m.kind === 'rps' ? 1 : -1; me.x = m.sx + Math.cos(m.face) * .9 * side; me.z = m.sz - Math.sin(m.face) * .9 * side; }   // 구경은 옆 (가게 가운데 쪽)
    else { me.x = m.sx; me.z = m.sz; }
    me.r = Math.atan2(m.x - me.x, m.z - me.z);
    K.l = K.r = K.f = false;
    ui.querySelector('#ar-title').textContent = watch ? nameOf(watch.a, watch.n) + ' 구경 중' : NAME[m.kind];
    ui.querySelector('#ar-info').textContent = '';
    layout(m.kind, !!watch); menu(!watch && m.kind === 'cab'); ui.hidden = false;
    sfx(700, 1000, .1, 'square', .04);
  },
  prompt(){ return null; },
  onAction(){ action(); },
  camera(want, look){ const g = S.game; if (!g) return false; const m = g.m, bx = me.x - m.x, bz = me.z - m.z, L = Math.hypot(bx, bz) || 1;
    want.set(me.x + bx / L * 2.6, W.groundY(me.x, me.z) + 2.4, me.z + bz / L * 2.6); look.set(m.x, W.groundY(m.x, m.z) + 1.2, m.z); return true; },
  quit(){ if (ui) ui.hidden = true; me.ar = [0]; K.l = K.r = K.f = false; },
  frame(dt, now, moved){
    swingKeyring(me.char, now, moved);
    if (me.char && me.kr && me.char.userData.krK !== me.kr) setKeyring(me.char, me.kr);
    if (S.mode !== 'arcade' || !S.game || !ui) return;
    const g = S.game; g.t += dt;
    if (g.watch) {
      const R = g.watch;
      if (!S.remotes.has(R.id) || R.st !== ST.ARCADE || !R.ar || R.ar[0] !== g.m.id) { stopActivity(); flash('구경 끝! 오락이 끝났어요'); return; }
      const v = watchState(R, g); g.G = v.G || null; g.Rv = v.R || null; g.menu = !!v.menu;
    } else {
      if (g.R) rpsStep(g.R, dt); else if (g.G) ({1:galaxyStep, 2:brickStep, 4:gachaStep})[g.G.kind](g.G, Math.min(dt, .05), K);
      me.ar = shareState(g);
      if (me.char) { const u = me.char.userData; u.armL.rotation.x = u.armR.rotation.x = -1.05 - (K.f || (g.R && g.R.phase === 1) ? .12 * Math.sin(now / 50) : 0); }
    }
    // 그리기
    const R = g.watch ? g.Rv : g.R;
    if (g.m.kind === 'rps') { if (R) drawRpsFace(cx, rpsView(R)); ui.querySelector('#ar-info').textContent = R && R.pick ? '나: ' + HANDS[R.pick] + (R.phase === 2 ? ' · 기계: ' + HANDS[R.cpu] : '') : (g.watch ? '' : '버튼을 눌러요'); }
    else if (g.G) { ({1:galaxyDraw, 2:brickDraw, 4:gachaDraw})[g.G.kind](cx, g.G); ui.querySelector('#ar-info').textContent = ({1:'은하 대작전', 2:'벽돌 깨기', 4:'키링이 나와요'})[g.G.kind]; }
    else drawMenu(cx, g.t);
  },
  remote(R, p){ R.ar = p.ar; R.arT = performance.now(); R.kr = p.kr; },
  remoteFrame(R, dt, moved){
    if (!R.char) return;
    if ((R.kr || 0) !== (R.char.userData.krK || 0)) { setKeyring(R.char, R.kr); R.char.userData.krK = R.kr || 0; }
    swingKeyring(R.char, performance.now(), moved);
    if (R.st === ST.ARCADE) { const u = R.char.userData; u.armL.rotation.x = u.armR.rotation.x = -1.05; }
  },
});
