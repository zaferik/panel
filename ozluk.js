/* Zafer İK · Özlük Dosyası
   Fotoğraf, nüfus kayıt örneği, adres belgesi, adli sicil kaydı, diploma.
   Personel yükler → İK onaylar. Yönetici yüklediğinde evrak doğrudan onaylı olur.
   Dosyalar gizli "ozluk" deposunda {sicil}/… altında; kısa süreli imzalı bağlantıyla açılır. */
'use strict';
const OZ_TUR = [
  { k: 'foto', ad: 'Vesikalık fotoğraf', acik: 'Düz zeminli, yüzün net göründüğü güncel fotoğraf', ikon: 'kisi', foto: true },
  { k: 'nufus', ad: 'Nüfus kayıt örneği', acik: 'Kimlik / nüfus cüzdanı sureti', ikon: 'kart' },
  { k: 'adres', ad: 'Yerleşim yeri belgesi', acik: 'Güncel adres belgesi', ikon: 'ev' },
  { k: 'adli_sicil', ad: 'Adli sicil kaydı', acik: 'Son 6 ay içinde alınmış olmalı', ikon: 'kalkan' },
  { k: 'diploma', ad: 'Okul diploması', acik: 'En son mezun olunan okul', ikon: 'kitap' },
];
const OZ_AD = Object.fromEntries(OZ_TUR.map(t => [t.k, t.ad]));
const OZ_IKON = Object.assign({}, typeof EK_IKON !== 'undefined' ? EK_IKON : {}, { ev: 'M4 11l8-7 8 7v9.5H4zM9.5 20.5v-6h5v6' });
const ozIkon = (k, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${OZ_IKON[k] || OZ_IKON.belge || ''}"/></svg>`;
const OZ_BUCKET = 'ozluk';
const ozUrlCache = {};

async function ozUrl(path) {
  const c = ozUrlCache[path]; if (c && c.t > Date.now()) return c.u;
  const { data, error } = await sb.storage.from(OZ_BUCKET).createSignedUrl(path, 600);
  if (error) throw error;
  ozUrlCache[path] = { u: data.signedUrl, t: Date.now() + 540000 }; return data.signedUrl;
}
async function ozAc(path) {
  const w = window.open('', '_blank');   // açılır pencere engelini aşmak için önce boş pencere
  try { const u = await ozUrl(path); if (w) w.location = u; else location.href = u; }
  catch (e) { if (w) w.close(); alertMsg('Dosya açılamadı: ' + e.message); }
}

// Görseli küçültür (fotoğraf 700px, belge görseli 2000px) → JPEG
function ozKucult(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob(b => b ? res(b) : rej(new Error('Görsel işlenemedi')), 'image/jpeg', 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Görsel açılamadı; JPG veya PNG seçin')); };
    img.src = u;
  });
}
async function ozHazirla(file, tur) {
  const ok = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!ok.includes(file.type)) throw new Error('Yalnızca PDF, JPG veya PNG yükleyebilirsiniz.');
  if (tur === 'foto') { if (file.type === 'application/pdf') throw new Error('Fotoğraf için JPG veya PNG seçin.'); return { blob: await ozKucult(file, 700), mime: 'image/jpeg', ext: 'jpg' }; }
  if (file.type !== 'application/pdf' && file.size > 1.5 * 1024 * 1024) return { blob: await ozKucult(file, 2000), mime: 'image/jpeg', ext: 'jpg' };
  if (file.size > 10 * 1024 * 1024) throw new Error('Dosya 10 MB\'tan büyük olamaz.');
  return { blob: file, mime: file.type, ext: file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg' };
}
// Tek evrak yükler. Yönetici → onaylı; personel → onay bekler (önceki bekleyeni geri çeker)
async function ozYukle(sicil, tur, file) {
  const admin = ME.profile.role === 'admin';
  const h = await ozHazirla(file, tur);
  const path = `${sicil}/${tur}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${h.ext}`;
  const up = await sb.storage.from(OZ_BUCKET).upload(path, h.blob, { contentType: h.mime, upsert: false });
  if (up.error) throw new Error('Dosya yüklenemedi: ' + up.error.message);
  if (!admin) await sb.from('ozluk_evrak').delete().eq('sicil', sicil).eq('tur', tur).eq('durum', 'bekliyor');
  const { error } = await sb.from('ozluk_evrak').insert({ sicil, tur, dosya_yolu: path, dosya_adi: file.name.slice(0, 200), mime: h.mime, boyut: h.blob.size, durum: admin ? 'onaylandi' : 'bekliyor' });
  if (error) throw new Error('Kaydedilemedi: ' + error.message);
}
function ozDurum(rows) {   // tür → { gecerli, bekleyen, red }
  const m = {};
  OZ_TUR.forEach(t => {
    const r = rows.filter(x => x.tur === t.k);
    const gecerli = r.find(x => x.durum === 'onaylandi') || null, bekleyen = r.find(x => x.durum === 'bekliyor') || null;
    const red = r.find(x => x.durum === 'reddedildi' && (!gecerli || x.created_at > gecerli.created_at) && !bekleyen) || null;
    m[t.k] = { gecerli, bekleyen, red };
  });
  return m;
}

// Kişinin dosya sayfasına (Dosyam / yönetici kişi sayfası) özlük kutusunu ve fotoğrafı yerleştirir
async function ozlukBagla(view, sicil, admin) {
  const box = view.querySelector('#oz_box'); if (!box) return;
  const ciz = async () => {
    let rows = [];
    try { const r = await sb.from('ozluk_evrak').select('*').eq('sicil', sicil).order('created_at', { ascending: false }); if (r.error) throw r.error; rows = r.data || []; }
    catch (e) { box.innerHTML = admin ? `<div class="panel oz"><h3>Özlük Dosyası</h3><p class="mini">Özlük dosyası için <b>10_ozluk_evrak.sql</b> dosyasını Supabase SQL Editor'da çalıştırın.</p></div>` : ''; return; }
    const D = ozDurum(rows), tamam = OZ_TUR.filter(t => D[t.k].gecerli).length;
    // fotoğraf
    const badge = view.querySelector('.dossier-head .badge');
    const foto = D.foto.gecerli || (!admin && D.foto.bekleyen) || null;
    if (badge && foto) ozUrl(foto.dosya_yolu).then(u => { badge.classList.add('foto'); badge.innerHTML = `<img src="${esc(u)}" alt="">`; }).catch(() => {});
    const eksik = OZ_TUR.filter(t => !D[t.k].gecerli && !D[t.k].bekleyen);
    box.innerHTML = `<div class="panel oz">
      <div class="oz-bas"><h3>Özlük Dosyası</h3><span class="oz-oran"><i><b style="width:${tamam / OZ_TUR.length * 100}%"></b></i>${tamam}/${OZ_TUR.length} evrak</span></div>
      ${!admin && eksik.length ? `<div class="oz-uyari">${ozIkon('uyari', 18)}<span>Özlük dosyanızda eksik evrak var: <b>${eksik.map(t => esc(t.ad)).join(', ')}</b>. Aşağıdan yükleyebilirsiniz; İnsan &amp; Kültür onayladıktan sonra dosyanıza işlenir.</span></div>` : ''}
      <div class="oz-liste">${OZ_TUR.map(t => { const d = D[t.k];
        const durum = d.bekleyen ? `<span class="pill p-bekliyor">Onay bekliyor</span>` : d.gecerli ? `<span class="pill p-onaylandi">Tamam · ${fd((d.gecerli.karar_tarihi || d.gecerli.created_at).slice(0, 10))}</span>` : d.red ? `<span class="pill p-reddedildi">Reddedildi</span>` : `<span class="pill p-iptal">Eksik</span>`;
        return `<div class="oz-satir" data-tur="${t.k}"><span class="oz-ik">${ozIkon(t.ikon)}</span>
          <div class="oz-ad"><b>${esc(t.ad)}</b><span class="mini">${d.red && !d.bekleyen ? `Ret nedeni: ${esc(d.red.admin_notu || 'belirtilmedi')} · yeniden yükleyin` : esc(t.acik)}</span></div>
          <div class="oz-dr">${durum}</div>
          <div class="oz-is">
            ${d.gecerli ? `<button class="btn sm" data-ac="${esc(d.gecerli.dosya_yolu)}">Görüntüle</button>` : ''}
            ${d.bekleyen ? `<button class="btn sm" data-ac="${esc(d.bekleyen.dosya_yolu)}">${admin ? 'Yükleneni gör' : 'Yüklediğim'}</button>` : ''}
            ${admin && d.bekleyen ? `<button class="btn sm ok" data-onay="${d.bekleyen.id}">Onayla</button><button class="btn sm bad" data-red="${d.bekleyen.id}">Reddet</button>` : ''}
            <label class="btn sm${!d.gecerli && !d.bekleyen ? ' pri' : ''}">${d.gecerli || d.bekleyen ? 'Yenile' : 'Yükle'}<input type="file" hidden accept="${t.foto ? 'image/jpeg,image/png' : 'application/pdf,image/jpeg,image/png'}" data-yukle="${t.k}"></label>
            ${admin && d.gecerli ? `<button class="btn sm" data-kaldir="${d.gecerli.id}" title="Evrakı dosyadan kaldır">Kaldır</button>` : ''}
          </div></div>`; }).join('')}</div>
      <div id="oz_m"></div>
      <p class="mini" style="margin:10px 0 0">${admin ? 'Yüklediğiniz evrak doğrudan onaylı olur. PDF, JPG veya PNG; en fazla 10 MB.' : 'PDF, JPG veya PNG yükleyebilirsiniz (en fazla 10 MB). Telefonla çekilen fotoğraflar da kabul edilir; belgenin tamamı okunaklı olsun.'}</p></div>`;
    const m = box.querySelector('#oz_m');
    box.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => ozAc(b.dataset.ac));
    box.querySelectorAll('[data-yukle]').forEach(inp => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; const lbl = inp.closest('label'); lbl.classList.add('yukleniyor'); m.innerHTML = '<div class="msg info">Yükleniyor…</div>';
      try { await ozYukle(sicil, inp.dataset.yukle, f); await ciz(); box.querySelector('#oz_m').innerHTML = `<div class="msg ok">${admin ? 'Evrak dosyaya eklendi.' : 'Evrakınız iletildi; İnsan &amp; Kültür onayladıktan sonra dosyanıza işlenecek.'}</div>`; if (admin) bekleyenSay(); }
      catch (e) { m.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; lbl.classList.remove('yukleniyor'); }
    });
    box.querySelectorAll('[data-onay],[data-red]').forEach(b => b.onclick = () => ozKarar(+(b.dataset.onay || b.dataset.red), !!b.dataset.onay, ciz));
    box.querySelectorAll('[data-kaldir]').forEach(b => b.onclick = () => modal(`<h3>Evrak kaldırılsın mı?</h3><p>Bu evrak özlük dosyasından kaldırılacak.</p><div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn bad" id="oz_evet">Kaldır</button></div>`, (bg, close) => {
      bg.querySelector('#oz_evet').onclick = async () => { close(); const { error } = await sb.from('ozluk_evrak').update({ durum: 'eski' }).eq('id', +b.dataset.kaldir); if (error) alertMsg(error.message); ciz(); }; }));
  };
  box.innerHTML = '<div class="panel oz"><h3>Özlük Dosyası</h3><p class="mini">Yükleniyor…</p></div>';
  await ciz();
}
function ozKarar(id, onay, done) {
  if (onay) { sb.from('ozluk_evrak').update({ durum: 'onaylandi', karar_tarihi: new Date().toISOString(), karar_veren: ME.user.id }).eq('id', id).then(({ error }) => { if (error) alertMsg(error.message); done(); bekleyenSay(); }); return; }
  modal(`<h3>Evrakı reddet</h3><form class="form" id="ozf"><label>Ret nedeni (personel görür)<textarea id="ozn" maxlength="300" placeholder="Örn. Belge okunmuyor, lütfen yeniden çekin."></textarea></label>
    <div class="acts"><button type="button" class="btn" data-close>Vazgeç</button><button class="btn bad" type="submit">Reddet</button></div></form>`, (bg, close) => {
    bg.querySelector('#ozf').onsubmit = async e => { e.preventDefault();
      const { error } = await sb.from('ozluk_evrak').update({ durum: 'reddedildi', admin_notu: bg.querySelector('#ozn').value.trim() || null, karar_tarihi: new Date().toISOString(), karar_veren: ME.user.id }).eq('id', id);
      close(); if (error) alertMsg(error.message); done(); bekleyenSay(); };
  });
}

// ---------------- Talepler > Özlük evrakı (yönetici) ----------------
async function ozTalepListe(box, countEl) {
  let r;
  try { r = await sb.from('ozluk_evrak').select('*').eq('durum', 'bekliyor').order('created_at'); } catch (e) { r = { error: e }; }
  box.className = '';
  if (r.error) { box.innerHTML = `<div class="panel"><p class="mini">Özlük dosyası için <b>10_ozluk_evrak.sql</b> dosyasını Supabase SQL Editor'da çalıştırın.</p></div>`; return; }
  const L = r.data || []; if (countEl) countEl.textContent = L.length + ' kayıt';
  if (!L.length) { box.innerHTML = '<div class="panel"><p class="mini">Onay bekleyen özlük evrakı yok.</p></div>'; return; }
  const ad = s => (DATA.byS[s] && DATA.byS[s].ad) || s;
  box.innerHTML = `<div class="oz-kartlar">${L.map(t => `<div class="panel oz-kart" data-id="${t.id}">
      <div class="oz-onizle" data-ac="${esc(t.dosya_yolu)}">${t.mime && t.mime.startsWith('image/') ? '<span class="mini">Yükleniyor…</span>' : `<span class="oz-pdf">PDF</span>`}</div>
      <div><b>${esc(ad(t.sicil))}</b><br><span class="mini">${esc(t.sicil)} · ${esc(OZ_AD[t.tur] || t.tur)}<br>${fdt(t.created_at)}</span></div>
      <div class="actions"><button class="btn sm" data-ac="${esc(t.dosya_yolu)}">Aç</button><button class="btn sm ok" data-onay="${t.id}">Onayla</button><button class="btn sm bad" data-red="${t.id}">Reddet</button><a class="btn sm" href="#p-${esc(t.sicil)}">Dosyası</a></div></div>`).join('')}</div>`;
  box.querySelectorAll('.oz-kart').forEach(k => { const t = L.find(x => x.id === +k.dataset.id); if (t.mime && t.mime.startsWith('image/')) ozUrl(t.dosya_yolu).then(u => { k.querySelector('.oz-onizle').innerHTML = `<img src="${esc(u)}" alt="">`; }).catch(() => {}); });
  box.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => ozAc(b.dataset.ac));
  box.querySelectorAll('[data-onay],[data-red]').forEach(b => b.onclick = () => ozKarar(+(b.dataset.onay || b.dataset.red), !!b.dataset.onay, () => ozTalepListe(box, countEl)));
}

// ---------------- Veri Yükle > Toplu özlük yükleme ve durum (yönetici) ----------------
const OZ_ESANLAM = { foto: 'foto', fotograf: 'foto', resim: 'foto', vesikalik: 'foto', nufus: 'nufus', kimlik: 'nufus', nufuskayit: 'nufus', adres: 'adres', ikametgah: 'adres', yerlesim: 'adres', adli: 'adli_sicil', adlisicil: 'adli_sicil', sicil: 'adli_sicil', diploma: 'diploma', mezuniyet: 'diploma' };
function ozDosyaAdiCoz(ad) {
  const m = fold(ad).replace(/\.[a-z0-9]+$/, '').match(/^(\d{3,8})[\s_\-.]+([a-z_ ]+)/);
  if (!m) return null;
  const tur = OZ_ESANLAM[m[2].replace(/[\s_]/g, '')] || OZ_ESANLAM[m[2].split(/[\s_]/)[0]];
  return tur ? { sicil: m[1], tur } : null;
}
async function ozTopluBagla(el) {
  el.innerHTML = `<div class="panel" style="margin-top:22px"><h3>Özlük Dosyası · toplu yükleme</h3>
    <p class="mini" style="margin-top:-4px">Dosyaları <b>sicil_tür</b> biçiminde adlandırıp hepsini birden seçin: <code>31776_foto.jpg</code>, <code>31808_nufus.pdf</code>, <code>31808_adres.pdf</code>, <code>31808_adli.pdf</code>, <code>31808_diploma.pdf</code>. Yüklenenler doğrudan onaylı olur.</p>
    <label class="drop" style="margin-top:10px"><b>Dosyaları seçin veya buraya bırakın</b><span class="mini">PDF, JPG, PNG · birden çok dosya</span><input type="file" id="oz_tf" multiple accept="application/pdf,image/jpeg,image/png"></label>
    <div id="oz_tp"></div><div id="oz_ozet" style="margin-top:16px"></div></div>`;
  let liste = [];
  $('oz_tf').onchange = () => {
    liste = [...$('oz_tf').files].map(f => { const c = ozDosyaAdiCoz(f.name); const p = c && DATA.byS[c.sicil];
      return { f, c, p, hata: !c ? 'Ad anlaşılamadı' : !p ? 'Sicil bulunamadı' : '' }; });
    const ok = liste.filter(x => !x.hata);
    $('oz_tp').innerHTML = `<div class="tbl" style="margin-top:12px;max-height:340px"><table><thead><tr><th>Dosya</th><th>Personel</th><th>Evrak</th><th>Durum</th></tr></thead><tbody>${liste.map((x, i) => `<tr><td>${esc(x.f.name)}</td><td>${x.p ? esc(x.p.ad) + ` <span class="mini">${esc(x.c.sicil)}</span>` : '—'}</td><td>${x.c ? esc(OZ_AD[x.c.tur]) : '—'}</td><td id="oz_d${i}">${x.hata ? `<span class="pill p-reddedildi">${x.hata}</span>` : '<span class="pill p-iptal">Hazır</span>'}</td></tr>`).join('')}</tbody></table></div>
      <div class="actions" style="margin-top:10px"><button class="btn pri" id="oz_tb"${ok.length ? '' : ' disabled'}>${ok.length} dosyayı yükle</button></div>`;
    $('oz_tb').onclick = async () => {
      $('oz_tb').disabled = true; let n = 0;
      for (let i = 0; i < liste.length; i++) { const x = liste[i]; if (x.hata) continue; const td = $('oz_d' + i); td.innerHTML = '<span class="pill p-bekliyor">Yükleniyor…</span>';
        try { await ozYukle(x.c.sicil, x.c.tur, x.f); td.innerHTML = '<span class="pill p-onaylandi">Yüklendi</span>'; n++; } catch (e) { td.innerHTML = `<span class="pill p-reddedildi">${esc(e.message)}</span>`; } }
      $('oz_tb').textContent = `${n} dosya yüklendi`; ozOzet();
    };
  };
  const ozOzet = async () => {
    let r; try { r = await fetchAll('ozluk_evrak', 'sicil,tur,durum', q => q.in('durum', ['onaylandi', 'bekliyor'])); } catch (e) { $('oz_ozet').innerHTML = `<p class="mini">Özlük dosyası için <b>10_ozluk_evrak.sql</b> dosyasını çalıştırın.</p>`; return; }
    const var_ = {}; r.forEach(x => { if (x.durum === 'onaylandi') (var_[x.sicil] = var_[x.sicil] || new Set()).add(x.tur); });
    const N = DATA.ACT.length;
    $('oz_ozet').innerHTML = `<p class="mini" style="font-weight:600;margin-bottom:6px">Etkin personelde tamamlanma</p><div class="oz-ozet">${OZ_TUR.map(t => { const n = DATA.ACT.filter(p => var_[p.sicil] && var_[p.sicil].has(t.k)).length;
      return `<div><span>${esc(t.ad)}</span><b>${n}<small> / ${N}</small></b><i><b style="width:${N ? n / N * 100 : 0}%"></b></i></div>`; }).join('')}</div>
      <div class="actions" style="margin-top:10px"><button class="btn sm" id="oz_csv">Eksik evrak listesi (CSV)</button></div>`;
    $('oz_csv').onclick = () => csvIndir('ozluk-eksikler.csv', [['Ad Soyad', 'Sicil', 'Departman', ...OZ_TUR.map(t => t.ad)],
      ...DATA.ACT.map(p => [p.ad, p.sicil, p.dep, ...OZ_TUR.map(t => var_[p.sicil] && var_[p.sicil].has(t.k) ? 'Var' : 'Eksik')])]);
  };
  ozOzet();
}
