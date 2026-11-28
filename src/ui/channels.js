// 채널 고르기 (2026-11-27): 시작 화면과 메뉴 › 서버 탭의 [data-chans] 칸에 채널 단추(번호 · 인원)를 그린다.
//   누르면 그 채널로 옮긴다(net/index.js setChannel). 지금 채널은 강조, 가득 찬 채널은 누를 수 없다.
//   인원은 서버의 /channels 를 보이는 동안만 10초마다 다시 받는다 (보이지 않으면 묻지 않는다 → 서버 요청 아끼기).
import { net, hasChannels, setChannel, listChannels } from '../net/index.js';
import { sfx } from '../core/fx.js';

let last = null, timer = 0, busy = false, visible = () => false;

// shown(): 지금 채널 칸이 화면에 보이는지 (main.js가 시작 화면 · 메뉴 상태로 알려 준다)
export function initChannels(shown){
  visible = shown;
  document.querySelectorAll('[data-chans]').forEach(box => box.addEventListener('click', e => {
    const b = e.target.closest('button[data-ch]'); if (!b || b.disabled) return;
    const ch = +b.dataset.ch; if (ch === (net.ch || net.want)) return;
    sfx(620, 760, .1); setChannel(ch); draw();
  }));
  timer = setInterval(() => { if (visible() && !document.hidden && !net.away) refresh(); }, 10000);   // (2026-11-28) 자리 비움 중에는 묻지 않는다
}
// 지금 바로 인원을 다시 받는다 (채널 칸이 새로 보일 때 · 채널이 바뀌었을 때)
export async function refresh(){
  if (!hasChannels() || busy) { draw(); return; }
  busy = true; const o = await listChannels(); busy = false;
  if (o) last = o; draw();
}
// 서버가 알려 준 그 채널 인원 (시작 화면에 있는 사람도 센다). 모르면 0
export const chanCount = ch => { const c = last && last.list.find(x => x.ch === ch); return c ? c.n : 0; };
export function draw(){
  const on = hasChannels() && !!last;
  document.querySelectorAll('[data-chans]').forEach(box => {
    const wrap = box.closest('[data-chans-wrap]') || box; wrap.hidden = !on;
    if (!on) return;
    box.style.gridTemplateColumns = `repeat(${last.list.length}, 1fr)`;
    box.textContent = '';
    last.list.forEach(({ch, n}) => {
      // 내 채널 인원은 서버 숫자보다 화면의 실제 인원이 빠르다 (옮긴 직후 등)
      const here = ch === (net.ch || net.want), full = n >= last.cap && !here, b = document.createElement('button');
      b.dataset.ch = ch; b.type = 'button'; b.disabled = full;
      b.setAttribute('aria-pressed', String(here));
      b.setAttribute('aria-label', `${ch}채널 ${n}명${here ? ' (지금 여기)' : full ? ' (가득)' : ''}`);
      const t = document.createElement('b'), s = document.createElement('small');
      t.textContent = ch + '채널'; s.textContent = full ? '가득' : n + '명';
      b.append(t, s); box.append(b);
    });
  });
}
