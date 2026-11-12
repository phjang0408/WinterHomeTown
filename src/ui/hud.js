// 화면 위 UI(DOM). 놀이 모듈은 이 함수들만 불러서 화면을 바꾼다.
const $ = id => document.getElementById(id);
export const hud = {
  showGame(title){ $('game-title').textContent = title; $('game').hidden = false; },
  stat(text){ $('game-stat').textContent = text; },
  hideGame(){ $('game').hidden = true; $('gauge').hidden = true; $('slam').hidden = true; document.getElementById('scene').classList.remove('aim'); },
  gauge(text, withButton){ $('gauge').hidden = false; $('gauge-text').textContent = text; $('slam').hidden = !withButton; },
  zone(left, width){ $('zone').style.left = left * 100 + '%'; $('zone').style.width = width * 100 + '%'; },
  needle(v){ $('needle').style.left = v * 100 + '%'; },
  aim(on){ document.getElementById('scene').classList.toggle('aim', on); },
  prompt(label){ const pb = $('prompt'); if (pb.dataset.l === label) return; pb.dataset.l = label; pb.hidden = !label; pb.innerHTML = '<kbd>E</kbd>'; pb.append(label); },
  result(title, score, line, again){ $('res-title').textContent = title; $('res-score').textContent = score; $('res-line').textContent = line; $('result').hidden = false; hud.again = again; },
  modalOpen(){ return !$('result').hidden || !$('roster').hidden; },
  again:null,
};
