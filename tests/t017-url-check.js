const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseUrl = process.env.GEAM_FRONTEND_URL || 'http://127.0.0.1:8001/';

async function waitForData(page) {
    await page.waitForFunction(() => document.querySelectorAll('#origen option').length > 1);
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const requests = [];
        const pageErrors = [];
        const consoleErrors = [];
        page.on('request', request => {
            if (request.method() === 'POST' && request.url().endsWith('/api/calcular')) requests.push(request);
        });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

        await page.goto(baseUrl);
        await waitForData(page);
        await page.selectOption('#origen', 'Sebastopol');
        await page.selectOption('#destino', 'Medellin');
        await page.fill('#porcentaje', '75');
        await page.fill('#dolar', '4200');
        await page.locator('#calculatorForm').evaluate(form => form.requestSubmit());
        await page.waitForSelector('#resultsContent .result-value');

        const sharedUrl = page.url();
        const shared = new URL(sharedUrl).searchParams;
        assert.equal(shared.get('origen'), 'Sebastopol');
        assert.equal(shared.get('destino'), 'Medellin');
        assert.equal(shared.get('porcentaje'), '75');
        assert.equal(shared.get('dolar'), '4200');
        const total = await page.locator('.total-cop .result-value').textContent();

        const clean = await browser.newPage();
        const cleanRequests = [];
        clean.on('request', request => {
            if (request.method() === 'POST' && request.url().endsWith('/api/calcular')) cleanRequests.push(request);
        });
        const cleanErrors = [];
        const cleanConsoleErrors = [];
        clean.on('pageerror', error => cleanErrors.push(error.message));
        clean.on('console', message => { if (message.type() === 'error') cleanConsoleErrors.push(message.text()); });
        await clean.goto(sharedUrl);
        await clean.waitForSelector('#resultsContent .result-value');
        assert.equal(await clean.inputValue('#origen'), 'Sebastopol');
        assert.equal(await clean.inputValue('#destino'), 'Medellin');
        assert.equal(await clean.inputValue('#porcentaje'), '75');
        assert.equal(await clean.inputValue('#dolar'), '4200');
        assert.equal(cleanRequests.length, 1);
        assert.equal(await clean.locator('.total-cop .result-value').textContent(), total);

        for (const suffix of ['?origen=Sebastopol&destino=Medellin&porcentaje=75', '?origen=NoExiste&destino=Medellin&porcentaje=75&dolar=4200']) {
            const invalid = await browser.newPage();
            let invalidRequests = 0;
            const invalidErrors = [];
            const invalidConsoleErrors = [];
            invalid.on('request', request => {
                if (request.method() === 'POST' && request.url().endsWith('/api/calcular')) invalidRequests++;
            });
            invalid.on('pageerror', error => invalidErrors.push(error.message));
            invalid.on('console', message => { if (message.type() === 'error') invalidConsoleErrors.push(message.text()); });
            await invalid.goto(`${baseUrl}${suffix}`);
            await waitForData(invalid);
            assert.equal(invalidRequests, 0);
            assert.equal(invalidErrors.length, 0);
            assert.equal(invalidConsoleErrors.length, 0);
            assert.ok(await invalid.locator('.alert-warning').count());
            assert.equal(await invalid.locator('button[type="submit"]').isEnabled(), true);
            await invalid.close();
        }

        assert.equal(pageErrors.length, 0);
        assert.equal(cleanErrors.length, 0);
        assert.equal(consoleErrors.length, 0);
        assert.equal(cleanConsoleErrors.length, 0);
        console.log(`URL ${sharedUrl}`);
        console.log(`Peticiones cálculo: ${requests.length} inicial, ${cleanRequests.length} contexto limpio`);
        console.log(`Total coincidente: ${total}`);
        console.log('Parámetros inválidos: 0 peticiones, 0 errores de página, mensaje de validación');
    } finally {
        await browser.close();
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
