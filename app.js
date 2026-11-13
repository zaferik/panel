/* Zafer İK Paneli · uygulama
   Yönetici: tüm personel, izin, eğitim, talepler, hesaplar, veri yükleme.
   Personel: yalnızca kendi özlük dosyası, izin talebi, sertifika yükleme.
   Yetki tarayıcıda değil, veritabanı kurallarında (RLS) uygulanır. */
'use strict';
const CFG = window.IK_CONFIG || {};
const app = document.getElementById('app');
let sb = null;
try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); } catch (e) { sb = null; }

// ---------------- yardımcılar ----------------
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const ISO_TODAY = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const AYU = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const ST = ['GEÇERLİ', 'ALINDI', 'YAKLAŞIYOR', 'SÜRESİ DOLDU', 'ALINMAMIŞ'];
const stc = s => (s || '').split(' ')[0];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fd = s => { if (!s) return '—'; if (!/^\d{4}-/.test(s)) return esc(s); const [y, m, d] = s.slice(0, 10).split('-'); return `${d}.${m}.${y}`; };
const fdt = s => s ? new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fn = (n, dg = 0) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('tr-TR', { maximumFractionDigits: dg });
const yrs = s => s ? ((TODAY - new Date(s)) / 31557600000) : null;
const pct = x => x == null || isNaN(x) ? '—' : '%' + fn(x * 100, 0);
const fold = s => (s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a');
const $ = id => document.getElementById(id);
const pill = s => s ? `<span class="pill p-${stc(s)}">${esc(s)}</span>` : '—';
const TALEP_AD = { bekliyor: 'Bekliyor', sef_onayladi: 'Şef onayladı', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi', iptal: 'İptal edildi' };
// Talebin amiri var mı? (personel kendi satırını, yönetici herkesi görür; şefin ekibindekilerin amiri zaten kendisidir)
const amirOf = s => { const p = DATA && DATA.byS[s]; if (p) return p.amir_sicil && p.amir_sicil !== s ? p.amir_sicil : null;
  if (DATA && DATA.ekip && DATA.ekip.some(e => e.sicil === s)) return ME.profile.sicil;
  const b = DATA && DATA.bilgi && DATA.bilgi.find(e => e.sicil === s); return b ? b.sef_sicil : null; };
const durumAd = t => t.durum === 'bekliyor' ? (amirOf(t.sicil) ? 'Şef onayı bekliyor' : 'İK onayı bekliyor') : t.durum === 'sef_onayladi' ? 'Şef onayladı · İK\'da' : (TALEP_AD[t.durum] || t.durum);
const tpillT = t => `<span class="pill p-${t.durum}">${esc(durumAd(t))}</span>`;
const kisiAd = s => (DATA.byS[s] && DATA.byS[s].ad) || ((DATA.ekip || []).find(e => e.sicil === s) || {}).ad || ((DATA.bilgi || []).find(e => e.sicil === s) || {}).ad
  || ((DATA.bilgi || []).find(e => e.sef_sicil === s) || {}).sef_ad || s;
const tpill = s => `<span class="pill p-${s}">${TALEP_AD[s] || esc(s)}</span>`;
// Yönetici ekranlarını görenler: admin (tam yetki) ve izleyici (salt okunur)
const GOREN = () => !!ME && ['admin', 'izleyici'].includes(ME.profile.role);
const SALT = () => !!ME && ME.profile.role === 'izleyici';
const emailOf = sicil => `${String(sicil).trim()}@${CFG.EMAIL_DOMAIN || 'zafer-ik.local'}`.toLowerCase();
function gunSay(a, b) { if (!a || !b) return 0; const d = (new Date(b) - new Date(a)) / 86400000 + 1; return d > 0 ? d : 0; }
function csvIndir(ad, satirlar) {
  const t = '﻿' + satirlar.map(r => r.map(x => { const v = String(x ?? ''); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = ad; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function modal(html, onReady) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  onReady && onReady(bg, close);
  return close;
}
function sifreGoster(baslik, sicil, ad, sifre) {
  modal(`<h3>${esc(baslik)}</h3><p>${esc(ad || '')} · Sicil <b>${esc(sicil)}</b></p><p>Geçici şifre:</p><div class="pw" id="pwv">${esc(sifre)}</div>
  <p class="mini">Personel ilk girişte bu şifreyi değiştirmek zorunda. Şifre bir daha gösterilmez; şimdi not alın veya iletin.</p>
  <div class="acts"><button class="btn" id="pwc">Kopyala</button><button class="btn pri" data-close>Tamam</button></div>`, (bg) => {
    bg.querySelector('#pwc').onclick = async e => { try { await navigator.clipboard.writeText(sifre); e.target.textContent = 'Kopyalandı'; } catch { const r = document.createRange(); r.selectNodeContents(bg.querySelector('#pwv')); getSelection().removeAllRanges(); getSelection().addRange(r); } };
  });
}
(function () { let t = null; try { t = localStorage.getItem('ik-theme'); } catch (e) { } if (t) document.documentElement.dataset.theme = t; })();
function temaDegistir() {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const n = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('ik-theme', n); } catch (e) { }
}

async function fetchAll(table, select = '*', mod) {
  const out = []; const step = 1000;
  for (let from = 0; ; from += step) {
    let q = sb.from(table).select(select).range(from, from + step - 1);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < step) break;
  }
  return out;
}

// ---------------- oturum ----------------
let ME = null;   // { profile, user }
let DATA = null; // indekslenmiş veri

async function start() {
  if (!sb || !CFG.SUPABASE_URL || CFG.SUPABASE_URL.includes('PROJE-KODUNUZ')) {
    app.innerHTML = `<div class="login"><div class="login-card"><h2>Kurulum eksik</h2><p class="sub">config.js dosyasına Supabase adresini ve anon anahtarını yazın.</p></div></div>`; return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return loginView();
  await afterLogin(session.user);
}

// Uçak: üstten görünüş, burun yukarıda (0..200 x 0..260). Kesik çizgili gövde + noktalı ayrıntılar.
const U_GOVDE = 'M100 4C108 4 112 18 112 40V88L186 133L193 128L198 121L196 134V146L112 130V196C112 206 111 212 110 216L146 229L149 237L108 230C106 240 103 247 100 253C97 247 94 240 92 230L51 237L54 229L90 216C89 212 88 206 88 196V130L4 146V134L2 121L7 128L14 133L88 88V40C88 18 92 4 100 4Z';
const UCAK = `
  <path d="${U_GOVDE}" fill="#fff" opacity=".22" filter="url(#parilti)"/>
  <g fill="rgba(255,255,255,.12)" stroke="#fff" stroke-linejoin="round" stroke-linecap="round">
    <path class="govde" vector-effect="non-scaling-stroke" stroke-width="2.6" stroke-dasharray="8 5" d="${U_GOVDE}"/>
    <ellipse class="govde" vector-effect="non-scaling-stroke" stroke-width="2.2" stroke-dasharray="5 4" cx="146" cy="116" rx="7" ry="15"/>
    <ellipse class="govde" vector-effect="non-scaling-stroke" stroke-width="2.2" stroke-dasharray="5 4" cx="54" cy="116" rx="7" ry="15"/>
  </g>
  <g fill="none" stroke="#fff" stroke-linecap="round" vector-effect="non-scaling-stroke">
    <path vector-effect="non-scaling-stroke" stroke-width="2" d="M93 27Q100 19 107 27"/>
    <path vector-effect="non-scaling-stroke" stroke-width="1.6" stroke-dasharray="1 6" d="M100 40V200"/>
    <path vector-effect="non-scaling-stroke" stroke-width="1.6" stroke-dasharray="1 6" d="M116 120L184 138M84 120L16 138"/>
    <path vector-effect="non-scaling-stroke" stroke-width="1.6" stroke-dasharray="1 6" d="M114 102L176 134M86 102L24 134"/>
    <path vector-effect="non-scaling-stroke" stroke-width="1.4" stroke-dasharray="1 6" d="M112 221L140 230M88 221L60 230"/>
    <path vector-effect="non-scaling-stroke" stroke-width="2" d="M146 103V97M54 103V97"/>
  </g>
  <circle class="isik" cx="196" cy="140" r="3.2" fill="#fff"/><circle class="isik" cx="4" cy="140" r="3.2" fill="#fff"/>
  <circle class="isik i2" cx="100" cy="250" r="2.6" fill="#fff"/>`;
// Logodaki beyaz kavisler (logo dosyasından birebir çıkarıldı, 390x437 logo koordinatları)
const KAVIS = 'M-2.0 355.8C-1.5 361.4 -0.1 355.5 1.0 355.8C2.1 356.2 3.0 357.3 4.8 358.2C6.5 359.0 9.0 360.0 11.4 360.7C13.7 361.4 16.2 362.0 18.8 362.5C21.2 363.1 22.2 363.6 26.4 363.8C30.6 364.0 40.2 364.0 44.0 363.8C47.8 363.7 47.4 363.2 49.1 363.0C50.8 362.8 52.2 362.9 54.1 362.7C56.1 362.5 58.0 362.1 60.9 361.6C63.8 361.1 67.1 360.5 71.5 359.5C75.9 358.4 83.4 356.6 87.5 355.5C91.6 354.4 90.8 354.7 96.2 352.9C101.7 351.2 114.5 346.9 120.1 345.0C125.7 343.0 124.5 343.5 129.9 341.3C135.2 339.2 146.6 334.5 152.4 332.1C158.1 329.6 161.8 327.9 164.4 326.6C167.0 325.4 167.2 325.1 168.0 324.6C168.8 324.1 169.1 323.7 169.1 323.5C169.1 323.3 168.7 323.2 168.2 323.2C167.7 323.2 169.8 322.6 166.2 323.5C162.7 324.5 153.3 327.2 146.8 328.8C140.2 330.3 132.3 331.7 126.9 332.7C121.5 333.7 118.7 334.1 114.2 334.8C109.8 335.5 103.3 336.5 100.0 336.9C96.7 337.2 96.0 336.9 94.2 337.1C92.5 337.3 92.0 337.8 89.4 337.9C86.7 338.1 81.1 337.9 78.2 338.0C75.4 338.2 74.8 338.8 72.2 338.9C69.7 339.1 65.2 339.0 62.9 338.9C60.5 338.7 60.5 338.2 58.0 338.1C55.5 337.9 50.9 338.1 47.9 337.9C44.9 337.6 43.5 337.4 40.0 336.7C36.5 336.1 30.1 334.8 26.9 334.0C23.6 333.2 22.7 332.8 20.4 332.0C18.0 331.1 14.8 329.8 12.9 328.9C11.0 328.1 10.7 328.0 8.9 326.9C7.0 325.8 3.6 323.2 1.8 322.4C-0.1 321.6 -1.4 316.7 -2.0 322.2C-2.6 327.8 -2.5 350.2 -2.0 355.8ZM224.4 304.2C223.8 304.3 225.4 303.2 219.7 306.3C214.1 309.5 199.2 318.3 190.5 323.2C181.8 328.0 176.4 331.1 167.8 335.6C159.1 340.1 144.8 347.2 138.8 350.1C132.8 353.0 134.3 352.0 131.8 353.1C129.2 354.3 127.4 355.4 123.6 357.1C119.8 358.8 114.8 361.0 109.0 363.4C103.2 365.7 95.4 368.8 88.6 371.3C81.9 373.7 74.3 376.1 68.4 377.9C62.4 379.6 57.1 380.8 52.9 381.7C48.6 382.7 45.8 383.2 42.8 383.7C39.8 384.3 39.6 384.7 34.9 384.9C30.2 385.1 19.3 385.1 14.6 384.9C10.0 384.7 9.0 384.2 6.9 383.7C4.7 383.2 3.1 382.3 1.6 382.1C0.2 381.8 -1.4 372.6 -2.0 382.1C-2.6 391.6 -3.2 429.5 -2.0 439.0C-0.8 448.5 4.1 439.5 5.3 439.0C6.6 438.5 5.1 436.8 5.4 436.1C5.7 435.5 4.2 436.2 7.1 435.3C9.9 434.4 18.5 432.1 22.6 430.8C26.8 429.5 28.3 428.8 31.9 427.3C35.5 425.9 39.2 424.4 44.2 422.1C49.2 419.9 54.9 417.5 61.9 413.9C68.9 410.3 78.9 404.8 86.4 400.5C93.8 396.3 99.8 392.5 106.5 388.4C113.2 384.3 118.2 381.3 126.4 375.9C134.6 370.5 146.0 362.7 155.8 356.0C165.5 349.2 176.5 341.3 184.8 335.3C193.0 329.2 199.8 324.0 205.4 319.8C211.0 315.6 215.3 312.2 218.2 309.8C221.2 307.5 222.1 306.6 223.1 305.7C224.1 304.7 224.9 304.1 224.4 304.2ZM-2.0 267.4C-2.5 272.6 -2.5 293.8 -2.0 299.1C-1.5 304.4 -1.4 298.0 1.0 299.2C3.4 300.4 8.3 304.1 12.5 306.1C16.7 308.2 23.0 310.5 26.1 311.7C29.3 313.0 29.0 312.8 31.4 313.5C33.7 314.1 36.5 314.9 40.2 315.7C44.0 316.6 50.2 317.9 53.9 318.6C57.5 319.2 59.7 319.5 62.1 319.8C64.6 320.0 66.5 319.8 68.5 320.0C70.5 320.1 68.2 320.7 74.1 320.8C80.1 321.0 98.3 321.0 104.1 320.8C110.0 320.7 107.2 320.1 109.2 320.0C111.3 319.8 114.4 320.0 116.4 319.8C118.3 319.6 119.4 319.2 120.9 319.0C122.3 318.8 123.3 318.9 125.1 318.7C126.9 318.5 130.4 317.9 131.7 317.7C133.0 317.4 132.8 317.1 133.0 316.9C133.2 316.7 133.0 316.6 132.9 316.5C132.7 316.3 132.8 316.2 132.2 316.0C131.6 315.8 131.7 315.4 129.2 315.2C126.8 315.0 120.5 315.1 117.8 314.9C115.0 314.8 114.5 314.3 113.0 314.1C111.5 314.0 113.2 314.6 108.9 313.9C104.5 313.1 93.3 311.1 87.0 309.7C80.7 308.3 75.9 306.9 70.9 305.4C65.9 304.0 61.8 302.6 57.1 300.9C52.5 299.1 47.6 297.1 43.0 295.0C38.4 292.9 33.3 290.3 29.2 288.1C25.2 285.9 21.6 283.6 18.8 281.8C15.9 279.9 14.8 279.3 11.9 276.9C9.0 274.5 3.6 269.2 1.3 267.6C-1.1 266.0 -1.5 262.1 -2.0 267.4ZM349.9 199.7C349.7 199.5 349.1 199.8 348.3 200.4C347.5 201.1 346.3 202.2 345.1 203.5C343.9 204.8 344.0 205.1 341.1 208.2C338.3 211.4 330.8 219.5 327.9 222.7C325.0 225.9 325.7 225.5 323.9 227.5C322.1 229.4 319.1 232.3 317.1 234.4C315.2 236.5 314.7 237.5 312.2 240.2C309.8 242.8 304.9 247.5 302.3 250.2C299.8 252.9 305.2 248.1 297.0 256.4C288.8 264.7 261.2 292.2 253.1 300.2C244.9 308.2 250.4 302.3 248.1 304.4C245.8 306.6 245.3 307.6 239.3 313.0C233.4 318.4 219.9 330.3 212.4 336.8C204.8 343.4 199.5 347.7 194.0 352.2C188.5 356.6 185.3 359.1 179.6 363.5C173.9 367.8 165.1 374.5 159.9 378.3C154.6 382.1 153.4 383.0 148.2 386.4C143.1 389.9 135.6 395.0 129.2 399.1C122.9 403.2 117.2 406.6 110.0 410.9C102.8 415.1 93.4 420.5 85.9 424.5C78.4 428.5 68.7 433.1 65.0 435.1C61.3 437.0 64.0 435.5 63.7 436.2C63.5 436.8 49.1 438.5 63.7 439.0C78.3 439.5 136.7 439.5 151.3 439.0C165.9 438.5 150.4 437.4 151.4 436.0C152.3 434.5 155.0 432.2 157.2 430.2C159.3 428.2 155.8 432.4 164.2 424.1C172.6 415.8 199.8 388.6 207.8 380.4C215.7 372.3 210.2 377.4 212.0 375.4C213.8 373.5 216.7 370.7 218.5 368.7C220.4 366.7 221.3 365.3 222.9 363.5C224.5 361.8 224.9 361.7 228.1 358.1C231.3 354.5 236.4 348.8 242.3 341.8C248.2 334.9 256.1 325.7 263.7 316.4C271.4 307.0 280.0 296.3 288.2 285.8C296.5 275.2 305.0 263.9 313.1 253.0C321.2 242.1 331.2 227.9 336.7 220.1C342.2 212.4 344.0 209.6 346.1 206.5C348.2 203.4 348.7 202.7 349.3 201.5C349.9 200.4 350.0 199.9 349.9 199.7ZM-2.0 192.7C-2.5 199.8 -2.5 228.3 -2.0 235.4C-1.5 242.6 -0.3 234.7 0.9 235.5C2.1 236.4 2.1 237.4 5.1 240.5C8.1 243.6 15.0 250.6 19.0 254.3C23.1 258.0 25.7 259.8 29.4 262.4C33.1 265.1 38.1 268.3 41.2 270.4C44.4 272.4 44.5 272.5 48.5 274.6C52.5 276.7 60.4 280.8 65.2 283.0C70.1 285.2 72.1 285.9 77.4 287.8C82.6 289.7 90.9 292.6 96.9 294.3C102.9 296.1 109.8 297.6 113.4 298.4C116.9 299.2 117.2 299.0 118.1 299.1C119.0 299.2 118.9 299.1 119.0 299.0C119.1 298.9 119.0 298.7 118.5 298.4C117.9 298.1 117.9 298.0 115.9 297.1C113.8 296.2 108.9 294.3 106.1 293.0C103.3 291.8 101.6 290.9 99.0 289.5C96.4 288.1 94.1 286.8 90.4 284.6C86.7 282.4 81.9 279.5 76.9 276.3C71.9 273.0 65.7 268.8 60.4 264.8C55.0 260.8 50.1 257.0 44.9 252.3C39.7 247.6 33.4 241.2 29.2 236.7C25.0 232.2 22.4 228.6 19.9 225.2C17.4 221.9 15.7 219.3 14.1 216.8C12.4 214.2 11.5 212.6 10.0 210.0C8.5 207.4 6.4 203.9 5.0 201.1C3.6 198.4 2.2 194.9 1.5 193.6C0.8 192.2 1.3 192.9 0.8 192.8C0.2 192.6 -1.5 185.6 -2.0 192.7ZM12.9 180.7C12.5 180.9 12.6 181.1 12.5 181.4C12.4 181.6 12.3 181.6 12.4 182.3C12.6 183.1 12.0 182.7 13.6 185.9C15.2 189.0 19.5 196.6 22.3 201.2C25.1 205.9 27.3 209.2 30.5 213.6C33.7 218.0 36.6 222.3 41.5 227.7C46.3 233.1 55.2 241.7 59.5 245.9C63.8 250.0 63.9 249.9 67.4 252.6C70.9 255.3 77.8 260.2 80.4 262.1C83.0 263.9 82.2 263.2 83.1 263.7C84.1 264.1 87.2 266.4 86.1 264.9C84.9 263.4 78.7 257.3 76.1 254.8C73.5 252.3 72.0 251.3 70.4 249.9C68.8 248.5 68.0 247.7 66.6 246.2C65.3 244.6 63.7 242.5 62.1 240.8C60.5 239.0 58.9 237.6 57.2 235.6C55.5 233.6 53.8 231.5 51.9 229.0C50.0 226.5 48.1 224.0 45.8 220.8C43.5 217.5 40.6 213.1 38.2 209.4C35.9 205.6 33.9 202.5 31.6 198.2C29.3 194.0 25.8 186.8 24.4 184.0C23.0 181.2 23.4 182.2 22.9 181.7C22.4 181.1 22.1 180.8 21.5 180.6C21.0 180.3 20.8 180.2 19.7 180.1C18.6 180.0 16.0 180.0 14.9 180.1C13.8 180.2 13.3 180.4 12.9 180.7Z';
const SAHNE = `<svg class="scene" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="iz" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="470"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="isik" cx="78%" cy="22%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="parilti" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="ac"><rect x="-40" y="0" width="0" height="900"><animate attributeName="width" from="0" to="880" dur="1.8s" begin="0.15s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/></rect></clipPath>
  </defs>
  <rect width="800" height="900" fill="url(#isik)"/>
  <g clip-path="url(#ac)"><path fill="#fff" transform="translate(0 -62) scale(2.2)" d="${KAVIS}"/></g>
  <path class="rota" d="M300 520C380 430 450 360 520 300" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 14" opacity=".7"/>
  <g class="plane"><g transform="translate(590 205) rotate(40) scale(1.6) translate(-100 -128)">
    <g class="iz" fill="none" stroke="url(#iz)" stroke-linecap="round">
      <path vector-effect="non-scaling-stroke" stroke-width="3.4" stroke-dasharray="1 10" d="M146 134V470M54 134V470"/>
      <path vector-effect="non-scaling-stroke" stroke-width="2" stroke-dasharray="1 9" d="M196 148V400M4 148V400" opacity=".55"/>
    </g>
    ${UCAK}</g></g>
</svg>`;

function loginView(msg) {
  app.innerHTML = `<div class="auth">
  <section class="auth-art">${SAHNE}
    <div class="copy"><div class="eyebrow">Zafer Havalimanı · İnsan &amp; Kültür</div>
      <h1>Personel Portalı</h1>
      <p>Özlük bilgileriniz, izin bakiyeniz ve eğitimleriniz tek yerde. İzin talebinizi buradan iletin, sertifikanızı buradan yükleyin.</p></div>
    <div><div class="feats"><span>Özlük dosyası</span><span>Yıllık izin</span><span>SHGM eğitimleri</span><span>Sertifika yükleme</span></div></div>
  </section>
  <section class="auth-side"><div class="auth-box">
    <img class="logo" src="logo.png" alt="Zafer Airport">
    <h2>Giriş yap</h2><p class="sub">Sicil numaranız ve şifrenizle giriş yapın.</p>
    <form class="form" id="lf" autocomplete="on">
      <label>Sicil No<input id="ls" name="username" inputmode="numeric" autocomplete="username" placeholder="Örn. 31776" required></label>
      <label>Şifre<span class="pwwrap"><input id="lp" name="password" type="password" autocomplete="current-password" required><button type="button" id="lpt" aria-label="Şifreyi göster">Göster</button></span></label>
      ${msg ? `<div class="msg err">${esc(msg)}</div>` : ''}<div id="lm"></div>
      <button class="btn pri" type="submit" id="lb">Giriş yap</button>
      <p class="mini" style="margin:0">Şifrenizi unuttuysanız İnsan &amp; Kültür birimine başvurun.</p>
    </form>
    <div class="auth-foot"><span>Zafer Havalimanı · İçtaş</span><span>LTBZ / KZR</span></div>
  </div></section></div>`;
  $('lpt').onclick = () => { const i = $('lp'), g = i.type === 'password'; i.type = g ? 'text' : 'password'; $('lpt').textContent = g ? 'Gizle' : 'Göster'; };
  $('lf').onsubmit = async e => {
    e.preventDefault();
    const sicil = $('ls').value.trim(), pw = $('lp').value;
    $('lb').disabled = true; $('lb').textContent = 'Giriş yapılıyor…'; $('lm').innerHTML = '';
    const { data, error } = await sb.auth.signInWithPassword({ email: emailOf(sicil), password: pw });
    $('lb').disabled = false; $('lb').textContent = 'Giriş yap';
    if (error) { $('lm').innerHTML = `<div class="msg err">Sicil no veya şifre hatalı.</div>`; return; }
    await afterLogin(data.user);
  };
}

async function afterLogin(user) {
  app.innerHTML = '<div class="loading">Yükleniyor…</div>';
  const { data: prof, error } = await sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error || !prof || !prof.aktif) { await sb.auth.signOut(); return loginView('Bu hesap için panel erişimi tanımlı değil.'); }
  ME = { user, profile: prof };
  if (prof.must_change_password) return sifreDegistirView(true);
  await loadData();
  await acilis();
}
// El kitabı onaylanmadıysa önce kitap, sonra panel
async function acilis() { await ekYukle(); if (ekGerekli()) ekKapi(); else shell(); }

function sifreDegistirView(zorunlu) {
  const html = `<div class="brand" style="margin-bottom:14px"><img src="logo.png" alt="Zafer Airport" style="height:44px;width:auto;border-radius:3px"><div><h1 style="font-size:22px">${zorunlu ? 'Yeni şifrenizi belirleyin' : 'Şifre değiştir'}</h1><small>${zorunlu ? 'İlk girişte geçici şifrenizi değiştirmeniz gerekiyor.' : ''}</small></div></div>
  <form class="form" id="sf"><label>Yeni şifre<input id="s1" type="password" autocomplete="new-password" minlength="8" required></label>
  <label>Yeni şifre (tekrar)<input id="s2" type="password" autocomplete="new-password" minlength="8" required></label>
  <p class="mini" style="margin:0">En az 8 karakter; harf ve rakam içersin.</p><div id="sm"></div>
  <div class="actions"><button class="btn pri" type="submit">Kaydet</button>${zorunlu ? '<button class="btn" type="button" id="so">Çıkış</button>' : '<button class="btn" type="button" data-close>Vazgeç</button>'}</div></form>`;
  const bind = (root, close) => {
    root.querySelector('#sf').onsubmit = async e => {
      e.preventDefault();
      const a = root.querySelector('#s1').value, b = root.querySelector('#s2').value, m = root.querySelector('#sm');
      if (a !== b) { m.innerHTML = '<div class="msg err">Şifreler aynı değil.</div>'; return; }
      if (a.length < 8 || !/[0-9]/.test(a) || !/[^0-9]/.test(a)) { m.innerHTML = '<div class="msg err">Şifre en az 8 karakter olmalı, harf ve rakam içermeli.</div>'; return; }
      const { error } = await sb.auth.updateUser({ password: a });
      if (error) { m.innerHTML = `<div class="msg err">Şifre kaydedilemedi: ${esc(error.message)}</div>`; return; }
      await sb.rpc('sifre_degisti');
      ME.profile.must_change_password = false;
      if (zorunlu) { await loadData(); await acilis(); } else { m.innerHTML = '<div class="msg ok">Şifreniz değiştirildi.</div>'; setTimeout(close, 900); }
    };
    const so = root.querySelector('#so'); if (so) so.onclick = cikis;
  };
  if (zorunlu) { app.innerHTML = `<div class="login"><div class="login-card">${html}</div></div>`; bind(app); }
  else modal(html, bind);
}
async function cikis() { window.onhashchange = null; document.body.classList.remove('salt-okunur'); if (ekBirak) { ekBirak(); ekBirak = null; } await sb.auth.signOut(); ME = null; DATA = null; history.replaceState(null, '', location.pathname); loginView(); }

// ---------------- veri ----------------
async function loadData() {
  const admin = GOREN();
  const [pers, bak, ik, ed, ek, kat] = await Promise.all([
    fetchAll('personel'), fetchAll('izin_bakiye'),
    fetchAll('izin_kayit', 'sicil,baslangic,bitis,gun,aciklama,kaynak', q => q.order('id')),
    fetchAll('egitim_durum'), fetchAll('egitim_kayit', 'sicil,tarih,egitim,shgm,saat,egitmen,ic_dis,tur', q => q.order('id')),
    fetchAll('egitim_katalog')]);
  let rapor = {};
  if (admin) { const { data } = await sb.from('rapor').select('anahtar,veri'); (data || []).forEach(r => rapor[r.anahtar] = r.veri); }
  const leave = {}; bak.forEach(b => leave[b.sicil] = b);
  const donem = (bak[0] && bak[0].donem) || rapor.izin_donem || (TODAY.getMonth() + 1);
  const group = (rows, f) => { const m = {}; rows.forEach(r => (m[r.sicil] = m[r.sicil] || []).push(f(r))); return m; };
  const leaveRecs = group(ik, r => [r.baslangic, r.bitis, r.gun, r.aciklama, r.kaynak]);
  // Panelden onaylanıp henüz Excel'e girilmemiş izinler: bakiyeden düş, aylık kullanıma ekle
  const panelGun = {};
  ik.filter(r => r.kaynak === 'panel').forEach(r => {
    const L = leave[r.sicil]; const g = Number(r.gun) || 0; panelGun[r.sicil] = (panelGun[r.sicil] || 0) + g;
    if (!L || !r.baslangic) return;
    if (!L._kopya) { leave[r.sicil] = { ...L, kalan: (L.kalan || []).map(Number), kullanim: (L.kullanim || []).map(Number), _kopya: true }; }
    const X = leave[r.sicil], m = Number(r.baslangic.slice(5, 7)) - 1, yil = Number(r.baslangic.slice(0, 4));
    if (yil !== (X.yil || TODAY.getFullYear())) return;
    if (X.kullanim[m] != null) X.kullanim[m] += g;
    for (let k = m; k < 12; k++) if (X.kalan[k] != null) X.kalan[k] -= g;
  });
  // Bağlı personel (AMİR SİCİL zinciri): özlük kaydı TC no ve İK notu olmadan gelir; izin/eğitim kayıtları zaten görünür
  let alt = [];
  if (!admin) { try { const { data, error } = await sb.rpc('ekip_personel'); if (!error && data) { const var_ = new Set(pers.map(p => p.sicil)); data.forEach(p => { if (p && !var_.has(p.sicil)) { pers.push(p); var_.add(p.sicil); } alt.push(p.sicil); }); } } catch (e) { alt = []; } }
  let ekip = [];
  try { const { data } = await sb.rpc('ekibim'); ekip = data || []; } catch (e) { ekip = []; }
  let bilgi = [];
  try { const { data, error } = await sb.rpc('bilgi_ekip'); bilgi = error ? [] : (data || []); } catch (e) { bilgi = []; }
  await imzalariYukle();
  const shgm = group(ed, r => [r.kod, r.egitim, r.son_tarih, r.periyot, r.bitis, r.kalan_gun, r.durum]);
  const hist = group(ek, r => [r.tarih, r.egitim, r.shgm, r.saat, r.egitmen, r.ic_dis, r.tur]);
  Object.values(hist).forEach(a => a.sort((x, y) => String(y[0]).localeCompare(String(x[0]))));
  const DONEM = donem - 1;
  const P = pers.map(p => {
    const k = p.sicil, L = leave[k] || null, S = shgm[k] || [], H = hist[k] || [], pg = panelGun[k] || 0;
    const cnt = {}; ST.forEach(s => cnt[s] = 0); S.forEach(r => cnt[r[6]] = (cnt[r[6]] || 0) + 1);
    const zor = S.length, uyum = zor ? (cnt['GEÇERLİ'] + cnt['ALINDI'] + cnt['YAKLAŞIYOR']) / zor : null;
    // Kalan = Excel'deki dönem sonu bakiyesi − panelden onaylanan (Excel'e henüz girilmemiş) günler
    const orj = L && L._kopya ? bak.find(b => b.sicil === k) : L;
    const kalan = orj && orj.kalan ? Number(orj.kalan[DONEM]) - pg : null;
    const kul = orj && orj.kullanim ? orj.kullanim.slice(0, DONEM + 1).reduce((a, b) => a + (Number(b) || 0), 0) + pg : null;
    const yil = String(TODAY.getFullYear());
    const yilSaat = H.filter(h => String(h[0]).startsWith(yil)).reduce((a, h) => a + (Number(h[3]) || 0), 0);
    return { ...p, dep: (p.departman || '—').trim(), L, S, H, cnt, zor, uyum, kalan, kul, panelGun: pg, kidem: yrs(p.gruba_giris), yas: yrs(p.dogum), yilSaat,
      fx: fold(p.ad + ' ' + (p.sicil || '') + ' ' + (p.unvan || '')) };
  }).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const ACT = P.filter(p => p.durum === 'Etkin');
  DATA = { P, byS: Object.fromEntries(P.map(p => [p.sicil, p])), ACT, DEPS: [...new Set(ACT.map(p => p.dep))].sort((a, b) => a.localeCompare(b, 'tr')),
    leaveRecs, katalog: kat.sort((a, b) => a.kod.localeCompare(b.kod, 'tr')), rapor, DONEM, ekip, bilgi, alt, bakHam: bak };
}

async function imzalariYukle() {
  let rows = [];
  try { const { data } = await sb.from('imza').select('anahtar,ad,png').order('ad'); rows = data || []; } catch (e) { rows = []; }
  window.__IMZALAR = rows;
  if (window.Sertifika) await Sertifika.imzalariAyarla(Object.fromEntries(rows.map(r => [r.anahtar, r.png])));
}
// Taranmış/fotoğraflanmış imzayı şeffaf PNG'ye çevirir (açık renkler silinir, kenarlar kırpılır)
function imzaHazirla(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('Dosya okunamadı'));
    fr.onload = () => { const img = new Image(); img.onerror = () => rej(new Error('Görsel açılamadı; PNG veya JPG seçin')); img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, 1600 / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h), p = d.data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let i = 0; i < p.length; i += 4) {
        const lum = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2], a = Math.max(0, Math.min(255, (232 - lum) * 2.4)) * (p[i + 3] / 255);
        p[i + 3] = a; if (a > 40) { const px = (i / 4) % w, py = Math.floor(i / 4 / w); if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      }
      if (x1 <= x0) return rej(new Error('Görselde imza bulunamadı; beyaz kâğıda koyu renk imza olmalı'));
      x.putImageData(d, 0, 0); const pad = 8, cw = Math.min(w, x1 - x0 + 2 * pad), ch = Math.min(h, y1 - y0 + 2 * pad);
      const o = document.createElement('canvas'); o.width = cw; o.height = ch; o.getContext('2d').drawImage(c, Math.max(0, x0 - pad), Math.max(0, y0 - pad), cw, ch, 0, 0, cw, ch);
      const u = o.toDataURL('image/png'); if (u.length > 590000) return rej(new Error('İmza görseli çok büyük; daha küçük bir görsel seçin')); res(u);
    }; img.src = fr.result; };
    fr.readAsDataURL(file);
  });
}

// ---------------- kabuk ----------------
const TABS_ADMIN = [['genel', 'Genel Bakış'], ['personel', 'Personel'], ['izin', 'İzin'], ['egitim', 'Eğitim'], ['talepler', 'Talepler'], ['sertifika', 'Sertifika Üret'], ['hesaplar', 'Hesaplar'], ['veri', 'Veri Yükle'], ['elkitabi', 'El Kitabı']];
const TABS_PERS = [['dosyam', 'Dosyam'], ['taleplerim', 'İzin Taleplerim'], ['sertifikalarim', 'Sertifikalarım'], ['elkitabi', 'El Kitabı']];
function shell() {
  const admin = GOREN();
  document.body.classList.toggle('salt-okunur', SALT());
  const me = DATA.byS[ME.profile.sicil];
  const tabs = (admin ? TABS_ADMIN.filter(t => !SALT() || !['sertifika', 'hesaplar', 'veri'].includes(t[0])) : TABS_PERS).slice();
  if (!admin && DATA.alt.length) tabs.splice(1, 0, ['personelim', 'Bağlı Personel']);
  if (DATA.ekip.length) tabs.splice(admin ? 5 : 1, 0, ['ekibim', 'Ekibim']);
  if (DATA.bilgi.length) tabs.splice(tabs.findIndex(t => t[0] === 'ekibim') + 1 || (admin ? 5 : 1), 0, ['bilgi', 'Bilgi']);
  app.innerHTML = `<header class="top"><div class="wrap">
    <div class="brand"><img src="logo.png" alt="Zafer Airport"><div><h1>İK Paneli</h1><small>Zafer Havalimanı · ${SALT() ? 'İzleyici (salt okunur)' : admin ? 'Yönetici' : 'Personel'}</small></div></div>
    ${admin ? `<div class="search"><input id="q" type="search" placeholder="Personel ara: ad veya sicil…" autocomplete="off" aria-label="Personel ara"><div class="sugg" id="sugg" hidden></div></div>` : ''}
    <div class="ust-sag"><div class="user-chip"><span><b>${esc(me ? me.ad : ME.profile.sicil)}</b></span>
      <button class="theme-btn" id="pwBtn" type="button">Şifre</button><button class="theme-btn" id="themeBtn" type="button" aria-label="Tema değiştir">◐</button><button class="theme-btn" id="outBtn" type="button">Çıkış</button></div>
      <button class="dg" id="dg" type="button" hidden></button></div>
    <nav class="tabs" id="tabs">${tabs.map(([v, t]) => `<a href="#${v}" data-v="${v}">${t}${v === 'talepler' ? ' <span id="tcount"></span>' : v === 'ekibim' ? ' <span id="ecount2"></span>' : v === 'bilgi' ? ' <span id="bcount"></span>' : ''}</a>`).join('')}</nav>
  </div></header><main class="wrap" id="view"></main>`;
  $('themeBtn').onclick = temaDegistir; $('outBtn').onclick = cikis; $('pwBtn').onclick = () => sifreDegistirView(false);
  const view = $('view');
  view.addEventListener('click', e => { const t = e.target.closest('[data-p]'); if (t && !e.target.closest('a,button,input,select,textarea') && (admin || DATA.alt.includes(t.dataset.p))) location.hash = 'p-' + t.dataset.p; });
  view.addEventListener('keydown', e => { if (e.key === 'Enter') { const t = e.target.closest('[data-p]'); if (t && !admin && !DATA.alt.includes(t.dataset.p)) return; if (t && t.matches('tr,.row')) location.hash = 'p-' + t.dataset.p; } });
  if (admin) { aramaKur(); bekleyenSay(); }
  if (DATA.ekip.length) ekipBekleyenSay();
  if (DATA.bilgi.length) bilgiSay();
  dogumGunleri(); onizlemeSerit();
  window.onhashchange = route; route();
}
// Bugün doğum günü olanlar (herkese, sağ üstte)
const PASTA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20.5h16M5 20.5v-7h14v7M5 16.5c1.5 1 2.5 1 3.5 0s2 -1 3.5 0 2 1 3.5 0 2-1 3.5 0M12 13.5v-3M12 7.5c-1 0-1.5-.8-1.5-1.6 0-1 1.5-2.4 1.5-2.4s1.5 1.4 1.5 2.4c0 .8-.5 1.6-1.5 1.6z"/></svg>';
async function dogumGunleri() {
  const el = $('dg'); if (!el) return;
  let L = [];
  try { const { data, error } = await sb.rpc('bugun_dogan'); if (error) return; L = data || []; } catch (e) { return; }
  if (!L.length || !$('dg')) return;
  const isim = a => a.toLocaleLowerCase('tr-TR').split(' ').filter(Boolean).map(w => w[0].toLocaleUpperCase('tr-TR') + w.slice(1)).join(' ');
  const goster = L.slice(0, 2).map(x => isim(x.ad)).join(', ') + (L.length > 2 ? ` +${L.length - 2}` : '');
  el.innerHTML = `${PASTA}<span>Bugün doğum günü: <b>${esc(goster)}</b></span>`;
  el.title = L.map(x => isim(x.ad)).join(', '); el.hidden = false;
  el.onclick = () => modal(`<div class="dg-modal"><div class="dg-ikon">${PASTA.replace(/16/g, '34')}</div><h3>Bugün doğum günü olanlar</h3>
    <ul>${L.map(x => `<li><b>${esc(isim(x.ad))}</b>${x.departman ? `<span class="mini">${esc(x.departman)}</span>` : ''}</li>`).join('')}</ul>
    <p class="mini">Nice mutlu yıllara! 🎉</p></div><div class="acts"><button class="btn pri" data-close>Kapat</button></div>`);
}
const ikBekliyor = t => t.durum === 'sef_onayladi' || (t.durum === 'bekliyor' && !amirOf(t.sicil));
async function bekleyenSay() {
  const [a, b] = await Promise.all([
    sb.from('izin_talep').select('sicil,durum').in('durum', ['bekliyor', 'sef_onayladi']),
    sb.from('sertifika').select('id', { count: 'exact', head: true }).eq('durum', 'bekliyor')]);
  let oz = 0; try { const c = await sb.from('ozluk_evrak').select('id', { count: 'exact', head: true }).eq('durum', 'bekliyor'); oz = c.error ? 0 : (c.count || 0); } catch (e) { oz = 0; }
  const n = (a.data || []).filter(ikBekliyor).length + (b.count || 0) + oz;
  const el = $('tcount'); if (el) el.innerHTML = n ? `<span class="pill p-bekliyor">${n}</span>` : '';
}
function route() {
  if (!ME || !DATA) return;
  const admin = GOREN();
  let h = (location.hash || '').slice(1);
  const view = $('view'); let tab = h;
  if (h !== 'elkitabi' && ekBirak) { ekBirak(); ekBirak = null; }
  if (h === 'elkitabi') { elKitabiView(view); }
  else if (h === 'ekibim' && DATA.ekip.length) { ekibimView(view); }
  else if (h === 'bilgi' && DATA.bilgi.length) { bilgiView(view); }
  else if (!admin && h === 'personelim' && DATA.alt.length) { personelimView(view); }
  else if (!admin && h.startsWith('p-') && DATA.alt.includes(h.slice(2))) { view.innerHTML = kisiView(h.slice(2), false, true); tab = 'personelim'; }
  else if (!admin) {
    if (!['dosyam', 'taleplerim', 'sertifikalarim'].includes(h)) { h = tab = 'dosyam'; }
    if (h === 'dosyam') { view.innerHTML = kisiView(ME.profile.sicil, false); ozlukBagla(view, ME.profile.sicil, false); }
    if (h === 'taleplerim') taleplerimView(view);
    if (h === 'sertifikalarim') sertifikalarimView(view);
  } else {
    if (h.startsWith('p-')) { view.innerHTML = kisiView(h.slice(2), true); if (DATA.byS[h.slice(2)]) ozlukBagla(view, h.slice(2), true); tab = 'personel'; }
    else if (V[h] && !(SALT() && ['sertifika', 'hesaplar', 'veri'].includes(h))) V[h](view);
    else { V.genel(view); tab = 'genel'; }
  }
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.v === tab));
  window.scrollTo(0, 0);
}
function aramaKur() {
  const q = $('q'), s = $('sugg'); let items = [], on = 0;
  function draw() {
    const v = fold(q.value.trim()); if (!v) { s.hidden = true; return; }
    items = DATA.P.filter(p => p.fx.includes(v)).slice(0, 10); on = 0;
    s.innerHTML = items.length ? items.map((p, i) => `<button type="button" data-i="${i}" class="${i === 0 ? 'on' : ''}"><b>${esc(p.ad)}</b><span class="s">${esc(p.unvan || '')} · ${esc(p.sicil)}${p.durum === 'Pasif' ? ' · ayrıldı' : ''}</span></button>`).join('') : '<div style="padding:10px 12px" class="mini">Eşleşen personel yok.</div>';
    s.hidden = false;
  }
  const go = p => { location.hash = 'p-' + p.sicil; q.value = ''; s.hidden = true; q.blur(); };
  q.addEventListener('input', draw);
  q.addEventListener('keydown', e => {
    if (s.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); on = (on + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; s.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === on)); }
    else if (e.key === 'Enter' && items[on]) { e.preventDefault(); go(items[on]); } else if (e.key === 'Escape') s.hidden = true;
  });
  s.addEventListener('mousedown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); go(items[+b.dataset.i]); } });
  q.addEventListener('blur', () => setTimeout(() => s.hidden = true, 150));
}

// ---------------- grafik yardımcıları ----------------
function niceStep(max) { const r = max / 4, p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
function vbars(vals, labels, { h = 170, hl = -1, fmt = v => fn(v), color = 'var(--bar)', dim = 'var(--bar2)' } = {}) {
  const W = 560, pad = [18, 8, 22, 42], n = vals.length || 1, max = Math.max(1, ...vals.map(v => Number(v) || 0));
  const step = niceStep(max), top = Math.ceil(max / step) * step;
  const iw = W - pad[1] - pad[3], ih = h - pad[0] - pad[2], bw = iw / n * 0.62;
  let g = ''; for (let t = 0; t <= top; t += step) { const y = pad[0] + ih - (t / top) * ih; g += `<line x1="${pad[3]}" x2="${W - pad[1]}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${pad[3] - 6}" y="${y + 4}" text-anchor="end">${fn(t)}</text>`; }
  vals.forEach((v, i) => {
    v = Number(v) || 0; const x = pad[3] + iw / n * i + (iw / n - bw) / 2, bh = (v / top) * ih, y = pad[0] + ih - bh;
    g += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(bh, 0)}" rx="2" fill="${hl < 0 || i <= hl ? color : dim}"><title>${esc(labels[i])}: ${fmt(v)}</title></rect><text x="${x + bw / 2}" y="${h - 6}" text-anchor="middle">${esc(labels[i])}</text>`;
    if (v) g += `<text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" style="fill:var(--fg)">${fmt(v)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${g}</svg>`;
}
const stack = (cnt, total) => `<div class="meter">${ST.map(s => cnt[s] ? `<i class="c-${stc(s)}" style="width:${cnt[s] / total * 100}%" title="${s}: ${cnt[s]}"></i>` : '').join('')}</div>`;
const legend = () => `<div class="legend">${ST.map(s => `<span><i class="c-${stc(s)}"></i>${s === 'ALINDI' ? 'ALINDI (tek seferlik)' : s}</span>`).join('')}</div>`;
const sortTh = (cols, st) => `<thead><tr>${cols.map(c => `<th class="sort ${c[2] ? 'n' : ''}" data-k="${c[0]}">${c[1]}${st.sort === c[0] ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>`;
const sorter = st => (a, b) => { const x = a[st.sort], y = b[st.sort]; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y, 'tr') : x - y) * st.dir; };

// ---------------- YÖNETİCİ GÖRÜNÜMLERİ ----------------
const V = {};
function foot() {
  const r = DATA.rapor, n = r.notlar || [];
  return `<div class="foot"><b>Son veri yükleme:</b> ${r.yukleme ? fdt(r.yukleme.tarih) : '—'} · Database: ${esc(r.db_donem || '—')} · İzin dönemi: ${AYU[DATA.DONEM]} · Eğitim: ${esc(r.egitim_asof || '—')}
  ${n.length ? `<details style="margin-top:6px"><summary>Eşleştirme notları (${n.length})</summary><ul>${n.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}</div>`;
}
V.genel = view => {
  const { ACT, DEPS, DONEM, rapor } = DATA;
  if (!DATA.P.length) { view.innerHTML = `<h2>Hoş geldiniz</h2><p class="sub">Henüz veri yüklenmedi. <a href="#veri">Veri Yükle</a> sekmesinden üç Excel dosyasını yükleyerek başlayın.</p>`; return; }
  const sum = f => ACT.reduce((a, p) => a + (Number(f(p)) || 0), 0);
  const tc = {}; ST.forEach(s => tc[s] = sum(p => p.cnt[s])); const tz = sum(p => p.zor) || 1;
  const uy = (tc['GEÇERLİ'] + tc['ALINDI'] + tc['YAKLAŞIYOR']) / tz;
  const kalanT = sum(p => p.kalan), kulT = sum(p => p.kul);
  const depC = DEPS.map(d => [d, ACT.filter(p => p.dep === d).length]).sort((a, b) => b[1] - a[1]); const maxD = depC.length ? depC[0][1] : 1;
  const exp = []; ACT.forEach(p => p.S.forEach(r => { if (r[6] === 'YAKLAŞIYOR' || (r[6] === 'SÜRESİ DOLDU' && r[4] >= `${TODAY.getFullYear()}-01-01`)) exp.push([p, r]); }));
  exp.sort((a, b) => (a[1][4] || '').localeCompare(b[1][4] || ''));
  const yilSonu = `${TODAY.getFullYear() + 1}-01-01`;
  const hak = ACT.filter(p => p.L && p.L.hakedis_tarihi && p.L.hakedis_tarihi >= ISO_TODAY && p.L.hakedis_tarihi < yilSonu).sort((a, b) => a.L.hakedis_tarihi.localeCompare(b.L.hakedis_tarihi));
  const topK = ACT.filter(p => p.kalan != null).sort((a, b) => b.kalan - a.kalan).slice(0, 8);
  const negK = ACT.filter(p => p.L && p.L.kalan && p.L.kalan[11] < 0);
  const female = ACT.filter(p => p.cinsiyet === 'Kadın').length;
  const kd = ACT.filter(p => p.kidem != null).map(p => p.kidem); const ort = kd.length ? kd.reduce((a, b) => a + b, 0) / kd.length : null;
  const y0 = `${TODAY.getFullYear()}-01-01`;
  const yeni = ACT.filter(p => p.sirket_giris && p.sirket_giris >= y0).length, ayr = DATA.P.filter(p => p.durum === 'Pasif' && p.cikis && p.cikis >= y0).length;
  const aylik = rapor.izin_aylik || [], yillar = rapor.egitim_yillar || [];
  view.innerHTML = `<h2>Genel Bakış</h2><p class="sub">İzin bakiyesi ${AYU[DONEM]} sonu; SHGM eğitim durumu ${esc((rapor.egitim_asof || '').replace(' tarihi itibarıyla hesaplanmıştır.', ''))} itibarıyla.</p>
  <div class="grid g4">
    <div class="panel kpi"><div class="lbl">Aktif personel</div><div class="val">${ACT.length}</div><div class="note">${female} kadın · ${ACT.length - female} erkek · ort. kıdem ${fn(ort, 1)} yıl</div><div class="note">${TODAY.getFullYear()}: ${yeni} giriş · ${ayr} çıkış</div></div>
    <div class="panel kpi"><div class="lbl">Kalan izin · ${AYU[DONEM]} sonu</div><div class="val">${fn(kalanT, 1)} <small>gün</small></div><div class="note">Kişi başı ${fn(kalanT / (ACT.filter(p => p.kalan != null).length || 1), 1)} gün · Ocak–${AYU[DONEM]} kullanılan ${fn(kulT, 1)} gün</div></div>
    <div class="panel kpi"><div class="lbl">SHGM zorunlu eğitim uyumu</div><div class="val">${pct(uy)}</div>${stack(tc, tz)}<div class="note" style="margin-top:6px">${fn(tz)} zorunlu eğitim ataması</div></div>
    <div class="panel kpi"><div class="lbl">Eksik zorunlu eğitim</div><div class="val">${fn(tc['SÜRESİ DOLDU'] + tc['ALINMAMIŞ'])}</div><div class="note">${tc['SÜRESİ DOLDU']} süresi dolmuş · ${tc['ALINMAMIŞ']} hiç alınmamış · ${tc['YAKLAŞIYOR']} yaklaşan</div></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="panel"><h3>Departmanlara göre aktif personel</h3><div class="hb">${depC.map(([d, c]) => `<span>${esc(d)}</span><div class="tr"><i style="width:${c / maxD * 100}%;background:var(--bar)"></i></div><span class="v">${c}</span>`).join('')}</div></div>
    <div class="panel"><h3>Aylık izin kullanımı (gün)</h3>${vbars(aylik.map(a => a.kullanilan), AY, { hl: DONEM, fmt: v => fn(v, 1) })}<p class="mini">Açık renkli aylar girilmiş/planlanmış izinlerdir; dönem ${AYU[DONEM]} sonu.</p></div>
    <div class="panel"><h3>Yıllara göre eğitim katılımı</h3>${vbars(yillar.map(y => y.katilim), yillar.map(y => y.yil))}<p class="mini">Kişi × eğitim sayısı. Toplam saat: ${yillar.map(y => `${y.yil} ${fn(y.saat)}`).join(' · ')}</p></div>
    <div class="panel"><h3>Departmanlara göre SHGM uyumu</h3><div class="hb">${DEPS.map(d => { const g = ACT.filter(p => p.dep === d), c = {}; ST.forEach(s => c[s] = g.reduce((a, p) => a + p.cnt[s], 0)); const t = g.reduce((a, p) => a + p.zor, 0); return t ? `<span>${esc(d)}</span><div class="tr">${ST.map(s => c[s] ? `<i class="c-${stc(s)}" style="width:${c[s] / t * 100}%" title="${s}: ${c[s]}"></i>` : '').join('')}</div><span class="v">${pct((c['GEÇERLİ'] + c['ALINDI'] + c['YAKLAŞIYOR']) / t)}</span>` : ''; }).join('')}</div>${legend()}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="panel"><h3>Tazelemesi yaklaşan / bu yıl süresi dolan</h3><div class="list">${exp.slice(0, 12).map(([p, r]) => `<div class="row" tabindex="0" data-p="${esc(p.sicil)}"><span class="nm">${esc(p.ad)}<br><span class="mini">${esc(r[1])}</span></span><span class="meta">${pill(r[6])}<br>${fd(r[4])}</span></div>`).join('') || '<p class="mini">Kayıt yok.</p>'}</div>${exp.length > 12 ? `<p class="mini">+${exp.length - 12} kayıt daha · <a href="#egitim">Eğitim sekmesi</a></p>` : ''}</div>
    <div class="panel"><h3>En yüksek kalan izin · ${AYU[DONEM]} sonu</h3><div class="list">${topK.map(p => `<div class="row" tabindex="0" data-p="${esc(p.sicil)}"><span class="nm">${esc(p.ad)}<br><span class="mini">${esc(p.unvan || '')}</span></span><span class="meta"><b style="font-size:18px;color:var(--fg)">${fn(p.kalan, 1)}</b> gün</span></div>`).join('')}</div>
      ${negK.length ? `<p class="mini" style="margin-top:8px">Yıl sonunda bakiyesi eksiye düşen: ${negK.map(p => `<a href="#p-${esc(p.sicil)}">${esc(p.ad)}</a>`).join(', ')}</p>` : ''}</div>
    <div class="panel"><h3>Yıl sonuna kadar izin hakedişi gelecekler</h3><div class="list">${hak.slice(0, 10).map(p => `<div class="row" tabindex="0" data-p="${esc(p.sicil)}"><span class="nm">${esc(p.ad)}</span><span class="meta">${fd(p.L.hakedis_tarihi)} · +${fn(p.L.hakedis)} gün</span></div>`).join('') || '<p class="mini">Kayıt yok.</p>'}</div>${hak.length > 10 ? `<p class="mini">+${hak.length - 10} kişi daha</p>` : ''}</div>
    <div class="panel"><h3>Personel profili</h3>${profil()}</div>
  </div>${foot()}`;
};
function profil() {
  const { ACT } = DATA;
  const grp = (f, order) => { const c = {}; ACT.forEach(p => { const k = f(p) || '—'; c[k] = (c[k] || 0) + 1; }); return Object.entries(c).sort((a, b) => order ? order.indexOf(a[0]) - order.indexOf(b[0]) : b[1] - a[1]); };
  const row = (t, arr) => { const m = Math.max(1, ...arr.map(a => a[1])); return `<p class="mini" style="margin:10px 0 4px;font-weight:600">${t}</p><div class="hb">${arr.map(([k, c]) => `<span>${esc(k)}</span><div class="tr"><i style="width:${c / m * 100}%;background:var(--bar2)"></i></div><span class="v">${c}</span>`).join('')}</div>`; };
  return row('Yaş', grp(p => p.yas == null ? null : p.yas < 30 ? '30 altı' : p.yas < 40 ? '30–39' : p.yas < 50 ? '40–49' : '50+', ['30 altı', '30–39', '40–49', '50+', '—']))
    + row('Kıdem (gruba giriş)', grp(p => p.kidem == null ? null : p.kidem < 2 ? '0–2 yıl' : p.kidem < 5 ? '2–5 yıl' : p.kidem < 10 ? '5–10 yıl' : '10+ yıl', ['0–2 yıl', '2–5 yıl', '5–10 yıl', '10+ yıl', '—']))
    + row('Öğrenim', grp(p => p.ogrenim, ['İLKOKUL', 'ORTAOKUL', 'LİSE', 'ÖNLİSANS', 'LİSANS', 'YÜKSEK LİSANS', '—']));
}

const PF = { q: '', dep: '', st: 'Etkin', sort: 'ad', dir: 1 };
V.personel = view => {
  view.innerHTML = `<h2>Personel</h2><p class="sub">Bir satıra tıklayınca kişinin özlük dosyası açılır.</p>
  <div class="filters"><input id="pq" type="search" placeholder="Ad, sicil veya unvan…" value="${esc(PF.q)}">
  <select id="pdep"><option value="">Tüm departmanlar</option>${DATA.DEPS.map(d => `<option ${PF.dep === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
  <select id="pst"><option value="Etkin" ${PF.st === 'Etkin' ? 'selected' : ''}>Aktif</option><option value="Pasif" ${PF.st === 'Pasif' ? 'selected' : ''}>Ayrılan</option><option value="" ${PF.st === '' ? 'selected' : ''}>Tümü</option></select>
  <span class="count" id="pcount"></span></div><div class="tbl"><table id="ptbl"></table></div>${foot()}`;
  const draw = () => {
    const cols = [['sicil', 'Sicil'], ['ad', 'Ad Soyad'], ['dep', 'Departman'], ['unvan', 'Unvan'], ['kidem', 'Kıdem', 1], ['kalan', 'Kalan izin', 1], ['uyum', 'SHGM uyum', 1], ['yilSaat', 'Bu yıl eğt. saati', 1]];
    const q = fold(PF.q);
    const rows = DATA.P.filter(p => (!PF.st || p.durum === PF.st) && (!PF.dep || p.dep === PF.dep) && (!q || p.fx.includes(q))).sort(sorter(PF));
    $('pcount').textContent = rows.length + ' kişi';
    $('ptbl').innerHTML = sortTh(cols, PF) + `<tbody>${rows.map(p => `<tr class="click" tabindex="0" data-p="${esc(p.sicil)}"><td>${esc(p.sicil)}</td><td><b>${esc(p.ad)}</b>${p.durum === 'Pasif' ? ' ' + pill('Pasif') : ''}</td><td>${esc(p.dep)}${p.bolum && p.bolum !== p.dep ? `<br><span class="mini">${esc(p.bolum)}</span>` : ''}</td><td>${esc(p.unvan || '—')}</td><td class="n">${p.kidem == null ? '—' : fn(p.kidem, 1) + ' yıl'}</td><td class="n ${p.kalan < 0 ? 'neg' : ''}">${p.kalan == null ? '—' : fn(p.kalan, 1)}</td><td class="n" style="min-width:120px">${p.zor ? `${pct(p.uyum)}${stack(p.cnt, p.zor)}` : '—'}</td><td class="n">${p.yilSaat ? fn(p.yilSaat, 1) : '—'}</td></tr>`).join('')}</tbody>`;
    document.querySelectorAll('#ptbl th.sort').forEach(th => th.onclick = () => { const k = th.dataset.k; PF.dir = PF.sort === k ? -PF.dir : (['kalan', 'uyum', 'kidem', 'yilSaat'].includes(k) ? -1 : 1); PF.sort = k; draw(); });
  };
  draw();
  $('pq').oninput = e => { PF.q = e.target.value; draw(); };
  $('pdep').onchange = e => { PF.dep = e.target.value; draw(); };
  $('pst').onchange = e => { PF.st = e.target.value; draw(); };
};

const IF = { sort: 'kalan', dir: -1, dep: '' };
V.izin = view => {
  const { ACT, DONEM, rapor } = DATA; const bo = rapor.izin_birim || [], aylik = rapor.izin_aylik || [];
  const T = bo.reduce((a, b) => ({ kisi: a.kisi + b.kisi, devreden: a.devreden + b.devreden, hakedis: a.hakedis + b.hakedis, kullanilan: a.kullanilan + b.kullanilan, kalan: a.kalan + b.kalan, hedefGun: a.hedefGun + b.hedefGun }), { kisi: 0, devreden: 0, hakedis: 0, kullanilan: 0, kalan: 0, hedefGun: 0 });
  view.innerHTML = `<h2>Yıllık İzin</h2><p class="sub">Kalan gün ${AYU[DONEM]} sonu bakiyesi · hedef: devreden + hakediş − devredenin %5'i.</p>
  <div class="panel" style="margin-bottom:16px"><h3>Aylık gelişim (tüm birimler)</h3>${vbars(aylik.map(a => a.kalan), AY, { hl: DONEM, h: 180 })}<p class="mini">Ay sonu kalan izin günü toplamı. Kullanılan: ${aylik.map((a, i) => `${AY[i]} ${fn(a.kullanilan, 1)}`).join(' · ')}</p></div>
  <h3>Birim bazında</h3><div class="tbl" style="margin-bottom:20px"><table><thead><tr><th>Birim</th><th class="n">Kişi</th><th class="n">Devreden</th><th class="n">Hakediş</th><th class="n">Kullanılan</th><th class="n">Kalan</th><th class="n">Kişi başı kalan</th><th class="n">Hedef gerçekleşme</th></tr></thead><tbody>
  ${bo.map(b => `<tr><td>${esc(b.birim)}</td><td class="n">${b.kisi}</td><td class="n">${fn(b.devreden, 1)}</td><td class="n">${fn(b.hakedis, 1)}</td><td class="n">${fn(b.kullanilan, 1)}</td><td class="n"><b>${fn(b.kalan, 1)}</b></td><td class="n">${fn(b.kalan / b.kisi, 1)}</td><td class="n">${pct(b.hedefOran)}<div class="meter"><i style="width:${Math.min(100, b.hedefOran * 100)}%;background:${b.hedefOran >= .75 ? 'var(--ok)' : b.hedefOran >= .5 ? 'var(--warn)' : 'var(--bad)'}"></i></div></td></tr>`).join('')}
  ${bo.length ? `<tr><td><b>Toplam</b></td><td class="n"><b>${T.kisi}</b></td><td class="n"><b>${fn(T.devreden, 1)}</b></td><td class="n"><b>${fn(T.hakedis, 1)}</b></td><td class="n"><b>${fn(T.kullanilan, 1)}</b></td><td class="n"><b>${fn(T.kalan, 1)}</b></td><td class="n"><b>${fn(T.kalan / T.kisi, 1)}</b></td><td class="n"><b>${pct(T.kullanilan / T.hedefGun)}</b></td></tr>` : ''}</tbody></table></div>
  <h3>Kişi bazında</h3><div class="filters"><select id="idep"><option value="">Tüm birimler</option>${[...new Set(ACT.filter(p => p.L).map(p => p.L.birim))].sort((a, b) => (a || '').localeCompare(b || '', 'tr')).map(d => `<option ${IF.dep === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select><span class="count" id="icount"></span></div>
  <div class="tbl"><table id="itbl"></table></div>${foot()}`;
  const draw = () => {
    const cols = [['ad', 'Ad Soyad'], ['birim', 'Birim'], ['devreden', 'Devreden', 1], ['hakedis', 'Hakediş', 1], ['hakedis_tarihi', 'Hakediş tarihi'], ['kul', 'Kullanılan (Oca–' + AY[DONEM] + ')', 1], ['kalan', 'Kalan', 1], ['yilsonu', 'Yıl sonu (tahmini)', 1]];
    const rows = ACT.filter(p => p.L && (!IF.dep || p.L.birim === IF.dep)).map(p => ({ p, ad: p.ad, birim: p.L.birim, devreden: p.L.devreden, hakedis: p.L.hakedis, hakedis_tarihi: p.L.hakedis_tarihi, kul: p.kul, kalan: p.kalan, yilsonu: p.L.kalan ? p.L.kalan[11] : null })).sort(sorter(IF));
    $('icount').textContent = rows.length + ' kişi';
    $('itbl').innerHTML = sortTh(cols, IF) + `<tbody>${rows.map(r => `<tr class="click" tabindex="0" data-p="${esc(r.p.sicil)}"><td><b>${esc(r.ad)}</b>${r.p.L.uyari ? `<br><span class="mini" style="color:var(--warn)">${esc(r.p.L.uyari)}</span>` : ''}</td><td>${esc(r.birim)}</td><td class="n ${r.devreden < 0 ? 'neg' : ''}">${fn(r.devreden, 1)}</td><td class="n">${fn(r.hakedis, 1)}</td><td>${fd(r.hakedis_tarihi)}</td><td class="n">${fn(r.kul, 1)}</td><td class="n ${r.kalan < 0 ? 'neg' : ''}"><b>${fn(r.kalan, 1)}</b></td><td class="n ${r.yilsonu < 0 ? 'neg' : ''}">${fn(r.yilsonu, 1)}</td></tr>`).join('')}</tbody>`;
    document.querySelectorAll('#itbl th.sort').forEach(th => th.onclick = () => { const k = th.dataset.k; IF.dir = IF.sort === k ? -IF.dir : (['ad', 'birim', 'hakedis_tarihi'].includes(k) ? 1 : -1); IF.sort = k; draw(); });
  };
  draw(); $('idep').onchange = e => { IF.dep = e.target.value; draw(); };
};

const EF = { kod: '', st: 'eksik' };
V.egitim = view => {
  const { ACT, katalog, rapor } = DATA;
  const by = {}; katalog.forEach(c => by[c.kod] = { c, cnt: Object.fromEntries(ST.map(s => [s, 0])), n: 0 });
  ACT.forEach(p => p.S.forEach(r => { const b = by[r[0]]; if (b) { b.cnt[r[6]]++; b.n++; } }));
  const list = Object.values(by).filter(b => b.n).sort((a, b) => b.n - a.n);
  view.innerHTML = `<h2>SHGM Eğitim Uyumu</h2><p class="sub">SHT-EĞİTİM/HAD zorunlu eğitimleri · uyum = (geçerli + yaklaşan + alındı) / zorunlu · ${esc(rapor.egitim_asof || '')}</p>
  <div class="panel" style="margin-bottom:16px"><h3>Eğitim bazında durum</h3><div class="hb" style="grid-template-columns:minmax(120px,320px) 1fr auto">${list.map(b => `<span style="cursor:pointer" data-kod="${esc(b.c.kod)}"><b>${esc(b.c.kod)}</b> · ${esc(b.c.ad)} <span class="mini">(${b.n})</span></span><div class="tr" data-kod="${esc(b.c.kod)}" style="cursor:pointer">${ST.map(s => b.cnt[s] ? `<i class="c-${stc(s)}" style="width:${b.cnt[s] / b.n * 100}%" title="${s}: ${b.cnt[s]}"></i>` : '').join('')}</div><span class="v">${pct((b.cnt['GEÇERLİ'] + b.cnt['ALINDI'] + b.cnt['YAKLAŞIYOR']) / b.n)}</span>`).join('')}</div>${legend()}<p class="mini">Bir eğitime tıklayınca aşağıdaki liste o eğitime göre süzülür.</p></div>
  <h3>Planlama listesi</h3><div class="filters"><select id="ekod"><option value="">Tüm eğitimler</option>${list.map(b => `<option value="${esc(b.c.kod)}" ${EF.kod === b.c.kod ? 'selected' : ''}>${esc(b.c.kod)} · ${esc(b.c.ad)}</option>`).join('')}</select>
  <div class="seg" id="est">${[['eksik', 'Eksik + yaklaşan'], ['SÜRESİ DOLDU', 'Süresi dolan'], ['ALINMAMIŞ', 'Hiç almamış'], ['YAKLAŞIYOR', 'Yaklaşan'], ['tum', 'Tümü']].map(([v, t]) => `<button type="button" data-v="${v}" class="${EF.st === v ? 'on' : ''}">${t}</button>`).join('')}</div>
  <button class="btn sm" id="ecsv" type="button">CSV indir</button><span class="count" id="ecount"></span></div>
  <div class="tbl" style="margin-bottom:20px"><table id="etbl"></table></div>
  <h3>Eğitim kataloğu</h3><div class="tbl"><table><thead><tr><th>Kod</th><th>Eğitim</th><th>Temel / Tazeleme (saat)</th><th>Periyot</th><th>Sınav</th><th>Kimler almalı</th></tr></thead><tbody>${katalog.map(c => `<tr><td><b>${esc(c.kod)}</b></td><td>${esc(c.ad)}<br><span class="mini">${esc(c.kaynak || '')}</span></td><td>${esc(c.temel || '—')} / ${esc(c.tazeleme || '—')}</td><td>${c.periyot ? fn(c.periyot) + ' yıl' : 'Tek seferlik'}</td><td>${esc(c.sinav || '—')}</td><td class="mini" style="max-width:420px">${esc(c.kimler || '')}</td></tr>`).join('')}</tbody></table></div>${foot()}`;
  let rows = [];
  const draw = () => {
    rows = []; ACT.forEach(p => p.S.forEach(r => { if (EF.kod && r[0] !== EF.kod) return; const s = r[6]; if (EF.st === 'eksik' ? ['SÜRESİ DOLDU', 'ALINMAMIŞ', 'YAKLAŞIYOR'].includes(s) : EF.st === 'tum' ? true : s === EF.st) rows.push([p, r]); }));
    const ord = { 'SÜRESİ DOLDU': 0, 'YAKLAŞIYOR': 1, 'ALINMAMIŞ': 2, 'GEÇERLİ': 3, 'ALINDI': 4 };
    rows.sort((a, b) => ord[a[1][6]] - ord[b[1][6]] || (a[1][4] || '9').localeCompare(b[1][4] || '9') || a[0].ad.localeCompare(b[0].ad, 'tr'));
    $('ecount').textContent = rows.length + ' kayıt';
    $('etbl').innerHTML = `<thead><tr><th>Personel</th><th>Departman</th><th>Eğitim</th><th>Son eğitim</th><th>Geçerlilik bitişi</th><th class="n">Kalan gün</th><th>Durum</th></tr></thead><tbody>${rows.slice(0, 600).map(([p, r]) => `<tr class="click" tabindex="0" data-p="${esc(p.sicil)}"><td><b>${esc(p.ad)}</b><br><span class="mini">${esc(p.unvan || '')}</span></td><td>${esc(p.dep)}</td><td><b>${esc(r[0])}</b> · ${esc(r[1])}</td><td>${fd(r[2])}</td><td>${fd(r[4])}</td><td class="n ${r[5] < 0 ? 'neg' : ''}">${r[5] == null ? '—' : fn(r[5])}</td><td>${pill(r[6])}</td></tr>`).join('')}</tbody>`;
  };
  draw();
  $('ekod').onchange = e => { EF.kod = e.target.value; draw(); };
  document.querySelectorAll('#est button').forEach(b => b.onclick = () => { EF.st = b.dataset.v; document.querySelectorAll('#est button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  document.querySelectorAll('[data-kod]').forEach(el => el.onclick = () => { EF.kod = el.dataset.kod; $('ekod').value = EF.kod; draw(); $('etbl').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('ecsv').onclick = () => csvIndir('egitim_planlama.csv', [['Sicil', 'Ad Soyad', 'Departman', 'Unvan', 'Kod', 'Eğitim', 'Son eğitim', 'Geçerlilik bitişi', 'Kalan gün', 'Durum'],
    ...rows.map(([p, r]) => [p.sicil, p.ad, p.dep, p.unvan, r[0], r[1], fd(r[2]), fd(r[4]), r[5] ?? '', r[6]])]);
};

// ---- Talepler (izin + sertifika onayı)
const TF = { tur: 'izin', st: 'ik' };
V.talepler = async view => {
  const turSec = `<div class="seg" id="ttur"><button data-v="izin" class="${TF.tur === 'izin' ? 'on' : ''}">İzin talepleri</button><button data-v="sertifika" class="${TF.tur === 'sertifika' ? 'on' : ''}">Sertifikalar</button><button data-v="ozluk" class="${TF.tur === 'ozluk' ? 'on' : ''}">Özlük evrakı</button></div>`;
  if (TF.tur === 'ozluk') {
    view.innerHTML = `<h2>Talepler</h2><p class="sub">Personelin özlük dosyasına yüklediği evraklar. Onayladığınız evrak kişinin özlük dosyasına işlenir; reddederseniz yazdığınız neden personele gösterilir.</p>
    <div class="filters">${turSec}<span class="count" id="tc"></span></div><div id="tlist" class="loading">Yükleniyor…</div>`;
    view.querySelectorAll('#ttur button').forEach(b => b.onclick = () => { TF.tur = b.dataset.v; V.talepler(view); });
    return ozTalepListe($('tlist'), $('tc'));
  }
  if (TF.tur === 'sertifika' && TF.st === 'ik') TF.st = 'bekliyor';
  if (TF.tur === 'izin' && TF.st === 'bekliyor') TF.st = 'ik';
  const segs = TF.tur === 'izin' ? [['ik', 'İK onayı bekleyen'], ['sefte', 'Şefte bekleyen'], ['islenecek', 'Excel\'e girilecek'], ['tum', 'Tümü']] : [['bekliyor', 'Bekleyen'], ['islenecek', 'Excel\'e işlenecek'], ['tum', 'Tümü']];
  view.innerHTML = `<h2>Talepler</h2><p class="sub">${TF.tur === 'izin' ? 'İzin talepleri önce amirine (Database\'deki AMİR SİCİL), sonra size gelir. Onayladığınız izin panelin izin kayıtlarına otomatik eklenir ve bakiyeden düşer; Excel\'e girip yüklediğinizde panel bunu tanır ve çift saymaz.' : 'Personelin yüklediği sertifikalar. Onayladıklarınızı Eğitim Takip Excel\'ine işleyip "Excel\'e işlendi" olarak işaretleyin.'}</p>
  <div class="filters">${turSec}
  <div class="seg" id="tst">${segs.map(([v, t]) => `<button data-v="${v}" class="${TF.st === v ? 'on' : ''}">${t}</button>`).join('')}</div>
  <button class="btn sm" id="tcsv">CSV indir</button><span class="count" id="tc"></span></div><div id="tlist" class="loading">Yükleniyor…</div>`;
  const load = async () => {
    const tbl = TF.tur === 'izin' ? 'izin_talep' : 'sertifika';
    let q = sb.from(tbl).select('*').order('created_at', { ascending: false }).limit(500);
    if (TF.st === 'bekliyor') q = q.eq('durum', 'bekliyor');
    if (TF.st === 'ik' || TF.st === 'sefte') q = q.in('durum', ['bekliyor', 'sef_onayladi']);
    if (TF.st === 'islenecek') q = q.eq('durum', 'onaylandi').eq('excel_islendi', false);
    let { data, error } = await q;
    if (!error && TF.st === 'ik') data = data.filter(ikBekliyor);
    if (!error && TF.st === 'sefte') data = data.filter(t => t.durum === 'bekliyor' && amirOf(t.sicil));
    const box = $('tlist'); box.className = '';
    if (error) { box.innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
    $('tc').textContent = data.length + ' kayıt';
    const ad = s => DATA.byS[s] ? DATA.byS[s].ad : s;
    if (!data.length) { box.innerHTML = '<div class="panel"><p class="mini">Bu görünümde kayıt yok.</p></div>'; }
    else if (TF.tur === 'izin') {
      box.innerHTML = `<div class="tbl"><table><thead><tr><th>Personel</th><th>Tarih</th><th class="n">Gün</th><th>Tür / Açıklama</th><th class="n">Kalan izin</th><th>Şef</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${data.map(t => { const p = DATA.byS[t.sicil], am = amirOf(t.sicil); return `<tr data-id="${t.id}"><td><b>${esc(ad(t.sicil))}</b><br><span class="mini">${esc(t.sicil)} · ${fdt(t.created_at)}</span></td><td style="white-space:nowrap">${fd(t.baslangic)} – ${fd(t.bitis)}</td><td class="n"><b>${fn(t.gun, 1)}</b></td><td>${esc(t.tur)}${t.aciklama ? `<br><span class="mini">${esc(t.aciklama)}</span>` : ''}</td><td class="n ${p && p.kalan < t.gun ? 'neg' : ''}">${p ? fn(p.kalan, 1) : '—'}</td><td class="mini">${t.sef_sicil ? `<b>${esc(kisiAd(t.sef_sicil))}</b><br>${fdt(t.sef_karar_tarihi)}${t.sef_notu ? `<br>“${esc(t.sef_notu)}”` : ''}` : am ? `Bekliyor: ${esc(kisiAd(am))}` : 'Amir tanımlı değil'}</td><td>${tpillT(t)}${t.admin_notu ? `<br><span class="mini">${esc(t.admin_notu)}</span>` : ''}${t.durum === 'onaylandi' ? `<br><span class="mini">${t.excel_islendi ? 'Excel\'de kayıtlı' : 'Panele işlendi · Excel\'e girilecek'}</span>` : ''}</td><td>${aksiyonlar(t)}</td></tr>`; }).join('')}</tbody></table></div>`;
    } else {
      box.innerHTML = `<div class="tbl"><table><thead><tr><th>Personel</th><th>Eğitim</th><th>Tarih</th><th class="n">Saat</th><th>Belge</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${data.map(t => `<tr data-id="${t.id}"><td><b>${esc(ad(t.sicil))}</b><br><span class="mini">${esc(t.sicil)} · ${fdt(t.created_at)}</span></td><td>${esc(t.egitim_adi)}${t.kurum ? `<br><span class="mini">${esc(t.kurum)}</span>` : ''}</td><td>${fd(t.tarih)}</td><td class="n">${t.saat ? fn(t.saat, 1) : '—'}</td><td><button class="btn sm" data-belge="${esc(t.dosya_yolu)}">Aç</button></td><td>${tpill(t.durum)}${t.admin_notu ? `<br><span class="mini">${esc(t.admin_notu)}</span>` : ''}${t.excel_islendi ? '<br><span class="mini">Excel\'e işlendi</span>' : ''}</td><td>${aksiyonlar(t)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    box.querySelectorAll('[data-belge]').forEach(b => b.onclick = async () => { const { data: u, error: e } = await sb.storage.from('sertifikalar').createSignedUrl(b.dataset.belge, 120); if (e) { alertMsg('Belge açılamadı: ' + e.message); return; } window.open(u.signedUrl, '_blank', 'noopener'); });
    box.querySelectorAll('[data-karar]').forEach(b => b.onclick = () => karar(tbl, +b.closest('tr').dataset.id, b.dataset.karar, load));
    $('tcsv').onclick = () => {
      if (TF.tur === 'izin') csvIndir('izin_talepleri.csv', [['Ad Soyad', 'Sicil', 'Başlangıç', 'Bitiş', 'Gün', 'Tür', 'Açıklama', 'Durum', 'Şef', 'Şef onay tarihi', 'Talep tarihi'], ...data.map(t => [ad(t.sicil), t.sicil, fd(t.baslangic), fd(t.bitis), String(t.gun).replace('.', ','), t.tur, t.aciklama, durumAd(t), t.sef_sicil ? kisiAd(t.sef_sicil) : '', t.sef_karar_tarihi ? fdt(t.sef_karar_tarihi) : '', fdt(t.created_at)])]);
      else csvIndir('sertifikalar.csv', [['Personel', 'Sicil', 'Kayıttaki Eğitim Adı', 'Tarih', 'Saat', 'Kurum', 'Durum'], ...data.map(t => [ad(t.sicil), t.sicil, t.egitim_adi, fd(t.tarih), t.saat ?? '', t.kurum, TALEP_AD[t.durum]])]);
    };
  };
  const aksiyonlar = t => {
    const butonlar = `<div class="actions"><button class="btn sm ok" data-karar="onaylandi">Onayla</button><button class="btn sm bad" data-karar="reddedildi">Reddet</button></div>`;
    if (TF.tur === 'sertifika') return t.durum === 'bekliyor' ? butonlar : t.durum === 'onaylandi' && !t.excel_islendi ? `<button class="btn sm" data-karar="islendi">Excel'e işlendi</button>` : '';
    if (ikBekliyor(t)) return butonlar;
    if (t.durum === 'bekliyor') return `<button class="btn sm" data-karar="onaylandi" title="Şef onayını beklemeden son onayı verir">Şefi beklemeden onayla</button>`;
    return '';
  };
  view.querySelectorAll('#ttur button').forEach(b => b.onclick = () => { TF.tur = b.dataset.v; V.talepler(view); });
  view.querySelectorAll('#tst button').forEach(b => b.onclick = () => { TF.st = b.dataset.v; V.talepler(view); });
  load();
};
function alertMsg(t) { modal(`<p>${esc(t)}</p><div class="acts"><button class="btn pri" data-close>Tamam</button></div>`); }
function karar(tbl, id, k, done) {
  if (k === 'islendi') { sb.from(tbl).update({ excel_islendi: true }).eq('id', id).then(({ error }) => { if (error) alertMsg(error.message); done(); }); return; }
  modal(`<h3>${k === 'onaylandi' ? 'Onayla' : 'Reddet'}</h3><form class="form" id="kf"><label>Personele not (isteğe bağlı)<textarea id="kn" maxlength="300"></textarea></label>
  <div class="acts"><button type="button" class="btn" data-close>Vazgeç</button><button class="btn pri" type="submit">${k === 'onaylandi' ? 'Onayla' : 'Reddet'}</button></div></form>`, (bg, close) => {
    bg.querySelector('#kf').onsubmit = async e => {
      e.preventDefault();
      const { error } = await sb.from(tbl).update({ durum: k, admin_notu: bg.querySelector('#kn').value.trim() || null, karar_tarihi: new Date().toISOString() }).eq('id', id);
      close(); if (error) alertMsg(error.message);
      if (!error && tbl === 'izin_talep') { await loadData(); }
      done(); bekleyenSay();
    };
  });
}

// ---- Sertifika üretimi (SHGM: KZR.IK.F18 numaralı · İSG: KZR.İK.F17 numarasız)

// ---------------- Excel eğitimlerinden sertifika ----------------
// Kayıt anahtarı: sicil | tarih | eğitim adı (normalize)
const nkS = t => String(t || '').trim().toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/\./g, '').replace(/\s+/g, ' ');
const kayitAnahtar = (sicil, tarih, egitim) => `${sicil}|${tarih}|${nkS(egitim)}`;
// Sertifikası düzenlenmemiş iç eğitimleri (SHGM → numaralı sertifika, Temel İSG → katılım belgesi) gruplar
const SB_STOP = new Set(['egitimi', 'egitim', 've', 'ile', 'temel', 'tazeleme', 'kursu', 'kurs']);
const sbTok = t => new Set(fold(t || '').split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !SB_STOP.has(w)));
// Bu belge, bu eğitimin belgesi mi? (aynı şablon, tarih eşleşir, eğitim adında ortak kelime)
const sbEslesir = (b, sab, tarih, bas, T) => b.sablon === sab && (b.tarih === tarih || b.tarih === bas || (b.tarih <= tarih && (b.tarih_bitis || b.tarih) >= tarih))
  && ([...sbTok(b.egitim)].some(w => T.has(w)) || !T.size);
function sertifikaGruplari(B, AYAR, { yil, sadece } = {}) {
  const tok = sbTok;
  const sablonOf = h => h[2] ? 'shgm' : /is sagligi|\bisg\b/.test(fold(h[1] || '')) ? 'isg' : null;
  const icMi = h => !/dis/.test(fold(h[5] || ''));
  const basMap = (DATA.rapor && DATA.rapor.egitim_baslangic) || {};
  const certBy = {}; (B || []).filter(b => !b.iptal && b.sicil).forEach(b => (certBy[b.sicil] = certBy[b.sicil] || []).push(b));
  const G = new Map();
  DATA.P.forEach(p => (p.H || []).forEach(h => {
    const tarih = String(h[0] || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return;
    if (sadece) { if (!sadece.has(kayitAnahtar(p.sicil, tarih, h[1]))) return; } else if (yil && tarih.slice(0, 4) !== String(yil)) return;
    const sab = sablonOf(h); if (!sab || !icMi(h)) return;
    const bas = basMap[nkS(h[1]) + '|' + tarih] || null, T = tok(h[1]);
    const var_ = (certBy[p.sicil] || []).some(b => sbEslesir(b, sab, tarih, bas, T));
    const key = [sab, h[1], tarih, h[4] || ''].join('|');
    const g = G.get(key) || { key, sab, egitim: h[1], bit: tarih, bas, saat: h[3], egitmen: h[4] || '', hepsi: [], eksik: [] };
    g.hepsi.push(p.sicil); if (!var_) g.eksik.push(p.sicil); G.set(key, g);
  }));
  const gizli = new Set(((AYAR && AYAR.sb_gizli) || {}).keys || []);
  return [...G.values()].filter(g => g.eksik.length && !gizli.has(g.key)).sort((a, b) => b.bit.localeCompare(a.bit));
}
// Grupların belgelerini üretir. Eğitimcisi yazılmamış SHGM eğitimleri atlanır.
async function sertifikaGrupUret(grup, A) {
  let n = 0; const nolar = [], atlanan = [], belgeler = [];
  for (const g of grup) {
    if (g.sab === 'shgm' && !g.egitmen) { atlanan.push(`${g.egitim} (${fd(g.bit)})`); continue; }
    const alanlar = g.sab === 'isg' ? { ...(A.isg || {}) } : { ...(A.shgm || {}), egitmen: g.egitmen };
    // Son kontrol: bu arada (başka bir basışta / sekmede) belge üretildiyse o kişiyi atla
    const tarih = g.bas || g.bit, T = sbTok(g.egitim);
    const { data: mevcut, error: me } = await sb.from('sertifika_belge').select('sicil,egitim,tarih,tarih_bitis,sablon,iptal').in('sicil', g.eksik).eq('sablon', g.sab).eq('iptal', false);
    if (me) throw new Error(me.message);
    const var_ = new Set((mevcut || []).filter(b => sbEslesir(b, g.sab, g.bit, g.bas, T)).map(b => b.sicil));
    const kisiler = g.eksik.filter(s => !var_.has(s)).map(s => DATA.byS[s]).filter(Boolean).map(p => ({ sicil: p.sicil, ad: p.ad, unvan: p.unvan || '' }));
    if (!kisiler.length) continue;
    const { data, error } = await sb.rpc('sertifika_uret', { p: { sablon: g.sab, egitim: g.egitim, tarih, tarih_bitis: g.bas && g.bas !== g.bit ? g.bit : null,
      saat: g.saat == null || g.saat === '' ? (g.sab === 'isg' ? (A.isg || {}).saat || 8 : null) : Number(g.saat), alanlar, kisiler } });
    if (error) throw new Error(`${g.egitim}: ${error.message}`);
    n += data.length; belgeler.push(...data); nolar.push(...data.filter(d => d.seri_no).map(d => d.seri_no));
  }
  return { n, nolar, atlanan, belgeler };
}
const SF = { sablon: 'shgm', sec: new Set(), q: '', dep: '', lq: '', lyil: '', lsab: '', lsec: new Set(), imzali: true };
const SABLON_AD = { shgm: 'SHGM Eğitim Başarı Sertifikası', isg: 'Temel İSG Katılım Belgesi' };
const noBicim = (n, y) => `${String(n).padStart(2, '0')}/${String(y).slice(2)}`;
V.sertifika = async view => {
  view.innerHTML = '<div class="loading">Yükleniyor…</div>';
  let B, AYAR = {}, SAY = {};
  try {
    const [ay, say, bl] = await Promise.all([sb.from('sertifika_ayar').select('*'), sb.from('sertifika_sayac').select('*'),
      fetchAll('sertifika_belge', '*', q => q.order('id', { ascending: false }))]);
    if (ay.error) throw ay.error;
    (ay.data || []).forEach(r => AYAR[r.anahtar] = r.deger); (say.data || []).forEach(r => SAY[r.yil] = r.son); B = bl;
  } catch (e) { view.innerHTML = `<h2>Sertifika Üret</h2><div class="msg err">Sertifika tabloları bulunamadı: ${esc(e.message || e)}. Kurulumdaki 03_sertifika.sql dosyasını Supabase'de çalıştırın.</div>`; return; }
  const A = { shgm: AYAR.shgm || {}, isg: AYAR.isg || {} };
  Sertifika.varsayilanlar({ shgm: A.shgm, isg: A.isg });
  const egitimler = [...new Set([...DATA.katalog.map(k => k.ad), ...B.filter(b => b.sablon === 'shgm').map(b => b.egitim)])].sort((a, b) => a.localeCompare(b, 'tr'));
  const egitmenler = [...new Set([...B.map(b => (b.alanlar || {}).egitmen), ...DATA.P.flatMap(p => p.H.map(h => h[4]))].filter(Boolean).map(x => x.trim()))].sort((a, b) => a.localeCompare(b, 'tr'));
  const yillar = [...new Set(B.map(b => (b.tarih || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const isg = SF.sablon === 'isg';
  const inp = (id, lbl, val = '', ex = '') => `<label>${lbl}<input id="${id}" value="${esc(val)}" ${ex}></label>`;
  view.innerHTML = `<h2>Sertifika Üret</h2><p class="sub">Eğitimi ve katılımcıları seçin; belgeler şablonunuzla oluşturulur, SHGM sertifikalarına sıradaki belge numarası verilir. Personel kendi belgelerini <b>Sertifikalarım</b> ekranından indirebilir.</p>
  <div id="s_bekleyen"></div>
  <div class="grid g2">
    <div class="panel"><h3>1 · Eğitim</h3>
      <div class="seg" id="ssab" style="margin-bottom:12px">${['shgm', 'isg'].map(k => `<button type="button" data-v="${k}" class="${SF.sablon === k ? 'on' : ''}">${SABLON_AD[k]}</button>`).join('')}</div>
      <form class="form" id="sform">
        ${isg ? inp('s_egt', 'Eğitim', 'Temel İş Sağlığı ve Güvenliği Eğitimi') : `<label>Eğitimin adı<input id="s_egt" list="s_egtl" required placeholder="Örn. Yangınla Mücadele Eğitimi"><datalist id="s_egtl">${egitimler.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>`}
        <div class="row2"><label>Eğitim tarihi<input type="date" id="s_t1" required value="${ISO_TODAY}"></label><label>Bitiş (birden çok günse)<input type="date" id="s_t2"></label></div>
        <div class="row2"><label>Süre (saat)<input type="number" id="s_saat" min="0" step="0.5" value="${isg ? esc(A.isg.saat || 8) : ''}"></label>
          ${isg ? `<label>Eğitim şekli<select id="s_sekil">${['Örgün', 'Uzaktan', 'Örgün ve Uzaktan'].map(x => `<option ${x === (A.isg.sekil || 'Örgün') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`
            : `<label>Eğitimci<input id="s_egm" list="s_egml" required placeholder="Örn. Fatih ÇİVİCİ"><datalist id="s_egml">${egitmenler.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>`}</div>
        <details><summary class="mini" style="cursor:pointer;font-weight:600">İmza ve sabit bilgiler</summary><div class="form" style="margin-top:10px">
          ${isg ? `${inp('a_kurum', 'Kurum', A.isg.kurum)}${inp('a_veren', 'Eğitimi veren kurum (varsa)', A.isg.veren_kurum)}${inp('a_isyeri', 'Çalışanın eğitim aldığı işyerinin unvanı', A.isg.isyeri_unvani)}
            <div class="row2">${inp('a_e1', '1. eğitimci', A.isg.egitmen1_ad)}${inp('a_e1u', 'Unvanı', A.isg.egitmen1_unvan)}</div>${inp('a_e1n', '1. eğitimci sertifika no', A.isg.egitmen1_no)}
            <div class="row2">${inp('a_e2', '2. eğitimci', A.isg.egitmen2_ad)}${inp('a_e2u', 'Unvanı', A.isg.egitmen2_unvan)}</div>${inp('a_e2n', '2. eğitimci sertifika no', A.isg.egitmen2_no)}
            <div class="row2">${inp('a_iv', 'İşveren / işveren vekili', A.isg.isveren_ad)}${inp('a_ivu', 'Unvanı', A.isg.isveren_unvan)}</div>`
          : `<div class="row2">${inp('a_sor', 'Eğitimden sorumlu yönetici', A.shgm.sorumlu_ad)}${inp('a_soru', 'Unvanı', A.shgm.sorumlu_unvan || 'Eğitimden Sorumlu Yönetici')}</div>${inp('a_yer', 'Eğitim yeri (cümle içinde)', A.shgm.yer || 'Zafer Havalimanı Eğitim Salonunda')}`}
          <div class="actions"><button type="button" class="btn sm" id="a_kaydet">Varsayılan olarak kaydet</button></div></div></details>
        ${isg ? '' : `<p class="mini" style="margin:0">Sıradaki belge no: <b id="s_sira"></b> · <a href="#" id="s_sayac">Numarayı ayarla</a></p>`}
      </form></div>
    <div class="panel"><h3>2 · Katılımcılar <span class="mini" id="s_say"></span></h3>
      <div class="filters" style="margin-bottom:8px"><input id="s_q" type="search" placeholder="Ad veya sicil…" value="${esc(SF.q)}"><select id="s_dep"><option value="">Tüm departmanlar</option>${DATA.DEPS.map(d => `<option ${SF.dep === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
      <div class="actions" style="margin-bottom:8px"><button type="button" class="btn sm" id="s_hep">Görünenleri seç</button><button type="button" class="btn sm" id="s_tem">Seçimi temizle</button></div>
      <div id="s_list" style="max-height:340px;overflow:auto;border:1px solid var(--line);border-radius:8px"></div></div>
  </div>
  <div class="actions" style="margin:14px 0 6px;align-items:center"><button class="btn" id="s_oniz" type="button">Önizle</button><button class="btn pri" id="s_uret" type="button">Belgeleri oluştur ve yazdır</button>
    <label style="display:inline-flex;gap:6px;align-items:center;font-size:14px;margin-left:8px"><input type="checkbox" id="s_imzali" ${SF.imzali ? 'checked' : ''}> İmzalı yazdır <span class="mini">(${Sertifika.imzaSayisi()} imza kayıtlı)</span></label></div><div id="s_msg"></div>
  <details class="panel" style="margin-top:14px" id="imzapanel"><summary style="cursor:pointer"><b style="font-family:var(--display);font-size:19px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)">İmzalar</b> <span class="mini">· belgeye eğitimci, sorumlu yönetici ve işveren vekilinin adına göre otomatik basılır</span></summary>
    <div id="imzabox" style="margin-top:12px"></div></details>
  <h3 style="margin-top:26px">Verilen belgeler · ${fn(B.length)}</h3>
  <div class="filters"><input id="l_q" type="search" placeholder="Ad, belge no veya eğitim…" value="${esc(SF.lq)}">
    <select id="l_yil"><option value="">Tüm yıllar</option>${yillar.map(y => `<option ${SF.lyil === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
    <select id="l_sab"><option value="">Tüm şablonlar</option>${['shgm', 'isg'].map(k => `<option value="${k}" ${SF.lsab === k ? 'selected' : ''}>${SABLON_AD[k]}</option>`).join('')}</select>
    <button class="btn sm" id="l_yaz" type="button">Seçilenleri yazdır</button><button class="btn sm" id="l_csv" type="button">CSV indir</button><span class="count" id="l_say"></span></div>
  <div class="tbl"><table id="l_tbl"></table></div>`;

  $('s_imzali').onchange = e => { SF.imzali = e.target.checked; };
  const imzaCiz = () => {
    const L = window.__IMZALAR || [];
    $('imzabox').innerHTML = `<div class="grid g4" style="margin-bottom:14px">${L.map(r => `<div style="border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff;color:#222;display:flex;flex-direction:column;gap:6px"><img src="${r.png}" alt="" style="height:70px;object-fit:contain"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b style="font-size:14px">${esc(r.ad)}</b><button class="btn sm bad" type="button" data-isil="${esc(r.anahtar)}">Sil</button></div></div>`).join('') || '<p class="mini">Kayıtlı imza yok.</p>'}</div>
      <form class="form" id="iform" style="max-width:640px"><div class="row2"><label>Kimin imzası (belgede yazdığı gibi)<input id="i_ad" list="s_egml3" required placeholder="Örn. Fatih ÇİVİCİ"><datalist id="s_egml3">${[...new Set([...egitmenler, A.shgm.sorumlu_ad, A.isg.egitmen1_ad, A.isg.egitmen2_ad, A.isg.isveren_ad].filter(Boolean))].map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>
        <label>İmza görseli (beyaz kâğıda atılmış imzanın taraması veya fotoğrafı)<input id="i_dosya" type="file" accept="image/png,image/jpeg" required></label></div>
        <p class="mini" style="margin:0">Arka plan otomatik temizlenir. Aynı ad için yeniden yüklerseniz eski imzanın yerine geçer.</p><div id="i_msg"></div>
        <div class="actions"><button class="btn pri" type="submit">İmzayı kaydet</button></div></form>
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" id="i_pers" ${(AYAR.genel || {}).personel_imzali ? 'checked' : ''}> Personel kendi belgesini <b>imzalı</b> indirebilsin <span class="mini">(kapalıyken personel imzasız kopya alır; imza görselleri yalnızca yöneticide kalır)</span></label>`;
    $('imzabox').querySelectorAll('[data-isil]').forEach(b => b.onclick = async () => { const { error } = await sb.from('imza').delete().eq('anahtar', b.dataset.isil); if (error) { alertMsg(error.message); return; } await imzalariYukle(); imzaCiz(); });
    $('iform').onsubmit = async ev => {
      ev.preventDefault(); const m = $('i_msg'), ad = $('i_ad').value.trim(), f = $('i_dosya').files[0]; if (!ad || !f) return;
      m.innerHTML = '<div class="msg info">İmza hazırlanıyor…</div>';
      try {
        const png = await imzaHazirla(f);
        const { error } = await sb.from('imza').upsert({ anahtar: Sertifika.anahtar(ad), ad, png, updated_at: new Date().toISOString() });
        if (error) throw error;
        await imzalariYukle(); imzaCiz(); $('imzapanel').open = true;
      } catch (er) { m.innerHTML = `<div class="msg err">${esc(er.message || er)}</div>`; }
    };
    $('i_pers').onchange = async e => { const v = e.target.checked; const { error } = await sb.from('sertifika_ayar').upsert({ anahtar: 'genel', deger: { ...(AYAR.genel || {}), personel_imzali: v }, updated_at: new Date().toISOString() });
      if (error) { alertMsg(error.message); e.target.checked = !v; } else AYAR.genel = { ...(AYAR.genel || {}), personel_imzali: v }; };
  };
  imzaCiz();
  // --- şablon değişimi
  view.querySelectorAll('#ssab button').forEach(b => b.onclick = () => { SF.sablon = b.dataset.v; V.sertifika(view); });
  // --- sıradaki numara
  const siraGoster = () => { const el = $('s_sira'); if (!el) return; const y = Number(($('s_t1').value || ISO_TODAY).slice(0, 4)); el.textContent = noBicim((SAY[y] || 0) + 1, y); };
  siraGoster(); $('s_t1').onchange = siraGoster;
  const sl = $('s_sayac'); if (sl) sl.onclick = e => {
    e.preventDefault(); const y = Number(($('s_t1').value || ISO_TODAY).slice(0, 4));
    modal(`<h3>${y} yılı belge numarası</h3><form class="form" id="nf"><label>Bu yıl en son verilen belge numarası<input id="nn" type="number" min="0" required value="${SAY[y] || 0}"></label>
      <p class="mini" style="margin:0">Örneğin Excel'de en son ${noBicim(16, y)} verildiyse 16 yazın; panel ${noBicim(17, y)} ile devam eder.</p><div id="nm"></div>
      <div class="acts"><button type="button" class="btn" data-close>Vazgeç</button><button class="btn pri" type="submit">Kaydet</button></div></form>`, (bg, close) => {
      bg.querySelector('#nf').onsubmit = async ev => { ev.preventDefault(); const v = Number(bg.querySelector('#nn').value);
        const { error } = await sb.rpc('sertifika_sayac_ayarla', { p_yil: y, p_son: v });
        if (error) { bg.querySelector('#nm').innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
        SAY[y] = v; siraGoster(); close(); };
    });
  };
  // --- imzacı/ayar kaydı
  const ayarTopla = () => isg ? { ...A.isg, kurum: $('a_kurum').value.trim(), veren_kurum: $('a_veren').value.trim(), isyeri_unvani: $('a_isyeri').value.trim(),
      egitmen1_ad: $('a_e1').value.trim(), egitmen1_unvan: $('a_e1u').value.trim(), egitmen1_no: $('a_e1n').value.trim(),
      egitmen2_ad: $('a_e2').value.trim(), egitmen2_unvan: $('a_e2u').value.trim(), egitmen2_no: $('a_e2n').value.trim(),
      isveren_ad: $('a_iv').value.trim(), isveren_unvan: $('a_ivu').value.trim() }
    : { ...A.shgm, sorumlu_ad: $('a_sor').value.trim(), sorumlu_unvan: $('a_soru').value.trim(), yer: $('a_yer').value.trim() };
  $('a_kaydet').onclick = async e => { const { error } = await sb.from('sertifika_ayar').upsert({ anahtar: SF.sablon, deger: ayarTopla(), updated_at: new Date().toISOString() });
    e.target.textContent = error ? 'Kaydedilemedi' : 'Kaydedildi'; if (!error) A[SF.sablon] = ayarTopla(); };
  // --- katılımcı listesi
  const listeCiz = () => {
    const q = fold(SF.q), rows = DATA.ACT.filter(p => (!SF.dep || p.dep === SF.dep) && (!q || p.fx.includes(q)));
    $('s_list').innerHTML = rows.map(p => `<label style="display:flex;gap:10px;align-items:center;padding:7px 10px;border-bottom:1px solid var(--line);cursor:pointer;font-weight:400;color:var(--fg)"><input type="checkbox" data-s="${esc(p.sicil)}" ${SF.sec.has(p.sicil) ? 'checked' : ''}><span style="flex:1;min-width:0"><b>${esc(p.ad)}</b><br><span class="mini">${esc(p.unvan || '')} · ${esc(p.dep)}</span></span><span class="mini">${esc(p.sicil)}</span></label>`).join('') || '<p class="mini" style="padding:10px">Eşleşen personel yok.</p>';
    $('s_list').querySelectorAll('input').forEach(c => c.onchange = () => { c.checked ? SF.sec.add(c.dataset.s) : SF.sec.delete(c.dataset.s); sayac(); });
    sayac(); return rows;
  };
  const sayac = () => { $('s_say').textContent = SF.sec.size ? `· ${SF.sec.size} kişi seçili` : ''; };
  let gorunen = listeCiz();
  $('s_q').oninput = e => { SF.q = e.target.value; gorunen = listeCiz(); };
  $('s_dep').onchange = e => { SF.dep = e.target.value; gorunen = listeCiz(); };
  $('s_hep').onclick = () => { gorunen.forEach(p => SF.sec.add(p.sicil)); gorunen = listeCiz(); };
  $('s_tem').onclick = () => { SF.sec.clear(); gorunen = listeCiz(); };
  // --- belge verisi
  const paket = () => {
    const egitim = $('s_egt').value.trim(), t1 = $('s_t1').value, t2 = $('s_t2').value || null, saat = $('s_saat').value;
    if (!egitim || !t1) throw new Error('Eğitimin adını ve tarihini girin.');
    if (t2 && t2 < t1) throw new Error('Bitiş tarihi başlangıçtan önce olamaz.');
    const alanlar = isg ? { ...ayarTopla(), sekil: $('s_sekil').value } : { ...ayarTopla(), egitmen: $('s_egm').value.trim() };
    if (!isg && !alanlar.egitmen) throw new Error('Eğitimcinin adını girin.');
    const kisiler = [...SF.sec].map(s => DATA.byS[s]).filter(Boolean).map(p => ({ sicil: p.sicil, ad: p.ad, unvan: p.unvan || '' }));
    return { sablon: SF.sablon, egitim, tarih: t1, tarih_bitis: t2, saat: saat === '' ? null : Number(saat), alanlar, kisiler };
  };
  $('s_oniz').onclick = () => {
    let p; try { p = paket(); } catch (e) { $('s_msg').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; return; }
    const k = p.kisiler[0] || { sicil: '—', ad: 'Örnek Personel', unvan: 'Unvan' };
    const y = Number(p.tarih.slice(0, 4));
    const ornek = { ...p, ...k, seri_no: isg ? null : noBicim((SAY[y] || 0) + 1, y) };
    modal(`<h3>Önizleme${p.kisiler.length ? ` · ${esc(k.ad)}` : ''}</h3><div class="sert-onizleme"><div class="olcek" style="transform:scale(.42);width:297mm;height:${isg ? 420 : 210}mm;margin-bottom:${isg ? -243 : -121}mm;margin-right:-172mm">${Sertifika.sayfalarOpt(ornek, { imzasiz: !SF.imzali })}</div></div>
      <div class="acts"><button class="btn pri" data-close>Kapat</button></div>`, bg => { bg.querySelector('.modal').style.maxWidth = '560px'; });
  };
  $('s_uret').onclick = async e => {
    let p; try { p = paket(); } catch (er) { $('s_msg').innerHTML = `<div class="msg err">${esc(er.message)}</div>`; return; }
    if (!p.kisiler.length) { $('s_msg').innerHTML = '<div class="msg err">En az bir katılımcı seçin.</div>'; return; }
    e.target.disabled = true; $('s_msg').innerHTML = '<div class="msg info">Belgeler oluşturuluyor…</div>';
    const { data, error } = await sb.rpc('sertifika_uret', { p });
    e.target.disabled = false;
    if (error) { $('s_msg').innerHTML = `<div class="msg err">Oluşturulamadı: ${esc(error.message)}</div>`; return; }
    const nolar = data.filter(d => d.seri_no).map(d => d.seri_no);
    SF.sec.clear();
    await Sertifika.yazdir(data, { imzasiz: !SF.imzali });
    setTimeout(() => { V.sertifika(view).then(() => { $('s_msg').innerHTML = `<div class="msg ok">${data.length} belge oluşturuldu${nolar.length ? ` (${nolar[0]}${nolar.length > 1 ? ' – ' + nolar[nolar.length - 1] : ''})` : ''}. Tekrar yazdırmak için aşağıdaki listeyi kullanın.</div>`; }); }, 400);
  };
  // --- Excel'den gelen eğitimler: sertifikası henüz düzenlenmemiş iç eğitimler
  if (SF.on) { const o = SF.on; SF.on = null; const set = (id, v) => { const el = $(id); if (el && v != null) el.value = v; };
    set('s_egt', o.egitim); set('s_t1', o.bas || o.bit); set('s_t2', o.bas && o.bas !== o.bit ? o.bit : ''); set('s_saat', o.saat == null ? '' : o.saat); set('s_egm', o.egitmen);
    $('s_msg').innerHTML = `<div class="msg info">Excel'deki eğitim forma aktarıldı ve ${SF.sec.size} katılımcı seçildi. Bilgileri kontrol edip <b>Belgeleri oluştur ve yazdır</b>'a basın.</div>`; $('sform').scrollIntoView({ block: 'center' }); }
  const BF2 = SF.byil || String(TODAY.getFullYear());
  const bekleyenler = () => sertifikaGruplari(B, AYAR, { yil: BF2 });
  const bekleyenCiz = () => {
    const L = bekleyenler(), yil = [...new Set(DATA.P.flatMap(p => p.H.map(h => String(h[0] || '').slice(0, 4))).filter(y => /^\d{4}$/.test(y)))].sort().reverse().slice(0, 6);
    const tr = t => t ? fd(t) : '';
    $('s_bekleyen').innerHTML = `<div class="panel sb-panel" style="margin-bottom:16px"><div class="sb-bas"><h3>Excel'den gelen eğitimler · sertifikası düzenlenmemiş <span class="pill ${L.length ? 'p-bekliyor' : 'p-onaylandi'}">${L.reduce((a, g) => a + g.eksik.length, 0)} kişi</span></h3>
      <select id="sb_yil">${yil.map(y => `<option ${y === BF2 ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
      <p class="mini" style="margin:-4px 0 10px">SHGM Eğitim Takip dosyasındaki <b>iç eğitimler</b> burada listelenir: SHGM eğitimleri için numaralı SHGM sertifikası, Temel İSG için katılım belgesi. Dış eğitimlerin belgesini eğitim firması verir.</p>
      ${L.length ? `<div class="sb-liste">${L.map((g, i) => `<div class="sb-satir"><div><b>${esc(g.egitim)}</b><span class="mini">${tr(g.bas)}${g.bas ? ' – ' : ''}${tr(g.bit)} · ${esc(g.egitmen || 'eğitimci yok')}${g.saat ? ' · ' + fn(g.saat, 1) + ' saat' : ''} · ${SABLON_AD[g.sab]}</span>
          <span class="mini">${g.eksik.slice(0, 6).map(s => esc((DATA.byS[s] || {}).ad || s)).join(', ')}${g.eksik.length > 6 ? ` +${g.eksik.length - 6}` : ''}${g.hepsi.length > g.eksik.length ? ` · <i>${g.hepsi.length - g.eksik.length} kişinin belgesi zaten var</i>` : ''}</span></div>
          <div class="actions"><button class="btn sm" data-sbg="${i}" title="Bu eğitimin belgeleri panel dışında verildiyse listeden çıkarır">Belgesi verildi</button><button class="btn sm" data-sba="${i}">Forma aktar</button><button class="btn sm pri" data-sbu="${i}">${g.eksik.length} belge üret</button></div></div>`).join('')}</div>
        <div class="actions" style="margin-top:10px"><button class="btn" id="sb_hep">Hepsini üret (${L.reduce((a, g) => a + g.eksik.length, 0)} belge)</button></div>`
      : `<p class="mini">${BF2} yılı için sertifikası eksik iç eğitim yok.</p>`}</div>`;
    $('sb_yil').onchange = e => { SF.byil = e.target.value; bekleyenCiz(); };
    $('s_bekleyen').querySelectorAll('[data-sba]').forEach(b => b.onclick = () => { const g = L[+b.dataset.sba];
      SF.sablon = g.sab; SF.sec = new Set(g.eksik); SF.on = g; V.sertifika(view); });

    const onayla = grup => { const n = grup.reduce((a, g) => a + g.eksik.length, 0), sh = grup.filter(g => g.sab === 'shgm').reduce((a, g) => a + g.eksik.length, 0);
      modal(`<h3>${n} belge üretilsin mi?</h3><p>${grup.length} eğitim için ${n} belge oluşturulacak.${sh ? ` SHGM sertifikalarına sıradaki ${sh} numara verilecek.` : ''} Personel belgelerini <b>Sertifikalarım</b> ekranında görür.</p><div id="sb_m"></div>
        <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="sb_evet">Üret</button></div>`, (bg, close) => {
        bg.querySelector('#sb_evet').onclick = async e => { if (e.target.dataset.basildi) return; e.target.dataset.basildi = '1'; e.target.disabled = true; e.target.textContent = 'Üretiliyor…';
          bg.querySelectorAll('[data-close]').forEach(x => x.disabled = true);
          let r = null, hata = null;
          try { r = await sertifikaGrupUret(grup, A); } catch (er) { hata = er; }
          close(); await V.sertifika(view);
          const nolar = r ? r.nolar : [];
          $('s_msg').innerHTML = (r && r.n ? `<div class="msg ok">${r.n} belge oluşturuldu${nolar.length ? ` (${nolar[0]}${nolar.length > 1 ? ' – ' + nolar[nolar.length - 1] : ''})` : ''}. Yazdırmak için aşağıdaki listeyi kullanın.</div>` : '')
            + (r && r.atlanan.length ? `<div class="msg err" style="margin-top:6px">Excel'de eğitimci adı olmadığı için üretilmedi: ${esc(r.atlanan.join(', '))}. "Forma aktar" ile eğitimciyi yazarak üretin.</div>` : '')
            + (hata ? `<div class="msg err" style="margin-top:6px">Üretim durdu: ${esc(hata.message)}${/duplicate key|seri_no/.test(hata.message) ? ' — 14_sertifika_no_duzelt.sql dosyasını Supabase SQL Editor\'da çalıştırın.' : ''}</div>` : '')
            || '<div class="msg info">Üretilecek yeni belge kalmamış; hepsi zaten üretilmiş.</div>';
          $('s_msg').scrollIntoView({ block: 'center' }); }; }); };
    $('s_bekleyen').querySelectorAll('[data-sbg]').forEach(b => b.onclick = () => { const g = L[+b.dataset.sbg];
      modal(`<h3>Listeden çıkarılsın mı?</h3><p><b>${esc(g.egitim)}</b> (${fd(g.bit)}) eğitiminin belgeleri panel dışında verildiyse bu eğitimi listeden çıkarın. Yeni belge üretilmez.</p>
        <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="sbg_evet">Listeden çıkar</button></div>`, (bg, close) => {
        bg.querySelector('#sbg_evet').onclick = async () => { const keys = [...new Set([...(((AYAR.sb_gizli || {}).keys) || []), g.key])];
          const { error } = await sb.from('sertifika_ayar').upsert({ anahtar: 'sb_gizli', deger: { keys }, updated_at: new Date().toISOString() });
          close(); if (error) { alertMsg(error.message); return; } AYAR.sb_gizli = { keys }; bekleyenCiz(); }; }); });
    $('s_bekleyen').querySelectorAll('[data-sbu]').forEach(b => b.onclick = () => onayla([L[+b.dataset.sbu]]));
    const hep = $('sb_hep'); if (hep) hep.onclick = () => onayla(L);
  };
  try { bekleyenCiz(); } catch (er) { $('s_bekleyen').innerHTML = `<div class="msg err" style="margin-bottom:16px">Excel'den gelen eğitimler listelenemedi: ${esc(er.message)}</div>`; console.error(er); }
  // --- verilen belgeler listesi
  const sirala = (a, b) => (b.tarih || '').localeCompare(a.tarih || '') || (b.yil || 0) - (a.yil || 0) || (b.sira || 0) - (a.sira || 0) || b.id - a.id;
  let gor = [];
  const listeB = () => {
    const q = fold(SF.lq);
    gor = B.filter(b => (!SF.lyil || (b.tarih || '').startsWith(SF.lyil)) && (!SF.lsab || b.sablon === SF.lsab) && (!q || fold(`${b.ad} ${b.seri_no || ''} ${b.egitim} ${b.sicil || ''}`).includes(q))).sort(sirala);
    $('l_say').textContent = `${gor.length} belge${SF.lsec.size ? ` · ${SF.lsec.size} seçili` : ''}`;
    $('l_tbl').innerHTML = `<thead><tr><th><input type="checkbox" id="l_all" aria-label="Görünenleri seç"></th><th>Belge No</th><th>Ad Soyad</th><th>Eğitim</th><th>Tarih</th><th class="n">Saat</th><th>Eğitimci</th><th>İşlem</th></tr></thead><tbody>${gor.slice(0, 400).map(b => `<tr data-id="${b.id}"${b.iptal ? ' style="opacity:.55"' : ''}>
      <td><input type="checkbox" data-l="${b.id}" ${SF.lsec.has(b.id) ? 'checked' : ''} ${b.iptal ? 'disabled' : ''}></td>
      <td style="white-space:nowrap"><b>${esc(b.seri_no || '—')}</b><br><span class="mini">${b.sablon === 'isg' ? 'İSG' : 'SHGM'}</span></td>
      <td>${esc(Sertifika.baslikHarf(b.ad))}${b.sicil ? `<br><span class="mini">${esc(b.sicil)}</span>` : '<br><span class="mini">ayrılmış / eşleşmedi</span>'}${b.arsiv ? ' <span class="pill p-iptal">Arşiv</span>' : ''}${b.iptal ? ` <span class="pill p-reddedildi">İptal</span>` : ''}</td>
      <td>${esc(b.egitim)}</td><td style="white-space:nowrap">${fd(b.tarih)}${b.tarih_bitis ? `<br><span class="mini">– ${fd(b.tarih_bitis)}</span>` : ''}</td><td class="n">${b.saat ? fn(b.saat, 1) : '—'}</td>
      <td class="mini">${esc((b.alanlar || {}).egitmen || (b.sablon === 'isg' ? 'İSG eğitimcileri' : '—'))}</td>
      <td><div class="actions">${b.iptal ? '' : `<button class="btn sm" data-yaz="${b.id}">Yazdır</button>${b.sablon === 'shgm' ? `<button class="btn sm" data-egm="${b.id}">Eğitimci</button>` : ''}<button class="btn sm bad" data-ipt="${b.id}">İptal</button>`}</div></td></tr>`).join('')}</tbody>`;
    if (gor.length > 400) $('l_tbl').insertAdjacentHTML('beforeend', `<tfoot><tr><td colspan="8" class="mini">İlk 400 belge gösteriliyor; aramayı daraltın.</td></tr></tfoot>`);
    $('l_all').onchange = ev => { gor.slice(0, 400).filter(b => !b.iptal).forEach(b => ev.target.checked ? SF.lsec.add(b.id) : SF.lsec.delete(b.id)); listeB(); };
    $('l_tbl').querySelectorAll('[data-l]').forEach(c => c.onchange = () => { c.checked ? SF.lsec.add(+c.dataset.l) : SF.lsec.delete(+c.dataset.l); $('l_say').textContent = `${gor.length} belge${SF.lsec.size ? ` · ${SF.lsec.size} seçili` : ''}`; });
    $('l_tbl').querySelectorAll('[data-yaz]').forEach(x => x.onclick = () => Sertifika.yazdir([B.find(b => b.id === +x.dataset.yaz)], { imzasiz: !SF.imzali }));
    $('l_tbl').querySelectorAll('[data-ipt]').forEach(x => x.onclick = () => iptalEt(B.find(b => b.id === +x.dataset.ipt)));
    $('l_tbl').querySelectorAll('[data-egm]').forEach(x => x.onclick = () => egitmenDuzenle(B.find(b => b.id === +x.dataset.egm)));
  };
  const iptalEt = b => modal(`<h3>Belgeyi iptal et</h3><p>${esc(b.seri_no || '')} · ${esc(Sertifika.baslikHarf(b.ad))} · ${esc(b.egitim)}</p><form class="form" id="if2"><label>İptal nedeni<textarea id="in2" required maxlength="300"></textarea></label>
    <p class="mini" style="margin:0">Belge numarası boşa çıkmaz, tekrar kullanılmaz; kayıt listede "İptal" olarak kalır.</p>
    <div class="acts"><button type="button" class="btn" data-close>Vazgeç</button><button class="btn pri" type="submit">İptal et</button></div></form>`, (bg, close) => {
    bg.querySelector('#if2').onsubmit = async ev => { ev.preventDefault();
      const { error } = await sb.from('sertifika_belge').update({ iptal: true, iptal_nedeni: bg.querySelector('#in2').value.trim(), iptal_tarihi: new Date().toISOString() }).eq('id', b.id);
      close(); if (error) { alertMsg(error.message); return; } b.iptal = true; SF.lsec.delete(b.id); listeB(); };
  });
  const egitmenDuzenle = b => {
    const grup = B.filter(x => x.sablon === 'shgm' && x.egitim === b.egitim && x.tarih === b.tarih && !x.iptal);
    modal(`<h3>Eğitimci</h3><p class="mini">${esc(b.egitim)} · ${fd(b.tarih)}</p><form class="form" id="ef"><label>Eğitimcinin adı<input id="en" list="s_egml2" required value="${esc((b.alanlar || {}).egitmen || '')}"><datalist id="s_egml2">${egitmenler.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>
      ${grup.length > 1 ? `<label style="flex-direction:row;align-items:center;gap:8px;font-weight:400;color:var(--fg)"><input type="checkbox" id="eg" checked> Aynı gün aynı eğitimdeki ${grup.length} belgenin hepsine uygula</label>` : ''}<div id="em"></div>
      <div class="acts"><button type="button" class="btn" data-close>Vazgeç</button><button class="btn pri" type="submit">Kaydet</button></div></form>`, (bg, close) => {
      bg.querySelector('#ef').onsubmit = async ev => { ev.preventDefault();
        const ad = bg.querySelector('#en').value.trim(), hedef = bg.querySelector('#eg') && bg.querySelector('#eg').checked ? grup : [b];
        const sonuc = await Promise.all(hedef.map(x => sb.from('sertifika_belge').update({ alanlar: { ...(x.alanlar || {}), egitmen: ad } }).eq('id', x.id)));
        const hata = sonuc.find(r => r.error); if (hata) { bg.querySelector('#em').innerHTML = `<div class="msg err">${esc(hata.error.message)}</div>`; return; }
        hedef.forEach(x => x.alanlar = { ...(x.alanlar || {}), egitmen: ad }); close(); listeB(); };
    });
  };
  listeB();
  $('l_q').oninput = e => { SF.lq = e.target.value; listeB(); };
  $('l_yil').onchange = e => { SF.lyil = e.target.value; listeB(); };
  $('l_sab').onchange = e => { SF.lsab = e.target.value; listeB(); };
  $('l_yaz').onclick = () => { const L = B.filter(b => SF.lsec.has(b.id) && !b.iptal); if (!L.length) { alertMsg('Yazdırmak için listeden belge seçin.'); return; } Sertifika.yazdir(L.sort(sirala).reverse(), { imzasiz: !SF.imzali }); };
  $('l_csv').onclick = () => csvIndir('sertifika_numaralari.csv', [['Belge No', 'Ad Soyad', 'Sicil', 'Unvan', 'Eğitim', 'Tarih', 'Bitiş', 'Saat', 'Eğitimci', 'Şablon', 'Durum'],
    ...gor.map(b => [b.seri_no || '', Sertifika.baslikHarf(b.ad), b.sicil || '', b.unvan || '', b.egitim, fd(b.tarih), b.tarih_bitis ? fd(b.tarih_bitis) : '', b.saat ?? '', (b.alanlar || {}).egitmen || '', SABLON_AD[b.sablon], b.iptal ? 'İptal' : b.arsiv ? 'Arşiv' : 'Geçerli'])]);
};

// ---- Hesaplar
async function fn_(body) {
  const { data, error } = await sb.functions.invoke(CFG.FUNCTION_NAME || 'hesaplar', { body });
  if (error) { let m = error.message; try { const j = await error.context.json(); m = j.hata || m; } catch (e) { } throw new Error(m); }
  if (data && data.hata) throw new Error(data.hata);
  return data;
}
V.hesaplar = async view => {
  view.innerHTML = `<h2>Hesaplar</h2><p class="sub">Personel sicil no ve şifreyle giriş yapar. Yeni hesaplarda geçici şifre üretilir ve ilk girişte değiştirilmesi zorunludur.</p><div id="hbox" class="loading">Yükleniyor…</div>`;
  let res; try { res = await fn_({ islem: 'liste' }); } catch (e) { $('hbox').className = ''; $('hbox').innerHTML = `<div class="msg err">Hesap listesi alınamadı: ${esc(e.message)}. "hesaplar" fonksiyonunun kurulu olduğundan emin olun (Kurulum Adım 4).</div>`; return; }
  const H = res.hesaplar || []; const bys = Object.fromEntries(H.map(h => [h.sicil, h]));
  const hesapsiz = DATA.ACT.filter(p => !bys[p.sicil]);
  const ayrilanAktif = H.filter(h => h.aktif && DATA.byS[h.sicil] && DATA.byS[h.sicil].durum === 'Pasif');
  const rows = DATA.P.filter(p => p.durum === 'Etkin' || bys[p.sicil]).map(p => ({ p, h: bys[p.sicil] }));
  const giris = H.filter(h => h.son_giris).length, degisti = H.filter(h => !h.must_change_password).length;
  $('hbox').className = '';
  $('hbox').innerHTML = `<div class="grid g4" style="margin-bottom:16px">
    <div class="panel kpi"><div class="lbl">Hesabı olan</div><div class="val">${H.length}</div><div class="note">${H.filter(h => h.role === 'admin').length} yönetici</div></div>
    <div class="panel kpi"><div class="lbl">En az bir kez giriş yapan</div><div class="val">${giris}</div><div class="note">${degisti} kişi şifresini değiştirdi</div></div>
    <div class="panel kpi"><div class="lbl">Hesabı olmayan aktif personel</div><div class="val">${hesapsiz.length}</div><div class="actions" style="margin-top:8px">${hesapsiz.length ? `<button class="btn pri sm" id="hac">Hesapları aç</button>` : ''}</div></div>
    <div class="panel kpi"><div class="lbl">Ayrılan ama hesabı açık</div><div class="val">${ayrilanAktif.length}</div><div class="actions" style="margin-top:8px">${ayrilanAktif.length ? `<button class="btn bad sm" id="hkap">Hesaplarını kapat</button>` : ''}</div></div></div>
  <div class="filters"><input id="hq" type="search" placeholder="Ad veya sicil…"><span class="count">${rows.length} kişi</span></div>
  <div class="tbl"><table id="htbl"></table></div>`;
  const draw = () => {
    const q = fold($('hq').value);
    $('htbl').innerHTML = `<thead><tr><th>Sicil</th><th>Ad Soyad</th><th>Hesap</th><th>Rol</th><th>Son giriş</th><th>İşlem</th></tr></thead><tbody>${rows.filter(r => !q || r.p.fx.includes(q)).map(({ p, h }) => `<tr data-s="${esc(p.sicil)}"><td>${esc(p.sicil)}</td><td><b>${esc(p.ad)}</b>${p.durum === 'Pasif' ? ' ' + pill('Pasif') : ''}<br><span class="mini">${esc(p.unvan || '')}</span></td>
      <td>${!h ? '<span class="mini">Yok</span>' : h.aktif ? (h.must_change_password ? '<span class="pill p-bekliyor">Geçici şifre</span>' : '<span class="pill p-onaylandi">Aktif</span>') : '<span class="pill p-iptal">Kapalı</span>'}</td>
      <td>${h ? `<span class="pill p-${h.role}">${h.role === 'admin' ? 'Yönetici' : h.role === 'izleyici' ? 'İzleyici' : 'Personel'}</span>` : '—'}</td><td class="mini">${h ? fdt(h.son_giris) : '—'}</td>
      <td><div class="actions">${!h ? (p.durum === 'Etkin' ? '<button class="btn sm" data-a="ac">Hesap aç</button>' : '') : `<button class="btn sm" data-a="sifre">Şifre sıfırla</button>${h.user_id !== ME.user.id ? `<button class="btn sm" data-a="${h.aktif ? 'kapat' : 'etkin'}">${h.aktif ? 'Kapat' : 'Aç'}</button><button class="btn sm" data-a="rol">Rol değiştir</button>` : ''}`}</div></td></tr>`).join('')}</tbody>`;
    $('htbl').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      const s = b.closest('tr').dataset.s, p = DATA.byS[s], h = bys[s]; b.disabled = true;
      try {
        if (b.dataset.a === 'ac') { const r = await fn_({ islem: 'hesap_ac', siciller: [s] }); const x = (r.sonuc || [])[0]; if (!x) throw new Error('Hesap açılamadı'); if (x.hata) throw new Error(x.hata); sifreGoster('Hesap açıldı', s, p.ad, x.sifre); }
        if (b.dataset.a === 'sifre') { const r = await fn_({ islem: 'sifre_sifirla', sicil: s }); sifreGoster('Şifre sıfırlandı', s, p.ad, r.sifre); }
        if (b.dataset.a === 'kapat' || b.dataset.a === 'etkin') await fn_({ islem: 'durum', sicil: s, aktif: b.dataset.a === 'etkin' });
        if (b.dataset.a === 'rol') { b.disabled = false; rolSec(s, p, h, () => V.hesaplar(view)); return; }
        if (b.dataset.a !== 'sifre' && b.dataset.a !== 'ac') V.hesaplar(view); else { V.hesaplar(view); }
      } catch (e) { alertMsg(e.message); b.disabled = false; }
    });
  };
  draw(); $('hq').oninput = draw;
  const hac = $('hac'); if (hac) hac.onclick = () => modal(`<h3>${hesapsiz.length} personel için hesap aç</h3><p>Her biri için geçici şifre üretilecek. Liste yalnızca bir kez gösterilir; CSV olarak indirip personele iletin, sonra dosyayı silin.</p>
    <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="hgo">Hesapları aç</button></div>`, (bg, close) => {
    bg.querySelector('#hgo').onclick = async e => {
      e.target.disabled = true; e.target.textContent = 'Açılıyor…';
      try {
        const r = await fn_({ islem: 'hesap_ac' }); close();
        const ok = (r.sonuc || []).filter(x => x.sifre), bad = (r.sonuc || []).filter(x => x.hata);
        const rowsCsv = [['Sicil', 'Ad Soyad', 'Geçici Şifre'], ...ok.map(x => [x.sicil, x.ad, x.sifre])];
        modal(`<h3>${ok.length} hesap açıldı</h3>${bad.length ? `<div class="msg err">${bad.length} hesap açılamadı: ${bad.map(x => esc(x.ad + ' (' + x.hata + ')')).join(', ')}</div>` : ''}
          <div class="tbl" style="max-height:320px;margin-top:10px"><table><thead><tr><th>Sicil</th><th>Ad Soyad</th><th>Geçici şifre</th></tr></thead><tbody>${ok.map(x => `<tr><td>${esc(x.sicil)}</td><td>${esc(x.ad)}</td><td><code>${esc(x.sifre)}</code></td></tr>`).join('')}</tbody></table></div>
          <div class="acts"><button class="btn" id="hcsv">CSV indir</button><button class="btn pri" data-close>Kapat</button></div>`, bg2 => { bg2.querySelector('#hcsv').onclick = () => csvIndir('ilk_sifreler.csv', rowsCsv); bg2.addEventListener('click', ev => { if (ev.target.closest('[data-close]') || ev.target === bg2) V.hesaplar(view); }); });
      } catch (err) { close(); alertMsg(err.message); }
    };
  });
  const hk = $('hkap'); if (hk) hk.onclick = async () => { hk.disabled = true; try { const r = await fn_({ islem: 'ayrilanlari_kapat' }); alertMsg(`${(r.kapatilan || []).length} hesap kapatıldı.`); V.hesaplar(view); } catch (e) { alertMsg(e.message); hk.disabled = false; } };
};

// ---- Veri yükle
V.veri = view => {
  view.innerHTML = `<h2>Veri Yükle</h2><p class="sub">Her ay güncel Excel dosyalarını buradan yükleyin. Dosyalar tarayıcınızda okunur, yalnızca panelde kullanılan alanlar veritabanına yazılır. Yalnızca güncellediğiniz dosyayı seçmeniz yeterli.</p>
  <div class="grid g4">
    <label class="drop"><b>Güncel Database</b><span class="mini">ZAFER GÜNCEL DATABASE · en son ay sayfası ve "İşten Çıkış Yapanlar" okunur</span><input type="file" id="f_db" accept=".xlsx,.xlsm,.xls"></label>
    <label class="drop"><b>Yıllık İzin Takip</b><span class="mini">Personel, Kullanım, Aylık Kalan, İzin Kayıtları, Özet</span><input type="file" id="f_izin" accept=".xlsx,.xlsm,.xls"></label>
    <label class="drop"><b>SHGM Eğitim Takip</b><span class="mini">Takip Paneli, Kayıt Defteri, Personel, Eğitim Kataloğu</span><input type="file" id="f_egitim" accept=".xlsx,.xlsm,.xls"></label>
  </div>
  <div class="actions" style="margin-top:14px"><button class="btn pri" id="vprev">Dosyaları oku</button></div><div id="vout" style="margin-top:14px"></div><div id="oz_toplu"></div>`;
  ozTopluBagla($('oz_toplu'));
  let paket = null;
  $('vprev').onclick = async () => {
    const out = $('vout'); out.innerHTML = '<div class="msg info">Dosyalar okunuyor…</div>';
    try {
      if (!window.XLSX) throw new Error('Excel okuyucu yüklenemedi; internet bağlantınızı kontrol edin.');
      const files = {};
      for (const k of ['db', 'izin', 'egitim']) {
        const f = $('f_' + k).files[0]; if (!f) continue;
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false });
        files[k] = IKParser.fromSheetJS(XLSX, wb);
      }
      if (!Object.keys(files).length) throw new Error('En az bir dosya seçin.');
      if (!files.db && !DATA.P.length) throw new Error('İlk yüklemede Güncel Database dosyası da gerekli.');
      // Database seçilmediyse isim/sicil eşleştirmesi mevcut personel listesiyle yapılır
      paket = files.db ? IKParser.parse(files) : await mevcutPersonelleEslestir(files);
      const r = paket.rapor, u = r.yukleme.uyarilar;
      out.innerHTML = `<div class="panel"><h3>Okunan veri</h3><dl class="kv">
        ${paket.personel ? `<dt>Personel</dt><dd>${paket.personel.length} kişi (${paket.personel.filter(p => p.durum === 'Etkin').length} aktif) · ${esc(r.db_donem)} sayfası</dd>` : ''}
        ${paket.personel ? `<dt>Amir ataması</dt><dd>${r.amir_sutunu ? `${paket.personel.filter(p => p.amir_sicil).length} personelin amiri tanımlı` : '<span style="color:var(--warn)">AMİR SİCİL sütunu bulunamadı · izin talepleri doğrudan İK\'ya gelir</span>'}</dd>` : ''}
        ${paket.izin_bakiye ? `<dt>İzin bakiyesi</dt><dd>${paket.izin_bakiye.length} kişi · dönem ${AYU[(r.izin_donem || 1) - 1]}</dd><dt>İzin kayıtları</dt><dd>${paket.izin_kayit.length}</dd>` : ''}
        ${paket.egitim_durum ? `<dt>SHGM eğitim durumu</dt><dd>${paket.egitim_durum.length} zorunlu eğitim ataması</dd><dt>Eğitim kayıtları</dt><dd>${paket.egitim_kayit.length}</dd><dt>Katalog</dt><dd>${paket.egitim_katalog.length} eğitim</dd>` : ''}
      </dl>${r.notlar.length ? `<p class="mini" style="margin-top:10px;font-weight:600">Eşleştirme notları</p><ul class="mini">${r.notlar.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${u.length ? `<div class="msg err" style="margin-top:10px">${u.map(esc).join('<br>')}</div>` : ''}
      ${paket.egitim_kayit ? `<label class="v-oto"><input type="checkbox" id="v_oto" checked><span><b>Yeni eğitimlerin sertifikalarını otomatik üret</b><small>Bu yüklemeyle ilk kez gelen iç eğitimler için: SHGM eğitimlerine numaralı sertifika, Temel İSG'ye katılım belgesi. Daha önce yüklenmiş eğitimlere ve belgesi olan kişilere dokunulmaz.</small></span></label>` : ''}
      <div class="actions" style="margin-top:12px"><button class="btn pri" id="vsave">Veritabanına yaz</button></div><div id="vres" style="margin-top:10px"></div></div>`;
      $('vsave').onclick = async e => {
        e.target.disabled = true; e.target.textContent = 'Yazılıyor…';
        const oto = !!($('v_oto') && $('v_oto').checked);
        const eskiKayit = paket.egitim_kayit ? new Set(DATA.P.flatMap(p => (p.H || []).map(h => kayitAnahtar(p.sicil, h[0], h[1])))) : null;
        const { data, error } = await sb.rpc('veri_yukle', { p: paket });
        if (error) { $('vres').innerHTML = `<div class="msg err">Yazılamadı: ${esc(error.message)}</div>`; e.target.disabled = false; e.target.textContent = 'Veritabanına yaz'; return; }
        $('vres').innerHTML = `<div class="msg ok">Kaydedildi: ${fn(data.personel)} personel, ${fn(data.izin_kayit)} izin kaydı${data.eslesen_panel_izni ? ` (panelden onaylanan ${data.eslesen_panel_izni} izin Excel'de bulundu)` : ''}, ${fn(data.egitim_durum)} eğitim durumu, ${fn(data.egitim_kayit)} eğitim kaydı. Panel yenileniyor…</div>`;
        await loadData();
        if (!oto || !eskiKayit) { setTimeout(() => { location.hash = 'genel'; route(); }, 900); return; }
        const yeni = new Set(paket.egitim_kayit.filter(k => DATA.byS[k.sicil]).map(k => kayitAnahtar(k.sicil, k.tarih, k.egitim)).filter(k => !eskiKayit.has(k)));
        const sonuc = $('vres').appendChild(document.createElement('div')); sonuc.style.marginTop = '8px';
        if (!yeni.size) { sonuc.innerHTML = '<div class="msg info">Bu yüklemede yeni eğitim kaydı yok; sertifika üretilmedi.</div>'; return; }
        sonuc.innerHTML = `<div class="msg info">${yeni.size} yeni eğitim kaydı bulundu; sertifikalar üretiliyor…</div>`;
        try {
          const [ay, bl] = await Promise.all([sb.from('sertifika_ayar').select('*'), fetchAll('sertifika_belge', 'id,sablon,sicil,egitim,tarih,tarih_bitis,iptal')]);
          const AYAR = {}; (ay.data || []).forEach(r => AYAR[r.anahtar] = r.deger);
          const grup = sertifikaGruplari(bl, AYAR, { sadece: yeni });
          if (!grup.length) { sonuc.innerHTML = `<div class="msg info">${yeni.size} yeni eğitim kaydı var, ancak sertifika gerektiren (SHGM ya da Temel İSG) yeni bir iç eğitim yok.</div>`; return; }
          const r = await sertifikaGrupUret(grup, { shgm: AYAR.shgm || {}, isg: AYAR.isg || {} });
          sonuc.innerHTML = `<div class="msg ok"><b>${r.n} sertifika otomatik üretildi</b>${r.nolar.length ? ` · belge no ${r.nolar[0]}${r.nolar.length > 1 ? ' – ' + r.nolar[r.nolar.length - 1] : ''}` : ''} (${grup.length - r.atlanan.length} eğitim). Personel belgelerini Sertifikalarım ekranında görür.</div>
            ${r.atlanan.length ? `<div class="msg err" style="margin-top:6px">Excel'de eğitimci adı olmadığı için üretilemedi: ${esc(r.atlanan.join(', '))}. Sertifika Üret ekranından eğitimciyi yazarak üretin.</div>` : ''}
            <div class="actions" style="margin-top:8px"><a class="btn pri" href="#sertifika">Sertifika Üret'e git (yazdırmak için)</a></div>`;
        } catch (er) { sonuc.innerHTML = `<div class="msg err">Veriler kaydedildi, ancak sertifikalar üretilemedi: ${esc(er.message)}. Sertifika Üret ekranındaki listeden üretebilirsiniz.</div>`; }
      };
    } catch (err) { out.innerHTML = `<div class="msg err">${esc(err.message || err)}</div>`; }
  };
};
// Database dosyası olmadan yükleme: isim eşleştirmesi için mevcut personeli parser'a ver
async function mevcutPersonelleEslestir(files) {
  const fake = { names: ['EYLÜL', 'İŞTEN ÇIKIŞ'], rows: n => {
    const hdr = new Array(30).fill(null); hdr[1] = 'SİCİL NO';
    const list = DATA.P.filter(p => n === 'EYLÜL' ? p.durum === 'Etkin' : p.durum === 'Pasif');
    return [hdr, ...list.map(p => { const r = new Array(30).fill(null); r[1] = p.sicil; r[3] = p.ad; r[23] = p.durum; return r; })];
  } };
  const out = IKParser.parse({ ...files, db: fake });
  delete out.personel; delete out.rapor.db_donem;
  return out;
}

// ---------------- ÖZLÜK DOSYASI (yönetici ve personel) ----------------
function kisiView(sic, admin, amir) {
  const geri = admin ? '<a class="back" href="#personel">← Personel listesi</a>' : amir ? '<a class="back" href="#personelim">← Bağlı personel</a>' : '';
  const p = DATA.byS[sic];
  if (!p) return `${geri}<h2>Kayıt bulunamadı</h2><p class="sub">${admin ? esc(sic) + ' sicilli personel verilerde yok.' : 'Özlük bilgileriniz henüz yüklenmemiş. İnsan & Kültür birimine başvurun.'}</p>`;
  const L = p.L, DONEM = DATA.DONEM, ini = p.ad.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('');
  const kv = a => `<dl class="kv">${a.filter(x => x[1] != null && x[1] !== '').map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const recs = (DATA.leaveRecs[sic] || []).slice().reverse();
  const yUse = {}; recs.forEach(r => { const y = (r[0] || '').slice(0, 4); if (y) yUse[y] = (yUse[y] || 0) + (Number(r[2]) || 0); });
  const ys = Object.keys(yUse).sort();
  const hYears = {}; p.H.forEach(h => { const y = String(h[0]).slice(0, 4); hYears[y] = (hYears[y] || 0) + 1; });
  const sOrd = { 'SÜRESİ DOLDU': 0, 'ALINMAMIŞ': 1, 'YAKLAŞIYOR': 2, 'GEÇERLİ': 3, 'ALINDI': 4 };
  const S = p.S.slice().sort((a, b) => sOrd[a[6]] - sOrd[b[6]]);
  const notes = admin ? (DATA.rapor.notlar || []).filter(n => n.startsWith(p.ad + ':')) : [];
  const renk = { GEÇERLİ: 'ok', ALINDI: 'info', YAKLAŞIYOR: 'warn', 'SÜRESİ DOLDU': 'bad', ALINMAMIŞ: 'none' };
  return `${geri}
  <div class="dossier-head"><div class="badge" aria-hidden="true">${esc(ini)}</div><div class="who"><h2>${esc(p.ad)}</h2><div class="sub" style="margin:0">${esc(p.unvan || '—')} · ${esc(p.dep)}${p.bolum && p.bolum !== p.dep ? ' / ' + esc(p.bolum) : ''}</div>
  <div class="tags"><span class="tag">Sicil ${esc(p.sicil)}</span>${pill(p.durum)}${p.by_my ? `<span class="tag">${esc(p.by_my)}</span>` : ''}${p.grade ? `<span class="tag">Grade ${esc(p.grade)}</span>` : ''}${p.calisma_yeri ? `<span class="tag">${esc(p.calisma_yeri)}</span>` : ''}${p.norm ? `<span class="tag">${esc(p.norm)}</span>` : ''}${p.shgm_ek_gorev ? `<span class="tag">SHGM ek görev: ${esc(p.shgm_ek_gorev)}</span>` : ''}</div></div>
  ${admin && ME.profile.role === 'admin' && !ONIZ ? `<div class="actions"><button class="btn" type="button" data-oniz="${esc(p.sicil)}" title="Paneli bu personelin gördüğü şekilde açar; işlem yapılamaz">Personel gözüyle bak</button></div>` : ''}
  ${!admin && !amir ? `<div class="actions"><a class="btn pri" href="#taleplerim">İzin talep et</a><a class="btn" href="#sertifikalarim">Sertifika yükle</a></div>` : ''}</div>
  ${notes.map(n => `<div class="alert">Veri notu: ${esc(n.slice(p.ad.length + 2))}</div>`).join('')}
  ${amir ? '' : '<div id="oz_box" style="margin-bottom:16px"></div>'}
  <div class="grid g2">
    <div class="panel"><h3>Kimlik ve kadro</h3>${kv([
      ['Departman', esc(p.dep)], ['Amiri (izin onayı)', p.amir_sicil && p.amir_sicil !== p.sicil ? `${esc(kisiAd(p.amir_sicil))} <span class="mini">(${esc(p.amir_sicil)})</span>` : (admin ? '<span class="mini">Tanımlı değil · talepler doğrudan İK\'ya gelir</span>' : null)], ['Bölüm / Alt bölüm', esc([p.bolum, p.alt_bolum].filter((x, i, a) => x && a.indexOf(x) === i).join(' / '))], ['Unvan', esc(p.unvan)], ['Pozisyon', p.pozisyon !== p.unvan ? esc(p.pozisyon) : null], ['Şirket', esc(p.sirket)],
      ['TC kimlik no', p.tc_kimlik ? esc(p.tc_kimlik) : null], ['Cinsiyet', esc(p.cinsiyet)], ['Doğum tarihi', p.dogum ? `${fd(p.dogum)} <span class="mini">(${Math.floor(p.yas)} yaş)</span>` : null],
      ['Gruba giriş', p.gruba_giris ? `${fd(p.gruba_giris)} <span class="mini">(${fn(p.kidem, 1)} yıl)</span>` : null], ['Şirkete giriş', p.sirket_giris ? fd(p.sirket_giris) : null],
      ['Çalışan grubu', esc(p.calisan_grubu)], ['Öğrenim', esc(p.ogrenim)], ['Okul', esc(p.okul)], ['Okul bölümü', p.okul_bolum && p.okul_bolum !== '-' ? esc(p.okul_bolum).replace(/\n/g, '<br>') : null],
      ['Telefon', p.gsm ? esc(p.gsm) : null], ['E-posta', p.mail ? esc(p.mail) : null], ['Not', admin ? esc(p.notu) : null], ['İşten çıkış', p.cikis ? `${fd(p.cikis)} · ${esc(p.cikis_nedeni || '')}` : null]])}
      ${!admin && !amir ? '<p class="mini" style="margin-top:12px">Bilgilerinizde hata varsa İnsan &amp; Kültür birimine bildirin.</p>' : ''}</div>
    <div class="panel"><h3>Yıllık izin · ${TODAY.getFullYear()}</h3>${L ? `
      <div class="stats"><div class="stat"><b class="${p.kalan < 0 ? 'neg' : ''}">${fn(p.kalan, 1)}</b><span>Kalan izin</span></div><div class="stat"><b>${fn(p.kul, 1)}</b><span>Kullanılan</span></div><div class="stat"><b class="${L.devreden < 0 ? 'neg' : ''}">${fn(L.devreden, 1)}</b><span>Devreden</span></div><div class="stat"><b>${fn(L.hakedis)}</b><span>Yıllık hakediş</span></div></div>
      ${p.panelGun ? `<p class="mini" style="margin-top:-4px">${AYU[DONEM]} sonu bakiyesinden panelden onaylanan <b>${fn(p.panelGun, 1)} gün</b> düşüldü.</p>` : ''}
      ${kv([['Hakediş tarihi', fd(L.hakedis_tarihi)], ['Yasal asgari', L.yasal_asgari != null ? fn(L.yasal_asgari) + ' gün' : null], ['Yıl sonu tahmini', L.kalan ? `<span class="${L.kalan[11] < 0 ? 'neg' : ''}">${fn(L.kalan[11], 1)} gün</span>` : null], ['Uyarı', L.uyari && admin ? `<span style="color:var(--warn)">${esc(L.uyari)}</span>` : null], ['Not', admin ? esc(L.notu) : null]])}
      <p class="mini" style="margin:12px 0 0;font-weight:600">Aylık kullanım (gün)</p>${vbars(L.kullanim || [], AY, { h: 140, hl: DONEM, fmt: v => fn(v, 1) })}`
      : '<p class="mini">İzin kaydı bulunmuyor.</p>'}</div>
  </div>
  <div class="panel" style="margin-top:16px"><h3>SHGM zorunlu eğitimler</h3>${S.length ? `
    <div class="stats">${ST.map(s => `<div class="stat"><b style="color:var(--${renk[s]})">${p.cnt[s]}</b><span>${s}</span></div>`).join('')}<div class="stat"><b>${pct(p.uyum)}</b><span>Uyum</span></div></div>
    <div class="tbl"><table><thead><tr><th>Kod</th><th>Eğitim</th><th>Son eğitim</th><th>Periyot</th><th>Geçerlilik bitişi</th><th class="n">Kalan gün</th><th>Durum</th></tr></thead><tbody>${S.map(r => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${fd(r[2])}</td><td>${r[3] ? fn(r[3]) + ' yıl' : 'Tek seferlik'}</td><td>${fd(r[4])}</td><td class="n ${r[5] < 0 ? 'neg' : ''}">${r[5] == null ? '—' : fn(r[5])}</td><td>${pill(r[6])}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="mini">Eğitim takip kaydı yok.</p>'}</div>
  <div class="grid g2" style="margin-top:16px">
    <div class="panel"><h3>Eğitim geçmişi · ${p.H.length} kayıt</h3>${p.H.length ? `<p class="mini">${Object.keys(hYears).sort().map(y => `${esc(y)}: ${hYears[y]}`).join(' · ')}</p><div class="tbl" style="max-height:460px"><table><thead><tr><th>Tarih</th><th>Eğitim</th><th class="n">Saat</th><th>Eğitmen</th></tr></thead><tbody>${p.H.map(h => `<tr><td style="white-space:nowrap">${fd(h[0])}</td><td>${esc(h[1])}${h[2] ? `<br><span class="mini">SHGM: ${esc(h[2])}</span>` : ''}</td><td class="n">${h[3] ? fn(h[3], 1) : '—'}</td><td class="mini">${esc(h[4] || '')}${h[5] ? `<br>${esc(h[5])}` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mini">Kayıt yok.</p>'}</div>
    <div class="panel"><h3>İzin geçmişi · ${recs.length} kayıt</h3>${recs.length ? `${vbars(ys.map(y => yUse[y]), ys.map(y => "'" + y.slice(2)), { h: 130, fmt: v => fn(v, 1) })}<div class="tbl" style="max-height:340px;margin-top:8px"><table><thead><tr><th>Başlangıç</th><th>Bitiş</th><th class="n">Gün</th><th>Açıklama</th></tr></thead><tbody>${recs.map(r => `<tr><td>${fd(r[0])}</td><td>${fd(r[1])}</td><td class="n">${fn(r[2], 1)}</td><td class="mini">${r[4] === 'panel' ? '<span class="pill p-onaylandi">Panel</span> ' : ''}${esc(r[3] || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mini">Kayıt yok.</p>'}</div>
  </div>${admin ? foot() : ''}`;
}

function rolSec(sicil, p, h, done) {
  const R = [['personel', 'Personel', 'Yalnızca kendi bilgilerini ve (varsa) bağlı personelini görür.'],
    ['izleyici', 'İzleyici (salt okunur)', 'Yöneticinin gördüğü her şeyi görür; hiçbir şeyi değiştiremez, onay veremez, hesap açamaz.'],
    ['admin', 'Yönetici', 'Tam yetki: onaylar, veri yükleme, hesaplar, sertifika üretimi.']];
  modal(`<h3>Rol değiştir</h3><p>${esc(p ? p.ad : sicil)} · Sicil <b>${esc(sicil)}</b></p><div class="rol-sec">${R.map(([k, t, d]) => `<label><input type="radio" name="rol" value="${k}"${h.role === k ? ' checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}</div><div id="rm"></div>
    <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="rk">Kaydet</button></div>`, (bg, close) => {
    bg.querySelector('#rk').onclick = async () => {
      const rol = bg.querySelector('input[name=rol]:checked').value; if (rol === h.role) { close(); return; }
      const { error } = await sb.rpc('hesap_rol', { p_sicil: sicil, p_rol: rol });
      if (error) { bg.querySelector('#rm').innerHTML = `<div class="msg err">${esc(/function|does not exist|schema cache/i.test(error.message) ? '13_yonetici_erisim.sql dosyasını Supabase SQL Editor\'da çalıştırın.' : error.message)}</div>`; return; }
      close(); done();
    };
  });
}

// ---------------- YÖNETİCİ (AMİR) : BAĞLI PERSONEL ----------------
const BPF = { q: "", dep: "" };
function personelimView(view) {
  const L = DATA.alt.map(s => DATA.byS[s]).filter(Boolean).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const act = L.filter(p => p.durum === 'Etkin');
  const toplam = act.reduce((a, p) => { ST.forEach(s => a[s] = (a[s] || 0) + (p.cnt[s] || 0)); return a; }, {});
  const zor = act.reduce((a, p) => a + p.zor, 0);
  const deps = [...new Set(act.map(p => p.dep))].sort((a, b) => a.localeCompare(b, 'tr'));
  view.innerHTML = `<h2>Bağlı Personel</h2><p class="sub">Size doğrudan ya da dolaylı bağlı personelin özlük, izin ve eğitim bilgileri (Database'deki AMİR SİCİL zincirine göre). Bilgileri görüntüleyebilirsiniz; değişiklik için İnsan &amp; Kültür birimine başvurun.</p>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="panel kpi"><div class="lbl">Bağlı personel</div><div class="val">${act.length}</div><div class="note">${deps.length} departman</div></div>
    <div class="panel kpi"><div class="lbl">Eğitim uyumu</div><div class="val">${pct(zor ? (toplam['GEÇERLİ'] + toplam['ALINDI'] + toplam['YAKLAŞIYOR']) / zor : null)}</div>${zor ? stack(toplam, zor) : ''}</div>
    <div class="panel kpi"><div class="lbl">Süresi dolan eğitim</div><div class="val" style="color:var(--bad)">${toplam['SÜRESİ DOLDU'] || 0}</div><div class="note">${toplam['YAKLAŞIYOR'] || 0} eğitimin süresi yaklaşıyor</div></div>
    <div class="panel kpi"><div class="lbl">Toplam kalan izin</div><div class="val">${fn(act.reduce((a, p) => a + (Number(p.kalan) || 0), 0))}<small> gün</small></div><div class="note">Kişi başı ${fn(act.length ? act.reduce((a, p) => a + (Number(p.kalan) || 0), 0) / act.length : 0, 1)} gün</div></div>
  </div>
  <div class="filters"><input type="search" id="pq" placeholder="Ad, sicil veya unvan…" value="${esc(BPF.q)}" style="flex:1 1 220px">
    <select id="pd"><option value="">Tüm departmanlar</option>${deps.map(d => `<option${BPF.dep === d ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select>
    <button class="btn sm" id="pcsv">CSV indir</button><span class="count" id="pc"></span></div>
  <div class="tbl"><table><thead><tr><th>Ad Soyad</th><th>Departman</th><th>Amiri</th><th class="n">Kalan izin</th><th>Eğitim durumu</th><th class="n">Süresi dolan</th></tr></thead><tbody id="ptb"></tbody></table></div>`;
  const f = () => act.filter(p => (!BPF.dep || p.dep === BPF.dep) && (!BPF.q || p.fx.includes(fold(BPF.q))));
  const ciz = () => { const R = f(); $('pc').textContent = R.length + ' kişi';
    $('ptb').innerHTML = R.map(p => `<tr data-p="${esc(p.sicil)}" tabindex="0" style="cursor:pointer"><td><b>${esc(p.ad)}</b><br><span class="mini">${esc(p.unvan || '')} · ${esc(p.sicil)}</span></td><td>${esc(p.dep)}</td>
      <td>${p.amir_sicil ? esc(kisiAd(p.amir_sicil)) : '—'}</td><td class="n ${p.kalan < 0 ? 'neg' : ''}">${fn(p.kalan, 1)}</td>
      <td style="min-width:150px">${p.zor ? `${pct(p.uyum)}${stack(p.cnt, p.zor)}` : '<span class="mini">Kayıt yok</span>'}</td><td class="n">${p.cnt['SÜRESİ DOLDU'] ? `<span class="pill p-SÜRESİ">${p.cnt['SÜRESİ DOLDU']}</span>` : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="mini">Kayıt yok.</td></tr>'; };
  $('pq').oninput = e => { BPF.q = e.target.value; ciz(); }; $('pd').onchange = e => { BPF.dep = e.target.value; ciz(); };
  $('pcsv').onclick = () => csvIndir('bagli-personel.csv', [['Ad Soyad', 'Sicil', 'Unvan', 'Departman', 'Amiri', 'Kalan izin', 'Eğitim uyumu', 'Süresi dolan', 'Yaklaşan'],
    ...f().map(p => [p.ad, p.sicil, p.unvan || '', p.dep, p.amir_sicil ? kisiAd(p.amir_sicil) : '', String(p.kalan ?? '').replace('.', ','), p.uyum == null ? '' : Math.round(p.uyum * 100) + '%', p.cnt['SÜRESİ DOLDU'] || 0, p.cnt['YAKLAŞIYOR'] || 0])]);
  ciz();
}

// ---------------- PERSONEL: İZİN TALEPLERİ ----------------
async function taleplerimView(view) {
  const p = DATA.byS[ME.profile.sicil];
  const am = p && amirOf(p.sicil);
  view.innerHTML = `<h2>İzin Taleplerim</h2><p class="sub">${am ? 'Talebiniz önce amirinize, ardından İnsan &amp; Kültür birimine gider.' : 'Talebiniz İnsan &amp; Kültür birimine gider.'} Onaylanınca kalan izninizden düşer.</p>
  <div class="grid g2"><div class="panel"><h3>Yeni talep</h3>
    ${p && p.kalan != null ? `<p class="mini" style="margin-top:-4px">Kalan izniniz: <b>${fn(p.kalan, 1)} gün</b><span id="tbek"></span></p>` : ''}
    <form class="form" id="tf"><div class="row2"><label>Başlangıç<input type="date" id="tb" required min="${ISO_TODAY}"></label><label>Bitiş<input type="date" id="te" required min="${ISO_TODAY}"></label></div>
    <div class="row2"><label>Gün (iş günü)<input type="number" id="tg" step="0.5" min="0.5" max="60" required></label><label>Tür<select id="tt"><option>Yıllık izin</option><option>Mazeret izni</option><option>Ücretsiz izin</option><option>Diğer</option></select></label></div>
    <label>Açıklama (isteğe bağlı)<textarea id="ta" maxlength="500"></textarea></label><div id="tm"></div>
    <div class="actions"><button class="btn pri" type="submit">Talebi gönder</button></div></form></div>
  <div class="panel"><h3>Taleplerim</h3><div id="tl" class="loading">Yükleniyor…</div></div></div>`;
  const tb = $('tb'), te = $('te'), tg = $('tg');
  const oner = () => { if (tb.value && te.value && !tg.dataset.el) { tg.value = gunSay(tb.value, te.value) || ''; } if (tb.value) te.min = tb.value; };
  tb.onchange = oner; te.onchange = oner; tg.oninput = () => tg.dataset.el = '1';
  $('tf').onsubmit = async e => {
    e.preventDefault();
    const m = $('tm');
    if (te.value < tb.value) { m.innerHTML = '<div class="msg err">Bitiş tarihi başlangıçtan önce olamaz.</div>'; return; }
    const { error } = await sb.from('izin_talep').insert({ baslangic: tb.value, bitis: te.value, gun: Number(tg.value), tur: $('tt').value, aciklama: $('ta').value.trim() || null });
    if (error) { m.innerHTML = `<div class="msg err">Gönderilemedi: ${esc(error.message)}</div>`; return; }
    m.innerHTML = '<div class="msg ok">Talebiniz iletildi.</div>'; e.target.reset(); delete tg.dataset.el; liste();
  };
  const liste = async () => {
    const { data, error } = await sb.from('izin_talep').select('*').eq('sicil', ME.profile.sicil).order('created_at', { ascending: false });
    const box = $('tl'); box.className = '';
    if (error) { box.innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
    const bek = data.filter(t => t.durum === 'bekliyor' || t.durum === 'sef_onayladi').reduce((a, t) => a + Number(t.gun), 0);
    const tb2 = $('tbek'); if (tb2) tb2.innerHTML = bek ? ` · onay bekleyen talepleriniz: ${fn(bek, 1)} gün` : '';
    box.innerHTML = data.length ? `<div class="list">${data.map(t => `<div class="row" style="cursor:default"><span class="nm">${fd(t.baslangic)} – ${fd(t.bitis)} · ${fn(t.gun, 1)} gün<br><span class="mini">${esc(t.tur)}${t.aciklama ? ' · ' + esc(t.aciklama) : ''}${t.sef_notu ? `<br>Şef notu: ${esc(t.sef_notu)}` : ''}${t.admin_notu ? `<br>İK notu: ${esc(t.admin_notu)}` : ''}</span></span><span class="meta">${tpillT(t)}${t.durum === 'bekliyor' ? `<br><button class="btn sm" data-iptal="${t.id}" style="margin-top:4px">İptal et</button>` : ''}</span></div>`).join('')}</div>` : '<p class="mini">Henüz talebiniz yok.</p>';
    box.querySelectorAll('[data-iptal]').forEach(b => b.onclick = async () => { b.disabled = true; const { error: er } = await sb.rpc('izin_talep_iptal', { p_id: +b.dataset.iptal }); if (er) alertMsg(er.message); liste(); });
  };
  liste();
}

// ---------------- ŞEF: EKİBİM ----------------
const ekipKalan = e => e.kalan && e.donem ? Number(e.kalan[e.donem - 1]) - Number(e.panel_gun || 0) : null;
async function ekipBekleyenSay() {
  const ids = DATA.ekip.map(e => e.sicil);
  const { data } = await sb.from('izin_talep').select('id').in('sicil', ids).eq('durum', 'bekliyor');
  const el = $('ecount2'); if (el) el.innerHTML = data && data.length ? `<span class="pill p-bekliyor">${data.length}</span>` : '';
}
async function ekibimView(view) {
  const E = DATA.ekip, ids = E.map(e => e.sicil), byE = Object.fromEntries(E.map(e => [e.sicil, e]));
  view.innerHTML = `<h2>Ekibim</h2><p class="sub">Size bağlı ${E.length} personelin izin talepleri. Onayladığınız talep son onay için İnsan &amp; Kültür'e gider.</p><div id="ekbox" class="loading">Yükleniyor…</div>`;
  const bas = new Date(TODAY); bas.setDate(bas.getDate() - 7);
  const bit = new Date(TODAY); bit.setDate(bit.getDate() + 120);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [tq, iq] = await Promise.all([
    sb.from('izin_talep').select('*').in('sicil', ids).order('created_at', { ascending: false }).limit(300),
    sb.rpc('ekip_izinleri', { p_bas: iso(bas), p_bit: iso(bit) })]);
  const box = $('ekbox'); box.className = '';
  if (tq.error) { box.innerHTML = `<div class="msg err">${esc(tq.error.message)}</div>`; return; }
  const T = tq.data, IZ = iq.data || [];
  const bekleyen = T.filter(t => t.durum === 'bekliyor');
  const karar = T.filter(t => t.durum !== 'bekliyor').slice(0, 40);
  const cakisan = t => IZ.filter(z => z.sicil !== t.sicil && z.baslangic <= t.bitis && (z.bitis || z.baslangic) >= t.baslangic);
  const digerBek = t => T.filter(x => x.sicil === t.sicil && x.id !== t.id && (x.durum === 'bekliyor' || x.durum === 'sef_onayladi')).reduce((a, x) => a + Number(x.gun), 0);
  const kart = t => {
    const e = byE[t.sicil] || {}, k = ekipKalan(e), kul = k == null ? null : k - digerBek(t), c = cakisan(t);
    return `<div class="panel" data-id="${t.id}" style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b style="font-size:17px">${esc(e.ad || t.sicil)}</b><br><span class="mini">${esc(e.unvan || '')} · ${esc(t.sicil)} · talep ${fdt(t.created_at)}</span></div>
        <div style="text-align:right"><b style="font-family:var(--display);font-size:24px">${fn(t.gun, 1)} gün</b><br><span class="mini">${fd(t.baslangic)} – ${fd(t.bitis)}</span></div></div>
      <div class="mini">${esc(t.tur)}${t.aciklama ? ' · ' + esc(t.aciklama) : ''}</div>
      <div class="mini">Kullanılabilir izni: <b class="${kul != null && kul < t.gun ? 'neg' : ''}" style="color:var(--fg)">${fn(kul, 1)} gün</b>${kul != null && kul < t.gun ? ' · talep bakiyeden fazla' : ''}</div>
      <div class="mini">${c.length ? `<span style="color:var(--warn);font-weight:600">Aynı tarihlerde izinde:</span> ${c.map(z => `${esc(z.ad)} (${fd(z.baslangic)}–${fd(z.bitis)}${z.durum !== 'onaylandi' ? ', talep' : ''})`).join(', ')}` : 'Bu tarihlerde ekipten başka izinli yok.'}</div>
      <div class="actions"><button class="btn sm ok" data-sk="1">Onayla</button><button class="btn sm bad" data-sk="0">Reddet</button></div></div>`;
  };
  // ekip izin takvimi: önümüzdeki 120 gün
  const yakin = IZ.filter(z => (z.bitis || z.baslangic) >= ISO_TODAY).slice(0, 40);
  box.innerHTML = `<h3>Onayınızı bekleyen · ${bekleyen.length}</h3>
    ${bekleyen.length ? `<div class="grid g2" style="margin-bottom:22px">${bekleyen.map(kart).join('')}</div>` : '<div class="panel" style="margin-bottom:22px"><p class="mini">Onayınızı bekleyen talep yok.</p></div>'}
    <div class="grid g2">
      <div class="panel"><h3>Ekip izin takvimi</h3>${yakin.length ? `<div class="list">${yakin.map(z => `<div class="row" style="cursor:default"><span class="nm">${esc(z.ad)}</span><span class="meta">${fd(z.baslangic)} – ${fd(z.bitis)} · ${fn(z.gun, 1)} gün<br>${z.durum === 'onaylandi' ? '<span class="pill p-onaylandi">Onaylı</span>' : tpillT(z)}</span></div>`).join('')}</div>` : '<p class="mini">Önümüzdeki dönemde planlı izin yok.</p>'}</div>
      <div class="panel"><h3>Ekibim · kalan izinler</h3><div class="tbl"><table><thead><tr><th>Ad Soyad</th><th>Unvan</th><th class="n">Kalan</th><th>Hakediş</th></tr></thead><tbody>${E.map(e => { const k = ekipKalan(e); return `<tr><td><b>${esc(e.ad)}</b></td><td class="mini">${esc(e.unvan || '')}</td><td class="n ${k < 0 ? 'neg' : ''}">${fn(k, 1)}</td><td class="mini">${fd(e.hakedis_tarihi)}</td></tr>`; }).join('')}</tbody></table></div></div>
    </div>
    <div class="panel" style="margin-top:16px"><h3>Son kararlar</h3>${karar.length ? `<div class="tbl"><table><thead><tr><th>Personel</th><th>Tarih</th><th class="n">Gün</th><th>Durum</th><th>Not</th></tr></thead><tbody>${karar.map(t => `<tr><td>${esc((byE[t.sicil] || {}).ad || t.sicil)}</td><td style="white-space:nowrap">${fd(t.baslangic)} – ${fd(t.bitis)}</td><td class="n">${fn(t.gun, 1)}</td><td>${tpillT(t)}</td><td class="mini">${esc(t.sef_notu || '')}${t.admin_notu ? `<br>İK: ${esc(t.admin_notu)}` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mini">Henüz karar verilmiş talep yok.</p>'}</div>`;
  box.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => {
    const id = +b.closest('[data-id]').dataset.id, onay = b.dataset.sk === '1';
    modal(`<h3>${onay ? 'Talebi onayla' : 'Talebi reddet'}</h3><form class="form" id="skf"><label>${onay ? 'Not (isteğe bağlı)' : 'Ret nedeni'}<textarea id="skn" maxlength="300" ${onay ? '' : 'required'}></textarea></label>
      <p class="mini" style="margin:0">${onay ? 'Onayınızdan sonra talep İnsan &amp; Kültür\'ün son onayına gider.' : 'Personel ret nedenini kendi ekranında görür.'}</p>
      <div class="acts"><button type="button" class="btn" data-close>Vazgeç</button><button class="btn pri" type="submit">${onay ? 'Onayla' : 'Reddet'}</button></div></form>`, (bg, close) => {
      bg.querySelector('#skf').onsubmit = async e => {
        e.preventDefault();
        const { error } = await sb.rpc('sef_karar', { p_id: id, p_onay: onay, p_not: bg.querySelector('#skn').value.trim() || null });
        close(); if (error) alertMsg(error.message);
        ekibimView(view); ekipBekleyenSay(); if (ME.profile.role === 'admin') bekleyenSay();
      };
    });
  });
}

// Belgeyi ekranda gösterir (A4 yatay sayfa, ekrana sığacak kadar küçültülmüş)
function belgeGoster(b) {
  const isg = b.sablon === 'isg', w = Math.max(280, Math.min(window.innerWidth - 80, 1000, (window.innerHeight - 170) * 297 / (isg ? 420 : 210))), k = w / (297 * 3.7795);
  modal(`<div class="sert-onizleme" style="padding:8px;max-height:calc(100vh - 150px)"><div style="width:${(297 * 3.7795 * k).toFixed(0)}px;height:${((isg ? 420 : 210) * 3.7795 * k).toFixed(0)}px;overflow:hidden"><div class="olcek" style="transform:scale(${k.toFixed(4)});width:297mm">${Sertifika.sayfalar(b)}</div></div></div>
    <div class="acts"><button class="btn" data-close>Kapat</button><button class="btn pri" id="bg_yaz">Yazdır / PDF</button></div>`, (bg, close) => {
    bg.querySelector('.modal').style.maxWidth = (w + 60) + 'px';
    bg.querySelector('#bg_yaz').onclick = () => { close(); Sertifika.yazdir([b]); };
  });
}

// ---------------- MÜDÜR: BİLGİ (şeflerine bağlı ekiplerin izinleri, salt okunur) ----------------
async function bilgiSay() {
  const { data } = await sb.from('izin_talep').select('id').in('sicil', DATA.bilgi.map(e => e.sicil)).in('durum', ['bekliyor', 'sef_onayladi']);
  const el = $('bcount'); if (el) el.innerHTML = data && data.length ? `<span class="pill p-sef_onayladi">${data.length}</span>` : '';
}
const BF = { st: 'suren' };
async function bilgiView(view) {
  const E = DATA.bilgi, byE = Object.fromEntries(E.map(e => [e.sicil, e]));
  const sefler = [...new Set(E.map(e => e.sef_ad))];
  view.innerHTML = `<h2>Bilgi</h2><p class="sub">${esc(sefler.join(', '))} ekiplerindeki ${E.length} personelin izin talepleri. Talepleri şefleri onaylar; burada yalnızca bilgi amaçlı görürsünüz.</p>
    <div class="filters"><div class="seg" id="bst">${[['suren', 'Süren talepler'], ['yakin', 'Önümüzdeki izinler'], ['tum', 'Tümü']].map(([v, t]) => `<button type="button" data-v="${v}" class="${BF.st === v ? 'on' : ''}">${t}</button>`).join('')}</div><span class="count" id="bsay"></span></div>
    <div id="bbox" class="loading">Yükleniyor…</div>`;
  view.querySelectorAll('#bst button').forEach(b => b.onclick = () => { BF.st = b.dataset.v; bilgiView(view); });
  const { data, error } = await sb.from('izin_talep').select('*').in('sicil', E.map(e => e.sicil)).order('baslangic', { ascending: BF.st === 'yakin' }).limit(400);
  const box = $('bbox'); box.className = '';
  if (error) { box.innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
  let L = data;
  if (BF.st === 'suren') L = L.filter(t => t.durum === 'bekliyor' || t.durum === 'sef_onayladi');
  if (BF.st === 'yakin') L = L.filter(t => t.bitis >= ISO_TODAY && t.durum !== 'reddedildi' && t.durum !== 'iptal');
  $('bsay').textContent = L.length + ' talep';
  box.innerHTML = L.length ? `<div class="tbl"><table><thead><tr><th>Personel</th><th>Şef</th><th>Tarih</th><th class="n">Gün</th><th>Tür / Açıklama</th><th>Durum</th></tr></thead><tbody>${L.map(t => { const e = byE[t.sicil] || {}; return `<tr>
      <td><b>${esc(e.ad || t.sicil)}</b><br><span class="mini">${esc(e.unvan || '')} · talep ${fdt(t.created_at)}</span></td>
      <td>${esc(e.sef_ad || '')}${t.sef_karar_tarihi ? `<br><span class="mini">karar ${fdt(t.sef_karar_tarihi)}${t.sef_notu ? ' · “' + esc(t.sef_notu) + '”' : ''}</span>` : ''}</td>
      <td style="white-space:nowrap">${fd(t.baslangic)} – ${fd(t.bitis)}</td><td class="n"><b>${fn(t.gun, 1)}</b></td>
      <td>${esc(t.tur)}${t.aciklama ? `<br><span class="mini">${esc(t.aciklama)}</span>` : ''}</td><td>${tpillT(t)}${t.admin_notu ? `<br><span class="mini">İK: ${esc(t.admin_notu)}</span>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`
    : '<div class="panel"><p class="mini">Bu görünümde talep yok.</p></div>';
}

// ---------------- PERSONEL: SERTİFİKALAR ----------------
async function sertifikalarimView(view) {
  view.innerHTML = `<h2>Sertifikalarım</h2><p class="sub">Adınıza düzenlenen belgeleri buradan yazdırabilir veya PDF olarak kaydedebilirsiniz. Dışarıda aldığınız bir eğitimin belgesini de aşağıdan yükleyebilirsiniz.</p>
  <div class="panel" style="margin-bottom:16px"><h3>Adıma düzenlenen belgeler</h3><div id="sb_list" class="loading">Yükleniyor…</div></div>
  <div class="grid g2"><div class="panel"><h3>Belge yükle</h3><form class="form" id="sf2">
    <label>Eğitimin adı<input id="se" maxlength="200" required></label>
    <div class="row2"><label>Eğitim tarihi<input type="date" id="st" max="${ISO_TODAY}" required></label><label>Süre (saat)<input type="number" id="ss" step="0.5" min="0" max="500"></label></div>
    <label>Veren kurum / eğitmen<input id="sk" maxlength="200"></label>
    <label>Belge<input type="file" id="sd" accept="application/pdf,image/jpeg,image/png" required></label><div id="sm2"></div>
    <div class="actions"><button class="btn pri" type="submit" id="sbtn">Yükle</button></div></form></div>
  <div class="panel"><h3>Yüklediklerim</h3><div id="sl" class="loading">Yükleniyor…</div></div></div>`;
  $('sf2').onsubmit = async e => {
    e.preventDefault();
    const m = $('sm2'), f = $('sd').files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { m.innerHTML = '<div class="msg err">Dosya 10 MB\'tan büyük olamaz.</div>'; return; }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) { m.innerHTML = '<div class="msg err">Yalnızca PDF, JPG veya PNG yükleyebilirsiniz.</div>'; return; }
    $('sbtn').disabled = true; m.innerHTML = '<div class="msg info">Yükleniyor…</div>';
    const ext = f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : 'jpg';
    const path = `${ME.profile.sicil}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await sb.storage.from('sertifikalar').upload(path, f, { contentType: f.type, upsert: false });
    if (up.error) { m.innerHTML = `<div class="msg err">Dosya yüklenemedi: ${esc(up.error.message)}</div>`; $('sbtn').disabled = false; return; }
    const { error } = await sb.from('sertifika').insert({ egitim_adi: $('se').value.trim(), tarih: $('st').value, saat: $('ss').value ? Number($('ss').value) : null, kurum: $('sk').value.trim() || null, dosya_yolu: path, dosya_adi: f.name.slice(0, 200) });
    $('sbtn').disabled = false;
    if (error) { m.innerHTML = `<div class="msg err">Kaydedilemedi: ${esc(error.message)}</div>`; return; }
    m.innerHTML = '<div class="msg ok">Belgeniz iletildi.</div>'; e.target.reset(); liste();
  };
  (async () => {
    const box = $('sb_list'); let r;
    try { r = await sb.from('sertifika_belge').select('*').eq('sicil', ME.profile.sicil).eq('iptal', false).order('tarih', { ascending: false }); } catch (e) { r = { error: e }; }
    box.className = '';
    if (r.error) { box.innerHTML = '<p class="mini">Belgeler şu anda listelenemiyor.</p>'; return; }
    const L = r.data || [];
    box.innerHTML = L.length ? `<p class="mini" style="margin-top:-4px">Yazdır'a basınca açılan pencerede yazıcı olarak <b>PDF olarak kaydet</b>'i seçerseniz belge PDF dosyası olarak iner.</p><div class="list">${L.map(b => `<div class="row" style="cursor:default"><span class="nm">${esc(b.egitim)}<br><span class="mini">${b.seri_no ? `Belge No ${esc(b.seri_no)} · ` : ''}${fd(b.tarih)}${b.saat ? ' · ' + fn(b.saat, 1) + ' saat' : ''}</span></span><span class="meta"><div class="actions" style="justify-content:flex-end"><button class="btn sm" data-gb="${b.id}">Görüntüle</button><button class="btn sm pri" data-yb="${b.id}">Yazdır / PDF</button></div></span></div>`).join('')}</div>${Sertifika.imzaSayisi() ? '' : '<p class="mini" style="margin-top:8px">Belgeleriniz imzasız gösterilir; imzalı aslı için İnsan &amp; Kültür birimine başvurabilirsiniz.</p>'}` : '<p class="mini">Adınıza düzenlenmiş belge bulunmuyor.</p>';
    box.querySelectorAll('[data-yb]').forEach(x => x.onclick = () => Sertifika.yazdir([L.find(b => b.id === +x.dataset.yb)]));
    box.querySelectorAll('[data-gb]').forEach(x => x.onclick = () => belgeGoster(L.find(b => b.id === +x.dataset.gb)));
  })();
  const liste = async () => {
    const { data, error } = await sb.from('sertifika').select('*').eq('sicil', ME.profile.sicil).order('created_at', { ascending: false });
    const box = $('sl'); box.className = '';
    if (error) { box.innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
    box.innerHTML = data.length ? `<div class="list">${data.map(t => `<div class="row" style="cursor:default"><span class="nm">${esc(t.egitim_adi)}<br><span class="mini">${fd(t.tarih)}${t.saat ? ' · ' + fn(t.saat, 1) + ' saat' : ''}${t.kurum ? ' · ' + esc(t.kurum) : ''}${t.admin_notu ? `<br>İK notu: ${esc(t.admin_notu)}` : ''}</span></span><span class="meta">${tpill(t.durum)}<br><button class="btn sm" data-belge="${esc(t.dosya_yolu)}" style="margin-top:4px">Belgeyi aç</button></span></div>`).join('')}</div>` : '<p class="mini">Henüz belge yüklemediniz.</p>';
    box.querySelectorAll('[data-belge]').forEach(b => b.onclick = async () => { const { data: u, error: er } = await sb.storage.from('sertifikalar').createSignedUrl(b.dataset.belge, 120); if (er) { alertMsg(er.message); return; } window.open(u.signedUrl, '_blank', 'noopener'); });
  };
  liste();
}

start().catch(e => { app.innerHTML = `<div class="login"><div class="login-card"><h2>Bir hata oluştu</h2><p class="sub">${esc(e.message || e)}</p><button class="btn pri" onclick="location.reload()">Yenile</button></div></div>`; });
