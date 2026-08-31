# ÇÖMEZ — Event Schema & DSL Referansı (v0.2)

Bu doküman, event motoru (Faz 5) implementasyonunda kullanılacak resmi
şemadır. `docs/event-design-bible.md` bu şemanın *neden* bu şekilde
olduğunu (tasarım gerekçesi, örnekler) anlatır; burası sade referans.

## Değişiklik Geçmişi

- **v0.1** → mimari dokümanın ilk taslağındaki şema.
- **v0.2** (bu doküman) → Event Design Bible turu + ek 7 tasarım kararı
  sonrası: `triggerMode`, `choice.requirements`, text variant desteği,
  esnek (rigid olmayan) zincir çözümleme, genelleştirilmiş `behaviorTags`
  sayaç mekanizması, `requirements`'a `any` (OR) desteği.

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
  | { relationship: { npc: string; trust?: RangeCond; grudge?: RangeCond; ego?: RangeCond; /* ... */ } };
```

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

## 7. Migration Notu

Henüz hiçbir save formatı veya çalışan engine implementasyonu yok (Faz 1
öncesi). Bu nedenle **migration gerekmiyor** — v0.2 şeması sıfırdan
uygulanacak ilk versiyon olacak. `data/events/examples/` altındaki mevcut
örnekler bu doküman yazılırken v0.2'ye uygun şekilde güncellendi.
