const assert = require('node:assert/strict');

const APP_URL = 'http://127.0.0.1:8001/index.html';
const MOTION_MS = 600;
const MOTION_TOLERANCE_MS = 180;

function isOSMTileUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' &&
            (url.hostname === 'tile.openstreetmap.org' ||
                url.hostname.endsWith('.tile.openstreetmap.org')) &&
            url.pathname.endsWith('.png');
    } catch {
        return false;
    }
}

function isCARTOUrl(value) {
    try {
        const url = new URL(value);
        const domains = [
            ['carto', 'com'].join('.'),
            ['cartocdn', 'com'].join('.'),
        ];
        return domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    } catch {
        return false;
    }
}

function checkUrlContract() {
    const canonical = 'https://a.tile.openstreetmap.org/12/123/456.png';
    assert.equal(isOSMTileUrl(canonical), true);
    assert.equal(isOSMTileUrl('http://tile.openstreetmap.org/12/123/456.png'), false);
    assert.equal(isOSMTileUrl(`https://a.basemaps.${['cartocdn', 'com'].join('.')}/light_all/12/123/456.png`), false);
    console.log('V-044 contrato URL OSM HTTPS sin clave: OK');
}

function assertAround(value, expected, tolerance, message) {
    assert.ok(
        Math.abs(value - expected) <= tolerance,
        `${message}: esperaba ${expected} +/- ${tolerance}, recibí ${value}`
    );
}

function effectiveVisualOpacity(styles) {
    return styles.reduce((opacity, style) => opacity * style.opacity * style.strokeOpacity, 1);
}

function partitionSegments(segments) {
    const route = segments.filter(segment => segment.route === 'true');
    const foreign = segments.filter(segment => segment.route === 'false');
    assert.ok(route.length > 0, 'La colección no declara tramos de ruta');
    assert.ok(foreign.length > 0, 'La colección no declara tramos ajenos');
    assert.equal(route.length + foreign.length, segments.length,
        'Hay tramos sin clasificación explícita');
    return { route, foreign };
}

async function calculateCartagenaSebastopol(page) {
    await page.selectOption('#origen', { label: 'Cartagena' });
    await page.selectOption('#destino', { label: 'Sebastopol' });
    await page.locator('#calculatorForm').evaluate(form => form.requestSubmit());
    await page.waitForFunction(() => window.currentRoute?.path?.length === 7, null, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelectorAll('.ruta__tramo').length === 6, null, { timeout: 10000 });
}

async function checkRouteSynchronization(page) {
    const initial = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('.desglose__fila[data-route-from]')].map(row => ({
            from: row.dataset.routeFrom,
            to: row.dataset.routeTo,
            value: row.dataset.routeValue,
        })),
        segments: [...document.querySelectorAll('.ruta__tramo')].map(segment => ({
            from: segment.dataset.routeFrom,
            to: segment.dataset.routeTo,
        })),
    }));
    assert.equal(initial.rows.length, 6, 'El desglose no tiene seis filas de tramo');
    assert.deepEqual(initial.rows.map(row => [row.from, row.to]), initial.segments.map(segment => [segment.from, segment.to]),
        'Las filas y los tramos no tienen correspondencia uno a uno');
    assert.ok(initial.rows.every(row => row.value), 'Cada fila debe exponer el valor del tramo');

    const firstRow = page.locator('.desglose__fila').first();
    await firstRow.focus();
    await page.waitForFunction(() => document.querySelectorAll('.ruta__tramo--enfocado').length === 1);
    assert.equal(await page.locator('.ruta__tramo--enfocado').getAttribute('data-route-from'), initial.rows[0].from);
    assert.equal(await page.locator('.ruta__tramo--enfocado').getAttribute('data-route-to'), initial.rows[0].to);
    assert.ok((await page.locator('.leaflet-tooltip').allTextContents()).some(text => text.includes(initial.rows[0].value)),
        'El foco de la fila no muestra la etiqueta con el valor');

    await page.locator('.ruta__tramo').nth(3).dispatchEvent('mouseover');
    const hovered = await page.evaluate(() => [...document.querySelectorAll('.desglose__fila[data-route-from]')]
        .map(row => row.getAttribute('aria-current') === 'true'));
    assert.deepEqual(hovered, [false, false, false, true, false, false],
        'El puntero del tramo no marca solo su fila');
    await page.locator('.ruta__tramo').nth(3).dispatchEvent('mouseout');
    assert.equal(await page.locator('[aria-current="true"]').count(), 0, 'El estado no se limpia al salir del tramo');
}

async function checkMotionToggle(context) {
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#motionToggle'));
    const toggle = page.locator('#motionToggle');
    const before = await toggle.getAttribute('aria-pressed');
    await toggle.click();
    assert.notEqual(await toggle.getAttribute('aria-pressed'), before, 'El interruptor no cambia el estado accesible');
    const stored = await page.evaluate(() => sessionStorage.getItem('geam-motion-enabled'));
    assert.equal(stored, 'false', 'El estado pausado no se guardó en sessionStorage');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#motionToggle').getAttribute('aria-pressed'), 'false',
        'El estado no persiste al recargar la sesión');
    await page.close();
}

function checkShortContracts() {
    assert.throws(() => assertAround(
        effectiveVisualOpacity([{ opacity: 0.25, strokeOpacity: 0.25 }]), 0.25, 0.01,
    ));
    assertAround(
        effectiveVisualOpacity([{ opacity: 0.25, strokeOpacity: 1 }]), 0.25, 0.01,
        'Opacidad visual combinada',
    );
    assert.throws(() => partitionSegments(
        Array.from({ length: 35 }, () => ({ route: 'false' })),
    ));
    const partition = partitionSegments([{ route: 'true' }, { route: 'false' }]);
    assert.equal(partition.route.length, 1);
    assert.equal(partition.foreign.length, 1);
    console.log('V-041 contratos cortos: opacidad y partición OK');
}

async function main() {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const tileResponses = [];
    const cartoRequests = [];
    const page = await context.newPage();

    page.on('response', response => {
        if (isOSMTileUrl(response.url())) tileResponses.push(response);
        if (isCARTOUrl(response.url())) cartoRequests.push(response.url());
    });

    try {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            const origen = document.querySelector('#origen');
            const destino = document.querySelector('#destino');
            const map = document.querySelector('#map');
            return origen?.options.length > 1 && destino && map;
        });

        await page.waitForFunction(() => {
            return [...document.querySelectorAll('img.leaflet-tile')]
                .some(tile => tile.complete && tile.naturalWidth > 0);
        }, null, { timeout: 15000 });

        const loadedTiles = (await page.locator('img.leaflet-tile').evaluateAll(tiles => tiles
            .filter(tile => tile.complete && tile.naturalWidth > 0)
            .map(tile => ({ src: tile.src, naturalWidth: tile.naturalWidth })))
        ).filter(tile => isOSMTileUrl(tile.src));
        assert.ok(tileResponses.some(response => response.status() === 200),
            'No hubo una respuesta HTTP 200 de una tesela OSM');
        assert.ok(loadedTiles.length > 0 && loadedTiles.every(tile => tile.naturalWidth > 0),
            'No hay una imagen img.leaflet-tile completa con naturalWidth > 0');
        assert.equal(cartoRequests.length, 0, 'Se solicitaron teselas CARTO');
        const documentText = await page.locator('body').innerText();
        assert.equal(documentText.includes('API KEY REQUIRED'), false,
            'El documento contiene API KEY REQUIRED');
        const apiKeyMarker = ['carto', 'com', 'basemaps', 'apikey'].join('.').replace('.basemaps.', '/basemaps/');
        assert.equal(await page.evaluate(marker => document.documentElement.outerHTML.includes(marker), apiKeyMarker), false,
            'El documento contiene la marca de clave del proveedor');

        const before = await page.evaluate(() => {
            const map = window.map || window.__GEAM_MAP__;
            if (!map) throw new Error('La aplicación no expone el mapa Leaflet observable');
            const center = map.getCenter();
            return { center: [center.lat, center.lng], zoom: map.getZoom() };
        });

        await page.evaluate(() => {
            const map = window.map || window.__GEAM_MAP__;
            if (!map) throw new Error('La aplicación no expone el mapa Leaflet observable');
            window.__t015Motion = { startedAt: null, endedAt: null, duration: null };
            window.__t015SecondaryDuring = [];
            const effectiveOpacity = element => {
                let opacity = 1;
                for (let current = element; current; current = current.parentElement) {
                    const styles = getComputedStyle(current);
                    const elementOpacity = Number.parseFloat(styles.opacity);
                    const strokeOpacity = Number.parseFloat(styles.strokeOpacity);
                    opacity *= (Number.isFinite(elementOpacity) ? elementOpacity : 1) *
                        (Number.isFinite(strokeOpacity) ? strokeOpacity : 1);
                }
                return opacity;
            };
            let sampleTimer;
            map.once('movestart', () => {
                window.__t015Motion.startedAt = performance.now();
                sampleTimer = setInterval(() => {
                    const segments = [...document.querySelectorAll('[data-network-segment]')];
                    const route = segments.filter(element => element.getAttribute('data-route-segment') === 'true');
                    const secondary = segments.filter(element => element.getAttribute('data-route-segment') === 'false');
                    if (route.length && secondary.length && route.length + secondary.length === segments.length) {
                        window.__t015SecondaryDuring = secondary.map(effectiveOpacity);
                    }
                }, 50);
            });
            map.once('moveend', () => {
                clearInterval(sampleTimer);
                window.__t015Motion.endedAt = performance.now();
                window.__t015Motion.duration = window.__t015Motion.endedAt - window.__t015Motion.startedAt;
            });
        });

        await page.selectOption('#origen', { label: 'Cartagena' });
        await page.selectOption('#destino', { label: 'Sebastopol' });
        await page.locator('#calculatorForm').evaluate(form => form.requestSubmit());

        await page.waitForFunction(() => window.__t015Motion?.duration !== null, null, { timeout: 10000 });
        const after = await page.evaluate(() => {
            const map = window.map || window.__GEAM_MAP__;
            const center = map.getCenter();
            const route = window.currentRoute;
            const nodes = window.TOPOLOGIA_NODOS || [];
            const endpoint = name => {
                const node = nodes.find(item => item.nombre === name);
                return node && node.lat != null && node.lon != null ? [node.lat, node.lon] : null;
            };
            const effectiveOpacity = element => {
                let opacity = 1;
                for (let current = element; current; current = current.parentElement) {
                    const styles = getComputedStyle(current);
                    const elementOpacity = Number.parseFloat(styles.opacity);
                    const strokeOpacity = Number.parseFloat(styles.strokeOpacity);
                    opacity *= (Number.isFinite(elementOpacity) ? elementOpacity : 1) *
                        (Number.isFinite(strokeOpacity) ? strokeOpacity : 1);
                }
                return opacity;
            };
            const segments = [...document.querySelectorAll('[data-network-segment]')];
            const routeSegments = segments.filter(element => element.getAttribute('data-route-segment') === 'true');
            const secondary = segments.filter(element => element.getAttribute('data-route-segment') === 'false');
            if (!routeSegments.length || !secondary.length || routeSegments.length + secondary.length !== segments.length) {
                throw new Error('La red observable no tiene una partición explícita entre ruta y tramos ajenos');
            }
            const secondaryDuring = window.__t015SecondaryDuring || [];
            const secondaryAfter = secondary.map(element => effectiveOpacity(element));
            const routeLayers = [...document.querySelectorAll('.ruta__tramo')].map(element => ({
                from: element.getAttribute('data-route-from'),
                to: element.getAttribute('data-route-to'),
                color: getComputedStyle(element).stroke,
                delay: getComputedStyle(element).animationDelay,
                pathLength: element.getAttribute('pathLength'),
            }));
            const flowLayers = [...document.querySelectorAll('.ruta__flujo')].map(element => ({
                color: getComputedStyle(element).stroke,
                dashArray: getComputedStyle(element).strokeDasharray,
                dashOffset: getComputedStyle(element).strokeDashoffset,
            }));
            const cssColor = value => {
                const probe = document.createElement('span');
                probe.style.color = value;
                document.body.appendChild(probe);
                const color = getComputedStyle(probe).color;
                probe.remove();
                return color;
            };
            const routeColors = afterRoute => afterRoute.path.slice(0, -1).map((from, index) => {
                const to = afterRoute.path[index + 1];
                const item = window.NETWORK_DATA.find(segment =>
                    (segment.Origen === from && segment.Destino === to) ||
                    (segment.Origen === to && segment.Destino === from));
                return cssColor(window.TRANSPORTADOR_COLORS[item.Transportador]);
            });
            const bounds = map.getBounds();
            return {
                center: [center.lat, center.lng],
                zoom: map.getZoom(),
                duration: window.__t015Motion.duration,
                containsOrigin: bounds.contains(endpoint('Cartagena')),
                containsDestination: bounds.contains(endpoint('Sebastopol')),
                secondaryCount: secondary.length,
                secondaryDuring,
                secondaryAfter,
                route,
                routeLayers,
                flowLayers,
                routeColors: routeColors(route),
            };
        });

        assert.notDeepEqual(after.center, before.center, 'El centro del mapa no cambió');
        assert.notEqual(after.zoom, before.zoom, 'El zoom del mapa no cambió');
        assertAround(after.duration, MOTION_MS, MOTION_TOLERANCE_MS, 'Duración del movimiento');
        assert.equal(after.containsOrigin, true, 'El encuadre final no contiene Cartagena');
        assert.equal(after.containsDestination, true, 'El encuadre final no contiene Sebastopol');
        assert.ok(after.route?.path?.length > 1, 'El cálculo no produjo una ruta con extremos');
        assert.ok(after.secondaryCount > 0, 'No se encontraron tramos de red ajenos a la ruta');
        assert.ok(after.secondaryDuring.length === after.secondaryCount &&
            after.secondaryDuring.every(opacity => Math.abs(opacity - 0.25) < 0.01),
        'Durante el encuadre, algún tramo ajeno no mantuvo opacidad efectiva 0.25');
        assert.ok(after.secondaryAfter.every(opacity => Math.abs(opacity - 0.25) < 0.01),
            'Después del encuadre, algún tramo ajeno no mantuvo opacidad efectiva 0.25');
        assert.equal(after.routeLayers.length, 6,
            'La ruta calculada no tiene exactamente seis capas .ruta__tramo');
        assert.deepEqual(
            after.routeLayers.map(segment => [segment.from, segment.to]),
            after.route.path.slice(0, -1).map((from, index) => [from, after.route.path[index + 1]]),
            'Las capas .ruta__tramo no siguen el orden origen→destino');
        assert.ok(after.routeLayers.every(segment => segment.pathLength === '1'),
            'Cada .ruta__tramo debe normalizar su pathLength a 1');
        assert.deepEqual(
            after.routeLayers.map(segment => segment.color),
            after.routeColors,
            'Las capas .ruta__tramo no usan el color de su transportador',
        );
        const delays = after.routeLayers.map(segment => {
            const delay = segment.delay.trim();
            const value = Number.parseFloat(delay);
            return delay.endsWith('s') && !delay.endsWith('ms') ? value * 1000 : value;
        });
        assert.ok(delays.every((delay, index) => index === 0 ||
            Math.abs(delay - delays[index - 1] - 160) <= 50),
        'Los comienzos de dibujo no están separados por 160 +/- 50 ms');
        assert.equal(after.flowLayers.length, 6,
            'Debe existir una capa .ruta__flujo por cada tramo');
        assert.ok(after.flowLayers.every(flow => flow.color === 'rgb(255, 255, 255)' &&
            flow.dashArray !== 'none'),
        'El flujo debe ser blanco y discontinuo');

        await checkRouteSynchronization(page);
        await checkMotionToggle(context);

        console.log(`V-043 ruta secuencial: ${after.routeLayers.length} tramos, ${after.flowLayers.length} flujos, retardos ${delays.join(', ')} ms`);
        console.log(`V-044 OSM/encuadre: ${tileResponses.length} respuestas OSM observadas, ${cartoRequests.length} solicitudes CARTO, ${after.secondaryCount} tramos ajenos al 25 %`);

        const reducedContext = await browser.newContext({ reducedMotion: 'reduce' });
        const reducedPage = await reducedContext.newPage();
        await reducedPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await reducedPage.waitForFunction(() => window.__GEAM_MAP__ && document.querySelector('#origen')?.options.length > 1);
        await reducedPage.evaluate(() => {
            const map = window.__GEAM_MAP__;
            window.__t015FlyCalls = 0;
            const flyToBounds = map.flyToBounds.bind(map);
            map.flyToBounds = (...args) => { window.__t015FlyCalls++; return flyToBounds(...args); };
        });
        await calculateCartagenaSebastopol(reducedPage);
        const reduced = await reducedPage.evaluate(() => [...document.querySelectorAll('.ruta__tramo, .ruta__flujo')].map(element => ({
            className: element.getAttribute('class'),
            animationName: getComputedStyle(element).animationName,
            dashOffset: getComputedStyle(element).strokeDashoffset,
        })));
        assert.equal(await reducedPage.evaluate(() => window.__t015FlyCalls), 0, 'El modo reducido ejecutó vuelo Leaflet');
        assert.equal(reduced.filter(item => item.className.includes('ruta__tramo')).length, 6);
        assert.equal(reduced.filter(item => item.className.includes('ruta__flujo')).length, 6);
        assert.ok(reduced.every(item => item.animationName === 'none' && Number.parseFloat(item.dashOffset) === 0),
            'El modo reducido no dejó la ruta completa y sin animaciones');
        await checkRouteSynchronization(reducedPage);
        await reducedContext.close();
        console.log('V-045 sincronización, interruptor persistente y reduced-motion: OK');
    } finally {
        await browser.close();
    }
}

if (process.argv.includes('--short-contract')) {
    checkShortContracts();
} else if (process.argv.includes('--check-url-contract')) {
    checkUrlContract();
} else {
    main().catch(error => {
        console.error(error.stack || error.message);
        process.exitCode = 1;
    });
}
