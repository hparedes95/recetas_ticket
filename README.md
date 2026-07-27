# 🧾🍳 Recetas del Ticket

App móvil que convierte tu **ticket de la compra** en **planes de comidas semanales** hechos a tu medida. Añades lo que has comprado (por foto, escribiéndolo, o marcándolo mientras compras) y la app te propone varios menús para toda la semana —comida sana, bajar calorías, alto en proteína, cheat meal o económico— con recetas paso a paso y la lista de lo que te falta comprar.

Hecha con **Expo + React Native + TypeScript**. Compatible con **iOS** y Android desde el mismo código.

---

## ✨ Qué hace

- **Añadir la compra de 4 formas:**
  - 📄 **Documento** (PDF, TXT, CSV…) — lee el texto del documento y reconoce los productos.
  - 📷 **Foto del ticket** (cámara o galería).
  - ⌨️ **Manual** — escribes o pegas el ticket, un producto por línea.
  - 🛒 **Modo compra** — vas tocando productos mientras compras y se añaden solos.
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
    planner.ts              Motor que genera los planes semanales
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
2. El planificador filtra recetas por objetivo y restricciones, y las puntúa por:
   - **cobertura**: cuánto de la receta ya tienes en la despensa,
   - **encaje con el objetivo** (p. ej. penaliza calorías altas en "bajar calorías"),
   - un pequeño factor para dar **variedad** a la semana.
3. Se monta la semana (7 días × comidas elegidas) y se calcula **lo que falta comprar**.

> El recetario es local por ahora. Está preparado para, más adelante, generar recetas con **IA** (p. ej. la API de Claude) sin cambiar el resto de la app.

---

## 🛠️ Comandos útiles

```bash
npm install          # instala dependencias
npx expo start       # desarrollo (QR para Expo Go)
npx expo start --web # vista en navegador
npx tsc --noEmit     # comprobación de tipos
```

---

## 🚀 Roadmap

- [x] Importar el ticket desde **documento (PDF/TXT/CSV)**.
- [x] **Objetivo de calorías + macros** personalizable con ajuste de raciones.
- [ ] **OCR real** de la foto del ticket (y de PDF escaneados).
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
