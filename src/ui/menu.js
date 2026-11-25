// 메뉴 (2026-11-24): 왼쪽 위 '메뉴' 단추 또는 Esc로 연다. 탭 셋 — 서버(연결 · 주소 · 접속자와 점수), 설정(소리 · 화질), 조작법(데스크톱 · 모바일).
//   설정은 localStorage에 저장한다: wt.sound(on · off), wt.quality(core/quality.js).
//   화질은 바로 적용한다(화면 배율 · 그림자 지도 크기 · 부드러운 그림자 · LOD 거리). 계단 현상 줄이기(AA)는 모든 단계에서 켜져 있어 다시 불러올 일이 없다.
import * as THREE from '../lib/three.js';
import { renderer, sun, scene, resize, canvas } from '../core/engine.js';
import { QUALITY, PRESETS, setQuality } from '../core/quality.js';
import { audio } from '../core/fx.js';
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
function showTab(t){ tab = t;
  box.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  box.querySelectorAll('.pane').forEach(p => { p.hidden = p.dataset.pane !== t; });
  if (onOpen && !box.hidden) onOpen(t); }

// 화질 단계를 렌더러에 바로 반영한다
export function applyQuality(){
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.dpr)); resize();
  const type = QUALITY.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.type !== type) { renderer.shadowMap.type = type; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); }); }
  if (sun.shadow.mapSize.x !== QUALITY.shadow) { if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.mapSize.set(QUALITY.shadow, QUALITY.shadow); }
  W.lodScale = QUALITY.lod; W.farScale = QUALITY.far;
}
function mark(key, v){ box.querySelectorAll(`.seg[data-key=${key}] button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }
function qNote(){ const p = PRESETS[QUALITY.level];
  $('q-note').textContent = (QUALITY.choice === 'auto' ? `자동: 이 기기는 '${p.label}'. ` : '') + `화면 배율 ${p.dpr} · 그림자 ${p.shadow}. 바로 적용됩니다.`; }

export function initMenu(o = {}){
  onOpen = o.onOpen || null;
  audio.on = load('wt.sound', 'on') !== 'off';
  btn.onclick = () => (menuOpen() ? closeMenu() : openMenu());
  $('menu-close').onclick = closeMenu;
  box.querySelectorAll('[role=tab]').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
  canvas.addEventListener('pointerdown', () => { if (menuOpen()) closeMenu(); });   // 화면을 누르면 닫힌다
  box.querySelectorAll('.seg button').forEach(b => { b.onclick = () => {
    const key = b.parentElement.dataset.key, v = b.dataset.v; mark(key, v);
    if (key === 'sound') { audio.on = v === 'on'; save('wt.sound', v); }
    else if (key === 'quality') { setQuality(v); applyQuality(); qNote(); }
    else if (key === 'dev') box.querySelectorAll('.keys').forEach(t => { t.hidden = t.dataset.dev !== v; }); }; });
  mark('sound', audio.on ? 'on' : 'off'); mark('quality', QUALITY.choice); qNote();
  const dev = coarse ? 'touch' : 'pc'; mark('dev', dev); box.querySelectorAll('.keys').forEach(t => { t.hidden = t.dataset.dev !== dev; });   // 조작법: 이 기기 쪽을 먼저
  $('srv-addr').textContent = '찾는 중…';   // (2026-11-25) 연결 방식이 정해지면 main.js updateCount가 바꾼다
}
