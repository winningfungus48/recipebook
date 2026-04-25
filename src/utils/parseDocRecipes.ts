import type { Recipe } from '../types';

function stripInlineMd(s: string): string {
  let t = s;
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');
  t = t.replace(/~~([^~]+)~~/g, '$1');
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  return t;
}

function stripLine(line: string): string {
  let s = line.trim();
  s = s.replace(/^#+\s*/, '');
  s = s.replace(/^\d+\.\s+/, '');
  s = s.replace(/^[-*]\s+/, '');
  s = stripInlineMd(s);
  return s.trim();
}

type Section = 'ingredients' | 'directions' | 'notes' | null;

type Draft = {
  title: string;
  ingredients: string[];
  directions: string[];
  notesLines: string[];
};

function scanMetaFromText(text: string): {
  cookTime?: string;
  servings?: number;
} {
  let cookTime: string | undefined;
  let servings: number | undefined;
  const cookTimeRe = /cook\s*time\s*:\s*(.+)/i;
  const servingsRe = /servings?\s*:\s*(\d+)/i;
  for (const raw of text.split('\n')) {
    const ct = raw.match(cookTimeRe);
    if (ct) cookTime = stripLine(ct[1]);
    const sv = raw.match(servingsRe);
    if (sv) servings = Number.parseInt(sv[1], 10);
  }
  if (servings !== undefined && Number.isNaN(servings)) servings = undefined;
  return { cookTime, servings };
}

function draftToRecipe(
  d: Draft,
  id: string,
  sourceTag: string,
): Recipe | null {
  const title = d.title.trim();
  if (!title) return null;
  const body = [...d.ingredients, ...d.directions, ...d.notesLines].join('\n');
  const { cookTime, servings } = scanMetaFromText(body);
  const notes =
    d.notesLines.length > 0 ? d.notesLines.join('\n').trim() : undefined;
  return {
    id,
    title,
    ingredients: d.ingredients,
    directions: d.directions,
    notes,
    cookTime,
    servings,
    createdAt: '2000-01-01T00:00:00.000Z',
    category: 'Other',
    tags: [],
    ingredientCount: d.ingredients.length,
    sourceTag,
  };
}

/**
 * Parses one docs/*.md export: multiple recipes separated by ## titles,
 * with ## Ingredients / ## Directions / ## Notes and optional ### subsections.
 * Escaped headings (`\#`) are normalized first.
 */
export function parseDocMarkdownToRecipes(
  rawMd: string,
  sourceTag: string,
  fileSlug: string,
): Recipe[] {
  const md = rawMd.replace(/\r\n/g, '\n').replace(/\\#/g, '#');
  const lines = md.split('\n');
  const out: Recipe[] = [];
  let draft: Draft | null = null;
  let section: Section = null;
  let recipeIndex = 0;

  const flush = () => {
    if (!draft) return;
    const id = `doc-${fileSlug}-${recipeIndex}`;
    recipeIndex += 1;
    const r = draftToRecipe(draft, id, sourceTag);
    if (r) {
      out.push(r);
    }
    draft = null;
    section = null;
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(\s*)(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[2].length;
      const rawText = headingMatch[3];
      const text = stripLine(rawText);

      if (level === 2) {
        const key = text.toLowerCase();
        if (key === 'ingredients') {
          section = 'ingredients';
          continue;
        }
        if (key === 'directions') {
          section = 'directions';
          continue;
        }
        if (key === 'notes') {
          section = 'notes';
          continue;
        }
        flush();
        draft = {
          title: text,
          ingredients: [],
          directions: [],
          notesLines: [],
        };
        section = null;
        continue;
      }

      if (level === 3 && draft) {
        const label = text;
        if (section === 'ingredients') {
          draft.ingredients.push(`— ${label} —`);
        } else if (section === 'directions') {
          draft.directions.push(`— ${label} —`);
        } else if (section === 'notes') {
          draft.notesLines.push(`(${label})`);
        }
        continue;
      }

      if (level >= 2 && draft) {
        continue;
      }
    }

    if (!draft) continue;

    const s = stripLine(line);
    if (!s) continue;

    if (section === 'ingredients') draft.ingredients.push(s);
    else if (section === 'directions') draft.directions.push(s);
    else if (section === 'notes') draft.notesLines.push(s);
  }

  flush();
  return out;
}

const SECTION_HEADINGS = new Set(['ingredients', 'directions', 'notes']);

/**
 * Splits markdown that may contain multiple doc-style recipes (`##` title blocks)
 * into chunks for per-recipe parsing. Non-`##` headings stay in the current chunk.
 * If no `##` recipe boundaries are found, returns the trimmed whole file as one chunk.
 */
export function splitMarkdownIntoRecipeChunks(rawMd: string): string[] {
  const md = rawMd.replace(/\r\n/g, '\n').replace(/\\#/g, '#');
  const lines = md.split('\n');
  const chunks: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const s = buf.join('\n').trim();
    if (s) chunks.push(s);
    buf = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(\s*)(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[2].length === 2) {
      const text = stripLine(headingMatch[3]);
      const key = text.toLowerCase();
      if (SECTION_HEADINGS.has(key)) {
        buf.push(line);
        continue;
      }
      flush();
      buf.push(line);
      continue;
    }
    buf.push(line);
  }
  flush();
  if (chunks.length === 0 && md.trim()) return [md.trim()];
  return chunks;
}
