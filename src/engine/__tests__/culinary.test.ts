import {
  getCulinary,
  areAffine,
  mainProteinKey,
  inferTechnique,
  AFFINITIES_KEYS_FOR_TEST,
} from '../../data/culinary';
import { INGREDIENTS, INGREDIENT_BY_KEY } from '../../data/ingredients';
import { RECIPES } from '../../data/recipes';

describe('metadatos culinarios', () => {
  it('resuelve todos los ingredientes sin romper y respeta es_despensa', () => {
    for (const def of INGREDIENTS) {
      const c = getCulinary(def.key);
      expect(c.techniques.length).toBeGreaterThan(0);
      expect(c.isPantry).toBe(def.staple === true);
    }
  });

  it('asigna roles esperados a casos clave', () => {
    expect(getCulinary('aceite').role).toBe('grasa');
    expect(getCulinary('ajo').role).toBe('aromatico');
    expect(getCulinary('limon').role).toBe('acido');
    expect(getCulinary('arroz').role).toBe('base');
    expect(getCulinary('pollo').isProtein).toBe(true);
    expect(getCulinary('tomate').role).toBe('base');
  });

  it('todas las afinidades referencian claves de ingrediente existentes', () => {
    const rotas: string[] = [];
    for (const key of AFFINITIES_KEYS_FOR_TEST) {
      for (const target of getCulinary(key).affinities) {
        if (!INGREDIENT_BY_KEY[target]) rotas.push(`${key} -> ${target}`);
      }
    }
    expect(rotas).toEqual([]);
  });

  it('afinidad es bidireccional', () => {
    expect(areAffine('pollo', 'ajo')).toBe(true);
    expect(areAffine('ajo', 'pollo')).toBe(true);
  });

  it('detecta la proteína principal de una receta', () => {
    const paella = RECIPES.find((r) => r.id === 'r_paella')!;
    expect(mainProteinKey(paella)).toBe('pollo');
    const gazpacho = RECIPES.find((r) => r.id === 'r_gazpacho')!;
    expect(mainProteinKey(gazpacho)).toBeNull();
  });

  it('infiere una técnica razonable de los pasos', () => {
    const escalivada = RECIPES.find((r) => r.id === 'r_escalivada')!;
    expect(inferTechnique(escalivada)).toBe('horno');
    const gazpacho = RECIPES.find((r) => r.id === 'r_gazpacho')!;
    expect(inferTechnique(gazpacho)).toBe('crudo');
  });
});
