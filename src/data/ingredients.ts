// Diccionario de ingredientes: cada entrada tiene una CLAVE canónica y una lista
// de palabras que pueden aparecer en un ticket. Sirve para convertir el texto
// libre de un ticket ("PECHUGA POLLO FILET 500G") en una clave ("pollo") que las
// recetas entienden.

export interface IngredientDef {
  key: string;
  name: string;
  emoji: string;
  category:
    | 'carne'
    | 'pescado'
    | 'verdura'
    | 'fruta'
    | 'lacteo'
    | 'cereal'
    | 'legumbre'
    | 'huevo'
    | 'despensa'
    | 'bebida'
    | 'dulce'
    | 'otro';
  /** Palabras clave que, si aparecen en el ticket, activan esta clave */
  keywords: string[];
  /** Básicos de despensa: no penalizan si "faltan" en la despensa */
  staple?: boolean;
}

export const INGREDIENTS: IngredientDef[] = [
  // Carnes
  { key: 'pollo', name: 'Pollo', emoji: '🍗', category: 'carne', keywords: ['pollo', 'pechuga', 'muslo', 'contramuslo'] },
  { key: 'pavo', name: 'Pavo', emoji: '🦃', category: 'carne', keywords: ['pavo'] },
  { key: 'ternera', name: 'Ternera', emoji: '🥩', category: 'carne', keywords: ['ternera', 'vacuno', 'filete', 'solomillo', 'entrecot'] },
  { key: 'cerdo', name: 'Cerdo', emoji: '🥓', category: 'carne', keywords: ['cerdo', 'lomo', 'panceta', 'costilla'] },
  { key: 'carne_picada', name: 'Carne picada', emoji: '🍖', category: 'carne', keywords: ['picada', 'burger', 'hamburguesa'] },
  { key: 'jamon', name: 'Jamón / fiambre', emoji: '🍖', category: 'carne', keywords: ['jamon', 'jamón', 'york', 'fiambre', 'pavo lonchas'] },
  { key: 'bacon', name: 'Bacon', emoji: '🥓', category: 'carne', keywords: ['bacon', 'beicon'] },
  { key: 'chorizo', name: 'Chorizo', emoji: '🌭', category: 'carne', keywords: ['chorizo', 'salchichon', 'salchichón'] },

  // Pescados
  { key: 'salmon', name: 'Salmón', emoji: '🐟', category: 'pescado', keywords: ['salmon', 'salmón'] },
  { key: 'atun', name: 'Atún', emoji: '🐟', category: 'pescado', keywords: ['atun', 'atún', 'bonito'] },
  { key: 'merluza', name: 'Merluza', emoji: '🐟', category: 'pescado', keywords: ['merluza', 'pescadilla'] },
  { key: 'gambas', name: 'Gambas', emoji: '🦐', category: 'pescado', keywords: ['gamba', 'langostino'] },

  // Huevos y lácteos
  { key: 'huevo', name: 'Huevos', emoji: '🥚', category: 'huevo', keywords: ['huevo', 'huevos', 'docena'] },
  { key: 'leche', name: 'Leche', emoji: '🥛', category: 'lacteo', keywords: ['leche'], staple: true },
  { key: 'yogur', name: 'Yogur', emoji: '🥛', category: 'lacteo', keywords: ['yogur', 'yogurt', 'griego'] },
  { key: 'queso', name: 'Queso', emoji: '🧀', category: 'lacteo', keywords: ['queso', 'mozzarella', 'cheddar', 'parmesano', 'feta'] },
  { key: 'nata', name: 'Nata', emoji: '🥛', category: 'lacteo', keywords: ['nata', 'crema'] },
  { key: 'mantequilla', name: 'Mantequilla', emoji: '🧈', category: 'lacteo', keywords: ['mantequilla'], staple: true },

  // Verduras
  { key: 'tomate', name: 'Tomate', emoji: '🍅', category: 'verdura', keywords: ['tomate', 'tomates', 'cherry'] },
  { key: 'cebolla', name: 'Cebolla', emoji: '🧅', category: 'verdura', keywords: ['cebolla', 'cebolleta'] },
  { key: 'ajo', name: 'Ajo', emoji: '🧄', category: 'verdura', keywords: ['ajo', 'ajos'], staple: true },
  { key: 'pimiento', name: 'Pimiento', emoji: '🫑', category: 'verdura', keywords: ['pimiento'] },
  { key: 'lechuga', name: 'Lechuga', emoji: '🥬', category: 'verdura', keywords: ['lechuga', 'ensalada', 'canonigos', 'rucula', 'espinaca'] },
  { key: 'espinacas', name: 'Espinacas', emoji: '🥬', category: 'verdura', keywords: ['espinaca'] },
  { key: 'zanahoria', name: 'Zanahoria', emoji: '🥕', category: 'verdura', keywords: ['zanahoria'] },
  { key: 'calabacin', name: 'Calabacín', emoji: '🥒', category: 'verdura', keywords: ['calabacin', 'calabacín'] },
  { key: 'berenjena', name: 'Berenjena', emoji: '🍆', category: 'verdura', keywords: ['berenjena'] },
  { key: 'brocoli', name: 'Brócoli', emoji: '🥦', category: 'verdura', keywords: ['brocoli', 'brócoli'] },
  { key: 'champinon', name: 'Champiñones', emoji: '🍄', category: 'verdura', keywords: ['champiñon', 'champinon', 'seta'] },
  { key: 'patata', name: 'Patata', emoji: '🥔', category: 'verdura', keywords: ['patata', 'papa'] },
  { key: 'pepino', name: 'Pepino', emoji: '🥒', category: 'verdura', keywords: ['pepino'] },
  { key: 'aguacate', name: 'Aguacate', emoji: '🥑', category: 'fruta', keywords: ['aguacate'] },
  { key: 'maiz', name: 'Maíz', emoji: '🌽', category: 'verdura', keywords: ['maiz', 'maíz'] },

  // Frutas
  { key: 'platano', name: 'Plátano', emoji: '🍌', category: 'fruta', keywords: ['platano', 'plátano', 'banana'] },
  { key: 'manzana', name: 'Manzana', emoji: '🍎', category: 'fruta', keywords: ['manzana'] },
  { key: 'fresa', name: 'Fresas', emoji: '🍓', category: 'fruta', keywords: ['fresa', 'fresas', 'frutos rojos'] },
  { key: 'limon', name: 'Limón', emoji: '🍋', category: 'fruta', keywords: ['limon', 'limón', 'lima'], staple: true },
  { key: 'naranja', name: 'Naranja', emoji: '🍊', category: 'fruta', keywords: ['naranja', 'mandarina'] },

  // Cereales / hidratos
  { key: 'arroz', name: 'Arroz', emoji: '🍚', category: 'cereal', keywords: ['arroz'] },
  { key: 'pasta', name: 'Pasta', emoji: '🍝', category: 'cereal', keywords: ['pasta', 'macarron', 'espagueti', 'spaghetti', 'fideos', 'penne'] },
  { key: 'pan', name: 'Pan', emoji: '🍞', category: 'cereal', keywords: ['pan', 'barra', 'baguette', 'molde'] },
  { key: 'avena', name: 'Avena', emoji: '🥣', category: 'cereal', keywords: ['avena', 'copos'] },
  { key: 'harina', name: 'Harina', emoji: '🌾', category: 'cereal', keywords: ['harina'], staple: true },
  { key: 'tortilla_wrap', name: 'Tortilla de trigo / wrap', emoji: '🫓', category: 'cereal', keywords: ['wrap', 'tortitas trigo', 'fajita', 'tortilla mexicana'] },
  { key: 'quinoa', name: 'Quinoa', emoji: '🌾', category: 'cereal', keywords: ['quinoa', 'quinua'] },
  { key: 'cuscus', name: 'Cuscús', emoji: '🌾', category: 'cereal', keywords: ['cuscus', 'cuscús', 'couscous'] },

  // Legumbres
  { key: 'garbanzos', name: 'Garbanzos', emoji: '🫘', category: 'legumbre', keywords: ['garbanzo'] },
  { key: 'lentejas', name: 'Lentejas', emoji: '🫘', category: 'legumbre', keywords: ['lenteja'] },
  { key: 'alubias', name: 'Alubias', emoji: '🫘', category: 'legumbre', keywords: ['alubia', 'judia blanca', 'frijol', 'judión'] },

  // Despensa básica
  { key: 'aceite', name: 'Aceite de oliva', emoji: '🫒', category: 'despensa', keywords: ['aceite', 'oliva'], staple: true },
  { key: 'sal', name: 'Sal', emoji: '🧂', category: 'despensa', keywords: ['sal'], staple: true },
  { key: 'azucar', name: 'Azúcar', emoji: '🍬', category: 'despensa', keywords: ['azucar', 'azúcar'], staple: true },
  { key: 'tomate_frito', name: 'Tomate triturado/frito', emoji: '🥫', category: 'despensa', keywords: ['tomate frito', 'triturado', 'passata'] },
  { key: 'especias', name: 'Especias', emoji: '🌶️', category: 'despensa', keywords: ['pimienta', 'oregano', 'orégano', 'comino', 'curry', 'pimenton', 'pimentón', 'especias'], staple: true },
  { key: 'chocolate', name: 'Chocolate', emoji: '🍫', category: 'despensa', keywords: ['chocolate', 'cacao', 'nutella'] },
  { key: 'miel', name: 'Miel', emoji: '🍯', category: 'despensa', keywords: ['miel'], staple: true },
  { key: 'frutos_secos', name: 'Frutos secos', emoji: '🥜', category: 'despensa', keywords: ['nueces', 'almendra', 'cacahuete', 'anacardo', 'frutos secos', 'pipas', 'pistacho', 'avellana'] },

  // Carnes y embutidos (ampliación)
  { key: 'salchicha', name: 'Salchichas', emoji: '🌭', category: 'carne', keywords: ['salchicha', 'frankfurt', 'butifarra'] },
  { key: 'longaniza', name: 'Longaniza / morcilla', emoji: '🌭', category: 'carne', keywords: ['longaniza', 'morcilla', 'chistorra'] },
  { key: 'costillas', name: 'Costillas', emoji: '🍖', category: 'carne', keywords: ['costilla', 'costillar', 'secreto', 'presa'] },
  { key: 'conejo', name: 'Conejo', emoji: '🍖', category: 'carne', keywords: ['conejo'] },
  { key: 'cordero', name: 'Cordero', emoji: '🍖', category: 'carne', keywords: ['cordero'] },
  { key: 'salchichon', name: 'Fuet / salchichón', emoji: '🥓', category: 'carne', keywords: ['fuet', 'salchichon', 'lomo embuchado', 'chopped', 'mortadela'] },

  // Pescados y marisco (ampliación)
  { key: 'bacalao', name: 'Bacalao', emoji: '🐟', category: 'pescado', keywords: ['bacalao'] },
  { key: 'dorada', name: 'Dorada / lubina', emoji: '🐟', category: 'pescado', keywords: ['dorada', 'lubina', 'trucha'] },
  { key: 'lenguado', name: 'Lenguado / gallo', emoji: '🐟', category: 'pescado', keywords: ['lenguado', 'gallo', 'panga'] },
  { key: 'sardina', name: 'Sardina / caballa', emoji: '🐟', category: 'pescado', keywords: ['sardina', 'caballa', 'boqueron', 'anchoa'] },
  { key: 'mejillon', name: 'Mejillones / almejas', emoji: '🦪', category: 'pescado', keywords: ['mejillon', 'almeja', 'berberecho', 'chirla'] },
  { key: 'calamar', name: 'Calamar / sepia', emoji: '🦑', category: 'pescado', keywords: ['calamar', 'sepia', 'chipiron', 'pulpo', 'anilla'] },
  { key: 'surimi', name: 'Surimi / palitos', emoji: '🦀', category: 'pescado', keywords: ['surimi', 'palitos de mar', 'palitos cangrejo'] },

  // Lácteos (ampliación)
  { key: 'kefir', name: 'Kéfir', emoji: '🥛', category: 'lacteo', keywords: ['kefir', 'kéfir'] },
  { key: 'postre_lacteo', name: 'Flan / natillas', emoji: '🍮', category: 'lacteo', keywords: ['flan', 'natillas', 'cuajada', 'arroz con leche', 'actimel', 'danacol'] },
  { key: 'batido_lacteo', name: 'Batido / cacao', emoji: '🥤', category: 'lacteo', keywords: ['batido', 'cola cao', 'colacao', 'nesquik', 'cacao soluble'] },

  // Verduras y hortalizas (ampliación)
  { key: 'judia_verde', name: 'Judías verdes', emoji: '🫛', category: 'verdura', keywords: ['judia verde', 'judias verdes', 'vainas'] },
  { key: 'guisante', name: 'Guisantes', emoji: '🫛', category: 'verdura', keywords: ['guisante'] },
  { key: 'coliflor', name: 'Coliflor', emoji: '🥦', category: 'verdura', keywords: ['coliflor'] },
  { key: 'col', name: 'Col / repollo', emoji: '🥬', category: 'verdura', keywords: ['repollo', 'lombarda', 'col rizada', 'kale'] },
  { key: 'acelga', name: 'Acelgas', emoji: '🥬', category: 'verdura', keywords: ['acelga'] },
  { key: 'puerro', name: 'Puerro', emoji: '🧅', category: 'verdura', keywords: ['puerro'] },
  { key: 'apio', name: 'Apio', emoji: '🥬', category: 'verdura', keywords: ['apio'] },
  { key: 'calabaza', name: 'Calabaza', emoji: '🎃', category: 'verdura', keywords: ['calabaza'] },
  { key: 'esparrago', name: 'Espárragos', emoji: '🌱', category: 'verdura', keywords: ['esparrago', 'espárrago'] },
  { key: 'alcachofa', name: 'Alcachofas', emoji: '🌿', category: 'verdura', keywords: ['alcachofa'] },
  { key: 'setas', name: 'Setas', emoji: '🍄', category: 'verdura', keywords: ['setas', 'boletus', 'shiitake'] },
  { key: 'aceituna', name: 'Aceitunas', emoji: '🫒', category: 'verdura', keywords: ['aceituna'] },
  { key: 'jengibre', name: 'Jengibre', emoji: '🫚', category: 'verdura', keywords: ['jengibre'] },

  // Frutas (ampliación)
  { key: 'pera', name: 'Pera', emoji: '🍐', category: 'fruta', keywords: ['pera'] },
  { key: 'uva', name: 'Uvas', emoji: '🍇', category: 'fruta', keywords: ['uva'] },
  { key: 'melon', name: 'Melón / sandía', emoji: '🍉', category: 'fruta', keywords: ['melon', 'melón', 'sandia', 'sandía'] },
  { key: 'pina', name: 'Piña', emoji: '🍍', category: 'fruta', keywords: ['piña', 'pina'] },
  { key: 'kiwi', name: 'Kiwi', emoji: '🥝', category: 'fruta', keywords: ['kiwi'] },
  { key: 'mango', name: 'Mango', emoji: '🥭', category: 'fruta', keywords: ['mango', 'papaya'] },
  { key: 'melocoton', name: 'Melocotón', emoji: '🍑', category: 'fruta', keywords: ['melocoton', 'melocotón', 'nectarina', 'albaricoque', 'paraguayo'] },
  { key: 'ciruela', name: 'Ciruela / cereza', emoji: '🍒', category: 'fruta', keywords: ['ciruela', 'cereza'] },
  { key: 'arandano', name: 'Arándanos / frambuesa', emoji: '🫐', category: 'fruta', keywords: ['arandano', 'arándano', 'frambuesa', 'mora'] },
  { key: 'coco', name: 'Coco', emoji: '🥥', category: 'fruta', keywords: ['coco'] },

  // Cereales, pan y masas (ampliación)
  { key: 'cereales', name: 'Cereales de desayuno', emoji: '🥣', category: 'cereal', keywords: ['cereales', 'corn flakes', 'muesli', 'granola', 'all bran'] },
  { key: 'tostada', name: 'Tostadas / biscotes', emoji: '🍞', category: 'cereal', keywords: ['tostada', 'biscote', 'pan tostado', 'picos', 'colines', 'regaña'] },
  { key: 'pizza_base', name: 'Pizza / masa', emoji: '🍕', category: 'cereal', keywords: ['pizza', 'masa', 'hojaldre', 'empanadilla', 'empanada', 'base pizza'] },
  { key: 'noodles', name: 'Noodles / fideos asiáticos', emoji: '🍜', category: 'cereal', keywords: ['noodles', 'ramen', 'yakisoba', 'fideos chinos'] },

  // Legumbres y proteína vegetal (ampliación)
  { key: 'tofu', name: 'Tofu / soja', emoji: '🧈', category: 'legumbre', keywords: ['tofu', 'soja texturizada', 'edamame', 'tempeh', 'seitan'] },

  // Bebidas
  { key: 'agua', name: 'Agua', emoji: '💧', category: 'bebida', keywords: ['agua', 'agua mineral'], staple: true },
  { key: 'refresco', name: 'Refresco', emoji: '🥤', category: 'bebida', keywords: ['refresco', 'cola', 'coca', 'fanta', 'sprite', 'nestea', 'aquarius', 'tonica', 'gaseosa', 'bitter', 'kas'] },
  { key: 'zumo', name: 'Zumo', emoji: '🧃', category: 'bebida', keywords: ['zumo', 'nectar', 'mosto'] },
  { key: 'cerveza', name: 'Cerveza', emoji: '🍺', category: 'bebida', keywords: ['cerveza', 'birra', 'mahou', 'estrella', 'cruzcampo'] },
  { key: 'vino', name: 'Vino', emoji: '🍷', category: 'bebida', keywords: ['vino', 'rioja', 'ribera', 'verdejo', 'lambrusco', 'cava'] },
  { key: 'cafe', name: 'Café', emoji: '☕', category: 'bebida', keywords: ['cafe', 'café', 'nescafe', 'capsulas cafe'] },
  { key: 'te', name: 'Té / infusiones', emoji: '🍵', category: 'bebida', keywords: ['infusion', 'manzanilla', 'poleo', 'te verde', 'te rojo'] },
  { key: 'leche_vegetal', name: 'Bebida vegetal', emoji: '🥛', category: 'bebida', keywords: ['bebida de avena', 'bebida de soja', 'leche de almendra', 'bebida vegetal', 'horchata'] },

  // Dulces, snacks y bollería
  { key: 'galleta', name: 'Galletas', emoji: '🍪', category: 'dulce', keywords: ['galleta', 'maria', 'oreo', 'digestive'] },
  { key: 'bolleria', name: 'Bollería', emoji: '🥐', category: 'dulce', keywords: ['croissant', 'napolitana', 'donut', 'magdalena', 'bizcocho', 'bolleria', 'palmera', 'ensaimada', 'sobao'] },
  { key: 'helado', name: 'Helado', emoji: '🍦', category: 'dulce', keywords: ['helado', 'polo', 'cucurucho'] },
  { key: 'chuches', name: 'Chuches / caramelos', emoji: '🍬', category: 'dulce', keywords: ['chuche', 'gominola', 'caramelo', 'regaliz', 'chicle'] },
  { key: 'snack_salado', name: 'Patatas fritas / snacks', emoji: '🥔', category: 'dulce', keywords: ['patatas fritas', 'chips', 'doritos', 'nachos', 'ganchitos', 'cortezas', 'snack'] },
  { key: 'mermelada', name: 'Mermelada', emoji: '🍯', category: 'despensa', keywords: ['mermelada', 'confitura'] },
  { key: 'crema_cacahuete', name: 'Crema de cacahuete', emoji: '🥜', category: 'despensa', keywords: ['crema de cacahuete', 'mantequilla de cacahuete', 'crema de frutos secos'] },

  // Despensa y salsas (ampliación)
  { key: 'salsas', name: 'Salsas', emoji: '🥫', category: 'despensa', keywords: ['mayonesa', 'ketchup', 'mostaza', 'salsa cesar', 'salsa barbacoa', 'alioli', 'salsa rosa', 'pesto'] },
  { key: 'vinagre', name: 'Vinagre', emoji: '🧴', category: 'despensa', keywords: ['vinagre'], staple: true },
  { key: 'caldo', name: 'Caldo / pastillas', emoji: '🥣', category: 'despensa', keywords: ['caldo', 'avecrem', 'pastilla de caldo', 'fondo', 'fumet'] },
  { key: 'levadura', name: 'Levadura', emoji: '🧫', category: 'despensa', keywords: ['levadura'], staple: true },
  { key: 'conserva_legumbre', name: 'Conserva de legumbre', emoji: '🥫', category: 'legumbre', keywords: ['bote de garbanzos', 'bote de lentejas', 'bote de alubias', 'judias cocidas'] },
  { key: 'gazpacho', name: 'Gazpacho / salmorejo', emoji: '🍅', category: 'verdura', keywords: ['gazpacho', 'salmorejo'] },
  { key: 'hummus', name: 'Hummus / guacamole', emoji: '🥣', category: 'legumbre', keywords: ['hummus', 'guacamole', 'baba ganoush'] },
];

// Índice rápido clave -> definición
export const INGREDIENT_BY_KEY: Record<string, IngredientDef> = INGREDIENTS.reduce(
  (acc, def) => {
    acc[def.key] = def;
    return acc;
  },
  {} as Record<string, IngredientDef>,
);

/** Quita acentos y pasa a minúsculas para comparar de forma robusta */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Intenta identificar la clave de ingrediente a partir de un texto libre.
 * Devuelve null si no reconoce nada (así el usuario puede añadirlo igualmente).
 */
export function matchIngredient(raw: string): IngredientDef | null {
  const text = normalizeText(raw);
  if (!text) return null;

  let best: { def: IngredientDef; score: number } | null = null;
  for (const def of INGREDIENTS) {
    for (const kw of def.keywords) {
      const nkw = normalizeText(kw);
      if (text.includes(nkw)) {
        // Preferimos coincidencias de palabra más larga (más específicas)
        const score = nkw.length;
        if (!best || score > best.score) best = { def, score };
      }
    }
  }
  return best ? best.def : null;
}

const QTY_RE = /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos|l|ml|ud|uds|unid|unidades|docena|pack)?/i;

/** Extrae una cantidad+unidad aproximada del texto del ticket, si existe */
export function extractQuantity(raw: string): { quantity?: number; unit?: string } {
  const m = raw.match(QTY_RE);
  if (!m) return {};
  const quantity = parseFloat(m[1].replace(',', '.'));
  const unit = m[2] ? m[2].toLowerCase() : undefined;
  if (Number.isNaN(quantity)) return {};
  return { quantity, unit };
}
