# 겨울 동네

온라인산사 형식의 웹 멀티플레이 산책 맵입니다.
Three.js(r160)와 ES 모듈만 쓰고, 빌드 도구는 필요 없습니다.

- `index.html` : 게임
- `gallery.html` : 장식 소품 미리보기 (소품을 하나씩 만들고 확인하는 곳)

## 실행

ES 모듈(`<script type="module">`)은 `file://`(파일 더블클릭)로는 브라우저가 막습니다.
반드시 로컬 서버로 엽니다.

```bash
# Windows: run-local.bat 더블클릭
# macOS / Linux
./run-local.sh
# 또는 직접
python -m http.server 8000
```

브라우저에서 `http://localhost:8000/` (게임), `http://localhost:8000/gallery.html` (소품)을 엽니다.
VS Code의 Live Server 확장으로 열어도 됩니다.

## GitHub Pages로 올리기

1. 이 폴더를 저장소 루트로 올립니다.
2. 저장소 Settings → Pages → Branch를 `main`, 폴더를 `/ (root)`로 고릅니다.
3. `https://<아이디>.github.io/<저장소>/` 가 게임, 뒤에 `gallery.html`을 붙이면 소품 갤러리입니다.

## 멀티플레이

연결 방식은 `src/config.js`의 `NET.kind`로 고릅니다.

| 방식 | 값 | 동작 |
|---|---|---|
| Claude 아티팩트 | `'claude-room'` (기본) | claude.ai 아티팩트 안에서만 다른 사람이 보입니다. 그 밖에서는 자동으로 혼자 걷기가 됩니다. |
| 직접 서버 | `'websocket'` | `server/`의 Node 서버를 띄우고 `NET.url`에 주소를 넣습니다. |

```bash
cd server
npm install
npm start          # ws://localhost:8080
```

## 폴더 구조

```
src/
  config.js            속도, 이름, 색, 상태 코드(ST), 네트워크 방식(NET), UNIT(1m)
  main.js              진입점: 조립 순서와 메인 루프
  lib/three.js         Three.js 불러오기 (CDN 주소는 여기 한 곳)
  core/
    engine.js          렌더러·장면·조명·onFrame
    look.js            게임과 갤러리 공용 조명·환경맵 값
    meshkit.js         메쉬 도구: sweep, loft, tube, lathe, box, fillet, ridge, blob, bakeAO, Parts
    texkit.js          PBR 재질: 나무, 도장 철, 눈, 콘크리트, 아스팔트, 보도블록, 금속, 유리 등
    gfx.js             예전 방식 도형·재질·캔버스 텍스처 도우미
    state.js, camera.js, input.js, fx.js, util.js
  world/
    world.js           W: 충돌, 지면 높이, 미니맵, W.place(), W.placeMany()
    builders.js        zone(), tower(), fence() 등과 반복 소품 일괄 그리기
    snowfall.js        내리는 눈
  map/
    layout.js          모든 좌표 (맵 크기·놀이 장소 위치)
    terrain.js, base.js, scenery.js
    zones/             구역 3개: apartments.js(동화 단지), park.js, school.js
  props/               소품. defineProp(이름, {build, colliders, ...})로 등록
    registry.js        소품 등록소
    kit.js             소품 조립 도우미 (assemble, quad 등)
    parkBench.js       공원 벤치 (새 메쉬 기준의 첫 예시)
    aptTower.js        '동화' 판상형 아파트 동 (일자, 'ㄱ'자)
    aptEntrance.js     동 현관 (계단·경사로·캐노피)
    cars.js            세단, SUV, 1톤 트럭, 택배 탑차
    aptSite.js         주차 턱, 과속방지턱, 표지판, 장애인 구역, 음식물 쓰레기통, 화단, 겨울 나무, 방음벽, 가로등
    aptYard.js         분리수거장, 정자, 조합놀이대, 흔들 놀이기구, 시소
    aptCenter.js       주민센터, 정문 문주
    basic.js, decor.js, buildings.js   예전 방식 소품
  activities/          놀이 (벤치·그네, 눈사람, 썰매, 딱지, 과녁, 붕어빵)
  entities/            캐릭터, 내 플레이어, 다른 사람, 발자국, 도로 차량
  net/                 claudeRoom.js, websocket.js, protocol.js
  ui/                  hud.js, minimap.js
server/                WebSocket 중계 서버 (선택)
docs/graphics-roadmap.md   그래픽 개선 계획과 진행 상황
```

## 소품 추가 예시

```js
// src/props/myProp.js
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { box, Parts } from '../core/meshkit.js';
import { matteMaterial } from '../core/texkit.js';
import { assemble } from './kit.js';

defineProp('myPost', {
  label: '기둥', category: '예시', isNewStyle: true,
  colliders: [{c: [0, 0, 0.2]}],
  build(){
    const P = new Parts();
    P.add('mat', box(-.1, 0, -.1, .1, 1.2, .1, .02), 0x6b7684);   // 미터 단위, 둥근 모서리
    return assemble(P, [['mat', matteMaterial()]], [.2, 1.2, .2]);
  },
});
```

`src/main.js`와 `gallery.html`에 `import './props/myProp.js'`를 넣고, 구역 파일에서 `W.place('myPost', {x, z})`로 놓습니다.
