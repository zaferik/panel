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
  const T = { gun: 0, gece: 0, net: 0, gfm: 0, hafta: [0, 0, 0, 0, 0, 0], hata: 0, dinlenme: 0 };
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
      if (net > 0) T.gun++;
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
  let kisi, satir, yayin;
  try {
    const [k, s, y] = await Promise.all([sb.rpc('vardiya_kisiler', { p_birim: VR.birim }),
      sb.from('vardiya').select('sicil,tarih,deger').eq('birim', VR.birim).gte('tarih', bas).lte('tarih', bit),
      sb.from('vardiya_yayin').select('ay,yayin_tarihi').eq('birim', VR.birim).eq('ay', bas).maybeSingle()]);
    if (k.error) throw k.error; if (s.error) throw s.error;
    kisi = k.data || []; satir = s.data || []; yayin = y.data || null;
  } catch (e) { $('v_govde').className = ''; $('v_govde').innerHTML = `<div class="alert">Vardiya verisi okunamadı: ${esc(e.message || e)}</div>`; return; }
  const plan = {}; satir.forEach(r => { (plan[r.sicil] = plan[r.sicil] || Array(n).fill(''))[Number(r.tarih.slice(8, 10)) - 1] = r.deger; });
  // Satırlar: etkin birim personeli + bu ay planı olanlar (ayrılmış olsa bile)
  kisi = kisi.filter(p => p.durum === 'Etkin' || plan[p.sicil]);
  kisi.forEach(p => { plan[p.sicil] = plan[p.sicil] || Array(n).fill(''); });
  Object.assign(VR, { kisi, plan, n, yayin, kirli: false, yaz });
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
  const gunH = Array.from({ length: n }, (_, d) => { const w = (wd0 + d) % 7; return `<th class="v-g${w >= 5 ? ' v-hs' : ''}${vrIso(ay, d) === ISO_TODAY ? ' v-bugun' : ''}"><b>${d + 1}</b><small>${VR_GUN[w]}</small></th>`; }).join('');
  const izinS = Object.fromEntries(kisi.map(p => [p.sicil, GOREN() ? vrIzinGunleri(p.sicil, ay) : new Set()]));
  const kalip = [...(ayar.kaliplar || []), ...VR_IZINLI.slice(0, 3)];
  g.innerHTML = `
  <div class="v-durum">
    ${yayin ? `<span class="pill p-onaylandi">Yayında</span><span class="mini">${fdt(yayin.yayin_tarihi)} · personel kendi vardiyasını görüyor</span>` : '<span class="pill p-bekliyor">Taslak</span><span class="mini">Personel henüz görmüyor</span>'}
    <span class="v-bosluk"></span>
    ${yaz ? `<label class="btn sm" title="Fazla Mesai Hesaplama Excel dosyasındaki Günlük Saatler sayfasını içeri alır">Excel'den al<input type="file" id="v_al" accept=".xlsx,.xlsm,.xls" hidden></label>` : ''}
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
    <div class="tbl"><table id="v_ozet"></table></div></div>`;
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
  t.innerHTML = `<thead><tr><th>Ad Soyad</th><th class="n">Gün</th><th class="n">Gece</th><th class="n">Net saat</th>${H.map((h, i) => h ? `<th class="n">${i + 1}. hafta<br><span class="mini">${h}</span></th>` : '').join('')}<th class="n">Günlük FM</th><th class="n">Haftalık FM</th><th class="n">Toplam FM</th><th>Uyarı</th></tr></thead>
  <tbody>${L.map(({ p, T }) => `<tr><td>${esc(p.ad)} <span class="mini">${esc(p.sicil)}</span></td><td class="n">${T.gun || ''}</td><td class="n">${T.gece || ''}</td><td class="n">${vrSa(T.net)}</td>
    ${H.map((h, i) => h ? `<td class="n${T.hafta[i] > VR.ayar.haftalik ? ' neg' : ''}">${vrSa(T.hafta[i])}</td>` : '').join('')}
    <td class="n">${vrSa(T.gfm)}</td><td class="n">${vrSa(T.hfm)}</td><td class="n"><b>${vrSa(T.fm)}</b></td>
    <td class="mini">${[T.hata ? `${T.hata} hatalı giriş` : '', T.dinlenme ? `Dinlenme < ${fn(VR.ayar.dinlenme)} saat: ${T.dinlenme} kez` : ''].filter(Boolean).join(' · ')}</td></tr>`).join('')}
  <tr class="v-toplam"><td><b>Toplam · ${L.length} kişi</b></td><td class="n">${top('gun')}</td><td class="n">${top('gece')}</td><td class="n">${vrSa(top('net'))}</td>${H.map((h, i) => h ? `<td class="n">${vrSa(L.reduce((a, x) => a + x.T.hafta[i], 0))}</td>` : '').join('')}<td class="n">${vrSa(top('gfm'))}</td><td class="n">${vrSa(top('hfm'))}</td><td class="n"><b>${vrSa(top('fm'))}</b></td><td></td></tr></tbody>`;
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
  const A = { ...VR_VARSAYILAN, ...(bir.ayar || {}) };
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
