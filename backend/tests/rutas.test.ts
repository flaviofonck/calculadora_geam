import { calcularRuta } from '../src/services/rutas';

// Fixture generado con js/calculator.js, porcentaje=100, dolar=4000
// Fórmula: fijos * (porcentaje/100) + variables * (1 - porcentaje/100) + aom
// Sin multiplicación por dolar/TRM en el cálculo por tramo
const FIXTURE: Record<string, { cop: number; usd: number }> = {
  'Jobo→La Mami':            { cop: 9491.01, usd: 2.37 },
  'Jobo→Cartagena':          { cop: 6452.64, usd: 1.61 },
  'Jobo→Ballenas_prom':      { cop: 10613.96, usd: 2.65 },
  'Jobo→Sebastopol':         { cop: 19305.76, usd: 4.83 },
  'Cartagena→Vasconia':      { cop: 14671.83, usd: 3.67 },
  'Cartagena→Sebastopol':    { cop: 13859.44, usd: 3.46 },
  'La Mami→Barranquilla':    { cop: 2753.12, usd: 0.69 },
  'La Mami→Cartagena':       { cop: 4044.68, usd: 1.01 },
  'Cusiana→Transmetano':     { cop: 7860.69, usd: 1.97 },
  'Cusiana→Porvenir':        { cop: 1062.82, usd: 0.27 },
  'Sebastopol→Medellin':     { cop: 7360.45, usd: 1.84 },
  'Barrancabermeja→Bucaramanga': { cop: 5033.60, usd: 1.26 },
};

const RUTAS = [
  ['Jobo', 'La Mami'],
  ['Jobo', 'Cartagena'],
  ['Jobo', 'Ballenas_prom'],
  ['Jobo', 'Sebastopol'],
  ['Cartagena', 'Vasconia'],
  ['Cartagena', 'Sebastopol'],
  ['La Mami', 'Barranquilla'],
  ['La Mami', 'Cartagena'],
  ['Cusiana', 'Transmetano'],
  ['Cusiana', 'Porvenir'],
  ['Sebastopol', 'Medellin'],
  ['Barrancabermeja', 'Bucaramanga'],
];

describe('T-002 — calcularRuta paridad con js/calculator.js', () => {
  const porcentaje = 100;
  const dolar = 4000;

  for (const [origen, destino] of RUTAS) {
    const key = `${origen}→${destino}`;
    it(`calcula ${key} correctamente (COP+USD)`, async () => {
      const result = await calcularRuta(origen, destino, porcentaje, dolar);
      const expected = FIXTURE[key];
      // Compare COP redondeado a 2 decimales
      expect(result.totales.cop).toBeCloseTo(expected.cop, 2);
      expect(result.totales.usd).toBeCloseTo(expected.usd, 2);
    });
  }

  it('rechaza nodo inexistente', async () => {
    await expect(calcularRuta('Jobo', 'NodoInexistente', porcentaje, dolar)).rejects.toThrow('No existe ruta');
  });

  it('no importa js/data.js', () => {
    // Verify the service file has no reference to js/data.js or NETWORK_DATA
    const fs = require('fs');
    const source = fs.readFileSync(require.resolve('../src/services/rutas.ts'), 'utf-8');
    expect(source).not.toContain('NETWORK_DATA');
    expect(source).not.toContain('data.js');
  });
});
