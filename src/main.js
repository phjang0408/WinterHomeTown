// 진입점: 맵 → 놀이 → 반복 소품 → 캐릭터 → 네트워크 순서로 준비하고 메인 루프를 돌린다.
import { onFrame, start, shadowRange, canvas } from './core/engine.js';
import { S, setMode } from './core/state.js';
import { PI, rnd } from './core/util.js';
import { audio, sfx, flash, updateFx } from './core/fx.js';
import { updateCamera, camLook } from './core/camera.js';
import { initInput, turnCamera, freeMove } from './core/input.js';
import { coarse, reduceMotion, COLORS, ADJ, NOUN } from './config.js';
import './props/basic.js';
import './props/parkBench.js';
import './props/decor.js';
import './props/buildings.js';
import './props/aptTower.js';
import './props/cars.js';
import './props/aptSite.js';
import './props/aptYard.js';
import './props/aptCenter.js';
import { W } from './world/world.js';
import { finalizeBatches, spotLabels } from './world/builders.js';
import { buildMap } from './map/index.js';
import { SPAWN } from './map/layout.js';
import { ACTS, current, findAction, stopActivity } from './activities/index.js';
import { me, dressMe, movePlayer, wave, nameOf } from './entities/player.js';
import { placeChar, emote, SIT } from './entities/character.js';
import { initFootprints, trackPrints, agePrints } from './entities/footprints.js';
import { applyPeers, updateRemotes } from './entities/remotes.js';
import { setupVehicles, updateVehicles } from './entities/vehicles.js';
import { connect, netTick, net } from './net/index.js';
import { hud } from './ui/hud.js';
import { drawMiniBase, drawMini } from './ui/minimap.js';
import { initSnow, updateSnow } from './world/snowfall.js';

const $ = id => document.getElementById(id);

function updateCount(){
  $('count').textContent = S.remotes.size + 1;
  $('net').textContent = net.online ? (S.remotes.size ? '함께 걷는 중' : '동네에 연결됨') : '혼자 걷는 중';
  if (!$('roster').hidden) fillRoster();
}
function fillRoster(){
  const scored = ACTS.filter(a => a.score).sort((a, b) => a.score.index - b.score.index);
  $('roster-head').innerHTML = '<th>이름</th>' + scored.map(a => '<th>' + a.score.label + '</th>').join('');
  const rows = [{name:nameOf(me.a, me.n) + ' (나)', c:COLORS[me.ci].css, sc:me.sc}];
  S.remotes.forEach(R => rows.push({name:nameOf(R.a, R.n), c:COLORS[Math.max(0, R.ci)].css, sc:R.sc}));
  const tb = $('roster-body'); tb.textContent = '';
  rows.forEach(r => { const tr = document.createElement('tr'), td = document.createElement('td'), dot = document.createElement('i');
    dot.style.background = r.c; td.append(dot, r.name); tr.append(td);
    scored.forEach(a => { const v = r.sc[a.score.index], c = document.createElement('td'); c.textContent = v ? v + a.score.unit : '-'; tr.append(c); });
    tb.append(tr); });
}
function enter(){
  if (S.mode !== 'intro') return;
  setMode('walk'); me.x = SPAWN.x0 + Math.random() * (SPAWN.x1 - SPAWN.x0); me.z = SPAWN.z; me.r = 0; S.cam.yaw = PI; S.cam.pitch = .38; me.char.visible = true;
  shadowRange(75);
  $('intro').hidden = true; ['top','mini','help','dock'].forEach(id => $(id).hidden = false); sfx(392, 588, .3, 'triangle'); canvas.focus();
  if (coarse) flash('왼쪽을 끌어 이동');
}
function doWave(){ if (wave()) { emote(me.char, 1); sfx(620, 760, .1); } }
function bindUi(){
  $('enter').onclick = enter;
  $('reroll').onclick = () => { me.a = rnd(ADJ.length); me.n = rnd(NOUN.length); me.ci = (me.ci + 1 + rnd(COLORS.length - 1)) % COLORS.length; dressMe(); };
  $('roster-btn').onclick = () => { fillRoster(); $('roster').hidden = false; };
  $('roster-close').onclick = () => { $('roster').hidden = true; };
  $('res-close').onclick = () => { $('result').hidden = true; };
  $('res-again').onclick = () => { $('result').hidden = true; if (S.mode === 'walk' && hud.again) hud.again(); };
  $('game-quit').onclick = stopActivity; $('slam').onclick = () => current() && current().onAction && current().onAction();
  $('prompt').onclick = () => { const a = findAction(); if (a) a.run(); };
  $('wave').onclick = doWave;
  $('snd').onclick = () => { audio.on = !audio.on; $('snd').textContent = audio.on ? '소리 켬' : '소리 끔'; $('snd').setAttribute('aria-pressed', audio.on); };
  initInput({onEnter:enter, onWave:doWave, onEscape:() => {
    if (!$('result').hidden) { $('result').hidden = true; return true; }
    if (!$('roster').hidden) { $('roster').hidden = true; return true; }
    return false; }});
}

let miniTick = 0;
function frame(dt, now){
  updateFx(dt, now);
  turnCamera(dt);
  const a = current();
  let moved = 0;
  if (a && a.update) moved = a.update(dt, now);
  else if (S.mode !== 'intro' && freeMove()) moved = movePlayer(dt, (a && a.speedMul) || 1);
  if (S.mode !== 'intro') { placeChar(me, me.char, dt, moved, now); if (moved > 0 && !SIT.has(me.st)) trackPrints(me, moved, now); }
  updateRemotes(dt, now);
  for (const x of ACTS) if (x.frame) x.frame(dt, now, moved);
  updateVehicles(dt); W.updateAnimated(dt, now); agePrints(now);
  updateSnow(dt, now, camLook);
  const hide = !!(current() && current().hideLabels);
  spotLabels.forEach((s, i) => { s.visible = !hide; if (!reduceMotion) s.position.y = s.userData.y + Math.sin(now / 600 + i) * .15; });
  const act = findAction(); hud.prompt(act ? act.label : '');
  updateCamera(dt, now); netTick(now);
  if (S.mode !== 'intro' && ++miniTick % 6 === 0) drawMini();
}

async function boot(){
  try { if (document.fonts && document.fonts.load) await Promise.race([Promise.all([document.fonts.load('32px "Jua"', '겨울'), document.fonts.load('16px "Gowun Dodum"', '겨울')]), new Promise(r => setTimeout(r, 1800))]); } catch (e) {}
  buildMap();
  ACTS.forEach(a => a.setup && a.setup());
  setupVehicles();
  finalizeBatches();
  initFootprints(); initSnow();
  dressMe(); drawMiniBase(); bindUi();
  onFrame(frame);
  start();
  window.__townReady = true;
  connect({onPeers:list => { applyPeers(list); updateCount(); }, onStatus:updateCount});
}
boot();
