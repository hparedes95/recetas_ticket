import {
  makeProfile,
  mergeProfiles,
  effectivePreferences,
  householdServings,
  referenceProfile,
  portionFactorsFor,
  poolSizeFor,
  targetKcalOf,
} from '../household';
import { recommendPlan } from '../recommend';
import { RECIPE_BY_ID } from '../../data/recipes';
import { weeklyCompliance } from '../../data/dietary';
import { HouseholdSettings, Profile } from '../../types';

const HOUSEHOLD: HouseholdSettings = {
  defaultGoal: 'saludable',
  mealsPerDay: ['desayuno', 'comida', 'cena'],
  aiApiKey: null,
  useAI: false,
  onboarded: true,
};

const FAMILIA: Profile[] = [
  makeProfile({ id: 'yo', name: 'Yo', ageGroup: 'adulto', likes: ['salmon'], dislikes: ['champinon'], calorieTarget: 2200, isReference: true }),
  makeProfile({ id: 'ella', name: 'Marta', ageGroup: 'adulto', likes: ['garbanzos'], dislikes: ['atun'], calorieTarget: 1800 }),
  makeProfile({ id: 'peque', name: 'Hugo', ageGroup: 'nino', likes: ['platano'], dislikes: ['berenjena'], calorieTarget: 1400 }),
];

describe('fusión de gustos de la familia', () => {
  it('suma los "no quiero" de todos los miembros', () => {
    const m = mergeProfiles(FAMILIA);
    expect(m.dislikes.sort()).toEqual(['atun', 'berenjena', 'champinon']);
  });

  it('suma las restricciones (si uno es sin gluten, el menú lo es)', () => {
    const con = [...FAMILIA, makeProfile({ name: 'Celíaco', restrictions: ['sin_gluten'] })];
    expect(mergeProfiles(con).restrictions).toContain('sin_gluten');
  });

  it('equilibra los favoritos entre miembros (no manda uno solo)', () => {
    const m = mergeProfiles(FAMILIA);
    // los 3 primeros favoritos son uno de cada persona
    expect(m.likes.slice(0, 3).sort()).toEqual(['garbanzos', 'platano', 'salmon']);
  });

  it('un favorito vetado por otro miembro no se cuela', () => {
    const conflicto = [
      makeProfile({ likes: ['atun'] }),
      makeProfile({ dislikes: ['atun'] }),
    ];
    expect(mergeProfiles(conflicto).likes).not.toContain('atun');
  });

  it('ignora a quien no come en casa esta semana', () => {
    const sinPeque = FAMILIA.map((p) =>
      p.id === 'peque' ? { ...p, activeInPlan: false } : p,
    );
    expect(mergeProfiles(sinPeque).dislikes).not.toContain('berenjena');
  });
});

describe('raciones del hogar', () => {
  it('un niño cuenta menos que un adulto', () => {
    expect(householdServings(FAMILIA)).toBeCloseTo(2.55, 2); // 1 + 1 + 0.55
    expect(householdServings(FAMILIA)).toBeLessThan(3);
    expect(householdServings(FAMILIA)).toBeGreaterThan(2);
  });

  it('elige como referencia al de mayor objetivo si no hay marcado', () => {
    const sinRef = FAMILIA.map((p) => ({ ...p, isReference: false }));
    expect(referenceProfile(sinRef)?.id).toBe('yo'); // 2200 kcal
  });

  it('cada miembro recibe su propia ración del mismo plato', () => {
    const { plan, recipes } = recommendPlan(
      effectivePreferences(HOUSEHOLD, FAMILIA), [], 'saludable', 5,
    );
    const map = { ...RECIPE_BY_ID, ...recipes };
    const factors = portionFactorsFor(plan, map, FAMILIA);
    expect(Object.keys(factors).sort()).toEqual(['ella', 'peque', 'yo']);
    for (let d = 0; d < 7; d++) {
      expect(factors.peque[d]).toBeLessThan(factors.yo[d]); // el niño come menos
      expect(factors.ella[d]).toBeLessThanOrEqual(factors.yo[d]);
    }
  });

  it('las calorías por defecto dependen de la edad', () => {
    expect(targetKcalOf(makeProfile({ ageGroup: 'nino' }))).toBeLessThan(
      targetKcalOf(makeProfile({ ageGroup: 'adulto' })),
    );
  });
});

describe('preferencias efectivas del hogar', () => {
  it('un hogar de 1 persona equivale a las preferencias de siempre', () => {
    const solo = [makeProfile({ id: 'yo', likes: ['pollo'], dislikes: ['atun'], calorieTarget: 2000, isReference: true })];
    const eff = effectivePreferences(HOUSEHOLD, solo);
    expect(eff.dislikes).toEqual(['atun']);
    expect(eff.likes).toEqual(['pollo']);
    expect(eff.calorieTarget).toBe(2000);
    expect(eff.people).toBe(1);
    expect(eff.mealsPerDay).toEqual(HOUSEHOLD.mealsPerDay);
  });

  it('el menú familiar NO incluye nada vetado por ningún miembro', () => {
    const eff = effectivePreferences(HOUSEHOLD, FAMILIA);
    const { plan, recipes, needs } = recommendPlan(eff, [], 'saludable', 9);
    const map = { ...RECIPE_BY_ID, ...recipes };
    const vetados = ['atun', 'berenjena', 'champinon'];
    for (const m of plan.meals) {
      for (const i of map[m.recipeId]!.ingredients) expect(vetados).not.toContain(i.key);
    }
    for (const n of needs) expect(vetados).not.toContain(n.key);
  });

  it('sigue cumpliendo variedad y estándares dietéticos con familia', () => {
    const eff = effectivePreferences(HOUSEHOLD, FAMILIA);
    for (const seed of [2, 12, 22]) {
      const { plan, recipes } = recommendPlan(eff, [], 'saludable', seed);
      const map = { ...RECIPE_BY_ID, ...recipes };
      const ids = plan.meals.map((m) => m.recipeId);
      expect(new Set(ids).size).toBe(ids.length); // sin repetir
      const mains = plan.meals
        .filter((m) => m.slot !== 'desayuno')
        .map((m) => map[m.recipeId]!);
      const c = weeklyCompliance(mains);
      expect(c.legumbresOk).toBe(true);
      expect(c.carneRojaOk).toBe(true);
    }
  });

  it('aguanta una familia con MUCHOS vetos sin dejar huecos', () => {
    const exigentes = [
      makeProfile({ dislikes: ['atun', 'salmon', 'merluza', 'bacalao', 'sardina', 'gambas', 'champinon', 'setas'] }),
      makeProfile({ dislikes: ['berenjena', 'calabacin', 'calabaza', 'coliflor', 'brocoli', 'esparrago'] }),
      makeProfile({ ageGroup: 'nino', dislikes: ['lentejas', 'garbanzos', 'alubias', 'tofu'] }),
    ];
    const eff = effectivePreferences(HOUSEHOLD, exigentes);
    const { plan } = recommendPlan(eff, [], 'saludable', 4);
    expect(plan.meals.length).toBe(21); // 21 comidas, sin huecos
  });

  it('la compra escala con el tamaño real de la familia', () => {
    const dosAdultos = [makeProfile({ id: 'a' }), makeProfile({ id: 'b' })];
    const conNino = [...dosAdultos, makeProfile({ id: 'c', ageGroup: 'nino' })];
    expect(householdServings(conNino)).toBeGreaterThan(householdServings(dosAdultos));
    expect(householdServings(conNino)).toBeLessThan(3); // el niño no cuenta como adulto
  });
});

describe('aviso de pocas opciones', () => {
  it('el pool baja al añadir vetos', () => {
    const libre = poolSizeFor([makeProfile({})], HOUSEHOLD);
    const vetado = poolSizeFor(
      [makeProfile({ dislikes: ['pollo', 'atun', 'salmon', 'huevo', 'garbanzos', 'lentejas', 'pasta', 'arroz'] })],
      HOUSEHOLD,
    );
    expect(vetado).toBeLessThan(libre);
    expect(libre).toBeGreaterThan(30);
  });
});
