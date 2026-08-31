export interface TusExamEventChoice {
  id: string;
  text: string;
  scoreModifier: number;
  stressModifier?: number;
}

export interface TusExamEventDefinition {
  id: string;
  title: string;
  description: string;
  choices: TusExamEventChoice[];
}

// Deliberately lighter than the residency-era mobbing/system humor — this
// is exam-day absurdity, not the health-system satire that starts once
// residency begins (docs/event-design-bible.md §1). Format loosely
// mirrors the real event schema (id/title/description/choices) without
// adopting its full machinery (chains, triggerMode) — not needed here.
export const TUS_EXAM_EVENT_DEFINITIONS: TusExamEventDefinition[] = [
  {
    id: "sinav_sabahi",
    title: "SINAV SABAHI",
    description: "Alarmı üç kez erteledin.",
    choices: [
      { id: "kahvalti_birak", text: "Kahvaltıyı bırak, hemen çık.", scoreModifier: -1, stressModifier: 3 },
      { id: "hizli_bir_seyler", text: "Hızlıca bir şey ye.", scoreModifier: 1 },
      { id: "once_kahve", text: "Önce kahve.", scoreModifier: 0, stressModifier: -1 },
    ],
  },
  {
    id: "salon_bulamama",
    title: "SALONU BULAMADIN",
    description: "Bina numarası tabelada yok. Aynı senin gibi kaybolmuş beş kişi daha var.",
    choices: [
      { id: "birine_sor", text: "Görevliye sor.", scoreModifier: 1 },
      { id: "kalabaligi_takip", text: "Kalabalığı takip et.", scoreModifier: 0, stressModifier: 2 },
      { id: "kosarak_ara", text: "Koşarak kendin ara.", scoreModifier: -1, stressModifier: 3 },
    ],
  },
  {
    id: "tuvalet_kuyrugu",
    title: "SON DAKİKA",
    description: "Salona girmeden önce tuvalet kuyruğu bitmek bilmiyor.",
    choices: [
      { id: "kuyrukta_bekle", text: "Kuyrukta bekle, sırana güven.", scoreModifier: 0, stressModifier: 2 },
      { id: "vazgec_gir", text: "Vazgeç, direkt salona gir.", scoreModifier: 1, stressModifier: 1 },
    ],
  },
  {
    id: "arkadasin_cok_kolay",
    title: "KORİDORDA",
    description: "Bir tanıdık 'bu sene çok kolay olacakmış' diyor. Kaynağı belirsiz.",
    choices: [
      { id: "inanma", text: "Ciddiye alma.", scoreModifier: 1 },
      { id: "paniklet", text: "İçten içe panikle.", scoreModifier: -2, stressModifier: 4 },
      { id: "espriyle_gec", text: "Espriyle geç.", scoreModifier: 0, stressModifier: -1 },
    ],
  },
  {
    id: "kitapcik_dagitimi",
    title: "KİTAPÇIK DAĞITILIYOR",
    description: "Kitapçık elindeyken kapağını açmadan bir dakika bekletiyorlar. O bir dakika bir saat gibi geliyor.",
    choices: [
      { id: "nefes_al", text: "Derin nefes al, bekle.", scoreModifier: 2, stressModifier: -2 },
      { id: "sayfalari_say", text: "Kaç sayfa olduğunu saymaya çalış.", scoreModifier: 0, stressModifier: 1 },
    ],
  },
  {
    id: "cevap_degistirme",
    title: "ORTA SORULARDA",
    description: "Bir sorunun cevabını değiştirmek için üç dakika harcadın. Hâlâ emin değilsin.",
    choices: [
      { id: "ilk_cevapta_kal", text: "İlk cevabında kal.", scoreModifier: 1 },
      { id: "degistir", text: "Değiştir, içine sinen bu.", scoreModifier: -1 },
      { id: "bosver_devam", text: "Boş ver, sonraki soruya geç.", scoreModifier: 0, stressModifier: -1 },
    ],
  },
  {
    id: "ara_sosyal_medya",
    title: "ARA VERİLDİ",
    description: "Oturum arasında telefonunu açtın. Herkes kendi sınavının ne kadar zor geçtiğini yazıyor.",
    choices: [
      { id: "telefonu_kapat", text: "Telefonu kapat, ikinci oturuma odaklan.", scoreModifier: 2, stressModifier: -1 },
      { id: "okumaya_devam", text: "Okumaya devam et.", scoreModifier: -1, stressModifier: 3 },
    ],
  },
  {
    id: "cikista_karsilastirma",
    title: "SINAV ÇIKIŞI",
    description: "Arkadaşların çıkışta cevapları karşılaştırmaya başladı. Sen katılmak istemiyorsun ama etraf gürültülü.",
    choices: [
      { id: "katilma", text: "Katılma, direkt eve git.", scoreModifier: 0, stressModifier: -2 },
      { id: "kismen_katil", text: "Birkaç soruyu kontrol et.", scoreModifier: 0, stressModifier: 2 },
    ],
  },
];

export function getTusExamEvent(id: string): TusExamEventDefinition {
  const def = TUS_EXAM_EVENT_DEFINITIONS.find((e) => e.id === id);
  if (!def) {
    throw new Error(`Unknown TUS exam event id: ${id}`);
  }
  return def;
}
