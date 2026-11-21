// 게임 전역 설정. 숫자만 바꿔도 되는 값은 전부 여기에 둔다.
export const SPEED = 7;          // 걷기 속도 (월드 단위/초)
export const RUN = 1.5;            // 달리기 배율 (Shift, 테스트하기 쉽게 3배 -> 1.5로 원래조정)
export const RAD = 0.45;         // 캐릭터 충돌 반지름
export const UNIT = 1 / 0.85;    // 1미터 = 약 1.18 게임 단위 (게임 1단위 ≈ 0.85m). 소품은 미터로 만들고 이 값을 곱한다.
// 글꼴 (Google Fonts, 무료). 간판·제목은 굵은 견고딕 느낌의 블랙한산스, 작은 글씨·본문은 돋움 느낌의 나눔고딕.
// 블랙한산스는 굵기가 하나뿐이라 굵기(700 등)를 붙이지 않는다 (붙이면 브라우저가 억지로 더 굵게 그린다).
export const FONT_D = '"Black Han Sans","Nanum Gothic","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
export const FONT_B = '"Nanum Gothic","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
// 화면 UI 글씨 (2026-11-21): 머리 위 이름표 · 자리 표시 등 3D 안의 UI 글씨도 같은 글꼴
export const FONT_UI = '"IBM Plex Sans KR","Barlow Condensed","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
export const FONTS_TO_LOAD = ['600 16px "IBM Plex Sans KR"', '600 16px "Barlow Condensed"', '32px "Black Han Sans"', '16px "Nanum Gothic"', '800 16px "Nanum Gothic"'];

export const ADJ = ['포근한','조용한','느긋한','말랑한','따끈한','수줍은','졸린','소복한','반짝이는','다정한','동그란','나른한'];
export const NOUN = ['눈송이','귤','붕어빵','목도리','호빵','고드름','털모자','군고구마','입김','손난로','발자국','장갑','코코아','눈토끼'];
export const COLORS = [
  {j:0xd9695c,h:0xf4ecd8,css:'#d9695c'},{j:0x3f8a97,h:0xf2c66d,css:'#3f8a97'},
  {j:0xe2a84b,h:0x5b6f8c,css:'#e2a84b'},{j:0x6f86b8,h:0xf3d9d2,css:'#6f86b8'},
  {j:0x7fae8a,h:0xb5594a,css:'#7fae8a'},{j:0xc48bb0,h:0xfafafa,css:'#c48bb0'},
  {j:0x8a6f5a,h:0xe9b84e,css:'#8a6f5a'},{j:0x5a6b7d,h:0xd9695c,css:'#5a6b7d'}];

// 캐릭터 상태 코드. 네트워크로 숫자가 오가므로 기존 값은 바꾸지 말고 뒤에 추가한다.
export const ST = {WALK:0, BENCH:1, SWING:2, TARGET:3, TTAKJI:4, SNOW:5, SLED:6, SLIDE:7, CARRY:8, SEESAW:9, DUCK:10, RIDE:11, SPIN:12, PLAT:13, PHONE:14, KITE:15, BUS:16};

// 멀티플레이 연결 방식: 'claude-room'(아티팩트 공유 기능) 또는 'websocket'(직접 띄운 서버)
export const NET = {kind:'websocket', url:'ws://localhost:8080'};

export const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
