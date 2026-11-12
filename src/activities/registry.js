// 놀이 등록소. 새 놀이는 defineActivity로 등록하면 안내 버튼·카메라·점수표·동기화에 자동으로 연결된다.
//
// activity = {
//   id, st,                    // 고유 이름, 캐릭터 상태 코드 (config.ST)
//   score: {index, label, unit}, // 점수표에 보일 때 (me.sc[index])
//   setup(),                   // 맵에 필요한 물건 만들기 (한 번)
//   offer(offer),              // 걷는 중에 근처면 offer(거리, 범위, '버튼 문구', 시작함수)
//   start(),                   // 시작 (registry.begin 사용)
//   update(dt, now) → 이동량,   // 있으면 이 놀이가 캐릭터 이동을 대신한다 (썰매)
//   free: true,                // 놀이 중에도 걸어다닐 수 있음 (눈사람)
//   prompt() → {label, run},   // 놀이 중 안내 버튼
//   onAction(),                // 놀이 중 E 키
//   onTap(ray),                // 놀이 중 화면 클릭
//   camera(want, look) → bool, // 고정 카메라
//   frame(dt, now, moved),     // 매 프레임
//   remote(R, p), remoteEmote(R, k), remoteFrame(R, dt, moved),  // 다른 사람 상태 반영
//   quit(),                    // 중간에 그만둘 때 정리
// }
import { S, setMode } from '../core/state.js';
import { sfx } from '../core/fx.js';
import { me, standUp, nameOf } from '../entities/player.js';
import { hud } from '../ui/hud.js';

export const ACTS = [];
export function defineActivity(a){ ACTS.push(a); return a; }
export const current = () => ACTS.find(a => a.id === S.mode) || null;

export function begin(a, game){ setMode(a.id); S.game = game || {}; if (a.st !== undefined) me.st = a.st; hud.prompt(''); }
export function stopActivity(){ const a = current(); if (a && a.quit) a.quit(); setMode('walk'); S.game = null; me.st = 0; hud.hideGame(); }

export function findAction(){
  const a = current();
  if (a) return a.prompt ? a.prompt() : null;
  if (S.mode !== 'walk') return null;
  if (me.st !== 0 && me.onStand) return {label:'일어나기', run:standUp};
  let best = null, bd = 1e9;
  const offer = (d, lim, label, run) => { if (d < lim && d < bd) { bd = d; best = {label, run}; } };
  for (const x of ACTS) if (x.offer) x.offer(offer);
  return best;
}
export function doAction(){
  const a = current(); if (a && a.onAction) return a.onAction();
  const act = findAction(); if (act) { act.run(); sfx(440, 520, .08); }
}

// 다른 사람이 이미 앉은 자리인지
export function seatTaken(x, z, st){ for (const R of S.remotes.values()) if (R.st === st && Math.abs(R.tx - x) < .45 && Math.abs(R.tz - z) < .8) return true; return false; }

// 점수 기록 후 결과 창
export function finish(a, title, value, again){
  const i = a.score.index; me.sc[i] = Math.max(me.sc[i], value);
  let best = me.sc[i], who = '나'; S.remotes.forEach(R => { if (R.sc[i] > best) { best = R.sc[i]; who = nameOf(R.a, R.n); } });
  stopActivity();
  hud.result(title, value + a.score.unit, '내 최고 ' + me.sc[i] + a.score.unit + ' · 지금 동네 최고 ' + best + a.score.unit + ' (' + who + ')', again);
  sfx(520, 880, .35, 'triangle');
}
