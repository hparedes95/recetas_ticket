// Flujo "recomiéndame la semana" (inverso al de ticket → despensa).
//
// El usuario NO parte de lo que tiene: la app propone un plan semanal optimizado
// por su objetivo y le dice exactamente qué comprar. La despensa actual solo se
// usa para DESCONTAR lo que ya tenga de la lista de la compra.
//
// Lógica pura (sin React Native) → testeable en node.
import { DietGoal, MealPlan, Preferences, Product, Recipe } from '../types';
import { INGREDIENTS, INGREDIENT_BY_KEY } from '../data/ingredients';
import { RECIPE_BY_ID } from '../data/recipes';
import { generatePlanForGoal } from './planner';
import { generateRecipes } from './generator';
import { gramsOf } from '../data/nutrition';

/**
 * Universo de ingredientes "comprables": todo lo que la app conoce, salvo cosas
 * que no son ingredientes de receta (bebidas, dulces/snacks). Se usa como
 * "disponible" al planificar para que el plan NO esté limitado por la despensa.
 */
export function shoppableUniverse(): Set<string> {
  const keys = INGREDIENTS.filter(
    (d) => d.category !== 'bebida' && d.category !== 'dulce',
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
  const universe = shoppableUniverse();
  const target: DietGoal = goal ?? prefs.defaultGoal;

  // Recetas generadas a partir del universo (creatividad sin límite de despensa)
  const generated = generateRecipes(universe, {
    seed: seed ?? (Date.now() >>> 0),
    goal: target,
    restrictions: prefs.restrictions,
    dislikes: prefs.dislikes,
    max: 12,
  });

  // Planificamos como si tuviéramos todo: el plan se optimiza por objetivo
  const fakePantry: Product[] = [...universe].map((k, i) => ({
    id: `u${i}`,
    raw: k,
    ingredientKey: k,
    displayName: INGREDIENT_BY_KEY[k]?.name ?? k,
    source: 'manual',
    addedAt: 0,
  }));

  const plan = generatePlanForGoal(fakePantry, prefs, target, generated);

  const recipes: Record<string, Recipe> = {};
  for (const r of generated) recipes[r.id] = r;

  // Qué comprar: cantidades de la semana escaladas por personas, descontando
  // lo que el usuario ya tiene en la despensa.
  const recipeMap: Record<string, Recipe> = { ...RECIPE_BY_ID, ...recipes };
  const needs = shoppingNeedsFromPlan(plan, pantry, recipeMap, prefs.people);

  return { plan, recipes, needs };
}
