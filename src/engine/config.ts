// Configuración ÚNICA y documentada del motor de sugerencias.
// Ajusta el comportamiento sin tocar la lógica: cambia estos pesos/parámetros.
//
// score = w_coverage·cobertura_ticket
//       + w_affinity·afinidad_culinaria
//       + w_novelty·novedad
//       − w_repetition·penalizacion_repeticion
//       − w_missing·ingredientes_faltantes

export interface EngineWeights {
  /** w1 — aprovechar los ingredientes del ticket/despensa */
  coverage: number;
  /** w2 — coherencia culinaria (afinidades entre ingredientes) */
  affinity: number;
  /** w3 — novedad (recetas generadas / poco vistas) */
  novelty: number;
  /** w4 — penalización por repetición reciente (multiplica al decaimiento) */
  repetition: number;
  /** w5 — penalización por ingredientes que faltan por comprar */
  missing: number;
}

export interface AntiRepeatConfig {
  /** nº de generaciones recientes que se consideran para la penalización */
  window: number;
  /** factor de decaimiento exponencial por antigüedad (0..1) */
  decay: number;
  /** peso de repetir la MISMA receta */
  wRecipe: number;
  /** peso de repetir la misma PROTEÍNA principal */
  wProtein: number;
  /** peso de repetir la misma TÉCNICA */
  wTechnique: number;
  /** cooldown duro: la misma receta no puede reaparecer en las últimas N generaciones */
  cooldownRecipe: number;
  /** cooldown duro: la misma proteína no puede reaparecer en las últimas N generaciones */
  cooldownProtein: number;
}

export interface EngineConfig {
  weights: EngineWeights;
  antiRepeat: AntiRepeatConfig;
  /** MMR: 0 = solo relevancia, 1 = solo diversidad */
  mmrLambda: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  weights: {
    coverage: 1.6,
    affinity: 1.0,
    novelty: 1.2,
    repetition: 1.0,
    missing: 0.8,
  },
  antiRepeat: {
    window: 30,
    decay: 0.85,
    wRecipe: 3,
    wProtein: 1,
    wTechnique: 0.6,
    cooldownRecipe: 30,
    cooldownProtein: 2,
  },
  mmrLambda: 0.7,
};
