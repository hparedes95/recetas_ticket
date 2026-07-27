import {
  DietGoal,
  MacroSplit,
  MealPlan,
  MealSlot,
  PlannedMeal,
  Preferences,
  Product,
  Recipe,
  RecipeIngredient,
  Macros,
} from '../types';
import { RECIPES, RECIPE_BY_ID } from '../data/recipes';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { goalMeta } from '../theme';
import { newId } from './ticketParser';

/** Reparto aproximado del objetivo de calorías entre las comidas del día */
const SLOT_KCAL_WEIGHT: Record<MealSlot, number> = {
  desayuno: 0.25,
  comida: 0.35,
  cena: 0.3,
  snack: 0.1,
};

/** Reparto de macros de una receta como fracciones (proteína/carbos/grasa del total kcal) */
export function macroFractions(m: Macros): { p: number; c: number; f: number } {
  const kcal = m.protein * 4 + m.carbs * 4 + m.fat * 9 || 1;
  return { p: (m.protein * 4) / kcal, c: (m.carbs * 4) / kcal, f: (m.fat * 9) / kcal };
}

/** Cercanía 0..1 entre el reparto de macros de una receta y el objetivo (%) */
export function macroMatch(m: Macros, split: MacroSplit): number {
  const a = macroFractions(m);
  const t = { p: split.protein / 100, c: split.carbs / 100, f: split.fat / 100 };
  const dist = (Math.abs(a.p - t.p) + Math.abs(a.c - t.c) + Math.abs(a.f - t.f)) / 2; // 0..1
  return 1 - dist;
}

/** Objetivos por comida derivados del objetivo diario y las comidas elegidas */
interface Targets {
  slotKcal: Partial<Record<MealSlot, number>>;
  macroSplit: MacroSplit | null;
}

function buildTargets(prefs: Preferences, slots: MealSlot[]): Targets {
  const slotKcal: Partial<Record<MealSlot, number>> = {};
  if (prefs.calorieTarget && prefs.calorieTarget > 0) {
    const totalWeight = slots.reduce((s, sl) => s + SLOT_KCAL_WEIGHT[sl], 0) || 1;
    for (const sl of slots) {
      slotKcal[sl] = prefs.calorieTarget * (SLOT_KCAL_WEIGHT[sl] / totalWeight);
    }
  }
  return { slotKcal, macroSplit: prefs.macroSplit ?? null };
}

/** ¿Es un ingrediente básico de despensa que no penaliza si "falta"? */
function isStaple(ing: RecipeIngredient): boolean {
  return ing.staple === true || INGREDIENT_BY_KEY[ing.key]?.staple === true;
}

/** Ingredientes "principales" de una receta (los que de verdad importan) */
function mainIngredients(recipe: Recipe): RecipeIngredient[] {
  return recipe.ingredients.filter((i) => !isStaple(i));
}

/** Cobertura 0..1: fracción de ingredientes principales que ya tienes */
export function coverageOf(recipe: Recipe, availableKeys: Set<string>): number {
  const main = mainIngredients(recipe);
  if (main.length === 0) return 1;
  const have = main.filter((i) => availableKeys.has(i.key)).length;
  return have / main.length;
}

/** ¿La receta respeta las restricciones dietéticas del usuario? */
function passesRestrictions(recipe: Recipe, prefs: Preferences): boolean {
  return prefs.restrictions.every((r) => recipe.tags.includes(r));
}

/** ¿La receta contiene algún ingrediente que el usuario no quiere? */
function hasDislike(recipe: Recipe, prefs: Preferences): boolean {
  if (prefs.dislikes.length === 0) return false;
  return recipe.ingredients.some((i) => prefs.dislikes.includes(i.key));
}

interface ScoredRecipe {
  recipe: Recipe;
  coverage: number;
  score: number;
}

function scoreRecipe(
  recipe: Recipe,
  availableKeys: Set<string>,
  goal: DietGoal,
  slotTargetKcal?: number,
  macroSplit?: MacroSplit | null,
): ScoredRecipe {
  const coverage = coverageOf(recipe, availableKeys);
  let score = coverage * 1.6; // aprovechar la despensa importa mucho
  if (recipe.goals.includes(goal)) score += 2.2; // pero el objetivo manda

  // Ajuste por objetivo para que cada menú "sepa" a lo que promete
  const kcal = recipe.macros.kcal;
  switch (goal) {
    case 'bajar_calorias':
      score += (500 - kcal) / 500; // premia lo bajo en calorías
      break;
    case 'proteico':
      score += recipe.macros.protein / 50; // premia la proteína
      break;
    case 'cheat':
      score += (kcal - 400) / 600; // premia los caprichos
      break;
    case 'economico':
      score += coverage * 0.4; // aprovechar aún más lo que hay
      break;
    default:
      break;
  }

  // Objetivo de calorías: premia recetas cuya ración se acerca a lo previsto para esa comida
  if (slotTargetKcal && slotTargetKcal > 0) {
    const diff = Math.abs(kcal - slotTargetKcal) / slotTargetKcal;
    score += (1 - Math.min(1, diff)) * 1.8;
  }

  // Reparto de macros: premia recetas cuyo perfil se acerca al deseado
  if (macroSplit) {
    score += macroMatch(recipe.macros, macroSplit) * 1.2;
  }

  // pequeño empujón determinista para dar variedad estable a la semana
  score += (hashString(recipe.id + goal) % 100) / 1000;
  return { recipe, coverage, score };
}

/** hash determinista sencillo para desempatar/rotar sin aleatoriedad real */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function candidatesForSlot(
  slot: MealSlot,
  availableKeys: Set<string>,
  goal: DietGoal,
  prefs: Preferences,
  targets: Targets,
): ScoredRecipe[] {
  return RECIPES.filter(
    (r) => r.slot.includes(slot) && passesRestrictions(r, prefs) && !hasDislike(r, prefs),
  )
    .map((r) => scoreRecipe(r, availableKeys, goal, targets.slotKcal[slot], targets.macroSplit))
    .sort((a, b) => b.score - a.score);
}

const DAYS = 7;

// Límites del escalado de raciones para acercarse al objetivo de calorías
const PORTION_MIN = 0.5;
const PORTION_MAX = 2.5;

/** Ajusta el tamaño de las raciones de cada día para acercarse al objetivo de kcal */
function applyPortionScaling(meals: PlannedMeal[], calorieTarget: number | null) {
  if (!calorieTarget || calorieTarget <= 0) return;
  const byDay = new Map<number, PlannedMeal[]>();
  for (const m of meals) {
    if (!byDay.has(m.day)) byDay.set(m.day, []);
    byDay.get(m.day)!.push(m);
  }
  for (const dayMeals of byDay.values()) {
    const base = dayMeals.reduce((s, m) => s + (RECIPE_BY_ID[m.recipeId]?.macros.kcal ?? 0), 0);
    if (base <= 0) continue;
    const factor = Math.max(PORTION_MIN, Math.min(PORTION_MAX, calorieTarget / base));
    for (const m of dayMeals) m.portionFactor = factor;
  }
}

/** Genera un plan semanal para un objetivo concreto */
export function generatePlanForGoal(
  pantry: Product[],
  prefs: Preferences,
  goal: DietGoal,
): MealPlan {
  const availableKeys = new Set(pantry.map((p) => p.ingredientKey));
  const slots = prefs.mealsPerDay.length > 0 ? prefs.mealsPerDay : (['comida', 'cena'] as MealSlot[]);
  const targets = buildTargets(prefs, slots);

  const meals: PlannedMeal[] = [];

  for (const slot of slots) {
    const candidates = candidatesForSlot(slot, availableKeys, goal, prefs, targets);
    if (candidates.length === 0) continue;
    // Rotamos por los mejores candidatos para dar variedad a la semana.
    // El desplazamiento inicial depende del objetivo para que cada plan difiera.
    const offset = hashString(goal + slot) % candidates.length;
    for (let day = 0; day < DAYS; day++) {
      const pick = candidates[(offset + day) % candidates.length];
      meals.push({
        day,
        slot,
        recipeId: pick.recipe.id,
        coverage: pick.coverage,
      });
    }
  }

  applyPortionScaling(meals, prefs.calorieTarget ?? null);

  const missing = computeMissing(meals, availableKeys);
  const avgDailyMacros = computeAvgDailyMacros(meals);

  const meta = goalMeta[goal];
  return {
    id: newId('plan'),
    goal,
    title: meta.label,
    subtitle: meta.description,
    meals,
    missing,
    avgDailyMacros,
    calorieTarget: prefs.calorieTarget ?? null,
    macroSplit: prefs.macroSplit ?? null,
    createdAt: Date.now(),
  };
}

/** Ingredientes que faltan por comprar para completar el plan (sin básicos) */
export function computeMissing(
  meals: PlannedMeal[],
  availableKeys: Set<string>,
): RecipeIngredient[] {
  const byKey = new Map<string, RecipeIngredient>();
  for (const m of meals) {
    const recipe = RECIPE_BY_ID[m.recipeId];
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      if (isStaple(ing)) continue;
      if (availableKeys.has(ing.key)) continue;
      if (!byKey.has(ing.key)) {
        byKey.set(ing.key, { key: ing.key, name: ing.name });
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function computeAvgDailyMacros(meals: PlannedMeal[]): Macros {
  const total: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) {
    const r = RECIPE_BY_ID[m.recipeId];
    if (!r) continue;
    const f = m.portionFactor ?? 1;
    total.kcal += r.macros.kcal * f;
    total.protein += r.macros.protein * f;
    total.carbs += r.macros.carbs * f;
    total.fat += r.macros.fat * f;
  }
  return {
    kcal: Math.round(total.kcal / DAYS),
    protein: Math.round(total.protein / DAYS),
    carbs: Math.round(total.carbs / DAYS),
    fat: Math.round(total.fat / DAYS),
  };
}

/** Objetivos que se ofrecen como opciones de plan, con el preferido primero */
export function planGoalsFor(prefs: Preferences): DietGoal[] {
  const all: DietGoal[] = ['saludable', 'bajar_calorias', 'proteico', 'cheat', 'economico'];
  const preferred = prefs.defaultGoal;
  return [preferred, ...all.filter((g) => g !== preferred)];
}

/** Genera todas las opciones de plan (una por objetivo) */
export function generatePlans(pantry: Product[], prefs: Preferences): MealPlan[] {
  return planGoalsFor(prefs).map((goal) => generatePlanForGoal(pantry, prefs, goal));
}

/**
 * A partir de un plan, construye la lista de la compra sugerida, contando en
 * cuántas recetas se usa cada ingrediente que falta.
 */
export function shoppingListFromPlan(plan: MealPlan, pantry: Product[]) {
  const availableKeys = new Set(pantry.map((p) => p.ingredientKey));
  const counts = new Map<string, { name: string; usedIn: number }>();
  for (const m of plan.meals) {
    const recipe = RECIPE_BY_ID[m.recipeId];
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      if (isStaple(ing)) continue;
      if (availableKeys.has(ing.key)) continue;
      const entry = counts.get(ing.key);
      if (entry) entry.usedIn += 1;
      else counts.set(ing.key, { name: ing.name, usedIn: 1 });
    }
  }
  return Array.from(counts.entries())
    .map(([key, v]) => ({ key, name: v.name, usedIn: v.usedIn, checked: false }))
    .sort((a, b) => b.usedIn - a.usedIn || a.name.localeCompare(b.name));
}
