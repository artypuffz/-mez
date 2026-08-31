# ÇÖMEZ — Event Design Bible (v0.2)

Bu doküman, implementasyona geçmeden önce event motorunun gerçek içerikle
test edilmesi amacıyla hazırlandı. ~24 örnek event ve 1 adet çok aşamalı NPC
zinciri üzerinden ton, seçim sertliği, kategori dengesi ve şemanın yeterliliği
doğrulanıyor. Örnek JSON'lar `data/events/examples/` altında, motora
gireceklerinde `data/events/` altına taşınacak şekilde yazıldı.

**Şema referansı artık ayrı dokümanda:** `docs/event-schema.md` (v0.2).
Bu doküman *neden* sorularına, `event-schema.md` *nasıl* sorusuna cevap verir.

## v0.2 Değişiklik Özeti

Onaylanan v0.1 + ek 7 tasarım kararı sonrası:

1. **`triggerMode: "pool" | "scheduled"`** — zincir aşamaları artık asla
   rastgele havuzdan tesadüfen tetiklenmiyor.
2. **`choice.requirements`** — kıdeme/flag'e/relationship'e göre seçenek
   görünürlüğü (bkz. §6, ayna event çifti).
3. **Koşullu metin varyantları** (`descriptionVariants`/`titleVariants`) —
   eval yok, aynı requirement DSL'i yeniden kullanılıyor.
4. **Esnek zincir çözümleme** — `chainId + chainCheckpoint + priority +
   requirements(any/all)` ile, flag tek başına kaderi belirlemiyor; güncel
   `relationship` state'i de değerlendiriliyor (bkz. §5).
5. **`behaviorTags`** — sabit isimli sayaçlar (`supportiveJuniorChoices` vb.)
   yerine serbest, ad alanlı etiketler (`"junior:supportive"` vb.); yeni
   davranış kategorisi eklemek şema değişikliği gerektirmiyor.
6. **Trade-off kuralı** ton rehberine eklendi (bkz. §2.1).
7. **Deadpan sıkılaştırma** — NPC'lerin temayı doğrudan söylemesi yasak
   (bkz. §2.2, Barış Hattı stage5 revizyonu).

Detaylı şema: `docs/event-schema.md`. Aşağıdaki bölümler bu kararların
tasarım gerekçesini ve örnek uygulamalarını içerir.

---

## 1. Ton Rehberi

Kural: **Şaka, doktorların yaşadığı kötü koşullar değil; bu koşulları
üreten sistemin absürtlüğüdür.**

**Yapılması gereken:**
- Deadpan anlatım: absürt bir durumu son derece sakin, resmi bir dille anlat.
- Sayısal/bürokratik detaylarla gerçekçilik kur ("9 nöbet, kıdemlin 3, sebebi bilinmiyor").
- Absürtlüğü bir *sistem tuhaflığı* olarak sun (nöbet listesi mantıksız, HBYS
  çöküyor, whatsapp grubu terör estiriyor) — kişilere yönelik alay değil.
- Oyuncuya bazen hiçbir seçeneğin "doğru" olmadığını hissettir; bu gerçekçiliği artırır.

**Yapılmaması gereken:**
- Meme/internet şakası diline kaymak (zaman aşımına uğrar, ton kopar).
- Gerçek kişi/kurum hakkında doğrulanabilir iddia gibi duran cümleler.
- Acıyı sömüren, "trajedi porno"suna dönen sahneler — kara mizah her zaman
  bir tuhaflık/ironi katmanı içermeli, çıplak acı değil.

Referans cümle (prompt'tan, hedef ton budur):
> "04.17. Telefonun çaldı. Kıdemlin arıyor. Bugün nöbetçi değilsin. Bunun
> kıdemlin açısından herhangi bir önemi yok."

### 1.1 Trade-off Kuralı (YENİ, v0.2)

Özellikle mobbing/hiyerarşi kararlarında **hiçbir seçenek net "iyi" veya
"kötü" olarak işaretlenmiş hissettirmemeli.** Somut kural:

- Çömeze yük aktaran seçenek, oyuncunun kendi stres/yorgunluk/zamanını
  **gerçekten** azaltmalı (kozmetik değil, ölçülebilir bir kazanç).
- Çömezi koruyan/destekleyen seçenek de **gerçek bir bedel** taşımalı
  (zaman, stres veya para) — "bedelsiz erdem" yazılmaz.
- Yazarken kontrol sorusu: *"Bu seçeneği neden bir oyuncu seçsin?"* — cevap
  yalnızca "çünkü doğrusu bu" ise seçenek yeniden yazılır.

Önce/sonra örneği (`career-npc-mirror.json`, `mirror_02_kidemli_yeni_comez`):

| Önce (v0.1) | Sonra (v0.2) |
|---|---|
| "Nöbetini değiştir" → sadece `fatigue+6` | "Nöbetini değiştir" → `fatigue+6, stress+2` **+** kendi o haftaki başka bir yükümlülüğünü (`flags.set: missed_own_prep`) aksatma riski taşıyor — destek bedelsiz değil. |
| "Reddet" → sadece ilişki hasarı | "Reddet" → `stress:-3` (kendi yükü hafifler) + ilişki hasarı — reddetmenin *gerçek* bir kazancı var, salt kötülük için kötülük değil. |

### 1.2 Deadpan Sıkılaştırma Kuralı (YENİ, v0.2)

NPC diyalogları veya anlatı metni **oyunun temasını doğrudan açıklamamalı**
("döngü", "sistem böyle" gibi ders çıkarma cümleleri narratörden gelmemeli).
Tema, durumun kendisinden ve tekrar eden imgelerden (örn. "evrak destesi"
motifinin Barış Hattı'nın hem başında hem sonunda geri dönmesi) hissettirilir.

Önce/sonra örneği (`chain-baris.json`, `chain_baris_05_dostluk`):

> **Önce:** "...sana 'kendi çömezine benim yaptığım gibi davran, ben de sana
> kötü davranılmasını izlemek istemedim' dedi."
>
> **Sonra:** "...sana eski nöbet defterini uzattı, 'artık senin' dedi ve
> gitti. Masanın üstünde, kendi ilk yılından bir asistanın bıraktığı bir
> evrak destesi duruyor."

Ders anlatılmıyor, sadece sahne kuruluyor — oyuncu Stage 1'deki kendi evrak
sahnesini hatırlayıp bağlantıyı kendisi kuruyor.

---

## 2. Seçim Tasarım Kuralları

1. Her event **3-4 seçenek** içerir.
2. En az bir seçenek her zaman **pasif/kaçış** olmalı (görmezden gel, erteler,
   "bakarız" de). Bu seçenek nadiren "ödülsüz" değildir — genelde küçük bir
   stres artışı + ilişkide belirsizlik bırakır, oyuncuyu cezalandırmaz ama
   temiz de çıkarmaz.
3. "En doğru" seçenek olmamalı — her seçenek bir şeyden fedakârlık etmeli
   (para vs. zaman, ilişki vs. sınır, kısa vadeli rahatlama vs. uzun vadeli risk).
4. Sonuç oyuncuya **anlaşılır** olmalı: efekt sayıları (`+12 stres`) her zaman
   gösterilir; sadece NPC'nin *gizli* tepkisi saklı kalır.
5. RNG etkisi olan seçimlerde bunu izlenimle belli et ("Şansına küstün /
   şanslıydın") ama sayıyı önceden gösterme.

---

## 3. Stres / Yorgunluk / Tükenmişlik Formülü

Bu turun en önemli çıktısı budur (madde 6'daki eksik netleştirildi):

| Gösterge | Vade | Haftalık pasif değişim | Nasıl düşer | Tükenmişliği nasıl besler |
|---|---|---|---|---|
| **Yorgunluk** | Kısa | Nöbet yoksa `-15..-25` | Uyku/izin eventleri, nöbetsiz hafta | — |
| **Stres** | Orta | Olaysız haftada `-3..-5` | Sosyal aktivite, izin, "iyi" event sonuçları | — |
| **Tükenmişlik** | Uzun | Pasif olarak neredeyse hiç düşmez (`-1`, yalnızca stres VE yorgunluk ikisi de <40 olan haftalarda) | Sadece büyük "mola" eventleri (tatil, uzun izin) belirgin düşürür | — |

**Besleme kuralı:** Bir hafta sonunda `stres > 60 AND yorgunluk > 70`
koşulu sağlanıyorsa, o hafta `tükenmişlik += 2..4`. Bu durum art arda kaç
haftadır sürdüğünü sayan bir `flags.consecutiveOverloadWeeks` sayacıyla
takip edilir; sayaç 4'ü geçerse artış ikiye katlanır (`+4..8`) — yani sürekli
yorgun-stresli kalmak, ara sıra kötü hafta geçirmekten çok daha pahalıya patlar.

**Kriz eşiği:** `tükenmişlik > 90` → kriz event havuzu zorunlu tetiklenir
(istifa düşüncesi, işe gitmeme vb. — madde 7'de detaylandırılan GAME_OVER
zincirine bağlanır). Bu havuz ayrı bir `CRISIS` alt kategorisi olarak
düşünülmeli, `RARE` ile karıştırılmamalı (RARE = düşük olasılıklı ekstrem
olaylar, CRISIS = eşik tabanlı zorunlu tetiklenen olaylar).

**Şemaya etkisi:** `immediateEffects` alanına engine seviyesinde bu pasif
tick'i uygulayan ayrı bir `weeklyPassiveTick(state)` fonksiyonu eklenmeli;
bu fonksiyon event'lerden bağımsız, her `applyWeek` çağrısında event
seçiminden *önce* çalışır.

---

## 4. Kategori Oranı Hatırlatma

Hedef dağılım (madde 21): %40-50 genel, %25-35 branşa özgü, %20-30
hastane/NPC/gündem/nadir. Bu turda yazılan 24 event kabaca:

- GENERAL: 5
- BRANCH (İç Hastalıkları 2, Genel Cerrahi 2, Psikiyatri 2): 6
- MOBBING: 2 (+ zincirin 4 mobbing-hattı aşaması ayrıca)
- FINANCIAL: 2
- SOCIAL: 2
- HEALTH_SYSTEM: 2
- HOSPITAL: 2
- CAREER/NPC (çömez↔kıdemli aynası): 2
- RARE: 1
- CHAIN (Barış Hattı): 9 (GENERAL+MOBBING+SOCIAL karışımı, kendi başına bir kategori değil, `chainId` ile etiketleniyor)

Oranlar örnekleme amaçlı; gerçek içerik doldurulurken (Faz 8) otomatik bir
`scripts/reportCategoryBalance.ts` ile doğrulanmalı.

---

## 5. Zincir Vaka Analizi: "Barış Hattı"

Amaç: aynı NPC ile aylar süren, oyuncunun erken kararlarına göre **dallanan**
(mobbing hattı vs. dostluk hattı) ama **rigid olmayan** — sonraki eventlerin
güncel ilişki durumunu yeniden değerlendirdiği — ve güç dengesi zamanla
tersine dönen (çömez → kıdemli) çok aşamalı bir hikâye.

### Mekanik akış (v0.2, checkpoint tabanlı)

```
Stage 1 (Hafta 6-16 arası, triggerMode:"pool"): chain_baris_01_ilk_gorev
  ├─ Seçenek A/B  → relationship.baris.trust +5..+15 + flags.chain_baris_path="dostluk"
  │                 → followUp: {chainId:"baris", checkpoint:"stage2", delayWeeks:14}
  └─ Seçenek C/D  → relationship.baris.grudge +10..+20 + flags.chain_baris_path="gerilim"
                    → followUp: {chainId:"baris", checkpoint:"stage2", delayWeeks:14}

Stage 2 (~Hafta 20, checkpoint:"stage2", triggerMode:"scheduled"):
  Adaylar: chain_baris_02_dostluk, chain_baris_02_gerilim
  → her adayın requirements'ı `any: [flag eşleşmesi, relationship eşiği]`
  → o anki relationship.trust/grudge flag'i geçersiz kılabilir (esneklik burada)
  → followUp: checkpoint:"stage3" (delayWeeks 20)

Stage 3 (~Hafta 40, checkpoint:"stage3"): kriz anında destek/yalnızlık
  → relationship.trust/grudge yine güncellenir
  → followUp: checkpoint:"stage4" (delayWeeks 25)

Stage 4 (~Hafta 65, checkpoint:"stage4"): Barış uzman oluyor — güç dengesi değişimi
  → NPC lifecycle transition event'in kendisi tarafından zorla tetiklenir
  → followUp: checkpoint:"stage5" (delayWeeks 25)

Stage 5 (~Hafta 90, checkpoint:"stage5"): Veda / ayna sahnesi
  → flags.chain_baris_cycle_outcome set edilir
  → statistics.behaviorTagCounts["junior:*"] final örüntü değerlendirmesine girer
```

### Bu vaka şema hakkında ne öğretti

1. **`followUpEvent` seçim-bazlı olmalı, checkpoint-bazlı olmalı, event-id-bazlı olmamalı.**
   v0.1'de her choice doğrudan bir sonraki event id'sini hedefliyordu — bu,
   "chain path rigid olmasın" isteğiyle çelişiyordu (bir kez "gerilim" flag'i
   set edilince yol değişemiyordu). v0.2'de choice artık `chainId+checkpoint`
   hedefliyor; o checkpoint'teki adaylar arasından **o anki** relationship
   durumuna göre seçim yapılıyor (bkz. `event-schema.md` §4.2).
2. **Requirements'a `relationship` sorgusu ve `any`/OR desteği şart.**
   Flag tek başına yeterli değil — "Barış'a ne kadar güveniyorsun" gibi bir
   canlı eşik gerekiyor, ve flag ile relationship'in *ikisinden biri*
   yeterli olmalı (OR) ki flag hâlâ bir varsayılan/fallback sinyali olarak
   iş görsün.
3. **NPC lifecycle ile chain'in kesişmesi gerekiyor.** Stage 4, Barış'ın
   arka plan simülasyonunda "uzman oldu" transition'ına bağlı olmalı ama bu
   transition'ın *tam olarak* chain'in beklediği haftada olması garanti değil.
   Çözüm: chain event'i kendi zamanlamasını dayatır (`delayWeeks` ile), NPC'nin
   `seniorityLevel/role` alanı bu event'in `immediateEffects`'i içinde zorla
   güncellenir — kritik anlatı NPC transition'ları arka plan simülasyonuna
   bırakılmaz, chain event'in kendisi tetikler. Arka plan simülasyonu sıradan
   (anlatısal önemi olmayan) NPC'ler için kullanılır.
4. **Flag adlandırma çakışması riski.** `baris_path` gibi NPC'ye özel
   flag'lerin global flag namespace'inde çakışmaması için flag key'lerinin
   `chain_<chainId>_<key>` prefix'i taşıması öneriliyor (örn.
   `chain_baris_path`).
5. **Her checkpoint'in kaybolmama güvencesi olmalı.** Bir checkpoint'te
   hiçbir aday requirements'ı sağlamazsa zincir "ölür". Bu yüzden her
   checkpoint'te tam olarak bir `isFallback:true` aday bulunmalı (Barış
   Hattı'nda bu, flag disjunct'i sayesinde pratikte her zaman en az bir
   aday eşleştiği için şimdilik gerekmedi, ama motor implementasyonunda
   güvenlik ağı olarak desteklenmeli).
6. **Final istatistik bağlantısı artık tek event'e değil örüntüye bağlı.**
   Stage 5, tek bir `flags.set` yerine `behaviorTags` üretiyor; "DÖNGÜYÜ
   KIRDIN" gibi achievement'lar bu chain'in *dışındaki* (mirror event'ler
   gibi) davranışlarla birlikte toplam örüntüden hesaplanıyor (bkz. §6).

Tam JSON: `data/events/examples/chain-baris.json`

---

## 6. Çömez ↔ Kıdemli Ayna Çifti ve Örüntü Takibi (v0.2)

`data/events/examples/career-npc-mirror.json` artık iki değil **dört**
event içeriyor — madde 5'teki "tek seçime bağlama" uyarısı, örüntünün
birden fazla event boyunca örneklenmesini gerektiriyordu:

- `mirror_01_comez_nobet_istegi` (erken oyun, oyuncu çömez): kıdemli oyuncudan
  nöbet ister, oyuncunun seçenekleri sınırlı (reddetme lüksü düşük).
- `mirror_02_kidemli_yeni_comez` (geç oyun, oyuncu kıdemli): yeni asistan
  aynı şeyi senden istiyor. `career.seniorityStage == "kidemli"` gerektirir;
  `flags.chain_mobbing_deneyimi_var` true ise ekstra bir `choice.requirements`
  ile kilitli seçenek ("Biz çömezken böyle şeyler isteyemezdik.") havuza girer.
- `mirror_03_kidemli_hata_devri` (YENİ): kendi küçük bir hatanı (geç kalan
  bir tetkik takibi) ya üstlenirsin ya da sessizce yeni asistana yıkarsın.
- `mirror_04_kidemli_kongre_izni` (YENİ): yeni asistanın kongre izni talebini
  değerlendirirsin — onaylamak senin kendi iznini riske atar, reddetmek
  onun kongre fırsatını.

Her seçenek artık bir `behaviorTags` üretiyor (`junior:supportive`,
`junior:exploitative`, `junior:protected`, `junior:burdened`, vb. — bkz.
`event-schema.md` §6) ve **hiçbiri bedelsiz değil** (bkz. §1.1 Trade-off
Kuralı). Final karnedeki "DÖNGÜYÜ KIRDIN" değerlendirmesi bu dört event'in
+ Barış Hattı'nın ürettiği etiketlerin toplam oranından hesaplanacak, tek
bir event'in tek bir seçimine değil.

**Şemaya etki:** `choice.requirements` (event'in genel requirements'ından
ayrı, seçenek-seviyesinde koşullu görünürlük) — bu, ilk mimari dokümanda
yoktu, bu vaka sırasında ortaya çıktı ve `event-schema.md`'ye işlendi.

---

## 7. Şema Revizyonları — Durum (v0.2, tamamlandı)

Önceki turda listelenen 6 madde + bu turda onaylanan 7 ek karar
`docs/event-schema.md` (v0.2) içine tam olarak işlendi:

| # | Revizyon | Durum |
|---|---|---|
| 1 | `requirements.relationship.<npc>.<trait>` sorgu biçimi | ✅ event-schema.md §3, §6 |
| 2 | `choice.requirements` | ✅ event-schema.md §3 |
| 3 | `{min,max}` aralıklı efektler (seeded RNG) | ✅ event-schema.md §2 |
| 4 | Flag namespace kuralı (`chain_<chainId>_*`) | ✅ uygulandı (chain-baris.json) |
| 5 | `CRISIS` alt kategorisi | ✅ event-schema.md §1 |
| 6 | Chain event'lerin NPC transition'ı doğrudan tetikleyebilmesi | ✅ event-schema.md §4.2, Barış Hattı Stage 4 |
| 7 | `triggerMode: "pool"|"scheduled"` | ✅ event-schema.md §4.1 |
| 8 | Koşullu metin varyantları (eval'siz) | ✅ event-schema.md §5 |
| 9 | Esnek/checkpoint tabanlı zincir çözümleme + `any`/`all` | ✅ event-schema.md §4.2-4.3 |
| 10 | `behaviorTags` (genelleştirilmiş sayaçlar) | ✅ event-schema.md §6 |
| 11 | Trade-off yazım kuralı | ✅ §1.1 (bu doküman) |
| 12 | Deadpan sıkılaştırma kuralı | ✅ §1.2 (bu doküman) |

Bu 12 madde dışında mimari dokümandaki temel tasarım (özellikle
`applyWeek(state, rng)` saflığı, engine/UI ayrımı) hiçbir değişiklik
gerektirmeden bu iki tasarım turunu kaldırdı — motorun temel mimarisi
doğrulandı. **Migration gerekmiyor** (henüz çalışan bir save/engine yok).

---

## 8. Sonraki Adım

Onaylandı — Faz 1'e (proje iskeleti + navigasyon) geçildi. İlerleme ve
çıktı raporu için oturumun genel özetine bakınız; bu doküman yalnızca
içerik/tasarım kararlarını kayıt altına alır, implementasyon durumunu
değil.
