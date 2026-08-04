import { suggestRecipes, analyzeCoverage } from '../suggest';
import { isFeasible } from '../generator';
import { RECIPES } from '../../data/recipes';
import { INGREDIENT_BY_KEY } from '../../data/ingredients';

const PANTRY = new Set([
  'pollo', 'salmon', 'huevo', 'garbanzos', 'tomate', 'brocoli', 'calabacin',
  'pimiento', 'espinacas', 'arroz', 'patata', 'quinoa', 'cebolla',
]);

describe('cobertura y sustituciones', () => {
  it('separa usa-del-ticket, básicos y faltantes', () => {
    const paella = RECIPES.find((r) => r.id === 'r_paella')!;
    const a = analyzeCoverage(paella, new Set(['pollo', 'arroz', 'tomate']));
    expect(a.usesFromTicket).toEqual(expect.arrayContaining(['pollo', 'arroz', 'tomate']));
    expect(a.pantryBasics).toContain('aceite'); // básico asumido
    // conejo y judía verde faltan (o se sustituyen)
    const faltanYsust = [...a.missing.map((m) => m.key), ...a.substitutions.map((s) => s.missing)];
    expect(faltanYsust).toContain('judia_verde');
  });

  it('los faltantes usan el nombre canónico del ingrediente', () => {
    const ajoblanco = RECIPES.find((r) => r.id === 'r_ajoblanco')!; // usa frutos_secos "Almendra cruda"
    const a = analyzeCoverage(ajoblanco, new Set());
    const fs = a.missing.find((m) => m.key === 'frutos_secos');
    expect(fs?.name).toBe('Frutos secos'); // canónico, no "Almendra cruda"
  });

  it('propone un sustituto de la misma categoría y rol', () => {
    const polloAjillo = RECIPES.find((r) => r.id === 'r_pollo_ajillo')!;
    // Tengo pavo, no pollo: debería sugerir pavo como sustituto
    const a = analyzeCoverage(polloAjillo, new Set(['pavo']));
    expect(a.substitutions).toEqual(
      expect.arrayContaining([{ missing: 'pollo', use: 'pavo' }]),
    );
    expect(a.missing.map((m) => m.key)).not.toContain('pollo');
  });
});

describe('suggestRecipes', () => {
  it('devuelve un lote factible del tamaño pedido', () => {
    const sugs = suggestRecipes(PANTRY, { count: 4, seed: 1 });
    expect(sugs.length).toBe(4);
    for (const s of sugs) {
      expect(isFeasible(s.recipe)).toBe(true);
      for (const k of s.usesFromTicket) expect(PANTRY.has(k)).toBe(true);
      expect(INGREDIENT_BY_KEY[s.recipe.ingredients[0].key]).toBeTruthy();
    }
  });

  it('el lote es diverso en proteína (MMR)', () => {
    const sugs = suggestRecipes(PANTRY, { count: 4, seed: 2 });
    const proteins = sugs
      .map((s) => s.recipe.ingredients.find((i) => {
        const c = INGREDIENT_BY_KEY[i.key]?.category;
        return c === 'carne' || c === 'pescado' || c === 'huevo' || c === 'legumbre';
      })?.key)
      .filter(Boolean);
    // al menos 3 proteínas distintas entre 4 sugerencias
    expect(new Set(proteins).size).toBeGreaterThanOrEqual(3);
  });

  it('incluye recetas generadas (no solo catálogo)', () => {
    const sugs = suggestRecipes(PANTRY, { count: 6, seed: 3 });
    // Con MMR y novedad, es muy probable que aparezca alguna generada
    const anyGenerated = suggestRecipes(PANTRY, { count: 10, seed: 3 }).some((s) => s.recipe.generated);
    expect(anyGenerated).toBe(true);
  });

  it('respeta restricciones dietéticas', () => {
    const sugs = suggestRecipes(PANTRY, { count: 4, seed: 4, restrictions: ['vegano'] });
    for (const s of sugs) expect(s.recipe.tags).toContain('vegano');
  });
});
