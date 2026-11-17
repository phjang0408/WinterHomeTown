// 갈 수 없는 걷는 땅 묶음 찾기: 걸을 수 있는(막히지 않은) 칸 가운데 출발점에서 닿지 않는 칸을 8단위 칸으로 센다. node reach.js
const { open, chromium } = require('./serve.js');
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:320, height:240}}); await open(p);
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  const r = await p.evaluate(() => { const W = window.__town.W;
    const S = .5, X0 = 0, Z0 = 30, NX = 1280, NZ = 640, seen = new Uint8Array(NX * NZ), up = new Uint8Array(NX * NZ), id = (x, z) => Math.round((z - Z0) / S) * NX + Math.round((x - X0) / S), q = [[212, 102, 0]]; seen[id(212, 102)] = 1;
    while (q.length) { const [x, z, y] = q.pop(); for (const [dx, dz] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const nx = x + dx, nz = z + dz, k = id(nx, nz); if (nx < 0 || nz < Z0 || nx >= 640 || nz >= Z0 + NZ * S) continue;
      const ny = W.groundY(nx, nz, y), hi = ny > 2.5 ? 1 : 0; if (hi ? up[k] : seen[k]) continue; if (W.blocked(nx, nz, ny) || Math.abs(ny - y) > .9) continue; if (hi) up[k] = 1; else seen[k] = 1; q.push([nx, nz, ny]); } }
    const cnt = {}; for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const x = X0 + i * S, z = Z0 + j * S; if (x < 6 || x > 634 || z > 341) continue; const k = j * NX + i; if (seen[k] || up[k]) continue;
      if (!W.bounds(x, z, 0) || W.blocked(x, z, W.groundY(x, z))) continue; const c = Math.floor(x / 8) * 8 + ',' + Math.floor(z / 8) * 8; cnt[c] = (cnt[c] || 0) + 1; }
    return Object.entries(cnt).filter(e => e[1] >= 6).sort((a, b) => b[1] - a[1]).slice(0, 60); });
  console.log(JSON.stringify(r)); await b.close();
})();
