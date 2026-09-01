const TURKISH_MONTH_NAMES = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK",
];

// "2028-10" -> "EKİM 2028" — used only for the monthly on-call card's
// title (§8); nowhere else needs a human month name.
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${TURKISH_MONTH_NAMES[month - 1]} ${year}`;
}
