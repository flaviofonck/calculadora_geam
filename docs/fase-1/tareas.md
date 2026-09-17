# Tareas — Calculadora GEAM

Cada tarea lleva un código `T-0XX` que **no cambia nunca**, y unos criterios de *Done
when* que se puedan comprobar ejecutando algo. Un criterio que no se puede medir no es un
criterio: es un deseo.

## T-001 — Esquema Prisma, migración inicial y semilla de datos

**Fase** 1 · **Bloque** cimientos · **Depende de** —
**Dependencias**:

Crear `backend/` (Express + Prisma + Jest) con el esquema de `Nodo`, `Transportador`,
`Tramo`, `Estampilla`, `ParametroTarifario`, `AdminUser`, `IntentoLogin` y `AuditLog`
(design.md §2), su migración inicial y una semilla que carga el contenido actual de
`js/data.js` sin retranscribirlo a mano.

**Done when**
- `cd backend && npx prisma migrate dev --name init` corre sin error y crea las ocho tablas.
- `cd backend && npx prisma db seed` carga los 33 tramos y las 3 estampillas sin error.
- Un script de verificación compara `SELECT count(*) FROM "Tramo"` contra
  `NETWORK_DATA.length` (33) y la suma de `Fijos+Variables+AOM` migrada contra la misma suma
  calculada sobre `js/data.js`; ambas coinciden.

**Fuera de alcance**
- Los endpoints HTTP (T-003) y el servicio de cálculo (T-002).

## T-002 — Servicio de rutas migrado (BFS + fórmulas tarifarias)

**Fase** 1 · **Bloque** cimientos · **Depende de** T-001
**Dependencias**: T-001

Migrar `findShortestPath` y `calculateRouteCosts` (`js/calculator.js:185`, `:250`) a
`backend/src/services/rutas.ts`, consultando Postgres vía Prisma en vez del arreglo
`NETWORK_DATA`.

**Done when**
- `cd backend && npm test -- rutas.test.ts` pasa, comparando el resultado de las 12 rutas de
  `PREDEFINED_ROUTES` (`porcentaje=100, dolar=4000`) contra los valores fijados como fixture.
- El servicio no importa `js/data.js`: solo usa el cliente Prisma.

**Fuera de alcance**
- Exponer el servicio por HTTP (T-003).

## T-003 — Endpoints públicos: topología, nodos, calcular, costo por tramo

**Fase** 1 · **Bloque** api-publica · **Depende de** T-002
**Dependencias**: T-002

`GET /api/topologia`, `GET /api/nodos`, `POST /api/calcular`, `GET /api/tramos/:id/costo`
en `backend/src/routes/publico.ts`, sin autenticación.

**Done when**
- `cd backend && npm test -- topologia.test.ts` pasa: la respuesta de `GET /api/topologia`
  no contiene `fijos`, `variables` ni `aom` en ningún objeto.
- Con el servidor local corriendo, `POST /api/calcular` con `{"origen":"Sebastopol",
  "destino":"Medellin","porcentaje":100,"dolar":4000}` devuelve el mismo total que hoy
  calcula el navegador para esa ruta.
- `POST /api/calcular` con un origen y destino sin ruta entre sí responde con un error
  explícito ("No existe ruta entre...") y no un 500.

**Fuera de alcance**
- Todo lo que exige sesión (T-004 en adelante).

## T-004 — Autenticación del panel admin

**Fase** 1 · **Bloque** auth-admin · **Depende de** T-001
**Dependencias**: T-001

`express-session` + `connect-pg-simple`, login/logout con `bcrypt`, y bloqueo tras 3
intentos fallidos por correo (`IntentoLogin`).

**Done when**
- `npm test -- admin.test.ts -t "login"` pasa: login válido crea sesión, login inválido no,
  el cuarto intento fallido consecutivo para el mismo correo responde bloqueado.
- La cookie que devuelve `POST /api/admin/auth/login` lleva `Secure`, `HttpOnly` y
  `SameSite`.
- Ninguna fila de `AdminUser` guarda la contraseña en texto plano.

**Fuera de alcance**
- Cualquier endpoint CRUD (T-005).

## T-005 — CRUD admin de nodos, tramos, transportadores, estampillas y parámetros

**Fase** 1 · **Bloque** auth-admin · **Depende de** T-004
**Dependencias**: T-004

Handlers CRUD en `routes/admin.ts` protegidos por `requireAuth`, validados con `zod`.

**Done when**
- `npm test -- admin.test.ts -t "crud"` pasa: cada ruta `/api/admin/*` responde 401 sin
  sesión.
- El mismo test confirma que borrar un nodo referenciado por un tramo responde 409 con el
  detalle, sin borrar nada.
- Un payload inválido (ej. estampilla sin `AOM`) responde con error de validación, no con
  un 500 ni un guardado parcial.

**Fuera de alcance**
- El registro de auditoría de esos cambios (T-006).

## T-006 — Auditoría de cambios

**Fase** 1 · **Bloque** auth-admin · **Depende de** T-005
**Dependencias**: T-005

`services/auditoria.ts` registra quién, cuándo y qué cambió en cada escritura de T-005, y
`GET /api/admin/auditoria` la expone filtrable.

**Done when**
- Editar una estampilla vía `PUT /api/admin/estampillas/:id` deja una fila en `AuditLog`
  con el valor anterior, el nuevo y el correo de quien lo hizo.
- `GET /api/admin/auditoria?entidad=Estampilla` devuelve solo esa entidad;
  `GET /api/admin/auditoria?desde=...&hasta=...` filtra por fecha.

**Fuera de alcance**
- Un flujo de aprobación en dos pasos (fuera de esta spec, ver `requirements.md` §6).

## T-007 — Contenedores Docker y despliegue reproducible

**Fase** 1 · **Bloque** despliegue · **Depende de** T-003, T-006
**Dependencias**: T-003, T-006

`backend/Dockerfile` y `docker-compose.yml` (backend + Postgres) en la raíz del repo,
credenciales por variable de entorno.

**Done when**
- `docker compose up -d` desde la raíz del repositorio levanta backend y Postgres sin error,
  y `docker compose ls` muestra que ambos pertenecen al proyecto `geam`.
- `docker compose ps` lista exactamente los servicios de `geam`; los contenedores de otros
  proyectos (`app-*`, `ciclo-*`) siguen levantados y con el mismo id que antes de la tarea.
- Partiendo del stack detenido con `docker compose stop` (nunca `down -v`), un
  `docker compose up -d` vuelve a dejarlo sano conservando el volumen `geam_geam-db-data`.
- Dentro del contenedor, `npx prisma migrate deploy && npx prisma db seed` corre sin error.
- Con el stack arriba, `curl localhost:3000/api/nodos` responde 200.
- Ningún archivo del repositorio contiene una credencial en texto plano.

**Prohibido en esta tarea**
- `docker compose down -v`, `docker system prune`, `docker volume rm` y `docker rm`. La
  "reproducibilidad" se demuestra con `stop`/`up -d` sobre el volumen existente, no
  destruyendo datos. Si crees que necesitas partir de cero, se pide por gate; no se ejecuta.
- Publicar cualquier puerto del host ya ocupado por otro proyecto: `5432` es de Limite_legal,
  `27017` del ciclo. Este stack usa `5433` para la base y `3000` para el backend.

**Fuera de alcance**
- El frontend estático: sigue sirviéndose aparte, no dentro de este `docker-compose`.

## T-008 — Frontend: config.js y data.js contra la API

**Fase** 2 · **Bloque** consumo-api · **Depende de** T-003
**Dependencias**: T-003

`js/config.js` nuevo con la URL base de la API; `js/data.js` deja de tener
`NETWORK_DATA`/`ESTAMPILLAS` hardcodeados y consume `GET /api/nodos`/`GET /api/topologia`.

**Done when**
- Con el backend arriba y el frontend servido con `python -m http.server 8000`, los
  `<select>` de origen y destino se pueblan desde la API (visible en la pestaña Red del
  navegador).
- `js/data.js` no contiene ningún literal con valores de `Fijos`, `Variables` o `AOM`.

**Fuera de alcance**
- El cálculo de ruta en sí (T-009) y el mapa (T-010).

## T-009 — Frontend: calculator.js contra POST /api/calcular, sin fallback local

**Fase** 2 · **Bloque** consumo-api · **Depende de** T-003
**Dependencias**: T-003

`calculateRoute()` pasa de cálculo local a `fetch('/api/calcular')`, con mensaje de error y
botón deshabilitado si la API no responde.

**Done when**
- Calcular una ruta predefinida en el navegador muestra el mismo resultado que antes de la
  migración. **Acreditado en V-019**: constancia humana del 2026-09-07T21:23:34Z sobre
  Sebastopol → Medellin. No se vuelve a pedir.
- Con el backend detenido, calcular una ruta muestra el mensaje de servicio no disponible y
  el botón "Calcular Ruta" queda deshabilitado; la consola no registra ningún cálculo
  ejecutado localmente. **Sin auditar desde V-016: este es el criterio que falta.**
- `js/calculator.js` ya no define `findShortestPath` ni `calculateRouteCosts`.

**Fuera de alcance**
- El mapa (T-010) y el saneamiento de `innerHTML` (T-011). Los conteos de marcadores,
  polilíneas y coordenadas NO cierran ni bloquean T-009, aunque el trabajo de coordenadas
  y seed se haya hecho durante sus vueltas.
- El resto del frontend (T-008).

## T-010 — Frontend: map.js contra topología y costo por tramo bajo demanda

**Fase** 2 · **Bloque** consumo-api · **Depende de** T-003
**Dependencias**: T-003

El mapa dibuja la red desde `GET /api/topologia`; el costo de un tramo se pide con
`GET /api/tramos/:id/costo` solo al abrir su popup.

**Done when**
- Con el backend arriba, el mapa dibuja los mismos tramos y colores por transportador que
  antes de la migración.
- Al abrir el popup de un tramo aparece, en la pestaña Red del navegador, una petición a
  `GET /api/tramos/:id/costo` disparada en ese momento, no antes.
- La red dibujada se cuenta de forma ejecutada, no descrita: 37 nodos y 36 tramos recibidos
  de `GET /api/topologia`, 36 marcadores y 35 polilíneas en el mapa. La diferencia entre 36
  tramos recibidos y 35 dibujables es esperada (Sabana no tiene coordenada).
- El seed persiste `lat`/`lon` también en `update`, incluidos los `null` de fuente, y el
  verificador falla si la nulabilidad discrepa. **Entregado en V-020, pendiente de auditar
  bajo esta tarea.**

**Fuera de alcance**
- El resto del frontend (T-008, T-009).

## T-011 — Saneamiento de innerHTML en resultados

**Fase** 2 · **Bloque** saneamiento · **Depende de** T-009
**Dependencias**: T-009

Revisar `displayResults`/`generateDetailedBreakdown` (`js/calculator.js:420-559`) para
insertar los valores que vienen de la API con creación de nodos DOM en vez de `innerHTML`
concatenado.

**Done when**
- Ningún uso de `innerHTML` en `js/calculator.js` interpola directamente un valor recibido
  de la respuesta de la API.
- Los resultados y el desglose renderizan igual visualmente que antes del cambio.

**Fuera de alcance**
- Cualquier cambio de estilo o de layout.

## T-012 — Verificación de compatibilidad responsive y de mapa

**Fase** 2 · **Bloque** verificacion · **Depende de** T-008, T-009, T-010
**Dependencias**: T-008, T-009, T-010

Cierre de la fase 2: confirmar que nada se rompió en responsive ni en el mapa.

**Done when**
- La calculadora probada en viewport móvil (375px), tablet (768px) y escritorio (1280px)
  no muestra elementos rotos ni desbordados.
- Las tres capas del mapa (TGI, PROMIGAS, PROMIORIENTE) se pueden mostrar/ocultar y el
  resaltado de ruta calculada sigue apareciendo.

**Fuera de alcance**
- Ninguno: es la tarea de cierre de la fase 2.

## T-013 — Layout operativo con mapa siempre visible y hoja móvil

**Fase** 3 · **Bloque** layout · **Depende de** T-012
**Dependencias**: T-012

Reorganizar la calculadora según la referencia visual de dirección instrumental sobria: riel
izquierdo de parámetros, resultados en la columna central y mapa en una columna propia y
pegajosa; en 390 px, mapa primero y resultados en una hoja inferior arrastrable.

**Referencia de diseño**: `docs/diseno/referencia.html` (secciones 1 y 3) y
`docs/diseno/tokens.css`. Son la fuente de los valores; cópialos tal cual, no los redondees a
una rejilla de 4/8 px ni los sustituyas por defaults de Bootstrap. De ahí salen la rejilla de
escritorio `328px · minmax(0,1fr) · 552px`, las alturas de control (barra 56, cabecera 46,
botón 44, campo 40, campo secundario 38, botón secundario 36), los radios (panel 6, control 5,
chip 4, hoja 14) y el móvil montado: mapa de 296 px con `preserveAspectRatio="slice"`, hoja
inferior con radio superior de 14 px y solape de −14 px, y el desglose convertido en lista de
filas de 48 px donde Fijos y AOM bajan al detalle y el transportador va en segunda línea.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: `index.html:68-201` solo define dos columnas y coloca `resultsCard` antes
del mapa dentro de `col-lg-8`; `css/style.css:271-310` se limita a reducir tamaños en móvil y no
reordena la interfaz ni crea una hoja inferior.

**Done when**
- Una prueba de navegador a 1440 px calcula Cartagena → Sebastopol y comprueba que parámetros,
  resultados y mapa ocupan tres columnas, y que el mapa sigue dentro del viewport al desplazar
  el desglose.
- La misma prueba comprueba una franja compacta con totales COP/USD y una barra textual y visual
  de reparto: PROMIGAS 3.817,73 (27,5 %), conexión especial 0,00 y TGI 10.041,71 (72,5 %) sobre
  13.859,44.
- El DOM del desglose agrupa los tramos por transportador, deja expandido el transportador de
  entrada y los demás plegados con su subtotal visible.
- A 390 px, una prueba comprueba que el mapa precede al formulario y a los resultados, que la
  hoja inferior se puede abrir/cerrar por teclado y arrastrar sin bloquear el scroll vertical,
  y que todos sus controles interactivos miden al menos 44 × 44 CSS px.
- La captura de 390 px no contiene barra de estado ni teclado simulados y no tiene desbordamiento
  horizontal.

**Información pendiente**
- Confirmar la unidad tarifaria bajo el total COP, los kilómetros del trayecto y el reparto por
  tramo del subtotal TGI. No se muestran valores inventados mientras falten esos datos.

**Fuera de alcance**
- Tokens visuales y paleta (T-014), animación/sincronía del mapa (T-015) y extras de producto.

## T-014 — Sistema visual instrumental, tipografía y accesibilidad base

**Fase** 3 · **Bloque** visual · **Depende de** T-013
**Dependencias**: T-013

Aplicar la dirección visual acordada: neutros fríos, IBM Plex Sans, IBM Plex Mono para cifras,
paneles planos con filetes de 1 px y acción primaria tinta `#0d141c`, reservando los colores a
los transportadores. Las dos familias tienen que quedar cargadas de verdad, no solo declaradas
en `font-family`.

**Referencia de diseño**: `docs/diseno/tokens.css` es la fuente de verdad de esta tarea —
lleva cada color con su relación de contraste anotada, la escala tipográfica, las alturas, los
radios y el bloque `prefers-reduced-motion`. `docs/diseno/referencia.html` muestra los estados
ya montados: `.campo__caja:hover`, `.campo__caja:focus-within`, `.boton:hover`, `.boton:active`
y `.boton:focus-visible`. Esa referencia carga las dos familias con un `<link rel="stylesheet">`
a `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap`,
el mismo patrón de CDN que ya usan Bootstrap, Font Awesome y Leaflet en `index.html`.
No bajes del terciario `#64707d`: `#7b8798` da 3,65:1 y `#a2adba` da 2,28:1,
y los dos incumplen AA en texto pequeño.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: `css/style.css:4-14,23-42,100-115` conserva el azul Bootstrap, degradados,
sombras y desplazamientos en hover; `css/style.css:11-13,173-185` usa la paleta anterior,
incluido PROMIORIENTE `#ffff00`. Además, `css/style.css:404,437,440,467` declara IBM Plex Sans
e IBM Plex Mono pero no hay `<link>` a la hoja de fuentes ni `@font-face` en `index.html` ni en
`css/style.css`: hoy el navegador cae al primer respaldo, Segoe UI.

**Done when**
- Una comprobación de CSS confirma variables propias para color, tipografía, espaciado y radios,
  y ausencia de degradados, sombras de tarjeta y `translateY` en hover en los paneles.
- Una prueba de estilos computados confirma acción primaria `#0d141c`, PROMIGAS `#0a6ed1`, TGI
  `#5a6b7d`, PROMIORIENTE `#b06a00`, conexión especial `#0f8a5f`, texto secundario `#48566a` y
  terciario `#64707d`; PROMIORIENTE no se usa como texto pequeño.
- Una comprobación en el navegador confirma que las dos familias quedan cargadas de verdad:
  tras `await document.fonts.ready`, `document.fonts.check('600 12px "IBM Plex Sans"')` y
  `document.fonts.check('400 12px "IBM Plex Mono"')` devuelven `true`, y la petición de la hoja
  de fuentes responde 200. El estilo computado no sirve para esto: devuelve la familia declarada
  aunque la fuente no se haya descargado nunca.
- La prueba confirma IBM Plex Sans en texto general e IBM Plex Mono con
  `font-variant-numeric: tabular-nums` en todos los importes y cifras del desglose.
- Un recorrido de teclado confirma `:focus-visible` perceptible en todos los controles y que el
  contenedor de resultados tiene `aria-live="polite"` y anuncia un cálculo nuevo.

**Fuera de alcance**
- Cambiar el layout de T-013, animar el mapa (T-015) o añadir extras de producto.

## T-015 — Mapa animado y sincronizado con el desglose

**Fase** 3 · **Bloque** mapa · **Depende de** T-014
**Dependencias**: T-014

Representar cada tramo calculado de forma secuencial y enlazarlo en ambos sentidos con su fila
del desglose, manteniendo una alternativa sin movimiento.

**Referencia de diseño**: el bloque `6. MAPA — capa de la ruta` de la hoja de estilos de
`docs/diseno/referencia.html` trae la capa SVG de la ruta ya escrita. Ojo con la numeración: los
bloques del `<style>` van numerados aparte de las secciones `<h2>` de la página, y ese bloque 6 se
ve montado en la sección 2, «Secuencia del mapa al calcular». Clases: `.ruta__tramo` (un
`<path>` por tramo con `pathLength="1"`, dibujado con `stroke-dashoffset` de 1 a 0 y retardos de
160 ms), `.ruta__flujo`
(`stroke-dasharray: 9 15`, ciclo de 1,4 s), `.ruta__tramo--enfocado`, `.ruta--atenuada`,
`.red--secundaria` y `.nodo__halo`, más el interruptor `[data-flujo="off"]`. Cópiala en vez de
reescribirla. Aviso: en esa página la red va sobre una retícula de puntos porque no carga
teselas; eso NO es el diseño — en la app las teselas CARTO Positron van debajo y lo que se copia
es solo la capa de la ruta.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: `js/map.js:21-24` usa las teselas OSM; `js/map.js:237-350` reúne todo el
trayecto en una sola polilínea roja, ejecuta `fitBounds` sin transición y no conserva referencias
por tramo para sincronizarlas con las filas.

**Done when**
- Una prueba de navegador confirma que las teselas del basemap claro tipo CARTO Positron llegan
  de verdad: alguna petición de tesela responde 200 y dentro del contenedor hay al menos un
  `img.leaflet-tile` con `complete` y `naturalWidth` mayor que cero. La URL configurada no basta:
  si el proveedor falla, Leaflet deja el fondo vacío sin lanzar error y la capa de la ruta se
  dibuja igual encima.
- La prueba confirma que, al calcular, el mapa se mueve de verdad: centro y zoom cambian entre
  antes y después, el encuadre final contiene los dos extremos de la ruta y la transición dura
  unos 600 ms. Espiar la llamada a `flyToBounds` no vale como prueba: pasa aunque el mapa no se
  mueva por bounds vacíos o contenedor de alto cero.
- Durante y después de ese encuadre, la red ajena a la ruta queda al 25 % de opacidad.
- La prueba confirma una capa por tramo, en orden, con el color de su transportador y un retardo
  aproximado de 160 ms entre comienzos, seguida de guiones blancos que avanzan hacia el destino.
- Pasar el puntero o el foco de teclado por una fila engrosa solo su tramo y muestra su etiqueta
  con valor; pasar el puntero por un tramo resalta solo la fila correspondiente.
- El interruptor visible de movimiento detiene/reanuda la animación y conserva su estado durante
  la sesión.
- Emulando `prefers-reduced-motion: reduce`, la ruta aparece completa sin vuelo, dibujo secuencial
  ni guiones en movimiento, y todas las interacciones siguen operativas.

**Fuera de alcance**
- Alterar fórmulas, tarifas, búsqueda de rutas o el layout ya cerrado en T-013.

## T-016 — Exportación del desglose a PDF y Excel

**Fase** 3 · **Bloque** producto · **Depende de** T-015
**Dependencias**: T-015

Añadir exportación del cálculo visible a PDF y a un archivo Excel, conservando ruta, parámetros,
totales, subtotales y detalle de tramos.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: es una capacidad nueva; `js/calculator.js:204-343` solo renderiza el
resultado en el DOM y no ofrece acciones ni serialización de exportación.

**Done when**
- Una prueba calcula Cartagena → Sebastopol, descarga ambos formatos y confirma nombres de archivo
  con origen, destino y fecha, extensiones `.pdf` y `.xlsx`, y tamaño mayor que cero.
- La lectura automática de ambos archivos confirma que origen, destino, porcentaje, TRM, total COP,
  total USD, subtotales por transportador y una fila por cada tramo son iguales a los de la
  respuesta de `POST /api/calcular` capturada en esa misma prueba. Que los campos estén presentes
  no basta: una plantilla con los rótulos correctos y cifras de otro cálculo los tiene todos.
- La prueba calcula una segunda ruta distinta sobre la misma página y exporta de nuevo: los dos
  archivos nuevos corresponden a la segunda respuesta, no a la primera. `js/calculator.js:4`
  conserva un único `currentRoute`, así que este es el camino por donde salen datos rancios.
- Los botones de exportación permanecen deshabilitados antes de un cálculo y no exportan datos de
  una ruta anterior después de un error de cálculo.

**Fuera de alcance**
- Compartir por URL (T-017), TRM automática (T-018) y cambiar el cálculo del backend.

## T-017 — URL compartible que reproduce un cálculo

**Fase** 3 · **Bloque** producto · **Depende de** T-015
**Dependencias**: T-015

Persistir origen, destino, porcentaje y TRM en la URL para poder compartir y reproducir el mismo
cálculo al abrir el enlace.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: es una capacidad nueva; `js/calculator.js:95-202` lee el formulario y
calcula, pero no usa `URLSearchParams`, `history` ni el estado inicial de la URL.

**Done when**
- Tras calcular Sebastopol → Medellin con porcentaje 75 y TRM 4200, la URL contiene esos cuatro
  valores codificados sin recargar la página.
- Abrir esa URL en un contexto limpio selecciona los mismos valores, ejecuta una sola petición a
  `POST /api/calcular` y muestra el mismo total que la respuesta de la API.
- Parámetros ausentes o inválidos no disparan el cálculo, conservan el formulario utilizable y
  muestran un mensaje de validación sin error de consola.

**Fuera de alcance**
- Acortadores, persistencia en servidor, autenticación y comparación de rutas (T-019).

## T-018 — TRM automática con fecha y sobrescritura manual

**Fase** 3 · **Bloque** producto · **Depende de** T-015
**Dependencias**: T-015

Cargar la TRM desde la fuente oficial que confirme el usuario, mostrar la fecha efectiva del dato
y permitir que la persona la sobrescriba para el cálculo actual.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: `index.html:145-150` fija el campo en 4000 y `js/calculator.js:145` mantiene
4000 como valor por defecto; no existe integración con una fuente de TRM.

**Done when**
- Con una respuesta controlada de la fuente confirmada, una prueba muestra su valor y fecha
  efectiva y verifica que ese valor se envía a `POST /api/calcular`.
- Editar manualmente la TRM marca el campo como sobrescrito y la siguiente petición usa exactamente
  el valor escrito, sin que una actualización automática lo reemplace.
- Ante timeout, error HTTP o dato sin fecha/vencido según la política confirmada, la página no
  calcula con 4000 silenciosamente: informa el estado y permite introducir una TRM manual válida.

**Información pendiente**
- Confirmar fuente oficial y contrato/API, frecuencia de actualización, antigüedad máxima aceptada
  y comportamiento esperado para fines de semana, festivos y caídas.

**Fuera de alcance**
- Históricos de TRM, pronósticos, conversión a otras monedas y cambios en las fórmulas tarifarias.

## T-019 — Comparación de dos rutas lado a lado

**Fase** 3 · **Bloque** producto · **Depende de** T-015
**Dependencias**: T-015

Permitir configurar y calcular dos rutas independientes y comparar sus totales, reparto por
transportador y desglose en paralelo.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: es una capacidad nueva; `js/calculator.js:4,95-121` conserva un único
`currentRoute`, lee un solo juego de controles y reemplaza un solo bloque de resultados.

**Done when**
- Una prueba configura dos pares origen/destino, confirma dos peticiones independientes a
  `POST /api/calcular` y muestra cada respuesta en su columna sin mezclar tramos ni totales.
- Cambiar y recalcular solo la segunda ruta conserva intacta la primera y actualiza las diferencias
  de COP, USD y porcentaje por transportador.
- A 390 px ambas comparaciones siguen accesibles mediante un control de alternancia con nombre
  accesible, sin tabla cortada ni desbordamiento horizontal.

**Fuera de alcance**
- Recomendar una ruta, guardar comparaciones en servidor o comparar más de dos rutas.

## T-020 — Estado de carga integrado con esqueleto

**Fase** 3 · **Bloque** producto · **Depende de** T-015
**Dependencias**: T-015

Sustituir el modal bloqueante por un estado de carga dentro del área de resultados que mantenga
visible y utilizable el resto de la página.

**Reportado por**: Flavio · **Fecha**: 2026-09-07 · **Proyecto/registro**: Calculadora GEAM.

**Causa localizada**: `index.html:225-237` define `#loadingModal` con backdrop estático y
`js/calculator.js:40-43,385-391` lo abre y cierra durante cada cálculo.

**Done when**
- Con `POST /api/calcular` demorado de forma controlada, una prueba confirma dentro de resultados
  un esqueleto con forma, no solo marcado: `aria-busy="true"`, al menos tres filas de marcador de
  posición con alto propio y un bloque que ocupa el mismo alto reservado que comprueba el criterio
  del salto de layout, medido con `getBoundingClientRect`. El atributo por sí solo no vale: un
  contenedor vacío o de alto cero lo satisface. La misma prueba comprueba ausencia de
  modal/backdrop y navegación por teclado disponible en el resto de la página.
- Al resolver la petición, el esqueleto se sustituye por el resultado, `aria-busy` vuelve a `false`
  y no hay salto de layout mayor que el alto reservado para el resultado.
- Al fallar o agotarse el timeout, desaparece el esqueleto, se conserva el resultado anterior y se
  presenta el mensaje de error existente.
- Con `prefers-reduced-motion: reduce`, el esqueleto no anima y sigue comunicando el estado de carga.

**Fuera de alcance**
- Cambiar el timeout de red, añadir progreso porcentual o modificar el backend.

## T-021 — Estado inicial orientativo en la columna de resultados

**Fase** 3 · **Bloque** layout · **Depende de** T-013
**Dependencias**: T-013

Mostrar contenido intencional en la columna central antes del primer cálculo, explicando que se
deben elegir origen y destino, para que la aplicación no presente un gran espacio vacío al abrirse.

**Referencia de diseño**: la sección 4 de `docs/diseno/referencia.html`, «Estado inicial · antes
del primer cálculo», trae la pantalla montada, y el bloque 8 de su hoja de estilos las clases:
`.fantasma__num` para el guion de un dato ausente, `.fantasma__barra` para la barra de marcador de
posición, `.fantasma__marca` para la marca de tramo sin color, `.campo__caja--vacia` para el campo
sin elegir y `.boton--inactivo` para la acción primaria apagada. Los tres colores nuevos
—`--tinta-fantasma`, `--sup-fantasma` y `--sup-fantasma-2`— están en `docs/diseno/tokens.css` y son
los únicos que quedan fuera de la regla de contraste, porque no son texto: si algo se lee, va con
`--tinta-3` o mejor. La estructura del resultado en gris ocupa 606 de los 924 px de la columna
(0,66) en esa referencia; el mapa va con la red completa en reposo y sin `.red--secundaria`, porque
ese 25 % es la atenuación relativa a una ruta activa y aquí no hay ninguna.

La misma sección 4 trae el móvil 390 × 844, y **en móvil el estado inicial no es el espejo del
escritorio**. En 1440 el riel sostiene el formulario siempre, así que la columna central puede
permitirse la estructura en gris; en 390 no hay riel, y la hoja inferior es la única superficie
disponible. Por eso al abrir la hoja *es* el formulario —origen, destino, capacidad y TRM— con la
acción primaria abajo, al alcance del pulgar, y la estructura del resultado sólo aparece cuando hay
algo que estructurar. El campo sube a `--alto-campo-movil` (48 px) con la clase
`.campo__caja--movil`. El mapa también cambia de encuadre: sin ruta va con
`preserveAspectRatio="xMidYMid meet"` y un viewBox ampliado para que quepa la red entera, no con el
`slice` de la pantalla calculada; a esa escala sólo se rotulan cinco nodos de referencia.

**Reportado por**: Flavio · **Fecha**: 2026-09-08 · **Proyecto/registro**: Calculadora GEAM,
frontend con `index.html` servido en local.

**Causa localizada**: `index.html:167-184` contiene únicamente `#resultsCard` en la columna
central y lo oculta con `style="display: none;"`; `js/calculator.js:8-18` inicializa formulario,
modal y hoja de resultados, pero no crea ni muestra un estado previo al primer cálculo.

**Done when**
- Una prueba de navegador abre la aplicación en un contexto limpio, sin enviar ninguna petición a
  `POST /api/calcular`, y confirma que la columna central muestra una instrucción que menciona
  elegir origen y destino, visible de verdad: rectángulo con alto propio, sin `display:none`,
  `visibility:hidden` ni alto cero, y dentro de la columna central.
- A 1440 × 980, ese contenido inicial ocupa al menos la mitad del alto visible de la columna
  central, medido con `getBoundingClientRect`. La tarea existe para eliminar el vacío al abrir:
  una sola línea de texto arriba con el resto en blanco cumple la letra del criterio anterior y
  no resuelve nada.
- La misma prueba realiza un cálculo válido y confirma que el estado inicial deja de estar visible
  y es sustituido por el resultado de esa petición, sin duplicar ambos contenidos.
- En viewports de 390 px y 1440 px, la prueba confirma que el estado inicial está dentro del orden
  de lectura de la calculadora y que no provoca desbordamiento horizontal.
- A 390 × 844, la prueba confirma que la hoja inferior muestra el formulario completo sin
  desplazarla: origen, destino, capacidad, TRM y la acción primaria visibles dentro del viewport,
  con el mapa arriba enseñando la red completa. Ningún objetivo interactivo de esa pantalla mide
  menos de 44 × 44 CSS px y los dos campos del trayecto miden 48 de alto.
- La captura de 390 px del estado inicial no contiene barra de estado ni teclado simulados: el
  sistema los pinta encima y un duplicado dibujado se ve doble.
- Antes del primer cálculo, a 390 px la hoja no lleva asa ni ningún control de arrastre, y
  arrastrar sobre ella no cambia su alto. El asa se crea hoy dentro de la tarjeta de resultados
  (`js/calculator.js:287-289`) y ahí se queda: un asa que no arrastra promete algo que no pasa.
- Si el cálculo falla o se agota el timeout sin resultado previo, la columna central no queda
  vacía: vuelve el estado inicial junto al mensaje de error existente.

**Fuera de alcance**
- El estado durante una petición (T-020), cambios de paleta o tipografía (T-014), ampliar el mapa y
  ejecutar automáticamente un cálculo inicial.
- Hacer arrastrable la hoja antes del primer cálculo. Decidido el 2026-09-08: en la pantalla
  calculada la hoja no tiene campos y el teclado del sistema nunca sale; en el estado inicial la
  hoja lleva el formulario, y una hoja colocada por arrastre más un teclado que encoge el viewport
  cerca de un 40 % es donde estas interfaces se rompen. Si más adelante hace falta ver la red antes
  de elegir, crece el mapa, no la hoja, y eso va en tarea aparte.

## T-022 — Marcado de index.html sobre la rejilla de la referencia

**Fase** 4 · **Bloque** marcado · **Depende de** —

`index.html` conserva `row`, `col-lg-4`, `col-lg-8`, `card`, `card-body` y `form-control`.
Esas clases anulan la rejilla que ya existe en el CSS: `.app__cuerpo` sí es un grid de
`328px · minmax(0,1fr) · 552px`, pero dentro de la celda de 328 px un `col-lg-4` se
dimensiona al 33 % de esa celda, deja el riel estrecho y abre un hueco a su derecha. Hay
que reescribir el marcado con las clases de `docs/diseno/referencia.html` y retirar
Bootstrap y Font Awesome del `<head>`.

**Done when**
- `grep -Ec "col-lg-|col-md-|card-body|form-control|form-select" index.html` devuelve 0
- `grep -Ec "bootstrap|font-awesome" index.html` devuelve 0
- Los hijos directos de `.app__cuerpo` son exactamente `.riel`, `.centro` y `.mapa`
- Servida en `http://127.0.0.1:8001`, a 1440 px de ancho el riel mide 328 px y la columna
  del mapa 552 px, con 2 px de tolerancia, medido con `getBoundingClientRect` en
  `tests/t022-marcado-check.js`
- La consola del navegador queda sin errores al cargar y al calcular una ruta

**Fuera de alcance**
- El diseño móvil 390×844, que va en su propia fase
- Cualquier cambio en el cálculo o en las llamadas a la API

## T-023 — Barra superior única, logotipo GEAM y retirada de "Lite"

**Fase** 4 · **Bloque** marcado · **Depende de** T-022

El nombre del producto sale hoy tres veces: la barra de navegación, un encabezado con
`h1` y el título de la pestaña. La referencia pide una sola barra de 56 px con la marca,
un filete, el subtítulo, la leyenda de transportadores y el chip de TRM. Además "Lite"
sobrevive en `index.html` (título, barra y pie) y en `js/calculator.js`, y la marca pasa a
ser el logotipo de la empresa, que está en `img/GeamIT.png` (1329×915, con transparencia).
Sobre la barra oscura la palabra GEAM es azul marino y se pierde: la tarea genera y usa
una variante de texto claro, conservando la montaña en rojo y azul.

**Done when**
- `grep -ric "lite" index.html js/ css/` devuelve 0
- La barra aparece una sola vez y no queda ningún `h1` con el nombre del producto fuera de
  ella
- La barra muestra el logotipo a 32 px de alto, el subtítulo "Calculadora de tarifas SNT",
  la leyenda de los tres transportadores y el chip de TRM
- El favicon sale de `img/icon-144.png`, declarado en 16, 32 y 180 px
- El texto del logotipo sobre `#0d141c` alcanza 4,5:1 o más, medido en
  `tests/t023-barra-check.js`

**Fuera de alcance**
- El logotipo en PDF, Excel y pantalla de acceso, que van en T-028 y T-030

**Dependencias**: T-022

## T-024 — Controles del riel: capacidad, tasa de cambio e invertir trayecto

**Fase** 4 · **Bloque** marcado · **Depende de** T-022

La referencia sustituye el `input type="number"` de porcentaje por un deslizador con
marcas en 0, 50 y 100, pone el campo de TRM con chip AUTO y la nota "Banrep · hoy" en
lugar del párrafo de texto actual, y añade el botón circular que invierte origen y
destino. Los tres controles están en el CSS y ninguno existe en el HTML.

**Done when**
- El porcentaje se fija con un `input type="range"` de 1 a 100 y el valor se muestra en
  cifra monoespaciada junto a la etiqueta
- El campo de TRM lleva el chip AUTO cuando el valor viene del Banco de la República, y lo
  pierde en cuanto se escribe a mano
- El botón de invertir intercambia origen y destino, y queda deshabilitado mientras falte
  cualquiera de los dos
- Con origen o destino sin elegir, el botón de calcular está deshabilitado y debajo se lee
  "Faltan origen y destino"
- `tests/t024-controles-check.js` cubre los cuatro criterios anteriores

**Fuera de alcance**
- La tabla general de tramos, que es T-030

**Dependencias**: T-022

## T-025 — Rutas frecuentes en lista y segunda ruta bajo demanda

**Fase** 4 · **Bloque** marcado · **Depende de** T-022

Las rutas predefinidas están hoy en un `select` y la segunda ruta ocupa el riel de forma
permanente aunque casi nunca se use. La referencia las convierte en una lista con el total
en COP de cada una, y esconde la segunda ruta detrás del botón "Comparar con otra ruta".

**Done when**
- Las rutas frecuentes son una lista de filas seleccionables con su total en COP, y la
  activa lleva la marca de 2 px a la izquierda
- La segunda ruta no está en el DOM hasta que se pulsa "Comparar con otra ruta"
- Elegir una ruta frecuente rellena origen y destino y lanza el cálculo
- `tests/t025-rutas-check.js` cubre los tres criterios

**Fuera de alcance**
- Guardar rutas frecuentes nuevas desde la interfaz

**Dependencias**: T-022

## T-026 — Nodos, escala y cabecera del mapa

**Fase** 4 · **Bloque** mapa · **Depende de** T-022

El mapa usa los marcadores por defecto de Leaflet y una cabecera con tres botones sueltos
que se ven rotos. La referencia pide cabecera con el título "Red nacional de transporte",
alternador Ruta / Red completa y botón de pausa de 28 px; nodos con forma propia —origen
círculo lleno con halo, destino cuadrado, intermedios anillo del color de su
transportador—; escala de 100 km; y pie con la cartografía y el número de tramos.

**Done when**
- La cabecera del mapa contiene el título, el alternador de dos estados y el botón de
  pausa, y el alternador cambia de verdad entre la ruta y la red completa
- El origen se dibuja con halo, el destino como cuadrado y los intermedios como anillo del
  color de su transportador
- El pie del mapa declara la cartografía y el número de tramos del trayecto
- `tests/t026-mapa-check.js` cubre los tres criterios

**Fuera de alcance**
- Cambiar el proveedor de teselas. La referencia pide CARTO Positron, pero CARTO se probó y
  se descartó porque exige clave de API. La vuelta V-044 fijó OpenStreetMap y
  `tests/t015-map-motion-check.js` lo comprueba rechazando cualquier URL de CARTO. No se
  reabre sin una decisión de dirección.

**Dependencias**: T-022

## T-027 — Diagnóstico y reparación del movimiento de la ruta

**Fase** 4 · **Bloque** mapa · **Depende de** T-022

La animación está escrita: `map.js` crea cada tramo con `className: 'ruta__tramo'`, añade
la línea de flujo, fija `pathLength="1"` y reparte 160 ms de retardo por tramo, y el CSS
tiene los dos keyframes con sus duraciones. Aun así no se ve movimiento en la aplicación.
La tarea es averiguar por qué y arreglarlo, no reescribirlo. Dos hipótesis a descartar
primero: que el sistema del operador tenga los efectos de animación desactivados, lo que
activa `prefers-reduced-motion` y apaga las dos animaciones a propósito; y que el
`stroke-dasharray` que aplica Leaflet pise al del CSS en la línea de flujo.

**Done when**
- El informe de la tarea nombra la causa concreta, con archivo y línea
- Tras calcular una ruta, los tramos se dibujan uno tras otro y los guiones blancos avanzan
  de forma continua
- El botón de pausa detiene y reanuda el flujo
- Con `prefers-reduced-motion: reduce` emulado no hay ninguna animación, y la ruta se ve
  completa y fija
- `tests/t027-movimiento-check.js` mide el avance real de `stroke-dashoffset` entre dos
  instantes, no la presencia de la clase

**Fuera de alcance**
- El halo del nodo de origen, que se dibuja en T-026

**Dependencias**: T-022

## T-028 — Pantalla de acceso al panel administrativo

**Fase** 4 · **Bloque** admin · **Depende de** T-022

El backend del panel está terminado y probado: `backend/src/routes/admin.ts` tiene login
con límite de intentos, logout, auditoría y el CRUD completo, todo tras `requireAuth`. Lo
que no existe es una sola pantalla que lo use. Esta tarea construye el acceso: enlace
discreto en la barra, formulario de acceso con el logotipo, manejo de sesión y cierre.

**Done when**
- Desde la barra superior se llega a la pantalla de acceso, que muestra el logotipo
  completo
- Con credenciales correctas se entra al panel; con incorrectas sale un mensaje que no
  revela si falló el usuario o la contraseña
- Al superar el límite de intentos del backend, la pantalla explica la espera
- La sesión sobrevive a una recarga, y el botón de salir la cierra de verdad contra
  `/auth/logout`
- `tests/t028-acceso-check.js` cubre los cuatro criterios contra el backend en Docker

**Fuera de alcance**
- Alta de usuarios y roles: hoy el backend contempla un solo administrador

**Dependencias**: T-022

## T-029 — Tablas de administración de la red

**Fase** 4 · **Bloque** admin · **Depende de** T-028

Con la sesión resuelta, el panel necesita las pantallas que consumen el CRUD que ya
existe: nodos, tramos, transportadores, estampillas y parámetros. Es la vía por la que se
actualizan las rutas sin tocar la base de datos a mano.

**Done when**
- Cada entidad tiene su tabla con alta, edición y baja contra los endpoints de `admin.ts`,
  sin inventar rutas nuevas
- Los errores de validación del backend se muestran junto al campo que los provoca
- Un cambio guardado se refleja en el cálculo público sin reiniciar el servicio
- La pantalla de auditoría lista quién cambió qué y cuándo, leyendo `/auditoria`
- `tests/t029-admin-crud-check.js` recorre un alta, una edición y una baja de tramo

**Fuera de alcance**
- Importar o exportar la red en lote

**Dependencias**: T-028

## T-030 — Vista general de tramos con capacidad recalculable

**Fase** 4 · **Bloque** producto · **Depende de** T-024

El usuario final necesita ver todos los tramos con sus valores, no solo los del trayecto
calculado, y mover el porcentaje de capacidad viendo cómo cambia la tabla entera. El
recálculo es solo visual: no se guarda nada y no se toca el backend.

**Decisión de dirección, no del agente.** La sección 5 de `docs/diseno/referencia.html`
dejó tres valores sin resolver que esta tarea roza: la unidad tarifaria que va bajo el
total en COP, de dónde salen los kilómetros del trayecto, y si existe reparto por tramo
del trayecto TGI (hoy solo se conoce su subtotal). No se inventan. Si la tarea los
necesita, abre un gate y espera respuesta.

**Done when**
- Una vista lista todos los tramos de la red con fijos, AOM y total, ordenables por columna
- Mover el deslizador de capacidad actualiza todas las filas y el total, sin recargar y sin
  llamar a la API
- El valor mostrado con capacidad al 100 % coincide con el que devuelve
  `POST /api/calcular` para ese tramo, con diferencia menor a 0,01
- La vista se exporta a Excel con el porcentaje aplicado
- `tests/t030-tabla-general-check.js` cubre los tres primeros criterios

**Fuera de alcance**
- Guardar el porcentaje entre sesiones

**Dependencias**: T-024

## T-031 — Verificación visual y de accesibilidad de la fase

**Fase** 4 · **Bloque** verificacion · **Depende de** T-023, T-025, T-026, T-027, T-029, T-030

Cierre de la fase. Comprueba que el conjunto quedó como la referencia y que nada de lo
anterior rompió el contraste ni el comportamiento sin movimiento. Existe precisamente por
lo que originó esta fase: tareas cerradas una a una cuyo resultado no llegó a la pantalla.

**Done when**
- Capturas a 1440, 1024 y 768 px guardadas en `test-results/`, comparadas contra las
  secciones 1 y 4 de `docs/diseno/referencia.html`
- Ningún texto baja de 4,5:1 de contraste, medido sobre la pantalla calculada y la inicial
- Con `prefers-reduced-motion: reduce` la aplicación es usable y no anima nada
- La navegación con teclado alcanza todos los controles y el foco siempre se ve
- `tests/t031-verificacion-check.js` reúne los cuatro criterios

**Fuera de alcance**
- El diseño móvil 390×844

**Dependencias**: T-023, T-025, T-026, T-027, T-029, T-030
