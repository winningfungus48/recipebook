import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Recipe } from './types';
import { BUNDLED_RECIPES } from './data/bundledRecipes';
import {
  getRecipeOverrides,
  getRecipes,
  getThemeMode,
  saveThemeMode,
  type ThemeMode,
} from './utils/storage';
import { getWeekStart } from './utils/weekUtils';

type RecipesContextValue = {
  recipes: Recipe[];
  refreshRecipes: () => void;
};

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [storedRecipes, setStoredRecipes] = useState<Recipe[]>(() =>
    getRecipes(),
  );
  const [bundledOverrides, setBundledOverrides] = useState(() =>
    getRecipeOverrides(),
  );
  const refreshRecipes = useCallback(() => {
    setStoredRecipes(getRecipes());
    setBundledOverrides(getRecipeOverrides());
  }, []);
  const recipes = useMemo<Recipe[]>(
    () => [
      ...BUNDLED_RECIPES.map((recipe) => ({
        ...recipe,
        ...(bundledOverrides[recipe.id] ?? {}),
      })),
      ...storedRecipes,
    ],
    [bundledOverrides, storedRecipes],
  );
  const value = useMemo(
    () => ({ recipes, refreshRecipes }),
    [recipes, refreshRecipes],
  );
  return (
    <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>
  );
}

export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipesProvider');
  return ctx;
}

type CurrentWeekContextValue = {
  weekStart: Date;
  setWeekStart: (d: Date) => void;
};

const CurrentWeekContext = createContext<CurrentWeekContextValue | null>(
  null,
);

export function CurrentWeekProvider({ children }: { children: ReactNode }) {
  const [weekStart, setWeekStartState] = useState(() =>
    getWeekStart(new Date()),
  );
  const setWeekStart = useCallback((d: Date) => {
    setWeekStartState(getWeekStart(d));
  }, []);
  const value = useMemo(
    () => ({ weekStart, setWeekStart }),
    [weekStart, setWeekStart],
  );
  return (
    <CurrentWeekContext.Provider value={value}>
      {children}
    </CurrentWeekContext.Provider>
  );
}

export function useCurrentWeek(): CurrentWeekContextValue {
  const ctx = useContext(CurrentWeekContext);
  if (!ctx)
    throw new Error('useCurrentWeek must be used within CurrentWeekProvider');
  return ctx;
}

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    getThemeMode(),
  );
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') root.classList.add('theme-dark');
    else root.classList.remove('theme-dark');
  }, [themeMode]);
  const setThemeMode = useCallback((mode: ThemeMode) => {
    saveThemeMode(mode);
    setThemeModeState(mode);
  }, []);
  const value = useMemo(
    () => ({ themeMode, setThemeMode }),
    [themeMode, setThemeMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
