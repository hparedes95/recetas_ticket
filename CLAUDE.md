@AGENTS.md

# Recetas del Ticket — guía para desarrollo

App Expo + React Native + TypeScript. Convierte el ticket de la compra en planes de comidas semanales. iOS primero, compatible con Android.

## Comandos
- `npm install` — dependencias
- `npx expo start` — dev server (QR para Expo Go en iPhone). `--web` para navegador, `--tunnel` si no comparten Wi‑Fi.
- `npx tsc --noEmit` — comprobación de tipos (mantener en verde).
- `npx expo export --platform ios` — verifica que el bundle de iOS compila.

## Arquitectura
- Estado global en `src/context/AppContext.tsx` (React Context + `useState`), persistido en AsyncStorage bajo `@recetas_ticket/state_v1`.
- Datos: `src/data/ingredients.ts` (diccionario + `matchIngredient` para normalizar texto del ticket), `recipes.ts` (recetario local, macros por ración), `catalog.ts` (modo compra).
- Lógica: `src/engine/ticketParser.ts` (texto → productos, con diccionario amplio y filtro de ruido; conserva no reconocidos como `otro:`) y `planner.ts` (despensa + preferencias → planes; `assembleWeek` elige la combinación de recetas que da en las calorías del día, sin inflar raciones). `aiTicket.ts` lee el ticket con la API de Claude y `aiRecipes.ts` genera recetas; ambos por `fetch` (no el SDK, que no compila en Hermes). Las recetas de IA viven en `aiRecipes` del contexto y se resuelven con `getRecipe`.
- Navegación: `src/navigation/RootNavigator.tsx` — tabs (Inicio, Despensa, Planes, Compra, Ajustes) dentro de un stack con modales (AddTicket, ShoppingMode) y detalles (PlanDetail, RecipeDetail). El onboarding se muestra si `preferences.onboarded === false`.
- UI: `src/components/ui.tsx` centraliza componentes; `src/theme/index.ts` centraliza tokens (colores, spacing, metadatos de objetivos). Reutilizar estos antes de crear estilos nuevos.

## Convenciones
- Todo el texto de cara al usuario va en español.
- Las claves de ingrediente de las recetas deben existir en `INGREDIENTS` (`ingredients.ts`).
- Los básicos de despensa (aceite, sal, ajo…) llevan `staple: true` y no penalizan la cobertura ni entran en la lista de la compra.
