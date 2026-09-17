import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ponytail: read data.json once — avoids retranscribing 33 tramos by hand
const levels = __dirname.includes('dist') ? 3 : 2;
const dataPath = path.resolve(__dirname, ...Array(levels).fill('..'), 'js/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

async function main() {
  // 1. Transportadores: TGI, PROMIGAS, PROMIORIENTE + Conexión Especial
  const transportadores: Record<string, string> = {};
  for (const [nombre, color] of Object.entries(data.TRANSPORTADOR_COLORS)) {
    const t = await prisma.transportador.upsert({
      where: { nombre },
      update: { color: color as string },
      create: { nombre, color: color as string },
    });
    transportadores[nombre] = t.id;
  }
  // Conexión Especial con color explícito
  const ce = await prisma.transportador.upsert({
    where: { nombre: 'Conexión Especial' },
    update: { color: '#00cc00' },
    create: { nombre: 'Conexión Especial', color: '#00cc00' },
  });
  transportadores['Conexión Especial'] = ce.id;

  // 2. Nodos
  const nodos: Record<string, string> = {};
  const coordMap: Record<string, { lat: number | null; lon: number | null }> = {};
  for (const t of data.NETWORK_DATA) {
    if (t.Origen_Lat != null && t.Origen_Long != null) {
      coordMap[t.Origen] = { lat: t.Origen_Lat, lon: t.Origen_Long };
    }
    if (t.Destino_Lat != null && t.Destino_Long != null) {
      coordMap[t.Destino] = { lat: t.Destino_Lat, lon: t.Destino_Long };
    }
  }
  for (const nombre of data.NODES) {
    const c = coordMap[nombre];
    const lat = c ? c.lat : null;
    const lon = c ? c.lon : null;
    const n = await prisma.nodo.upsert({
      where: { nombre },
      update: { lat, lon },
      create: { nombre, lat, lon },
    });
    nodos[nombre] = n.id;
  }

  // 3. Tramos
  for (const t of data.NETWORK_DATA) {
    const origenId = nodos[t.Origen];
    const destinoId = nodos[t.Destino];
    const transportadorId = transportadores[t.Transportador];
    if (!origenId || !destinoId || !transportadorId) {
      console.error(`Saltando tramo sin referencias: ${t.Tramo}`);
      continue;
    }
    await prisma.tramo.upsert({
      where: { origenId_destinoId: { origenId, destinoId } },
      update: {
        fijos: t.Fijos,
        variables: t.Variables,
        aom: t.AOM,
        tipo: t.Tipo,
        transportadorId,
      },
      create: {
        origenId,
        destinoId,
        transportadorId,
        tipo: t.Tipo,
        fijos: t.Fijos,
        variables: t.Variables,
        aom: t.AOM,
      },
    });
  }

  // 4. Estampillas
  for (const [nombre, est] of Object.entries(data.ESTAMPILLAS)) {
    const tId = transportadores[nombre];
    if (!tId) continue;
    const e = est as { Fijos: number; Variables: number; AOM: number };
    await prisma.estampilla.upsert({
      where: { transportadorId: tId },
      update: { fijos: e.Fijos, variables: e.Variables, aom: e.AOM },
      create: { transportadorId: tId, fijos: e.Fijos, variables: e.Variables, aom: e.AOM },
    });
  }

  // 5. Parámetros tarifarios
  const params = [
    { clave: 'fomento', valor: 3 },
    { clave: 'impuesto', valor: 6 },
    { clave: 'trm_defecto', valor: 4000 },
  ];
  for (const p of params) {
    await prisma.parametroTarifario.upsert({
      where: { clave: p.clave },
      update: { valor: p.valor },
      create: p,
    });
  }

  // 6. AdminUser
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.upsert({
      where: { correo: adminEmail.toLowerCase() },
      update: { hashPassword: hash },
      create: { correo: adminEmail.toLowerCase(), hashPassword: hash },
    });
    console.log(`AdminUser: ${adminEmail} ✓`);
  }

  // 7. Conteo de verificación
  const tramoCount = await prisma.tramo.count();
  const estampillaCount = await prisma.estampilla.count();
  const nodoCount = await prisma.nodo.count();
  console.log(`Tramo: ${tramoCount}/${data.NETWORK_DATA.length} ✓`);
  console.log(`Estampilla: ${estampillaCount}/${Object.keys(data.ESTAMPILLAS).length} ✓`);
  console.log(`Nodo: ${nodoCount}/${data.NODES.length} ✓`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
