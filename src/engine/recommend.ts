// Flujo "recomiéndame la semana" (inverso al de ticket → despensa).
//
// El usuario NO parte de lo que tiene: la app propone un plan semanal optimizado
// por su objetivo y le dice exactamente qué comprar. La despensa actual solo se
// usa para DESCONTAR lo que ya tenga de la lista de la compra.
//
// Lógica pura (sin React Native) → testeable en node.
import { DietGoal, MealPlan, MealSlot, Preferences, Product, Recipe } from '../types';
import { INGREDIENTS, INGREDIENT_BY_KEY } from '../data/ingredients';
import { RECIPE_BY_ID } from '../data/recipes';
import { coverageOf, buildTargets, computeMissing, computeAvgDailyMacros } from './planner';
import { generateRecipes } from './generator';
import { buildWeeklyMenu, easyPool } from './weekly';
import { makeRng } from './rng';
import { RECIPES } from '../data/recipes';
import { goalMeta } from '../theme';
import { newId } from './ticketParser';
import { gramsOf } from '../data/nutrition';

// Ultraprocesados/embutidos grasos: no los recomendamos por defecto en objetivos
// saludables (sí en "cheat", que es justo para caprichos).
const INDULGENT = new Set([
  'chorizo', 'bacon', 'salchicha', 'longaniza', 'salchichon', 'costillas',
  'snack_salado', 'bolleria', 'helado', 'chuches', 'pizza_base', 'nata',
]);

/**
 * Universo de ingredientes "comprables": todo lo que la app conoce, salvo cosas
 * que no son ingredientes de receta (bebidas, dulces/snacks). Se usa como
 * "disponible" al planificar para que el plan NO esté limitado por la despensa.
 * En objetivos saludables se excluyen además los embutidos/ultraprocesados.
 */
export function shoppableUniverse(goal?: DietGoal): Set<string> {
  const allowIndulgent = goal === 'cheat';
  const keys = INGREDIENTS.filter(
    (d) =>
      d.category !== 'bebida' &&
      d.category !== 'dulce' &&
      (allowIndulgent || !INDULGENT.has(d.key)),
  ).map((d) => d.key);
  return new Set(keys);
}

/** Ítem de la lista de la compra del plan recomendado, con cantidad agregada. */
export interface ShoppingNeed {
  key: string;
  name: string;
  /** Categoría para agrupar por pasillo */
  category: string;
  /** Cantidad total necesaria para la semana (ya escalada por personas) */
  quantity: number;
  unit: string;
  /** En cuántas comidas del plan se usa */
  usedIn: number;
  checked: boolean;
  /** true si ya lo tienes en la despensa (no hace falta comprarlo) */
  alreadyHave: boolean;
}

// Unidades que se pueden sumar entre sí (todo lo demás se convierte a gramos).
const COUNTABLE = new Set(['ud', 'rebanadas', 'loncha', 'rama', 'manojo', 'manojos', 'cda', 'cdta']);

// Ingredientes que se compran en volumen (se muestran en ml/l, no en gramos).
const LIQUID = new Set(['leche', 'leche_vegetal', 'leche_coco', 'caldo', 'nata', 'vino', 'zumo', 'agua']);

// Piezas grandes: no tiene sentido pedir "8 pollos enteros" para una semana.
const BULKY = new Set(['pollo', 'conejo', 'calabaza', 'coliflor', 'brocoli', 'melon', 'pina']);

// Tope de unidades por semana para fruta/verdura que se compra por pieza: evita
// listas irreales ("37 tomates") cuando el mismo ingrediente sale en muchas
// recetas. Se escala con el nº de personas.
const MAX_UNITS_PER_PERSON = 7;

function prettyQuantity(grams: number, key: string): { quantity: number; unit: string } {
  const liquid = LIQUID.has(key);
  if (grams >= 1000) {
    return {
      quantity: Math.round((grams / 1000) * 10) / 10,
      unit: liquid ? 'l' : 'kg',
    };
  }
  // redondeo a 10 g/ml para que sea una cifra de compra realista
  return { quantity: Math.max(10, Math.round(grams / 10) * 10), unit: liquid ? 'ml' : 'g' };
}

/**
 * Lista de la compra del plan con CANTIDADES AGREGADAS de toda la semana,
 * escaladas por el nº de personas. Marca lo que ya tienes en la despensa.
 */
export function shoppingNeedsFromPlan(
  plan: MealPlan,
  pantry: Product[],
  recipeMap: Record<string, Recipe>,
  people = 1,
): ShoppingNeed[] {
  const have = new Set(pantry.map((p) => p.ingredientKey));
  // acumulamos por clave: gramos (para lo pesable) o unidades (para lo contable)
  const acc = new Map<
    string,
    { grams: number; count: number; unit: string; usedIn: number; countable: boolean }
  >();

  for (const meal of plan.meals) {
    const recipe = recipeMap[meal.recipeId];
    if (!recipe) continue;
    const factor = (meal.portionFactor ?? 1) * Math.max(1, people) / Math.max(1, recipe.servings);
    for (const ing of recipe.ingredients) {
      const def = INGREDIENT_BY_KEY[ing.key];
      if (!def) continue;
      const isStaple = ing.staple === true || def.staple === true;
      if (isStaple) continue; // los básicos no se compran

      const unit = (ing.unit ?? '').toLowerCase();
      const countable = COUNTABLE.has(unit);
      const entry =
        acc.get(ing.key) ?? { grams: 0, count: 0, unit: countable ? unit : 'g', usedIn: 0, countable };
      if (countable) {
        entry.count += (ing.quantity ?? 1) * factor;
        entry.countable = true;
        entry.unit = unit;
      } else {
        entry.grams += gramsOf(ing.key, ing.quantity, ing.unit) * factor;
      }
      entry.usedIn += 1;
      acc.set(ing.key, entry);
    }
  }

  const needs: ShoppingNeed[] = [];
  for (const [key, v] of acc) {
    const def = INGREDIENT_BY_KEY[key];
    // Topes de sensatez para lo que se compra por pieza: las piezas grandes
    // (pollo entero, calabaza…) no se compran por decenas, y la fruta/verdura se
    // limita a un máximo semanal por persona para evitar listas irreales.
    let cappedCount = v.count;
    if (BULKY.has(key)) {
      cappedCount = Math.min(cappedCount, 2);
    } else if (def && (def.category === 'verdura' || def.category === 'fruta')) {
      cappedCount = Math.min(cappedCount, MAX_UNITS_PER_PERSON * Math.max(1, people));
    }
    const q = v.countable
      ? { quantity: Math.max(1, Math.round(cappedCount)), unit: v.unit }
      : prettyQuantity(v.grams, key);
    needs.push({
      key,
      name: def?.name ?? key,
      category: def?.category ?? 'otro',
      quantity: q.quantity,
      unit: q.unit,
      usedIn: v.usedIn,
      checked: false,
      alreadyHave: have.has(key),
    });
  }
  // primero lo que hay que comprar, luego por uso y nombre
  return needs.sort(
    (a, b) =>
      Number(a.alreadyHave) - Number(b.alreadyHave) ||
      b.usedIn - a.usedIn ||
      a.name.localeCompare(b.name),
  );
}

export interface RecommendResult {
  plan: MealPlan;
  /** Recetas generadas para este plan (hay que guardarlas para resolver sus ids) */
  recipes: Record<string, Recipe>;
  needs: ShoppingNeed[];
}

/**
 * Recomienda un plan semanal SIN depender de la despensa: planifica sobre el
 * universo de ingredientes comprables y después calcula qué hay que comprar,
 * descontando lo que ya tienes.
 */
export function recommendPlan(
  prefs: Preferences,
  pantry: Product[] = [],
  goal?: DietGoal,
  seed?: number,
): RecommendResult {
  const target: DietGoal = goal ?? prefs.defaultGoal;
  const universe = shoppableUniverse(target);

  // Recetas generadas a partir del universo (creatividad sin límite de despensa)
  const generated = generateRecipes(universe, {
    seed: seed ?? (Date.now() >>> 0),
    goal: target,
    restrictions: prefs.restrictions,
    dislikes: prefs.dislikes,
    max: 12,
  });

  const recipes: Record<string, Recipe> = {};
  for (const r of generated) recipes[r.id] = r;
  const recipeMap: Record<string, Recipe> = { ...RECIPE_BY_ID, ...recipes };

  // Candidatos por comida: catálogo + generadas, SOLO platos sencillos y que
  // respeten las restricciones del usuario. Los ingredientes están todos
  // disponibles (es una lista de la compra), así que no filtramos por despensa.
  const slots: MealSlot[] = prefs.mealsPerDay.length > 0 ? prefs.mealsPerDay : ['comida', 'cena'];
  const dislikes = new Set(prefs.dislikes);
  const candidates = [...RECIPES, ...generated].filter(
    (r) =>
      prefs.restrictions.every((t) => r.tags.includes(t)) &&
      !r.ingredients.some((i) => dislikes.has(i.key)) &&
      r.ingredients.every((i) => universe.has(i.key) || INGREDIENT_BY_KEY[i.key]?.staple),
  );

  const poolsBySlot: Partial<Record<MealSlot, Recipe[]>> = {};
  for (const slot of slots) {
    poolsBySlot[slot] = easyPool(candidates.filter((r) => r.slot.includes(slot)));
  }

  // Semana SIN repetir ninguna comida y con las cuotas dietéticas (AESAN/DM)
  const targets = buildTargets(prefs, slots);
  const meals = buildWeeklyMenu({
    slots,
    poolsBySlot,
    targetKcal: prefs.calorieTarget ?? null,
    slotKcal: targets.slotKcal,
    macroSplit: targets.macroSplit,
    rng: makeRng(seed ?? (Date.now() >>> 0)),
  });

  // Cobertura contra la despensa REAL (aquí normalmente habrá que comprarlo todo)
  const realKeys = new Set(pantry.map((p) => p.ingredientKey));
  const withCoverage = meals.map((m) => {
    const r = recipeMap[m.recipeId];
    return r ? { ...m, coverage: coverageOf(r, realKeys) } : m;
  });

  const meta = goalMeta[target];
  const plan: MealPlan = {
    id: newId('rec'),
    goal: target,
    title: meta.label,
    subtitle: meta.description,
    meals: withCoverage,
    missing: computeMissing(withCoverage, realKeys, recipeMap),
    avgDailyMacros: computeAvgDailyMacros(withCoverage, recipeMap),
    calorieTarget: prefs.calorieTarget ?? null,
    macroSplit: prefs.macroSplit ?? null,
    createdAt: Date.now(),
  };

  // Qué comprar: cantidades de la semana escaladas por personas, descontando
  // lo que el usuario ya tiene en la despensa.
  const needs = shoppingNeedsFromPlan(plan, pantry, recipeMap, prefs.people);

  return { plan, recipes, needs };
}
