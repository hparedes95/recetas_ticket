// Test trivial para verificar que el harness (jest-expo + TS) funciona.
describe('harness', () => {
  it('ejecuta TypeScript', () => {
    const suma = (a: number, b: number): number => a + b;
    expect(suma(2, 3)).toBe(5);
  });
});
