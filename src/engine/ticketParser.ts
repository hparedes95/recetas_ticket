import { Product } from '../types';
import {
  extractQuantity,
  INGREDIENT_BY_KEY,
  matchIngredient,
  normalizeText,
} from '../data/ingredients';

let counter = 0;
export function newId(prefix = 'p'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/** Líneas que suelen aparecer en tickets y que NO son productos */
const IGNORE_LINE = [
  'total',
  'iva',
  'efectivo',
  'tarjeta',
  'cambio',
  'gracias',
  'factura',
  'ticket',
  'cliente',
  'unidades',
  'importe',
  'subtotal',
  'descuento',
  'euros',
  'caja',
  'tel',
  'cif',
  'nif',
];

function isIgnorable(line: string): boolean {
  const t = normalizeText(line);
  if (t.length < 2) return true;
  if (IGNORE_LINE.some((w) => t.includes(w))) return true;
  // Sólo números / símbolos (precios sueltos)
  if (/^[\d\s.,€*x-]+$/.test(t)) return true;
  return false;
}

/**
 * Convierte el texto de un ticket (una línea por producto, típico de OCR o
 * pegado manual) en una lista de productos reconocidos.
 * `source` indica de dónde viene ('foto' o 'manual').
 */
export function parseTicketText(text: string, source: Product['source'] = 'foto'): Product[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const products: Product[] = [];
  const seenKeys = new Set<string>();

  for (const line of lines) {
    if (isIgnorable(line)) continue;
    const def = matchIngredient(line);
    if (!def) continue;
    // Evita duplicar el mismo ingrediente varias veces
    if (seenKeys.has(def.key)) continue;
    seenKeys.add(def.key);

    const { quantity, unit } = extractQuantity(line);
    products.push({
      id: newId(),
      raw: line,
      ingredientKey: def.key,
      displayName: def.name,
      quantity,
      unit,
      source,
      addedAt: Date.now(),
    });
  }
  return products;
}

/** Crea un producto a partir de una clave de ingrediente conocida */
export function productFromKey(key: string, source: Product['source']): Product | null {
  const def = INGREDIENT_BY_KEY[key];
  if (!def) return null;
  return {
    id: newId(),
    raw: def.name,
    ingredientKey: def.key,
    displayName: def.name,
    source,
    addedAt: Date.now(),
  };
}

/**
 * Crea un producto desde texto libre escrito por el usuario. Intenta reconocer
 * el ingrediente; si no lo consigue, lo guarda igualmente como "otro".
 */
export function productFromText(raw: string, source: Product['source'] = 'manual'): Product {
  const def = matchIngredient(raw);
  const { quantity, unit } = extractQuantity(raw);
  return {
    id: newId(),
    raw: raw.trim(),
    ingredientKey: def ? def.key : `otro:${normalizeText(raw)}`,
    displayName: def ? def.name : raw.trim(),
    quantity,
    unit,
    source,
    addedAt: Date.now(),
  };
}

/** Texto de ticket de ejemplo para el botón "probar con un ejemplo" */
export const SAMPLE_TICKET = `SUPERMERCADO EL HUERTO
C/ Mayor 12 - Madrid
------------------------------
PECHUGA POLLO BANDEJA 500G   4,85
LOMO SALMON FRESCO 300G      6,20
HUEVOS FRESCOS DOCENA         2,10
ARROZ LARGO 1KG               1,15
PASTA MACARRONES 500G         0,95
TOMATE RAMA 1KG               1,80
CEBOLLA MALLA 1KG             0,99
CALABACIN GRANEL              1,20
BROCOLI PIEZA                 1,45
YOGUR GRIEGO PACK 4           1,90
PLATANO CANARIO 1KG           1,75
LECHUGA ICEBERG               0,89
QUESO RALLADO 200G            1,60
ACEITE OLIVA VIRGEN 1L        6,50
------------------------------
TOTAL                        34,33
GRACIAS POR SU COMPRA`;
