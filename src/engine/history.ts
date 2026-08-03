// Historial de sugerencias y anti-repetición.
//
// Guarda un registro por receta sugerida (firma, proteína, técnica, timestamp y
// si el usuario la cocinó/descartó) y calcula la penalización por recencia
// (decaimiento exponencial sobre las últimas N generaciones) y el cooldown duro
// por receta y por proteína principal. La persistencia (AsyncStorage) es un
// adaptador aparte; aquí todo es lógica pura para poder testearla.
import { Recipe } from '../types';
import { hashSeed } from './rng';
import { mainProteinKey, inferTechnique } from '../data/culinary';
import { AntiRepeatConfig, DEFAULT_CONFIG } from './config';

export interface SuggestionRecord {
  sig: string; // firma estable de la receta (ingredientes principales + técnica)
  protein: string | null;
  technique: string;
  ts: number;
  cooked?: boolean;
  discarded?: boolean;
}

export type SuggestionHistory = SuggestionRecord[]; // orden: más antiguo -> más reciente

export function recipeTechnique(r: Recipe): string {
  return r.technique ?? inferTechnique(r);
}

/** Firma estable: dos recetas con los mismos ingredientes principales y técnica coinciden. */
export function recipeSignature(r: Recipe): string {
  const main = r.ingredients
    .filter((i) => !i.staple)
    .map((i) => i.key)
    .sort();
  return 'sig_' + hashSeed(main.join(',') + '|' + recipeTechnique(r)).toString(36);
}

export function toRecord(r: Recipe, ts: number = Date.now()): SuggestionRecord {
  return {
    sig: recipeSignature(r),
    protein: mainProteinKey(r),
    technique: recipeTechnique(r),
    ts,
  };
}

/** Añade registros al historial y lo recorta a un máximo razonable. */
export function pushHistory(
  history: SuggestionHistory,
  records: SuggestionRecord[],
  maxLen = 200,
): SuggestionHistory {
  const next = [...history, ...records];
  return next.length > maxLen ? next.slice(next.length - maxLen) : next;
}

/**
 * Penalización por recencia: suma de contribuciones con decaimiento exponencial
 * por antigüedad para coincidencias de receta, proteína y técnica en la ventana.
 * Cuanto más reciente y más repetido, mayor penalización.
 */
export function recencyPenalty(
  history: SuggestionHistory,
  r: Recipe,
  cfg: AntiRepeatConfig = DEFAULT_CONFIG.antiRepeat,
): number {
  const sig = recipeSignature(r);
  const protein = mainProteinKey(r);
  const technique = recipeTechnique(r);
  const recent = history.slice(-cfg.window);
  let penalty = 0;
  for (let idx = 0; idx < recent.length; idx++) {
    const rec = recent[idx];
    const age = recent.length - 1 - idx; // 0 = más reciente
    const w = Math.pow(cfg.decay, age);
    if (rec.sig === sig) penalty += cfg.wRecipe * w;
    if (protein && rec.protein === protein) penalty += cfg.wProtein * w;
    if (rec.technique === technique) penalty += cfg.wTechnique * w;
  }
  return penalty;
}

/** Cooldown duro: ¿la receta o su proteína han aparecido demasiado recientemente? */
export function inCooldown(
  history: SuggestionHistory,
  r: Recipe,
  cfg: AntiRepeatConfig = DEFAULT_CONFIG.antiRepeat,
): boolean {
  const sig = recipeSignature(r);
  const protein = mainProteinKey(r);
  const lastRecipe = history.slice(-cfg.cooldownRecipe);
  if (lastRecipe.some((rec) => rec.sig === sig)) return true;
  if (protein) {
    const lastProtein = history.slice(-cfg.cooldownProtein);
    if (lastProtein.some((rec) => rec.protein === protein)) return true;
  }
  return false;
}
