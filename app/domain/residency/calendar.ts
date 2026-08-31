// All dates here are UTC, date-only (YYYY-MM-DD). No timezone, no
// time-of-day, so no DST — the goal is calendar accuracy (which week
// falls in which month/year), not clock accuracy.

function addDaysUTC(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ResidencyCalendarPoint {
  date: string; // YYYY-MM-DD
  month: number; // 1-12
  year: number; // absolute calendar year
  monthIndex: number; // months elapsed since residencyStartedAt (0-based)
}

export function getResidencyCalendar(
  residencyStartedAt: string,
  residencyWeek: number
): ResidencyCalendarPoint {
  const date = addDaysUTC(residencyStartedAt, residencyWeek * 7);
  const d = new Date(`${date}T00:00:00.000Z`);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();

  const start = new Date(`${residencyStartedAt}T00:00:00.000Z`);
  const monthIndex = (year - start.getUTCFullYear()) * 12 + (month - (start.getUTCMonth() + 1));

  return { date, month, year, monthIndex };
}

// Turkish residency placements typically start in September — used here
// purely as flavor for a fictional character's start date, tied to the
// save's creation year so a new game always starts "now, not decades ago".
// Not a claim about any real institution's calendar.
export function deriveResidencyStartDate(createdAt: string): string {
  const year = new Date(createdAt).getUTCFullYear();
  return `${year}-09-01`;
}
