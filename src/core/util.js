export const PI = Math.PI, TAU = PI * 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const rnd = n => Math.floor(Math.random() * n);
export const wrapA = a => ((a + PI) % TAU + TAU) % TAU - PI;
export const lerpAngle = (a, b, k) => a + wrapA(b - a) * k;

// 시드 고정 난수: 새로고침해도 나무 배치 등이 같게 나온다.
let seed = 7;
export const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const sr = (a, b) => a + srand() * (b - a);
export const resetSeed = s => { seed = s || 7; };

export function rr(g, x, y, w, h, r){
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
