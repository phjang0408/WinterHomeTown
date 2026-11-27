// 피드백 · 후원 링크 (2026-11-26): 메뉴 '정보' 탭과 시작 화면 맨 아래 한 줄. 주소는 config.js LINKS 한 곳에서.
//   - 의견 보내기: 인스타 DM(또는 프로필)을 새 창으로 연다.
//   - 후원: 폰은 송금 링크를 버튼으로 바로 연다(같은 폰으로 QR을 찍을 수 없으니). 데스크톱은 QR을 보여 주고 폰 카메라로 찍게 한다.
//     QR은 LINKS.donateQr 이미지가 있으면 그것, 없으면 송금 주소를 qrcode-generator(MIT, jsdelivr)로 그린다 — 처음 보여 줄 때만 받는다.
//   - 링크가 비어 있으면 흐리게 '준비 중'. 링크 요소는 data-link="insta" · "donate", QR 자리는 [data-qr].
import { LINKS, coarse } from '../config.js';

const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.mjs';
export const instaUrl = () => LINKS.insta ? (LINKS.instaDm ? 'https://ig.me/m/' : 'https://www.instagram.com/') + encodeURIComponent(LINKS.insta.replace(/^@/, '')) : '';
const donateUrl = () => /^https?:\/\//.test(LINKS.donate) ? LINKS.donate : '';

function setLink(a, url){
  if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.classList.remove('off'); a.removeAttribute('aria-disabled'); }
  else { a.removeAttribute('href'); a.classList.add('off'); a.setAttribute('aria-disabled', 'true'); if (!a.dataset.keep) a.dataset.soon = '준비 중'; }
}
export function initLinks(){
  document.querySelectorAll('[data-link=insta]').forEach(a => setLink(a, instaUrl()));
  document.querySelectorAll('[data-link=donate]').forEach(a => setLink(a, donateUrl()));
  document.body.classList.toggle('touch-links', coarse);   // 폰: QR 대신 후원 버튼 (CSS가 고른다)
  // 시작 화면 '후원': 데스크톱은 QR 말풍선을 열고 닫는다, 폰은 링크 그대로
  const t = document.getElementById('intro-donate'), pop = document.getElementById('intro-qr');
  if (t && pop && !coarse) t.onclick = e => { e.preventDefault(); pop.hidden = !pop.hidden; if (!pop.hidden) drawQRs(pop); };
}

// QR 그리기: 모듈 칸마다 검은 네모, 둘레 4칸 흰 여백 (찍히는 데 필요)
let lib = null;
async function drawQR(box){
  if (box.dataset.done) return;
  if (LINKS.donateQr) { box.innerHTML = ''; const img = new Image(); img.src = LINKS.donateQr; img.alt = '후원 QR'; box.append(img); box.dataset.done = 1; return; }
  const url = donateUrl(); if (!url) { box.classList.add('off'); box.textContent = '준비 중'; return; }
  try {
    lib = lib || (await import(QR_LIB)).default;
    const q = lib(0, 'M'); q.addData(url); q.make();
    const n = q.getModuleCount(), px = Math.max(3, Math.floor(168 / (n + 8))), c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = c.height = (n + 8) * px; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + 4) * px, (r + 4) * px, px, px);
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', '후원 QR'); box.innerHTML = ''; box.append(c); box.dataset.done = 1;
  } catch (e) { box.classList.add('off'); box.textContent = 'QR을 그리지 못했어요'; }
}
export function drawQRs(root = document){ if (!coarse) root.querySelectorAll('[data-qr]').forEach(drawQR); }
