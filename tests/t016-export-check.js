const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP_URL = 'http://127.0.0.1:8001/index.html';

function number(value) {
    return Number(String(value).replace(/[^0-9.-]/g, ''));
}

function assertClose(actual, expected, label) {
    assert.ok(Math.abs(number(actual) - number(expected)) < 0.01,
        `${label}: esperaba ${expected}, recibí ${actual}`);
}

function expectedRows(api) {
    return api.detalles.map(detail => [
        detail.Tramo,
        detail.Transportador,
        number(detail.Fijos),
        number(detail.Variables),
        number(detail.AOM),
        number(detail['Total Tramo']),
    ]);
}

async function parsePdf(pdfParse, buffer) {
    const parser = new pdfParse.PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
}

function assertExportData(data, api, format, route) {
    assert.match(data, new RegExp(route.origen));
    assert.match(data, new RegExp(route.destino));
    assert.match(data, /Porcentaje/);
    assert.match(data, /TRM/);
    assert.match(data, /Total COP/);
    assert.match(data, /Total USD/);
    assert.ok(data.includes(String(route.porcentaje)), `${format}: falta el porcentaje de la ruta`);
    assert.ok(data.includes(String(route.dolar)), `${format}: falta la TRM de la ruta`);
    assert.ok(data.includes(String(api.totales.cop)) || data.includes(number(api.totales.cop).toFixed(2)),
        `${format}: no contiene el total COP de la respuesta API`);
    assert.ok(data.includes(String(api.totales.usd)) || data.includes(number(api.totales.usd).toFixed(2)),
        `${format}: no contiene el total USD de la respuesta API`);
    const subtotals = new Map();
    for (const [tramo, transportador, fijos, variables, aom, total] of expectedRows(api)) {
        assert.match(data, new RegExp(tramo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(data, new RegExp(transportador.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        subtotals.set(transportador, (subtotals.get(transportador) || 0) + total);
        for (const value of [fijos, variables, aom, total]) {
            assert.ok(data.includes(value.toFixed(2)) || data.includes(String(value)),
                `${format}: falta el valor ${value} de ${tramo}`);
        }
    }
    for (const [transportador, subtotal] of subtotals) {
        assert.ok(data.includes(`Subtotal ${transportador}`), `${format}: falta subtotal de ${transportador}`);
        assert.ok(data.includes(subtotal.toFixed(2)) || data.includes(String(subtotal)),
            `${format}: falta importe del subtotal de ${transportador}`);
    }
}

function assertNoStaleRouteData(data, staleApi, currentApi, staleRoute, format) {
    assert.ok(!data.includes(staleRoute.origen),
        `${format}: conserva el origen de la ruta anterior (${staleRoute.origen})`);
    const staleTramos = new Set(staleApi.detalles.map(detail => detail.Tramo));
    const currentTramos = new Set(currentApi.detalles.map(detail => detail.Tramo));
    for (const tramo of staleTramos) {
        if (currentTramos.has(tramo)) continue;
        assert.ok(!data.includes(tramo), `${format}: conserva el tramo de la ruta anterior (${tramo})`);
    }
}

async function downloadExports(page, route, api, pdfParse, XLSX, staleRouteData) {
    const downloads = [];
    for (const selector of ['[data-export="pdf"]', '[data-export="excel"]']) {
        const downloadPromise = page.waitForEvent('download');
        await page.locator(selector).click();
        const download = await downloadPromise;
        const filePath = path.join(await fs.promises.mkdtemp(path.join(require('node:os').tmpdir(), 't016-')), download.suggestedFilename());
        await download.saveAs(filePath);
        const stat = await fs.promises.stat(filePath);
        assert.ok(stat.size > 0, `${selector} descargó un archivo vacío`);
        downloads.push({ selector, filePath, filename: download.suggestedFilename(), size: stat.size });
    }

    const pdfText = await parsePdf(pdfParse, await fs.promises.readFile(downloads[0].filePath));
    assertExportData(pdfText, api, 'PDF', route);
    const workbook = XLSX.read(await fs.promises.readFile(downloads[1].filePath), { type: 'buffer' });
    const excelText = workbook.SheetNames.map(name => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join('\n');
    assertExportData(excelText, api, 'Excel', route);
    if (staleRouteData) {
        assertNoStaleRouteData(pdfText, staleRouteData.api, api, staleRouteData.route, 'PDF');
        assertNoStaleRouteData(excelText, staleRouteData.api, api, staleRouteData.route, 'Excel');
    }
    const filenamePrefix = `${route.origen}-${route.destino}-`;
    assert.match(downloads[0].filename, new RegExp(`^${filenamePrefix}\\d{4}-\\d{2}-\\d{2}\\.pdf$`));
    assert.match(downloads[1].filename, new RegExp(`^${filenamePrefix}\\d{4}-\\d{2}-\\d{2}\\.xlsx$`));
    return downloads;
}

async function main() {
    const { chromium } = require('playwright');
    const pdfParse = require('pdf-parse');
    const XLSX = require('xlsx');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ acceptDownloads: true });
    const apiResponses = [];
    page.on('response', response => {
        if (response.url().endsWith('/api/calcular') && response.request().method() === 'POST') {
            apiResponses.push({ request: response.request().postDataJSON(), response: response.json() });
        }
    });

    try {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('#origen')?.options.length > 1);
        assert.equal(await page.locator('[data-export="pdf"]').count(), 1);
        assert.equal(await page.locator('[data-export="excel"]').count(), 1);
        assert.equal(await page.locator('[data-export="pdf"]').isDisabled(), true);
        assert.equal(await page.locator('[data-export="excel"]').isDisabled(), true);

        const firstRoute = { origen: 'Cartagena', destino: 'Sebastopol', porcentaje: 100, dolar: 4000 };
        await page.selectOption('#origen', { label: firstRoute.origen });
        await page.selectOption('#destino', { label: firstRoute.destino });
        await page.locator('#calculatorForm').evaluate(form => form.requestSubmit());
        await page.waitForFunction(() => window.currentRoute?.origen === 'Cartagena' &&
            document.querySelector('[data-export="pdf"]')?.disabled === false);
        assert.equal(apiResponses.length, 1);
        apiResponses[0].response = await apiResponses[0].response;
        assert.equal(await page.locator('[data-export="pdf"]').isEnabled(), true);
        assert.equal(await page.locator('[data-export="excel"]').isEnabled(), true);
        assert.deepEqual(apiResponses[0].request, firstRoute);

        const firstDownloads = await downloadExports(page, firstRoute, apiResponses[0].response, pdfParse, XLSX);

        const secondRoute = { origen: 'Sebastopol', destino: 'Medellin', porcentaje: 75, dolar: 4200 };
        await page.locator('[data-bs-target="#parametrosCollapse"]').click();
        await page.waitForFunction(() => document.querySelector('#parametrosCollapse')?.classList.contains('show'));
        await page.selectOption('#origen', { label: secondRoute.origen });
        await page.selectOption('#destino', { label: secondRoute.destino });
        await page.fill('#porcentaje', String(secondRoute.porcentaje));
        await page.fill('#dolar', String(secondRoute.dolar));
        await page.locator('#calculatorForm').evaluate(form => form.requestSubmit());
        await page.waitForFunction(() => window.currentRoute?.origen === 'Sebastopol' &&
            window.currentRoute?.destino === 'Medellin' &&
            document.querySelector('[data-export="pdf"]')?.disabled === false);
        await page.waitForFunction(() => window.currentRoute?.porcentaje === 75 && window.currentRoute?.dolar === 4200);
        assert.equal(apiResponses.length, 2);
        apiResponses[1].response = await apiResponses[1].response;
        assert.deepEqual(apiResponses[1].request, secondRoute);
        assert.notDeepEqual(apiResponses[1].response, apiResponses[0].response);
        const secondDownloads = await downloadExports(page, secondRoute, apiResponses[1].response, pdfParse, XLSX,
            { api: apiResponses[0].response, route: firstRoute });
        assert.notEqual(firstDownloads[0].filename, secondDownloads[0].filename);
        assert.notEqual(firstDownloads[1].filename, secondDownloads[1].filename);

        await page.locator('[data-bs-target="#parametrosCollapse"]').click();
        await page.waitForFunction(() => document.querySelector('#parametrosCollapse')?.classList.contains('show'));
        await page.selectOption('#origen', '');
        await page.locator('#calculatorForm').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        await page.waitForTimeout(100);
        assert.equal(await page.locator('[data-export="pdf"]').isDisabled(), true);
        assert.equal(await page.locator('[data-export="excel"]').isDisabled(), true);
        console.log(`V-047 exportaciones: ${[...firstDownloads, ...secondDownloads].map(item => `${item.filename} (${item.size} bytes)`).join(', ')}`);
        console.log(`V-047 primera ruta: ${apiResponses[0].request.origen} → ${apiResponses[0].request.destino}, ${apiResponses[0].response.detalles.length} filas, totales, subtotales y filas API/exportación coinciden`);
        console.log(`V-048 segunda ruta: ${apiResponses[1].request.origen} → ${apiResponses[1].request.destino}, ${apiResponses[1].response.detalles.length} filas, PDF/XLSX sin origen ni tramos exclusivos de la primera`);
        console.log('V-047 botones: deshabilitados iniciales, habilitados tras cada cálculo y deshabilitados tras error');
    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
