const { open, chromium } = require('./serve.js');
(async () => { const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const p = await b.newPage(); await open(p);
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CON', m.text()); });
  await p.goto('http://game.local/' + (process.argv[2] || 'index.html?debug&nosnow')); await p.waitForTimeout(60000); console.log('ready', await p.evaluate(() => !!window.__townReady)); await b.close(); })();
