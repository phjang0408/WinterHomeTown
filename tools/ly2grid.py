# LilyPond \relative 악보(Mutopia) → core/music.js 칸 악보 (16분음표 한 칸, 한 마디 16칸). 쓰는 법: python3 tools/ly2grid.py winter2.ly "ees''"
import re, sys
STEP = {'c':0, 'd':1, 'e':2, 'f':3, 'g':4, 'a':5, 'b':6}
PCL = {'c':0, 'd':2, 'e':4, 'f':5, 'g':7, 'a':9, 'b':11}
NAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']   # 내림표 조(Eb)라 플랫 이름
def conv(src, start):   # start: 기준음 (예: "ees''")
    src = re.sub(r'%[^\n]*', '', src)
    src = re.sub(r'[_^]?"[^"]*"', ' ', src); src = re.sub(r'[_^]?\\[a-zA-Z]+', ' ', src); src = src.replace('(', ' ').replace(')', ' ')
    m = re.match(r"([a-g])((?:es|is)*)([',]*)", start); ref = (m.group(3).count("'") - m.group(3).count(",") + 3) * 7 + STEP[m.group(1)]   # c' = C4
    cells, dur, dot = [], 4, False
    toks = re.findall(r"[a-g](?:es|is)*[',]*!?(?:\d+\.?)?|r(?:\d+\.?)?|~|\|", src)
    tie = False; bar_cells = []
    for tk in toks:
        if tk == '|': continue
        if tk == '~': tie = True; continue
        m = re.match(r"([a-g]|r)((?:es|is)*)([',]*)!?(\d+)?(\.)?", tk)
        if m.group(4): dur = int(m.group(4)); dot = bool(m.group(5))
        n16 = 16 // dur; n16 = n16 * 3 // 2 if dot else n16
        if m.group(1) == 'r': cells += ['.'] + ['.'] * (n16 - 1); tie = False; continue
        L = m.group(1); s = ref
        cand = min((s // 7 * 7 + STEP[L] + k * 7 for k in (-1, 0, 1)), key=lambda x: abs(x - s))   # 4도 안쪽으로
        cand += 7 * (m.group(3).count("'") - m.group(3).count(","))
        ref = cand; octv = cand // 7
        pc = PCL[L] + m.group(2).count('is') - m.group(2).count('es')
        o2 = octv + (pc // 12); pc %= 12
        name = f"{NAME[pc]}{o2}"
        if tie: cells += ['-'] * n16
        else: cells += [name] + ['-'] * (n16 - 1)
        tie = False
    bars = [' '.join(cells[i:i + 16]) for i in range(0, len(cells), 16)]
    return bars, len(cells) / 16
if __name__ == '__main__':
    body = open(sys.argv[1]).read(); start = sys.argv[2]
    i = body.index('\\relative'); j = body.index('{', i); k = body.index('}', j)
    bars, n = conv(body[j + 1:k], start)
    print(f'// {n} bars'); [print(b + ' |') for b in bars]
