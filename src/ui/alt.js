// R 버튼 (2026-11-20 4차): 두 번째 동작(엉덩이로 밀기 · 연 돌려주기 등)이 있을 때만 화면 오른쪽 아래(손 흔들기 위)에 뜬다.
// PC는 R 키, 모바일 · 마우스는 이 버튼을 누른다. 매 프레임 registry.findAlt()로 이름을 맞춘다.
import { findAlt, doAlt } from '../activities/registry.js';

let el = null, last = '';
function make(){
  el = document.createElement('button'); el.id = 'altbtn'; el.type = 'button'; el.hidden = true;
  el.style.cssText = 'position:fixed;right:14px;bottom:' + (matchMedia('(pointer:coarse)').matches ? 132 : 128) + 'px;z-index:30;border:1px solid rgba(255,255,255,.2);border-left:4px solid #e3a53b;border-radius:0;padding:10px 16px 10px 10px;' +
    'background:rgba(16,18,20,.86);color:#eceae4;font:600 15px var(--body, sans-serif);display:flex;align-items:center;gap:10px;cursor:pointer;touch-action:manipulation';
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); doAlt(); el.animate([{transform:'scale(.92)'}, {transform:'scale(1)'}], {duration:140}); });
  document.body.appendChild(el);
}
export function updateAlt(){
  if (!el) make();
  const f = findAlt(), t = f ? f.label : '';
  if (t === last) return; last = t; el.hidden = !f;
  if (f) el.innerHTML = '<span style="border:1px solid #e3a53b;color:#e3a53b;padding:0 7px;font:700 14px var(--display, sans-serif)">R</span>' + t;
}
