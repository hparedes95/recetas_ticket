import {
  generateFamilyCode,
  normalizeFamilyCode,
  mergeShopping,
  mergeShared,
  SharedState,
} from '../sync';
import { makeProfile } from '../household';
import { HouseholdSettings, ShoppingItem } from '../../types';

const HOUSEHOLD: HouseholdSettings = {
  defaultGoal: 'saludable',
  mealsPerDay: ['desayuno', 'comida', 'cena'],
  aiApiKey: null,
  useAI: false,
  onboarded: true,
};

function item(key: string, checked = false): ShoppingItem {
  return { key, name: key, checked, usedIn: 1 };
}

function state(patch: Partial<SharedState> = {}): SharedState {
  return {
    profiles: [makeProfile({ id: 'me', name: 'Yo' })],
    household: HOUSEHOLD,
    pantry: [],
    plans: [],
    selectedPlanId: null,
    shopping: [],
    generatedRecipes: {},
    updatedAt: {},
    ...patch,
  };
}

describe('código de familia', () => {
  it('genera códigos largos, legibles y distintos', () => {
    const a = generateFamilyCode();
    const b = generateFamilyCode();
    expect(a).not.toBe(b);
    expect(a.replace(/-/g, '').length).toBe(16); // suficientemente difícil de adivinar
    expect(a).toMatch(/^[A-Z2-9-]+$/); // sin caracteres ambiguos (0/O, 1/I)
  });

  it('normaliza lo que escribe el usuario', () => {
    expect(normalizeFamilyCode('  abcd-efgh ')).toBe('ABCD-EFGH');
  });
});

describe('fusión de la lista de la compra', () => {
  it('si alguien tacha un producto, queda tachado para todos', () => {
    const local = [item('tomate', false), item('pollo', false)];
    const remote = [item('tomate', true), item('pollo', false)];
    const merged = mergeShopping(local, remote);
    expect(merged.find((i) => i.key === 'tomate')!.checked).toBe(true);
    expect(merged.find((i) => i.key === 'pollo')!.checked).toBe(false);
  });

  it('no pierde productos que solo tiene uno de los dos móviles', () => {
    const merged = mergeShopping([item('tomate')], [item('arroz', true)]);
    expect(merged.map((i) => i.key).sort()).toEqual(['arroz', 'tomate']);
  });

  it('dos personas tachando a la vez: se conservan ambos tachados', () => {
    const yo = [item('tomate', true), item('arroz', false)];
    const ella = [item('tomate', false), item('arroz', true)];
    const merged = mergeShopping(yo, ella);
    expect(merged.every((i) => i.checked)).toBe(true);
  });
});

describe('fusión del estado compartido', () => {
  it('sin remoto, se queda el local', () => {
    const local = state({ updatedAt: { profiles: 5 } });
    expect(mergeShared(local, null)).toBe(local);
  });

  it('gana la versión más reciente de cada sección', () => {
    const local = state({
      profiles: [makeProfile({ id: 'a', name: 'Local' })],
      updatedAt: { profiles: 100, pantry: 50 },
    });
    const remote = state({
      profiles: [makeProfile({ id: 'b', name: 'Remoto' })],
      pantry: [{ id: 'p1', raw: 'x', ingredientKey: 'tomate', displayName: 'Tomate', source: 'manual', addedAt: 0 }],
      updatedAt: { profiles: 50, pantry: 100 },
    });
    const merged = mergeShared(local, remote);
    expect(merged.profiles[0].name).toBe('Local'); // el local es más nuevo
    expect(merged.pantry.length).toBe(1); // el remoto es más nuevo
  });

  it('cada sección se resuelve por separado (no se pisa todo el estado)', () => {
    const local = state({ selectedPlanId: 'local', updatedAt: { selectedPlanId: 10, household: 99 } });
    const remote = state({
      selectedPlanId: 'remoto',
      household: { ...HOUSEHOLD, defaultGoal: 'proteico' },
      updatedAt: { selectedPlanId: 20, household: 1 },
    });
    const merged = mergeShared(local, remote);
    expect(merged.selectedPlanId).toBe('remoto'); // remoto más nuevo
    expect(merged.household.defaultGoal).toBe('saludable'); // local más nuevo
  });

  it('la compra se fusiona siempre, sin importar las marcas de tiempo', () => {
    const local = state({ shopping: [item('tomate', true)], updatedAt: { shopping: 1 } });
    const remote = state({ shopping: [item('arroz', true)], updatedAt: { shopping: 999 } });
    const merged = mergeShared(local, remote);
    expect(merged.shopping.map((i) => i.key).sort()).toEqual(['arroz', 'tomate']);
  });
});
