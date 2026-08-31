import type { Gender } from "../state/types";
import type { SeededRng } from "../rng/seededRng";

// Fictional name pool — deliberately generic/common Turkish names, not
// modeled on any real person. Large enough that a ~15-person clinic
// rarely needs a retry to avoid a duplicate full name.
const FEMALE_FIRST_NAMES = [
  "Ayşe", "Elif", "Zeynep", "Fatma", "Deniz", "Ece", "Selin", "Merve",
  "Aslı", "Buse", "Ceren", "Derya", "Esra", "Gizem", "Hazal", "Irmak",
  "Kübra", "Melis", "Nazlı", "Pınar", "Sıla", "Tuğçe", "Yasemin", "Zehra",
];

const MALE_FIRST_NAMES = [
  "Mehmet", "Ahmet", "Mustafa", "Ali", "Emre", "Burak", "Kaan", "Onur",
  "Serkan", "Barış", "Cem", "Doruk", "Efe", "Fatih", "Gökhan", "Hakan",
  "İlker", "Kerem", "Murat", "Ozan", "Recep", "Sinan", "Tolga", "Yusuf",
];

const NEUTRAL_FIRST_NAMES = [
  "Deniz", "Ece", "İrem", "Kaya", "Yağmur", "Cemre",
];

const LAST_NAMES = [
  "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım",
  "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan",
  "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Erdoğan", "Güneş",
  "Aktaş", "Bulut", "Polat", "Korkmaz", "Ünal", "Karaca", "Acar", "Tekin",
];

function firstNamePool(gender: Gender | undefined): string[] {
  if (gender === "kadın") return FEMALE_FIRST_NAMES;
  if (gender === "erkek") return MALE_FIRST_NAMES;
  return NEUTRAL_FIRST_NAMES;
}

export interface GeneratedName {
  fullName: string;
  gender: Gender;
}

const GENDERS: Gender[] = ["kadın", "erkek", "belirtmek_istemiyorum"];

// Deterministic for a given rng; retries a bounded number of times to
// dodge a full-name collision within the same clinic (data/,not a
// correctness guarantee for pathologically small pools).
export function generateUniqueName(rng: SeededRng, usedFullNames: Set<string>): GeneratedName {
  const gender = rng.pick(GENDERS);
  let fullName = "";
  for (let attempt = 0; attempt < 20; attempt++) {
    const first = rng.pick(firstNamePool(gender));
    const last = rng.pick(LAST_NAMES);
    fullName = `${first} ${last}`;
    if (!usedFullNames.has(fullName)) break;
  }
  usedFullNames.add(fullName);
  return { fullName, gender };
}
