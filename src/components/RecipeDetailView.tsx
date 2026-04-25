import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecipes } from '../context';
import { isBundledRecipeId } from '../data/bundledRecipes';
import {
  RECIPE_TAGS,
  type Recipe,
  type RecipeCategory,
  type RecipeTag,
} from '../types';
import {
  getRecipes,
  saveRecipeOverride,
  saveRecipes,
} from '../utils/storage';

type RecipeForm = {
  title: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  directions: string[];
  notes: string;
  category: RecipeCategory;
  tags: RecipeTag[];
};

const CATEGORY_ORDER: RecipeCategory[] = [
  'Mains',
  'Sides',
  'Desserts',
  'Drinks',
  'Breakfast',
  'Other',
];

function toForm(recipe: Recipe): RecipeForm {
  return {
    title: recipe.title,
    cookTime: recipe.cookTime ?? '',
    servings: recipe.servings != null ? String(recipe.servings) : '',
    ingredients: recipe.ingredients.length ? [...recipe.ingredients] : [''],
    directions: recipe.directions.length ? [...recipe.directions] : [''],
    notes: recipe.notes ?? '',
    category: recipe.category,
    tags: [...recipe.tags],
  };
}

function formToUpdate(form: RecipeForm): Partial<Recipe> {
  const ingredients = form.ingredients.map((s) => s.trim()).filter(Boolean);
  const directions = form.directions.map((s) => s.trim()).filter(Boolean);
  const servingsNum = form.servings.trim()
    ? Number.parseInt(form.servings, 10)
    : undefined;
  return {
    title: form.title.trim(),
    cookTime: form.cookTime.trim() || undefined,
    servings:
      servingsNum !== undefined && !Number.isNaN(servingsNum)
        ? servingsNum
        : undefined,
    ingredients,
    directions,
    notes: form.notes.trim() || undefined,
    category: form.category,
    tags: form.tags,
    ingredientCount: ingredients.length,
    sourceTag: form.category,
  };
}

export function RecipeDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, refreshRecipes } = useRecipes();
  const [isEditing, setIsEditing] = useState(false);

  const recipe = id ? recipes.find((r) => r.id === id) : undefined;
  const [form, setForm] = useState<RecipeForm | null>(null);
  const isBundled = recipe ? isBundledRecipeId(recipe.id) : false;

  useEffect(() => {
    if (recipe) setForm(toForm(recipe));
  }, [recipe?.id]);

  if (!id || !recipe) {
    return (
      <div className="min-h-screen bg-[#E6DDD2] px-4 py-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="min-h-[44px] text-[#7C9A6E]"
        >
          ← Back
        </button>
        <p className="mt-8 text-center text-gray-500">Recipe not found.</p>
      </div>
    );
  }

  const handleDelete = () => {
    if (
      !window.confirm(
        'Delete this recipe? This cannot be undone.',
      )
    ) {
      return;
    }
    const next = getRecipes().filter((r) => r.id !== id);
    saveRecipes(next);
    refreshRecipes();
    navigate('/');
  };

  const metaParts: string[] = [];
  metaParts.push(recipe.category);
  metaParts.push(
    `${recipe.ingredientCount} ingredient${recipe.ingredientCount === 1 ? '' : 's'}`,
  );
  if (recipe.cookTime) metaParts.push(recipe.cookTime);
  if (recipe.servings != null) metaParts.push(`${recipe.servings} servings`);

  const saveEdit = () => {
    if (!form || !form.title.trim()) return;
    const update = formToUpdate(form);
    if (isBundled) {
      saveRecipeOverride(recipe.id, update);
    } else {
      const next = getRecipes().map((r) =>
        r.id === recipe.id ? { ...r, ...update } : r,
      );
      saveRecipes(next);
    }
    refreshRecipes();
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-[#E6DDD2] px-4 pb-10 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="min-h-[44px] text-[#7C9A6E]"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (isEditing) {
              setForm(toForm(recipe));
            }
            setIsEditing((v) => !v);
          }}
          className="min-h-[44px] rounded-full px-3 text-sm font-medium text-[#7C9A6E]"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {!isEditing ? (
        <>
          <div className="mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
          </div>
          {recipe.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {metaParts.length > 0 && (
            <p className="mt-1 text-sm text-gray-400">{metaParts.join(' · ')}</p>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Ingredients
            </h2>
            {recipe.ingredients.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-400">None listed.</p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Directions
            </h2>
            {recipe.directions.length > 0 ? (
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-gray-800">
                {recipe.directions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-gray-400">None listed.</p>
            )}
          </section>

          {recipe.notes && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-gray-800">{recipe.notes}</p>
            </section>
          )}
        </>
      ) : (
        form && (
          <div className="mt-3 space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              placeholder="Title"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={form.cookTime}
                onChange={(e) => setForm({ ...form, cookTime: e.target.value })}
                className="min-h-[44px] flex-1 rounded-xl border border-gray-200 px-3"
                placeholder="Cook time"
              />
              <input
                type="text"
                inputMode="numeric"
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: e.target.value })}
                className="min-h-[44px] w-24 rounded-xl border border-gray-200 px-3"
                placeholder="Servings"
              />
            </div>
            <p className="text-xs font-semibold text-gray-500">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setForm({ ...form, category })}
                  className={`min-h-[40px] rounded-full border px-3 py-1 text-xs font-medium ${
                    form.category === category
                      ? 'border-[#7C9A6E] bg-[#7C9A6E] text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-500">Tags</p>
            <div className="flex flex-wrap gap-2">
              {RECIPE_TAGS.map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        tags: active
                          ? form.tags.filter((t) => t !== tag)
                          : [...form.tags, tag],
                      })
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
            <p className="text-xs font-semibold text-gray-500">Ingredients</p>
            {form.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={ing}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ingredients: form.ingredients.map((item, idx) =>
                        idx === i ? e.target.value : item,
                      ),
                    })
                  }
                  className="min-h-[44px] flex-1 rounded-xl border border-gray-200 px-3"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      ingredients:
                        form.ingredients.filter((_, idx) => idx !== i).length > 0
                          ? form.ingredients.filter((_, idx) => idx !== i)
                          : [''],
                    })
                  }
                  className="min-h-[44px] min-w-[44px] text-xl text-gray-500"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, ingredients: [...form.ingredients, ''] })
              }
              className="min-h-[44px] w-full rounded-xl border border-gray-200 py-2 text-sm text-[#7C9A6E]"
            >
              Add Ingredient
            </button>
            <p className="text-xs font-semibold text-gray-500">Directions</p>
            {form.directions.map((step, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  value={step}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      directions: form.directions.map((item, idx) =>
                        idx === i ? e.target.value : item,
                      ),
                    })
                  }
                  className="min-h-[80px] flex-1 rounded-xl border border-gray-200 p-3"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      directions:
                        form.directions.filter((_, idx) => idx !== i).length > 0
                          ? form.directions.filter((_, idx) => idx !== i)
                          : [''],
                    })
                  }
                  className="min-h-[44px] min-w-[44px] self-start text-xl text-gray-500"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm({ ...form, directions: [...form.directions, ''] })}
              className="min-h-[44px] w-full rounded-xl border border-gray-200 py-2 text-sm text-[#7C9A6E]"
            >
              Add Step
            </button>
            <p className="text-xs font-semibold text-gray-500">Notes</p>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-[100px] w-full rounded-xl border border-gray-200 p-3"
            />
            <button
              type="button"
              onClick={saveEdit}
              className="w-full min-h-[44px] rounded-xl bg-[#7C9A6E] py-3 text-center font-medium text-white shadow-sm"
            >
              Save Changes
            </button>
          </div>
        )
      )}

      {!isBundledRecipeId(recipe.id) && !isEditing && (
        <button
          type="button"
          onClick={handleDelete}
          className="mt-10 w-full min-h-[44px] rounded-xl bg-red-600 py-3 text-center font-medium text-white shadow-sm"
        >
          Delete Recipe
        </button>
      )}
    </div>
  );
}
