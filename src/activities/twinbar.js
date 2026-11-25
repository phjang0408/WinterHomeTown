// 나눠바 나누기 (2026-11-25): 공원 동쪽 잔디, 딱지와 공기놀이 사이 마당(layout.js TWIN). 두 사람 협동.
//   두 사람이 서 · 동에 마주 서서 나눠바(지어낸 이름) 막대를 하나씩 잡는다. 화면 아래 힘 게이지(네모 손잡이 끌기, 또는 E · W · ↑ 누르고 있기,
//   놓으면 천천히 0으로)로 당기는 힘을 정한다. 두 힘의 합이 RULE.T를 넘으면 금이 아래에서 위로 올라간다(빠르기는 넘은 만큼).
//   금은 더 세게 당기는 쪽으로 쏠리고(조금씩 저절로 흔들리기도 한다), 가장자리에 닿거나 합이 RULE.D를 RULE.DANGER초 넘게 넘으면 '뚝' 실패.
//   꼭대기까지 가면 두 조각 넓이로 '반반 정확도'를 매기고, 반쪽씩 손에 들려 먹을 수 있다(goguma.js ITEMS 4).
//   동기화(protocol sb): 각자 [자리, 힘, 상태, 금 높이, 금 좌우, 정확도, 동네 형, 판]. 서쪽(0) 사람이 금을 계산하고 동쪽은 받아서 그린다.
//   혼자면 기다리는 동안 '동네 형이랑 하기'(E): 형은 합을 맞추고 금을 가운데로 돌리려 하지만, 가끔 욕심을 내서 세게 당긴다.
import * as THREE from '../lib/three.js';
import { M, pillSprite } from '../core/gfx.js';
import { root } from '../core/engine.js';
import { S } from '../core/state.js';
import { PI, clamp } from '../core/util.js';
import { sfx, flash, after, puff } from '../core/fx.js';
import { ST, UNIT } from '../config.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me, nameOf } from '../entities/player.js';
import { buildProp } from '../props/registry.js';
import { makeChar } from '../entities/character.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, stopActivity } from './registry.js';
import { TWIN } from '../map/layout.js';

// 숫자는 여기서 바꾼다. 힘은 한 사람 0~1, 합은 0~2. PCT_K: 금 평균 쏠림 → 정확도(%) 기울기, TIER: 도끼 모양이 되는 정확도 경계
export const RULE = {T:1.0, D:1.42, K:.5, C:1.25, WOB:.22, DANGER:.6, CNT:2.4, UP:.8, DOWN:.6, PERFECT:97, PCT_K:1.6, TIER:[66, 33]};
const GAP = .62, HELD = 1.16, BAR_S = 3.6, IDLE = [9, 0, 0, 0, 0, 0, 0, 0], AMBER = '#f2b544', GREEN = '#9be15d', RED = '#ff5a4a', CHOC = '#6b3d22';
const spot = seat => ({x:TWIN.x + (seat ? GAP : -GAP), z:TWIN.z});
const face = seat => seat ? -PI / 2 : PI / 2;
let bar = null, gy = 0, P = null, eHeld = false, hyung = null, meTag = null;   // meTag: 놀이 중 내 머리 위 '나' 표   // hyung: 동네 형 캐릭터 (동네 형이랑 할 때만 보인다)

// ── 나뉜 모양 (2026-11-25 2차): 막대는 2줄 × 4칸. 정확도 66% 이상은 반반 '1자'(4 · 4),
//    33~66%는 세게 당긴 쪽(금이 쏠린 쪽) 줄의 맨 위 1칸이 반대쪽에 붙어 간다(3 · ㄱ자 도끼 5), 33% 미만은 2칸(2 · 날 큰 도끼 6).
//    strong: 세게 당긴 자리(0 서 · 1 동). 금 평균이 동쪽(+)이면 동쪽이 세게 당긴 것.
const shapeOf = (pct, sx) => ({tier:pct >= RULE.TIER[0] ? 0 : pct >= RULE.TIER[1] ? 1 : 2, strong:sx > 0 ? 1 : 0});
const owner = (c, r, sh) => sh.tier && c === sh.strong && r >= 4 - sh.tier ? 1 - sh.strong : c;
const pieceOf = (seat, sh) => !sh.tier ? {cells:4, blade:0} : seat === sh.strong ? {cells:4 - sh.tier, blade:0} : {cells:4, blade:sh.tier};
const itemOf = (seat, sh) => !sh.tier ? 4 : seat === sh.strong ? (sh.tier === 1 ? 7 : 8) : (sh.tier === 1 ? 5 : 6);

// ── 3D 막대: 반쪽 둘을 맞붙이고, 위 안쪽 모서리를 축으로 아래가 벌어진다. 다 나뉘면 나뉜 모양 조각으로 바꿔 보여 준다 ──
function makeBar(){
  const g = new THREE.Group(); g.position.set(TWIN.x, gy + HELD, TWIN.z); g.visible = false; root.add(g);
  const k = BAR_S * UNIT, piv = [], half = [];
  [-1, 1].forEach(sd => { const p = new THREE.Group(); p.position.set(0, .125 * k, 0); g.add(p);
    const h = buildProp('twinbarHalf'); h.scale.setScalar(BAR_S); h.position.set(sd * .024 * k, -.125 * k, 0); p.add(h); piv.push(p); half.push(h); });
  bar = {g, piv, half, k, shapes:[{}, {}], shown:[null, null]};
}
function shapeObj(i, pc){
  const key = pc.cells + '/' + pc.blade, c = bar.shapes[i]; if (!c[key]) { const o = buildProp('twinbarHalf', pc); o.scale.set(i ? -BAR_S : BAR_S, BAR_S, BAR_S); o.position.set((i ? 1 : -1) * .024 * bar.k, -.125 * bar.k, 0); bar.piv[i].add(o); c[key] = o; }
  return c[key];
}
// 금 높이 p, 좌우 x(+는 동쪽), 상태 st, 나뉜 모양 sh. 뚝이면 금이 간 쪽 조각이 작게 남는다
function showBar(p, x, st, sh){
  bar.g.visible = true;
  const open = st === 4 ? .5 : st === 3 ? .4 : p * .22, side = st === 4 ? (x > 0 ? 1 : -1) : 0;
  bar.piv[0].rotation.z = -open; bar.piv[1].rotation.z = open;
  [0, 1].forEach(i => { const want = st === 3 && sh ? shapeObj(i, pieceOf(i, sh)) : null;
    if (bar.shown[i] !== want) { if (bar.shown[i]) bar.shown[i].visible = false; if (want) want.visible = true; bar.shown[i] = want; }
    bar.half[i].visible = !want; });
  bar.half[0].scale.set(BAR_S * (side > 0 ? 1.3 : 1), BAR_S * (side < 0 ? .32 : 1), BAR_S);
  bar.half[1].scale.set(BAR_S * (side < 0 ? 1.3 : 1), BAR_S * (side > 0 ? .32 : 1), BAR_S);
}

// ── 화면 아래 판 (2026-11-25 2차): 위에 막대 그림(내 줄은 호박색 테두리 · 아래에 '← 나'), 그 밑에 두 사람 힘 합(한 색: 모자라면 회색 · 알맞으면 연두 · 넘치면 빨강), 맨 밑에 내 힘 게이지(→ 손잡이를 밀기) ──
const coarseUI = () => matchMedia('(pointer:coarse)').matches;
function panel(on){
  if (!P) {
    const d = document.createElement('div'); d.id = 'twin'; d.className = 'card'; d.hidden = true; const cw = coarseUI() ? 96 : 120;
    d.style.cssText = 'position:fixed;left:50%;bottom:' + (coarseUI() ? 64 : 16) + 'px;transform:translateX(-50%);z-index:25;width:min(92vw,380px);padding:10px 14px 12px;display:flex;flex-direction:column;gap:6px;touch-action:none;user-select:none';
    d.innerHTML = '<div id="tw-top" style="display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;min-height:20px"><span id="tw-st" style="font-size:14px;font-weight:700"></span>' +
      '<button id="tw-cpu" type="button" style="pointer-events:auto;padding:5px 12px;background:' + AMBER + ';color:#1a1b1d;font:800 13px var(--body, sans-serif);border-radius:0">동네 형이랑 하기' + (coarseUI() ? '' : ' · E') + '</button></div>' +
      '<canvas id="tw-bar" width="300" height="330" style="width:' + cw + 'px;height:' + Math.round(cw * 1.1) + 'px;align-self:center"></canvas>' +
      '<p id="tw-msg" style="margin:0;text-align:center;font-size:17px;font-weight:800;min-height:22px;text-shadow:0 1px 2px rgba(0,0,0,.6)"></p>' +
      '<p style="margin:2px 0 0;font-size:11px;opacity:.8">두 사람 힘 합</p>' +
      '<canvas id="tw-sum" width="400" height="36" style="width:100%;height:18px;display:block"></canvas>' +
      '<p style="margin:4px 0 0;font-size:11px;opacity:.8">내 힘 <span style="float:right">' + (coarseUI() ? '손잡이를 오른쪽으로 밀어요' : '오른쪽으로 끌기 · E 누르고 있기') + '</span></p>' +
      '<div id="tw-track" style="position:relative;height:36px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);cursor:pointer;touch-action:none;overflow:hidden">' +
      '<div id="tw-fill" style="position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(242,181,68,.45);pointer-events:none"></div>' +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:18px;font:900 18px sans-serif;color:rgba(255,255,255,.28);pointer-events:none">›&nbsp;›&nbsp;›&nbsp;›</div>' +
      '<div id="tw-knob" style="position:absolute;top:0;left:0;width:36px;height:34px;background:' + AMBER + ';border:2px solid #fff;box-sizing:border-box;pointer-events:none;display:flex;align-items:center;justify-content:center;font:900 20px sans-serif;color:#1a1b1d">→</div></div>';
    document.body.appendChild(d);
    const tr = d.querySelector('#tw-track'), set = e => { const r = tr.getBoundingClientRect(); if (S.game && S.mode === 'twinbar') S.game.ptr = clamp((e.clientX - r.left - 18) / Math.max(1, r.width - 36), 0, 1); };
    tr.addEventListener('pointerdown', e => { tr.setPointerCapture(e.pointerId); set(e); e.preventDefault(); e.stopPropagation(); });
    tr.addEventListener('pointermove', e => { if (tr.hasPointerCapture(e.pointerId)) set(e); });
    const up = () => { if (S.game && S.mode === 'twinbar') S.game.ptr = null; };
    tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up); tr.addEventListener('lostpointercapture', up);
    d.querySelector('#tw-cpu').addEventListener('click', e => { e.stopPropagation(); const g = S.game; if (S.mode === 'twinbar' && g && g.waiting) setPartner(g, null); });
    P = {d, st:d.querySelector('#tw-st'), cpu:d.querySelector('#tw-cpu'), stKey:'', bar:d.querySelector('#tw-bar'), sum:d.querySelector('#tw-sum'), msg:d.querySelector('#tw-msg'), fill:d.querySelector('#tw-fill'), knob:d.querySelector('#tw-knob'), tr, key:''};
  }
  P.d.hidden = !on;
}
function rrect(c, x0, y0, x1, y1, rt, rb){ c.beginPath(); c.moveTo(x0 + rt, y0); c.lineTo(x1 - rt, y0); c.quadraticCurveTo(x1, y0, x1, y0 + rt); c.lineTo(x1, y1 - rb); c.quadraticCurveTo(x1, y1, x1 - rb, y1);
  c.lineTo(x0 + rb, y1); c.quadraticCurveTo(x0, y1, x0, y1 - rb); c.lineTo(x0, y0 + rt); c.quadraticCurveTo(x0, y0, x0 + rt, y0); c.closePath(); }
// 막대(2줄 × 4칸) 그리기. 칸 (줄 c, 아래부터 r)의 상자
const BX = 70, BW = 160, BY = 12, BH = 200, CW = BW / 2, RH = BH / 4;
const cellBox = (c, r, dx = 0) => [BX + c * CW + dx, BY + BH - (r + 1) * RH, BX + (c + 1) * CW + dx, BY + BH - r * RH];
function sticks(c, dx){ c.fillStyle = '#d9b98a'; [0, 1].forEach(i => c.fillRect(BX + CW * i + CW / 2 - 10 + (dx ? dx[i] : 0), BY + BH - 4, 20, 58)); }
function labels(c, g){
  const name = s => s === g.seat ? (s ? '나 →' : '← 나') : (s ? (g.oppShort + ' →') : ('← ' + g.oppShort));
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 26px sans-serif';
  [0, 1].forEach(s => { c.fillStyle = s === g.seat ? AMBER : 'rgba(255,255,255,.85)'; c.fillText(name(s), BX + CW * s + CW / 2 + (s ? 22 : -22), 300); });
}
function drawBar(g){
  const c = P.bar.getContext('2d'); c.clearRect(0, 0, 300, 330);
  const Y = q => BY + BH - q * BH, X = v => BX + CW + v * CW * .97;
  if (g.st === 3) {                                                   // 다 나뉨: 나뉜 모양대로 두 조각을 벌려 그린다
    const sh = shapeOf(g.pct, g.sx), dx = [-12, 12]; sticks(c, dx);
    for (let col = 0; col < 2; col++) for (let r = 0; r < 4; r++) { const o = owner(col, r, sh), [x0, y0, x1, y1] = cellBox(col, r, dx[o]);
      c.fillStyle = CHOC; c.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2); if (o === g.seat) { c.strokeStyle = AMBER; c.lineWidth = 4; c.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4); } }
    c.font = '900 40px sans-serif'; c.textAlign = 'center'; c.lineWidth = 7; c.strokeStyle = '#1a1b1d'; c.strokeText(g.pct + '%', BX + CW, BY + 56); c.fillStyle = AMBER; c.fillText(g.pct + '%', BX + CW, BY + 56);
    labels(c, g); return;
  }
  sticks(c);
  const side = g.st === 4 ? (g.x > 0 ? 1 : 0) : -1;
  const gr = c.createLinearGradient(0, BY, 0, BY + BH); gr.addColorStop(0, '#87522f'); gr.addColorStop(1, '#5a321c');
  c.fillStyle = gr; rrect(c, BX, BY, BX + BW, BY + BH, 30, 10); c.fill();
  c.fillStyle = 'rgba(255,255,255,.1)'; for (let r = 1; r < 4; r++) c.fillRect(BX + 6, BY + BH - r * RH - 2, BW - 12, 4);            // 칸 사이 줄
  if (side >= 0) { c.fillStyle = 'rgba(20,12,8,.85)'; c.fillRect(BX + side * CW, BY, CW, Y(Math.max(.12, g.p)) - BY); }         // 뚝: 이 쪽은 위가 떨어져 나갔다
  c.strokeStyle = AMBER; c.lineWidth = 5; c.strokeRect(BX + g.seat * CW + 3, BY + 3, CW - 6, BH - 6);                               // 내 줄
  c.setLineDash([8, 8]); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(BX + CW, BY + 6); c.lineTo(BX + CW, BY + BH); c.stroke(); c.setLineDash([]);
  if (g.path.length) {
    const pts = [[X(0), Y(0)], ...g.path.map(q => [X(q.x), Y(q.p)])];
    if (g.st === 4) pts.push([side ? BX + BW : BX, Y(g.p) - 6]);
    [['#24140b', 9], ['#fff1d0', 4]].forEach(([col, w]) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); });
  }
  if (g.st === 4) { c.font = '900 54px sans-serif'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = '#1a1b1d'; c.strokeText('뚝!', BX + CW, BY + 70); c.fillStyle = RED; c.fillText('뚝!', BX + CW, BY + 70); }
  labels(c, g);
}
// 결과 그림: 막대 전체는 흐리게, 내가 가져간 칸만 초콜릿색
function resultImg(seat, sh){
  const cv = document.createElement('canvas'); cv.width = 300; cv.height = 300; cv.style.cssText = 'width:120px;height:120px';
  const c = cv.getContext('2d'), dx = [-8, 8];
  c.fillStyle = 'rgba(217,185,138,.25)'; [0, 1].forEach(i => c.fillRect(BX + CW * i + CW / 2 - 10 + dx[i], BY + BH - 4, 20, 58));
  c.fillStyle = '#d9b98a'; c.fillRect(BX + CW * seat + CW / 2 - 10 + dx[seat], BY + BH - 4, 20, 58);
  for (let col = 0; col < 2; col++) for (let r = 0; r < 4; r++) { const o = owner(col, r, sh), [x0, y0, x1, y1] = cellBox(col, r, dx[o]);
    if (o === seat) { c.fillStyle = CHOC; c.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2); c.strokeStyle = AMBER; c.lineWidth = 3; c.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4); }
    else { c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4); c.setLineDash([]); } }
  return cv;
}
const sumColor = F => F > RULE.D ? RED : F > RULE.T ? GREEN : '#cfd6dd';
// 힘 합 막대 (0~2): 두 사람 힘을 한 막대로. 바탕 칸: 모자람(어둡게) · 알맞음(연두) · 넘침(빨강)
function drawSum(g){
  const c = P.sum.getContext('2d'), w = 400, h = 36, X = v => clamp(v, 0, 2) / 2 * w, F = g.a + g.b;
  c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(155,225,93,.2)'; c.fillRect(X(RULE.T), 0, X(RULE.D) - X(RULE.T), h);
  c.fillStyle = 'rgba(255,90,74,' + (g.dT > 0 ? .4 + .3 * Math.sin(performance.now() / 70) : .22) + ')'; c.fillRect(X(RULE.D), 0, w - X(RULE.D), h);
  c.fillStyle = sumColor(F); c.fillRect(0, 7, X(F), h - 14);
  c.fillStyle = '#fff'; [RULE.T, RULE.D].forEach(v => c.fillRect(X(v) - 1.5, 0, 3, h));
}
function drawKnob(g){ const r = P.tr.clientWidth - 36; P.knob.style.left = g.a * r + 'px'; P.fill.style.width = g.a * r + 18 + 'px'; }
// 안내 글과 색: 모자라면 호박색으로 크게, 알맞으면 연두, 넘치면 빨강
function status(g){                                                   // 막대 그림 위: 시작 전 상태 (놀이 중에는 비운다)
  if (g.waiting) return '맞은편을 기다려요';
  if (g.st === 0) return g.oppName + '을(를) 기다려요…';
  if (g.st === 1) return '막대를 잡아요… ' + (g.host ? Math.max(1, Math.ceil(RULE.CNT - g.t)) : '');
  return '';
}
function message(g){                                                  // 막대 그림 아래: 시작 전에는 규칙 한 줄, 놀이 중에는 지금 할 일
  if (g.st === 3) return ['쩍! 반반 정확도 ' + g.pct + '%', AMBER];
  if (g.st === 4) return ['뚝! 끊어졌다', RED];
  if (g.waiting || g.st < 2) return ['힘을 주면 내 쪽으로 당겨와요', '#fff'];
  const F = g.a + g.b, mine = g.seat ? 1 : -1;
  if (F > RULE.D) return ['너무 세요! 힘을 빼요', RED];
  if (F <= RULE.T) return ['힘을 더 주세요!', AMBER];
  if (Math.abs(g.x) > .3) return Math.sign(g.x) === mine ? ['내 쪽으로 쏠려요 · 힘을 빼요', AMBER] : ['상대 쪽으로 쏠려요 · 더 당겨요', AMBER];
  return ['좋아요! 쭉쭉 갈라진다', GREEN];
}

// ── 게임 ──
const findPartner = seat => { for (const R of S.remotes.values()) if (R.st === ST.TWIN && R.sb && R.sb[0] === 1 - seat && !R.sb[6]) return R; return null; };
function publish(){ const g = S.game, x = g.st === 3 ? g.sx : g.x; me.sb = [g.seat, Math.round(g.a * 100), g.st, Math.round(g.p * 1000), Math.round(clamp(x, -1, 1) * 1000), g.pct, g.cpu ? 1 : 0, g.round]; }   // 다 나뉘면 x 자리에 금 평균(누가 세게 당겼나)
function reset(g){ g.p = 0; g.x = 0; g.sx = 0; g.path = []; g.dT = 0; g.t = 0; g.pct = 0; g.nz = 0; g.nzT = 0; g.nzK = 0; g.ended = false; }
function rec(g){ const l = g.path[g.path.length - 1]; if (!l || g.p - l.p >= .012 || g.p >= 1) g.path.push({p:g.p, x:g.x}); }
const meanX = g => g.path.length ? g.path.reduce((s, q) => s + q.x, 0) / g.path.length : 0;
const evenPct = m => Math.round(100 * (1 - Math.min(1, Math.abs(m) * RULE.PCT_K)));   // 금 평균이 가운데서 멀수록 낮다
// 동네 형: 내 옷 색과 다른 색으로 (같으면 누가 누군지 헷갈린다), 머리 위에 '동네 형' 이름표
function hyungFor(ci){
  const want = ci === 5 ? 2 : 5; if (hyung && hyung.userData.ci === want) return hyung;
  if (hyung) root.remove(hyung); hyung = makeChar(want); hyung.userData.ci = want; hyung.visible = false; root.add(hyung);
  const l = pillSprite('동네 형', 'rgba(255,255,255,.9)', '#2b3f55', .3); l.position.y = 2.45; hyung.add(l); return hyung;
}
function setPartner(g, R){
  if (!R) hyungFor(me.ci);
  g.R = R; g.cpu = !R; g.waiting = false; g.host = g.cpu || g.seat === 0; g.oppName = R ? nameOf(R.a, R.n) : '동네 형'; g.oppShort = R ? '상대' : '형'; g.b = 0; g.live = false; reset(g);
  hud.stat('함께: ' + g.oppName); flash(R ? g.oppName + '와(과) 나눠바 나누기!' : '동네 형이 왔어요. 반반 나눠 먹자!');
}
// 동네 형: 합을 1.28쯤으로 맞추고, 금이 자기 쪽으로 오면 힘을 뺀다. 가끔(2.5~5초마다 40%) 0.7초 욕심
function cpuStep(g, dt){
  const s = g.seat ? -1 : 1; g.aS += (g.a - g.aS) * Math.min(1, dt * 2.5);
  if ((g.cgT -= dt) < 0) { g.cgT = 2.5 + Math.random() * 2.5; if (g.st === 2 && Math.random() < .4) g.greed = .45; }
  g.greed = Math.max(0, g.greed - dt);
  const tgt = g.st === 2 ? clamp(Math.min(1.22 - g.aS - s * .9 * g.x, RULE.D - .08 - g.aS) + (g.greed > 0 ? .22 : 0), 0, 1) : g.st === 1 ? .45 : 0;   // 바로잡을 때도 합이 위험선을 넘지 않게 (욕심낼 때만 넘을 수 있다)
  g.b += (tgt - g.b) * Math.min(1, dt * 2.4); return g.b;
}
function hostStep(g, dt){
  const a0 = g.seat ? g.b : g.a, a1 = g.seat ? g.a : g.b;
  if (g.st === 0) { if (g.cpu || (g.R && g.R.sb[2] === 0)) { reset(g); g.st = 1; g.round = (g.round + 1) % 100; } return; }
  if (g.st === 1) { g.t += dt; if (g.t >= RULE.CNT) { g.st = 2; sfx(520, 780, .12); flash('당겨!'); } return; }
  if (g.st !== 2) return;
  if ((g.nzT -= dt) < 0) { g.nzT = .6 + Math.random() * .7; g.nzK = Math.random() * 2 - 1; }     // 저절로 흔들리는 방향 (가끔 바뀐다)
  g.nz += (g.nzK - g.nz) * Math.min(1, dt * 2);
  const F = a0 + a1;
  if (F > RULE.T) { const dp = RULE.K * (F - RULE.T) * dt; g.p = Math.min(1, g.p + dp); g.x += (RULE.C * (a1 - a0) + RULE.WOB * g.nz) * dp * 2.2; rec(g); }
  g.dT = F > RULE.D ? g.dT + dt : Math.max(0, g.dT - dt * 2);
  if (Math.abs(g.x) >= 1 || g.dT > RULE.DANGER) { g.x = Math.abs(g.x) >= 1 ? Math.sign(g.x) : (a1 > a0 ? 1 : -1); g.st = 4; broke(g); }
  else if (g.p >= 1) { g.st = 3; g.sx = meanX(g); g.pct = evenPct(g.sx); split(g); }
}
function follow(g, R){
  const hs = R.sb[2];
  if (hs === 1 || hs === 2) { if (!g.live) reset(g); g.live = true; }
  if (!g.live || g.st >= 3) return;
  if (hs === 2 && g.st === 1) { sfx(520, 780, .12); flash('당겨!'); }
  g.st = hs; if (hs !== 3) { g.p = R.sb[3] / 1000; g.x = R.sb[4] / 1000; } if (hs === 2) rec(g);
  if (hs === 3) { g.pct = R.sb[5]; g.sx = R.sb[4] / 1000; g.p = 1; split(g); } else if (hs === 4) broke(g);
}
function split(g){ sfx(660, 990, .25, 'triangle'); flash(g.pct >= RULE.PERFECT ? '완벽한 반반!' : '쩍! 갈라졌다'); after(1500, end); }
function broke(g){ sfx(900, 110, .2, 'square', .06); flash('뚝!'); puff(TWIN.x, gy + HELD + .4, TWIN.z, 8); after(1500, end); }
function end(){
  const g = S.game; if (S.mode !== 'twinbar' || !g || g.ended) return; g.ended = true;
  const seat = g.seat, who = g.oppName, again = () => twin.start(seat);
  if (g.st === 3) {
    let best = g.pct; try { best = Math.max(best, +localStorage.getItem('wt.twinBest') || 0); localStorage.setItem('wt.twinBest', best); } catch (e) {}
    const sh = shapeOf(g.pct, g.sx);
    stopActivity(); me.it = [itemOf(seat, sh), 3, 0];
    hud.result('', g.pct + '%', '내가 가져간 부분', again, resultImg(seat, sh));   // (2026-11-25 3차) 결과는 정확도 · 그림 · 한 줄만
    sfx(520, 880, .35, 'triangle');
  } else {
    const mine = (g.x > 0 ? 1 : 0) === seat; stopActivity();
    hud.result('', '뚝!', mine ? '내 쪽으로 너무 세게 당겼다… 힘을 맞춰 봐요' : who + ' 쪽으로 쏠려서 끊겼다…', again);
  }
}
// 사람 자세: 막대 쪽으로 두 팔을 뻗고, 힘만큼 뒤로 젖힌다
function pose(ch, f){
  const u = ch.userData; ch.rotation.order = 'YXZ'; ch.rotation.x = -.06 - f * .24;
  u.armL.rotation.x = u.armR.rotation.x = -1.42 + f * .2; u.armL.rotation.z = .62; u.armR.rotation.z = -.62; u.legL.rotation.x = .22 * f; u.legR.rotation.x = -.18 * f;
}

const twin = defineActivity({
  id:'twinbar', st:ST.TWIN, hideLabels:true,
  setup(){
    gy = W.groundY(TWIN.x, TWIN.z);
    const mat = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), M(0x9cc0e6)); mat.rotation.x = -PI / 2; mat.position.set(TWIN.x, gy + .03, TWIN.z); mat.receiveShadow = true;
    mat.material.polygonOffset = true; mat.material.polygonOffsetFactor = -2; mat.material.polygonOffsetUnits = -4; root.add(mat);
    W.place('twinbarCooler', {x:TWIN.x + 1.5, z:TWIN.z - 1.5, rot:-.3});
    spotLabel('나눠바 나누기', TWIN.x, gy + 3.3, TWIN.z); W.mmCircle(TWIN.x, TWIN.z, 2.6, '#9cc0e6');
    makeBar();
    addEventListener('keydown', e => { if (e.code === 'KeyE' || e.code === 'Space') eHeld = true; });
    addEventListener('keyup', e => { if (e.code === 'KeyE' || e.code === 'Space') eHeld = false; });
    addEventListener('blur', () => { eHeld = false; });
  },
  offer(offer){
    const d = Math.hypot(me.x - TWIN.x, me.z - TWIN.z); if (d > 4.5) return;
    const at = s => [...S.remotes.values()].find(R => R.st === ST.TWIN && R.sb && R.sb[0] === s);
    if ([0, 1].some(s => at(s) && at(s).sb[6])) return;                                              // 누가 동네 형이랑 하는 중
    const free = [0, 1].filter(s => !at(s)).sort((p, q) => { const a = spot(p), b = spot(q); return Math.hypot(me.x - a.x, me.z - a.z) - Math.hypot(me.x - b.x, me.z - b.z); });
    if (free.length) offer(d, 4.5, at(1 - free[0]) ? '나눠바 나누기 (상대가 기다려요)' : '나눠바 나누기', () => twin.start(free[0]));
  },
  start(seat){
    const p = spot(seat);
    begin(twin, {seat, cpu:false, R:null, host:false, waiting:true, st:0, sx:0, oppShort:'상대', a:0, b:0, aS:0, ptr:null, round:0, live:false, greed:0, cgT:3, oppName:'', path:[], p:0, x:0, dT:0, t:0, pct:0, nz:0, nzT:0, nzK:0, ended:false});
    me.x = p.x; me.z = p.z; me.r = face(seat); publish(); hud.showGame('나눠바 나누기'); panel(true);
    if (!meTag) { meTag = pillSprite('나', 'rgba(242,181,68,.95)', '#1a1b1d', .3); meTag.position.y = 2.45; } if (me.char) me.char.add(meTag);
    const R = findPartner(seat); if (R) setPartner(S.game, R);
  },
  camera(want, look){ want.set(TWIN.x, gy + 3.7, TWIN.z + 5.0); look.set(TWIN.x, gy - .35, TWIN.z); return true; },   // 아래 판에 가리지 않게 사람 · 막대가 화면 위쪽에 오도록
  update(){ const g = S.game, p = spot(g.seat); me.x = p.x; me.z = p.z; me.r = face(g.seat); return 0; },
  onAction(){ const g = S.game; if (g && g.waiting) setPartner(g, null); },   // 기다리는 중 E: 동네 형 부르기 (게임 중 E는 누르고 있기 = 당기기)
  prompt(){ return null; },   // (2026-11-25 3차) '동네 형이랑 하기'는 판 위 버튼(또는 E)
  quit(){ me.sb = IDLE.slice(); panel(false); if (hyung) hyung.visible = false; if (meTag && meTag.parent) meTag.parent.remove(meTag); },
  frame(dt, now){
    const g = S.game;
    if (S.mode === 'twinbar' && g) {
      const pull = g.ptr === null && (eHeld || S.keys.up) && !g.waiting;
      g.a = g.ptr !== null ? g.ptr : clamp(g.a + (pull ? RULE.UP : -RULE.DOWN) * dt, 0, 1);
      if (g.st >= 3) g.a = Math.max(0, g.a - dt);
      if (g.waiting) { const R = findPartner(g.seat); if (R) setPartner(g, R); }
      else if (!g.cpu) { const R = findPartner(g.seat); g.lost = R ? 0 : (g.lost || 0) + dt;   // 잠깐 안 보이는 것은 1.5초까지 기다린다
        if (g.lost > 1.5 && g.st < 3) { flash('상대가 떠났어요'); stopActivity(); return; } if (R) { g.R = R; g.b = R.sb[1] / 100; } }
      else cpuStep(g, dt);
      if (!g.waiting && !g.lost) { if (g.host) hostStep(g, dt); else follow(g, g.R); }
      publish();
      if (me.char) pose(me.char, g.a);
      if (hyung) hyung.visible = g.cpu; if (g.cpu) { const q = spot(1 - g.seat); hyung.position.set(q.x, W.groundY(q.x, q.z), q.z); hyung.rotation.set(0, face(1 - g.seat), 0); pose(hyung, g.b); }
      if (g.st >= 1) showBar(g.p, g.x, g.st, g.st === 3 ? shapeOf(g.pct, g.sx) : null); else bar.g.visible = false;
      drawBar(g); drawSum(g); drawKnob(g); const [m, col] = message(g); if (P.key !== m + col) { P.key = m + col; P.msg.textContent = m; P.msg.style.color = col; }
      const st = status(g); if (P.stKey !== st + g.waiting) { P.stKey = st + g.waiting; P.st.textContent = st; P.cpu.hidden = !g.waiting; P.st.parentElement.style.display = st ? 'flex' : 'none'; }
      return;
    }
    // 남이 하는 것도 보이게: 금을 계산하는 사람(서쪽 또는 동네 형과 하는 사람)의 상태로 막대를 그린다
    let H = null; S.remotes.forEach(R => { if (R.st === ST.TWIN && R.sb && R.sb[0] !== 9 && (R.sb[6] || R.sb[0] === 0) && R.sb[2] >= 1) H = R; });
    if (H) showBar(H.sb[3] / 1000, H.sb[4] / 1000, H.sb[2], shapeOf(H.sb[5], H.sb[4])); else bar.g.visible = false;
  },
  remote(R, p){ R.sb = p.sb; },
  remoteFrame(R){ if (R.st === ST.TWIN && R.char && R.sb) pose(R.char, R.sb[1] / 100); },
});
