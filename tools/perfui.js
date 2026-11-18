// 성능 창(P) 시험: 들어가서 P를 누르고 5곳 측정을 돌린 뒤 화면과 소품 집계를 남긴다. node perfui.js out.png
const { open, chromium } = require('./serve.js');
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:1280, height:760}}); await open(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  await p.evaluate(() => document.getElementById('enter').click()); await p.waitForTimeout(1500);
  await p.keyboard.press('KeyP'); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('pf-run').click()); await p.waitForFunction(() => /시점/.test(document.getElementById('pf-bench').textContent), null, {timeout:120000});
  await p.screenshot({path:process.argv[2]});
  const st = await p.evaluate(() => { const s = window.__town.W.stats; return Object.entries(s).map(([n, t]) => [n, t.n, Math.round(t.tris), Math.round(t.cast)]).sort((a, b) => b[2] - a[2]); });
  console.log(JSON.stringify(st.slice(0, 30))); console.log('total', st.reduce((a, r) => a + r[2], 0), 'cast', st.reduce((a, r) => a + r[3], 0));
  console.log(await p.evaluate(() => document.getElementById('pf-bench').textContent)); if (errs.length) console.log(errs);
  await b.close();
})();
