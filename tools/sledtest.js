// 얼음 썰매 확인: 썰매장 위에서 타고, W를 누른 채 2초, D로 돌기, 벽 부딪힘
const { open, chromium } = require('./serve.js');
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:640, height:400}}); await open(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  await p.evaluate(() => { const e = document.getElementById('enter'); if (e) e.click(); }); await p.waitForTimeout(1500);
  const r0 = await p.evaluate(() => { const T = window.__town; T.me.x = 320; T.me.z = 310; const a = T.findAction(); const lab = a && a.label; if (a) a.run(); return {lab, mode:T.S.mode, x:T.me.x, z:T.me.z, slip:T.W.isSlippery(320, 310), y:T.me.y}; });
  await p.evaluate(() => { window.__town.S.keys.up = true; }); await p.waitForTimeout(2500);
  const r1 = await p.evaluate(() => { const T = window.__town; return {x:T.me.x, z:T.me.z, v:Math.hypot(T.me.vx, T.me.vz), r:T.me.r}; });
  await p.evaluate(() => { const K = window.__town.S.keys; K.up = false; K.right = true; }); await p.waitForTimeout(1500);
  const r2 = await p.evaluate(() => { const T = window.__town; T.S.keys.right = false; return {x:T.me.x, z:T.me.z, v:Math.hypot(T.me.vx, T.me.vz), r:T.me.r}; });
  await p.evaluate(() => { window.__town.S.keys.up = true; }); await p.waitForTimeout(6000);
  const r3 = await p.evaluate(() => { const T = window.__town; T.S.keys.up = false; return {x:T.me.x, z:T.me.z, v:Math.hypot(T.me.vx, T.me.vz), mode:T.S.mode}; });
  await p.screenshot({path:process.argv[2]});
  console.log(JSON.stringify({r0, r1, r2, r3, errs})); await b.close();
})();
