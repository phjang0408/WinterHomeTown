# 배포 안내 (5단계, 2026-11-27)

공개 주소로 열려면 세 가지가 필요하다.

1. **게임 화면(정적 파일)**: `dist/` 폴더 (index.html + game.js). 아무 정적 호스팅에 올리면 된다.
2. **멀티플레이 서버**: `server/` (Node.js + ws). 서로 보이게 해 주는 작은 서버. 계속 켜져 있어야 한다.
3. **도메인(선택)**: 사서 1 · 2에 연결한다. 없으면 호스팅이 주는 주소(…pages.dev, …onrender.com 등)로도 된다.

요금 · 무료 조건은 자주 바뀌니 가입할 때 각 서비스의 요금표를 확인한다.

## 0. 준비 (한 번)

- Windows에 Node.js LTS 설치 (nodejs.org). 터미널에서 `node -v`가 나오면 된다.
- 코드는 GitHub 저장소(D:\01_Github\10_WinterTown)에 올려 둔다. 호스팅들이 GitHub에서 바로 가져간다.

## 1. 멀티플레이 서버 올리기

WebSocket을 지원하고 HTTPS를 자동으로 붙여 주는 곳이면 된다 (예: Render · Railway · Fly.io, 또는 작은 VPS).
Render를 예로 들면:

1. Render 가입 → New → **Web Service** → GitHub 저장소 연결.
2. 설정
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - 환경 변수: `ALLOWED_ORIGINS` = 게임 주소 (예: `https://kkoma.town,https://www.kkoma.town`). 처음 시험할 때는 비워 두면 모두 허용.
3. 배포가 끝나면 `https://이름.onrender.com`이 생긴다. 브라우저로 열어 `kkoma-server ok`가 보이면 성공.
4. 게임에서 쓸 주소는 `wss://이름.onrender.com` (https → wss).

주의: 무료 플랜은 한동안 접속이 없으면 잠들었다가 첫 접속 때 깨어나는 등 제한이 있을 수 있다. 서버에 못 붙는 동안에도 혼자서는 놀 수 있고, 3초마다 다시 붙어 본다.
서버는 채널당 40명(`server.js` CAP), 넘으면 다음 채널로 나눈다.

## 2. 게임 설정 → 빌드

1. `src/config.js`
   - `NET = {kind:'auto', url:'wss://이름.onrender.com'}` (아티팩트 밖에서는 이 주소로 붙는다)
   - `DEV.perfOpen`은 **false** (성능 창은 `?debug`일 때만 불러온다)
   - `LINKS`의 인스타 · 후원 · 온라인산사 인스타 확인
2. 빌드: `cd tools` → `npm install`(처음 한 번) → `npm run build` → `dist/`가 새로 생긴다.
3. 로컬 확인: 저장소 폴더에서 `python -m http.server 8000` → `http://localhost:8000/dist/index.html`.

## 3. 게임 화면 올리기 (정적 호스팅)

어느 곳이든 `dist/` 폴더 하나만 올리면 된다 (예: Cloudflare Pages · Netlify · GitHub Pages · Vercel). 압축(gzip · brotli)과 HTTPS는 호스팅이 알아서 해 준다.

- **가장 쉬운 방법 (직접 올리기)**: Cloudflare Pages나 Netlify의 '직접 업로드'에 `dist` 폴더를 끌어다 놓는다. 고칠 때마다 다시 빌드해서 다시 올린다.
- **자동 방법 (GitHub 연동)**: 저장소를 연결하고
  - Build command: `cd tools && npm install && npm run build`
  - Output directory: `dist`
  - 그러면 GitHub에 올릴 때마다 알아서 빌드 · 배포된다.

## 4. 도메인 연결

1. 도메인 구매 (예: 가비아 · Cloudflare · Namecheap). `.com`, `.kr`, `.town` 등.
2. 게임 화면: 정적 호스팅의 'Custom domain'에 `kkoma.town`(예)을 넣고, 안내대로 DNS에 레코드(CNAME 등)를 추가한다.
3. 서버: 서버 호스팅의 'Custom domain'에 `ws.kkoma.town`(예)을 넣고 DNS에 CNAME 추가 → 게임 설정 `NET.url`을 `wss://ws.kkoma.town`으로 바꾸고 다시 빌드.
4. 서버 환경 변수 `ALLOWED_ORIGINS`에 `https://kkoma.town`을 넣는다.
5. HTTPS 인증서는 보통 몇 분 ~ 몇 시간 안에 자동으로 붙는다.

## 익명 운영 통계 (서버 /stats)

- 서버 주소 뒤에 `/stats` (표, 1분마다 새로 고침) · `/stats.json` (숫자 그대로). 예: `https://ws.kkoma.town/stats?key=열쇠`
- 서버 환경 변수 `STATS_KEY`를 정하면 `?key=값`으로만 볼 수 있다 (정해 두기를 추천).
- 하루(한국 시간) 단위: 들어온 수 · 최고 동시 접속 · 머문 시간 · 시간대별 접속 · 기기(폰 · PC) · 화질 · 불러오기 초 · FPS · 놀이별 횟수와 시간 · 구역별 머문 시간 · 링크 누름 · 화면 오류.
- 이름 · IP · 좌표는 모으지 않는다. 게임 쪽은 `src/net/stats.js`, 서버 쪽은 `server/server.js`.
- 남기는 곳: 메모리에 14일 + 자정마다 로그에 `[stats-day]` 한 줄, 한 시간마다 `[stats-hour]` 한 줄 (호스팅 로그 화면에서 검색). `STATS_DIR`을 정하면 그 폴더의 `stats.jsonl`에도 덧붙인다 — 무료 호스팅은 재시작 · 재배포 때 파일이 지워질 수 있어, 오래 모으려면 디스크가 남는 요금제나 작은 DB를 쓴다.

## 5. 올린 뒤 확인 (6단계)

- [ ] PC · 폰 두 대로 같은 주소에 들어가 서로 보이는지, 손 흔들기 · 2인 놀이(나눠바 · 시소)
- [ ] 아이폰 Safari · 안드로이드 Chrome · PC Chrome/Edge에서 들어가기까지 시간
- [ ] 두 번째 방문이 더 빠른지 (코드 텍스처 보관)
- [ ] 메뉴 › 정보: 인스타 DM · 토스 후원(폰은 토스 앱이 열림) · 온라인산사 인스타
- [ ] 서버를 잠깐 껐다 켜도 3초 뒤 다시 붙는지
- [ ] P를 눌러도 성능 창이 안 뜨는지 (성능 창은 주소에 `?debug`가 있을 때만)
- [ ] `/stats?key=…`에 접속 수 · 놀이가 쌓이는지

## 고칠 때마다

소스 수정 → `npm run build` → `dist` 다시 올리기 (자동 방법이면 GitHub에 올리기만). 빌드 번호가 바뀌어 방문자의 브라우저도 새 코드 · 새 텍스처를 받는다.
