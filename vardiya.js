/* Zafer İK · Vardiya planı ve fazla mesai
   Hesap, "Fazla Mesai Hesaplama" Excel dosyasıyla birebir aynı kurallara göre yapılır:
   · Hücre: "10.00-21.00" (giriş-çıkış), "11" (net saat, gündüz sayılır), HT / Yİ / R / boş = çalışılmadı
   · Mola: vardiya > 7,5 saat → 1 saat, > 4 saat → 0,5 saat, aksi hâlde 0,25 saat (ayardan kapatılabilir)
   · Gece: vardiyanın yarısından fazlası gece döneminde (20:00–06:00) ise gece vardiyası; bittiği güne yazılır
   · Günlük fazla mesai: net süre, gündüz 11 / gece 7,5 saati aşarsa. Önceki çıkıştan sonra 11 saat dolmadan
     başlayan vardiya aynı iş gününe eklenir.
   · Haftalık fazla mesai: sınır içi saatlerin Pzt–Paz toplamı 45 saati aşan kısmı (pazar gecesi vardiyası
     iki haftaya saatine göre bölünür). Aynı saat iki kez sayılmaz. */
'use strict';
const VR_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const VR_VARSAYILAN = { haftalik: 45, gunduz: 11, gece: 7.5, gece_siniri: true, mola: true, gece_bas: '20:00', gece_bit: '06:00', gece_gun: 'bitis', dinlenme: 11, kaliplar: [] };
const VR_IZINLI = ['HT', 'Yİ', 'R', 'İ', 'Üİ', 'MR'];
let VR = null;   // planlayıcı durumu

// ---------- hesap motoru ----------
function vrSaat(t) {   // "10.30" / "10:30" / "10,30" / "10" / "24" → saat (ondalık) ya da null
  t = String(t || '').trim().replace(/[.,]/g, ':');
  if (!t) return null;
  let h, m = 0;
  if (t.includes(':')) { const p = t.split(':'); if (p.length !== 2 || !/^\d{1,2}$/.test(p[0]) || !/^\d{1,2}$/.test(p[1])) return null; h = +p[0]; m = +p[1]; }
  else { if (!/^\d{1,2}$/.test(t)) return null; h = +t; }
  if (h === 24 && m === 0) h = 0;
  if (h > 23 || m > 59) return null;
  return h + m / 60;
}
function vrCoz(v) {   // hücre değeri → { tur: 'bos' | 'net' | 'vardiya' | 'hata', bas, sure, net }
  const s = String(v ?? '').trim();
  if (!s) return { tur: 'bos' };
  if (/^\d+([.,]\d+)?$/.test(s)) { const n = Number(s.replace(',', '.')); return n > 0 && n <= 24 ? { tur: 'net', net: n } : { tur: 'hata' }; }
  if (!s.includes('-')) return { tur: 'bos', etiket: s };
  const i = s.indexOf('-'), a = vrSaat(s.slice(0, i)), b = vrSaat(s.slice(i + 1));
  if (a == null || b == null) return { tur: 'hata' };
  let sure = ((b - a - 1 / 60) % 24 + 24) % 24 + 1 / 60;   // Excel: MOD(çıkış-giriş-1dk;1)*24+1dk → aynı saat = 24 saat
  sure = Math.round(sure * 10000) / 10000;
  return { tur: 'vardiya', bas: Math.round(a * 10000) / 10000, sure };
}
const vrSaatSayi = t => { const x = vrSaat(t); return x == null ? 0 : x; };

/* degerler: ayın günleri kadar hücre değeri; ayBas: Date (ayın 1'i) → her gün için sonuç + toplamlar */
function vrHesap(degerler, ayar, ayBas) {
  const A = { ...VR_VARSAYILAN, ...(ayar || {}) };
  const gb = vrSaatSayi(A.gece_bas), ge = vrSaatSayi(A.gece_bit);
  const wd = (ayBas.getDay() + 6) % 7;            // pazartesi = 0
  const hBas = -wd;                                // 1. haftanın pazartesisi (ayın 1'ine göre gün)
  const haftaNo = g => Math.min(6, Math.max(1, Math.floor((g - hBas) / 7) + 1));
  const G = []; let sonE = null, sonCum = null;
  const T = { gun: 0, gece: 0, hs: 0, net: 0, gfm: 0, hafta: [0, 0, 0, 0, 0, 0], hata: 0, dinlenme: 0 };
  degerler.forEach((v, d) => {
    const c = vrCoz(v), r = { ...c, gece: false, gfm: 0, kap: 0, bosluk: null };
    if (c.tur === 'net' || c.tur === 'vardiya') {
      let net = c.net;
      if (c.tur === 'vardiya') {
        net = Math.round((c.sure - (A.mola ? (c.sure > 7.5 ? 1 : c.sure > 4 ? 0.5 : 0.25) : 0)) * 100) / 100;
        const bit = c.bas + c.sure; let ort = 0;
        [[gb - 24, ge], [gb, 24 + ge], [24 + gb, 48 + ge]].forEach(([x, y]) => { ort += Math.max(0, Math.min(bit, y) - Math.max(c.bas, x)); });
        r.gece = ort > c.sure / 2;
        const absS = d * 24 + c.bas - (A.gece_gun === 'bitis' && c.bas + c.sure > 24.01 ? 24 : 0), absE = absS + c.sure;
        r.absS = absS; r.absE = absE;
        if (sonE != null) r.bosluk = Math.round((absS - sonE) * 100) / 100;
        sonE = absE;
      }
      r.net = net;
      const bitis = r.bosluk != null && r.bosluk < A.dinlenme;
      const cum = net + (bitis && sonCum != null ? sonCum : 0);
      sonCum = cum; r.cum = cum;
      const lim = A.gece_siniri && r.gece ? A.gece : A.gunduz;
      r.gfm = Math.max(0, cum - lim) - Math.max(0, cum - net - lim);
      r.kap = net - r.gfm;
      // hafta dağılımı
      if (c.tur === 'vardiya') {
        const gS = Math.floor(r.absS / 24), gE = Math.floor((r.absE - 1 / 60) / 24);
        const wA = haftaNo(gS), wB = haftaNo(gE);
        let pay = 1;
        if (wA !== wB) { const sinir = (hBas + 7 * (Math.floor((gS - hBas) / 7) + 1)) * 24; pay = Math.max(0, Math.min(1, (sinir - r.absS) / (r.absE - r.absS))); }
        T.hafta[wA - 1] += r.kap * pay; T.hafta[wB - 1] += r.kap * (1 - pay);
      } else T.hafta[haftaNo(d) - 1] += r.kap;
      if (net > 0) { T.gun++; if ((wd + d) % 7 >= 5) T.hs++; }
      if (r.gece) T.gece++;
      T.net += net; T.gfm += r.gfm;
      if (r.bosluk != null && r.bosluk < A.dinlenme) T.dinlenme++;
    } else if (c.tur === 'hata') T.hata++;
    G.push(r);
  });
  T.hfm = T.hafta.reduce((a, h) => a + Math.max(0, h - A.haftalik), 0);
  T.fm = T.gfm + T.hfm;
  ['net', 'gfm', 'hfm', 'fm'].forEach(k => T[k] = Math.round(T[k] * 100) / 100);
  T.hafta = T.hafta.map(h => Math.round(h * 100) / 100);
  return { G, T };
}

// ---------- yardımcılar ----------
const vrAyBas = ay => { const [y, m] = ay.split('-').map(Number); return new Date(y, m - 1, 1); };
const vrGunSay = ay => { const [y, m] = ay.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const vrIso = (ay, d) => `${ay}-${String(d + 1).padStart(2, '0')}`;
const vrSa = n => n ? fn(n, 2) : '';
function vrHaftaAralik(ay) {   // hafta sütun başlıkları ("01.12-07.12")
  const b = vrAyBas(ay), n = vrGunSay(ay), wd = (b.getDay() + 6) % 7, out = [];
  for (let d = 0; d < n; d++) { const w = Math.min(6, Math.floor((d + wd) / 7) + 1); (out[w - 1] = out[w - 1] || []).push(d + 1); }
  const mm = ay.slice(5, 7);
  return out.map(a => a ? `${String(a[0]).padStart(2, '0')}.${mm}–${String(a[a.length - 1]).padStart(2, '0')}.${mm}` : '');
}
function vrHucreSinif(r) {
  if (!r || r.tur === 'bos') return r && r.etiket ? 'v-izin' : '';
  if (r.tur === 'hata') return 'v-hata';
  return [r.gece ? 'v-gece' : 'v-gun', r.gfm > 0 ? 'v-fm' : '', r.bosluk != null && r.bosluk < (VR ? VR.ayar.dinlenme : 11) ? 'v-dinlenme' : ''].join(' ');
}
function vrIzinGunleri(sicil, ay) {   // panelde kayıtlı yıllık izin günleri (yalnızca yönetici verisinde var)
  const S = new Set(), recs = (DATA.leaveRecs || {})[sicil] || [], n = vrGunSay(ay);
  for (let d = 0; d < n; d++) { const t = vrIso(ay, d); if (recs.some(r => r[0] && r[0] <= t && (r[1] || r[0]) >= t)) S.add(d); }
  return S;
}

// ---------- planlayıcı (İK, izleyici, birim vardiya sorumlusu) ----------
async function vardiyaView(view) {
  const B = (DATA.vBirim || []).filter(b => GOREN() || (b.sorumlu || []).includes(ME.profile.sicil));
  if (!B.length) { view.innerHTML = `<h2>Vardiya Planı</h2>${bos('izin', 'Vardiya modülü henüz kurulmadı', 'Supabase\'de 16_vardiya.sql dosyası çalıştırılınca birimler burada görünür.')}`; return; }
  const sonraAy = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1);
  if (!VR || !B.some(b => b.kod === VR.birim)) VR = { birim: B[0].kod, ay: `${sonraAy.getFullYear()}-${String(sonraAy.getMonth() + 1).padStart(2, '0')}`, boya: null };
  const yaz = !SALT() && !ONIZ;
  view.innerHTML = `<h2>Vardiya Planı</h2><p class="sub">Vardiyaları girin; çalışma süresi ve fazla mesai Fazla Mesai Hesaplama tablosundaki kurallarla anında hesaplanır. Plan <b>yayınlanınca</b> personel kendi vardiyasını görür.</p>
  <div class="v-ust">
    <div class="seg" id="v_birim">${B.map(b => `<button type="button" data-v="${b.kod}">${esc(b.ad)}</button>`).join('')}</div>
    <label class="v-ay"><span class="mini">Ay</span><input type="month" id="v_ay" value="${VR.ay}"></label>
    ${ME.profile.role === 'admin' && !ONIZ ? '<button type="button" class="btn" id="v_ayar">Kurallar ve sorumlular</button>' : ''}
  </div>
  <div id="v_govde" class="loading">Yükleniyor…</div>`;
  view.querySelectorAll('#v_birim button').forEach(b => { b.classList.toggle('on', b.dataset.v === VR.birim); b.onclick = () => vrDegis(() => { VR.birim = b.dataset.v; vardiyaView(view); }); });
  $('v_ay').onchange = e => { const v = e.target.value; if (!v) return; vrDegis(() => { VR.ay = v; vardiyaView(view); }, () => { e.target.value = VR.ay; }); };
  if ($('v_ayar')) $('v_ayar').onclick = () => vrAyarModal(B.find(b => b.kod === VR.birim), () => vardiyaView(view));
  const bir = B.find(b => b.kod === VR.birim);
  VR.ayar = { ...VR_VARSAYILAN, ...(bir.ayar || {}) }; VR.bir = bir;
  const n = vrGunSay(VR.ay), bas = vrIso(VR.ay, 0), bit = vrIso(VR.ay, n - 1);
  let kisi, satir, yayin, seferler = [];
  const geri7 = vrDkIso(vrDk(`${bas}T00:00`) - 7 * 1440).slice(0, 10), ileri = vrDkIso(vrDk(`${bit}T00:00`) + 2 * 1440).slice(0, 10);
  try {
    const [k, s, y, sf] = await Promise.all([sb.rpc('vardiya_kisiler', { p_birim: VR.birim }),
      sb.from('vardiya').select('sicil,tarih,deger').eq('birim', VR.birim).gte('tarih', geri7).lte('tarih', bit),
      sb.from('vardiya_yayin').select('ay,yayin_tarihi').eq('birim', VR.birim).eq('ay', bas).maybeSingle(),
      sb.from('sefer').select('ucus_no,havayolu,amac,durum,inis,kalkis,nereden,nereye,notlar').gte('inis', vrDkIso(vrDk(`${bas}T00:00`) - 2 * 1440)).lte('inis', `${ileri}T23:59`)]);
    if (k.error) throw k.error; if (s.error) throw s.error;
    kisi = k.data || []; satir = s.data || []; yayin = y.data || null;
    const O = vrOto(VR.ayar), a0 = vrDk(`${bas}T00:00`), a1 = vrDk(`${bit}T00:00`) + 1440;
    seferler = sf.error ? null : (sf.data || []).map(x => ({ ...x, inis: x.inis && x.inis.slice(0, 16), kalkis: x.kalkis && x.kalkis.slice(0, 16) }))
      .filter(x => vrSeferOlay(x, O).some(o => o.bit > a0 && o.bas < a1)).sort((a, b) => String(a.inis || a.kalkis).localeCompare(String(b.inis || b.kalkis)));
  } catch (e) { $('v_govde').className = ''; $('v_govde').innerHTML = `<div class="alert">Vardiya verisi okunamadı: ${esc(e.message || e)}</div>`; return; }
  const plan = {}, onceki = {}, a0g = vrDk(`${bas}T00:00`) / 1440;
  satir.forEach(r => { if (r.tarih < bas) { (onceki[r.sicil] = onceki[r.sicil] || []).push([vrDk(`${r.tarih}T00:00`) / 1440 - a0g, r.deger]); return; }
    (plan[r.sicil] = plan[r.sicil] || Array(n).fill(''))[Number(r.tarih.slice(8, 10)) - 1] = r.deger; });
  // Satırlar: etkin birim personeli + bu ay planı olanlar (ayrılmış olsa bile)
  kisi = kisi.filter(p => p.durum === 'Etkin' || plan[p.sicil]);
  kisi.forEach(p => { plan[p.sicil] = plan[p.sicil] || Array(n).fill(''); });
  Object.assign(VR, { kisi, plan, n, yayin, kirli: false, yaz, onceki, seferler: seferler || [], seferTablo: seferler !== null });
  vrCiz();
}
function vrDegis(git, iptal) {   // kaydedilmemiş değişiklik varken birim/ay değiştirme
  if (!VR || !VR.kirli) { git(); return; }
  modal(`<h3>Kaydedilmemiş değişiklikler</h3><p>Bu ayın planında kaydetmediğiniz değişiklikler var.</p>
    <div class="acts"><button class="btn" data-close id="vd_iptal">Geri dön</button><button class="btn" id="vd_at">Kaydetmeden geç</button><button class="btn pri" id="vd_kay">Kaydet ve geç</button></div>`, (bg, close) => {
    bg.querySelector('#vd_iptal').onclick = () => { iptal && iptal(); };
    bg.querySelector('#vd_at').onclick = () => { close(); VR.kirli = false; git(); };
    bg.querySelector('#vd_kay').onclick = async () => { const ok = await vrKaydet(); close(); if (ok) git(); else iptal && iptal(); };
  });
}
function vrCiz() {
  const { kisi, plan, n, ay, yaz, ayar, yayin } = VR, g = $('v_govde'); if (!g) return;
  g.className = '';
  const ayBas = vrAyBas(ay), wd0 = (ayBas.getDay() + 6) % 7;
  const O = vrOto(ayar), a0 = vrDk(`${vrIso(ay, 0)}T00:00`), sGun = {};
  (VR.seferler || []).forEach(s => vrSeferOlay(s, O).forEach(o => { const d = Math.floor((o.bas - a0) / 1440); if (d >= 0 && d < n) (sGun[d] = sGun[d] || []).push(`${s.ucus_no} ${vrDkIso(o.bas).slice(11)}–${vrDkIso(o.bit).slice(11)}`); }));
  const gunH = Array.from({ length: n }, (_, d) => { const w = (wd0 + d) % 7; return `<th class="v-g${w >= 5 ? ' v-hs' : ''}${vrIso(ay, d) === ISO_TODAY ? ' v-bugun' : ''}"${sGun[d] ? ` title="Sefer: ${esc(sGun[d].join(' · '))}"` : ''}><b>${d + 1}</b><small>${VR_GUN[w]}</small>${sGun[d] ? `<i class="v-ucak">✈ ${sGun[d].length}</i>` : ''}</th>`; }).join('');
  const izinS = Object.fromEntries(kisi.map(p => [p.sicil, GOREN() ? vrIzinGunleri(p.sicil, ay) : new Set()]));
  const kalip = [...(ayar.kaliplar || []), ...VR_IZINLI.slice(0, 3)];
  g.innerHTML = `
  <div class="v-durum">
    ${yayin ? `<span class="pill p-onaylandi">Yayında</span><span class="mini">${fdt(yayin.yayin_tarihi)} · personel kendi vardiyasını görüyor</span>` : '<span class="pill p-bekliyor">Taslak</span><span class="mini">Personel henüz görmüyor</span>'}
    <span class="v-bosluk"></span>
    ${yaz ? `<label class="btn sm" title="Fazla Mesai Hesaplama Excel dosyasındaki Günlük Saatler sayfasını içeri alır">Excel'den al<input type="file" id="v_al" accept=".xlsx,.xlsm,.xls" hidden></label>` : ''}
    ${yaz ? '<button type="button" class="btn sm" id="v_oto">Otomatik planla</button>' : ''}
    <button type="button" class="btn sm" id="v_indir">Excel indir</button>
    ${yaz ? `<button type="button" class="btn sm" id="v_yayin">${yayin ? 'Yayından kaldır' : 'Yayınla'}</button><button type="button" class="btn pri sm" id="v_kaydet" disabled>Kaydedildi</button>` : ''}
  </div>
  ${yaz ? `<div class="v-palet" id="v_palet"><span class="mini">Hızlı giriş: bir kalıp seçip hücrelere tıklayın ya da sürükleyin</span>
    ${kalip.map(k => `<button type="button" class="v-kalip ${vrHucreSinif(vrHesap([k], ayar, ayBas).G[0])}" data-k="${esc(k)}">${esc(k)}</button>`).join('')}
    <button type="button" class="v-kalip v-sil" data-k="">Sil</button></div>` : ''}
  <div class="v-tablo-kap"><table class="v-tablo" id="v_tablo"><thead><tr><th class="v-ad">Ad Soyad</th>${gunH}<th class="v-t">Net</th><th class="v-t">Gece</th><th class="v-t">F. Mesai</th></tr></thead>
    <tbody>${kisi.map((p, i) => `<tr data-s="${esc(p.sicil)}"><th class="v-ad" title="${esc(p.unvan || '')}"><span>${esc(p.ad)}</span><small>${esc(p.sicil)}${p.durum !== 'Etkin' ? ' · ayrıldı' : ''}</small></th>
      ${plan[p.sicil].map((v, d) => `<td><input class="v-h" data-r="${i}" data-d="${d}" value="${esc(v)}" ${yaz ? '' : 'readonly'} placeholder="${izinS[p.sicil].has(d) ? 'izin' : ''}" aria-label="${esc(p.ad)} ${d + 1}" autocomplete="off" spellcheck="false"></td>`).join('')}
      <td class="v-t" data-t="net"></td><td class="v-t" data-t="gece"></td><td class="v-t v-fmt" data-t="fm"></td></tr>`).join('')}</tbody></table></div>
  <div class="v-lejant"><span><i class="v-gun"></i>Gündüz</span><span><i class="v-gece"></i>Gece vardiyası</span><span><i class="v-fm"></i>O gün fazla mesai var</span><span><i class="v-dinlenme"></i>11 saat dinlenme dolmadan</span><span><i class="v-hata"></i>Hatalı giriş</span>
    <span class="mini">Yazım: 10.00-21.00 · 21.00-10.00 (gece; ${ayar.gece_gun === 'bitis' ? 'bittiği' : 'başladığı'} güne) · 11 (net saat) · HT / Yİ / R</span></div>
  <div class="panel" style="margin-top:16px"><div class="sb-bas"><h3>Kişi bazında toplam çalışma ve fazla mesai</h3><span class="mini">Haftalık ${fn(ayar.haftalik)} saat · günlük ${fn(ayar.gunduz)} saat (gece ${fn(ayar.gece_siniri ? ayar.gece : ayar.gunduz, 1)}) · dinlenme ${fn(ayar.dinlenme)} saat · mola ${ayar.mola ? 'düşülüyor' : 'düşülmüyor'}</span></div>
    <div class="tbl"><table id="v_ozet"></table></div></div>
  ${VR.seferTablo ? vrSeferPanel() : ''}`;
  for (let i = 0; i < kisi.length; i++) vrSatir(i);
  vrOzet();
  const T = $('v_tablo');
  // klavye: ok tuşları / Enter ile gezinme
  T.addEventListener('keydown', e => {
    const h = e.target.closest('.v-h'); if (!h) return;
    let r = +h.dataset.r, d = +h.dataset.d;
    const m = { ArrowUp: [-1, 0], ArrowDown: [1, 0], Enter: [e.shiftKey ? -1 : 1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (!m) return;
    if ((e.key === 'ArrowLeft' && h.selectionStart > 0) || (e.key === 'ArrowRight' && h.selectionEnd < h.value.length)) return;
    e.preventDefault(); const x = T.querySelector(`.v-h[data-r="${r + m[0]}"][data-d="${d + m[1]}"]`); if (x) { x.focus(); x.select(); }
  });
  if (!yaz) { vrBagla(); return; }
  T.addEventListener('input', e => { const h = e.target.closest('.v-h'); if (h) vrYaz(+h.dataset.r, +h.dataset.d, h.value, false); });
  // Excel'den yapıştırma (birden çok hücre)
  T.addEventListener('paste', e => {
    const h = e.target.closest('.v-h'); if (!h) return;
    const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(txt.trim())) return;
    e.preventDefault();
    const rows = txt.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t'));
    const r0 = +h.dataset.r, d0 = +h.dataset.d;
    rows.forEach((row, i) => row.forEach((v, j) => { if (r0 + i < kisi.length && d0 + j < n) vrYaz(r0 + i, d0 + j, v.trim(), true); }));
  });
  // boya modu
  let boyuyor = false;
  $('v_palet').addEventListener('click', e => { const k = e.target.closest('.v-kalip'); if (!k) return; VR.boya = VR.boya === k.dataset.k ? null : k.dataset.k; vrPalet(); });
  T.addEventListener('pointerdown', e => { const h = e.target.closest('.v-h'); if (!h || VR.boya == null) return; e.preventDefault(); boyuyor = true; vrYaz(+h.dataset.r, +h.dataset.d, VR.boya, true); });
  T.addEventListener('pointerover', e => { if (!boyuyor) return; const h = e.target.closest('.v-h'); if (h) vrYaz(+h.dataset.r, +h.dataset.d, VR.boya, true); });
  document.addEventListener('pointerup', () => { boyuyor = false; }, { once: false });
  vrPalet();
  $('v_kaydet').onclick = () => vrKaydet();
  $('v_yayin').onclick = () => vrYayin();
  $('v_al').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) vrExceldenAl(f); };
  $('v_oto').onclick = vrOtoModal;
  if ($('v_sefer')) $('v_sefer').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) vrSeferYukle(f); };
  vrBagla();
}
function vrBagla() { $('v_indir').onclick = vrExcelIndir; }
function vrPalet() {
  document.querySelectorAll('#v_palet .v-kalip').forEach(b => b.classList.toggle('secili', VR.boya != null && b.dataset.k === VR.boya));
  const t = $('v_tablo'); if (t) t.classList.toggle('boya', VR.boya != null);
}
function vrYaz(r, d, v, hucreyeYaz) {
  const p = VR.kisi[r]; if (!p) return;
  if ((VR.plan[p.sicil][d] || '') === (v || '')) return;
  VR.plan[p.sicil][d] = v || '';
  if (hucreyeYaz) { const h = document.querySelector(`.v-h[data-r="${r}"][data-d="${d}"]`); if (h) h.value = v || ''; }
  vrSatir(r); vrOzet(); vrKirli(true);
}
function vrKirli(k) {
  VR.kirli = k; const b = $('v_kaydet'); if (b) { b.disabled = !k; b.textContent = k ? 'Kaydet' : 'Kaydedildi'; }
  window.onbeforeunload = k ? () => true : null;
}
function vrSatir(r) {
  const p = VR.kisi[r], tr = document.querySelector(`#v_tablo tr[data-s="${CSS.escape(p.sicil)}"]`); if (!tr) return;
  const { G, T } = vrHesap(VR.plan[p.sicil], VR.ayar, vrAyBas(VR.ay));
  VR.son = VR.son || {}; VR.son[p.sicil] = T;
  tr.querySelectorAll('.v-h').forEach((h, d) => {
    const g = G[d]; h.className = 'v-h ' + vrHucreSinif(g);
    h.title = g.tur === 'vardiya' || g.tur === 'net' ? `Net ${fn(g.net, 2)} saat${g.gece ? ' · gece' : ''}${g.gfm ? ` · günlük fazla mesai ${fn(g.gfm, 2)}` : ''}${g.bosluk != null ? ` · önceki çıkıştan ${fn(g.bosluk, 1)} saat sonra` : ''}` : g.tur === 'hata' ? 'Hatalı giriş: 10.00-21.00 biçiminde yazın' : '';
  });
  tr.querySelector('[data-t="net"]').textContent = vrSa(T.net);
  tr.querySelector('[data-t="gece"]').textContent = T.gece || '';
  const f = tr.querySelector('[data-t="fm"]'); f.textContent = vrSa(T.fm); f.classList.toggle('var', T.fm > 0);
  tr.classList.toggle('v-uyari', T.hata > 0 || T.dinlenme > 0);
}
function vrOzetSatirlari() {
  return VR.kisi.map((p, i) => { const T = (VR.son || {})[p.sicil] || vrHesap(VR.plan[p.sicil], VR.ayar, vrAyBas(VR.ay)).T; return { p, i, T }; });
}
function vrOzet() {
  const t = $('v_ozet'); if (!t) return;
  const H = vrHaftaAralik(VR.ay), L = vrOzetSatirlari();
  const top = k => L.reduce((a, x) => a + (x.T[k] || 0), 0);
  t.innerHTML = `<thead><tr><th>Ad Soyad</th><th class="n">Gün</th><th class="n">Gece</th><th class="n">Hafta sonu</th><th class="n">Net saat</th>${H.map((h, i) => h ? `<th class="n">${i + 1}. hafta<br><span class="mini">${h}</span></th>` : '').join('')}<th class="n">Günlük FM</th><th class="n">Haftalık FM</th><th class="n">Toplam FM</th><th>Uyarı</th></tr></thead>
  <tbody>${L.map(({ p, T }) => `<tr><td>${esc(p.ad)} <span class="mini">${esc(p.sicil)}</span></td><td class="n">${T.gun || ''}</td><td class="n">${T.gece || ''}</td><td class="n">${T.hs || ''}</td><td class="n">${vrSa(T.net)}</td>
    ${H.map((h, i) => h ? `<td class="n${T.hafta[i] > VR.ayar.haftalik ? ' neg' : ''}">${vrSa(T.hafta[i])}</td>` : '').join('')}
    <td class="n">${vrSa(T.gfm)}</td><td class="n">${vrSa(T.hfm)}</td><td class="n"><b>${vrSa(T.fm)}</b></td>
    <td class="mini">${[T.hata ? `${T.hata} hatalı giriş` : '', T.dinlenme ? `Dinlenme < ${fn(VR.ayar.dinlenme)} saat: ${T.dinlenme} kez` : ''].filter(Boolean).join(' · ')}</td></tr>`).join('')}
  <tr class="v-toplam"><td><b>Toplam · ${L.length} kişi</b></td><td class="n">${top('gun')}</td><td class="n">${top('gece')}</td><td class="n">${top('hs')}</td><td class="n">${vrSa(top('net'))}</td>${H.map((h, i) => h ? `<td class="n">${vrSa(L.reduce((a, x) => a + x.T.hafta[i], 0))}</td>` : '').join('')}<td class="n">${vrSa(top('gfm'))}</td><td class="n">${vrSa(top('hfm'))}</td><td class="n"><b>${vrSa(top('fm'))}</b></td><td></td></tr></tbody>`;
}
async function vrKaydet() {
  const b = $('v_kaydet'); if (b) { b.disabled = true; b.textContent = 'Kaydediliyor…'; }
  const rows = []; VR.kisi.forEach(p => VR.plan[p.sicil].forEach((v, d) => { if (String(v || '').trim()) rows.push({ sicil: p.sicil, tarih: vrIso(VR.ay, d), deger: String(v).trim() }); }));
  const { error } = await sb.rpc('vardiya_kaydet', { p_birim: VR.birim, p_ay: vrIso(VR.ay, 0), p_satirlar: rows });
  if (error) { vrKirli(true); alertMsg('Kaydedilemedi: ' + error.message); return false; }
  vrKirli(false); return true;
}
async function vrYayin() {
  const ac = !VR.yayin;
  if (ac && VR.kirli && !(await vrKaydet())) return;
  const { error } = await sb.rpc('vardiya_yayinla', { p_birim: VR.birim, p_ay: vrIso(VR.ay, 0), p_yayin: ac });
  if (error) { alertMsg('İşlem yapılamadı: ' + error.message); return; }
  VR.yayin = ac ? { yayin_tarihi: new Date().toISOString() } : null;
  const k = VR.kirli; vrCiz(); if (k) vrKirli(true);
}
function vrExcelIndir() {
  if (typeof XLSX === 'undefined' || !XLSX.utils) { alertMsg('Excel kütüphanesi yüklenemedi; sayfayı yenileyip tekrar deneyin.'); return; }
  const { kisi, plan, n, ay } = VR, b = vrAyBas(ay), wd0 = (b.getDay() + 6) % 7, H = vrHaftaAralik(ay), L = vrOzetSatirlari();
  const s1 = [[`${VR.bir.ad} · ${AYU[b.getMonth()]} ${b.getFullYear()} vardiya planı`], [],
    ['Sıra', 'Ad Soyad', 'Sicil No', ...Array.from({ length: n }, (_, d) => `${d + 1} ${VR_GUN[(wd0 + d) % 7]}`), 'Net Toplam', 'Gece', 'Fazla Mesai'],
    ...kisi.map((p, i) => [i + 1, p.ad, p.sicil, ...plan[p.sicil], L[i].T.net, L[i].T.gece, L[i].T.fm])];
  const s2 = [['Kişi bazında toplam çalışma ve fazla mesai'], [`Birim: ${VR.bir.ad} | Dönem: ${ay.slice(5)}.${ay.slice(0, 4)} | Günlük sınır: ${VR.ayar.gunduz} saat (gece ${VR.ayar.gece}) | Haftalık: ${VR.ayar.haftalik} saat`], [],
    ['Sıra', 'Ad Soyad', 'Sicil No', 'Çalışılan Gün', 'Gece Vardiyası', 'Toplam Net Saat', ...H.map((h, i) => h ? `${i + 1}. Hafta (${h})` : null).filter(Boolean), 'Günlük Fazla Mesai', 'Haftalık Fazla Mesai', 'TOPLAM FAZLA MESAİ', 'Uyarı'],
    ...L.map(({ p, T }, i) => [i + 1, p.ad, p.sicil, T.gun, T.gece, T.net, ...H.map((h, j) => h ? T.hafta[j] : null).filter(x => x !== null), T.gfm, T.hfm, T.fm,
      [T.hata ? `${T.hata} hatalı giriş` : '', T.dinlenme ? `Dinlenme < ${VR.ayar.dinlenme} saat: ${T.dinlenme} kez` : ''].filter(Boolean).join(' · ')])];
  const wb = XLSX.utils.book_new();
  const w1 = XLSX.utils.aoa_to_sheet(s1); w1['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 9 }, ...Array(n).fill({ wch: 12 }), { wch: 10 }, { wch: 7 }, { wch: 11 }];
  const w2 = XLSX.utils.aoa_to_sheet(s2); w2['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 9 }, ...Array(12).fill({ wch: 14 })];
  XLSX.utils.book_append_sheet(wb, w1, 'Günlük Saatler'); XLSX.utils.book_append_sheet(wb, w2, 'Toplam Mesai');
  XLSX.writeFile(wb, `Vardiya_${VR.bir.ad.replace(/\s+/g, '_')}_${ay}.xlsx`);
}
async function vrExceldenAl(f) {
  if (typeof XLSX === 'undefined' || !XLSX.read) { alertMsg('Excel kütüphanesi yüklenemedi; sayfayı yenileyip tekrar deneyin.'); return; }
  try {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
    const ws = wb.Sheets['Günlük Saatler'] || wb.Sheets[wb.SheetNames[0]];
    const R = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const c3 = (R[2] || [])[2]; let ayX = null;
    if (c3 instanceof Date) ayX = `${c3.getFullYear()}-${String(c3.getMonth() + 1).padStart(2, '0')}`;
    if (ayX && ayX !== VR.ay) { alertMsg(`Dosya ${ayX.slice(5)}.${ayX.slice(0, 4)} ayına ait; önce yukarıdan o ayı seçin.`); return; }
    const bas = R.findIndex(r => String(r[1] || '').trim() === 'Ad Soyad');
    if (bas < 0) { alertMsg('Dosyada "Ad Soyad" başlığı bulunamadı. Fazla Mesai Hesaplama dosyasının Günlük Saatler sayfasını seçin.'); return; }
    const idx = Object.fromEntries(VR.kisi.map((p, i) => [String(p.sicil), i]));
    let say = 0, yok = [];
    R.slice(bas + 1).forEach(r => {
      const sic = String(r[2] || '').trim(); if (!sic) return;
      const i = idx[sic]; if (i == null) { if (r[1]) yok.push(r[1]); return; }
      for (let d = 0; d < VR.n; d++) { let v = r[3 + d]; if (v instanceof Date) v = ''; v = v === '' || v == null ? '' : String(v).trim(); if (v !== (VR.plan[VR.kisi[i].sicil][d] || '')) { vrYaz(i, d, v, true); say++; } }
    });
    alertMsg(`${say} hücre içeri alındı.${yok.length ? ` Birimde bulunamayan ${yok.length} kişi atlandı: ${yok.slice(0, 6).join(', ')}${yok.length > 6 ? '…' : ''}` : ''} Kontrol edip Kaydet'e basın.`);
  } catch (e) { alertMsg('Dosya okunamadı: ' + e.message); }
}
function vrAyarModal(bir, sonra) {
  const A = { ...VR_VARSAYILAN, ...(bir.ayar || {}) }, O = vrOto(A);
  const kalV = (A.kaliplar || []).filter(k => vrCoz(k).tur === 'vardiya');
  const sor = (bir.sorumlu || []).map(s => `${s}${DATA.byS[s] ? ' · ' + DATA.byS[s].ad : ''}`).join('\n');
  modal(`<h3>${esc(bir.ad)} · vardiya kuralları</h3>
  <div class="form v-ayar-form">
    <label>Haftalık normal süre (saat)<input type="number" step="0.5" id="va_h" value="${A.haftalik}"></label>
    <label>Günlük üst sınır – gündüz (saat)<input type="number" step="0.5" id="va_g" value="${A.gunduz}"></label>
    <label>Günlük üst sınır – gece (saat)<input type="number" step="0.5" id="va_n" value="${A.gece}"></label>
    <label>En az dinlenme (saat)<input type="number" step="0.5" id="va_d" value="${A.dinlenme}"></label>
    <label>Gece dönemi başlangıcı<input type="time" id="va_gb" value="${esc(String(A.gece_bas).padStart(5, '0'))}"></label>
    <label>Gece dönemi bitişi<input type="time" id="va_ge" value="${esc(String(A.gece_bit).padStart(5, '0'))}"></label>
    <label>Gece vardiyası hangi güne yazılır<select id="va_gg"><option value="bitis"${A.gece_gun === 'bitis' ? ' selected' : ''}>Bittiği gün</option><option value="baslangic"${A.gece_gun !== 'bitis' ? ' selected' : ''}>Başladığı gün</option></select></label>
    <label class="v-cb"><input type="checkbox" id="va_gs"${A.gece_siniri ? ' checked' : ''}> Gece sınırı uygulansın</label>
    <label class="v-cb"><input type="checkbox" id="va_m"${A.mola ? ' checked' : ''}> Mola düşülsün (7,5 saat üstü 1 sa · 4 saat üstü 0,5 sa · altı 0,25 sa)</label>
    <label class="v-genis">Vardiya kalıpları (hızlı giriş düğmeleri, her satıra bir tane)<textarea id="va_k" rows="4">${esc((A.kaliplar || []).join('\n'))}</textarea></label>
    <div class="v-genis v-oto-bas"><b>Otomatik planlama</b><span class="mini">Her gün bu vardiyalarda kaç kişi çalışmalı? (Kalıp listesini değiştirdiyseniz önce kaydedip bu ekranı yeniden açın.)</span></div>
    <div class="v-genis"><table class="v-iht"><thead><tr><th>Vardiya</th><th>Hafta içi kişi</th><th>Hafta sonu kişi</th></tr></thead><tbody>
      ${kalV.map(k => { const i = O.ihtiyac[k] || {}; return `<tr data-k="${esc(k)}"><td><b>${esc(k)}</b></td><td><input type="number" min="0" max="99" class="vi-hi" value="${i.hi || 0}"></td><td><input type="number" min="0" max="99" class="vi-hs" value="${i.hs || 0}"></td></tr>`; }).join('') || '<tr><td colspan="3" class="mini">Önce vardiya kalıbı girin.</td></tr>'}</tbody></table></div>
    <label>Sefer sırasında havalimanında en az kaç kişi (0 = sefere göre ek planlama yok)<input type="number" min="0" id="vo_sk" value="${O.sefer_kisi}"></label>
    <label>Üst üste en fazla çalışma günü<input type="number" min="1" max="13" id="vo_ar" value="${O.ardisik_max}"></label>
    <label>Gelen yolcu: inişten kaç saat önce<input type="number" step="0.25" id="vo_go" value="${O.gelen_once}"></label>
    <label>Giden yolcu: kalkıştan kaç saat önce<input type="number" step="0.25" id="vo_gi" value="${O.giden_once}"></label>
    <label>Kalkıştan sonra kaç dakika kalınır<input type="number" step="5" id="vo_cs" value="${Math.round(O.cikis_sonra * 60)}"></label>
    <label>İnişten sonra kaç dakika kalınır<input type="number" step="5" id="vo_is" value="${Math.round(O.inis_sonra * 60)}"></label>
    <label>Haftada en fazla net saat (fazla mesai dahil)<input type="number" step="0.5" id="vo_hu" value="${O.haftalik_ust}"></label>
    <label>Gece vardiyasından sonra boş gün<input type="number" min="0" max="3" id="vo_gb" value="${O.gece_sonra_bos}"></label>
    <label class="v-cb"><input type="checkbox" id="vo_ik"${O.inis_karsila ? ' checked' : ''}> Giden yolculu seferde inişi de karşıla</label>
    <label class="v-genis">Vardiya sorumluları (sicil no, her satıra bir tane) · bu kişiler panelde bu birimin planını hazırlayabilir<textarea id="va_s" rows="3" placeholder="31850">${esc(sor)}</textarea></label>
  </div><div id="va_msg"></div>
  <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="va_kay">Kaydet</button></div>`, (bg, close) => {
    bg.querySelector('#va_kay').onclick = async () => {
      const q = s => bg.querySelector(s), num = s => Number(String(q(s).value).replace(',', '.'));
      const kal = q('#va_k').value.split('\n').map(x => x.trim()).filter(Boolean);
      const hatali = kal.filter(k => vrCoz(k).tur === 'hata');
      if (hatali.length) { q('#va_msg').innerHTML = `<div class="alert">Hatalı kalıp: ${esc(hatali.join(', '))}</div>`; return; }
      const sorumlu = q('#va_s').value.split('\n').map(x => x.split('·')[0].trim()).filter(Boolean);
      const bilinmeyen = sorumlu.filter(s => !DATA.byS[s]);
      if (bilinmeyen.length) { q('#va_msg').innerHTML = `<div class="alert">Personelde olmayan sicil: ${esc(bilinmeyen.join(', '))}</div>`; return; }
      const ayar = { haftalik: num('#va_h'), gunduz: num('#va_g'), gece: num('#va_n'), dinlenme: num('#va_d'), gece_bas: q('#va_gb').value || '20:00', gece_bit: q('#va_ge').value || '06:00',
        gece_gun: q('#va_gg').value, gece_siniri: q('#va_gs').checked, mola: q('#va_m').checked, kaliplar: kal };
      const iht = {}; bg.querySelectorAll('.v-iht tr[data-k]').forEach(tr => { const hi = Math.max(0, Number(tr.querySelector('.vi-hi').value) || 0), hs = Math.max(0, Number(tr.querySelector('.vi-hs').value) || 0); if (kal.includes(tr.dataset.k) && (hi || hs)) iht[tr.dataset.k] = { hi, hs }; });
      ayar.oto = { ...O, ihtiyac: iht, sefer_kisi: Math.max(0, num('#vo_sk') || 0), ardisik_max: Math.max(1, num('#vo_ar') || 6), gelen_once: num('#vo_go') || 0, giden_once: num('#vo_gi') || 0,
        cikis_sonra: (num('#vo_cs') || 0) / 60, inis_sonra: (num('#vo_is') || 0) / 60, haftalik_ust: num('#vo_hu') || 66, gece_sonra_bos: Math.max(0, num('#vo_gb') || 0), inis_karsila: q('#vo_ik').checked };
      if ([ayar.haftalik, ayar.gunduz, ayar.gece, ayar.dinlenme].some(x => !(x > 0))) { q('#va_msg').innerHTML = '<div class="alert">Süreler sıfırdan büyük olmalı.</div>'; return; }
      const { error } = await sb.rpc('vardiya_birim_kaydet', { p_kod: bir.kod, p_ayar: ayar, p_sorumlu: sorumlu });
      if (error) { q('#va_msg').innerHTML = `<div class="alert">${esc(error.message)}</div>`; return; }
      bir.ayar = ayar; bir.sorumlu = sorumlu; close(); sonra();
    };
  });
}

// ---------- personel: Vardiyam ----------
async function vardiyamView(view) {
  view.innerHTML = `<h2>Vardiyam</h2><p class="sub">Yayınlanmış vardiya planınız. Değişiklik için birim sorumlunuza başvurun.</p><div id="vm" class="loading">Yükleniyor…</div>`;
  const me = ME.profile.sicil;
  const [v, y] = await Promise.all([sb.from('vardiya').select('birim,tarih,deger').eq('sicil', me), sb.from('vardiya_yayin').select('birim,ay')]);
  const box = $('vm'); if (!box) return; box.className = '';
  if (v.error) { box.innerHTML = `<div class="alert">${esc(v.error.message)}</div>`; return; }
  const yay = new Set((y.data || []).map(r => r.birim + '|' + r.ay.slice(0, 7)));
  const R = (v.data || []).filter(r => yay.has(r.birim + '|' + r.tarih.slice(0, 7)));
  if (!R.length) { box.innerHTML = bos('izin', 'Yayınlanmış vardiyan yok', 'Birimin planı yayınlandığında vardiyaların burada görünür.'); return; }
  const aylar = [...new Set(R.map(r => r.tarih.slice(0, 7)))].sort();
  const buAy = ISO_TODAY.slice(0, 7);
  let ay = aylar.includes(buAy) ? buAy : aylar.filter(a => a > buAy)[0] || aylar[aylar.length - 1];
  const ciz = () => {
    const satir = R.filter(r => r.tarih.slice(0, 7) === ay), birim = (satir[0] || {}).birim;
    const bir = (DATA.vBirim || []).find(b => b.kod === birim) || {}, ayar = { ...VR_VARSAYILAN, ...(bir.ayar || {}) };
    const n = vrGunSay(ay), deg = Array(n).fill(''); satir.forEach(r => { deg[Number(r.tarih.slice(8, 10)) - 1] = r.deger; });
    const b = vrAyBas(ay), { G, T } = vrHesap(deg, ayar, b), wd0 = (b.getDay() + 6) % 7;
    const hucre = [];
    for (let i = 0; i < wd0; i++) hucre.push('<div class="vm-g bos-g"></div>');
    for (let d = 0; d < n; d++) {
      const g = G[d], t = vrIso(ay, d), cal = g.tur === 'vardiya' || g.tur === 'net';
      hucre.push(`<div class="vm-g ${cal ? (g.gece ? 'gece' : 'gun') : deg[d] ? 'izinli' : ''}${t === ISO_TODAY ? ' bugun' : ''}"><span class="vm-no">${d + 1}</span>
        ${deg[d] ? `<b>${esc(deg[d])}</b>${cal ? `<small>${fn(g.net, 2)} sa${g.gece ? ' · gece' : ''}</small>` : ''}` : '<small class="vm-bos">—</small>'}</div>`);
    }
    box.innerHTML = `<div class="vm-ust">${aylar.length > 1 ? `<div class="seg" id="vm_ay">${aylar.map(a => `<button type="button" data-a="${a}" class="${a === ay ? 'on' : ''}">${AYU[Number(a.slice(5)) - 1]} ${a.slice(0, 4)}</button>`).join('')}</div>` : `<b>${AYU[b.getMonth()]} ${b.getFullYear()}</b>`}
      ${bir.ad ? `<span class="tag">${esc(bir.ad)}</span>` : ''}</div>
    <div class="ozet-kart vm-ozet">
      <div class="ok-kart" style="--c:var(--info)"><span class="ok-ik">${ikon('izin', 21)}</span><div><b>${T.gun}</b><span>Çalışma günü</span></div></div>
      <div class="ok-kart" style="--c:var(--brand)"><span class="ok-ik">${ikon('genel', 21)}</span><div><b>${fn(T.net, 1)}</b><span>Net çalışma saati</span></div></div>
      <div class="ok-kart" style="--c:var(--none)"><span class="ok-ik">${ikon('tema', 21)}</span><div><b>${T.gece}</b><span>Gece vardiyası</span></div></div>
      <div class="ok-kart" style="--c:var(--warn)"><span class="ok-ik">${ikon('sertifika', 21)}</span><div><b>${fn(T.fm, 1)}</b><span>Fazla mesai (saat)</span></div></div>
    </div>
    <div class="panel"><div class="vm-takvim">${VR_GUN.map(g => `<div class="vm-bas">${g}</div>`).join('')}${hucre.join('')}</div>
    <p class="mini" style="margin-top:12px">Net saat moladan sonraki süredir. Fazla mesai, planlanan vardiyalara göre hesaplanır; kesin tutar bordroda belirlenir.</p></div>`;
    box.querySelectorAll('#vm_ay button').forEach(x => x.onclick = () => { ay = x.dataset.a; ciz(); });
  };
  ciz();
}

// =====================================================================
// Sefer programı ve otomatik planlama
// =====================================================================
const VR_OTO = {
  ihtiyac: {},                 // kalıp → { hi: hafta içi kişi, hs: hafta sonu kişi }
  sefer_kisi: 0,               // sefer sırasında havalimanında bulunması gereken en az kişi (0 = sefere göre ek planlama yok)
  gelen_once: 1.5, giden_once: 4, bos_kalkis_once: 1, inis_sonra: 1, cikis_sonra: 0.75, inis_karsila: true, birlestir: 3,
  ardisik_max: 6, haftalik_ust: 66, gece_sonra_bos: 1,
};
const vrOto = A => ({ ...VR_OTO, ...((A || {}).oto || {}) });
const vrSaatYaz = h => { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`; };
const vrDk = s => { const [d, t] = s.split('T'); const [y, m, g] = d.split('-').map(Number); const [h, mi] = (t || '00:00').split(':').map(Number); return Date.UTC(y, m - 1, g, h, mi) / 60000; };   // yerel saati dakika sayısı olarak (saat dilimi yok)
const vrDkIso = dk => new Date(dk * 60000).toISOString().slice(0, 16);

/* Sefer Excel'i (Seferler sayfası) → [{ ucus_no, havayolu, amac, durum, inis, kalkis, nereden, nereye, notlar }]
   R: sheet_to_json({header:1, raw:true}) çıktısı; tarih/saat hücreleri Excel seri numarasıdır. */
function vrSeferCoz(R) {
  const hi = R.findIndex(r => r.some(v => String(v).trim() === 'Uçuş No') && r.some(v => /Geliş Tarihi/.test(String(v))));
  if (hi < 0) throw new Error('"Seferler" sayfasında Uçuş No / Geliş Tarihi başlıkları bulunamadı.');
  const H = R[hi].map(v => String(v || '').trim()), c = ad => H.findIndex(h => h === ad);
  const K = { amac: c('Uçuş Amacı'), hy: c('Havayolu'), gt: c('Geliş Tarihi'), dt: c('Gidiş Tarihi'), no: c('Uçuş No'), vs: c('Varış Saati'), ks: c('Kalkış Saati'), kh: c('Kalkış Havalimanı'), vh: c('Varış Havalimanı'), du: c('Uçuş Durumu'), not: c('Notlar') };
  if ([K.gt, K.no, K.vs, K.ks].some(x => x < 0)) throw new Error('Sefer tablosunda gerekli sütunlar eksik (Geliş Tarihi, Uçuş No, Varış Saati, Kalkış Saati).');
  const tarih = v => { if (typeof v === 'number') { const d = new Date(Math.round((Math.floor(v) - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
    const s = String(v || '').trim(); let m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : null; };
  const saat = v => { if (typeof v === 'number') { const dk = Math.round((v - Math.floor(v)) * 1440) % 1440; return `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`; }
    const x = vrSaat(v); return x == null ? null : vrSaatYaz(x).replace('.', ':'); };
  const out = [];
  R.slice(hi + 1).forEach(r => {
    const no = String(r[K.no] ?? '').trim(), gt = tarih(r[K.gt]); if (!no || !gt) return;
    const dt = K.dt >= 0 ? tarih(r[K.dt]) || gt : gt, vs = saat(r[K.vs]), ks = saat(r[K.ks]);
    out.push({ ucus_no: no, havayolu: K.hy >= 0 ? String(r[K.hy] || '').trim() : '', amac: K.amac >= 0 ? String(r[K.amac] || '').trim() : '',
      durum: K.du >= 0 ? String(r[K.du] || '').trim() : 'GELEN/GİDEN YOLCULU', inis: vs ? `${gt}T${vs}` : null, kalkis: ks ? `${dt}T${ks}` : null,
      nereden: K.kh >= 0 ? String(r[K.kh] || '').trim() : '', nereye: K.vh >= 0 ? String(r[K.vh] || '').trim() : '', notlar: K.not >= 0 ? String(r[K.not] || '').trim() : '' });
  });
  return out;
}
/* Bir seferin personel ihtiyacı olan zaman pencereleri (dakika) */
function vrSeferOlay(s, O) {
  const du = String(s.durum || '').toLocaleUpperCase('tr'), gelen = du.includes('GELEN'), giden = du.includes('GİDEN') || du.includes('GIDEN');
  const W = [];
  if (s.inis && (gelen || O.inis_karsila)) { const t = vrDk(s.inis); W.push([t - O.gelen_once * 60, t + O.inis_sonra * 60]); }
  if (s.kalkis) { const t = vrDk(s.kalkis); W.push([t - (giden ? O.giden_once : O.bos_kalkis_once) * 60, t + O.cikis_sonra * 60]); }
  W.sort((a, b) => a[0] - b[0]);
  const M = []; W.forEach(w => { const l = M[M.length - 1]; if (l && w[0] - l[1] < O.birlestir * 60) l[1] = Math.max(l[1], w[1]); else M.push([...w]); });
  return M.map(([a, b]) => ({ bas: Math.floor(a / 15) * 15, bit: Math.ceil(b / 15) * 15, sefer: s }));
}

/* Otomatik planlama: boş hücreleri kural ve adalete göre doldurur. Dönüş: rapor */
function vrOtoPlanla({ koru = true, htYaz = false } = {}) {
  const A = VR.ayar, O = vrOto(A), n = VR.n, ay = VR.ay, ayDk = vrDk(`${vrIso(ay, 0)}T00:00`);
  const wd0 = (vrAyBas(ay).getDay() + 6) % 7, hs = d => (wd0 + d) % 7 >= 5;
  const ozel = v => { const c = vrCoz(v); return c.tur === 'vardiya' || c.tur === 'net'; };
  // Kişi durumu
  const K = VR.kisi.map(p => {
    const deg = VR.plan[p.sicil].slice(), izin = GOREN() ? vrIzinGunleri(p.sicil, ay) : new Set();
    const st = { p, deg, izin, vard: [], gunler: new Set(), net: 0, gece: 0, hs: 0, sefer: 0 };
    const ekle = (v, d) => { const c = vrCoz(v); if (c.tur === 'net') { st.vard.push({ s: d * 1440 + 9 * 60, e: d * 1440 + 9 * 60 + c.net * 60, d, gece: false, net: c.net }); }
      else if (c.tur === 'vardiya') { const g = vrHesap([v], A, vrAyBas(ay)).G[0]; const s = (d * 24 + c.bas - (A.gece_gun === 'bitis' && c.bas + c.sure > 24.01 ? 24 : 0)) * 60; st.vard.push({ s, e: s + c.sure * 60, d, gece: g.gece, net: g.net }); }
      else return; st.gunler.add(d); };
    (VR.onceki[p.sicil] || []).forEach(([d, v]) => ekle(v, d));      // önceki ayın son haftası (d < 0)
    deg.forEach((v, d) => { if (!koru) { if (ozel(v)) deg[d] = ''; } if (deg[d]) ekle(deg[d], d); });
    st.vard.filter(x => x.d >= 0).forEach(x => { st.net += x.net; if (x.gece) st.gece++; if (hs(x.d)) st.hs++; });
    return st;
  });
  const aday = (v, d) => { const c = vrCoz(v); const g = vrHesap([v], A, vrAyBas(ay)).G[0]; const s = (d * 24 + c.bas - (A.gece_gun === 'bitis' && c.bas + c.sure > 24.01 ? 24 : 0)) * 60; return { s, e: s + c.sure * 60, d, gece: g.gece, net: g.net, v }; };
  const uygun = (st, x) => {
    if (x.d < 0 || x.d >= n || st.deg[x.d] || st.izin.has(x.d)) return false;
    const dinl = A.dinlenme * 60;
    if (st.vard.some(y => !(x.s >= y.e + dinl || x.e + dinl <= y.s))) return false;
    let a = 1; for (let d = x.d - 1; st.gunler.has(d); d--) a++; for (let d = x.d + 1; st.gunler.has(d); d++) a++;
    if (a > O.ardisik_max) return false;
    if (O.gece_sonra_bos > 0) { for (let k = 1; k <= O.gece_sonra_bos; k++) { if (st.vard.some(y => y.gece && y.d === x.d - k)) return false; if (x.gece && st.gunler.has(x.d + k)) return false; } }
    const h0 = Math.floor((x.d + wd0) / 7);
    const hn = st.vard.filter(y => Math.floor((y.d + wd0) / 7) === h0).reduce((t, y) => t + y.net, 0);
    if (hn + x.net > O.haftalik_ust) return false;
    return true;
  };
  const ort = () => K.reduce((t, s) => t + s.net, 0) / (K.length || 1);
  const sec = x => {   // en az yüklü uygun kişi: saat, gece ve hafta sonu yükü dengelenir
    const m = ort() || 1, og = K.reduce((t, q) => t + q.gece, 0) / (K.length || 1), oh = K.reduce((t, q) => t + q.hs, 0) / (K.length || 1);
    let en = null, eb = Infinity;
    K.forEach((st, i) => { if (!uygun(st, x)) return;
      const b = st.net / m + (x.gece ? 0.5 * (st.gece - og) : 0) + (hs(x.d) ? 0.35 * (st.hs - oh) : 0) + (x.sefer ? 0.2 * st.sefer : 0) + ((i * 7 + x.d * 13) % (K.length || 1)) * 1e-4;
      if (b < eb) { eb = b; en = st; } });
    return en;
  };
  const ata = (st, x, sefer) => { st.deg[x.d] = x.v; st.vard.push(x); st.gunler.add(x.d); st.net += x.net; if (x.gece) st.gece++; if (hs(x.d)) st.hs++; if (sefer) st.sefer++; };
  // Kalıplar başlangıç saatine göre (gece vardiyaları önce: ertesi günün gündüzünü kısıtlar)
  const kal = (A.kaliplar || []).filter(k => vrCoz(k).tur === 'vardiya').map(k => ({ k, c: vrCoz(k), i: O.ihtiyac[k] || {} }));
  // Sefer olayları (ayın günlerine)
  // Üst üste binen ya da birbirine yakın sefer pencereleri tek görevde birleştirilir (en çok 14 saat)
  const ham = []; (VR.seferler || []).forEach(s => vrSeferOlay(s, O).forEach(o => ham.push(o)));
  ham.sort((a, b) => a.bas - b.bas);
  const olaylar = [];
  ham.forEach(o => { const l = olaylar[olaylar.length - 1];
    if (l && o.bas - l.bit < O.birlestir * 60 && Math.max(l.bit, o.bit) - l.bas <= 14 * 60) { l.bit = Math.max(l.bit, o.bit); l.sefer = { ucus_no: l.sefer.ucus_no + ' + ' + o.sefer.ucus_no }; }
    else olaylar.push({ ...o, sefer: { ucus_no: o.sefer.ucus_no } }); });
  const rapor = { atanan: 0, sefer_ek: 0, eksik: [], olay: 0 };
  for (let d = 0; d < n; d++) {
    // 1) temel ihtiyaç
    kal.slice().sort((a, b) => (b.c.bas + b.c.sure > 24.01) - (a.c.bas + a.c.sure > 24.01) || a.c.bas - b.c.bas).forEach(({ k, i }) => {
      const ist = Number(hs(d) ? i.hs : i.hi) || 0; if (!ist) return;
      const x = aday(k, d); let var_ = K.filter(st => st.deg[d] === k).length;
      while (var_ < ist) { const st = sec(x); if (!st) { rapor.eksik.push({ d, k, eksik: ist - var_ }); break; } ata(st, { ...x }, false); var_++; rapor.atanan++; }
    });
    // 2) sefer: o gün başlayan (yazılacağı güne göre) olaylar
    if (O.sefer_kisi > 0) olaylar.forEach(o => {
      const sR = (o.bas - ayDk) / 60, eR = (o.bit - ayDk) / 60;
      const yazGun = A.gece_gun === 'bitis' && Math.floor(eR / 24) !== Math.floor(sR / 24) ? Math.floor((eR - 1 / 60) / 24) : Math.floor(sR / 24);
      if (yazGun !== d) return;
      rapor.olay++;
      const kapsar = st => st.vard.some(y => y.s <= sR * 60 && y.e >= eR * 60);
      let var_ = K.filter(kapsar).length;
      if (eR - sR > 16) { rapor.eksik.push({ d, k: `${o.sefer.ucus_no}: personel penceresi ${fn(eR - sR, 1)} saat, tek vardiyaya sığmaz`, eksik: O.sefer_kisi }); return; }
      const v = `${vrSaatYaz(sR)}-${vrSaatYaz(eR)}`, x = { ...aday(v, d), sefer: true };
      while (var_ < O.sefer_kisi) { const st = sec(x); if (!st) { rapor.eksik.push({ d, k: `${o.sefer.ucus_no} (${v})`, eksik: O.sefer_kisi - var_ }); break; } ata(st, { ...x }, true); var_++; rapor.sefer_ek++; rapor.atanan++; }
    });
  }
  if (!rapor.atanan && !rapor.eksik.length) return { ...rapor, bos: true, adalet: [] };
  if (htYaz) K.forEach(st => st.deg.forEach((v, d) => { if (!v && !st.izin.has(d)) st.deg[d] = 'HT'; }));
  K.forEach(st => { VR.plan[st.p.sicil] = st.deg; });
  rapor.adalet = K.map(st => ({ ad: st.p.ad, net: st.net, gece: st.gece, hs: st.hs, sefer: st.sefer }));
  return rapor;
}
function vrOtoModal() {
  const A = VR.ayar, O = vrOto(A), kal = (A.kaliplar || []).filter(k => vrCoz(k).tur === 'vardiya');
  const ihtVar = kal.some(k => (O.ihtiyac[k] || {}).hi || (O.ihtiyac[k] || {}).hs) || O.sefer_kisi > 0;
  modal(`<h3>Otomatik planla · ${esc(VR.bir.ad)} · ${AYU[vrAyBas(VR.ay).getMonth()]}</h3>
  ${ihtVar ? `<p>Boş hücreler; birimin ihtiyaçlarına${O.sefer_kisi ? ` ve bu aydaki <b>${(VR.seferler || []).length} sefere</b>` : ''} göre, dinlenme ve çalışma süresi kuralları içinde, saat, gece ve hafta sonu yükü kişiler arasında eşit olacak şekilde doldurulur.</p>
  <ul class="mini">${kal.filter(k => (O.ihtiyac[k] || {}).hi || (O.ihtiyac[k] || {}).hs).map(k => { const i = O.ihtiyac[k] || {}; return `<li><b>${esc(k)}</b>: hafta içi ${i.hi || 0}, hafta sonu ${i.hs || 0} kişi</li>`; }).join('')}
  ${O.sefer_kisi ? `<li>Sefer sırasında en az <b>${O.sefer_kisi}</b> kişi (gelen yolcu inişten ${fn(O.gelen_once, 1)} sa, giden yolcu kalkıştan ${fn(O.giden_once, 1)} sa önce; kalkıştan ${fn(O.cikis_sonra * 60)} dk sonrasına kadar)</li>` : ''}
  <li>Üst üste en fazla ${O.ardisik_max} gün · haftada en fazla ${O.haftalik_ust} net saat · vardiyalar arası en az ${A.dinlenme} saat${O.gece_sonra_bos ? ` · gece vardiyasından sonra ${O.gece_sonra_bos} gün boş` : ''}</li></ul>
  <label class="v-cb"><input type="checkbox" id="vo_koru" checked> Elle girdiğim vardiyaları koru (yalnızca boş hücreleri doldur)</label>
  <label class="v-cb"><input type="checkbox" id="vo_ht"> Kalan boş günlere HT yaz</label>
  <p class="mini">Sonuç ekrana gelir; beğenmezseniz kaydetmeden sayfayı yenileyip vazgeçebilirsiniz. Onaylı izinler ${GOREN() ? 'otomatik dikkate alınır' : 'yalnızca İK hesabında görünür'}; izinli günlere Yİ/R yazarsanız o günler boş bırakılır.</p>`
  : `<div class="alert">Önce <b>Kurallar ve sorumlular</b> ekranından bu birimin günlük kişi ihtiyacını ya da sefer başına kişi sayısını girin.</div>`}
  <div class="acts"><button class="btn" data-close>Vazgeç</button>${ihtVar ? '<button class="btn pri" id="vo_git">Planla</button>' : ''}</div>`, (bg, close) => {
    const g = bg.querySelector('#vo_git'); if (!g) return;
    g.onclick = () => {
      const r = vrOtoPlanla({ koru: bg.querySelector('#vo_koru').checked, htYaz: bg.querySelector('#vo_ht').checked });
      close();
      if (r.bos) { vrCiz(); alertMsg(`Bu ay için yazılacak vardiya çıkmadı: ${(VR.seferler || []).length ? 'günlük kişi ihtiyacı girilmemiş' : 'bu ayda sefer yok ve günlük kişi ihtiyacı girilmemiş'}. Kurallar ve sorumlular ekranından ihtiyaçları girin${(VR.seferler || []).length ? '' : ' ya da seferli ayı seçin'}.`); return; }
      const k = VR.kirli; vrCiz(); vrKirli(true);
      const a = r.adalet, mm = f => a.length ? `${fn(Math.min(...a.map(f)), 1)} – ${fn(Math.max(...a.map(f)), 1)}` : '—';
      modal(`<h3>Plan hazır</h3><p><b>${r.atanan}</b> vardiya yazıldı${r.olay ? `; ${r.olay} sefer penceresi için <b>${r.sefer_ek}</b> ek görev` : ''}. Kontrol edip <b>Kaydet</b>'e basın.</p>
        <div class="tbl"><table><thead><tr><th>Kişi başı</th><th class="n">En az – en çok</th></tr></thead><tbody>
        <tr><td>Net saat (ay)</td><td class="n">${mm(x => x.net)}</td></tr><tr><td>Gece vardiyası</td><td class="n">${mm(x => x.gece)}</td></tr>
        <tr><td>Hafta sonu çalışma</td><td class="n">${mm(x => x.hs)}</td></tr>${r.olay ? `<tr><td>Sefer görevi</td><td class="n">${mm(x => x.sefer)}</td></tr>` : ''}</tbody></table></div>
        ${r.eksik.length ? `<div class="alert" style="margin-top:12px"><b>Karşılanamayan ihtiyaç (${r.eksik.length}):</b> kural ihlali olmadan atanacak kişi bulunamadı.<ul>${r.eksik.slice(0, 12).map(e => `<li>${e.d + 1} ${AYU[vrAyBas(VR.ay).getMonth()]} · ${esc(e.k)} · ${e.eksik} kişi eksik</li>`).join('')}</ul>${r.eksik.length > 12 ? `+${r.eksik.length - 12} daha` : ''}</div>` : '<p class="mini" style="margin-top:10px">Bütün ihtiyaçlar karşılandı.</p>'}
        <div class="acts"><button class="btn pri" data-close>Tamam</button></div>`);
      void k;
    };
  });
}
async function vrSeferYukle(f) {
  if (typeof XLSX === 'undefined' || !XLSX.read) { alertMsg('Excel kütüphanesi yüklenemedi; sayfayı yenileyip tekrar deneyin.'); return; }
  try {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets['Seferler'] || wb.Sheets[wb.SheetNames[0]];
    const S = vrSeferCoz(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }));
    if (!S.length) { alertMsg('Dosyada sefer bulunamadı.'); return; }
    const gun = S.map(s => (s.inis || s.kalkis).slice(0, 10)).sort(), bas = gun[0], bit = gun[gun.length - 1];
    const { error } = await sb.rpc('sefer_yukle', { p_bas: bas, p_bit: bit, p_satirlar: S });
    if (error) { alertMsg('Seferler kaydedilemedi: ' + error.message); return; }
    alertMsg(`${S.length} sefer yüklendi (${fd(bas)} – ${fd(bit)}). Bu tarih aralığındaki eski sefer listesi yenisiyle değiştirildi.`);
    VR.seferYenile = true; const v = $('view'); if (v) vardiyaView(v);
  } catch (e) { alertMsg('Sefer dosyası okunamadı: ' + e.message); }
}
function vrSeferPanel() {
  const S = VR.seferler || [], O = vrOto(VR.ayar);
  const yaz = VR.yaz;
  return `<details class="panel v-sefer" style="margin-top:16px"${S.length ? '' : ' open'}><summary><h3 style="display:inline">Sefer programı · ${S.length} sefer</h3>
    ${yaz ? `<label class="btn sm" style="margin-left:10px" onclick="event.stopPropagation()">Sefer Excel'i yükle<input type="file" id="v_sefer" accept=".xlsx,.xlsm,.xls" hidden></label>` : ''}</summary>
    ${S.length ? `<div class="tbl" style="margin-top:10px;max-height:340px"><table><thead><tr><th>Uçuş</th><th>Havayolu</th><th>Durum</th><th>İniş</th><th>Kalkış</th><th>Personel penceresi</th></tr></thead><tbody>
      ${S.map(s => `<tr><td><b>${esc(s.ucus_no)}</b> <span class="mini">${esc(s.amac || '')}</span></td><td>${esc(s.havayolu || '')}</td><td class="mini">${esc(s.durum || '')}</td>
      <td>${s.inis ? fd(s.inis.slice(0, 10)) + ' ' + s.inis.slice(11, 16) : '—'}</td><td>${s.kalkis ? fd(s.kalkis.slice(0, 10)) + ' ' + s.kalkis.slice(11, 16) : '—'}</td>
      <td class="mini">${vrSeferOlay(s, O).map(o => `${vrDkIso(o.bas).slice(8, 10)}.${vrDkIso(o.bas).slice(5, 7)} ${vrDkIso(o.bas).slice(11)}–${vrDkIso(o.bit).slice(11)}`).join(' · ')}</td></tr>`).join('')}</tbody></table></div>`
      : `<p class="mini" style="margin-top:8px">Bu ay için sefer yok. Operasyonun "Umre Seferleri Planlama Tablosu" dosyasını yükleyin (Seferler sayfası okunur). Yüklenen seferler tüm birimlerde kullanılır.</p>`}</details>`;
}
