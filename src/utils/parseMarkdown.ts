import type { Recipe } from '../types';

function stripInlineMd(s: string): string {
  let t = s;
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');
  t = t.replace(/~~([^~]+)~~/g, '$1');
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

function isHeading(line: string): boolean {
  return /^\s*#+\s+\S/.test(line);
}

function headingText(line: string): string {
  const m = line.match(/^\s*#+\s+(.+)$/);
  return m ? stripLine(m[1]) : stripLine(line);
}

function headingMatch(line: string, re: RegExp): boolean {
  if (!isHeading(line)) return false;
  const text = line.replace(/^\s*#+\s+/, '').trim();
  return re.test(text);
}

export function parseMarkdownRecipe(md: string): Partial<Recipe> {
  const lines = md.replace(/\r\n/g, '\n').split('\n');

  let title: string | undefined;
  let sawAnyHeading = false;
  for (const line of lines) {
    if (isHeading(line)) {
      sawAnyHeading = true;
      title = headingText(line);
      break;
    }
  }
  if (!sawAnyHeading) {
    for (const line of lines) {
      const t = stripLine(line);
      if (t) {
        title = t;
        break;
      }
    }
  }

  const ingredients: string[] = [];
  const directions: string[] = [];
  const notesLines: string[] = [];
  let cookTime: string | undefined;
  let servings: number | undefined;

  const cookTimeRe = /cook\s*time\s*:\s*(.+)/i;
  const servingsRe = /servings?\s*:\s*(\d+)/i;

  for (const raw of lines) {
    const ct = raw.match(cookTimeRe);
    if (ct) cookTime = stripLine(ct[1]);
    const sv = raw.match(servingsRe);
    if (sv) servings = Number.parseInt(sv[1], 10);
  }

  type Section = 'none' | 'ingredients' | 'directions' | 'notes';
  let section: Section = 'none';

  for (const line of lines) {
    if (isHeading(line)) {
      if (headingMatch(line, /ingredients/i)) {
        section = 'ingredients';
        continue;
      }
      if (headingMatch(line, /directions|instructions|steps/i)) {
        section = 'directions';
        continue;
      }
      if (headingMatch(line, /notes/i)) {
        section = 'notes';
        continue;
      }
      section = 'none';
      continue;
    }

    if (section === 'ingredients') {
      const s = stripLine(line);
      if (s) ingredients.push(s);
      continue;
    }
    if (section === 'directions') {
      const s = stripLine(line);
      if (s) directions.push(s);
      continue;
    }
    if (section === 'notes') {
      if (line.trim()) notesLines.push(stripLine(line));
      continue;
    }
  }

  const notes =
    notesLines.length > 0 ? notesLines.join('\n').trim() : undefined;

  const result: Partial<Recipe> = {
    title,
    ingredients: ingredients.length ? ingredients : undefined,
    directions: directions.length ? directions : undefined,
  };
  if (notes) result.notes = notes;
  if (cookTime) result.cookTime = cookTime;
  if (servings !== undefined && !Number.isNaN(servings))
    result.servings = servings;
  return result;
}
