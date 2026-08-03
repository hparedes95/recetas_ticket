// Tests de ACEPTACIÓN del motor: 60 tickets simulados con solapamiento realista.
// Verifica repetición, diversidad, cobertura, factibilidad y rendimiento.
import { suggestRecipes } from '../suggest';
import { isFeasible } from '../generator';
import { recipeSignature, toRecord, pushHistory, SuggestionHistory } from '../history';
import { mainProteinKey } from '../../data/culinary';
import { DEFAULT_CONFIG } from '../config';

// Ingredientes base siempre presentes (solapamiento realista entre tickets).
const BASE = ['tomate', 'cebolla', 'aceite', 'ajo', 'arroz', 'pasta', 'patata', 'huevo'];
// Rotamos verduras y proteínas para variar el ticket manteniendo solapamiento.
const VEG_POOL = ['brocoli', 'calabacin', 'pimiento', 'espinacas', 'zanahoria', 'champinon', 'berenjena', 'guisante', 'judia_verde', 'puerro'];
const PROT_POOL = ['pollo', 'salmon', 'ternera', 'garbanzos', 'lentejas', 'tofu', 'merluza', 'atun', 'bacalao', 'conejo'];

function ticketFor(i: number): Set<string> {
  const keys = new Set(BASE);
  for (let j = 0; j < 5; j++) keys.add(VEG_POOL[(i + j) % VEG_POOL.length]);
  for (let j = 0; j < 4; j++) keys.add(PROT_POOL[(i * 3 + j) % PROT_POOL.length]);
  return keys;
}

describe('aceptación: 60 tickets simulados', () => {
  const CONFIG = {
    ...DEFAULT_CONFIG,
    antiRepeat: { ...DEFAULT_CONFIG.antiRepeat, cooldownRecipe: 100, cooldownProtein: 3 },
  };
  const BATCHES = 60;
  const COUNT = 3;

  // Ejecuta la simulación una vez y comparte métricas entre asserts.
  const lastSeen = new Map<string, number>();
  let minGap = Infinity;
  const proteinCounts = new Map<string, number>();
  let totalProteinSuggestions = 0;
  let totalSuggestions = 0;
  let coverageSum = 0;
  let allFeasible = true;
  let history: SuggestionHistory = [];

  beforeAll(() => {
    for (let b = 0; b < BATCHES; b++) {
      const pantry = ticketFor(b);
      const sugs = suggestRecipes(pantry, { count: COUNT, seed: b + 1, config: CONFIG, history });
      for (const s of sugs) {
        totalSuggestions++;
        coverageSum += s.coverage;
        if (!isFeasible(s.recipe)) allFeasible = false;
        const sig = recipeSignature(s.recipe);
        if (lastSeen.has(sig)) minGap = Math.min(minGap, b - lastSeen.get(sig)!);
        lastSeen.set(sig, b);
        const prot = mainProteinKey(s.recipe);
        if (prot) {
          proteinCounts.set(prot, (proteinCounts.get(prot) ?? 0) + 1);
          totalProteinSuggestions++;
        }
        history = pushHistory(history, [toRecord(s.recipe, b)]);
      }
    }
    // Informe de métricas
    const maxProt = Math.max(...proteinCounts.values());
    // eslint-disable-next-line no-console
    console.log('\n=== MÉTRICAS 60 TICKETS ===');
    console.log(`Sugerencias totales: ${totalSuggestions}`);
    console.log(`Recetas distintas: ${lastSeen.size}`);
    console.log(`Repetición: gap mínimo entre repeticiones = ${minGap === Infinity ? 'sin repeticiones' : minGap + ' generaciones'}`);
    console.log(`Cobertura media: ${(coverageSum / totalSuggestions * 100).toFixed(1)}%`);
    console.log(`Proteína más frecuente: ${(maxProt / totalProteinSuggestions * 100).toFixed(1)}% del total`);
    console.log('Reparto de proteínas:', Object.fromEntries([...proteinCounts.entries()].sort((a, b) => b[1] - a[1])));
  });

  it('todas las sugerencias son factibles', () => {
    expect(allFeasible).toBe(true);
  });

  it('ninguna receta se repite en menos de 30 generaciones', () => {
    expect(minGap).toBeGreaterThanOrEqual(30);
  });

  it('ninguna proteína principal supera el 20% del total', () => {
    const maxProt = Math.max(...proteinCounts.values());
    expect(maxProt / totalProteinSuggestions).toBeLessThanOrEqual(0.2);
  });

  it('la cobertura media es razonable (> 30%)', () => {
    expect(coverageSum / totalSuggestions).toBeGreaterThan(0.3);
  });
});

describe('benchmark de rendimiento', () => {
  it('genera un lote en < 150 ms', () => {
    const pantry = ticketFor(0);
    // warm-up (carga de módulos)
    suggestRecipes(pantry, { count: 4, seed: 1 });
    const t0 = Date.now();
    const N = 10;
    for (let i = 0; i < N; i++) suggestRecipes(ticketFor(i), { count: 4, seed: i });
    const perBatch = (Date.now() - t0) / N;
    // eslint-disable-next-line no-console
    console.log(`\n⏱️  Tiempo medio por lote: ${perBatch.toFixed(1)} ms`);
    expect(perBatch).toBeLessThan(150);
  });
});
