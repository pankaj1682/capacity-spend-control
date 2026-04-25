import React, { createContext, useContext, useState } from "react";

type FYContextType = {
  fy: number;
  setFy: (fy: number) => void;
};

const FYContext = createContext<FYContextType | undefined>(undefined);

function currentFy(): number {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return m >= 7 ? y + 1 : y;
}

export function FYProvider({ children }: { children: React.ReactNode }) {
  const [fy, setFy] = useState<number>(currentFy());
  return <FYContext.Provider value={{ fy, setFy }}>{children}</FYContext.Provider>;
}

export function useFy() {
  const ctx = useContext(FYContext);
  if (!ctx) throw new Error("useFy must be used within a FYProvider");
  return ctx;
}

export function fyLabel(fy: number): string {
  return `FY${String(fy).slice(-2)}`;
}

export const FY_MONTHS: Array<{ idx: number; calendarMonth: number; label: string }> = [
  { idx: 1, calendarMonth: 7, label: "Jul" },
  { idx: 2, calendarMonth: 8, label: "Aug" },
  { idx: 3, calendarMonth: 9, label: "Sep" },
  { idx: 4, calendarMonth: 10, label: "Oct" },
  { idx: 5, calendarMonth: 11, label: "Nov" },
  { idx: 6, calendarMonth: 12, label: "Dec" },
  { idx: 7, calendarMonth: 1, label: "Jan" },
  { idx: 8, calendarMonth: 2, label: "Feb" },
  { idx: 9, calendarMonth: 3, label: "Mar" },
  { idx: 10, calendarMonth: 4, label: "Apr" },
  { idx: 11, calendarMonth: 5, label: "May" },
  { idx: 12, calendarMonth: 6, label: "Jun" },
];

export function fyMonthIndex(calendarMonth: number): number {
  return calendarMonth >= 7 ? calendarMonth - 6 : calendarMonth + 6;
}

export function fyMonthLabel(calendarMonth: number): string {
  return FY_MONTHS[fyMonthIndex(calendarMonth) - 1]?.label ?? "?";
}

/** For a given FY ending year, return the calendar year of a calendar month within that FY. */
export function calendarYearForFy(fy: number, calendarMonth: number): number {
  return calendarMonth >= 7 ? fy - 1 : fy;
}
