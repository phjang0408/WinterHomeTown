// 가로 간판 아틀라스 (2048 × 1024, 한 칸 1024 × 180, 2열 × 5행 = 10칸)
// 칸 i 위치: x = (i % 2) * 1024, y = floor(i / 2) * 180  (아래 124px는 비워 둔다)
// 간판마다 글꼴이 다르다. 모든 상호는 지어낸 이름이다.
export const CELL_W = 1024, CELL_H = 180, ATLAS_W = 2048, ATLAS_H = 1024;
export const cellRect = i => [(i % 2) * CELL_W, Math.floor(i / 2) * CELL_H, CELL_W, CELL_H];

export const F = {
  bhs:'"Black Han Sans"', dohyeon:'"Do Hyeon"', jua:'"Jua"', gugi:'"Gugi"', yeon:'"Yeon Sung"', song:'"Song Myung"',
  gaegu:'"Gaegu"', sun:'"Sunflower"', ng:'"Nanum Gothic"', nm:'"Nanum Myeongjo"', ga1:'"Gothic A1"',
};
export const FALL = ',"Nanum Gothic","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

export function rng(seed){ let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
export function setFont(g, weight, size, fam){ g.font = (weight ? weight + ' ' : '') + size + 'px ' + fam + FALL; }
// 최대 크기에서 시작해 폭에 맞을 때까지 줄인다
export function fit(g, text, weight, size, fam, maxW){ setFont(g, weight, size, fam); let w = g.measureText(text).width;
  if (w > maxW) { size = Math.floor(size * maxW / w); setFont(g, weight, size, fam); w = g.measureText(text).width; } return {size, w}; }
export function outlined(g, text, x, y, fill, strokes){ g.lineJoin = 'round'; strokes.forEach(([c, lw]) => { g.strokeStyle = c; g.lineWidth = lw; g.strokeText(text, x, y); }); g.fillStyle = fill; g.fillText(text, x, y); }
export function rrect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function star(g, cx, cy, R, r, n = 5){ g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, d = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } g.closePath(); }

// 때 · 빗물 자국 · 아래쪽 먼지. amt 0~1
export function grime(g, W, H, seed, amt){ const R = rng(seed);
  const gr = g.createLinearGradient(0, H * .55, 0, H); gr.addColorStop(0, 'rgba(70,55,35,0)'); gr.addColorStop(1, 'rgba(70,55,35,' + (.16 * amt) + ')'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40 * amt; i++) { const x = R() * W, w = 2 + R() * 5, h = 20 + R() * H * .7; g.fillStyle = 'rgba(80,65,45,' + (.05 + R() * .07) * amt + ')'; g.fillRect(x, H - h * (R() < .5 ? 1 : .4), w, h); }   // 흘러내린 자국
  for (let i = 0; i < 260 * amt; i++) { g.fillStyle = 'rgba(40,35,30,' + (R() * .12) + ')'; g.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }                                       // 잔 얼룩
}
// 법랑 간판처럼 가장자리에 녹
export function rust(g, W, H, seed){ const R = rng(seed), blot = (x, y, r) => { const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(120,58,22,.95)'); gr.addColorStop(.55, 'rgba(150,80,35,.6)'); gr.addColorStop(1, 'rgba(150,80,35,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const C = [[0, 0], [W, 0], [0, H], [W, H], [W * .3, H], [W * .62, H], [W * .85, 0], [W, H * .5]];                           // 모서리 · 아래 가장자리에 뭉친다
  C.forEach(([cx, cy]) => { const n = 10 + Math.floor(R() * 14), sp = 20 + R() * 50; for (let k = 0; k < n; k++) blot(cx + (R() - .5) * sp * 2, cy + (R() - .5) * sp * .8, 3 + R() * 14); });
  for (let i = 0; i < 26; i++) blot(R() * W, H - R() * 6, 2 + R() * 6);                                                         // 아래 끝선의 잔녹
  for (let i = 0; i < 3; i++) blot(R() * W, R() * H, 2 + R() * 4);
}

// ───────── 아이콘 ─────────
export const ICON = {
  basket(g, x, y, s, c){ g.strokeStyle = c; g.lineWidth = s * .09; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - s * .5, y - s * .15); g.lineTo(x - s * .38, y + s * .42); g.lineTo(x + s * .38, y + s * .42); g.lineTo(x + s * .5, y - s * .15); g.closePath(); g.stroke();
    g.beginPath(); g.arc(x, y - s * .15, s * .32, Math.PI, 0); g.stroke(); [-.18, 0, .18].forEach(d => { g.beginPath(); g.moveTo(x + d * s, y - s * .05); g.lineTo(x + d * s * .85, y + s * .32); g.stroke(); }); },
  sparrow(g, x, y, s){ g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(x, y + s * .08, s * .42, s * .3, -.25, 0, 7); g.fill(); g.beginPath(); g.moveTo(x + s * .25, y + s * .1); g.lineTo(x + s * .62, y + s * .3); g.lineTo(x + s * .55, y - s * .02); g.fill();
    g.fillStyle = '#f2e2c4'; g.beginPath(); g.ellipse(x - s * .12, y + s * .2, s * .22, s * .14, -.2, 0, 7); g.fill(); g.fillStyle = '#6b3f22'; g.beginPath(); g.arc(x - s * .3, y - s * .2, s * .22, 0, 7); g.fill();
    g.fillStyle = '#f2b632'; g.beginPath(); g.moveTo(x - s * .5, y - s * .22); g.lineTo(x - s * .64, y - s * .16); g.lineTo(x - s * .5, y - s * .12); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - s * .36, y - s * .24, s * .06, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x - s * .37, y - s * .24, s * .035, 0, 7); g.fill(); },
  rainbow(g, x, y, s){ ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = s * .075; g.beginPath(); g.arc(x, y + s * .3, s * (.55 - i * .075), Math.PI, 0); g.stroke(); });
    g.fillStyle = '#fff'; [[-.42, .32, .16], [-.28, .36, .13], [.42, .32, .16], [.28, .36, .13]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); }); },
  drumstick(g, x, y, s){ g.save(); g.translate(x, y); g.rotate(-.6); g.fillStyle = '#f3ead8'; g.fillRect(-s * .06, s * .1, s * .12, s * .38); [[-1], [1]].forEach(([k]) => { g.beginPath(); g.arc(k * s * .07, s * .5, s * .08, 0, 7); g.fill(); });
    g.fillStyle = '#e0902c'; g.beginPath(); g.ellipse(0, -s * .1, s * .3, s * .36, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,230,150,.55)'; g.beginPath(); g.ellipse(-s * .1, -s * .2, s * .08, s * .14, .3, 0, 7); g.fill(); g.restore(); },
  scissors(g, x, y, s, c){ g.strokeStyle = c; g.fillStyle = c; g.lineWidth = s * .07; [[-1], [1]].forEach(([k]) => { g.beginPath(); g.arc(x - s * .25, y + k * s * .2, s * .14, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(x - s * .13, y + k * s * .14); g.lineTo(x + s * .5, y - k * s * .12); g.lineTo(x + s * .48, y - k * s * .05); g.lineTo(x - s * .1, y + k * s * .2); g.closePath(); g.fill(); }); },
  mic(g, x, y, s){ g.save(); g.translate(x, y); g.rotate(.5); g.fillStyle = '#222'; g.fillRect(-s * .08, 0, s * .16, s * .55); g.fillStyle = '#c9ced3'; g.beginPath(); g.arc(0, -s * .12, s * .22, 0, 7); g.fill();
    g.strokeStyle = '#8a9096'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * s * .08, -s * .32); g.lineTo(i * s * .08, s * .08); g.stroke(); } g.restore(); },
};

// ───────── 간판 10개 ─────────
// 앞 8개는 기존 SHOPS 순서(v 0~7)를 그대로 따른다.
export const SIGNS = [
  {n:'동화마트', font:'Do Hyeon', draw(g, W, H){
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, W, H); g.fillStyle = '#d8322a'; g.fillRect(0, H - 42, W, 42); g.fillStyle = '#1d3f8f'; g.fillRect(0, H - 48, W, 6);
    ICON.basket(g, 92, 62, 92, '#d8322a');
    g.textBaseline = 'middle'; g.textAlign = 'left'; fit(g, '동화마트', '', 112, F.dohyeon, 560); g.fillStyle = '#1d3f8f'; g.fillText('동화마트', 170, 70);
    g.textAlign = 'right'; setFont(g, 800, 30, F.ng); g.fillStyle = '#1d3f8f'; g.fillText('MART', W - 40, 50); setFont(g, 800, 25, F.ng); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('식품  ·  생활용품  ·  정육  ·  배달', W / 2, H - 20); }},
  {n:'참새분식', font:'Jua', draw(g, W, H){
    g.fillStyle = '#f7c531'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.25)'; for (let x = -40; x < W; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 0); g.lineTo(x + 30 - 60, H); g.lineTo(x - 60, H); g.fill(); }
    ICON.sparrow(g, 100, 92, 120);
    g.textBaseline = 'middle'; g.textAlign = 'left'; fit(g, '참새분식', '', 128, F.jua, 520); outlined(g, '참새분식', 190, 96, '#d2342a', [['#5a2a12', 22], ['#fff', 12]]);
    g.fillStyle = '#fff'; rrect(g, W - 220, 24, 190, 132, 18); g.fill(); g.fillStyle = '#5a2a12'; g.textAlign = 'center'; setFont(g, 800, 30, F.ng); ['떡볶이', '김밥', '순대 · 튀김'].forEach((t, i) => g.fillText(t, W - 125, 52 + i * 38)); }},
  {n:'무지개세탁', font:'Sunflower 700', draw(g, W, H){
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a7cc4'); gr.addColorStop(1, '#245a9c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.12)'; [[860, 40, 22], [930, 120, 14], [700, 150, 18], [980, 60, 10]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    ICON.rainbow(g, 110, 76, 150);
    g.textBaseline = 'middle'; g.textAlign = 'left'; fit(g, '무지개세탁', 700, 104, F.sun, 560); g.fillStyle = '#fff'; g.fillText('무지개세탁', 210, 76);
    setFont(g, 500, 30, F.sun); g.fillStyle = '#cfe6ff'; g.fillText('드라이클리닝 · 수선 · 운동화 빨래', 214, 146); }},
  {n:'새봄약국', font:'Nanum Gothic 800', draw(g, W, H){
    g.fillStyle = '#f7f8f4'; g.fillRect(0, 0, W, H); g.fillStyle = '#1f8a52'; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10);
    g.fillStyle = '#1f8a52'; g.beginPath(); g.arc(98, H / 2, 64, 0, 7); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; setFont(g, '', 76, F.bhs); g.fillText('약', 98, H / 2 + 4);
    g.textAlign = 'left'; fit(g, '새봄약국', 800, 112, F.ng, 520); g.fillStyle = '#1f8a52'; g.fillText('새봄약국', 196, H / 2 + 2);
    g.textAlign = 'right'; setFont(g, 700, 28, F.ng); g.fillStyle = '#4b5a52'; g.fillText('처방조제', W - 44, 66); g.fillText('일반의약품', W - 44, 112); }},
  {n:'별빛문구', font:'Gugi', draw(g, W, H){
    g.fillStyle = '#1c2a52'; g.fillRect(0, 0, W, H); const R = rng(5); g.fillStyle = 'rgba(255,240,180,.8)'; for (let i = 0; i < 40; i++) { star(g, R() * W, R() * H, 2 + R() * 4, 1 + R() * 1.5); g.fill(); }
    g.fillStyle = '#ffd84a'; star(g, 96, H / 2, 64, 27); g.fill(); g.fillStyle = '#ff8a3d'; star(g, 96, H / 2, 30, 13); g.fill();
    g.textBaseline = 'middle'; g.textAlign = 'left'; fit(g, '별빛문구', '', 98, F.gugi, 500); outlined(g, '별빛문구', 186, 70, '#ffd84a', [['#0d1530', 10]]);
    setFont(g, 700, 34, F.gaegu); g.fillStyle = '#fff'; g.fillText('문구 · 완구 · 팬시 · 복사', 192, 146);
    g.fillStyle = '#1c2a52'; g.strokeStyle = '#ffd84a'; g.lineWidth = 4; rrect(g, W - 240, 36, 210, 108, 14); g.fill(); g.stroke(); g.fillStyle = '#ffd84a'; g.textAlign = 'center'; setFont(g, '', 38, F.gugi); g.fillText('학교 앞', W - 135, 72); fit(g, '뽑기 · 딱지 · 구슬', 700, 30, F.gaegu, 180); g.fillStyle = '#fff'; g.fillText('뽑기 · 딱지 · 구슬', W - 135, 114); }},
  {n:'바삭치킨', font:'Black Han Sans', draw(g, W, H){
    g.fillStyle = '#c8231f'; g.fillRect(0, 0, W, H); g.fillStyle = '#a51a17'; g.fillRect(0, H - 14, W, 14);
    ICON.drumstick(g, 96, 92, 140);
    g.textBaseline = 'middle'; g.textAlign = 'left'; fit(g, '바삭치킨', '', 124, F.bhs, 500); g.fillStyle = '#ffcf33'; g.fillText('바삭치킨', 194, 90); g.fillStyle = '#fff'; g.fillText('바삭치킨', 188, 84);
    g.fillStyle = '#ffcf33'; g.beginPath(); g.arc(W - 106, H / 2, 70, 0, 7); g.fill(); g.fillStyle = '#7a2a12'; g.textAlign = 'center'; setFont(g, '', 46, F.bhs); g.fillText('반반', W - 106, H / 2 - 8); setFont(g, 800, 20, F.ng); g.fillText('무 추가 무료', W - 106, H / 2 + 34);
    g.fillStyle = '#ffe9b0'; g.textAlign = 'right'; setFont(g, 800, 26, F.ng); g.fillText('후라이드 · 양념 · 간장', W - 196, 150); }},
  {n:'다정미용실', font:'Yeon Sung', draw(g, W, H){
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#f8e1ec'); gr.addColorStop(1, '#e9bcd6'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a2457f'; g.lineWidth = 3; rrect(g, 12, 12, W - 24, H - 24, 16); g.stroke();
    ICON.scissors(g, 96, H / 2, 120, '#7a2a62');
    g.textBaseline = 'middle'; g.textAlign = 'left'; fit(g, '다정미용실', '', 118, F.yeon, 520); g.fillStyle = '#7a2a62'; g.fillText('다정미용실', 180, 84);
    g.textAlign = 'right'; setFont(g, 700, 30, F.nm); g.fillStyle = '#a2457f'; g.fillText('H A I R', W - 50, 70); setFont(g, 700, 26, F.ng); g.fillStyle = '#7a2a62'; g.fillText('커트 · 파마 · 염색', W - 50, 122); }},
  {n:'동화부동산', font:'Song Myung', draw(g, W, H){
    g.fillStyle = '#efe6cc'; g.fillRect(0, 0, W, H); g.strokeStyle = '#233a6b'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#c62f28'; g.fillRect(36, 34, 104, 112); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; setFont(g, 800, 30, F.ng); g.fillText('공인', 88, 70); g.fillText('중개사', 88, 110);
    g.textAlign = 'left'; fit(g, '동화부동산', '', 112, F.song, 540); g.fillStyle = '#233a6b'; g.fillText('동화부동산', 170, H / 2 + 4);
    g.textAlign = 'right'; setFont(g, 800, 26, F.ng); g.fillStyle = '#233a6b'; g.fillText('매매 · 전세 · 월세', W - 40, 66); setFont(g, 800, 32, F.ng); g.fillStyle = '#c62f28'; g.fillText('☎ 000-0000', W - 40, 116); }, age:1},
  {n:'CBQ치킨', font:'Gothic A1 900 + Do Hyeon', parody:true, draw(g, W, H){
    g.fillStyle = '#1f6b3a'; g.fillRect(0, 0, W, H); g.fillStyle = '#18552e'; for (let x = 0; x < W; x += 36) g.fillRect(x, 0, 18, H); g.globalAlpha = 1;
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.save(); g.translate(60, 86); g.transform(1, 0, -.18, 1, 0, 0); setFont(g, 900, 128, F.ga1); outlined(g, 'CBQ', 0, 0, '#fff', [['#0e3a1e', 12]]); const cw = g.measureText('CBQ').width; g.restore();
    g.fillStyle = '#ff9a2e'; g.beginPath(); g.moveTo(50, 150); g.quadraticCurveTo(60 + cw / 2, 128, 60 + cw, 146); g.lineTo(56 + cw, 156); g.quadraticCurveTo(60 + cw / 2, 140, 50, 160); g.fill();
    setFont(g, '', 104, F.dohyeon); outlined(g, '치킨', 100 + cw, 88, '#ff9a2e', [['#0e3a1e', 10]]);
    g.textAlign = 'right'; setFont(g, 800, 28, F.ng); g.fillStyle = '#fff'; g.fillText('치킨 · 생맥주', W - 40, 66); g.fillStyle = '#ffd66b'; g.fillText('포장 · 배달', W - 40, 112); }},
  {n:'왕별노래방', font:'Black Han Sans', draw(g, W, H){
    g.fillStyle = '#ffe23a'; g.fillRect(0, 0, W, H); g.fillStyle = '#e0261f'; g.fillRect(0, 0, W, 12); g.fillRect(0, H - 12, W, 12);
    ICON.mic(g, 84, 84, 120); g.fillStyle = '#e0261f'; star(g, 132, 40, 20, 8); g.fill();
    g.textBaseline = 'middle'; g.textAlign = 'left'; fit(g, '왕별노래방', '', 120, F.bhs, 560); outlined(g, '왕별노래방', 160, 94, '#e0261f', [['#111', 14]]);
    g.fillStyle = '#111'; rrect(g, W - 214, 34, 180, 112, 12); g.fill(); g.fillStyle = '#ffe23a'; g.textAlign = 'center'; setFont(g, '', 40, F.bhs); g.fillText('지하 1층', W - 124, 70); setFont(g, 800, 24, F.ng); g.fillStyle = '#fff'; g.fillText('코인 · 단체룸', W - 124, 116); }},
];

export function drawSign(g, i, x, y){
  const s = SIGNS[i]; g.save(); g.beginPath(); g.rect(x, y, CELL_W, CELL_H); g.clip(); g.translate(x, y);
  s.draw(g, CELL_W, CELL_H); grime(g, CELL_W, CELL_H, 11 + i * 7, s.age ? 1 : .45); if (s.age) rust(g, CELL_W, CELL_H, 3 + i);
  g.restore();
}
export function drawAtlas(g){ g.fillStyle = '#777'; g.fillRect(0, 0, ATLAS_W, ATLAS_H); SIGNS.forEach((_, i) => { const [x, y] = cellRect(i); drawSign(g, i, x, y); }); }
