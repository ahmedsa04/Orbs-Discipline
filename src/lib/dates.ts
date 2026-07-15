import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  addDays,
  format,
  parseISO,
  startOfDay,
  subDays,
  getDay,
  isBefore,
  isEqual,
} from "date-fns";

export function todayInTimezone(timezone: string, now = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

export function localDateTimeParts(
  timezone: string,
  now = new Date(),
): { date: string; time: string; weekday: number; hour: number; minute: number } {
  const date = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const time = formatInTimeZone(now, timezone, "HH:mm");
  const [hour, minute] = time.split(":").map(Number);
  const zoned = toZonedTime(now, timezone);
  return {
    date,
    time,
    weekday: getDay(zoned),
    hour,
    minute,
  };
}

export function addDaysToDateString(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export function subDaysFromDateString(date: string, days: number): string {
  return format(subDays(parseISO(date), days), "yyyy-MM-dd");
}

export function isPastDate(date: string, today: string): boolean {
  const d = startOfDay(parseISO(date));
  const t = startOfDay(parseISO(today));
  return isBefore(d, t);
}

export function isSameOrBefore(date: string, other: string): boolean {
  const a = startOfDay(parseISO(date));
  const b = startOfDay(parseISO(other));
  return isBefore(a, b) || isEqual(a, b);
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeReached(current: string, target: string): boolean {
  return parseTimeToMinutes(current) >= parseTimeToMinutes(target);
}

export function weekDatesAround(date: string): string[] {
  const base = parseISO(date);
  const weekday = getDay(base);
  const sunday = subDays(base, weekday);
  return Array.from({ length: 7 }, (_, i) => format(addDays(sunday, i), "yyyy-MM-dd"));
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function monthGrid(year: number, monthIndex0: number): (string | null)[] {
  const first = new Date(year, monthIndex0, 1);
  const startPad = first.getDay();
  const total = daysInMonth(year, monthIndex0);
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= total; d++) {
    cells.push(format(new Date(year, monthIndex0, d), "yyyy-MM-dd"));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
