# Registro de vueltas — Calculadora GEAM
Una **vuelta** es un encargo cerrado del director al agente. Este archivo lo mantiene
dirección; el agente no lo abre para escribir.

- El código `V-NNN` sube de uno en uno y **nunca se reutiliza**, ni aunque la vuelta se
  rechace: una vuelta rechazada es una vuelta gastada.
- **Solo puede haber una vuelta `entregada` a la vez.** Si hay dos, el ciclo se para.
- Al cerrarla, se tacha con `~~V-NNN · T-0XX~~` y el estado pasa a `cerrada — <veredicto>`.

## Dónde vamos ahora mismo

| Código | Estado | Qué hacer |
|---|---|---|
| ~~V-001 · T-001~~ | cerrada — completa | Esquema Prisma, migración inicial y semilla de datos |
| ~~V-002 · T-002~~ | cerrada — completa | Servicio de rutas migrado (BFS + fórmulas tarifarias) |
| ~~V-003 · T-003~~ | cerrada — completa | Endpoints públicos: topología, nodos, calcular, costo por tramo |
| ~~V-004 · T-004~~ | cerrada — rechazada | Autenticación del panel admin |
| ~~V-005 · T-004~~ | cerrada — rechazada | Corregir seguridad y aislamiento de pruebas de autenticación |
| ~~V-006 · T-004~~ | cerrada — completa | Corregir aislamiento y repetibilidad de las pruebas de autenticación |
| ~~V-007 · T-005~~ | cerrada — rechazada | CRUD admin de nodos, tramos, transportadores, estampillas y parámetros |
| ~~V-008 · T-005~~ | cerrada — rechazada | Corregir aislamiento, restaurar estampillas y completar pruebas CRUD |
| ~~V-009 · T-005~~ | cerrada — completa | Demostrar limpieza segura ante preparación CRUD incompleta |
| ~~V-010 · T-006~~ | cerrada — rechazada | Auditoría de cambios |
| ~~V-011 · T-006~~ | cerrada — rechazada | Corregir atomicidad y pruebas de auditoría |
| ~~V-012 · T-006~~ | cerrada — completa | Demostrar rollback HTTP y limpieza de auditoría en orden |
| ~~V-013 · T-007~~ | cerrada — completa | Contenedores Docker y despliegue reproducible |
| ~~V-014 · T-008~~ | cerrada — completa | Frontend: config.js y data.js contra la API |
| ~~V-015 · T-009~~ | cerrada — rechazada | Frontend: calculator.js contra POST /api/calcular, sin fallback local |
| ~~V-016 · T-009~~ | cerrada — rechazada | Corregir timeout y demostrar caída controlada del servicio de cálculo |
| ~~V-017 · T-009~~ | cerrada — rechazada | Retirar Playwright y completar la prueba manual de caída controlada |
| ~~V-018 · T-009~~ | cerrada — rechazada | Repetir sin caché la prueba manual de caída controlada |
| ~~V-019 · T-009~~ | cerrada — rechazada | Recuperar coordenadas y demostrar el flujo completo en navegador |
| ~~V-020 · T-009~~ | cerrada — rechazada | Corregir nulabilidad de coordenadas y retirar Playwright raíz |
| ~~V-021 · T-009~~ | cerrada — rechazada | Preparar guion de navegador para ejecución del usuario |
| ~~V-022 · T-009~~ | cerrada — completa | Auditar la caída controlada sin cálculo local |
| ~~V-023 · T-010~~ | cerrada — rechazada | Frontend: map.js contra topología y costo por tramo bajo demanda |
| ~~V-024 · T-010~~ | cerrada — completa | Corregir la capa de Conexión Especial y demostrar el mapa bajo demanda |
| ~~V-025 · T-011~~ | cerrada — rechazada | Sanear valores de API en los resultados |
| ~~V-026 · T-011~~ | cerrada — rechazada | Implementar y demostrar el saneamiento de resultados |
| ~~V-027 · T-011~~ | cerrada — rechazada | Demostrar el rojo de la regresión de saneamiento |
| ~~V-028 · T-011~~ | cerrada — rechazada | Entregar evidencia auditable del rojo de saneamiento |
| ~~V-029 · T-011~~ | cerrada — rechazada | Entregar una regresión de saneamiento reproducible |
| ~~V-030 · T-011~~ | cerrada — completa | Convertir la evidencia de saneamiento en una regresión efectiva |
| ~~V-031 · T-012~~ | cerrada — completa | Verificar compatibilidad responsive y funcionamiento del mapa |
| ~~V-032 · T-013~~ | cerrada — rechazada | Layout operativo con mapa siempre visible y hoja móvil |
| ~~V-033 · T-013~~ | cerrada — rechazada | Corregir el detalle móvil y demostrar el arrastre de la hoja |
| ~~V-034 · T-013~~ | cerrada — completa | Eliminar la carrera intermitente del modal de carga |
| ~~V-035 · T-014~~ | cerrada — rechazada | Sistema visual instrumental, tipografía y accesibilidad base |
| ~~V-036 · T-014~~ | cerrada — rechazada | Corregir aplicación real de paleta, cifras y foco |
| ~~V-037 · T-014~~ | cerrada — completa | Aplicar la paleta visual a mapa e insignias dinámicas |
| ~~V-038 · T-015~~ | cerrada — rechazada | Construir la regresión de basemap, encuadre y atenuación |
| ~~V-039 · T-015~~ | cerrada — completa | Corregir la identificación verificable de CARTO Positron |
| ~~V-040 · T-015~~ | cerrada — rechazada | Implementar basemap, encuadre y atenuación verificados |
| ~~V-041 · T-015~~ | cerrada — completa | Corregir la medición y clasificación de la red atenuada |
| ~~V-042 · T-015~~ | cerrada — completa | Corregir la atenuación y clasificación de la red en producción |
| ~~V-043 · T-015~~ | cerrada — rechazada | Dibujar la ruta secuencial por tramos con flujo direccional |
| ~~V-044 · T-015~~ | cerrada — completa | Retirar CARTO y verificar un basemap sin clave ni marca |
| ~~V-045 · T-015~~ | cerrada — completa | Completar sincronización y alternativa sin movimiento |
| ~~V-046 · T-016~~ | cerrada — rechazada | Exportar el cálculo visible a PDF y Excel |
| ~~V-047 · T-016~~ | cerrada — rechazada | Completar evidencia de exportación y validar segunda ruta sin datos rancios |
| ~~V-048 · T-016~~ | cerrada — completa | Demostrar ausencia de datos rancios en la segunda exportación |
| ~~V-049 · T-017~~ | cerrada — completa | URL compartible que reproduce un cálculo |
| ~~V-050 · T-018~~ | cerrada — completa | TRM automática con Banco de la República, fecha efectiva y fallback manual tras 3 días o error |
| ~~V-051 · T-019~~ | cerrada — rechazada | Comparación de dos rutas lado a lado |
| ~~V-052 · T-019~~ | cerrada — completa | Corregir deltas con TRM independiente y completar evidencia de comparación |
| ~~V-053 · T-020~~ | cerrada — completa | Estado de carga integrado con esqueleto |
| ~~V-054 · T-020~~ | cerrada — completa | Respetar prefers-reduced-motion en el esqueleto de carga |
| ~~V-055 · T-021~~ | cerrada — entrega parcial | Construir el estado inicial de escritorio y sustituirlo al calcular |
| ~~V-056 · T-021~~ | cerrada — entrega parcial | Completar estado inicial móvil: orden, hoja, controles y captura limpia |
| ~~V-057 · T-021~~ | cerrada — completa | Completar estado inicial sin arrastre y recuperarlo tras error |

## Historial

| Código | Veredicto | Resumen |
|---|---|---|
| V-001 · T-001 | cerrada — completa | Schema, seed y verificación creados; migración, seed y verificación ejecutados contra PostgreSQL vía Docker. T-001 completa. |
| V-002 · T-002 | cerrada — completa | Servicio de rutas con BFS y fórmula tarifaria migrado a Prisma; 14 tests de paridad contra js/calculator.js. T-002 completa. |
| V-003 · T-003 | cerrada — completa | Cuatro endpoints públicos auditados contra `geam-db` en `localhost:5433`; prueba focal 3/3, TypeScript sin errores y suite completa 17/17. T-003 completa con un hallazgo MENOR documental. |
| V-004 · T-004 | cerrada — rechazada | TypeScript pasa, pero la cookie no es segura por defecto, existe un secreto de sesión público de respaldo y la suite borra todos los intentos de login. T-004 sigue en progreso. |
| V-005 · T-004 | cerrada — rechazada | La prueba focal reproducida da 5/6: el correo inexistente acumula intentos sin limpiar y recibe 429; el control no demuestra supervivencia de una fila ajena de IntentoLogin. T-004 sigue en progreso. |
| V-006 · T-004 | cerrada — completa | Aislamiento y repetibilidad auditados: focal 6/6 dos veces, sesión 1/1, TypeScript limpio y suite 24/24. T-004 completa con aviso MENOR de handles abiertos en Jest. |
| V-007 · T-005 | cerrada — rechazada | La focal CRUD pasa, pero una limpieza con id potencialmente indefinido dejó 0/3 estampillas, la suite completa cae a 28/41 y faltan pruebas de autorización, CRUD completo y ausencia de escritura parcial. T-005 sigue en progreso. |
| V-008 · T-005 | cerrada — rechazada | Las verificaciones reproducidas pasan 63/63, pero el test de estampillas corre antes de `afterAll`, no simula preparación fallida y no aporta rojo ejecutado; no demuestra la limpieza que debía cubrir. T-005 sigue en progreso. |
| V-009 · T-005 | cerrada — completa | Limpieza ejercitable y segura auditada: seed 3/3 antes y después, CRUD 40/40, login 6/6, TypeScript limpio y suite 64/64. T-005 completa con aviso MENOR conocido de handles abiertos en Jest. |
| V-010 · T-006 | cerrada — rechazada | Las verificaciones pasan 78/78, pero la suite borra su control, no aporta rojo ejecutado, no demuestra exactamente un log para las 15 rutas y las mutaciones no son atómicas con la auditoría. T-006 sigue en progreso. |
| V-011 · T-006 | cerrada — rechazada | Atomicidad y suite 79/79 confirmadas, pero el rollback no afirma el estado HTTP y la fila de control se comprueba antes de limpiar los fixtures propios. T-006 sigue en progreso. |
| V-012 · T-006 | cerrada — completa | Rollback HTTP y limpieza auditados contra `geam-db`: focales 15/15, 40/40 y 6/6, TypeScript limpio y suite completa 79/79. T-006 completa con aviso MENOR conocido de handles abiertos en Jest. |
| V-013 · T-007 | cerrada — completa | Despliegue reproducible auditado: build, migración, semilla, reinicio, volumen, HTTP 200, imagen de producción y suite 79/79 verificados. T-007 completa con dos hallazgos MENORES documentales. |
| V-014 · T-008 | cerrada — completa | Carga de nodos y topología auditada contra el stack `geam`: 37 nodos, 36 tramos, HTTP 200, sin tarifas en `js/data.js` y prueba de interfaz confirmada. T-008 completa con un hallazgo MENOR documental. |
| V-015 · T-009 | cerrada — rechazada | El cálculo por API devuelve y muestra COP 7360.4539, pero con `backend` detenido el `fetch` queda pendiente más de 90 s: no aparece el aviso ni se deshabilita el botón. T-009 sigue en progreso; la regresión de `js/map.js` pasa a T-010. |
| V-016 · T-009 | cerrada — rechazada | El timeout, la sintaxis y el cálculo COP 7360.4539 se reprodujeron, pero se sustituyó el `GATE_UI_TEST` por Playwright, se atribuyó al usuario una constancia inexistente y se añadió una dependencia fuera de alcance. T-009 sigue en progreso. |
| V-017 · T-009 | cerrada — rechazada | Playwright quedó retirado y las verificaciones técnicas pasan, pero la constancia reporta el listado de destinos vacío y no ejecuta el cálculo ni la caída controlada. T-009 sigue en progreso y repetirá el gate sin caché. |
| V-018 · T-009 | cerrada — rechazada | La comprobación técnica pasa, pero la interfaz conserva la carrera de carga, destino vacío, mapa sin datos y favicon 404; además, la API tiene 37/37 nodos sin coordenadas. T-009 sigue en progreso con ampliación de alcance autorizada para V-019. |
| V-019 · T-009 | cerrada — rechazada | La interfaz y las verificaciones principales pasan, pero el seed no limpia coordenadas nulas en update, el verificador omite ese caso, no se contó lo realmente dibujado y persiste el node_modules raíz de Playwright. T-009 sigue en progreso. |
| V-020 · T-009 | cerrada — rechazada | Seed, nulabilidad, API, raíz limpia y suite 79/79 auditados; falta la evidencia ejecutada de 36 marcadores, 35 polilíneas, total y siete filas, y el agente modificó la instrucción reservada a dirección. T-009 sigue en progreso. |
| V-021 · T-009 | cerrada — rechazada | No se ejercitó T-009: el agente reescribió la instrucción reservada a dirección, prohibió generar el informe y volvió a pedir evidencia humana y criterios que ahora pertenecen a T-010. T-009 sigue en progreso. |
| V-022 · T-009 | cerrada — completa | Caída controlada acreditada por DOM: aviso visible, botón deshabilitado, un único POST fallido, ruta nula y cero errores no controlados; stack restaurado y raíz limpia. T-009 completa. |
| V-023 · T-010 | cerrada — rechazada | Backend, ids, seed y suite 80/80 pasan, pero faltó toda evidencia de navegador y `map.js` descarta las dos líneas de Conexión Especial al no tener capa; solo puede añadir 33 de las 35 polilíneas exigidas. T-010 sigue en progreso. |
| V-024 · T-010 | cerrada — completa | Capa de Conexión Especial y mapa bajo demanda auditados: rojo 33 y verde 35 polilíneas, 36 marcadores, costo pedido una vez al abrir popup, stack sano y suite 80/80. T-010 completa con aviso MENOR conocido de handles abiertos en Jest. |
| V-025 · T-011 | cerrada — rechazada | No se modificó `js/calculator.js`: persisten los sinks `innerHTML`; el agente reescribió la instrucción reservada a dirección y derivó al usuario evidencia DOM que debe producir él. T-011 sigue en progreso. |
| V-026 · T-011 | cerrada — rechazada | El saneamiento y el verde headless se reprodujeron, junto con 80/80 y el render normal, pero el informe reconoce que no existe la ejecución roja exigida. T-011 sigue en progreso. |
| V-027 · T-011 | cerrada — rechazada | Código seguro, sintaxis, stack y suite 80/80 confirmados; se rechaza porque el agente modificó `docs/instruccion.md` y eliminó la comprobación sin incluir fuente ni comando auditables para el rojo. T-011 sigue en progreso. |
| V-028 · T-011 | cerrada — rechazada | Código seguro, stack y suite 80/80 confirmados; se rechaza porque falta la fuente y el comando reproducible del rojo y el agente volvió a modificar `docs/instruccion.md`. T-011 sigue en progreso. |
| V-029 · T-011 | cerrada — rechazada | La salida roja y verde, el código seguro y la suite 80/80 se reprodujeron, pero la comprobación solo imprime resultados y no contiene aserciones capaces de fallar ante una regresión. T-011 sigue en progreso. |
| V-030 · T-011 | cerrada — completa | Regresión ejecutable reproducida: 5/5 mutaciones detectadas, canales seguros sin inyección, render real correcto y suite 80/80. T-011 completa; la reincidencia desde V-026 fue endurecimiento probatorio posterior al criterio funcional. |
| V-031 · T-012 | cerrada — completa | Responsive y mapa auditados en 375, 768 y 1280 px: DOM sin desbordamiento, 36 marcadores, 35 polilíneas, capas reversibles, ruta resaltada, constancia visual 8/8 y suite 80/80. T-012 completa con aviso MENOR conocido de handles abiertos en Jest. |
| V-032 · T-013 | cerrada — rechazada | Layout, stack y suite 80/80 verificados, pero Fijos/AOM desaparecen en móvil y la prueba de arrastre no demuestra ningún cambio de estado. T-013 sigue en progreso. |
| V-033 · T-013 | cerrada — rechazada | Detalle móvil, arrastre, layout y suite 80/80 verificados, pero una ejecución dejó el modal y backdrop activos más de 30 s: el cierre durante la transición de Bootstrap sigue siendo intermitente. T-013 continúa en progreso. |
| V-034 · T-013 | cerrada — completa | Carrera del modal corregida y auditada: 20/20 cargas rápidas sin residuos, detalle móvil y arrastres conservados, sintaxis limpia y suite 80/80. T-013 completa con el aviso MENOR conocido de handles abiertos en Jest. |
| V-035 · T-014 | cerrada — rechazada | Fuentes, tokens declarados y suite 80/80 pasan, pero la UI conserva colores antiguos de API y Bootstrap, los importes del reparto usan Sans y la fuente publicada no puede producir el verde declarado ni recorre el foco. T-014 sigue en progreso. |
| V-036 · T-014 | cerrada — rechazada | Fondo, cifras, foco y suite 80/80 pasan, pero las 35 líneas Leaflet y las insignias dinámicas conservan la paleta antigua; la comprobación no inspecciona el mapa y acepta insignias estáticas como sustituto. T-014 sigue en progreso. |
| V-037 · T-014 | cerrada — completa | Paleta visual auditada por separado en 35 líneas Leaflet, insignias dinámicas y estáticas y reparto; sintaxis limpia y suite 80/80. T-014 completa con dos hallazgos MENORES de repetibilidad del foco y handles abiertos de Jest. |
| V-038 · T-015 | cerrada — rechazada | Sintaxis y alcance correctos, pero el patrón no reconoce la URL canónica de CARTO Positron y la imagen cargada no se vincula al proveedor; T-015 sigue en progreso. |
| V-039 · T-015 | cerrada — completa | Contrato CARTO Positron auditado: URL canónica aceptada, OSM y `dark_all` rechazadas, respuestas e imágenes comparten filtro, sintaxis limpia y raíz sin dependencias. T-015 sigue en progreso. |
| V-040 · T-015 | cerrada — rechazada | CARTO y encuadre pasan, pero la doble opacidad deja la red al 6,25 % y el verificador omite `strokeOpacity` y clasifica los 35 tramos como ajenos. T-015 sigue en progreso. |
| V-041 · T-015 | cerrada — completa | Verificador auditado: mide opacidad visual combinada, exige una partición explícita entre ruta y red ajena, conserva CARTO/encuadre y deja la raíz limpia. T-015 sigue en progreso. |
| V-042 · T-015 | cerrada — completa | CARTO, encuadre y atenuación auditados por la ruta real: 28 respuestas CARTO, 35 tramos ajenos al 25 %, partición explícita, sintaxis limpia y raíz sin dependencias. T-015 sigue en progreso. |
| V-043 · T-015 | cerrada — rechazada | Ruta por tramos reproducida en verde, pero CARTO muestra «API KEY REQUIRED» y el comprobador lo acepta; además, el rojo falló por encuadre y no por ausencia de las capas nuevas. T-015 sigue en progreso. |
| V-044 · T-015 | cerrada — completa | OpenStreetMap y regresiones auditados por la ruta real: 28 respuestas OSM, cero CARTO, seis tramos y flujos, vuelo, encuadre y 35 tramos ajenos al 25 %. T-015 sigue en progreso. |
| V-045 · T-015 | cerrada — completa | Sincronización bidireccional, interruptor persistente y modo reducido auditados por el DOM real; T-015 completa con un hallazgo MENOR por faltar el rojo funcional aislado. |
| V-046 · T-016 | cerrada — rechazada | Exportaciones PDF/XLSX implementadas; dirección no pudo reproducir la prueba por falta de `playwright` y parsers, y T-016 sigue en progreso. |
| V-047 · T-016 | cerrada — rechazada | La prueba reproducida genera y lee las cuatro exportaciones, compara las dos respuestas y pasa sintaxis y raíz limpia, pero no afirma que PDF/XLSX de la segunda ruta excluyan explícitamente datos exclusivos de la primera; T-016 sigue en progreso. |
| V-048 · T-016 | cerrada — completa | Regresión negativa contra datos rancios auditada en PDF y XLSX de la segunda ruta; exportaciones completas, sintaxis y raíz limpia verificadas. Hallazgo MENOR de evidencia por no conservar rojo mutado explícito. T-016 completa. |
| V-049 · T-017 | cerrada — completa | URL compartible auditada con sintaxis limpia, stack `geam` identificado y constancia UI literal de los diez pasos. Hallazgo MENOR de evidencia: no se conserva la carpeta temporal de Playwright para repetir el headless. T-017 completa. |
| V-050 · T-018 | cerrada — completa | TRM oficial del Banco de la República, fecha efectiva, política de 3 días, errores concretos y sobrescritura manual auditados con sintaxis y prueba focal en verde. Hallazgo MENOR de evidencia por no conservar rojo mutado explícito. T-018 completa. |
| V-051 · T-019 | cerrada — rechazada | La sintaxis y el stack pasan, pero el delta USD por transportador usa solo la TRM de la segunda ruta y produce diferencias falsas cuando las TRM difieren. La prueba headless no es reproducible porque falta Playwright. T-019 sigue en progreso. |
| V-052 · T-019 | cerrada — completa | Delta USD por transportador corregido para usar la TRM de cada ruta; comprobador headless reproducido con dos peticiones, diferencias, recálculo aislado y alternancia móvil. Hallazgo MENOR de evidencia por dependencia temporal de Playwright. T-019 completa. |
| V-053 · T-020 | cerrada — completa | Criterios 1 a 3 del estado de carga auditados por navegador: esqueleto, aria-busy, resolución, error, ausencia de modal y navegación por teclado. Hallazgo MENOR de informe/evidencia: el comprobador no agota el timeout; T-020 sigue en progreso por el criterio 4. |
| V-054 · T-020 | cerrada — completa | Movimiento reducido auditado por navegador: esqueleto visible, aria-busy activo, duración de 1 ms y una iteración. Hallazgo MENOR de evidencia por comparación sin normalizar unidades CSS; T-020 completa. |
| V-055 · T-021 | cerrada — entrega parcial | Criterios 1 a 3 del estado inicial sustentados por el comprobador headless citado: visibilidad, proporción de escritorio y sustitución tras POST. Sintaxis y stack `geam` verificados. Hallazgo MENOR de evidencia por no conservar la carpeta temporal de Playwright; T-021 sigue en progreso. |
| V-056 · T-021 | cerrada — entrega parcial | Criterios 4 a 6 reproducidos en verde: formulario móvil visible, tamaños táctiles, mapa con área y ausencia de desbordamiento. Hallazgo MENOR de evidencia por faltar rojo y aserciones explícitas de orden y red completa; T-021 sigue en progreso. |
| V-057 · T-021 | cerrada — completa | Ausencia de asa y arrastre inicial, recuperación tras HTTP 500 y timeout real auditadas por navegador; sintaxis y raíz limpia verificadas. Hallazgo MENOR de evidencia porque el mock versionado aborta inmediatamente. T-021 completa y backlog agotado. |
