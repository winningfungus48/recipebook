import { useEffect, useState } from 'react';
import type { DayKey, DayPlan, WeekPlan } from '../types';
import { DAY_KEYS } from '../types';
import { AssignModal } from '../components/AssignModal';
import { useCurrentWeek, useRecipes } from '../context';
import {
  getWeekPlans,
  saveWeekPlans,
  WEEK_PLANS_EVENT,
} from '../utils/storage';
import {
  buildEmptyWeekPlan,
  getWeekDates,
  getWeekId,
  getWeekLabel,
  getWeekStart,
} from '../utils/weekUtils';

function upsertWeekPlan(plans: WeekPlan[], plan: WeekPlan): WeekPlan[] {
  const i = plans.findIndex((p) => p.id === plan.id);
  if (i === -1) return [...plans, plan];
  const next = [...plans];
  next[i] = plan;
  return next;
}

function loadOrCreateWeekPlan(monday: Date) {
  const plans = getWeekPlans();
  const id = getWeekId(monday);
  const existing = plans.find((p) => p.id === id);
  if (existing) return existing;
  const created = buildEmptyWeekPlan(monday);
  saveWeekPlans([...plans, created]);
  return created;
}

export function ScheduleTab() {
  const { weekStart, setWeekStart } = useCurrentWeek();
  const { recipes } = useRecipes();
  const [weekPlanA, setWeekPlanA] = useState(() => loadOrCreateWeekPlan(weekStart));
  const [weekPlanB, setWeekPlanB] = useState(() => {
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    return loadOrCreateWeekPlan(nextWeekStart);
  });
  const [modalState, setModalState] = useState<{
    weekId: string;
    dayKey: DayKey;
    dayLabel: string;
  } | null>(null);

  useEffect(() => {
    const start = getWeekStart(weekStart);
    const nextStart = new Date(start);
    nextStart.setDate(nextStart.getDate() + 7);
    setWeekPlanA(loadOrCreateWeekPlan(start));
    setWeekPlanB(loadOrCreateWeekPlan(nextStart));
  }, [weekStart]);

  useEffect(() => {
    const sync = () => {
      const start = getWeekStart(weekStart);
      const nextStart = new Date(start);
      nextStart.setDate(nextStart.getDate() + 7);
      setWeekPlanA(loadOrCreateWeekPlan(start));
      setWeekPlanB(loadOrCreateWeekPlan(nextStart));
    };
    window.addEventListener(WEEK_PLANS_EVENT, sync);
    return () => window.removeEventListener(WEEK_PLANS_EVENT, sync);
  }, [weekStart]);

  const weekAStart = getWeekStart(weekStart);
  const weekBStart = new Date(weekAStart);
  weekBStart.setDate(weekBStart.getDate() + 7);
  const headerLabel = `${getWeekLabel(weekAStart)} + ${getWeekLabel(weekBStart)}`;

  const updateDay = (weekId: string, key: DayKey, day: DayPlan) => {
    const plans = getWeekPlans();
    const plan = plans.find((p) => p.id === weekId);
    if (!plan) return;
    const withLabel: WeekPlan = {
      ...plan,
      days: { ...plan.days, [key]: day },
    };
    saveWeekPlans(upsertWeekPlan(plans, withLabel));
    if (weekId === weekPlanA.id) setWeekPlanA(withLabel);
    if (weekId === weekPlanB.id) setWeekPlanB(withLabel);
  };

  const goPrev = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 14);
    setWeekStart(d);
  };

  const goNext = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 14);
    setWeekStart(d);
  };

  const rows = [
    { plan: weekPlanA, dates: getWeekDates(weekAStart) },
    { plan: weekPlanB, dates: getWeekDates(weekBStart) },
  ].flatMap(({ plan, dates }) =>
    DAY_KEYS.map((key, i) => ({
      weekId: plan.id,
      dayKey: key,
      day: dates[i].day,
      date: dates[i].date,
      dayPlan: plan.days[key],
    })),
  );

  const mealNameForDay = (plan: DayPlan): string => {
    if (plan.recipeId) {
      return recipes.find((r) => r.id === plan.recipeId)?.title ?? 'Missing recipe';
    }
    if (plan.eatOutNote.trim()) return plan.eatOutNote.trim();
    return 'Unplanned';
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
      <div className="flex items-center justify-between gap-2 py-2">
        <button
          type="button"
          onClick={goPrev}
          className="min-h-[44px] shrink-0 rounded-lg px-2 text-sm text-[#7C9A6E]"
        >
          ← Prev
        </button>
        <p className="truncate text-center text-sm font-semibold text-gray-900">
          {headerLabel}
        </p>
        <button
          type="button"
          onClick={goNext}
          className="min-h-[44px] shrink-0 rounded-lg px-2 text-sm text-[#7C9A6E]"
        >
          Next →
        </button>
      </div>

      <ul className="mt-2 flex-1 space-y-2 overflow-y-auto">
        {rows.map(({ weekId, dayKey, day, date, dayPlan }) => {
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <li key={`${weekId}-${dayKey}`}>
              <button
                type="button"
                onClick={() =>
                  setModalState({
                    weekId,
                    dayKey,
                    dayLabel: `Plan ${day}`,
                  })
                }
                className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-left shadow-sm"
              >
                <div>
                  <p className="text-sm text-gray-500">
                    {day}, {dateStr}
                  </p>
                  <p className="mt-0.5 font-medium text-gray-900">
                    {mealNameForDay(dayPlan)}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <AssignModal
        open={modalState !== null}
        dayLabel={modalState?.dayLabel ?? 'Plan'}
        onClose={() => setModalState(null)}
        onApply={(p) => {
          if (modalState) updateDay(modalState.weekId, modalState.dayKey, p);
        }}
      />
    </div>
  );
}

// Backward-compatible export in case of stale imports.
export { ScheduleTab as ThisWeekTab };
