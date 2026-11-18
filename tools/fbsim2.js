const { open, chromium } = require('./serve.js');
(async () => { const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const p = await b.newPage(); await open(p);
  await p.goto('http://game.local/index.html?debug&nosnow'); await p.waitForFunction(() => window.__townReady, null, {timeout:240000});
  const r = await p.evaluate(() => { const W = window.__town.W, bad = [];
    const step = (st, ix, iz, sp, dt) => { const n = Math.max(1, Math.ceil(sp * dt / .25)), sx = ix * sp * dt / n, sz = iz * sp * dt / n;
      for (let i = 0; i < n; i++) { if (sx && !W.blocked(st.x + sx, st.z, st.y)) st.x += sx; if (sz && !W.blocked(st.x, st.z + sz, st.y)) st.z += sz; st.y = Math.max(st.y, Math.min(W.groundY(st.x, st.z, st.y), st.y + .6)); }
      const gy = W.groundY(st.x, st.z, st.y); st.y += (gy - st.y) * Math.min(1, dt * 14); };
    for (const bx of [230.5, 409.5]) for (let z0 = 56; z0 <= 104; z0 += 1.5) for (const side of [-1, 1]) for (const [ax, az] of [[1, .3], [1, -.3], [.5, 1], [.5, -1], [1, 0]]) for (const [sp, dt] of [[7, 1 / 30], [21, 1 / 20], [21, 1 / 8]]) {
      // 다리 위 가운데에서 시작 (높이를 맞춘 뒤), 난간 쪽으로 비빈다
      const st = {x:bx, z:z0, y:W.groundY(bx, z0)}; const L = Math.hypot(ax, az);
      for (let i = 0; i < 30; i++) step(st, side * ax / L, az / L, sp, dt);
      const before = {...st}; let esc = 0;
      for (const [ex, ez] of [[-side, 0], [0, 1], [0, -1]]) { const t = {...before}; for (let i = 0; i < 6; i++) step(t, ex, ez, 7, 1 / 30); if (Math.hypot(t.x - before.x, t.z - before.z) > .05) esc++; }
      const off = Math.abs(st.x - bx) > 1.45 && st.z > 55 && st.z < 105;
      if (esc === 0 || off) bad.push({bx, z0, side, a:[ax, az], sp, dt:+dt.toFixed(3), at:[+st.x.toFixed(2), +st.z.toFixed(2), +st.y.toFixed(2)], esc, off});
    }
    return bad; });
  console.log(r.length, JSON.stringify(r.slice(0, 12))); await b.close(); })();
