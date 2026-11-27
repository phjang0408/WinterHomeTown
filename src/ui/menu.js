// 메뉴 (2026-11-24): 왼쪽 위 '메뉴' 단추 또는 Esc로 연다. 탭 넷 — 서버(연결 · 주소 · 접속자와 점수), 설정(배경음 · 효과음 · 시점 감도 · 화질 · 절전), 조작법(데스크톱 · 모바일), 정보(의견 보내기 · 후원, ui/links.js).
//   설정은 localStorage에 저장한다: wt.bgm(배경음 0~100), wt.vol(효과음 0~100, 예전 wt.sound off는 0), wt.sensMouse · wt.sensTouch(50~200, 기기 종류별), wt.quality(core/quality.js), wt.saver(on · off, core/saver.js).
//   화질은 바로 적용한다(화면 배율 · 그림자 지도 크기 · 부드러운 그림자 · LOD 거리). 계단 현상 줄이기(AA)는 모든 단계에서 켜져 있어 다시 불러올 일이 없다.
import * as THREE from '../lib/three.js';
import { renderer, sun, scene, resize, canvas } from '../core/engine.js';
import { QUALITY, PRESETS, setQuality } from '../core/quality.js';
import '../core/post.js';   // (2026-11-26) 필름 효과는 '약'으로 고정 (설정에서 바꾸지 않는다)
import { audio, sfx } from '../core/fx.js';
import { S } from '../core/state.js';
import { SAVER, applySaver } from '../core/saver.js';
import { setBgmVolume } from '../core/music.js';
import { drawQRs } from './links.js';
import { NET } from '../config.js';
import { W } from '../world/world.js';
import { coarse } from '../config.js';

const $ = id => document.getElementById(id), box = $('menu'), btn = $('menu-btn');
const load = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
let onOpen = null, tab = 'server';

export const menuOpen = () => !box.hidden;
export function openMenu(t){ if (t) showTab(t); box.hidden = false; btn.setAttribute('aria-expanded', 'true'); if (onOpen) onOpen(tab); }
export function closeMenu(){ box.hidden = true; btn.setAttribute('aria-expanded', 'false'); canvas.focus(); }
export const menuTab = () => tab;
function showTab(t){ tab = t; if (t === 'info') drawQRs(box);   // (2026-11-26) 정보 탭: 처음 열 때 후원 QR을 그린다
  box.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  box.querySelectorAll('.pane').forEach(p => { p.hidden = p.dataset.pane !== t; });
  if (onOpen && !box.hidden) onOpen(t); }

// 화질 단계를 렌더러에 바로 반영한다
export function applyQuality(){
  const type = QUALITY.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.type !== type) { renderer.shadowMap.type = type; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); }); }
  if (sun.shadow.mapSize.x !== QUALITY.shadow) { if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.mapSize.set(QUALITY.shadow, QUALITY.shadow); }
  W.lodScale = QUALITY.lod; W.farScale = QUALITY.far;
  applySaver();   // (2026-11-26) 화면 배율은 절전과 함께 정한다 (절전이면 1)
}
function mark(key, v){ box.querySelectorAll(`.seg[data-key=${key}] button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }
function qNote(){ const p = PRESETS[QUALITY.level]; if (!$('q-note')) return;   // (2026-11-26) 설정 밑 설명 글은 뺐다 (사용자 요청). 다시 넣으면 그대로 채운다
  $('q-note').textContent = (QUALITY.choice === 'auto' ? `자동: 이 기기는 '${p.label}'. ` : '') + (SAVER.on ? '절전 중: 화면 배율 1 · 그림자 끔.' : `화면 배율 ${p.dpr} · 그림자 ${p.shadow}. 바로 적용됩니다.`); }
// (2026-11-26) 4단계: 막대(음량 · 시점 감도). 끌 때 바로 바뀌고, 놓을 때 저장한다
const SENS_KEY = coarse ? 'wt.sensTouch' : 'wt.sensMouse';
function slider(id, value, show, onSave){ const el = $(id), out = $(id + '-v'); el.value = value; show(+el.value, out);
  el.oninput = () => show(+el.value, out); el.onchange = () => onSave(el.value); }

export function initMenu(o = {}){
  onOpen = o.onOpen || null;
  let vol = +load('wt.vol', load('wt.sound', 'on') === 'off' ? '0' : '80'); if (!(vol >= 0 && vol <= 100)) vol = 80;
  slider('set-vol', vol, (v, out) => { audio.vol = v / 100; audio.on = v > 0; out.textContent = v ? v + '%' : '끔'; }, v => { save('wt.vol', v); sfx(620, 760, .1); });
  // (2026-11-26) 배경음(core/music.js) 0~100, 기본 50
  let bgm = +load('wt.bgm', '50'); if (!(bgm >= 0 && bgm <= 100)) bgm = 50;
  slider('set-bgm', bgm, (v, out) => { setBgmVolume(v / 100); out.textContent = v ? v + '%' : '끔'; }, v => save('wt.bgm', v));
  let sens = +load(SENS_KEY, '100'); if (!(sens >= 50 && sens <= 200)) sens = 100;
  slider('set-sens', sens, (v, out) => { S.sens = v / 100; out.textContent = v + '%'; }, v => save(SENS_KEY, v));
  SAVER.on = load('wt.saver', 'off') === 'on'; applySaver();
  btn.onclick = () => (menuOpen() ? closeMenu() : openMenu());
  $('menu-close').onclick = closeMenu;
  box.querySelectorAll('[role=tab]').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
  canvas.addEventListener('pointerdown', () => { if (menuOpen()) closeMenu(); });   // 화면을 누르면 닫힌다
  box.querySelectorAll('.seg button').forEach(b => { b.onclick = () => {
    const key = b.parentElement.dataset.key, v = b.dataset.v; mark(key, v);
    if (key === 'saver') { SAVER.on = v === 'on'; save('wt.saver', v); applySaver(); qNote(); }
    else if (key === 'quality') { setQuality(v); applyQuality(); qNote(); }
    else if (key === 'dev') box.querySelectorAll('.keys').forEach(t => { t.hidden = t.dataset.dev !== v; }); }; });
  mark('saver', SAVER.on ? 'on' : 'off'); mark('quality', QUALITY.choice); qNote();
  const dev = coarse ? 'touch' : 'pc'; mark('dev', dev); box.querySelectorAll('.keys').forEach(t => { t.hidden = t.dataset.dev !== dev; });   // 조작법: 이 기기 쪽을 먼저
  $('srv-addr').textContent = '찾는 중…';   // (2026-11-25) 연결 방식이 정해지면 main.js updateCount가 바꾼다
}
