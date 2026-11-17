// 바닥 검수: 겹침(같은 높이 다른 재질), 도로 안 경계석, 덮이지 않은 걷는 땅, 갈 수 없는 보도 조각. node audit.js
const { open, chromium } = require('./serve.js');
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:320, height:240}}); await open(p);
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  const r = await p.evaluate(async () => {
    const B = await import('/src/map/base.js'), W = window.__town.W, REG = B.REGIONS, CURBS = B.CURBS;
    const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const R = REG.map(g => ({k:g[0], r:[g[1], g[2], g[3], g[4]], y:g[5]}));
    const zf = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], c = R[j]; if (Math.abs(a.y - c.y) > .04) continue; const o = ov(a.r, c.r); if (o > .05 && !(a.k === c.k && a.y === c.y)) zf.push([a.k, c.k, a.y, c.y, +o.toFixed(2), a.r.map(v => +v.toFixed(1)), c.r.map(v => +v.toFixed(1))]); }
    const roads = R.filter(g => g.k === 'asphalt' || g.k === 'zone');
    const cin = []; CURBS.forEach(c => { const a = (c[2] - c[0]) * (c[3] - c[1]); if (a <= 0) return; let o = 0; roads.forEach(g => o += ov(c, g.r)); if (o > a * .3 && (c[5] || 0) === 0) cin.push(c.slice(0, 5).map(v => +v.toFixed(2))); });
    const cov = (x, z) => R.some(g => x >= g.r[0] && x <= g.r[2] && z >= g.r[1] && z <= g.r[3]) || (x > 13 && x < 186 && z > 93 && z < 246) || (x >= 186 && x <= 195 && ((z >= 131 && z <= 139) || (z >= 198 && z <= 206)));   // 단지 바닥 · 정문 · 후문 차 길은 apartments.js가 따로 그린다
    const holes = {}; for (let x = 6.5; x < 634; x += 1) for (let z = 31.5; z < 341; z += 1) { if (!W.bounds(x, z, 0) || W.blocked(x, z, 0)) continue; const gy = W.groundY(x, z); if (Math.abs(gy) > .01) continue; if (!cov(x, z)) { const k = Math.floor(x / 8) * 8 + ',' + Math.floor(z / 8) * 8; holes[k] = (holes[k] || 0) + 1; } }
    // 갈 수 있는 곳 (walk.js와 같은 방식)
    const S = .5, X0 = 0, Z0 = 30, NX = 1280, NZ = 640, seen = new Uint8Array(NX * NZ), id = (x, z) => Math.round((z - Z0) / S) * NX + Math.round((x - X0) / S), q = [[212, 102, 0]]; seen[id(212, 102)] = 1;
    const up = new Uint8Array(NX * NZ);
    while (q.length) { const [x, z, y] = q.pop(); for (const [dx, dz] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const nx = x + dx, nz = z + dz, k = id(nx, nz); if (nx < 0 || nz < Z0 || nx >= 640 || nz >= Z0 + NZ * S) continue;
      const ny = W.groundY(nx, nz, y), hi = ny > 2.5 ? 1 : 0; if (hi ? up[k] : seen[k]) continue; if (W.blocked(nx, nz, ny) || Math.abs(ny - y) > .9) continue; if (hi) up[k] = 1; else seen[k] = 1; q.push([nx, nz, ny]); } }
    const walkK = ['paver', 'brick', 'perm', 'bike', 'zone', 'asphalt', 'sled', 'snowbed', 'gravel'];
    const unreach = []; R.forEach(g => { if (!walkK.includes(g.k)) return; const w = g.r[2] - g.r[0], h = g.r[3] - g.r[1]; if (w * h < 2) return; let n = 0, ok = 0;
      for (let x = g.r[0] + .3; x < g.r[2]; x += Math.max(.5, w / 6)) for (let z = g.r[1] + .3; z < g.r[3]; z += Math.max(.5, h / 6)) { if (!W.bounds(x, z, 0) || W.blocked(x, z, 0)) continue; n++; if (seen[id(x, z)] || up[id(x, z)]) ok++; }
      if (n > 3 && ok / n < .5) unreach.push([g.k, g.r.map(v => +v.toFixed(1)), n, ok]); });
    return {regions:R.length, zfight:zf.slice(0, 60), zfN:zf.length, curbsInRoad:cin.slice(0, 40), cinN:cin.length, holes:Object.entries(holes).filter(e => e[1] > 4).sort((a, b) => b[1] - a[1]).slice(0, 40), unreach:unreach.slice(0, 40)};
  });
  console.log(JSON.stringify(r)); await b.close();
})();
