// Regresión de factibilidad: ninguna receta del catálogo puede usar una clave de
// ingrediente que no exista en INGREDIENTS. Además valida que los módulos reales
// del motor cargan bajo el harness de tests.
import { RECIPES } from '../../data/recipes';
import { INGREDIENT_BY_KEY } from '../../data/ingredients';
import { generatePlans } from '../planner';

describe('factibilidad del catálogo', () => {
  it('todas las claves de ingrediente de las recetas existen en INGREDIENTS', () => {
    const huerfanas: string[] = [];
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        if (!INGREDIENT_BY_KEY[ing.key]) huerfanas.push(`${r.id} -> ${ing.key}`);
      }
    }
    expect(huerfanas).toEqual([]);
  });

  it('las recetas tienen macros completos e ids únicos', () => {
    const ids = new Set<string>();
    for (const r of RECIPES) {
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
      for (const k of ['kcal', 'protein', 'carbs', 'fat'] as const) {
        expect(typeof r.macros[k]).toBe('number');
      }
      expect(r.slot.length).toBeGreaterThan(0);
      expect(r.goals.length).toBeGreaterThan(0);
    }
  });

  it('generatePlans carga y produce un plan por objetivo', () => {
    const pantry = ['pollo', 'arroz', 'tomate', 'huevo', 'aceite'].map((k, i) => ({
      id: 'p' + i,
      raw: k,
      ingredientKey: k,
      displayName: k,
      source: 'manual' as const,
      addedAt: 0,
    }));
    const prefs = {
      people: 2,
      defaultGoal: 'saludable' as const,
      restrictions: [],
      dislikes: [],
      mealsPerDay: ['desayuno', 'comida', 'cena'] as const,
      calorieTarget: 2000,
      macroSplit: { protein: 30, carbs: 40, fat: 30 },
      aiApiKey: null,
      useAI: false,
      onboarded: true,
    };
    const plans = generatePlans(pantry, { ...prefs, mealsPerDay: [...prefs.mealsPerDay] });
    expect(plans.length).toBe(5);
    for (const plan of plans) expect(plan.meals.length).toBeGreaterThan(0);
  });
});
