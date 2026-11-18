const { open, chromium } = require('./serve.js');
(async () => { const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const p = await b.newPage({viewport:{width:1100, height:700}}); await open(p);
  await p.goto('http://game.local/index.html' + (process.argv[3] || '')); await p.waitForFunction(() => window.__townReady || document.querySelector('#enter'), null, {timeout:240000}); await p.waitForTimeout(8000);
  await p.screenshot({timeout:180000, path:process.argv[2]}); console.log('ok'); await b.close(); })();
