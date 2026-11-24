// 세로 돌출 간판 · 옥상 간판 · 현수막 · 단지 게시판 · 포스터. 모든 상호 · 전화번호는 지어낸 것이다.
import { F, FALL, rng, setFont, fit, outlined, rrect, star, grime, rust, ICON } from './fasciaSigns.js';

const P2 = Math.PI * 2;
const center = g => { g.textAlign = 'center'; g.textBaseline = 'middle'; };

// ═════════ 1. 간판 아틀라스 (1024 × 1024): 세로 간판 8칸 128 × 512 (y 0), 옥상 간판 1024 × 244 (y 528) ═════════
export const VCELL = [128, 512], ROOF = {x:0, y:528, w:1024, h:244};
const VICON = {
  piano(g, W, y){ g.fillStyle = '#fff'; g.fillRect(14, y, W - 28, 46); g.fillStyle = '#111'; for (let i = 1; i < 7; i++) if (i !== 3) g.fillRect(14 + i * (W - 28) / 7 - 5, y, 10, 28); g.strokeStyle = '#111'; g.lineWidth = 1.5; for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(14 + i * (W - 28) / 7, y + 28); g.lineTo(14 + i * (W - 28) / 7, y + 46); g.stroke(); } },
  pill(g, W, y){ g.fillStyle = '#1f8a52'; g.beginPath(); g.arc(W / 2, y + 30, 30, 0, P2); g.fill(); g.fillStyle = '#fff'; center(g); setFont(g, '', 36, F.bhs); g.fillText('약', W / 2, y + 32); },
  tooth(g, W, y){ g.fillStyle = '#fff'; g.beginPath(); const x = W / 2; g.moveTo(x - 26, y + 10); g.quadraticCurveTo(x, y - 4, x + 26, y + 10); g.quadraticCurveTo(x + 32, y + 36, x + 18, y + 58); g.lineTo(x + 8, y + 40); g.lineTo(x - 8, y + 40); g.lineTo(x - 18, y + 58); g.quadraticCurveTo(x - 32, y + 36, x - 26, y + 10); g.fill(); },
  balls(g, W, y){ [[W / 2 - 20, '#e53935'], [W / 2 + 20, '#f6f3e8']].forEach(([x, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x, y + 28, 22, 0, P2); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - 7, y + 20, 6, 0, P2); g.fill(); }); },
  glasses(g, W, y){ g.strokeStyle = '#1d4f9c'; g.lineWidth = 6; [-1, 1].forEach(s => { g.beginPath(); g.arc(W / 2 + s * 26, y + 28, 20, 0, P2); g.stroke(); }); g.beginPath(); g.moveTo(W / 2 - 6, y + 24); g.quadraticCurveTo(W / 2, y + 18, W / 2 + 6, y + 24); g.stroke(); },
  moon(g, W, y){ g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(W / 2, y + 28, 24, 0, P2); g.fill(); g.fillStyle = '#3c3a6e'; g.beginPath(); g.arc(W / 2 + 12, y + 20, 22, 0, P2); g.fill(); },
};
// 앞 5개는 기존 VERT 순서(v 0~4)를 따른다
export const VSIGNS = [
  {n:'은하피아노', font:'Song Myung', bg:'#27496d', fg:'#fff', fam:F.song, top:['음악학원', '#fff', '#27496d'], icon:'piano', iconAt:'bottom'},
  {n:'으뜸태권도', font:'Black Han Sans', bg:'#d83a2e', fg:'#fff8e0', fam:F.bhs, top:['체육관', '#ffd84a', '#7a1a12'], bottom:['☎000-0000', '#7a1a12', '#fff']},
  {n:'새봄약국', font:'Nanum Gothic 800', bg:'#f7f8f4', fg:'#1f8a52', fam:F.ng, w:800, icon:'pill', bottom:['처방조제', '#1f8a52', '#fff'], border:'#1f8a52'},
  {n:'속셈학원', font:'Jua', bg:'#f2b632', fg:'#5a2a12', fam:F.jua, top:['수학 · 영어', '#5a2a12', '#ffe9a8'], bottom:['초 · 중등', '#fff', '#5a2a12'], stroke:'#fff'},
  {n:'동화치과', font:'Do Hyeon', bg:'#3f8a97', fg:'#fff', fam:F.dohyeon, icon:'tooth', bottom:['임플란트', '#fff', '#2c6670']},
  {n:'왕별당구장', font:'Black Han Sans', bg:'#1d6b45', fg:'#ffe23a', fam:F.bhs, icon:'balls', bottom:['2층', '#ffe23a', '#0f3d27'], stroke:'#0f3d27'},
  {n:'밝은안경', font:'Gugi', bg:'#fbfbf8', fg:'#1d4f9c', fam:F.gugi, icon:'glasses', bottom:['시력검사', '#1d4f9c', '#fff'], border:'#1d4f9c'},
  {n:'꿈나무독서실', font:'Yeon Sung', bg:'#3c3a6e', fg:'#fff', fam:F.yeon, icon:'moon', top:null, bottom:['24시 · 1인석', '#ffd84a', '#24234a']},
];
export function drawVertical(g, i, x0, y0){
  const s = VSIGNS[i], [W, H] = VCELL; g.save(); g.beginPath(); g.rect(x0, y0, W, H); g.clip(); g.translate(x0, y0);
  g.fillStyle = s.bg; g.fillRect(0, 0, W, H); if (s.border) { g.strokeStyle = s.border; g.lineWidth = 6; g.strokeRect(8, 8, W - 16, H - 16); }
  let a = 16, b = H - 16;
  const box = ([t, bg, fg], y, h) => { g.fillStyle = bg; rrect(g, 14, y, W - 28, h, 6); g.fill(); g.fillStyle = fg; center(g); fit(g, t, 800, 22, F.ng, W - 40); g.fillText(t, W / 2, y + h / 2 + 1); };
  if (s.top) { box(s.top, a, 40); a += 50; }
  if (s.icon && s.iconAt !== 'bottom') { VICON[s.icon](g, W, a + 4); a += 72; }
  if (s.bottom) { box(s.bottom, b - 40, 40); b -= 50; }
  if (s.icon && s.iconAt === 'bottom') { VICON[s.icon](g, W, b - 52); b -= 62; }
  const ch = [...s.n], st = (b - a) / ch.length, fs = Math.min(W * .74, st * .88); setFont(g, s.w || '', fs, s.fam); center(g);
  ch.forEach((c, k) => s.stroke ? outlined(g, c, W / 2, a + st * (k + .5) + 2, s.fg, [[s.stroke, fs * .14]]) : (g.fillStyle = s.fg, g.fillText(c, W / 2, a + st * (k + .5) + 2)));
  grime(g, W, H, 31 + i * 5, .45); g.restore();
}
export function drawRoof(g, x0, y0){
  const {w:W, h:H} = ROOF; g.save(); g.beginPath(); g.rect(x0, y0, W, H); g.clip(); g.translate(x0, y0);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2c5585'); gr.addColorStop(1, '#1d3c63'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#f4f6f7'; g.lineWidth = 6; g.strokeRect(12, 12, W - 24, H - 24); g.fillStyle = '#d8322a'; g.fillRect(12, H - 46, W - 24, 34);
  // (2026-11-24 21차) 글은 '동화상가'만: 층 안내 · 영문 줄을 빼고 눈 결정 표식 + 이름을 가운데로
  fit(g, '동화상가', '', 170, F.bhs, 600); const tw = g.measureText('동화상가').width, gx = (W - (132 + 34 + tw)) / 2, ex = gx + 66, ey = 104;
  g.fillStyle = '#f4f6f7'; g.beginPath(); g.arc(ex, ey, 66, 0, P2); g.fill(); g.strokeStyle = '#2c5585'; g.lineWidth = 9; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, c = Math.cos(a), sn = Math.sin(a); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + c * 46, ey + sn * 46); g.stroke();
    [.55].forEach(t => { const px = ex + c * 46 * t, py = ey + sn * 46 * t; [-1, 1].forEach(k => { const b = a + k * .7; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * 16, py + Math.sin(b) * 16); g.stroke(); }); }); }
  g.textBaseline = 'middle'; g.textAlign = 'left'; outlined(g, '동화상가', gx + 132 + 34, ey + 2, '#f4f6f7', [['#10243d', 12]]);
  grime(g, W, H, 77, .6); g.restore();
}
export function drawBoardAtlas(g){ g.fillStyle = '#777'; g.fillRect(0, 0, 1024, 1024); VSIGNS.forEach((_, i) => drawVertical(g, i, i * 128, 0)); drawRoof(g, ROOF.x, ROOF.y); }

// ═════════ 2. 현수막 (2048 × 1024, 한 장 2048 × 336, y = i × 336) ═════════
const FLAME = (g, x, y, s) => { g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(x, y - s); g.bezierCurveTo(x + s * .9, y - s * .2, x + s * .7, y + s * .7, x, y + s * .7); g.bezierCurveTo(x - s * .7, y + s * .7, x - s * .9, y - s * .1, x, y - s); g.fill();
  g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(x, y - s * .2); g.bezierCurveTo(x + s * .4, y + s * .1, x + s * .35, y + s * .6, x, y + s * .6); g.bezierCurveTo(x - s * .35, y + s * .6, x - s * .4, y + s * .2, x, y - s * .2); g.fill(); };
export const BANNERS = [
  {bg:'#fbfbf8', left:{bg:'#1f3f8f', icon:FLAME, t:['동화설비', '#fff']}, main:[['보일러 ', '#1f3f8f'], ['무상 점검', '#d2342a'], [' · ', '#1f3f8f'], ['콘덴싱 교체 ', '#1f3f8f'], ['특가', '#d2342a']],
    sub:['가스보일러 · 온수기 · 배관 동파 수리', '#22262a'], right:{bg:'#d2342a', a:['☎ 000-0000', '#fff'], b:['24시 긴급 출동', '#ffe14a']}},
  {bg:'#d8372c', left:{bg:'#ffe14a', badge:true, t:['동화마트', '#d8372c']}, main:[['겨울맞이 ', '#ffe14a'], ['초특가 세일!', '#ffffff']], stroke:'#7a1410',
    sub:['귤 · 호빵 · 사골 · 김장 재료', '#ffe9b0'], right:{bg:'#fff', a:['이번 주말까지', '#d8372c'], b:['단지 정문 앞', '#22262a']}},
  {bg:'#f3e3b0', left:{bg:'#27496d', icon:(g, x, y, s) => { g.strokeStyle = '#fff'; g.lineWidth = 7; g.strokeRect(x - s * .7, y - s * .8, s * 1.4, s * 1.5); g.beginPath(); g.moveTo(x, y - s * .8); g.lineTo(x, y + s * .7); g.moveTo(x - s * .7, y); g.lineTo(x + s * .7, y); g.stroke(); }, t:['새봄창호', '#fff']},
    main:[['외풍 차단! ', '#1f3f8f'], ['샷시 수리', '#d2342a'], [' · 틈막이 시공', '#1f3f8f']], sub:['방충망 · 유리 교체 · 단열 필름', '#22262a'], right:{bg:'#2f7a52', a:['☎ 000-0000', '#fff'], b:['무료 견적', '#ffe14a']}},
];
export function drawBanner(g, i, x0, y0, W = 2048, H = 336){
  const b = BANNERS[i], R = rng(9 + i * 13); g.save(); g.beginPath(); g.rect(x0, y0, W, H); g.clip(); g.translate(x0, y0);
  g.fillStyle = b.bg; g.fillRect(0, 0, W, H);
  const LW = 330, RW = 400;
  g.fillStyle = b.left.bg; g.fillRect(0, 0, LW, H); center(g);
  if (b.left.badge) { g.fillStyle = '#d8372c'; star(g, LW / 2, H * .4, 110, 84, 16); g.fill(); g.fillStyle = '#fff'; setFont(g, '', 64, F.bhs); g.fillText('SALE', LW / 2, H * .4 + 2); }
  else b.left.icon(g, LW / 2, H * .38, 64);
  fit(g, b.left.t[0], '', 58, F.dohyeon, LW - 40); g.fillStyle = b.left.t[1]; g.fillText(b.left.t[0], LW / 2, H * .8);
  g.fillStyle = b.right.bg; g.fillRect(W - RW, 0, RW, H); fit(g, b.right.a[0], '', 70, F.dohyeon, RW - 50); g.fillStyle = b.right.a[1]; g.fillText(b.right.a[0], W - RW / 2, H * .38);
  fit(g, b.right.b[0], 800, 42, F.ng, RW - 50); g.fillStyle = b.right.b[1]; g.fillText(b.right.b[0], W - RW / 2, H * .72);
  // 본문: 색이 다른 조각을 이어 붙이고, 폭에 맞춰 가로로만 줄인다
  const mx = LW + 40, mw = W - LW - RW - 80; setFont(g, '', 150, F.bhs); const tw = b.main.reduce((s, [t]) => s + g.measureText(t).width, 0), k = Math.min(1, mw / tw);
  g.save(); g.translate(mx + (mw - tw * k) / 2, H * .42); g.scale(k, 1); g.textAlign = 'left'; let x = 0; b.main.forEach(([t, c]) => { b.stroke ? outlined(g, t, x, 0, c, [[b.stroke, 16]]) : (g.fillStyle = c, g.fillText(t, x, 0)); x += g.measureText(t).width; }); g.restore();
  center(g); fit(g, b.sub[0], 800, 52, F.ng, mw); g.fillStyle = b.sub[1]; g.fillText(b.sub[0], mx + mw / 2, H * .82);
  for (let j = 1; j < 8; j++) { const xx = j * W / 8 + (R() - .5) * 40, gr = g.createLinearGradient(xx - 30, 0, xx + 30, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,.08)'); gr.addColorStop(.52, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(xx - 30, 0, 60, H); }   // 접힌 주름
  [[0, 0], [W, 0], [0, H], [W, H]].forEach(([cx, cy]) => { g.fillStyle = '#e9e6dc'; g.beginPath(); g.arc(cx + (cx ? -18 : 18), cy + (cy ? -18 : 18), 9, 0, P2); g.fill(); g.strokeStyle = '#999'; g.lineWidth = 3; g.stroke(); });   // 끈 구멍
  grime(g, W, H, 50 + i, .7); g.restore();
}
export function drawBannerAtlas(g){ g.fillStyle = '#777'; g.fillRect(0, 0, 2048, 1024); BANNERS.forEach((_, i) => drawBanner(g, i, 0, i * 336)); }

// ═════════ 3. 단지 게시판 (1024 × 484) ═════════
function paper(g, x, y, w, h, bg, rot, draw, pin = '#c8362c'){ g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h); g.fillStyle = bg; g.fillRect(-w / 2, -h / 2, w, h); center(g); draw(g, w, h);
  if (pin === 'tape') { g.fillStyle = 'rgba(240,235,210,.75)'; [-1, 1].forEach(s => { g.save(); g.translate(s * (w / 2 - 6), -h / 2 + 4); g.rotate(s * .7); g.fillRect(-18, -7, 36, 14); g.restore(); }); }
  else { g.fillStyle = pin; g.beginPath(); g.arc(0, -h / 2 + 10, 6, 0, P2); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-2, -h / 2 + 8, 2, 0, P2); g.fill(); }
  g.restore(); }
const T = (g, t, y, fam, size, color, w = '', maxW = 1e9) => { fit(g, t, w, size, fam, maxW); g.fillStyle = color; g.fillText(t, 0, y); };
const rule = (g, w, y0, n, c = '#666') => { g.fillStyle = c; for (let i = 0; i < n; i++) g.fillRect(-w * .38, y0 + i * 12, w * (i === n - 1 ? .45 : .76), 3); };
export function drawNotice(g, W = 1024, H = 484){
  g.fillStyle = '#3d6b5c'; g.fillRect(0, 0, W, H); const R = rng(9); for (let i = 0; i < 1400; i++) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(R() * W, R() * H, 2, 2); }
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(R() * W, R() * H, 10 + R() * 26, 6 + R() * 10); }                          // 뜯기고 남은 종이 조각
  paper(g, 26, 22, 170, 222, '#fbfaf4', -.01, (g, w, h) => { g.fillStyle = '#27496d'; g.fillRect(-w / 2, -h / 2, w, 34); T(g, '공  고', -h / 2 + 18, F.nm, 26, '#fff', 800);
    T(g, '겨울철', -52, F.dohyeon, 30, '#22262a'); T(g, '동파 예방 안내', -18, F.dohyeon, 28, '#d2342a', '', w - 16); rule(g, w, 14, 5); T(g, '동화아파트 관리사무소', 92, F.ng, 15, '#22262a', 800, w - 16); });
  paper(g, 210, 28, 150, 196, '#ffffff', .015, (g, w) => { ['혹한기', '베란다', '세탁기', '사용 금지'].forEach((t, i) => T(g, t, -66 + i * 44, F.bhs, 36, i === 3 ? '#22262a' : '#d2342a', '', w - 14)); }, 'tape');
  paper(g, 22, 262, 186, 206, '#ffffff', .01, (g, w, h) => { T(g, '고양이를 찾습니다', -h / 2 + 26, F.bhs, 24, '#22262a', '', w - 14);
      g.fillStyle = '#e5a14a'; g.beginPath(); g.arc(-40, -22, 28, 0, P2); g.fill(); [-1, 1].forEach(s => { g.beginPath(); g.moveTo(-40 + s * 24, -38); g.lineTo(-40 + s * 18, -62); g.lineTo(-40 + s * 6, -46); g.fill(); });
      g.fillStyle = '#22262a'; [-1, 1].forEach(s => { g.beginPath(); g.arc(-40 + s * 10, -26, 3, 0, P2); g.fill(); }); g.textAlign = 'left'; setFont(g, 700, 18, F.gaegu); ['치즈색', '이름: 호떡', '겁 많아요'].forEach((t, i) => g.fillText(t, 2, -46 + i * 22)); center(g);
      for (let k = 0; k < 7; k++) { if (k === 2 || k === 5) continue; const x = -w / 2 + 8 + k * (w - 16) / 7; g.strokeStyle = '#bbb'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, 30); g.lineTo(x, h / 2); g.stroke(); g.setLineDash([]);
        g.save(); g.translate(x + (w - 16) / 14, 66); g.rotate(-Math.PI / 2); setFont(g, 800, 11, F.ng); g.fillStyle = '#22262a'; g.fillText('000-0000', 0, 0); g.restore(); } });
  paper(g, 224, 244, 142, 224, '#f6e3b4', -.02, (g, w) => { T(g, '피아노 · 태권도', -86, F.dohyeon, 20, '#2b3f6b', '', w - 12); T(g, '겨울방학', -46, F.jua, 36, '#d2342a'); T(g, '특강 모집', -8, F.jua, 32, '#2b3f6b'); rule(g, w, 22, 4, '#7a6a4a'); T(g, '동화상가 2층', 92, F.ng, 16, '#2b3f6b', 800); });
  paper(g, 384, 30, 140, 206, '#f7d23c', .012, (g, w) => { T(g, '신속배달', -76, F.dohyeon, 28, '#22262a'); T(g, '중국집', -44, F.dohyeon, 28, '#22262a'); T(g, '겨울 특선', -6, F.ng, 18, '#22262a', 800); T(g, '굴짬뽕', 30, F.bhs, 38, '#d2342a'); T(g, '개시!', 72, F.bhs, 38, '#d2342a'); });
  paper(g, 384, 254, 160, 210, '#eef6ea', -.012, (g, w) => { T(g, '부녀회', -78, F.ng, 18, '#2f7a52', 800); T(g, '김장 나눔', -40, F.yeon, 40, '#2f7a52'); T(g, '행사', 0, F.yeon, 40, '#2f7a52');
      g.fillStyle = '#d2342a'; g.beginPath(); g.ellipse(0, 46, 26, 16, 0, 0, P2); g.fill(); g.fillStyle = '#6fa84a'; g.beginPath(); g.ellipse(0, 34, 18, 9, 0, 0, P2); g.fill(); T(g, '토요일 · 놀이터 앞', 86, F.ng, 15, '#22262a', 800, w - 12); });
  paper(g, 560, 26, 140, 176, '#ffffff', -.015, (g, w) => { T(g, '크린세탁소', -56, F.dohyeon, 26, '#2b3f6b'); T(g, '패딩 · 코트', -16, F.bhs, 26, '#d2342a'); T(g, '30% 할인', 22, F.bhs, 32, '#d2342a'); rule(g, w, 52, 2); });
  paper(g, 562, 220, 156, 246, '#f7d23c', .02, (g, w) => { T(g, '헌 옷 · 헌 책', -82, F.bhs, 30, '#22262a'); T(g, '방문 수거', -44, F.bhs, 30, '#22262a'); rule(g, w, -6, 6, '#6b5a12'); T(g, '단지 정문 앞', 98, F.ng, 17, '#22262a', 800); }, 'tape');
  paper(g, 732, 24, 128, 160, '#fbfaf4', .01, (g, w) => { T(g, '제설 봉사', -42, F.gugi, 26, '#22262a', '', w - 12); T(g, '함께해요', -6, F.gugi, 26, '#2f7a52'); rule(g, w, 26, 4); });
  paper(g, 736, 198, 124, 118, '#e9f0f7', -.03, () => { T(g, '분리수거', -18, F.bhs, 26, '#2b3f6b'); T(g, '화 · 금', 18, F.bhs, 28, '#2b3f6b'); }, 'tape');
  paper(g, 876, 28, 124, 290, '#ffffff', .008, (g, w, h) => { g.fillStyle = '#d2342a'; g.fillRect(-w / 2, -h / 2, w, 40); T(g, '안 내', -h / 2 + 21, F.nm, 24, '#fff', 800);
      T(g, '택배', -70, F.dohyeon, 32, '#22262a'); T(g, '보관함', -34, F.dohyeon, 32, '#22262a'); T(g, '이용 안내', 0, F.dohyeon, 22, '#d2342a'); rule(g, w, 28, 8); });
  paper(g, 732, 336, 270, 128, '#ffffff', -.006, (g, w, h) => { g.fillStyle = '#27496d'; g.fillRect(-w / 2, -h / 2, w, 32); T(g, '승강기 정기 점검', -h / 2 + 17, F.ng, 20, '#fff', 800);
      T(g, '12월 3일 (수)  10:00 ~ 12:00', -2, F.ng, 20, '#22262a', 800, w - 20); T(g, '점검 중에는 계단을 이용해 주세요', 34, F.ng, 15, '#555', 700, w - 20); });
  grime(g, W, H, 4, .5);
}

// ═════════ 4. 포스터 ═════════
// 4-1. 마트 창 포스터: 2048 × 488 (512 × 488 네 장). 창 한 쪽이 8.2m × 1.95m라 비율 4.2 : 1
export function drawMartPosters(g){
  const W = 512, H = 488, at = (i, f) => { g.save(); g.translate(i * W, 0); g.beginPath(); g.rect(0, 0, W, H); g.clip(); f(); grime(g, W, H, 60 + i, .35); g.restore(); };
  at(0, () => { g.fillStyle = '#d8322a'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffe14a'; star(g, W / 2, 196, 176, 140, 20); g.fill(); center(g); setFont(g, '', 170, F.bhs); outlined(g, '1+1', W / 2, 200, '#d8322a', [['#fff', 14]]);
    setFont(g, '', 60, F.dohyeon); g.fillStyle = '#fff'; g.fillText('과자 · 음료', W / 2, 410); setFont(g, 800, 30, F.ng); g.fillText('행사 상품 한정', W / 2, 458); });
  at(1, () => { g.fillStyle = '#fffdf4'; g.fillRect(0, 0, W, H); g.fillStyle = '#d8322a'; g.fillRect(0, 0, W, 96); center(g); setFont(g, '', 68, F.bhs); g.fillStyle = '#fff'; g.fillText('오늘의 특가', W / 2, 50);
    [[170, 196], [250, 176], [330, 200], [210, 250], [290, 252]].forEach(([x, y]) => { g.fillStyle = '#f5901e'; g.beginPath(); g.arc(x, y, 46, 0, P2); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - 14, y - 14, 12, 0, P2); g.fill(); g.fillStyle = '#3f8a3c'; g.beginPath(); g.ellipse(x + 6, y - 44, 12, 6, .5, 0, P2); g.fill(); });
    setFont(g, '', 56, F.dohyeon); g.fillStyle = '#22262a'; g.fillText('귤 한 박스', W / 2, 342); g.fillStyle = '#d8322a'; setFont(g, '', 96, F.bhs); g.fillText('5,900원', W / 2, 424); });
  at(2, () => { g.fillStyle = '#1f4d36'; g.fillRect(0, 0, W, H); g.strokeStyle = '#e9d9a6'; g.lineWidth = 6; g.strokeRect(20, 20, W - 40, H - 40); center(g);
    setFont(g, '', 92, F.song); g.fillStyle = '#e9d9a6'; g.fillText('신선 정육', W / 2, 110); g.fillStyle = '#c9485b'; rrect(g, 120, 170, 272, 120, 30); g.fill(); g.fillStyle = '#f3e6dc'; for (let k = 0; k < 3; k++) g.fillRect(130, 196 + k * 34, 252, 10);
    setFont(g, 800, 34, F.ng); g.fillStyle = '#fff'; g.fillText('국내산 삼겹살 100g', W / 2, 346); setFont(g, '', 84, F.bhs); g.fillStyle = '#ffe14a'; g.fillText('1,180원', W / 2, 420); });
  at(3, () => { g.fillStyle = '#1e6fc4'; g.fillRect(0, 0, W, H); center(g); setFont(g, '', 104, F.jua); outlined(g, '무료 배달', W / 2, 100, '#fff', [['#0d3a6e', 12]]);
    g.save(); g.translate(W / 2, 250); g.fillStyle = '#ffe14a'; rrect(g, -110, -40, 150, 60, 20); g.fill(); g.fillStyle = '#fff'; g.fillRect(40, -70, 50, 80); g.fillStyle = '#22262a'; [[-80, 34], [70, 34]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 30, 0, P2); g.fill(); g.fillStyle = '#ccc'; g.beginPath(); g.arc(x, y, 12, 0, P2); g.fill(); g.fillStyle = '#22262a'; }); g.restore();
    setFont(g, '', 60, F.dohyeon); g.fillStyle = '#ffe14a'; g.fillText('2만원 이상', W / 2, 380); setFont(g, 800, 32, F.ng); g.fillStyle = '#fff'; g.fillText('단지 안 어디든 30분', W / 2, 438); });
}
// 4-2. 고깃집 음식 사진 띠: 2048 × 156 (256 × 156 여덟 칸). 실제 8.55m × 0.65m
export function drawMeatStrip(g){
  const W = 256, H = 156, items = [['생갈비', '9,000', 'galbi'], ['양념갈비', '7,000', 'yang'], ['삼겹살', '6,000', 'pork'], ['목살', '6,000', 'neck'], ['항정살', '8,000', 'pork2'], ['된장찌개', '4,000', 'stew'], ['물냉면', '4,000', 'noodle'], ['점심특선', '4,500', 'lunch']];
  g.fillStyle = '#2a1d17'; g.fillRect(0, 0, W * 8, H);
  items.forEach(([n, p, k], i) => { const x = i * W, R = rng(70 + i); g.save(); g.translate(x, 0);
    g.fillStyle = '#efe6d8'; g.fillRect(8, 8, W - 16, H - 16); const bg = g.createRadialGradient(W / 2, 62, 10, W / 2, 62, 120); bg.addColorStop(0, '#5a4636'); bg.addColorStop(1, '#2b211a'); g.fillStyle = bg; g.fillRect(14, 14, W - 28, 100);
    const cx = W / 2, cy = 64;
    if (k === 'stew') { g.fillStyle = '#3b2a20'; g.beginPath(); g.ellipse(cx, cy + 6, 70, 40, 0, 0, P2); g.fill(); g.fillStyle = '#b5652a'; g.beginPath(); g.ellipse(cx, cy, 60, 30, 0, 0, P2); g.fill(); g.fillStyle = '#f3ead6'; for (let j = 0; j < 5; j++) g.fillRect(cx - 40 + j * 16, cy - 8 + (j % 2) * 10, 12, 12); g.fillStyle = '#4c8a3c'; g.fillRect(cx + 10, cy - 18, 26, 4); }
    else if (k === 'noodle') { g.fillStyle = '#c9ced3'; g.beginPath(); g.ellipse(cx, cy + 4, 72, 40, 0, 0, P2); g.fill(); g.fillStyle = '#cdb98e'; g.beginPath(); g.ellipse(cx, cy, 62, 32, 0, 0, P2); g.fill(); g.strokeStyle = '#efe4c8'; g.lineWidth = 2; for (let j = 0; j < 14; j++) { g.beginPath(); g.ellipse(cx, cy, 10 + j * 3.5, 6 + j * 1.6, R(), 0, 4); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx - 10, cy - 10, 16, 11, 0, 0, P2); g.fill(); g.fillStyle = '#f5b21e'; g.beginPath(); g.arc(cx - 10, cy - 10, 7, 0, P2); g.fill(); g.fillStyle = '#6fa84a'; g.fillRect(cx + 12, cy - 6, 30, 5); }
    else if (k === 'lunch') { g.fillStyle = '#8a6a4a'; g.fillRect(cx - 82, cy - 40, 164, 84); [[-50, -14, '#f4f1e6'], [0, -14, '#b5652a'], [50, -14, '#c9485b'], [-50, 22, '#6fa84a'], [0, 22, '#e0902c'], [50, 22, '#d8322a']].forEach(([dx, dy, c]) => { g.fillStyle = '#e8e2d4'; g.beginPath(); g.arc(cx + dx, cy + dy, 19, 0, P2); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(cx + dx, cy + dy, 14, 0, P2); g.fill(); }); }
    else { g.fillStyle = '#1e1e1e'; g.beginPath(); g.ellipse(cx, cy + 4, 80, 42, 0, 0, P2); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 2; for (let j = -3; j <= 3; j++) { g.beginPath(); g.moveTo(cx + j * 20 - 30, cy - 30); g.lineTo(cx + j * 20 + 30, cy + 36); g.stroke(); }
      const col = {galbi:['#9b3b2e', '#f0d9c8'], yang:['#7a3418', '#c9773a'], pork:['#e7a598', '#fbeee6'], neck:['#c9705f', '#f4d9cc'], pork2:['#e9b3a6', '#fff3ec']}[k];
      for (let j = 0; j < 5; j++) { const px = cx - 48 + j * 24, py = cy - 6 + (j % 2) * 14; g.save(); g.translate(px, py); g.rotate(-.4 + R() * .3); g.fillStyle = col[0]; rrect(g, -18, -11, 36, 22, 6); g.fill(); g.fillStyle = col[1]; g.fillRect(-16, -2, 32, 4); g.fillStyle = 'rgba(40,20,10,.5)'; g.fillRect(-12, -9, 3, 18); g.fillRect(4, -9, 3, 18); g.restore(); }
      if (k === 'galbi' || k === 'yang') { g.fillStyle = '#efe6d2'; g.fillRect(cx + 40, cy - 20, 10, 40); }
      g.fillStyle = '#4c8a3c'; g.beginPath(); g.ellipse(cx + 58, cy + 18, 16, 9, .3, 0, P2); g.fill(); }
    g.fillStyle = '#2a1d17'; g.fillRect(14, 116, W - 28, 32); g.textBaseline = 'middle'; g.textAlign = 'left'; setFont(g, '', 22, F.dohyeon); g.fillStyle = '#f4e3c3'; g.fillText(n, 22, 133);
    g.textAlign = 'right'; setFont(g, 800, 18, F.ng); g.fillStyle = '#ffb74d'; g.fillText(p + '원', W - 22, 133); g.restore(); });
  grime(g, W * 8, H, 5, .3);
}
// 4-3. 문방구 포스터: 옆벽 512 × 352 (1.6m × 1.1m), 앞 창 양쪽 세로 띠 160 × 560 (0.4m × 1.4m)
export function drawStationeryWide(g){ const W = 512, H = 352; g.fillStyle = '#2f6fb5'; g.fillRect(0, 0, W, H); center(g);
  setFont(g, '', 92, F.jua); outlined(g, '신학기', W / 2, 86, '#ffe14a', [['#173d6b', 12]]); setFont(g, '', 58, F.dohyeon); g.fillStyle = '#fff'; g.fillText('학용품 할인', W / 2, 178);
  [['#e53935', -150], ['#43a047', -50], ['#f9a825', 50], ['#8e24aa', 150]].forEach(([c, dx]) => { g.save(); g.translate(W / 2 + dx, 268); g.rotate(-.5); g.fillStyle = c; g.fillRect(-60, -10, 100, 20); g.fillStyle = '#f2d7a8'; g.beginPath(); g.moveTo(40, -10); g.lineTo(64, 0); g.lineTo(40, 10); g.fill(); g.fillStyle = '#333'; g.beginPath(); g.moveTo(56, -3); g.lineTo(64, 0); g.lineTo(56, 3); g.fill(); g.fillStyle = '#f4a6b8'; g.fillRect(-72, -10, 12, 20); g.restore(); });
  setFont(g, 800, 26, F.ng); g.fillStyle = '#cfe2f5'; g.fillText('공책 · 필통 · 크레파스 · 실내화', W / 2, 326); grime(g, W, H, 81, .35); }
export function drawStationeryTall(g, k){ const W = 160, H = 560, s = k ? {bg:'#3f8a5a', fg:'#fff', t:'딱지구슬팽이', top:'있어요', fam:F.gugi} : {bg:'#f2b632', fg:'#d2342a', t:'뽑기', top:'새 상품 입고', fam:F.bhs};
  g.fillStyle = s.bg; g.fillRect(0, 0, W, H); center(g); g.fillStyle = 'rgba(255,255,255,.9)'; rrect(g, 12, 14, W - 24, 56, 10); g.fill(); fit(g, s.top, 800, 26, F.ng, W - 40); g.fillStyle = '#22262a'; g.fillText(s.top, W / 2, 43);
  const ch = [...s.t], top = 84, bot = k ? H - 20 : H - 170, st = (bot - top) / ch.length, fs = Math.min(120, st * .86); setFont(g, '', fs, s.fam);
  ch.forEach((c, j) => outlined(g, c, W / 2, top + st * (j + .5), s.fg, [[k ? '#1d4a30' : '#fff', fs * .12]]));
  if (!k) [['#e53935', 50, 440], ['#1e88e5', 110, 452], ['#43a047', 80, 500]].forEach(([c, x, y]) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, 30, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(x, y, 30, 0, Math.PI); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 30, 0, P2); g.stroke(); });
  grime(g, W, H, 90 + k, .35); }
