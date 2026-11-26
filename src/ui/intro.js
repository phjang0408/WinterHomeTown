// (2026-11-26) 시작 화면 '다시 뽑기' 연출: 이름이 슬롯처럼 점점 느려지며 돌다 멈추고, 색 점도 같이 돈다.
//   멈추면 옷을 갈아입고 '뿅' 튀어나오며(눌렸다 늘어나는 크기) 발밑에 눈가루, 손 흔들기.
//   움직임 줄이기 설정이면 바로 바뀐다. 도는 중에 들어가면 finishRoll()로 바로 끝낸다.
import { ADJ, NOUN, COLORS, reduceMotion } from '../config.js';
import { me, nameOf, nameMe, dressMe, rerollMe } from '../entities/player.js';
import { emote } from '../entities/character.js';
import { sfx, puff } from '../core/fx.js';
import { rnd } from '../core/util.js';

const $ = id => document.getElementById(id);
const DELAYS = [40, 40, 45, 50, 55, 62, 70, 82, 96, 115, 140, 170];   // 한 칸씩 넘어가는 간격(ms), 합 약 0.97초
let roll = null;

// ready(): 캐릭터가 만들어졌는지 (불러오는 중이면 이름만 돌린다)
export function rerollAnim(ready){
  if (roll) return;
  rerollMe();
  if (reduceMotion) { land(ready, false); return; }
  const el = $('intro-name'), dot = $('intro-dot'); let i = 0;
  $('reroll').classList.add('busy');
  roll = {ready, timer:0};
  const tick = () => {
    if (i >= DELAYS.length) { finishRoll(); return; }
    el.textContent = nameOf(rnd(ADJ.length), rnd(NOUN.length)); dot.style.background = COLORS[rnd(COLORS.length)].css;
    el.style.animationDuration = DELAYS[i] + 'ms'; restart(el, 'spin');
    sfx(1100 + i * 25, 1000, .025, 'square', .012);
    roll.timer = setTimeout(tick, DELAYS[i++]);
  };
  tick();
}
export function finishRoll(){ if (!roll) return; clearTimeout(roll.timer); const r = roll; roll = null; land(r.ready, true); }

function land(ready, loud){
  const el = $('intro-name');
  $('reroll').classList.remove('busy');
  nameMe();
  el.style.animationDuration = ''; restart(el, 'land');
  if (loud) sfx(620, 990, .14, 'triangle', .05);
  if (!ready()) return;
  dressMe(); emote(me.char, 1);
  if (!reduceMotion) { pop(me.char); puff(me.x, (me.y || 0) + .15, me.z, 12); }
}
function restart(el, cls){ el.classList.remove('spin', 'land'); void el.offsetWidth; el.classList.add(cls); }

// 눌린 채 나타나 위로 늘어났다가 제자리 (부피를 지키는 찌그러짐: 가로 = 1 / √세로)
function pop(ch){
  const t0 = performance.now(), D = 480, c1 = 2.4, c3 = c1 + 1;   // c1: 튀어 오르는 정도
  const f = now => {
    const k = Math.min(1, (now - t0) / D), b = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);   // easeOutBack
    const sy = .55 + .45 * b, sx = 1 / Math.sqrt(sy);
    ch.scale.set(sx, sy, sx);
    if (k < 1 && ch.parent) requestAnimationFrame(f); else ch.scale.set(1, 1, 1);
  };
  ch.scale.set(1.35, .55, 1.35); requestAnimationFrame(f);
}
