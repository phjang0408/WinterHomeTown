// 개발용 (게시하지 않음, 2026-11-27): 메인 곡 새로 짓기 — '갈대피리의 춤' 같은 느낌(라장조, 가볍게 톡톡 끊는 피리 + 3도 아래 둘째 피리 + 퉁기는 베이스)
//   멜로디는 새로 지은 것 (차이콥스키 선율을 옮기지 않음). 게임 음악처럼 놀이에 신경 쓰이지 않게: 음역 A4~A5, 큰 도약 · 클라이맥스 없음, 8마디마다 숨 쉬는 쉼.
//   구조 (4/4, 16분음표 한 칸, 16마디 약 58초): 가(1~4) 가'(5~8, 끝에서 쉼) 나(9~12, 긴 음으로 더 잔잔) 나'(13~16, 8분음표로 흐르다 으뜸음으로)
const MEL = `A4 . D5 . F#5 . E5 D5 E5 . F#5 . D5 - . . | C#5 . E5 . G5 . F#5 E5 F#5 . E5 . D5 - . . | B4 . D5 . G5 . F#5 E5 F#5 . A5 . F#5 - . . | E5 . C#5 . A4 . B4 C#5 E5 - - - . . . . |
             A4 . D5 . F#5 . E5 D5 E5 . F#5 . A5 - . . | G5 . E5 . C#5 . D5 E5 F#5 . E5 . D5 - . . | B4 . D5 . G5 . F#5 E5 E5 . C#5 . A4 . C#5 . | D5 - - - . . . . . . . . . . . . |
             B4 - - - D5 - - - G5 - - - F#5 - E5 - | F#5 - - - A4 - - - D5 - - - . . . . | G5 - - - E5 - B4 - C#5 - - - E5 - - - | D5 - - - F#5 - - - A5 - - - . . . . |
             G5 . D5 . B4 . D5 . G5 . F#5 . E5 . D5 . | F#5 . D5 . A4 . D5 . F#5 . D5 . B4 . D5 . | G5 . E5 . B4 . E5 . E5 . C#5 . A4 . G5 . | F#5 - - - D5 - - - . . . . . . . . |`;
const CH = 'D | A7 D | G D | A | D | A7 D | G A | D | G | D | Em A | D | G | D Bm | Em A7 | D';
// 둘째 피리: 라장조 음계에서 3도 아래 (나 부분 9~16마디는 쉰다 — 한 줄로 더 조용히)
const LET = 'CDEFGAB', KEY = {F:'#', C:'#'};
const third = t => { const m = /^([A-G])#?(\d)$/.exec(t); if (!m) return t; const a = +m[2] * 7 + LET.indexOf(m[1]) - 2, L = LET[a % 7]; return L + (KEY[L] || '') + Math.floor(a / 7); };
const bars = MEL.split('|').map(b => b.trim()).filter(Boolean);
const HARM = bars.map((b, i) => i < 8 ? b.split(/\s+/).map(third).join(' ') : b.split(/\s+/).map(() => '.').join(' ')).join(' | ');

const BASE = {
  bpm:66, div:16, chords:CH, melody:MEL,
  lead:{wave:.5, gain:.05, cut:1400, att:.008, sus:.45, dec:.14, rel:.12},                 // 피리: 네모파를 필터로 둥글게, 톡 끊기게
  voices:[{gain:.42, melody:HARM}],
  arp:{gain:.05, oct:3, tones:[0, 2], every:4, att:.003, sus:.08, dec:.12, rel:.1},         // 퉁기는 베이스: 4분음표마다 밑음 · 5도
  echo:{time:.34, fb:.15, wet:.12},
};
export const SAMPLES = [
  {id:1, title:'피리 둘', note:'톡톡 끊는 네모파 피리 + 3도 아래 둘째 피리(앞 8마디), 4분음표 퉁기는 베이스, 66bpm', def:BASE},
  {id:2, title:'더 조용히', note:'같은 곡을 세모파 한 줄로, 60bpm, 베이스 더 작게 — 배경에 더 깔리게',
    def:{...BASE, bpm:60, lead:{wave:'triangle', gain:.075, att:.01, sus:.45, dec:.18, rel:.16}, voices:[], arp:{...BASE.arp, gain:.04}, echo:{time:.4, fb:.18, wet:.15}}},
];
