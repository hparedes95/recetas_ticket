// Orquestador de SUGERENCIAS.
//
// Junta el catálogo curado con recetas generadas, las puntúa con los pesos
// configurables (cobertura, afinidad, novedad, −repetición, −faltantes), filtra
// por cooldown, y elige el lote final por MMR (relevancia − similitud). Cada
// sugerencia expone cobertura rica: qué usa del ticket, qué básicos asume, qué
// falta por comprar y qué sustituciones propone.
//
// Lógica pura (sin React Native) → testeable en node.
import { DietGoal, DietTag, MealSlot, Recipe, RecipeIngredient } from '../types';
import { RECIPES } from '../data/recipes';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { getCulinary } from '../data/culinary';
import { generateRecipes } from './generator';
import { recencyPenalty, inCooldown, SuggestionHistory } from './history';
import { selectMMR, Scored } from './mmr';
import { DEFAULT_CONFIG, EngineConfig } from './config';
import { hashSeed } from './rng';

export interface Substitution {
  missing: string; // clave que falta
  use: string; // clave sustituta disponible
}

export interface Suggestion {
  recipe: Recipe;
  usesFromTicket: string[]; // claves del ticket/despensa que aprovecha
  pantryBasics: string[]; // básicos asumidos (aceite, sal, ajo…)
  missing: RecipeIngredient[]; // faltan por comprar (sin básicos, sin sustituibles)
  substitutions: Substitution[]; // sustituciones propuestas para lo que falta
  coverage: number; // 0..1 de ingredientes principales disponibles (o sustituibles)
  score: number;
}

export interface SuggestOptions {
  slot?: MealSlot;
  goal?: DietGoal;
  restrictions?: DietTag[];
  dislikes?: string[];
  count?: number;
  history?: SuggestionHistory;
  config?: EngineConfig;
  seed?: number;
  includeGenerated?: boolean;
}

function isStaple(ing: RecipeIngredient): boolean {
  return ing.staple === true || INGREDIENT_BY_KEY[ing.key]?.staple === true;
}

function passesRestrictions(recipe: Recipe, restrictions: DietTag[]): boolean {
  return restrictions.every((r) => recipe.tags.includes(r));
}

function hasDislike(recipe: Recipe, dislikes: Set<string>): boolean {
  if (dislikes.size === 0) return false;
  return recipe.ingredients.some((i) => dislikes.has(i.key));
}

/** Sustituto disponible de la misma categoría y rol culinario para lo que falta. */
function findSubstitute(
  missingKey: string,
  availableKeys: Set<string>,
  dislikes: Set<string>,
): string | null {
  const def = INGREDIENT_BY_KEY[missingKey];
  if (!def) return null;
  const role = getCulinary(missingKey).role;
  for (const k of availableKeys) {
    if (k === missingKey || dislikes.has(k)) continue;
    const d = INGREDIENT_BY_KEY[k];
    if (d && d.category === def.category && getCulinary(k).role === role) return k;
  }
  return null;
}

/** Fracción de pares de ingredientes principales que son culinariamente afines. */
function affinityScore(recipe: Recipe): number {
  const mains = recipe.ingredients.filter((i) => !isStaple(i)).map((i) => i.key);
  if (mains.length < 2) return 0.5;
  let affine = 0;
  let pairs = 0;
  for (let i = 0; i < mains.length; i++) {
    for (let j = i + 1; j < mains.length; j++) {
      pairs++;
      const a = getCulinary(mains[i]).affinities.includes(mains[j]);
      const b = getCulinary(mains[j]).affinities.includes(mains[i]);
      if (a || b) affine++;
    }
  }
  return pairs === 0 ? 0.5 : affine / pairs;
}

interface Analyzed {
  recipe: Recipe;
  usesFromTicket: string[];
  pantryBasics: string[];
  missing: RecipeIngredient[];
  substitutions: Substitution[];
  coverage: number;
}

/** Analiza la cobertura de una receta contra la despensa/ticket. */
export function analyzeCoverage(
  recipe: Recipe,
  availableKeys: Set<string>,
  dislikes: Set<string> = new Set(),
): Analyzed {
  const usesFromTicket: string[] = [];
  const pantryBasics: string[] = [];
  const missing: RecipeIngredient[] = [];
  const substitutions: Substitution[] = [];
  const mains: string[] = [];
  let covered = 0;

  for (const ing of recipe.ingredients) {
    if (isStaple(ing)) {
      pantryBasics.push(ing.key);
      continue;
    }
    mains.push(ing.key);
    if (availableKeys.has(ing.key)) {
      usesFromTicket.push(ing.key);
      covered++;
    } else {
      const sub = findSubstitute(ing.key, availableKeys, dislikes);
      if (sub) {
        substitutions.push({ missing: ing.key, use: sub });
        covered++; // cubierto por sustituto
      } else {
        missing.push({ key: ing.key, name: ing.name });
      }
    }
  }
  const coverage = mains.length === 0 ? 1 : covered / mains.length;
  return { recipe, usesFromTicket, pantryBasics, missing, substitutions, coverage };
}

/**
 * Devuelve un lote de sugerencias diverso y no repetitivo para las condiciones
 * dadas. Combina catálogo + generación, puntúa, respeta cooldown y elige por MMR.
 */
export function suggestRecipes(availableKeys: Set<string>, opts: SuggestOptions = {}): Suggestion[] {
  const cfg = opts.config ?? DEFAULT_CONFIG;
  const restrictions = opts.restrictions ?? [];
  const dislikes = new Set(opts.dislikes ?? []);
  const history = opts.history ?? [];
  const count = opts.count ?? 4;
  const seed =
    opts.seed ?? hashSeed([...availableKeys].sort().join(',') + (opts.slot ?? '') + (opts.goal ?? ''));

  // 1) candidatos: catálogo + generados
  const catalog = RECIPES.filter(
    (r) =>
      (!opts.slot || r.slot.includes(opts.slot)) &&
      passesRestrictions(r, restrictions) &&
      !hasDislike(r, dislikes),
  );
  const generated =
    opts.includeGenerated === false
      ? []
      : generateRecipes(availableKeys, {
          seed,
          goal: opts.goal,
          slot: opts.slot,
          restrictions,
          dislikes: [...dislikes],
          max: 10,
        });
  const candidates = [...catalog, ...generated];

  // 2) puntuar
  const w = cfg.weights;
  const scored: (Scored & { analyzed: Analyzed })[] = candidates.map((recipe) => {
    const analyzed = analyzeCoverage(recipe, availableKeys, dislikes);
    const affinity = affinityScore(recipe);
    const novelty = recipe.generated ? 1 : 0.4;
    const goalBonus = opts.goal && recipe.goals.includes(opts.goal) ? 0.8 : 0;
    const rep = recencyPenalty(history, recipe, cfg.antiRepeat);
    const relevance =
      w.coverage * analyzed.coverage +
      w.affinity * affinity +
      w.novelty * novelty +
      goalBonus -
      w.repetition * rep -
      w.missing * analyzed.missing.length;
    return { recipe, relevance, analyzed };
  });

  // 3) filtrar cooldown (si vacía demasiado, se relaja)
  let pool = scored.filter((s) => !inCooldown(history, s.recipe, cfg.antiRepeat));
  if (pool.length < count) pool = scored;

  // 4) selección por MMR
  pool.sort((a, b) => b.relevance - a.relevance);
  const chosen = selectMMR(pool, count, cfg.mmrLambda);

  // 5) mapear a Suggestion con la cobertura ya calculada
  const byId = new Map(scored.map((s) => [s.recipe.id, s]));
  return chosen.map((recipe) => {
    const s = byId.get(recipe.id)!;
    return {
      recipe,
      usesFromTicket: s.analyzed.usesFromTicket,
      pantryBasics: s.analyzed.pantryBasics,
      missing: s.analyzed.missing,
      substitutions: s.analyzed.substitutions,
      coverage: s.analyzed.coverage,
      score: s.relevance,
    };
  });
}
