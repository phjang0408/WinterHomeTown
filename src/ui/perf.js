// 성능 창 (2026-11-18): P 키로 켜고 끈다. 실제 기기(GPU)에서 프레임 속도 · 프레임 시간 · GPU 시간 · 그리기 횟수 · 삼각형을 본다.
//   - FPS · 프레임 간격: requestAnimationFrame 간격. 모니터 주사율(60 · 144Hz)에서 멈추므로, 여유는 CPU · GPU ms로 본다 (60Hz 예산 16.7ms)
//   - CPU ms: 한 프레임 동안 게임 코드 + 그리기 명령에 쓴 시간 (engine.frameStats)
//   - GPU ms: EXT_disjoint_timer_query_webgl2로 잰 실제 GPU 그리기 시간 (그림자 패스 포함). 확장이 없는 브라우저는 '측정 불가'
//   - 그리기 · 삼각형: renderer.info (그림자 패스 포함)
//   - '5곳 측정': 고정 시점 5곳(perf.js와 같은 자리)을 4초씩 돌며 평균을 표로 만들고 복사할 수 있다
import { renderer, frameStats } from '../core/engine.js';
import { S } from '../core/state.js';
import { W } from '../world/world.js';

const VIEWS = {시작:{p:[214, 4, 112], l:[260, 2, 140]}, 공원:{p:[300, 4, 128], l:[330, 0, 170]}, 아파트:{p:[120, 4, 200], l:[120, 2, 150]}, 강변:{p:[300, 2, 276], l:[380, 0, 300]}, 간이역:{p:[300, 3, 60], l:[400, 1, 50]}};
const gl = renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
const pending = [], frames = [], gpus = [], cpus = []; let on = false, box = null, last = 0, bench = null;

// 그리기를 감싸 GPU 시간을 잰다 (켜져 있을 때만)
const render = renderer.render.bind(renderer);
renderer.render = (sc, cam) => {
  if (!on || !ext || pending.length > 6) return render(sc, cam);
  const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); render(sc, cam); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q); };
function pollGpu(){
  const disjoint = ext && gl.getParameter(ext.GPU_DISJOINT_EXT);
  while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) { const q = pending.shift();
    if (!disjoint) gpus.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q); }
}
const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0, keep = (a, n) => { while (a.length > n) a.shift(); };
const p95 = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * .95))]; };

function ui(){
  box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:16px;top:64px;z-index:9;font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;background:rgba(20,30,40,.86);color:#e8eef3;padding:10px 12px;border-radius:10px;min-width:250px;max-width:min(460px,calc(100% - 32px));pointer-events:auto';
  box.innerHTML = '<div id="pf-live"></div><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button id="pf-run">5곳 측정</button><button id="pf-copy">결과 복사</button></div><div id="pf-bench" style="margin-top:6px;white-space:pre"></div><div id="pf-top" style="margin-top:8px;color:#b9c7d3;white-space:pre"></div>';
  box.querySelectorAll('button').forEach(b => b.style.cssText = 'font:inherit;background:#2f7f8c;color:#fff;border:0;border-radius:6px;padding:4px 9px;cursor:pointer');
  document.body.append(box);
  box.querySelector('#pf-run').onclick = runBench;
  box.querySelector('#pf-copy').onclick = () => { const t = box.querySelector('#pf-bench').textContent; if (t) navigator.clipboard.writeText(t).catch(() => {}); };
  // 놓인 소품 중 삼각형을 많이 쓰는 순 (놓인 전체 기준, 화면에 보이는 양과는 다르다)
  const top = Object.entries(W.stats).sort((a, b) => b[1].tris - a[1].tris).slice(0, 10);
  box.querySelector('#pf-top').textContent = '놓인 소품 삼각형 상위 10 (전체 · 개수)\n' + top.map(([n, t]) => n.padEnd(16) + String(Math.round(t.tris / 1000) + 'k').padStart(7) + ' · ' + t.n).join('\n');
}
function live(){
  const r = renderer.info.render, f = avg(frames), pr = renderer.getPixelRatio(), c = renderer.domElement;
  box.querySelector('#pf-live').innerHTML = `<b>FPS ${f ? (1000 / f).toFixed(0) : '-'}</b> · 프레임 ${f.toFixed(1)}ms (느린 5% ${p95(frames).toFixed(1)})<br>`
    + `CPU ${avg(cpus).toFixed(1)}ms · GPU ${ext ? avg(gpus).toFixed(1) + 'ms' : '측정 불가'}<br>그리기 ${r.calls} · 삼각형 ${(r.triangles / 1e4).toFixed(0)}만<br>`
    + `화면 ${c.width}×${c.height} (배율 ${pr}) · 그림자 ${renderer.shadowMap.enabled ? '켬' : '끔'}`;
}
// 고정 시점을 돌며 잰다: 시점마다 1초 기다린 뒤 3초 동안 모은다
async function runBench(){
  if (bench) return; bench = []; const out = box.querySelector('#pf-bench'), wait = ms => new Promise(r => setTimeout(r, ms));
  for (const [name, v] of Object.entries(VIEWS)) {
    S.dbgCam = {p:v.p, l:v.l}; out.textContent = name + ' 재는 중...'; await wait(1000);
    frames.length = gpus.length = cpus.length = 0; await wait(3000);
    const r = renderer.info.render; bench.push([name, 1000 / avg(frames), avg(frames), p95(frames), avg(cpus), ext ? avg(gpus) : NaN, r.calls, r.triangles]); }
  S.dbgCam = null;
  const ua = navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/g), dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?', c = renderer.domElement;
  out.textContent = `GPU: ${gpu}\n브라우저: ${(ua || ['?']).join(' ')} · 화면 ${c.width}×${c.height}\n시점    FPS  프레임ms 느린5%  CPUms  GPUms  그리기  삼각형\n`
    + bench.map(([n, fps, f, p, cpu, g, calls, tris]) => n.padEnd(4, '　') + fps.toFixed(0).padStart(6) + f.toFixed(1).padStart(8) + p.toFixed(1).padStart(7) + cpu.toFixed(1).padStart(7) + (isNaN(g) ? '     -' : g.toFixed(1).padStart(7)) + String(calls).padStart(7) + ((tris / 1e4).toFixed(0) + '만').padStart(7)).join('\n');
  console.log(out.textContent); bench = null;
}
export function initPerf(){
  window.addEventListener('keydown', e => { if (e.code !== 'KeyP' || e.repeat) return; on = !on; if (on && !box) ui(); if (box) box.style.display = on ? '' : 'none'; });
  let prev = 0;
  return (dt, now) => {
    if (prev) { frames.push(now - prev); keep(frames, 240); } prev = now;
    if (!on) return;
    cpus.push(frameStats.cpu); keep(cpus, 240); if (ext) { pollGpu(); keep(gpus, 240); }
    if (now - last > 250) { last = now; live(); }
  };
}
