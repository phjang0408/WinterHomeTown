// 맵 좌표 모음. 맵 크기를 바꾸거나 놀이 장소를 옮길 때는 이 파일의 숫자만 고치면 된다.
// 좌표계: x는 동쪽(+), z는 남쪽(+), 1단위 ≈ 0.85m
export const WORLD = {x0:0, x1:640, z0:15, z1:380};            // 미니맵·동기화 범위
export const WALK = {x0:6.5, x1:633.5, z0:19.6, zRiver:341.4};  // 걸을 수 있는 범위
export const BANK = -3;                                          // 강변 둔치 높이
export const ROAD = {z0:256, z1:272};                            // 강변도로
export const RAIL_Z = 44.5;
export const PLAT = {x0:237, x1:307, z0:47.7, z1:53.7};          // 폐역 승강장
export const DECK = {x0:314, x1:326, z0:338, z1:364, y:-2.7};    // 강 위 데크
export const LOOP = {x0:195, x1:445, z0:83, w:7};                // 마을버스 순환도로
export const PATHS = {a:130, b:207};                             // 동서 보행로 중심 z

// 놀이 장소
export const HILL = {x:70, z:320, r:17, h:6};                    // 눈썰매 둔덕 (강변)
export const SLED = {x0:74, x1:126, z:320};
export const POND = {x:590, z:347, r:14};                        // 강가 빙판
export const STALL = {x:300, z:120};                             // 붕어빵 노점
export const SW = {cx:134, z:160, top:3.3, L:2.5, seats:[132.7, 135.3]};
export const TG = {z:154, y:2.6, line:174, b:[502,533,563], A:[6,9,6], w:[.8,1.3,1.05], ph:[0,2,4], R:[1.7,1.3,1.7]};
export const TK = {x:383, z:171};
export const SNOW_SPOT = {x:288, z:170};
export const SLOTS = []; [154, 188].forEach(z => { for (let i = 0; i < 6; i++) SLOTS.push([304 + i * 11, z]); });
// f: 1이면 남쪽(+z)을 보고 앉고, -1이면 북쪽을 보고 앉는다.
export const BENCHES = [{x:272,z:51.2,f:-1},{x:240,z:149,f:1},{x:240,z:194,f:-1},{x:134,z:200,f:-1},{x:300,z:245,f:1},{x:400,z:245,f:1},
  {x:60,z:294,f:1},{x:160,z:294,f:1},{x:240,z:294,f:1},{x:400,z:294,f:1},{x:520,z:294,f:1},{x:600,z:294,f:1},{x:320,z:361,f:1}];

export const SPAWN = {x0:206, x1:216, z:77};
export const INTRO = {x:320, z:180, r:390, h:175};
