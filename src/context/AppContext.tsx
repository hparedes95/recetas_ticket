import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MealPlan, MealSlot, PlannedMeal, Preferences, Product, Recipe, ShoppingItem } from '../types';
import {
  generatePlans as engineGeneratePlans,
  shoppingListFromPlan,
  buildTargets,
  assembleWeek,
  coverageOf,
  computeMissing,
  computeAvgDailyMacros,
  ScoredRecipe,
} from '../engine/planner';
import { generateAIRecipesForSlot } from '../engine/aiRecipes';
import { generateRecipes } from '../engine/generator';
import { RECIPE_BY_ID } from '../data/recipes';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { goalMeta } from '../theme';
import { DietGoal } from '../types';
import { newId } from '../engine/ticketParser';

const STORAGE_KEY = '@recetas_ticket/state_v1';

const DEFAULT_PREFERENCES: Preferences = {
  people: 1,
  defaultGoal: 'saludable',
  restrictions: [],
  dislikes: [],
  mealsPerDay: ['desayuno', 'comida', 'cena'],
  calorieTarget: null,
  macroSplit: null,
  aiApiKey: null,
  useAI: false,
  onboarded: false,
};

interface PersistedState {
  preferences: Preferences;
  pantry: Product[];
  plans: MealPlan[];
  selectedPlanId: string | null;
  shopping: ShoppingItem[];
  /** Recetas generadas con IA, para poder resolver sus ids tras recargar */
  aiRecipes: Record<string, Recipe>;
  /** Recetas del motor generativo local, para resolver sus ids en los planes */
  generatedRecipes: Record<string, Recipe>;
}

interface AppContextValue extends PersistedState {
  hydrated: boolean;
  // preferencias
  updatePreferences: (patch: Partial<Preferences>) => void;
  completeOnboarding: (prefs: Partial<Preferences>) => void;
  // despensa
  addProducts: (products: Product[]) => void;
  removeProduct: (id: string) => void;
  clearPantry: () => void;
  // planes
  regeneratePlans: () => MealPlan[];
  selectPlan: (id: string) => void;
  selectedPlan: MealPlan | null;
  getRecipe: (id: string) => Recipe | undefined;
  // IA
  generating: boolean;
  generateAIPlan: (goal: DietGoal) => Promise<MealPlan>;
  // lista de la compra
  buildShoppingFromSelected: () => void;
  toggleShoppingItem: (key: string) => void;
  addBoughtToPantry: () => number;
  clearShopping: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [pantry, setPantry] = useState<Product[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [aiRecipes, setAiRecipes] = useState<Record<string, Recipe>>({});
  const [generatedRecipes, setGeneratedRecipes] = useState<Record<string, Recipe>>({});
  const [generating, setGenerating] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Cargar estado guardado al arrancar
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          if (parsed.preferences)
            setPreferences({ ...DEFAULT_PREFERENCES, ...parsed.preferences });
          if (parsed.pantry) setPantry(parsed.pantry);
          if (parsed.plans) setPlans(parsed.plans);
          if (parsed.selectedPlanId !== undefined) setSelectedPlanId(parsed.selectedPlanId);
          if (parsed.shopping) setShopping(parsed.shopping);
          if (parsed.aiRecipes) setAiRecipes(parsed.aiRecipes);
          if (parsed.generatedRecipes) setGeneratedRecipes(parsed.generatedRecipes);
        }
      } catch (e) {
        // Si algo falla, empezamos limpios
        console.warn('No se pudo cargar el estado guardado', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Guardar automáticamente cuando algo cambia (tras hidratar)
  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = { preferences, pantry, plans, selectedPlanId, shopping, aiRecipes, generatedRecipes };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('No se pudo guardar el estado', e),
    );
  }, [hydrated, preferences, pantry, plans, selectedPlanId, shopping, aiRecipes, generatedRecipes]);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  const completeOnboarding = useCallback((prefs: Partial<Preferences>) => {
    setPreferences((prev) => ({ ...prev, ...prefs, onboarded: true }));
  }, []);

  const addProducts = useCallback((products: Product[]) => {
    if (products.length === 0) return;
    setPantry((prev) => {
      const existing = new Set(prev.map((p) => p.ingredientKey));
      const toAdd = products.filter((p) => !existing.has(p.ingredientKey));
      return [...toAdd, ...prev];
    });
  }, []);

  const removeProduct = useCallback((id: string) => {
    setPantry((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearPantry = useCallback(() => setPantry([]), []);

  const regeneratePlans = useCallback((): MealPlan[] => {
    // Motor generativo local: crea recetas nuevas a partir de la despensa para dar
    // variedad/creatividad. Se guardan (persistidas) para poder resolver sus ids y
    // se pasan como candidatas al planificador junto al catálogo.
    const availableKeys = new Set(pantry.map((p) => p.ingredientKey));
    const gens = generateRecipes(availableKeys, {
      seed: Date.now() >>> 0, // semilla distinta cada vez → planes frescos
      goal: preferences.defaultGoal,
      restrictions: preferences.restrictions,
      dislikes: preferences.dislikes,
      max: 12,
    });
    const genMap: Record<string, Recipe> = {};
    for (const r of gens) genMap[r.id] = r;
    setGeneratedRecipes(genMap);

    const next = engineGeneratePlans(pantry, preferences, gens);
    setPlans(next);
    // seleccionamos por defecto el del objetivo preferido (primero)
    setSelectedPlanId(next.length ? next[0].id : null);
    return next;
  }, [pantry, preferences]);

  const selectPlan = useCallback((id: string) => setSelectedPlanId(id), []);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const getRecipe = useCallback(
    (id: string): Recipe | undefined => aiRecipes[id] ?? generatedRecipes[id] ?? RECIPE_BY_ID[id],
    [aiRecipes, generatedRecipes],
  );

  const generateAIPlan = useCallback(
    async (goal: DietGoal): Promise<MealPlan> => {
      const key = preferences.aiApiKey?.trim();
      if (!key) throw new Error('Añade tu clave de API de Anthropic en Ajustes.');
      setGenerating(true);
      try {
        const slots =
          preferences.mealsPerDay.length > 0
            ? preferences.mealsPerDay
            : (['comida', 'cena'] as MealSlot[]);
        const targets = buildTargets(preferences, slots);
        const split = preferences.macroSplit ?? { protein: 30, carbs: 40, fat: 30 };
        const pantryNames = pantry.map((p) => p.displayName);
        const dislikeNames = preferences.dislikes.map(
          (k) => INGREDIENT_BY_KEY[k]?.name ?? k,
        );
        const availableKeys = new Set(pantry.map((p) => p.ingredientKey));

        const newRecipes: Record<string, Recipe> = {};
        const poolsBySlot: Partial<Record<MealSlot, ScoredRecipe[]>> = {};

        for (const slot of slots) {
          const perSlot =
            targets.slotKcal[slot] ??
            (preferences.calorieTarget ? preferences.calorieTarget / slots.length : 600);
          const recipes = await generateAIRecipesForSlot({
            apiKey: key,
            slot,
            count: 5,
            targetKcal: Math.round(perSlot),
            macroSplit: split,
            pantryNames,
            restrictions: preferences.restrictions,
            dislikes: dislikeNames,
            goal,
          });
          poolsBySlot[slot] = recipes.map((r) => {
            newRecipes[r.id] = r;
            return { recipe: r, coverage: coverageOf(r, availableKeys), score: 0 };
          });
        }

        const meals: PlannedMeal[] = assembleWeek(slots, poolsBySlot, preferences.calorieTarget ?? null);
        const mergedMap = { ...RECIPE_BY_ID, ...generatedRecipes, ...aiRecipes, ...newRecipes };
        const meta = goalMeta[goal];
        const plan: MealPlan = {
          id: newId('aiplan'),
          goal,
          title: `${meta.label} · IA`,
          subtitle: 'Recetas creadas por IA para dar en tus calorías.',
          meals,
          missing: computeMissing(meals, availableKeys, mergedMap),
          avgDailyMacros: computeAvgDailyMacros(meals, mergedMap),
          calorieTarget: preferences.calorieTarget ?? null,
          macroSplit: preferences.macroSplit ?? null,
          createdAt: Date.now(),
        };

        setAiRecipes((prev) => ({ ...prev, ...newRecipes }));
        setPlans((prev) => [plan, ...prev]);
        setSelectedPlanId(plan.id);
        return plan;
      } finally {
        setGenerating(false);
      }
    },
    [preferences, pantry, aiRecipes, generatedRecipes],
  );

  const buildShoppingFromSelected = useCallback(() => {
    if (!selectedPlan) return;
    const mergedMap = { ...RECIPE_BY_ID, ...generatedRecipes, ...aiRecipes };
    setShopping(shoppingListFromPlan(selectedPlan, pantry, mergedMap));
  }, [selectedPlan, pantry, aiRecipes, generatedRecipes]);

  const toggleShoppingItem = useCallback((key: string) => {
    setShopping((prev) =>
      prev.map((it) => (it.key === key ? { ...it, checked: !it.checked } : it)),
    );
  }, []);

  const addBoughtToPantry = useCallback((): number => {
    const bought = shopping.filter((it) => it.checked);
    if (bought.length === 0) return 0;
    const newProducts: Product[] = bought.map((it) => ({
      id: `p_${it.key}_${Date.now()}`,
      raw: it.name,
      ingredientKey: it.key,
      displayName: it.name,
      source: 'compra' as const,
      addedAt: Date.now(),
    }));
    addProducts(newProducts);
    setShopping((prev) => prev.filter((it) => !it.checked));
    return bought.length;
  }, [shopping, addProducts]);

  const clearShopping = useCallback(() => setShopping([]), []);

  const value: AppContextValue = {
    preferences,
    pantry,
    plans,
    selectedPlanId,
    shopping,
    aiRecipes,
    generatedRecipes,
    hydrated,
    updatePreferences,
    completeOnboarding,
    addProducts,
    removeProduct,
    clearPantry,
    regeneratePlans,
    selectPlan,
    selectedPlan,
    getRecipe,
    generating,
    generateAIPlan,
    buildShoppingFromSelected,
    toggleShoppingItem,
    addBoughtToPantry,
    clearShopping,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

// Reexport útil para pantallas
export { RECIPE_BY_ID };
