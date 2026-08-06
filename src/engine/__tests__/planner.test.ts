import { generatePlans } from '../planner';
import { generateRecipes } from '../generator';
import { RECIPE_BY_ID } from '../../data/recipes';
import { Preferences, Product } from '../../types';

function pantry(keys: string[]): Product[] {
  return keys.map((k, i) => ({ id: 'p' + i, raw: k, ingredientKey: k, displayName: k, source: 'manual' as const, addedAt: 0 }));
}
const PREFS: Preferences = {
  people: 2, defaultGoal: 'saludable', restrictions: [], dislikes: [], likes: [],
  mealsPerDay: ['desayuno', 'comida', 'cena'], calorieTarget: 2000,
  macroSplit: { protein: 30, carbs: 40, fat: 30 }, aiApiKey: null, useAI: false, onboarded: true,
};
const KEYS = ['pollo', 'salmon', 'garbanzos', 'tomate', 'brocoli', 'arroz', 'patata', 'huevo', 'espinacas', 'quinoa', 'yogur', 'avena', 'platano'];

describe('planner con recetas generadas', () => {
  it('no rompe la firma antigua (sin extras)', () => {
    const plans = generatePlans(pantry(KEYS), PREFS);
    expect(plans.length).toBe(5);
    for (const p of plans) expect(p.meals.length).toBeGreaterThan(0);
  });

  it('integra recetas generadas y todos los meals resuelven', () => {
    const extras = generateRecipes(new Set(KEYS), { seed: 1, goal: 'saludable', slot: 'comida', max: 8 });
    const merged: Record<string, (typeof extras)[number]> = { ...RECIPE_BY_ID };
    for (const r of extras) merged[r.id] = r;
    const plans = generatePlans(pantry(KEYS), PREFS, extras);
    for (const p of plans) {
      for (const m of p.meals) expect(merged[m.recipeId]).toBeTruthy();
      expect(p.avgDailyMacros.kcal).toBeGreaterThan(0);
    }
  });
});
