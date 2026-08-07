// Rehidratación defensiva del estado que llega "de fuera" (la nube o el
// almacenamiento del móvil).
//
// POR QUÉ EXISTE ESTE FICHERO:
// Firebase Realtime Database NO guarda los valores vacíos. Un array `[]`, un
// objeto `{}` o un `null` equivalen a borrar la clave, así que un perfil que se
// sube como
//     { id: 'me', dislikes: [], likes: [], restrictions: [] }
// se vuelve a descargar como
//     { id: 'me' }
// y a partir de ahí cualquier `p.dislikes.includes(...)` revienta y tumba la
// app entera. Además, un array puede volver como objeto con claves numéricas
// ({"0":…, "2":…}) si tenía huecos.
//
// La regla es: nada que venga de la nube o del disco entra en el estado sin
// pasar por aquí. Rellenar la forma es barato; una pantalla en blanco no.
import {
  HouseholdSettings,
  MealPlan,
  Product,
  Profile,
  Recipe,
  ShoppingItem,
} from '../types';

/** Devuelve SIEMPRE un array, venga como array, como objeto indexado o vacío. */
export function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined) as T[];
  if (v && typeof v === 'object') {
    return Object.keys(v as object)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (v as Record<string, T>)[k])
      .filter((x) => x !== null && x !== undefined);
  }
  return [];
}

/** Devuelve SIEMPRE un diccionario. */
export function asMap<T>(v: unknown): Record<string, T> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : {};
}

export function reviveRecipe(raw: unknown): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Recipe>;
  if (!r.id) return null;
  return {
    ...(r as Recipe),
    name: r.name ?? 'Receta',
    slot: asArray(r.slot),
    goals: asArray(r.goals),
    tags: asArray(r.tags),
    ingredients: asArray(r.ingredients),
    steps: asArray(r.steps),
    macros: r.macros ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    timeMinutes: r.timeMinutes ?? 0,
    servings: r.servings && r.servings > 0 ? r.servings : 1,
    emoji: r.emoji ?? '🍽️',
  };
}

export function reviveRecipeMap(raw: unknown): Record<string, Recipe> {
  const out: Record<string, Recipe> = {};
  for (const [id, value] of Object.entries(asMap<unknown>(raw))) {
    const r = reviveRecipe(value);
    if (r) out[id] = r;
  }
  return out;
}

export function reviveProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Profile>;
  if (!p.id) return null;
  return {
    ...(p as Profile),
    name: p.name ?? 'Persona',
    emoji: p.emoji ?? '🙂',
    ageGroup: p.ageGroup ?? 'adulto',
    restrictions: asArray(p.restrictions),
    dislikes: asArray(p.dislikes),
    likes: asArray(p.likes),
    calorieTarget: p.calorieTarget ?? null,
    macroSplit: p.macroSplit ?? null,
    // ausente = "sí come en casa" (es el valor por defecto al crear el perfil)
    activeInPlan: p.activeInPlan !== false,
  };
}

export function reviveProfiles(raw: unknown): Profile[] {
  return asArray<unknown>(raw)
    .map(reviveProfile)
    .filter((p): p is Profile => p !== null);
}

export function revivePlan(raw: unknown): MealPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const pl = raw as Partial<MealPlan>;
  if (!pl.id) return null;
  return {
    ...(pl as MealPlan),
    meals: asArray(pl.meals),
    missing: asArray(pl.missing),
    avgDailyMacros: pl.avgDailyMacros ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    createdAt: pl.createdAt ?? 0,
  };
}

export function revivePlans(raw: unknown): MealPlan[] {
  return asArray<unknown>(raw)
    .map(revivePlan)
    .filter((p): p is MealPlan => p !== null);
}

export function revivePantry(raw: unknown): Product[] {
  return asArray<Partial<Product>>(raw)
    .filter((p) => p && p.id && p.ingredientKey)
    .map((p) => ({
      ...(p as Product),
      raw: p.raw ?? p.displayName ?? '',
      displayName: p.displayName ?? p.raw ?? '',
      source: p.source ?? 'manual',
      addedAt: p.addedAt ?? 0,
    }));
}

export function reviveShopping(raw: unknown): ShoppingItem[] {
  return asArray<Partial<ShoppingItem>>(raw)
    .filter((i) => i && i.key)
    .map((i) => ({
      ...(i as ShoppingItem),
      name: i.name ?? i.key!,
      checked: i.checked === true,
      usedIn: i.usedIn ?? 1,
    }));
}

export function reviveHousehold(raw: unknown, fallback: HouseholdSettings): HouseholdSettings {
  const h = (raw && typeof raw === 'object' ? raw : {}) as Partial<HouseholdSettings>;
  const meals = asArray<HouseholdSettings['mealsPerDay'][number]>(h.mealsPerDay);
  return {
    defaultGoal: h.defaultGoal ?? fallback.defaultGoal,
    // nunca puede quedarse vacío: sin comidas no hay plan que generar
    mealsPerDay: meals.length > 0 ? meals : fallback.mealsPerDay,
    aiApiKey: h.aiApiKey ?? fallback.aiApiKey,
    useAI: h.useAI ?? fallback.useAI,
    onboarded: h.onboarded ?? fallback.onboarded,
  };
}
