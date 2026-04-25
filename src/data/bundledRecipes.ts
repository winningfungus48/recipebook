import type { Recipe, RecipeCategory } from '../types';
import { parseDocMarkdownToRecipes } from '../utils/parseDocRecipes';

const EXCLUDED = new Set(['archive', 'data']);

/** Order bundled files are merged (matches Recipes / Save chip order) */
const CATEGORY_ORDER = ['mains', 'sides', 'desserts', 'drinks'];

const rawModules = import.meta.glob('../../docs/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function tagFromFilename(path: string): string {
  const base = path.split(/[/\\]/).pop()?.replace(/\.md$/i, '') ?? 'Recipe';
  if (EXCLUDED.has(base.toLowerCase())) return '';
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

function slugFromFilename(path: string): string {
  const base = path.split(/[/\\]/).pop()?.replace(/\.md$/i, '') ?? 'doc';
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'doc';
}

function orderKey(slug: string): number {
  const i = CATEGORY_ORDER.indexOf(slug);
  return i === -1 ? 99 : i;
}

const pairs: { path: string; content: string; tag: string; slug: string }[] =
  [];

for (const [path, content] of Object.entries(rawModules)) {
  const slug = slugFromFilename(path);
  if (EXCLUDED.has(slug)) continue;
  const tag = tagFromFilename(path);
  if (!tag) continue;
  pairs.push({ path, content, tag, slug });
}

pairs.sort((a, b) => {
  const d = orderKey(a.slug) - orderKey(b.slug);
  if (d !== 0) return d;
  return a.path.localeCompare(b.path);
});

export const BUNDLED_RECIPES: Recipe[] = pairs.flatMap(({ content, tag, slug }) =>
  parseDocMarkdownToRecipes(content, tag, slug).map((recipe) => ({
    ...recipe,
    category: categoryFromTag(tag),
    tags: [],
    ingredientCount: recipe.ingredients.length,
  })),
);

function categoryFromTag(tag: string): RecipeCategory {
  switch (tag.toLowerCase()) {
    case 'mains':
      return 'Mains';
    case 'sides':
      return 'Sides';
    case 'desserts':
      return 'Desserts';
    case 'drinks':
      return 'Drinks';
    default:
      return 'Other';
  }
}

export function isBundledRecipeId(id: string): boolean {
  return id.startsWith('doc-');
}
