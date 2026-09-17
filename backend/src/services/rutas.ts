import { prisma } from '../lib/prisma';

interface Detalle {
  Tramo: string;
  Transportador: string;
  Fijos: string;
  Variables: string;
  AOM: string;
  'Total Tramo': string;
  Distancia: string;
}

interface CalcularRutaResult {
  detalles: Detalle[];
  transportadores: string[];
  totales: { cop: number; usd: number };
  estadisticas: { segmentos: number; transportadores: number };
}

// ponytail: loads all tramos on each call — DB is local, 36 rows, negligible cost
export async function findShortestPath(start: string, end: string): Promise<string[] | null> {
  const tramos = await prisma.tramo.findMany({
    include: { origen: true, destino: true },
  });

  const graph = new Map<string, string[]>();
  for (const t of tramos) {
    const o = t.origen.nombre;
    const d = t.destino.nombre;
    if (!graph.has(o)) graph.set(o, []);
    graph.get(o)!.push(d);
    if (!graph.has(d)) graph.set(d, []);
    graph.get(d)!.push(o);
  }

  if (!graph.has(start) || !graph.has(end)) return null;
  if (start === end) return [start];

  const queue: string[][] = [[start]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === end) return path;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of graph.get(current) || []) {
      if (!visited.has(neighbor)) queue.push([...path, neighbor]);
    }
  }
  return null;
}

export async function calcularRuta(
  origen: string,
  destino: string,
  porcentaje: number,
  dolar: number
): Promise<CalcularRutaResult> {
  const path = await findShortestPath(origen, destino);
  if (!path || path.length === 0) {
    throw new Error(`No existe ruta entre ${origen} y ${destino}`);
  }

  const [tramos, estampillas] = await Promise.all([
    prisma.tramo.findMany({ include: { origen: true, destino: true, transportador: true } }),
    prisma.estampilla.findMany({ include: { transportador: true } }),
  ]);

  const pct = porcentaje / 100.0;
  const detalles: Detalle[] = [];
  const transportSet = new Set<string>();

  for (let i = 0; i < path.length - 1; i++) {
    const o = path[i];
    const d = path[i + 1];

    let tramo = tramos.find(t => t.origen.nombre === o && t.destino.nombre === d);
    if (!tramo) {
      tramo = tramos.find(t => t.origen.nombre === d && t.destino.nombre === o);
    }
    if (!tramo) {
      throw new Error(`Segmento no encontrado: ${o} ↔ ${d}`);
    }

    // fijos * pct + variables * (1 - pct) + aom  (no * dolar/TRM)
    const fijosVal = tramo.fijos * pct;
    const variablesVal = tramo.variables * (1 - pct);
    const aomVal = tramo.aom;
    const totalTramo = fijosVal + variablesVal + aomVal;

    transportSet.add(tramo.transportador.nombre);

    detalles.push({
      Tramo: `${o} - ${d}`,
      Transportador: tramo.transportador.nombre,
      Fijos: fijosVal.toFixed(2),
      Variables: variablesVal.toFixed(2),
      AOM: aomVal.toFixed(2),
      'Total Tramo': totalTramo.toFixed(2),
      Distancia: '',
    });
  }

  // Estampillas by transportador
  for (const est of estampillas) {
    if (transportSet.has(est.transportador.nombre)) {
      const fijosVal = est.fijos * pct;
      const variablesVal = est.variables * (1 - pct);
      const aomVal = est.aom;
      const totalVal = fijosVal + variablesVal + aomVal;

      detalles.push({
        Tramo: `Estampilla ${est.transportador.nombre}`,
        Transportador: est.transportador.nombre,
        Fijos: fijosVal.toFixed(2),
        Variables: variablesVal.toFixed(2),
        AOM: aomVal.toFixed(2),
        'Total Tramo': totalVal.toFixed(2),
        Distancia: '',
      });
    }
  }

  // Subtotal
  const subtotalFijos = detalles.reduce((s, d) => s + parseFloat(d.Fijos), 0);
  const subtotalVariables = detalles.reduce((s, d) => s + parseFloat(d.Variables), 0);
  const subtotalAOM = detalles.reduce((s, d) => s + parseFloat(d.AOM), 0);
  const subtotalGeneral = detalles.reduce((s, d) => s + parseFloat(d['Total Tramo']), 0);

  // Fomento 3%
  const fomentoFijos = subtotalFijos * 0.03;
  const fomentoVariables = subtotalVariables * 0.03;
  const fomentoAOM = subtotalAOM * 0.03;
  const fomentoGeneral = subtotalGeneral * 0.03;

  // Impuesto 6%
  const impuestoFijos = subtotalFijos * 0.06;
  const impuestoVariables = subtotalVariables * 0.06;
  const impuestoAOM = subtotalAOM * 0.06;
  const impuestoGeneral = subtotalGeneral * 0.06;

  const totalFijos = subtotalFijos + fomentoFijos + impuestoFijos;
  const totalVariables = subtotalVariables + fomentoVariables + impuestoVariables;
  const totalAOM = subtotalAOM + fomentoAOM + impuestoAOM;
  const totalGeneral = subtotalGeneral + fomentoGeneral + impuestoGeneral;
  const totalGeneralUsd = totalGeneral / dolar;

  return {
    detalles,
    transportadores: Array.from(transportSet),
    totales: { cop: totalGeneral, usd: totalGeneralUsd },
    estadisticas: { segmentos: path.length - 1, transportadores: transportSet.size },
  };
}
