/**
 * Fiscal Year helpers.
 * Convention: FY26 = Jul 2025 -> Jun 2026 (FY named by ending year).
 * Fiscal months are indexed Jul=1 ... Jun=12.
 */
export function fyOf(year: number, month: number): number {
  return month >= 7 ? year + 1 : year;
}

export function fyMonthIndex(month: number): number {
  return month >= 7 ? month - 6 : month + 6;
}

export function fyMonthLabel(fyMonth: number): string {
  const names = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return names[fyMonth - 1] ?? "?";
}

export function fyRange(fy: number): { startYear: number; startMonth: number; endYear: number; endMonth: number } {
  return { startYear: fy - 1, startMonth: 7, endYear: fy, endMonth: 6 };
}

export function isInFy(year: number, month: number, fy: number): boolean {
  const { startYear, endYear } = fyRange(fy);
  if (year === startYear && month >= 7) return true;
  if (year === endYear && month <= 6) return true;
  return false;
}
