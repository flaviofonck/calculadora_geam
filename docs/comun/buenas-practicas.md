# Buenas prácticas aplicables — Calculadora GEAM

Mapeo entre el catálogo `best-practices/` (raíz del proyecto) y este desarrollo. **Vinculante en Fase 1**: antes de implementar una tarea listada abajo, leer el `PRACTICE.md` correspondiente y, si existe, su `SKILL.md`.

Ruta del catálogo: `best-practices/` respecto de este archivo.

---

## Cómo se usa

1. Localiza la tarea que vas a implementar en la columna "Tarea".
2. Lee el `PRACTICE.md` de la práctica asociada antes de escribir código.
3. Aplica su checklist de adopción.
4. En code review, verifica contra ese checklist.

Si una tarea no aparece aquí, no significa que ninguna práctica aplique: significa que
nadie la evaluó todavía. Antes de escribir `instruccion.md` para esa tarea, revisa si
alguna carpeta del catálogo aplica y añade la fila, o deja constancia explícita de que
no aplica en la sección 4.

---

## 1. Prácticas de aplicación obligatoria

_(vacío: rellénalo a medida que evalúes qué práctica del catálogo aplica a cada tarea de
la ruta crítica)_

| Práctica | Tarea | Por qué aplica aquí |
|---|---|---|
| _catálogo vacío_ | T-001 | No hay prácticas en `best-practices/` — el catálogo está vacío |

## 2. Prácticas para fases posteriores

_(vacío: prácticas que aplican pero no bloquean la fase actual)_

| Práctica | Fase | Aplicación |
|---|---|---|
| | | |

## 3. Prácticas transversales

_(vacío: prácticas de gobernanza-ia/ o tooling-y-automatizacion/ que aplican a todo el
proyecto, no a una tarea puntual — ej. control de versiones, revisión de código)_

## 4. Evaluadas y descartadas

_(vacío: prácticas del catálogo que se revisaron y no aplican a este proyecto, con el
motivo — para no volver a evaluarlas cada vez)_

| T-001 | — | Catálogo `best-practices/` no contiene archivos PRACTICE.md. No aplica ninguna práctica. |
| T-014 | — | Catálogo `best-practices/` no contiene archivos PRACTICE.md. No aplica ninguna práctica. |
| T-015 | — | Catálogo `best-practices/` no contiene archivos PRACTICE.md. No aplica ninguna práctica. |
| T-021 | — | Catálogo `best-practices/` no contiene archivos PRACTICE.md. No aplica ninguna práctica. |

---

_Generado por instalar.ps1 el 2026-09-03. El catálogo completo vive en `best-practices/`
en la raíz del repositorio; esta tabla es el mapeo específico de este proyecto._
| _catálogo vacío_ | T-002 | No hay prácticas en `best-practices/` — el catálogo está vacío |
| _catálogo vacío_ | T-003 | No hay prácticas en `best-practices/` — el catálogo está vacío |
| _catálogo vacío_ | T-004 | No hay prácticas en `best-practices/` — el catálogo está vacío |
| _catálogo vacío_ | T-005 | No hay prácticas en `best-practices/` — el catálogo está vacío |
| _catálogo vacío_ | T-006 | No hay prácticas en `best-practices/` — el catálogo está vacío |
| _catálogo vacío_ | T-007 | No hay prácticas en `best-practices/` — el catálogo está vacío |
| _catálogo vacío_ | T-008 | No hay prácticas en `best-practices/` — el catálogo está vacío |
| _catálogo vacío_ | T-009 | No hay prácticas en `best-practices/` — el catálogo está vacío |

---

## 5. Evidencia de navegador — vinculante

Cuando un criterio exija medir el DOM o el estado del mapa, el agente produce la evidencia
él mismo. Puede instalar Playwright y sus navegadores en una carpeta temporal fuera del
repositorio (`$env:TEMP`), ejecutar la comprobación desde ahí y borrarla al terminar.

La valla `external_directory: deny` de `opencode.jsonc` solo bloquea las herramientas de
archivo fuera del repositorio; no prueba que la ruta temporal sea inaccesible. Si la carpeta
existe y es escribible, el script transitorio se crea por consola (`mkdir`, heredoc o
`node -e`) y se ejecuta con `node`, porque `bash` está permitido. No se cambia esa valla ni se
declara bloqueo por el rechazo de una herramienta de edición externa.

El repositorio queda sin rastro: sin `package.json`, `package-lock.json` ni `node_modules`
en la raíz. `backend/node_modules` no se toca.

No se abre `GATE_UI_TEST` para nada que sea contable por DOM. El gate humano queda para lo
que exige juicio: si algo se ve mal, si un dato de negocio es correcto, si el resultado
tiene sentido. Una constancia humana ya dada no se vuelve a pedir: se cita, literal, con su
timestamp.

Motivo: T-009 acumuló siete vueltas y cinco `GATE_UI_TEST` porque la evidencia contable se
le pedía al usuario y la instrucción prohibía a la vez la única herramienta que podía
producirla. En V-018 el usuario dejó constancia de que no volvería a probar hasta recibir
evidencia propia del agente, y se le pidió dos veces más.
