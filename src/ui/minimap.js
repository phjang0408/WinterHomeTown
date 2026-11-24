// 미니맵 (2026-11-24 다시 짬): 오른쪽 위 작은 네모 지도는 '내 주변'(북쪽이 위, 반경 R을 확대해 따라다님).
//   누르거나 M 키면 가운데에 '동네 지도'(전체)를 띄운다. Esc · 닫기로 닫는다.
//   바닥은 월드에 등록된 도형(W.mm.shapes)을 몇 가지 색(물 · 풀 · 벽돌 바닥 · 도로/건물 · 보도 · 바탕)으로 단순하게 칠하고,
//   글자는 큰 장소 몇 곳(PLACES)만, 놀이 장소는 작은 마름모(spotLabels 자리)로 표시한다.
//   바닥은 처음에 한 번만 큰 그림으로 구워 두고, 매번 그 일부를 잘라 그린 뒤 글자 · 사람만 얹는다.
import { S } from '../core/state.js';
import { TAU } from '../core/util.js';
import { FONT_B, COLORS } from '../config.js';
import { W } from '../world/world.js';
import { WORLD } from '../map/layout.js';
import { spotLabels } from '../world/builders.js';

const mini = document.getElementById('mini'), g = mini.getContext('2d');
const big = document.getElementById('bigmap'), bc = document.getElementById('bigmap-c'), bg = bc.getContext('2d');
const WX = WORLD.x1 - WORLD.x0, WZ = WORLD.z1 - WORLD.z0;
const ground = document.createElement('canvas'), BS = 3;   // 바닥 그림 (BS px / 게임 단위)
const N = 360, R = 45;                                     // 작은 지도: 캔버스 한 변 px, 보이는 반경(게임 단위)
const BK = bc.width / WX;                                  // 큰 지도 배율
// 지도에 이름을 쓰는 곳 (x, z, 이름, 크기 1~3). 놀이 장소는 이름 없이 마름모로.
const PLACES = [[272, 51, '동화역', 2], [95, 172, '동화 아파트', 2], [320, 168, '공원', 3], [320, 100, '문구점', 1], [240, 236, '고깃집', 1],
  [314, 236, '목욕탕', 1], [388, 236, '마트', 1], [320, 315, '얼음 썰매장', 2], [545, 165, '학교', 2], [450, 366, '강', 2]];

// 원래 색을 몇 가지 톤으로 줄인다
function tone(hex){
  const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255, l = .3 * r + .59 * gg + .11 * b;
  if (b > r + 25 && gg > r + 16 && l > 180) return '#a9cadf';   // 물 · 얼음 (푸른 회색 건물은 빼려고 초록 차이도 본다)
  if (gg > r + 10 && gg > b) return '#c7d6c1';                 // 풀 · 공원
  if (r > b + 18) return l < 185 ? '#caa79e' : '#e5dcd3';      // 붉은 포장 도로 / 벽돌 · 상가 바닥
  return l < 185 ? '#a2adb8' : l < 215 ? '#cbd3da' : '#e9edf0';   // 도로 · 건물 / 보도 · 구역 / 바탕
}
function paintGround(b, k){
  b.fillStyle = '#e9edf0'; b.fillRect(0, 0, b.canvas.width, b.canvas.height);
  const x = v => (v - WORLD.x0) * k, z = v => (v - WORLD.z0) * k;
  for (const s of W.mm.shapes) { if (s[0] === 'c') continue; b.fillStyle = tone(s[4]); b.fillRect(x(s[0]), z(s[1]), (s[2] - s[0]) * k, (s[3] - s[1]) * k); }
  b.fillStyle = '#5b8fa3'; b.fillRect(x(6), z(297.9), 628 * k, Math.max(1, k * .9));   // 강변 자전거 도로 선
}
export function drawMiniBase(){
  ground.width = Math.ceil(WX * BS); ground.height = Math.ceil(WZ * BS); paintGround(ground.getContext('2d'), BS);
}
export const miniEvery = () => 2;
export const bigOpen = () => !big.hidden;
export function toggleBigMap(v){ big.hidden = typeof v === 'boolean' ? !v : !big.hidden; if (!big.hidden) drawBig(); }

const viewAng = () => Math.atan2(-Math.cos(S.cam.yaw), -Math.sin(S.cam.yaw));
function label(c, text, x, y, px, color){ c.font = '700 ' + px + 'px ' + FONT_B; c.lineJoin = 'round'; c.lineWidth = Math.max(3, px * .22); c.strokeStyle = 'rgba(255,255,255,.95)'; c.strokeText(text, x, y); c.fillStyle = color || '#26333f'; c.fillText(text, x, y); }
function others(c, P, sz){ S.remotes.forEach(Rm => { const [px, pz] = P(Rm.x, Rm.z); c.fillStyle = COLORS[Math.max(0, Rm.ci)].css; c.fillRect(px - sz / 2, pz - sz / 2, sz, sz); c.lineWidth = 2; c.strokeStyle = '#fff'; c.strokeRect(px - sz / 2, pz - sz / 2, sz, sz); }); }
function spots(c, P, sz){ c.lineWidth = 2; for (const s of spotLabels) { const [px, pz] = P(s.position.x, s.position.z); c.save(); c.translate(px, pz); c.rotate(Math.PI / 4); c.fillStyle = '#2f7f8c'; c.fillRect(-sz / 2, -sz / 2, sz, sz); c.strokeStyle = '#fff'; c.strokeRect(-sz / 2, -sz / 2, sz, sz); c.restore(); } }
// 나: 보는 방향을 가리키는 호박색 화살촉
function arrow(c, px, pz, s){ const a = viewAng(); c.save(); c.translate(px, pz); c.rotate(a);
  c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * .7, s * .62); c.lineTo(-s * .35, 0); c.lineTo(-s * .7, -s * .62); c.closePath();
  c.fillStyle = '#e3a53b'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#17191b'; c.stroke(); c.restore(); }

export function drawMini(){
  const me = S.me, k = N / (2 * R), x0 = me.x - R, z0 = me.z - R, P = (x, z) => [(x - x0) * k, (z - z0) * k];
  g.fillStyle = '#dfe4e8'; g.fillRect(0, 0, N, N);
  // 바닥 그림에서 보이는 만큼만 잘라 온다 (그림 밖은 잘라 내고 그린다: Safari는 밖을 가리키면 아무것도 안 그림)
  const sx = (x0 - WORLD.x0) * BS, sz = (z0 - WORLD.z0) * BS, sw = 2 * R * BS;
  const ax = Math.max(0, sx), az = Math.max(0, sz), bx = Math.min(ground.width, sx + sw), bz = Math.min(ground.height, sz + sw);
  if (bx > ax && bz > az) g.drawImage(ground, ax, az, bx - ax, bz - az, (ax - sx) / sw * N, (az - sz) / sw * N, (bx - ax) / sw * N, (bz - az) / sw * N);
  spots(g, P, 12);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [x, z, t, s] of PLACES) { if (Math.abs(x - me.x) > R + 15 || Math.abs(z - me.z) > R + 6) continue; const [px, pz] = P(x, z); label(g, t, px, pz, 20 + s * 3, t === '강' ? '#2c6688' : null); }
  others(g, P, 14);
  arrow(g, N / 2, N / 2, 17);
  g.fillStyle = 'rgba(23,25,27,.8)'; g.fillRect(6, 6, 26, 26); g.font = '700 18px ' + FONT_B; g.fillStyle = '#e3a53b'; g.fillText('N', 19, 20);   // 북쪽(위)
  if (!big.hidden && ++bigTick % 3 === 0) drawBig();
}
let bigTick = 0;
function drawBig(){
  const P = (x, z) => [(x - WORLD.x0) * BK, (z - WORLD.z0) * BK];
  bg.drawImage(ground, 0, 0, bc.width, bc.height);
  spots(bg, P, 14);
  bg.textAlign = 'center'; bg.textBaseline = 'middle';
  for (const [x, z, t, s] of PLACES) { const [px, pz] = P(x, z); label(bg, t, px, pz, 18 + s * 7, t === '강' ? '#2c6688' : null); }
  others(bg, P, 14);
  const [mx, mz] = P(S.me.x, S.me.z); arrow(bg, mx, mz, 18);
}
mini.addEventListener('click', () => toggleBigMap());
document.getElementById('bigmap-close').addEventListener('click', () => toggleBigMap(false));
document.getElementById('scene').addEventListener('pointerdown', () => { if (!big.hidden) toggleBigMap(false); });   // 화면을 누르면 닫힌다
