# ÇÖMEZ — Event Design Bible (v0.1)

Bu doküman, implementasyona geçmeden önce event motorunun gerçek içerikle
test edilmesi amacıyla hazırlandı. ~24 örnek event ve 1 adet 5 aşamalı NPC
zinciri üzerinden ton, seçim sertliği, kategori dengesi ve şemanın yeterliliği
doğrulanıyor. Örnek JSON'lar `data/events/examples/` altında, motora
gireceklerinde `data/events/` altına taşınacak şekilde yazıldı.

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
(mobbing hattı vs. dostluk hattı) ve güç dengesi zamanla tersine dönen
(çömez → kıdemli) 5 aşamalı bir hikâye.

### Mekanik akış

```
Stage 1 (Hafta 6): chain_baris_01_ilk_gorev
  ├─ Seçenek A/B  → flags.baris_path = "dostluk"  → followUp: chain_baris_02_dostluk (delay 14 hafta)
  └─ Seçenek C/D  → flags.baris_path = "gerilim"   → followUp: chain_baris_02_gerilim (delay 14 hafta)

Stage 2 (~Hafta 20): chain_baris_02_dostluk | chain_baris_02_gerilim
  → her ikisi de kendi requirements'ında flags.baris_path'i kontrol eder
  → followUp: chain_baris_03_dostluk | chain_baris_03_gerilim (delay 20 hafta)

Stage 3 (~Hafta 40): kriz anında destek/yalnızlık
  → relationship.trust/grudge güncellenir
  → followUp: chain_baris_04_dostluk | chain_baris_04_gerilim (delay 25 hafta)

Stage 4 (~Hafta 65): Barış uzman oluyor — güç dengesi değişimi
  → NPC lifecycle transition (isActive kalır ama seniorityLevel/role değişir)
  → followUp: chain_baris_05_dostluk | chain_baris_05_gerilim (delay 25 hafta)

Stage 5 (~Hafta 90): Veda / ayna sahnesi
  → flags.broke_the_cycle veya flags.repeated_the_cycle set edilir
  → final karneye statistics.cycleOutcome olarak yazılır
```

### Bu vaka şema hakkında ne öğretti

1. **`followUpEvent` seçim-bazlı olmalı, event-bazlı değil.** İlk tasarımda
   `followUpEvent` event seviyesinde tek bir alan olarak düşünülmüştü; ama
   dallanma için her `choice` kendi `followUpEvent`'ini taşımalı (zaten
   mimari dokümanda böyleydi, bu vaka bunu doğruladı — değişiklik gerekmedi).
2. **Requirements'a `relationship` sorgusu şart.** Stage 3→4 geçişinde
   "Barış'a ne kadar güveniyorsun" gibi bir eşik gerekiyor; bu yüzden
   requirements DSL'ine `{ "relationship": { "npc": "baris", "trust": { "gte": 40 } } }`
   biçimi eklendi (mimari dokümanda ima edilmişti, burada netleştirildi).
3. **NPC lifecycle ile chain'in kesişmesi gerekiyor.** Stage 4, Barış'ın
   arka plan simülasyonunda "uzman oldu" transition'ına bağlı olmalı ama bu
   transition'ın *tam olarak* chain'in beklediği haftada olması garanti değil.
   Çözüm: chain event'i kendi zamanlamasını dayatır (`delayWeeks` ile), NPC'nin
   `seniorityLevel/role` alanı bu event'in `immediateEffects`'i içinde zorla
   güncellenir — yani kritik anlatı NPC transition'ları arka plan simülasyonuna
   bırakılmaz, chain event'in kendisi tetikler. Arka plan simülasyonu sıradan
   (anlatısal önemi olmayan) NPC'ler için kullanılır.
4. **Flag adlandırma çakışması riski.** `baris_path` gibi NPC'ye özel
   flag'lerin global flag namespace'inde çakışmaması için flag key'lerinin
   `chain_<chainId>_<key>` prefix'i taşıması öneriliyor (örn.
   `chain_baris_path`).
5. **Final istatistik bağlantısı çalışıyor.** Stage 5'in `flags.set` alanı
   doğrudan madde 25'teki "DÖNGÜYÜ KIRDIN" achievement'ına bağlanabiliyor —
   ek bir özel sistem gerekmedi, mevcut flag+statistics mekanizması yeterli.

Tam JSON: `data/events/examples/chain-baris.json`

---

## 6. Çömez ↔ Kıdemli Ayna Çifti

`data/events/examples/career-npc-mirror.json` içinde iki event:

- `mirror_01_comez_nobet_istegi` (erken oyun, oyuncu çömez): kıdemli oyuncudan
  nöbet ister, oyuncunun seçenekleri sınırlı (reddetme lüksü düşük).
- `mirror_02_kidemli_yeni_comez` (geç oyun, oyuncu kıdemli): yeni asistan
  oyuncudan aynı şeyi ister. Bu event'in requirements'ı
  `career.seniorityStage == "kıdemli"`; eğer oyuncunun
  `flags.chain_mobbing_deneyimi_var` (erken oyunda kötü muamele gördüğünü
  işaretleyen genel bir flag) `true` ise, ekstra bir intikamcı seçenek
  ("Biz çömezken böyle şeyler isteyemezdik.") havuza girer — yani seçenek
  sayısı bile oyuncunun geçmişine göre değişebiliyor.

**Şemaya etki:** `choices` dizisinin tamamı sabit değil, bir seçenek de
kendi `requirements`'ına sahip olabilmeli (event'in genel requirements'ından
ayrı, seçenek-seviyesinde opsiyonel `requirements`). Bu, mimari dokümanda
belirtilmemişti — **yeni bulgu**, şemaya eklenmesi gerekiyor.

---

## 7. Şema Revizyon Özeti (bu turun çıktısı)

Faz 5 (Event Engine) başlamadan önce mimari dokümana şu netleştirmeler eklenmeli:

1. `requirements.relationship.<npc>.<trait>` sorgu biçimi.
2. `choice.requirements` (opsiyonel, seçenek seviyesinde koşullu görünürlük).
3. `immediateEffects` alanlarının sabit sayı yerine `{min,max}` aralığı da
   kabul etmesi (seeded RNG ile çözülecek) — örn. `"stress": {"min":3,"max":8}`.
4. Flag namespace kuralı: chain'e özel flag'ler `chain_<chainId>_*` prefix'i taşır.
5. `CRISIS` alt kategorisi (eşik-tetiklemeli, `RARE`'den ayrı).
6. Narrative-kritik NPC transition'larının chain event'ler tarafından
   doğrudan tetiklenebilmesi (arka plan simülasyonunu bypass eden bir yol).

Bu 6 madde dışında mimari dokümandaki tasarım (özellikle `applyWeek(state, rng)`
saflığı) hiçbir değişiklik gerektirmeden bu vakayı kaldırdı — motorun temel
tasarımı doğrulandı.

---

## 8. Sonraki Adım

Şema revizyonları küçük ve mimariyi bozmuyor. Onayınla:
- Bu 6 maddeyi mimari dokümana (event engine bölümü) işleyip
- Faz 1'e (proje iskeleti + navigasyon) geçebiliriz.

Onaylamadan önce örnek event'lerin tamamını (`data/events/examples/`)
gözden geçirmek istersen, ton ve sertlik seviyesi hakkında geri bildirim
verebilirsin — içerik dolgusu (Faz 8) başlamadan bu kalıbı netleştirmek
en ucuz düzeltme noktası.
