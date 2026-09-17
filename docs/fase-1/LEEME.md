# Backlog — Calculadora GEAM

Aquí se empieza a trabajar. **El orden de este archivo es el orden en que dirección
despacha las tareas.**

## Archivos de esta carpeta

| Archivo | Qué contiene |
|---|---|
| `docs/fase-1/tareas.md` | Las tareas ordenadas, con sus criterios de *Done when* |
| `docs/fase-1/estado-implementacion.json` | El estado de cada tarea. **La fuente** |
| `docs/fase-1/estado-implementacion.md` | La bitácora y la tabla Resumen (proyección del JSON) |
| `docs/fase-1/vueltas.md` | El registro de vueltas. Lo mantiene dirección |

## Orden de trabajo

1. **cimientos** (T-001, T-002) — sin el esquema en Postgres y el cálculo migrado no hay
   nada real que exponer por HTTP.
2. **api-publica** (T-003) — es el mínimo con el que el sistema ya sirve algo: un cliente
   puede calcular una ruta sin panel admin ni Docker todavía.
3. **auth-admin** (T-004, T-005, T-006) — depende del esquema (cimientos), no de la API
   pública; login, CRUD y auditoría van en ese orden porque el CRUD necesita sesión y la
   auditoría necesita que el CRUD ya escriba algo que auditar.
4. **despliegue** (T-007) — empaqueta backend + Postgres una vez que la API pública y el
   admin ya funcionan sueltos; empaquetar antes sería contenerizar algo a medio construir.
5. **consumo-api** (T-008, T-009, T-010) — el frontend solo puede probarse de verdad contra
   una API que ya existe (bloque api-publica).
6. **saneamiento** (T-011) — revisa el `innerHTML` de `calculator.js` una vez que ese
   archivo ya quedó reescrito para consumir la API (T-009).
7. **verificacion** (T-012) — cierre: confirma que nada de lo anterior rompió el responsive
   ni el mapa.

8. **marcado** (T-022 a T-025) — el CSS y el JS ya cumplen la referencia de diseño; el
   HTML no. Mientras `index.html` conserve las clases de Bootstrap, ninguna regla de la
   hoja nueva llega a verse. Va primero porque desbloquea a casi todas las demás.
9. **mapa** (T-026, T-027) — depende del marcado: la cabecera y los controles del mapa
   viven en el HTML que reescribe T-022. T-027 es diagnóstico, no obra nueva: la animación
   ya está escrita y no se ve.
10. **admin** (T-028, T-029) — el backend está terminado desde T-004 a T-006; lo que falta
    son pantallas. El acceso va antes que las tablas porque sin sesión no hay CRUD que
    probar.
11. **producto** (T-030) — la vista general de tramos se monta sobre el deslizador de
    capacidad que crea T-024.
12. **verificacion** (T-031) — cierre de la fase 4. Existe porque las tareas de la fase 3
    se cerraron una a una sin que su resultado llegara a la pantalla: aquí se comprueba el
    conjunto, midiendo efectos y no presencia de clases.

## Documentos de origen

- `specs/migracion-backend-node-postgres/requirements.md`
- `specs/migracion-backend-node-postgres/design.md`
- `specs/migracion-backend-node-postgres/tasks.md`

## Reglas del orden

- Una tarea no entra hasta que sus dependencias estén `completa`.
- Si el orden hay que cambiarlo, se cambia **aquí**, no en la cabeza de nadie.
- **Lo que una tarea necesita para correr va ANTES que ella.** Si alguna tarea
  toca base de datos, cola, caché o cualquier servicio, la tarea que levanta ese
  servicio —`docker-compose.yml` propio, volumen propio y puerto propio— entra
  primero. No al final, con el despliegue.

### Por qué esa última regla

La Calculadora GEAM puso el `docker-compose.yml` en T-007, dependiendo de T-003 y
T-006, pero T-001 ya necesitaba un Postgres vivo para migrar y sembrar. El
proyecto pasó tres tareas sin base propia.

Lo que hizo dirección fue lo razonable dentro de ese orden imposible: buscó un
Postgres, encontró el contenedor de OTRO proyecto escuchando en `localhost:5432`,
leyó sus credenciales y creó la base dentro de él. Funcionó durante tres vueltas.
Se rompió cuando el otro proyecto se apagó: la auditoría de T-003 no pudo correr
porque la base de este proyecto vivía en la máquina de un vecino.

Un backlog que pide construir sobre algo que aún no existe no obtiene una tarea
bloqueada. Obtiene un actor buscándose la vida, y lo que encuentre no lo elige el
backlog.

### Puertos

Cada proyecto publica en un puerto **distinto** del host, aunque dentro del
contenedor use el de siempre. Dos proyectos con el mismo puerto no conviven, y
entonces uno de los dos se acaba colgando del otro.
