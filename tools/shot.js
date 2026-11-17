// 사용법: node shot.js <페이지> <출력> [카메라 JSON 목록]
// 카메라: {p:[x,y,z], l:[x,y,z], w, h, name}. 게임은 ?debug 로 열어 __town.S.dbgCam을 쓴다.
const { open, chromium } = require('./serve.js');
(async () => {
  const [page_, out, cams_] = process.argv.slice(2); const cams = cams_ ? JSON.parse(cams_) : [null];
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:1280, height:760}});
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await open(p);
  await p.goto('http://game.local/' + page_, {waitUntil:'load'});
  await p.waitForFunction(() => window.__townReady || window.__galleryReady, null, {timeout:180000}).catch(e => errs.push('timeout ready'));
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const e = document.getElementById('enter'); if (e) e.click(); });
  await p.waitForTimeout(800);
  for (let i = 0; i < cams.length; i++) {
    const c = cams[i];
    if (c) { if (c.w) await p.setViewportSize({width:c.w, height:c.h}); await p.evaluate(c => { const T = window.__town; if (T) { T.S.dbgCam = {p:c.p, l:c.l, fov:c.fov}; if (c.me) { T.me.x = c.me[0]; T.me.z = c.me[1]; } } }, c); await p.waitForTimeout(c.wait || 2500); }
    await p.screenshot({timeout:180000, path: out.replace('.png', (cams.length > 1 ? '_' + (c && c.name || i) : '') + '.png')});
  }
  const info = await p.evaluate(() => { const T = window.__town; if (!T) return null; let tris = 0, draws = 0; return {calls: window.__lastInfo || null}; });
  console.log(JSON.stringify({errs: errs.slice(0, 15), n: errs.length}));
  await b.close();
})();
