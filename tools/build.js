// 배포판 만들기 (2026-11-27 최적화 7): src/main.js에서 시작하는 모듈 92개 + three.js를 한 파일(dist/game.js)로 묶고 줄인다.
//   쓰는 법: cd tools && npm install && node build.js   → ../dist/ (index.html · game.js) 를 그대로 정적 호스팅에 올린다
//   - three.js: src/lib/three.js의 CDN 주소를 tools/node_modules/three로 바꿔 같이 묶는다 (쓰는 것만 남음)
//   - 그 밖의 https 주소(QR 라이브러리 등)는 그대로 둔다 (처음 쓸 때 받는다)
//   - dist/index.html: 불러오기 표시의 파일 수(EXPECT)를 1로, src/main.js 대신 game.js. 빌드 번호(window.__BUILD__)를 넣어
//     코드 텍스처를 브라우저에 보관했다 다음 방문에 꺼내 쓴다 (core/texkit.js). 소스가 바뀌면 빌드 번호도 바뀐다
const fs = require('fs'), path = require('path'), crypto = require('crypto');
let esbuild; try { esbuild = require('esbuild'); } catch (e) { console.error('esbuild가 없어요: tools 폴더에서 npm install 을 먼저 하세요'); process.exit(1); }
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'dist');
const THREE_LOCAL = path.join(__dirname, 'node_modules/three/build/three.module.js');
if (!fs.existsSync(THREE_LOCAL)) { console.error('three가 없어요: tools 폴더에서 npm install 을 먼저 하세요'); process.exit(1); }

(async () => {
  fs.rmSync(OUT, {recursive:true, force:true}); fs.mkdirSync(OUT, {recursive:true});
  const r = await esbuild.build({
    entryPoints:[path.join(ROOT, 'src/main.js')], bundle:true, minify:true, format:'esm', target:'es2020', outfile:path.join(OUT, 'game.js'),
    legalComments:'none', metafile:true, logLevel:'warning',
    plugins:[{name:'cdn', setup(b){
      b.onResolve({filter:/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@/}, () => ({path:THREE_LOCAL}));
      b.onResolve({filter:/^https?:\/\//}, a => ({path:a.path, external:true}));
    }}],
  });
  const js = fs.readFileSync(path.join(OUT, 'game.js')), id = crypto.createHash('sha1').update(js).digest('hex').slice(0, 10);
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const tag = /<script type="module" src="src\/main\.js"[^>]*><\/script>/;
  if (!/EXPECT = \d+;/.test(html) || !tag.test(html)) throw new Error('index.html 모양이 바뀌었어요: build.js의 바꿀 자리(EXPECT, src/main.js 스크립트)를 확인하세요');
  html = html.replace(/EXPECT = \d+;/, 'EXPECT = 1;');
  html = html.replace(tag, `<link rel="modulepreload" href="game.js?v=${id}">
<script>window.__BUILD__ = '${id}';</script>
<script type="module">
  // 배포판: 보관해 둔 코드 텍스처를 먼저 꺼내고(있으면) game.js를 부른다. 1.5초 안에 못 꺼내면 그냥 시작
  let go = false; const start = () => { if (go) return; go = true; import('./game.js?v=${id}').catch(() => window.__wtLoad.fail('파일을 받지 못했어요. 새로고침해 주세요.')); };
  setTimeout(start, 1500);
  try { const q = (() => { try { return localStorage.getItem('wt.quality') || 'auto'; } catch (e) { return 'auto'; } })(), want = '${id}:' + q, req = indexedDB.open('kkoma-tex', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('t');
    req.onsuccess = () => { try { const g = req.result.transaction('t').objectStore('t').get('tex'); g.onsuccess = () => { const v = g.result; if (v && v.id === want) window.__texCache = v.list; start(); }; g.onerror = start; } catch (e) { start(); } };
    req.onerror = start; } catch (e) { start(); }
</script>`);
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  const kb = f => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + 'KB';
  const gz = (require('zlib').gzipSync(js).length / 1024).toFixed(0) + 'KB';
  const srcN = Object.keys(r.metafile.inputs).filter(k => k.startsWith('src/') || k.includes('/src/')).length;
  console.log(`dist/game.js ${kb('game.js')} (gzip ${gz}), 묶은 소스 ${srcN}개 + three, 빌드 번호 ${id}`);
})().catch(e => { console.error(e.message || e); process.exit(1); });
