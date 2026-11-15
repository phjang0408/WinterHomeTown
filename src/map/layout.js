// 맵 좌표 모음. 맵 크기를 바꾸거나 놀이 장소를 옮길 때는 이 파일의 숫자만 고치면 된다.
// 좌표계: x는 동쪽(+), z는 남쪽(+), 1단위 ≈ 0.85m
// 구획은 claude/map-zoning-plan.md(2판)와 2026-11-15 사용자 수정(버스 순환 도로, 강변 산책로 · 자전거 도로, 평평한 눈썰매장)을 따른다.
export const WORLD = {x0:0, x1:640, z0:15, z1:380};            // 미니맵·동기화 범위
export const WALK = {x0:6.5, x1:633.5, z0:31.8, zRiver:341.2};  // 걸을 수 있는 범위 (북쪽은 벽돌벽, 남쪽은 물가 난간)
export const BANK = -3;                                          // 강변 둔치 높이
export const ROAD = {z0:256, z1:272};                            // 강변도로 (양옆 투명벽, 횡단보도로만 건넌다)
export const NROAD = {z0:78, z1:90};                             // 북쪽 도로 (역앞길): 양옆 울타리로 막아 들어갈 수 없다
export const RAILS = [39.2, 44.5];                               // 복선 선로 중심 z
export const SIDING = {z:57.2, x0:236, x1:322};                  // 끊긴 측선과 차막이
export const PLAT = {x0:237, x1:307, z0:47.7, z1:53.7};          // 승강장 (높이 0.5m, 양 끝 경사로 3m)
export const DOCK = {x0:262, x1:322, z0:60.2, z1:66.8};          // 화물 홈 (높이 1m)
export const BRIDGE = {x:230.5, z:80};                           // 육교 가운데 (북쪽 계단 바닥 z 54.6 ~ 남쪽 계단 바닥 z 105.4)
export const LOOP = {x0:195, x1:445, w:7, zN:118.5, zS:217.5};   // 마을버스 순환 도로: 서쪽 · 동쪽 도로(폭 7)와 윗길 · 남쪽 뒷길 도로(z zN, zS부터 폭 7)
export const PATHS = {a:130, b:207};                             // 동서 보행로 중심 z
export const SHOPS_N = {z:101, xs:[262, 323, 388]};              // 북쪽 상가 줄 (정면이 남쪽 도로를 본다)
export const SHOPS_S = {z:243, xs:[240, 314, 388]};              // 남쪽 상가 줄 (정면이 북쪽 도로를 본다)
export const CROSS_N = [262, 323, 388], CROSS_S = [240, 314, 388];   // 순환 도로 횡단보도 (공원 입구와 상가 계단에 맞춘다)

// 놀이 장소
export const HILL = {x:70, z:320, r:17, h:0};                    // 눈썰매장 (평평하게)
export const SLED = {x0:74, x1:126, z:320};
export const STALL = {x:300, z:129};                             // 붕어빵 노점 (윗길 남쪽 보도)
export const SW = {cx:92, z:187, top:2.4 / .85, L:1.85 / .85, seats:[92 - .8 / .85, 92 + .8 / .85]};   // 그네: 아파트단지 공터. 치수는 props/aptStreet.js의 SWING(미터)과 맞춘다
export const SLIDE = {x:101, z:153, rot:0};                      // 나선 미끄럼틀 (놀이터). rot 0이면 계단이 남쪽(+z), 나가는 곳이 북쪽
export const TG = {z:154, y:2.6, line:174, b:[502,533,563], A:[6,9,6], w:[.8,1.3,1.05], ph:[0,2,4], R:[1.7,1.3,1.7]};
export const TK = {x:418.9, z:168.4};                            // 딱지치기 (문구점 앞마당: STATIONERY_PLAY.ttakji를 문구점 원점 · 방향으로 옮긴 자리)
// 동쪽 줄: 문구점 원점(정면 서쪽), 근린상가 정면 선 x와 각 동의 가운데 z (2026-11-15)
export const EAST = {shop:{x:427, z:171}, front:420.9, towers:[['beige', 139.5], ['brick', 151], ['gray', 188], ['green', 199]]};
export const SNOW_SPOT = {x:288, z:170};
export const SLOTS = []; [154, 188].forEach(z => { for (let i = 0; i < 6; i++) SLOTS.push([304 + i * 11, z]); });
// f: 1이면 남쪽(+z)을 보고 앉고, -1이면 북쪽을 보고 앉는다.
export const BENCHES = [{x:270,z:50.2,f:-1},{x:284,z:50.2,f:-1},{x:240,z:149,f:1},{x:240,z:194,f:-1},{x:108.5,z:166,f:1},{x:113.5,z:166,f:1},{x:228,z:211.5,f:1},{x:420,z:211.5,f:1},
  {x:60,z:300.5,f:1},{x:160,z:300.5,f:1},{x:240,z:300.5,f:1},{x:320,z:300.5,f:1},{x:400,z:300.5,f:1},{x:520,z:300.5,f:1},{x:600,z:300.5,f:1}];

export const SPAWN = {x0:208, x1:220, z:102};                    // 육교 마당
export const INTRO = {x:320, z:180, r:390, h:175};
