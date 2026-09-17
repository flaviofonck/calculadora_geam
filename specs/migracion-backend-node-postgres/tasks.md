# Plan de implementación — Migración a plataforma con backend Node.js, PostgreSQL y panel admin

El orden va de cimientos a superficie: primero el esquema y el cálculo migrado (sin eso no hay
nada que exponer), después la API pública, después auth y CRUD admin, después Docker, y al
final el frontend — que es lo único que puede probarse de verdad contra una API ya viva. La
tarea 3 (API pública) es el mínimo con el que el sistema ya sirve algo real: un cliente puede
calcular una ruta sin el panel admin ni Docker todavía.

---

- [ ] 1. Esquema Prisma, migración inicial y semilla de datos
  - Crear `backend/` con `package.json`, `tsconfig.json`, Express + Prisma + Jest instalados.
  - Escribir `prisma/schema.prisma` con `Nodo`, `Transportador`, `Tramo`, `Estampilla`,
    `ParametroTarifario`, `AdminUser`, `IntentoLogin`, `AuditLog` (diseño §2).
  - Generar la migración inicial con Prisma Migrate.
  - Escribir `prisma/seed.ts`: lee `../js/data.js` (o una copia JSON exportada de ese archivo)
    y carga `NETWORK_DATA`, `ESTAMPILLAS`, `NODES`, `TRANSPORTADOR_COLORS` sin retranscribir
    valores a mano.
  - _Requisito: R1.1, R1.2, R1.3, R1.4_

- [ ] 2. Servicio de rutas migrado (BFS + fórmulas tarifarias)
  - Migrar `findShortestPath` y `calculateRouteCosts` (`js/calculator.js:185`, `:250`) a
    `backend/src/services/rutas.ts`, consultando `Tramo`/`Estampilla`/`ParametroTarifario` vía
    Prisma en vez del arreglo `NETWORK_DATA`.
  - Escribir `tests/rutas.test.ts`: paridad numérica contra las 12 rutas de
    `PREDEFINED_ROUTES` con `porcentaje=100, dolar=4000`, usando como fixture los valores que
    hoy produce el cálculo en el navegador.
  - _Requisito: R2.2, R2.3_

- [ ] 3. Endpoints públicos: topología, nodos, calcular, costo por tramo
  - `GET /api/topologia`, `GET /api/nodos`, `POST /api/calcular`, `GET /api/tramos/:id/costo`
    en `backend/src/routes/publico.ts`, usando el servicio de la tarea 2.
  - `tests/topologia.test.ts`: la respuesta de `/api/topologia` no contiene `fijos`,
    `variables` ni `aom` en ningún objeto.
  - _Requisito: R2.1, R2.4, R2.5_

- [ ] 4. Autenticación del panel admin
  - `lib/session.ts` (`express-session` + `connect-pg-simple`, cookie `secure/httpOnly/sameSite`).
  - `POST /api/admin/auth/login` y `/logout`, hash de contraseña con `bcrypt`, semilla del
    primer `AdminUser` por variable de entorno (no hardcodeado).
  - `middlewares/loginRateLimit.ts`: 3 intentos fallidos por correo bloquean nuevos intentos
    por un tiempo configurable, usando `IntentoLogin`.
  - `middlewares/requireAuth.ts`, aplicado a todo `/api/admin/*` desde este punto en adelante.
  - `tests/admin.test.ts` (parte 1): login válido crea sesión; login inválido no; 4to intento
    fallido responde bloqueado.
  - _Requisito: R3.1, R3.2, R3.3, R3.4_

- [ ] 5. CRUD admin de nodos, tramos, transportadores, estampillas y parámetros
  - `middlewares/validate.ts` con esquemas `zod` por entidad (valida lo mismo que exige R1.4).
  - Handlers CRUD en `routes/admin.ts`, protegidos por `requireAuth`.
  - Eliminar un nodo/tramo referenciado responde `409` con el detalle, sin borrado en cascada.
  - `tests/admin.test.ts` (parte 2): cada ruta responde `401` sin sesión; CRUD válido con
    sesión; `409` al borrar un nodo referenciado.
  - _Requisito: R4.1, R4.2, R4.3, R4.4_

- [ ] 6. Auditoría de cambios
  - `services/auditoria.ts`: registra entidad, id, acción, valor antes/después y quién, en cada
    handler de escritura de la tarea 5.
  - `GET /api/admin/auditoria?entidad=&desde=&hasta=`.
  - Test: editar una estampilla y verificar que `AuditLog` queda con el valor anterior y el
    nuevo.
  - _Requisito: R5.1, R5.2_

- [ ] 7. Contenedores Docker y despliegue reproducible
  - `backend/Dockerfile` (build multi-stage, `npm run build` + `npm ci --production`).
  - `docker-compose.yml` en la raíz del repo: servicio `backend` + servicio `postgres`,
    credenciales por variables de entorno (`.env`, no committeado).
  - `package.json` del backend con scripts `dev`, `build`, `test`, `lint` documentados.
  - Levantar el stack con `docker compose up` en un entorno limpio y correr
    `npx prisma migrate deploy && npx prisma db seed` dentro del contenedor.
  - _Requisito: R7.1, R7.2, R7.3_

- [ ] 8. Frontend: `config.js` y `data.js` contra la API
  - `js/config.js` nuevo: URL base de la API (única constante a cambiar entre entornos).
  - `js/data.js`: `getOriginNodes()`/`getAllDestinationNodes()`/`getNodeInfo()` pasan a
    consumir `GET /api/nodos` y `GET /api/topologia` en vez de los arreglos hardcodeados;
    ningún valor de `Fijos`/`Variables`/`AOM`/estampilla queda en este archivo.
  - _Requisito: R6.1_

- [ ] 9. Frontend: `calculator.js` contra `POST /api/calcular`, sin fallback local
  - `calculateRoute()` pasa de cálculo local a `fetch('/api/calcular')`.
  - Si la respuesta falla o hace timeout (8s configurable): `showAlert` con mensaje de
    servicio no disponible y el botón "Calcular Ruta" queda deshabilitado hasta el próximo
    intento exitoso; no se ejecuta ningún cálculo ni se usa copia local de tarifas.
  - _Requisito: R2.2 (consumo), R6.1, R6.2_

- [ ] 10. Frontend: `map.js` contra topología y costo por tramo bajo demanda
  - Dibujo de la red con `GET /api/topologia` al cargar el mapa.
  - Popup de cada tramo pide `GET /api/tramos/:id/costo` al abrirse, no antes.
  - _Requisito: R6.3_

- [ ] 11. Saneamiento de `innerHTML` en resultados
  - Revisar `displayResults`/`generateDetailedBreakdown` (`js/calculator.js:420-559`): los
    valores que vienen de la respuesta de la API se insertan con creación de nodos DOM
    (`createElement`/`textContent`) en vez de concatenados en una plantilla `innerHTML`.
  - _Requisito: R6.4, regla 7 del proyecto_

- [ ] 12. Verificación de compatibilidad responsive y de mapa
  - Probar en viewport móvil, tablet y escritorio que el layout no cambió.
  - Confirmar que las capas por transportador (TGI, PROMIGAS, PROMIORIENTE) y el resaltado de
    ruta calculada siguen funcionando igual que antes de la migración.
  - _Requisito: R8.1, R8.2_
