// ===== CALCULADORA DE RUTAS - LÓGICA PRINCIPAL =====

// Variables globales
let currentRoute = null;
const comparisonRoutes = [null, null];
let trmManualOverride = false;
let trmAutomaticReady = false;

const TRM_API_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=30&$order=vigenciadesde%20DESC';

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Calculadora de Rutas Lite...');

    // Inicializar componentes
    initializeForm();
    initializeResultsSheet();
    initializeComparisonToggle();
    initializeMotionToggle();
    initializeExportActions();

    console.log('✅ Calculadora inicializada correctamente');
});

// Inicializar formulario
function initializeForm() {
    window.addEventListener('geam-data-loaded', function () {
        populateOriginSelect();
        initializeSharedUrl();
        initializeTrm();
    });

    // Event listeners
    document.getElementById('calculatorForm').addEventListener('submit', event => handleCalculation(event, 1));
    document.getElementById('calculatorForm2').addEventListener('submit', event => handleCalculation(event, 2));
    document.getElementById('dolar').addEventListener('input', handleTrmInput);

    const origenSelect = document.getElementById('origen');
    console.log('🔗 Agregando event listener al select origen:', origenSelect);

    // Agregar múltiples tipos de event listeners para asegurar que funcione
    origenSelect.addEventListener('change', handleOriginChange);
    origenSelect.addEventListener('input', handleOriginChange);
    origenSelect.onchange = handleOriginChange;

    document.getElementById('origen2').addEventListener('change', () => handleOriginChange(2));

    console.log('✅ Event listeners agregados (change, input, onchange)');

    console.log('📋 Formulario inicializado');
}

function initializeTrm() {
    loadAutomaticTrm();
}

function handleTrmInput() {
    trmManualOverride = true;
    trmAutomaticReady = false;
    setTrmStatus('TRM manual sobrescrita para este cálculo.', 'manual');
}

function setTrmStatus(message, state = 'info') {
    const status = document.getElementById('trmStatus');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

function parseTrmDate(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

function trmRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return payload ? [payload] : [];
}

function normalizeTrm(payload) {
    return trmRows(payload)
        .map(row => ({
            value: Number(String(row.valor ?? row.value ?? row.trm ?? '').replace(',', '.')),
            date: parseTrmDate(row.vigenciadesde ?? row.vigenciaDesde ?? row.fecha ?? row.date),
        }))
        .filter(row => Number.isFinite(row.value) && row.value >= 1000 && row.value <= 10000 && row.date)
        .sort((a, b) => b.date - a.date)[0] || null;
}

function isTrmFresh(date, now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const effective = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const age = Math.floor((today - effective) / 86400000);
    return age >= 0 && age <= 3;
}

function formatTrmDate(date) {
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function loadAutomaticTrm() {
    if (trmManualOverride) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(window.TRM_API_URL || TRM_API_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const trm = normalizeTrm(await response.json());
        if (!trm) throw new Error('La respuesta no contiene TRM con fecha');
        if (!isTrmFresh(trm.date)) throw new Error('La TRM oficial tiene más de 3 días de antigüedad');
        if (trmManualOverride) return;
        document.getElementById('dolar').value = String(trm.value);
        trmAutomaticReady = true;
        setTrmStatus(`TRM oficial Banco de la República: ${trm.value.toLocaleString('es-CO')} · ${formatTrmDate(trm.date)}`, 'official');
    } catch (error) {
        if (!trmManualOverride) {
            trmAutomaticReady = false;
            setTrmStatus(`TRM automática no disponible: ${error.name === 'AbortError' ? 'tiempo de espera agotado' : error.message}. Introduzca una TRM manual.`, 'error');
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

function initializeMotionToggle() {
    const toggle = document.getElementById('motionToggle');
    const mapPanel = document.querySelector('.mapa');
    if (!toggle || !mapPanel) return;

    const enabled = sessionStorage.getItem('geam-motion-enabled') !== 'false';
    const update = value => {
        mapPanel.dataset.flujo = value ? 'on' : 'off';
        toggle.setAttribute('aria-pressed', String(value));
        toggle.setAttribute('aria-label', value ? 'Pausar animación del mapa' : 'Reanudar animación del mapa');
        toggle.textContent = value ? 'Pausar movimiento' : 'Reanudar movimiento';
    };
    update(enabled);
    toggle.addEventListener('click', () => {
        const next = toggle.getAttribute('aria-pressed') !== 'true';
        sessionStorage.setItem('geam-motion-enabled', String(next));
        update(next);
    });
}

// Poblar select de origen
function populateOriginSelect() {
    const origenSelect = document.getElementById('origen');
    const origenSelect2 = document.getElementById('origen2');
    const origins = getOriginNodes();

    [origenSelect, origenSelect2].forEach(select => { select.innerHTML = '<option value="">Seleccione origen...</option>'; });

    origins.forEach(node => {
        const option = document.createElement('option');
        option.value = node;
        option.textContent = node.replace(/_/g, ' ');
        origenSelect.appendChild(option);
        origenSelect2.appendChild(option.cloneNode(true));
    });

    console.log(`📍 ${origins.length} nodos de origen cargados`);
}

// Manejar cambio de origen
function handleOriginChange(routeNumber = 1) {
    console.log('🔄 handleOriginChange disparado');
    const suffix = routeNumber === 2 ? '2' : '';
    const origen = document.getElementById(`origen${suffix}`).value;
    const destinoSelect = document.getElementById(`destino${suffix}`);

    console.log('📍 Origen seleccionado:', origen);

    if (!origen) {
        destinoSelect.innerHTML = '<option value="">Seleccione destino...</option>';
        destinoSelect.disabled = true;
        console.log('❌ Sin origen, destinos deshabilitados');
        return;
    }

    // SIEMPRE cargar TODOS los destinos disponibles, no filtrar por origen
    console.log('🔍 Cargando TODOS los destinos...');
    const destinations = getAllDestinationNodes();
    console.log('✅ Todos los destinos cargados:', destinations);

    destinoSelect.innerHTML = '<option value="">Seleccione destino...</option>';

    destinations.forEach(node => {
        const option = document.createElement('option');
        option.value = node;
        option.textContent = node.replace(/_/g, ' ');
        destinoSelect.appendChild(option);
    });

    destinoSelect.disabled = false;
    console.log(`🎯 ${destinations.length} destinos TOTALES disponibles`);
}

async function handleCalculation(event, routeNumber = 1) {
    event.preventDefault();

    setExportEnabled(false);
    currentRoute = null;
    window.currentRoute = null;

    const suffix = routeNumber === 2 ? '2' : '';
    const origen = document.getElementById(`origen${suffix}`).value;
    const destino = document.getElementById(`destino${suffix}`).value;
    const porcentaje = parseFloat(document.getElementById(`porcentaje${suffix}`).value);
    const dolar = parseFloat(document.getElementById(`dolar${suffix}`).value);

    if (!origen || !destino) {
        showAlert('Por favor seleccione origen y destino', 'warning');
        return;
    }

    if (origen === destino) {
        showAlert('El origen y destino no pueden ser iguales', 'warning');
        return;
    }

    if (!Number.isFinite(dolar) || dolar < 1000 || dolar > 10000) {
        showAlert('Introduzca una TRM manual válida entre 1000 y 10000', 'warning');
        return;
    }

    if (routeNumber === 1 && !trmAutomaticReady && !trmManualOverride) {
        showAlert('La TRM automática no está disponible. Introduzca una TRM manual.', 'warning');
        return;
    }

    const botonCalcular = document.querySelector('button[type="submit"]');

    try {
        showLoading(true);
        const result = await calculateRoute(origen, destino, porcentaje, dolar);

        comparisonRoutes[routeNumber - 1] = result;
        currentRoute = result;
        window.currentRoute = result;
        if (routeNumber === 1) persistCalculationInUrl(origen, destino, porcentaje, dolar);
        hideInitialState();
        displayResults(result, routeNumber);
        updateMapRoute(result);
        showAlert('Ruta calculada exitosamente', 'success');

        const parametrosCollapse = document.getElementById('parametrosCollapse');
        if (parametrosCollapse && parametrosCollapse.classList.contains('show')) {
            const collapseInstance = new bootstrap.Collapse(parametrosCollapse, {
                toggle: false
            });
            collapseInstance.hide();
        }

    } catch (error) {
        if (error.serviceUnavailable) {
            console.error('Servicio no disponible:', error);
            showAlert('Servicio de cálculo no disponible, intenta más tarde', 'danger');
            if (botonCalcular) botonCalcular.disabled = true;
        } else {
            showAlert(error.message || 'No se pudo calcular la ruta', 'danger');
        }
        setExportEnabled(false);
        if (!comparisonRoutes[0] && !comparisonRoutes[1]) {
            document.getElementById('resultsCard').style.display = 'none';
            showInitialState();
        }
    } finally {
        showLoading(false);
    }
}

function persistCalculationInUrl(origen, destino, porcentaje, dolar) {
    const url = new URL(window.location.href);
    url.searchParams.set('origen', origen);
    url.searchParams.set('destino', destino);
    url.searchParams.set('porcentaje', String(porcentaje));
    url.searchParams.set('dolar', String(dolar));
    window.history.replaceState(null, '', url);
}

function initializeSharedUrl() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['origen', 'destino', 'porcentaje', 'dolar'];
    if (!keys.some(key => params.has(key))) return;

    const origen = params.get('origen');
    const destino = params.get('destino');
    const porcentaje = Number(params.get('porcentaje'));
    const dolar = Number(params.get('dolar'));
    const validPercentage = Number.isFinite(porcentaje) && porcentaje >= 1 && porcentaje <= 100;
    const validDolar = Number.isFinite(dolar) && dolar >= 1000 && dolar <= 10000;
    const validNodes = getOriginNodes().includes(origen) && getAllDestinationNodes().includes(destino);

    if (!origen || !destino || !validPercentage || !validDolar || !validNodes || origen === destino) {
        showAlert('Los parámetros de la URL no son válidos. Seleccione una ruta para calcular.', 'warning');
        return;
    }

    document.getElementById('origen').value = origen;
    handleOriginChange();
    document.getElementById('destino').value = destino;
    document.getElementById('porcentaje').value = String(porcentaje);
    document.getElementById('dolar').value = String(dolar);
    trmManualOverride = true;
    trmAutomaticReady = false;
    setTrmStatus('TRM manual sobrescrita para este cálculo.', 'manual');
    document.getElementById('calculatorForm').requestSubmit();
}

async function calculateRoute(origen, destino, porcentaje = 100, dolar = 4000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
        response = await fetch(window.API_BASE_URL + '/calcular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origen, destino, porcentaje, dolar }),
            signal: controller.signal,
        });
    } catch (err) {
        if (err.name === 'AbortError') {
            const e = new Error('Timeout');
            e.serviceUnavailable = true;
            throw e;
        }
        const e = new Error('Network error');
        e.serviceUnavailable = true;
        throw e;
    } finally {
        clearTimeout(timeoutId);
    }

    if (response.status >= 500) {
        const e = new Error(`HTTP ${response.status}`);
        e.serviceUnavailable = true;
        throw e;
    }

    const apiResp = await response.json();

    if (!response.ok) {
        throw new Error(apiResp.error || 'No se pudo calcular la ruta');
    }

    // ponytail: path reconstructed from detalle Tramo "A - B" lines; backend doesn't return path directly
    const path = [];
    for (const d of apiResp.detalles) {
        if (!d.Tramo.includes(' - ')) continue;
        const parts = d.Tramo.split(' - ');
        if (path.length === 0) path.push(parts[0]);
        path.push(parts[1]);
    }

    return {
        success: true,
        origen,
        destino,
        porcentaje,
        dolar,
        path,
        detalles: apiResp.detalles,
        transportadores: apiResp.transportadores,
        totales: apiResp.totales,
        estadisticas: apiResp.estadisticas,
    };
}

function initializeExportActions() {
    document.querySelector('[data-export="pdf"]')?.addEventListener('click', exportPdf);
    document.querySelector('[data-export="excel"]')?.addEventListener('click', exportExcel);
}

function setExportEnabled(enabled) {
    document.querySelectorAll('[data-export]').forEach(button => {
        button.disabled = !enabled;
    });
}

function exportRows(result) {
    return result.detalles.map(detail => [
        detail.Tramo,
        detail.Transportador,
        Number(detail.Fijos).toFixed(2),
        Number(detail.Variables).toFixed(2),
        Number(detail.AOM).toFixed(2),
        Number(detail['Total Tramo']).toFixed(2),
    ]);
}

function exportSubtotals(result) {
    const totals = new Map();
    result.detalles.forEach(detail => {
        totals.set(detail.Transportador, (totals.get(detail.Transportador) || 0) + Number(detail['Total Tramo']));
    });
    return [...totals].map(([name, total]) => [`Subtotal ${name}`, total.toFixed(2)]);
}

function exportFilename(extension) {
    const date = new Date().toLocaleDateString('en-CA');
    return `${currentRoute.origen}-${currentRoute.destino}-${date}.${extension}`;
}

function exportPdf() {
    if (!currentRoute || !window.jspdf?.jsPDF) return;
    const { jsPDF } = window.jspdf;
    const result = currentRoute;
    const pdf = new jsPDF();
    const lines = [
        'Calculadora GEAM',
        `Origen: ${result.origen}`,
        `Destino: ${result.destino}`,
        `Porcentaje: ${result.porcentaje}`,
        `TRM: ${result.dolar}`,
        `Total COP: ${Number(result.totales.cop).toFixed(2)}`,
        `Total USD: ${Number(result.totales.usd).toFixed(2)}`,
        '',
        'Tramo | Transportador | Fijos | Variables | AOM | Total Tramo',
        ...exportRows(result).map(row => row.join(' | ')),
        '',
        'Subtotales por transportador',
        ...exportSubtotals(result).map(row => `${row[0]}: ${row[1]}`),
    ];
    pdf.text(lines, 14, 18);
    pdf.save(exportFilename('pdf'));
}

function exportExcel() {
    if (!currentRoute || !window.XLSX) return;
    const result = currentRoute;
    const rows = [
        ['Calculadora GEAM', ''],
        ['Origen', result.origen],
        ['Destino', result.destino],
        ['Porcentaje', result.porcentaje],
        ['TRM', result.dolar],
        ['Total COP', Number(result.totales.cop)],
        ['Total USD', Number(result.totales.usd)],
        [],
        ['Subtotales por transportador', ''],
        ...exportSubtotals(result),
        [],
        ['Tramo', 'Transportador', 'Fijos', 'Variables', 'AOM', 'Total Tramo'],
        ...exportRows(result),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Calculo');
    XLSX.writeFile(workbook, exportFilename('xlsx'));
}

// Mostrar resultados
function displayResults(result, routeNumber = 1) {
    const resultsCard = document.getElementById('resultsCard');
    const columns = document.querySelector('.comparison-columns');
    let column = columns.querySelector(`[data-route-column="${routeNumber}"]`);
    if (!column) {
        column = el('article', 'comparison-column');
        column.dataset.routeColumn = routeNumber;
        columns.appendChild(column);
    }
    column.textContent = '';

    const routeHeader = el('div', 'mb-3');
    const headerFlex = el('div', 'd-flex justify-content-between align-items-center mb-2');
    const h6 = document.createElement('h6');
    h6.className = 'mb-0 route-title';
    const icon = document.createElement('i');
    icon.className = 'fas fa-route me-2';
    h6.appendChild(icon);
    h6.appendChild(document.createTextNode(`${result.origen} → ${result.destino}`));
    const headerSmall = document.createElement('small');
    headerSmall.className = 'text-muted cifra';
    headerSmall.textContent = `${result.porcentaje}% | TRM: $${result.dolar.toLocaleString()}`;
    headerFlex.appendChild(h6);
    headerFlex.appendChild(headerSmall);
    routeHeader.appendChild(headerFlex);
    column.appendChild(routeHeader);

    const resumenRow = el('div', 'row g-2 mb-3');
    resumenRow.appendChild(makeResultItem('Total COP', `$${parseFloat(result.totales.cop).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`));
    resumenRow.appendChild(makeResultItem('Total USD', `$${parseFloat(result.totales.usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`));
    column.appendChild(resumenRow);

    column.appendChild(makeTransportSummary(result));

    const statsRow = el('div', 'row g-2 mb-3');
    statsRow.appendChild(makeStat('Segmentos', `${result.estadisticas.segmentos}`));
    statsRow.appendChild(makeStat('Transportadores', `${result.estadisticas.transportadores}`));
    statsRow.appendChild(makeStat('Ruta', `${result.path.length - 1} tramos`));
    column.appendChild(statsRow);

    const transpDiv = el('div', 'mb-3 transportador-badges');
    const transpLabel = document.createElement('small');
    transpLabel.className = 'text-muted d-block mb-1';
    transpLabel.textContent = 'Transportadores:';
    transpDiv.appendChild(transpLabel);
    result.transportadores.forEach(t => {
        const badge = document.createElement('span');
        badge.className = 'badge';
        const color = TRANSPORTADOR_COLORS[t] || '#666666';
        badge.style.backgroundColor = color;
        badge.style.color = (t === 'PROMIORIENTE') ? 'black' : 'white';
        badge.textContent = t;
        transpDiv.appendChild(badge);
        transpDiv.appendChild(document.createTextNode(' '));
    });
    column.appendChild(transpDiv);

    column.appendChild(generateDetailedBreakdown(result));
    setExportEnabled(true);

    createSheetHandle();
    resultsCard.style.display = 'block';
    updateRouteDifferences();
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function initializeComparisonToggle() {
    document.querySelectorAll('[data-show-route]').forEach(button => button.addEventListener('click', () => {
        const route = button.dataset.showRoute;
        document.querySelectorAll('[data-show-route]').forEach(item => item.classList.toggle('active', item === button));
        document.querySelectorAll('.comparison-column').forEach(column => {
            column.classList.toggle('comparison-column--active', column.dataset.routeColumn === route);
        });
    }));
}

function transportTotals(result) {
    const totals = new Map();
    result.detalles.forEach(detail => {
        if (detail.Transportador && !detail.Tramo.startsWith('Estampilla')) {
            totals.set(detail.Transportador, (totals.get(detail.Transportador) || 0) + Number(detail['Total Tramo']));
        }
    });
    return totals;
}

function updateRouteDifferences() {
    const [first, second] = comparisonRoutes;
    const wrap = document.querySelector('.route-differences');
    if (!first || !second) { wrap.textContent = ''; return; }
    wrap.textContent = '';
    const heading = el('h3', 'comparison-title');
    heading.textContent = 'Diferencias entre rutas';
    wrap.appendChild(heading);
    const table = el('div', 'comparison-difference-list');
    [['Total', Number(second.totales.cop) - Number(first.totales.cop), Number(second.totales.usd) - Number(first.totales.usd)], ...new Set([...transportTotals(first).keys(), ...transportTotals(second).keys()])].forEach(entry => {
        const row = el('div', 'comparison-difference-row');
        const name = Array.isArray(entry) ? entry[0] : entry;
        const cop = Array.isArray(entry) ? entry[1] : (transportTotals(second).get(name) || 0) - (transportTotals(first).get(name) || 0);
        const usd = Array.isArray(entry) ? entry[2] : ((transportTotals(second).get(name) || 0) / Number(second.dolar)) - ((transportTotals(first).get(name) || 0) / Number(first.dolar));
        const firstShare = name === 'Total' ? 100 : ((transportTotals(first).get(name) || 0) / Number(first.totales.cop)) * 100;
        const secondShare = name === 'Total' ? 100 : ((transportTotals(second).get(name) || 0) / Number(second.totales.cop)) * 100;
        row.textContent = `${name}: COP ${formatCop(cop)} · USD ${Number(usd).toLocaleString('en-US', { maximumFractionDigits: 2 })} · porcentaje ${(secondShare - firstShare).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp`;
        table.appendChild(row);
    });
    wrap.appendChild(table);
}

let sheetHandleCreated = false;

function initializeResultsSheet() {
    const toggle = document.querySelector('.sheet-toggle');
    const center = document.querySelector('.centro');
    if (!toggle || !center) return;

    toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        center.classList.toggle('sheet-closed', open);
    });
}

function createSheetHandle() {
    if (sheetHandleCreated) return;
    sheetHandleCreated = true;
    const toggle = document.querySelector('.sheet-toggle');
    const center = document.querySelector('.centro');
    if (!toggle || !center) return;

    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'sheet-handle';
    handle.setAttribute('aria-label', 'Arrastrar hoja de resultados');
    handle.innerHTML = '<span aria-hidden="true"></span>';
    document.getElementById('resultsCard').prepend(handle);

    let startY = 0;
    let dragging = false;
    handle.addEventListener('pointerdown', event => {
        dragging = true;
        startY = event.clientY;
        handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
        if (!dragging || Math.abs(event.clientY - startY) < 24) return;
        const open = event.clientY < startY;
        toggle.setAttribute('aria-expanded', String(open));
        center.classList.toggle('sheet-closed', !open);
        dragging = false;
    });
    handle.addEventListener('pointerup', () => { dragging = false; });
    handle.addEventListener('pointercancel', () => { dragging = false; });
}

function el(tag, className) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    return e;
}

function makeResultItem(label, value) {
    const col = el('div', 'col-6');
    const item = el('div', `result-item text-center ${label === 'Total COP' ? 'total-cop' : ''}`);
    const lbl = el('div', 'result-label');
    lbl.textContent = label;
    const val = el('div', 'result-value');
    val.textContent = value;
    item.appendChild(lbl);
    item.appendChild(val);
    col.appendChild(item);
    return col;
}

function makeStat(label, value) {
    const col = el('div', 'col-4');
    const s = document.createElement('small');
    s.className = 'text-muted';
    s.textContent = label;
    col.appendChild(s);
    col.appendChild(document.createElement('br'));
    const strong = document.createElement('strong');
    strong.className = 'cifra stats-number';
    strong.textContent = value;
    col.appendChild(strong);
    return col;
}

function formatCop(value) {
    return `$${Number(value).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function makeTransportSummary(result) {
    const wrap = el('section', 'transport-summary');
    wrap.setAttribute('aria-label', 'Reparto por transportador');
    const totals = new Map();
    result.detalles.forEach(detail => {
        if (detail.Transportador && !detail.Tramo.startsWith('Estampilla')) totals.set(detail.Transportador, (totals.get(detail.Transportador) || 0) + Number(detail['Total Tramo']));
    });
    const total = Number(result.totales.cop);
    const promigas = totals.get('PROMIGAS') || 0;
    const conexion = totals.get('Conexión Especial') || 0;
    const entries = [['PROMIGAS', promigas], ['Conexión Especial', conexion], ['TGI', total - promigas - conexion]];
    const bar = el('div', 'reparto');
    entries.forEach(([name, amount]) => {
        const segment = el('span', 'reparto-segment');
        segment.dataset.transportador = name;
        segment.style.width = `${total ? (amount / total) * 100 : 0}%`;
        bar.appendChild(segment);
    });
    wrap.appendChild(bar);
    const legend = el('div', 'reparto__llave');
    entries.forEach(([name, amount]) => {
        const item = el('span', 'reparto__item');
        item.dataset.transportadorSummary = name;
        const nameEl = document.createElement('span');
        nameEl.textContent = name + ' ';
        const amountEl = document.createElement('span');
        amountEl.className = 'cifra';
        amountEl.textContent = formatCop(amount);
        const percentEl = document.createElement('span');
        percentEl.className = 'cifra';
        percentEl.textContent = ` · ${total ? (amount / total * 100).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0'}%`;
        item.append(nameEl, amountEl, percentEl);
        legend.appendChild(item);
    });
    wrap.appendChild(legend);
    return wrap;
}

// Generar desglose agrupado, conservando los valores entregados por la API.
function generateDetailedBreakdown(result) {
    const wrap = el('section', 'desglose');
    const heading = document.createElement('h3');
    heading.className = 'desglose-title';
    heading.textContent = 'Desglose por transportador';
    wrap.appendChild(heading);
    const groups = new Map();
    result.detalles.forEach(detail => {
        if (!detail.Transportador) return;
        if (!groups.has(detail.Transportador)) groups.set(detail.Transportador, []);
        groups.get(detail.Transportador).push(detail);
    });
    ['PROMIGAS', 'Conexión Especial', 'TGI', 'PROMIORIENTE'].forEach(name => {
        if (!groups.has(name) && name !== 'Conexión Especial') return;
        const details = groups.get(name) || [];
        const group = el('div', 'transportador-group');
        group.dataset.transportador = name;
        const disclosure = document.createElement('details');
        disclosure.open = [...wrap.querySelectorAll('details')].length === 0;
        const summary = document.createElement('summary');
        summary.className = 'desglose__cabecera';
        summary.textContent = name;
        const subtotal = details.reduce((sum, detail) => sum + Number(detail['Total Tramo']), 0);
        const subtotalEl = el('span', 'group-subtotal');
        subtotalEl.textContent = formatCop(subtotal);
        summary.appendChild(subtotalEl);
        disclosure.appendChild(summary);
        const body = el('div', 'desglose__grupo');
        details.forEach(detail => {
            const row = el('div', 'desglose__fila');
            const tramoParts = detail.Tramo.includes(' - ') ? detail.Tramo.split(' - ') : [];
            if (tramoParts.length === 2) {
                row.tabIndex = 0;
                row.dataset.routeFrom = tramoParts[0];
                row.dataset.routeTo = tramoParts[1];
                row.dataset.routeValue = formatCop(detail['Total Tramo']);
            }
            [['Tramo', detail.Tramo], ['Transportador', detail.Transportador], ['Fijos', formatCop(detail.Fijos)], ['Variables', formatCop(detail.Variables)], ['AOM', formatCop(detail.AOM)], ['Total', formatCop(detail['Total Tramo'])]].forEach(([label, value]) => {
                const cell = el('span', label === 'Tramo' ? 'desglose__tramo' : 'desglose__num');
                cell.dataset.label = label;
                cell.textContent = value;
                row.appendChild(cell);
            });
            const secondary = el('span', 'desglose__detalle');
            secondary.textContent = `Fijos: ${formatCop(detail.Fijos)} · AOM: ${formatCop(detail.AOM)}`;
            row.appendChild(secondary);
            body.appendChild(row);
        });
        disclosure.appendChild(body);
        group.appendChild(disclosure);
        wrap.appendChild(group);
    });
    return wrap;
}

// Establecer ruta predefinida
function setRoute(origen, destino) {
    // Establecer origen
    document.getElementById('origen').value = origen;
    handleOriginChange();

    // Establecer destino después de que se actualicen las opciones
    setTimeout(() => {
        document.getElementById('destino').value = destino;
        console.log(`🎯 Ruta establecida: ${origen} → ${destino}`);
    }, 150);
}

// Manejar selección de ruta predefinida
function handlePredefinedRoute() {
    const select = document.getElementById('predefinedRoutes');
    const value = select.value;

    if (!value) return;

    const [origen, destino] = value.split('|');
    console.log('🌟 Ruta predefinida seleccionada:', origen, '→', destino);

    setRoute(origen, destino);

    // Calcular automáticamente la ruta
    setTimeout(() => {
        const origenValue = document.getElementById('origen').value;
        const destinoValue = document.getElementById('destino').value;
        const porcentaje = parseFloat(document.getElementById('porcentaje').value);
        const dolar = parseFloat(document.getElementById('dolar').value);

        if (origenValue && destinoValue) {
            console.log(`🚀 Ejecutando cálculo automático: ${origenValue} → ${destinoValue}`);
            handleCalculation({ preventDefault: () => { } });
        }
    }, 200);

    // Resetear el select
    select.value = '';
}
function hideInitialState() {
    const initial = document.getElementById('initialState');
    if (initial) initial.hidden = true;
}

function showInitialState() {
    const initial = document.getElementById('initialState');
    if (initial) initial.hidden = false;
}

function showLoading(show) {
    const resultsCard = document.getElementById('resultsCard');
    const skeleton = document.getElementById('loadingSkeleton');
    const toggle = resultsCard.querySelector('.comparison-toggle');
    const columns = resultsCard.querySelector('.comparison-columns');
    const diffs = resultsCard.querySelector('.route-differences');
    const actions = resultsCard.querySelector('.export-actions');
    if (show) {
        hideInitialState();
        resultsCard.style.display = 'block';
        resultsCard.setAttribute('aria-busy', 'true');
        skeleton.setAttribute('aria-hidden', 'false');
        if (toggle) toggle.style.display = 'none';
        if (columns) columns.style.display = 'none';
        if (diffs) diffs.style.display = 'none';
        if (actions) actions.style.visibility = 'hidden';
    } else {
        resultsCard.setAttribute('aria-busy', 'false');
        skeleton.setAttribute('aria-hidden', 'true');
        if (toggle) toggle.style.display = '';
        if (columns) columns.style.display = '';
        if (diffs) diffs.style.display = '';
        if (actions) actions.style.visibility = '';
    }
}

// Mostrar alerta
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.textContent = message;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('data-bs-dismiss', 'alert');
    closeBtn.setAttribute('aria-label', 'Close');
    alertDiv.appendChild(closeBtn);

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Función de prueba global
window.testDestinations = function (origen) {
    console.log('🧪 TEST: Probando destinos desde', origen);
    try {
        const destinations = getDestinationNodes(origen);
        console.log('✅ Destinos encontrados:', destinations);

        const destinoSelect = document.getElementById('destino');
        destinoSelect.innerHTML = '<option value="">Seleccione destino...</option>';

        destinations.forEach(dest => {
            const option = document.createElement('option');
            option.value = dest;
            option.textContent = dest.replace(/_/g, ' ');
            destinoSelect.appendChild(option);
        });

        destinoSelect.disabled = false;
        console.log(`✅ ${destinations.length} destinos agregados al select`);
        return destinations;
    } catch (error) {
        console.error('❌ Error en test:', error);
        return [];
    }
};

// Exportar funciones para uso global
window.setRoute = setRoute;
window.calculateRoute = calculateRoute;
window.currentRoute = currentRoute;
window.handleOriginChange = handleOriginChange;
window.handlePredefinedRoute = handlePredefinedRoute;
window.__trm = { normalizeTrm, isTrmFresh };
