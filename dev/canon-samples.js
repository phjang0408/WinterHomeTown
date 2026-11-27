// 개발용 (게시하지 않음, 2026-11-27): calm(역 · 강) 곡 후보 10개. 모두 '캐논 느낌'이되 화음 진행 · 멜로디 · 소리를 다르게.
//   곡 정의는 core/music.js SONGS와 같은 모양 — 고른 것을 SONGS.calm에 옮기면 게임에 들어간다.
//   캐논 원곡 선율(파헬벨, 1680년대)을 쓴 것은 1 · 6 · 9뿐이고, 나머지 멜로디는 새로 지었다. '캐논 변주곡'(조지 윈스턴 편곡)은 쓰지 않는다.
//   소리: 'triangle'(세모파, 가장 부드러움) · 'sine'(사인파, 더 둥긂) · 숫자(펄스파 폭, .125 · .25 · .5).
const CANON_C = 'C G | Am Em | F C | F G';
export const SAMPLES = [
  {id:1, title:'원곡 돌림노래 (라장조)', note:'원곡 조 · 원곡 두 선율, 둘째 목소리가 4마디 늦게 따라 부름',
    def:{bpm:62, lead:{wave:'triangle', gain:.06, att:.05, sus:.6, dec:.9, rel:.8}, rounds:[{delay:4, gain:.5}],
      bass:{gain:.065, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.016, oct:3, tones:[0, 1, 2, 1], every:2, att:.03, sus:.3, dec:.5, rel:.5}, echo:{time:.6, fb:.25, wet:.22},
      chords:'D A | Bm F#m | G D | G A | D A | Bm F#m | G D | G A',
      melody:`F#5 - - - E5 - - - | D5 - - - C#5 - - - | B4 - - - A4 - - - | B4 - - - C#5 - - - |
              D5 - - - C#5 - - - | B4 - - - A4 - - - | G4 - - - F#4 - - - | G4 - - - E4 - - -`}},
  {id:2, title:'내려가는 베이스', note:'베이스가 도 시 라 솔 파 미 레로 한 칸씩 내려감, 멜로디는 마디에 한 음 (내려갔다 올라옴), 부드러운 리드 소리',
    def:{bpm:70, lead:{wave:.125, cut:1200, gain:.06, att:.05, sus:.55, dec:.9, rel:.8},
      bass:{gain:.065, oct:3, pat:'whole', near:true, att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.02, oct:4, tones:[0, 1, 2, 1], every:2, att:.03, sus:.3, dec:.5, rel:.5}, echo:{time:.55, fb:.25, wet:.25},
      chords:'C | G/B | Am | Em/G | F | C/E | Dm | G | C | G/B | Am | Em/G | F | C/E | Dm | G',
      melody:`E5 - - - - - - - | D5 - - - - - - - | C5 - - - - - - - | B4 - - - - - - - | A4 - - - - - - - | G4 - - - - - - - | A4 - - - - - - - | B4 - - - D5 - - - |
              C5 - - - - - - - | D5 - - - - - - - | E5 - - - - - - - | G5 - - - - - - - | A5 - - - - - - - | G5 - - - - - - - | F5 - - - - - - - | D5 - - - B4 - - -`}},
  {id:3, title:'단조 캐논', note:'라단조로 바꾼 캐논 진행 (Am Em F C Dm Am Dm E), 쓸쓸하고 따뜻하게, 메아리 길게',
    def:{bpm:60, lead:{wave:'triangle', gain:.07, att:.08, sus:.6, dec:1, rel:.9},
      bass:{gain:.065, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.02, oct:3, tones:[0, 1, 2, 3], every:2, att:.03, sus:.3, dec:.5, rel:.5}, echo:{time:.7, fb:.3, wet:.3},
      chords:'Am | Em | F | C | Dm | Am | Dm | E | Am | Em | F | C | Dm | Am | Dm | E',
      melody:`E5 - - - C5 - - - | B4 - - - - - - - | A4 - - - C5 - - - | G4 - - - - - - - | F4 - - - A4 - - - | C5 - - - - - - - | D5 - - - F5 - - - | E5 - - - G#4 - - - |
              A5 - - - E5 - - - | G5 - - - - - - - | F5 - - - C5 - - - | E5 - - - - - - - | D5 - - - A4 - - - | C5 - - - E5 - - - | F5 - - - D5 - - - | B4 - - - G#4 - - -`}},
  {id:4, title:'캐논의 사촌 진행', note:'F G Em Am Dm G C — 캐논에서 갈라져 나온 진행, 조금 더 밝고 앞으로 가는 느낌, 8비트 소리가 가장 뚜렷함',
    def:{bpm:72, lead:{wave:.25, cut:1600, gain:.05, att:.03, sus:.5, dec:.6, rel:.5},
      bass:{gain:.065, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.015, oct:3, tones:[0, 1, 2, 1], every:1, att:.02, sus:.25, dec:.3, rel:.3}, echo:{time:.5, fb:.22, wet:.2},
      chords:'F G | Em Am | Dm G | C | F G | Em Am | Dm G | C',
      melody:`A4 - - - D5 - - - | E5 - - - C5 - - - | D5 - - - B4 - - - | C5 - - - - - - - |
              C5 - - - D5 - - - | G5 - - - E5 - - - | F5 - - - D5 - - - | E5 - - - - - - -`}},
  {id:5, title:'오르골 (베이스 고정)', note:'베이스는 도에 머물고 위 화음만 바뀜, 오르골처럼 반짝이는 반주 + 둥근 멜로디',
    def:{bpm:60, lead:{wave:'sine', gain:.09, att:.06, sus:.5, dec:1, rel:1},
      bass:{gain:.06, oct:2, pat:'whole', near:true, att:.05, sus:.6, dec:1.2, rel:.6}, arp:{wave:.5, cut:2600, gain:.02, oct:4, tones:[0, 1, 2, 3, 4, 3, 2, 1], every:1, att:.005, sus:.08, dec:.25, rel:.4}, echo:{time:.6, fb:.3, wet:.28},
      chords:'C | G/C | F/C | C | Am/C | F/C | G/C | C',
      melody:`. . . . E5 - - - | D5 - - - - - - - | C5 - - - A4 - - - | G4 - - - - - - - | . . . . A4 - - - | C5 - - - - - - - | B4 - - - D5 - - - | C5 - - - - - - -`}},
  {id:6, title:'톡톡 퉁기는 멜로디 (사장조)', note:'원곡 첫 선율 + 새 선율, 실로폰처럼 짧게 퉁기고 메아리로 이어짐',
    def:{bpm:64, lead:{wave:'triangle', gain:.08, att:.005, sus:.15, dec:.5, rel:.6},
      bass:{gain:.06, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.02, oct:3, tones:[0, 2], every:4, att:.05, sus:.5, dec:1, rel:.6}, echo:{time:.45, fb:.35, wet:.3},
      chords:'G D | Em Bm | C G | C D | G D | Em Bm | C G | C D',
      melody:`B5 - - - A5 - - - | G5 - - - F#5 - - - | E5 - - - D5 - - - | E5 - - - F#5 - - - |
              G5 - - - D5 - - - | E5 - - - B4 - - - | C5 - - - G4 - - - | C5 - - - D5 - - -`}},
  {id:7, title:'아주 느린 화음', note:'화음 하나를 두 마디씩 (F C Dm Am Bb F Bb C), 마디에 한 음, 가장 여유로움',
    def:{bpm:72, lead:{wave:'triangle', gain:.065, att:.1, sus:.7, dec:1.5, rel:1.2},
      bass:{gain:.06, oct:2, pat:'whole', att:.05, sus:.6, dec:1.2, rel:.6}, arp:{gain:.018, oct:3, tones:[0, 1, 2, 1], every:2, att:.03, sus:.3, dec:.5, rel:.5}, echo:{time:.75, fb:.3, wet:.3},
      chords:'F | F | C | C | Dm | Dm | Am | Am | Bb | Bb | F | F | Bb | Bb | C | C',
      melody:`A4 - - - - - - - | C5 - - - - - - - | E5 - - - - - - - | D5 - - - - - - - | F5 - - - - - - - | D5 - - - - - - - | C5 - - - - - - - | E5 - - - - - - - |
              D5 - - - - - - - | F5 - - - - - - - | C5 - - - - - - - | A4 - - - - - - - | D5 - - - - - - - | Bb4 - - - - - - - | C5 - - - - - - - | G4 - - - - - - -`}},
  {id:8, title:'색이 있는 화음', note:'캐논 진행에 7 · maj7 화음을 섞어 재즈처럼 포근하게, 베이스도 한 칸씩 내려감',
    def:{bpm:66, lead:{wave:'triangle', gain:.065, att:.05, sus:.6, dec:1, rel:.8},
      bass:{gain:.065, oct:3, pat:'whole', near:true, att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.02, oct:3, tones:[0, 1, 2, 3], every:2, att:.03, sus:.4, dec:.6, rel:.5}, echo:{time:.6, fb:.25, wet:.25},
      chords:'Cmaj7 | G/B | Am7 | Em7 | Fmaj7 | C/E | Dm7 G | Cmaj7',
      melody:`E5 - - - - - B4 - | D5 - - - - - - - | C5 - - - G4 - - - | B4 - - - D5 - - - | A4 - - - E5 - - - | G4 - - - C5 - - - | F5 - - - D5 - - - | E5 - - - - - - -`}},
  {id:9, title:'세 겹 돌림노래', note:'원곡처럼 세 선율이 4마디씩 늦게 겹침 (반주 없이 목소리만), 가장 캐논다움',
    def:{bpm:60, lead:{wave:'triangle', gain:.055, att:.04, sus:.55, dec:.9, rel:.7}, rounds:[{delay:4, gain:.55}, {delay:8, gain:.4}],
      bass:{gain:.06, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5}, echo:{time:.6, fb:.25, wet:.22},
      chords:`${CANON_C} | ${CANON_C} | ${CANON_C}`,
      melody:`E5 - - - D5 - - - | C5 - - - B4 - - - | A4 - - - G4 - - - | A4 - - - B4 - - - |
              C5 - - - B4 - - - | A4 - - - G4 - - - | F4 - - - E4 - - - | F4 - - - D4 - - - |
              C5 - E5 - G5 - F5 - | E5 - C5 - E5 - D5 - | C5 - A4 - C5 - G4 - | F4 - A4 - G4 - F4 -`}},
  {id:10, title:'동요풍 다섯 음', note:'캐논 진행 (한 마디에 화음 하나) 위에 도레미솔라 다섯 음만 쓴 동요 같은 멜로디',
    def:{bpm:68, lead:{wave:.125, cut:1300, gain:.055, att:.04, sus:.55, dec:.8, rel:.7},
      bass:{gain:.06, oct:2, pat:'half', att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.016, oct:3, tones:[1, 2, 3, 2], every:2, att:.03, sus:.3, dec:.5, rel:.5}, echo:{time:.55, fb:.25, wet:.22},
      chords:'C | G | Am | Em | F | C | F | G | C | G | Am | Em | F | C | F | G',
      melody:`G4 - - - E5 - - - | D5 - - - - - - - | C5 - - - A4 - - - | G4 - - - - - - - | A4 - - - C5 - - - | E5 - - - G5 - - - | A5 - - - - - - - | G5 - - - D5 - - - |
              E5 - - - D5 - - - | G4 - - - D5 - - - | E5 - - - C5 - - - | G4 - - - - - - - | A4 - - - - - C5 - | E5 - - - - - - - | C5 - - - A4 - - - | D5 - - - - - - -`}},
];

// (2026-11-27) 11: 6번 + 9번 섞기 (사용자: '6번 다음 9번처럼 선율이 이어지게, 소리는 6번인데 조금 덜 길게').
//   다장조, 캐논 진행 4마디가 한 바퀴. 처음 8마디는 6번처럼 한 줄(원곡 첫 선율 → 화음 밑음을 따라가는 선율),
//   그다음 9번처럼 둘째 · 셋째 목소리가 한 바퀴씩 늦게 들어와 세 겹이 됐다가, 마지막 4마디는 다시 한 줄로 잦아든다.
//   소리는 6번의 퉁기는 세모파, 잦아드는 시간 0.5 → 0.35초 · 꼬리 0.6 → 0.35초 · 메아리 되울림 0.35 → 0.22.
const L = {
  A:'E5 - - - D5 - - - | C5 - - - B4 - - - | A4 - - - G4 - - - | A4 - - - B4 - - -',     // 원곡 첫 선율
  R:'C5 - - - G4 - - - | A4 - - - E4 - - - | F4 - - - C4 - - - | F4 - - - G4 - - -',     // 6번의 둘째 선율 (화음 밑음을 따라감)
  B:'C5 - - - B4 - - - | A4 - - - G4 - - - | F4 - - - E4 - - - | F4 - - - D4 - - -',     // 원곡 둘째 선율
  C:'C5 - E5 - G5 - F5 - | E5 - C5 - E5 - D5 - | C5 - A4 - C5 - G4 - | F4 - A4 - G4 - F4 -', // 원곡 셋째 선율 (4분음표)
  _:'. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .',
};
const seq = k => k.split('').map(c => L[c]).join(' | ');
SAMPLES.push({id:11, title:'6번 + 9번 (한 줄 → 세 겹 → 한 줄)', note:'처음 8마디는 6번처럼 한 줄, 그다음 목소리가 하나씩 들어와 세 겹, 끝 4마디는 다시 한 줄. 6번 소리를 조금 덜 길게',
  def:{bpm:62, lead:{wave:'triangle', gain:.075, att:.005, sus:.15, dec:.35, rel:.35},
    voices:[{gain:.55, melody:seq('__ABC_')}, {gain:.4, melody:seq('___AB_')}],
    bass:{gain:.06, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.016, oct:3, tones:[0, 2], every:4, att:.05, sus:.5, dec:1, rel:.6}, echo:{time:.45, fb:.22, wet:.22},
    chords:Array(6).fill(CANON_C).join(' | '), melody:seq('ARBCAB')}});
