// 걷기 검사: 시작점에서 갈 수 있는 칸을 0.5단위 격자로 넓혀 가며, 주요 지점에 닿는지 본다. 높이 차가 큰 칸(> 0.9)은 넘지 못한다고 본다.
const { open, chromium } = require('./serve.js');
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:400, height:300}}); await open(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  const r = await p.evaluate(() => { const W = window.__town.W, S = .5, X0 = 0, Z0 = 20, NX = 1280, NZ = 650, seen = new Uint8Array(NX * NZ), q = [];
    const id = (x, z) => Math.round((z - Z0) / S) * NX + Math.round((x - X0) / S), up = new Uint8Array(NX * NZ);   // up: 높은 층(육교 위)으로 지나간 칸
    const start = [212, 102, 0]; q.push(start); seen[id(start[0], start[1])] = 1;
    while (q.length) { const [x, z, y] = q.pop();
      for (const [dx, dz] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const nx = x + dx, nz = z + dz, k = id(nx, nz); if (nx < 0 || nz < Z0 || nx >= 640 || nz >= Z0 + NZ * S) continue;
        const ny = W.groundY(nx, nz, y), hi = ny > 2.5 ? 1 : 0; if (hi ? up[k] : seen[k]) continue;
        if (W.blocked(nx, nz, ny) || Math.abs(ny - y) > .9) continue; if (hi) up[k] = 1; else seen[k] = 1; q.push([nx, nz, ny]); } }
    for (let i = 0; i < seen.length; i++) if (up[i]) seen[i] = seen[i] || 2;
    const P = {platform:[275, 50.5], bridgeTop:[230.5, 80], dockTop:[300, 63], gravelW:[100, 60], parkCenter:[320, 170], aptPlay:[80, 170], aptCenter:[150, 156], riverPath:[400, 315], waterPath:[300, 334], sled:[341, 314.5],
      NO_school:[530, 200], targetLine:[75, 324], southShops:[314, 227], northShopTerrace:[323, 109], stationSignPlaza:[226, 60], ttakji:[417.1, 168.4], underBridge:[230.5, 92], underBridge2:[409.5, 92], bridge2Top:[409.5, 80], platEast:[440, 50.5], riverRoad:[300, 264], riverSide:[300, 277.5], NO_gv1West:[150, 60], NO_gv2East:[500, 60], eastFrontN:[418, 145], eastFrontS:[418, 195], eastBackWalk:[436, 170], NO_inTower:[428, 151], NO_inShop:[427, 171],
      NO_road:[300, 84], NO_aptWest:[10, 170], NO_aptNorth:[100, 92]};
    const out = {}; for (const [k, [x, z]] of Object.entries(P)) out[k] = !!seen[id(x, z)]; return out; });
  console.log(JSON.stringify(r)); if (errs.length) console.log(errs.slice(0, 3));
  await b.close();
})();
