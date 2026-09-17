# V-057 · T-021 — Completar estado inicial sin arrastre y recuperarlo tras error

Esta vuelta cubre únicamente los criterios 7 y 8 de T-021. Lee la tarea completa en `C:\Users\flavi\OneDrive\Proyectos\Personales\calculadora_geam\docs\fase-1\tareas.md`, la continuidad en `C:\Users\flavi\OneDrive\Proyectos\Personales\calculadora_geam\docs\fase-1\estado-implementacion.md` y las prácticas en `C:\Users\flavi\OneDrive\Proyectos\Personales\calculadora_geam\docs\comun\buenas-practicas.md`.

## Qué hay que hacer

1. Antes del primer cálculo, retira del DOM móvil el asa y cualquier control de arrastre de la hoja, y evita que un gesto de arrastre sobre el formulario cambie su alto.
2. Si el primer cálculo falla por error HTTP, red o timeout, restaura el estado inicial y conserva visible el mensaje de error existente, sin mostrar resultados vacíos.

## Done when

- A 390 × 844, una prueba headless en contexto limpio confirma que antes del primer cálculo no existe `.sheet-handle` ni otro control con nombre de arrastre, y que un arrastre vertical sobre la hoja no cambia su alto.
- La misma prueba provoca por separado un error HTTP y un timeout sin resultado previo y confirma en ambos casos: estado inicial visible, mensaje de error visible, `#resultsCard` oculto y ningún resultado previo o vacío mostrado.

## Cómo se verifica

- Desde `C:\Users\flavi\OneDrive\Proyectos\Personales\calculadora_geam`, ejecuta `docker compose ls` y continúa solo si el proyecto propio es `geam`.
- Amplía `C:\Users\flavi\OneDrive\Proyectos\Personales\calculadora_geam\tests\t021-initial-state-check.js` para entrar por la página servida y cubrir ambos criterios por el DOM real. Conserva y vuelve a ejecutar las comprobaciones de V-055 y V-056.
- Ejecuta la comprobación nueva primero en rojo contra el comportamiento anterior y después en verde; pega ambas salidas literales en `C:\Users\flavi\OneDrive\Proyectos\Personales\calculadora_geam\docs\result.md` y afirma el rechazo concreto, no cualquier excepción.
- Puedes usar Playwright desde una carpeta temporal bajo `C:\Users\flavi\AppData\Local\Temp\opencode`, mediante `NODE_PATH`, sin instalar nada en la raíz.
- Ejecuta `node --check "js\\calculator.js"` y `node --check "tests\\t021-initial-state-check.js"`.
- Comprueba `Test-Path package.json`, `Test-Path package-lock.json`, `Test-Path node_modules` como `False` y `Test-Path backend\\node_modules` como `True`.

## Fuera de alcance

- No cambies el arrastre ni el control de la hoja después de un cálculo exitoso.
- No cambies el timeout de red, backend, fórmulas, tarifas, autenticación, exportaciones, TRM, mapa calculado, URL compartible, comparación de rutas ni estado de carga de T-020.
- No añadas dependencias a la raíz ni ejecutes migraciones, semillas, restauraciones, scripts destructivos, operaciones destructivas de Docker u operaciones de git.
