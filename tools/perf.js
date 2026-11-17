// 시점 몇 곳에서 실제로 그린 횟수 · 삼각형을 잰다 (renderer.info.render). node perf.js
const { open, chromium } = require('./serve.js');
const VIEWS = {spawn:{p:[214,4,112], l:[260,2,140]}, park:{p:[300,4,128], l:[330,0,170]}, apt:{p:[120,4,200], l:[120,2,150]}, river:{p:[300,2,276], l:[380,0,300]}, station:{p:[300,3,60], l:[400,1,50]}, top:{p:[320,300,175], l:[320,0,174.9]}};
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:1280, height:760}}); await open(p);
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  await p.evaluate(() => { const e = document.getElementById('enter'); if (e) e.click(); });
  const out = {};
  for (const [k, v] of Object.entries(VIEWS)) {
    await p.evaluate(v => { window.__town.S.dbgCam = {p:v.p, l:v.l}; }, v); await p.waitForTimeout(2500);
    out[k] = await p.evaluate(() => { const r = window.__town.renderer.info.render; return [r.calls, Math.round(r.triangles / 1000) + 'k']; });
  }
  console.log(JSON.stringify(out)); await b.close();
})();
