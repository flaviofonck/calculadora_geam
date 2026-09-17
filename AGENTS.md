# Reglas de trabajo en este repositorio

Este archivo lo cargan solos los dos CLIs al abrir sesión con `cwd` en la raíz.
Lo que esté aquí se respeta aunque el briefing falle o alguien abra una sesión a mano.

## Reglas duras

1. **Ninguna operación de git.** Ni `commit`, ni `push`, ni `checkout`, ni `reset`. Los
   commits los hace una persona, mirando el diff.
2. **Ningún script destructivo sin constancia de respaldo.** Si un script borra, trunca o
   restaura datos, antes tiene que existir la constancia del respaldo en la vuelta.
3. **Edits mínimos y scope estricto.** Se toca lo pedido y nada más. Nada de refactorizar de
   paso, ni de "mejorar" lo que ya funciona.
4. **Las rutas se copian, no se teclean.** Tus herramientas exigen rutas absolutas. La tabla
   del briefing las trae ya montadas; para lo que no esté ahí, localízalo con `glob` o `grep`
   y copia la ruta que te devuelvan. **Nunca pegues la raíz del repositorio delante de una
   ruta relativa**: es de donde salen `…/com/` por `…/comun/`, la raíz repetida dos veces y la
   carpeta intermedia que se cae. Cada una cuesta la llamada entera.
5. **Un `apply_patch` por archivo, y anclado en líneas copiadas.** `apply_patch` compara
   líneas COMPLETAS y es todo o nada: si una sola ancla no encaja, se rechaza el parche entero
   —incluidos los cambios de los otros archivos que sí encajaban—. Antes de anclar en una
   línea, léela y cópiala literal; no la reconstruyas de memoria. Para reescribir un archivo
   entero usa `write`, no un parche.
6. **Ningún contenedor, volumen o base de datos que no sea de este proyecto.** El stack de
   este repositorio es el proyecto compose `geam`: contenedor `geam-db`, volumen
   `geam_geam-db-data`, puerto `5433` en el host. Solo se toca eso, y solo desde el
   `docker-compose.yml` de la raíz. Antes de ejecutar cualquier cosa contra Docker, comprueba
   con `docker compose ls` a qué proyecto pertenece lo que vas a tocar; si no empieza por
   `geam`, no es tuyo. Prohibido sin excepción: `docker compose down -v`, `docker system
   prune`, `docker volume rm`, `docker rm` y `docker stop` sobre cualquier contenedor ajeno.
   **`localhost:5432` NO es de este proyecto**: ahí vive el Postgres de Limite_legal. Las
   vueltas V-001, V-002 y V-003 corrieron migraciones y semillas dentro de esa base ajena por
   dar por bueno «el Postgres disponible»; no vuelve a pasar. Si necesitas una base y no la
   encuentras en `5433`, se reporta como bloqueo, no se toma prestada la del vecino.
7. **El stack se identifica, no se deduce.** El `docker-compose.yml` ya declara `name: geam`
   y `container_name: geam-db`. El servicio del backend que añade T-007 lleva su propio
   `container_name: geam-backend` y publica en `3000`; la base sigue en `5433`. Ningún puerto
   por defecto del host: `5432` es de Limite_legal y `27017` del ciclo. Los volúmenes que ya
   existan conservan su nombre real con `name:` + `external: true` — renombrar un volumen no
   lo mueve, crea uno vacío y deja los datos huérfanos. Y todo script se refiere a los
   servicios por su nombre de servicio (`db`, `backend`) vía `docker compose`, nunca por el
   nombre del contenedor.

## Los cinco archivos del ciclo

Cada uno tiene un único papel que lo escribe. Escribir el de otro rompe la reconciliación.

| Archivo | Lo escribe |
|---|---|
| `docs/instruccion.md` | director |
| `docs/result.md` | agente |
| `docs/fase-1/vueltas.md` | director |
| `docs/fase-1/estado-implementacion.md` | director |
| `docs/fase-1/estado-implementacion.json` | director |

El orquestador los **lee** y jamás los escribe: solo los copia al historial.

## Dónde está el detalle

No se copia aquí: lo que entra en este archivo se paga en cada sesión.

- `docs/PROMPT-DIRECTOR.md` — qué hace el director en su turno
- `docs/PROMPT-AGENTE.md` — qué hace el agente, y las reglas que sigue
- `docs/comun/buenas-practicas.md` — catálogo de prácticas del proyecto
