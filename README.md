# 🧾🍳 Recetas del Ticket

App móvil que convierte tu **ticket de la compra** en **planes de comidas semanales** hechos a tu medida. Añades lo que has comprado (por foto, escribiéndolo, o marcándolo mientras compras) y la app te propone varios menús para toda la semana —comida sana, bajar calorías, alto en proteína, cheat meal o económico— con recetas paso a paso y la lista de lo que te falta comprar.

Hecha con **Expo + React Native + TypeScript**. Compatible con **iOS** y Android desde el mismo código.

---

## ✨ Qué hace

- **Añadir la compra de 3 formas:**
  - 📷 **Foto del ticket** (cámara o galería) + pegas/copias el texto.
  - ⌨️ **Manual** — escribes o pegas el ticket, un producto por línea.
  - 🛒 **Modo compra** — vas tocando productos mientras compras y se añaden solos.
- **Detección de productos** con un diccionario amplio de alimentos (marcas, sinónimos, plurales) que filtra el ruido del ticket (totales, IVA, bolsas, droguería…) y conserva también lo que no reconoce. Con la IA activada, la lectura del ticket es aún más precisa.
- **Despensa** con todo lo disponible, agrupado por categorías.
- **Objetivo de calorías y reparto de macros** personalizables: fijas tus kcal/día y el % de
  proteína/carbos/grasas, y los planes ajustan las raciones para acercarse a tu objetivo.
- **Varios planes semanales** a elegir, cada uno con macros por día y el % que ya cubres con tu despensa.
- **Recetas** con ingredientes (marcando lo que tienes y lo que falta), pasos y macros por ración.
- **Lista de la compra** automática con lo que falta para tu plan; marcas lo comprado y pasa a la despensa.
- **Preferencias** (personas, objetivo, comidas del día, restricciones como vegetariano / sin gluten…) que afinan las propuestas.
- Todo se **guarda en el dispositivo** (funciona sin conexión).

---

## 📱 Cómo verla en tu iPhone (desarrollo en tiempo real)

No necesitas Mac ni Xcode para desarrollar. Usamos **Expo Go**:

1. Instala **Expo Go** desde la App Store en tu iPhone.
2. En tu ordenador, dentro de la carpeta del proyecto:
   ```bash
   npm install
   npx expo start
   ```
3. Se abrirá una web con un **código QR**. Escanéalo con la **cámara del iPhone** (te abrirá Expo Go).
4. La app se abre en tu móvil. **Cada cambio en el código se recarga solo** en segundos.

> Si el móvil y el ordenador no están en la misma red Wi‑Fi, arranca con túnel:
> ```bash
> npx expo start --tunnel
> ```

### Ver la app en el navegador (opcional)
```bash
npx expo start --web
```

---

## 🌐 Usarla en el móvil sin ordenador (web / PWA en Vercel)

Puedes publicar la **versión web** de la app en **Vercel** y usarla en el iPhone
como una app instalada, sin necesidad del ordenador ni de Expo Go.

> **Ojo:** Vercel sirve webs, no apps nativas. Esto **no** es una instalación
> desde la App Store, sino una **PWA**: abres una URL en Safari y la añades a la
> pantalla de inicio. La cámara nativa no está disponible en web (la foto del
> ticket usa el selector de archivos del navegador); el resto funciona igual.

**Publicar (una sola vez):**

1. Sube el repo a GitHub (esta rama ya lo está).
2. Entra en <https://vercel.com>, **Add New → Project**, e **importa** el repositorio.
3. Vercel detecta la config de [`vercel.json`](./vercel.json) automáticamente
   (build `npm run build`, salida `dist/`). Pulsa **Deploy**.
4. En 1–2 min tendrás una URL tipo `https://recetas-ticket.vercel.app`.

Cada `git push` a la rama vuelve a desplegar solo.

**Instalar en el iPhone:**

1. Abre la URL de Vercel en **Safari**.
2. Toca **Compartir** → **Añadir a pantalla de inicio**.
3. Se crea el icono “Recetas”; ábrelo y se ejecuta a pantalla completa como una app.

**Compilar la web en local** (para probar antes de subir):
```bash
npm run build     # genera dist/ (export web + metadatos PWA)
```

---

## 🧱 Estructura del proyecto

```
App.tsx                     Punto de entrada (providers + navegación)
app.json                    Config de Expo (nombre, permisos iOS, íconos)
src/
  types/                    Tipos TypeScript (Producto, Receta, Plan, Preferencias…)
  theme/                    Colores, espaciado, tipografía y metadatos de objetivos
  data/
    ingredients.ts          Diccionario de ingredientes + normalización de texto del ticket
    recipes.ts              Base de datos local de recetas (macros, pasos, tags)
    catalog.ts              Catálogo agrupado para el modo compra
  engine/
    ticketParser.ts         Convierte texto/ticket en productos reconocidos
    normalize.ts            Canonicalización del ticket (alias, singular/plural)
    generator.ts            Motor generativo por plantillas culinarias
    suggest.ts              Orquestador de sugerencias (catálogo + generadas, MMR)
    history.ts / mmr.ts     Anti-repetición y diversidad de lote
    config.ts               Pesos y parámetros del motor (ajustables)
    planner.ts              Monta los planes semanales
    __tests__/              Tests del motor (jest-expo)
  context/
    AppContext.tsx          Estado global + persistencia (AsyncStorage)
  components/
    ui.tsx                  Componentes reutilizables (Button, Card, Chip, Macros…)
  navigation/
    RootNavigator.tsx       Pestañas (Inicio, Despensa, Planes, Compra, Ajustes) + stack
    types.ts
  screens/                  Todas las pantallas de la app
```

---

## 🧠 Cómo funciona el motor

1. Cada producto del ticket se normaliza a una **clave de ingrediente** (`"PECHUGA POLLO 500G"` → `pollo`).
2. El planificador filtra recetas por objetivo y restricciones, y las puntúa por cobertura de despensa, encaje con el objetivo y variedad.
3. Si has fijado un **objetivo de calorías**, el motor **elige la combinación de recetas** cuyo total del día se acerca más a tu objetivo (búsqueda voraz por comida), con un ajuste de ración mínimo y natural (0.85–1.2). No infla raciones para "cuadrar" las calorías.
4. Se monta la semana (7 días × comidas elegidas) y se calcula **lo que falta comprar**.

### 🍳 Motor generativo por plantillas

Además del catálogo curado, el motor **genera recetas nuevas** combinando
plantillas culinarias (no elige de una lista cerrada), así hay variedad casi
infinita y no repetitiva. Arquitectura (`src/engine/` + `src/data/`):

| Módulo | Rol |
|---|---|
| `data/aliases.ts` + `engine/normalize.ts` | **Canonicalización**: normaliza el ticket (sin acentos, singular/plural, sinónimos regionales/catalán/inglés/comerciales) a una clave de ingrediente. Punto de entrada único. |
| `data/culinary.ts` | **Metadatos culinarios** del ingrediente: rol (base/principal/aromático/ácido/grasa), técnicas compatibles, perfil de sabor, afinidades, `es_despensa`. Derivados por categoría + overrides. |
| `data/nutrition.ts` | **Nutrición por-100 g** (USDA/BEDCA) + conversión de unidades → recalcula los macros de las recetas generadas sumando desde la BD. |
| `engine/generator.ts` | **Generación**: instancia plantillas (`base + proteína + verdura + aromático + ácido/grasa + técnica`) con ingredientes reales, filtrando por técnicas compatibles y afinidades; escribe pasos por técnica con tiempos/Tª reales. Incluye `isFeasible` (validador que rechaza recetas con ingredientes inexistentes). |
| `engine/history.ts` | **Anti-repetición**: firma estable de receta, penalización por recencia (decaimiento exponencial sobre receta/proteína/técnica) y cooldown duro. |
| `engine/mmr.ts` | **Diversidad de lote** por MMR (relevancia − similitud), no top-N. |
| `engine/suggest.ts` | **Orquestador** `suggestRecipes()`: junta catálogo + generadas, puntúa, respeta cooldown, elige por MMR y expone cobertura rica (usa-del-ticket / básicos / faltan) con **sustituciones** de misma categoría+rol. |
| `engine/config.ts` | **Configuración única** (pesos y parámetros). |
| `engine/rng.ts` | RNG con semilla (reproducible en tests). |

Criterios que garantizan los tests (`npm test`): 0 recetas con ingrediente
inexistente, ninguna receta repetida en <30 generaciones, ninguna proteína >20 %
del total, ≤1 receta por técnica/proteína en el lote y <150 ms por lote.

#### Ajustar los pesos del scoring
Todo vive en `src/engine/config.ts` (`DEFAULT_CONFIG`), sin tocar la lógica:
```
score = w.coverage·cobertura + w.affinity·afinidad + w.novelty·novedad
      − w.repetition·penalización_recencia − w.missing·nº_faltantes
```
Cambia `weights` (coverage/affinity/novelty/repetition/missing), los parámetros
de `antiRepeat` (ventana, `decay`, cooldown por receta/proteína) o `mmrLambda`
(0 = solo relevancia, 1 = solo diversidad).

#### Añadir una plantilla de receta
En `src/engine/generator.ts`, añade un objeto a `TEMPLATES` con: `technique`
(debe estar en `tecnicas_compatibles` de las proteínas que la usarán),
`needsBase`, `vegCount`, `emoji`, `timeMinutes`, `buildName(protein, veg, base)`
y `buildSteps({protein, veg, base, aromatic, acid})` (pasos concretos con tiempos
reales). El generador la instanciará con los ingredientes del ticket y validará
factibilidad automáticamente. Para mejorar las combinaciones, añade afinidades en
`AFFINITIES` (`src/data/culinary.ts`) y, si es un ingrediente nuevo, su nutrición
en `src/data/nutrition.ts`.

### 🤖 Recetas con IA (opcional)

Con el recetario local, las calorías son exactas hasta cierto punto (el catálogo es limitado). Para dar **justo** en objetivos altos o muy específicos, la app puede **crear recetas a medida con IA** (API de Claude):

- Actívalo en **Ajustes → “Recetas con IA”** y pega tu **clave de API de Anthropic** (se guarda solo en tu dispositivo, nunca se sube a GitHub).
- Consigue una clave en <https://console.anthropic.com/settings/keys>. Cada generación de plan es una llamada a la API y **tiene un pequeño coste** en tu cuenta de Anthropic.
- El modelo por defecto es `claude-opus-5` (definido en `DEFAULT_AI_MODEL`, `src/engine/aiRecipes.ts`). Puedes cambiarlo por uno más económico como `claude-haiku-4-5` o `claude-sonnet-5`.
- Implementación: `src/engine/aiRecipes.ts` llama a la API por HTTPS directo (`fetch`) porque el SDK oficial de Anthropic depende de módulos de Node y no compila en el motor Hermes de React Native.

---

## 🛠️ Comandos útiles

```bash
npm install          # instala dependencias
npx expo start       # desarrollo (QR para Expo Go)
npx expo start --web # vista en navegador
npx tsc --noEmit     # comprobación de tipos
npm test             # tests del motor (jest-expo)
```

---

## 🚀 Roadmap

- [x] **Detección de productos** ampliada + lectura de tickets con IA.
- [x] **Objetivo de calorías + macros** con selección de recetas (calorías exactas sin inflar raciones).
- [x] **Recetas con IA** a medida (API de Claude, con tu propia clave).
- [ ] **OCR real** de la foto del ticket (leer la imagen sin copiar el texto).
- [ ] Recetas generadas con **IA** según ingredientes y objetivo.
- [ ] Ajustar raciones por nº de personas en la lista de la compra.
- [ ] Guardar/planificar varias semanas e historial.
- [ ] Publicación en la **App Store** con EAS Build (`eas build -p ios`).

---

## 📦 Publicar para iOS (App Store)

Cuando la app esté lista, se compila en la nube con **EAS** (no hace falta Mac):

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

Necesitarás una cuenta de **Apple Developer** para subirla a la App Store o repartir builds de prueba con TestFlight.
