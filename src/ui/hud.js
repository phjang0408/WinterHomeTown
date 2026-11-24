// 화면 위 UI(DOM). 놀이 모듈은 이 함수들만 불러서 화면을 바꾼다.
const $ = id => document.getElementById(id);
// (2026-11-22) '그만하기' 버튼에 어떤 키인지 붙인다 (키보드가 있는 화면만). index.html은 그대로 두고 처음 띄울 때 바꾼다
function quitLabel(){ const q = $('game-quit'); if (q.dataset.k) return; q.dataset.k = 1;
  q.style.cssText = 'background:rgba(8,9,11,.92);color:#fff;border:1px solid rgba(255,255,255,.55);font-weight:700';   // (2026-11-22) 조금 짙게
  q.innerHTML = '그만하기' + (matchMedia('(pointer:coarse)').matches ? '' : ' <kbd style="margin-left:6px;padding:0 5px;border:1px solid rgba(255,255,255,.45);font:600 11px var(--body, sans-serif);opacity:.85">Esc</kbd>'); }
// 진행 게이지의 이미 찬 부분. index.html을 건드리지 않게 처음 쓸 때 만든다.
function fillEl(){
  let f = $('gfill');
  if (!f){
    f = document.createElement('div'); f.id = 'gfill';
    f.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:#f2c51f;pointer-events:none';
    $('track').prepend(f);
  }
  return f;
}
// (2026-11-24) 둘째 칸: 같은 게이지 카드 안, 타이밍 칸 아래에 노란 채움 막대 (탈것 세기). 처음 쓸 때 만든다
function meterEl(){
  let m = $('gmeter'); if (m) return m;
  m = document.createElement('div'); m.id = 'gmeter'; m.hidden = true;
  m.style.cssText = 'position:relative;height:12px;margin-top:6px;background:rgba(255,255,255,.12)';
  m.innerHTML = '<div style="position:absolute;left:0;top:0;bottom:0;width:0;background:#f2c51f"></div>';
  $('track').after(m); return m;
}
const meterOff = () => { const m = $('gmeter'); if (m) m.hidden = true; };
// (2026-11-22 2차) 위쪽 작은 막대 판: 위 카드 대신 쓴다 (눈사람). 막대 하나 + 그 아래 그만하기 버튼. 모바일 조이스틱을 가리지 않게 화면 위에 둔다
const ESC = () => matchMedia('(pointer:coarse)').matches ? '' : ' <kbd style="margin-left:6px;padding:0 5px;border:1px solid rgba(255,255,255,.45);font:600 11px var(--body, sans-serif);opacity:.85">Esc</kbd>';
function topEl(){
  let t = $('topbar'); if (t) return t;
  t = document.createElement('div'); t.id = 'topbar'; t.hidden = true;
  t.style.cssText = 'position:fixed;left:50%;top:' + (matchMedia('(pointer:coarse)').matches ? 56 : 62) + 'px;transform:translateX(-50%);z-index:26;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none';
  // (2026-11-24) 공중전화 게이지(#gauge)와 같은 모양: 같은 카드, 가운데 13px 글, 12px 칸, 노란 채움
  t.innerHTML = '<div class="card" style="width:260px;padding:12px 14px">' +
    '<p style="margin:0 0 8px;font-size:13px;text-align:center"><span id="tb-label"></span> · <span id="tb-num"></span></p>' +
    '<div style="position:relative;height:12px;background:rgba(255,255,255,.12)"><div id="tb-fill" style="height:100%;width:0;background:#f2c51f"></div></div></div>' +
    '<button id="tb-quit" type="button" style="pointer-events:auto;cursor:pointer;padding:5px 12px;background:rgba(8,9,11,.92);color:#fff;border:1px solid rgba(255,255,255,.55);border-radius:0;font:700 12px var(--body, sans-serif)">그만하기' + ESC() + '</button>';
  document.body.appendChild(t);
  t.querySelector('#tb-quit').addEventListener('click', () => { if (hud.onTopQuit) hud.onTopQuit(); });
  return t;
}
export const hud = {
  onTopQuit:null,
  topBar(label){ const t = topEl(); t.hidden = false; hud.topSet(0, label); },
  topSet(v, label, num){ const t = topEl(); if (label !== undefined) t.querySelector('#tb-label').textContent = label; t.querySelector('#tb-num').textContent = num === undefined ? Math.round(Math.max(0, Math.min(1, v)) * 100) + '%' : num;
    t.querySelector('#tb-fill').style.width = Math.max(0, Math.min(1, v)) * 100 + '%'; },
  showGame(title, o = {}){ $('game-title').textContent = title; $('game-stat').textContent = ''; $('gauge').hidden = true; $('slam').hidden = true; fillEl().style.width = '0'; meterOff(); quitLabel(); $('game-quit').hidden = o.quit === false; $('game').hidden = false; },   // 앞 놀이의 글이 남지 않게 비운다
  stat(text){ $('game-stat').textContent = text; },
  hideGame(){ if ($('topbar')) $('topbar').hidden = true; $('game').hidden = true; $('gauge').hidden = true; $('slam').hidden = true; document.getElementById('scene').classList.remove('aim'); },
  gauge(text, withButton){ $('gauge').hidden = false; $('gauge-text').textContent = text; $('slam').hidden = !withButton; },
  zone(left, width){ $('zone').style.left = left * 100 + '%'; $('zone').style.width = width * 100 + '%'; },
  needle(v){ $('needle').style.left = v * 100 + '%'; },
  progress(v){ v = Math.max(0, Math.min(1, v)); fillEl().style.width = v * 100 + '%'; hud.needle(v); },   // 차오르는 게이지: 찬 만큼 색칠
  fill(v){ fillEl().style.width = Math.max(0, Math.min(1, v)) * 100 + '%'; },
  meter(v){ const m = meterEl(); m.hidden = false; m.firstChild.style.width = Math.max(0, Math.min(1, v)) * 100 + '%'; },   // (2026-11-24) 둘째 칸 (탈것 세기)
  gaugeText(text){ $('gauge-text').textContent = text; },
  hideGauge(){ $('gauge').hidden = true; fillEl().style.width = '0'; meterOff(); },
  aim(on){ document.getElementById('scene').classList.toggle('aim', on); },
  prompt(label, tone){ const pb = $('prompt'), k = label + '|' + (tone || ''); if (pb.dataset.l === k) return; pb.dataset.l = k; pb.hidden = !label; pb.className = tone || ''; pb.innerHTML = '<kbd>E</kbd>'; pb.append(label); },   // tone: 'food'(먹기)면 색이 바뀐다
  result(title, score, line, again){ $('res-title').textContent = title; $('res-score').textContent = score; $('res-line').textContent = line; $('result').hidden = false; hud.again = again; },
  modalOpen(){ return !$('result').hidden || !$('menu').hidden; },
  again:null,
};
