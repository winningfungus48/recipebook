import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../context';
import type { Recipe } from '../types';

const CATEGORY_ORDER = [
  'mains',
  'sides',
  'desserts',
  'drinks',
  'breakfast',
  'other',
] as const;

type CategoryFilter = 'all' | (typeof CATEGORY_ORDER)[number];

const CHIPS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mains', label: 'Mains' },
  { id: 'sides', label: 'Sides' },
  { id: 'desserts', label: 'Desserts' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'other', label: 'Other' },
];

function categorySortIndex(r: Recipe): number {
  const category = r.category.toLowerCase();
  if ((CATEGORY_ORDER as readonly string[]).includes(category)) {
    return CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number]);
  }
  if (!r.id.startsWith('doc-')) return 6;
  return 7;
}

function sortByCategoryThenTitle(a: Recipe, b: Recipe): number {
  const ca = categorySortIndex(a);
  const cb = categorySortIndex(b);
  if (ca !== cb) return ca - cb;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

function matchesCategory(r: Recipe, filter: CategoryFilter): boolean {
  if (filter === 'all') return true;
  return r.category.toLowerCase() === filter;
}

export function RecipesTab() {
  const { recipes } = useRecipes();
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const navigate = useNavigate();

  const displayed = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = recipes.filter((r) => matchesCategory(r, categoryFilter));
    if (s) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(s) ||
          r.category.toLowerCase().includes(s) ||
          r.tags.some((tag) => tag.includes(s)),
      );
    }
    return [...list].sort(sortByCategoryThenTitle);
  }, [q, recipes, categoryFilter]);

  const hasRecipes = recipes.length > 0;
  const showEmptySearch =
    hasRecipes && displayed.length === 0 && (q.trim() || categoryFilter !== 'all');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-[#E6DDD2] px-4 pb-2 pt-2">
        <div className="relative">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or tag…"
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-11 text-gray-900 shadow-sm placeholder:text-gray-400"
          />
          {q.length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ('')}
              className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full text-lg text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          )}
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CHIPS.map(({ id, label }) => {
            const active = categoryFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategoryFilter(id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium ${
                  active
                    ? 'border-[#7C9A6E] bg-[#7C9A6E] text-white'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasRecipes && (
          <p className="px-4 py-16 text-center text-gray-500">
            No recipes yet. Head to Save to add your first one.
          </p>
        )}

        {showEmptySearch && (
          <p className="px-4 py-16 text-center text-gray-500">
            No recipes match this category and search. Try another chip or
            clear the search box.
          </p>
        )}

        {hasRecipes && displayed.length > 0 && (
          <ul>
            {displayed.map((r) => {
              const meta: string[] = [];
              meta.push(r.category);
              meta.push(`${r.ingredientCount} ingredient${r.ingredientCount === 1 ? '' : 's'}`);
              if (r.cookTime) meta.push(r.cookTime);
              if (r.servings != null) meta.push(`${r.servings} servings`);
              return (
                <li key={r.id} className="border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => navigate(`/recipes/${r.id}`)}
                    className="flex min-h-[56px] w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-gray-900">{r.title}</p>
                      {meta.length > 0 && (
                        <p className="mt-0.5 text-sm text-gray-400">
                          {meta.join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xl text-gray-400" aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
