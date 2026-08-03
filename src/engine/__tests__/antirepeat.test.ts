import { Recipe } from '../../types';
import {
  recencyPenalty,
  inCooldown,
  toRecord,
  pushHistory,
  SuggestionHistory,
} from '../history';
import { selectMMR, recipeSimilarity } from '../mmr';

function mk(id: string, protein: string, technique: string, veg: string[] = ['tomate']): Recipe {
  return {
    id,
    name: id,
    slot: ['comida'],
    goals: ['saludable'],
    tags: [],
    ingredients: [
      { key: protein, name: protein },
      ...veg.map((v) => ({ key: v, name: v })),
      { key: 'aceite', name: 'Aceite', staple: true },
    ],
    steps: ['paso'],
    macros: { kcal: 400, protein: 30, carbs: 30, fat: 15 },
    timeMinutes: 20,
    servings: 1,
    emoji: '🍽️',
    technique,
  };
}

describe('penalización por recencia', () => {
  it('vale 0 sin historial y crece al repetir', () => {
    const r = mk('r1', 'pollo', 'guiso');
    expect(recencyPenalty([], r)).toBe(0);
    const hist = pushHistory([], [toRecord(r, 1)]);
    expect(recencyPenalty(hist, r)).toBeGreaterThan(0);
  });

  it('penaliza más lo más reciente (decaimiento)', () => {
    const target = mk('t', 'pollo', 'guiso');
    const filler = mk('f', 'salmon', 'horno', ['brocoli']);
    // Historial A: target reciente (al final)
    let a: SuggestionHistory = [];
    for (let i = 0; i < 5; i++) a = pushHistory(a, [toRecord(filler, i)]);
    a = pushHistory(a, [toRecord(target, 99)]);
    // Historial B: target antiguo (al principio)
    let b: SuggestionHistory = pushHistory([], [toRecord(target, 0)]);
    for (let i = 0; i < 5; i++) b = pushHistory(b, [toRecord(filler, i)]);
    expect(recencyPenalty(a, target)).toBeGreaterThan(recencyPenalty(b, target));
  });
});

describe('cooldown duro', () => {
  it('bloquea la misma receta y la misma proteína recientes', () => {
    const r = mk('r', 'pollo', 'guiso');
    const hist = pushHistory([], [toRecord(r, 1)]);
    expect(inCooldown(hist, r)).toBe(true);
    // misma proteína, receta distinta -> también en cooldown de proteína
    const otro = mk('r2', 'pollo', 'plancha', ['pimiento']);
    expect(inCooldown(hist, otro)).toBe(true);
    // proteína distinta y sig distinta -> libre
    const libre = mk('r3', 'salmon', 'horno', ['brocoli']);
    expect(inCooldown(hist, libre)).toBe(false);
  });
});

describe('selección MMR', () => {
  it('prefiere diversidad de proteína frente a repetir la más relevante', () => {
    const pollo1 = { recipe: mk('p1', 'pollo', 'guiso'), relevance: 1.0 };
    const pollo2 = { recipe: mk('p2', 'pollo', 'plancha', ['pimiento']), relevance: 0.98 };
    const salmon = { recipe: mk('s1', 'salmon', 'horno', ['brocoli']), relevance: 0.9 };
    const sel = selectMMR([pollo1, pollo2, salmon], 2, 0.7);
    const proteins = sel.map((r) => r.ingredients[0].key);
    expect(new Set(proteins).size).toBe(2); // dos proteínas distintas
  });

  it('similitud alta entre recetas de misma proteína y técnica', () => {
    expect(recipeSimilarity(mk('a', 'pollo', 'guiso'), mk('b', 'pollo', 'guiso'))).toBeGreaterThan(
      recipeSimilarity(mk('a', 'pollo', 'guiso'), mk('c', 'salmon', 'horno', ['brocoli'])),
    );
  });
});
