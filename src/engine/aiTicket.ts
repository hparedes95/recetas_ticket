import { Product } from '../types';
import { normalizeText } from '../data/ingredients';
import { canonicalize } from './normalize';
import { newId } from './ticketParser';
import { DEFAULT_AI_MODEL } from './aiRecipes';

/** Milisegundos antes de abortar la llamada a la API. */
const AI_TIMEOUT_MS = 30000;

// Lectura de tickets con IA (API de Claude). Extrae los productos de alimentación
// de un ticket de supermercado, ignorando el ruido (cabeceras, totales, IVA,
// bolsas, limpieza…). Mucho más preciso que el diccionario local.
//
// Se llama por HTTPS directo (fetch) por la misma razón que aiRecipes.ts.

const API_URL = 'https://api.anthropic.com/v1/messages';

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          canonical: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['name', 'canonical'],
      },
    },
  },
  required: ['products'],
};

interface AITicketItem {
  name: string;
  canonical: string;
  quantity?: number;
  unit?: string;
}

const SYSTEM_PROMPT = [
  'Extraes productos de tickets de supermercado españoles. Devuelves ÚNICAMENTE',
  'productos de alimentación y bebida. Ignora todo lo que no sea comida: cabeceras,',
  'direcciones, totales, IVA, descuentos, formas de pago, bolsas, y productos de',
  'limpieza, higiene o droguería. Devuelves solo datos estructurados según el esquema.',
].join(' ');

function buildPrompt(ticket: string): string {
  return [
    'Extrae todos los productos de alimentación y bebida de este ticket.',
    'Para cada producto devuelve:',
    '- name: nombre legible y corto en español (sin marca ni precio).',
    "- canonical: el alimento base en singular y minúsculas (p.ej. 'pollo', 'yogur',",
    "  'tomate', 'leche', 'atún', 'manzana', 'pan'). Si son varios, el principal.",
    '- quantity y unit si aparecen (número y unidad como g, kg, l, ud).',
    'No inventes productos que no estén. Ignora líneas que no sean comida.',
    '',
    'TICKET:',
    ticket,
  ].join('\n');
}

function toProduct(item: AITicketItem): Product {
  const def = canonicalize(item.canonical) ?? canonicalize(item.name);
  return {
    id: newId('p'),
    raw: item.name,
    ingredientKey: def ? def.key : `otro:${normalizeText(item.canonical || item.name)}`,
    displayName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    source: 'foto',
    addedAt: Date.now(),
  };
}

/** Lee un ticket con IA y devuelve la lista de productos de alimentación. */
export async function parseTicketWithAI(
  ticket: string,
  apiKey: string,
  model?: string,
): Promise<Product[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || DEFAULT_AI_MODEL,
        max_tokens: 12000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(ticket) }],
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
        },
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError')
      throw new Error('La lectura del ticket tardó demasiado. Inténtalo de nuevo.');
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
      // sin cuerpo
    }
    if (res.status === 401) throw new Error('Clave de API no válida. Revísala en Ajustes.');
    if (res.status === 429) throw new Error('Se alcanzó el límite de la API. Prueba en un momento.');
    throw new Error(detail || `Error de la API (${res.status}).`);
  }

  const data = await res.json();
  if (data?.stop_reason === 'refusal') throw new Error('La IA rechazó la petición.');

  const blocks: { type: string; text?: string }[] = data?.content ?? [];
  const text = blocks.find((b) => b.type === 'text')?.text ?? '';
  let parsed: { products?: AITicketItem[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('No se pudo interpretar la respuesta de la IA.');
  }

  const items = (parsed.products ?? []).filter((it) => it && it.name);

  // Deduplica por clave de ingrediente reconocida (los "otros" no se deduplican)
  const seen = new Set<string>();
  const products: Product[] = [];
  for (const it of items) {
    const product = toProduct(it);
    if (!product.ingredientKey.startsWith('otro:')) {
      if (seen.has(product.ingredientKey)) continue;
      seen.add(product.ingredientKey);
    }
    products.push(product);
  }
  return products;
}
