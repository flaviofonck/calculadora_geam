# V-057 · T-021 — Completar estado inicial sin arrastre y recuperarlo tras error

## Qué cambió
Se diferrió la creación del asa de arrastre (`.sheet-handle`) y sus listeners hasta después del primer cálculo exitoso, de modo que antes del primer cálculo no existe en el DOM móvil ningún control de arrastre ni un gesto de arrastre cambia el alto de la hoja. Se verificó que el manejo de errores existente (HTTP 500 y timeout/red) restaura correctamente el estado inicial y conserva visible el mensaje de error sin mostrar resultados vacíos.

## Archivos
- `js/calculator.js:563-610` — se extrajo la creación del asa y los listeners de `initializeResultsSheet()` a `createSheetHandle()`, llamada desde `displayResults()` con flag `sheetHandleCreated` para evitar duplicados
- `tests/t021-initial-state-check.js` — reescrito con contextos adicionales: móvil (ausencia de asa/arrastre, estabilidad de alto), HTTP 500 (estado inicial + error visible + resultsCard oculto), timeout/abort (mismas verificaciones), escritorio (criterios V-055 + asa presente tras cálculo)

## Done when
- Criterio 7 ✓ — prueba headless a 390 × 844 en contexto limpio confirma que antes del primer cálculo no existe `.sheet-handle` ni ningún control con nombre de arrastre (`[aria-label*="rrastr"]`), y que un gesto de arrastre vertical sobre `.centro` no cambia su alto (`getBoundingClientRect` antes y después: mismo valor)
- Criterio 8 ✓ — la misma prueba provoca por separado un error HTTP 500 y un timeout (abort de red) sin resultado previo y confirma en ambos casos: `#initialState` no marcado hidden, formulario visible, mensaje de error visible (alerta con texto que menciona fallo), `#resultsCard` con `display: none`, y `.comparison-columns` sin contenido

## Verificación

### Fase roja (código anterior, asa creada al cargar)
```
AssertionError [ERR_ASSERTION]: mobile: no .sheet-handle before first calculation
    at tests/t021-initial-state-check.js:144:12
```

### Fase verde (código corregido)
```
T-021 initial state, no handle before calc, drag stability, HTTP error recovery, timeout recovery, desktop replacement: PASS
```

### Comprobaciones obligatorias
```
docker compose ls → geam running(2)
node --check "js\calculator.js" → sin salida, código 0
node --check "tests\t021-initial-state-check.js" → sin salida, código 0
Test-Path package.json → False
Test-Path package-lock.json → False
Test-Path node_modules → False
Test-Path backend\node_modules → True
```

## Lo que NO verifiqué
- El asa y el arrastre después de un cálculo exitoso (fuera de alcance: "No cambies el arrastre ni el control de la hoja después de un cálculo exitoso"). Se confirma que el asa existe tras cálculo, pero no se ejercita el arrastre funcional.
- La recuperación tras error cuando ya existe un resultado previo (el código conserva el resultado anterior; solo restaura el estado inicial cuando no hay resultado previo).

## Decisiones no previstas en la especificación
- En móvil, el estado inicial (fantasma `#initialState`) tiene `display: none !important` por CSS (V-056). La verificación del criterio 8 en móvil comprueba que `#initialState` no está marcado `hidden` y que el formulario sigue visible, en lugar de exigir que el fantasma sea visible (que el CSS impide).

## Pendiente
- Auditoría de dirección para cerrar T-021.
