// 익명 운영 통계 (2026-11-27): 이름 · IP · 위치 좌표 없이 숫자만 멀티플레이 서버로 보낸다 → server/server.js가 하루 단위로 모아 /stats 표로 보여 준다.
//   아티팩트(공유 방)에서는 서버가 없어서 보내지 않는다. 보내는 것:
//   hello  처음 한 번: 기기(m 폰 · p PC), 화질 단계, 절전, 불러오기 걸린 초
//   enter  들어가기를 누름: 시작 화면에 머문 초
//   play   놀이 하나가 끝날 때: 놀이 이름(S.mode), 한 초
//   min    1분마다(게임 중 · 탭이 보일 때): 평균 FPS, 구역별 머문 초(apt 아파트 · park 공원 · 상가 · school 학교 앞 · station 역 · river 강가)
//   err    화면 오류 첫 100자 (한 번 접속에 3개까지)
//   link   정보 탭 · 시작 화면 링크 누름 (insta · donate)
import { net } from './index.js';
import { S } from '../core/state.js';
import { coarse } from '../config.js';
import { QUALITY } from '../core/quality.js';
import { SAVER } from '../core/saver.js';
import { NROAD, ROAD, SCHOOL } from '../map/layout.js';

const Q = []; let errs = 0;
export function stat(e){ if (Q.length < 60) Q.push(e); }
function flush(){
  if (net.kind !== 'websocket' || !net.online || !net.link || !net.link.raw || !Q.length) return;
  net.link.raw({t:'ev', e:Q.splice(0, 20)});
}
export const areaOf = (x, z) => z < NROAD.z0 ? 'station' : z > ROAD.z1 ? 'river' : x < 190 ? 'apt' : x > SCHOOL.x0 - 10 ? 'school' : 'park';
export function statHello(loadSec){ stat({k:'hello', dev:coarse ? 'm' : 'p', q:QUALITY.level, saver:SAVER.on ? 1 : 0, load:Math.round(loadSec * 10) / 10}); }
let readyAt = 0; export const statReady = () => { readyAt = performance.now(); };
export function statEnter(){ stat({k:'enter', wait:Math.round((performance.now() - readyAt) / 1000)}); }

// 놀이 시간: S.mode가 걷기 · 시작 화면이 아닌 동안을 놀이 하나로 센다
let mode = 'intro', modeAt = 0, frames = 0, minAt = 0, flushAt = 0, areaT = {}, lastT = 0;
export function statsFrame(dt, now){
  if (S.mode !== mode) { if (mode !== 'walk' && mode !== 'intro') stat({k:'play', a:String(mode).slice(0, 20), s:Math.round((now - modeAt) / 1000)}); mode = S.mode; modeAt = now; }
  if (now - flushAt > 5000) { flushAt = now; flush(); }
  const el = lastT ? Math.min(1, (now - lastT) / 1000) : 0; lastT = now;   // 실제 흐른 초 (dt는 0.05로 잘려서 느린 기기에서 덜 센다)
  if (S.mode === 'intro' || document.hidden) { minAt = now; frames = 0; return; }
  frames++; const me = S.me; if (me) { const a = areaOf(me.x, me.z); areaT[a] = (areaT[a] || 0) + el; }
  if (!minAt) minAt = now;
  if (now - minAt >= 60000) { const area = {}; for (const k in areaT) area[k] = Math.round(areaT[k]);
    stat({k:'min', fps:Math.round(frames / ((now - minAt) / 1000)), area}); frames = 0; minAt = now; areaT = {}; }
}
const onErr = m => { if (errs >= 3) return; errs++; stat({k:'err', m:String(m || '').slice(0, 100)}); };
window.addEventListener('error', e => onErr(e.message));
window.addEventListener('unhandledrejection', e => onErr(e.reason && (e.reason.message || e.reason)));
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-link]'); if (a && a.getAttribute('href')) stat({k:'link', l:a.dataset.link}); }, true);
