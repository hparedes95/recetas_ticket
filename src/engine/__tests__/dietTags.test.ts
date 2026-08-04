import { deriveTags } from '../dietTags';
import { generateRecipes } from '../generator';
import { INGREDIENT_BY_KEY } from '../../data/ingredients';

describe('deriveTags', () => {
  it('NO marca sin_gluten si hay cereales con gluten (incl. cuscús)', () => {
    expect(deriveTags(['cuscus', 'pollo', 'tomate'])).not.toContain('sin_gluten');
    expect(deriveTags(['pan', 'huevo'])).not.toContain('sin_gluten');
    expect(deriveTags(['avena', 'platano'])).not.toContain('sin_gluten');
    // arroz/quinoa/patata sí son sin gluten
    expect(deriveTags(['arroz', 'pollo', 'tomate'])).toContain('sin_gluten');
  });

  it('marca sin_lactosa solo sin lácteos', () => {
    expect(deriveTags(['pollo', 'arroz'])).toContain('sin_lactosa');
    expect(deriveTags(['pollo', 'queso'])).not.toContain('sin_lactosa');
    expect(deriveTags(['proteina_polvo', 'platano'])).not.toContain('sin_lactosa'); // whey
  });

  it('vegano implica vegetariano; carne/pescado lo excluyen', () => {
    const t = deriveTags(['garbanzos', 'tomate', 'espinacas']);
    expect(t).toEqual(expect.arrayContaining(['vegano', 'vegetariano']));
    expect(deriveTags(['pollo', 'arroz'])).not.toContain('vegetariano');
    expect(deriveTags(['huevo', 'tomate'])).toContain('vegetariano'); // ovolácteo, no vegano
    expect(deriveTags(['huevo', 'tomate'])).not.toContain('vegano');
  });

  it('regresión: ninguna receta generada con cuscús se etiqueta sin_gluten', () => {
    const recetas = generateRecipes(
      new Set(['cuscus', 'pollo', 'tomate', 'pimiento', 'calabacin', 'garbanzos']),
      { seed: 21, max: 8 },
    );
    for (const r of recetas) {
      const usaCuscus = r.ingredients.some((i) => i.key === 'cuscus');
      if (usaCuscus) expect(r.tags).not.toContain('sin_gluten');
      // y factible
      for (const i of r.ingredients) expect(INGREDIENT_BY_KEY[i.key]).toBeTruthy();
    }
  });
});
