// residencyWeek counts fully-completed weeks (0 before the first
// "Haftayı Geç"). Year 1 covers weeks 1-52, year 2 weeks 53-104, and so
// on — week 52 is the LAST week of year 1, not the first week of year 2.
// The naive `floor(week / 52) + 1` gets exactly this boundary wrong
// (floor(52/52)+1 = 2); shifting by one before the floor fixes it.
export function getResidencyYear(residencyWeek: number): number {
  if (residencyWeek <= 0) return 1;
  return Math.floor((residencyWeek - 1) / 52) + 1;
}
