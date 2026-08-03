// Capa de canonicalización de ingredientes.
//
// Punto de entrada ÚNICO para convertir texto libre (línea de ticket, entrada
// manual) en una clave de ingrediente canónica. Combina:
//   1) el matcher por keywords existente (alta precisión, gana la palabra más larga),
//   2) una tabla de alias centralizada (regional/catalán/inglés/comercial) con
//      normalización de singular/plural, como REFUERZO (nunca regresa lo anterior).
//
// Es lógica pura (sin React Native) para poder testearla en node.
import {
  IngredientDef,
  INGREDIENT_BY_KEY,
  matchIngredient,
  normalizeText,
} from '../data/ingredients';
import { INGREDIENT_ALIASES } from '../data/aliases';

// Alias de varias palabras, ordenados de más largo a más corto para preferir la
// coincidencia más específica.
const MULTIWORD_ALIASES: [string, string][] = Object.entries(INGREDIENT_ALIASES)
  .filter(([alias]) => alias.includes(' '))
  .sort((a, b) => b[0].length - a[0].length);

const UNIT_RE =
  /\b\d+(?:[.,]\d+)?\s*(kg|kgs|g|gr|gramos|l|ltr|ml|cl|ud|uds|unid|unidades|docena|pack|x)\b/gi;

/** Normaliza y quita ruido de ticket (precios, gramajes, símbolos, códigos). */
export function stripNoise(raw: string): string {
  return normalizeText(raw)
    .replace(/\d+[.,]\d{2}\s*€?/g, ' ') // precios "1,75 €"
    .replace(UNIT_RE, ' ') // "500 g", "2 kg"...
    .replace(/[€*#|]+/g, ' ')
    .replace(/\b\d+\b/g, ' ') // números sueltos
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Variantes singular/plural de un token en español (heurística simple). */
export function singularVariants(token: string): string[] {
  const out = [token];
  if (token.length > 4 && token.endsWith('es')) out.push(token.slice(0, -2)); // limones -> limon
  if (token.length > 3 && token.endsWith('s')) out.push(token.slice(0, -1)); // tomates -> tomate
  return out;
}

function aliasLookup(norm: string): IngredientDef | null {
  // 1) alias multi-palabra contenidos en el texto
  for (const [alias, key] of MULTIWORD_ALIASES) {
    if (norm.includes(alias)) {
      const def = INGREDIENT_BY_KEY[key];
      if (def) return def;
    }
  }
  // 2) alias por token exacto, probando singular/plural
  for (const tok of norm.split(/\s+/).filter(Boolean)) {
    for (const v of singularVariants(tok)) {
      const key = INGREDIENT_ALIASES[v];
      if (key && INGREDIENT_BY_KEY[key]) return INGREDIENT_BY_KEY[key];
    }
  }
  return null;
}

/**
 * Resuelve texto libre a una definición de ingrediente canónica, o null si no se
 * reconoce. El matcher por keywords tiene prioridad; los alias solo añaden
 * cobertura cuando aquel no encuentra nada (estrictamente aditivo).
 */
export function canonicalize(raw: string): IngredientDef | null {
  const byKeyword = matchIngredient(raw);
  if (byKeyword) return byKeyword;
  return aliasLookup(stripNoise(raw));
}

/** Igual que canonicalize pero devuelve solo la clave (o null). */
export function canonicalKey(raw: string): string | null {
  return canonicalize(raw)?.key ?? null;
}
