/* Zafer İK · Çalışan El Kitabı
   - Varsayılan metin bu dosyada; İK panelden düzenlerse veritabanındaki (el_kitabi.icerik) kullanılır.
   - Personel, yayındaki sürümü onaylamadıysa girişte önce el kitabını okur ve onaylar.
   Metin biçimi (düzenleme ekranında da geçerli):
     ## Ara başlık        - madde          1. numaralı madde
     + Başlık | açıklama  (kart)           # 112 | açıklama  (büyük rakam)
     > not kutusu         " alıntı         ~ dayanak satırı         | hücre | hücre |  (tablo)
     **kalın**  [bağlantı](https://…)      [[alfabe]]  (havacılık alfabesi) */
'use strict';
const EK_PDF = 'https://zafer.aero/Upload/Sayfalar/';
const EK_VARSAYILAN = [
  { id: 'merhaba', ikon: 'kalp', baslik: 'Hoş Geldiniz', ozet: 'Bu kitap neden var, nasıl kullanılır?', metin:
`Zafer Havalimanı ailesine hoş geldiniz.
Bu el kitabı, aramıza yeni katılan ve uzun süredir birlikte çalıştığımız tüm arkadaşlarımız için hazırlandı. Havalimanımızı, birlikte uyduğumuz kuralları ve ihtiyaç duyduğunuzda başvuracağınız yolları kısa ve anlaşılır biçimde burada bulacaksınız.
Kontuarda bir yolcuyu karşılamak, apronda bir uçağı yönlendirmek, pisti kontrol etmek ya da bir bordroyu hazırlamak… Havalimanında yaptığımız her iş aynı zincirin bir halkasıdır. Zincirin sağlamlığı hepimizin dikkatine ve özenine bağlı.
Aklınıza takılan her konuda şefinize ya da İnsan & Kültür birimine çekinmeden ulaşın.
> Bu kitabı onaylamanız, içindeki kural ve uygulamalardan haberdar olduğunuzu gösterir. Kitap güncellendiğinde panele girişte sizden yeniden onay istenir.` },

  { id: 'zafer', ikon: 'ucak', baslik: 'Zafer Havalimanı', ozet: 'Tarihçemiz, rakamlarla havalimanımız, misyon ve vizyonumuz.', metin:
`Afyonkarahisar, Kütahya ve Uşak'ın hava ulaşımı için projelendirilen Zafer Havalimanı, Yap-İşlet-Devret modeliyle IC İÇTAŞ tarafından yapıldı. 36 ay öngörülen yatırım 18 ayda tamamlandı ve havalimanı **25 Kasım 2012**'de hizmete açıldı.
Sivil Havacılık Genel Müdürlüğü'nce ruhsatlandırılan 29. havalimanı, "Engelsiz Havalimanı" ruhsatı alan 10. havalimanıdır. B Sınıfı Havalimanı Sertifikası ile dış hat uçuşlarına da hizmet verir.
# 3.000 × 45 m | Pist
# CAT II | Pist ve yaklaşma kategorisi
# 17.620 m² | Terminal alanı
# 19 | Check-in kontuarı
# 3,2 milyon m² | Toplam faaliyet alanı
# VOR · DME · NDB · ILS | Seyrüsefer yardımcıları
## Misyonumuz
" Uluslararası havalimanı işletmeciliğinde müşteri memnuniyetinin esas alındığı son teknoloji ve sistemlerle yüksek hizmet kalitesi sağlamak.
## Vizyonumuz
" Uluslararası standartlar çerçevesinde sektörel alanda sürekli gelişimi görev edinmiş, dünya çapında öncü ve saygın bir işletme olmak.` },

  { id: 'degerler', ikon: 'yildiz', baslik: 'Değerlerimiz', ozet: 'Her gün işimize yön veren altı ilke.', metin:
`+ Önce emniyet | Emniyet en önemli faaliyetimizdir. Riskleri görür, bildirir ve birlikte önleriz.
+ Misafir odaklılık | Yolcu memnuniyeti işimizin merkezindedir. Her temas noktasında güler yüz ve çözüm sunarız.
+ Dürüstlük ve şeffaflık | Sorumluluk, şeffaflık, dürüstlük ve eşitlik ilkeleriyle çalışırız.
+ Sürekli gelişim | Veriye dayalı iyileştirir, öğrenmeyi hiç bırakmayız.
+ Doğaya saygı | Kaynakları verimli kullanır, net sıfır emisyon hedefine katkı veririz.
+ Birlikte başarmak | Birimler arası iş birliği ve adil kültürle tek ekip oluruz.
Değerlerimiz Kalite, Emniyet ve Çevre politikalarımızdan derlenmiştir.` },

  { id: 'baslarken', ikon: 'kart', baslik: 'İşe Başlarken', ozet: 'Oryantasyon, deneme süresi, giriş kartı ve panel hesabınız.', metin:
`## İlk günleriniz
- İlk gününüzde İnsan & Kültür birimi sizi karşılar. Havalimanı giriş kartınız, üniformanız ve zimmetli malzemeleriniz imza karşılığı teslim edilir; soyunma odası, dolap, yemekhane, personel giriş-çıkış kapısı ve servis hakkında bilgi verilir.
- Görev tanımınız size teslim edilir ve imzalatılır. Çalışma saatleri, ücret ödemesi, fazla çalışma, izinler, iş kazası ve hastalık durumunda izlenecek yol anlatılır; acil çıkışlar gösterilir.
- Biriminizde size bir çalışma arkadaşınız eşlik eder. İlk iki gün yemekhane, giriş-çıkış ve günlük işleyişte yanınızda olur.
- Göreve başlamadan önce **Güvenlik Bilinci Temel Eğitimi**, Temel İSG eğitimi ve görevinize özgü SHGM zorunlu eğitimlerini alırsınız. Eğitimi tamamlanmamış bir görevde çalışılmaz.
## Deneme süresi
- Deneme süresi **2 aydır**. Süre sonunda ve ilk 6 ayınızı doldurmadan önce yöneticiniz performansınızı değerlendirir.
- Deneme süresinin sonunda sizden de işe başlama deneyiminizi değerlendirmeniz istenir. Görüşleriniz uyum sürecini iyileştirmemize yardımcı olur.
## Havalimanı giriş kartı
- Güvenlikli bölgelere ve aprona yalnızca geçerli havalimanı giriş kartıyla girilir. Kart, güvenlik araştırması yapılıp Güvenlik Bilinci Temel Eğitimi alındıktan sonra düzenlenir.
- Kartınızı görev boyunca üst bedeninizde, görünür biçimde taşıyın ve kartın arkasındaki talimata uyun. Kartınızı kimseye vermeyin, başkasının kartıyla geçmeyin.
- Kart yalnızca yetkili olduğunuz bölgelerde geçerlidir.
- Kartınızı kaybederseniz vakit kaybetmeden güvenlik birimine ve şefinize bildirin. İşten ayrılırken kart iade edilir.
## İK Paneli
- Panele sicil numaranız ve size verilen geçici şifreyle girersiniz. İlk girişte kendi şifrenizi belirlersiniz.
- Özlük bilgileriniz, izin bakiyeniz, eğitimleriniz ve sertifikalarınız **Dosyam** ve **Sertifikalarım** sekmelerindedir.
~ Dayanak: IC.İK.PR.01 İşe Alma ve Yerleştirme Prosedürü · KZR.IK.P17 Eğitim Prosedürü · KZR.IK.P44 Güvenlik Eğitim Prosedürü` },

  { id: 'calisma', ikon: 'saat', baslik: 'Çalışma Düzeni', ozet: 'Vardiyalar, devamlılık, davranış ilkeleri ve sosyal medya.', metin:
`- Çalışma saatleri ve vardiya çizelgeleri birimlere göre belirlenir ve şefiniz tarafından önceden duyurulur.
- Havalimanı 7/24 çalışır. Görev süresi içinde şefinizden izin almadan görev yerinizden ayrılmayın; vardiya devrinde ekibinizi bilgilendirin.
- Geç kalacaksanız ya da gelemeyecekseniz vardiya başlamadan şefinize haber verin. İzinsiz ve mazeretsiz devamsızlık iş sözleşmesinin feshine kadar varan sonuçlar doğurur.
- Fazla çalışma, şefinizin talebi ve onayıyla yapılır.
- Sağlık raporlarınızı gecikmeden şefinize ve İnsan & Kültür birimine iletin.
## Davranış ilkeleri
- Yolculara, misafirlere ve çalışma arkadaşlarınıza saygılı ve nazik olun. Dil, ırk, cinsiyet, din ya da görüş farkı gözetmeksizin herkese eşit davranın.
- Yolcuya açık alanlarda görev sırasında cep telefonuyla meşgul olmayın, sakız çiğnemeyin, yiyip içmeyin.
- Göreve alkollü ya da uyuşturucu etkisinde gelmek ve görev başında kullanmak kesinlikle yasaktır.
- Terminalin ve apronun sigara içilmesi yasak bölümlerinde sigara içilmez.
- Gümrüksüz (duty-free) mağazalardan kendiniz ya da başkası adına alışveriş yapmayın, aracılık etmeyin.
- Bulduğunuz her eşyayı hemen bildirin ve teslim edin.
- Hediye ve menfaat kabul etmeyin. İşverenden izin almadan başka bir işte çalışmayın, ticaret yapmayın.
- Şirket araç, gereç ve cihazlarını yalnızca iş amacıyla kullanın.
## Sosyal medya ve basın
- Kurum sözcüleri dışında hiçbir çalışan şirket adına basına ya da sosyal medyaya açıklama yapamaz.
- Operasyon detaylarını, henüz duyurulmamış gelişmeleri, yolcu, iş ortağı ve hukuki süreçlerle ilgili bilgileri paylaşmayın. Güvenlikli bölgelerde çektiğiniz görüntüleri paylaşmayın.
- Yöneticileriniz ve çalışma arkadaşlarınız hakkında sosyal medyada paylaşım ya da yorum yapmayın.
- Zafer Havalimanı'nın resmî hesaplarındaki herkese açık içerikleri beğenebilir ve paylaşabilirsiniz.
- İnternette yapılan her paylaşımın, silinse bile kalıcı olduğunu unutmayın.
~ Dayanak: KZR.IK.P20 Disiplin Prosedürü · KZR.İK.P01 Sosyal Medya Yönetimi Prosedürü` },

  { id: 'izin', ikon: 'takvim', baslik: 'İzin Uygulamaları', ozet: 'Yıllık izin, özel izinler, rapor ve panelden izin talebi.', metin:
`## Yıllık ücretli izin
| Kıdem | Yıllık izin |
| 1 yıldan 5 yıla kadar (5 dahil) | 14 iş günü |
| 5 yıldan fazla, 15 yıldan az | 20 iş günü |
| 15 yıl ve üzeri | 26 iş günü |
- Deneme süresi dahil bir çalışma yılını dolduranlar yıllık izne hak kazanır. Kıdem hesabında gruba ilk giriş tarihiniz esas alınır.
- 18 yaş ve altındaki ile 50 yaş ve üstündeki çalışanlara en az 20 iş günü izin verilir.
- İzin planlaması ve kullanılacak gün sayısı yöneticinizin onayına tabidir. Yıllık izin, hak edildiği tarihten itibaren bir yıl içinde kullanılır; iş sözleşmesi devam ederken kullanılmayan izin ücrete çevrilmez.
- İzninizin başı ya da sonu bayram veya resmî tatile denk gelirse izniniz o günler kadar uzar.
- İzindeyken hastalanır ya da kaza geçirirseniz, resmî sağlık raporuyla belgelediğiniz günler kadar izin hakkınız iade edilir.
- Yıllık izindeyken ücret karşılığı başka bir işte çalışılamaz.
## Özel izinler (ücretli)
| Durum | Süre |
| Evlilik | 5 iş günü |
| Babalık (eşin doğum yapması) | 10 iş günü |
| Vefat (sizin ya da eşinizin anne, baba, kardeşi; eşiniz, çocuğunuz) | 3 iş günü · şehir dışında 4 güne kadar |
| %70 ve üzeri engelli ya da süreğen hastalığı olan çocuğun tedavisi | Yılda 10 iş gününe kadar |
| Birinci derece yakının hastanede tedavisi (rapora dayalı) | Her seferinde en çok 3, yılda en çok 10 iş günü |
| Nakil nedeniyle şehir dışına taşınma | 2 iş günü |
- Bu izinler olayı izleyen bir hafta içinde kullanılır. Babalık izni doğumdan sonraki 3 ay içinde en fazla ikiye bölünerek kullanılabilir.
- Süresinde kullanılmayan özel izinler ücrete çevrilmez, başka bir döneme aktarılmaz. Hafta tatili ve resmî tatiller izin gününden sayılmaz.
## Mazeret izni
- Sağlık, okul, şehir içi taşınma gibi nedenlerle yöneticinizin uygun görmesi halinde yılda toplam **3 iş gününe** kadar ücretli mazeret izni verilebilir.
- Mazeret izni üst üste iki günden fazla kullanılamaz, yıllık iznin başına ya da sonuna eklenemez. Bir hak değil, yöneticinin takdirindedir.
## Hastalık, analık ve ücretsiz izin
- İki güne kadar olan raporlarda ücretiniz tam ödenir; bu bir çalışma yılında en fazla 3 kez şirketçe karşılanır. İki günü aşan raporlarda aşan günlerin ödemesi SGK'dan alınır.
- Analık izni doğumdan önce 8, sonra 8 hafta olmak üzere toplam 16 haftadır; çoğul gebelikte doğum öncesine 2 hafta eklenir. Hamilelikte periyodik kontroller için ücretli izin verilir.
- Çocuk bir yaşını doldurana kadar günde en az 1,5 saat süt izni kullanılır. Doğum sonrası yarı zamanlı çalışma, 6 aya kadar ücretsiz izin ve kısmi süreli çalışma hakları için İnsan & Kültür birimine başvurun.
- Ücretsiz izin en fazla 3 aydır ve acil durumlar dışında en az bir hafta önceden talep edilir; son onay Genel Müdür'ündür.
## Panelden izin talebi
1. **İzin Taleplerim** sekmesinde tarihleri ve izin türünü seçerek talebinizi oluşturun.
2. Talebiniz önce şefinize gider. Şefiniz onayladığında İnsan & Kültür birimine geçer. Operasyon birimlerinde müdürünüz de bilgilendirilir.
3. Onaylanan izin bakiyenizden düşer. Onaylı izin formunun çıktısını imzalayarak İnsan & Kültür birimine teslim edin.
> Onaysız izne çıkılmaz. İzin işlemini prosedüre uygun yapmayan çalışana o günler için çalışmamış gibi işlem yapılır. Acil bir durumda önce şefinizi telefonla arayın.
~ Dayanak: IC.İK.PR.04 İzin Prosedürü (Rev. 05, 01.11.2025) · 4857 sayılı İş Kanunu` },

  { id: 'haklar', ikon: 'hediye', baslik: 'Sosyal Haklar', ozet: 'Sosyal yardımlar, avans ve sağlık sigortası.', metin:
`+ Evlilik yardımı | Deneme süresini tamamlayan çalışana, evlilik cüzdanını ibraz etmesi üzerine 1 Cumhuriyet altını.
+ Doğum yardımı | Çalışanın ya da eşinin doğum yapması halinde, doğum raporunun ibrazıyla 1 çeyrek altın.
+ Vefat yardımı | Birinci derece yakınlarınızın vefatında, İnsan & Kültür birimine bildirmenizin ardından nakdi yardım.
+ Eğitim yardımı | Müdür altı pozisyonlarda, okula giden, bekâr ve 25 yaşını doldurmamış her çocuk için her yıl Eylül ayında.
+ Bayram ikramı | Ramazan ve Kurban bayramlarında tüm çalışanlarımıza.
+ Sağlık sigortası | Müdür altı beyaz yaka çalışanlara tamamlayıcı sağlık sigortası; eş ve çocuk katkısı kıdeme göre artar.
## Avans
- Acil nakit ihtiyacınızda ayın 15'inden sonra, net maaşınızın en fazla yarısı kadar avans talep edebilirsiniz. Avans yılda en fazla 4 kez alınır ve izleyen ilk maaştan bir defada düşülür.
- Bir yılını dolduran çalışanlar; sağlık, ilk konut alımı, eğitim, taşınma ve evlilik gibi belgelendirilebilir ihtiyaçlar için kıdemle orantılı **taksitli avans** talep edebilir. Talep, olayın üzerinden 2 ay geçmeden yapılır.
- Avans talepleriniz gizli tutulur; yalnızca onay ve ödeme sürecindekilerle paylaşılır.
> Şiddete maruz kalan çalışanlarımıza taşınma, barınma, sağlık gibi ihtiyaçları için geri ödemeli maddi destek sağlanır. Başvuru: **sifirtolerans@ic.com.tr**
Yardım tutarları her yıl güncellenir ve İnsan & Kültür birimince duyurulur.
~ Dayanak: IC.İK.PR.02 Sosyal Yardım ve Olanaklar Prosedürü (Rev. 10)` },

  { id: 'egitim', ikon: 'kitap', baslik: 'Eğitim ve Gelişim', ozet: 'Zorunlu eğitimler, sertifikalar, eğitim durumunuz ve kariyer.', metin:
`Havalimanında çalışan herkes, görevinin gerektirdiği SHGM zorunlu eğitimlerini, havacılık güvenliği ve İSG eğitimlerini belirlenen periyotlarda alır. Süresi dolan eğitim, o görevde çalışmaya engeldir.
- Giriş kartı olan tüm çalışanlar işe başlamadan önce **Güvenlik Bilinci Temel Eğitimi** alır ve bu eğitimi **3 yılda bir** tazeler. Bu eğitimi almayan kişiye havalimanı giriş kartı verilmez.
- Eğitim davetleri en geç 4 gün önceden yapılır. Davet edildiğiniz eğitime geçerli bir mazeretiniz olmadan katılmamanız disiplin konusudur.
Eğitim durumunuzu panelde **Dosyam** sekmesinde görürsünüz:
+ Geçerli | Eğitiminiz güncel.
+ Yaklaşıyor | Süresi yakında doluyor; tazeleme eğitiminiz planlanır.
+ Süresi doldu | Tazeleme alınmadan bu görev yapılmaz; şefinize bildirin.
+ Alınmamış | Göreviniz için zorunlu eğitim henüz alınmadı.
## Sertifikalar ve değerlendirme
- İç eğitimlerin sonunda sertifikanız düzenlenir ve **Sertifikalarım** sekmesinde yer alır. Buradan yazdırabilir ya da PDF olarak kaydedebilirsiniz.
- Her eğitimin sonunda eğitim değerlendirme formunu doldurun.
- Dış eğitimden aldığınız sertifikayı en geç bir hafta içinde **Sertifikalarım** sekmesinden yükleyin.
- Şirketin karşıladığı ve 5 iş günü ya da daha uzun süren mesleki eğitim ve seminerler için önceden taahhütname imzalanır.
## Gelişim ve kariyer
- Eğitim ihtiyaçlarınız her yıl yöneticinizle birlikte belirlenir ve yıllık eğitim planına alınır. Plan dışı bir ihtiyaç için Eğitim Talep Formu ile yöneticinize başvurun.
- Açık pozisyonlarda yetkinliği ve performansı uygun çalışanlarımızın görev değişikliği ve terfisi değerlendirilir. Yeni göreve geçişte ilk 2 ay deneme süreci olarak değerlendirilir ve yazılı onayınız alınır.
~ Dayanak: KZR.IK.P17 Eğitim Prosedürü · KZR.IK.P44 Güvenlik Eğitim Prosedürü · IC.İK.PR.07 Görev Değişikliği, Transfer ve Terfi Prosedürü` },

  { id: 'emniyet', ikon: 'kalkan', baslik: 'Emniyet ve İş Sağlığı', ozet: 'Adil kültür, altın kurallar ve acil durumda yapılacaklar.', metin:
`" Emniyet, en önemli faaliyetimizdir.
## Bildir, birlikte öğrenelim
- Tehlike, kaza, olay ve ramak kalaları bildirmek her çalışanın görevidir. Bildirimler öğrenmek için yapılır; iyi niyetle yapılan bildirim cezalandırılmaz. Kasıtlı ihlaller ve ağır ihmaller bu güvencenin dışındadır.
- Bildiriminizi şefinize, Emniyet Yönetim Sistemi (SMS) birimine ya da İSG birimine yapabilirsiniz.
## Altın kurallar
+ Koruyucu donanım | Görevinizin gerektirdiği yansıtıcı yelek, kulaklık, eldiven ve iş ayakkabısını eksiksiz kullanın.
+ Apron disiplini | Yalnızca yetkili olduğunuz aracı kullanın. Hız sınırlarına ve araç yollarına uyun; uçağa her zaman yol verin.
+ Motor tehlikesi | Motoru çalışan ya da çarpışma önleme ışığı yanan uçağa yaklaşmayın.
+ FOD | Apronda gördüğünüz her yabancı maddeyi toplayın. Küçük bir vida bile motoru durdurabilir.
+ Yetki | Eğitimini almadığınız ekipmanı kullanmayın, yetkiniz olmayan işe girişmeyin.
+ Dur ve bildir | Güvensiz bir durum gördüğünüzde işi durdurun ve hemen bildirin.
## Acil durumda
- Yangın, kaza ya da sağlık acil durumunda sakin kalın, alarmı verin ve acil durum planındaki görevinizi uygulayın.
- Tahliye anonsunda en yakın acil çıkışı kullanın, toplanma alanına gidin ve sayımı bekleyin. Asansör kullanmayın.
- Acil çıkışlar ve toplanma alanları binalardaki tahliye krokilerinde gösterilir.` },

  { id: 'kiyafet', ikon: 'tisort', baslik: 'Kıyafet ve Görünüm', ozet: 'Üniforma, ofis kıyafeti ve kişisel görünüm.', metin:
`- Üniformalı görevlerde şirketin verdiği üniforma eksiksiz, temiz ve bakımlı giyilir. Üniforma görev dışında ve havalimanı dışında kullanılmaz.
- Ofis çalışanları iş ortamına uygun, sade ve temiz kıyafet tercih eder.
- Herhangi bir ideoloji, siyasi parti ya da topluluğu tanıtan sembol, giysi ve aksesuar kullanılmaz.
- Saha çalışanları için koruyucu donanım kıyafetin bir parçasıdır.
- Havalimanı giriş kartınız görev boyunca görünür olmalıdır.
- Yolcu ile temas eden görevlerde şirketimizi temsil ettiğinizi unutmayın; kişisel bakım ve temizliğe özen gösterin.
- İşten ayrılırken üniforma ve donanımlar iade edilir.
~ Dayanak: Kıyafet Yönetmeliği · KZR.IK.P20 Disiplin Prosedürü` },

  { id: 'disiplin', ikon: 'uyari', baslik: 'Disiplin ve İşten Ayrılma', ozet: 'Disiplin uygulaması, ihbar süreleri ve ayrılırken yapılacaklar.', metin:
`Kurallarımız herkesin güvenliği ve hakkaniyet için vardır. Kurallara aykırı davranışlarda Disiplin Prosedürü uygulanır ve karar verilmeden önce yazılı savunmanız istenir.
+ Uyarma | Geç gelme, kıyafet kurallarına ya da giriş kartı talimatına uymama, yolcuya ilgisizlik, yolcu alanında telefonla meşgul olma, mazeretsiz eğitime katılmama gibi durumlarda yazılı uyarı.
+ Kınama | Görev yerinden izinsiz ayrılma, iş başında uyuma, yasak alanda sigara, KKD kullanmama, izinsiz açıklama yapma ya da uyarı alınan davranışı tekrarlama.
+ İşten çıkarma | Alkol veya uyuşturucu, hırsızlık, taciz, sahtecilik, güvenliği tehlikeye atma, izinsiz başka işte çalışma, ardı ardına 2 iş günü mazeretsiz devamsızlık gibi ağır durumlar. Disiplin Kurulu kararıyla verilir.
Üç uyarı, iki kınama ya da iki uyarı ve bir kınama cezası iş sözleşmesinin sona ermesine yol açabilir.
## İstifa ve ihbar süreleri
| Çalışma süresi | İhbar süresi |
| 6 aya kadar | 2 hafta |
| 6 ay – 1,5 yıl | 4 hafta |
| 1,5 – 3 yıl | 6 hafta |
| 3 yıldan fazla | 8 hafta |
- Ayrılmak isterseniz istifa dilekçenizi bu sürelere uyarak yöneticinize ya da İnsan & Kültür birimine verin. İhbar süresinden önce ayrılmak için yöneticinizin onayı gerekir.
- Ayrılmadan önce sizinle bir ayrılış görüşmesi yapılır; görüşleriniz bizim için değerlidir.
- Giriş kartı, üniforma, cihaz ve zimmetli tüm malzemeler iade edilir, ilişik kesme formu tamamlanır. Size çalışma belgeniz verilir.
~ Dayanak: KZR.IK.P20 Disiplin Prosedürü · IC.İK.PR.05 İşten Ayrılma ve İlişik Kesme Prosedürü` },

  { id: 'bilgi', ikon: 'kilit', baslik: 'Bilgi Güvenliği ve KVKK', ozet: 'Şifreler, e-posta, cihazlar ve kişisel veriler.', metin:
`- Şifrenizi kimseyle paylaşmayın. Bilgisayarınızdan ayrılırken ekranı kilitleyin (**Windows + L**).
- Tanımadığınız göndericilerden gelen e-postalardaki bağlantılara tıklamayın, ekleri açmayın. Şüpheli e-postayı Bilgi Teknolojileri birimine bildirin.
- Şirket bilgilerini kişisel e-posta, USB bellek ya da mesajlaşma uygulamalarıyla dışarı çıkarmayın.
- Uçuş operasyonu ve kontrol sistemlerine yalnızca yetkili kişiler erişir.
- Kayıp cihaz, şüpheli erişim ya da virüs gibi bir bilgi güvenliği olayını hemen bildirin.
## Kişisel verilerin korunması
- 6698 sayılı Kanun gereği yolcu, ziyaretçi ve çalışma arkadaşlarınızın kişisel verilerine yalnızca işinizin gerektirdiği ölçüde erişin. Bu verileri başkasıyla paylaşmayın, fotoğraflamayın.
- Size ait kişisel veriler iş ilişkisinin gerektirdiği ölçüde ve mevzuata uygun olarak işlenir. Haklarınıza ilişkin başvurularınızı İnsan & Kültür birimine iletebilir ya da [İlgili Kişi Başvuru Formu](https://zafer.aero/Dosyalar/CKfinder/files/Kvkk_Metinleri/Zafer_Havalimani_ilgili_Kisi_Basvuru_Formu.pdf)nu kullanabilirsiniz.` },

  { id: 'politikalar', ikon: 'belge', baslik: 'Politikalarımız', ozet: 'Yönetim sistemlerimizin özü; tam metinler zafer.aero\'da.', metin:
`+ Emniyet Yönetim Sistemi | En yüksek emniyet performansı, adil kültür, etkin raporlama ve insan faktörü kaynaklı risklerin yönetimi. [Tam metin](${EK_PDF}kzr-smsp-01-sms-politikasi-rev-0.pdf)
+ Kalite | Yasal şartlara ve standartlara uygun, müşteri memnuniyetini önceleyen, veriye dayalı ve sürekli iyileşen hizmet. [Tam metin](${EK_PDF}kzr-ky-pol01-02-kalite-politikasi.pdf)
+ İş Sağlığı ve Güvenliği | Tehlikeleri belirleyip önlemek, iş kazası ve meslek hastalıklarını önlemek, çalışanların katılımını sağlamak. [Tam metin](${EK_PDF}kzr-i-sgp-01-00-i-s-sag-lig-i-ve-gu-venli-g-i-yo-neti-m-si-stemi-poli-ti-kasi-1-0v.pdf)
+ Çevre | Kaynakları verimli kullanmak, atığı azaltmak, ekosistemi korumak ve net sıfır emisyona ilerlemek. [Tam metin](${EK_PDF}kzr-ky-pol04-04-cevre-politikasi.pdf)
+ Bilgi Güvenliği | Bilgi varlıklarını korumak, riskleri yönetmek, olaylara hızla müdahale etmek ve kişisel verileri korumak. [Tam metin](${EK_PDF}kzr-bgysp-01-02-bilgi-guvenligi-politikasi.pdf)
+ Enerji Yönetimi | Enerji performansını sürekli iyileştirmek, sera gazı salımını azaltmak ve enerji verimli çözümleri seçmek. [Tam metin](${EK_PDF}kzr-enysp-01-01-enerji-yonetim-sistemi-politikasi-3v.pdf)
Politikalarımız İşletme Müdürümüz tarafından onaylanmıştır. Her çalışan, kendi görev alanında bu politikaların uygulanmasından sorumludur.` },

  { id: 'iletisim', ikon: 'telefon', baslik: 'İletişim ve Acil Durum', ozet: 'Önemli numaralar ve havacılık alfabesi.', metin:
`# 112 | Acil çağrı: ambulans, itfaiye, polis
# 444 3 937 | Zafer Havalimanı çağrı merkezi
Birimlerin dahili numaraları ofis ve vardiya odalarındaki listelerde yer alır. Panelle ilgili sorularınız ve şifre işlemleri için İnsan & Kültür birimine başvurun.
**Adres:** Kuyucak Köyü Mevkii, Altıntaş / Kütahya
## Havacılık alfabesi
[[alfabe]]` },
];

const EK_IKON = {
  kalp: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  ucak: 'M21 15.5v-2l-8-5V4a1.5 1.5 0 0 0-3 0v4.5l-8 5v2l8-2.5v5l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z',
  yildiz: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  kart: 'M3.5 6h17v12h-17zM7 10.5h5M7 14h7M15.5 9.5h2.5v3h-2.5z',
  saat: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17zM12 7.5V12l3 2',
  takvim: 'M4 5.5h16V20H4zM4 9.5h16M8 3.5v4M16 3.5v4M8 13h3M8 16.5h6',
  kitap: 'M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h11.5M9 8h6',
  kalkan: 'M12 3l7.5 3v5.5c0 4.7-3.2 7.9-7.5 9.5-4.3-1.6-7.5-4.8-7.5-9.5V6zM8.8 12l2.2 2.2 4.2-4.4',
  tisort: 'M8.5 3.5L3.5 6.5l2 4 2-1V20.5h9V9.5l2 1 2-4-5-3a3.5 3.5 0 0 1-7 0z',
  kilit: 'M6 10.5h12v10H6zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5',
  belge: 'M6.5 3.5h8l4 4v13h-12zM14 3.5v4.5h4.5M9.5 12h6M9.5 15.5h6',
  telefon: 'M6 3.5h3l1.8 4.6-2.3 1.4a10.5 10.5 0 0 0 5.9 5.9l1.4-2.3 4.7 1.8v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4 5.5a2 2 0 0 1 2-2z',
  uyari: 'M12 4l9 15.5H3zM12 10v4.5M12 17v.5',
  hediye: 'M4.5 10.5h15v10h-15zM3.5 7h17v3.5h-17zM12 7v13.5M12 7C10.5 3.8 6.8 3.6 6.8 5.6S10 7 12 7zm0 0c1.5-3.2 5.2-3.4 5.2-1.4S14 7 12 7z',
  kisi: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
};
const ekIkon = (k, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${EK_IKON[k] || EK_IKON.belge}"/></svg>`;
const EK_ALFABE = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];

// ---------------- metin → HTML ----------------
function ekMd(src) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const L = String(src || '').split('\n'); let out = '', i = 0;
  const grab = re => { const a = []; while (i < L.length && re.test(L[i].trim())) a.push(L[i++].trim()); return a; };
  while (i < L.length) {
    const l = L[i].trim();
    if (!l) { i++; continue; }
    if (l.startsWith('## ')) { out += `<h4>${inl(l.slice(3))}</h4>`; i++; }
    else if (/^- /.test(l)) out += '<ul>' + grab(/^- /).map(x => `<li>${inl(x.slice(2))}</li>`).join('') + '</ul>';
    else if (/^\d+\. /.test(l)) out += '<ol class="ek-adim">' + grab(/^\d+\. /).map(x => `<li>${inl(x.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>';
    else if (/^\+ /.test(l)) out += '<div class="ek-kartlar">' + grab(/^\+ /).map(x => { const [b, ...r] = x.slice(2).split('|');
      return `<div class="ek-kart"><b>${inl(b.trim())}</b><p>${inl(r.join('|').trim())}</p></div>`; }).join('') + '</div>';
    else if (/^# /.test(l)) out += '<div class="ek-sayilar">' + grab(/^# /).map(x => { const [b, ...r] = x.slice(2).split('|');
      return `<div><strong>${inl(b.trim())}</strong><span>${inl(r.join('|').trim())}</span></div>`; }).join('') + '</div>';
    else if (/^> /.test(l)) out += `<div class="ek-not">${ekIkon('uyari', 18)}<p>${grab(/^> /).map(x => inl(x.slice(2))).join('<br>')}</p></div>`;
    else if (/^" /.test(l)) out += `<blockquote class="ek-alinti">${grab(/^" /).map(x => inl(x.slice(2))).join('<br>')}</blockquote>`;
    else if (/^\|/.test(l)) { const rows = grab(/^\|/).map(x => x.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      out += `<div class="ek-tablo"><table><thead><tr>${rows[0].map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
    else if (/^~ /.test(l)) { out += `<p class="ek-kaynak">${inl(l.slice(2))}</p>`; i++; }
    else if (l === '[[alfabe]]') { out += `<div class="ek-alfabe">${EK_ALFABE.map(w => `<div><b>${w[0]}</b><span>${w}</span></div>`).join('')}</div>`; i++; }
    else { out += `<p>${inl(l)}</p>`; i++; }
  }
  return out;
}

// ---------------- durum ----------------
let EK = null;  // { surum, yayin, bolumler, ozel, onay:{surum:tarih}, tablo }
async function ekYukle() {
  EK = { surum: 1, yayin: null, bolumler: EK_VARSAYILAN, ozel: false, onay: {}, tablo: false };
  try {
    const { data, error } = await sb.from('el_kitabi').select('surum,icerik,yayin_tarihi').eq('id', 1).maybeSingle();
    if (error || !data) return;
    EK.tablo = true; EK.surum = data.surum; EK.yayin = data.yayin_tarihi;
    if (Array.isArray(data.icerik) && data.icerik.length) { EK.bolumler = data.icerik; EK.ozel = true; }
    const o = await sb.from('el_kitabi_onay').select('surum,onay_tarihi').eq('sicil', ME.profile.sicil);
    (o.data || []).forEach(r => EK.onay[r.surum] = r.onay_tarihi);
  } catch (e) { /* tablo kurulmamışsa el kitabı onaysız gösterilir */ }
}
const ekOnayliMi = () => !EK || !EK.tablo || !!EK.onay[EK.surum];
const ekGerekli = () => ME.profile.role !== 'admin' && EK && EK.tablo && !EK.onay[EK.surum];
const ekDk = () => Math.max(3, Math.round(EK.bolumler.reduce((a, b) => a + String(b.metin || '').split(/\s+/).length, 0) / 180));

// ---------------- okuma görünümü ----------------
function ekKapak(ad) {
  const kavis = typeof KAVIS !== 'undefined' ? `<path fill="#fff" d="${KAVIS}"/>` : '';
  const ucak = typeof UCAK !== 'undefined' ? `<g transform="translate(318 168) rotate(40) scale(.42) translate(-100 -128)">${UCAK}</g>` : '';
  return `<section class="ek-kapak">
    <svg class="ek-kapak-art" viewBox="-10 110 420 340" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <defs><filter id="parilti" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>
      ${kavis}<path d="M196 330C236 286 262 246 292 206" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 8" opacity=".75"/>${ucak}</svg>
    <div class="ek-kapak-in">
      <img src="logo.png" alt="Zafer Airport" class="ek-logo">
      <div class="ek-ust">Zafer Havalimanı · İnsan &amp; Kültür</div>
      <h1>Çalışan El Kitabı</h1>
      <p>${ad ? `Merhaba <b>${esc(ad.split(' ')[0].toLocaleLowerCase('tr-TR').replace(/^./, c => c.toLocaleUpperCase('tr-TR')))}</b>, havalimanımızı` : 'Havalimanımızı'}, kurallarımızı ve haklarınızı kısaca anlatan rehberiniz.</p>
      <div class="ek-etiket"><span>${EK.bolumler.length} bölüm</span><span>~${ekDk()} dk okuma</span><span>Sürüm ${EK.surum}${EK.yayin ? ' · ' + fd(EK.yayin.slice(0, 10)) : ''}</span></div>
    </div></section>`;
}
function ekGovde(kapi) {
  const me = DATA && DATA.byS[ME.profile.sicil];
  const B = EK.bolumler;
  return `<div class="ek${kapi ? ' ek-kapi' : ''}">
    <aside class="ek-nav"><div class="ek-nav-in">
      <div class="ek-ilerle"><div><span id="ek_say">0</span>/${B.length} bölüm</div><i><b id="ek_bar"></b></i></div>
      <ol>${B.map((b, i) => `<li><button type="button" data-git="${esc(b.id)}"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(b.baslik)}</span><span class="ok" aria-hidden="true">✓</span></button></li>`).join('')}</ol>
      ${kapi ? '' : '<button type="button" class="btn sm" id="ek_yaz" style="margin-top:12px;width:100%">Yazdır / PDF</button>'}
    </div></aside>
    <div class="ek-icerik">
      ${ekKapak(me && me.ad)}
      ${B.map((b, i) => `<section class="ek-bolum" id="ek-${esc(b.id)}" data-bid="${esc(b.id)}">
        <header><span class="ek-no">${String(i + 1).padStart(2, '0')}</span><span class="ek-ikon">${ekIkon(b.ikon, 26)}</span>
          <div><h2>${esc(b.baslik)}</h2>${b.ozet ? `<p>${esc(b.ozet)}</p>` : ''}</div></header>
        <div class="ek-metin">${ekMd(b.metin)}</div></section>`).join('')}
      <div id="ek_son"></div>
    </div></div>`;
}
// Okunan bölümleri işaretler; hepsi görülünce cb(true) çağrılır
function ekIzle(root, cb) {
  const secs = [...root.querySelectorAll('.ek-bolum')], gor = new Set(), btn = {};
  root.querySelectorAll('[data-git]').forEach(b => { btn[b.dataset.git] = b; b.onclick = () => {
    const s = root.querySelector('#ek-' + CSS.escape(b.dataset.git)); if (s) window.scrollTo({ top: s.getBoundingClientRect().top + scrollY - ekUstBosluk() + 1, behavior: 'smooth' }); }; });
  const say = root.querySelector('#ek_say'), bar = root.querySelector('#ek_bar');
  const tara = () => {
    const h = innerHeight, sonda = innerHeight + scrollY >= document.documentElement.scrollHeight - 40;
    let aktif = null;
    secs.forEach(s => { const r = s.getBoundingClientRect();
      if (r.top < h * 0.55 || sonda) gor.add(s.dataset.bid);
      if (r.top <= ekUstBosluk() + 40) aktif = s.dataset.bid; });
    secs.forEach(s => { const b = btn[s.dataset.bid]; if (b) { b.classList.toggle('gor', gor.has(s.dataset.bid)); b.classList.toggle('on', aktif === s.dataset.bid); } });
    if (say) say.textContent = gor.size; if (bar) bar.style.width = (gor.size / secs.length * 100) + '%';
    cb && cb(gor.size === secs.length, gor.size, secs.length);
  };
  let t = 0; const on = () => { if (!t) t = requestAnimationFrame(() => { t = 0; tara(); }); };
  addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
  tara();
  return () => { removeEventListener('scroll', on); removeEventListener('resize', on); };
}
const ekUstBosluk = () => { const h = document.querySelector('.ek-kapi-ust') || document.querySelector('header.top'); return h ? h.getBoundingClientRect().height : 0; };

// Giriş kapısı: onaylanmadan panele geçilmez
let ekBirak = null;
function ekKapi() {
  const me = DATA && DATA.byS[ME.profile.sicil];
  const eski = Object.keys(EK.onay).length > 0;
  app.innerHTML = `<div class="ek-kapi-ust"><div class="wrap">
      <img src="logo.png" alt="Zafer Airport"><div class="b"><b>Çalışan El Kitabı</b><small>${eski ? 'Güncellendi · yeni sürümü onaylamanız gerekiyor' : 'Panele geçmeden önce okuyup onaylayın'}</small></div>
      <div class="i"><i><b id="ek_bar2"></b></i><span id="ek_say2"></span></div>
      <button class="theme-btn" id="ek_cik" type="button">Çıkış</button></div></div>
    <main class="wrap">${ekGovde(true)}</main>`;
  $('ek_son').innerHTML = `<section class="ek-onay" id="ek_onay">
    <div class="ek-onay-ikon">${ekIkon('kalkan', 30)}</div>
    <h2>Okudum, anladım</h2>
    <p>${esc(me ? me.ad : ME.profile.sicil)} · Sicil ${esc(ME.profile.sicil)}</p>
    <label class="ek-cb"><input type="checkbox" id="ek_cb"><span>Zafer Havalimanı Çalışan El Kitabı'nı (Sürüm ${EK.surum}) okudum, anladım. Kitapta yer alan kural ve uygulamalara uyacağımı kabul ediyorum.</span></label>
    <div id="ek_m"></div>
    <button class="btn pri" id="ek_btn" type="button" disabled>Onaylıyorum, panele geç</button>
    <p class="mini" id="ek_ipucu"></p></section>`;
  $('ek_cik').onclick = () => { ekBirak && ekBirak(); cikis(); };
  let hepsi = false;
  const guncelle = () => {
    $('ek_btn').disabled = !(hepsi && $('ek_cb').checked);
    $('ek_ipucu').textContent = hepsi ? ($('ek_cb').checked ? '' : 'Onay kutusunu işaretleyin.') : 'Onaylamak için tüm bölümleri gözden geçirin.';
  };
  ekBirak = ekIzle(app, (h, n, t) => { hepsi = h; $('ek_say2').textContent = `${n}/${t}`; $('ek_bar2').style.width = (n / t * 100) + '%'; guncelle(); });
  $('ek_cb').onchange = guncelle;
  $('ek_btn').onclick = async () => {
    $('ek_btn').disabled = true; $('ek_btn').textContent = 'Kaydediliyor…';
    const { data, error } = await sb.rpc('el_kitabi_onayla');
    if (error) { $('ek_m').innerHTML = `<div class="msg err">Onay kaydedilemedi: ${esc(error.message)}</div>`; $('ek_btn').textContent = 'Onaylıyorum, panele geç'; guncelle(); return; }
    EK.onay[EK.surum] = data || new Date().toISOString();
    ekBirak && ekBirak(); ekBirak = null;
    $('ek_onay').classList.add('tamam'); $('ek_btn').textContent = 'Onaylandı ✓';
    setTimeout(() => { history.replaceState(null, '', location.pathname); shell(); }, 650);
  };
  window.scrollTo(0, 0);
}

// Panel sekmesi
async function elKitabiView(view) {
  ekBirak && ekBirak(); ekBirak = null;
  const admin = GOREN();
  const onayT = EK.onay[EK.surum];
  view.innerHTML = `${admin ? `<div class="ek-sekme" role="tablist"><button class="on" data-s="oku">Kitap</button><button data-s="onay">Onay durumu</button><button data-s="duzen">Düzenle</button></div>` : ''}
    <div id="ek_alan"></div>`;
  const alan = $('ek_alan');
  const oku = () => {
    alan.innerHTML = ekGovde(false);
    $('ek_son').innerHTML = EK.tablo ? `<section class="ek-onay tamam"><div class="ek-onay-ikon">${ekIkon('kalkan', 30)}</div>
      <h2>${admin ? 'Personel onay ekranı' : 'Onayladınız'}</h2><p>${admin ? 'Personel panele girerken bu kitabı okuyup onaylar. Onay durumunu üstteki sekmeden izleyebilirsiniz.' : `Sürüm ${EK.surum} · ${onayT ? fdt(onayT) : '—'}`}</p></section>` : '';
    $('ek_yaz').onclick = ekYazdir;
    ekBirak = ekIzle(alan);
  };
  oku();
  if (!admin) return;
  view.querySelectorAll('.ek-sekme button').forEach(b => b.onclick = () => {
    view.querySelectorAll('.ek-sekme button').forEach(x => x.classList.toggle('on', x === b));
    ekBirak && ekBirak(); ekBirak = null;
    if (b.dataset.s === 'oku') oku(); else if (b.dataset.s === 'onay') ekOnayView(alan); else ekDuzenView(alan);
  });
}

// ---------------- yönetici: onay durumu ----------------
async function ekOnayView(alan) {
  if (!EK.tablo) { alan.innerHTML = `<div class="panel"><p>Onay kaydı için <b>08_el_kitabi.sql</b> dosyasını Supabase SQL Editor'da çalıştırın.</p></div>`; return; }
  alan.innerHTML = '<div class="loading">Yükleniyor…</div>';
  let rows = [];
  try { rows = await fetchAll('el_kitabi_onay', 'sicil,surum,onay_tarihi', q => q.eq('surum', EK.surum)); } catch (e) { alan.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; return; }
  const O = Object.fromEntries(rows.map(r => [r.sicil, r.onay_tarihi]));
  const L = DATA.ACT.map(p => ({ p, t: O[p.sicil] || null }));
  const n = L.filter(x => x.t).length, N = L.length;
  const st = { dep: '', d: '' };
  alan.innerHTML = `<div class="grid g4" style="margin-bottom:16px">
      <div class="panel kpi"><div class="lbl">Onaylayan</div><div class="val">${fn(n)}<small> / ${fn(N)}</small></div><div class="meter"><i style="width:${N ? n / N * 100 : 0}%;background:var(--ok)"></i></div><div class="note">Sürüm ${EK.surum} · yayın ${EK.yayin ? fd(EK.yayin.slice(0, 10)) : '—'}</div></div>
      <div class="panel kpi"><div class="lbl">Bekleyen</div><div class="val">${fn(N - n)}</div><div class="note">İlk girişlerinde kitap açılır</div></div>
      <div class="panel kpi"><div class="lbl">Oran</div><div class="val">${pct(N ? n / N : null)}</div><div class="note">Etkin personel üzerinden</div></div></div>
    <div class="panel"><div class="filters" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <select id="ek_dep"><option value="">Tüm departmanlar</option>${DATA.DEPS.map(d => `<option>${esc(d)}</option>`).join('')}</select>
      <select id="ek_d"><option value="">Tümü</option><option value="1">Onaylayanlar</option><option value="0">Bekleyenler</option></select>
      <button class="btn sm" id="ek_csv" type="button" style="margin-left:auto">CSV indir</button><button class="btn sm bad" id="ek_sifirla" type="button"${n ? '' : ' disabled'}>Tüm onayları kaldır</button></div>
      <div class="tbl"><table><thead><tr><th>Ad Soyad</th><th>Sicil</th><th>Departman</th><th>Unvan</th><th>Durum</th><th></th></tr></thead><tbody id="ek_tb"></tbody></table></div></div>`;
  const f = () => L.filter(x => (!st.dep || x.p.dep === st.dep) && (st.d === '' || (st.d === '1') === !!x.t));
  const ciz = () => { $('ek_tb').innerHTML = f().map(x => `<tr data-p="${esc(x.p.sicil)}"><td><b>${esc(x.p.ad)}</b></td><td>${esc(x.p.sicil)}</td><td>${esc(x.p.dep)}</td><td>${esc(x.p.unvan || '')}</td>
    <td>${x.t ? `<span class="pill p-onaylandi">Onayladı · ${fdt(x.t)}</span>` : '<span class="pill p-bekliyor">Bekliyor</span>'}</td>
    <td>${x.t ? `<button class="btn sm" type="button" data-kaldir="${esc(x.p.sicil)}">Onayı kaldır</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="mini">Kayıt yok.</td></tr>';
    $('ek_tb').querySelectorAll('[data-kaldir]').forEach(b => b.onclick = () => kaldir(b.dataset.kaldir)); };
  const kaldir = sicil => { const p = sicil && DATA.byS[sicil];
    modal(`<h3>${sicil ? 'Onay kaldırılsın mı?' : 'Tüm onaylar kaldırılsın mı?'}</h3><p>${sicil ? `<b>${esc(p ? p.ad : sicil)}</b> panele bir sonraki girişinde el kitabını yeniden okuyup onaylamak zorunda kalacak.` : `Onaylayan <b>${n}</b> kişinin onayı silinecek. Herkes panele bir sonraki girişinde el kitabını yeniden okuyup onaylayacak. Kitabın metni değişmez.`}</p>
      <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn bad" id="ek_k_evet">${sicil ? 'Onayı kaldır' : 'Tümünü kaldır'}</button></div>`, (bg, close) => {
      bg.querySelector('#ek_k_evet').onclick = async () => { close();
        const { error } = await sb.rpc('el_kitabi_onay_kaldir', { p_sicil: sicil || null });
        if (error) { alertMsg(/function|does not exist|schema cache/i.test(error.message) ? 'Bu özellik için 12_el_kitabi_onay_kaldir.sql dosyasını Supabase SQL Editor\'da çalıştırın.' : error.message); return; }
        ekOnayView(alan); }; }); };
  $('ek_sifirla').onclick = () => kaldir(null);
  $('ek_dep').onchange = e => { st.dep = e.target.value; ciz(); }; $('ek_d').onchange = e => { st.d = e.target.value; ciz(); };
  $('ek_csv').onclick = () => csvIndir(`el-kitabi-onay-surum${EK.surum}.csv`, [['Ad Soyad', 'Sicil', 'Departman', 'Unvan', 'Durum', 'Onay tarihi'],
    ...f().map(x => [x.p.ad, x.p.sicil, x.p.dep, x.p.unvan || '', x.t ? 'Onayladı' : 'Bekliyor', x.t ? fdt(x.t) : ''])]);
  ciz();
}

// ---------------- yönetici: düzenleme ----------------
function ekDuzenView(alan) {
  if (!EK.tablo) { alan.innerHTML = `<div class="panel"><p>Düzenleme için <b>08_el_kitabi.sql</b> dosyasını Supabase SQL Editor'da çalıştırın.</p></div>`; return; }
  let B = JSON.parse(JSON.stringify(EK.bolumler));
  const ikonSec = v => Object.keys(EK_IKON).map(k => `<option value="${k}"${k === v ? ' selected' : ''}>${k}</option>`).join('');
  const ciz = () => {
    alan.innerHTML = `<div class="panel" style="margin-bottom:14px"><h3>Nasıl yazılır?</h3>
      <div class="ek-yardim"><code>## Ara başlık</code><code>- madde</code><code>1. adım</code><code>+ Başlık | açıklama</code><code># 112 | açıklama</code><code>&gt; not kutusu</code><code>" alıntı</code><code>| hücre | hücre |</code><code>**kalın**</code><code>[yazı](https://…)</code><code>~ Dayanak: …</code></div></div>
      <div id="ek_dl">${B.map((b, i) => `<details class="panel ek-duz" data-i="${i}"${i === 0 ? ' open' : ''}><summary><span class="ek-no">${String(i + 1).padStart(2, '0')}</span> ${esc(b.baslik)}</summary>
        <div class="form"><div class="row2"><label>Başlık<input data-k="baslik" value="${esc(b.baslik)}"></label><label>Simge<select data-k="ikon">${ikonSec(b.ikon)}</select></label></div>
        <label>Kısa açıklama<input data-k="ozet" value="${esc(b.ozet || '')}"></label>
        <label>Metin<textarea data-k="metin" rows="12" spellcheck="true">${esc(b.metin)}</textarea></label>
        <div class="actions"><button class="btn sm" type="button" data-up="${i}"${i === 0 ? ' disabled' : ''}>↑ Yukarı</button><button class="btn sm" type="button" data-dn="${i}"${i === B.length - 1 ? ' disabled' : ''}>↓ Aşağı</button>
          <button class="btn sm" type="button" data-on="${i}">Önizle</button><button class="btn sm bad" type="button" data-sil="${i}" style="margin-left:auto">Bölümü sil</button></div></div></details>`).join('')}</div>
      <div class="actions" style="margin:12px 0 18px"><button class="btn" type="button" id="ek_ekle">+ Bölüm ekle</button></div>
      <div class="panel ek-yayin"><h3>Kaydet</h3><div id="ek_dm"></div>
        <div class="actions"><button class="btn" type="button" id="ek_kd">Kaydet (düzeltme · onay istenmez)</button>
          <button class="btn pri" type="button" id="ek_ys">Yeni sürüm yayınla · herkes yeniden onaylar</button>
          ${EK.ozel ? '<button class="btn bad" type="button" id="ek_vd" style="margin-left:auto">Varsayılan metne dön</button>' : ''}</div>
        <p class="mini">Yazım düzeltmesi gibi küçük değişiklikler için "Kaydet"i kullanın. Kural değiştiyse "Yeni sürüm yayınla" ile tüm personelden yeniden onay alın. Şu anki sürüm: ${EK.surum}.</p></div>`;
    const oku = () => alan.querySelectorAll('.ek-duz').forEach(d => { const b = B[+d.dataset.i]; d.querySelectorAll('[data-k]').forEach(x => b[x.dataset.k] = x.value); });
    alan.querySelectorAll('[data-up],[data-dn],[data-sil]').forEach(x => x.onclick = () => { oku();
      if (x.dataset.up) { const i = +x.dataset.up; [B[i - 1], B[i]] = [B[i], B[i - 1]]; }
      if (x.dataset.dn) { const i = +x.dataset.dn; [B[i + 1], B[i]] = [B[i], B[i + 1]]; }
      if (x.dataset.sil) { if (B.length < 2) return; B.splice(+x.dataset.sil, 1); }
      ciz(); });
    alan.querySelectorAll('[data-on]').forEach(x => x.onclick = () => { oku(); const b = B[+x.dataset.on];
      modal(`<div class="ek ek-modal"><section class="ek-bolum"><header><span class="ek-ikon">${ekIkon(b.ikon, 26)}</span><div><h2>${esc(b.baslik)}</h2><p>${esc(b.ozet || '')}</p></div></header><div class="ek-metin">${ekMd(b.metin)}</div></section></div><div class="acts"><button class="btn pri" data-close>Kapat</button></div>`,
        bg => bg.querySelector('.modal').classList.add('genis')); });
    $('ek_ekle').onclick = () => { oku(); B.push({ id: 'b' + Date.now().toString(36), ikon: 'belge', baslik: 'Yeni bölüm', ozet: '', metin: '' }); ciz(); alan.querySelector(`.ek-duz[data-i="${B.length - 1}"]`).open = true; };
    const kaydet = async (yeni, icerik) => {
      oku(); const m = $('ek_dm');
      if (icerik !== null && B.some(b => !String(b.baslik).trim())) { m.innerHTML = '<div class="msg err">Her bölümün başlığı olmalı.</div>'; return; }
      const { data, error } = await sb.rpc('el_kitabi_kaydet', { p_icerik: icerik === undefined ? B : icerik, p_yeni_surum: yeni });
      if (error) { m.innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
      await ekYukle(); B = JSON.parse(JSON.stringify(EK.bolumler)); ciz();
      $('ek_dm').innerHTML = `<div class="msg ok">${yeni ? `Sürüm ${data} yayınlandı. Personel bir sonraki girişinde kitabı yeniden onaylayacak.` : 'Kaydedildi.'}</div>`;
    };
    $('ek_kd').onclick = () => kaydet(false);
    $('ek_ys').onclick = () => modal(`<h3>Yeni sürüm yayınlansın mı?</h3><p>Sürüm ${EK.surum + 1} yayınlanacak. Tüm personel panele bir sonraki girişinde kitabı yeniden okuyup onaylamak zorunda kalacak.</p>
      <div class="acts"><button class="btn" data-close>Vazgeç</button><button class="btn pri" id="ek_evet">Yayınla</button></div>`, (bg, close) => {
        bg.querySelector('#ek_evet').onclick = () => { close(); kaydet(true); }; });
    if ($('ek_vd')) $('ek_vd').onclick = () => kaydet(false, null);
  };
  ciz();
}

// ---------------- yazdır / PDF ----------------
async function ekYazdir() {
  let k = document.getElementById('ekbaski');
  if (!k) { k = document.createElement('div'); k.id = 'ekbaski'; document.body.appendChild(k); }
  k.innerHTML = `<div class="ek">${ekKapak('')}${EK.bolumler.map((b, i) => `<section class="ek-bolum"><header><span class="ek-no">${String(i + 1).padStart(2, '0')}</span><span class="ek-ikon">${ekIkon(b.ikon, 26)}</span>
    <div><h2>${esc(b.baslik)}</h2>${b.ozet ? `<p>${esc(b.ozet)}</p>` : ''}</div></header><div class="ek-metin">${ekMd(b.metin)}</div></section>`).join('')}</div>`;
  let st = document.getElementById('ekbaski-sayfa');
  if (!st) { st = document.createElement('style'); st.id = 'ekbaski-sayfa'; document.head.appendChild(st); }
  st.textContent = '@page{size:A4;margin:14mm 14mm 16mm}';
  document.body.classList.add('ekbaski');
  await Promise.all([...k.querySelectorAll('img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })).filter(Boolean));
  const bitir = () => { document.body.classList.remove('ekbaski'); k.innerHTML = ''; st.textContent = ''; removeEventListener('afterprint', bitir); };
  addEventListener('afterprint', bitir);
  setTimeout(() => print(), 50);
}
