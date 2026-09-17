import request from 'supertest';
import { app } from '../src/server';

describe('T-003 — Endpoints públicos', () => {

  describe('GET /api/topologia', () => {
    it('no contiene fijos, variables ni aom en ningún objeto', async () => {
      const res = await request(app).get('/api/topologia');
      expect(res.status).toBe(200);

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('fijos');
      expect(body).not.toContain('variables');
      expect(body).not.toContain('aom');
    });

    it('cada tramo incluye un id no vacío', async () => {
      const res = await request(app).get('/api/topologia');
      expect(res.status).toBe(200);
      expect(res.body.tramos.length).toBe(36);
      for (const tramo of res.body.tramos) {
        expect(tramo.id).toBeDefined();
        expect(typeof tramo.id).toBe('string');
        expect(tramo.id.length).toBeGreaterThan(0);
      }
    });
  });

  describe('POST /api/calcular', () => {
    it('Sebastopol→Medellin devuelve totales.cop === 7360.45', async () => {
      const res = await request(app)
        .post('/api/calcular')
        .send({ origen: 'Sebastopol', destino: 'Medellin', porcentaje: 100, dolar: 4000 });

      expect(res.status).toBe(200);
      expect(res.body.totales.cop).toBeCloseTo(7360.45, 2);
    });

    it('ruta inexistente responde 400 con mensaje "No existe ruta entre..."', async () => {
      const res = await request(app)
        .post('/api/calcular')
        .send({ origen: 'Sebastopol', destino: 'NodoInexistente', porcentaje: 100, dolar: 4000 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No existe ruta entre/);
    });
  });
});
