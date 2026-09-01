# ÇÖMEZ — Event Content Review (Phase 8)

Generated for human read-through. Total events: 179.

## Category counts

- GENERAL: 33
- CAREER: 23
- SOCIAL: 20
- BRANCH: 18
- MOBBING: 18
- NPC: 17
- FINANCIAL: 15
- HEALTH_SYSTEM: 13
- ON_CALL: 12
- RARE: 6
- HOSPITAL: 4

## BRANCH (18)

### gs_001_uzayan_ameliyat

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 6 weeks
- **Requirements:** `{"all":[{"branchIn":["genel_cerrahi"]}]}`

**AMELİYATHANE**

Planlanan ameliyat 2 saat sürecekti. 6 saattir masadasın. Ekip değişti, sen değişmedin. Ameliyathanenin saatine bakmaktan vazgeçtin.

**Choices:**
- `sonuna_kadar_kal`: Sonuna kadar masada kal.
  - effects: `{"stress":8,"fatigue":18}`
  - relationship: `[{"npc":"hoca_generic","trust":6}]`
- `degisim_iste`: Bir sonraki asistanla değişmeyi öner.
  - effects: `{"stress":5,"fatigue":8}`
  - relationship: `[{"npc":"asistan_generic","trust":2}]`

### gs_002_nobet_sonrasi_ameliyat

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 8 weeks
- **Requirements:** `{"all":[{"branchIn":["genel_cerrahi"]},{"gte":6,"stat":"career.week"}]}`

**SABAH 08.00**

Gece boyunca üç acil ameliyata girdin. Nöbet bitti ama bugünkü elektif ameliyat listesi de sana ait. Kimse bu listeyi değiştirmeyi düşünmedi çünkü 'zaten oradasın'.

**Choices:**
- `devam_et`: Kahve iç, listeye devam et.
  - effects: `{"stress":10,"fatigue":20,"burnout":3}`
- `izin_iste`: Kıdemliden birkaç saat izin iste.
  - effects: `{"stress":6}`
  - relationship: `[{"npc":"kidemli_generic_gs","trust":-2}]`
- `sessizce_gec`: Hiçbir şey söylemeden listeyi başka bir asistana devret.
  - effects: `{"stress":8}`
  - relationship: `[{"npc":"asistan_generic","grudge":4}]`

### gs_003_liste_degisikligi

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** `{"all":[{"branchIn":["genel_cerrahi"]}]}`

**SON DAKİKA LİSTE DEĞİŞİKLİĞİ**

Bugünkü ameliyat listesi sabah 06.30'da yeniden düzenlendi. Planladığın gün artık yok; yerine üç saat sonra biteceğini sandığın gün var.

**Choices:**
- `plani_iptal_et`: Günün planını sessizce iptal et.
  - effects: `{"stress":4}`
- `degisiklige_itiraz`: Değişikliğin nedenini sor.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"kidemli_generic_gs","trust":-2}]`

### gs_004_masa_sirasi

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **Requirements:** `{"all":[{"branchIn":["genel_cerrahi"]},{"gte":20,"stat":"career.week"}]}`

**MASADA KİM YAPACAK**

Ameliyatın kritik adımına yaklaşılıyor. Sen mi, senden bir kıdem üstteki mi yapacak, açıkça konuşulmadı. Hoca 'birileri karar versin' der gibi bakıyor.

**Choices:**
- `adimi_iste`: Adımı kendin istediğini belirt.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"kidemli_generic_gs","trust":-1}]`
  - statistics: `{"increment":{"gs_masa_talebi":1}}`
- `kidemliye_birak`: Sessizce kıdemliye bırak.
  - effects: `{"stress":1}`

### gs_006_morbidite_sunumu

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"branchIn":["genel_cerrahi"]},{"gte":25,"stat":"career.week"}]}`

**MORBİDİTE-MORTALİTE TOPLANTISI**

Geçen ay yaşanan bir komplikasyon bu haftaki toplantıda konuşulacak. Sunumu sen yapacaksın; olay sende geçmedi ama dosya sana devredildi diye sunum da sana kaldı.

**Choices:**
- `objektif_sun`: Olguyu olduğu gibi, savunmasız sun.
  - effects: `{"stress":6}`
  - behaviorTags: `["hierarchy:complicit"]`
- `kendi_payini_koru`: Sunumda kendi sorumluluğunu net biçimde ayır.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"hoca_generic","trust":-2}]`

### im_001_polyklinik_yigilmasi

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 8 weeks
- **Requirements:** `{"all":[{"branchIn":["ic_hastaliklari"]}]}`

**POLİKLİNİK**

Bugün polikliniğin randevu sayısı 80. Sen tek başınasın çünkü kıdemli 'bir işim çıktı' dedi. Bekleme salonunda insanlar senin adını yanlış telaffuz ederek çağırıyor.

**Choices:**
- `hepsine_bak`: Hepsine tek tek bak, geç kalsa da olsun.
  - effects: `{"stress":10,"fatigue":14}`
  - relationship: `[{"npc":"hasta_generic","trust":5}]`
- `hizli_gec`: Süreleri kısaltıp hepsini yetiştirmeye çalış.
  - effects: `{"stress":12,"fatigue":10}`
- `kidemliyi_ara`: Kıdemliyi arayıp gelmesini iste.
  - effects: `{"stress":6}`
  - relationship: `[{"npc":"kidemli_generic_im","trust":-4}]`

### im_002_konsultasyon_savasi

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** `{"all":[{"branchIn":["ic_hastaliklari"]},{"gte":8,"stat":"career.week"}]}`

**KONSÜLTASYON**

Cerrahi servisten bir hasta için konsültasyon istendi. Sen gidip değerlendirdin, hastanın asıl sorunu senin dalınla ilgili değil. Cerrahi asistanı 'siz bakın artık' diyor, sen 'bu sizin hastanız' diyorsun. Bu diyalog telefon üzerinden üçüncü kez yaşanıyor.

**Choices:**
- `hastayi_devral`: Tartışmayı bitirmek için hastayı fiilen devral.
  - effects: `{"stress":6,"fatigue":8}`
  - relationship: `[{"npc":"cerrahi_asistan_generic","trust":6}]`
- `hocaya_birak`: Kararı kendi hocana bırak.
  - effects: `{"stress":4}`
- `yazili_not_dus`: Dosyaya net bir konsültasyon notu düş, sorumluluğu netleştir.
  - effects: `{"stress":3,"fatigue":2}`
  - flags: `{"set":{"im_temiz_dokumantasyon":true}}`

### im_003_epikriz_yigilmasi

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** `{"all":[{"branchIn":["ic_hastaliklari"]},{"gte":5,"stat":"career.week"}]}`

**EPİKRİZ YIĞINI**

Taburcu olan hastaların epikrizleri iki haftadır birikiyor. İdare 'geciken epikriz sayısı raporlanacak' diye bir yazı göndermiş, imzası tanıdık değil.

**Choices:**
- `hafta_sonu_bitir`: Hafta sonu gelip hepsini bitir.
  - effects: `{"stress":2,"fatigue":8}`
- `gunluk_pay_et`: Her gün birkaç tanesini ekleyerek yavaş yavaş kapat.
  - effects: `{"stress":4}`
  - flags: `{"set":{"im_epikriz_gecikmesi":true}}`

### im_004_konsey_sunumu

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"branchIn":["ic_hastaliklari"]},{"gte":10,"stat":"career.week"}]}`

**VAKA KONSEYİ**

Haftalık dahiliye konseyinde sunum sırası sende. Salon dolu ama çoğu kişi telefonuna bakıyor. Hoca ilk sorudan sonra dinlemeye başlıyor genelde.

**Choices:**
- `detayli_hazirlan`: Gece geç saate kadar hazırlan.
  - effects: `{"stress":3,"fatigue":6}`
  - relationship: `[{"npc":"hoca_generic","trust":4}]`
- `asgari_hazirlan`: Yeterince hazırlan, fazla vakit harcama.
  - effects: `{"stress":2}`

### im_005_hasta_yakini_israri

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** `{"all":[{"branchIn":["ic_hastaliklari"]}]}`

**BEKLEME SALONUNDA**

Bir hasta yakını ısrarla seni görmek istiyor. Aynı anda iki farklı hastanın acil işi de sende. Israrı haklı olabilir, ama sıra sende değil.

**Choices:**
- `hemen_ayir`: İşini bölüp beş dakika ayır.
  - effects: `{"stress":5,"fatigue":3}`
  - relationship: `[{"npc":"hasta_generic","trust":5}]`
- `sirayi_koru`: Nazikçe sırasını bekletmesini iste.
  - effects: `{"stress":3}`
  - relationship: `[{"npc":"hasta_generic","trust":-3}]`

### im_006_stajyer_egitimi

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"branchIn":["ic_hastaliklari"]},{"in":["orta","kidemli"],"stat":"career.seniorityStage"}]}`

**STAJYER SANA DEVREDİLDİ**

Bu dönemki intörn grubu sana verildi. Onlara servis işleyişini öğretmek de artık senin işin, ayrı bir zaman bloğu olmadan.

**Choices:**
- `vakit_ayirarak_ogret`: Vakit ayırarak gerçekten öğret.
  - effects: `{"fatigue":5}`
  - relationship: `[{"npc":"asistan_generic","trust":5}]`
  - behaviorTags: `["junior:supportive"]`
- `kendi_haline_birak`: Gözlemlesinler yeter, kendi işine devam et.
  - effects: `{"stress":-2}`
  - behaviorTags: `["junior:exploitative"]`

### im_007_yatak_sikintisi

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **Requirements:** `{"all":[{"branchIn":["ic_hastaliklari"]},{"gte":12,"stat":"career.week"}]}`

**YATAK YOK**

Serviste boş yatak kalmadı. Acilden yeni bir hasta bekliyor, idare 'bir şekilde yer bulun' diyor, bir şekilde diye bir prosedür yok.

**Choices:**
- `taburculugu_hizlandir`: Taburcu edilebilecek bir hastanın sürecini hızlandır.
  - effects: `{"stress":6}`
- `idareye_yonlendir`: Sorunu idareye yönlendir, kendi işine bak.
  - effects: `{"stress":2}`
  - flags: `{"set":{"im_yatak_sorunu_yonlendirildi":true}}`

### psy_001_uzun_gorusme

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 8 weeks
- **Requirements:** `{"all":[{"branchIn":["psikiyatri"]}]}`

**GÖRÜŞME ODASI**

Planlanan görüşme 30 dakikaydı. 90. dakikadasın. Dışarıda bekleyen üç hasta daha var, birinin refakatçisi kapıyı iki kez araladı.

**Choices:**
- `gorusmeyi_uzat`: Görüşmeyi doğal bitiş noktasına kadar sürdür.
  - effects: `{"stress":4,"fatigue":6}`
  - relationship: `[{"npc":"hasta_generic","trust":6}]`
- `nazikce_kes`: Nazikçe sonlandır, devam randevusu ver.
  - effects: `{"stress":5}`
- `sekreteri_gonder`: Sekreteri gönderip diğerlerini beklemesini söyle.
  - effects: `{"stress":3}`
  - relationship: `[{"npc":"sekreter_generic","trust":-2}]`

### psy_002_supervizyon_iptali

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** `{"all":[{"branchIn":["psikiyatri"]},{"gte":10,"stat":"career.week"}]}`

**SÜPERVİZYON**

Haftalık süpervizyon randevun bu hafta da iptal oldu. Hocanın asistanı 'başka zaman bakılır' dedi. Bu, art arda dördüncü iptal. Vaka notların bilgisayarında sessizce birikiyor.

**Choices:**
- `resmi_talep`: Bölüm sekreterliğine resmi olarak yeni bir tarih talep et.
  - effects: `{"stress":3}`
  - flags: `{"set":{"psy_supervizyon_takipte":true}}`
- `sessizce_bekle`: Sessizce bir sonraki haftayı bekle.
  - effects: `{"stress":5,"burnout":2}`
- `baska_hocaya_git`: Başka bir öğretim üyesinden yardım iste.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"hoca_generic","trust":-3},{"npc":"hoca_ikinci_generic","trust":5}]`

### psy_003_yatak_yonlendirme

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **Requirements:** `{"all":[{"branchIn":["psikiyatri"]},{"gte":8,"stat":"career.week"}]}`

**YATAKLI SERVİSE SEVK**

Acil bir başvuru yataklı psikiyatri servisine yönlendirilmesi gereken düzeyde. Uygun yatak başka bir hastanede, oraya sevk için üç ayrı formun ıslak imzalı olması gerekiyor.

**Choices:**
- `sureci_bizzat_takip_et`: Formları bizzat elden takip et.
  - effects: `{"stress":4,"fatigue":5}`
- `sekreterlige_devret`: Süreci sekreterliğe devret, işine dön.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"sekreter_generic","trust":-1}]`

### psy_004_grup_terapisi_hazirlik

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"branchIn":["psikiyatri"]},{"gte":15,"stat":"career.week"}]}`

**GRUP TERAPİSİ**

Bu haftaki grup terapisi oturumunu sen yönetiyorsun. Hazırlık için ayrılan resmi bir zaman yok; ya mesai dışında hazırlanacaksın ya da doğaçlama gideceksin.

**Choices:**
- `aksam_hazirlan`: Akşam eve iş götürüp hazırlan.
  - effects: `{"stress":2,"fatigue":4}`
- `dogaclama_git`: Tecrübene güvenip doğaçlama git.
  - effects: `{"stress":5}`

### psy_005_vaka_sunumu

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"branchIn":["psikiyatri"]},{"gte":20,"stat":"career.week"}]}`

**AYLIK VAKA SUNUMU**

Aylık vaka sunumu sırası sende. Salon dolu; sunumun uzunluğu ve derinliği, orada bulunmayanlar tarafından bile sonradan konuşuluyor.

**Choices:**
- `detayli_hazirlan`: Hafta boyunca detaylı hazırlan.
  - effects: `{"fatigue":6}`
  - relationship: `[{"npc":"hoca_generic","trust":5}]`
- `standart_gec`: Standart bir sunumla geç.
  - effects: `{"stress":2}`

### psy_006_bilgi_talebi_siniri

- **Category:** BRANCH
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"branchIn":["psikiyatri"]},{"gte":10,"stat":"career.week"}]}`

**AİLENİN BİLGİ TALEBİ**

Bir hastanın ailesi tedavisi hakkında ayrıntılı bilgi istiyor. Hasta reşit ve rızası olmadan paylaşılamayacağını biliyorsun; aile bunu 'gizlemek' olarak algılıyor.

**Choices:**
- `siniri_acikla`: Gizlilik sınırını sakince açıkla.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"hasta_generic","trust":3}]`
- `hocaya_yonlendir`: Konuşmayı hocana yönlendir.
  - effects: `{"stress":1}`

## CAREER (23)

### chain_baris_04_dostluk

- **Category:** CAREER
- **Trigger:** scheduled (chain: baris / stage4)
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","trust":{"gte":25}}},{"eq":"dostluk","flag":"chain_baris_path"}]}`

**BARIŞ UZMAN OLDU**

Barış uzmanlık sınavını geçti. Artık aynı serviste farklı bir kimlikle duruyor. İlk yaptığı şeylerden biri, senin için bir sonraki dönem araştırma projesine ortak olmanı önermek oldu.

**Choices:**
- `teklifi_kabul`: Teklifi kabul et.
  - effects: `{"stress":3,"fatigue":4}`
  - relationship: `[{"npc":"baris","trust":10}]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage5","delayWeeks":25}`
- `kibarca_reddet`: Şu an yükün ağır olduğu için kibarca reddet.
  - effects: `{"stress":-2}`
  - relationship: `[{"npc":"baris","trust":3}]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage5","delayWeeks":25}`

### chain_baris_05_dostluk

- **Category:** CAREER
- **Trigger:** scheduled (chain: baris / stage5)
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","trust":{"gte":30}}},{"eq":"dostluk","flag":"chain_baris_path"}]}`

**VEDA**

Barış başka bir hastaneye geçiyor. Vedalaşırken sana eski nöbet defterini uzattı, 'artık senin' dedi ve gitti. Masanın üstünde, kendi ilk yılından bir asistanın bıraktığı bir evrak destesi duruyor.

**Choices:**
- `evraklari_kendin_hallet`: Evrakları kendin hallet, çömeze devretme.
  - effects: `{"stress":-3,"fatigue":5}`
  - relationship: `[{"boundNpc":"primary","trust":8}]`
  - flags: `{"set":{"chain_baris_cycle_outcome":"broke_the_cycle"}}`
  - behaviorTags: `["junior:supportive","junior:protected"]`
- `ayni_seyi_yap`: 'Yeni başlayanlar önce evrak işini öğrenmeli' de.
  - effects: `{"stress":-1}`
  - relationship: `[{"boundNpc":"primary","grudge":6}]`
  - flags: `{"set":{"chain_baris_cycle_outcome":"repeated_the_cycle"}}`
  - behaviorTags: `["junior:exploitative"]`

### chain_deniz_04_dongu_devam

- **Category:** CAREER
- **Trigger:** scheduled (chain: deniz / stage4)
- **Requirements:** (none)

**SESSİZ AYRILIŞ**

Deniz'in asistanlığı bitti. Vedalaşmadan, sıradan bir hafta sonu gibi ayrıldı. Onun hakkında hatırladığın en net şey, senden hiçbir şey istemediği.

**Choices:**
- `devam`: Devam et.
  - effects: `{}`
  - statistics: `{"increment":{"junior_cycle_continued":1}}`

### chain_deniz_04_dongu_kirildi

- **Category:** CAREER
- **Trigger:** scheduled (chain: deniz / stage4)
- **Requirements:** `{"all":[{"eq":"protected","flag":"deniz_path"},{"eq":"trusted","flag":"deniz_outcome"}]}`

**DÖNGÜ**

Deniz'in asistanlığı bitmeye yaklaşıyor. Sana teşekkür etmek için uğradı — bunu yapan pek olmamıştı. 'İlk yılımda böyle biri olsaydı' dedi, cümlesini tamamlamadan.

**Choices:**
- `kabul_et`: Teşekkürü kabul et.
  - effects: `{"stress":-3}`
  - behaviorTags: `["hierarchy:protective"]`
  - statistics: `{"increment":{"junior_cycle_broken":1}}`
- `gecistir`: 'Sen zaten hakkını verdin' diyerek geçiştir.
  - effects: `{"stress":-1}`

### chain_hoca_01_teklif

- **Category:** CAREER
- **Trigger:** pool (chain: hoca / stage1)
- **Once:** true
- **Required NPC template:** hoca_erhan
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**PROJE TEKLİFİ**

Doç. Dr. Erhan Kaya bir araştırma projesi için ortak arıyor. İlgini çekiyor ama proje kendi vaktinden çalacağı açık; bunu söylemiyor, sen zaten biliyorsun.

**Choices:**
- `kabul_et`: Kabul et.
  - effects: `{"fatigue":2}`
  - relationship: `[{"npc":"hoca_erhan","trust":4}]`
  - flags: `{"set":{"hoca_path":"joined"}}`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage2","delayWeeks":15}`
- `reddet`: Nazikçe reddet.
  - relationship: `[{"npc":"hoca_erhan","trust":-2}]`
  - flags: `{"set":{"hoca_path":"declined"}}`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage2","delayWeeks":15}`

### chain_hoca_02_disarida

- **Category:** CAREER
- **Trigger:** scheduled (chain: hoca / stage2)
- **Requirements:** (none)

**PROJE BAŞKASINA GİTTİ**

Hoca projeyi başka bir asistana verdi. O asistan şimdi seninle daha az konuşuyor, sanki aranızda bir yarış varmış ve sen kaybetmişsin gibi — oysa hiç yarışmamıştın.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":2}`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage3","delayWeeks":15}`

### chain_hoca_02_yuk

- **Category:** CAREER
- **Trigger:** scheduled (chain: hoca / stage2)
- **Requirements:** `{"all":[{"eq":"joined","flag":"hoca_path"}]}`

**PROJE SENİ YİYOR**

Hoca'nın projesi tahmin ettiğinden büyük çıktı. Her hafta yeni bir 'küçük ek iş' geliyor; hiçbiri gerçekten küçük değil.

**Choices:**
- `fazla_mesai`: Ekstra vakit ayır, hepsini yetiştir.
  - effects: `{"stress":3,"fatigue":6}`
  - relationship: `[{"npc":"hoca_erhan","trust":5}]`
  - behaviorTags: `["hierarchy:complicit"]`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage3","delayWeeks":15}`
- `sinir_koy`: Nazikçe bir sınır koy: 'Bu hafta bu kadarını yapabilirim.'
  - effects: `{"stress":-2}`
  - relationship: `[{"npc":"hoca_erhan","trust":-3}]`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage3","delayWeeks":15}`

### chain_hoca_03_referans

- **Category:** CAREER
- **Trigger:** scheduled (chain: hoca / stage3)
- **Requirements:** `{"all":[{"relationship":{"npc":"hoca_erhan","trust":{"gte":5}}}]}`

**İSİM ADİL SIRALANDI**

Hoca seni bir kongre için önerdi. Bildiri üstünde isim sırası bu kez adil: emeğin nerede geçtiyse orada duruyor.

**Choices:**
- `kabul_et`: Fırsatı değerlendir.
  - effects: `{"stress":-3,"money":-2000}`
  - relationship: `[{"npc":"hoca_erhan","trust":3}]`
  - flags: `{"set":{"hoca_outcome":"credited"}}`
  - statistics: `{"increment":{"career_opportunities_taken":1}}`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage4","delayWeeks":20}`

### chain_hoca_04_yakinlik

- **Category:** CAREER
- **Trigger:** scheduled (chain: hoca / stage4)
- **Requirements:** `{"all":[{"eq":"credited","flag":"hoca_outcome"}]}`

**AKADEMİK YAKINLIK**

Hoca artık seni kendi ekibinden sayıyor. Bu bir ayrıcalık; aynı zamanda gelecekte reddedemeyeceğin bir dizi 'küçük rica'nın da başlangıcı.

**Choices:**
- `iliskiyi_surdur`: İlişkiyi olduğu gibi sürdür.
  - relationship: `[{"npc":"hoca_erhan","trust":2}]`
- `mesafeyi_koru`: Bundan sonra biraz mesafe koy.
  - effects: `{"stress":-1}`
  - relationship: `[{"npc":"hoca_erhan","trust":-2}]`

### gen_015_ilk_fikir_soruldu

- **Category:** CAREER
- **Trigger:** pool
- **Once:** true
- **Requirements:** `{"all":[{"eq":"orta","stat":"career.seniorityStage"}]}`

**SANA SORULDU**

Bir servis kararı alınırken hoca ilk kez doğrudan sana ne düşündüğünü sordu. Küçük bir şey ama daha önce hiç olmamıştı.

**Choices:**
- `net_fikir_soyle`: Net bir fikir söyle.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"hoca_generic","trust":4}]`
- `temkinli_kal`: Temkinli bir cevap ver.
  - effects: `{"stress":1}`

### mc_congress_01

- **Category:** CAREER
- **Trigger:** pool (chain: mc_congress / stage1)
- **Cooldown:** 50 weeks
- **Requirements:** `{"all":[{"gte":25,"stat":"career.week"}]}`

**KONGRE DUYURUSU**

Branşının yıllık kongresi bu yıl senin şehrinde değil. Katılmak istiyorsan izin, ulaşım ve konaklama senin sorunun.

**Choices:**
- `katilmaya_karar_ver`: Katılmaya karar ver.
  - effects: `{"money":-2500}`
  - flags: `{"set":{"mc_congress_path":"going"}}`
  - followUpEvent: `{"chainId":"mc_congress","checkpoint":"stage2","delayWeeks":4}`
- `vazgec`: Bu yıl vazgeç.
  - effects: `{"stress":-1}`

### mc_congress_02

- **Category:** CAREER
- **Trigger:** scheduled (chain: mc_congress / stage2)
- **Requirements:** `{"all":[{"eq":"going","flag":"mc_congress_path"}]}`

**İZİN FORMU**

Kongre izni için formu doldurdun. Bölüm başkanı 'servis kim bakacak' diye sordu, cevabı sen de bilmiyorsun.

**Choices:**
- `israrci_ol`: İzin hakkın olduğunu vurgula.
  - effects: `{"stress":3}`
  - flags: `{"set":{"mc_congress_permission":"insisted"}}`
  - followUpEvent: `{"chainId":"mc_congress","checkpoint":"stage3","delayWeeks":5}`
- `yumusak_yaklas`: Nöbetini birine devrederek karşılık öner.
  - flags: `{"set":{"mc_congress_permission":"traded"}}`
  - onCallEffects: `[{"type":"transfer_player_shift_to_npc","target":{"npc":"kidemli_generic"}}]`
  - followUpEvent: `{"chainId":"mc_congress","checkpoint":"stage3","delayWeeks":5}`

### mc_congress_03

- **Category:** CAREER
- **Trigger:** scheduled (chain: mc_congress / stage3)
- **Requirements:** (none)

**KONGRE DÖNÜŞÜ**

Kongreden döndün. Üç gün servisten uzak kalmak, sandığından daha çok iyi gelmiş.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":-6,"fatigue":-3}`

### mc_poster_01

- **Category:** CAREER
- **Trigger:** pool (chain: mc_poster / stage1)
- **Cooldown:** 60 weeks
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**POSTER TEKLİFİ**

Hoca bir kongre posteri için veri toplamanı istedi. Ekstra iş, ama özgeçmişte bir satır.

**Choices:**
- `kabul_et`: Kabul et.
  - effects: `{"fatigue":4}`
  - flags: `{"set":{"mc_poster_path":"started"}}`
  - followUpEvent: `{"chainId":"mc_poster","checkpoint":"stage2","delayWeeks":5}`
- `reddet`: Vaktin yok, reddet.
  - effects: `{"stress":-1}`
  - flags: `{"set":{"mc_poster_path":"declined"}}`

### mc_poster_02

- **Category:** CAREER
- **Trigger:** scheduled (chain: mc_poster / stage2)
- **Requirements:** `{"all":[{"eq":"started","flag":"mc_poster_path"}]}`

**VERİ TOPLAMA HAFTASI**

Poster için gereken veriler dağınık dosyalarda. Bir kısmı elle taranmış, bir kısmı kayıp. Bu iş tahmininden uzun sürüyor.

**Choices:**
- `gece_calis`: Geceleri de çalış, işi zamanında bitir.
  - effects: `{"stress":3,"fatigue":6}`
  - flags: `{"set":{"mc_poster_effort":"high"}}`
  - followUpEvent: `{"chainId":"mc_poster","checkpoint":"stage3","delayWeeks":3}`
- `asgari_yeter`: Asgari düzeyde tamamla, hoca ne isterse desin.
  - effects: `{"fatigue":2}`
  - flags: `{"set":{"mc_poster_effort":"low"}}`
  - followUpEvent: `{"chainId":"mc_poster","checkpoint":"stage3","delayWeeks":3}`

### mc_poster_03_high

- **Category:** CAREER
- **Trigger:** scheduled (chain: mc_poster / stage3)
- **Requirements:** `{"all":[{"eq":"high","flag":"mc_poster_effort"}]}`

**POSTER KABUL EDİLDİ**

Poster kongreye kabul edildi. Hoca sunumda ismini üçüncü sırada yazdı. İlk iki isim posteri hiç görmemişti.

**Choices:**
- `sirayi_sorgula`: İsim sırasını nazikçe sorgula.
  - effects: `{"stress":3}`
  - relationship: `[{"npc":"hoca_generic","trust":-3}]`
  - statistics: `{"increment":{"mc_poster_questioned_order":1}}`
- `kabullen`: Bir şey deme, en azından ismin var.
  - effects: `{"stress":-1}`
  - behaviorTags: `["hierarchy:abused_silently"]`

### mc_poster_03_low

- **Category:** CAREER
- **Trigger:** scheduled (chain: mc_poster / stage3)
- **Requirements:** (none)

**POSTER GERİ ÇEVRİLDİ**

Poster kongre tarafından reddedildi. Hoca bunu sana söylerken senin adını hiç anmadı, sanki iş hiç sende değilmiş gibi.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":2}`

### mirror_01_comez_nobet_istegi

- **Category:** CAREER
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** `{"all":[{"eq":"comez","stat":"career.seniorityStage"}]}`

**KIDEMLİN SENDEN...**

Kıdemlin cumartesi nöbetini senden değiştirmeni istedi. Sebep söylemedi. Sen de sormadın, sormamayı öğrendin.

**Choices:**
- `kabul_et`: Kabul et.
  - effects: `{"stress":3,"fatigue":6}`
  - relationship: `[{"npc":"kidemli_generic","trust":5}]`
  - flags: `{"set":{"chain_mobbing_deneyimi_var":true}}`
- `reddet`: Reddet.
  - effects: `{"stress":8}`
  - relationship: `[{"npc":"kidemli_generic","grudge":8}]`
- `bakariz_yaz`: 'Bakarız' yaz.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"kidemli_generic","trust":-1}]`
- `mesaji_gormemis_gibi`: Mesajı görmemiş gibi yap.
  - effects: `{"stress":5}`
  - relationship: `[{"npc":"kidemli_generic","grudge":4}]`

### mirror_02_kidemli_yeni_comez

- **Category:** CAREER
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**BU AYKİ YENİ ÇÖMEZ**

Yeni asistan yarınki nöbetini değiştirmek istiyor. Annesinin ameliyatı var. Kendi haftan zaten dolu.

**Choices:**
- `nobetini_degistir`: Nöbetini değiştir.
  - effects: `{"stress":4,"fatigue":8}`
  - relationship: `[{"boundNpc":"primary","trust":12}]`
  - flags: `{"set":{"helped_new_comez":true,"missed_own_prep":true}}`
  - behaviorTags: `["junior:supportive"]`
- `baskasini_bulsun`: Başka birini bulmasını söyle.
  - effects: `{"stress":-1}`
  - relationship: `[{"boundNpc":"primary","trust":-3}]`
  - behaviorTags: `["junior:burdened"]`
- `reddet`: Reddet, kendi haftanı koru.
  - effects: `{"stress":-3}`
  - relationship: `[{"boundNpc":"primary","grudge":6}]`
  - behaviorTags: `["junior:exploitative"]`
- `biz_comezken`: 'Biz çömezken böyle şeyler isteyemezdik.' de.
  - effects: `{"stress":-4}`
  - relationship: `[{"boundNpc":"primary","trust":-8,"grudge":10}]`
  - behaviorTags: `["junior:exploitative","junior:humiliated"]`

### mirror_03_kidemli_hata_devri

- **Category:** CAREER
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**TETKİK GECİKMESİ**

Geçen hafta senin takip ettiğin bir tetkik sonucu üç gün gecikmeyle fark edildi. Hoca vizitte 'bunu kim atladı' diye sordu. Yeni asistan da o gün nöbetteydi.

**Choices:**
- `sahiplen`: 'Benim atladığım bir şey' de.
  - effects: `{"stress":6}`
  - relationship: `[{"npc":"hoca_generic","trust":-3},{"boundNpc":"primary","trust":10}]`
  - behaviorTags: `["junior:defended"]`
- `sessiz_kal`: Hiçbir şey söyleme, hoca zaten yeni asistana bakıyor.
  - effects: `{"stress":-2}`
  - relationship: `[{"boundNpc":"primary","trust":-6}]`
  - behaviorTags: `["junior:humiliated"]`

### mirror_04_kidemli_kongre_izni

- **Category:** CAREER
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**KONGRE İZNİ**

Yeni asistan bir kongre için izin istiyor. Bölümün bu ay için tanıdığı kongre izni kotası bir kişilik ve sen de aynı kongreye gitmeyi düşünüyordun.

**Choices:**
- `kotayi_ona_birak`: Kotayı ona bırak.
  - effects: `{"stress":3,"money":-1000}`
  - relationship: `[{"boundNpc":"primary","trust":10}]`
  - behaviorTags: `["junior:supportive"]`
- `kendin_kullan`: Kotayı kendin kullan, o gelecek yıl gider.
  - effects: `{"stress":-3}`
  - relationship: `[{"boundNpc":"primary","grudge":5}]`
  - behaviorTags: `["junior:exploitative"]`

### pr_004_sunumu_devretme

- **Category:** CAREER
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**SUNUMU DEVRETME FIRSATI**

Haftalık sunum sırası sende ama bu hafta gerçekten vaktin yok. Bir junior'a devredebilirsin — onun için bir fırsat olabilir, ya da hazır olmadığı bir yük.

**Choices:**
- `firsat_olarak_sun`: Destekleyerek devret, hazırlanmasına yardım et.
  - effects: `{"fatigue":2}`
  - relationship: `[{"boundNpc":"primary","trust":6}]`
  - behaviorTags: `["hierarchy:protective","junior:supportive"]`
- `sessizce_devret`: Sessizce devret, hazırlığı ona bırak.
  - relationship: `[{"boundNpc":"primary","trust":-2}]`
  - behaviorTags: `["junior:exploitative"]`

### pr_008_servis_karari

- **Category:** CAREER
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**SERVİS DÜZENİ KARARI**

Servisin günlük iş akışında bir değişiklik önerisi geldi: bazı işler daha erken saate alınacak. Karar artık senin masanda.

**Choices:**
- `ekibe_danis`: Kararı vermeden önce ekibe danış.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"asistan_generic","trust":4}]`
- `tek_basina_karar_ver`: Tartışmadan tek başına karar ver.
  - effects: `{"stress":-1}`
  - relationship: `[{"npc":"asistan_generic","trust":-3}]`

## FINANCIAL (15)

### econ_002_kira_kesildi

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"neq":true,"flag":"lives_with_family"}]}`

**KART EKSTRESİ**

Bu ayki kart ekstresinde kira ödemesinin normalden yüksek çekildiğini fark ettin. Bankayı aramak mı, sineye çekmek mi?

**Choices:**
- `bankayi_ara`: Bankayı ara, uğraş.
  - effects: `{"stress":3,"money":400}`
- `sinede_cek`: Uğraşacak vaktin yok, sineye çek.
  - effects: `{"money":-400}`

### econ_003_beklenmedik_masraf

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** (none)

**BEKLENMEDİK MASRAF**

Telefon ekranı çatladı. Tam da bu ay olacaktı.

**Choices:**
- `hemen_tamir_ettir`: Hemen tamir ettir.
  - effects: `{"stress":-2,"money":-3500}`
- `idare_et`: Çatlakla idare et.
  - effects: `{"stress":2}`

### econ_004_bilgisayar_bozuldu

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 40 weeks
- **Requirements:** (none)

**BİLGİSAYAR ÇÖKTÜ**

Kişisel bilgisayarın açılmıyor. Üzerinde yarım kalmış bir sunum, bazı notlar ve hiç yedeklemediğin birkaç dosya var.

**Choices:**
- `tamir_ettir`: Tamire götür.
  - effects: `{"stress":-1,"money":-4500}`
- `yenisini_al`: Yenisini al.
  - effects: `{"stress":-3,"money":-22000}`
- `idare_et`: Ödünç bilgisayarla idare et.
  - effects: `{"stress":4}`

### econ_005_karti_ekstresi_sasirtti

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** (none)

**EKSTRE**

Bu ayki kredi kartı ekstresi tahmin ettiğinden yüksek geldi. Faiz kalemi, geçen ay minimum ödeme yapmanın bedeli.

**Choices:**
- `tamamini_ode`: Borcun tamamını kapat.
  - effects: `{"stress":-2,"money":-5000}`
- `yine_minimum`: Yine minimum ödeme yap.
  - effects: `{"stress":2}`
  - flags: `{"set":{"econ_kredi_karti_borcu":true}}`

### econ_006_ozel_sigorta_zam

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 50 weeks
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**SİGORTA PRİM ZAMMI**

Özel sağlık sigortan yenilenme zamanı geldi. Prim, geçen yıla göre belirgin şekilde arttı. Aynı kapsam için.

**Choices:**
- `yenile`: Yenile, ödemeyi yap.
  - effects: `{"money":-6000}`
- `iptal_et`: İptal et, devlet sistemine güven.
  - effects: `{"stress":3}`
  - flags: `{"set":{"econ_ozel_sigorta_iptal":true}}`

### econ_007_vergi_iadesi

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 60 weeks
- **Requirements:** `{"all":[{"gte":30,"stat":"career.week"}]}`

**BEKLENMEDİK İADE**

Geçen yılki bir vergi kalemi hatalı hesaplanmış; hesabına beklenmedik bir iade yattı. Küçük ama gerçek bir sürpriz.

**Choices:**
- `biriktir`: Biriktir, dokunma.
  - effects: `{"stress":-3,"money":3500}`
- `kendine_bir_sey_al`: Kendine küçük bir şey al.
  - effects: `{"stress":-5,"money":1500}`

### econ_008_arkadas_borc_istiyor

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 40 weeks
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**BORÇ RİCASI**

Yakın bir arkadaşın senden borç istedi. Miktar küçük değil. Geri ödeme konusunda net bir tarih vermedi, sen de sormadın.

**Choices:**
- `borc_ver`: Borç ver, sormadan.
  - effects: `{"stress":2,"money":-5000}`
  - relationship: `[{"npc":"asistan_generic","trust":6}]`
- `kibarca_reddet`: Kibarca reddet, kendi durumunu açıkla.
  - effects: `{"stress":3}`
  - relationship: `[{"npc":"asistan_generic","trust":-2}]`

### fin_001_telefon_bozuldu

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** (none)

**TELEFONUN BOZULDU**

Telefonun nöbet sırasında yere düştü. Ekranın artık yalnızca üst üçte biri çalışıyor. Mesajları okumak için telefonu ters çevirip aşağıdan yukarı kaydırmayı öğrendin.

**Choices:**
- `yeni_telefon`: Yeni telefon al.
  - effects: `{"stress":-4,"money":-18000}`
- `ekran_degistir`: Ekranı değiştir.
  - effects: `{"stress":-1,"money":-3500}`
- `boyle_kullan`: Böyle kullanmaya devam et.
  - effects: `{"stress":3}`
  - flags: `{"set":{"kirik_telefon":true}}`

### fin_002_dogum_gunu

- **Category:** FINANCIAL
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"eq":true,"flag":"has_partner"}]}`

**DOĞUM GÜNÜ**

Sevgilinin doğum gününü hatırladın. Daha doğrusu telefonun hatırlattı.

**Choices:**
- `guzel_hediye`: Güzel bir hediye al.
  - effects: `{"stress":-3,"money":-4000}`
  - relationship: `[{"npc":"sevgili_generic","trust":8}]`
- `kucuk_hediye`: Küçük bir şey al.
  - effects: `{"money":-800}`
  - relationship: `[{"npc":"sevgili_generic","trust":2}]`
- `nobet_bahanesi`: 'Bu hafta nöbet çok yoğundu' de.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"sevgili_generic","trust":-6}]`

### mc_landlord_01

- **Category:** FINANCIAL
- **Trigger:** pool (chain: mc_landlord / stage1)
- **Cooldown:** 60 weeks
- **Requirements:** `{"all":[{"neq":true,"flag":"lives_with_family"},{"gte":30,"stat":"career.week"}]}`

**KİRA ZAMMI**

Ev sahibi kirayı piyasa üstünde bir zamla artırmak istiyor. Kontrat teknik olarak buna izin vermiyor, ama itiraz etmenin de bir bedeli olabilir.

**Choices:**
- `itiraz_et`: Kontrata dayanarak itiraz et.
  - effects: `{"stress":4}`
  - flags: `{"set":{"mc_landlord_path":"objected"}}`
  - followUpEvent: `{"chainId":"mc_landlord","checkpoint":"stage2","delayWeeks":3}`
- `kabul_et`: Tartışmaya vaktin yok, kabul et.
  - effects: `{}`
  - flags: `{"set":{"mc_landlord_path":"accepted"}}`
  - followUpEvent: `{"chainId":"mc_landlord","checkpoint":"stage2","delayWeeks":3}`

### mc_landlord_02_accepted

- **Category:** FINANCIAL
- **Trigger:** scheduled (chain: mc_landlord / stage2)
- **Requirements:** (none)

**TAM ZAM**

Zam olduğu gibi geçti. Aylık bütçen bir gecede küçüldü, sen bunu fark etmeye bile vakit bulamadan.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":2,"money":-4500}`

### mc_landlord_02_objected

- **Category:** FINANCIAL
- **Trigger:** scheduled (chain: mc_landlord / stage2)
- **Requirements:** `{"all":[{"eq":"objected","flag":"mc_landlord_path"}]}`

**ORTA YOL**

Ev sahibi zammı biraz düşürdü. Sana 'bu kadar uğraşmasan da olurdu' dedi, sanki asıl tuhaf olan sen istemişsin gibi.

**Choices:**
- `devam`: Devam et.
  - effects: `{"money":-2000}`

### mc_moving_01

- **Category:** FINANCIAL
- **Trigger:** pool (chain: mc_moving / stage1)
- **Once:** true
- **Requirements:** `{"all":[{"neq":true,"flag":"lives_with_family"},{"gte":12,"stat":"career.week"}]}`

**EV SAHİBİ ARADI**

Ev sahibi kontratı yenilemek istemiyor, evi satacakmış. Bir ay içinde çıkman gerekiyor.

**Choices:**
- `hemen_ara`: Hemen ev aramaya başla.
  - effects: `{"stress":4,"fatigue":2}`
  - flags: `{"set":{"mc_moving_path":"early"}}`
  - followUpEvent: `{"chainId":"mc_moving","checkpoint":"stage2","delayWeeks":3}`
- `erteleyerek_calis`: Nöbetler bitince bakarsın, şimdilik ertele.
  - effects: `{"stress":2}`
  - flags: `{"set":{"mc_moving_path":"late"}}`
  - followUpEvent: `{"chainId":"mc_moving","checkpoint":"stage2","delayWeeks":3}`

### mc_moving_02_early

- **Category:** FINANCIAL
- **Trigger:** scheduled (chain: mc_moving / stage2)
- **Requirements:** `{"all":[{"eq":"early","flag":"mc_moving_path"}]}`

**YENİ EV**

Uygun bir ev buldun, taşınma sakin geçti. Depozito hesabını görene kadar.

**Choices:**
- `devam`: Depozitoyu öde.
  - effects: `{"stress":-2,"money":-12000}`

### mc_moving_02_late

- **Category:** FINANCIAL
- **Trigger:** scheduled (chain: mc_moving / stage2)
- **Requirements:** (none)

**SON DAKİKA TAŞINMA**

İki gün önce bulduğun ilk evi, koşullarını sorgulamadan tuttun. Nöbet haftasında eşyalarını taşıdın.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":5,"fatigue":8,"money":-15000}`

## GENERAL (33)

### bur_001_imza_eksik

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **Requirements:** (none)

**EKSİK İMZA**

Evrak hazır, tek eksiği bir imza. İmza sahibi bu hafta izinde. Vekili kim olduğu belli değil.

**Choices:**
- `vekili_bul`: Vekilini bulmak için birkaç birim dolaş.
  - effects: `{"stress":2,"fatigue":3}`
- `izinliyi_ara`: İzindeki kişiyi arayıp rahatsız et.
  - effects: `{"stress":1}`
  - relationship: `[{"npc":"hoca_generic","trust":-2}]`

### bur_002_eski_yeni_form

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **Requirements:** (none)

**FORMUN İKİ VERSİYONU**

Doldurduğun form eski versiyonmuş. Yeni versiyon aynı bilgileri farklı sırada istiyor. İkisi arasındaki fark, üç ay önce yayınlanan ama kimsenin okumadığı bir genelgeyle açıklanmış.

**Choices:**
- `yeniden_doldur`: Yeni formu baştan doldur.
  - effects: `{"stress":2,"fatigue":2}`
- `eskiyi_israrla_savun`: Eski formun neden yeterli olduğunu ısrarla savun.
  - effects: `{"stress":4}`

### bur_003_kayip_kase

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** (none)

**KAŞE NEREDE**

Belgenin onaylanması için gereken kaşe, ilgili birimin masasında değil. 'Başka bir arkadaşta olabilir' dediler, hangi arkadaş belirtilmedi.

**Choices:**
- `kaseyi_ara`: Kaşeyi bulana kadar sor sor dolaş.
  - effects: `{"stress":3,"fatigue":3}`
- `yarina_birak`: Yarına bırak.
  - effects: `{"stress":1}`

### bur_004_baska_binaya_tasima

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** (none)

**DİĞER BİNA**

Belgenin bir kopyasının elden, on dakika yürüyerek gidilen başka bir binaya teslim edilmesi gerekiyor. Dijital gönderim seçeneği teorik olarak var ama kimse kullanmıyor.

**Choices:**
- `kendin_goetuer`: Kendin götür.
  - effects: `{"fatigue":3}`
- `dijital_dene`: Dijital gönderimi dene, riske gir.
  - effects: `{"stress":2}`
  - flags: `{"set":{"bur_dijital_denendi":true}}`

### bur_005_toner_bitti

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** (none)

**TONER BİTTİ**

Serviste toner bitti. Yedek stok 'sipariş süreci devam ediyor' durumunda, üç haftadır. Yazdırman gereken belge acil.

**Choices:**
- `baska_yerde_yazdir`: Başka bir birimde yazdır.
  - effects: `{"fatigue":2}`
- `cebinden_toner_al`: Cebinden toner satın al.
  - effects: `{"money":-1200}`

### bur_006_eimza_sistemi_coktu

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":8,"stat":"career.week"}]}`

**E-İMZA ÇÖKTÜ**

Elektronik imza sistemi bu sabahtan beri çalışmıyor. Islak imza için ilgili herkesin aynı anda aynı odada olması gerekiyor; bu asla olmuyor.

**Choices:**
- `islak_imza_pesinde_kos`: Islak imza için herkesin peşinden koş.
  - effects: `{"stress":3,"fatigue":4}`
- `sistemin_duzelmesini_bekle`: Sistemin düzelmesini bekle, iş bekler.
  - effects: `{"stress":5}`

### bur_007_ayni_belge_iki_kez

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** (none)

**AYNI BELGE İKİ KEZ**

Az önce teslim ettiğin belgenin bir kopyasını, bu kez farklı bir birime, farklı bir dosyada tekrar teslim etmen isteniyor. İçerik birebir aynı.

**Choices:**
- `sessizce_tekrar_hazirla`: Sessizce tekrar hazırla, teslim et.
  - effects: `{"stress":2,"fatigue":2}`
- `nedenini_sor`: Neden iki kez gerektiğini sor.
  - effects: `{"stress":3}`

### bur_008_yanlis_dosya_no

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**YANLIŞ DOSYA NUMARASI**

Bir hastanın dosya numarası sistemde yanlış girilmiş, yıllar önce. Şimdi düzeltmek istiyorsun ama düzeltme işlemi için ayrı bir form, o formun için de ayrı bir onay gerekiyor.

**Choices:**
- `duzeltme_surecini_baslat`: Düzeltme sürecini başlat.
  - effects: `{"stress":2,"fatigue":3}`
  - flags: `{"set":{"bur_dosya_duzeltme_baslatildi":true}}`
- `boyle_kalsin`: Şimdilik böyle kalsın, kimseyi ilgilendirmiyor.
  - effects: `{"stress":-1}`

### chain_baris_01_ilk_gorev

- **Category:** GENERAL
- **Trigger:** pool (chain: baris / stage1)
- **Once:** true
- **Requirements:** `{"all":[{"gte":6,"stat":"career.week"},{"lte":16,"stat":"career.week"}]}`

**KIDEMLİ BARIŞ**

Üçüncü kıdem asistan Barış seni koridorda durdurdu. Elindeki bir deste epikrizi sana uzattı. 'Yeni başlayanlar önce evrak işini öğrenmeli' dedi, gülümsemesi samimi mi alaycı mı anlayamadın.

**Choices:**
- `sessizce_kabul`: Sessizce kabul et.
  - effects: `{"stress":2,"fatigue":5}`
  - relationship: `[{"npc":"baris","trust":5}]`
  - flags: `{"set":{"chain_baris_path":"dostluk"}}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage2","delayWeeks":14}`
- `nazik_sinir`: Nazikçe sınır koy: 'Bu benim işim değil ama yardımcı olurum.'
  - effects: `{"stress":1,"fatigue":3}`
  - relationship: `[{"npc":"baris","trust":8}]`
  - flags: `{"set":{"chain_baris_path":"dostluk"}}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage2","delayWeeks":14}`
- `reddet`: 'Bu senin işin' de.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"baris","trust":-5,"grudge":10}]`
  - flags: `{"set":{"chain_baris_path":"gerilim"}}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage2","delayWeeks":14}`
- `kidemliye_sikayet`: Bölüm kıdemlisine şikayet et.
  - effects: `{"stress":6}`
  - relationship: `[{"npc":"baris","trust":-10,"grudge":20}]`
  - flags: `{"set":{"chain_baris_path":"gerilim","chain_baris_yonetime_gitti":true}}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage2","delayWeeks":14}`

### chain_baris_02_dostluk

- **Category:** GENERAL
- **Trigger:** scheduled (chain: baris / stage2)
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","trust":{"gte":10}}},{"eq":"dostluk","flag":"chain_baris_path"}]}`

**BARIŞ'TAN BEKLENMEDİK BİR RİCA**

Barış bu sefer farklı bir tonda yaklaştı. Gelecek ay bir aile meselesi çıkmış, cumartesi nöbetini senden istiyor ama karşılığında kendi nöbetlerinden birini sana bırakmayı teklif ediyor.

**Choices:**
- `takasi_kabul`: Takası kabul et.
  - effects: `{"fatigue":4}`
  - relationship: `[{"npc":"baris","trust":10}]`
  - behaviorTags: `["npc:baris:cooperative"]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage3","delayWeeks":20}`
- `karsiliksiz_yardim`: 'Takasa gerek yok, değiştiririm' de.
  - effects: `{"stress":-2,"fatigue":5}`
  - relationship: `[{"npc":"baris","trust":15}]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage3","delayWeeks":20}`

### chain_baris_03_dostluk

- **Category:** GENERAL
- **Trigger:** scheduled (chain: baris / stage3)
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","trust":{"gte":20}}},{"eq":"dostluk","flag":"chain_baris_path"}]}`

**KÖTÜ BİR GECE**

Nöbetin felaket gidiyor: art arda üç zor vaka, yardım isteyecek kimse yok sandığın anda Barış habersizce servise geldi. 'Geçerken uğradım' dedi, sabaha kadar yanında kaldı.

**Choices:**
- `tesekkur_et`: Sabah içtenlikle teşekkür et.
  - effects: `{"stress":-8,"fatigue":-5}`
  - relationship: `[{"npc":"baris","trust":12}]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage4","delayWeeks":25}`
- `utangac_kal`: Utanarak sadece başını salla.
  - effects: `{"stress":-5,"fatigue":-3}`
  - relationship: `[{"npc":"baris","trust":6}]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage4","delayWeeks":25}`

### chain_hoca_04_kapanis

- **Category:** GENERAL
- **Trigger:** scheduled (chain: hoca / stage4)
- **Requirements:** (none)

**AYNI KORİDOR**

Hoca'yla artık sadece koridorda karşılaşıyorsunuz. Ne dostça ne düşmanca, sadece iki kişi aynı binada çalışıyor.

**Choices:**
- `devam`: Devam et.
  - effects: `{}`

### chain_sekreter_01_pencere

- **Category:** GENERAL
- **Trigger:** pool (chain: sekreter / stage1)
- **Once:** true
- **Requirements:** `{"all":[{"gte":6,"stat":"career.week"}]}`

**SEKRETERLİK PENCERESİ**

Bölüm sekreteri Zeynep Hanım'ın penceresinde üç kişilik sıra var. Elindeki evrak bugün onaylanmazsa haftaya kalıyor.

**Choices:**
- `nazik_bekle`: Sırana sessizce gir, bekle.
  - effects: `{"stress":1}`
  - relationship: `[{"npc":"zeynep_sekreter","trust":3}]`
  - flags: `{"set":{"sekreter_path":"patient"}}`
  - followUpEvent: `{"chainId":"sekreter","checkpoint":"stage2","delayWeeks":10}`
- `one_gec`: Aciliyetini belirterek öne geçmeye çalış.
  - effects: `{"stress":-1}`
  - relationship: `[{"npc":"zeynep_sekreter","trust":-2}]`
  - flags: `{"set":{"sekreter_path":"pushy"}}`
  - followUpEvent: `{"chainId":"sekreter","checkpoint":"stage2","delayWeeks":10}`

### chain_sekreter_02_resmi

- **Category:** GENERAL
- **Trigger:** scheduled (chain: sekreter / stage2)
- **Requirements:** (none)

**STANDART PROSEDÜR**

Zeynep Hanım her adımı tek tek anlattı. Atlanan hiçbir şey yok, kısaltılan hiçbir şey yok. Kibar ama tamamen mesafeli.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":1}`
  - followUpEvent: `{"chainId":"sekreter","checkpoint":"stage3","delayWeeks":20}`

### chain_sekreter_02_yardim

- **Category:** GENERAL
- **Trigger:** scheduled (chain: sekreter / stage2)
- **Requirements:** `{"any":[{"relationship":{"npc":"zeynep_sekreter","trust":{"gte":8}}},{"eq":"patient","flag":"sekreter_path"}]}`

**KISA YOL**

Zeynep Hanım, aslında senin doldurman gerekmeyen bir bölümü kendi eliyle tamamladı. 'Bunu her seferinde açıklamıyorum' dedi, gözünü kağıttan kaldırmadan.

**Choices:**
- `minnettar_ol`: Açıkça minnettar ol.
  - relationship: `[{"npc":"zeynep_sekreter","trust":4,"friendship":2}]`
  - followUpEvent: `{"chainId":"sekreter","checkpoint":"stage3","delayWeeks":20}`
- `normal_karsila`: Sıradan bir teşekkürle geç.
  - relationship: `[{"npc":"zeynep_sekreter","trust":1}]`
  - followUpEvent: `{"chainId":"sekreter","checkpoint":"stage3","delayWeeks":20}`

### chain_sekreter_03_bulunamadi

- **Category:** GENERAL
- **Trigger:** scheduled (chain: sekreter / stage3)
- **Requirements:** (none)

**BULUNAMADI**

Aynı evrak için sekreterliği aradın. 'Şu an bulamıyorum, izindeyim' dendi kısaca. Belge hiçbir zaman gerçekten kaybolmamıştı. Sadece bulunamamıştı.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":5}`
  - flags: `{"set":{"sekreter_outcome":"not_found"}}`
  - followUpEvent: `{"chainId":"sekreter","checkpoint":"stage4","delayWeeks":15}`

### chain_sekreter_03_bulundu

- **Category:** GENERAL
- **Trigger:** scheduled (chain: sekreter / stage3)
- **Requirements:** `{"all":[{"relationship":{"npc":"zeynep_sekreter","trust":{"gte":8}}}]}`

**BULUNDU**

Bölüm çapında aranan bir evrak kayıp sanılıyordu. Zeynep Hanım'ı aradın; iki dakikada nerede olduğunu söyledi. Kimse ondan iyi bilmiyor bu binayı.

**Choices:**
- `rahatla`: Rahatla, teşekkür et.
  - effects: `{"stress":-4}`
  - relationship: `[{"npc":"zeynep_sekreter","trust":3}]`
  - flags: `{"set":{"sekreter_outcome":"found"}}`
  - followUpEvent: `{"chainId":"sekreter","checkpoint":"stage4","delayWeeks":15}`

### chain_sekreter_04_mesafe

- **Category:** GENERAL
- **Trigger:** scheduled (chain: sekreter / stage4)
- **Requirements:** (none)

**PENCEREDEN GEÇERKEN**

Zeynep Hanım'la aranız hâlâ resmi. Penceresinin önünden geçerken sadece baş sallıyorsunuz. Ne kötü ne iyi, sadece hiç açılmamış.

**Choices:**
- `devam`: Devam et.
  - effects: `{}`

### gen_001_sessiz_hafta

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":10,"stat":"career.week"}]}`

**HAFTA 37**

Bu hafta şaşırtıcı şekilde hiçbir şey olmadı. Nöbet normaldi, hoca vizitte sakindi, kimse ağlamadı. Bundan şüpheleniyorsun.

**Choices:**
- `rahatla`: Rahatla, iyi bir hafta da olabilir.
  - effects: `{"stress":{"min":-5,"max":-2}}`
- `hazirlan`: Fırtına öncesi sessizlik, tetikte kal.
  - effects: `{"stress":2,"fatigue":2}`

### gen_002_vizit_gecikmesi

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 6 weeks
- **Requirements:** (none)

**SABAH VİZİTİ**

Hoca vizite 40 dakika geç geldi. Sebebini kimse sormuyor. Sen de sormayacaksın. Servis koridorunda hastalar, hasta yakınları ve sen 40 dakikadır ayaktasınız.

**Choices:**
- `sessizce_bekle`: Sessizce bekle.
  - effects: `{"stress":3,"fatigue":5}`
- `dosyalari_hazirla`: Beklerken dosyaları önceden hazırla.
  - effects: `{"stress":1,"fatigue":6}`
  - relationship: `[{"npc":"hoca_generic","trust":3}]`
- `kahve_ic`: Gizlice bir kahve iç.
  - effects: `{"stress":2,"fatigue":3}`
  - flags: `{"set":{"kahve_sayaci_general":1}}`

### gen_003_hbys_coktu

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** (none)

**SİSTEM ÇÖKTÜ**

HBYS iki saattir çalışmıyor. IT departmanı 'kısa süre içinde düzelecek' diyor. Bu cümleyi son üç aydır her hafta duyuyorsun. Tüm tetkik sonuçları kağıt üzerinden takip ediliyor, el yazın da giderek kötüleşiyor.

**Choices:**
- `kagit_takip`: Her şeyi kağıda yaz, sonra sisteme gireriz.
  - effects: `{"stress":5,"fatigue":8}`
- `bekle`: Sistemin açılmasını bekle, iş birikir ama olsun.
  - effects: `{"stress":6}`
- `sikayet_grubu`: Asistan grubuna 'yine mi' diye yaz.
  - effects: `{"stress":-1}`
  - flags: `{"set":{"hbys_sikayet_general":true}}`

### gen_004_izin_talebi

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**YILLIK İZİN**

Bir haftalık izin hakkın birikti. Kıdemli sekreterya seni arayıp 'şu an uygun değil ama sen yine de dilekçe yaz' dedi. Bu cümlenin ne anlama geldiğinden emin değilsin.

**Choices:**
- `dilekce_yaz`: Dilekçeyi yaz ve bekle.
  - effects: `{"stress":2}`
  - flags: `{"set":{"izin_dilekcesi_bekliyor":true}}`
- `vazgec`: Bu sene izin yok, unut gitsin.
  - effects: `{"stress":8,"burnout":3}`
- `israrci_ol`: Israrla takip et, her gün sor.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"sekreter_generic","trust":-3}]`

### gen_006_servis_telefonu

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** (none)

**SERVİS TELEFONU**

Servis telefonu son bir saatte on iki kez çaldı. Sekizi seni ilgilendirmiyordu. Telefonu her açışında bir sonraki cümlenin ne olacağını artık tahmin edebiliyorsun.

**Choices:**
- `hepsine_bak`: Her aramaya sabırla cevap ver.
  - effects: `{"stress":3,"fatigue":4}`
- `ilgisizleri_yonlendir`: Seni ilgilendirmeyenleri doğru kişiye yönlendir.
  - effects: `{"stress":2}`

### gen_007_ogun_atlama

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 8 weeks
- **Requirements:** (none)

**ÖĞLE ARASI**

Saat 15.40. Bugün henüz bir şey yemedin. Kantin 15.30'da kapanıyor. Bu ayki üçüncü kez.

**Choices:**
- `atistirmalikla_gec`: Makineden bir şey al, geç.
  - effects: `{"fatigue":2,"money":-150}`
- `boyle_devam`: Aç kal, akşamı bekle.
  - effects: `{"stress":3,"fatigue":5}`

### gen_008_soyunma_dolabi

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** (none)

**SOYUNMA ODASI**

Dolabın kilidi bir haftadır bozuk. Bugün içindeki birkaç eşyan kayboldu. Kimse bir şey görmemiş.

**Choices:**
- `sikayet_dilekcesi`: İdareye resmi şikayet dilekçesi ver.
  - effects: `{"stress":2}`
  - flags: `{"set":{"gen_dolap_sikayeti":true}}`
- `kendi_kilidini_al`: Kendi asma kilidini takıp geç.
  - effects: `{"money":-300}`

### gen_009_yeni_genelge

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"gte":6,"stat":"career.week"}]}`

**YENİ GENELGE**

Bugün panoya asılan genelge, üç ay önceki genelgeyi iptal ediyor. O da altı ay önceki başka bir genelgeyi iptal etmişti. Hangisi geçerli, kimse tam olarak bilmiyor.

**Choices:**
- `dikkatlice_oku`: Genelgeyi dikkatle oku, notlarını al.
  - effects: `{"stress":1,"fatigue":1}`
- `sonra_bakarim`: 'Sonra bakarım' diyip geç.
  - effects: `{}`

### gen_011_forma_degisikligi

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 40 weeks
- **Requirements:** `{"all":[{"gte":10,"stat":"career.week"}]}`

**YENİ FORMA YÖNETMELİĞİ**

Hastane yönetimi asistan formalarının rengini değiştirdi. Eski formalar 'geçiş süreci' boyunca kullanılabilirmiş. Geçiş sürecinin ne zaman biteceği belirtilmemiş.

**Choices:**
- `yeni_forma_al`: Yeni formayı hemen al.
  - effects: `{"money":-900}`
- `eskiyi_giymeye_devam`: Eskisini giymeye devam et.
  - effects: `{"stress":1}`

### gen_012_powernap_firsati

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** `{"all":[{"gte":1,"stat":"onCall.currentMonthTotalShifts"}]}`

**ON BEŞ DAKİKA**

Nöbet arasında beklenmedik bir boşluk çıktı: on beş dakika, hiçbir şey olmuyor. Nöbet odasındaki koltuk seni çağırıyor.

**Choices:**
- `uyu`: Gözlerini kapat, uyu.
  - effects: `{"fatigue":-8}`
- `dosya_bak`: Bu vakti geride kalan dosyalara ayır.
  - effects: `{"stress":-2}`

### gen_013_toplu_tasima_gecikmesi

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** `{"all":[{"neq":true,"flag":"lives_with_family"}]}`

**SEFER İPTALİ**

Sabah servisine yetişeceğin otobüs seferi iptal edildi, bir sonraki 40 dakika sonra. Vizite yetişip yetişemeyeceğini hesaplıyorsun.

**Choices:**
- `taksiye_bin`: Taksiye binip yetişmeye çalış.
  - effects: `{"stress":-1,"money":-350}`
- `gec_kal`: Bekle, geç kal.
  - effects: `{"stress":4}`

### gen_014_ortada_kalmislik

- **Category:** GENERAL
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"eq":"orta","stat":"career.seniorityStage"}]}`

**NE ÇÖMEZ NE KIDEMLİ**

Artık çömez sayılmıyorsun ama kararları hâlâ başkaları veriyor. Bu ara dönem, bazı günler hafiflik gibi, bazı günler belirsizlik gibi hissettiriyor.

**Choices:**
- `sorumluluk_iste`: Daha fazla sorumluluk istediğini belirt.
  - effects: `{"stress":2}`
  - statistics: `{"increment":{"orta_sorumluluk_istedi":1}}`
- `akisina_birak`: Akışına bırak, acele etme.
  - effects: `{"stress":-1}`

### mc_mealcard_01

- **Category:** GENERAL
- **Trigger:** pool (chain: mc_mealcard / stage1)
- **Cooldown:** 30 weeks
- **Requirements:** (none)

**KAYIP YEMEK KARTI**

Hastane yemekhanesi kartın okutulmuyor. Görevli 'sistemde pasif görünüyorsunuz' dedi, nedenini kendisi de bilmiyor.

**Choices:**
- `idareyle_ugras`: İdareyle uğraş, düzelttir.
  - effects: `{"stress":3}`
  - flags: `{"set":{"mc_mealcard_path":"chased"}}`
  - followUpEvent: `{"chainId":"mc_mealcard","checkpoint":"stage2","delayWeeks":2}`
- `cebinden_ye`: Bu hafta cebinden ye, sonra uğraşırsın.
  - effects: `{"money":-600}`
  - flags: `{"set":{"mc_mealcard_path":"paid"}}`
  - followUpEvent: `{"chainId":"mc_mealcard","checkpoint":"stage2","delayWeeks":2}`

### mc_mealcard_02_chased

- **Category:** GENERAL
- **Trigger:** scheduled (chain: mc_mealcard / stage2)
- **Requirements:** `{"all":[{"eq":"chased","flag":"mc_mealcard_path"}]}`

**KART DÜZELDİ**

İki hafta, üç kat, bir imza sonra kart yeniden çalışıyor. Görevli sebebini hâlâ açıklayamadı.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":-2}`

### mc_mealcard_02_paid

- **Category:** GENERAL
- **Trigger:** scheduled (chain: mc_mealcard / stage2)
- **Requirements:** `{"all":[{"eq":"paid","flag":"mc_mealcard_path"}]}`

**KART KENDİLİĞİNDEN DÜZELDİ**

Uğraşmadığın kart, uğraşmadan düzeldi. Bu sistemin sana özel bir mesajı olabilir, ya da hiçbir şey olmayabilir.

**Choices:**
- `devam`: Devam et.
  - effects: `{}`

## HEALTH_SYSTEM (13)

### hs_001_malpraktis_gundemi

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"gte":6,"stat":"career.week"}]}`

**BU HAFTA**

Yeni bir malpraktis tartışması sağlık gündeminde. Klinikte herkes gergin. Kıdemlin riskli hastaların sorumluluğunu almak istemiyor. Bu hafta iş yükün arttı.

**Choices:**
- `dokumantasyona_agirlik`: Dokümantasyona daha çok zaman ayır.
  - effects: `{"stress":8,"fatigue":4}`
  - flags: `{"set":{"hs_temkinli_dokumantasyon":true}}`
- `her_zamanki_gibi`: Her zamanki gibi devam et.
  - effects: `{"stress":5}`

### hs_002_nobet_ucret_tartismasi

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"gte":14,"stat":"career.week"}]}`

**MAAŞ BORDROSU**

Bu ayki nöbet ücretlerinin hesaplanma şekli değişmiş. Kimse ne değiştiğini tam açıklayamıyor, muhasebe 'yönetmelik gereği' diyor. Bordronda geçen aya göre daha az rakam var.

**Choices:**
- `muhasebeyi_ara`: Muhasebeyi arayıp açıklama iste.
  - effects: `{"stress":5}`
- `sessizce_kabul`: Sessizce kabul et, dava konusu değil.
  - effects: `{"stress":7,"burnout":2}`
- `toplu_dilekce`: Diğer asistanlarla toplu bir dilekçe hazırla.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"asistan_generic","trust":6}]`

### hs_003_zorunlu_guvenlik_egitimi

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"gte":10,"stat":"career.week"}]}`

**ZORUNLU EĞİTİM**

Tüm personele zorunlu bir 'çalışan güvenliği' eğitimi geldi. Eğitim, mesai saatleri dışında, katılım zorunlu ama ek ücretsiz. Sunum 47 slayt.

**Choices:**
- `katil`: Katıl, sonuna kadar otur.
  - effects: `{"stress":1,"fatigue":3}`
- `imza_atip_cik`: İmzayı at, ilk fırsatta çık.
  - effects: `{"stress":1}`
  - flags: `{"set":{"hs_egitim_yarim_kaldi":true}}`

### hs_004_yeni_form_11_sayfa

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"gte":6,"stat":"career.week"}]}`

**YENİ FORM**

Son dönemdeki dava haberlerinden sonra klinikte yeni bir aydınlatılmış onam formu kullanılmaya başlandı. Form 11 sayfa. Hastaların çoğu üçüncü sayfada soru sormaya başlıyor.

**Choices:**
- `sabirla_aciklayarak_gec`: Sabırla, madde madde açıklayarak ilerle.
  - effects: `{"stress":2,"fatigue":3}`
  - relationship: `[{"npc":"hasta_generic","trust":4}]`
- `hizli_imzalat`: Özetle geç, imzayı al.
  - effects: `{"stress":1}`

### hs_005_performans_puani

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":12,"stat":"career.week"}]}`

**PERFORMANS PUANI**

Bu ayki performans puanların yayınlandı. Sayı, emeğini hiçbir şekilde yansıtmıyormuş gibi hissettiriyor; yine de o sayı bordronda bir yere dokunuyor.

**Choices:**
- `itiraz_dilekcesi`: İtiraz dilekçesi ver.
  - effects: `{"stress":3}`
  - flags: `{"set":{"hs_performans_itiraz":true}}`
- `kabullen`: Kabullen, tartışmaya değmez.
  - effects: `{"stress":1}`

### hs_006_randevu_yogunlugu

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"gte":10,"stat":"career.week"}]}`

**GÜNLÜK RANDEVU SAYISI**

Poliklinik randevu sayısına resmi bir üst sınır yok. Bu ay ortalama günlük sayı yine arttı. Sistem yeni randevu almaya devam ediyor, senin gün 24 saat değil.

**Choices:**
- `sureleri_kisalt`: Görüşme sürelerini kısaltarak yetiştir.
  - effects: `{"stress":5}`
- `sirayi_asma`: Süreni koru, sırayı taşır.
  - effects: `{"stress":2,"fatigue":6}`

### hs_007_ulusal_sistem_coktu

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"gte":8,"stat":"career.week"}]}`

**ULUSAL SİSTEM ÇÖKTÜ**

Ülke çapında sağlık kayıt sistemi bu sabahtan beri erişilemez durumda. Haberlerde 'planlı bakım' deniyor, kimse ne zaman biteceğini bilmiyor. Reçeteler kağıda yazılıyor, tıpkı on yıl önceki gibi.

**Choices:**
- `kagide_gec`: Kağıt sisteme geç, devam et.
  - effects: `{"stress":4,"fatigue":6}`
- `sikayet_et`: İdareye durumu resmi olarak ilet.
  - effects: `{"stress":3}`
  - flags: `{"set":{"hs_ulusal_cokme_bildirildi":true}}`

### hs_008_gece_yalniz_hissetme

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"gte":1,"stat":"onCall.currentMonthTotalShifts"}]}`

**GECE NÖBETİNDE YALNIZ**

Gece nöbetinde güvenlik görevlisi sayısı ikiden bire indi, 'bütçe' gerekçesiyle. Koridorlar her zamankinden daha sessiz, bu sessizlik seni her zamankinden daha tetikte tutuyor.

**Choices:**
- `durumu_bildir`: Durumu resmi olarak bildir.
  - effects: `{"stress":3}`
  - flags: `{"set":{"hs_guvenlik_sikayeti":true}}`
- `tedbirli_devam_et`: Kendi tedbirlerini alarak devam et.
  - effects: `{"stress":5,"fatigue":2}`

### hs_009_izin_fiilen_kullanilamiyor

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**KAĞIT ÜZERİNDE İZİN**

Yıllık izin hakkın var, kağıt üzerinde. Fiilen kullanmaya kalktığında servis 'personel yetersiz' diyor. Bu cümle her seferinde aynı, hangi ay olursa olsun.

**Choices:**
- `israrla_talep_et`: İzin hakkını ısrarla talep et.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"kidemli_generic","trust":-2}]`
- `erteler`: Bir kez daha ertele.
  - effects: `{"stress":3,"burnout":2}`

### hs_010_dava_sonrasi_atmosfer

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**SERVİSTEKİ YENİ HAVA**

Ülke çapında konuşulan bir malpraktis davasının haberleri bu hafta her yerde. Serviste kimse doğrudan konuşmuyor ama herkes birden daha fazla not tutmaya, her adımı belgelemeye başladı.

**Choices:**
- `sen_de_uy`: Sen de daha fazla belgelemeye başla.
  - effects: `{"stress":3,"fatigue":3}`
  - flags: `{"set":{"hs_defansif_dokumantasyon":true}}`
- `eskisi_gibi_devam_et`: Alışkanlıklarını değiştirme.
  - effects: `{"stress":1}`

### hs_011_bakanlik_genelgesi

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**BAKANLIK GENELGESİ**

Yeni bir bakanlık genelgesi, asistan hekimlere ek bir raporlama görevi getirdi. Görevin amacı genelgede iki cümleyle açıklanmış, uygulaması hiç açıklanmamış.

**Choices:**
- `uygulamayi_kendin_kurgula`: Uygulamayı kendi başına kurgula.
  - effects: `{"stress":3,"fatigue":3}`
- `asgari_duzeyde_uy`: Asgari düzeyde uy, fazla emek harcama.
  - effects: `{"stress":1}`

### hs_012_beyaz_kod_tatbikati

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 40 weeks
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**BEYAZ KOD TATBİKATI**

Duyurulmamış bir 'beyaz kod' (çalışana yönelik şiddet alarmı) tatbikatı yapıldı. Alarm çaldığında üç kişi nereye gideceğini bilemedi, ikisi tatbikat olduğunu anlamadı.

**Choices:**
- `prosedueru_ogren`: Tatbikat sonrası prosedürü gerçekten öğren.
  - effects: `{"stress":1}`
  - flags: `{"set":{"hs_beyaz_kod_ogrenildi":true}}`
- `unut_git`: Unut git, muhtemelen bir daha olmaz.
  - effects: `{}`

### psy_007_damgalanma_taniklik

- **Category:** HEALTH_SYSTEM
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"branchIn":["psikiyatri"]},{"gte":12,"stat":"career.week"}]}`

**BEKLEME SALONUNDA BİR CÜMLE**

Bekleme salonunda bir hasta yakını, yüksek sesle 'buraya gelen zaten delidir' dedi. Hasta bunu duydu. Odaya girdiğinde hiçbir şey söylemedi ama bir şey değişmişti.

**Choices:**
- `gorusmede_ele_al`: Görüşmede bunu nazikçe ele al.
  - effects: `{"stress":3}`
  - relationship: `[{"npc":"hasta_generic","trust":6}]`
- `gundeme_getirme`: Planlanan gündeme sadık kal, değinme.
  - effects: `{"stress":1}`

## HOSPITAL (4)

### gs_005_malzeme_eksikligi

- **Category:** HOSPITAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"branchIn":["genel_cerrahi"]},{"gte":8,"stat":"career.week"}]}`

**SET EKSİK**

Ameliyathanede gereken cerrahi set eksik çıktı. Sterilizasyon biriminden yenisi bir saat sürüyor. Hasta masada, ekip bekliyor.

**Choices:**
- `sterilizasyonu_takip_et`: Sterilizasyon birimine bizzat git, süreci takip et.
  - effects: `{"stress":3,"fatigue":3}`
- `bekle`: Bekle, birinin hallettiğini varsay.
  - effects: `{"stress":5}`

### hosp_001_asansor_bozuldu

- **Category:** HOSPITAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** (none)

**ASANSÖR**

Ana bina asansörü bozuldu. Servisin 7. katta. Acil hasta transferi merdivenden yapılıyor. Bakım ekibi 'parça bekleniyor' diyor, bu üçüncü haftaya giriyor.

**Choices:**
- `merdiven_al`: Şikayet etmeden merdivenleri kullan.
  - effects: `{"fatigue":6}`
- `resmi_sikayet`: İdareye resmi şikayet dilekçesi ver.
  - effects: `{"stress":3}`
  - flags: `{"set":{"hosp_asansor_sikayeti":true}}`

### hosp_002_yeni_bashekim

- **Category:** HOSPITAL
- **Trigger:** pool
- **Cooldown:** 40 weeks
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**YENİ BAŞHEKİM**

Hastaneye yeni bir başhekim atandı. İlk genelgesi nöbet odalarının 'verimlilik' gerekçesiyle yeniden düzenlenmesi. Senin nöbet odan artık depo.

**Choices:**
- `yeni_duzene_uy`: Yeni düzene uy, dinlenme alanı bulmaya çalış.
  - effects: `{"stress":4,"fatigue":8}`
- `alternatif_bul`: Kıdemlilerle konuşup alternatif bir alan ayarla.
  - effects: `{"stress":5}`
  - relationship: `[{"npc":"kidemli_generic","trust":4}]`

### hosp_004_personel_eksikligi

- **Category:** HOSPITAL
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** `{"all":[{"gte":50,"stat":"onCall.staffingLoad"}]}`

**SERVİSTE EKSİK KADRO**

Bu ay servisteki asistan sayısı gözle görülür şekilde azaldı. Kimse resmi bir açıklama yapmıyor, ama iş bölünecek yer bulamıyor.

**Choices:**
- `sikayet_et`: Durumu bölüm başkanına ilet.
  - effects: `{"stress":3}`
  - flags: `{"set":{"reported_staffing_shortage":true}}`
- `sessizce_devam_et`: Bir şey demeden devam et.
  - effects: `{"stress":4,"fatigue":4}`

## MOBBING (18)

### chain_baris_02_gerilim

- **Category:** MOBBING
- **Trigger:** scheduled (chain: baris / stage2)
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","grudge":{"gte":8}}},{"eq":"gerilim","flag":"chain_baris_path"}]}`

**GRUPTA BİR İMA**

Klinik WhatsApp grubunda Barış, ismini vermeden 'bazı yeni asistanlar iş birliğine pek yatkın değil' diye bir mesaj attı. Zamanlama tesadüf olamayacak kadar net.

**Choices:**
- `gruba_yanit`: Gruba doğrudan yanıt yaz.
  - effects: `{"stress":6}`
  - relationship: `[{"npc":"baris","grudge":8}]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage3","delayWeeks":20}`
- `sessiz_kal`: Sessiz kal, notunu düş.
  - effects: `{"stress":8,"burnout":2}`
  - flags: `{"set":{"chain_baris_sessiz_kaldi":true}}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage3","delayWeeks":20}`

### chain_baris_03_gerilim

- **Category:** MOBBING
- **Trigger:** scheduled (chain: baris / stage3)
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","grudge":{"gte":12}}},{"eq":"gerilim","flag":"chain_baris_path"}]}`

**YALNIZ KALDIĞIN GECE**

Nöbetin felaket gidiyor. Barış'ı aradın, telefonu açık görünüyor ama cevap vermiyor. Sabah 'telefonum sessizdeymiş' dedi.

**Choices:**
- `yuzeysel_yuzlestir`: Sabah sakince yüzleştir.
  - effects: `{"stress":8}`
  - relationship: `[{"npc":"baris","trust":-3,"grudge":5}]`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage4","delayWeeks":25}`
- `belgele`: Hiçbir şey söyleme, olanı tarihli olarak not al.
  - effects: `{"stress":10,"burnout":4}`
  - flags: `{"set":{"chain_baris_belgeledi":true}}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage4","delayWeeks":25}`

### chain_baris_04_gerilim

- **Category:** MOBBING
- **Trigger:** scheduled (chain: baris / stage4)
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","grudge":{"gte":15}}},{"eq":"gerilim","flag":"chain_baris_path"}]}`

**BARIŞ UZMAN OLDU**

Barış uzmanlık sınavını geçti. Artık nöbet listesini o düzenliyor. Senin adının yanına, geçen ay tuttuğun nöbetlerin neredeyse iki katı yazılmış.

**Choices:**
- `itiraz_et`: Bölüm başkanına itiraz et.
  - effects: `{"stress":8}`
  - relationship: `[{"npc":"baris","grudge":6}]`
  - flags: `{"set":{"chain_baris_itiraz_etti":true}}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage5","delayWeeks":25}`
- `sessizce_tut`: Sessizce tüm nöbetleri tut.
  - effects: `{"stress":10,"fatigue":15,"burnout":5}`
  - followUpEvent: `{"chainId":"baris","checkpoint":"stage5","delayWeeks":25}`

### chain_baris_05_gerilim

- **Category:** MOBBING
- **Trigger:** scheduled (chain: baris / stage5)
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"any":[{"relationship":{"npc":"baris","grudge":{"gte":20}}},{"eq":"gerilim","flag":"chain_baris_path"}]}`

**VEDA**

Barış başka bir hastaneye geçiyor. Son gününde ona hiçbir şey söylemedi, sen de söylemedin. Masanın üstünde, kendi ilk yılından bir asistanın bıraktığı bir evrak destesi duruyor.

**Choices:**
- `farkli_davran`: Evrakları kendin hallet, çömeze devretme.
  - effects: `{"stress":-3,"fatigue":5}`
  - relationship: `[{"boundNpc":"primary","trust":8}]`
  - flags: `{"set":{"chain_baris_cycle_outcome":"broke_the_cycle"}}`
  - behaviorTags: `["junior:supportive","junior:protected"]`
- `ayni_seyi_yap`: 'Yeni başlayanlar önce evrak işini öğrenmeli' de.
  - effects: `{"stress":-1}`
  - relationship: `[{"boundNpc":"primary","grudge":10}]`
  - flags: `{"set":{"chain_baris_cycle_outcome":"repeated_the_cycle"}}`
  - behaviorTags: `["junior:exploitative"]`

### chain_deniz_02_yuk_farkindaligi

- **Category:** MOBBING
- **Trigger:** scheduled (chain: deniz / stage2)
- **Requirements:** (none)

**DENİZ'İN AYI**

Bu ay nöbet listesine bakıyorsun. Deniz, kimsenin resmi bir açıklama yapmadığı şekilde en yoğun aya yazılmış. Kimse bir şey söylemiyor çünkü bu 'her zaman böyle olur'.

**Choices:**
- `nobetini_hafiflet`: Kendi nöbetlerinden birini üstlenerek yükünü hafiflet.
  - effects: `{"fatigue":3}`
  - relationship: `[{"npc":"deniz_comez","trust":8}]`
  - flags: `{"set":{"deniz_path":"protected"}}`
  - behaviorTags: `["junior:supportive","hierarchy:protective"]`
  - onCallEffects: `[{"type":"add_player_shift","count":1}]`
  - followUpEvent: `{"chainId":"deniz","checkpoint":"stage3","delayWeeks":20}`
- `sistem_boyle_isliyor`: 'Sistem böyle işliyor' de, karışma.
  - relationship: `[{"npc":"deniz_comez","trust":-4}]`
  - flags: `{"set":{"deniz_path":"ignored"}}`
  - behaviorTags: `["junior:exploitative"]`
  - followUpEvent: `{"chainId":"deniz","checkpoint":"stage3","delayWeeks":20}`

### chain_hoca_03_goz_ardi

- **Category:** MOBBING
- **Trigger:** scheduled (chain: hoca / stage3)
- **Requirements:** (none)

**GÖZ ARDI**

Hoca kongreye başka birini götürdü. Sana sorulmadı; 'sen zaten meşgulsün' denildi, sanki bu senin adına verilmiş bir iyilikmiş gibi.

**Choices:**
- `sessiz_kal`: Bir şey deme.
  - effects: `{"stress":4}`
  - flags: `{"set":{"hoca_outcome":"overlooked"}}`
  - behaviorTags: `["hierarchy:abused_silently"]`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage4","delayWeeks":20}`
- `sorgula`: Nazikçe nedenini sor.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"hoca_erhan","trust":-4}]`
  - flags: `{"set":{"hoca_outcome":"overlooked"}}`
  - followUpEvent: `{"chainId":"hoca","checkpoint":"stage4","delayWeeks":20}`

### mob_001_whatsapp_hedef

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **Requirements:** `{"all":[{"gte":5,"stat":"career.week"}]}`

**GRUP MESAJI**

Klinik WhatsApp grubunda kıdemli, ismini vermeden 'bazı arkadaşlar dosya düzenine dikkat etmiyor' diye bir mesaj attı. Herkes senin dosyalarını gördü. Sen de gördün. 14 kişi mesajı 'gördü' olarak işaretledi, kimse yazmadı.

**Choices:**
- `ozel_mesaj_at`: Kıdemliye özelden 'bunu mu kastettin' diye sor.
  - effects: `{"stress":6}`
  - relationship: `[{"npc":"kidemli_generic","trust":-2,"grudge":2}]`
- `gruba_cevap`: Gruba 'anlaşıldı, düzelteceğim' yaz.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"kidemli_generic","trust":2}]`
- `gormezden_gel`: Hiçbir şey yazma, dosyaları sessizce düzelt.
  - effects: `{"stress":8}`

### mob_002_izin_iptali

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **Requirements:** `{"all":[{"gte":12,"stat":"career.week"}]}`

**İZİN İPTALİ**

Onaylanmış iznin, nöbet listesi son anda değiştiği için iptal edildi. Sebep olarak 'personel yetersizliği' yazıyor. Geçen ay aynı gerekçeyle senin dışındaki üç kişinin izni iptal edilmemişti.

**Choices:**
- `itiraz_et`: Bölüm başkanına yazılı itiraz et.
  - effects: `{"stress":5}`
  - flags: `{"set":{"mob_itiraz_yazili":true}}`
- `kabul_et`: İtiraz etmeden kabul et.
  - effects: `{"stress":10,"burnout":3}`
- `meslektaslardan_destek`: Aynı durumdaki diğer asistanlarla birlikte konuş.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"asistan_generic","trust":5}]`

### mob_003_ben_comezken

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"in":["comez","orta"],"stat":"career.seniorityStage"}]}`

**'BEN ÇÖMEZKEN...'**

Fazladan bir işi neden sana verdiklerini sorduğunda kıdemli, 'ben çömezken çok daha fazlasını yapardım' dedi. Bu cümle bir açıklama değil, bir kapanış oldu.

**Choices:**
- `kabullen`: Bir şey söylemeden kabullen.
  - effects: `{"stress":4}`
  - behaviorTags: `["hierarchy:abused_silently"]`
- `karsi_cikan_soru`: 'O zaman neden şimdi farklı' diye sor.
  - effects: `{"stress":5}`
  - relationship: `[{"npc":"kidemli_generic","trust":-4}]`

### mob_004_baskasinin_hatasi

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":10,"stat":"career.week"}]}`

**SENİN ADIN YAZILI**

Bir hata bulundu. Dosyada son işlem senin adına kayıtlı çünkü nöbet devrini sen aldın, hatayı yapan sen değilsin. Kimse bunu açıklığa kavuşturmak istemiyor.

**Choices:**
- `gercek_faili_belirle`: Kayıtları göstererek gerçek sorumluyu netleştir.
  - effects: `{"stress":5}`
  - relationship: `[{"npc":"asistan_generic","grudge":3}]`
- `sessizce_ustlen`: Tartışmaya değmez, sessizce üstlen.
  - effects: `{"stress":6}`
  - behaviorTags: `["hierarchy:abused_silently"]`

### mob_005_toplantida_elestiri

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 18 weeks
- **Requirements:** `{"all":[{"gte":12,"stat":"career.week"}]}`

**HERKESİN ÖNÜNDE**

Sabah toplantısında sunduğun bir bulgu, hoca tarafından herkesin önünde sert bir dille eleştirildi. İçerik haklı olabilir; ton, gerekli değildi.

**Choices:**
- `sakin_cevap_ver`: Sakince, savunmadan cevap ver.
  - effects: `{"stress":5}`
- `susup_gec`: Bir şey demeden geç.
  - effects: `{"stress":7}`
  - behaviorTags: `["hierarchy:abused_silently"]`

### mob_006_basari_sahiplenme

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**SENİN FİKRİN, BAŞKASININ SUNUMU**

Geçen hafta önerdiğin bir iyileştirme, bugünkü toplantıda kıdemli tarafından kendi fikriymiş gibi sunuldu. Odadaki hiç kimse bunu fark etmedi, ya da fark edip söylemedi.

**Choices:**
- `sonradan_belirt`: Toplantı sonrası hocaya durumu ilet.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"kidemli_generic","trust":-5}]`
- `birak_gitsin`: Bırak gitsin, enerjine değmez.
  - effects: `{"stress":2}`

### mob_007_son_dakika_gorev

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **Requirements:** (none)

**CUMA 17.45**

Haftayı bitirmeye 15 dakika kala kıdemli sana ek bir görev verdi. 'Uzun sürmez' dedi, uzun sürmeyeceğini gösteren hiçbir işaret yok.

**Choices:**
- `hemen_yap`: Hemen yap, planlarını ertele.
  - effects: `{"stress":4,"fatigue":6}`
  - relationship: `[{"npc":"kidemli_generic","trust":3}]`
- `pazartesiye_birak`: 'Pazartesi ilk iş yaparım' de.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"kidemli_generic","trust":-3}]`

### mob_008_gece_mesaji

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** (none)

**GECE 23.50**

Kıdemliden gece geç saatte bir mesaj geldi: yarınki işle ilgili bir soru, cevabı acil değil ama mesajın kendisi bir beklenti taşıyor gibi.

**Choices:**
- `hemen_cevapla`: Hemen cevap yaz.
  - effects: `{"stress":2,"fatigue":2}`
  - relationship: `[{"npc":"kidemli_generic","trust":2}]`
- `sabaha_birak`: Sabaha kadar cevap verme.
  - effects: `{"stress":-1}`
  - relationship: `[{"npc":"kidemli_generic","trust":-2}]`

### mob_009_akademik_angarya

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**GÖNÜLLÜLÜK ESASINA DAYALI**

Bölüm başkanı bir sunumun 'gönüllülük esasına dayalı' olduğunu söyledi. Gönüllü olmayanların isim listesi ayrıca tutuluyor gibi bir his var.

**Choices:**
- `gonullu_ol`: Gönüllü ol, riske girme.
  - effects: `{"stress":2,"fatigue":3}`
  - behaviorTags: `["hierarchy:complicit"]`
- `gecistir`: Sessizce geçiştir, adını yazdırma.
  - effects: `{"stress":3}`

### mob_010_isi_asagi_devretme

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"in":["comez","orta"],"stat":"career.seniorityStage"}]}`

**ÖĞRETİCİ DENEYİM**

Kıdemli, kendi sorumluluğundaki sıkıcı bir işi 'senin için öğretici olur' diyerek sana devretti. Öğretici kısmı belirsiz, sıkıcı kısmı çok net.

**Choices:**
- `isi_ustlen`: İşi üstlen, ses çıkarma.
  - effects: `{"stress":2,"fatigue":4}`
- `gercekten_ogretici_mi`: 'Bu gerçekten öğretici mi' diye sor.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"kidemli_generic","trust":-3}]`

### pr_002_gorev_dagitimi

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**GÖREVLERİ SEN DAĞITIYORSUN**

Bugünkü sıkıcı, uzun sürecek işlerden biri dağıtılacak. İki asistan var, ikisi de senden görev bekliyor.

**Choices:**
- `adil_pay`: İşi ikiye adil böl.
  - relationship: `[{"boundNpc":"primary","trust":4}]`
  - behaviorTags: `["hierarchy:protective"]`
- `sivisan_pay`: Ağır kısmı juniora ver, kolay kısmı kendine ayır.
  - relationship: `[{"boundNpc":"primary","trust":-4,"grudge":3}]`
  - behaviorTags: `["hierarchy:abusive","junior:exploitative"]`

### pr_007_angaryayi_asagi_aktar

- **Category:** MOBBING
- **Trigger:** pool
- **Cooldown:** 18 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**ANGARYA SANA GELDİ**

Sana verilen sıkıcı bir angarya işi var. Bunu aynen sana yapıldığı gibi bir juniora aktarabilirsin, ya da kendi üstlenip döngüyü burada durdurabilirsin.

**Choices:**
- `kendin_yap`: Kendin yap, kimseye aktarma.
  - effects: `{"stress":2,"fatigue":5}`
  - behaviorTags: `["hierarchy:protective"]`
  - statistics: `{"increment":{"power_reversal_broke_cycle":1}}`
- `juniora_aktar`: Sana yapıldığı gibi juniora aktar.
  - relationship: `[{"boundNpc":"primary","trust":-3,"grudge":3}]`
  - behaviorTags: `["junior:exploitative"]`
  - statistics: `{"increment":{"power_reversal_repeated_cycle":1}}`

## NPC (17)

### chain_deniz_01_yeni_geldi

- **Category:** NPC
- **Trigger:** pool (chain: deniz / stage1)
- **Once:** true
- **Required NPC template:** deniz_comez
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**YENİ ÇÖMEZ**

Deniz, servisin en yeni asistanı, koridorda hangi kapının nereye açıldığını bilmeden duruyor. Sana tanıdık geliyor, ama sebebini şu an düşünecek vaktin yok.

**Choices:**
- `yardim_et`: Durup yardım et, kısaca yönlendir.
  - relationship: `[{"npc":"deniz_comez","trust":6}]`
  - flags: `{"set":{"deniz_first_impression":"supportive"}}`
  - behaviorTags: `["junior:supportive"]`
  - followUpEvent: `{"chainId":"deniz","checkpoint":"stage2","delayWeeks":30}`
- `kendi_isine_bak`: Kendi işine bak, geç git.
  - relationship: `[{"npc":"deniz_comez","trust":-1}]`
  - flags: `{"set":{"deniz_first_impression":"distant"}}`
  - followUpEvent: `{"chainId":"deniz","checkpoint":"stage2","delayWeeks":30}`

### chain_deniz_03_guven

- **Category:** NPC
- **Trigger:** scheduled (chain: deniz / stage3)
- **Requirements:** `{"all":[{"relationship":{"npc":"deniz_comez","trust":{"gte":15}}}]}`

**DENİZ SANA GELDİ**

Deniz, kapını çalıp içeri girdi. 'Sana danışabilir miyim' dedi, cümlenin geri kalanını bekletti. Az kişiye bu şekilde sorulur.

**Choices:**
- `vakit_ayir`: İşini bırak, vakit ayır.
  - effects: `{"fatigue":1}`
  - relationship: `[{"npc":"deniz_comez","trust":3,"friendship":5}]`
  - flags: `{"set":{"deniz_outcome":"trusted"}}`
  - followUpEvent: `{"chainId":"deniz","checkpoint":"stage4","delayWeeks":15}`
- `kisa_tut`: Kısa tut, sonra devam edersin.
  - relationship: `[{"npc":"deniz_comez","friendship":-1}]`
  - flags: `{"set":{"deniz_outcome":"trusted"}}`
  - followUpEvent: `{"chainId":"deniz","checkpoint":"stage4","delayWeeks":15}`

### chain_deniz_03_mesafe

- **Category:** NPC
- **Trigger:** scheduled (chain: deniz / stage3)
- **Requirements:** (none)

**DENİZ ARTIK SORMUYOR**

Deniz artık senden bir şey istemiyor. İşini tek başına, sessizce hallediyor — senin gölgende değil, senden tamamen bağımsız büyümüş.

**Choices:**
- `devam`: Devam et.
  - effects: `{}`
  - flags: `{"set":{"deniz_outcome":"independent"}}`
  - followUpEvent: `{"chainId":"deniz","checkpoint":"stage4","delayWeeks":15}`

### mc_nursetrust_01

- **Category:** NPC
- **Trigger:** pool (chain: mc_nursetrust / stage1)
- **Cooldown:** 50 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"nurse"}}
- **Requirements:** (none)

**GECE VARDİYASINDA YARDIM**

Gece vardiyasında bir hemşire, senin fark etmeden atladığın bir tetkik sonucunu sessizce önüne bıraktı. Kimseye bir şey söylemedi.

**Choices:**
- `tesekkur_et`: Açıkça teşekkür et.
  - relationship: `[{"boundNpc":"primary","trust":6,"friendship":3}]`
  - flags: `{"set":{"mc_nursetrust_path":"thanked"}}`
  - followUpEvent: `{"chainId":"mc_nursetrust","checkpoint":"stage2","delayWeeks":6}`
- `farkedilmeden_gec`: Fark etmemiş gibi davran, mahcup olma.
  - relationship: `[{"boundNpc":"primary","trust":1}]`
  - followUpEvent: `{"chainId":"mc_nursetrust","checkpoint":"stage2","delayWeeks":6}`

### mc_nursetrust_02

- **Category:** NPC
- **Trigger:** scheduled (chain: mc_nursetrust / stage2)
- **NPC selectors:** {"primary":{"highestTrustByRole":"nurse"}}
- **Requirements:** (none)

**ARTIK BİLDİRİYOR**

Aynı hemşire artık senin servisindeki ufak tehlikeleri ilk sana haber veriyor, üstündekilere değil. Bu bir güven, ama aynı zamanda bir yük.

**Choices:**
- `sorumlulugu_al`: Sorumluluğu üstlen, her seferinde sen ilgilen.
  - effects: `{"fatigue":3}`
  - relationship: `[{"boundNpc":"primary","trust":5}]`
  - behaviorTags: `["colleague:loyal"]`
- `resmi_kanala_yonlendir`: Bundan sonra resmi kanaldan bildirmesini iste.
  - effects: `{"stress":-1}`
  - relationship: `[{"boundNpc":"primary","trust":-3}]`

### npc_proc_001_kin_tutan_kidemli

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"highestGrudgeByRole":"senior_resident"}}
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**ESKİ BİR HESAP**

Bir kıdemli asistan, aylar önce yaşanan küçük bir anlaşmazlığı hâlâ unutmamış gibi davranıyor. Bugün senden istediği şeyde bu, fazladan bir sertlik olarak kendini gösteriyor.

**Choices:**
- `acikca_konus`: Meseleyi açıkça konuşmayı öner.
  - effects: `{"stress":4}`
  - relationship: `[{"boundNpc":"primary","trust":3,"grudge":-5}]`
- `gormezden_gel`: Görmezden gel, zamanla geçer diye düşün.
  - effects: `{"stress":2}`

### npc_proc_002_guvensiz_hoca

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **NPC selectors:** {"primary":{"lowestTrustByRole":"faculty"}}
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**GÜVENMEYEN GÖZ**

Bir öğretim üyesi senin işini her seferinde iki kez kontrol ediyor. Belli ki sana güvenmiyor; sebebi ne senin ne de onun net olarak söylediği bir şey.

**Choices:**
- `guveni_kazanmaya_calis`: Tutarlı davranarak güveni kazanmaya çalış.
  - effects: `{"stress":3}`
  - relationship: `[{"boundNpc":"primary","trust":4}]`
- `umursama`: Umursama, herkesin güvenini kazanmak zorunda değilsin.
  - effects: `{"stress":-1}`

### npc_proc_003_hemsire_ile_rutin

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"nurse"}}
- **Requirements:** (none)

**SABAH RUTİNİ**

Servisteki bir hemşireyle sabah rutini artık bir örüntüye oturmuş: sen gelmeden önce dosyaları hazırlıyor, sen de karşılığında ilaç onaylarını hızlı imzalıyorsun. Söylenmemiş bir anlaşma.

**Choices:**
- `anlasmayi_surdur`: Anlaşmayı olduğu gibi sürdür.
  - relationship: `[{"boundNpc":"primary","trust":3}]`
- `her_seyi_kendin_kontrol_et`: Bu sefer her şeyi kendin baştan kontrol et.
  - effects: `{"fatigue":2}`
  - relationship: `[{"boundNpc":"primary","trust":-1}]`

### npc_proc_004_yakin_akran

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **NPC selectors:** {"primary":{"highestTrustByRole":"peer_resident"}}
- **Requirements:** `{"all":[{"gte":15,"stat":"career.week"}]}`

**EN YAKIN AKRANIN**

Bir akran asistanla aranız diğerlerinden farklı; iş dışında da birkaç kez görüştünüz. Bugün sana zor bir şeyi anlattı, tavsiye değil, sadece dinlenmek istiyor gibi.

**Choices:**
- `sadece_dinle`: Sadece dinle, tavsiye verme.
  - relationship: `[{"boundNpc":"primary","trust":4,"friendship":6}]`
- `cozum_onerileri_sun`: Çözüm önerileri sunmaya çalış.
  - relationship: `[{"boundNpc":"primary","friendship":1}]`

### npc_proc_005_supheci_hemsire

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"lowestTrustByRole":"nurse"}}
- **Requirements:** `{"all":[{"gte":8,"stat":"career.week"}]}`

**İKİ KEZ KONTROL**

Bir hemşire, yazdığın bir ilaç dozunu telefon açıp doğrulamadan uygulamıyor. Prosedür olarak doğru; ama tonundan, senin için özel bir istisna yaptığını hissediyorsun.

**Choices:**
- `sabirla_dogrula`: Sabırla her seferinde doğrula.
  - relationship: `[{"boundNpc":"primary","trust":3}]`
- `rahatsizligini_belli_et`: Rahatsızlığını belli et.
  - effects: `{"stress":2}`
  - relationship: `[{"boundNpc":"primary","trust":-2}]`

### npc_proc_006_gergin_hemsire

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **NPC selectors:** {"primary":{"highestGrudgeByRole":"nurse"}}
- **Requirements:** `{"all":[{"gte":1,"stat":"onCall.currentMonthTotalShifts"}]}`

**GERGİN BİR NÖBET**

Bir hemşireyle geçen ay yaşanan bir gerginlik hâlâ havada asılı duruyor. Bu nöbette aynı vardiyayı paylaşıyorsunuz; konuşmalar gerekenden kısa.

**Choices:**
- `ozur_dile`: Gerekiyorsa özür dile, meseleyi kapat.
  - effects: `{"stress":2}`
  - relationship: `[{"boundNpc":"primary","trust":3,"grudge":-6}]`
- `profesyonel_mesafe`: Sadece profesyonel mesafede kal.
  - effects: `{"stress":1}`

### npc_proc_007_kidemli_ile_sohbet

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 18 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"senior_resident"}}
- **Requirements:** (none)

**ASANSÖR SOHBETİ**

Bir kıdemli asistanla asansörde beklenmedik bir sohbet başladı. İş dışı, sıradan, birkaç katlık bir konuşma. Bazen ilişkiler böyle küçük anlarda şekilleniyor.

**Choices:**
- `sohbete_katil`: Sohbete gerçekten katıl.
  - relationship: `[{"boundNpc":"primary","trust":3,"friendship":3}]`
- `kisa_kes`: Kısa cevaplarla geç.
  - relationship: `[{"boundNpc":"primary","friendship":-1}]`

### npc_proc_008_ilk_mentorluk

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"orta","stat":"career.seniorityStage"}]}`

**İLK KEZ SEN GÖSTERİYORSUN**

Yeni gelen bir çömez, servis işleyişini senden öğreniyor. Sen de bir zamanlar aynı yerde durmuştun; şimdi anlatan taraf sensin.

**Choices:**
- `kendi_deneyimini_paylas`: Kendi ilk yılından örnekler vererek anlat.
  - effects: `{"fatigue":1}`
  - relationship: `[{"boundNpc":"primary","trust":5}]`
  - behaviorTags: `["junior:supportive"]`
- `gerekli_kadar_anlat`: Sadece gerekli kadarını anlat.
  - relationship: `[{"boundNpc":"primary","trust":1}]`

### npc_proc_009_orta_kidem_gorus_ayrisi

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"peer_resident"}}
- **Requirements:** `{"all":[{"eq":"orta","stat":"career.seniorityStage"}]}`

**SENİNLE AYNI FİKİRDE DEĞİL**

Bir vaka üzerine bir akranınla görüş ayrılığına düştünüz. İkiniz de orta kıdemdesiniz; kimse otomatik olarak haklı değil bu sefer.

**Choices:**
- `gorusunu_savun`: Görüşünü net şekilde savun.
  - effects: `{"stress":2}`
  - relationship: `[{"boundNpc":"primary","trust":-1}]`
- `orta_yol_bul`: Orta bir yol bulmaya çalış.
  - relationship: `[{"boundNpc":"primary","trust":3}]`

### pr_003_junior_hatasini_sahiplenme

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"in":["orta","kidemli"],"stat":"career.seniorityStage"}]}`

**JUNIOR'IN HATASI**

Bir junior küçük ama fark edilebilir bir hata yaptı. Hoca sana soruyor: 'Bu nasıl oldu?' Cevabı sen veriyorsun, junior yanında duruyor.

**Choices:**
- `sahiplen`: 'Benim gözetimimdeydi, benim sorumluluğum' de.
  - effects: `{"stress":4}`
  - relationship: `[{"boundNpc":"primary","trust":8},{"npc":"hoca_generic","trust":-2}]`
  - behaviorTags: `["hierarchy:protective"]`
- `juniora_birak`: Açıklamayı juniorun kendisinin yapmasını bekle.
  - relationship: `[{"boundNpc":"primary","trust":-5}]`
  - behaviorTags: `["junior:exploitative"]`

### pr_005_izin_isteyen_junior

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**JUNIOR İZİN İSTİYOR**

Bir junior senden acil bir izin istiyor, ailevi bir sebep var. Servis zaten dar kadroyla çalışıyor. Onayı sen veriyorsun.

**Choices:**
- `onayla`: Onayla, kendi işini yeniden düzenle.
  - effects: `{"fatigue":3}`
  - relationship: `[{"boundNpc":"primary","trust":8}]`
  - behaviorTags: `["hierarchy:protective"]`
- `reddet`: 'Şu an uygun değil' de.
  - relationship: `[{"boundNpc":"primary","trust":-8,"grudge":4}]`
  - behaviorTags: `["hierarchy:abusive"]`

### pr_006_comezden_soru

- **Category:** NPC
- **Trigger:** pool
- **Cooldown:** 14 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"in":["orta","kidemli"],"stat":"career.seniorityStage"}]}`

**SAF BİR SORU**

Yeni bir çömez, sana herkesin bildiğini varsaydığı bir şeyi sordu. Soru senin için çok basit; onun için ilk kez soruyor olması normal.

**Choices:**
- `sabirla_anlat`: Sabırla, baştan anlat.
  - effects: `{"fatigue":1}`
  - relationship: `[{"boundNpc":"primary","trust":5}]`
  - behaviorTags: `["junior:supportive"]`
- `kucumseyerek_cevapla`: 'Bunu bilmiyor musun' tonuyla cevapla.
  - relationship: `[{"boundNpc":"primary","trust":-4,"grudge":2}]`
  - behaviorTags: `["hierarchy:abusive"]`

## ON_CALL (12)

### gs_007_nobet_devri_eksik

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** `{"all":[{"branchIn":["genel_cerrahi"]}]}`

**DEVİR NOTU EKSİK**

Sabah nöbeti devraldın. Gece nöbetçisi acele çıktığı için devir notu yarım kalmış. Bir hastanın gece ne olduğunu tam bilmiyorsun.

**Choices:**
- `gece_nobetciyi_ara`: Gece nöbetçisini arayıp uyandır.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"asistan_generic","trust":-1}]`
- `dosyadan_cikar`: Dosyadan kendi başına çıkarmaya çalış.
  - effects: `{"stress":5,"fatigue":3}`

### mc_shiftswap_01

- **Category:** ON_CALL
- **Trigger:** pool (chain: mc_shiftswap / stage1)
- **Cooldown:** 40 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"peer_resident"}}
- **Requirements:** (none)

**GEÇEN AYIN BORCU**

Bir akran asistan geçen ay senin için nöbet değiştirdiğini hatırlattı. Şimdi sırası kendisinde ama bu hafta onun da işi çıkmış. Sözünü tutmanı bekliyor.

**Choices:**
- `sozunu_tut`: Sözünü tut, nöbeti al.
  - effects: `{"fatigue":3}`
  - relationship: `[{"boundNpc":"primary","trust":6}]`
  - flags: `{"set":{"mc_shiftswap_path":"kept"}}`
  - behaviorTags: `["colleague:loyal"]`
  - onCallEffects: `[{"type":"add_player_shift","count":1}]`
  - followUpEvent: `{"chainId":"mc_shiftswap","checkpoint":"stage2","delayWeeks":3}`
- `bu_sefer_olmaz`: 'Bu sefer olmaz' de.
  - effects: `{"stress":2}`
  - relationship: `[{"boundNpc":"primary","trust":-4}]`
  - flags: `{"set":{"mc_shiftswap_path":"declined"}}`
  - behaviorTags: `["colleague:self_preserving"]`
  - followUpEvent: `{"chainId":"mc_shiftswap","checkpoint":"stage2","delayWeeks":3}`

### oncall_001_arkadas_nobet_istiyor

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 10 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"peer_resident"}}
- **Requirements:** `{"all":[{"gte":1,"stat":"onCall.currentMonthTotalShifts"}]}`

**NÖBET DEĞİŞİKLİĞİ RİCASI**

Bir asistan arkadaşın bu ayki nöbetlerinden birini senden istiyor. Sebep söylüyor ama dinlemiyorsun, zihnin zaten hesap yapıyor.

**Choices:**
- `kabul_et`: Kabul et, bir nöbet daha üstlen.
  - effects: `{"fatigue":2}`
  - relationship: `[{"boundNpc":"primary","trust":5}]`
  - onCallEffects: `[{"type":"add_player_shift","count":1}]`
- `reddet`: Reddet, kendi ayını koru.
  - effects: `{"stress":-1}`
  - relationship: `[{"boundNpc":"primary","grudge":4}]`

### oncall_002_ekstra_nobet_teklifi

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** (none)

**EKSTRA NÖBET TEKLİFİ**

Nöbet listesini hazırlayan sekreter seni buldu: gelecek hafta boş kalan bir nöbet var, isteyen alabilir. Karşılığında ek ödeme var.

**Choices:**
- `kabul_et`: Al, para lazım.
  - effects: `{"stress":2,"fatigue":3,"money":900}`
  - behaviorTags: `["oncall:extra_shift_accepted"]`
  - onCallEffects: `[{"type":"add_player_shift","count":1}]`
- `reddet`: Bu ay yeter, reddet.

### oncall_003_kidemli_nobet_devri

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"senior_resident"}}
- **Requirements:** `{"all":[{"in":["comez","orta"],"stat":"career.seniorityStage"}]}`

**KIDEMLİ NÖBETİNİ DEVREDİYOR**

Bir kıdemli asistan, kendi nöbetlerinden birini 'sana iyi bir deneyim olur' diyerek devretmek istiyor. Deneyim kısmı doğru olabilir; seçim şansının olup olmadığı ayrı bir mesele.

**Choices:**
- `kabul_et`: Kabul et, itiraz etme.
  - relationship: `[{"boundNpc":"primary","trust":2}]`
  - onCallEffects: `[{"type":"add_player_shift","count":1}]`
- `secim_hakki_oldugunu_hatirlat`: Bunun bir seçim olduğunu nazikçe hatırlat.
  - effects: `{"stress":3}`
  - relationship: `[{"boundNpc":"primary","trust":-4}]`

### oncall_004_son_dakika_eksiklik

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 12 weeks
- **Requirements:** (none)

**SON DAKİKA EKSİKLİK**

Bu geceki nöbetçilerden biri hastalandı, yerine bakacak kimse yok. Sekreterya seni aradı; telefon açık kaldığı sürece bu senin sorunun.

**Choices:**
- `nobeti_devral`: Nöbeti devral.
  - effects: `{"money":900}`
  - onCallEffects: `[{"type":"add_player_shift","count":1}]`
- `baskasini_bulmaya_calis`: Başka birini bulmaya çalış.
  - effects: `{"stress":4}`

### oncall_005_hafta_sonu_plani

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** `{"all":[{"gte":1,"stat":"onCall.weekendShiftCount"}]}`

**HAFTA SONU PLANI ÇAKIŞTI**

Aylardır planladığın bir hafta sonu var. Nöbet listesi yayınlandı: tam o hafta sonu senin. Değişmesi imkânsız değil, ama biri senin yerine geçmeli.

**Choices:**
- `degisim_ara`: Değişecek birini aramaya başla.
  - effects: `{"stress":4}`
  - onCallEffects: `[{"type":"remove_player_shift","count":1},{"type":"add_player_shift","count":1,"shiftType":"weekday"}]`
- `plani_iptal_et`: Planı iptal et, nöbeti tut.
  - effects: `{"stress":5}`

### oncall_006_ust_uste_nobet

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":4,"stat":"onCall.currentMonthTotalShifts"}]}`

**İKİ GÜN ÜST ÜSTE**

Liste hatası mı yoksa kasıt mı bilmiyorsun ama iki nöbetin üst üste düşmüş. Bu ayın geri kalanı zaten yoğun; itiraz etsen de bu haftaki gerçeklik değişmeyecek.

**Choices:**
- `dayan`: Dayan, ikisini de tut.
  - effects: `{"stress":6,"fatigue":14,"burnout":2}`
- `hata_bildir`: Bunun bir hata olup olmadığını sor, ama yine de tut.
  - effects: `{"stress":4,"fatigue":12}`
  - flags: `{"set":{"oncall_uste_uste_bildirildi":true}}`

### oncall_007_liste_yogun_yorumu

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":8,"stat":"onCall.currentMonthTotalShifts"}]}`

**BU AYKİ LİSTE**

Bu ayki nöbet listesine bir daha bakıyorsun. Geçen aya göre biraz daha yoğun görünüyor. Kimse bir açıklama yapmadı; belki de gerek yok.

**Choices:**
- `kabullen`: Bir şey demeden kabullen.
  - effects: `{"stress":2}`
- `not_al`: İleride sormak üzere not al.
  - effects: `{}`
  - flags: `{"set":{"oncall_yogunluk_not_alindi":true}}`

### oncall_008_erteleme_talebi

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"gte":2,"stat":"onCall.currentMonthTotalShifts"}]}`

**ERTELEME TALEBİ**

Bir sınavın var, nöbetle aynı güne denk geldi. Sekreterliğe erteleme talebinde bulunabilirsin ama bunun onaylanacağının garantisi yok.

**Choices:**
- `resmi_talep`: Resmi talep dilekçesi ver.
  - effects: `{"stress":2}`
  - onCallEffects: `[{"type":"remove_player_shift","count":1},{"type":"add_player_shift","count":1}]`
- `vazgec`: Uğraşmaya değmez, vazgeç.
  - effects: `{"stress":3}`

### oncall_009_ilk_liste_kararin

- **Category:** ON_CALL
- **Trigger:** pool
- **Once:** true
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**İLK KEZ SEN HAZIRLIYORSUN**

Kıdemli olduktan sonra ilk kez nöbet listesini sen hazırlıyorsun. Boş bir tablo önünde, geçmişte kendine yapılanları hatırlıyorsun.

**Choices:**
- `dengeli_dagit`: Listeyi olabildiğince dengeli dağıt.
  - effects: `{"fatigue":2}`
  - flags: `{"set":{"oncall_ilk_liste_dengeli":true}}`
  - behaviorTags: `["hierarchy:protective"]`
- `eski_aliskanlik`: Eski alışkanlığa uy, kıdemsizler daha çok yazılsın.
  - flags: `{"set":{"oncall_ilk_liste_dengesiz":true}}`
  - behaviorTags: `["hierarchy:abusive"]`

### pr_001_nobet_listesini_sen_yapiyorsun

- **Category:** ON_CALL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **NPC selectors:** {"primary":{"randomActiveByRole":"junior_resident"}}
- **Requirements:** `{"all":[{"eq":"kidemli","stat":"career.seniorityStage"}]}`

**LİSTEYİ SEN HAZIRLIYORSUN**

Bu ay nöbet listesini hazırlama sırası sende. Bayram haftasını birine yazman gerekiyor. Kendi adını oraya yazmamak, listede başka birinin adının olması demek.

**Choices:**
- `kendine_yaz`: Bayram haftasını kendine yaz, adil olduğunu düşün.
  - effects: `{"fatigue":2}`
  - behaviorTags: `["hierarchy:protective"]`
  - onCallEffects: `[{"type":"add_player_shift","count":1,"shiftType":"weekend"}]`
- `junior_a_yaz`: 'Ben kıdemliyim' diyerek juniora yaz.
  - relationship: `[{"boundNpc":"primary","trust":-6,"grudge":5}]`
  - behaviorTags: `["hierarchy:abusive"]`
  - onCallEffects: `[{"type":"transfer_player_shift_to_npc","target":{"boundNpc":"primary"}}]`

## RARE (6)

### rare_001_kongre_yurtdisi

- **Category:** RARE
- **Trigger:** pool
- **Once:** true
- **Requirements:** `{"all":[{"gte":20,"stat":"career.week"}]}`

**BEKLENMEYEN ÇAĞRI**

Bölüm başkanı seni odasına çağırdı. Yurtdışı bir kongreye bildiri kabul edilmiş, gidecek kişi olarak seni önermiş. Bu cümleyi üç kere tekrar ettirdin çünkü kulağına inanamadın.

**Choices:**
- `kabul_et`: Hemen kabul et.
  - effects: `{"stress":-15,"money":-6000}`
  - relationship: `[{"npc":"hoca_generic","trust":15}]`
  - flags: `{"set":{"rare_yurtdisi_kongre":true}}`
- `dusunmek_istedim`: 'Düşünmem lazım' de.
  - effects: `{"stress":5}`
  - relationship: `[{"npc":"hoca_generic","trust":-5}]`

### rare_002_hastane_kedisi

- **Category:** RARE
- **Trigger:** pool
- **Cooldown:** 60 weeks
- **Requirements:** `{"all":[{"gte":4,"stat":"career.week"}]}`

**TOPLANTIDA MİSAFİR**

Hastane bahçesinde yıllardır yaşayan kedi, açık kalan bir kapıdan servis toplantısına girdi. Masanın altına yerleşti. Kimse çıkarmaya çalışmadı, sanki bu daha önce de olmuş gibi.

**Choices:**
- `sessizce_izle`: Sessizce izle, toplantıya devam et.
  - effects: `{"stress":-3}`
- `disari_cikar`: Kaldırıp dışarı çıkar.
  - effects: `{"stress":-1}`
  - relationship: `[{"npc":"hemsire_generic","trust":2}]`

### rare_003_uc_yazici

- **Category:** RARE
- **Trigger:** pool
- **Cooldown:** 60 weeks
- **Requirements:** (none)

**ÜÇ YAZICI, TEK GÜN**

Serviste üç yazıcı var. Bugün üçü de aynı anda bozuldu. Teknik servis 'bu istatistiksel olarak ilginç' dedi, tamir etmeden önce.

**Choices:**
- `elle_yaz`: Gerekli belgeleri elle doldur.
  - effects: `{"stress":2,"fatigue":4}`
- `baska_katta_yazdir`: Başka kata gidip yazdır.
  - effects: `{"fatigue":2}`

### rare_004_yanlis_grup

- **Category:** RARE
- **Trigger:** pool
- **Cooldown:** 60 weeks
- **Requirements:** (none)

**YANLIŞ GRUP**

Servis WhatsApp grubuna yazmak istediğin mesajı, telefonun otomatik tamamlamasıyla yanlışlıkla aile grubuna gönderdin. Mesaj: 'bugünkü hoca resmen dayanılmaz'.

**Choices:**
- `hemen_sil`: Hemen silmeye çalış.
  - effects: `{"stress":5}`
- `aciklama_yaz`: Ailene açıklama yazmayı dene.
  - effects: `{"stress":3}`

### rare_005_eski_gelenek

- **Category:** RARE
- **Trigger:** pool
- **Cooldown:** 80 weeks
- **Requirements:** `{"all":[{"gte":30,"stat":"career.week"}]}`

**YILLARDIR KONUŞULMAYAN GELENEK**

Kıdemli asistanlardan biri, bölümde yıllardır sürdürülen tuhaf bir geleneği anlattı: her yılın son asistanı, servis panosuna kendi el yazısıyla bir not bırakırmış. Kimse bunun ne zaman başladığını bilmiyor.

**Choices:**
- `gelenegi_surdur`: Geleneği öğren, ileride sürdürmeye karar ver.
  - effects: `{"stress":-2}`
  - flags: `{"set":{"rare_gelenek_ogrenildi":true}}`
- `tuhaf_bul`: Tuhaf bulup unut.
  - effects: `{}`

### rare_006_beklenmedik_tesekkur

- **Category:** RARE
- **Trigger:** pool
- **Cooldown:** 80 weeks
- **Requirements:** `{"all":[{"gte":40,"stat":"career.week"}]}`

**YILLAR SONRA TEŞEKKÜR**

Hastanenin girişinde biri seni durdurdu. Yıllar önce baktığın bir hastanın yakınıymış. Adını hâlâ hatırlıyor olması seni şaşırttı; sen onu hiç hatırlamıyorsun.

**Choices:**
- `sohbet_et`: Durup birkaç dakika sohbet et.
  - effects: `{"stress":-5}`
- `kisa_kes`: Teşekkürü kabul edip yoluna devam et.
  - effects: `{"stress":-2}`

## SOCIAL (20)

### chain_sekreter_04_paylasim

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: sekreter / stage4)
- **Requirements:** `{"all":[{"eq":"found","flag":"sekreter_outcome"}]}`

**BİR ARA VERDİ**

Zeynep Hanım bir gün sırf sohbet etmek için penceresinden seni çağırdı. Kızının tıp fakültesini kazandığını anlattı. Belli ki bir şeyi paylaşmak istiyordu.

**Choices:**
- `dinle`: Zaman ayırıp dinle.
  - effects: `{"fatigue":1}`
  - relationship: `[{"npc":"zeynep_sekreter","trust":3,"friendship":5}]`
  - flags: `{"set":{"sekreter_close":true}}`
- `kisa_kes`: İşin var, kısa kes.
  - relationship: `[{"npc":"zeynep_sekreter","friendship":-1}]`

### gen_010_dogum_gunu_kutlamasi

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 16 weeks
- **Requirements:** (none)

**SERVİSTE PASTA**

Bir hemşirenin doğum günü. Küçük bir pasta, plastik çatallar, beş dakikalık bir mola. Servis bu beş dakika boyunca garip bir şekilde sessiz ve normal görünüyor.

**Choices:**
- `katil`: Katıl, birkaç dakika ayır.
  - effects: `{"stress":-3}`
  - relationship: `[{"npc":"hemsire_generic","trust":3}]`
- `isine_devam`: İşine devam et, sonra tebrik edersin.
  - effects: `{}`

### mc_partner_01

- **Category:** SOCIAL
- **Trigger:** pool (chain: mc_partner / stage1)
- **Once:** true
- **Requirements:** `{"all":[{"neq":true,"flag":"has_partner"},{"gte":8,"stat":"career.week"}]}`

**TANIDIK BİR İSİM**

Son birkaç aydır aynı çevrede sürekli karşına çıkan biri var. Bu sefer o, sana mesaj attı.

**Choices:**
- `cevap_yaz`: Cevap yaz, bir şeyler planla.
  - effects: `{"stress":-1}`
  - flags: `{"set":{"mc_partner_path":"pursuing"}}`
  - followUpEvent: `{"chainId":"mc_partner","checkpoint":"stage2","delayWeeks":3}`
- `simdi_sirasi_degil`: Şu an vaktin yok, nazikçe geçiştir.
  - effects: `{}`
  - flags: `{"set":{"mc_partner_path":"declined"}}`

### mc_partner_02

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: mc_partner / stage2)
- **Requirements:** `{"all":[{"eq":"pursuing","flag":"mc_partner_path"}]}`

**İLK BULUŞMA**

Buluşma, iki kere ertelendikten sonra gerçekleşti. Sen nöbetten çıkmış haldeydin, o bunu anlayışla karşıladı. Bu iyi bir işaret olabilir.

**Choices:**
- `iliskiyi_baslat`: İlişkiyi resmi olarak başlat.
  - effects: `{"stress":-4}`
  - relationship: `[{"npc":"sevgili_generic","trust":10,"friendship":10}]`
  - flags: `{"set":{"has_partner":true}}`
- `arkadas_kal`: Şimdilik arkadaş kalmayı öner.
  - effects: `{}`

### mc_reunion_01

- **Category:** SOCIAL
- **Trigger:** pool (chain: mc_reunion / stage1)
- **Cooldown:** 30 weeks
- **Requirements:** (none)

**ÜNİVERSİTE GRUBU**

Eski üniversite arkadaşların bu hafta sonu buluşuyor. Grup mesajında senin adın da geçti: 'o zaten gelemez herhalde'.

**Choices:**
- `katilmaya_calis`: Katılmaya çalış, yorgun da olsan git.
  - effects: `{"stress":-3,"fatigue":3,"money":-1200}`
  - flags: `{"set":{"mc_reunion_path":"attended"}}`
  - followUpEvent: `{"chainId":"mc_reunion","checkpoint":"stage2","delayWeeks":1}`
- `katilma`: Katılma, dinlen.
  - effects: `{"fatigue":-3}`
  - flags: `{"set":{"mc_reunion_path":"skipped"}}`
  - followUpEvent: `{"chainId":"mc_reunion","checkpoint":"stage2","delayWeeks":1}`

### mc_reunion_02_attended

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: mc_reunion / stage2)
- **Requirements:** `{"all":[{"eq":"attended","flag":"mc_reunion_path"}]}`

**İYİ Kİ GİTMİŞSİN**

Gece geç saatte eve döndün ama gitmiş olmak iyi hissettirdi. Yarın sabah nöbet olduğunu unutmuşsun.

**Choices:**
- `devam`: Devam et.
  - effects: `{"fatigue":4}`

### mc_reunion_02_skipped

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: mc_reunion / stage2)
- **Requirements:** (none)

**GRUP FOTOĞRAFI**

Grup fotoğrafında sen yoksun. Kimse bir şey söylemedi ama fotoğraf, sanki bunu senin için not ediyormuş gibi duruyor.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":1}`

### mc_shiftswap_02_declined

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: mc_shiftswap / stage2)
- **Requirements:** `{"all":[{"eq":"declined","flag":"mc_shiftswap_path"}]}`

**SESSİZLİK**

O günden sonra o asistan sana sadece işle ilgili konuşuyor. Kısa, gerekli, mesafeli. Sen de aynı şekilde davranmaya başladın.

**Choices:**
- `devam`: Devam et.
  - effects: `{}`

### mc_shiftswap_02_kept

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: mc_shiftswap / stage2)
- **Requirements:** `{"all":[{"eq":"kept","flag":"mc_shiftswap_path"}]}`

**BORÇ ÖDENDİ**

Aynı asistan sana kahve ısmarladı. Konuşmadan uzattı, sen de konuşmadan aldın. Bazı şeyler böyle kapanır.

**Choices:**
- `devam`: Devam et.
  - effects: `{"stress":-1}`

### mc_whatsapp_01

- **Category:** SOCIAL
- **Trigger:** pool (chain: mc_whatsapp / stage1)
- **Cooldown:** 60 weeks
- **Requirements:** `{"all":[{"lte":20,"stat":"career.week"}]}`

**GRUBA EKLENDİN**

Servis WhatsApp grubuna eklendin. İlk mesaj gece 23.40'ta geldi: 'yarın kim erken gelebilir'.

**Choices:**
- `hemen_cevapla`: Hemen cevap yaz.
  - effects: `{"stress":1}`
  - flags: `{"set":{"mc_whatsapp_path":"responsive"}}`
  - followUpEvent: `{"chainId":"mc_whatsapp","checkpoint":"stage2","delayWeeks":2}`
- `sabaha_birak`: Görmezden gel, sabah bakarsın.
  - effects: `{"stress":-1}`
  - flags: `{"set":{"mc_whatsapp_path":"quiet"}}`
  - followUpEvent: `{"chainId":"mc_whatsapp","checkpoint":"stage2","delayWeeks":2}`

### mc_whatsapp_02_quiet

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: mc_whatsapp / stage2)
- **Requirements:** (none)

**GRUP SENSİZ DEVAM EDİYOR**

Grup mesajlarını okumadan geçiştirmeyi öğrendin. Ara sıra önemli bir şeyi kaçırıyorsun ama akşamların sana kalıyor.

**Choices:**
- `devam`: Devam et.
  - effects: `{}`

### mc_whatsapp_02_responsive

- **Category:** SOCIAL
- **Trigger:** scheduled (chain: mc_whatsapp / stage2)
- **Requirements:** `{"all":[{"eq":"responsive","flag":"mc_whatsapp_path"}]}`

**GRUBUN GÜVENİLİRİ**

Artık her gece mesajlara ilk sen cevap veriyorsun. Grup bunu fark etti; artık her şey önce senden soruluyor.

**Choices:**
- `devam_et`: Bu rolü kabullen.
  - effects: `{"fatigue":2}`
  - behaviorTags: `["colleague:loyal"]`
- `geri_cekil`: Bilinçli olarak geri çekil, bildirimleri sustur.
  - effects: `{"stress":-2}`

### soc_001_dugun_cakismasi

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 26 weeks
- **Requirements:** `{"all":[{"gte":8,"stat":"career.week"}]}`

**DÜĞÜN**

En yakın arkadaşının düğünü nöbet gününe denk geldi. Davetiye altı ay önce geldi, nöbet listesi üç gün önce açıklandı. Aradaki matematiği kimse açıklayamıyor.

**Choices:**
- `degisim_dene`: Nöbet değiştirmeye çalış.
  - effects: `{"stress":5}`
- `dugune_gitme`: Düğüne gitme.
  - effects: `{"stress":8}`
  - relationship: `[{"npc":"arkadas_generic","trust":-10}]`
- `kidemliden_izin`: Kıdemliden izin iste.
  - effects: `{"stress":4}`
  - relationship: `[{"npc":"kidemli_generic","trust":-2}]`
- `hastayim_de`: 'Hastayım' de.
  - effects: `{"stress":6}`
  - flags: `{"set":{"soc_yalan_soyledi":true}}`

### soc_002_aile_ziyareti

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"gte":10,"stat":"career.week"}]}`

**MEMLEKET**

Ailenden 'ne zaman geliyorsun' mesajı geldi. Son ziyaretinin üzerinden dört ay geçmiş. Sen bunu bilmiyordun, telefon hatırlattı.

**Choices:**
- `izin_ayarla`: İzin ayarlayıp git.
  - effects: `{"stress":-10,"fatigue":-5,"money":-1500}`
  - relationship: `[{"npc":"aile_generic","trust":10}]`
- `video_arama`: Video araması yeter de.
  - effects: `{"stress":2}`
  - relationship: `[{"npc":"aile_generic","trust":1}]`
- `erteleme`: 'Bayramda kesin gelirim' de.
  - effects: `{"stress":3}`
  - relationship: `[{"npc":"aile_generic","trust":-3}]`

### soc_003_memleket_ozlemi

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"eq":true,"flag":"relocated"}]}`

**MEMLEKET ARAMASI**

Annen yine 'ne zaman geleceksin' diye sordu. Bu şehre geleli bir yıl oldu, hâlâ tam olarak 'buralı' hissetmiyorsun.

**Choices:**
- `uzun_telefon`: Uzun bir telefon görüşmesi yap.
  - effects: `{"stress":-4,"fatigue":1}`
- `kisa_gec`: Kısa tut, işin var de.
  - effects: `{"stress":2}`

### soc_004_aile_evlilik_baskisi

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 24 weeks
- **Requirements:** `{"all":[{"eq":true,"flag":"lives_with_family"}]}`

**AİLE SOFRASINDA**

Aileyle akşam yemeğinde konu yine evliliğe geldi. Aynı evde/şehirde olmak, bu soruların sıklığını azaltmıyor; tam tersi.

**Choices:**
- `espriyle_gecistir`: Espriyle geçiştir.
  - effects: `{"stress":2}`
- `ciddi_konus`: Konuyu ciddi şekilde ele al.
  - effects: `{"stress":4}`

### soc_005_kendi_basina_yalnizlik

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"eq":true,"flag":"self_sufficient"}]}`

**BOŞ DAİRE**

Zor bir günün sonunda eve döndün. Anlatacak kimse yok, dinleyecek kimse yok. Kendi başına geçinmenin bir bedeli de bu.

**Choices:**
- `arkadasi_ara`: Geç saatte olsa bir arkadaşını ara.
  - effects: `{"stress":-4}`
- `sessizce_otur`: Sessizce otur, kendinle kal.
  - effects: `{"stress":2,"burnout":1}`

### soc_006_ekonomik_rahat_suclulugu

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"eq":true,"flag":"financially_comfortable"},{"gte":15,"stat":"career.week"}]}`

**AYNI MASADA FARKLI DERTLER**

Bir akranın bu ay kirasını nasıl ödeyeceğinden bahsediyor. Sen aynı dertle boğuşmuyorsun; bunu söylemek de garip, söylememek de.

**Choices:**
- `sessizce_dinle`: Sessizce dinle, konuyu değiştirme.
  - relationship: `[{"npc":"asistan_generic","trust":2}]`
- `yemek_ismarla`: O gün yemeği sen ısmarla, laf etmeden.
  - effects: `{"money":-600}`
  - relationship: `[{"npc":"asistan_generic","trust":5}]`

### soc_007_istanbul_yol_yorgunlugu

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 20 weeks
- **Requirements:** `{"all":[{"eq":"istanbul","stat":"career.city"}]}`

**İKİ SAATLİK YOL**

Bu şehirde ulaşım, iş kadar yorucu bir mesai gibi. Bugün servise gidiş dönüş toplam iki saatini yolda geçirdin, hiçbirinde oturacak yer bulamadan.

**Choices:**
- `taksiye_gec`: Bu hafta birkaç gün taksiyle git.
  - effects: `{"fatigue":-3,"money":-1200}`
- `dayan`: Toplu taşımaya dayan.
  - effects: `{"fatigue":3}`

### soc_008_kucuk_sehir_sosyal_cevre

- **Category:** SOCIAL
- **Trigger:** pool
- **Cooldown:** 30 weeks
- **Requirements:** `{"all":[{"in":["eskisehir","bursa"],"stat":"career.city"}]}`

**HERKES BİRBİRİNİ TANIYOR**

Bu şehirde sosyal çevre küçük; hastanedeki bir olay, akşam gittiğin kafede bile konuşuluyor. Bu bazen rahatlatıcı, bazen bunaltıcı.

**Choices:**
- `tanidikliktan_keyif_al`: Bu yakınlıktan keyif al.
  - effects: `{"stress":-3}`
- `mesafeni_koru`: Bilinçli olarak mesafeni koru.
  - effects: `{"stress":1}`
