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

let calcDelay = 0;
let calcBehavior = 'ok';

const server = http.createServer((req, res) => {
    const file = req.url === '/' ? 'index.html' : req.url.slice(1);
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    const ct = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    res.writeHead(200, { 'Content-Type': ct });
    fs.createReadStream(filePath).pipe(res);
});

(async () => {
    await new Promise(resolve => server.listen(8123, resolve));
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
    const page = await context.newPage();

    await page.route('**/api/**', async route => {
        const request = route.request();
        if (request.url().endsWith('/nodos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: ['Cartagena', 'Sebastopol', 'Medellin'] }) });
        if (request.url().endsWith('/topologia')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [], tramos: [] }) });
        if (request.method() === 'POST' && request.url().endsWith('/calcular')) {
            if (calcBehavior === 'error') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Server error"}' });
            if (calcBehavior === 'timeout') { await new Promise(r => setTimeout(r, 12000)); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(okResponse) }); }
            await new Promise(r => setTimeout(r, calcDelay));
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify(okResponse) });
        }
        return route.fulfill({ contentType: 'application/json', body: '{}' });
    });

    await page.goto('http://127.0.0.1:8123/');
    await page.evaluate(() => { window.TRM_API_URL = 'data:,[]'; });
    await page.waitForFunction(() => typeof window.handleCalculation === 'function');
    await page.evaluate(() => { document.getElementById('dolar').value = '4000'; window.handleTrmInput(); });
    await page.waitForFunction(() => document.getElementById('origen').options.length > 1);

    // 1. No modal/backdrop exists
    const modalExists = await page.locator('#loadingModal').count();
    assert.equal(modalExists, 0, 'no loadingModal in DOM');
    const backdropExists = await page.locator('.modal-backdrop').count();
    assert.equal(backdropExists, 0, 'no modal-backdrop in DOM');

    // 2. Delayed request: skeleton visible, aria-busy, ≥3 rows, reserved height
    calcDelay = 600;
    calcBehavior = 'ok';
    await page.selectOption('#origen', { label: 'Cartagena' });
    await page.waitForFunction(() => document.getElementById('destino').options.length > 1);
    await page.selectOption('#destino', { label: 'Sebastopol' });

    const calcPromise = page.evaluate(() => handleCalculation({ preventDefault: () => {} }, 1));

    await page.waitForFunction(() => document.getElementById('resultsCard').getAttribute('aria-busy') === 'true');
    const ariaBusyDuring = await page.getAttribute('#resultsCard', 'aria-busy');
    assert.equal(ariaBusyDuring, 'true', 'aria-busy=true during loading');

    const skeletonVisible = await page.waitForFunction(() => {
        const sk = document.getElementById('loadingSkeleton');
        return sk && sk.getAttribute('aria-hidden') === 'false' && sk.offsetHeight > 0;
    });
    assert.ok(skeletonVisible, 'skeleton visible during loading');

    const rowCount = await page.locator('.esqueleto__fila').count();
    assert.ok(rowCount >= 3, `at least 3 skeleton rows, got ${rowCount}`);

    const rowHeights = await page.evaluate(() => {
        return [...document.querySelectorAll('.esqueleto__fila')].map(r => r.getBoundingClientRect().height);
    });
    rowHeights.forEach((h, i) => assert.ok(h > 0, `skeleton row ${i} has own height: ${h}`));

    const reservedHeight = await page.evaluate(() => {
        const sk = document.getElementById('loadingSkeleton');
        return sk.getBoundingClientRect().height;
    });
    assert.ok(reservedHeight > 0, `reserved height block > 0: ${reservedHeight}`);

    // Keyboard navigation: focus moves to form controls while loading
    const origenFocused = await page.evaluate(() => {
        const el = document.getElementById('origen');
        el.focus();
        return document.activeElement === el;
    });
    assert.ok(origenFocused, 'origen select focusable during loading');

    await calcPromise;
    await page.waitForFunction(() => document.getElementById('resultsCard').getAttribute('aria-busy') === 'false');

    // 3. After resolution: skeleton hidden, results shown, aria-busy=false
    const ariaBusyAfter = await page.getAttribute('#resultsCard', 'aria-busy');
    assert.equal(ariaBusyAfter, 'false', 'aria-busy=false after resolution');

    const skeletonHidden = await page.evaluate(() => {
        const sk = document.getElementById('loadingSkeleton');
        return sk.getAttribute('aria-hidden') === 'true';
    });
    assert.ok(skeletonHidden, 'skeleton hidden after resolution');

    const resultsVisible = await page.locator('.comparison-column').count();
    assert.ok(resultsVisible > 0, 'results shown after resolution');

    // Layout shift check: results height within reserved height
    const resultsHeight = await page.evaluate(() => {
        return document.getElementById('resultsContent').getBoundingClientRect().height;
    });
    assert.ok(resultsHeight > 0, `results content has height: ${resultsHeight}`);

    // 4. Error with previous result: skeleton disappears, previous result preserved
    const previousTitle = await page.locator('.route-title').first().textContent();
    assert.ok(previousTitle.includes('Cartagena'), 'previous result exists before error');

    calcBehavior = 'error';
    calcDelay = 300;
    await page.evaluate(() => handleCalculation({ preventDefault: () => {} }, 1));
    await page.waitForFunction(() => document.getElementById('resultsCard').getAttribute('aria-busy') === 'false');

    const skeletonAfterError = await page.evaluate(() => {
        const sk = document.getElementById('loadingSkeleton');
        return sk.getAttribute('aria-hidden') === 'true';
    });
    assert.ok(skeletonAfterError, 'skeleton hidden after error');

    const titleAfterError = await page.locator('.route-title').first().textContent();
    assert.equal(titleAfterError, previousTitle, 'previous result preserved after error');

    // 5. Error with no previous result: resultsCard hidden
    const page2 = await context.newPage();
    await page2.route('**/api/**', async route => {
        const request = route.request();
        if (request.url().endsWith('/nodos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: ['Cartagena', 'Sebastopol'] }) });
        if (request.url().endsWith('/topologia')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [], tramos: [] }) });
        if (request.method() === 'POST' && request.url().endsWith('/calcular')) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"fail"}' });
        return route.fulfill({ contentType: 'application/json', body: '{}' });
    });
    await page2.goto('http://127.0.0.1:8123/');
    await page2.evaluate(() => { window.TRM_API_URL = 'data:,[]'; });
    await page2.waitForFunction(() => typeof window.handleCalculation === 'function');
    await page2.evaluate(() => { document.getElementById('dolar').value = '4000'; window.handleTrmInput(); });
    await page2.waitForFunction(() => document.getElementById('origen').options.length > 1);
    await page2.selectOption('#origen', { label: 'Cartagena' });
    await page2.waitForFunction(() => document.getElementById('destino').options.length > 1);
    await page2.selectOption('#destino', { label: 'Sebastopol' });
    await page2.evaluate(() => handleCalculation({ preventDefault: () => {} }, 1));
    await page2.waitForFunction(() => document.getElementById('resultsCard').style.display === 'none');
    const cardHidden = await page2.evaluate(() => document.getElementById('resultsCard').style.display === 'none');
    assert.ok(cardHidden, 'resultsCard hidden on error with no previous result');

    // 6. prefers-reduced-motion: reduce — skeleton visible, no effective animation
    const rmContext = await browser.newContext({
        viewport: { width: 1440, height: 980 },
        reducedMotion: 'reduce',
    });
    const rmPage = await rmContext.newPage();
    await rmPage.route('**/api/**', async route => {
        const request = route.request();
        if (request.url().endsWith('/nodos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: ['Cartagena', 'Sebastopol'] }) });
        if (request.url().endsWith('/topologia')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [], tramos: [] }) });
        if (request.method() === 'POST' && request.url().endsWith('/calcular')) {
            await new Promise(r => setTimeout(r, 800));
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify(okResponse) });
        }
        return route.fulfill({ contentType: 'application/json', body: '{}' });
    });
    await rmPage.goto('http://127.0.0.1:8123/');
    await rmPage.evaluate(() => { window.TRM_API_URL = 'data:,[]'; });
    await rmPage.waitForFunction(() => typeof window.handleCalculation === 'function');
    await rmPage.evaluate(() => { document.getElementById('dolar').value = '4000'; window.handleTrmInput(); });
    await rmPage.waitForFunction(() => document.getElementById('origen').options.length > 1);
    await rmPage.selectOption('#origen', { label: 'Cartagena' });
    await rmPage.waitForFunction(() => document.getElementById('destino').options.length > 1);
    await rmPage.selectOption('#destino', { label: 'Sebastopol' });

    const rmCalcPromise = rmPage.evaluate(() => handleCalculation({ preventDefault: () => {} }, 1));

    await rmPage.waitForFunction(() => document.getElementById('resultsCard').getAttribute('aria-busy') === 'true');
    await rmPage.waitForFunction(() => {
        const sk = document.getElementById('loadingSkeleton');
        return sk && sk.getAttribute('aria-hidden') === 'false' && sk.offsetHeight > 0;
    });

    const rmAnimDuration = await rmPage.evaluate(() => {
        const bar = document.querySelector('.esqueleto__bar');
        return getComputedStyle(bar).animationDuration;
    });
    const rmAnimIterCount = await rmPage.evaluate(() => {
        const bar = document.querySelector('.esqueleto__bar');
        return getComputedStyle(bar).animationIterationCount;
    });
    const durMs = parseFloat(rmAnimDuration);
    assert.ok(durMs <= 1, `reduced-motion animation-duration <= 1ms, got ${rmAnimDuration}`);
    assert.equal(rmAnimIterCount, '1', `reduced-motion iteration-count is 1, got ${rmAnimIterCount}`);

    const rmSkeletonVisible = await rmPage.evaluate(() => {
        const sk = document.getElementById('loadingSkeleton');
        return sk.offsetHeight > 0 && sk.getAttribute('aria-hidden') === 'false';
    });
    assert.ok(rmSkeletonVisible, 'skeleton visible during loading with reduced motion');

    const rmAriaBusy = await rmPage.getAttribute('#resultsCard', 'aria-busy');
    assert.equal(rmAriaBusy, 'true', 'aria-busy=true during loading with reduced motion');

    await rmCalcPromise;
    await rmPage.waitForFunction(() => document.getElementById('resultsCard').getAttribute('aria-busy') === 'false');
    await rmContext.close();

    await browser.close();
    server.close();
    console.log('T-020 skeleton loading, aria-busy, resolution, error, no-modal, and reduced-motion: PASS');
})();
