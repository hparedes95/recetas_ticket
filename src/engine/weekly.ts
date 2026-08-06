// Planificador de la SEMANA para el flujo "recomiéndame".
//
// Reglas que cumple, por diseño:
//  1. CERO repeticiones: cada comida de la semana es una receta distinta.
//  2. Platos fáciles: se filtran por tiempo y nº de pasos.
//  3. Estándares dietéticos (AESAN 2022 / Dieta Mediterránea): reparto semanal
//     de legumbres, pescado, aves y carne roja en las comidas principales.
//  4. Se acerca al objetivo de calorías del día con un factor de ración natural.
//
// Lógica pura (sin React Native) → testeable en node.
import { MacroSplit, MealSlot, PlannedMeal, Recipe } from '../types';
import { proteinGroupOf, ProteinGroup, WEEKLY_MAIN_QUOTA, WEEKLY_MAIN_MAX, isEasy } from '../data/dietary';
import { macroMatch } from './planner';
import { Rng } from './rng';

const DAYS = 7;
const PORTION_MIN = 0.85;
const PORTION_MAX = 1.2;

export interface WeeklyInput {
  slots: MealSlot[];
  /** Recetas candidatas por comida (ya filtradas por restricciones y dislikes) */
  poolsBySlot: Partial<Record<MealSlot, Recipe[]>>;
  /** kcal objetivo por día (null = sin objetivo) */
  targetKcal: number | null;
  /** kcal objetivo por comida */
  slotKcal: Partial<Record<MealSlot, number>>;
  macroSplit: MacroSplit | null;
  rng: Rng;
}

/** Puntúa cuánto encaja una receta en una comida (calorías, macros, sencillez). */
function fitScore(
  recipe: Recipe,
  slotTarget: number | undefined,
  macroSplit: MacroSplit | null,
): number {
  let s = 0;
  if (slotTarget && slotTarget > 0) {
    const diff = Math.abs(recipe.macros.kcal - slotTarget) / slotTarget;
    s += (1 - Math.min(1, diff)) * 2;
  }
  if (macroSplit) s += macroMatch(recipe.macros, macroSplit) * 1.5;
  // sencillez: premia lo rápido y de pocos pasos
  s += Math.max(0, (45 - recipe.timeMinutes) / 45) * 0.8;
  s += Math.max(0, (6 - recipe.steps.length) / 6) * 0.4;
  return s;
}

/**
 * Construye la secuencia de grupos proteicos de las 14 comidas principales
 * repartiendo las cuotas semanales y alternando para que no salgan seguidas.
 */
function buildGroupPlan(mainCount: number, rng: Rng): ProteinGroup[] {
  const demand: ProteinGroup[] = [];
  for (const [group, n] of Object.entries(WEEKLY_MAIN_QUOTA) as [ProteinGroup, number][]) {
    for (let i = 0; i < n; i++) demand.push(group);
  }
  // Ajusta al número real de comidas principales
  while (demand.length < mainCount) demand.push('legumbre');
  const seq = rng.shuffle(demand).slice(0, mainCount);

  // Evita dos iguales consecutivos si se puede
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) {
      const j = seq.findIndex((g, k) => k > i && g !== seq[i]);
      if (j > 0) [seq[i], seq[j]] = [seq[j], seq[i]];
    }
  }
  return seq;
}

/**
 * Monta la semana completa SIN repetir ninguna receta y respetando las cuotas
 * dietéticas en las comidas principales.
 */
export function buildWeeklyMenu(input: WeeklyInput): PlannedMeal[] {
  const { slots, poolsBySlot, targetKcal, slotKcal, macroSplit, rng } = input;
  const used = new Set<string>(); // ids ya usados en TODA la semana
  const meals: PlannedMeal[] = [];

  const mainSlots = slots.filter((s) => s === 'comida' || s === 'cena');
  const otherSlots = slots.filter((s) => s !== 'comida' && s !== 'cena');

  // Orden de asignación: primero las comidas principales (con cuotas), después el resto
  const groupPlan = buildGroupPlan(DAYS * mainSlots.length, rng);
  const groupCount: Record<string, number> = {};
  let gi = 0;

  const chosen: PlannedMeal[] = [];

  for (let day = 0; day < DAYS; day++) {
    for (const slot of mainSlots) {
      const pool = (poolsBySlot[slot] ?? []).filter((r) => !used.has(r.id));
      if (pool.length === 0) continue;
      const wanted = groupPlan[gi++] ?? 'legumbre';

      const scoreOf = (r: Recipe) => fitScore(r, slotKcal[slot], macroSplit);
      const maxFor = (g: ProteinGroup) => WEEKLY_MAIN_MAX[g] ?? Infinity;

      // 1) candidatos del grupo pedido que no superen su tope semanal
      let candidates = pool.filter((r) => {
        const g = proteinGroupOf(r);
        return g === wanted && (groupCount[g] ?? 0) < maxFor(g);
      });
      // 2) si no hay, cualquier grupo que no haya alcanzado su tope
      if (candidates.length === 0) {
        candidates = pool.filter((r) => {
          const g = proteinGroupOf(r);
          return (groupCount[g] ?? 0) < maxFor(g);
        });
      }
      // 3) último recurso: cualquiera sin usar (nunca dejamos hueco)
      if (candidates.length === 0) candidates = pool;

      const pick = candidates.sort((a, b) => scoreOf(b) - scoreOf(a))[0];
      used.add(pick.id);
      const g = proteinGroupOf(pick);
      groupCount[g] = (groupCount[g] ?? 0) + 1;
      chosen.push({ day, slot, recipeId: pick.id, coverage: 0 });
    }

    for (const slot of otherSlots) {
      const pool = (poolsBySlot[slot] ?? []).filter((r) => !used.has(r.id));
      if (pool.length === 0) continue;
      const pick = pool.sort(
        (a, b) => fitScore(b, slotKcal[slot], macroSplit) - fitScore(a, slotKcal[slot], macroSplit),
      )[0];
      used.add(pick.id);
      chosen.push({ day, slot, recipeId: pick.id, coverage: 0 });
    }
  }

  // Factor de ración por día para acercarse al objetivo de calorías
  const byId = new Map<string, Recipe>();
  for (const slot of slots) for (const r of poolsBySlot[slot] ?? []) byId.set(r.id, r);

  for (let day = 0; day < DAYS; day++) {
    const dayMeals = chosen.filter((m) => m.day === day);
    let factor = 1;
    if (targetKcal && targetKcal > 0) {
      const base = dayMeals.reduce((s, m) => s + (byId.get(m.recipeId)?.macros.kcal ?? 0), 0);
      if (base > 0) factor = Math.max(PORTION_MIN, Math.min(PORTION_MAX, targetKcal / base));
    }
    for (const m of dayMeals) meals.push({ ...m, portionFactor: factor });
  }
  return meals;
}

/** Filtra un pool a recetas fáciles, dejando el original si quedan muy pocas. */
export function easyPool(recipes: Recipe[], minSize = 8): Recipe[] {
  const easy = recipes.filter((r) => isEasy(r));
  return easy.length >= minSize ? easy : recipes;
}
