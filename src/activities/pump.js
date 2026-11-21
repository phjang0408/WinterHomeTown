// 타는 놀이기구의 '엉덩이로 밀기' 게이지 (2026-11-20 4차: 따로 된 화면 UI + R 버튼): 그네 · 흔들 오리.
//   (2026-11-21: 설명 글 없이 작게) R(또는 화면의 R 버튼)을 알맞은 때(good()가 참, 타이밍 칸의 초록 구간)에 누르면 크게, 아니면 조금 세진다. 가만두면 천천히 잦아든다.
//   E는 그대로 '일어나기'. 세기(PUMP.amp, 0~1)는 me.sa로 다른 사람에게 보내 그쪽 화면에서도 같은 크기로 흔들린다.
import { me } from '../entities/player.js';
import { sfx } from '../core/fx.js';

export const PUMP = {amp:0, good:null, name:''};
let ui = null;
function makeUI(){
  ui = document.createElement('div'); ui.id = 'pumpui'; ui.hidden = true;
  ui.style.cssText = 'position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:25;width:170px;padding:10px 12px;border-radius:0;' +
    'background:rgba(16,18,20,.8);border:1px solid rgba(255,255,255,.2);border-top:2px solid #e3a53b;font:600 12px var(--body, sans-serif);color:#eceae4';
  ui.innerHTML = '<div id="pu-title" style="font:700 14px var(--body, sans-serif);letter-spacing:.03em;margin-bottom:7px"></div>' +
    '<div style="height:8px;background:rgba(255,255,255,.12);margin-bottom:8px"><div id="pu-amp" style="height:100%;width:0;background:#e3a53b"></div></div>' +
    '<div style="position:relative;height:8px;background:rgba(255,255,255,.12)"><div style="position:absolute;right:0;top:0;bottom:0;width:22%;background:rgba(127,194,142,.7)"></div>' +
    '<div id="pu-needle" style="position:absolute;top:-3px;bottom:-3px;width:3px;margin-left:-1.5px;background:#fff;left:0"></div></div>';
  document.body.appendChild(ui);
}
export function pumpStart(a0, good, name, hint){
  if (!ui) makeUI();
  PUMP.amp = a0; PUMP.good = good; PUMP.name = name;
  me.seatAlt = {label:'엉덩이로 밀기', run:pump}; me.sa = [Math.round(a0 * 100)];
  ui.querySelector('#pu-title').textContent = name + ' 타는 중';
  ui.hidden = false;
}
export function pumpStop(){ PUMP.good = null; me.seatAlt = null; me.sa = [0]; if (ui) ui.hidden = true; }
function pump(){
  if (!PUMP.good) return;
  const ok = PUMP.good(); PUMP.amp = Math.min(1, PUMP.amp + (ok ? .1 : .025));
  sfx(ok ? 330 : 220, ok ? 520 : 260, .08, 'triangle', .04);
  if (ui) ui.querySelector('#pu-amp').animate([{filter:'brightness(1.4)'}, {filter:'none'}], {duration:220});
}
// needle: 지금 때(0~1, 1에 가까울수록 누르기 좋은 때)
export function pumpFrame(dt, needle){
  if (!PUMP.good || !ui) return;
  PUMP.amp = Math.max(.08, PUMP.amp * Math.exp(-.07 * dt)); me.sa = [Math.round(PUMP.amp * 100)];
  ui.querySelector('#pu-amp').style.width = Math.round(PUMP.amp * 100) + '%';
  ui.querySelector('#pu-needle').style.left = (needle * 100).toFixed(1) + '%';
}
