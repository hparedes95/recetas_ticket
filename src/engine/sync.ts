// Sincronización familiar entre dispositivos.
//
// Guarda el estado compartido de la familia en Firebase Realtime Database y lo
// mantiene al día en todos los móviles que usen el mismo CÓDIGO DE FAMILIA.
//
// Se habla con la API REST por `fetch` (sin SDK): el SDK de Firebase arrastra
// dependencias que no compilan bien en Hermes, igual que nos pasó con el de
// Anthropic. La REST API es un simple GET/PUT sobre una URL .json.
//
// Modelo de datos en la nube:
//   /familias/<codigo>.json  →  { updatedAt, updatedBy, data: {...} }
//
// Estrategia de fusión: el estado se sincroniza por SECCIONES con marca de
// tiempo (gana la más reciente), salvo la lista de la compra, que se fusiona
// ítem a ítem para que dos personas puedan tachar a la vez en el súper.
//
// Lógica pura (sin React Native) → testeable en node.
import { MealPlan, Product, Profile, HouseholdSettings, Recipe, ShoppingItem } from '../types';

const TIMEOUT_MS = 15000;

/** Estado que se comparte entre los móviles de la familia. */
export interface SharedState {
  profiles: Profile[];
  household: HouseholdSettings;
  pantry: Product[];
  plans: MealPlan[];
  selectedPlanId: string | null;
  shopping: ShoppingItem[];
  generatedRecipes: Record<string, Recipe>;
  /** marca de tiempo por sección, para saber qué versión es más nueva */
  updatedAt: Record<string, number>;
}

export interface SyncConfig {
  /** URL de la Realtime Database, p. ej. https://mi-proyecto.firebaseio.com */
  databaseUrl: string;
  /** Código de familia: identifica (y protege) los datos del hogar */
  familyCode: string;
}

export type SyncStatus = 'off' | 'ok' | 'syncing' | 'error';

/** Genera un código de familia largo y aleatorio (difícil de adivinar). */
export function generateFamilyCode(): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (i === 3 || i === 7 || i === 11) out += '-';
  }
  return out;
}

/** Normaliza lo que escriba el usuario al unirse (mayúsculas, sin espacios). */
export function normalizeFamilyCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

function endpoint(cfg: SyncConfig): string {
  const base = cfg.databaseUrl.replace(/\/+$/, '');
  return `${base}/familias/${encodeURIComponent(normalizeFamilyCode(cfg.familyCode))}.json`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403)
        throw new Error('La base de datos no permite el acceso. Revisa sus reglas.');
      throw new Error(`Error de sincronización (${res.status}).`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError')
      throw new Error('La sincronización tardó demasiado. Revisa tu conexión.');
    throw e instanceof Error ? e : new Error('No se pudo sincronizar.');
  } finally {
    clearTimeout(timer);
  }
}

/** Descarga el estado de la familia (null si aún no hay nada guardado). */
export async function pullShared(cfg: SyncConfig): Promise<SharedState | null> {
  return await request<SharedState | null>(endpoint(cfg));
}

/** Sube el estado de la familia (sobrescribe, tras haber fusionado). */
export async function pushShared(cfg: SyncConfig, state: SharedState): Promise<void> {
  await request(endpoint(cfg), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state),
  });
}

/** Comprueba que la configuración funciona (se usa al crear/unirse). */
export async function testConnection(cfg: SyncConfig): Promise<boolean> {
  await pullShared(cfg);
  return true;
}

/**
 * Fusiona la lista de la compra de dos dispositivos ítem a ítem: si alguien ha
 * tachado un producto, queda tachado (los dos están en el súper a la vez).
 */
export function mergeShopping(local: ShoppingItem[], remote: ShoppingItem[]): ShoppingItem[] {
  const byKey = new Map<string, ShoppingItem>();
  for (const it of remote) byKey.set(it.key, it);
  for (const it of local) {
    const other = byKey.get(it.key);
    byKey.set(it.key, other ? { ...it, checked: it.checked || other.checked } : it);
  }
  // conserva solo los que siguen existiendo en alguna de las dos listas
  return [...byKey.values()];
}

const SECTIONS = [
  'profiles',
  'household',
  'pantry',
  'plans',
  'selectedPlanId',
  'generatedRecipes',
] as const;

/**
 * Fusiona el estado local con el remoto: para cada sección gana la versión más
 * reciente; la lista de la compra se fusiona ítem a ítem.
 */
export function mergeShared(local: SharedState, remote: SharedState | null): SharedState {
  if (!remote) return local;
  const out: SharedState = { ...local, updatedAt: { ...local.updatedAt } };
  for (const key of SECTIONS) {
    const lt = local.updatedAt?.[key] ?? 0;
    const rt = remote.updatedAt?.[key] ?? 0;
    if (rt > lt) {
      (out as unknown as Record<string, unknown>)[key] = (remote as unknown as Record<string, unknown>)[key];
      out.updatedAt[key] = rt;
    }
  }
  out.shopping = mergeShopping(local.shopping ?? [], remote.shopping ?? []);
  out.updatedAt.shopping = Math.max(
    local.updatedAt?.shopping ?? 0,
    remote.updatedAt?.shopping ?? 0,
  );
  return out;
}
