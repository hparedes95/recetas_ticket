// Tokens de diseño: colores, espaciado, tipografía y sombras.
// Un único punto para mantener la app coherente y fácil de re-estilizar.

import { DietGoal } from '../types';

export const colors = {
  // Marca
  primary: '#16A34A', // verde fresco (comida sana)
  primaryDark: '#15803D',
  primarySoft: '#DCFCE7',

  accent: '#F97316', // naranja apetitoso
  accentSoft: '#FFEDD5',

  // Superficies
  bg: '#F7F8F6',
  card: '#FFFFFF',
  cardAlt: '#F1F5F1',

  // Texto
  text: '#14211A',
  textMuted: '#6B7772',
  textFaint: '#9AA5A0',

  // Estados
  border: '#E6EAE7',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0B3D2E',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#0B3D2E',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

// Metadatos visuales de cada objetivo de plan
export const goalMeta: Record<
  DietGoal,
  { label: string; emoji: string; color: string; soft: string; description: string }
> = {
  saludable: {
    label: 'Comida sana',
    emoji: '🥗',
    color: '#16A34A',
    soft: '#DCFCE7',
    description: 'Equilibrado, con verduras y raciones moderadas.',
  },
  bajar_calorias: {
    label: 'Bajar calorías',
    emoji: '🔥',
    color: '#0EA5E9',
    soft: '#E0F2FE',
    description: 'Menos calorías, más saciedad. Ideal en déficit.',
  },
  proteico: {
    label: 'Alto en proteína',
    emoji: '💪',
    color: '#7C3AED',
    soft: '#EDE9FE',
    description: 'Prioriza proteína para músculo y saciedad.',
  },
  cheat: {
    label: 'Cheat meal',
    emoji: '🍔',
    color: '#F97316',
    soft: '#FFEDD5',
    description: 'Caprichos ricos para el día que te lo mereces.',
  },
  economico: {
    label: 'Económico',
    emoji: '💶',
    color: '#CA8A04',
    soft: '#FEF9C3',
    description: 'Aprovecha al máximo lo que ya tienes.',
  },
};

export const dietTagMeta: Record<string, { label: string; emoji: string }> = {
  vegetariano: { label: 'Vegetariano', emoji: '🥕' },
  vegano: { label: 'Vegano', emoji: '🌱' },
  sin_gluten: { label: 'Sin gluten', emoji: '🌾' },
  sin_lactosa: { label: 'Sin lactosa', emoji: '🥛' },
  sin_frutos_secos: { label: 'Sin frutos secos', emoji: '🥜' },
};

export const slotMeta: Record<string, { label: string; emoji: string }> = {
  desayuno: { label: 'Desayuno', emoji: '☀️' },
  comida: { label: 'Comida', emoji: '🍽️' },
  cena: { label: 'Cena', emoji: '🌙' },
  snack: { label: 'Snack', emoji: '🍎' },
};

export const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const dayNamesFull = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
