const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const okResponse = {
    detalles: [{ Tramo: 'Cartagena - Sebastopol', Transportador: 'TGI', Fijos: 25, Variables: 50, AOM: 25, 'Total Tramo': 100 }],
    transportadores: ['TGI'],
    totales: { cop: 100, usd: 0.03 },
    estadisticas: { segmentos: 1, transportadores: 1 },
};

let postCount = 0;

const server = http.createServer((req, res) => {
    const file = req.url === '/' ? 'index.html' : req.url.slice(1);
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    const ct = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    res.writeHead(200, { 'Content-Type': ct });
    fs.createReadStream(filePath).pipe(res);
});

async function setupRouteForOk(page) {
    await page.route('**/api/**', async route => {
        const request = route.request();
        if (request.url().endsWith('/nodos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: ['Cartagena', 'Sebastopol', 'Medellin'] }) });
        if (request.url().endsWith('/topologia')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [], tramos: [] }) });
        if (request.method() === 'POST' && request.url().endsWith('/calcular')) {
            postCount++;
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify(okResponse) });
        }
        return route.fulfill({ contentType: 'application/json', body: '{}' });
    });
}

async function waitForReady(page) {
    await page.evaluate(() => { window.TRM_API_URL = 'data:,[]'; });
    await page.waitForFunction(() => typeof window.handleCalculation === 'function');
    await page.waitForFunction(() => document.getElementById('origen').options.length > 1);
}

async function triggerCalculation(page) {
    await page.evaluate(() => { document.getElementById('dolar').value = '4000'; window.handleTrmInput(); });
    await page.selectOption('#origen', { label: 'Cartagena' });
    await page.waitForFunction(() => document.getElementById('destino').options.length > 1);
    await page.selectOption('#destino', { label: 'Sebastopol' });
    await page.evaluate(() => handleCalculation({ preventDefault: () => {} }, 1));
}

(async () => {
    await new Promise(resolve => server.listen(8124, resolve));
    const browser = await chromium.launch({ headless: true });

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await setupRouteForOk(mobilePage);
    await mobilePage.goto('http://127.0.0.1:8124/');
    await waitForReady(mobilePage);

    assert.equal(postCount, 0, 'mobile: no POST before calculation');

    const overflow390 = await mobilePage.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }));
    assert.ok(overflow390.scrollWidth <= overflow390.clientWidth,
        `mobile: no horizontal overflow, scrollWidth=${overflow390.scrollWidth} clientWidth=${overflow390.clientWidth}`);

    const ghostMobile = await mobilePage.evaluate(() => {
        const el = document.getElementById('initialState');
        if (!el) return { exists: false };
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return { exists: true, display: cs.display, visibility: cs.visibility, height: rect.height, width: rect.width };
    });
    const ghostHiddenMobile = !ghostMobile.exists
        || ghostMobile.display === 'none'
        || ghostMobile.visibility === 'hidden'
        || (ghostMobile.height === 0 && ghostMobile.width === 0);
    assert.ok(ghostHiddenMobile, `mobile: ghost hidden, got display=${ghostMobile.display} h=${ghostMobile.height} w=${ghostMobile.width}`);

    const formFieldsMobile = await mobilePage.evaluate(() => {
        const origen = document.getElementById('origen');
        const destino = document.getElementById('destino');
        const porcentaje = document.getElementById('porcentaje');
        const dolar = document.getElementById('dolar');
        const btn = document.querySelector('#calculatorForm button[type="submit"]');
        return {
            origenRect: origen.getBoundingClientRect(),
            destinoRect: destino.getBoundingClientRect(),
            porcentajeRect: porcentaje.getBoundingClientRect(),
            dolarRect: dolar.getBoundingClientRect(),
            btnRect: btn.getBoundingClientRect(),
            viewportHeight: window.innerHeight,
        };
    });

    assert.ok(formFieldsMobile.origenRect.height >= 48,
        `mobile: origen height >= 48px, got ${formFieldsMobile.origenRect.height}`);
    assert.ok(formFieldsMobile.destinoRect.height >= 48,
        `mobile: destino height >= 48px, got ${formFieldsMobile.destinoRect.height}`);
    assert.ok(formFieldsMobile.origenRect.top >= 0 && formFieldsMobile.origenRect.bottom <= formFieldsMobile.viewportHeight,
        `mobile: origen in viewport, top=${formFieldsMobile.origenRect.top} bottom=${formFieldsMobile.origenRect.bottom} vh=${formFieldsMobile.viewportHeight}`);
    assert.ok(formFieldsMobile.destinoRect.top >= 0 && formFieldsMobile.destinoRect.bottom <= formFieldsMobile.viewportHeight,
        `mobile: destino in viewport, top=${formFieldsMobile.destinoRect.top} bottom=${formFieldsMobile.destinoRect.bottom}`);
    assert.ok(formFieldsMobile.porcentajeRect.top >= 0 && formFieldsMobile.porcentajeRect.bottom <= formFieldsMobile.viewportHeight,
        `mobile: porcentaje in viewport, top=${formFieldsMobile.porcentajeRect.top} bottom=${formFieldsMobile.porcentajeRect.bottom}`);
    assert.ok(formFieldsMobile.dolarRect.top >= 0 && formFieldsMobile.dolarRect.bottom <= formFieldsMobile.viewportHeight,
        `mobile: dolar in viewport, top=${formFieldsMobile.dolarRect.top} bottom=${formFieldsMobile.dolarRect.bottom}`);
    assert.ok(formFieldsMobile.btnRect.top >= 0 && formFieldsMobile.btnRect.bottom <= formFieldsMobile.viewportHeight,
        `mobile: submit button in viewport, top=${formFieldsMobile.btnRect.top} bottom=${formFieldsMobile.btnRect.bottom}`);

    const touchTargets = await mobilePage.evaluate(() => {
        const selectors = ['#origen', '#destino', '#porcentaje', '#dolar', '#calculatorForm button[type="submit"]'];
        return selectors.map(sel => {
            const el = document.querySelector(sel);
            if (!el) return { sel, w: 0, h: 0 };
            const r = el.getBoundingClientRect();
            return { sel, w: r.width, h: r.height };
        });
    });
    for (const t of touchTargets) {
        assert.ok(t.w >= 44 && t.h >= 44,
            `mobile: ${t.sel} >= 44x44, got ${Math.round(t.w)}x${Math.round(t.h)}`);
    }

    const mapVisible = await mobilePage.evaluate(() => {
        const map = document.getElementById('map');
        if (!map) return { exists: false };
        const r = map.getBoundingClientRect();
        return { exists: true, height: r.height, width: r.width, top: r.top };
    });
    assert.ok(mapVisible.exists && mapVisible.height > 0 && mapVisible.width > 0,
        `mobile: map visible, h=${mapVisible.height} w=${mapVisible.width}`);

    const noHandleBeforeCalc = await mobilePage.evaluate(() => {
        const handle = document.querySelector('.sheet-handle');
        const dragControls = document.querySelectorAll('[aria-label*="rrastr" i]');
        return { handleExists: !!handle, dragControlCount: dragControls.length };
    });
    assert.ok(!noHandleBeforeCalc.handleExists,
        'mobile: no .sheet-handle before first calculation');
    assert.equal(noHandleBeforeCalc.dragControlCount, 0,
        'mobile: no drag controls before first calculation');

    const sheetHeightBeforeDrag = await mobilePage.evaluate(() => {
        const centro = document.querySelector('.centro');
        return centro.getBoundingClientRect().height;
    });
    await mobilePage.evaluate(() => {
        const centro = document.querySelector('.centro');
        const rect = centro.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const opts = { bubbles: true, cancelable: true };
        centro.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: startX, clientY: startY, pointerId: 1 }));
        centro.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: startX, clientY: startY - 100, pointerId: 1 }));
        centro.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: startX, clientY: startY - 100, pointerId: 1 }));
    });
    const sheetHeightAfterDrag = await mobilePage.evaluate(() => {
        const centro = document.querySelector('.centro');
        return centro.getBoundingClientRect().height;
    });
    assert.equal(sheetHeightBeforeDrag, sheetHeightAfterDrag,
        `mobile: drag does not change sheet height, before=${sheetHeightBeforeDrag} after=${sheetHeightAfterDrag}`);

    await mobileContext.close();

    const httpErrorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const httpErrorPage = await httpErrorContext.newPage();
    await httpErrorPage.route('**/api/**', async route => {
        const request = route.request();
        if (request.url().endsWith('/nodos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: ['Cartagena', 'Sebastopol', 'Medellin'] }) });
        if (request.url().endsWith('/topologia')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [], tramos: [] }) });
        if (request.method() === 'POST' && request.url().endsWith('/calcular')) {
            return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) });
        }
        return route.fulfill({ contentType: 'application/json', body: '{}' });
    });
    await httpErrorPage.goto('http://127.0.0.1:8124/');
    await waitForReady(httpErrorPage);
    await triggerCalculation(httpErrorPage);
    await httpErrorPage.waitForFunction(() => {
        const alerts = document.querySelectorAll('.alert');
        return alerts.length > 0;
    }, { timeout: 10000 });

    const httpErrorState = await httpErrorPage.evaluate(() => {
        const initial = document.getElementById('initialState');
        const resultsCard = document.getElementById('resultsCard');
        const alerts = document.querySelectorAll('.alert');
        const comparisonColumns = document.querySelector('.comparison-columns');
        const hasContent = comparisonColumns && comparisonColumns.children.length > 0;
        const form = document.getElementById('calculatorForm');
        const formVisible = form && form.getBoundingClientRect().height > 0;
        const isMobile = window.innerWidth <= 768;
        const initialOk = isMobile
            ? (!initial.hidden)
            : (!initial.hidden && getComputedStyle(initial).display !== 'none' && initial.getBoundingClientRect().height > 0);
        return {
            initialVisible: initialOk,
            formVisible,
            resultsCardHidden: resultsCard.style.display === 'none',
            errorVisible: alerts.length > 0,
            errorText: alerts.length > 0 ? alerts[alerts.length - 1].textContent : '',
            hasResultsContent: hasContent,
        };
    });
    assert.ok(httpErrorState.initialVisible, 'HTTP error: initial state not marked hidden');
    assert.ok(httpErrorState.formVisible, 'HTTP error: form still visible');
    assert.ok(httpErrorState.resultsCardHidden, 'HTTP error: #resultsCard hidden');
    assert.ok(httpErrorState.errorVisible, 'HTTP error: error message visible');
    assert.ok(/no disponible|error|calcul/i.test(httpErrorState.errorText),
        `HTTP error: error message mentions failure, got "${httpErrorState.errorText}"`);
    assert.ok(!httpErrorState.hasResultsContent, 'HTTP error: no results content shown');
    await httpErrorContext.close();

    const timeoutContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const timeoutPage = await timeoutContext.newPage();
    await timeoutPage.route('**/api/**', async route => {
        const request = route.request();
        if (request.url().endsWith('/nodos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: ['Cartagena', 'Sebastopol', 'Medellin'] }) });
        if (request.url().endsWith('/topologia')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [], tramos: [] }) });
        if (request.method() === 'POST' && request.url().endsWith('/calcular')) {
            return route.abort('timedout');
        }
        return route.fulfill({ contentType: 'application/json', body: '{}' });
    });
    await timeoutPage.goto('http://127.0.0.1:8124/');
    await waitForReady(timeoutPage);
    await triggerCalculation(timeoutPage);
    await timeoutPage.waitForFunction(() => {
        const alerts = document.querySelectorAll('.alert');
        return alerts.length > 0;
    }, { timeout: 15000 });

    const timeoutState = await timeoutPage.evaluate(() => {
        const initial = document.getElementById('initialState');
        const resultsCard = document.getElementById('resultsCard');
        const alerts = document.querySelectorAll('.alert');
        const comparisonColumns = document.querySelector('.comparison-columns');
        const hasContent = comparisonColumns && comparisonColumns.children.length > 0;
        const form = document.getElementById('calculatorForm');
        const formVisible = form && form.getBoundingClientRect().height > 0;
        const isMobile = window.innerWidth <= 768;
        const initialOk = isMobile
            ? (!initial.hidden)
            : (!initial.hidden && getComputedStyle(initial).display !== 'none' && initial.getBoundingClientRect().height > 0);
        return {
            initialVisible: initialOk,
            formVisible,
            resultsCardHidden: resultsCard.style.display === 'none',
            errorVisible: alerts.length > 0,
            errorText: alerts.length > 0 ? alerts[alerts.length - 1].textContent : '',
            hasResultsContent: hasContent,
        };
    });
    assert.ok(timeoutState.initialVisible, 'timeout: initial state not marked hidden');
    assert.ok(timeoutState.formVisible, 'timeout: form still visible');
    assert.ok(timeoutState.resultsCardHidden, 'timeout: #resultsCard hidden');
    assert.ok(timeoutState.errorVisible, 'timeout: error message visible');
    assert.ok(/no disponible|error|calcul|timeout/i.test(timeoutState.errorText),
        `timeout: error message mentions failure, got "${timeoutState.errorText}"`);
    assert.ok(!timeoutState.hasResultsContent, 'timeout: no results content shown');
    await timeoutContext.close();

    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 980 } });
    const page = await desktopContext.newPage();
    await setupRouteForOk(page);
    await page.goto('http://127.0.0.1:8124/');
    await waitForReady(page);

    const overflow1440 = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }));
    assert.ok(overflow1440.scrollWidth <= overflow1440.clientWidth,
        `desktop: no horizontal overflow, scrollWidth=${overflow1440.scrollWidth} clientWidth=${overflow1440.clientWidth}`);

    const initialExists = await page.locator('#initialState').count();
    assert.equal(initialExists, 1, 'desktop: #initialState exists');

    const initialVisible = await page.evaluate(() => {
        const el = document.getElementById('initialState');
        if (!el) return { exists: false };
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
            exists: true,
            displayNone: cs.display === 'none',
            visibilityHidden: cs.visibility === 'hidden',
            height: rect.height,
            width: rect.width,
            inCentralColumn: !!el.closest('.centro'),
        };
    });
    assert.ok(initialVisible.exists, 'desktop: #initialState exists');
    assert.ok(!initialVisible.displayNone, 'desktop: not display:none');
    assert.ok(!initialVisible.visibilityHidden, 'desktop: not visibility:hidden');
    assert.ok(initialVisible.height > 0, `desktop: has own height: ${initialVisible.height}`);
    assert.ok(initialVisible.inCentralColumn, 'desktop: inside .centro');

    const initialText = await page.locator('#initialState').textContent();
    assert.ok(/origen/i.test(initialText), 'desktop: mentions origen');
    assert.ok(/destino/i.test(initialText), 'desktop: mentions destino');

    const heightRatio = await page.evaluate(() => {
        const initial = document.getElementById('initialState');
        const centro = document.querySelector('.centro');
        return initial.getBoundingClientRect().height / centro.getBoundingClientRect().height;
    });
    assert.ok(heightRatio >= 0.5, `desktop: >= 50% of central column, got ${(heightRatio * 100).toFixed(1)}%`);

    await triggerCalculation(page);
    await page.waitForFunction(() => document.getElementById('resultsCard').style.display === 'block');

    const afterCalc = await page.evaluate(() => {
        const initial = document.getElementById('initialState');
        const resultsCard = document.getElementById('resultsCard');
        return {
            initialHidden: initial.hidden || getComputedStyle(initial).display === 'none',
            resultsVisible: resultsCard.style.display !== 'none' && resultsCard.offsetHeight > 0,
        };
    });
    assert.ok(afterCalc.initialHidden, 'desktop: initial hidden after calculation');
    assert.ok(afterCalc.resultsVisible, 'desktop: results visible after calculation');
    assert.ok(postCount >= 1, `desktop: at least 1 POST, got ${postCount}`);

    const handleAfterCalc = await page.evaluate(() => {
        const handle = document.querySelector('.sheet-handle');
        return { exists: !!handle };
    });
    assert.ok(handleAfterCalc.exists, 'desktop: .sheet-handle exists after successful calculation');

    await browser.close();
    server.close();
    console.log('T-021 initial state, no handle before calc, drag stability, HTTP error recovery, timeout recovery, desktop replacement: PASS');
})();
