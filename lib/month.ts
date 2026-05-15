export const defaultMonth = "2026-06";

export type MonthParts = {
  year: number;
  month: number;
};

export type MonthDay = {
  day: number;
  label: string;
  weekend: boolean;
  holiday: boolean;
};

export function readMonthFromLocation() {
  if (typeof window === "undefined") return defaultMonth;
  const params = new URLSearchParams(window.location.search);
  return normalizeMonth(params.get("month"));
}

export function normalizeMonth(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return defaultMonth;
  const [, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return defaultMonth;
  return value;
}

export function monthParts(monthValue: string): MonthParts {
  const [year, month] = normalizeMonth(monthValue).split("-").map(Number);
  return { year, month };
}

export function addMonths(monthValue: string, amount: number) {
  const { year, month } = monthParts(monthValue);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthValue: string) {
  const { year, month } = monthParts(monthValue);
  return `${year}年${month}月`;
}

export function monthStart(monthValue: string) {
  const { year, month } = monthParts(monthValue);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function monthEnd(monthValue: string) {
  const { year, month } = monthParts(monthValue);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function dateFromMonthDay(monthValue: string, day: number) {
  const { year, month } = monthParts(monthValue);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function operatingDaysForMonth(monthValue: string): MonthDay[] {
  const { year, month } = monthParts(monthValue);
  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month - 1, day);
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const holiday = false;
    return {
      day,
      label: `${month}/${day}(${weekday})`,
      weekend,
      holiday
    };
  }).filter((day) => day.weekend || day.holiday);
}
