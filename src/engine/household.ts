// Motor del HOGAR: convierte varios perfiles familiares en unas preferencias
// efectivas que el motor de recetas ya sabe consumir.
//
// Idea clave: NO se generan menús distintos por persona (una familia cocina una
// vez). Se genera UN menú compartido que:
//   - excluye lo que NO quiere cualquier miembro (unión de dislikes),
//   - respeta las restricciones de todos (unión de restrictions),
//   - prioriza los favoritos de TODOS de forma equilibrada,
//   - y da a cada miembro su propia RACIÓN (un niño no come como un adulto).
//
// Lógica pura (sin React Native) → testeable en node.
import {
  AgeGroup,
  DietTag,
  HouseholdSettings,
  MealPlan,
  Preferences,
  Profile,
  Recipe,
} from '../types';
import { RECIPES } from '../data/recipes';
import { isEasy, isSuitableForDinner } from '../data/dietary';

/** Ración típica por etapa vital, respecto a un adulto (1 = ración de adulto). */
export const PORTION_BY_AGE: Record<AgeGroup, number> = {
  adulto: 1,
  adolescente: 0.85,
  nino: 0.55,
};

/** Calorías por defecto si el miembro no ha fijado un objetivo propio. */
export const DEFAULT_KCAL_BY_AGE: Record<AgeGroup, number> = {
  adulto: 2000,
  adolescente: 2200,
  nino: 1500,
};

export function newProfileId(): string {
  return 'pf_' + Math.random().toString(36).slice(2, 9);
}

/** Crea un miembro con valores sensatos. */
export function makeProfile(patch: Partial<Profile> = {}): Profile {
  const ageGroup = patch.ageGroup ?? 'adulto';
  return {
    id: patch.id ?? newProfileId(),
    name: patch.name ?? 'Nueva persona',
    emoji: patch.emoji ?? '🙂',
    ageGroup,
    restrictions: patch.restrictions ?? [],
    dislikes: patch.dislikes ?? [],
    likes: patch.likes ?? [],
    calorieTarget: patch.calorieTarget ?? null,
    macroSplit: patch.macroSplit ?? null,
    activeInPlan: patch.activeInPlan ?? true,
    isReference: patch.isReference,
  };
}

/** Miembros que cuentan para el menú y la compra de esta semana. */
export function activeProfiles(profiles: Profile[]): Profile[] {
  const active = profiles.filter((p) => p.activeInPlan);
  return active.length > 0 ? active : profiles;
}

/** El miembro al que se afinan las calorías del menú. */
export function referenceProfile(profiles: Profile[]): Profile | null {
  const active = activeProfiles(profiles);
  if (active.length === 0) return null;
  const marked = active.find((p) => p.isReference);
  if (marked) return marked;
  // por defecto, el adulto con el objetivo más alto
  return [...active].sort(
    (a, b) =>
      (b.calorieTarget ?? DEFAULT_KCAL_BY_AGE[b.ageGroup]) -
      (a.calorieTarget ?? DEFAULT_KCAL_BY_AGE[a.ageGroup]),
  )[0];
}

export interface MergedTastes {
  restrictions: DietTag[];
  dislikes: string[];
  likes: string[];
}

/**
 * Fusiona los gustos de la familia:
 *  - restricciones y "no quiero" se SUMAN (lo que veta uno, se veta para todos),
 *  - los favoritos se combinan de forma equilibrada (round-robin entre miembros)
 *    para que no manden solo los gustos de una persona.
 */
export function mergeProfiles(profiles: Profile[]): MergedTastes {
  const active = activeProfiles(profiles);
  const restrictions = new Set<DietTag>();
  const dislikes = new Set<string>();
  for (const p of active) {
    for (const r of p.restrictions) restrictions.add(r);
    for (const d of p.dislikes) dislikes.add(d);
  }
  // favoritos intercalados: 1º de cada uno, 2º de cada uno…
  const lists = active.map((p) => p.likes.filter((k) => !dislikes.has(k)));
  const likes: string[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const l of lists) {
      if (i < l.length && !likes.includes(l[i])) likes.push(l[i]);
    }
  }
  return { restrictions: [...restrictions], dislikes: [...dislikes], likes };
}

/** Nº de raciones de adulto equivalentes del hogar (puede ser fraccionario). */
export function householdServings(profiles: Profile[]): number {
  const active = activeProfiles(profiles);
  if (active.length === 0) return 1;
  return active.reduce((s, p) => s + PORTION_BY_AGE[p.ageGroup], 0);
}

/**
 * Preferencias EFECTIVAS del hogar: lo que se le pasa al motor de recetas.
 * El motor no necesita saber nada de perfiles.
 */
export function effectivePreferences(
  household: HouseholdSettings,
  profiles: Profile[],
): Preferences {
  const merged = mergeProfiles(profiles);
  const ref = referenceProfile(profiles);
  return {
    people: Math.max(1, Math.round(householdServings(profiles) * 10) / 10),
    defaultGoal: household.defaultGoal,
    restrictions: merged.restrictions,
    dislikes: merged.dislikes,
    likes: merged.likes,
    mealsPerDay: household.mealsPerDay,
    calorieTarget: ref?.calorieTarget ?? (ref ? DEFAULT_KCAL_BY_AGE[ref.ageGroup] : null),
    macroSplit: ref?.macroSplit ?? null,
    aiApiKey: household.aiApiKey,
    useAI: household.useAI,
    onboarded: household.onboarded,
  };
}

/** Calorías objetivo de un miembro (propias o por defecto según su edad). */
export function targetKcalOf(profile: Profile): number {
  return profile.calorieTarget ?? DEFAULT_KCAL_BY_AGE[profile.ageGroup];
}

/**
 * Factor de ración de cada miembro para cada día del plan: el mismo plato, pero
 * la cantidad que le toca a cada uno según sus calorías.
 */
export function portionFactorsFor(
  plan: MealPlan,
  recipeMap: Record<string, Recipe>,
  profiles: Profile[],
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const days = 7;
  const kcalByDay: number[] = [];
  for (let d = 0; d < days; d++) {
    kcalByDay[d] = plan.meals
      .filter((m) => m.day === d)
      .reduce((s, m) => s + (recipeMap[m.recipeId]?.macros.kcal ?? 0), 0);
  }
  for (const p of activeProfiles(profiles)) {
    const target = targetKcalOf(p);
    out[p.id] = kcalByDay.map((base) => {
      if (base <= 0) return 1;
      // banda natural: no servimos raciones absurdas
      return Math.max(0.4, Math.min(1.6, Math.round((target / base) * 100) / 100));
    });
  }
  return out;
}

/**
 * Cuántos platos quedan disponibles con los gustos de toda la familia. Sirve
 * para avisar al usuario ANTES de que el menú se quede sin opciones.
 */
export function poolSizeFor(profiles: Profile[], household: HouseholdSettings): number {
  const merged = mergeProfiles(profiles);
  const dislikes = new Set(merged.dislikes);
  const slots = household.mealsPerDay.length > 0 ? household.mealsPerDay : ['comida', 'cena'];
  return RECIPES.filter(
    (r) =>
      r.slot.some((s) => slots.includes(s)) &&
      merged.restrictions.every((t) => r.tags.includes(t)) &&
      !r.ingredients.some((i) => dislikes.has(i.key)) &&
      isEasy(r) &&
      (!r.slot.includes('cena') || r.slot.length > 1 || isSuitableForDinner(r)),
  ).length;
}

/** Umbral por debajo del cual el menú pierde variedad y conviene avisar. */
export const POOL_WARN_THRESHOLD = 30;
