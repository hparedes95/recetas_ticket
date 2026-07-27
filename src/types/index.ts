// Tipos centrales de la app

/** Objetivo/tipo de plan que puede elegir el usuario */
export type DietGoal = 'saludable' | 'bajar_calorias' | 'cheat' | 'proteico' | 'economico';

/** Momento de comida */
export type MealSlot = 'desayuno' | 'comida' | 'cena' | 'snack';

/** Restricciones y alergias frecuentes */
export type DietTag =
  | 'vegetariano'
  | 'vegano'
  | 'sin_gluten'
  | 'sin_lactosa'
  | 'sin_frutos_secos';

/** Reparto de macros en porcentajes (suman 100) */
export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
}

/** Preferencias del usuario, se guardan en el dispositivo */
export interface Preferences {
  /** Nº de personas para las que se cocina */
  people: number;
  /** Objetivo por defecto al generar planes */
  defaultGoal: DietGoal;
  /** Restricciones dietéticas activas */
  restrictions: DietTag[];
  /** Ingredientes que el usuario no quiere (claves de ingrediente) */
  dislikes: string[];
  /** Comidas al día que quiere planificar */
  mealsPerDay: MealSlot[];
  /** Objetivo de calorías al día (null = automático según el objetivo) */
  calorieTarget: number | null;
  /** Reparto de macros deseado en % (null = automático) */
  macroSplit: MacroSplit | null;
  /** Si ya completó el onboarding */
  onboarded: boolean;
}

/** Un producto tal cual aparece en el ticket / lo añade el usuario */
export interface Product {
  id: string;
  /** Texto original (p.ej. "Pechuga pollo bandeja 500g") */
  raw: string;
  /** Clave de ingrediente normalizada (p.ej. "pollo") */
  ingredientKey: string;
  /** Nombre bonito para mostrar */
  displayName: string;
  /** Cantidad si se pudo detectar */
  quantity?: number;
  unit?: string;
  /** De dónde salió el producto */
  source: 'manual' | 'foto' | 'compra' | 'documento';
  addedAt: number;
}

/** Ingrediente que pide una receta */
export interface RecipeIngredient {
  key: string;
  name: string;
  quantity?: number;
  unit?: string;
  /** Si es opcional o de despensa básica (aceite, sal...) no penaliza el matching */
  staple?: boolean;
}

export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

/** Receta de la base de datos local */
export interface Recipe {
  id: string;
  name: string;
  slot: MealSlot[];
  goals: DietGoal[];
  tags: DietTag[];
  ingredients: RecipeIngredient[];
  steps: string[];
  /** Macros POR RACIÓN */
  macros: Macros;
  timeMinutes: number;
  /** Raciones base de la receta */
  servings: number;
  emoji: string;
}

/** Una comida concreta dentro del plan */
export interface PlannedMeal {
  day: number; // 0 = Lunes ... 6 = Domingo
  slot: MealSlot;
  recipeId: string;
  /** % de ingredientes principales que ya tienes en la despensa */
  coverage: number;
  /** Factor de ración para acercarse al objetivo de calorías (1 = ración base) */
  portionFactor?: number;
}

/** Un plan semanal completo (una de las varias opciones) */
export interface MealPlan {
  id: string;
  goal: DietGoal;
  title: string;
  subtitle: string;
  meals: PlannedMeal[];
  /** Ingredientes que hacen falta comprar para completar el plan */
  missing: RecipeIngredient[];
  /** Macros medias por día */
  avgDailyMacros: Macros;
  /** Objetivo de calorías con el que se generó (si lo había) */
  calorieTarget?: number | null;
  /** Reparto de macros objetivo con el que se generó (si lo había) */
  macroSplit?: MacroSplit | null;
  createdAt: number;
}

/** Item de la lista de la compra sugerida */
export interface ShoppingItem {
  key: string;
  name: string;
  checked: boolean;
  /** En cuántas recetas del plan se usa */
  usedIn: number;
}
