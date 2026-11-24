# 겨울 동네 (Winter Town)

Three.js로 만든 웹 멀티플레이 겨울 동네 맵. 빌드 없이 정적 파일로 돈다.

## 실행
- 아무 정적 서버로 이 폴더를 연다 (예: `python -m http.server 8000` → `http://localhost:8000/index.html`).
- `gallery.html`: 소품 갤러리 (아파트 단지 · 공원 · 학교 · 간이역 · 기타 묶음).
- `index.html?debug`: 콘솔에서 `window.__town`으로 상태를 볼 수 있다.

## 조작
- WASD 이동, Shift 달리기(테스트용 3배), E 상호작용, 마우스 끌기 시점, 휠 카메라 거리.
- P: 성능 창 (FPS · CPU/GPU ms · 그리기 + 그림자 · 삼각형, '5곳 측정'으로 고정 시점 평균 표, 배율 · 그림자 단추). 폰은 주소 끝에 `#perf`.
- 화질: `core/quality.js`의 높음 · 보통 · 낮음 (자동: 데스크톱 높음, 레티나 보통, 터치 · 작은 화면 낮음). `localStorage`의 `wt.quality`에 저장.
- 얼음 썰매장: 얼음 위에서 E로 타고, W 폴대로 밀기 · A D 방향 · S 멈추기 · E 내리기.

## 폴더
- `src/map`: 맵(바닥 · 도로 · 강변 · 구역). 좌표는 `src/map/layout.js`.
- `src/props`: 소품 정의(`defineProp`). 목록과 묶음은 `src/props/catalog.js`.
- `src/activities`: 놀이(벤치 · 평상 · 그네 · 시소 · 뺑뺑이 · 미끄럼틀 · 함께 만드는 눈사람 · 딱지 · 공기놀이 · 얼음 썰매 · 연날리기 · 공중전화 · 마을버스 · 군고구마 · 오락기).
- `src/world/batch.js`: 맵을 다 지은 뒤 같은 소품 묶기 · 같은 재질 합치기 (2026-11-24 최적화). 놀이가 움직이는 소품은 정의에 `dynamic: true`.
- `tools`: 헤드리스 검수 도구(Playwright). `npm i` 후 `node walk.js` · `node audit.js` 등. `serve.js`의 경로를 이 폴더에 맞춘다.
- `docs/map-changes-log.md`: 맵 수정 기록.
- `docs/next-steps.md`: 남은 단계와 작업 방식 (맵 수정 · 놀이공간 · 1단계 최적화 마무리).
- `docs/graphics-roadmap.md`: 메쉬 기준 · 조명 기준값 · 진행 표. `docs/asset-pipeline-skill.md`: 에셋 제작 스킬 사본.

모든 간판 · 상호는 지어낸 이름이다.
