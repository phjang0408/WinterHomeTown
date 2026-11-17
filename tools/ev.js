// 게임을 열고 식 하나를 평가해 JSON으로 출력한다: node ev.js "식" (window.__town 사용)
const { open, chromium } = require('./serve.js');
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:400, height:300}}); await open(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  const r = await p.evaluate(new Function('return (' + process.argv[2] + ')'));
  console.log(JSON.stringify(r)); if (errs.length) console.log(errs.slice(0, 3)); await b.close();
})();
