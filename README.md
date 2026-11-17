# 겨울 동네 (Winter Town)

Three.js로 만든 웹 멀티플레이 겨울 동네 맵. 빌드 없이 정적 파일로 돈다.

## 실행
- 아무 정적 서버로 이 폴더를 연다 (예: `python -m http.server 8000` → `http://localhost:8000/index.html`).
- `gallery.html`: 소품 갤러리 (아파트 단지 · 공원 · 학교 · 간이역 · 기타 묶음).
- `index.html?debug`: 콘솔에서 `window.__town`으로 상태를 볼 수 있다.

## 조작
- WASD 이동, Shift 달리기(테스트용 3배), E 상호작용, 마우스 끌기 시점, 휠 카메라 거리.
- 얼음 썰매장: 얼음 위에서 E로 타고, W 폴대로 밀기 · A D 방향 · S 멈추기 · E 내리기.

## 폴더
- `src/map`: 맵(바닥 · 도로 · 강변 · 구역). 좌표는 `src/map/layout.js`.
- `src/props`: 소품 정의(`defineProp`). 목록과 묶음은 `src/props/catalog.js`.
- `src/activities`: 놀이(벤치 · 그네 · 미끄럼틀 · 눈사람 · 과녁 · 딱지 · 얼음 썰매).
- `tools`: 헤드리스 검수 도구(Playwright). `npm i` 후 `node walk.js` · `node audit.js` 등. `serve.js`의 경로를 이 폴더에 맞춘다.
- `docs/map-changes-log.md`: 맵 수정 기록.

모든 간판 · 상호는 지어낸 이름이다.
