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
  'i.v.a',
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
  'dto',
  'ahorro',
  'euros',
  'caja',
  'tel',
  'cif',
  'nif',
  'bolsa',
  'puntos',
  'socio',
  'tarjeta cliente',
  'fecha',
  'hora',
  'precio',
  'base imponible',
  'articulos',
  'art.',
  'n. articulos',
  'atendido',
  'vuelta',
  'entregado',
  'redondeo',
  'www.',
  's.a',
  's.l',
  'c.b',
  'c/',
  'avda',
  'avenida',
  'calle',
  'plaza',
  'poligono',
  'polígono',
  'supermercado',
  'hipermercado',
];

// Palabras de productos que NO son alimentos (droguería, higiene, hogar…)
const NON_FOOD = [
  'detergente',
  'suavizante',
  'lejia',
  'lejía',
  'friegasuelos',
  'lavavajillas',
  'papel higienico',
  'papel higiénico',
  'servilleta',
  'pañal',
  'panal',
  'compresa',
  'gel',
  'champu',
  'champú',
  'jabon',
  'jabón',
  'desodorante',
  'pasta de dientes',
  'dentifrico',
  'dentífrico',
  'cepillo',
  'maquinilla',
  'bombilla',
  'pila',
  'mechero',
  'aluminio',
  'film',
  'basura',
  'estropajo',
  'bayeta',
  'ambientador',
];

function isIgnorable(line: string): boolean {
  const t = normalizeText(line);
  if (t.length < 2) return true;
  if (IGNORE_LINE.some((w) => t.includes(w))) return true;
  if (NON_FOOD.some((w) => t.includes(w))) return true;
  // Sólo números / símbolos (precios sueltos)
  if (/^[\d\s.,€*x%kglmun-]+$/i.test(t)) return true;
  // Necesita al menos una palabra de 3+ letras para ser un producto
  if (!/[a-zñáéíóúü]{3,}/i.test(t)) return true;
  return false;
}

/** Limpia el texto de una línea para mostrarla como nombre de producto */
function cleanDisplayName(raw: string): string {
  let s = raw
    .replace(/\d+[.,]\d{2}\s*€?\s*$/g, '') // precio final
    .replace(/[€]/g, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(kg|kgs|g|gr|gramos|l|ltr|ml|cl|ud|uds|unid|unidades|docena|pack|x)\b/gi, '')
    .replace(/\b[xX]\s*\d+\b/g, '')
    .replace(/^\d{3,}\s+/, '') // código de artículo al inicio
    .replace(/[*#|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Convierte el texto de un ticket (una línea por producto, típico de OCR o
 * pegado manual) en una lista de productos. Reconoce los ingredientes conocidos
 * y CONSERVA también los que no reconoce (como "otros"), para no perder nada.
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
    const { quantity, unit } = extractQuantity(line);
    const def = matchIngredient(line);

    if (def) {
      if (seenKeys.has(def.key)) continue; // no duplicar ingredientes conocidos
      seenKeys.add(def.key);
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
    } else {
      // Producto no reconocido: lo conservamos igualmente como "otro"
      const name = cleanDisplayName(line);
      if (name.length < 2) continue;
      const key = `otro:${normalizeText(name)}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      products.push({
        id: newId(),
        raw: line,
        ingredientKey: key,
        displayName: name,
        quantity,
        unit,
        source,
        addedAt: Date.now(),
      });
    }
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
FECHA 12/07/2026 CAJA 03
------------------------------
PECHUGA POLLO BANDEJA 500G   4,85
FILETES TERNERA 400G         6,20
JAMON YORK LONCHAS 200G      2,30
SALMON FRESCO 300G           6,50
ATUN CLARO PACK 3            2,95
HUEVOS FRESCOS DOCENA        2,10
LECHE ENTERA BRIK 6         4,50
YOGUR GRIEGO PACK 4          1,90
QUESO RALLADO 200G           1,60
TOMATE RAMA 1KG              1,80
CEBOLLA MALLA 1KG            0,99
PIMIENTO ROJO               1,45
CALABACIN GRANEL            1,20
BROCOLI PIEZA               1,45
ZANAHORIA BOLSA 1KG         0,90
PATATA 2KG                  1,75
LECHUGA ICEBERG             0,89
AGUACATE PACK 2             2,50
PLATANO CANARIO 1KG         1,75
MANZANA GOLDEN 1KG          1,60
ARROZ LARGO 1KG             1,15
PASTA MACARRONES 500G       0,95
PAN MOLDE INTEGRAL          1,40
AVENA COPOS 500G            1,25
GARBANZOS BOTE              0,80
ACEITE OLIVA VIRGEN 1L      6,50
DETERGENTE LIQUIDO 2L       4,50
------------------------------
TOTAL                       67,08
TARJETA                     67,08
GRACIAS POR SU COMPRA`;
