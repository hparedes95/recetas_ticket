import { recommendPlan, shoppingNeedsFromPlan, shoppableUniverse } from '../recommend';
import { RECIPE_BY_ID } from '../../data/recipes';
import { INGREDIENT_BY_KEY } from '../../data/ingredients';
import { weeklyCompliance, hasHeavyStarchBase } from '../../data/dietary';
import { Preferences, Product } from '../../types';

const PREFS: Preferences = {
  people: 2,
  defaultGoal: 'saludable',
  restrictions: [],
  dislikes: [],
  likes: [],
  mealsPerDay: ['desayuno', 'comida', 'cena'],
  calorieTarget: 2000,
  macroSplit: { protein: 30, carbs: 40, fat: 30 },
  aiApiKey: null,
  useAI: false,
  onboarded: true,
};

function pantry(keys: string[]): Product[] {
  return keys.map((k, i) => ({
    id: 'p' + i, raw: k, ingredientKey: k, displayName: k, source: 'manual' as const, addedAt: 0,
  }));
}

describe('universo comprable', () => {
  it('excluye bebidas y dulces, incluye alimentos', () => {
    const u = shoppableUniverse();
    expect(u.has('pollo')).toBe(true);
    expect(u.has('brocoli')).toBe(true);
    expect(u.has('cerveza')).toBe(false);
    expect(u.has('chuches')).toBe(false);
  });
});

describe('recommendPlan (flujo sin despensa)', () => {
  it('genera un plan completo aunque la despensa esté VACÍA', () => {
    const { plan, recipes, needs } = recommendPlan(PREFS, [], 'saludable', 7);
    expect(plan.meals.length).toBe(21); // 7 días × 3 comidas
    expect(needs.length).toBeGreaterThan(0);
    // todas las comidas resuelven (catálogo o generadas)
    const map = { ...RECIPE_BY_ID, ...recipes };
    for (const m of plan.meals) expect(map[m.recipeId]).toBeTruthy();
  });

  it('todo lo que pide comprar existe en la BD y no son básicos', () => {
    const { needs } = recommendPlan(PREFS, [], 'proteico', 3);
    for (const n of needs) {
      const def = INGREDIENT_BY_KEY[n.key];
      expect(def).toBeTruthy();
      expect(def!.staple === true).toBe(false); // los básicos no se compran
      expect(n.quantity).toBeGreaterThan(0);
      expect(n.unit).toBeTruthy();
      expect(n.category).toBeTruthy();
    }
  });

  it('descuenta lo que ya tienes en la despensa', () => {
    const { needs } = recommendPlan(PREFS, pantry(['pollo', 'arroz']), 'saludable', 11);
    const pollo = needs.find((n) => n.key === 'pollo');
    if (pollo) expect(pollo.alreadyHave).toBe(true);
    // los que hay que comprar van primero
    const idxHave = needs.findIndex((n) => n.alreadyHave);
    const idxBuy = needs.findIndex((n) => !n.alreadyHave);
    if (idxHave >= 0 && idxBuy >= 0) expect(idxBuy).toBeLessThan(idxHave);
  });

  it('NO repite ninguna comida en toda la semana', () => {
    for (const seed of [1, 2, 3, 7, 42, 99]) {
      const { plan } = recommendPlan(PREFS, [], 'saludable', seed);
      const ids = plan.meals.map((m) => m.recipeId);
      expect(new Set(ids).size).toBe(ids.length); // 21 comidas, 21 recetas distintas
    }
  });

  it('todas las comidas son fáciles (tiempo y pasos razonables)', () => {
    const { plan, recipes } = recommendPlan(PREFS, [], 'saludable', 5);
    const map = { ...RECIPE_BY_ID, ...recipes };
    for (const m of plan.meals) {
      const r = map[m.recipeId]!;
      expect(r.timeMinutes).toBeLessThanOrEqual(40);
      expect(r.steps.length).toBeLessThanOrEqual(5);
    }
  });

  it('cumple los estándares dietéticos semanales (AESAN / dieta mediterránea)', () => {
    for (const seed of [4, 8, 15, 16]) {
      const { plan, recipes } = recommendPlan(PREFS, [], 'saludable', seed);
      const map = { ...RECIPE_BY_ID, ...recipes };
      const mains = plan.meals
        .filter((m) => m.slot === 'comida' || m.slot === 'cena')
        .map((m) => map[m.recipeId]!);
      const c = weeklyCompliance(mains);
      expect(c.legumbresOk).toBe(true); // ≥4 raciones de legumbre/semana
      expect(c.pescadoOk).toBe(true); // ≥2 raciones de pescado/semana
      expect(c.carneRojaOk).toBe(true); // ≤3 de carne roja/semana
      expect(c.counts.ave).toBeLessThanOrEqual(4); // prioriza aves pero sin abusar
    }
  });

  it('las CENAS son ligeras y coherentes (nada de pasta/arroz de plato principal)', () => {
    for (const seed of [1, 6, 21, 33]) {
      const { plan, recipes } = recommendPlan(PREFS, [], 'saludable', seed);
      const map = { ...RECIPE_BY_ID, ...recipes };
      for (const m of plan.meals.filter((x) => x.slot === 'cena')) {
        const r = map[m.recipeId]!;
        expect(hasHeavyStarchBase(r)).toBe(false); // sin plato de pasta/arroz/patata
        expect(r.macros.kcal).toBeLessThanOrEqual(600);
      }
    }
  });

  it('NUNCA incluye un alimento que el usuario ha marcado como no deseado', () => {
    const noQuiero = ['atun', 'salmon', 'tofu', 'champinon'];
    const { plan, recipes, needs } = recommendPlan(
      { ...PREFS, dislikes: noQuiero }, [], 'saludable', 5,
    );
    const map = { ...RECIPE_BY_ID, ...recipes };
    for (const m of plan.meals) {
      for (const i of map[m.recipeId]!.ingredients) {
        expect(noQuiero).not.toContain(i.key);
      }
    }
    // tampoco aparecen en la lista de la compra
    for (const n of needs) expect(noQuiero).not.toContain(n.key);
  });

  it('prioriza los alimentos favoritos del usuario', () => {
    const favoritos = ['garbanzos', 'lentejas', 'brocoli'];
    const conGustos = recommendPlan({ ...PREFS, likes: favoritos }, [], 'saludable', 3);
    const sinGustos = recommendPlan(PREFS, [], 'saludable', 3);
    const count = (res: typeof conGustos) => {
      const map = { ...RECIPE_BY_ID, ...res.recipes };
      return res.plan.meals.filter((m) =>
        map[m.recipeId]!.ingredients.some((i) => favoritos.includes(i.key)),
      ).length;
    };
    expect(count(conGustos)).toBeGreaterThanOrEqual(count(sinGustos));
  });

  it('la cobertura refleja la despensa REAL (no dice "lo tienes" si está vacía)', () => {
    const { plan } = recommendPlan(PREFS, [], 'saludable', 9);
    // con despensa vacía, ninguna comida puede estar cubierta al 100%
    for (const m of plan.meals) expect(m.coverage).toBeLessThan(1);
    // con despensa llena de lo necesario, la cobertura sube
    const { plan: p2, recipes } = recommendPlan(PREFS, [], 'saludable', 9);
    const map = { ...RECIPE_BY_ID, ...recipes };
    const keys = new Set<string>();
    for (const m of p2.meals) for (const i of map[m.recipeId]!.ingredients) keys.add(i.key);
    const pantryFull = [...keys].map((k, i) => ({
      id: 'q' + i, raw: k, ingredientKey: k, displayName: k, source: 'manual' as const, addedAt: 0,
    }));
    const { plan: p3 } = recommendPlan(PREFS, pantryFull, 'saludable', 9);
    const avg = p3.meals.reduce((s, m) => s + m.coverage, 0) / p3.meals.length;
    expect(avg).toBeGreaterThan(0.9);
  });

  it('no recomienda embutidos/ultraprocesados en objetivos saludables', () => {
    const sano = shoppableUniverse('saludable');
    expect(sano.has('chorizo')).toBe(false);
    expect(sano.has('bacon')).toBe(false);
    expect(sano.has('bolleria')).toBe(false);
    expect(sano.has('pollo')).toBe(true);
    // en "cheat" sí se permiten los caprichos
    expect(shoppableUniverse('cheat').has('chorizo')).toBe(true);
  });

  it('respeta restricciones dietéticas en el plan recomendado', () => {
    const { plan, recipes } = recommendPlan(
      { ...PREFS, restrictions: ['vegano'] }, [], 'saludable', 5,
    );
    const map = { ...RECIPE_BY_ID, ...recipes };
    for (const m of plan.meals) expect(map[m.recipeId]!.tags).toContain('vegano');
  });
});

describe('cantidades agregadas', () => {
  it('suma la semana y escala por personas', () => {
    const { plan, recipes } = recommendPlan(PREFS, [], 'saludable', 13);
    const map = { ...RECIPE_BY_ID, ...recipes };
    const for1 = shoppingNeedsFromPlan(plan, [], map, 1);
    const for4 = shoppingNeedsFromPlan(plan, [], map, 4);
    const k = for1[0].key;
    const a = for1.find((n) => n.key === k)!;
    const b = for4.find((n) => n.key === k)!;
    // 4 personas necesita más cantidad que 1 (misma unidad)
    if (a.unit === b.unit) expect(b.quantity).toBeGreaterThan(a.quantity);
  });

  it('las cantidades por pieza son realistas (sin "37 tomates")', () => {
    const { needs } = recommendPlan(PREFS, [], 'saludable', 42); // people: 2
    for (const n of needs) {
      if (n.unit !== 'ud') continue;
      const cat = INGREDIENT_BY_KEY[n.key]?.category;
      if (cat === 'verdura' || cat === 'fruta') {
        expect(n.quantity).toBeLessThanOrEqual(7 * PREFS.people); // tope semanal por persona
      }
    }
    // los líquidos se expresan en volumen
    const coco = needs.find((n) => n.key === 'leche_coco');
    if (coco) expect(['ml', 'l']).toContain(coco.unit);
  });

  it('usa unidades legibles (kg/g o unidades contables)', () => {
    const { needs } = recommendPlan(PREFS, [], 'saludable', 17);
    for (const n of needs) {
      expect([
        'g', 'kg', 'ml', 'l', 'ud', 'rebanadas', 'loncha', 'rama', 'manojo', 'manojos', 'cda', 'cdta',
      ]).toContain(n.unit);
    }
  });
});
