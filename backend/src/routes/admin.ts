import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { loginRateLimit, registrarIntento } from '../middlewares/loginRateLimit';
import { requireAuth } from '../middlewares/requireAuth';
import { validate, nodoSchema, tramoSchema, transportadorSchema, estampillaSchema, parametroSchema } from '../middlewares/validate';
import { registrarAuditoria } from '../services/auditoria';

const prisma = new PrismaClient();
const router = Router();

async function obtenerCorreo(req: Request): Promise<string> {
  const user = await prisma.adminUser.findUnique({ where: { id: req.session.userId! } });
  return user!.correo;
}

router.post('/auth/login', loginRateLimit, async (req: Request, res: Response) => {
  const { correo, password } = req.body;
  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  const user = await prisma.adminUser.findUnique({ where: { correo: correo.toLowerCase() } });
  if (!user) {
    await registrarIntento(correo, false);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valido = await bcrypt.compare(password, user.hashPassword);
  if (!valido) {
    await registrarIntento(correo, false);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  await registrarIntento(correo, true);
  req.session.userId = user.id;
  res.json({ ok: true });
});

router.post('/auth/logout', (req: Request, res: Response) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Error al cerrar sesión' });
    res.json({ ok: true });
  });
});

// --- GET /api/admin/auditoria ---
router.get('/auditoria', requireAuth, async (req: Request, res: Response) => {
  const { entidad, desde, hasta } = req.query;
  const where: any = {};

  if (entidad) {
    where.entidad = entidad as string;
  }

  if (desde || hasta) {
    where.hechoEn = {};
    if (desde) {
      const d = new Date(desde as string);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Fecha "desde" inválida' });
      }
      where.hechoEn.gte = d;
    }
    if (hasta) {
      const h = new Date(hasta as string);
      if (isNaN(h.getTime())) {
        return res.status(400).json({ error: 'Fecha "hasta" inválida' });
      }
      where.hechoEn.lte = h;
    }
  }

  const logs = await prisma.auditLog.findMany({ where, orderBy: { hechoEn: 'desc' } });
  res.json(logs);
});

// --- CRUD: Nodos ---
router.get('/nodos', requireAuth, async (_req: Request, res: Response) => {
  const nodos = await prisma.nodo.findMany();
  res.json(nodos);
});

router.post('/nodos', requireAuth, validate(nodoSchema), async (req: Request, res: Response) => {
  try {
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const nodo = await tx.nodo.create({ data: req.body });
      await registrarAuditoria(tx, { entidad: 'Nodo', entidadId: nodo.id, accion: 'crear', valorDespues: nodo, hechoPor: correo });
      return nodo;
    });
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Error al crear el nodo' });
  }
});

router.put('/nodos/:id', requireAuth, validate(nodoSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const antes = await tx.nodo.findUnique({ where: { id } });
      const nodo = await tx.nodo.update({ where: { id }, data: req.body });
      await registrarAuditoria(tx, { entidad: 'Nodo', entidadId: id, accion: 'editar', valorAntes: antes, valorDespues: nodo, hechoPor: correo });
      return nodo;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error al editar el nodo' });
  }
});

router.delete('/nodos/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const tramoRef = await prisma.tramo.findFirst({
    where: { OR: [{ origenId: id }, { destinoId: id }] },
    include: { origen: true, destino: true },
  });
  if (tramoRef) {
    return res.status(409).json({
      error: 'Nodo en uso',
      detalle: `El nodo está referenciado por el tramo ${tramoRef.id} (origen: ${tramoRef.origen.nombre}, destino: ${tramoRef.destino.nombre})`,
    });
  }
  try {
    const correo = await obtenerCorreo(req);
    await prisma.$transaction(async (tx) => {
      const antes = await tx.nodo.findUnique({ where: { id } });
      await tx.nodo.delete({ where: { id } });
      await registrarAuditoria(tx, { entidad: 'Nodo', entidadId: id, accion: 'eliminar', valorAntes: antes, hechoPor: correo });
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar el nodo' });
  }
});

// --- CRUD: Tramos ---
router.get('/tramos', requireAuth, async (_req: Request, res: Response) => {
  const tramos = await prisma.tramo.findMany({ include: { origen: true, destino: true, transportador: true } });
  res.json(tramos);
});

router.post('/tramos', requireAuth, validate(tramoSchema), async (req: Request, res: Response) => {
  try {
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const tramo = await tx.tramo.create({ data: req.body });
      await registrarAuditoria(tx, { entidad: 'Tramo', entidadId: tramo.id, accion: 'crear', valorDespues: tramo, hechoPor: correo });
      return tramo;
    });
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Error al crear el tramo' });
  }
});

router.put('/tramos/:id', requireAuth, validate(tramoSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const antes = await tx.tramo.findUnique({ where: { id }, include: { origen: true, destino: true, transportador: true } });
      const tramo = await tx.tramo.update({ where: { id }, data: req.body });
      await registrarAuditoria(tx, { entidad: 'Tramo', entidadId: id, accion: 'editar', valorAntes: antes, valorDespues: tramo, hechoPor: correo });
      return tramo;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error al editar el tramo' });
  }
});

router.delete('/tramos/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const correo = await obtenerCorreo(req);
    await prisma.$transaction(async (tx) => {
      const antes = await tx.tramo.findUnique({ where: { id }, include: { origen: true, destino: true, transportador: true } });
      await tx.tramo.delete({ where: { id } });
      await registrarAuditoria(tx, { entidad: 'Tramo', entidadId: id, accion: 'eliminar', valorAntes: antes, hechoPor: correo });
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar el tramo' });
  }
});

// --- CRUD: Transportadores ---
router.get('/transportadores', requireAuth, async (_req: Request, res: Response) => {
  const transportadores = await prisma.transportador.findMany();
  res.json(transportadores);
});

router.post('/transportadores', requireAuth, validate(transportadorSchema), async (req: Request, res: Response) => {
  try {
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const transportador = await tx.transportador.create({ data: req.body });
      await registrarAuditoria(tx, { entidad: 'Transportador', entidadId: transportador.id, accion: 'crear', valorDespues: transportador, hechoPor: correo });
      return transportador;
    });
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Error al crear el transportador' });
  }
});

router.put('/transportadores/:id', requireAuth, validate(transportadorSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const antes = await tx.transportador.findUnique({ where: { id } });
      const transportador = await tx.transportador.update({ where: { id }, data: req.body });
      await registrarAuditoria(tx, { entidad: 'Transportador', entidadId: id, accion: 'editar', valorAntes: antes, valorDespues: transportador, hechoPor: correo });
      return transportador;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error al editar el transportador' });
  }
});

router.delete('/transportadores/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const correo = await obtenerCorreo(req);
    await prisma.$transaction(async (tx) => {
      const antes = await tx.transportador.findUnique({ where: { id } });
      await tx.transportador.delete({ where: { id } });
      await registrarAuditoria(tx, { entidad: 'Transportador', entidadId: id, accion: 'eliminar', valorAntes: antes, hechoPor: correo });
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar el transportador' });
  }
});

// --- CRUD: Estampillas ---
router.get('/estampillas', requireAuth, async (_req: Request, res: Response) => {
  const estampillas = await prisma.estampilla.findMany({ include: { transportador: true } });
  res.json(estampillas);
});

router.post('/estampillas', requireAuth, validate(estampillaSchema), async (req: Request, res: Response) => {
  try {
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const estampilla = await tx.estampilla.create({ data: req.body });
      await registrarAuditoria(tx, { entidad: 'Estampilla', entidadId: estampilla.transportadorId, accion: 'crear', valorDespues: estampilla, hechoPor: correo });
      return estampilla;
    });
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Error al crear la estampilla' });
  }
});

router.put('/estampillas/:id', requireAuth, validate(estampillaSchema), async (req: Request, res: Response) => {
  try {
    const transportadorId = req.params.id as string;
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const antes = await tx.estampilla.findUnique({ where: { transportadorId }, include: { transportador: true } });
      const estampilla = await tx.estampilla.update({ where: { transportadorId }, data: req.body });
      await registrarAuditoria(tx, { entidad: 'Estampilla', entidadId: transportadorId, accion: 'editar', valorAntes: antes, valorDespues: estampilla, hechoPor: correo });
      return estampilla;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error al editar la estampilla' });
  }
});

router.delete('/estampillas/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const transportadorId = req.params.id as string;
    const correo = await obtenerCorreo(req);
    await prisma.$transaction(async (tx) => {
      const antes = await tx.estampilla.findUnique({ where: { transportadorId }, include: { transportador: true } });
      await tx.estampilla.delete({ where: { transportadorId } });
      await registrarAuditoria(tx, { entidad: 'Estampilla', entidadId: transportadorId, accion: 'eliminar', valorAntes: antes, hechoPor: correo });
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar la estampilla' });
  }
});

// --- CRUD: Parámetros tarifarios ---
router.get('/parametros', requireAuth, async (_req: Request, res: Response) => {
  const parametros = await prisma.parametroTarifario.findMany();
  res.json(parametros);
});

router.post('/parametros', requireAuth, validate(parametroSchema), async (req: Request, res: Response) => {
  try {
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const parametro = await tx.parametroTarifario.create({ data: req.body });
      await registrarAuditoria(tx, { entidad: 'ParametroTarifario', entidadId: parametro.clave, accion: 'crear', valorDespues: parametro, hechoPor: correo });
      return parametro;
    });
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Error al crear el parámetro' });
  }
});

router.put('/parametros/:id', requireAuth, validate(parametroSchema), async (req: Request, res: Response) => {
  try {
    const clave = req.params.id as string;
    const correo = await obtenerCorreo(req);
    const result = await prisma.$transaction(async (tx) => {
      const antes = await tx.parametroTarifario.findUnique({ where: { clave } });
      const parametro = await tx.parametroTarifario.update({ where: { clave }, data: req.body });
      await registrarAuditoria(tx, { entidad: 'ParametroTarifario', entidadId: clave, accion: 'editar', valorAntes: antes, valorDespues: parametro, hechoPor: correo });
      return parametro;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error al editar el parámetro' });
  }
});

router.delete('/parametros/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const clave = req.params.id as string;
    const correo = await obtenerCorreo(req);
    await prisma.$transaction(async (tx) => {
      const antes = await tx.parametroTarifario.findUnique({ where: { clave } });
      await tx.parametroTarifario.delete({ where: { clave } });
      await registrarAuditoria(tx, { entidad: 'ParametroTarifario', entidadId: clave, accion: 'eliminar', valorAntes: antes, hechoPor: correo });
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar el parámetro' });
  }
});

export { router as adminRouter };
