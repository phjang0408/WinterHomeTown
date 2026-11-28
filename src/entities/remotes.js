// 다른 사람 캐릭터: 받은 상태를 적용하고 부드럽게 따라가게 한다.
import { scene } from '../core/engine.js';
import { pillSprite } from '../core/gfx.js';
import { S } from '../core/state.js';
import { lerpAngle } from '../core/util.js';
import { W } from '../world/world.js';
import { decode } from '../net/protocol.js';
import { TM } from '../net/index.js';
import { ACTS } from '../activities/registry.js';
import { makeChar, placeChar, emote, SIT } from './character.js';
import { nameOf, extrasHooks } from './player.js';
import { trackPrints } from './footprints.js';

// (2026-11-28) 사이 이어 그리기: 걷기만 할 때는 0.2초마다 위치가 온다(net/index.js netTick). 받은 위치를 받은 시각과 함께 쌓아 두고,
//   DELAY만큼 지난 시점의 모습을 앞뒤 두 위치 사이에서 이어 그린다 → 띄엄띄엄 와도 끊기지 않고 걷는다.
//   R.tx · R.tz는 그대로 '가장 최근에 받은 위치' (자리 차지 확인 registry.js seatTaken 등에서 쓴다)
const DELAY = 260;
function pushSample(R, p){
  const t = performance.now(), q = R.q || (R.q = []), last = q[q.length - 1];
  if (last && last.x === p.x && last.z === p.z && last.r === p.r) return;
  const gap = R.qAt ? t - R.qAt : 200; R.qAt = t;
  if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 14) { q.length = 0; q.push({t:t - DELAY, x:p.x, z:p.z, r:p.r, tm:p.tm}); return; }   // 처음 · 순간이동(버스 등): 바로 그 자리
  // 받은 시각은 서버가 0.1초마다 모아 보내서 들쭉날쭉하다(0.2초 간격이 0.1 · 0.3초로) → 걸음이 빨라졌다 느려졌다 한다.
  //   그래서 보낸 사람의 시각(tm) 간격대로 편다. tm이 없으면(예전 판) 받은 간격의 평균으로 편다. 어느 쪽이든 실제 받은 시각과 0.15초 넘게 벌어지지 않게
  //   (그리는 시점이 DELAY만큼 뒤라서 조금 '앞날' 시각이어도 괜찮다)
  let ts = t;
  if (t - last.t > 400) q.push({t:t - 200, x:last.x, z:last.z, r:last.r});   // 멈췄다 다시 걸으면 멈춘 자리에서 출발하게
  else {
    const d = p.tm >= 0 && last.tm >= 0 ? (p.tm - last.tm + TM) % TM : -1;
    R.qGap = R.qGap ? R.qGap * .8 + Math.min(gap, 400) * .2 : gap;
    ts = Math.min(t + 150, Math.max(t - 150, last.t + (d > 0 && d < 1000 ? d : R.qGap)));
  }
  q.push({t:ts, x:p.x, z:p.z, r:p.r, tm:p.tm}); if (q.length > 10) q.splice(0, q.length - 10);
}
function sampleAt(q, t){
  let i = q.length - 1; while (i > 0 && q[i].t > t) i--;
  const a = q[i], b = q[i + 1]; if (!b || t <= a.t) return a;
  const f = (t - a.t) / (b.t - a.t);
  return {x:a.x + (b.x - a.x) * f, z:a.z + (b.z - a.z) * f, r:lerpAngle(a.r, b.r, f)};
}

export function dropRemote(R){ scene.remove(R.char); ACTS.forEach(a => a.remoteDrop && a.remoteDrop(R)); S.remotes.delete(R.id); }
export function applyPeers(list){
  const seen = new Set();
  for (const pr of list) {
    const p = decode(pr.presence); let R = S.remotes.get(pr.id);
    if (!p) { if (R) dropRemote(R); continue; }
    seen.add(pr.id);
    if (!R) { R = {id:pr.id, x:p.x, z:p.z, r:p.r, tx:p.x, tz:p.z, tr:p.r, st:0, ci:-1, a:-1, n:-1, sc:[0,0,0], char:null}; S.remotes.set(pr.id, R); }
    if (p.c !== R.ci || p.a !== R.a || p.n !== R.n) {
      if (R.char) scene.remove(R.char); R.ci = p.c; R.a = p.a; R.n = p.n; R.char = makeChar(p.c);
      const l = pillSprite(nameOf(p.a, p.n), 'rgba(255,255,255,.9)', '#2b3f55', .5); l.position.y = 2.7; R.char.add(l);
      extrasHooks.forEach(f => f(R.char)); R.char.position.set(R.x, W.groundY(R.x, R.z), R.z); scene.add(R.char);
    }
    R.tx = p.x; R.tz = p.z; R.tr = p.r; R.st = p.st; R.sc = p.sc; pushSample(R, p);
    if (R.emQ !== undefined && p.em[0] !== R.emQ) { emote(R.char, p.em[1]); ACTS.forEach(a => a.remoteEmote && a.remoteEmote(R, p.em[1])); }
    R.emQ = p.em[0];
    ACTS.forEach(a => a.remote && a.remote(R, p));
  }
  for (const R of [...S.remotes.values()]) if (!seen.has(R.id)) dropRemote(R);
}
export function updateRemotes(dt, now){
  const at = performance.now() - DELAY;
  S.remotes.forEach(R => {
    if (!R.char) return;
    const s = R.q && R.q.length ? sampleAt(R.q, at) : {x:R.tx, z:R.tz, r:R.tr};
    const k = Math.min(1, dt * 12), ox = R.x, oz = R.z;
    if (Math.hypot(s.x - R.x, s.z - R.z) > 14) { R.x = s.x; R.z = s.z; } else { R.x += (s.x - R.x) * k; R.z += (s.z - R.z) * k; }
    R.r = lerpAngle(R.r, s.r, k); const moved = Math.hypot(R.x - ox, R.z - oz);
    placeChar(R, R.char, dt, moved, now);
    if (!SIT.has(R.st) && moved > .002) trackPrints(R, moved, now);
    ACTS.forEach(a => a.remoteFrame && a.remoteFrame(R, dt, moved));
  });
}
