// Selección de lote por MMR (Maximal Marginal Relevance).
//
// En vez de coger el top-N por score, elige maximizando
//   relevancia − λ · (máxima similitud con lo ya seleccionado)
// para que el lote sea diverso (distintas proteínas, técnicas e ingredientes).
import { Recipe } from '../types';
import { mainProteinKey } from '../data/culinary';
import { recipeTechnique } from './history';

/** Similitud 0..1 entre dos recetas por proteína, técnica e ingredientes. */
export function recipeSimilarity(a: Recipe, b: Recipe): number {
  let sim = 0;
  const pa = mainProteinKey(a);
  const pb = mainProteinKey(b);
  if (pa && pa === pb) sim += 0.4;
  if (recipeTechnique(a) === recipeTechnique(b)) sim += 0.3;
  const ka = new Set(a.ingredients.filter((i) => !i.staple).map((i) => i.key));
  const kb = new Set(b.ingredients.filter((i) => !i.staple).map((i) => i.key));
  const inter = [...ka].filter((k) => kb.has(k)).length;
  const union = new Set([...ka, ...kb]).size || 1;
  sim += 0.3 * (inter / union);
  return Math.min(1, sim);
}

export interface Scored {
  recipe: Recipe;
  relevance: number;
}

/**
 * Selecciona hasta k recetas por MMR. lambda ∈ [0,1]: 0 = solo relevancia,
 * 1 = solo diversidad. Determinista dado el orden de entrada.
 */
export function selectMMR(items: Scored[], k: number, lambda: number): Recipe[] {
  const pool = [...items];
  const selected: Recipe[] = [];
  while (selected.length < k && pool.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const maxSim = selected.reduce(
        (m, s) => Math.max(m, recipeSimilarity(pool[i].recipe, s)),
        0,
      );
      const mmr = (1 - lambda) * pool[i].relevance - lambda * maxSim;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = i;
      }
    }
    selected.push(pool[bestIdx].recipe);
    pool.splice(bestIdx, 1);
  }
  return selected;
}
