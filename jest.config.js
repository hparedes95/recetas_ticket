// Config de Jest. Usamos el preset de Expo para transformar TS/JSX igual que la
// app. Los tests del MOTOR son lógica pura (sin React Native), así que corren en
// entorno node para ser rápidos; los tests de componentes usarían jsdom.
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // El motor y los datos son TS puro; no hace falta transformar node_modules RN
  // salvo lo que el preset ya cubre.
  clearMocks: true,
};
