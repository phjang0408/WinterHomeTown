# 겨울 동네

Three.js(r160)로 만든 웹 멀티플레이 겨울 동네 맵과 미니게임.

## 실행
빌드 없이 정적 파일로 돈다. 폴더에서 로컬 서버를 띄우고 브라우저로 연다.

```bash
python -m http.server 8000
# http://localhost:8000/index.html    게임
# http://localhost:8000/gallery.html  장식 소품 갤러리
```

`file://`로 직접 열면 ES 모듈이 막혀 동작하지 않는다.

## 폴더
- `src/core` 엔진 · 메쉬 도구(`meshkit.js`) · 재질(`texkit.js`) · 조명(`look.js`)
- `src/props` 소품 정의 (미터 단위, 원점은 바닥 가운데, 정면 +z). 분류는 `catalog.js`
- `src/map` 구획(`layout.js`), 바닥 · 도로(`base.js`), 구역별 배치(`zones/`)
- `src/activities` 미니게임 (딱지치기, 눈사람, 썰매 등)
- `src/entities` 플레이어 · 차량 · 발자국, `src/net` 멀티플레이 연결
- `dev/preview.html?n=소품이름&files=shopTowers` 소품 하나 미리보기

## 디버그
`index.html?debug` 로 열면 `window.__town`이 열린다. `&nosnow`는 내리는 눈을 끈다.
