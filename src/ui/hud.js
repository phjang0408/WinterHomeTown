// 화면 위 UI(DOM). 놀이 모듈은 이 함수들만 불러서 화면을 바꾼다.
const $ = id => document.getElementById(id);
// 진행 게이지의 이미 찬 부분. index.html을 건드리지 않게 처음 쓸 때 만든다.
function fillEl(){
  let f = $('gfill');
  if (!f){
    f = document.createElement('div'); f.id = 'gfill';
    f.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,rgba(227,165,59,.55),rgba(240,190,90,.95));pointer-events:none';
    $('track').prepend(f);
  }
  return f;
}
export const hud = {
  showGame(title){ $('game-title').textContent = title; $('game-stat').textContent = ''; $('gauge').hidden = true; $('slam').hidden = true; fillEl().style.width = '0'; $('game').hidden = false; },   // 앞 놀이의 글이 남지 않게 비운다
  stat(text){ $('game-stat').textContent = text; },
  hideGame(){ $('game').hidden = true; $('gauge').hidden = true; $('slam').hidden = true; document.getElementById('scene').classList.remove('aim'); },
  gauge(text, withButton){ $('gauge').hidden = false; $('gauge-text').textContent = text; $('slam').hidden = !withButton; },
  zone(left, width){ $('zone').style.left = left * 100 + '%'; $('zone').style.width = width * 100 + '%'; },
  needle(v){ $('needle').style.left = v * 100 + '%'; },
  progress(v){ v = Math.max(0, Math.min(1, v)); fillEl().style.width = v * 100 + '%'; hud.needle(v); },   // 차오르는 게이지: 찬 만큼 색칠
  aim(on){ document.getElementById('scene').classList.toggle('aim', on); },
  prompt(label, tone){ const pb = $('prompt'), k = label + '|' + (tone || ''); if (pb.dataset.l === k) return; pb.dataset.l = k; pb.hidden = !label; pb.className = tone || ''; pb.innerHTML = '<kbd>E</kbd>'; pb.append(label); },   // tone: 'food'(먹기)면 색이 바뀐다
  result(title, score, line, again){ $('res-title').textContent = title; $('res-score').textContent = score; $('res-line').textContent = line; $('result').hidden = false; hud.again = again; },
  modalOpen(){ return !$('result').hidden || !$('roster').hidden; },
  again:null,
};
