// 다른 사람 캐릭터: 받은 상태를 적용하고 부드럽게 따라가게 한다.
import { scene } from '../core/engine.js';
import { pillSprite } from '../core/gfx.js';
import { S } from '../core/state.js';
import { lerpAngle } from '../core/util.js';
import { W } from '../world/world.js';
import { decode } from '../net/protocol.js';
import { ACTS } from '../activities/registry.js';
import { makeChar, placeChar, emote, SIT } from './character.js';
import { nameOf, extrasHooks } from './player.js';
import { trackPrints } from './footprints.js';

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
    R.tx = p.x; R.tz = p.z; R.tr = p.r; R.st = p.st; R.sc = p.sc;
    if (R.emQ !== undefined && p.em[0] !== R.emQ) { emote(R.char, p.em[1]); ACTS.forEach(a => a.remoteEmote && a.remoteEmote(R, p.em[1])); }
    R.emQ = p.em[0];
    ACTS.forEach(a => a.remote && a.remote(R, p));
  }
  for (const R of [...S.remotes.values()]) if (!seen.has(R.id)) dropRemote(R);
}
export function updateRemotes(dt, now){
  S.remotes.forEach(R => {
    if (!R.char) return;
    const k = Math.min(1, dt * 10), ox = R.x, oz = R.z;
    if (Math.hypot(R.tx - R.x, R.tz - R.z) > 14) { R.x = R.tx; R.z = R.tz; } else { R.x += (R.tx - R.x) * k; R.z += (R.tz - R.z) * k; }
    R.r = lerpAngle(R.r, R.tr, k); const moved = Math.hypot(R.x - ox, R.z - oz);
    placeChar(R, R.char, dt, moved, now);
    if (!SIT.has(R.st) && moved > .002) trackPrints(R, moved, now);
    ACTS.forEach(a => a.remoteFrame && a.remoteFrame(R, dt, moved));
  });
}
