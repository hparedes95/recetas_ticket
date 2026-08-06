// Estándares dietéticos aplicados al menú semanal.
//
// Basado en las recomendaciones de AESAN 2022 (Informe de recomendaciones
// dietéticas sostenibles) y en la pirámide de la Fundación Dieta Mediterránea:
//  - Legumbres: mínimo 4 raciones/semana, tendiendo a diario.
//  - Pescado: 2-3 raciones/semana (incluyendo pescado azul).
//  - Carne: 0-3 raciones/semana, priorizando AVES y CONEJO; minimizar carne roja
//    y procesada.
//  - Base vegetal diaria, AOVE como grasa principal, lácteos sin azúcar.
//
// Lógica pura (sin React Native) → testeable en node.
import { Recipe } from '../types';
import { INGREDIENT_BY_KEY } from './ingredients';

/** Grupo proteico principal de un plato, para repartir la semana. */
export type ProteinGroup =
  | 'legumbre'
  | 'pescado'
  | 'ave'
  | 'carne_roja'
  | 'huevo'
  | 'vegetal';

const LEGUMES = new Set(['garbanzos', 'lentejas', 'alubias', 'tofu', 'tempeh', 'seitan', 'edamame', 'hummus', 'conserva_legumbre']);
const POULTRY = new Set(['pollo', 'pavo', 'conejo']);
// Carne roja y procesada: a minimizar según AESAN.
const RED_MEAT = new Set(['ternera', 'cerdo', 'cordero', 'carne_picada', 'chorizo', 'bacon', 'salchicha', 'longaniza', 'salchichon', 'costillas', 'jamon']);

/** Clasifica el plato por su fuente de proteína principal. */
export function proteinGroupOf(recipe: Recipe): ProteinGroup {
  const keys = recipe.ingredients.filter((i) => !i.staple).map((i) => i.key);
  if (keys.some((k) => POULTRY.has(k))) return 'ave';
  if (keys.some((k) => INGREDIENT_BY_KEY[k]?.category === 'pescado')) return 'pescado';
  if (keys.some((k) => RED_MEAT.has(k))) return 'carne_roja';
  if (keys.some((k) => LEGUMES.has(k))) return 'legumbre';
  if (keys.some((k) => k === 'huevo')) return 'huevo';
  return 'vegetal';
}

/** Reparto objetivo de las 14 comidas principales (comida + cena) de la semana. */
export const WEEKLY_MAIN_QUOTA: Record<ProteinGroup, number> = {
  legumbre: 5, // ≥4 y tendiendo a diario
  pescado: 3, // 2-3 raciones, con azul incluido
  ave: 3, // carne priorizando aves/conejo
  carne_roja: 1, // minimizar (dentro del 0-3 total de carne)
  huevo: 1,
  vegetal: 1,
};

/** Límite máximo semanal por grupo (lo que NO se debe superar). */
export const WEEKLY_MAIN_MAX: Partial<Record<ProteinGroup, number>> = {
  carne_roja: 2,
  ave: 4,
};

/** ¿Es un plato sencillo para el usuario medio? (tiempo y nº de pasos) */
export function isEasy(recipe: Recipe, maxMinutes = 40, maxSteps = 5): boolean {
  return recipe.timeMinutes <= maxMinutes && recipe.steps.length <= maxSteps;
}

// Bases de fécula que hacen un plato "de comida" (contundente). En la cena, la
// costumbre mediterránea es algo más ligero: pescado, verduras, huevo, cremas o
// ensaladas, no un plato de pasta o arroz.
const HEAVY_STARCH = new Set([
  'pasta', 'arroz', 'patata', 'pan', 'pizza_base', 'tortilla_wrap', 'noodles', 'polenta', 'cuscus',
]);

/** ¿El plato se apoya en una base de fécula en cantidad de plato principal? */
export function hasHeavyStarchBase(recipe: Recipe): boolean {
  return recipe.ingredients.some(
    (i) => !i.staple && HEAVY_STARCH.has(i.key) && (i.quantity ?? 0) >= 60,
  );
}

/** Tope de calorías por ración para considerar un plato apto de cena. */
export const DINNER_KCAL_MAX = 600;

/**
 * ¿Es un plato coherente para CENAR? Cena ligera: sin plato de pasta/arroz/
 * patata como base y sin excederse de calorías. (El desayuno y la comida no
 * tienen esta restricción.)
 */
export function isSuitableForDinner(recipe: Recipe): boolean {
  if (!recipe.slot.includes('cena')) return false;
  if (hasHeavyStarchBase(recipe)) return false;
  return recipe.macros.kcal <= DINNER_KCAL_MAX;
}

/** ¿Es coherente como COMIDA principal del día? (el plato fuerte) */
export function isSuitableForLunch(recipe: Recipe): boolean {
  return recipe.slot.includes('comida');
}

/** Resumen de cumplimiento dietético de una semana de comidas principales. */
export function weeklyCompliance(mainRecipes: Recipe[]): {
  counts: Record<ProteinGroup, number>;
  legumbresOk: boolean;
  pescadoOk: boolean;
  carneRojaOk: boolean;
} {
  const counts: Record<ProteinGroup, number> = {
    legumbre: 0, pescado: 0, ave: 0, carne_roja: 0, huevo: 0, vegetal: 0,
  };
  for (const r of mainRecipes) counts[proteinGroupOf(r)] += 1;
  return {
    counts,
    legumbresOk: counts.legumbre >= 4,
    pescadoOk: counts.pescado >= 2,
    carneRojaOk: counts.carne_roja <= 3,
  };
}
