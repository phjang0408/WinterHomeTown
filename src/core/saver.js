// 절전 (2026-11-26, 4단계): 폰이 뜨겁거나 배터리를 아낄 때. 메뉴 설정 '절전'(localStorage wt.saver).
//   - 초당 30번만 그린다 (engine.js FRAME.cap). 걷는 중 2.5초 넘게 입력도 움직임도 없으면 20번.
//     20보다 낮추면 한 프레임 시간이 0.05초(engine.js dt 상한)를 넘어 움직임이 느려지므로 20이 바닥이다.
//   - 화면 배율 1, 그림자 끔(해 castShadow), 필름 효과 끔(post.js FILM). 그림자를 켜고 끌 때는 셰이더를 다시 지어 한 번 멈칫한다.
import { renderer, sun, resize, FRAME } from './engine.js';
import { FILM } from './post.js';
import { QUALITY } from './quality.js';
import { S } from './state.js';

export const SAVER = {on:false};
let lastInput = performance.now();
['keydown', 'pointerdown', 'pointermove', 'wheel'].forEach(ev => window.addEventListener(ev, () => { lastInput = performance.now(); }, {passive:true}));

// 화질 단계(quality.js)와 절전을 함께 렌더러에 반영한다 (메뉴 applyQuality도 이걸 부른다)
export function applySaver(){
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SAVER.on ? 1 : QUALITY.dpr)); resize();
  sun.castShadow = !SAVER.on; FILM.on = !SAVER.on;
  if (!SAVER.on) FRAME.cap = 0;
}
// 매 프레임 (main.js): 가만히 있으면 더 아낀다. 놀이 중 · 시작 화면은 30 그대로
export function saverFrame(now, moved){
  if (!SAVER.on) return;
  const idle = S.mode === 'walk' && !moved && !S.joy && now - lastInput > 2500 && !Object.values(S.keys).some(Boolean);
  FRAME.cap = idle ? 20 : 30;
}
