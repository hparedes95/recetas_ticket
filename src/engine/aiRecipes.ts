import { DietGoal, MacroSplit, MealSlot, Recipe, RecipeIngredient } from '../types';
import { normalizeText } from '../data/ingredients';
import { canonicalize } from './normalize';
import { goalMeta, slotMeta, dietTagMeta, macroGramsFor } from '../theme';
import { newId } from './ticketParser';

/** Milisegundos antes de abortar una llamada a la API (evita spinners infinitos). */
const AI_TIMEOUT_MS = 30000;

// Generación de recetas con IA (API de Claude). La clave la pone el usuario y se
// guarda solo en su dispositivo. Se usa cuando el recetario local no basta para
// llegar justo a las calorías/macros del objetivo.
//
// Nota: se llama a la API por HTTPS directo (fetch) en lugar del SDK oficial de
// Anthropic porque ese SDK depende de módulos de Node (node:fs) y no compila en
// el motor Hermes de React Native.

const API_URL = 'https://api.anthropic.com/v1/messages';

/** Modelo por defecto (equilibrio calidad/coste; se puede cambiar, ver README). */
export const DEFAULT_AI_MODEL = 'claude-sonnet-5';

interface AIRecipe {
  name: string;
  emoji: string;
  timeMinutes: number;
  ingredients: { name: string; quantity?: number; unit?: string }[];
  steps: string[];
  macros: { kcal: number; protein: number; carbs: number; fat: number };
}

// Esquema de salida estructurada: garantiza JSON válido con la forma esperada.
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          emoji: { type: 'string' },
          timeMinutes: { type: 'integer' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
              },
              required: ['name'],
            },
          },
          steps: { type: 'array', items: { type: 'string' } },
          macros: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kcal: { type: 'integer' },
              protein: { type: 'integer' },
              carbs: { type: 'integer' },
              fat: { type: 'integer' },
            },
            required: ['kcal', 'protein', 'carbs', 'fat'],
          },
        },
        required: ['name', 'emoji', 'timeMinutes', 'ingredients', 'steps', 'macros'],
      },
    },
  },
  required: ['recipes'],
};

export interface AIGenParams {
  apiKey: string;
  model?: string;
  slot: MealSlot;
  count: number;
  /** kcal objetivo por ración (1 persona) para esa comida */
  targetKcal: number;
  /** reparto de macros deseado en % */
  macroSplit: MacroSplit;
  /** ingredientes disponibles (nombres en español) */
  pantryNames: string[];
  /** restricciones activas (claves: vegetariano, sin_gluten…) */
  restrictions: string[];
  /** ingredientes que no quiere (nombres) */
  dislikes: string[];
  goal: DietGoal;
}

const SYSTEM_PROMPT = [
  'Eres un chef y nutricionista español. Creas recetas caseras, realistas y fáciles,',
  'escritas SIEMPRE en español. Ajustas las cantidades para acercarte a las calorías y',
  'macros objetivo por ración. Devuelves solo datos estructurados según el esquema.',
].join(' ');

function buildPrompt(p: AIGenParams): string {
  const grams = macroGramsFor(p.targetKcal, p.macroSplit);
  const restr = p.restrictions.map((r) => dietTagMeta[r]?.label ?? r);
  const lines = [
    `Crea ${p.count} recetas distintas para "${slotMeta[p.slot].label}" (1 persona).`,
    `Objetivo del plan: ${goalMeta[p.goal].label} (${goalMeta[p.goal].description}).`,
    `Cada receta debe acercarse a ${p.targetKcal} kcal por ración, con un reparto aproximado de`,
    `${grams.protein} g de proteína, ${grams.carbs} g de carbohidratos y ${grams.fat} g de grasa.`,
    p.pantryNames.length
      ? `Usa preferentemente estos ingredientes que ya tengo: ${p.pantryNames.join(', ')}. Puedes añadir básicos (aceite, sal, especias) y algún ingrediente extra si hace falta.`
      : 'Usa ingredientes comunes de supermercado.',
    restr.length ? `Restricciones obligatorias: ${restr.join(', ')}.` : '',
    p.dislikes.length ? `Evita estos ingredientes: ${p.dislikes.join(', ')}.` : '',
    'Pasos breves y claros. Un emoji representativo por receta. macros = valores por ración.',
  ];
  return lines.filter(Boolean).join('\n');
}

function aiToRecipe(ai: AIRecipe, slot: MealSlot, goal: DietGoal): Recipe {
  const ingredients: RecipeIngredient[] = (ai.ingredients ?? []).map((i) => {
    const def = canonicalize(i.name);
    return {
      key: def ? def.key : `otro:${normalizeText(i.name)}`,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    };
  });
  return {
    id: newId('ai'),
    name: ai.name,
    slot: [slot],
    goals: [goal],
    tags: [],
    ingredients,
    steps: Array.isArray(ai.steps) ? ai.steps : [],
    macros: ai.macros,
    timeMinutes: ai.timeMinutes || 20,
    servings: 1,
    emoji: ai.emoji || slotMeta[slot].emoji,
  };
}

/** Genera un conjunto de recetas con IA para una comida concreta. */
export async function generateAIRecipesForSlot(p: AIGenParams): Promise<Recipe[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': p.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: p.model || DEFAULT_AI_MODEL,
        max_tokens: 10000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(p) }],
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
        },
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError')
      throw new Error('La IA tardó demasiado en responder. Inténtalo de nuevo.');
    throw new Error('No se pudo conectar con la IA. Revisa tu conexión.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error?.message ?? '';
    } catch {
      // sin cuerpo JSON
    }
    if (res.status === 401) throw new Error('Clave de API no válida. Revísala en Ajustes.');
    if (res.status === 429) throw new Error('Se alcanzó el límite de la API. Prueba en un momento.');
    if (res.status === 400 && /credit|balance/i.test(detail))
      throw new Error('Tu cuenta de Anthropic no tiene crédito disponible.');
    throw new Error(detail || `Error de la API (${res.status}).`);
  }

  const data = await res.json();
  if (data?.stop_reason === 'refusal') throw new Error('La IA rechazó la petición.');

  const blocks: { type: string; text?: string }[] = data?.content ?? [];
  const text = blocks.find((b) => b.type === 'text')?.text ?? '';
  let parsed: { recipes?: AIRecipe[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('No se pudo interpretar la respuesta de la IA.');
  }

  const recipes = (parsed.recipes ?? [])
    .filter((r) => r && r.name && r.macros && typeof r.macros.kcal === 'number')
    .map((r) => aiToRecipe(r, p.slot, p.goal));

  if (recipes.length === 0) throw new Error('La IA no devolvió recetas válidas.');
  return recipes;
}
