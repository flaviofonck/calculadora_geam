import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const levels = __dirname.includes('dist') ? 3 : 2;
const dataPath = path.resolve(__dirname, ...Array(levels).fill('..'), 'js/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

async function main() {
  let exitCode = 0;

  // 1. Contar Tramo vs NETWORK_DATA.length
  const tramos = await prisma.tramo.count();
  const tramosEsperados = data.NETWORK_DATA.length;
  if (tramos === tramosEsperados) {
    console.log(`Tramo: ${tramos}/${tramosEsperados} ✓`);
  } else {
    console.log(`Tramo: ${tramos}/${tramosEsperados} ✗`);
    exitCode = 1;
  }

  // 2. Contar Estampilla vs Object.keys(ESTAMPILLAS).length
  const estampillas = await prisma.estampilla.count();
  const estampillasEsperadas = Object.keys(data.ESTAMPILLAS).length;
  if (estampillas === estampillasEsperadas) {
    console.log(`Estampilla: ${estampillas}/${estampillasEsperadas} ✓`);
  } else {
    console.log(`Estampilla: ${estampillas}/${estampillasEsperadas} ✗`);
    exitCode = 1;
  }

  // 3. Contar Nodo vs NODES.length
  const nodos = await prisma.nodo.count();
  const nodosEsperados = data.NODES.length;
  if (nodos === nodosEsperados) {
    console.log(`Nodo: ${nodos}/${nodosEsperados} ✓`);
  } else {
    console.log(`Nodo: ${nodos}/${nodosEsperados} ✗`);
    exitCode = 1;
  }

  // 4. Suma de fijos + variables + aom de todos los tramos
  const dbRows = await prisma.tramo.findMany({ select: { fijos: true, variables: true, aom: true } });
  const sumaDb = dbRows.reduce((acc, r) => acc + r.fijos + r.variables + r.aom, 0);
  const sumaJs = data.NETWORK_DATA.reduce((acc: number, t: any) => acc + t.Fijos + t.Variables + t.AOM, 0);
  const diff = Math.abs(sumaDb - sumaJs);
  if (diff < 0.01) {
    console.log(`Suma f+v+aom: ${sumaDb.toFixed(2)} = ${sumaJs.toFixed(2)} ✓`);
  } else {
    console.log(`Suma f+v+aom: ${sumaDb.toFixed(2)} ≠ ${sumaJs.toFixed(2)} (diff ${diff.toFixed(4)}) ✗`);
    exitCode = 1;
  }

  // 5. Coordenadas: derivar última no nula por nodo desde data.json y comparar con DB
  const expectedCoords: Record<string, { lat: number | null; lon: number | null }> = {};
  for (const t of data.NETWORK_DATA) {
    if (t.Origen_Lat != null && t.Origen_Long != null) {
      expectedCoords[t.Origen] = { lat: t.Origen_Lat, lon: t.Origen_Long };
    }
    if (t.Destino_Lat != null && t.Destino_Long != null) {
      expectedCoords[t.Destino] = { lat: t.Destino_Lat, lon: t.Destino_Long };
    }
  }

  const dbNodos = await prisma.nodo.findMany({ select: { nombre: true, lat: true, lon: true } });
  let coordOk = true;
  const nullNodes: string[] = [];
  for (const n of dbNodos) {
    const exp = expectedCoords[n.nombre];
    const expLat = exp ? exp.lat : null;
    const expLon = exp ? exp.lon : null;
    if (expLat == null || expLon == null) {
      nullNodes.push(n.nombre);
      if (n.lat !== null || n.lon !== null) {
        console.log(`Coord ✗ ${n.nombre}: esperado (null, null), DB (${n.lat}, ${n.lon})`);
        coordOk = false;
        exitCode = 1;
      }
      continue;
    }
    if (n.lat == null || n.lon == null ||
        Math.abs(n.lat - expLat) > 0.0001 || Math.abs(n.lon - expLon) > 0.0001) {
      console.log(`Coord ✗ ${n.nombre}: esperado (${expLat}, ${expLon}), DB (${n.lat}, ${n.lon})`);
      coordOk = false;
      exitCode = 1;
    }
  }
  if (coordOk) {
    console.log(`Coordenadas: ${dbNodos.length - nullNodes.length}/${dbNodos.length} no nulas OK, ${nullNodes.length} nulas (${nullNodes.join(', ')}) ✓`);
  }

  process.exit(exitCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
