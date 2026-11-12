// 주고받는 내 상태(presence)의 모양. 서버를 바꿔도 이 형식은 그대로 쓴다.
// 받은 값은 다른 사람이 보낸 것이므로 전부 범위를 확인하고 고친다.
import { clamp } from '../core/util.js';
import { COLORS, ADJ, NOUN } from '../config.js';
import { WORLD, SLOTS } from '../map/layout.js';

export function encode(me){
  return {x:+me.x.toFixed(2), z:+me.z.toFixed(2), r:+me.r.toFixed(2), st:me.st, c:me.ci, a:me.a, n:me.n,
    em:me.em, th:me.th, ball:+me.ballR.toFixed(2), sm:me.sm, sl:me.slot, sc:me.sc};
}
const num = (v, a, b, d) => (typeof v === 'number' && isFinite(v)) ? clamp(v, a, b) : d;
const int = (v, a, b, d) => Number.isInteger(v) && v >= a && v <= b ? v : d;
const arr = (v, n) => Array.isArray(v) ? v.slice(0, n) : [];
export function decode(p){
  if (!p || typeof p !== 'object') return null;
  const x = num(p.x, WORLD.x0, WORLD.x1, null), z = num(p.z, WORLD.z0, WORLD.z1, null);
  if (x === null || z === null) return null;
  const em = arr(p.em, 2), th = arr(p.th, 3), sm = arr(p.sm, 2), sc = arr(p.sc, 3);
  return {x, z, r:num(p.r, -10, 10, 0), st:int(p.st, 0, 31, 0),
    c:int(p.c, 0, COLORS.length - 1, 0), a:int(p.a, 0, ADJ.length - 1, 0), n:int(p.n, 0, NOUN.length - 1, 0),
    em:[em[0] | 0, em[1] | 0], th:[th[0] | 0, num(th[1], WORLD.x0, WORLD.x1, 0), num(th[2], 0, 10, 0)],
    ball:num(p.ball, 0, 1.5, 0), sm:[num(sm[0], 0, 1.5, 0), num(sm[1], 0, 1.5, 0)], sl:int(p.sl, 0, SLOTS.length - 1, 0),
    sc:[int(sc[0], 0, 100, 0), int(sc[1], 0, 7, 0), int(sc[2], 0, 100, 0)]};
}
