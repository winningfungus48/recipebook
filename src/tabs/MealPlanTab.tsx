import { useMemo, useState } from 'react';
import { useCurrentWeek, useRecipes } from '../context';
import { DAY_KEYS, RECIPE_CATEGORIES, RECIPE_TAGS, type DayKey } from '../types';
import {
  getWeekPlans,
  notifyWeekPlansChanged,
  saveWeekPlans,
} from '../utils/storage';
import { buildEmptyWeekPlan, getWeekDates, getWeekId, getWeekStart } from '../utils/weekUtils';

type WeekTarget = 'current' | 'next';

function dayLabel(key: DayKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function MealPlanTab() {
  const { recipes } = useRecipes();
  const { weekStart } = useCurrentWeek();
  const [targetWeek, setTargetWeek] = useState<WeekTarget>('current');
  const [targetDay, setTargetDay] = useState<DayKey>('monday');
  const [category, setCategory] = useState<'all' | (typeof RECIPE_CATEGORIES)[number]>('all');
  const [requiredTags, setRequiredTags] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);

  const weekStartDate = useMemo(() => {
    const start = getWeekStart(weekStart);
    if (targetWeek === 'next') {
      const d = new Date(start);
      d.setDate(d.getDate() + 7);
      return d;
    }
    return start;
  }, [targetWeek, weekStart]);

  const targetDate = useMemo(() => {
    const dates = getWeekDates(weekStartDate);
    return dates[DAY_KEYS.indexOf(targetDay)]?.date ?? weekStartDate;
  }, [targetDay, weekStartDate]);

  const candidates = useMemo(() => {
    return recipes.filter((recipe) => {
      if (category !== 'all' && recipe.category !== category) return false;
      if (requiredTags.length > 0) {
        return requiredTags.every((tag) => recipe.tags.includes(tag as (typeof RECIPE_TAGS)[number]));
      }
      return true;
    });
  }, [recipes, category, requiredTags]);

  const generate = () => {
    if (candidates.length === 0) {
      setMessage('No recipes match your filters.');
      setLastGeneratedId(null);
      return;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const plans = getWeekPlans();
    const id = getWeekId(weekStartDate);
    const existing = plans.find((p) => p.id === id) ?? buildEmptyWeekPlan(weekStartDate);
    const next = {
      ...existing,
      days: {
        ...existing.days,
        [targetDay]: {
          recipeId: pick.id,
          isEatingOut: false,
          eatOutNote: '',
        },
      },
    };
    const idx = plans.findIndex((p) => p.id === id);
    const nextPlans = idx >= 0 ? plans.map((p) => (p.id === id ? next : p)) : [...plans, next];
    saveWeekPlans(nextPlans);
    notifyWeekPlansChanged();
    setLastGeneratedId(pick.id);
    setMessage(
      `Assigned ${pick.title} to ${targetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })}.`,
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-2">
      <h2 className="text-base font-semibold text-gray-900">Generate Random Meal</h2>
      <p className="mt-1 text-sm text-gray-500">
        Choose requirements and assign a random recipe to a specific day.
      </p>

      <div className="mt-4 space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Week</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetWeek('current')}
              className={`min-h-[44px] rounded-xl border text-sm font-medium ${
                targetWeek === 'current'
                  ? 'border-[#7C9A6E] bg-[#7C9A6E] text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              Current Week
            </button>
            <button
              type="button"
              onClick={() => setTargetWeek('next')}
              className={`min-h-[44px] rounded-xl border text-sm font-medium ${
                targetWeek === 'next'
                  ? 'border-[#7C9A6E] bg-[#7C9A6E] text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              Next Week
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Day</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAY_KEYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setTargetDay(day)}
                className={`min-h-[40px] rounded-full border px-3 py-1 text-xs font-medium ${
                  targetDay === day
                    ? 'border-[#7C9A6E] bg-[#7C9A6E] text-white'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {dayLabel(day)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Category</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="mt-2 w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-gray-900"
          >
            <option value="all">All categories</option>
            {RECIPE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Required Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RECIPE_TAGS.map((tag) => {
              const active = requiredTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setRequiredTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag],
                    )
                  }
                  className={`min-h-[40px] rounded-full border px-3 py-1 text-xs font-medium ${
                    active
                      ? 'border-[#8B6347] bg-[#8B6347] text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          className="w-full min-h-[44px] rounded-xl bg-[#7C9A6E] py-3 font-medium text-white shadow-sm"
        >
          Generate Random Recipe
        </button>

        <p className="text-sm text-gray-500">
          {candidates.length} matching recipe{candidates.length === 1 ? '' : 's'}.
        </p>
        {message && (
          <p className={`text-sm ${lastGeneratedId ? 'text-[#7C9A6E]' : 'text-amber-700'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
