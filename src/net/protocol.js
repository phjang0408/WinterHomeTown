// 주고받는 내 상태(presence)의 모양. 서버를 바꿔도 이 형식은 그대로 쓴다.
// 받은 값은 다른 사람이 보낸 것이므로 전부 범위를 확인하고 고친다.
import { clamp } from '../core/util.js';
import { COLORS, ADJ, NOUN } from '../config.js';
import { WORLD } from '../map/layout.js';

export function encode(me){
  return {x:+me.x.toFixed(2), z:+me.z.toFixed(2), r:+me.r.toFixed(2), st:me.st, c:me.ci, a:me.a, n:me.n,
    em:me.em, th:me.th, ball:+me.ballR.toFixed(2), sw:me.sw, mg:[me.mg[0], +me.mg[1].toFixed(2)], kt:me.kt, sa:me.sa, it:me.it, tk:me.tk, sc:me.sc};
}
const num = (v, a, b, d) => (typeof v === 'number' && isFinite(v)) ? clamp(v, a, b) : d;
const int = (v, a, b, d) => Number.isInteger(v) && v >= a && v <= b ? v : d;
const arr = (v, n) => Array.isArray(v) ? v.slice(0, n) : [];
export function decode(p){
  if (!p || typeof p !== 'object') return null;
  const x = num(p.x, WORLD.x0, WORLD.x1, null), z = num(p.z, WORLD.z0, WORLD.z1, null);
  if (x === null || z === null) return null;
  const em = arr(p.em, 2), th = arr(p.th, 3), sc = arr(p.sc, 3), mg = arr(p.mg, 2), kt = arr(p.kt, 1), sa = arr(p.sa, 1), it = arr(p.it, 3), tk = arr(p.tk, 6);
  return {x, z, r:num(p.r, -10, 10, 0), st:int(p.st, 0, 31, 0),
    c:int(p.c, 0, COLORS.length - 1, 0), a:int(p.a, 0, ADJ.length - 1, 0), n:int(p.n, 0, NOUN.length - 1, 0),
    em:[em[0] | 0, em[1] | 0], th:[th[0] | 0, num(th[1], WORLD.x0, WORLD.x1, 0), num(th[2], 0, 10, 0)],
    ball:num(p.ball, 0, 1.5, 0), sw:snowman(p.sw), mg:[int(mg[0], 0, 999, 0), num(mg[1], 0, 7, 0)], kt:[int(kt[0], 0, 60, 0)], sa:[int(sa[0], 0, 100, 0)], it:[int(it[0], 0, 9, 0), int(it[1], 0, 3, 0), int(it[2], 0, 1, 0)], tk:[int(tk[0], 0, 9, 9), int(tk[1], 0, 1, 0), int(tk[2], 0, 9, 0), int(tk[3], 0, 9, 0), int(tk[4], 0, 2, 0), int(tk[5], 0, 1, 0)],
    sc:[int(sc[0], 0, 100, 0), int(sc[1], 0, 7, 0), int(sc[2], 0, 100, 0)]};
}

// 함께 만드는 눈사람 상태: [시작 시각, 완성 시각(없으면 0), 사람 번호, 보탠 개수, 사람 번호, 보탠 개수, ...] (최대 16명, 한 사람 99개)
function snowman(v){
  if (!Array.isArray(v) || v.length < 2 || v.length > 34) return null;
  const t0 = v[0], tc = v[1];
  if (typeof t0 !== 'number' || !isFinite(t0) || t0 <= 0 || typeof tc !== 'number' || !isFinite(tc) || tc < 0) return null;
  const c = [];
  for (let i = 2; i + 1 < v.length; i += 2) { const u = int(v[i], 1, 2147483647, 0), n = int(v[i + 1], 1, 99, 0); if (u && n) c.push([u, n]); }
  return {t0, tc, c};
}
