// Capa de metadatos culinarios de los ingredientes.
//
// El "almacén" de ingredientes es un array TS (data/ingredients.ts) con datos
// básicos. Aquí lo ENRIQUECEMOS con los atributos que el motor generativo
// necesita, sin tener que anotar a mano las 150 filas: se resuelven con valores
// por defecto por CATEGORÍA + overrides por ingrediente + una tabla de afinidades.
// Esta es la "migración" equivalente para un store en TS: derivada y extensible.
//
// Lógica pura (sin React Native) → testeable en node.
import { IngredientDef, INGREDIENT_BY_KEY } from './ingredients';
import { Recipe } from '../types';

/** rol_culinario */
export type CulinaryRole =
  | 'base' // arroz, pasta, patata, pan…
  | 'principal' // proteína o legumbre que vertebra el plato
  | 'acompanamiento' // verduras de acompañamiento
  | 'aromatico' // ajo, cebolla, especias, hierbas
  | 'acido' // limón, vinagre
  | 'grasa' // aceite, mantequilla
  | 'acabado'; // fruta, lácteo, topping

/** tecnicas_compatibles */
export type CookTechnique =
  | 'plancha'
  | 'horno'
  | 'guiso'
  | 'salteado'
  | 'fritura'
  | 'crudo'
  | 'hervido'
  | 'vapor';

/** perfil_sabor */
export type FlavorProfile =
  | 'umami'
  | 'dulce'
  | 'acido'
  | 'amargo'
  | 'picante'
  | 'graso'
  | 'vegetal'
  | 'terroso'
  | 'lacteo'
  | 'marino'
  | 'neutro'
  | 'aromatico';

export interface Culinary {
  role: CulinaryRole;
  techniques: CookTechnique[];
  flavor: FlavorProfile[];
  affinities: string[]; // claves de ingredientes que combinan bien
  isPantry: boolean; // es_despensa (aceite, sal, ajo…): se asume disponible
  isProtein: boolean; // vertebra el plato como proteína
  season?: number[]; // meses (1-12) de temporada, opcional
}

type Category = IngredientDef['category'];

// Valores por defecto por categoría.
const CATEGORY_DEFAULTS: Record<Category, Omit<Culinary, 'affinities' | 'isPantry' | 'season'>> = {
  carne: { role: 'principal', techniques: ['plancha', 'horno', 'guiso', 'salteado', 'fritura'], flavor: ['umami', 'graso'], isProtein: true },
  pescado: { role: 'principal', techniques: ['plancha', 'horno', 'vapor', 'guiso'], flavor: ['umami', 'marino'], isProtein: true },
  huevo: { role: 'principal', techniques: ['plancha', 'salteado', 'hervido', 'horno'], flavor: ['umami'], isProtein: true },
  legumbre: { role: 'principal', techniques: ['guiso', 'hervido', 'salteado', 'horno'], flavor: ['terroso', 'vegetal'], isProtein: true },
  verdura: { role: 'acompanamiento', techniques: ['salteado', 'horno', 'vapor', 'hervido', 'crudo', 'plancha'], flavor: ['vegetal'], isProtein: false },
  fruta: { role: 'acabado', techniques: ['crudo', 'horno'], flavor: ['dulce', 'acido'], isProtein: false },
  cereal: { role: 'base', techniques: ['hervido', 'horno', 'salteado'], flavor: ['neutro'], isProtein: false },
  lacteo: { role: 'acabado', techniques: ['crudo', 'horno'], flavor: ['lacteo'], isProtein: false },
  despensa: { role: 'aromatico', techniques: ['salteado', 'guiso', 'horno', 'crudo'], flavor: ['aromatico'], isProtein: false },
  bebida: { role: 'acabado', techniques: ['crudo'], flavor: ['neutro'], isProtein: false },
  dulce: { role: 'acabado', techniques: ['crudo', 'horno'], flavor: ['dulce'], isProtein: false },
  otro: { role: 'principal', techniques: ['guiso', 'salteado', 'horno'], flavor: ['neutro'], isProtein: false },
};

// Overrides por ingrediente (solo lo que se desvía del defecto de su categoría).
const OVERRIDES: Record<string, Partial<Culinary>> = {
  // Aromáticos
  ajo: { role: 'aromatico', flavor: ['aromatico', 'picante'] },
  cebolla: { role: 'aromatico', flavor: ['aromatico', 'dulce'] },
  puerro: { role: 'aromatico', flavor: ['aromatico', 'dulce'] },
  jengibre: { role: 'aromatico', flavor: ['picante', 'aromatico'] },
  perejil: { role: 'aromatico', flavor: ['aromatico', 'vegetal'] },
  laurel: { role: 'aromatico', flavor: ['aromatico'] },
  azafran: { role: 'aromatico', flavor: ['aromatico'] },
  especias: { role: 'aromatico', flavor: ['aromatico', 'picante'] },
  pimiento_choricero: { role: 'aromatico', flavor: ['umami', 'aromatico'] },
  // Ácidos
  limon: { role: 'acido', flavor: ['acido'] },
  vinagre: { role: 'acido', flavor: ['acido'] },
  // Grasas
  aceite: { role: 'grasa', flavor: ['graso'] },
  mantequilla: { role: 'grasa', flavor: ['graso', 'lacteo'] },
  margarina: { role: 'grasa', flavor: ['graso'] },
  aceituna: { role: 'acabado', flavor: ['graso', 'umami'] },
  // Bases (tomate como base de sofrito)
  tomate: { role: 'base', flavor: ['umami', 'acido', 'vegetal'] },
  tomate_frito: { role: 'base', flavor: ['umami', 'acido'] },
  patata: { role: 'base' },
  boniato: { role: 'base' },
  // Lácteos que pueden ser proteína/acabado
  queso: { role: 'acabado', flavor: ['lacteo', 'graso', 'umami'] },
  queso_batido: { role: 'principal', flavor: ['lacteo'], isProtein: true },
  yogur: { role: 'acabado', flavor: ['lacteo', 'acido'] },
  proteina_polvo: { role: 'principal', isProtein: true },
};

// Afinidades culinarias curadas (claves que combinan bien). Bidireccionalidad la
// resuelve getAffinity(). Sembradas para las proteínas y verduras principales.
const AFFINITIES: Record<string, string[]> = {
  pollo: ['ajo', 'limon', 'cebolla', 'pimiento', 'champinon', 'arroz', 'patata', 'brocoli', 'especias', 'tomate'],
  pavo: ['ajo', 'limon', 'pimiento', 'aguacate', 'tomate', 'cebolla'],
  ternera: ['cebolla', 'zanahoria', 'patata', 'guisante', 'tomate', 'ajo', 'vino'],
  conejo: ['ajo', 'vino', 'tomate', 'cebolla', 'especias'],
  cerdo: ['ajo', 'cebolla', 'manzana', 'pimiento', 'patata'],
  salmon: ['limon', 'brocoli', 'patata', 'boniato', 'espinacas', 'aguacate', 'quinoa'],
  atun: ['tomate', 'cebolla', 'pimiento', 'huevo', 'aceituna', 'patata', 'arroz'],
  merluza: ['ajo', 'limon', 'patata', 'guisante', 'perejil', 'pimiento'],
  bacalao: ['ajo', 'pimiento', 'tomate', 'garbanzos', 'espinacas', 'patata'],
  gambas: ['ajo', 'pasta', 'arroz', 'perejil', 'pimiento'],
  huevo: ['patata', 'cebolla', 'espinacas', 'champinon', 'esparrago', 'pimiento', 'aguacate'],
  garbanzos: ['espinacas', 'tomate', 'especias', 'cebolla', 'ajo', 'pimiento'],
  lentejas: ['zanahoria', 'cebolla', 'pimiento', 'tomate', 'ajo', 'patata'],
  alubias: ['cebolla', 'ajo', 'tomate', 'col', 'pimiento'],
  tofu: ['brocoli', 'pimiento', 'zanahoria', 'salsas', 'jengibre', 'arroz'],
  tempeh: ['brocoli', 'pimiento', 'zanahoria', 'jengibre', 'salsas'],
  espinacas: ['ajo', 'garbanzos', 'huevo', 'queso', 'frutos_secos'],
  brocoli: ['ajo', 'limon', 'salmon', 'pollo', 'aceite'],
  calabacin: ['tomate', 'cebolla', 'ajo', 'berenjena', 'queso'],
  berenjena: ['tomate', 'cebolla', 'ajo', 'queso', 'pimiento'],
  tomate: ['ajo', 'cebolla', 'aceite', 'queso', 'especias'],
  arroz: ['pollo', 'guisante', 'tomate', 'azafran', 'gambas'],
  pasta: ['tomate', 'ajo', 'queso', 'gambas', 'atun'],
  quinoa: ['pollo', 'aguacate', 'espinacas', 'garbanzos', 'limon'],
  patata: ['huevo', 'cebolla', 'ajo', 'pimiento', 'bacalao'],
};

/** Claves que tienen afinidades definidas (para validación en tests). */
export const AFFINITIES_KEYS_FOR_TEST = Object.keys(AFFINITIES);

/** Metadatos culinarios resueltos de un ingrediente (por clave). */
export function getCulinary(key: string): Culinary {
  const def = INGREDIENT_BY_KEY[key];
  const base = def ? CATEGORY_DEFAULTS[def.category] : CATEGORY_DEFAULTS.otro;
  const override = OVERRIDES[key] ?? {};
  return {
    role: override.role ?? base.role,
    techniques: override.techniques ?? base.techniques,
    flavor: override.flavor ?? base.flavor,
    affinities: AFFINITIES[key] ?? [],
    isPantry: def?.staple === true,
    isProtein: override.isProtein ?? base.isProtein,
    season: override.season,
  };
}

/** ¿Son afines dos ingredientes? (relación bidireccional) */
export function areAffine(a: string, b: string): boolean {
  return getCulinary(a).affinities.includes(b) || getCulinary(b).affinities.includes(a);
}

/** Clave de la proteína principal de una receta, si la hay. */
export function mainProteinKey(recipe: Recipe): string | null {
  for (const ing of recipe.ingredients) {
    const def = INGREDIENT_BY_KEY[ing.key];
    if (def && ['carne', 'pescado', 'huevo', 'legumbre'].includes(def.category) && !ing.staple) {
      return ing.key;
    }
  }
  return null;
}

const TECHNIQUE_HINTS: [CookTechnique, RegExp][] = [
  ['horno', /horn|gratin|asa|180|190|200/],
  ['plancha', /planch|marca|dora a fuego/],
  ['vapor', /vapor|vaporera/],
  ['fritura', /fri(e|é)|freir|fritura/],
  ['guiso', /guis|cuece|cocina a fuego|hierve|estofa|olla|caldo/],
  ['salteado', /saltea|rehoga|sofr|wok/],
  ['crudo', /tritura|mezcla|aliña|sin cocinar|en crudo/],
  ['hervido', /hierve|cuece.*agua/],
];

/** Técnica de cocción inferida de los pasos de una receta (heurística). */
export function inferTechnique(recipe: Recipe): CookTechnique {
  const text = recipe.steps
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  for (const [tech, re] of TECHNIQUE_HINTS) {
    if (re.test(text)) return tech;
  }
  return 'guiso';
}
