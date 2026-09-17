const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const responses = {
    'Cartagena|Sebastopol': { detalles: [{ Tramo: 'Cartagena - Sebastopol', Transportador: 'TGI', Fijos: 25, Variables: 50, AOM: 25, 'Total Tramo': 100 }], transportadores: ['TGI'], totales: { cop: 100, usd: 0.03 }, estadisticas: { segmentos: 1, transportadores: 1 } },
    'Sebastopol|Medellin': { detalles: [{ Tramo: 'Sebastopol - Medellin', Transportador: 'PROMIGAS', Fijos: 25, Variables: 50, AOM: 25, 'Total Tramo': 100 }], transportadores: ['PROMIGAS'], totales: { cop: 100, usd: 0.02 }, estadisticas: { segmentos: 1, transportadores: 1 } },
};

const server = http.createServer((req, res) => {
    const file = req.url === '/' ? 'index.html' : req.url.slice(1);
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : 'text/html' });
    fs.createReadStream(filePath).pipe(res);
});

(async () => {
    await new Promise(resolve => server.listen(8120, resolve));
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const requests = [];
    await page.route('**/api/**', async route => {
        const request = route.request();
        if (request.method() === 'POST' && request.url().endsWith('/calcular')) {
            const body = JSON.parse(request.postData());
            requests.push(body);
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify(responses[`${body.origen}|${body.destino}`]) });
        }
        if (request.url().endsWith('/nodos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [...new Set(Object.keys(responses).flatMap(key => key.split('|')))] }) });
        if (request.url().endsWith('/topologia')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ nodos: [], tramos: [] }) });
        return route.fulfill({ contentType: 'application/json', body: '{}' });
    });
    await page.goto('http://127.0.0.1:8120/');
    await page.evaluate(() => { window.TRM_API_URL = 'data:,[]'; });
    await page.waitForFunction(() => typeof window.handleCalculation === 'function');

    await page.evaluate(() => { document.getElementById('dolar').value = '4000'; window.handleTrmInput(); });
    await page.evaluate(() => { document.getElementById('dolar2').value = '5000'; });

    await page.waitForFunction(() => document.getElementById('origen').options.length > 1);
    await page.selectOption('#origen', { label: 'Cartagena' });
    await page.waitForFunction(() => document.getElementById('destino').options.length > 1);
    await page.selectOption('#destino', { label: 'Sebastopol' });
    await page.selectOption('#origen2', { label: 'Sebastopol' });
    await page.waitForFunction(() => document.getElementById('destino2').options.length > 1);
    await page.selectOption('#destino2', { label: 'Medellin' });

    await page.evaluate(() => handleCalculation({ preventDefault: () => {} }, 1));
    await page.waitForFunction(() => document.getElementById('resultsCard').getAttribute('aria-busy') === 'false');
    await page.evaluate(() => handleCalculation({ preventDefault: () => {} }, 2));
    await page.waitForFunction(() => document.getElementById('resultsCard').getAttribute('aria-busy') === 'false');

    await page.locator('[data-route-column="2"]').waitFor();
    assert.equal(requests.length, 2, 'two independent POST /api/calcular');
    assert.equal(requests[0].origen, 'Cartagena');
    assert.equal(requests[0].dolar, 4000, 'route 1 TRM = 4000');
    assert.equal(requests[1].origen, 'Sebastopol');
    assert.equal(requests[1].dolar, 5000, 'route 2 TRM = 5000');
    assert.equal(await page.locator('[data-route-column="1"] .route-title').textContent(), 'Cartagena → Sebastopol');
    assert.equal(await page.locator('[data-route-column="2"] .route-title').textContent(), 'Sebastopol → Medellin');
    assert.match(await page.locator('[data-route-column="1"]').textContent(), /\$100/);
    assert.match(await page.locator('[data-route-column="2"]').textContent(), /\$100/);

    const diffText = await page.locator('.route-differences').textContent();

    assert.match(diffText, /Total/, 'differences contain Total row');
    assert.match(diffText, /COP \$0,00/, 'Total COP delta = 100 - 100 = 0');
    assert.match(diffText, /TGI/, 'differences contain TGI row');
    assert.match(diffText, /PROMIGAS/, 'differences contain PROMIGAS row');

    const tgiUsdIndependent = (0 / 5000) - (100 / 4000);
    const tgiUsdOld = (0 - 100) / 5000;
    const tgiFormatted = Number(tgiUsdIndependent).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const tgiOldFormatted = Number(tgiUsdOld).toLocaleString('en-US', { maximumFractionDigits: 2 });
    assert.notEqual(tgiFormatted, tgiOldFormatted, 'test data must discriminate: new vs old TGI USD differ when formatted');
    assert.ok(diffText.includes(`USD ${tgiFormatted}`), `TGI USD delta uses independent TRMs: expected ${tgiFormatted}, got text: ${diffText}`);

    const promigasUsdIndependent = (100 / 5000) - (0 / 4000);
    const promigasFormatted = Number(promigasUsdIndependent).toLocaleString('en-US', { maximumFractionDigits: 2 });
    assert.ok(diffText.includes(`USD ${promigasFormatted}`), `PROMIGAS USD delta: ${promigasFormatted}`);

    assert.match(diffText, /-100,0 pp/, 'TGI percentage delta = 0 - 100 = -100 pp');
    assert.match(diffText, /100,0 pp/, 'PROMIGAS percentage delta = 100 - 0 = 100 pp');

    await page.selectOption('#origen2', { label: 'Cartagena' });
    await page.selectOption('#destino2', { label: 'Sebastopol' });
    await page.evaluate(() => handleCalculation({ preventDefault: () => {} }, 2));
    await page.waitForFunction(() => document.querySelector('[data-route-column="2"] .route-title')?.textContent === 'Cartagena → Sebastopol');
    assert.equal(await page.locator('[data-route-column="1"] .route-title').textContent(), 'Cartagena → Sebastopol');
    assert.equal(requests.length, 3, 'third request only for route 2');
    assert.equal(requests[2].origen, 'Cartagena');

    const toggleButtons = await page.locator('[aria-label="Comparar rutas"] button').count();
    assert.equal(toggleButtons, 2);

    await page.click('[data-show-route="1"]');
    const col1Active = await page.locator('[data-route-column="1"]').evaluate(el => el.classList.contains('comparison-column--active'));
    const col2Inactive = await page.locator('[data-route-column="2"]').evaluate(el => !el.classList.contains('comparison-column--active'));
    assert.ok(col1Active, 'column 1 active after clicking Ruta 1');
    assert.ok(col2Inactive, 'column 2 inactive after clicking Ruta 1');

    await page.click('[data-show-route="2"]');
    const col2Active = await page.locator('[data-route-column="2"]').evaluate(el => el.classList.contains('comparison-column--active'));
    const col1Inactive = await page.locator('[data-route-column="1"]').evaluate(el => !el.classList.contains('comparison-column--active'));
    assert.ok(col2Active, 'column 2 active after clicking Ruta 2');
    assert.ok(col1Inactive, 'column 1 inactive after clicking Ruta 2');

    const comparisonOverflow = await page.evaluate(() => {
        const card = document.querySelector('.comparison-columns');
        if (!card) return -1;
        return card.scrollWidth - card.clientWidth;
    });
    assert.ok(comparisonOverflow <= 5, `comparison columns overflow: ${comparisonOverflow}`);

    console.log('T-019 independent requests, isolated columns, second recalculation, differences, and 390px toggle: PASS');
    await browser.close();
    server.close();
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
