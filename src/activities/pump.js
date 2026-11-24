// 타는 놀이기구의 '엉덩이로 밀기' 게이지 (2026-11-20 4차, 2026-11-24 E 키 · 공중전화 게이지로): 그네 · 흔들 오리 · 시소.
//   (2026-11-21: 설명 글 없이 작게) R(또는 화면의 R 버튼)을 알맞은 때(good()가 참, 타이밍 칸의 초록 구간)에 누르면 크게, 아니면 조금 세진다. 가만두면 천천히 잦아든다.
//   (2026-11-24) E가 밀기, 일어나기는 방향키. 세기(PUMP.amp, 0~1)는 me.sa로 다른 사람에게 보내 그쪽 화면에서도 같은 크기로 흔들린다.
import { me } from '../entities/player.js';
import { sfx } from '../core/fx.js';
import { hud } from '../ui/hud.js';

export const PUMP = {amp:0, good:null, name:''};
// (2026-11-22) 세기가 클수록 빨리 왔다 갔다: 자리마다 위상을 적분한다 (주기가 바뀌어도 튀지 않게). W0 = 기본 각속도, gain = 세기 1일 때 더 빨라지는 비율
export function phaser(W0, gain, off){
  const ph = [], last = [];
  return (i, now, a = 0) => {
    if (last[i] === undefined) { ph[i] = now / 1000 * W0 + i * off; last[i] = now; }
    else if (now > last[i]) { ph[i] += Math.min(.1, (now - last[i]) / 1000) * W0 * (1 + gain * a); last[i] = now; }
    return ph[i];
  };
}
// (2026-11-24) 게이지는 공중전화와 같은 아래쪽 게이지(hud.gauge)를 쓴다: 위 칸의 호박색 구간 = 누를 때, 흰 바늘 = 지금, 아래 노란 막대 = 세기(가득 차면 시소는 몸이 뜬다).
//   밀기는 E(또는 E 버튼). 일어나기는 방향키(이동)로 한다. onFull: 세기가 가득 차면 한 번 부른다 (시소: 몸이 위로 뜬다)
const ZONE = .78;
let shown = -1;
export function pumpStart(a0, good, name, label = '엉덩이로 밀기', onFull = null){
  PUMP.amp = a0; PUMP.good = good; PUMP.name = name; PUMP.onFull = onFull;
  me.seatAct = {label, run:pump}; me.seatAlt = null; me.sa = [Math.round(a0 * 100)];
  hud.gauge(name + ' · 세기 ' + Math.round(a0 * 100) + '%', false); hud.zone(ZONE, 1 - ZONE); hud.fill(0); hud.needle(0); hud.meter(a0); shown = -1;
}
export function pumpStop(){ PUMP.good = null; PUMP.onFull = null; me.seatAct = null; me.seatAlt = null; me.sa = [0]; hud.hideGauge(); }
function pump(){
  if (!PUMP.good) return;
  const ok = PUMP.good(); PUMP.amp = Math.min(1, PUMP.amp + (ok ? .1 : .025));
  sfx(ok ? 330 : 220, ok ? 520 : 260, .08, 'triangle', .04);
  if (PUMP.amp >= 1 && PUMP.onFull) PUMP.onFull();
}
// needle: 지금 때(0~1, 1에 가까울수록 누르기 좋은 때)
export function pumpFrame(dt, needle){
  if (!PUMP.good) return;
  PUMP.amp = Math.max(.08, PUMP.amp * Math.exp(-.07 * dt)); me.sa = [Math.round(PUMP.amp * 100)];
  hud.needle(needle); hud.meter(PUMP.amp);
  const pct = Math.round(PUMP.amp * 100); if (pct !== shown) { shown = pct; hud.gaugeText(PUMP.name + ' · 세기 ' + pct + '% · 바늘이 칸에 오면 E'); }
}
