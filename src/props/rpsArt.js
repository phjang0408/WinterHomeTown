// 가위바위보 오락기 앞판 그림 (2026-11-22). 3D 소품(props/stationery.js rpsMachine)의 그림 판과
// 놀이 화면(activities/arcade.js)이 같이 쓴다. 논리 크기 600 × 480. 제목 · 글은 지어낸 것.
//   st = {hand: 0 없음 · 1 가위 · 2 바위 · 3 보, lit: 숫자 칸 불(-1 없음), res: 0 없음 · 1 이김 · 2 비김 · 3 짐, blink: 0~1}
import { FONT_D, FONT_B } from '../config.js';

export const RPS_W = 600, RPS_H = 480;
const CX = 250, CY = 256, K = .87, NUMS = [4, 1, 2, 7, 4, 2, 1, 20, 2, 4, 1, 2];
// 바깥 띠: 위에서부터 시계 방향 각도(도). res가 맞으면 불이 켜진다
const BANDS = [[300, 420, '#5fb24a', '', 0], [60, 120, '#e8402a', '이겼다', 1], [120, 180, '#f2b632', '비겼다', 2], [180, 240, '#f2b632', '졌다', 3], [240, 300, '#e8402a', '이겼다', 1]];
const rad = d => (d - 90) * Math.PI / 180;

// LED 손: 빨간 점선 윤곽 (가위 1 · 바위 2 · 보 3)
export function drawHand(g, kind, cx, cy, s, color = '#ff2a2a', led = true){
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.strokeStyle = color; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  if (led) { g.setLineDash([2, 9]); g.shadowColor = color; g.shadowBlur = 10; }
  const finger = (x, y, a, len) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-9, 0); g.lineTo(-9, -len); g.arc(0, -len, 9, Math.PI, 0); g.lineTo(9, 0); g.stroke(); g.restore(); };
  // 손바닥 (모든 손 공통)
  g.beginPath(); g.moveTo(-38, -10); g.quadraticCurveTo(-44, 40, -18, 58); g.lineTo(22, 58); g.quadraticCurveTo(44, 36, 40, -6); g.stroke();
  if (kind === 2) {                                   // 바위: 접힌 손가락 마디 넷 + 엄지
    [-27, -9, 9, 27].forEach(x => { g.beginPath(); g.arc(x, -14, 9.5, Math.PI, 0); g.stroke(); });
    g.beginPath(); g.moveTo(-38, 12); g.quadraticCurveTo(-8, 4, 6, 20); g.stroke();
  } else if (kind === 1) {                            // 가위: 검지 · 중지를 V로, 나머지는 접힘
    finger(-14, -12, -.28, 52); finger(12, -12, .26, 54);
    [26].forEach(x => { g.beginPath(); g.arc(x, -6, 9, Math.PI, 0); g.stroke(); });
    g.beginPath(); g.moveTo(-38, 14); g.quadraticCurveTo(-10, 6, 4, 22); g.stroke();
  } else if (kind === 3) {                            // 보: 다섯 손가락을 편다
    finger(-30, -6, -.42, 34); finger(-14, -12, -.16, 50); finger(2, -14, 0, 56); finger(18, -12, .16, 50); finger(33, -4, .4, 38);
  }
  g.restore();
}

// 아이콘용 꽉 찬 손 (동그라미 배지 안)
function badge(g, x, y, r, bg, kind){
  g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = '#1b1b1b'; g.stroke();
  drawHand(g, kind, x, y + 4, r / 80, '#ffe7a8', false);
}

export function drawRpsFace(g, st = {}){
  const {hand = 1, lit = -1, res = 0, blink = 1} = st;
  // 판 · 테두리 · 나사
  g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, RPS_W, RPS_H); g.fillStyle = '#1f56e6'; g.fillRect(10, 10, RPS_W - 20, RPS_H - 20);
  [[22, 22], [RPS_W - 22, 22], [22, RPS_H - 22], [RPS_W - 22, RPS_H - 22]].forEach(([x, y]) => { g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.stroke(); });
  // 제목
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '62px ' + FONT_D; g.lineJoin = 'round';
  g.strokeStyle = '#111'; g.lineWidth = 10; g.strokeText('가위바위보 왕', CX, 46); g.fillStyle = '#ffd23f'; g.fillText('가위바위보 왕', CX, 46);
  // 원판은 K배로 줄여 제목 · 아래 글과 겹치지 않게
  g.save(); g.translate(CX, CY); g.scale(K, K); g.translate(-CX, -CY);
  // 바깥 띠 (번개 모양 흰 경계)
  BANDS.forEach(([a0, a1, col, text, k]) => {
    const on = res && k === res && blink > .5;
    g.fillStyle = on ? '#fff59a' : col; g.beginPath(); g.moveTo(CX, CY); g.arc(CX, CY, 196, rad(a0), rad(a1)); g.closePath(); g.fill();
    const m = rad((a0 + a1) / 2), tr = 172; g.save(); g.translate(CX + Math.cos(m) * tr, CY + Math.sin(m) * tr); g.rotate(m + Math.PI / 2 + (Math.sin(m) > .2 ? Math.PI : 0));
    g.font = (k ? 30 : 22) + 'px ' + FONT_D; g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeText(text, 0, 0); g.fillStyle = on ? '#d81b1b' : '#b3121b'; g.fillText(text, 0, 0); g.restore();
  });
  for (let i = 0; i < 12; i++) { const a = rad(i * 30 + 15); g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(CX + Math.cos(a) * 152, CY + Math.sin(a) * 152); g.lineTo(CX + Math.cos(a + .05) * 174, CY + Math.sin(a + .05) * 174); g.lineTo(CX + Math.cos(a - .03) * 184, CY + Math.sin(a - .03) * 184); g.lineTo(CX + Math.cos(a + .02) * 198, CY + Math.sin(a + .02) * 198); g.stroke(); }
  // 숫자 칸 고리 (불이 도는 곳)
  for (let i = 0; i < 12; i++) {
    const a0 = rad(i * 30), a1 = rad(i * 30 + 30), on = i === lit;
    g.fillStyle = on ? '#fff36b' : i % 2 ? '#1f5e3a' : '#f4f4ef'; g.beginPath(); g.arc(CX, CY, 150, a0, a1); g.arc(CX, CY, 104, a1, a0, true); g.closePath(); g.fill();
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; g.stroke();
    const m = rad(i * 30 + 15); g.save(); g.translate(CX + Math.cos(m) * 127, CY + Math.sin(m) * 127); g.rotate(m + Math.PI / 2);
    g.font = '30px ' + FONT_D; g.fillStyle = on ? '#c0101a' : i % 2 ? '#f6d04d' : '#b01c22'; g.fillText(String(NUMS[i]), 0, 2); g.restore();
  }
  // 가운데 기판 + LED 손
  g.fillStyle = '#16492c'; g.beginPath(); g.arc(CX, CY, 102, 0, 7); g.fill();
  g.strokeStyle = 'rgba(160,210,150,.35)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const y = CY - 80 + i * 20; g.beginPath(); g.moveTo(CX - 70 + (i % 3) * 8, y); g.lineTo(CX - 20, y); g.lineTo(CX - 10, y + 8); g.lineTo(CX + 64 - (i % 2) * 10, y + 8); g.stroke(); }
  g.fillStyle = 'rgba(210,190,120,.6)'; for (let i = 0; i < 18; i++) g.fillRect(CX - 60 + (i % 6) * 22, CY - 64 + Math.floor(i / 6) * 58, 5, 5);
  if (hand) drawHand(g, hand, CX, CY - 6, 1.25);
  // 손 배지: 왼쪽 바위, 위 가위, 오른쪽 보
  badge(g, CX - 222, CY, 30, '#f2c51f', 2); badge(g, CX, CY - 186, 28, '#e8402a', 1); badge(g, CX + 222, CY, 30, '#2f6fd6', 3);   // 양옆 배지는 원판 밖으로 ('이겼다' 글과 겹치지 않게)
  g.restore();
  // 동전 넣는 판 (오른쪽)
  g.fillStyle = '#b9bec4'; g.fillRect(468, 120, 104, 220); g.strokeStyle = '#7d848b'; g.lineWidth = 3; g.strokeRect(468, 120, 104, 220);
  g.fillStyle = '#8d949b'; g.beginPath(); g.ellipse(520, 168, 18, 34, 0, 0, 7); g.fill(); g.fillStyle = '#2c2f33'; g.fillRect(516, 140, 8, 56);
  g.fillStyle = '#26292d'; g.fillRect(488, 214, 64, 20); g.fillStyle = '#e6e6e6'; g.font = '700 14px ' + FONT_B; g.fillText('100원', 520, 225);
  g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(520, 290, 26, 0, 7); g.fill(); g.fillStyle = '#5c6268'; g.fillRect(514, 268, 12, 44);
  // 아래 글: 버튼 자리 (x 200 · 300 · 400)
  g.font = '34px ' + FONT_D; [['가위', 200], ['바위', 300], ['보', 400]].forEach(([t, x]) => { g.strokeStyle = '#111'; g.lineWidth = 7; g.strokeText(t, x, 446); g.fillStyle = '#ffd23f'; g.fillText(t, x, 446); });
}
