import {
  NUTRITION_PER_100G,
  nutritionFor,
  gramsOf,
  computeMacrosPerServing,
} from '../../data/nutrition';
import { RECIPES } from '../../data/recipes';
import { INGREDIENT_BY_KEY } from '../../data/ingredients';

describe('nutrición por-100g', () => {
  it('cada ingrediente NO básico usado en recetas tiene valor propio', () => {
    const faltan = new Set<string>();
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        const staple = ing.staple || INGREDIENT_BY_KEY[ing.key]?.staple;
        if (staple) continue;
        if (!NUTRITION_PER_100G[ing.key]) faltan.add(ing.key);
      }
    }
    expect([...faltan]).toEqual([]);
  });

  it('nutritionFor siempre devuelve kcal positivos (con fallback por categoría)', () => {
    for (const key of Object.keys(INGREDIENT_BY_KEY)) {
      expect(nutritionFor(key).kcal).toBeGreaterThan(0);
    }
  });

  it('convierte unidades a gramos de forma razonable', () => {
    expect(gramsOf('arroz', 400, 'g')).toBe(400);
    expect(gramsOf('tomate', 1, 'kg')).toBe(1000);
    expect(gramsOf('huevo', 2, 'ud')).toBe(116);
    expect(gramsOf('leche', 200, 'ml')).toBe(200);
    expect(gramsOf('aceite', undefined, undefined)).toBe(10); // básico sin cantidad
  });

  it('recomputa macros por ración en rango sano para una receta conocida', () => {
    const paella = RECIPES.find((r) => r.id === 'r_paella')!;
    const m = computeMacrosPerServing(paella.ingredients, paella.servings);
    expect(m.kcal).toBeGreaterThan(250);
    expect(m.kcal).toBeLessThan(1200);
    expect(m.protein).toBeGreaterThan(10);
  });
});
