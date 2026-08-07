import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HouseholdSettings, MealPlan, MealSlot, PlannedMeal, Preferences, Product, Profile, Recipe, ShoppingItem } from '../types';
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
import { recommendPlan, shoppingNeedsFromPlan } from '../engine/recommend';
import {
  effectivePreferences,
  makeProfile,
  portionFactorsFor,
  activeProfiles,
} from '../engine/household';
import {
  SyncConfig,
  SyncStatus,
  SharedState,
  pullShared,
  pushShared,
  mergeShared,
  testConnection,
} from '../engine/sync';
import { RECIPE_BY_ID } from '../data/recipes';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { goalMeta } from '../theme';
import { DietGoal } from '../types';
import { newId } from '../engine/ticketParser';

const STORAGE_KEY = '@recetas_ticket/state_v1';

const DEFAULT_HOUSEHOLD: HouseholdSettings = {
  defaultGoal: 'saludable',
  mealsPerDay: ['desayuno', 'comida', 'cena'],
  aiApiKey: null,
  useAI: false,
  onboarded: false,
};

const DEFAULT_PREFERENCES: Preferences = {
  people: 1,
  defaultGoal: 'saludable',
  restrictions: [],
  dislikes: [],
  likes: [],
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
  /** Miembros de la familia (v2). Si falta, se migra desde `preferences`. */
  profiles?: Profile[];
  /** Ajustes del hogar (v2) */
  household?: HouseholdSettings;
  /** Versión del esquema guardado */
  schemaVersion?: number;
  /** Configuración de sincronización familiar (si está activada) */
  sync?: SyncConfig | null;
  /** Marcas de tiempo por sección, para fusionar entre dispositivos */
  updatedAt?: Record<string, number>;
}

interface AppContextValue extends PersistedState {
  hydrated: boolean;
  // familia
  profiles: Profile[];
  household: HouseholdSettings;
  addProfile: (patch?: Partial<Profile>) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  removeProfile: (id: string) => void;
  setReferenceProfile: (id: string) => void;
  updateHousehold: (patch: Partial<HouseholdSettings>) => void;
  // sincronización familiar
  sync: SyncConfig | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncAt: number | null;
  enableSync: (cfg: SyncConfig) => Promise<void>;
  disableSync: () => void;
  syncNow: () => Promise<void>;
  // preferencias (derivadas del hogar; se mantienen por compatibilidad)
  updatePreferences: (patch: Partial<Preferences>) => void;
  completeOnboarding: (prefs: Partial<Preferences>) => void;
  // despensa
  addProducts: (products: Product[]) => void;
  removeProduct: (id: string) => void;
  clearPantry: () => void;
  // planes
  regeneratePlans: () => MealPlan[];
  /** Flujo "recomiéndame la semana": crea un plan sin depender de la despensa
   *  y deja lista la compra (con cantidades) para ir al súper. */
  recommendWeek: (goal?: DietGoal) => MealPlan;
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
  const [profiles, setProfiles] = useState<Profile[]>([
    makeProfile({ id: 'me', name: 'Yo', emoji: '🙂', isReference: true }),
  ]);
  const [household, setHousehold] = useState<HouseholdSettings>(DEFAULT_HOUSEHOLD);
  const [pantry, setPantry] = useState<Product[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [aiRecipes, setAiRecipes] = useState<Record<string, Recipe>>({});
  const [generatedRecipes, setGeneratedRecipes] = useState<Record<string, Recipe>>({});
  const [generating, setGenerating] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // --- sincronización familiar ---
  const [sync, setSync] = useState<SyncConfig | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  // marca de tiempo por sección: qué cambió y cuándo (para fusionar)
  const [updatedAt, setUpdatedAt] = useState<Record<string, number>>({});
  const touch = useCallback((section: string) => {
    setUpdatedAt((prev) => ({ ...prev, [section]: Date.now() }));
  }, []);

  /** Preferencias EFECTIVAS del hogar: es lo que consume el motor de recetas. */
  const preferences = useMemo(
    () => effectivePreferences(household, profiles),
    [household, profiles],
  );

  // Cargar estado guardado al arrancar
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          // Migración v1 → v2: el estado antiguo tenía UNAS preferencias sueltas;
          // ahora hay miembros + ajustes del hogar. Convertimos sin perder nada.
          if (parsed.profiles && parsed.profiles.length > 0) {
            setProfiles(parsed.profiles);
            setHousehold({ ...DEFAULT_HOUSEHOLD, ...(parsed.household ?? {}) });
          } else if (parsed.preferences) {
            const old = { ...DEFAULT_PREFERENCES, ...parsed.preferences };
            const migrated: Profile[] = [
              makeProfile({
                id: 'me',
                name: 'Yo',
                emoji: '🙂',
                isReference: true,
                restrictions: old.restrictions,
                dislikes: old.dislikes,
                likes: old.likes ?? [],
                calorieTarget: old.calorieTarget,
                macroSplit: old.macroSplit,
              }),
            ];
            // si cocinaba para varios, creamos los miembros que faltan
            for (let i = 1; i < Math.max(1, old.people); i++) {
              migrated.push(makeProfile({ name: `Persona ${i + 1}`, emoji: '🙂' }));
            }
            setProfiles(migrated);
            setHousehold({
              defaultGoal: old.defaultGoal,
              mealsPerDay: old.mealsPerDay,
              aiApiKey: old.aiApiKey,
              useAI: old.useAI,
              onboarded: old.onboarded,
            });
          }
          if (parsed.pantry) setPantry(parsed.pantry);
          if (parsed.plans) setPlans(parsed.plans);
          if (parsed.selectedPlanId !== undefined) setSelectedPlanId(parsed.selectedPlanId);
          if (parsed.shopping) setShopping(parsed.shopping);
          if (parsed.aiRecipes) setAiRecipes(parsed.aiRecipes);
          if (parsed.generatedRecipes) setGeneratedRecipes(parsed.generatedRecipes);
          if (parsed.sync) { setSync(parsed.sync); setSyncStatus('ok'); }
          if (parsed.updatedAt) setUpdatedAt(parsed.updatedAt);
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
    const state: PersistedState = {
      preferences, // derivadas: compat con versiones antiguas de la app
      pantry, plans, selectedPlanId, shopping, aiRecipes, generatedRecipes,
      profiles, household, schemaVersion: 2, sync, updatedAt,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('No se pudo guardar el estado', e),
    );
  }, [hydrated, preferences, pantry, plans, selectedPlanId, shopping, aiRecipes, generatedRecipes, profiles, household, sync, updatedAt]);

  /** Compat: enruta cada campo al hogar o al miembro de referencia. */
  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    const householdKeys = ['defaultGoal', 'mealsPerDay', 'aiApiKey', 'useAI', 'onboarded'] as const;
    const hPatch: Partial<HouseholdSettings> = {};
    for (const k of householdKeys) {
      if (patch[k] !== undefined) (hPatch as Record<string, unknown>)[k] = patch[k];
    }
    if (Object.keys(hPatch).length > 0) setHousehold((prev) => ({ ...prev, ...hPatch }));

    const profileKeys = ['restrictions', 'dislikes', 'likes', 'calorieTarget', 'macroSplit'] as const;
    const pPatch: Partial<Profile> = {};
    for (const k of profileKeys) {
      if (patch[k] !== undefined) (pPatch as Record<string, unknown>)[k] = patch[k];
    }
    if (Object.keys(pPatch).length > 0) {
      setProfiles((prev) => {
        const refIdx = Math.max(0, prev.findIndex((p) => p.isReference));
        return prev.map((p, i) => (i === refIdx ? { ...p, ...pPatch } : p));
      });
    }
  }, []);

  // --- gestión de miembros de la familia ---
  const addProfile = useCallback((patch: Partial<Profile> = {}) => {
    setProfiles((prev) => [...prev, makeProfile(patch)]);
    touch('profiles');
  }, [touch]);
  const updateProfile = useCallback((id: string, patch: Partial<Profile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    touch('profiles');
  }, [touch]);
  const removeProfile = useCallback((id: string) => {
    setProfiles((prev) => {
      if (prev.length <= 1) return prev; // siempre queda alguien
      const next = prev.filter((p) => p.id !== id);
      if (!next.some((p) => p.isReference)) next[0] = { ...next[0], isReference: true };
      return next;
    });
  }, []);
  const setReferenceProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.map((p) => ({ ...p, isReference: p.id === id })));
  }, []);
  const updateHousehold = useCallback((patch: Partial<HouseholdSettings>) => {
    setHousehold((prev) => ({ ...prev, ...patch }));
    touch('household');
  }, [touch]);

  const completeOnboarding = useCallback(
    (prefs: Partial<Preferences>) => {
      updatePreferences({ ...prefs, onboarded: true });
    },
    [updatePreferences],
  );

  const addProducts = useCallback((products: Product[]) => {
    if (products.length === 0) return;
    setPantry((prev) => {
      const existing = new Set(prev.map((p) => p.ingredientKey));
      const toAdd = products.filter((p) => !existing.has(p.ingredientKey));
      return [...toAdd, ...prev];
    });
    touch('pantry');
  }, [touch]);

  const removeProduct = useCallback((id: string) => {
    setPantry((prev) => prev.filter((p) => p.id !== id));
    touch('pantry');
  }, [touch]);

  const clearPantry = useCallback(() => { setPantry([]); touch('pantry'); }, [touch]);

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

  /**
   * Flujo "recomiéndame la semana" (inverso al del ticket): la app propone el
   * plan optimizado por tu objetivo SIN limitarse a la despensa, y deja la lista
   * de la compra lista, con cantidades para la semana y descontando lo que ya
   * tienes. Después, en modo compra, marcas y pasa a la despensa.
   */
  const recommendWeek = useCallback(
    (goal?: DietGoal): MealPlan => {
      const { plan, recipes, needs } = recommendPlan(preferences, pantry, goal);
      setGeneratedRecipes((prev) => ({ ...prev, ...recipes }));
      setPlans((prev) => [plan, ...prev]);
      setSelectedPlanId(plan.id);
      setShopping(
        needs
          .filter((n) => !n.alreadyHave) // solo lo que hay que comprar
          .map((n) => ({
            key: n.key,
            name: n.name,
            checked: false,
            usedIn: n.usedIn,
            quantity: n.quantity,
            unit: n.unit,
            category: n.category,
          })),
      );
      return plan;
    },
    [preferences, pantry],
  );

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
    // Lista con CANTIDADES agregadas de la semana (escaladas por personas) y
    // descontando lo que ya hay en la despensa. Igual para cualquier plan.
    const needs = shoppingNeedsFromPlan(selectedPlan, pantry, mergedMap, preferences.people);
    setShopping(
      needs
        .filter((n) => !n.alreadyHave)
        .map((n) => ({
          key: n.key,
          name: n.name,
          checked: false,
          usedIn: n.usedIn,
          quantity: n.quantity,
          unit: n.unit,
          category: n.category,
        })),
    );
  }, [selectedPlan, pantry, aiRecipes, generatedRecipes, preferences.people]);

  const toggleShoppingItem = useCallback((key: string) => {
    setShopping((prev) =>
      prev.map((it) => (it.key === key ? { ...it, checked: !it.checked } : it)),
    );
    touch('shopping');
  }, [touch]);

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


  // --- Sincronización familiar entre dispositivos ---

  /** Estado compartido actual de este móvil. */
  const buildShared = useCallback(
    (): SharedState => ({
      profiles, household, pantry, plans, selectedPlanId, shopping, generatedRecipes, updatedAt,
    }),
    [profiles, household, pantry, plans, selectedPlanId, shopping, generatedRecipes, updatedAt],
  );

  /** Aplica al estado local el resultado de fusionar con la nube. */
  const applyShared = useCallback((merged: SharedState) => {
    setProfiles(merged.profiles ?? []);
    setHousehold((prev) => merged.household ?? prev);
    setPantry(merged.pantry ?? []);
    setPlans(merged.plans ?? []);
    setSelectedPlanId(merged.selectedPlanId ?? null);
    setShopping(merged.shopping ?? []);
    setGeneratedRecipes(merged.generatedRecipes ?? {});
    setUpdatedAt(merged.updatedAt ?? {});
  }, []);

  /** Descarga, fusiona y vuelve a subir: deja los dos móviles iguales. */
  const syncNow = useCallback(async () => {
    if (!sync) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const remote = await pullShared(sync);
      const merged = mergeShared(buildShared(), remote);
      applyShared(merged);
      await pushShared(sync, merged);
      setLastSyncAt(Date.now());
      setSyncStatus('ok');
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'No se pudo sincronizar.');
      setSyncStatus('error');
    }
  }, [sync, buildShared, applyShared]);

  /** Activa la sincronización (crear familia o unirse con un código). */
  const enableSync = useCallback(
    async (cfg: SyncConfig) => {
      setSyncStatus('syncing');
      setSyncError(null);
      try {
        await testConnection(cfg);
        const remote = await pullShared(cfg);
        const merged = mergeShared(buildShared(), remote);
        applyShared(merged);
        await pushShared(cfg, merged);
        setSync(cfg);
        setLastSyncAt(Date.now());
        setSyncStatus('ok');
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : 'No se pudo conectar.');
        setSyncStatus('error');
        throw e;
      }
    },
    [buildShared, applyShared],
  );

  const disableSync = useCallback(() => {
    setSync(null);
    setSyncStatus('off');
    setSyncError(null);
  }, []);

  // Sincroniza al arrancar y cada 30 s mientras la sincronización esté activa.
  useEffect(() => {
    if (!hydrated || !sync) return;
    void syncNow();
    const id = setInterval(() => void syncNow(), 30000);
    return () => clearInterval(id);
    // syncNow cambia con el estado; el intervalo usa siempre la última versión
  }, [hydrated, sync?.databaseUrl, sync?.familyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearShopping = useCallback(() => setShopping([]), []);


  const value = useMemo<AppContextValue>(
    () => ({
      preferences,
      pantry,
      plans,
      selectedPlanId,
      shopping,
      aiRecipes,
      generatedRecipes,
      profiles,
      household,
      addProfile,
      updateProfile,
      removeProfile,
      setReferenceProfile,
      updateHousehold,
      sync,
      syncStatus,
      syncError,
      lastSyncAt,
      enableSync,
      disableSync,
      syncNow,
      hydrated,
      updatePreferences,
      completeOnboarding,
      addProducts,
      removeProduct,
      clearPantry,
      regeneratePlans,
      recommendWeek,
      selectPlan,
      selectedPlan,
      getRecipe,
      generating,
      generateAIPlan,
      buildShoppingFromSelected,
      toggleShoppingItem,
      addBoughtToPantry,
      clearShopping,
    }),
    [
      preferences, pantry, plans, selectedPlanId, shopping, aiRecipes, generatedRecipes,
      profiles, household, addProfile, updateProfile, removeProfile, setReferenceProfile,
      updateHousehold, sync, syncStatus, syncError, lastSyncAt, enableSync, disableSync, syncNow,
      updatedAt, hydrated, updatePreferences, completeOnboarding, addProducts, removeProduct, clearPantry,
      regeneratePlans, recommendWeek, selectPlan, selectedPlan, getRecipe, generating, generateAIPlan,
      buildShoppingFromSelected, toggleShoppingItem, addBoughtToPantry, clearShopping,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

// Reexport útil para pantallas
export { RECIPE_BY_ID };
