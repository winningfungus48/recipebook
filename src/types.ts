export const RECIPE_CATEGORIES = [
  'Sides',
  'Breakfast',
  'Mains',
  'Desserts',
  'Drinks',
  'Other',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const RECIPE_TAGS = [
  'chicken',
  'beef',
  'fish',
  'pasta',
  'salad',
  'soup',
  'crock pot',
  'meal prep',
] as const;

export type RecipeTag = (typeof RECIPE_TAGS)[number];

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  directions: string[];
  notes?: string;
  cookTime?: string;
  servings?: number;
  createdAt: string;
  category: RecipeCategory;
  tags: RecipeTag[];
  ingredientCount: number;
  /** Set for recipes imported from `docs/*.md` (e.g. "Drinks", "Mains"). */
  sourceTag?: string;
}

export interface DayPlan {
  recipeId: string | null;
  isEatingOut: boolean;
  eatOutNote: string;
}

export interface WeekPlan {
  id: string;
  weekLabel: string;
  days: {
    monday: DayPlan;
    tuesday: DayPlan;
    wednesday: DayPlan;
    thursday: DayPlan;
    friday: DayPlan;
    saturday: DayPlan;
    sunday: DayPlan;
  };
}

export interface AppSettings {
  eatOutPresets: string[];
}

export type DayKey = keyof WeekPlan['days'];

export const DAY_KEYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export type TabId =
  | 'save'
  | 'recipes'
  | 'schedule'
  | 'mealplan'
  | 'settings';
