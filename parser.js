/* Zafer İK · Excel okuyucu
   Üç dosyayı (Güncel Database, Yıllık İzin Takip, SHGM Eğitim Takip) okuyup
   veritabanı tablolarına yazılacak paketi üretir. Tarayıcıda SheetJS ile,
   testte satır dizileriyle çalışır: rows(dosya, sayfa) -> [[A1,B1,...],[A2,...]] (0 tabanlı). */
(function (root) {
  const AYLAR = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];

  function s(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' && Number.isInteger(v)) v = String(v);
    const t = String(v).trim();
    return t === '' ? null : t;
  }
  function sic(v) {
    let t = s(v);
    if (t === null) return null;
    t = t.replace(/\.0$/, '');
    return t.toLowerCase() === 'nan' ? null : t;
  }
  function num(v) {
    if (typeof v === 'number') return Math.round(v * 100) / 100;
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : Math.round(n * 100) / 100;
  }
  const pad = n => String(n).padStart(2, '0');
  // Excel seri tarihi, Date veya "gg.aa.yyyy" -> "yyyy-aa-gg"
  function d(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
    if (typeof v === 'number') {
      if (v < 1000 || v > 80000) return null;
      const dt = new Date(Math.round((v - 25569) * 86400000));
      return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
    }
    const m = String(v).trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).slice(0, 10);
    return null;
  }
  function nk(n) {
    return (n || '').trim().toLocaleUpperCase('tr-TR')
      .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
      .replace(/\./g, '').replace(/\s+/g, ' ');
  }
  const g = (r, i) => (r && i < r.length ? r[i] : null);

  function sonAySayfasi(names) {
    let best = null, bi = -1;
    for (const n of names) {
      const i = AYLAR.indexOf(n.trim().toLocaleUpperCase('tr-TR'));
      if (i > bi) { bi = i; best = n; }
    }
    return best;
  }

  /* files: { db: {names:[...], rows:(sheet)=>[][]}, izin: {...}, egitim: {...} } — herhangi biri eksik olabilir */
  function parse(files) {
    const notlar = [], uyarilar = [];
    const people = new Map();
    const out = { personel: [], rapor: {} };

    // ---------------- 1) GÜNCEL DATABASE ----------------
    if (files.db) {
      const ay = sonAySayfasi(files.db.names);
      if (!ay) throw new Error('Database dosyasında ay sayfası (OCAK…ARALIK) bulunamadı.');
      const readDb = (sheet, status) => {
        const rows = files.db.rows(sheet);
        // başlık satırını bul ("SİCİL NO" geçen satır)
        let h = rows.findIndex(r => r && r.some(c => s(c) && s(c).toLocaleUpperCase('tr-TR') === 'SİCİL NO'));
        if (h < 0) { uyarilar.push(`${sheet}: başlık satırı bulunamadı`); return; }
        // AMİR SİCİL sütunu başlığından bulunur (Database'de herhangi bir yere eklenebilir)
        const ai = rows[h].findIndex(c => nk(s(c) || '').includes('AMIR'));
        for (const r of rows.slice(h + 1)) {
          if (!g(r, 3)) continue;
          const mail = s(g(r, 26));
          const p = {
            sicil: sic(g(r, 1)), ad: s(g(r, 3)), departman: s(g(r, 4)), bolum: s(g(r, 5)), alt_bolum: s(g(r, 6)), unvan: s(g(r, 7)),
            pozisyon: s(g(r, 8)), sirket: s(g(r, 9)), cinsiyet: s(g(r, 10)), dogum: d(g(r, 11)), gruba_giris: d(g(r, 13)), sirket_giris: d(g(r, 15)),
            calisan_grubu: s(g(r, 16)), by_my: s(g(r, 17)), grade: s(g(r, 18)), ogrenim: s(g(r, 19)), okul: s(g(r, 20)), okul_bolum: s(g(r, 21)),
            gsm: s(g(r, 22)), tc_kimlik: s(g(r, 2)), durum: status || s(g(r, 23)), calisma_yeri: s(g(r, 24)), norm: s(g(r, 25)), mail,
            notu: s(g(r, 27)), cikis: d(g(r, 28)), cikis_nedeni: s(g(r, 29)), shgm_ek_gorev: null,
            amir_sicil: ai >= 0 ? sic(g(r, ai)) : null
          };
          people.set(p.sicil || ('ad:' + p.ad), p);
        }
      };
      const cik = files.db.names.find(n => n.toLocaleUpperCase('tr-TR').includes('ÇIKIŞ'));
      if (cik) readDb(cik, 'Pasif');
      readDb(ay, null);
      out.rapor.db_donem = ay.trim();
      out.rapor.amir_sutunu = [...people.values()].some(p => p.amir_sicil);
    }
    const byName = () => { const m = new Map(); for (const [k, p] of people) m.set(nk(p.ad), k); return m; };
    let BN = byName();

    // ---------------- 2) YILLIK İZİN ----------------
    if (files.izin) {
      const R = files.izin.rows;
      const leave = new Map(), lp = new Map();
      for (const r of R('Personel').slice(1)) {
        if (!g(r, 0)) continue;
        const k = sic(r[0]);
        lp.set(k, r);
        leave.set(k, { sicil: k, ad: s(r[1]), birim: s(r[2]), hakedis_tarihi: d(r[7]), yasal_asgari: num(r[11]), devreden: num(r[12]),
          hakedis: num(r[13]), uyari: s(g(r, 15)), notu: s(g(r, 16)), kullanim: null, kalan: null });
      }
      for (const r of R('Kullanım').slice(1)) { const L = leave.get(sic(g(r, 0))); if (L) L.kullanim = r.slice(3, 15).map(x => num(x) || 0); }
      for (const r of R('Aylık Kalan').slice(2)) { const L = leave.get(sic(g(r, 0))); if (L) L.kalan = r.slice(3, 15).map(x => num(x)); }
      const recs = [];
      for (const r of R('İzin Kayıtları').slice(1)) {
        if (!g(r, 0) || g(r, 3) === null || g(r, 3) === undefined) continue;
        recs.push({ ad: s(r[0]), sicil: sic(r[1]), baslangic: d(r[3]), bitis: d(r[4]), gun: num(r[5]), aciklama: s(g(r, 8)) });
      }
      // sicil eşleştirme
      for (const [k, L] of [...leave]) {
        if (people.has(k) || !files.db) continue;
        const pk = BN.get(nk(L.ad));
        if (pk !== undefined) {
          const p = people.get(pk);
          if (!p.sicil) { people.delete(pk); p.sicil = k; people.set(k, p); notlar.push(`${p.ad}: veritabanında sicil boş, izin dosyasındaki ${k} kullanıldı`); }
          else {
            notlar.push(`${p.ad}: sicil veritabanında ${pk}, izin dosyasında ${k}`);
            leave.delete(k); L.sicil = pk; leave.set(pk, L);
            recs.forEach(x => { if (x.sicil === k) x.sicil = pk; });
          }
        } else {
          const r = lp.get(k);
          people.set(k, { sicil: k, ad: s(r[1]), departman: s(r[2]), bolum: s(r[2]), unvan: s(r[3]), dogum: d(r[4]), gruba_giris: d(r[5]),
            sirket_giris: d(r[6]), durum: 'Etkin', sirket: 'Zafer Havalimanı', notu: 'Güncel veritabanında henüz yok; bilgiler izin dosyasından' });
          notlar.push(`${s(r[1])}: güncel veritabanında yok, izin dosyasından eklendi`);
        }
        BN = byName();
      }
      recs.forEach(x => { if (!x.sicil) x.sicil = BN.get(nk(x.ad)) || null; });
      const ozet = R('Özet');
      const donem = num(g(ozet[3], 3)) || 12;
      out.izin_bakiye = [...leave.values()].map(L => ({ sicil: L.sicil, yil: num(g(R('Ayarlar')[1], 1)) || new Date().getFullYear(), donem, birim: L.birim,
        hakedis_tarihi: L.hakedis_tarihi, yasal_asgari: L.yasal_asgari, devreden: L.devreden, hakedis: L.hakedis,
        kullanim: L.kullanim, kalan: L.kalan, uyari: L.uyari, notu: L.notu }));
      out.izin_kayit = recs.filter(x => x.sicil).map(({ ad, ...x }) => x);
      // birim özeti ve aylık gelişim: Özet sayfasındaki tablolar
      const birim = [], aylik = [];
      let i = ozet.findIndex(r => r && s(g(r, 1)) === 'Birim' && s(g(r, 2)) === 'Kişi');
      if (i >= 0) for (const r of ozet.slice(i + 1)) {
        const b = s(g(r, 1)); if (!b || b === 'TOPLAM') break;
        birim.push({ birim: b, kisi: num(r[2]), devreden: num(r[3]), hakedis: num(r[4]), kullanilan: num(r[5]), kalan: num(r[6]), hedefGun: num(r[9]), hedefOran: num(r[10]) });
      }
      i = ozet.findIndex(r => r && s(g(r, 1)) === 'Ay');
      if (i >= 0) for (const r of ozet.slice(i + 1, i + 13)) aylik.push({ ay: s(g(r, 1)), hakedis: num(g(r, 2)), kullanilan: num(g(r, 3)), kalan: num(g(r, 4)) });
      out.rapor.izin_birim = birim; out.rapor.izin_aylik = aylik; out.rapor.izin_donem = donem;
    }

    // ---------------- 3) SHGM EĞİTİM ----------------
    if (files.egitim) {
      const R = files.egitim.rows;
      const egp = new Map();
      for (const r of R('Personel').slice(4)) {
        if (!g(r, 1)) continue;
        const k = sic(r[0]) || BN.get(nk(r[1])) || null;
        egp.set(nk(r[1]), k);
        const p = k && people.get(k);
        if (p) p.shgm_ek_gorev = s(g(r, 5));
      }
      const keyFor = name => { const n = nk(name); return egp.get(n) || BN.get(n) || null; };
      const durum = [], eksik = new Map(), kayit = [];
      const yeniDuzen = (files.egitim.names || []).includes('Tüm Kayıtlar') || R('Tüm Kayıtlar').length > 0;
      if (!yeniDuzen) {
        // Eski düzen: Takip Paneli + Kayıt Defteri (Excel'in hesapladığı değerler)
        for (const r of R('Takip Paneli').slice(4)) {
          if (!g(r, 0) || g(r, 5) !== 'EVET') continue;
          const k = keyFor(r[0]);
          if (!k) { eksik.set(r[0], 1); continue; }
          durum.push({ sicil: k, kod: s(r[3]), egitim: s(r[4]), son_tarih: d(r[7]), periyot: num(r[8]), bitis: d(r[9]), kalan_gun: num(r[10]), durum: s(r[11]) });
        }
        for (const r of R('Kayıt Defteri').slice(4)) {
          if (!g(r, 0) || g(r, 4) === null || g(r, 4) === undefined) continue;
          const k = keyFor(r[0]);
          if (!k) continue; // eski/ayrılmış ve listede olmayan personel
          kayit.push({ sicil: k, tarih: d(r[4]) || s(r[4]), egitim: s(r[2]), shgm: s(r[1]), saat: num(r[6]), egitmen: s(g(r, 7)), ic_dis: s(g(r, 8)), tur: s(g(r, 5)) });
        }
      } else {
        // Yeni düzen: Tüm Kayıtlar (arşiv) + Yeni Veri Girişi. Excel formülleri kaydedilirken hesaplanmamış
        // olabileceği için Takip Paneli'nin mantığı burada aynen yeniden hesaplanır.
        const low = v => (s(v) || '').toLocaleLowerCase('tr-TR');
        const P = R('Personel').slice(4).filter(r => g(r, 1));
        const tcAd = new Map(P.filter(r => g(r, 10) !== null && g(r, 10) !== undefined).map(r => [String(r[10]).trim().replace(/\.0$/, ''), s(r[1])]));
        const adAd = new Map(P.map(r => [nk(r[1]), s(r[1])]));
        const kat = R('Eğitim Kataloğu').slice(4, 32).filter(r => g(r, 0) && g(r, 1));
        const GM = R('Gereklilik Matrisi');
        const unv = new Map(), ekg = new Map();
        GM.slice(4, 100).forEach(r => { if (g(r, 0)) unv.set(nk(r[0]), r.slice(2, 30)); });
        GM.slice(103, 107).forEach(r => { if (g(r, 0)) ekg.set(nk(r[0]), r.slice(2, 30)); });
        const ay = R('Ayarlar').find(r => r && /uyarı eşiği/i.test(s(g(r, 0)) || ''));
        const esik = (ay && num(g(ay, 1))) ?? 90;
        const kural = R('Eşleştirme').slice(4, 60).filter(r => g(r, 8) && g(r, 9)).map(r => [low(r[8]), s(r[9])]);
        const tum = [], basMap = {};
        const FR = files.egitim.formulaRows ? files.egitim.formulaRows('Tüm Kayıtlar', 0) : new Set();
        R('Tüm Kayıtlar').forEach((r, i) => {
          if (i < 4 || FR.has(i) || !g(r, 0) || g(r, 4) === null || g(r, 4) === undefined) return;
          if (s(g(r, 11)) === 'Yeni Veri Girişi') return;   // Yeni Veri Girişi'nden akan satırlar aşağıda doğrudan okunur
          tum.push({ ad: s(r[0]), shgm: s(r[1]), egitim: s(r[2]), tarih: d(r[4]) || s(r[4]), tur: s(g(r, 5)), saat: num(g(r, 6)), egitmen: s(g(r, 7)), ic_dis: s(g(r, 8)) });
        });
        R('Yeni Veri Girişi').forEach((r, i) => {
          if (i < 4) return;
          const q = s(g(r, 16)); if (!q) return;
          const tc = g(r, 15) === null || g(r, 15) === undefined ? '' : String(g(r, 15)).trim().replace(/\.0$/, '');
          const ad = tcAd.get(tc) || adAd.get(nk(q)) || q.toLocaleUpperCase('tr-TR');
          const ea = s(g(r, 5)) || '';
          let shgm = s(g(r, 21));
          if (!shgm) { const L = low(ea); const m = kural.find(([k]) => L.includes(k)); shgm = m ? m[1] : null; }
          const tarih = d(g(r, 9)) || d(g(r, 8));
          if (!tarih) return;
          const bas = d(g(r, 8)); if (bas && bas !== tarih && ea) basMap[nk(ea) + '|' + tarih] = bas;
          tum.push({ ad, shgm, egitim: ea || null, tarih, tur: /tazele|yenileme/.test(low(ea)) ? 'Tazeleme' : null, saat: num(g(r, 10)),
            egitmen: s(g(r, 13)) || s(g(r, 12)), ic_dis: s(g(r, 11)), yeni: true });
        });
        // Takip Paneli: kişi × zorunlu eğitim
        const son = new Map();
        tum.forEach(k => { if (!k.shgm) return; const key = nk(k.ad) + '|' + k.shgm; const x = son.get(key) || { n: 0, max: null }; x.n++;
          if (/^\d{4}-\d{2}-\d{2}$/.test(k.tarih || '') && (!x.max || k.tarih > x.max)) x.max = k.tarih; son.set(key, x); });
        const bugun = new Date(); const B0 = Date.UTC(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
        const edate = (iso, ay) => { const [y, m, dd] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + ay, 1)); const son = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
          t.setUTCDate(Math.min(dd, son)); return t.toISOString().slice(0, 10); };
        for (const p of P) {
          const ad = s(p[1]), k = keyFor(ad);
          if (!k) { eksik.set(ad, 1); continue; }
          const u = unv.get(nk(p[4])), e = p[5] ? ekg.get(nk(p[5])) : null;
          kat.forEach((kr, ki) => {
            if (!((u && s(u[ki]) === 'X') || (e && s(e[ki]) === 'X'))) return;
            const x = son.get(nk(ad) + '|' + s(kr[1])) || { n: 0, max: null }, per = num(g(kr, 6));
            let bitis = null, kalan = null, du;
            if (x.n === 0) du = 'ALINMAMIŞ';
            else if (per === null) du = 'ALINDI';
            else if (!x.max) du = 'GEÇERLİ';
            else { bitis = edate(x.max, Math.round(per * 12)); kalan = Math.round((Date.parse(bitis) - B0) / 86400000); du = kalan < 0 ? 'SÜRESİ DOLDU' : kalan <= esik ? 'YAKLAŞIYOR' : 'GEÇERLİ'; }
            durum.push({ sicil: k, kod: s(kr[0]), egitim: s(kr[1]), son_tarih: x.max, periyot: per, bitis, kalan_gun: kalan, durum: du });
          });
        }
        for (const t of tum) { const k = keyFor(t.ad); if (!k) continue; kayit.push({ sicil: k, tarih: t.tarih, egitim: t.egitim, shgm: t.shgm, saat: t.saat, egitmen: t.egitmen, ic_dis: t.ic_dis, tur: t.tur }); }
        out.rapor.egitim_tum = tum.length;
        out.rapor.egitim_baslangic = basMap;
        out.rapor.egitim_yeni_giris = tum.filter(t => t.yeni).length;
        out.rapor._yeniDuzenYillar = tum;
      }
      const katalog = [];
      for (const r of R('Eğitim Kataloğu').slice(4)) {
        if (!g(r, 0)) continue;
        katalog.push({ kod: s(r[0]), ad: s(r[1]), kaynak: s(r[2]), sinav: s(r[3]), temel: s(r[4]), tazeleme: s(r[5]), periyot: num(r[6]), kimler: s(g(r, 7)) });
      }
      const yillar = [];
      const sg = R('Sunum Göstergeleri');
      const yi = sg.findIndex(r => r && s(g(r, 0)) === 'Yıl' && s(g(r, 1)) === 'Eğitim Katılımı');
      if (yi >= 0) for (const r of sg.slice(yi + 1)) { if (typeof g(r, 0) !== 'number') break; yillar.push({ yil: r[0], katilim: num(r[1]), saat: num(r[2]), shgm: num(r[3]) }); }
      if (!yillar.length && out.rapor._yeniDuzenYillar) {
        const Y = {};
        out.rapor._yeniDuzenYillar.forEach(t => { const y = Number(String(t.tarih || '').slice(0, 4)); if (!y) return; const o = Y[y] = Y[y] || { yil: y, katilim: 0, saat: 0, shgm: 0 }; o.katilim++; o.saat += Number(t.saat) || 0; if (t.shgm) o.shgm++; });
        Object.values(Y).sort((a, b) => a.yil - b.yil).forEach(o => yillar.push({ ...o, saat: Math.round(o.saat) }));
      }
      delete out.rapor._yeniDuzenYillar;
      if (!durum.length && !kayit.length) throw new Error('SHGM Eğitim Takip dosyasından eğitim kaydı okunamadı. Panel mevcut eğitim verilerini silmemek için yüklemeyi durdurdu. Dosyanın doğru dosya olduğundan emin olun.');
      out.egitim_durum = durum; out.egitim_kayit = kayit; out.egitim_katalog = katalog;
      out.rapor.egitim_yillar = yillar;
      out.rapor.egitim_asof = s(g(R('Takip Paneli')[2], 0)) || (() => { const t = new Date(); return `${pad(t.getDate())}.${pad(t.getMonth() + 1)}.${t.getFullYear()} itibarıyla (panel hesapladı)`; })();
      if (eksik.size) uyarilar.push(`Eğitim takibinde eşleşmeyen personel: ${[...eksik.keys()].join(', ')}`);
    }

    out.personel = [...people.values()].filter(p => p.sicil);
    const sicilsiz = [...people.values()].filter(p => !p.sicil);
    if (sicilsiz.length) uyarilar.push(`Sicil numarası olmayan ve atlanan: ${sicilsiz.map(p => p.ad).join(', ')}`);
    out.rapor.notlar = notlar;
    out.rapor.yukleme = { tarih: new Date().toISOString(), uyarilar };
    if (!files.db) delete out.personel;
    return out;
  }

  // SheetJS çalışma kitabını rows() arayüzüne çevirir (A1'den başlayan tam ızgara)
  function fromSheetJS(XLSX, wb) {
    return {
      names: wb.SheetNames,
      formulaRows(name, col) {   // formül içeren satırlar (0 tabanlı)
        const ws = wb.Sheets[name], out = new Set();
        if (!ws || !ws['!ref']) return out;
        const rg = XLSX.utils.decode_range(ws['!ref']);
        for (let r = 0; r <= rg.e.r; r++) { const c = ws[XLSX.utils.encode_cell({ r, c: col })]; if (c && c.f) out.add(r); }
        return out;
      },
      rows(name) {
        const ws = wb.Sheets[name];
        if (!ws || !ws['!ref']) return [];
        const rg = XLSX.utils.decode_range(ws['!ref']);
        const out = [];
        for (let r = 0; r <= rg.e.r; r++) {
          const row = new Array(rg.e.c + 1).fill(null);
          for (let c = 0; c <= rg.e.c; c++) { const cell = ws[XLSX.utils.encode_cell({ r, c })]; if (cell && cell.v !== undefined) row[c] = cell.v; }
          out.push(row);
        }
        return out;
      }
    };
  }

  const api = { parse, fromSheetJS, _d: d, _nk: nk };
  if (typeof module !== 'undefined') module.exports = api; else root.IKParser = api;
})(this);
