# Diseño — Migración a plataforma con backend Node.js, PostgreSQL y panel admin

## 1. Dónde vive cada cosa

```
calculadora_geam/
├── index.html                   # existente; se agrega <script src="js/config.js"> antes de calculator.js
├── css/style.css                 # existente, sin cambios (R8.1)
├── js/
│   ├── config.js                 # NUEVO: URL base de la API, único punto de configuración del endpoint
│   ├── data.js                   # deja de tener NETWORK_DATA/ESTAMPILLAS hardcodeados; expone
│   │                              # getOriginNodes()/getAllDestinationNodes() sobre datos que trae la API (R6.1)
│   ├── calculator.js              # llama a POST /api/calcular; sin fallback local (R6.2)
│   └── map.js                     # llama a GET /api/topologia y GET /api/tramos/:id/costo (R6.3)
├── test.html, test_destinos.html  # sin cambios (fuera de alcance)
├── backend/                       # NUEVO — todo el código de servidor vive aquí, aislado del frontend estático
│   ├── src/
│   │   ├── server.ts              # bootstrap de Express: sesión, cookie-parser, helmet, rutas
│   │   ├── routes/
│   │   │   ├── publico.ts         # R2: /api/topologia, /api/nodos, /api/calcular, /api/tramos/:id/costo
│   │   │   └── admin.ts           # R3/R4/R5: /api/admin/auth/*, CRUD de nodos/tramos/transportadores/
│   │   │                          # estampillas/parametros, /api/admin/auditoria
│   │   ├── middlewares/
│   │   │   ├── requireAuth.ts     # valida sesión en cada endpoint /api/admin/* (R4.2)
│   │   │   ├── loginRateLimit.ts  # 3 intentos fallidos por correo (R3.4)
│   │   │   └── validate.ts        # valida payloads con zod antes de tocar Prisma (R1.4, R4.4)
│   │   ├── services/
│   │   │   ├── rutas.ts           # findShortestPath() + calculateRouteCosts() migrados 1:1 desde
│   │   │   │                      # js/calculator.js:185 y :250 (R2.2, R6.1)
│   │   │   └── auditoria.ts       # registra quién/cuándo/qué cambió (R5.1), lo usan los handlers de admin.ts
│   │   └── lib/
│   │       ├── prisma.ts          # cliente Prisma único
│   │       └── session.ts         # configuración de express-session + connect-pg-simple (R3.2)
│   ├── prisma/
│   │   ├── schema.prisma          # R1.1
│   │   ├── migrations/            # R1.3, versionadas
│   │   └── seed.ts                # lee NETWORK_DATA/ESTAMPILLAS/NODES tal como están hoy en js/data.js
│   │                              # (copiados sin retranscribir a mano) y los carga en Postgres
│   ├── tests/
│   │   ├── rutas.test.ts          # paridad numérica con el cálculo actual del cliente (Verificación §5)
│   │   ├── admin.test.ts          # auth, CRUD, 401/403 en /api/admin/* sin sesión (R4.2)
│   │   └── topologia.test.ts      # R2.5: el payload de topología nunca trae Fijos/Variables/AOM/estampillas
│   ├── Dockerfile                 # R7.1
│   ├── package.json               # scripts: dev, build, test, lint (R7.3)
│   └── tsconfig.json
├── docker-compose.yml             # backend + postgres, R7.1
└── specs/migracion-backend-node-postgres/   # esta spec
```

## 2. Modelo de datos y persistencia (R1)

`prisma/schema.prisma` reemplaza los arreglos de `js/data.js` por tablas con metadata de
auditoría. Los nombres de campo se conservan literalmente donde no hay razón funcional para
cambiarlos (regla 5 del proyecto): `Fijos`, `Variables`, `AOM` siguen llamándose así en la base
de datos, no `fixedCost`/`variableCost`.

```prisma
model Nodo {
  id        String   @id @default(cuid())
  nombre    String   @unique   // "Sebastopol", "Ballenas_tgi", ...
  lat       Float?
  lon       Float?
  creadoPor String
  creadoEn  DateTime @default(now())
  tramosOrigen  Tramo[] @relation("TramoOrigen")
  tramosDestino Tramo[] @relation("TramoDestino")
}

model Transportador {
  id     String @id @default(cuid())
  nombre String @unique  // "TGI", "PROMIGAS", "PROMIORIENTE"
  color  String          // hex, hoy TRANSPORTADOR_COLORS
  tramos Tramo[]
  estampilla Estampilla?
}

model Tramo {
  id              String   @id @default(cuid())
  origenId        String
  destinoId       String
  origen          Nodo     @relation("TramoOrigen", fields: [origenId], references: [id])
  destino         Nodo     @relation("TramoDestino", fields: [destinoId], references: [id])
  transportadorId String
  transportador   Transportador @relation(fields: [transportadorId], references: [id])
  tipo            String   // "Punto" | "Intermedio" | "Conexión"
  fijos           Float
  variables       Float
  aom             Float
  vigenteDesde    DateTime @default(now())   // R1.2
  actualizadoPor  String                     // R1.2
  actualizadoEn   DateTime @updatedAt

  @@unique([origenId, destinoId])
}

model Estampilla {
  transportadorId String @id
  transportador   Transportador @relation(fields: [transportadorId], references: [id])
  fijos           Float
  variables       Float
  aom             Float
  vigenteDesde    DateTime @default(now())
  actualizadoPor  String
  actualizadoEn   DateTime @updatedAt
}

model ParametroTarifario {
  clave           String   @id   // "fomento", "impuesto", "trm_defecto"
  valor           Float
  vigenteDesde    DateTime @default(now())
  actualizadoPor  String
  actualizadoEn   DateTime @updatedAt
}

model AdminUser {
  id            String   @id @default(cuid())
  correo        String   @unique
  hashPassword  String
  creadoEn      DateTime @default(now())
}

model IntentoLogin {
  id            String   @id @default(cuid())
  correo        String
  intentadoEn   DateTime @default(now())
  exitoso       Boolean

  @@index([correo, intentadoEn])   // R3.4
}

model AuditLog {
  id          String   @id @default(cuid())
  entidad     String   // "Tramo" | "Nodo" | "Estampilla" | "ParametroTarifario" | "Transportador"
  entidadId   String
  accion      String   // "crear" | "editar" | "eliminar"
  valorAntes  Json?
  valorDespues Json?
  hechoPor    String   // correo del AdminUser
  hechoEn     DateTime @default(now())

  @@index([entidad, hechoEn])   // R5.2 filtrable por entidad y rango de fechas
}
```

La tabla de sesión (`connect-pg-simple`) no es un modelo de Prisma: se crea con el `session`
del propio paquete en el `docker-compose`/migración inicial, para no duplicar el manejo de
expiración que ya trae la librería.

## 3. API pública, sin lógica de cálculo en el cliente (R2, R6)

| Método y ruta | Qué hace | Requisito |
|---|---|---|
| `GET /api/topologia` | Nodos, tramos (solo `origen`, `destino`, `tipo`, `transportador`, coordenadas) y colores por transportador. Nunca incluye `fijos`/`variables`/`aom`. | R2.1, R2.5, R6.3 |
| `GET /api/nodos` | Lista de nombres de nodo para poblar los `<select>` de origen/destino, igual que `getOriginNodes()`/`getAllDestinationNodes()` hoy. | R2.1 |
| `POST /api/calcular` | Body `{ origen, destino, porcentaje, dolar }`. Corre `rutas.ts` (BFS + fórmulas) y devuelve exactamente la forma que hoy arma `calculateRouteCosts()`: `detalles[]`, `transportadores[]`, `totales`, `estadisticas`. | R2.2, R2.3, R6.1 |
| `GET /api/tramos/:id/costo` | Costo de un solo tramo con el `porcentaje`/`dolar` vigentes por defecto, para el popup del mapa. Devuelve un monto ya calculado, no los componentes crudos. | R2.5, R6.3 |
| `POST /api/admin/auth/login` | Valida correo/contraseña, crea sesión. Aplica `loginRateLimit`. | R3.1, R3.3, R3.4 |
| `POST /api/admin/auth/logout` | Destruye la sesión. | R3.2 |
| `GET/POST/PUT/DELETE /api/admin/{nodos,tramos,transportadores,estampillas,parametros}` | CRUD protegido por `requireAuth`; cada escritura pasa por `validate` (zod) y registra en `AuditLog`. | R4.1, R4.2, R4.4, R5.1 |
| `GET /api/admin/auditoria?entidad=&desde=&hasta=` | Lista de `AuditLog`, filtrable. | R5.2 |

`js/calculator.js` cambia `calculateRoute()` de una función síncrona local a un `fetch` a
`/api/calcular`; si la respuesta falla o no llega (timeout configurable, ej. 8s), se llama a
`showAlert('Servicio de cálculo no disponible, intenta más tarde', 'danger')` y se deja el
botón "Calcular Ruta" deshabilitado hasta el siguiente intento exitoso (R6.2). No hay copia de
`NETWORK_DATA`/`ESTAMPILLAS` en el bundle del cliente para ese modo de reserva: se eliminó a
propósito.

`js/map.js` sigue dibujando toda la red con `GET /api/topologia` al cargar la página; el costo
de un tramo se pide con `GET /api/tramos/:id/costo` solo cuando el usuario abre ese popup, no
se precalculan los 33 costos por adelantado.

## 4. Autenticación y CRUD admin (R3, R4, R5)

`lib/session.ts` configura `express-session` con `connect-pg-simple` apuntando a la misma base
Postgres, cookie `{ secure: true, httpOnly: true, sameSite: 'lax', maxAge: <configurable> }`.
En desarrollo local sin HTTPS, `secure` se relaja solo con `NODE_ENV=development` explícito,
nunca por defecto.

`requireAuth.ts` es el único punto que decide si una petición a `/api/admin/*` sigue adelante;
vive en el middleware, no en cada handler, para que no haya ruta nueva que se olvide de
protegerse (R4.2, regla 10 del proyecto).

Cada handler de escritura en `admin.ts` sigue el mismo patrón: `validate` (zod) → leer el
valor anterior con Prisma → aplicar el cambio → `auditoria.registrar()` con el correo de
`req.session.correo`, la entidad, el id, y los valores antes/después (R5.1). Eliminar un nodo
o tramo referenciado por otro tramo responde `409` con el detalle de qué lo referencia, en vez
de borrar en cascada (R4.3).

## 5. Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Prisma como ORM y migraciones | Knex / SQL crudo | Genera tipos TS desde el esquema y versiona migraciones sin escribir SQL a mano por tabla; encaja con el stack ya decidido (Express + Prisma + Jest). |
| Sesión server-side (`express-session` + `connect-pg-simple`) | JWT en cookie httpOnly | Se puede invalidar una sesión desde el servidor en cualquier momento (ej. tras un cambio de contraseña); un JWT necesitaría una lista de revocación aparte para lo mismo. |
| `zod` para validar payloads | `Joi` / `express-validator` | Los tipos de los esquemas de validación se comparten con TypeScript sin duplicar la definición del modelo. |
| `bcrypt` para hash de contraseña | `argon2` | Estándar más usado en Express, sin bindings nativos adicionales que compliquen el build del `Dockerfile`. |
| Costo por tramo en endpoint aparte (`GET /api/tramos/:id/costo`), no en `/api/topologia` | Devolver todo en un solo payload de topología | Evita que cargar el mapa traiga de una vez todas las tarifas crudas al cliente; el costo se pide bajo demanda (R2.5). |
| Auditoría escrita desde el código del handler (`auditoria.ts`) | Trigger de PostgreSQL | Mantiene la lógica de negocio en TypeScript, versionada y testeable con Jest, en vez de en el esquema de base de datos. |
| Sin fallback de cálculo local en el cliente cuando la API está caída | Mantener una copia estática de datos y calcular en el navegador si la API no responde | El usuario pidió explícitamente que ni el algoritmo ni las tarifas viajen al cliente; un fallback local exigiría exactamente eso. |

## 6. Verificación

- **Paridad numérica del cálculo migrado**: `tests/rutas.test.ts` corre `calcularRuta()` del
  backend contra los mismos pares origen/destino de `PREDEFINED_ROUTES`
  (`js/data.js:70-82`) con `porcentaje=100, dolar=4000`, y compara el resultado contra los
  valores que hoy produce `calculateRouteCosts()` en el navegador para esas mismas rutas
  (capturados una vez como fixture). Se corre con `npm run test` dentro de `backend/`.
- **Autorización del panel admin**: `tests/admin.test.ts` verifica con `supertest` que cada
  ruta `/api/admin/*` responde `401` sin sesión y `200`/`204` con sesión válida, y que un
  intento de eliminar un nodo referenciado responde `409` sin borrar nada.
- **No fuga de tarifas crudas**: `tests/topologia.test.ts` verifica que la respuesta de
  `GET /api/topologia` no contiene las claves `fijos`, `variables` ni `aom` en ningún objeto
  del payload.
- **Migración de datos**: `prisma/seed.ts` se corre contra una base vacía y se compara el
  conteo de tramos/nodos/estampillas cargados contra `NETWORK_DATA.length`/`NODES.length` del
  `js/data.js` actual, y la suma de `Fijos+Variables+AOM` de todos los tramos migrados contra
  la misma suma calculada sobre el arreglo original.
- **Manual, en navegador** (regla del flujo de trabajo del proyecto, sección Validación):
  1. `docker compose up` levanta backend + Postgres.
  2. Servir el frontend estático (`python -m http.server 8000`) y abrir `http://localhost:8000/`.
  3. Probar una ruta predefinida y una ruta manual; confirmar que el resultado coincide con el
     que se veía antes de la migración.
  4. Detener el contenedor del backend y confirmar que la calculadora muestra el mensaje de
     "servicio no disponible" en vez de calcular o quedar en blanco (R6.2).
  5. Iniciar sesión en el panel admin, editar una estampilla, y confirmar que `GET
     /api/admin/auditoria` registra el cambio con el correo del administrador.
  6. Revisar la consola del navegador: sin errores no controlados.

## 7. Riesgos

| Riesgo | Cómo se detecta | Qué se hace |
|---|---|---|
| La migración de `js/data.js` a Postgres introduce un error de transcripción en una tarifa | El chequeo de sumas de `seed.ts` (Verificación §6) no cuadra | `seed.ts` lee el archivo actual programáticamente, nunca se retranscriben los 33 tramos a mano |
| La tabla de sesiones de `connect-pg-simple` crece sin límite si nadie hace logout | Tamaño de la tabla `session` en Postgres | Se configura `pruneSessionInterval` del propio paquete para purgar sesiones expiradas |
| Alguien pide el costo de los 33 tramos uno por uno vía `GET /api/tramos/:id/costo` y reconstruye la tabla de tarifas igual que si estuviera en el cliente | No hay barrera técnica distinta a que el dato no viaje en el bundle: es un riesgo residual, no un secreto criptográfico | Se documenta como riesgo aceptado; si se necesita ocultar del todo, hay que quitar los popups de costo del mapa, que es un cambio de producto fuera de esta spec |
| Con el fallback local eliminado, una caída del backend deja la calculadora pública inutilizable | Métricas de error 5xx / timeouts del endpoint `/api/calcular` | Fuera de esta spec (ver "Fuera de esta spec" de requirements.md), pero el diseño dejó el mensaje de error (R6.2) como la mitigación mínima; alta disponibilidad del backend es una decisión de infraestructura posterior |
