const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = {
    dolar: { value: '4000', dataset: {}, addEventListener() {} },
    trmStatus: { textContent: '', dataset: {} },
};
const context = {
    console,
    URL,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: true, json: async () => [] }),
    document: {
        addEventListener() {},
        getElementById(id) { return elements[id] || { addEventListener() {}, value: '', dataset: {} }; },
    },
    window: { addEventListener() {}, location: { href: 'http://localhost/' }, history: { replaceState() {} } },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/calculator.js', 'utf8'), context);

const today = new Date();
const isoToday = today.toISOString().slice(0, 10);
const officialPayload = [{ valor: '4123.45', vigenciadesde: isoToday }];
assert.equal(context.normalizeTrm(officialPayload).value, 4123.45);
assert.equal(context.isTrmFresh(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), today), true);
assert.equal(context.isTrmFresh(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4), today), false);

(async () => {
    context.fetch = async () => ({ ok: true, status: 200, json: async () => [{ valor: '4123.45' }] });
    await context.loadAutomaticTrm();
    assert.match(elements.trmStatus.textContent, /no disponible/);
    context.fetch = async () => ({ ok: true, status: 200, json: async () => [{ valor: '4123.45', vigenciadesde: '2020-01-01' }] });
    await context.loadAutomaticTrm();
    assert.match(elements.trmStatus.textContent, /más de 3 días/);
    context.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await context.loadAutomaticTrm();
    assert.match(elements.trmStatus.textContent, /HTTP 503/);
    context.fetch = async () => { throw Object.assign(new Error('timeout'), { name: 'AbortError' }); };
    await context.loadAutomaticTrm();
    assert.match(elements.trmStatus.textContent, /tiempo de espera agotado/);

    context.fetch = async () => ({ ok: true, status: 200, json: async () => officialPayload });
    await context.loadAutomaticTrm();
    assert.equal(elements.dolar.value, '4123.45');
    assert.match(elements.trmStatus.textContent, /Banco de la República/);

    elements.dolar.value = '4555';
    context.handleTrmInput();
    await context.loadAutomaticTrm();
    assert.equal(elements.dolar.value, '4555');

    let requestBody;
    context.fetch = async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return { ok: true, status: 200, json: async () => ({ detalles: [], transportadores: [], totales: { cop: 0, usd: 0 }, estadisticas: { segmentos: 0, transportadores: 0 } }) };
    };
    context.window.API_BASE_URL = 'http://localhost:3000/api';
    await context.window.calculateRoute('Sebastopol', 'Medellin', 100, 4555);
    assert.equal(requestBody.dolar, 4555);
    console.log('T-018 controlled TRM load, date, manual override, freshness, and POST value: PASS');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
