import {
  asArray,
  reviveHousehold,
  revivePlans,
  reviveProfiles,
  reviveRecipeMap,
  reviveShopping,
} from '../revive';
import { reviveShared } from '../sync';
import { mergeProfiles, effectivePreferences, poolSizeFor } from '../household';
import { HouseholdSettings } from '../../types';

const HOUSEHOLD: HouseholdSettings = {
  defaultGoal: 'saludable',
  mealsPerDay: ['desayuno', 'comida', 'cena'],
  aiApiKey: null,
  useAI: false,
  onboarded: true,
};

// Cómo devuelve Firebase un perfil que se subió con todos los arrays vacíos:
// simplemente NO están, porque `[]` equivale a borrar la clave.
const PERFIL_DE_FIREBASE = {
  id: 'me',
  name: 'Yo',
  emoji: '🙂',
  ageGroup: 'adulto',
  activeInPlan: true,
  isReference: true,
  updatedAt: 1000,
};

describe('asArray', () => {
  it('acepta un array normal', () => {
    expect(asArray<number>([1, 2])).toEqual([1, 2]);
  });

  it('convierte el objeto indexado que devuelve Firebase en array', () => {
    expect(asArray<string>({ '0': 'a', '2': 'c', '1': 'b' })).toEqual(['a', 'b', 'c']);
  });

  it('convierte lo que falta en un array vacío (nunca undefined)', () => {
    expect(asArray(undefined)).toEqual([]);
    expect(asArray(null)).toEqual([]);
  });

  it('descarta los huecos', () => {
    expect(asArray<number>([1, null, 2])).toEqual([1, 2]);
  });
});

describe('estado que vuelve de Firebase sin los arrays vacíos', () => {
  it('devuelve los gustos a los perfiles', () => {
    const [p] = reviveProfiles([PERFIL_DE_FIREBASE]);
    expect(p.dislikes).toEqual([]);
    expect(p.likes).toEqual([]);
    expect(p.restrictions).toEqual([]);
  });

  it('el motor de la familia ya no revienta con esos perfiles', () => {
    // este era el fallo: `for (const d of p.dislikes)` sobre undefined tumbaba
    // la app entera al arrancar
    const profiles = reviveProfiles([PERFIL_DE_FIREBASE]);
    expect(() => mergeProfiles(profiles)).not.toThrow();
    expect(() => effectivePreferences(HOUSEHOLD, profiles)).not.toThrow();
    expect(() => poolSizeFor(profiles, HOUSEHOLD)).not.toThrow();
  });

  it('sin reparar, los mismos datos SÍ rompen (el fallo era real)', () => {
    expect(() => mergeProfiles([PERFIL_DE_FIREBASE as never])).toThrow();
  });

  it('devuelve la forma a las recetas (tags, pasos, ingredientes)', () => {
    const m = reviveRecipeMap({
      r1: { id: 'r1', name: 'Pollo', macros: { kcal: 1, protein: 1, carbs: 1, fat: 1 } },
    });
    expect(m.r1.tags).toEqual([]);
    expect(m.r1.steps).toEqual([]);
    expect(m.r1.ingredients).toEqual([]);
    expect(m.r1.servings).toBe(1); // nunca 0: se usa como divisor
  });

  it('descarta recetas sin id en vez de meter basura en el diccionario', () => {
    expect(reviveRecipeMap({ x: { name: 'sin id' }, y: null })).toEqual({});
  });

  it('devuelve la forma a los planes', () => {
    const [pl] = revivePlans([{ id: 'p1', goal: 'saludable', title: 'x', subtitle: '' }]);
    expect(pl.meals).toEqual([]);
    expect(pl.missing).toEqual([]);
  });

  it('la lista de la compra sin `checked` queda sin tachar', () => {
    const [it] = reviveShopping([{ key: 'tomate', name: 'Tomate', usedIn: 2 }]);
    expect(it.checked).toBe(false);
  });

  it('el hogar nunca se queda sin comidas que planificar', () => {
    const h = reviveHousehold({ defaultGoal: 'proteico' }, HOUSEHOLD);
    expect(h.mealsPerDay).toEqual(HOUSEHOLD.mealsPerDay);
    expect(h.defaultGoal).toBe('proteico');
  });

  it('reviveShared repara el estado completo de una tacada', () => {
    const s = reviveShared(
      { profiles: [PERFIL_DE_FIREBASE], selectedPlanId: 'p1' },
      HOUSEHOLD,
    )!;
    expect(s.profiles[0].dislikes).toEqual([]);
    expect(s.pantry).toEqual([]);
    expect(s.plans).toEqual([]);
    expect(s.shopping).toEqual([]);
    expect(s.generatedRecipes).toEqual({});
    expect(s.updatedAt).toEqual({});
    expect(s.selectedPlanId).toBe('p1');
  });

  it('reviveShared devuelve null si en la nube no hay nada', () => {
    expect(reviveShared(null, HOUSEHOLD)).toBeNull();
  });
});
