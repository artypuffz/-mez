export interface MonthDay {
  date: string; // YYYY-MM-DD
  isWeekend: boolean;
}

// Shared by schedule generation and effect application so "what days
// exist in this month, and which are weekends" is computed exactly one
// way — plain Gregorian/UTC math, no holiday calendar (§8 deliberately
// keeps holidays out until a real one exists).
export function enumerateMonthDays(monthKey: string): MonthDay[] {
  const [year, month] = monthKey.split("-").map(Number);
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: MonthDay[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    days.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return days;
}
