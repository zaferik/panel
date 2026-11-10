/* Zafer İK · Personel gözüyle önizleme (yalnızca yönetici)
   Yönetici, bir personelin panelini onun göreceği şekilde görür. Hiçbir işlem yapılamaz:
   veritabanına yazma, dosya yükleme, onay, hesap işlemleri bu modda engellenir.
   Veriler yöneticinin oturumuyla okunur ve personelin görebileceği kadarına süzülür. */
'use strict';
let ONIZ = null;   // { sicil, ad, me, data, sb }

const ONIZ_ENGEL = { data: null, error: { message: 'Önizleme modunda işlem yapılamaz. Önizlemeden çıkıp kendi hesabınızla devam edin.' } };

function onizAltlar(P, X) {   // X'e doğrudan/dolaylı bağlı siciller
  const out = new Set(); let fr = [X];
  for (let d = 0; d < 10 && fr.length; d++) {
    const n = P.filter(p => fr.includes(p.amir_sicil) && p.sicil !== p.amir_sicil && p.sicil !== X && !out.has(p.sicil)).map(p => p.sicil);
    n.forEach(s => out.add(s)); fr = n;
  }
  return out;
}

function onizIstemci(real, X, A, tum) {   // tum: izleyici gibi her şeyi görenler
  const P = A.data.P, byS = A.data.byS, alt = onizAltlar(P, X), gor = new Set([X, ...alt]);
  const kendi = new Set(['ozluk_evrak', 'sertifika', 'el_kitabi_onay', 'profiles']);   // yalnızca kendi satırı
  const kapali = new Set(['rapor', 'sertifika_ayar', 'sertifika_sayac']);              // personel hiç göremez
  const suz = (t, r) => {
    if (!r || r.error || !Array.isArray(r.data) || tum) return r;
    let d = r.data;
    if (kapali.has(t)) d = [];
    else if (t === 'imza') { const g = (A.ayarGenel || {}); if (!g.personel_imzali) d = []; }
    if (t === 'personel') d = d.map(x => x.sicil === X ? x : (({ tc_kimlik, notu, ...k }) => k)(x));
    return { ...r, data: d, count: d.length };
  };
  const SICILLI = new Set(['personel', 'izin_bakiye', 'izin_kayit', 'egitim_durum', 'egitim_kayit', 'izin_talep', 'sertifika', 'sertifika_belge', 'el_kitabi_onay', 'ozluk_evrak', 'profiles']);
  const gorL = [...gor];
  const sar = (q, t, st) => new Proxy(q, {
    get(o, k) {
      if (k === 'select' && st.ilk) return (...a) => { st.ilk = false; let r = o.select(...a);
        if (SICILLI.has(t) && !(tum && t !== 'profiles')) r = kendi.has(t) ? r.eq('sicil', X) : r.in('sicil', gorL);
        return sar(r, t, st); };
      if (['insert', 'update', 'delete', 'upsert'].includes(k)) return () => { st.yaz = true; return sar(o, t, st); };
      if (k === 'then') return (res, rej) => (st.yaz ? Promise.resolve(ONIZ_ENGEL) : o.then(r => suz(t, r))).then(res, rej);
      const v = o[k];
      if (typeof v !== 'function') return v;
      return (...a) => { const r = v.apply(o, a); return r && typeof r === 'object' && typeof r.then === 'function' ? sar(r, t, st) : r; };
    }
  });
  const bakHam = Object.fromEntries((A.data.bakHam || []).map(b => [b.sicil, b]));
  const panelGun = s => (A.data.leaveRecs[s] || []).filter(r => r[4] === 'panel').reduce((a, r) => a + (Number(r[2]) || 0), 0);
  const dogrudan = () => P.filter(p => p.amir_sicil === X && p.sicil !== X && p.durum === 'Etkin');
  const rpc = async (n, a = {}) => {
    if (n === 'bugun_dogan') return real.rpc(n, a);
    if (n === 'ekip_personel') return { data: [...alt].map(s => ({ sicil: s })), error: null };
    if (n === 'ekibim') return { data: dogrudan().map(p => { const b = bakHam[p.sicil] || {}; return { sicil: p.sicil, ad: p.ad, unvan: p.unvan, bolum: p.bolum || p.departman, durum: p.durum, kalan: b.kalan, donem: b.donem, hakedis_tarihi: b.hakedis_tarihi, panel_gun: panelGun(p.sicil) }; }), error: null };
    if (n === 'bilgi_ekip') return { data: P.filter(x => x.durum === 'Etkin' && x.amir_sicil && x.amir_sicil !== x.sicil && x.amir_sicil !== X).map(x => [x, byS[x.amir_sicil]])
      .filter(([x, s]) => s && s.amir_sicil === X && s.amir_sicil !== s.sicil).map(([x, s]) => ({ sicil: x.sicil, ad: x.ad, unvan: x.unvan, bolum: x.bolum || x.departman, sef_sicil: s.sicil, sef_ad: s.ad })), error: null };
    if (n === 'ekip_izinleri') {
      const E = dogrudan(), ss = E.map(p => p.sicil), ad = s => (byS[s] || {}).ad, out = [];
      ss.forEach(s => (A.data.leaveRecs[s] || []).forEach(r => { if (r[0] && r[0] <= a.p_bit && (r[1] || r[0]) >= a.p_bas) out.push({ sicil: s, ad: ad(s), baslangic: r[0], bitis: r[1], gun: r[2], durum: 'onaylandi' }); }));
      if (ss.length) { const { data } = await real.from('izin_talep').select('sicil,baslangic,bitis,gun,durum').in('sicil', ss).in('durum', ['bekliyor', 'sef_onayladi']);
        (data || []).filter(t => t.baslangic <= a.p_bit && t.bitis >= a.p_bas).forEach(t => out.push({ ...t, ad: ad(t.sicil) })); }
      return { data: out.sort((x, y) => String(x.baslangic).localeCompare(String(y.baslangic))), error: null };
    }
    return ONIZ_ENGEL;   // onay, iptal, el kitabı onayı, şifre… hepsi engelli
  };
  return {
    auth: real.auth,
    from: t => sar(real.from(t), t, { yaz: false, ilk: true }),
    rpc,
    storage: { from: b => { const s = real.storage.from(b); return { upload: async () => ONIZ_ENGEL, remove: async () => ONIZ_ENGEL, createSignedUrl: (...a) => s.createSignedUrl(...a) }; } },
    functions: { invoke: async () => ONIZ_ENGEL },
  };
}

async function onizlemeBasla(sicil) {
  if (ME.profile.role !== 'admin' || ONIZ) return;
  const p = DATA.byS[sicil]; if (!p) return;
  app.innerHTML = '<div class="loading">Önizleme hazırlanıyor…</div>';
  let ayarGenel = {};
  try { const { data } = await sb.from('sertifika_ayar').select('deger').eq('anahtar', 'genel').maybeSingle(); ayarGenel = (data && data.deger) || {}; } catch (e) { }
  let rol = 'personel';
  try { const { data } = await sb.from('profiles').select('role').eq('sicil', sicil).maybeSingle(); if (data && data.role !== 'personel') rol = 'izleyici'; } catch (e) { }
  ONIZ = { sicil, ad: p.ad, me: ME, data: DATA, sb, ayarGenel };
  try {
    sb = onizIstemci(ONIZ.sb, sicil, { data: ONIZ.data, ayarGenel }, rol === 'izleyici');
    ME = { user: ONIZ.me.user, profile: { user_id: null, sicil, role: rol, aktif: true, must_change_password: false } };
    ONIZ.rol = rol;
    await loadData(); await ekYukle();
    history.replaceState(null, '', location.pathname + (rol === 'izleyici' ? '#genel' : '#dosyam'));
    shell();
  } catch (e) { await onizlemeBitir(); alertMsg('Önizleme açılamadı: ' + e.message); }
}
async function onizlemeBitir() {
  if (!ONIZ) return;
  const o = ONIZ; ONIZ = null;
  sb = o.sb; ME = o.me; DATA = o.data;
  document.body.classList.remove('onizleme');
  await ekYukle();
  history.replaceState(null, '', location.pathname + '#p-' + o.sicil);
  shell();
}
// Kabuk çizildikten sonra üst banda önizleme şeridini ekler
function onizlemeSerit() {
  document.body.classList.toggle('onizleme', !!ONIZ);
  if (!ONIZ) return;
  const top = document.querySelector('header.top'); if (!top) return;
  const s = document.createElement('div'); s.className = 'oniz-serit';
  s.innerHTML = `<div class="wrap"><span class="oniz-goz" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></span>
    <span><b>${esc(ONIZ.ad)}</b>${ONIZ.rol === 'izleyici' ? ' (İzleyici)' : ''} gözünden görüntülüyorsunuz · yalnızca görüntüleme, hiçbir işlem kaydedilmez</span>
    <button type="button" class="btn sm" id="oniz_cik">Önizlemeden çık</button></div>`;
  top.prepend(s);
  s.querySelector('#oniz_cik').onclick = onizlemeBitir;
  const out = $('outBtn'); if (out) { out.textContent = 'Önizlemeden çık'; out.onclick = onizlemeBitir; }
  const pw = $('pwBtn'); if (pw) pw.hidden = true;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-oniz]'); if (b) onizlemeBasla(b.dataset.oniz); });
