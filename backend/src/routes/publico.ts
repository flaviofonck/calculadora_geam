import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calcularRuta } from '../services/rutas';

export const router = Router();

// GET /api/nodos — lista de nombres de nodo
router.get('/nodos', async (_req: Request, res: Response) => {
  const nodos = await prisma.nodo.findMany({
    select: { nombre: true },
    orderBy: { nombre: 'asc' },
  });
  res.json({ nodos: nodos.map(n => n.nombre) });
});

// GET /api/topologia — nodos, tramos, colores (sin fijos/variables/aom)
router.get('/topologia', async (_req: Request, res: Response) => {
  const [nodos, tramos, transportadores] = await Promise.all([
    prisma.nodo.findMany({ select: { id: true, nombre: true, lat: true, lon: true } }),
    prisma.tramo.findMany({
      select: {
        id: true,
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        tipo: true,
        transportador: { select: { nombre: true, color: true } },
      },
    }),
    prisma.transportador.findMany({ select: { nombre: true, color: true } }),
  ]);

  const colores: Record<string, string> = {};
  for (const t of transportadores) {
    colores[t.nombre] = t.color;
  }

  res.json({
    nodos: nodos.map(n => ({
      id: n.id,
      nombre: n.nombre,
      lat: n.lat,
      lon: n.lon,
    })),
    tramos: tramos.map(t => ({
      id: t.id,
      origen: t.origen.nombre,
      destino: t.destino.nombre,
      tipo: t.tipo,
      transportador: t.transportador.nombre,
      color: t.transportador.color,
    })),
    colores,
  });
});

// POST /api/calcular — calcula ruta entre origen y destino
router.post('/calcular', async (req: Request, res: Response) => {
  const { origen, destino, porcentaje, dolar } = req.body;

  if (!origen || !destino) {
    res.status(400).json({ error: 'Faltan parámetros: origen y destino son requeridos' });
    return;
  }

  try {
    const result = await calcularRuta(origen, destino, porcentaje ?? 100, dolar ?? 4000);
    res.json(result);
  } catch (err: any) {
    if (err.message && err.message.startsWith('No existe ruta')) {
      res.status(400).json({ error: err.message });
    } else {
      throw err;
    }
  }
});

// GET /api/tramos/:id/costo — costo de un solo tramo con parámetros por defecto
router.get('/tramos/:id/costo', async (req: Request, res: Response) => {
  const tramo = await prisma.tramo.findUnique({
    where: { id: req.params.id as string },
  });
  if (!tramo) {
    res.status(404).json({ error: 'Tramo no encontrado' });
    return;
  }

  // ponytail: read default params on each call — 3 rows, negligible cost
  const params = await prisma.parametroTarifario.findMany();
  const paramMap = new Map(params.map(p => [p.clave, p.valor]));
  const pct = 100; // default porcentaje
  const dolar = paramMap.get('trm_defecto') ?? 4000;

  const total = tramo.fijos * (pct / 100) + tramo.variables * (1 - pct / 100) + tramo.aom;
  res.json({ costo: total });
});
