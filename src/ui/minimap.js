// 미니맵: 월드에 등록된 도형·이름표를 그대로 그리고, 사람 위치와 내 시야 방향을 얹는다.
import { S } from '../core/state.js';
import { TAU } from '../core/util.js';
import { FONT_D, COLORS } from '../config.js';
import { W } from '../world/world.js';
import { WORLD } from '../map/layout.js';

const mini = document.getElementById('mini'), g = mini.getContext('2d'), base = document.createElement('canvas');
const MS = mini.width / (WORLD.x1 - WORLD.x0), X = x => (x - WORLD.x0) * MS, Z = z => (z - WORLD.z0) * MS;
export function drawMiniBase(){
  base.width = mini.width; base.height = mini.height; const b = base.getContext('2d');
  b.fillStyle = '#f1f5f8'; b.fillRect(0, 0, base.width, base.height);
  for (const s of W.mm.shapes) { b.fillStyle = s[4];
    if (s[0] === 'c') { b.beginPath(); b.arc(X(s[1]), Z(s[2]), s[3] * MS, 0, TAU); b.fill(); } else b.fillRect(X(s[0]), Z(s[1]), (s[2] - s[0]) * MS, (s[3] - s[1]) * MS); }
  b.fillStyle = '#2f7f8c'; b.fillRect(X(6), Z(297.9), 628 * MS, 2);
  b.textAlign = 'center'; b.textBaseline = 'middle'; b.lineJoin = 'round';
  for (const l of W.mm.labels) { b.font = l[3] + 'px ' + FONT_D; b.lineWidth = 4; b.strokeStyle = 'rgba(255,255,255,.9)'; b.strokeText(l[2], X(l[0]), Z(l[1])); b.fillStyle = '#34465c'; b.fillText(l[2], X(l[0]), Z(l[1])); }
  b.font = '20px ' + FONT_D; b.fillStyle = '#4b6f86'; b.fillText('강', X(450), Z(364));
}
export function drawMini(){
  g.drawImage(base, 0, 0);
  const dot = (x, z, c, r) => { g.beginPath(); g.arc(X(x), Z(z), r, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); };
  S.remotes.forEach(R => dot(R.x, R.z, COLORS[Math.max(0, R.ci)].css, 6));
  const me = S.me, cx = X(me.x), cy = Z(me.z), ang = Math.atan2(-Math.cos(S.cam.yaw), -Math.sin(S.cam.yaw));
  g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 30, ang - .55, ang + .55); g.closePath(); g.fillStyle = 'rgba(47,127,140,.22)'; g.fill();
  dot(me.x, me.z, '#2f7f8c', 8);
}
mini.addEventListener('click', () => mini.classList.toggle('big'));
