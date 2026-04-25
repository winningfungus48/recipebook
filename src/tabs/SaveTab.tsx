import { useCallback, useEffect, useState } from 'react';
import {
  RECIPE_TAGS,
  type Recipe,
  type RecipeCategory,
  type RecipeTag,
} from '../types';
import { useRecipes } from '../context';
import { parseMarkdownRecipe } from '../utils/parseMarkdown';
import { splitMarkdownIntoRecipeChunks } from '../utils/parseDocRecipes';
import { getRecipes, saveRecipes } from '../utils/storage';

type InputMode = 'paste' | 'upload';

type SaveCategoryId = RecipeCategory;

const SAVE_CHIPS: { id: SaveCategoryId; label: string }[] = [
  { id: 'Mains', label: 'Mains' },
  { id: 'Sides', label: 'Sides' },
  { id: 'Desserts', label: 'Desserts' },
  { id: 'Drinks', label: 'Drinks' },
  { id: 'Breakfast', label: 'Breakfast' },
  { id: 'Other', label: 'Other' },
];

type FormState = {
  title: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  directions: string[];
  notes: string;
  tags: RecipeTag[];
};

type UploadRow = {
  localId: string;
  tag: SaveCategoryId | null;
  form: FormState;
};

function partialToForm(p: Partial<Recipe>): FormState {
  return {
    title: p.title ?? '',
    cookTime: p.cookTime ?? '',
    servings: p.servings != null ? String(p.servings) : '',
    ingredients: p.ingredients?.length ? [...p.ingredients] : [''],
    directions: p.directions?.length ? [...p.directions] : [''],
    notes: p.notes ?? '',
    tags: p.tags ?? [],
  };
}

function formToRecipe(form: FormState, category: RecipeCategory): Recipe | null {
  if (!form.title.trim()) return null;
  const servingsNum = form.servings.trim()
    ? Number.parseInt(form.servings, 10)
    : undefined;
  const ingredients = form.ingredients.map((s) => s.trim()).filter(Boolean);
  return {
    id: crypto.randomUUID(),
    title: form.title.trim(),
    ingredients,
    directions: form.directions.map((s) => s.trim()).filter(Boolean),
    notes: form.notes.trim() || undefined,
    cookTime: form.cookTime.trim() || undefined,
    servings:
      servingsNum !== undefined && !Number.isNaN(servingsNum)
        ? servingsNum
        : undefined,
    createdAt: new Date().toISOString(),
    category,
    tags: form.tags,
    ingredientCount: ingredients.length,
    sourceTag: category,
  };
}

function CategoryChipRow({
  selected,
  onChange,
  className = '',
}: {
  selected: SaveCategoryId | null;
  onChange: (id: SaveCategoryId) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {SAVE_CHIPS.map(({ id, label }) => {
        const active = selected === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
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
  );
}

function TagChipRow({
  selected,
  onToggle,
  className = '',
}: {
  selected: RecipeTag[];
  onToggle: (tag: RecipeTag) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {RECIPE_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
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
  );
}

export function SaveTab() {
  const { refreshRecipes } = useRecipes();
  const [mode, setMode] = useState<InputMode>('paste');
  const [pasteCategory, setPasteCategory] = useState<SaveCategoryId | null>(
    null,
  );
  const [mdText, setMdText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadBatch, setUploadBatch] = useState<UploadRow[] | null>(null);
  const [uploadFileHint, setUploadFileHint] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const applyParsed = useCallback((p: Partial<Recipe>) => {
    if (!p.title?.trim()) {
      setParseError(
        "Couldn't find a title. Please paste a valid recipe.",
      );
      setShowPreview(false);
      setForm(null);
      return;
    }
    setParseError(null);
    setForm(partialToForm(p));
    setShowPreview(true);
    setEditMode(false);
  }, []);

  const resetPasteFlow = useCallback(() => {
    setMdText('');
    setShowPreview(false);
    setForm(null);
    setEditMode(false);
    setParseError(null);
    setPasteCategory(null);
  }, []);

  const setInputMode = (m: InputMode) => {
    setMode(m);
    setParseError(null);
    setUploadFileHint(null);
    if (m === 'paste') {
      setUploadBatch(null);
    } else {
      resetPasteFlow();
    }
  };

  const handleParse = () => {
    if (!pasteCategory) return;
    const p = parseMarkdownRecipe(mdText);
    applyParsed(p);
  };

  const handleFile = (file: File | null) => {
    if (!file || !file.name.toLowerCase().endsWith('.md')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setMdText(text);
      const chunks = splitMarkdownIntoRecipeChunks(text);
      if (chunks.length === 0) {
        setUploadFileHint('No recipe text found in this file.');
        setUploadBatch(null);
        return;
      }
      setUploadFileHint(null);
      const rows: UploadRow[] = chunks.map((chunk) => ({
        localId: crypto.randomUUID(),
        tag: null,
        form: partialToForm(parseMarkdownRecipe(chunk)),
      }));
      setUploadBatch(rows);
    };
    reader.readAsText(file);
  };

  const handleSaveRecipe = () => {
    if (!form || !form.title.trim() || !pasteCategory) return;
    const recipe = formToRecipe(form, pasteCategory);
    if (!recipe) return;
    saveRecipes([...getRecipes(), recipe]);
    refreshRecipes();
    setToast('Recipe saved!');
    resetPasteFlow();
  };

  const uploadAllTagged =
    uploadBatch !== null &&
    uploadBatch.length > 0 &&
    uploadBatch.every((r) => r.tag !== null);
  const uploadAllValidTitles =
    uploadBatch !== null &&
    uploadBatch.every((r) => r.form.title.trim().length > 0);

  const handleSaveAllUpload = () => {
    if (!uploadBatch || !uploadAllTagged || !uploadAllValidTitles) return;
    const next: Recipe[] = [];
    for (const row of uploadBatch) {
      const r = formToRecipe(row.form, row.tag!);
      if (r) next.push(r);
    }
    if (next.length !== uploadBatch.length) return;
    saveRecipes([...getRecipes(), ...next]);
    refreshRecipes();
    setToast(
      next.length === 1 ? 'Recipe saved!' : `${next.length} recipes saved!`,
    );
    setUploadBatch(null);
    setMdText('');
  };

  const previewForm = form;

  const parseDisabled = mode === 'paste' && (!pasteCategory || !mdText.trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-sm">
          {toast}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode('paste')}
          className={`min-h-[44px] flex-1 rounded-xl py-2 text-sm font-medium ${
            mode === 'paste'
              ? 'bg-[#7C9A6E] text-white'
              : 'border border-gray-200 bg-white text-gray-700'
          }`}
        >
          Paste Markdown
        </button>
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`min-h-[44px] flex-1 rounded-xl py-2 text-sm font-medium ${
            mode === 'upload'
              ? 'bg-[#7C9A6E] text-white'
              : 'border border-gray-200 bg-white text-gray-700'
          }`}
        >
          Upload .md File
        </button>
      </div>

      {parseError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {parseError}
        </p>
      )}

      {mode === 'paste' && !showPreview && (
        <div className="mt-4 flex flex-1 flex-col">
          <p className="text-xs font-medium text-gray-600">Category</p>
          <CategoryChipRow
            selected={pasteCategory}
            onChange={setPasteCategory}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Choose a category, then parse your markdown.
          </p>
          <textarea
            value={mdText}
            onChange={(e) => setMdText(e.target.value)}
            placeholder="Paste recipe markdown…"
            className="mt-3 min-h-[200px] w-full flex-1 rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-sm"
          />
          <button
            type="button"
            disabled={parseDisabled}
            onClick={handleParse}
            className="mt-3 min-h-[44px] w-full rounded-xl py-3 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-[#7C9A6E]"
          >
            Parse Recipe
          </button>
        </div>
      )}

      {mode === 'upload' && uploadBatch === null && (
        <div className="mt-6">
          {uploadFileHint && (
            <p className="mb-2 text-sm text-amber-800">{uploadFileHint}</p>
          )}
          <label className="flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600 shadow-sm">
            <span className="font-medium text-[#7C9A6E]">Choose .md file</span>
            <span className="mt-1 text-xs text-gray-400">Markdown only</span>
            <input
              type="file"
              accept=".md"
              className="sr-only"
              onChange={(e) => {
                handleFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      )}

      {mode === 'upload' && uploadBatch !== null && (
        <div className="mt-4 flex flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {uploadBatch.length} recipe
              {uploadBatch.length === 1 ? '' : 's'} found
            </h2>
            <button
              type="button"
              onClick={() => {
                setUploadBatch(null);
                setMdText('');
                setUploadFileHint(null);
              }}
              className="min-h-[44px] shrink-0 rounded-lg px-2 text-sm text-[#7C9A6E]"
            >
              Choose file…
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-600">Tag all recipes:</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {SAVE_CHIPS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setUploadBatch((rows) =>
                    rows?.map((r) => ({ ...r, tag: id })) ?? null,
                  )
                }
                className="min-h-[40px] rounded-full border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800"
              >
                All → {label}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-4">
            {uploadBatch.map((row, idx) => (
              <li
                key={row.localId}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <p className="text-xs font-medium text-gray-500">
                  Recipe {idx + 1}
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {row.form.title.trim() || (
                    <span className="text-amber-700">Untitled — edit below</span>
                  )}
                </p>
                <p className="mt-2 text-xs font-medium text-gray-600">
                  Category
                </p>
                <CategoryChipRow
                  selected={row.tag}
                  onChange={(id) =>
                    setUploadBatch((rows) =>
                      rows?.map((r) =>
                        r.localId === row.localId ? { ...r, tag: id } : r,
                      ) ?? null,
                    )
                  }
                  className="mt-1"
                />
                <p className="mt-2 text-xs font-medium text-gray-600">Tags</p>
                <TagChipRow
                  selected={row.form.tags}
                  onToggle={(tag) =>
                    setUploadBatch((rows) =>
                      rows?.map((r) =>
                        r.localId === row.localId
                          ? {
                              ...r,
                              form: {
                                ...r.form,
                                tags: r.form.tags.includes(tag)
                                  ? r.form.tags.filter((t) => t !== tag)
                                  : [...r.form.tags, tag],
                              },
                            }
                          : r,
                      ) ?? null,
                    )
                  }
                  className="mt-1"
                />
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-[#7C9A6E]">
                    Edit fields
                  </summary>
                  <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                    <input
                      type="text"
                      value={row.form.title}
                      onChange={(e) =>
                        setUploadBatch((rows) =>
                          rows?.map((r) =>
                            r.localId === row.localId
                              ? {
                                  ...r,
                                  form: { ...r.form, title: e.target.value },
                                }
                              : r,
                          ) ?? null,
                        )
                      }
                      className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm"
                      placeholder="Title"
                    />
                    <textarea
                      value={row.form.ingredients.join('\n')}
                      onChange={(e) =>
                        setUploadBatch((rows) =>
                          rows?.map((r) =>
                            r.localId === row.localId
                              ? {
                                  ...r,
                                  form: {
                                    ...r.form,
                                    ingredients: e.target.value
                                      .split('\n')
                                      .map((s) => s),
                                  },
                                }
                              : r,
                          ) ?? null,
                        )
                      }
                      className="min-h-[80px] w-full rounded-xl border border-gray-200 p-2 text-sm"
                      placeholder="One ingredient per line"
                    />
                    <textarea
                      value={row.form.directions.join('\n')}
                      onChange={(e) =>
                        setUploadBatch((rows) =>
                          rows?.map((r) =>
                            r.localId === row.localId
                              ? {
                                  ...r,
                                  form: {
                                    ...r.form,
                                    directions: e.target.value
                                      .split('\n')
                                      .map((s) => s),
                                  },
                                }
                              : r,
                          ) ?? null,
                        )
                      }
                      className="min-h-[80px] w-full rounded-xl border border-gray-200 p-2 text-sm"
                      placeholder="One step per line"
                    />
                    <textarea
                      value={row.form.notes}
                      onChange={(e) =>
                        setUploadBatch((rows) =>
                          rows?.map((r) =>
                            r.localId === row.localId
                              ? {
                                  ...r,
                                  form: { ...r.form, notes: e.target.value },
                                }
                              : r,
                          ) ?? null,
                        )
                      }
                      className="min-h-[60px] w-full rounded-xl border border-gray-200 p-2 text-sm"
                      placeholder="Notes"
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>

          {!uploadAllValidTitles && (
            <p className="mt-2 text-sm text-amber-800">
              Each recipe needs a title. Expand &quot;Edit fields&quot; to fix
              any untitled rows.
            </p>
          )}
          {uploadBatch.length > 0 && !uploadAllTagged && (
            <p className="mt-1 text-sm text-gray-600">
              Choose a category for every recipe before saving.
            </p>
          )}

          <button
            type="button"
            disabled={!uploadAllTagged || !uploadAllValidTitles}
            onClick={handleSaveAllUpload}
            className="mt-4 min-h-[44px] w-full rounded-xl py-3 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-[#7C9A6E]"
          >
            Save all recipes
          </button>
        </div>
      )}

      {mode === 'paste' && showPreview && previewForm && (
        <div className="mt-4 flex flex-1 flex-col overflow-y-auto">
          <p className="text-xs font-medium text-gray-600">Category</p>
          <CategoryChipRow
            selected={pasteCategory}
            onChange={setPasteCategory}
            className="mt-1"
          />
          <div className="mt-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <button
              type="button"
              onClick={() => setEditMode((e) => !e)}
              className="min-h-[44px] rounded-full px-4 text-sm font-medium text-[#7C9A6E]"
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          </div>

          {!editMode ? (
            <div className="mt-3 space-y-4 rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900">
                {previewForm.title}
              </h3>
              {(previewForm.cookTime || previewForm.servings) && (
                <p className="text-sm text-gray-400">
                  {[
                    previewForm.cookTime,
                    previewForm.servings &&
                      `${previewForm.servings} servings`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Ingredients
                </p>
                <ul className="mt-1 list-disc pl-5 text-gray-800">
                  {previewForm.ingredients
                    .filter(Boolean)
                    .map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Directions
                </p>
                <ol className="mt-1 list-decimal pl-5 text-gray-800">
                  {previewForm.directions
                    .filter(Boolean)
                    .map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                </ol>
              </div>
              {previewForm.notes.trim() && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-800">
                    {previewForm.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3 rounded-xl bg-white p-4 shadow-sm">
              <input
                type="text"
                value={previewForm.title}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, title: e.target.value } : f))
                }
                className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                placeholder="Title"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={previewForm.cookTime}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, cookTime: e.target.value } : f,
                    )
                  }
                  className="min-h-[44px] flex-1 rounded-xl border border-gray-200 px-3"
                  placeholder="Cook time"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={previewForm.servings}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, servings: e.target.value } : f,
                    )
                  }
                  className="min-h-[44px] w-24 rounded-xl border border-gray-200 px-3"
                  placeholder="Servings"
                />
              </div>
              <p className="text-xs font-semibold text-gray-500">Ingredients</p>
              {previewForm.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={ing}
                    onChange={(e) =>
                      setForm((f) => {
                        if (!f) return f;
                        const next = [...f.ingredients];
                        next[i] = e.target.value;
                        return { ...f, ingredients: next };
                      })
                    }
                    className="min-h-[44px] flex-1 rounded-xl border border-gray-200 px-3"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => {
                        if (!f) return f;
                        const next = f.ingredients.filter((_, j) => j !== i);
                        return {
                          ...f,
                          ingredients: next.length ? next : [''],
                        };
                      })
                    }
                    className="min-h-[44px] min-w-[44px] text-xl text-gray-500"
                    aria-label="Remove ingredient"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm((f) =>
                    f ? { ...f, ingredients: [...f.ingredients, ''] } : f,
                  )
                }
                className="min-h-[44px] w-full rounded-xl border border-gray-200 py-2 text-sm text-[#7C9A6E]"
              >
                Add Ingredient
              </button>

              <p className="pt-2 text-xs font-semibold text-gray-500">
                Directions
              </p>
              {previewForm.directions.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={step}
                    onChange={(e) =>
                      setForm((f) => {
                        if (!f) return f;
                        const next = [...f.directions];
                        next[i] = e.target.value;
                        return { ...f, directions: next };
                      })
                    }
                    className="min-h-[80px] flex-1 rounded-xl border border-gray-200 p-3"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => {
                        if (!f) return f;
                        const next = f.directions.filter((_, j) => j !== i);
                        return {
                          ...f,
                          directions: next.length ? next : [''],
                        };
                      })
                    }
                    className="min-h-[44px] min-w-[44px] self-start text-xl text-gray-500"
                    aria-label="Remove step"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm((f) =>
                    f ? { ...f, directions: [...f.directions, ''] } : f,
                  )
                }
                className="min-h-[44px] w-full rounded-xl border border-gray-200 py-2 text-sm text-[#7C9A6E]"
              >
                Add Step
              </button>

              <p className="pt-2 text-xs font-semibold text-gray-500">Notes</p>
              <textarea
                value={previewForm.notes}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, notes: e.target.value } : f))
                }
                className="min-h-[100px] w-full rounded-xl border border-gray-200 p-3"
              />
              <p className="pt-2 text-xs font-semibold text-gray-500">Tags</p>
              <TagChipRow
                selected={previewForm.tags}
                onToggle={(tag) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          tags: f.tags.includes(tag)
                            ? f.tags.filter((t) => t !== tag)
                            : [...f.tags, tag],
                        }
                      : f,
                  )
                }
              />
            </div>
          )}

          <button
            type="button"
            disabled={!pasteCategory}
            onClick={handleSaveRecipe}
            className="mt-4 min-h-[44px] w-full rounded-xl py-3 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-[#7C9A6E]"
          >
            Save Recipe
          </button>
        </div>
      )}
    </div>
  );
}
