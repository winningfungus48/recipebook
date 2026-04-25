import { useEffect, useMemo, useState } from 'react';
import type { DayPlan } from '../types';
import { useRecipes } from '../context';
import { getSettings } from '../utils/storage';

type Props = {
  open: boolean;
  dayLabel: string;
  onClose: () => void;
  onApply: (plan: DayPlan) => void;
};

export function AssignModal({ open, dayLabel, onClose, onApply }: Props) {
  const { recipes } = useRecipes();
  const [query, setQuery] = useState('');
  const [eatNote, setEatNote] = useState('');
  const [presets, setPresets] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setEatNote('');
      setPresets(getSettings().eatOutPresets);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [query, recipes]);

  const noRecipeMatch =
    query.trim().length > 0 &&
    filtered.length === 0;

  if (!open) return null;

  const pickRecipe = (recipeId: string) => {
    onApply({
      recipeId,
      isEatingOut: false,
      eatOutNote: '',
    });
    onClose();
  };

  const pickCustomLabel = () => {
    const text = query.trim();
    if (!text) return;
    onApply({
      recipeId: null,
      isEatingOut: false,
      eatOutNote: text,
    });
    onClose();
  };

  const saveEatingOut = () => {
    const note = eatNote.trim();
    onApply({
      recipeId: null,
      isEatingOut: true,
      eatOutNote: note,
    });
    onClose();
  };

  const clearDay = () => {
    onApply({
      recipeId: null,
      isEatingOut: false,
      eatOutNote: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[85vh] animate-sheet-up overflow-y-auto rounded-t-xl bg-white shadow-sm">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{dayLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl text-gray-500"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3">
          <label className="sr-only" htmlFor="assign-search">
            Search recipes
          </label>
          <input
            id="assign-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes…"
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-[#E6DDD2] px-3 text-gray-900 placeholder:text-gray-400"
          />

          <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => pickRecipe(r.id)}
                  className="flex w-full min-h-[44px] items-center px-3 py-3 text-left text-gray-900"
                >
                  {r.title}
                </button>
              </li>
            ))}
          </ul>

          {noRecipeMatch && (
            <button
              type="button"
              onClick={pickCustomLabel}
              className="mt-2 w-full min-h-[44px] rounded-xl border border-dashed border-[#7C9A6E] px-3 py-2 text-left text-[#7C9A6E]"
            >
              Use &quot;{query.trim()}&quot;
            </button>
          )}

          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700">Eating Out</p>
            <input
              type="text"
              value={eatNote}
              onChange={(e) => setEatNote(e.target.value)}
              placeholder="Where or what?"
              className="mt-2 w-full min-h-[44px] rounded-xl border border-gray-200 bg-[#E6DDD2] px-3 text-gray-900 placeholder:text-gray-400"
            />
            {presets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={`${idx}-${p}`}
                    type="button"
                    onClick={() => setEatNote(p)}
                    className="min-h-[44px] rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={saveEatingOut}
              className="mt-3 w-full min-h-[44px] rounded-xl bg-[#8B6347] py-3 font-medium text-white shadow-sm"
            >
              Save as Eating Out
            </button>
          </div>

          <button
            type="button"
            onClick={clearDay}
            className="mt-4 w-full min-h-[44px] rounded-xl border border-gray-300 py-3 font-medium text-gray-700"
          >
            Clear Day
          </button>
        </div>
      </div>
    </div>
  );
}
