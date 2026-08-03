// Motor GENERATIVO por plantillas culinarias.
//
// No elige de una lista cerrada: instancia PLANTILLAS de estructura
// (base + proteína + verdura + aromático + ácido/grasa + técnica) con los
// ingredientes reales del ticket/despensa, filtrando por técnicas compatibles y
// afinidades, y anclado en cocina mediterránea/española. Recalcula la nutrición
// sumando desde la BD y valida factibilidad antes de devolver nada.
//
// Lógica pura (sin React Native) → testeable en node.
import { DietGoal, DietTag, MealSlot, Recipe, RecipeIngredient } from '../types';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { CookTechnique, getCulinary } from '../data/culinary';
import { computeMacrosPerServing } from '../data/nutrition';
import { deriveTags } from './dietTags';
import { makeRng, hashSeed, Rng } from './rng';
import { newId } from './ticketParser';

// Básicos que se asumen disponibles aunque no estén en el ticket.
const ALWAYS_AVAILABLE = ['aceite', 'ajo', 'cebolla', 'sal', 'especias', 'limon', 'laurel'];

const STARCH_BASES = new Set([
  'arroz', 'pasta', 'pan', 'quinoa', 'cuscus', 'cebada', 'polenta', 'tortilla_wrap',
  'patata', 'boniato',
]);

interface Pools {
  proteins: string[];
  bases: string[];
  vegs: string[];
  aromatics: string[];
  acids: string[];
  fats: string[];
}

function classify(availableKeys: Set<string>): Pools {
  const withStaples = new Set([...availableKeys, ...ALWAYS_AVAILABLE]);
  const pools: Pools = { proteins: [], bases: [], vegs: [], aromatics: [], acids: [], fats: [] };
  for (const key of withStaples) {
    const def = INGREDIENT_BY_KEY[key];
    if (!def) continue;
    const c = getCulinary(key);
    if (c.role === 'aromatico') pools.aromatics.push(key);
    else if (c.role === 'grasa') pools.fats.push(key);
    else if (c.role === 'acido') pools.acids.push(key);
    // proteínas / bases / verduras solo de lo realmente disponible (no staples)
    if (!availableKeys.has(key)) continue;
    if (c.isProtein && ['carne', 'pescado', 'huevo', 'legumbre'].includes(def.category)) {
      pools.proteins.push(key);
    }
    if (STARCH_BASES.has(key)) pools.bases.push(key);
    if (def.category === 'verdura' && c.role !== 'aromatico' && !STARCH_BASES.has(key)) {
      pools.vegs.push(key);
    }
  }
  return pools;
}

const name = (key: string): string => INGREDIENT_BY_KEY[key]?.name ?? key;
const lc = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function qtyFor(key: string): { quantity?: number; unit?: string } {
  const def = INGREDIENT_BY_KEY[key];
  if (getCulinary(key).isPantry) return {}; // básico, sin cantidad explícita
  if (def?.category === 'huevo') return { quantity: 2, unit: 'ud' };
  if (STARCH_BASES.has(key)) {
    if (key === 'patata' || key === 'boniato') return { quantity: 1, unit: 'ud' };
    if (key === 'pan') return { quantity: 2, unit: 'rebanadas' };
    return { quantity: 70, unit: 'g' };
  }
  if (getCulinary(key).isProtein) return { quantity: 150, unit: 'g' };
  if (def?.category === 'verdura') return { quantity: 150, unit: 'g' };
  if (def?.category === 'fruta') return { quantity: 100, unit: 'g' };
  return { quantity: 100, unit: 'g' };
}

function ing(key: string): RecipeIngredient {
  return { key, name: name(key), staple: getCulinary(key).isPantry, ...qtyFor(key) };
}

interface Template {
  id: string;
  technique: CookTechnique;
  needsBase: boolean;
  vegCount: number;
  emoji: string;
  timeMinutes: number;
  buildName: (protein: string, veg: string[], base?: string) => string;
  buildSteps: (parts: { protein: string; veg: string[]; base?: string; aromatic?: string; acid?: string }) => string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'salteado',
    technique: 'salteado',
    needsBase: false,
    vegCount: 2,
    emoji: '🥘',
    timeMinutes: 20,
    buildName: (p, v) => `${cap(name(p))} salteado con ${lc(name(v[0]))}`,
    buildSteps: ({ protein, veg, aromatic }) => [
      `Corta ${lc(name(protein))} y ${veg.map((k) => lc(name(k))).join(' y ')} en trozos pequeños.`,
      `Calienta un poco de aceite y sofríe ${aromatic ? lc(name(aromatic)) : 'el ajo'} 1 minuto.`,
      `Añade ${lc(name(protein))} y saltea a fuego fuerte 5-6 minutos.`,
      `Incorpora ${veg.map((k) => lc(name(k))).join(' y ')} y saltea 4-5 minutos más; salpimienta y sirve.`,
    ],
  },
  {
    id: 'horno',
    technique: 'horno',
    needsBase: true,
    vegCount: 1,
    emoji: '🔥',
    timeMinutes: 40,
    buildName: (p, v, b) => `${cap(name(p))} al horno con ${lc(name(b!))} y ${lc(name(v[0]))}`,
    buildSteps: ({ protein, veg, base }) => [
      'Precalienta el horno a 200 °C.',
      `Trocea ${lc(name(base!))} y ${veg.map((k) => lc(name(k))).join(' y ')} y colócalos en una bandeja con aceite y sal.`,
      `Pon ${lc(name(protein))} encima y hornea 20-25 minutos.`,
      'Deja reposar 5 minutos antes de servir.',
    ],
  },
  {
    id: 'guiso',
    technique: 'guiso',
    needsBase: false,
    vegCount: 2,
    emoji: '🍲',
    timeMinutes: 40,
    buildName: (p) => `Guiso de ${lc(name(p))} con verduras`,
    buildSteps: ({ protein, veg, aromatic }) => [
      `Sofríe ${aromatic ? lc(name(aromatic)) : 'la cebolla y el ajo'} en aceite 5 minutos.`,
      `Añade ${veg.map((k) => lc(name(k))).join(' y ')} y rehoga 3 minutos.`,
      `Incorpora ${lc(name(protein))} y cubre con agua o caldo.`,
      'Cuece a fuego lento 25-30 minutos hasta que esté tierno; rectifica de sal.',
    ],
  },
  {
    id: 'plancha',
    technique: 'plancha',
    needsBase: false,
    vegCount: 1,
    emoji: '🍽️',
    timeMinutes: 18,
    buildName: (p, v) => `${cap(name(p))} a la plancha con ${lc(name(v[0]))}`,
    buildSteps: ({ protein, veg, acid }) => [
      `Salpimienta ${lc(name(protein))}.`,
      `Hazlo a la plancha 3-4 minutos por cada lado.`,
      `Saltea ${veg.map((k) => lc(name(k))).join(' y ')} con un poco de aceite y ajo.`,
      `Sirve con un chorrito de ${acid ? lc(name(acid)) : 'limón'} por encima.`,
    ],
  },
  {
    id: 'bowl',
    technique: 'plancha',
    needsBase: true,
    vegCount: 1,
    emoji: '🥗',
    timeMinutes: 25,
    buildName: (p, v, b) => `Bowl de ${lc(name(p))} con ${lc(name(b!))} y ${lc(name(v[0]))}`,
    buildSteps: ({ protein, veg, base, acid }) => [
      `Cuece ${lc(name(base!))} y déjalo templar.`,
      `Cocina ${lc(name(protein))} a la plancha y trocéalo.`,
      `Monta el bowl con ${lc(name(base!))}, ${veg.map((k) => lc(name(k))).join(' y ')} en crudo y ${lc(name(protein))}.`,
      `Aliña con aceite, ${acid ? lc(name(acid)) : 'limón'} y sal.`,
    ],
  },
];

/** Validador de factibilidad OBLIGATORIO: toda clave debe existir en la BD. */
export function isFeasible(recipe: Recipe): boolean {
  return recipe.ingredients.every((i) => !!INGREDIENT_BY_KEY[i.key]);
}

function deriveGoals(macros: { kcal: number; protein: number }, base?: DietGoal): DietGoal[] {
  const g = new Set<DietGoal>(['saludable']);
  if (base) g.add(base);
  if (macros.protein >= 28) g.add('proteico');
  if (macros.kcal <= 420) g.add('bajar_calorias');
  if (macros.kcal >= 650) g.add('cheat');
  return [...g];
}

function pickAffineVeg(protein: string, vegs: string[], count: number, rng: Rng, exclude: Set<string>): string[] {
  const pool = vegs.filter((v) => !exclude.has(v));
  const affine = pool.filter((v) => getCulinary(protein).affinities.includes(v) || getCulinary(v).affinities.includes(protein));
  const rest = pool.filter((v) => !affine.includes(v));
  const ordered = [...rng.shuffle(affine), ...rng.shuffle(rest)];
  return ordered.slice(0, count);
}

export interface GenOptions {
  seed?: number;
  goal?: DietGoal;
  slot?: MealSlot;
  max?: number;
  restrictions?: DietTag[];
  dislikes?: string[];
}

function eligibleProteins(pools: Pools, restrictions: DietTag[]): string[] {
  let proteins = pools.proteins;
  if (restrictions.includes('vegano')) {
    proteins = proteins.filter((k) => INGREDIENT_BY_KEY[k]?.category === 'legumbre');
  } else if (restrictions.includes('vegetariano')) {
    proteins = proteins.filter((k) => {
      const c = INGREDIENT_BY_KEY[k]?.category;
      return c === 'legumbre' || c === 'huevo' || c === 'lacteo';
    });
  }
  return proteins;
}

function instantiate(
  t: Template,
  protein: string,
  pools: Pools,
  rng: Rng,
  opts: GenOptions,
): Recipe | null {
  const dislikes = new Set(opts.dislikes ?? []);
  if (dislikes.has(protein)) return null;

  const veg = pickAffineVeg(protein, pools.vegs, t.vegCount, rng, dislikes);
  if (veg.length === 0) return null;

  let base: string | undefined;
  if (t.needsBase) {
    const bases = pools.bases.filter((b) => !dislikes.has(b));
    if (bases.length === 0) return null;
    base = rng.pick(bases);
  }

  const aromatic = pools.aromatics.includes('cebolla') ? 'cebolla' : pools.aromatics[0];
  const acid = pools.acids.includes('limon') ? 'limon' : pools.acids[0];
  const fat = pools.fats.includes('aceite') ? 'aceite' : pools.fats[0];

  const keys: string[] = [protein, ...veg];
  if (base) keys.push(base);
  if (aromatic) keys.push(aromatic);
  if (fat) keys.push(fat);
  if (t.id === 'plancha' || t.id === 'bowl') if (acid) keys.push(acid);

  const ingredients: RecipeIngredient[] = keys.map(ing);
  const macros = computeMacrosPerServing(ingredients, 1);
  const tags = deriveTags(keys);

  const recipe: Recipe = {
    id: newId('gen'),
    name: t.buildName(protein, veg, base),
    slot: opts.slot ? [opts.slot] : ['comida', 'cena'],
    goals: deriveGoals(macros, opts.goal),
    tags,
    ingredients,
    steps: t.buildSteps({ protein, veg, base, aromatic, acid }),
    macros,
    timeMinutes: t.timeMinutes,
    servings: 1,
    emoji: t.emoji,
    technique: t.technique,
    generated: true,
  };
  return recipe;
}

function passesRestrictions(recipe: Recipe, restrictions: DietTag[]): boolean {
  return restrictions.every((r) => recipe.tags.includes(r));
}

/**
 * Genera recetas nuevas combinando plantillas con los ingredientes disponibles.
 * Diversifica: como mucho una receta por proteína y por técnica en el lote.
 */
export function generateRecipes(availableKeys: Set<string>, opts: GenOptions = {}): Recipe[] {
  const restrictions = opts.restrictions ?? [];
  const seed = opts.seed ?? hashSeed([...availableKeys].sort().join(',') + (opts.slot ?? '') + (opts.goal ?? ''));
  const rng = makeRng(seed);
  const pools = classify(availableKeys);

  const proteins = rng.shuffle(eligibleProteins(pools, restrictions));
  const out: Recipe[] = [];
  const usedTechniques = new Set<string>();
  const max = opts.max ?? 8;

  for (const protein of proteins) {
    if (out.length >= max) break;
    const techs = getCulinary(protein).techniques;
    // plantillas cuya técnica soporta esta proteína y que no repiten técnica en el lote
    const usable = rng
      .shuffle(TEMPLATES)
      .filter((t) => techs.includes(t.technique) && !usedTechniques.has(t.technique));
    for (const t of usable) {
      const rec = instantiate(t, protein, pools, rng, opts);
      if (rec && isFeasible(rec) && passesRestrictions(rec, restrictions)) {
        out.push(rec);
        usedTechniques.add(t.technique); // ≤1 receta por técnica en el lote
        break; // una plantilla por proteína
      }
    }
  }
  return out;
}
