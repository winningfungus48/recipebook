import type { DayPlan, WeekPlan } from '../types';

/** Monday 00:00:00 local time of the calendar week containing `date` (week starts Monday). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

/** ISO week id like `2025-W17` (ISO week-year + week number). */
export function getWeekId(date: Date): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4, 12, 0, 0, 0);
  const jan4Monday = new Date(
    jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000,
  );
  const thisMonday = new Date(d);
  thisMonday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  thisMonday.setHours(12, 0, 0, 0);
  const week =
    1 + Math.round((thisMonday.getTime() - jan4Monday.getTime()) / 604800000);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** Label for the Monday–Sunday range of the week containing `date`, e.g. `Apr 21 – Apr 27`. */
export function getWeekLabel(date: Date): string {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const left = start.toLocaleDateString('en-US', opts);
  const right = end.toLocaleDateString('en-US', opts);
  return `${left} – ${right}`;
}

export function getWeekDates(weekStart: Date): { day: string; date: Date }[] {
  const names = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const start = getWeekStart(weekStart);
  return names.map((day, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { day, date };
  });
}

const emptyDay = (): DayPlan => ({
  recipeId: null,
  isEatingOut: false,
  eatOutNote: '',
});

export function buildEmptyWeekPlan(date: Date): WeekPlan {
  return {
    id: getWeekId(date),
    weekLabel: getWeekLabel(date),
    days: {
      monday: emptyDay(),
      tuesday: emptyDay(),
      wednesday: emptyDay(),
      thursday: emptyDay(),
      friday: emptyDay(),
      saturday: emptyDay(),
      sunday: emptyDay(),
    },
  };
}
