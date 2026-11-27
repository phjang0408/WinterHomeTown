// 게임 전역 설정. 숫자만 바꿔도 되는 값은 전부 여기에 둔다.
export const SPEED = 7;          // 걷기 속도 (월드 단위/초)
export const RUN = 2;              // 달리기 배율 (Shift · 조이스틱 끝까지). (2026-11-25) 1.5 → 2
export const RAD = 0.45;         // 캐릭터 충돌 반지름
export const UNIT = 1 / 0.85;    // 1미터 = 약 1.18 게임 단위 (게임 1단위 ≈ 0.85m). 소품은 미터로 만들고 이 값을 곱한다.
// 글꼴 (Google Fonts, 무료). 간판·제목은 굵은 견고딕 느낌의 블랙한산스, 작은 글씨·본문은 돋움 느낌의 나눔고딕.
// 블랙한산스는 굵기가 하나뿐이라 굵기(700 등)를 붙이지 않는다 (붙이면 브라우저가 억지로 더 굵게 그린다).
export const FONT_D = '"Do Hyeon","Nanum Gothic","Apple SD Gothic Neo","Malgun Gothic",sans-serif';   // (2026-11-24 21차) 제목 글꼴: Black Han Sans → 도현 (덜 굵은 고딕). 본문 FONT_B는 나눔고딕 보통 굵기로 쓴다
export const FONT_B = '"Nanum Gothic","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
// 화면 UI 글씨 (2026-11-21): 머리 위 이름표 · 자리 표시 등 3D 안의 UI 글씨도 같은 글꼴
export const FONT_UI = '"IBM Plex Sans KR","Barlow Condensed","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
export const FONTS_TO_LOAD = ['600 16px "IBM Plex Sans KR"', '600 16px "Barlow Condensed"', '32px "Black Han Sans"', '16px "Nanum Gothic"', '800 16px "Nanum Gothic"', '32px "Song Myung"', '32px "Do Hyeon"', '32px "Jua"', '32px "Gugi"', '32px "Yeon Sung"', '700 32px "Gaegu"', '500 32px "Sunflower"', '700 32px "Sunflower"', '700 32px "Nanum Myeongjo"', '800 32px "Nanum Myeongjo"', '900 32px "Gothic A1"'];   // (2026-11-23) 간판 그림 글꼴 (props/signArt/)

export const ADJ = ['킹왕짱','폭풍간지','떡실신한','완소','엽기','폼생폼사','뽀대나는','zI존','지못미'];
export const NOUN = ['차도남','초글링','초딩','본좌','도토리','허접','쌈짱','얼짱','잉여','일촌','엄친아','꽃미남'];
export const COLORS = [
  {j:0xd9695c,h:0xf4ecd8,css:'#d9695c'},{j:0x3f8a97,h:0xf2c66d,css:'#3f8a97'},
  {j:0xe2a84b,h:0x5b6f8c,css:'#e2a84b'},{j:0x6f86b8,h:0xf3d9d2,css:'#6f86b8'},
  {j:0x7fae8a,h:0xb5594a,css:'#7fae8a'},{j:0xc48bb0,h:0xfafafa,css:'#c48bb0'},
  {j:0x8a6f5a,h:0xe9b84e,css:'#8a6f5a'},{j:0x5a6b7d,h:0xd9695c,css:'#5a6b7d'}];

// 캐릭터 상태 코드. 네트워크로 숫자가 오가므로 기존 값은 바꾸지 말고 뒤에 추가한다.
export const ST = {WALK:0, BENCH:1, SWING:2, TARGET:3, TTAKJI:4, SNOW:5, SLED:6, SLIDE:7, CARRY:8, SEESAW:9, DUCK:10, RIDE:11, SPIN:12, PLAT:13, PHONE:14, KITE:15, BUS:16, ARCADE:17, HANG:18, TWIN:19};   // (2026-11-25) HANG 뺑뺑이 매달려 타기, TWIN 나눠바 나누기

// 멀티플레이 연결 방식: 'auto' · 'claude-room'(아티팩트 공유 기능) · 'websocket'(직접 띄운 서버)
// (2026-11-25) 'auto': Claude 아티팩트 안이면 공유 방(room), 아니면 url의 WebSocket 서버. 예전 'websocket' 고정이라 아티팩트에서 앱 ↔ 웹이 안 붙었다
export const NET = {kind:'auto', url:'ws://localhost:8080'};

export const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);

// (2026-11-26) 피드백 · 후원 링크 (메뉴 '정보' 탭, 시작 화면 맨 아래 한 줄 → ui/links.js). 여기만 채우면 된다.
//   비워 두면 그 자리는 흐리게 '준비 중'으로 보인다.
export const DEV = {perfOpen:false};   // (2026-11-27) 아이폰 측정용: 성능 창(P)을 처음부터 연다. 측정이 끝나면 false로 (zip · 배포 전에 꼭 끄기)
export const LINKS = {
  insta: 'clip_snow.town',   // 인스타 아이디 (@ 없이). (2026-11-27) 사용자가 만든 계정 https://www.instagram.com/clip_snow.town/
  instaDm: true,    // true: 누르면 바로 DM 창(ig.me/m/아이디), false: 프로필(instagram.com/아이디)
  donate: 'supertoss://send?amount=0&bank=%ED%86%A0%EC%8A%A4%EB%B1%85%ED%81%AC&accountNo=100126271767&origin=qr',   // (2026-11-27) 사용자가 준 토스 송금 QR을 읽은 내용 그대로 (토스 앱 주소). 폰은 버튼으로 토스 앱을 열고, 데스크톱은 같은 내용으로 QR을 그린다
  donateQr: '',     // (비워 둠: 위 donate 내용으로 QR을 그린다)
  //     // QR 이미지를 직접 쓰려면 파일 경로 (예: 'assets/donate-qr.png'). 비우면 donate 주소로 QR을 그린다
};
