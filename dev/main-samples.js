// 개발용 (게시하지 않음, 2026-11-27): 메인 곡 후보 6개. 예전 동네 곡(SONGS.town, 직접 지은 다장조 5음 멜로디)을 바탕으로 더 잔잔하게 바꾼 것.
//   사용자: '메인은 예전 것이 더 낫다, 거기서 변형. 조금 더 잔잔하게, 너무 신나지 않게, 8비트는 괜찮다'.
//   곡 정의는 core/music.js SONGS와 같은 모양. 소리: 숫자는 펄스파 폭(.125 · .25 · .5), 'triangle' 세모파, 'sine' 사인파.
const TOWN_CH = 'C | Am | F | G | C | Am | Dm G | C | F | C | F | G | F | Em | Dm G | G';
const TOWN_MEL = `E5 - - D5 C5 - D5 - | E5 - G5 - E5 - - - | A5 - G5 - E5 - D5 - | D5 - - - . . . . |
                  E5 - - D5 C5 - D5 - | E5 - G5 - A5 - - - | G5 - E5 - D5 - E5 - | C5 - - - . . . . |
                  A4 - C5 - D5 - - - | E5 - G5 - E5 - - - | A4 - C5 - D5 - E5 - | D5 - - - . . . . |
                  A4 - C5 - D5 - - - | E5 - G5 - A5 - G5 - | E5 - D5 - C5 - A4 - | G4 - - - . . . .`;
// 멜로디를 두 배 길게 (한 칸 → 두 칸), 화음도 한 마디 → 두 마디
const stretch = m => m.replace(/\|/g, ' ').trim().split(/\s+/).map(t => t === '.' ? '. .' : t + ' -').join(' ').split(' ')
  .reduce((a, t, i) => a + (i && i % 8 === 0 ? ' | ' : ' ') + t, '').trim();
const stretchCh = c => c.split('|').map(b => { const cs = b.trim().split(/\s+/); return cs.length === 1 ? `${cs[0]} | ${cs[0]}` : `${cs[0]} | ${cs[1]}`; }).join(' | ');
// 멜로디 덜어내기: 반 마디에 한 음 (같은 노래로 들리게 각 반 마디의 첫 음 · 중요한 음만)
const SPARSE = `E5 - - - D5 - - - | E5 - - - G5 - - - | A5 - - - E5 - - - | D5 - - - - - . . |
                E5 - - - D5 - - - | E5 - - - A5 - - - | G5 - - - D5 - - - | C5 - - - - - . . |
                A4 - - - D5 - - - | E5 - - - G5 - - - | A4 - - - D5 - - - | D5 - - - - - . . |
                A4 - - - D5 - - - | E5 - - - A5 - - - | E5 - - - C5 - - - | G4 - - - - - . . |`.replace(/\|\s*$/, '');

export const SAMPLES = [
  {id:1, title:'느리게만', note:'편곡은 그대로, 100 → 80bpm, 찰랑(하이햇) 없앰, 음이 조금 더 부드럽게 들어오고 짧은 메아리',
    def:{bpm:80, lead:{wave:.25, gain:.05, cut:2000, att:.02, sus:.6, dec:.5, rel:.2}, bass:{gain:.08, oct:3, pat:'half', att:.02, sus:.55, dec:.5, rel:.2},
      echo:{time:.38, fb:.2, wet:.16}, chords:TOWN_CH, melody:TOWN_MEL}},
  {id:2, title:'먹먹한 네모파', note:'펄스 50%를 필터로 덮어 둥글고 먹먹하게, 84bpm, 베이스는 한 마디에 한 음, 펼친 화음 4분음표',
    def:{bpm:84, lead:{wave:.5, gain:.05, cut:1100, att:.03, sus:.55, dec:.6, rel:.3}, bass:{gain:.07, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5},
      arp:{gain:.016, oct:4, tones:[0, 1, 2, 1], every:2, att:.02, sus:.3, dec:.4, rel:.3}, echo:{time:.45, fb:.22, wet:.2}, chords:TOWN_CH, melody:TOWN_MEL}},
  {id:3, title:'멜로디 반 빠르기', note:'멜로디는 두 배로 길게(천천히 부름), 반주는 8분음표 펼친 화음이 졸졸 흐름, 32마디',
    def:{bpm:100, lead:{wave:.25, gain:.045, cut:1800, att:.03, sus:.65, dec:.8, rel:.35}, bass:{gain:.065, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5},
      arp:{gain:.017, oct:4, tones:[0, 1, 2, 1], every:1, att:.01, sus:.25, dec:.25, rel:.2}, echo:{time:.6, fb:.22, wet:.2}, chords:stretchCh(TOWN_CH), melody:stretch(TOWN_MEL)}},
  {id:4, title:'색 화음', note:'같은 멜로디에 maj7 · m7 · add9 화음, 84bpm, 펼친 화음이 네 음을 차례로 — 몽글몽글한 8비트',
    def:{bpm:84, lead:{wave:.25, gain:.045, cut:1500, att:.03, sus:.6, dec:.6, rel:.3}, bass:{gain:.065, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5},
      arp:{gain:.016, oct:4, tones:[0, 1, 2, 3], every:2, att:.02, sus:.35, dec:.5, rel:.4}, echo:{time:.5, fb:.25, wet:.22},
      chords:'Cmaj7 | Am7 | Fmaj7 | Gsus4 G | Cmaj7 | Am7 | Dm7 G | Cadd9 | Fmaj7 | Cmaj7 | Fmaj7 | G | Fmaj7 | Em7 | Dm7 G | Gsus4 G', melody:TOWN_MEL}},
  {id:5, title:'멜로디 덜어내기', note:'반 마디에 한 음만 (오른손 적게), 세모파로 천천히 들어왔다 사라짐, 84bpm, 펼친 화음 4분음표',
    def:{bpm:84, lead:{wave:'triangle', gain:.075, att:.05, sus:.6, dec:.8, rel:.6}, bass:{gain:.065, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5},
      arp:{gain:.018, oct:4, tones:[0, 2, 1, 2], every:2, att:.02, sus:.3, dec:.5, rel:.4}, echo:{time:.55, fb:.25, wet:.22}, chords:TOWN_CH, melody:SPARSE}},
  {id:6, title:'아련한 저녁', note:'같은 멜로디 밑 화음을 라단조 쪽으로 (Am F Dm Em …), 80bpm, 펄스 12.5% 얇은 소리 — 조금 쓸쓸하고 아련하게',
    def:{bpm:80, lead:{wave:.125, gain:.05, cut:1600, att:.03, sus:.6, dec:.6, rel:.3}, bass:{gain:.065, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5},
      arp:{gain:.016, oct:3, tones:[0, 1, 2, 1], every:2, att:.02, sus:.3, dec:.5, rel:.4}, echo:{time:.55, fb:.25, wet:.22},
      chords:'Am | F | Dm | Em | Am | F | Dm G | Am | F | C | Dm | Em | F | Em | Dm Em | Am', melody:TOWN_MEL}},
];
