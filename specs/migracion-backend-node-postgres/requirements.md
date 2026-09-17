# Requisitos — Migración a plataforma con backend Node.js, PostgreSQL y panel admin

## 1. Problema

La calculadora corre 100% en el navegador, sin ningún componente de servidor. Cuatro
problemas concretos, verificados contra el código actual:

**P1 — Los datos tarifarios y geográficos están hardcodeados en el bundle del cliente, sin
metadata de origen.**
`js/data.js:4-44` (`NETWORK_DATA`, 33 tramos) y `js/data.js:45-49` (`ESTAMPILLAS`, una por
transportador) llevan los valores de Fijos/Variables/AOM en literales de código, sin fecha
de vigencia, sin unidad declarada en el dato mismo y sin quién los cargó. La comparación de
`ESTAMPILLAS.PROMIORIENTE` con `ESTAMPILLAS.TGI` (mismos tres valores) solo se explica por un
comentario ("Mismas que TGI según original", `js/data.js:48`), no por un dato verificable.

**P2 — Cambiar una tarifa exige editar código y volver a publicar el sitio.**
El propio `README.md` ("Actualizar Datos de la Red") documenta el único flujo existente: abrir
`js/data.js`, editar el arreglo a mano y desplegar de nuevo. No hay un camino para que alguien
sin acceso al repositorio actualice un nodo, un tramo o una estampilla.

**P3 — No hay registro de quién cambió qué dato tarifario o geográfico, ni cuándo.**
Un `git blame` sobre `js/data.js` es la única auditoría posible, y mezcla ese cambio con
cualquier otro que haya tocado el mismo archivo. No hay forma de listar "qué tarifas cambiaron
este trimestre y por qué", que es justamente lo que pide la regla de "Datos administrativos"
del proyecto.

**P4 — El cálculo vive solo en un cliente que nadie audita.**
`js/calculator.js:185` (`findShortestPath`, BFS) y `js/calculator.js:250`
(`calculateRouteCosts`: fomento 3%, impuesto 6%, conversión USD por TRM) corren enteros en el
navegador de quien abre la página. No queda ningún registro de qué ruta se calculó, con qué
parámetros o cuándo, y no hay forma de exponer ese mismo cálculo a otro cliente sin duplicar
el JavaScript.

## 2. Alcance

**Dentro:**
- Backend Node.js con API REST, PostgreSQL como almacenamiento de nodos, tramos,
  transportadores, estampillas y parámetros tarifarios (fomento, impuesto, TRM por defecto).
- Migración del contenido actual de `js/data.js` (`NETWORK_DATA`, `ESTAMPILLAS`,
  `TRANSPORTADOR_COLORS`, `NODES`, `PREDEFINED_ROUTES`) a tablas de Postgres, con metadata de
  origen, fecha de vigencia y autor por registro.
- Endpoint(s) públicos de solo lectura que sirvan esos datos y el cálculo de ruta/costos
  (replicando exactamente la lógica de `findShortestPath` y `calculateRouteCosts`, fórmulas y
  redondeos incluidos) para que el frontend deje de traer el cálculo embebido.
- Panel administrativo con autenticación por correo y contraseña, sesión en cookie segura
  (`express-session` con store en Postgres), y CRUD sobre nodos, tramos, transportadores,
  estampillas y parámetros tarifarios.
- Registro de auditoría: quién, cuándo y qué cambió en cada dato tarifario o geográfico.
- `index.html`, `css/style.css`, `js/data.js`, `js/calculator.js` y `js/map.js` migrados para
  consumir la API en vez de los arreglos hardcodeados. Ni el algoritmo de rutas, ni las
  fórmulas tarifarias, ni los valores crudos de Fijos/Variables/AOM/estampillas viajan en el
  bundle del cliente: el navegador solo pinta lo que la API ya calculó, sin ruta de reserva
  con cálculo local.
- Contenedores Docker (backend, Postgres) y una ruta reproducible para levantarlos en un VPS.
- Migraciones de base de datos versionadas (esquema inicial = el modelo de datos actual de
  `js/data.js`).

**Fuera:**
- Cambiar el algoritmo de cálculo de rutas (BFS) o las fórmulas tarifarias (fomento 3%,
  impuesto 6%, complemento de porcentaje en Fijos/Variables). Se migran de servidor, no se
  redefinen.
- Rediseño visual o de UX de la calculadora: Bootstrap 5, la disposición de columnas, el mapa
  Leaflet y sus capas por transportador se conservan tal como están hoy.
- Internacionalización (regla 1 del proyecto: la interfaz sigue en español).
- Registro de usuarios públicos o cuentas para quien solo consulta rutas: el acceso público
  sigue sin cuenta; la autenticación es exclusiva del panel admin.
- Roles y permisos granulares dentro del panel admin (varios niveles de administrador,
  aprobación de cambios en dos pasos): un único rol "administrador" alcanza para esta spec.
- `test.html` y `test_destinos.html`: quedan como están, son páginas de verificación manual
  del frontend estático y no forman parte del backend.

## 3. Restricciones

| Restricción | Origen |
|---|---|
| El acceso público a la calculadora no requiere cuenta; solo el panel admin tiene autenticación | Decisión del usuario (dirección aprobada del proyecto) |
| Autenticación inicial por correo y contraseña, con sesión en cookie segura | Decisión del usuario |
| Sesión server-side: `express-session` con store en PostgreSQL, no JWT | Decisión del usuario |
| Stack backend: Express + Prisma + Jest | Decisión del usuario |
| Despliegue en VPS mediante Docker | Decisión del usuario (dirección aprobada del proyecto) |
| La migración es gradual: la calculadora debe seguir funcionando aunque el backend esté caído | Regla del proyecto (reglas de cambio, punto de arquitectura) |
| No modificar datos tarifarios o geográficos sin indicar origen, unidad, fecha y efecto del cambio | Regla 3 del proyecto |
| Preservar compatibilidad con navegadores modernos y responsive en móvil/tablet/escritorio | Regla 4 del proyecto |
| Usar IDs, nombres de campo y estructuras existentes cuando no haya razón funcional para cambiarlos | Regla 5 del proyecto |
| Validar entradas numéricas y selecciones antes de calcular; errores visibles al usuario y registrados en consola | Regla 6 del proyecto |
| Evitar `innerHTML` con valores de usuario o fuentes no confiables; preferir APIs DOM seguras | Regla 7 del proyecto |
| Recursos CDN con versión fijada (Bootstrap 5.3.0, Font Awesome 6.4.0, Leaflet 1.9.4 hoy, `index.html:11-17` y `:230-231`) | Regla 9 del proyecto |
| Validar autorización en cada endpoint administrativo del backend, nunca solo en la interfaz | Regla 10 del proyecto |
| Credenciales y secretos solo por variables de entorno, nunca en el repositorio | Regla 11 del proyecto |
| Ningún dato personal ni archivo generado en el repositorio | Regla 12 del proyecto |
| No hay pipeline automatizado hoy; la validación es manual (servidor HTTP local + navegador) | Estado actual, documentado en el flujo de validación del proyecto |
| El algoritmo de cálculo (BFS, fórmulas tarifarias) y los valores crudos de tarifas no se exponen en el JavaScript del cliente; todo cómputo ocurre en el backend | Decisión del usuario |

## 4. Historias de usuario

**HU-1 — Como visitante público**, quiero seguir calculando una ruta y su costo sin crear
cuenta, para no perder la forma de uso actual de la calculadora.

**HU-2 — Como visitante público**, quiero ver un mensaje claro si el servicio de cálculo no
está disponible, para no confundir una falla temporal del backend con un resultado real.

**HU-3 — Como administrador**, quiero iniciar sesión con correo y contraseña, para entrar al
panel donde se gestionan los datos tarifarios y geográficos.

**HU-4 — Como administrador**, quiero crear, editar y eliminar nodos, tramos, transportadores,
estampillas y parámetros tarifarios desde un panel, para no depender de editar código y
redesplegar el sitio.

**HU-5 — Como administrador**, quiero ver quién cambió cada dato, cuándo y con qué valor
anterior, para poder explicar por qué cambió una tarifa si alguien lo pregunta.

**HU-6 — Como operador que despliega el sistema**, quiero levantar backend y base de datos con
Docker en un VPS con un comando reproducible, para no depender de una instalación manual paso
a paso.

## 5. Requisitos

### R1 — Modelo de datos y persistencia

- **R1.1** El esquema de PostgreSQL representa nodo, tramo, transportador, estampilla y
  parámetro tarifario (fomento, impuesto, TRM por defecto) como entidades separadas,
  conservando los campos que hoy tiene `NETWORK_DATA` (Origen, Destino, Fijos, Variables, AOM,
  Tipo, Transportador, Tramo, coordenadas de origen y destino).
- **R1.2** Cada registro de tramo, nodo, transportador o estampilla guarda quién lo creó o
  modificó por última vez, en qué fecha y, cuando aplica, la fecha de vigencia del valor.
- **R1.3** Una migración inicial (Prisma Migrate) carga en Postgres el contenido actual de
  `NETWORK_DATA`, `ESTAMPILLAS`, `TRANSPORTADOR_COLORS` y `NODES` sin alterar ningún valor
  numérico existente.
- **R1.4** El sistema no permite guardar un tramo cuyo Origen y Destino sean el mismo nodo, ni
  una estampilla o parámetro tarifario sin los tres componentes (Fijos, Variables, AOM).

### R2 — API pública de lectura y cálculo

- **R2.1** Un endpoint GET expone la lista de nodos disponibles como origen y como destino,
  replicando el resultado de `getOriginNodes()`/`getAllDestinationNodes()`
  (`js/data.js:108-150`).
- **R2.2** Un endpoint POST recibe origen, destino, porcentaje y TRM, y devuelve el mismo
  resultado que hoy produce `calculateRoute()` (`js/calculator.js:148-183`): ruta, desglose por
  tramo, estampillas aplicadas, subtotales, fomento, impuesto, totales en COP y en USD.
- **R2.3** Cuando no existe ruta entre origen y destino, el endpoint POST responde con un
  estado de error explícito y un mensaje equivalente a "No existe ruta entre `<origen>` y
  `<destino>`" (mismo mensaje que produce hoy `calculateRoute` en `js/calculator.js:161-165`).
- **R2.4** Ningún endpoint de esta sección exige autenticación.
- **R2.5** El endpoint de topología (R2.1, y el que alimenta el mapa en R6.3) nunca incluye
  Fijos, Variables, AOM ni estampillas: esos valores solo salen en la respuesta del endpoint
  de cálculo (R2.2) o del endpoint de costo por tramo (R6.3), ya combinados en un monto, nunca
  como tarifa cruda reutilizable fuera de ese cálculo.

### R3 — Autenticación del panel admin

- **R3.1** El panel admin solo es accesible tras iniciar sesión con correo y contraseña.
- **R3.2** La sesión se mantiene en una cookie marcada `Secure`, `HttpOnly` y `SameSite`, con
  el estado de la sesión almacenado en PostgreSQL vía `express-session` (no en la propia
  cookie).
- **R3.3** Las contraseñas se guardan con hash (no en texto plano) y nunca viajan ni se
  registran en logs del servidor.
- **R3.4** Tres intentos fallidos consecutivos de inicio de sesión para el mismo correo
  bloquean nuevos intentos de ese correo durante un tiempo configurable por variable de
  entorno.

### R4 — CRUD del panel admin

- **R4.1** Un administrador autenticado puede crear, editar y eliminar nodos, tramos,
  transportadores, estampillas y parámetros tarifarios (fomento, impuesto, TRM por defecto)
  desde el panel.
- **R4.2** Cada endpoint de escritura del panel admin valida la sesión del administrador en el
  propio backend antes de aplicar el cambio, sin confiar en que la interfaz oculte el botón.
- **R4.3** Eliminar un nodo o tramo que forma parte de al menos un tramo o de la red activa
  exige confirmación explícita y no se ejecuta con una sola acción accidental (ninguna
  eliminación en cascada silenciosa).
- **R4.4** El panel valida los mismos tipos de dato que exige el modelo (R1.4) antes de
  guardar, y muestra el error de validación al administrador sin ambigüedad.

### R5 — Auditoría de cambios

- **R5.1** Cada creación, edición o eliminación de un nodo, tramo, transportador, estampilla o
  parámetro tarifario queda registrada con quién la hizo, cuándo, y el valor anterior y nuevo
  del campo modificado.
- **R5.2** El panel admin ofrece una vista de este historial, filtrable al menos por entidad y
  por rango de fechas.

### R6 — Frontend: consumo de la API, sin lógica de cálculo en el cliente

- **R6.1** `js/data.js`, `js/calculator.js` y `js/map.js` obtienen nodos, tramos, estampillas y
  el resultado del cálculo desde la API (R2); el bundle del cliente no contiene el algoritmo de
  ruta (`findShortestPath`), las fórmulas tarifarias (complemento de porcentaje, fomento,
  impuesto) ni los valores crudos de Fijos/Variables/AOM/estampillas.
- **R6.2** Si la API no responde (error de red o error 5xx) al cargar la página o al calcular
  una ruta, la calculadora muestra un mensaje explícito de servicio no disponible y deshabilita
  el botón de calcular; no ejecuta ningún cálculo local ni conserva una copia de los datos
  tarifarios en el cliente.
- **R6.3** El mapa (`js/map.js`) obtiene de la API solo lo necesario para dibujar la red (nodos,
  coordenadas, transportador por tramo); los detalles de costo que hoy aparecen en los popups
  (README, sección "Mapa Interactivo") se piden a la API por tramo en el momento de abrir el
  popup, no se precalculan ni se embeben en el JavaScript servido.
- **R6.4** Ninguna respuesta de la API se inserta en el DOM con `innerHTML` sin sanear; los
  valores numéricos y nombres de nodo/transportador que hoy ya se interpolan en
  `displayResults`/`generateDetailedBreakdown` (`js/calculator.js:420-559`) se revisan para
  usar creación de nodos vía API DOM donde el valor no está controlado por el propio código.

### R7 — Despliegue

- **R7.1** Un `docker-compose` (o equivalente) levanta backend y PostgreSQL con un solo
  comando en un entorno limpio.
- **R7.2** Toda credencial (contraseña de base de datos, secreto de sesión, correo/contraseña
  del primer administrador) se pasa por variable de entorno; ninguna queda en el repositorio.
- **R7.3** Existe al menos un comando de build, uno de test y uno de lint documentados y
  ejecutables desde la raíz del backend.

### R8 — Compatibilidad

- **R8.1** El frontend sigue siendo responsive en móvil, tablet y escritorio, sin regresión
  visible respecto al comportamiento actual.
- **R8.2** El mapa Leaflet, sus capas por transportador (TGI, PROMIGAS, PROMIORIENTE) y el
  resaltado de ruta calculada siguen funcionando igual que hoy (`js/map.js`).

## 6. Fuera de esta spec

- Un segundo nivel de aprobación o flujo de revisión para cambios tarifarios (alguien propone,
  otro aprueba): con auditoría (R5) alcanza para esta fase; un flujo de aprobación es una
  extensión posterior si se necesita.
- Notificaciones (correo, Slack) cuando cambia una tarifa: no se pidió y no hay canal definido
  todavía.
- Métricas de uso de la calculadora pública (cuántas rutas se calculan, cuáles son las más
  consultadas): no está en el alcance aprobado del proyecto.
- Exportar resultados o el histórico de auditoría a Excel/CSV: no se pidió.
- Multiidioma: la regla 1 del proyecto lo deja fuera salvo que se solicite explícitamente.
