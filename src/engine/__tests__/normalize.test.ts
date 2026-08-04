import { canonicalize, canonicalKey, stripNoise, singularVariants } from '../normalize';
import { INGREDIENT_ALIASES } from '../../data/aliases';
import { INGREDIENT_BY_KEY } from '../../data/ingredients';

describe('stripNoise', () => {
  it('quita gramajes, precios, símbolos y códigos', () => {
    expect(stripNoise('PATATA BOLSA 2KG   1,75 €')).toBe('patata bolsa');
    expect(stripNoise('TOMATE RAMA 1KG 1,80')).toBe('tomate rama');
    expect(stripNoise('LECHE ENTERA BRIK 6')).toBe('leche entera brik');
  });
});

describe('singularVariants', () => {
  it('genera formas singulares plausibles', () => {
    expect(singularVariants('tomates')).toContain('tomate');
    expect(singularVariants('limones')).toContain('limon');
  });
});

describe('canonicalize', () => {
  it('resuelve variantes comerciales por keyword (prioridad)', () => {
    expect(canonicalKey('PECHUGA POLLO BANDEJA 500G')).toBe('pollo');
    expect(canonicalKey('YOGUR GRIEGO PACK 4')).toBe('yogur');
    expect(canonicalKey('ACEITE OLIVA VIRGEN 1L')).toBe('aceite'); // no confundir con aceituna
  });

  it('resuelve sinónimos regionales/catalán vía alias', () => {
    expect(canonicalKey('tomaca de penjar')).toBe('tomate');
    expect(canonicalKey('CEBA TENDRA')).toBe('cebolla');
    expect(canonicalKey('llet sencera')).toBe('leche');
    expect(canonicalKey('llenties pardines')).toBe('lentejas');
    expect(canonicalKey('carxofa')).toBe('alcachofa');
  });

  it('resuelve términos en inglés vía alias', () => {
    expect(canonicalKey('chicken breast')).toBe('pollo');
    expect(canonicalKey('broccoli')).toBe('brocoli');
  });

  it('normaliza singular/plural', () => {
    expect(canonicalKey('HUEVOS FRESCOS DOCENA')).toBe('huevo');
    expect(canonicalKey('ous frescos')).toBe('huevo');
  });

  it('devuelve null para ruido no alimentario', () => {
    expect(canonicalize('1,75')).toBeNull();
    expect(canonicalize('---------')).toBeNull();
  });

  it('detección corregida: espinacas ya no se confunde con lechuga', () => {
    expect(canonicalKey('ESPINACAS BOLSA 300G')).toBe('espinacas');
  });

  it('nuevos alias de corte/variante y leche de coco', () => {
    expect(canonicalKey('CHULETON TERNERA')).toBe('ternera');
    expect(canonicalKey('CLEMENTINA MALLA 2KG')).toBe('naranja');
    expect(canonicalKey('LECHE DE COCO 400ML')).toBe('leche_coco');
  });
});

describe('tabla de alias', () => {
  it('todos los alias apuntan a una clave de ingrediente existente', () => {
    const rotos = Object.entries(INGREDIENT_ALIASES)
      .filter(([, key]) => !INGREDIENT_BY_KEY[key])
      .map(([alias, key]) => `${alias} -> ${key}`);
    expect(rotos).toEqual([]);
  });
});
