process.env.SESSION_SECRET = 'test-secret-for-jest-only';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import { app } from '../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_EMAIL = 'test-admin@example.com';
const TEST_PASSWORD = 'TestPassword123!';
const NONEXISTENT_EMAIL = 'no-existe@example.com';
const CONTROL_EMAIL = 'control-foreign@example.com';
const CONTROL_INTENT_EMAIL = 'control-intent@example.com';

let controlIntentId: string;

beforeAll(async () => {
  app.set('trust proxy', true);

  await prisma.intentoLogin.deleteMany({ where: { correo: TEST_EMAIL } });
  await prisma.intentoLogin.deleteMany({ where: { correo: NONEXISTENT_EMAIL } });

  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  await prisma.adminUser.upsert({
    where: { correo: TEST_EMAIL },
    update: { hashPassword: hash },
    create: { correo: TEST_EMAIL, hashPassword: hash },
  });

  const controlHash = await bcrypt.hash('ControlPass123!', 10);
  await prisma.adminUser.upsert({
    where: { correo: CONTROL_EMAIL },
    update: { hashPassword: controlHash },
    create: { correo: CONTROL_EMAIL, hashPassword: controlHash },
  });

  const controlIntent = await prisma.intentoLogin.create({
    data: { correo: CONTROL_INTENT_EMAIL, exitoso: false },
  });
  controlIntentId = controlIntent.id;
});

afterAll(async () => {
  await prisma.intentoLogin.deleteMany({ where: { correo: TEST_EMAIL } });
  await prisma.intentoLogin.deleteMany({ where: { correo: NONEXISTENT_EMAIL } });

  const controlIntent = await prisma.intentoLogin.findUnique({
    where: { id: controlIntentId },
  });
  expect(controlIntent).not.toBeNull();
  expect(controlIntent!.correo).toBe(CONTROL_INTENT_EMAIL);
  expect(controlIntent!.exitoso).toBe(false);

  await prisma.intentoLogin.deleteMany({ where: { correo: CONTROL_INTENT_EMAIL } });
  await prisma.adminUser.deleteMany({ where: { correo: TEST_EMAIL } });
  await prisma.adminUser.deleteMany({ where: { correo: CONTROL_EMAIL } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.intentoLogin.deleteMany({ where: { correo: TEST_EMAIL } });
  await prisma.intentoLogin.deleteMany({ where: { correo: NONEXISTENT_EMAIL } });
});

describe('login', () => {
  it('login válido crea sesión y devuelve cookie', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ correo: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    expect(res.body.ok).toBe(true);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookie = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(res.text).not.toContain(TEST_PASSWORD);
  });

  it('login inválido no crea sesión', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ correo: TEST_EMAIL, password: 'wrong-password' })
      .expect(401);

    expect(res.body.error).toBe('Credenciales inválidas');
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeUndefined();
  });

  it('login con correo inexistente no revela si existe', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ correo: NONEXISTENT_EMAIL, password: 'whatever' })
      .expect(401);

    expect(res.body.error).toBe('Credenciales inválidas');
  });

  it('tres fallos consecutivos bloquean el cuarto intento', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/admin/auth/login')
        .send({ correo: TEST_EMAIL, password: 'wrong' })
        .expect(401);
    }

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ correo: TEST_EMAIL, password: 'wrong' })
      .expect(429);

    expect(res.body.error).toContain('bloqueada');
  });

  it('logout destruye la sesión', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/admin/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ correo: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    await agent.post('/api/admin/auth/logout').expect(200);
  });

  it('correo de control sobrevive a la suite', async () => {
    const controlUser = await prisma.adminUser.findUnique({
      where: { correo: CONTROL_EMAIL },
    });
    expect(controlUser).not.toBeNull();
  });
});

describe('crud', () => {
  const PREFIX = 'crud-test-v008';
  let sessionCookie: string;
  let fixtureNodoId: string;
  let fixtureNodoRefId: string;
  let fixtureTransportadorId: string;
  let fixtureTramoId: string;
  let fixtureEstampillaId: string;
  let fixtureParametroClave = `${PREFIX}-param`;

  async function limpiarFixturesCrud(
    db: any,
    ids: { tramoId?: string; estampillaTransportadorId?: string },
  ) {
    if (ids.tramoId) {
      await db.tramo.deleteMany({ where: { id: ids.tramoId } });
    }
    if (ids.estampillaTransportadorId) {
      await db.estampilla.deleteMany({ where: { transportadorId: ids.estampillaTransportadorId } });
    }
    await db.nodo.deleteMany({ where: { nombre: { startsWith: PREFIX } } });
    await db.transportador.deleteMany({ where: { nombre: { startsWith: PREFIX } } });
    await db.parametroTarifario.deleteMany({ where: { clave: { startsWith: PREFIX } } });
  }

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ correo: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;
  });

  afterAll(async () => {
    await limpiarFixturesCrud(prisma, {
      tramoId: fixtureTramoId,
      estampillaTransportadorId: fixtureEstampillaId,
    });
  });

  it('las 3 estampillas de dominio sobreviven al inicio de la suite CRUD', async () => {
    const count = await prisma.estampilla.count();
    expect(count).toBe(3);
  });

  // --- 401 sin sesión: GET ---
  it('GET /nodos responde 401 sin sesión', async () => {
    await request(app).get('/api/admin/nodos').expect(401);
  });

  it('GET /tramos responde 401 sin sesión', async () => {
    await request(app).get('/api/admin/tramos').expect(401);
  });

  it('GET /transportadores responde 401 sin sesión', async () => {
    await request(app).get('/api/admin/transportadores').expect(401);
  });

  it('GET /estampillas responde 401 sin sesión', async () => {
    await request(app).get('/api/admin/estampillas').expect(401);
  });

  it('GET /parametros responde 401 sin sesión', async () => {
    await request(app).get('/api/admin/parametros').expect(401);
  });

  // --- 401 sin sesión: POST ---
  it('POST /nodos responde 401 sin sesión', async () => {
    await request(app).post('/api/admin/nodos').send({ nombre: 'x' }).expect(401);
  });

  it('POST /tramos responde 401 sin sesión', async () => {
    await request(app).post('/api/admin/tramos').send({ origenId: 'a', destinoId: 'b', transportadorId: 'c', tipo: 'x', fijos: 0, variables: 0, aom: 0 }).expect(401);
  });

  it('POST /transportadores responde 401 sin sesión', async () => {
    await request(app).post('/api/admin/transportadores').send({ nombre: 'x', color: '#000' }).expect(401);
  });

  it('POST /estampillas responde 401 sin sesión', async () => {
    await request(app).post('/api/admin/estampillas').send({ transportadorId: 'x', fijos: 0, variables: 0, aom: 0 }).expect(401);
  });

  it('POST /parametros responde 401 sin sesión', async () => {
    await request(app).post('/api/admin/parametros').send({ clave: 'x', valor: 0 }).expect(401);
  });

  // --- 401 sin sesión: PUT ---
  it('PUT /nodos/:id responde 401 sin sesión', async () => {
    await request(app).put('/api/admin/nodos/fake-id').send({ nombre: 'x' }).expect(401);
  });

  it('PUT /tramos/:id responde 401 sin sesión', async () => {
    await request(app).put('/api/admin/tramos/fake-id').send({ origenId: 'a', destinoId: 'b', transportadorId: 'c', tipo: 'x', fijos: 0, variables: 0, aom: 0 }).expect(401);
  });

  it('PUT /transportadores/:id responde 401 sin sesión', async () => {
    await request(app).put('/api/admin/transportadores/fake-id').send({ nombre: 'x', color: '#000' }).expect(401);
  });

  it('PUT /estampillas/:id responde 401 sin sesión', async () => {
    await request(app).put('/api/admin/estampillas/fake-id').send({ transportadorId: 'x', fijos: 0, variables: 0, aom: 0 }).expect(401);
  });

  it('PUT /parametros/:id responde 401 sin sesión', async () => {
    await request(app).put('/api/admin/parametros/fake-id').send({ clave: 'x', valor: 0 }).expect(401);
  });

  // --- 401 sin sesión: DELETE ---
  it('DELETE /nodos/:id responde 401 sin sesión', async () => {
    await request(app).delete('/api/admin/nodos/fake-id').expect(401);
  });

  it('DELETE /tramos/:id responde 401 sin sesión', async () => {
    await request(app).delete('/api/admin/tramos/fake-id').expect(401);
  });

  it('DELETE /transportadores/:id responde 401 sin sesión', async () => {
    await request(app).delete('/api/admin/transportadores/fake-id').expect(401);
  });

  it('DELETE /estampillas/:id responde 401 sin sesión', async () => {
    await request(app).delete('/api/admin/estampillas/fake-id').expect(401);
  });

  it('DELETE /parametros/:id responde 401 sin sesión', async () => {
    await request(app).delete('/api/admin/parametros/fake-id').expect(401);
  });

  // --- CRUD nodos ---
  it('crea y lista un nodo', async () => {
    const res = await request(app)
      .post('/api/admin/nodos')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-nodo-a` })
      .expect(201);
    fixtureNodoId = res.body.id;
    expect(res.body.nombre).toBe(`${PREFIX}-nodo-a`);

    const list = await request(app)
      .get('/api/admin/nodos')
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(list.body.some((n: any) => n.id === fixtureNodoId)).toBe(true);
  });

  it('edita un nodo', async () => {
    const res = await request(app)
      .put(`/api/admin/nodos/${fixtureNodoId}`)
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-nodo-a-edit` })
      .expect(200);
    expect(res.body.nombre).toBe(`${PREFIX}-nodo-a-edit`);
  });

  // --- CRUD transportadores ---
  it('crea y lista un transportador', async () => {
    const res = await request(app)
      .post('/api/admin/transportadores')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-trans`, color: '#ff0000' })
      .expect(201);
    fixtureTransportadorId = res.body.id;
    expect(res.body.nombre).toBe(`${PREFIX}-trans`);

    const list = await request(app)
      .get('/api/admin/transportadores')
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(list.body.some((t: any) => t.id === fixtureTransportadorId)).toBe(true);
  });

  it('edita un transportador', async () => {
    const res = await request(app)
      .put(`/api/admin/transportadores/${fixtureTransportadorId}`)
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-trans-edit`, color: '#00ff00' })
      .expect(200);
    expect(res.body.nombre).toBe(`${PREFIX}-trans-edit`);
  });

  // --- CRUD tramos ---
  it('crea un tramo con nodos válidos', async () => {
    const nodoB = await request(app)
      .post('/api/admin/nodos')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-nodo-b` })
      .expect(201);
    fixtureNodoRefId = nodoB.body.id;

    const res = await request(app)
      .post('/api/admin/tramos')
      .set('Cookie', sessionCookie)
      .send({
        origenId: fixtureNodoId,
        destinoId: fixtureNodoRefId,
        transportadorId: fixtureTransportadorId,
        tipo: 'principal',
        fijos: 100,
        variables: 50,
        aom: 25,
      })
      .expect(201);
    fixtureTramoId = res.body.id;
    expect(res.body.origenId).toBe(fixtureNodoId);
  });

  it('lista tramos', async () => {
    const list = await request(app)
      .get('/api/admin/tramos')
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(list.body.some((t: any) => t.id === fixtureTramoId)).toBe(true);
  });

  it('edita un tramo', async () => {
    const res = await request(app)
      .put(`/api/admin/tramos/${fixtureTramoId}`)
      .set('Cookie', sessionCookie)
      .send({
        origenId: fixtureNodoId,
        destinoId: fixtureNodoRefId,
        transportadorId: fixtureTransportadorId,
        tipo: 'secundario',
        fijos: 200,
        variables: 100,
        aom: 50,
      })
      .expect(200);
    expect(res.body.tipo).toBe('secundario');
  });

  it('rechaza tramo con origen igual a destino (400)', async () => {
    const res = await request(app)
      .post('/api/admin/tramos')
      .set('Cookie', sessionCookie)
      .send({
        origenId: fixtureNodoId,
        destinoId: fixtureNodoId,
        transportadorId: fixtureTransportadorId,
        tipo: 'secundario',
        fijos: 10,
        variables: 5,
        aom: 2,
      })
      .expect(400);
    expect(res.body.error).toBe('Payload inválido');

    const tramoCount = await prisma.tramo.count({
      where: { origenId: fixtureNodoId, destinoId: fixtureNodoId, transportadorId: fixtureTransportadorId },
    });
    expect(tramoCount).toBe(0);
  });

  // --- CRUD estampillas ---
  it('crea una estampilla', async () => {
    const res = await request(app)
      .post('/api/admin/estampillas')
      .set('Cookie', sessionCookie)
      .send({
        transportadorId: fixtureTransportadorId,
        fijos: 200,
        variables: 100,
        aom: 50,
      })
      .expect(201);
    fixtureEstampillaId = res.body.transportadorId;
    expect(res.body.transportadorId).toBe(fixtureTransportadorId);
  });

  it('lista estampillas', async () => {
    const list = await request(app)
      .get('/api/admin/estampillas')
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(list.body.some((e: any) => e.transportadorId === fixtureEstampillaId)).toBe(true);
  });

  it('edita una estampilla', async () => {
    const res = await request(app)
      .put(`/api/admin/estampillas/${fixtureEstampillaId}`)
      .set('Cookie', sessionCookie)
      .send({ transportadorId: fixtureEstampillaId, fijos: 300, variables: 150, aom: 75 })
      .expect(200);
    expect(res.body.fijos).toBe(300);
  });

  it('rechaza estampilla sin aom (400)', async () => {
    const res = await request(app)
      .post('/api/admin/estampillas')
      .set('Cookie', sessionCookie)
      .send({
        transportadorId: `${PREFIX}-noexist`,
        fijos: 10,
        variables: 5,
      })
      .expect(400);
    expect(res.body.error).toBe('Payload inválido');

    const estampillaCount = await prisma.estampilla.count({
      where: { transportadorId: `${PREFIX}-noexist` },
    });
    expect(estampillaCount).toBe(0);
  });

  // --- CRUD parametros ---
  it('crea y lista un parámetro tarifario', async () => {
    await request(app)
      .post('/api/admin/parametros')
      .set('Cookie', sessionCookie)
      .send({ clave: fixtureParametroClave, valor: 3.14 })
      .expect(201);

    const list = await request(app)
      .get('/api/admin/parametros')
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(list.body.some((p: any) => p.clave === fixtureParametroClave)).toBe(true);
  });

  it('edita un parámetro tarifario', async () => {
    const res = await request(app)
      .put(`/api/admin/parametros/${fixtureParametroClave}`)
      .set('Cookie', sessionCookie)
      .send({ clave: fixtureParametroClave, valor: 6.28 })
      .expect(200);
    expect(res.body.valor).toBe(6.28);
  });

  // --- 409 al borrar nodo referenciado ---
  it('borrar un nodo referenciado por un tramo responde 409', async () => {
    const res = await request(app)
      .delete(`/api/admin/nodos/${fixtureNodoId}`)
      .set('Cookie', sessionCookie)
      .expect(409);
    expect(res.body.error).toBe('Nodo en uso');
    expect(res.body.detalle).toContain(fixtureTramoId);
  });

  it('el nodo referenciado y el tramo siguen existiendo tras el 409', async () => {
    const nodo = await prisma.nodo.findUnique({ where: { id: fixtureNodoId } });
    expect(nodo).not.toBeNull();
    const tramo = await prisma.tramo.findUnique({ where: { id: fixtureTramoId } });
    expect(tramo).not.toBeNull();
  });

  // --- Eliminaciones válidas ---
  it('elimina estampilla, tramo, nodos, transportador y parámetro', async () => {
    await request(app).delete(`/api/admin/estampillas/${fixtureEstampillaId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/tramos/${fixtureTramoId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/nodos/${fixtureNodoRefId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/nodos/${fixtureNodoId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/transportadores/${fixtureTransportadorId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/parametros/${fixtureParametroClave}`).set('Cookie', sessionCookie).expect(200);
  });

  it('las 3 estampillas de dominio sobreviven al final de la suite CRUD', async () => {
    const count = await prisma.estampilla.count();
    expect(count).toBe(3);
  });

  it('la limpieza con ids ausentes no borra estampillas ni tramos', async () => {
    const mockDb = {
      tramo: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      estampilla: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      nodo: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      transportador: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      parametroTarifario: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    await limpiarFixturesCrud(mockDb, {});
    expect(mockDb.estampilla.deleteMany).not.toHaveBeenCalled();
    expect(mockDb.tramo.deleteMany).not.toHaveBeenCalled();
    expect(mockDb.nodo.deleteMany).toHaveBeenCalledWith({
      where: { nombre: { startsWith: PREFIX } },
    });
    expect(mockDb.transportador.deleteMany).toHaveBeenCalledWith({
      where: { nombre: { startsWith: PREFIX } },
    });
    expect(mockDb.parametroTarifario.deleteMany).toHaveBeenCalledWith({
      where: { clave: { startsWith: PREFIX } },
    });
  });
});

describe('auditoria', () => {
  const PREFIX = 'audit-test-v010';
  let sessionCookie: string;
  let fixtureNodoId: string;
  let fixtureNodoBId: string;
  let fixtureTransportadorId: string;
  let fixtureTramoId: string;
  let fixtureEstampillaId: string;
  let fixtureParametroClave = `${PREFIX}-param`;
  let controlAuditId: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ correo: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;

    const controlAudit = await prisma.auditLog.create({
      data: {
        entidad: 'Control',
        entidadId: 'control-audit-id',
        accion: 'crear',
        valorDespues: { test: true },
        hechoPor: 'control@example.com',
      },
    });
    controlAuditId = controlAudit.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { hechoPor: TEST_EMAIL } });

    if (fixtureTramoId) await prisma.tramo.deleteMany({ where: { id: fixtureTramoId } });
    if (fixtureEstampillaId) await prisma.estampilla.deleteMany({ where: { transportadorId: fixtureEstampillaId } });
    await prisma.nodo.deleteMany({ where: { nombre: { startsWith: PREFIX } } });
    await prisma.transportador.deleteMany({ where: { nombre: { startsWith: PREFIX } } });
    await prisma.parametroTarifario.deleteMany({ where: { clave: { startsWith: PREFIX } } });

    const control = await prisma.auditLog.findUnique({ where: { id: controlAuditId } });
    expect(control).not.toBeNull();
    expect(control!.id).toBe(controlAuditId);
    expect(control!.entidad).toBe('Control');
    expect(control!.entidadId).toBe('control-audit-id');
    expect(control!.valorDespues).toEqual({ test: true });
    expect(control!.hechoPor).toBe('control@example.com');

    await prisma.auditLog.deleteMany({ where: { id: controlAuditId } });
  });

  it('GET /auditoria responde 401 sin sesión', async () => {
    await request(app).get('/api/admin/auditoria').expect(401);
  });

  it('rollback: si falla AuditLog, la mutación no sobrevive', async () => {
    const auditoria = require('../src/services/auditoria');
    const spy = jest.spyOn(auditoria, 'registrarAuditoria').mockRejectedValueOnce(new Error('forced'));

    await request(app)
      .post('/api/admin/nodos')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-rollback` })
      .expect(500);

    const nodo = await prisma.nodo.findFirst({ where: { nombre: `${PREFIX}-rollback` } });
    expect(nodo).toBeNull();

    spy.mockRestore();
  });

  it('crea nodo y registra auditoría con valorAntes=null', async () => {
    const res = await request(app)
      .post('/api/admin/nodos')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-nodo` })
      .expect(201);
    fixtureNodoId = res.body.id;

    const logs = await prisma.auditLog.findMany({
      where: { entidad: 'Nodo', entidadId: fixtureNodoId },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].accion).toBe('crear');
    expect(logs[0].valorAntes).toBeNull();
    expect(logs[0].valorDespues).toEqual(expect.objectContaining({ id: fixtureNodoId, nombre: `${PREFIX}-nodo` }));
    expect(logs[0].hechoPor).toBe(TEST_EMAIL);
  });

  it('edita nodo y registra auditoría con valores antes y después', async () => {
    const res = await request(app)
      .put(`/api/admin/nodos/${fixtureNodoId}`)
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-nodo-edit` })
      .expect(200);

    const logs = await prisma.auditLog.findMany({
      where: { entidad: 'Nodo', entidadId: fixtureNodoId, accion: 'editar' },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].valorAntes).toEqual(expect.objectContaining({ nombre: `${PREFIX}-nodo` }));
    expect(logs[0].valorDespues).toEqual(expect.objectContaining({ nombre: `${PREFIX}-nodo-edit` }));
    expect(logs[0].hechoPor).toBe(TEST_EMAIL);
  });

  it('crea transportador, tramo, estampilla y parámetro con auditoría', async () => {
    const transRes = await request(app)
      .post('/api/admin/transportadores')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-trans`, color: '#ff0000' })
      .expect(201);
    fixtureTransportadorId = transRes.body.id;

    const nodoB = await request(app)
      .post('/api/admin/nodos')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-nodo-b` })
      .expect(201);
    fixtureNodoBId = nodoB.body.id;

    const tramoRes = await request(app)
      .post('/api/admin/tramos')
      .set('Cookie', sessionCookie)
      .send({
        origenId: fixtureNodoId,
        destinoId: nodoB.body.id,
        transportadorId: fixtureTransportadorId,
        tipo: 'principal',
        fijos: 100,
        variables: 50,
        aom: 25,
      })
      .expect(201);
    fixtureTramoId = tramoRes.body.id;

    const estRes = await request(app)
      .post('/api/admin/estampillas')
      .set('Cookie', sessionCookie)
      .send({ transportadorId: fixtureTransportadorId, fijos: 200, variables: 100, aom: 50 })
      .expect(201);
    fixtureEstampillaId = estRes.body.transportadorId;

    await request(app)
      .post('/api/admin/parametros')
      .set('Cookie', sessionCookie)
      .send({ clave: fixtureParametroClave, valor: 3.14 })
      .expect(201);

    const transLog = await prisma.auditLog.findMany({ where: { entidad: 'Transportador', entidadId: fixtureTransportadorId, accion: 'crear', hechoPor: TEST_EMAIL } });
    expect(transLog.length).toBe(1);
    expect(transLog[0].valorAntes).toBeNull();
    expect(transLog[0].hechoPor).toBe(TEST_EMAIL);

    const nodoBLog = await prisma.auditLog.findMany({ where: { entidad: 'Nodo', entidadId: fixtureNodoBId, accion: 'crear', hechoPor: TEST_EMAIL } });
    expect(nodoBLog.length).toBe(1);
    expect(nodoBLog[0].valorAntes).toBeNull();

    const tramoLog = await prisma.auditLog.findMany({ where: { entidad: 'Tramo', entidadId: fixtureTramoId, accion: 'crear', hechoPor: TEST_EMAIL } });
    expect(tramoLog.length).toBe(1);
    expect(tramoLog[0].valorAntes).toBeNull();

    const estLog = await prisma.auditLog.findMany({ where: { entidad: 'Estampilla', entidadId: fixtureEstampillaId, accion: 'crear', hechoPor: TEST_EMAIL } });
    expect(estLog.length).toBe(1);
    expect(estLog[0].valorAntes).toBeNull();

    const paramLog = await prisma.auditLog.findMany({ where: { entidad: 'ParametroTarifario', entidadId: fixtureParametroClave, accion: 'crear', hechoPor: TEST_EMAIL } });
    expect(paramLog.length).toBe(1);
    expect(paramLog[0].valorAntes).toBeNull();
  });

  it('edita estampilla y registra valores antes/después', async () => {
    await request(app)
      .put(`/api/admin/estampillas/${fixtureEstampillaId}`)
      .set('Cookie', sessionCookie)
      .send({ transportadorId: fixtureEstampillaId, fijos: 300, variables: 150, aom: 75 })
      .expect(200);

    const logs = await prisma.auditLog.findMany({
      where: { entidad: 'Estampilla', entidadId: fixtureEstampillaId, accion: 'editar' },
    });
    expect(logs.length).toBe(1);
    expect((logs[0].valorAntes as any).fijos).toBe(200);
    expect((logs[0].valorDespues as any).fijos).toBe(300);
  });

  it('edita tramo y registra valores antes/después', async () => {
    await request(app)
      .put(`/api/admin/tramos/${fixtureTramoId}`)
      .set('Cookie', sessionCookie)
      .send({
        origenId: fixtureNodoId,
        destinoId: fixtureNodoBId,
        transportadorId: fixtureTransportadorId,
        tipo: 'secundario',
        fijos: 200,
        variables: 100,
        aom: 50,
      })
      .expect(200);

    const logs = await prisma.auditLog.findMany({
      where: { entidad: 'Tramo', entidadId: fixtureTramoId, accion: 'editar' },
    });
    expect(logs.length).toBe(1);
    expect((logs[0].valorAntes as any).tipo).toBe('principal');
    expect((logs[0].valorDespues as any).tipo).toBe('secundario');
  });

  it('edita transportador y parámetro con auditoría', async () => {
    await request(app)
      .put(`/api/admin/transportadores/${fixtureTransportadorId}`)
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-trans-edit`, color: '#00ff00' })
      .expect(200);

    const transLogs = await prisma.auditLog.findMany({
      where: { entidad: 'Transportador', entidadId: fixtureTransportadorId, accion: 'editar' },
    });
    expect(transLogs.length).toBe(1);
    expect((transLogs[0].valorAntes as any).nombre).toBe(`${PREFIX}-trans`);
    expect((transLogs[0].valorDespues as any).nombre).toBe(`${PREFIX}-trans-edit`);

    await request(app)
      .put(`/api/admin/parametros/${fixtureParametroClave}`)
      .set('Cookie', sessionCookie)
      .send({ clave: fixtureParametroClave, valor: 6.28 })
      .expect(200);

    const paramLogs = await prisma.auditLog.findMany({
      where: { entidad: 'ParametroTarifario', entidadId: fixtureParametroClave, accion: 'editar' },
    });
    expect(paramLogs.length).toBe(1);
    expect((paramLogs[0].valorAntes as any).valor).toBe(3.14);
    expect((paramLogs[0].valorDespues as any).valor).toBe(6.28);
  });

  it('elimina entidades y registra auditoría con valorDespues=null', async () => {
    await request(app).delete(`/api/admin/parametros/${fixtureParametroClave}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/estampillas/${fixtureEstampillaId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/tramos/${fixtureTramoId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/nodos/${fixtureNodoId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/nodos/${fixtureNodoBId}`).set('Cookie', sessionCookie).expect(200);
    await request(app).delete(`/api/admin/transportadores/${fixtureTransportadorId}`).set('Cookie', sessionCookie).expect(200);

    const paramLogs = await prisma.auditLog.findMany({
      where: { entidad: 'ParametroTarifario', entidadId: fixtureParametroClave, accion: 'eliminar' },
    });
    expect(paramLogs.length).toBe(1);
    expect(paramLogs[0].valorDespues).toBeNull();
    expect(paramLogs[0].valorAntes).toEqual(expect.objectContaining({ clave: fixtureParametroClave }));

    const estLogs = await prisma.auditLog.findMany({
      where: { entidad: 'Estampilla', entidadId: fixtureEstampillaId, accion: 'eliminar' },
    });
    expect(estLogs.length).toBe(1);
    expect(estLogs[0].valorDespues).toBeNull();

    const tramoLogs = await prisma.auditLog.findMany({
      where: { entidad: 'Tramo', entidadId: fixtureTramoId, accion: 'eliminar' },
    });
    expect(tramoLogs.length).toBe(1);
    expect(tramoLogs[0].valorDespues).toBeNull();

    const transLogs = await prisma.auditLog.findMany({
      where: { entidad: 'Transportador', entidadId: fixtureTransportadorId, accion: 'eliminar' },
    });
    expect(transLogs.length).toBe(1);
    expect(transLogs[0].valorDespues).toBeNull();

    const nodoLogs = await prisma.auditLog.findMany({
      where: { entidad: 'Nodo', entidadId: fixtureNodoId, accion: 'eliminar' },
    });
    expect(nodoLogs.length).toBe(1);
    expect(nodoLogs[0].valorDespues).toBeNull();

    const nodoBLogs = await prisma.auditLog.findMany({
      where: { entidad: 'Nodo', entidadId: fixtureNodoBId, accion: 'eliminar' },
    });
    expect(nodoBLogs.length).toBe(1);
    expect(nodoBLogs[0].valorDespues).toBeNull();
  });

  it('filtra auditoría por entidad', async () => {
    const res = await request(app)
      .get('/api/admin/auditoria?entidad=Nodo')
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((l: any) => l.entidad === 'Nodo')).toBe(true);
  });

  it('filtra auditoría por rango de fechas inclusivo', async () => {
    const ahora = new Date();
    const desde = new Date(ahora.getTime() - 60000).toISOString();
    const hasta = new Date(ahora.getTime() + 60000).toISOString();

    const res = await request(app)
      .get(`/api/admin/auditoria?desde=${desde}&hasta=${hasta}`)
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('filtra auditoría por entidad y rango de fechas', async () => {
    const ahora = new Date();
    const desde = new Date(ahora.getTime() - 60000).toISOString();
    const hasta = new Date(ahora.getTime() + 60000).toISOString();

    const res = await request(app)
      .get(`/api/admin/auditoria?entidad=Transportador&desde=${desde}&hasta=${hasta}`)
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((l: any) => l.entidad === 'Transportador')).toBe(true);
  });

  it('rechaza fecha "desde" inválida con 400', async () => {
    const res = await request(app)
      .get('/api/admin/auditoria?desde=fecha-invalida')
      .set('Cookie', sessionCookie)
      .expect(400);
    expect(res.body.error).toContain('desde');
  });

  it('rechaza fecha "hasta" inválida con 400', async () => {
    const res = await request(app)
      .get('/api/admin/auditoria?hasta=no-es-fecha')
      .set('Cookie', sessionCookie)
      .expect(400);
    expect(res.body.error).toContain('hasta');
  });

  it('el autor se obtiene de la sesión y no del body', async () => {
    const nodoRes = await request(app)
      .post('/api/admin/nodos')
      .set('Cookie', sessionCookie)
      .send({ nombre: `${PREFIX}-nodo-autor`, hechoPor: 'fake@example.com' })
      .expect(201);

    const logs = await prisma.auditLog.findMany({
      where: { entidad: 'Nodo', entidadId: nodoRes.body.id },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].hechoPor).toBe(TEST_EMAIL);
    expect(logs[0].hechoPor).not.toBe('fake@example.com');

    await prisma.auditLog.deleteMany({ where: { id: logs[0].id } });
    await request(app).delete(`/api/admin/nodos/${nodoRes.body.id}`).set('Cookie', sessionCookie).expect(200);
  });
});
