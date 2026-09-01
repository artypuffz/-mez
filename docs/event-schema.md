# ÇÖMEZ — Event Schema & DSL Referansı (v0.7)

Bu doküman, event motoru (Faz 5) implementasyonunda kullanılacak resmi
şemadır. `docs/event-design-bible.md` bu şemanın *neden* bu şekilde
olduğunu (tasarım gerekçesi, örnekler) anlatır; burası sade referans.

## Değişiklik Geçmişi

- **v0.1** → mimari dokümanın ilk taslağındaki şema.
- **v0.2** → Event Design Bible turu + ek 7 tasarım kararı sonrası:
  `triggerMode`, `choice.requirements`, text variant desteği, esnek (rigid
  olmayan) zincir çözümleme, genelleştirilmiş `behaviorTags` sayaç
  mekanizması, `requirements`'a `any` (OR) desteği.
- **v0.3** (bu doküman, Faz 6) → NPC üretimi/lifecycle/relationship
  modeli kesinleşmesi sonrası: `RelationshipField` `trust`/`friendship`/
  `grudge`'a daraldı (NPC kişiliği artık `NpcState.personality`'de, asla
  relationship kaydına karışmıyor — bkz. §8); NPC hedefleme `npc` (sabit
  id) **veya** `boundNpc` (event'in kendi `npcSelectors`'ından çözülen
  anahtar) olabiliyor (§9); `event.once` gerçek tek-seferlik mekanizması
  eklendi, `cooldownWeeks`'ten ayrı bir kavram (§10); `event.
  requiredNpcTemplate` authored karakter şablonlarını (örn. "baris")
  isim özel-case'lemeden gate'liyor (§11); `choice.npcTransitions`
  authored, anlık NPC lifecycle geçişleri için (§12).
- **v0.4** (bu doküman, Faz 7) → nöbet + aylık ekonomi sistemi entegrasyonu
  sonrası: `choice.onCallEffects` eklendi — o anki ayın nöbet schedule'ını
  mutasyona uğratan, küçük ve sabit bir surface area (§14); requirement
  DSL'in mevcut `stat` dot-path leaf'i artık `onCall.currentMonthTotalShifts`
  / `onCall.weekendShiftCount` / `onCall.staffingLoad` path'lerini de
  okuyabiliyor — yeni bir requirement-node türü **eklenmedi**, sadece
  RequirementContext'e yeni alanlar eklendi (§14). Motor nöbet/ekonomi
  sisteminin anlamını bilmiyor, yalnızca bu state'i okuyor/yazıyor.
- **v0.5** (bu doküman, Faz 8) → içerik genişlemesi + event ekosistemi
  sonrası: `choice.onCallEffects`'e `transfer_player_shift_to_npc` eklendi
  (§14.2) — bir nöbeti oyuncudan `npcSelectors`'dan çözülen bir NPC'ye
  devreden tek yönlü mutasyon (tersi yok: NPC'ler player-centric schedule
  modelinde kendi ayrı assignment kaydını tutmuyor). Yeni bir requirement-
  node türü **eklenmedi**. Ayrıca içerik-kalitesi doğrulama katmanına
  (§38) yeni, sadece-uyarı/hata üreten statik kontroller eklendi (yinelenen
  başlık, aşırı uzun metin, seçenekler arası görünür-etki aynılığı,
  ulaşılamaz `all` bloğu, geçersiz `requiredNpcTemplate`/`branchIn`,
  `once`+`cooldownWeeks` çakışması) — bunlar şemanın kendisini değil,
  yazım kalitesini denetliyor.
- **v0.6** (bu doküman, Faz 9) → kriz sistemi + Game Over + kaynak
  dengeleme sonrası:
  - `triggerMode`'a üçüncü bir değer eklendi: `"crisis"`. `"pool"`'dan
    farkı — normal ağırlıklı havuz seçimine (`selectPoolEvents`) hiç
    girmiyor; kendi ayrı, kaynak/baskı-durumuna bağlı resolver'ı var
    (`domain/crisis/selection.ts`). `triggerMode:"crisis"` bir event'in
    `crisisType` alanı zorunlu (`"exhaustion"|"burnout"|"financial"|
    "career"`), `severity` (`"warning"|"serious"|"critical"`) opsiyonel —
    ikisi de sadece motor/seçim tarafı için, UI'da sayı olarak
    gösterilmiyor (§31 tasarım kararı). Bir kriz zincirinin GİRİŞ noktası
    dışındaki tüm checkpoint'leri (stage2+) sıradan `triggerMode:
    "scheduled"` olarak kalıyor — mevcut `followUpEvent`/checkpoint
    çözümleme motorunun aynen kullanılması, kriz-özel yeni bir mekanizma
    icat edilmemesi anlamına geliyor.
  - `choice.careerEffects` eklendi — kariyeri bitiren TEK generic DSL:
    `[{type:"end_career", reason: GameOverReason}]`. `GameOverReason` kapalı
    bir liste (`resigned_burnout`|`resigned_career`|`financial_collapse`|
    `program_left`|`dismissed`). Motor bunu her zaman bir choice'ın SON
    efekti olarak uygular (§25) — asla bir kaynak eşiğinden otomatik
    üretilmiyor, sadece oyuncunun seçtiği bir choice'tan.
  - RequirementContext'e iki yeni alan eklendi (yeni bir requirement-node
    türü **eklenmedi**, mevcut `stat` dot-path leaf'i genişledi):
    `resourcePressure.{highStressWeeks,highFatigueWeeks,
    combinedPressureWeeks,lowPressureWeeks}` ve `financialPressure.
    {consecutiveNegativeMonths,lowestBalance}`.
  - İçerik-kalitesi/şema doğrulaması (§50) genişledi: geçersiz
    `crisisType`/`severity`, `triggerMode:"crisis"` dışında set edilmiş
    `crisisType`/`severity`, geçersiz `careerEffects.reason` artık hata.
    Kriz zinciri dead-end'leri zaten var olan dangling-`followUpEvent`/
    fallback kontrolleriyle yakalanıyor — ayrı bir kontrol gerekmedi.
- **v0.7** (bu doküman, Faz 10) → uzmanlık sınavı + kariyer raporu
  sonrası: kasıtlı olarak **yeni bir `triggerMode` eklenmedi** — uzmanlık
  sınavı zinciri (`specialist_exam`) mevcut `pool`/`scheduled`
  mekanizmalarıyla, sıradan bir authored zincir gibi ifade ediliyor.
  - `choice.careerEffects`'e ikinci bir varyant eklendi:
    `{type:"become_specialist"}`. `GameOverReason` kapalı listesine
    `"specialist_exam_failed"` eklendi (ikinci ve MVP'de son sınav
    denemesinin de başarısız olması — §5, resign etmekten "daha kötü"
    olarak çerçevelenmiyor). Motorun `applyCareerEffects` dönüş tipi artık
    `{gameOver?, becameSpecialist?}` — tek bir `GameOverState|undefined`
    yerine, çünkü artık bir choice hem kariyeri bitirebilir hem de
    (farklı bir choice'ta) `career.phase`'i `"specialist"`'e taşıyabilir.
  - Yeni bir DSL alanı: `choice.specialistExamEffects: [{type:"attempt"}]`.
    Motor bunu gördüğünde `domain/specialistExam/outcome.ts`'deki saf
    `calculateSpecialistExamOutcome` fonksiyonunu (mevcut kaynak/kriz/
    ilişki state'inden + `statistics.specialist_exam_prep_points`'ten
    türetilen deterministik bir skor) çağırıp sonucu hem
    `state.specialistExam`'e hem de motor tarafından set edilen
    `flags.specialist_exam_result` (`"passed"|"failed"`) flag'ine yazıyor
    — içerik bu flag'i sıradan bir `requirements.flag` koşuluyla okuyarak
    stage3'te "geçtin" / "geçemedin" dallanmasını yapıyor, yeni bir
    requirement-node türü **eklenmedi**.
  - İçerik-kalitesi doğrulaması (§38/§50) genişledi: `specialist_exam_result`
    motor tarafından set edildiği için "hiç set edilmeyen flag okunuyor"
    uyarısının kapsamı dışına alındı (`ENGINE_SET_FLAGS`, aynı
    `BACKGROUND_FLAGS`'in yanına eklendi — bkz. `domain/events/content.ts`).
  - `CareerPhase`'e (event şemasının değil, `domain/state/types.ts`'in bir
    parçası, burada sadece bağlam için not düşülüyor) `"specialist_exam"`
    eklendi — `"residency_complete"` artık tek bir motor tick'inde her
    zaman `"specialist_exam"`'e çöküyor, kalıcı bir faz olarak hiç
    gözlemlenmiyor (bkz. `advanceResidencyWeekWithEvents`).

---

## 1. Event Nesnesi

```ts
interface EventDef {
  id: string;
  title: string;                      // varsayılan başlık
  titleVariants?: TextVariant[];       // opsiyonel, koşullu başlık override'ları
  description: string;                 // varsayılan açıklama
  descriptionVariants?: TextVariant[]; // opsiyonel, koşullu açıklama override'ları
  category: EventCategory;             // GENERAL | BRANCH | HOSPITAL | NPC | MOBBING
                                        // | ON_CALL | FINANCIAL | SOCIAL
                                        // | HEALTH_SYSTEM | WORLD | RARE | CAREER
                                        // | CRISIS  (v0.1'de eklenmişti)
  triggerMode: "pool" | "scheduled";   // YENİ (v0.2) — bkz. §4
  requirements?: RequirementNode;      // event'in havuzda/tetiklenmede aday olması için
  weight?: number;                     // yalnızca triggerMode:"pool" için anlamlı
  cooldownWeeks?: number;              // yalnızca triggerMode:"pool" için anlamlı
  chainId?: string;                    // bu event bir zincirin parçasıysa
  chainCheckpoint?: string;            // YENİ (v0.2) — bkz. §4
  priority?: number;                   // YENİ (v0.2) — aday çakışmasında öncelik (yüksek kazanır)
  isFallback?: boolean;                // YENİ (v0.2) — hiçbir aday eşleşmezse son çare
  choices: ChoiceDef[];
  once?: boolean;                      // YENİ (v0.3) — bkz. §10
  npcSelectors?: Record<string, NpcSelector>; // YENİ (v0.3) — bkz. §9.2
  requiredNpcTemplate?: string;        // YENİ (v0.3) — bkz. §11
}
```

## 2. Choice Nesnesi

```ts
interface ChoiceDef {
  id: string;
  text: string;
  requirements?: RequirementNode;      // YENİ (v0.2) — bkz. §3
  immediateEffects?: EffectMap;
  delayedEffects?: { delayWeeks: number; effects: EffectMap }[];
  relationshipEffects?: RelationshipEffect[];
  flags?: { set?: Record<string, boolean|number|string>; clear?: string[] };
  behaviorTags?: string[];             // YENİ (v0.2) — bkz. §5
  statistics?: { increment?: Record<string, number> }; // serbest sayaçlar (nadiren gerekir; genelde behaviorTags tercih edilir)
  followUpEvent?: FollowUpRef;         // GÜNCELLENDİ (v0.2) — bkz. §4
  npcTransitions?: NpcTransitionEffect[]; // YENİ (v0.3) — bkz. §12
  onCallEffects?: OnCallEffect[];      // YENİ (v0.4) — bkz. §14
}
```

`EffectMap` alanları sabit sayı **veya** aralık kabul eder (seeded RNG ile
çözülür): `"stress": 5` ya da `"stress": {"min": 3, "max": 8}`.

## 3. `choice.requirements` (YENİ)

Bir seçeneğin **havuzdan görünür olup olmadığını** belirler — event zaten
tetiklenmiş olsa bile bazı seçenekler oyuncunun kıdemine, flag'lerine,
resource değerlerine veya NPC ilişkisine göre listede hiç görünmeyebilir.
Event-seviyesindeki `requirements` ile **aynı `RequirementNode` tipini**
kullanır (kod tekrarı yok, tek bir requirement evaluator hem event hem
choice seviyesinde çalışır).

```json
{
  "id": "biz_comezken",
  "text": "'Biz çömezken böyle şeyler isteyemezdik.' de.",
  "requirements": { "all": [{ "flag": "chain_mobbing_deneyimi_var", "eq": true }] },
  "...": "..."
}
```

Engin kuralı: bir event'in tüm seçenekleri requirements nedeniyle elenirse,
o event o hafta hiç sunulmaz (havuzdan hiç çekilmemiş gibi davranılır) —
oyuncu asla "seçeneksiz" bir ekranla karşılaşmaz.

## 4. `triggerMode`, Zincir Çözümleme ve Esnek Dallanma (YENİ/GÜNCELLENDİ)

### 4.1 `triggerMode`

- `"pool"` (varsayılan): event, haftalık ağırlıklı rastgele seçim havuzuna girer.
- `"scheduled"`: event **asla** pool sampling'e girmez. Yalnızca bir
  `followUpEvent` kuyruğa aldığında ve zamanı geldiğinde değerlendirilir.

Bu ayrım, madde 1'deki isteği karşılar: zincirin 2-5. aşamaları hiçbir
zaman "tesadüfen" rastgele bir haftada tetiklenemez.

### 4.2 `followUpEvent` — checkpoint tabanlı, event-id tabanlı değil

```ts
interface FollowUpRef {
  chainId: string;
  checkpoint: string;      // örn. "stage2" — belirli bir event id değil, bir "durak"
  delayWeeks: number;
}
```

Bir choice artık **belirli bir event id'sine değil**, bir `chainId +
checkpoint` çiftine yönlendirir. `delayWeeks` sonunda motor şu adımları izler:

1. `chainId` ve `chainCheckpoint` eşleşen, `triggerMode:"scheduled"` olan
   **tüm** event'leri aday olarak topla.
2. Her adayın `requirements`'ını **o anki** state'e (güncel `relationship`
   değerleri dahil — sadece stage1'de set edilen flag değil) göre değerlendir.
3. Eşleşen adaylar arasından en yüksek `priority`'ye sahip olanı seç; eşitlik
   varsa daha spesifik requirements'a (leaf koşul sayısı fazla olan) sahip
   olanı seç.
4. Hiçbir aday eşleşmezse, `isFallback: true` işaretli aday (checkpoint
   başına tam olarak bir tane bulunmalı) devreye girer — zincir asla "ölü
   uç"a düşmez.

Bu mekanizma madde 4'ü ("chain path'leri rigid olmasın, sonraki eventler
güncel relationship state'ini değerlendirsin") doğrudan karşılar: stage1'de
"gerilim" yolunu seçen bir oyuncu, aradaki haftalarda o NPC ile ilgili
başka (chain-dışı) pool event'lerinde ilişkiyi toparlarsa, stage2'de
"dostluk" adayının requirements'ı (`relationship.trust.gte`) sağlanmış
olabilir ve o tetiklenir — flag tek başına kaderi belirlemez, yalnızca bir
varsayılan sinyal ve fallback güvencesidir.

### 4.3 `RequirementNode` — `any`/`all` (OR/AND) desteği

```ts
type RequirementNode =
  | { all: RequirementNode[] }
  | { any: RequirementNode[] }
  | LeafCondition;

type LeafCondition =
  | { stat: string; eq?: any; gte?: number; lte?: number }
  | { flag: string; eq: boolean | number | string }
  | { branchIn: string[] }
  | { relationship: NpcTargetRef & { trust?: RangeCond; friendship?: RangeCond; grudge?: RangeCond } };

// NpcTargetRef — GÜNCELLENDİ (v0.3): npc VE relationshipEffect'in ikisi de
// artık ya sabit bir id (`npc`) ya da event'in kendi npcSelectors'ından
// çözülen bir anahtar (`boundNpc`) kabul eder; tam olarak biri set edilmeli.
// bkz. §9.
type NpcTargetRef = { npc: string } | { boundNpc: string };
```

> **v0.3 kırılma notu:** `RelationshipField` v0.2'de `trust | friendship |
> grudge | mobbingTendency | helpfulness | ego | burnoutNpc` idi. Faz 6,
> NPC'nin kendi kişiliğini (`helpfulness`/`ego`/`hierarchyOrientation`/
> `conflictTendency`/`burnout`) tamamen `NpcState.personality`'ye taşıdı —
> relationship kaydı artık **yalnızca** `trust | friendship | grudge`
> taşır, hiçbir zaman NPC'nin kendi trait'leriyle karışmaz. `mobbingTendency`
> ve `burnoutNpc` hiç kullanılmıyordu, kaldırıldı.

`any`/`all` iç içe geçebilir (`all` içinde `any`, vs.) — bu, esnek zincir
çözümlemesinin (flag OR relationship-threshold) temelini oluşturur.

## 5. Koşullu Metin Varyantları (YENİ)

`eval()` veya template motoruna gerek kalmadan, aynı requirement DSL'i
kullanılarak metin override edilir:

```ts
interface TextVariant {
  requirements: RequirementNode;
  text: string;
}
```

Çözümleme: `descriptionVariants` dizisi **yukarıdan aşağı** taranır, ilk
`requirements`'ı sağlayan varyantın `text`'i kullanılır; hiçbiri sağlanmazsa
event'in varsayılan `description`'ı kullanılır. Aynı kural `titleVariants`
için geçerli.

```json
{
  "description": "Barış koridorda seni durdurdu, elindeki evrakı uzattı.",
  "descriptionVariants": [
    {
      "requirements": { "relationship": { "npc": "baris", "grudge": { "gte": 15 } } },
      "text": "Barış koridorda seni durdurdu. Evrakı bu sefer konuşmadan, sadece bakarak uzattı."
    }
  ]
}
```

## 6. Genelleştirilmiş Davranış Sayaçları: `behaviorTags` (YENİ)

Madde 5'teki isteği (tek bir seçime bağlı "döngüyü kırdın" yerine, birden
çok event boyunca örüntü takibi) sabit isimli sayaçlar yerine **serbest
etiket** mekanizmasıyla çözüyoruz:

```ts
choice.behaviorTags?: string[]  // örn. ["junior:supportive", "junior:cost:time"]
```

Motor, her hafta sonunda `statistics.behaviorTagCounts[tag] += 1` yapar.
İsimlendirme kuralı: `"<alan>:<yön>"` — alan genelde `"junior"` (çömezle
ilişki) ama gelecekte `"partner"`, `"family"`, `"peer"` gibi başka alanlar
da aynı mekanizmayı serbestçe kullanabilir; yeni bir sayaç için **şema
değişikliği gerekmez**, sadece yeni bir string tag.

Önerilen sözlük (v0.2, `junior:*` alanı için — bible'daki kıdemli-event
örnekleriyle uyumlu):

| Tag | Anlamı |
|---|---|
| `junior:supportive` | çömeze zaman/kaynak maliyeti pahasına destek oldu |
| `junior:exploitative` | kendi yükünü/riskini çömeze devretti |
| `junior:protected` | çömezi üçüncü bir kişiye/otoriteye karşı korudu |
| `junior:defended` | çömezi bir suçlama/eleştiri karşısında savundu |
| `junior:humiliated` | çömezi küçük düşürücü biçimde eleştirdi/kullandı |
| `junior:burdened` | işini/angaryasını çömeze yükledi (destekten bağımsız, doğrudan yük aktarımı) |

Final karnede (Faz 9) `"DÖNGÜYÜ KIRDIN"` gibi achievement'lar artık tek bir
flag'e değil, bu sayaçların **oranına** bakar (örn.
`junior:supportive + junior:protected + junior:defended` toplamı,
`junior:exploitative + junior:humiliated + junior:burdened` toplamının en
az iki katıysa "döngüyü kırdın"). Kesin eşik Faz 9'da denge testleriyle
netleştirilecek; mekanizma şimdiden veri topluyor.

## 8. NPC Kimliği vs. İlişki (YENİ, v0.3)

Faz 5'te bir NPC yalnızca bir relationship kaydıydı (`relationships[npcId]`)
— kimliği/rolü/kişiliği yoktu, sadece "trust/grudge/vs. taşıyan bir obje".
Faz 6, her NPC'yi gerçek bir `NpcState` (kimlik, rol, kariyer aşaması,
kişilik, aktif/ayrılmış durumu) olarak üretiyor; `relationships[npcId]`
artık yalnızca **oyuncu ↔ o NPC arası dyadic durumu** taşıyor
(`trust`/`friendship`/`grudge`). Bu ayrım motorun/DSL'in her yerinde
korunuyor — bir requirement veya effect asla ikisini aynı obje sanmıyor.

NPC roster'ı `domain/npc/generation.ts`'teki `generateInitialClinic` ile
seed+program başına deterministik üretilir (aynı seed + aynı program →
aynı roster). Authored karakterler (örn. Barış) `domain/npc/templates.ts`
üzerinden roster'a enjekte edilir; **id'leri kendi templateId'leriyle
aynıdır** (`"baris"`), böylece mevcut content (`{"npc": "baris"}`) hiçbir
değişiklik gerektirmeden gerçek bir `NpcState`'e karşılık gelir — motor
hiçbir yerde isimle özel-case yapmaz.

## 9. NPC Hedefleme: Sabit id vs. `npcSelectors` (YENİ, v0.3)

Authored content (Barış Hattı gibi) her zaman olduğu gibi sabit bir id
kullanır: `{"npc": "baris"}`. Ama prosedürel event'ler (örn. "kıdemli
asistanın artık bir çömezi var" tekrar eden içeriği) hangi NPC'yi
hedefleyeceğini yazım anında bilemez — bunun için event, kendi
`npcSelectors` haritasını tanımlar ve içerik `boundNpc` ile o anahtara
referans verir.

### 9.1 Bağlama zamanı ve donma kuralı

Bir event'in `npcSelectors`'ı, event **o haftanın kuyruğuna eklendiği an**
(havuzdan çekildiğinde veya bir checkpoint çözüldüğünde) tam olarak bir kez
çözülür ve sonuç `QueuedEventInstance.boundNpcIds`'e yazılır. Bu bağlama
**asla yeniden çalışmaz** — bir refresh/reload sadece kaydedilmiş
`boundNpcIds`'i okur, seçiciyi tekrar çalıştırmaz. Bu, Faz 5'in "queue
refresh sonrası sabit kalmalı" garantisinin NPC hedeflemesine genişletilmiş
hali.

### 9.2 `NpcSelector` çeşitleri

```ts
type NpcSelector =
  | { byId: string }
  | { randomActiveByRole: NpcRole }
  | { highestTrustByRole: NpcRole }
  | { highestGrudgeByRole: NpcRole }
  | { lowestTrustByRole: NpcRole };
```

Hiçbir aday role uymuyorsa (örn. `junior_resident` yoksa) o anahtar
`boundNpcIds`'e hiç yazılmaz — o anahtarı referans veren bir effect/
requirement sessizce no-op olur (crash olmaz).

```json
{
  "npcSelectors": { "primary": { "randomActiveByRole": "junior_resident" } },
  "choices": [
    {
      "id": "nobetini_degistir",
      "relationshipEffects": [{ "boundNpc": "primary", "trust": 12 }]
    }
  ]
}
```

## 10. `once` — Gerçek Tek-Seferlik Mekanizması (YENİ, v0.3)

Faz 5'te tek-seferlik event'ler `cooldownWeeks: 999` ile taklit
ediliyordu — pratikte hiç tekrarlanmıyordu ama kavramsal olarak
"tekrar açılabilir cooldown"dan ayrı değildi. `once: true`, `eventHistory`
içinde bu event id'si **bir kez bile** geçtiyse o event'i bir daha asla
uygun (eligible) saymaz — havuz event'i olsun, scheduled/checkpoint aday
olsun fark etmez. `cooldownWeeks` ve `once` birbirinden bağımsız alanlar:
`cooldownWeeks` her zaman eninde sonunda yeniden açılır, `once` asla
açılmaz.

## 11. `requiredNpcTemplate` — Authored Karakter Var mı? (YENİ, v0.3)

Bir event'in (Barış'a özel bir mobbing event'i gibi) yalnızca ilgili
authored karakter roster'da hâlâ aktifken uygun olması gerekebilir.
`requiredNpcTemplate: "baris"`, o `templateId`'ye sahip aktif bir
`NpcState` roster'da yoksa (hiç üretilmediyse veya ayrıldıysa) event'i
elenmiş sayar — motor content'i isimle özel-case'lemeden.

## 12. `choice.npcTransitions` — Authored, Anlık NPC Geçişleri (YENİ, v0.3)

Genel aylık lifecycle tick'inden (bkz. Event Design Bible §NPC Lifecycle)
bağımsız olarak, authored bir zincirin kendi anlatısı bir NPC'nin kariyer
aşamasını hemen değiştirebilir — örn. Barış Hattı stage4'te "Barış uzman
oldu" metni zaten bunu iddia ediyor, dolayısıyla o seçimin çözülmesiyle
Barış'ın gerçek `NpcState.career.stage`'i de `specialist`'e döner:

```json
{
  "id": "teklifi_kabul",
  "npcTransitions": [{ "npc": "baris", "type": "became_specialist" }]
}
```

`type`: `became_specialist | became_faculty | became_department_head | left`.
Genel (procedural) lifecycle tick'i templated NPC'lere hiç dokunmaz —
Barış gibi authored karakterlerin kariyer geçişleri yalnızca bu mekanizma
veya doğrudan içerik üzerinden olur.

## 13. Migration Notu

`data/events/examples/` altındaki mevcut örnekler v0.3'e uygun şekilde
güncellendi: relationship effect/condition'lardan kaldırılan
`ego`/`mobbingTendency`/`helpfulness`/`burnoutNpc` alanları temizlendi
(yalnızca 4 gerçek kullanım vardı, hepsi küçük `trust` delta'larıyla
değiştirildi); `career-npc-mirror.json`'daki `mirror_02/03/04` ve
`chain-baris.json`'daki stage5 "yeni çömez" seçimleri artık
`comez_generic` sabit id'si yerine `npcSelectors: {"primary":
{"randomActiveByRole": "junior_resident"}}` + `boundNpc: "primary"`
kullanıyor; `chain-baris.json` stage4'ün her seçimine Barış'ı
`specialist`'e geçiren bir `npcTransitions` effect'i eklendi.

Save formatı tarafında bu, `CURRENT_SAVE_VERSION`'ı v4 → v5'e taşıdı
(`domain/state/migrations.ts`'teki migration `4`): relationship kayıtları
yukarıdaki daralmış şekle indirgeniyor; `weeklyEventQueue`'daki string
event id'leri `QueuedEventInstance {instanceId, eventId, boundNpcIds: {}}`
objelerine sarılıyor; ve zaten asistanlık aşamasındaki bir save için roster
`selectResidencyProgram`'ın kullandığı aynı deterministik
`npc:initial:${programId}` rng scope'uyla **geriye dönük üretiliyor** (boş
bırakılmıyor) — mevcut `baris` gibi gerçek roster id'lerine ait
relationship kayıtları varsa bu üretimin üzerine yazılıp korunuyor, henüz
asistanlığa başlamamış bir save için roster boş kalıyor (karakter
`selectResidencyProgram`'a normal akışla ulaştığında üretilecek).

## 14. `choice.onCallEffects` ve Nöbet/Ekonomi State'i (YENİ, v0.4)

Faz 7, oyuncunun aylık nöbet schedule'ını (`GameState.onCall.schedule`) ve
aylık ekonomi breakdown'ını (`GameState.economy`) motora bağladı. Bunlar
kendi domain modülleri var (`domain/oncall/`, `domain/economy/`) —
event motoru bu sistemlerin *anlamını* bilmiyor, yalnızca iki yerden
dokunuyor:

### 14.1 Requirement DSL — yeni bir node türü değil, yeni context alanları

```json
{ "stat": "onCall.currentMonthTotalShifts", "gte": 8 }
{ "stat": "onCall.staffingLoad", "gte": 55 }
{ "stat": "onCall.weekendShiftCount", "gte": 3 }
```

Mevcut generic `stat` leaf'i zaten herhangi bir dot-path'i okuyabiliyordu
(§requirements.ts, `RequirementContext`); Faz 7 sadece context'e
`onCall: {currentMonthTotalShifts, weekendShiftCount, staffingLoad}`
alanını ekledi. Şema tarafında hiçbir yeni `LeafCondition` türü yok.

### 14.2 `choice.onCallEffects` — küçük, sabit bir surface area

```ts
type OnCallEffect =
  | { type: "add_player_shift"; count: number; shiftType?: "weekday" | "weekend" }
  | { type: "remove_player_shift"; count: number }
  | { type: "transfer_player_shift_to_npc"; target: NpcTargetRef };
```

`transfer_player_shift_to_npc` (YENİ, Faz 8, §13/§14) — oyuncunun ELİNDEKİ
bir nöbeti bir NPC'ye devreder ("kıdemli olunca nöbet dağıtma gücü", §30
power-reversal). Tersi (bir NPC'nin nöbetini oyuncuya devretme) ayrı bir
effect türü olarak yok — bu şema NPC'lerin kendi assignment'larını hiç
tutmuyor (player-centric schedule, bkz. Faz 7 raporu §3), o yüzden
anlatısal olarak aynı şey zaten `add_player_shift`.

`resolveEventChoice`, seçimin `onCallEffects`'ini
`domain/oncall/applyEffects.ts`'teki `applyOnCallEffects`'e devrediyor —
motor içinde nöbet-özel bir kod yolu yok. `add_player_shift`, o ayın
takviminde oyuncunun henüz nöbetçi olmadığı bir günü (seçilen
`shiftType`'a uygun) seçip yeni bir `OnCallAssignment` ekliyor;
`remove_player_shift` mevcut bir oyuncu nöbetini kaldırıyor. İkisi de
`domain/oncall/mutations.ts`'teki aynı doğrulanmış (validate edilmiş)
`addExtraShift`/`removeShift` fonksiyonlarını kullanıyor — save-safe,
double-booking yok.

Daha geniş `swapOnCallAssignment`/`transferOnCallAssignment` mutasyonları
da var (aynı dosyada) ama Faz 7'de hiçbir choice effect'ine bağlı değil —
Faz 8'in "haksız nöbet" içeriği için hazır, test edilmiş, ama henüz
kullanılmıyor.

### 14.3 Aylık orkestrasyon — event motorunun dışında

Nöbet schedule üretimi ve aylık ekonomi işleme, `choice` effect'i değil —
her ikisi de `domain/events/engine.ts`'teki `advanceResidencyWeekWithEvents`
fonksiyonunun `monthChanged` bloğunda, NPC lifecycle'dan hemen sonra
çalışıyor (bkz. Faz 7 raporu §1). Bu, event content'in hiçbir zaman
"ayın maaşını öde" gibi bir effect yazmasına gerek olmadığı anlamına
gelir — o tamamen otomatik ve idempotent.
