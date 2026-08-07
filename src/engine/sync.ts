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
  /** Recetas creadas con IA (también hacen falta para resolver los planes) */
  aiRecipes?: Record<string, Recipe>;
  /** marca de tiempo por sección, para saber qué versión es más nueva */
  updatedAt: Record<string, number>;
  /** Perfiles borrados (id → cuándo), para que no reaparezcan al sincronizar */
  deletedProfiles?: Record<string, number>;
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

export interface Diagnosis {
  ok: boolean;
  /** Mensaje legible para el usuario, explicando qué pasa y qué hacer */
  message: string;
  /** Detalle técnico (URL probada, código de error…) */
  detail: string;
}

/**
 * Prueba REAL de ida y vuelta: escribe un dato de prueba y lo vuelve a leer.
 * Devuelve un diagnóstico claro, porque los fallos de configuración (región de
 * la base de datos, reglas sin publicar…) son la causa habitual.
 */
export async function diagnose(cfg: SyncConfig): Promise<Diagnosis> {
  const base = cfg.databaseUrl.trim().replace(/\/+$/, '');
  // misma ruta que usa la sincronización real, para probar lo que de verdad se usa
  const url = `${base}/familias/${encodeURIComponent(normalizeFamilyCode(cfg.familyCode))}/__prueba.json`;

  if (!/^https:\/\//.test(base)) {
    return {
      ok: false,
      message: 'La dirección debe empezar por https://',
      detail: base || '(vacía)',
    };
  }
  if (!/firebaseio\.com$|firebasedatabase\.app$/.test(base)) {
    return {
      ok: false,
      message:
        'Esa dirección no parece la de una Realtime Database. Debe terminar en ' +
        'firebaseio.com o en firebasedatabase.app (cópiala de la consola de Firebase).',
      detail: base,
    };
  }

  const marca = Date.now();
  try {
    const put = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(marca),
    });
    if (!put.ok) {
      if (put.status === 401 || put.status === 403) {
        return {
          ok: false,
          message:
            'La base de datos rechaza la escritura: publica las reglas de seguridad ' +
            '(o el modo de prueba ha caducado).',
          detail: `HTTP ${put.status} al escribir en ${url}`,
        };
      }
      if (put.status === 404) {
        return {
          ok: false,
          message:
            'No existe una base de datos en esa dirección. Ojo con la REGIÓN: si la creaste ' +
            'en Europa, la dirección acaba en .europe-west1.firebasedatabase.app, no en ' +
            '.firebaseio.com. Cópiala tal cual de la consola de Firebase.',
          detail: `HTTP 404 en ${url}`,
        };
      }
      return { ok: false, message: `Error al escribir (HTTP ${put.status}).`, detail: url };
    }

    const get = await fetch(url);
    if (!get.ok) {
      return { ok: false, message: `Error al leer (HTTP ${get.status}).`, detail: url };
    }
    const leido = await get.json();
    if (leido !== marca) {
      return {
        ok: false,
        message: 'Se escribió pero no se leyó lo mismo. Revisa las reglas de lectura.',
        detail: `escrito ${marca}, leído ${JSON.stringify(leido)}`,
      };
    }
    // limpieza: la marca de prueba no debe quedarse en los datos de la familia
    try {
      await fetch(url, { method: 'DELETE' });
    } catch {
      // si no se puede borrar, no es grave: es un valor suelto
    }
    return {
      ok: true,
      message: 'Conexión correcta: se puede escribir y leer en tu base de datos.',
      detail: url,
    };
  } catch (e) {
    return {
      ok: false,
      message:
        'No se pudo contactar con la base de datos. Revisa la dirección (y la región) y tu ' +
        'conexión a internet.',
      detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  }
}

/**
 * Comprueba que la configuración funciona ANTES de dar por buena la conexión.
 * Hace una prueba de escritura+lectura, no solo de lectura: una base de datos
 * que deja leer pero no escribir parecería conectada y luego no sincronizaría
 * nada, que es justo el fallo silencioso que queremos evitar.
 */
export async function testConnection(cfg: SyncConfig): Promise<boolean> {
  const d = await diagnose(cfg);
  if (!d.ok) throw new Error(d.message);
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

/**
 * Fusiona la lista de miembros PERSONA A PERSONA (no la lista entera): si cada
 * uno edita sus gustos en su móvil a la vez, no se pierde ninguno de los dos.
 * Gana la versión más reciente de CADA miembro.
 */
export function mergeProfileLists(
  local: Profile[],
  remote: Profile[],
  deleted: Record<string, number> = {},
): Profile[] {
  const byId = new Map<string, Profile>();
  for (const p of remote) byId.set(p.id, p);
  for (const p of local) {
    const other = byId.get(p.id);
    if (!other) {
      byId.set(p.id, p);
      continue;
    }
    // se queda el más reciente de los dos
    byId.set(p.id, (p.updatedAt ?? 0) >= (other.updatedAt ?? 0) ? p : other);
  }
  // los borrados no reaparecen (salvo que se hayan editado después de borrarlos)
  const out = [...byId.values()].filter((p) => {
    const delAt = deleted[p.id];
    return delAt === undefined || (p.updatedAt ?? 0) > delAt;
  });
  // nunca dejamos la familia vacía
  return out.length > 0 ? out : local;
}

/**
 * Une dos diccionarios de recetas. Son una CACHÉ para poder resolver los ids de
 * los planes: si se pisaran, el plan de un móvil llegaría al otro sin sus
 * recetas y se verían huecos. Por eso se unen, nunca se sustituyen.
 */
export function mergeRecipeMaps(
  local: Record<string, Recipe> = {},
  remote: Record<string, Recipe> = {},
): Record<string, Recipe> {
  return { ...remote, ...local };
}

const SECTIONS = [
  'household',
  'pantry',
  'plans',
  'selectedPlanId',
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
  // las recetas se UNEN: hacen falta para resolver los planes de ambos móviles
  out.generatedRecipes = mergeRecipeMaps(local.generatedRecipes, remote.generatedRecipes);
  out.aiRecipes = mergeRecipeMaps(local.aiRecipes, remote.aiRecipes);

  // los miembros se fusionan uno a uno (los gustos de cada cual son suyos)
  const deleted = { ...(remote.deletedProfiles ?? {}), ...(local.deletedProfiles ?? {}) };
  out.deletedProfiles = deleted;
  out.profiles = mergeProfileLists(local.profiles ?? [], remote.profiles ?? [], deleted);
  out.updatedAt.profiles = Math.max(
    local.updatedAt?.profiles ?? 0,
    remote.updatedAt?.profiles ?? 0,
  );

  out.shopping = mergeShopping(local.shopping ?? [], remote.shopping ?? []);
  out.updatedAt.shopping = Math.max(
    local.updatedAt?.shopping ?? 0,
    remote.updatedAt?.shopping ?? 0,
  );
  return out;
}
