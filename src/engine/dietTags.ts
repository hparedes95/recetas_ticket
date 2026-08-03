// Deriva las etiquetas de dieta (vegano, vegetariano, sin gluten/lactosa/frutos
// secos) de la lista de claves de ingrediente de una receta. Se usa para etiquetar
// las recetas GENERADAS y para validaciones. Lógica pura.
import { DietTag } from '../types';
import { INGREDIENT_BY_KEY } from '../data/ingredients';

const GLUTEN = new Set([
  'pan', 'pasta', 'harina', 'avena', 'cebada', 'tortilla_wrap', 'seitan',
  'pan_rallado', 'cereales', 'tostada', 'polenta', 'pizza_base', 'noodles',
  'bolleria', 'galleta',
]);
const LACTOSE = new Set([
  'leche', 'queso', 'yogur', 'nata', 'mantequilla', 'queso_batido', 'kefir',
  'postre_lacteo', 'batido_lacteo', 'margarina', 'proteina_polvo', 'helado',
]);
const NUTS = new Set(['frutos_secos', 'crema_cacahuete']);

export function deriveTags(keys: string[]): DietTag[] {
  const cats = keys.map((k) => INGREDIENT_BY_KEY[k]?.category);
  const hasMeatFish = cats.some((c) => c === 'carne' || c === 'pescado');
  const hasAnimal =
    hasMeatFish || cats.some((c) => c === 'huevo' || c === 'lacteo') || keys.includes('miel');

  const tags: DietTag[] = [];
  if (!hasMeatFish) tags.push('vegetariano');
  if (!hasAnimal) tags.push('vegano');
  if (!keys.some((k) => GLUTEN.has(k))) tags.push('sin_gluten');
  if (!keys.some((k) => LACTOSE.has(k))) tags.push('sin_lactosa');
  if (!keys.some((k) => NUTS.has(k))) tags.push('sin_frutos_secos');
  return tags;
}
