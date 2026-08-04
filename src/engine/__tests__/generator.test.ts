import { generateRecipes, isFeasible } from '../generator';
import { mainProteinKey } from '../../data/culinary';
import { INGREDIENT_BY_KEY } from '../../data/ingredients';

const PANTRY = new Set([
  'pollo', 'salmon', 'huevo', 'garbanzos', 'tofu', 'ternera',
  'tomate', 'brocoli', 'calabacin', 'pimiento', 'espinacas', 'zanahoria', 'champinon',
  'arroz', 'patata', 'quinoa', 'boniato',
]);

describe('generador por plantillas', () => {
  it('todas las recetas generadas son factibles (0 claves inexistentes)', () => {
    const recetas = generateRecipes(PANTRY, { seed: 1, max: 8 });
    expect(recetas.length).toBeGreaterThan(0);
    for (const r of recetas) {
      expect(isFeasible(r)).toBe(true);
      for (const i of r.ingredients) expect(INGREDIENT_BY_KEY[i.key]).toBeTruthy();
    }
  });

  it('es determinista: misma semilla → mismo resultado', () => {
    const a = generateRecipes(PANTRY, { seed: 42 });
    const b = generateRecipes(PANTRY, { seed: 42 });
    expect(a.map((r) => r.name)).toEqual(b.map((r) => r.name));
  });

  it('distinta semilla → resultado distinto (variedad)', () => {
    const a = generateRecipes(PANTRY, { seed: 1 }).map((r) => r.name);
    const b = generateRecipes(PANTRY, { seed: 999 }).map((r) => r.name);
    expect(a).not.toEqual(b);
  });

  it('diversidad de lote: máx 1 por técnica y máx 1 por proteína', () => {
    const recetas = generateRecipes(PANTRY, { seed: 7, max: 8 });
    const techs = recetas.map((r) => r.technique);
    const proteins = recetas.map((r) => mainProteinKey(r));
    expect(new Set(techs).size).toBe(techs.length); // sin técnicas repetidas
    expect(new Set(proteins).size).toBe(proteins.length); // sin proteínas repetidas
  });

  it('macros recalculados desde la BD y pasos concretos (no genéricos)', () => {
    const recetas = generateRecipes(PANTRY, { seed: 3 });
    for (const r of recetas) {
      expect(r.macros.kcal).toBeGreaterThan(120);
      expect(r.steps.length).toBeGreaterThanOrEqual(3);
      expect(r.steps.join(' ')).not.toMatch(/hasta que est[eé] listo/i);
    }
  });

  it('respeta la restricción vegana', () => {
    const recetas = generateRecipes(PANTRY, { seed: 5, restrictions: ['vegano'] });
    expect(recetas.length).toBeGreaterThan(0);
    for (const r of recetas) expect(r.tags).toContain('vegano');
  });

  it('concordancia del nombre y verduras de bowl aptas en crudo', () => {
    const recetas = generateRecipes(
      new Set(['garbanzos', 'pollo', 'huevo', 'tomate', 'pepino', 'aguacate', 'arroz', 'champinon', 'brocoli']),
      { seed: 11, max: 8 },
    );
    for (const r of recetas) {
      if (/^Garbanzos saltead/.test(r.name)) expect(r.name).toContain('salteados');
      if (r.name.startsWith('Bowl')) {
        const vegs = r.ingredients
          .filter((i) => INGREDIENT_BY_KEY[i.key]?.category === 'verdura' && !i.staple)
          .map((i) => i.key);
        for (const v of vegs) expect(['champinon', 'brocoli', 'berenjena']).not.toContain(v);
      }
    }
  });

  it('respeta dislikes', () => {
    const recetas = generateRecipes(PANTRY, { seed: 5, dislikes: ['pollo', 'salmon', 'ternera'] });
    for (const r of recetas) {
      expect(r.ingredients.map((i) => i.key)).not.toContain('pollo');
    }
  });
});
