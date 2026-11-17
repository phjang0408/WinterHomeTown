// 사용법: node prev.js 출력.png files n '[{"yaw":30,"pitch":18,"o":{}}...]'
const { open, chromium } = require('./serve.js');
(async () => {
  const [out, files, n, views_] = process.argv.slice(2); const views = JSON.parse(views_ || '[{}]');
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:900, height:620}}); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message)); await open(p);
  for (let i = 0; i < views.length; i++) { const v = views[i];
    const qs = new URLSearchParams({n, files, yaw:v.yaw ?? 30, pitch:v.pitch ?? 18, dist:v.dist ?? 1, o:JSON.stringify(v.o || {})});
    await p.goto('http://game.local/dev/preview.html?' + qs); await p.waitForFunction(() => window.__galleryReady, null, {timeout:120000}).catch(() => errs.push('timeout'));
    const info = await p.evaluate(() => window.__info); console.log(n, i, JSON.stringify(info));
    await p.screenshot({path: out.replace('.png', '_' + i + '.png')}); }
  if (errs.length) console.log('ERR', errs.slice(0, 6).join('\n'));
  await b.close();
})();
