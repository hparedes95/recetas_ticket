// Nutrición por 100 g (orientativa, sembrada desde la investigación USDA FDC /
// BEDCA / Moreiras que nos pasó el usuario). Sirve para RECALCULAR los macros de
// las recetas generadas sumando desde la BD según cantidades, en vez de
// inventarlos. Los valores son "tal como se consume" (edible portion) y
// redondeados; en producción convendría una única fuente trazable por ingrediente.
//
// Lógica/datos puros → testeable en node.
import { Macros } from '../types';
import { IngredientDef, INGREDIENT_BY_KEY } from './ingredients';

type Category = IngredientDef['category'];

// Valores por 100 g: { kcal, protein(g), carbs(g), fat(g) }.
export const NUTRITION_PER_100G: Record<string, Macros> = {
  // Carnes y aves
  pollo: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  pavo: { kcal: 104, protein: 24, carbs: 0, fat: 1.7 },
  ternera: { kcal: 131, protein: 21, carbs: 0, fat: 5 },
  cerdo: { kcal: 143, protein: 21, carbs: 0, fat: 6 },
  conejo: { kcal: 133, protein: 21, carbs: 0, fat: 5.3 },
  cordero: { kcal: 200, protein: 20, carbs: 0, fat: 13 },
  carne_picada: { kcal: 190, protein: 19, carbs: 0, fat: 12 },
  jamon: { kcal: 145, protein: 20, carbs: 1, fat: 7 },
  bacon: { kcal: 350, protein: 13, carbs: 0, fat: 33 },
  chorizo: { kcal: 350, protein: 24, carbs: 2, fat: 27 },
  salchicha: { kcal: 300, protein: 12, carbs: 3, fat: 27 },
  // Pescados y marisco
  salmon: { kcal: 208, protein: 20, carbs: 0, fat: 13 },
  atun: { kcal: 130, protein: 28, carbs: 0, fat: 1.3 },
  merluza: { kcal: 72, protein: 17, carbs: 0, fat: 0.9 },
  bacalao: { kcal: 82, protein: 18, carbs: 0, fat: 0.7 },
  dorada: { kcal: 96, protein: 20, carbs: 0, fat: 2.5 },
  sardina: { kcal: 172, protein: 25, carbs: 0, fat: 9 },
  rape: { kcal: 68, protein: 15, carbs: 0, fat: 0.5 },
  gambas: { kcal: 85, protein: 18, carbs: 0, fat: 1 },
  mejillon: { kcal: 86, protein: 12, carbs: 3.7, fat: 2.2 },
  calamar: { kcal: 92, protein: 16, carbs: 3, fat: 1.4 },
  // Huevos y lácteos
  huevo: { kcal: 143, protein: 13, carbs: 0.7, fat: 9.5 },
  leche: { kcal: 46, protein: 3.3, carbs: 4.8, fat: 1.6 },
  yogur: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  queso: { kcal: 350, protein: 22, carbs: 2, fat: 27 },
  queso_batido: { kcal: 72, protein: 12, carbs: 4, fat: 1 },
  nata: { kcal: 292, protein: 2.5, carbs: 3, fat: 30 },
  mantequilla: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  // Verduras
  tomate: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  tomate_frito: { kcal: 74, protein: 1.3, carbs: 9, fat: 3.5 },
  cebolla: { kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  ajo: { kcal: 149, protein: 6.4, carbs: 33, fat: 0.5 },
  pimiento: { kcal: 26, protein: 1, carbs: 4.6, fat: 0.3 },
  lechuga: { kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  espinacas: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  zanahoria: { kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
  calabacin: { kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  berenjena: { kcal: 25, protein: 1, carbs: 5.9, fat: 0.2 },
  brocoli: { kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  champinon: { kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  setas: { kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  patata: { kcal: 77, protein: 2, carbs: 17, fat: 0.1 },
  boniato: { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  pepino: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  maiz: { kcal: 86, protein: 3.2, carbs: 19, fat: 1.2 },
  judia_verde: { kcal: 31, protein: 1.8, carbs: 7, fat: 0.2 },
  guisante: { kcal: 81, protein: 5.4, carbs: 14, fat: 0.4 },
  coliflor: { kcal: 25, protein: 1.9, carbs: 5, fat: 0.3 },
  col: { kcal: 25, protein: 1.3, carbs: 6, fat: 0.1 },
  acelga: { kcal: 20, protein: 1.8, carbs: 3.7, fat: 0.2 },
  puerro: { kcal: 61, protein: 1.5, carbs: 14, fat: 0.3 },
  apio: { kcal: 16, protein: 0.7, carbs: 3, fat: 0.2 },
  calabaza: { kcal: 26, protein: 1, carbs: 6.5, fat: 0.1 },
  esparrago: { kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1 },
  alcachofa: { kcal: 47, protein: 3.3, carbs: 10.5, fat: 0.2 },
  aceituna: { kcal: 145, protein: 1, carbs: 4, fat: 15 },
  remolacha: { kcal: 43, protein: 1.6, carbs: 10, fat: 0.2 },
  // Frutas
  aguacate: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  platano: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  manzana: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  fresa: { kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  naranja: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  limon: { kcal: 29, protein: 1.1, carbs: 9.3, fat: 0.3 },
  pera: { kcal: 57, protein: 0.4, carbs: 15, fat: 0.1 },
  uva: { kcal: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  melon: { kcal: 34, protein: 0.8, carbs: 8.2, fat: 0.2 },
  arandano: { kcal: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
  kiwi: { kcal: 61, protein: 1.1, carbs: 15, fat: 0.5 },
  granada: { kcal: 83, protein: 1.7, carbs: 19, fat: 1.2 },
  melocoton: { kcal: 39, protein: 0.9, carbs: 9.5, fat: 0.3 },
  coco: { kcal: 354, protein: 3.3, carbs: 15, fat: 33 },
  // Legumbres y proteína vegetal (cocidas salvo indicación)
  garbanzos: { kcal: 139, protein: 8, carbs: 22, fat: 2.6 },
  lentejas: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  alubias: { kcal: 127, protein: 8.7, carbs: 22.8, fat: 0.5 },
  tofu: { kcal: 92, protein: 12, carbs: 2, fat: 5 },
  tempeh: { kcal: 193, protein: 19, carbs: 9, fat: 11 },
  seitan: { kcal: 130, protein: 24, carbs: 4, fat: 2 },
  edamame: { kcal: 121, protein: 12, carbs: 9, fat: 5 },
  // Cereales y derivados (cocidos salvo pan/avena/harina)
  arroz: { kcal: 130, protein: 2.4, carbs: 28, fat: 0.3 },
  pasta: { kcal: 158, protein: 6, carbs: 31, fat: 0.9 },
  pan: { kcal: 265, protein: 9, carbs: 49, fat: 3.2 },
  avena: { kcal: 389, protein: 17, carbs: 66, fat: 7 },
  harina: { kcal: 341, protein: 10, carbs: 72, fat: 1 },
  quinoa: { kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  cuscus: { kcal: 112, protein: 3.8, carbs: 23, fat: 0.2 },
  cebada: { kcal: 123, protein: 2.3, carbs: 28, fat: 0.4 },
  polenta: { kcal: 85, protein: 2, carbs: 18, fat: 0.3 },
  tortilla_wrap: { kcal: 310, protein: 8, carbs: 50, fat: 8 },
  cereales: { kcal: 375, protein: 8, carbs: 78, fat: 4 },
  pan_rallado: { kcal: 350, protein: 12, carbs: 70, fat: 2 },
  // Frutos secos, semillas y grasas
  frutos_secos: { kcal: 600, protein: 20, carbs: 20, fat: 50 },
  crema_cacahuete: { kcal: 588, protein: 25, carbs: 20, fat: 50 },
  semillas: { kcal: 560, protein: 20, carbs: 20, fat: 48 },
  chia: { kcal: 486, protein: 16.5, carbs: 42, fat: 30.7 },
  lino: { kcal: 534, protein: 18, carbs: 29, fat: 42 },
  aceite: { kcal: 899, protein: 0, carbs: 0, fat: 100 },
  // Otros / despensa con aporte
  miel: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 },
  azucar: { kcal: 387, protein: 0, carbs: 100, fat: 0 },
  chocolate: { kcal: 546, protein: 5, carbs: 61, fat: 31 },
  proteina_polvo: { kcal: 375, protein: 80, carbs: 8, fat: 4 },
  leche_vegetal: { kcal: 40, protein: 1, carbs: 4, fat: 2 },
  salsas: { kcal: 150, protein: 2, carbs: 10, fat: 11 },
  encurtidos: { kcal: 25, protein: 1, carbs: 4, fat: 0.5 },
  vino: { kcal: 83, protein: 0.1, carbs: 3, fat: 0 },
};

// Aporte aproximado por 100 g para ingredientes sin valor propio (por categoría).
const CATEGORY_FALLBACK: Record<Category, Macros> = {
  carne: { kcal: 170, protein: 20, carbs: 0, fat: 10 },
  pescado: { kcal: 120, protein: 20, carbs: 0, fat: 4 },
  huevo: { kcal: 143, protein: 13, carbs: 1, fat: 9.5 },
  legumbre: { kcal: 130, protein: 8, carbs: 21, fat: 1.5 },
  verdura: { kcal: 30, protein: 1.5, carbs: 6, fat: 0.3 },
  fruta: { kcal: 55, protein: 0.8, carbs: 13, fat: 0.3 },
  cereal: { kcal: 150, protein: 5, carbs: 30, fat: 1 },
  lacteo: { kcal: 90, protein: 6, carbs: 5, fat: 5 },
  despensa: { kcal: 40, protein: 1, carbs: 5, fat: 1 },
  bebida: { kcal: 10, protein: 0, carbs: 2, fat: 0 },
  dulce: { kcal: 400, protein: 5, carbs: 60, fat: 15 },
  otro: { kcal: 80, protein: 3, carbs: 12, fat: 2 },
};

/** Nutrición por 100 g de un ingrediente (valor propio o fallback por categoría). */
export function nutritionFor(key: string): Macros {
  const own = NUTRITION_PER_100G[key];
  if (own) return own;
  const def = INGREDIENT_BY_KEY[key];
  return CATEGORY_FALLBACK[def?.category ?? 'otro'];
}

// Peso aproximado en gramos de "1 unidad" de un ingrediente (para convertir 'ud').
const UNIT_GRAMS: Record<string, number> = {
  tomate: 140, cebolla: 150, pimiento: 180, calabacin: 250, berenjena: 250,
  patata: 200, boniato: 200, zanahoria: 80, pepino: 300, aguacate: 200,
  platano: 120, manzana: 180, naranja: 200, pera: 170, limon: 100, huevo: 58,
  brocoli: 500, coliflor: 800, puerro: 150, alcachofa: 120, conejo: 1200,
  pollo: 1200, calabaza: 1000, ajo: 3,
};
const DEFAULT_UNIT_GRAMS = 120;

/** Convierte cantidad+unidad de un ingrediente de receta a gramos aproximados. */
export function gramsOf(key: string, quantity?: number, unit?: string): number {
  const u = (unit ?? '').toLowerCase();
  if (quantity == null) {
    // Sin cantidad: básicos aportan poco; el resto una ración tipo.
    if (INGREDIENT_BY_KEY[key]?.staple) return key === 'aceite' ? 10 : 3;
    return 60;
  }
  if (/^kg/.test(u)) return quantity * 1000;
  if (u === 'g' || u === 'gr' || u === 'gramos') return quantity;
  if (u === 'l' || u === 'litro' || u === 'litros') return quantity * 1000;
  if (u === 'ml' || u === 'cl') return u === 'cl' ? quantity * 10 : quantity;
  if (u === 'cda' || u === 'cucharada') return quantity * 15;
  if (u === 'cdta' || u === 'cucharadita') return quantity * 5;
  if (u === 'ud' || u === 'uds' || u === 'unidad' || u === 'unidades' || u === '' || u === 'rebanadas' || u === 'rama' || u === 'manojos' || u === 'manojo') {
    return quantity * (UNIT_GRAMS[key] ?? DEFAULT_UNIT_GRAMS);
  }
  return quantity; // fallback: trata como gramos
}

export interface NutritionInput {
  key: string;
  quantity?: number;
  unit?: string;
  staple?: boolean;
}

/**
 * Recalcula los macros TOTALES de una lista de ingredientes sumando desde la BD.
 * Devuelve el total (no por ración); divídelo por las raciones para obtener la
 * ración.
 */
export function computeMacrosFromIngredients(ingredients: NutritionInput[]): Macros {
  const total: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const ing of ingredients) {
    const g = gramsOf(ing.key, ing.quantity, ing.unit);
    const per = nutritionFor(ing.key);
    const factor = g / 100;
    total.kcal += per.kcal * factor;
    total.protein += per.protein * factor;
    total.carbs += per.carbs * factor;
    total.fat += per.fat * factor;
  }
  return {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein),
    carbs: Math.round(total.carbs),
    fat: Math.round(total.fat),
  };
}

/** Macros por ración a partir de ingredientes y nº de raciones. */
export function computeMacrosPerServing(ingredients: NutritionInput[], servings: number): Macros {
  const t = computeMacrosFromIngredients(ingredients);
  const s = Math.max(1, servings);
  return {
    kcal: Math.round(t.kcal / s),
    protein: Math.round(t.protein / s),
    carbs: Math.round(t.carbs / s),
    fat: Math.round(t.fat / s),
  };
}
