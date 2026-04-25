import {
  RECIPE_TAGS,
  type AppSettings,
  type Recipe,
  type RecipeCategory,
  type RecipeTag,
  type WeekPlan,
} from '../types';

export const WEEK_PLANS_EVENT = 'cb-week-plans';

export function notifyWeekPlansChanged(): void {
  window.dispatchEvent(new CustomEvent(WEEK_PLANS_EVENT));
}

const RECIPES_KEY = 'cb-recipes';
const WEEK_PLANS_KEY = 'cb-week-plans';
const SETTINGS_KEY = 'cb-settings';
const RECIPE_OVERRIDES_KEY = 'cb-recipe-overrides';
const THEME_KEY = 'cb-theme';

const defaultSettings: AppSettings = { eatOutPresets: [] };

const CATEGORY_LOOKUP: Record<string, RecipeCategory> = {
  sides: 'Sides',
  breakfast: 'Breakfast',
  mains: 'Mains',
  desserts: 'Desserts',
  drinks: 'Drinks',
  other: 'Other',
};

function normalizeCategory(input: unknown, fallback: unknown): RecipeCategory {
  const primary =
    typeof input === 'string' ? CATEGORY_LOOKUP[input.toLowerCase()] : undefined;
  if (primary) return primary;
  const secondary =
    typeof fallback === 'string'
      ? CATEGORY_LOOKUP[fallback.toLowerCase()]
      : undefined;
  if (secondary) return secondary;
  return 'Other';
}

function normalizeTags(input: unknown): RecipeTag[] {
  if (!Array.isArray(input)) return [];
  const out: RecipeTag[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const t = raw.toLowerCase().trim() as RecipeTag;
    if ((RECIPE_TAGS as readonly string[]).includes(t) && !out.includes(t)) {
      out.push(t);
    }
  }
  return out;
}

function normalizeRecipeLike(input: unknown): Recipe | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<Recipe>;
  if (!raw.id || !raw.title || !Array.isArray(raw.ingredients) || !Array.isArray(raw.directions)) {
    return null;
  }
  const ingredients = raw.ingredients
    .map((s) => String(s).trim())
    .filter(Boolean);
  const directions = raw.directions.map((s) => String(s).trim()).filter(Boolean);
  const notes = typeof raw.notes === 'string' ? raw.notes : undefined;
  const cookTime = typeof raw.cookTime === 'string' ? raw.cookTime : undefined;
  const servings =
    typeof raw.servings === 'number' && Number.isFinite(raw.servings)
      ? raw.servings
      : undefined;
  const sourceTag = typeof raw.sourceTag === 'string' ? raw.sourceTag : undefined;
  const category = normalizeCategory(raw.category, sourceTag);
  const tags = normalizeTags(raw.tags);

  return {
    id: raw.id,
    title: String(raw.title).trim(),
    ingredients,
    directions,
    notes,
    cookTime,
    servings,
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt
        ? raw.createdAt
        : new Date().toISOString(),
    category,
    tags,
    ingredientCount: ingredients.length,
    sourceTag,
  };
}

export function getRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(RECIPES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeRecipeLike(item))
      .filter((item): item is Recipe => item !== null);
  } catch {
    return [];
  }
}

export function saveRecipes(recipes: Recipe[]): void {
  const normalized = recipes
    .map((r) => normalizeRecipeLike(r))
    .filter((item): item is Recipe => item !== null);
  localStorage.setItem(RECIPES_KEY, JSON.stringify(normalized));
}

export type RecipeOverrides = Record<string, Partial<Recipe>>;

function normalizeOverride(override: Partial<Recipe>): Partial<Recipe> {
  const next: Partial<Recipe> = { ...override };
  if (next.ingredients) {
    next.ingredients = next.ingredients.map((s) => s.trim()).filter(Boolean);
    next.ingredientCount = next.ingredients.length;
  }
  if (next.directions) {
    next.directions = next.directions.map((s) => s.trim()).filter(Boolean);
  }
  if (next.category || next.sourceTag) {
    next.category = normalizeCategory(next.category, next.sourceTag);
  }
  if (next.tags) {
    next.tags = normalizeTags(next.tags);
  }
  if (next.title) {
    next.title = next.title.trim();
  }
  if (next.notes != null) {
    next.notes = next.notes.trim() || undefined;
  }
  if (next.cookTime != null) {
    next.cookTime = next.cookTime.trim() || undefined;
  }
  return next;
}

export function getRecipeOverrides(): RecipeOverrides {
  try {
    const raw = localStorage.getItem(RECIPE_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const entries = Object.entries(parsed as Record<string, unknown>).map(
      ([id, val]) => [id, normalizeOverride((val as Partial<Recipe>) ?? {})] as const,
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function saveRecipeOverrides(overrides: RecipeOverrides): void {
  const normalizedEntries = Object.entries(overrides).map(([id, val]) => [
    id,
    normalizeOverride(val),
  ]);
  localStorage.setItem(
    RECIPE_OVERRIDES_KEY,
    JSON.stringify(Object.fromEntries(normalizedEntries)),
  );
}

export function saveRecipeOverride(
  recipeId: string,
  override: Partial<Recipe>,
): void {
  const current = getRecipeOverrides();
  current[recipeId] = normalizeOverride(override);
  saveRecipeOverrides(current);
}

export function deleteRecipeOverride(recipeId: string): void {
  const current = getRecipeOverrides();
  delete current[recipeId];
  saveRecipeOverrides(current);
}

export function getWeekPlans(): WeekPlan[] {
  try {
    const raw = localStorage.getItem(WEEK_PLANS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WeekPlan[]) : [];
  } catch {
    return [];
  }
}

export function saveWeekPlans(plans: WeekPlan[]): void {
  localStorage.setItem(WEEK_PLANS_KEY, JSON.stringify(plans));
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'eatOutPresets' in parsed &&
      Array.isArray((parsed as AppSettings).eatOutPresets)
    ) {
      return parsed as AppSettings;
    }
    return { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export type ThemeMode = 'light' | 'dark';

export function getThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveThemeMode(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
}
