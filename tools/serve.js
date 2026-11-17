// 로컬 확인용: 게임 폴더를 정적으로 열고, three CDN 주소를 로컬 파일로 돌려준다.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = process.env.ROOT || '/home/claude/game';
const THREE = '/home/claude/tools/node_modules/three/build/three.module.js';
async function open(page){
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.href.includes('three@0.160.0/build/three.module.js')) return route.fulfill({path:THREE, contentType:'text/javascript'});
    if (u.hostname === 'game.local') { let p = path.join(ROOT, decodeURIComponent(u.pathname)); if (p.endsWith('/')) p += 'index.html';
      if (!fs.existsSync(p)) return route.fulfill({status:404, body:'nf'});
      const ct = p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream';
      return route.fulfill({path:p, contentType:ct}); }
    return route.abort();
  });
}
module.exports = { open, chromium };
