import { INGREDIENTS, IngredientDef } from './ingredients';

// Catálogo para el "modo compra": los ingredientes agrupados por categoría para
// que el usuario los vaya tocando mientras hace la compra.

export const CATEGORY_META: Record<
  IngredientDef['category'],
  { label: string; emoji: string; order: number }
> = {
  verdura: { label: 'Verduras y hortalizas', emoji: '🥦', order: 1 },
  fruta: { label: 'Frutas', emoji: '🍎', order: 2 },
  carne: { label: 'Carnes', emoji: '🥩', order: 3 },
  pescado: { label: 'Pescados y mariscos', emoji: '🐟', order: 4 },
  huevo: { label: 'Huevos', emoji: '🥚', order: 5 },
  lacteo: { label: 'Lácteos', emoji: '🧀', order: 6 },
  cereal: { label: 'Cereales e hidratos', emoji: '🍚', order: 7 },
  legumbre: { label: 'Legumbres', emoji: '🫘', order: 8 },
  despensa: { label: 'Despensa', emoji: '🧂', order: 9 },
  otro: { label: 'Otros', emoji: '🛒', order: 10 },
};

export interface CatalogGroup {
  category: IngredientDef['category'];
  label: string;
  emoji: string;
  items: IngredientDef[];
}

export function getCatalogGroups(): CatalogGroup[] {
  const byCat = new Map<IngredientDef['category'], IngredientDef[]>();
  for (const def of INGREDIENTS) {
    if (!byCat.has(def.category)) byCat.set(def.category, []);
    byCat.get(def.category)!.push(def);
  }
  return Array.from(byCat.entries())
    .map(([category, items]) => ({
      category,
      label: CATEGORY_META[category].label,
      emoji: CATEGORY_META[category].emoji,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => CATEGORY_META[a.category].order - CATEGORY_META[b.category].order);
}
