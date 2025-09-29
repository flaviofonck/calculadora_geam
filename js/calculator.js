// ===== CALCULADORA DE RUTAS - LÓGICA PRINCIPAL =====

// Variables globales
let currentRoute = null;
let loadingModal = null;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Calculadora de Rutas Lite...');

    // Inicializar componentes
    initializeForm();
    initializeModals();

    console.log('✅ Calculadora inicializada correctamente');
});

// Inicializar formulario
function initializeForm() {
    populateOriginSelect();

    // Event listeners
    document.getElementById('calculatorForm').addEventListener('submit', handleCalculation);

    const origenSelect = document.getElementById('origen');
    console.log('🔗 Agregando event listener al select origen:', origenSelect);

    // Agregar múltiples tipos de event listeners para asegurar que funcione
    origenSelect.addEventListener('change', handleOriginChange);
    origenSelect.addEventListener('input', handleOriginChange);
    origenSelect.onchange = handleOriginChange;

    console.log('✅ Event listeners agregados (change, input, onchange)');

    console.log('📋 Formulario inicializado');
}

// Inicializar modales
function initializeModals() {
    loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
}

// Poblar select de origen
function populateOriginSelect() {
    const origenSelect = document.getElementById('origen');
    const origins = getOriginNodes();

    origenSelect.innerHTML = '<option value="">Seleccione origen...</option>';

    origins.forEach(node => {
        const option = document.createElement('option');
        option.value = node;
        option.textContent = node.replace(/_/g, ' ');
        origenSelect.appendChild(option);
    });

    console.log(`📍 ${origins.length} nodos de origen cargados`);
}

// Manejar cambio de origen
function handleOriginChange() {
    console.log('🔄 handleOriginChange disparado');
    const origen = document.getElementById('origen').value;
    const destinoSelect = document.getElementById('destino');

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

// Manejar cálculo de ruta
async function handleCalculation(event) {
    event.preventDefault();

    const origen = document.getElementById('origen').value;
    const destino = document.getElementById('destino').value;
    const porcentaje = parseFloat(document.getElementById('porcentaje').value);
    const dolar = parseFloat(document.getElementById('dolar').value);

    if (!origen || !destino) {
        showAlert('Por favor seleccione origen y destino', 'warning');
        return;
    }

    if (origen === destino) {
        showAlert('El origen y destino no pueden ser iguales', 'warning');
        return;
    }

    try {
        showLoading(true);

        // Simular delay de procesamiento
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = calculateRoute(origen, destino, porcentaje, dolar);

        if (result.success) {
            currentRoute = result;
            displayResults(result);
            updateMapRoute(result);
            showAlert('Ruta calculada exitosamente', 'success');

            // Colapsar automáticamente la sección de parámetros para dar relevancia a los resultados
            const parametrosCollapse = document.getElementById('parametrosCollapse');
            if (parametrosCollapse && parametrosCollapse.classList.contains('show')) {
                const collapseInstance = new bootstrap.Collapse(parametrosCollapse, {
                    toggle: false
                });
                collapseInstance.hide();
                console.log('📋 Parámetros colapsados automáticamente');
            }
        } else {
            showAlert(result.error || 'No se pudo calcular la ruta', 'danger');
        }

    } catch (error) {
        console.error('Error en cálculo:', error);
        showAlert('Error interno en el cálculo', 'danger');
    } finally {
        showLoading(false);
    }
}

// Algoritmo de cálculo de ruta (Dijkstra simplificado)
function calculateRoute(origen, destino, porcentaje = 100, dolar = 4000) {
    console.log(`🔍 Calculando ruta: ${origen} → ${destino}`);

    try {
        // Encontrar ruta usando BFS (Breadth-First Search)
        const path = findShortestPath(origen, destino);

        if (!path || path.length === 0) {
            return {
                success: false,
                error: `No existe ruta entre ${origen} y ${destino}`
            };
        }

        // Calcular costos de la ruta
        const routeDetails = calculateRouteCosts(path, porcentaje, dolar);

        return {
            success: true,
            origen: origen,
            destino: destino,
            porcentaje: porcentaje,
            dolar: dolar,
            path: path,
            ...routeDetails
        };

    } catch (error) {
        console.error('Error calculando ruta:', error);
        return {
            success: false,
            error: 'Error interno en el cálculo de ruta'
        };
    }
}

// Encontrar la ruta más corta usando BFS (ALGORITMO ORIGINAL)
function findShortestPath(start, end) {
    console.log(`🔍 Buscando ruta: ${start} → ${end}`);

    if (start === end) {
        return [start];
    }

    // Construir grafo de conexiones bidireccional como el original
    const graph = new Map();

    // Agregar todas las conexiones desde los datos
    NETWORK_DATA.forEach(item => {
        if (item.Origen === 'Estampilla') return;

        const origen = item.Origen;
        const destino = item.Destino;

        // Conexión directa (A → B)
        if (!graph.has(origen)) graph.set(origen, []);
        graph.get(origen).push(destino);

        // Conexión inversa (B → A) - como NetworkX hace automáticamente
        if (!graph.has(destino)) graph.set(destino, []);
        graph.get(destino).push(origen);
    });

    console.log(`🌐 Grafo construido con ${graph.size} nodos`);
    if (graph.has(start)) {
        console.log(`🔗 Conexiones desde '${start}':`, graph.get(start));
    }

    // BFS para encontrar el camino más corto
    const queue = [[start]];
    const visited = new Set();

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current === end) {
            console.log(`✅ Ruta encontrada:`, path);
            return path;
        }

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);

        // Obtener conexiones del nodo actual
        const connections = graph.get(current) || [];

        for (const neighbor of connections) {
            if (!visited.has(neighbor)) {
                queue.push([...path, neighbor]);
            }
        }
    }

    console.log(`❌ No se encontró ruta entre ${start} y ${end}`);
    return null;
}

// Calcular costos de la ruta
function calculateRouteCosts(path, porcentaje, dolar) {
    const detalles = [];
    const transportadores = new Set();

    // Calcular costos por segmento (LÓGICA ORIGINAL)
    for (let i = 0; i < path.length - 1; i++) {
        const origen = path[i];
        const destino = path[i + 1];

        // Buscar segmento en ambas direcciones (como el grafo bidireccional)
        let segment = NETWORK_DATA.find(item =>
            item.Origen === origen && item.Destino === destino
        );

        // Si no se encuentra en dirección directa, buscar en dirección inversa
        if (!segment) {
            segment = NETWORK_DATA.find(item =>
                item.Origen === destino && item.Destino === origen
            );
        }

        if (!segment) {
            throw new Error(`Segmento no encontrado: ${origen} ↔ ${destino}`);
        }

        // Cálculo EXACTO como en la versión original
        const pct = porcentaje / 100.0;
        const fijosVal = parseFloat(segment.Fijos) * pct;
        const variablesVal = parseFloat(segment.Variables) * (1 - pct);  // COMPLEMENTO del porcentaje
        const aomVal = parseFloat(segment.AOM);  // AOM no se multiplica por porcentaje
        const totalTramo = fijosVal + variablesVal + aomVal;

        transportadores.add(segment.Transportador);

        detalles.push({
            Tramo: segment.Tramo || `${origen} - ${destino}`,
            Transportador: segment.Transportador,
            Fijos: fijosVal.toFixed(2),
            Variables: variablesVal.toFixed(2),
            AOM: aomVal.toFixed(2),
            'Total Tramo': totalTramo.toFixed(2),
            Distancia: ''
        });
    }

    // Aplicar estampillas por transportador (LÓGICA ORIGINAL)
    transportadores.forEach(transportador => {
        const estampilla = ESTAMPILLAS[transportador];
        if (estampilla) {
            const pctDecimal = porcentaje / 100.0;
            const fijosVal = parseFloat(estampilla.Fijos) * pctDecimal;
            const variablesVal = parseFloat(estampilla.Variables) * (1 - pctDecimal); // COMPLEMENTO
            const aomVal = parseFloat(estampilla.AOM);
            const totalVal = fijosVal + variablesVal + aomVal;

            detalles.push({
                Tramo: `Estampilla ${transportador}`,
                Transportador: transportador,
                Fijos: fijosVal.toFixed(2),
                Variables: variablesVal.toFixed(2),
                AOM: aomVal.toFixed(2),
                'Total Tramo': totalVal.toFixed(2),
                Distancia: ''
            });
        }
    });

    // Calcular subtotales (LÓGICA ORIGINAL)
    const subtotalFijos = detalles.reduce((sum, d) => sum + parseFloat(d.Fijos), 0);
    const subtotalVariables = detalles.reduce((sum, d) => sum + parseFloat(d.Variables), 0);
    const subtotalAOM = detalles.reduce((sum, d) => sum + parseFloat(d.AOM), 0);
    const subtotalGeneral = detalles.reduce((sum, d) => sum + parseFloat(d['Total Tramo']), 0);

    const subtotales = {
        Tramo: 'SUB TOTALES (COP)',
        Transportador: '',
        Fijos: subtotalFijos.toFixed(2),
        Variables: subtotalVariables.toFixed(2),
        AOM: subtotalAOM.toFixed(2),
        'Total Tramo': subtotalGeneral.toFixed(2),
        Distancia: ''
    };

    // Calcular fomento (3%) - LÓGICA ORIGINAL
    const fomentoFijos = subtotalFijos * 0.03;
    const fomentoVariables = subtotalVariables * 0.03;
    const fomentoAOM = subtotalAOM * 0.03;
    const fomentoGeneral = subtotalGeneral * 0.03;

    const fomento = {
        Tramo: 'Cuota de fomento',
        Transportador: '',
        Fijos: fomentoFijos.toFixed(2),
        Variables: fomentoVariables.toFixed(2),
        AOM: fomentoAOM.toFixed(2),
        'Total Tramo': fomentoGeneral.toFixed(2),
        Distancia: ''
    };

    // Calcular impuesto (6%) - LÓGICA ORIGINAL
    const impuestoFijos = subtotalFijos * 0.06;
    const impuestoVariables = subtotalVariables * 0.06;
    const impuestoAOM = subtotalAOM * 0.06;
    const impuestoGeneral = subtotalGeneral * 0.06;

    const impuesto = {
        Tramo: 'Impuesto transporte',
        Transportador: '',
        Fijos: impuestoFijos.toFixed(2),
        Variables: impuestoVariables.toFixed(2),
        AOM: impuestoAOM.toFixed(2),
        'Total Tramo': impuestoGeneral.toFixed(2),
        Distancia: ''
    };

    // Calcular totales - LÓGICA ORIGINAL
    const totalFijos = subtotalFijos + fomentoFijos + impuestoFijos;
    const totalVariables = subtotalVariables + fomentoVariables + impuestoVariables;
    const totalAOM = subtotalAOM + fomentoAOM + impuestoAOM;
    const totalGeneral = subtotalGeneral + fomentoGeneral + impuestoGeneral;

    const totales = {
        Tramo: 'TOTALES (COP)',
        Transportador: '',
        Fijos: totalFijos.toFixed(2),
        Variables: totalVariables.toFixed(2),
        AOM: totalAOM.toFixed(2),
        'Total Tramo': totalGeneral.toFixed(2),
        Distancia: ''
    };

    // Convertir a USD - LÓGICA ORIGINAL
    const totalFijosUsd = totalFijos / dolar;
    const totalVariablesUsd = totalVariables / dolar;
    const totalAOMUsd = totalAOM / dolar;
    const totalGeneralUsd = totalGeneral / dolar;

    const usdTotales = {
        Tramo: 'USD',
        Transportador: '',
        Fijos: totalFijosUsd.toFixed(2),
        Variables: totalVariablesUsd.toFixed(2),
        AOM: totalAOMUsd.toFixed(2),
        'Total Tramo': totalGeneralUsd.toFixed(2),
        Distancia: ''
    };

    // Agregar líneas de resumen
    detalles.push(subtotales, fomento, impuesto, totales, usdTotales);

    return {
        detalles: detalles,
        transportadores: Array.from(transportadores),
        origen: path[0],
        destino: path[path.length - 1],
        path: path,
        porcentaje: porcentaje,
        dolar: dolar,
        totales: {
            cop: totalGeneral,
            usd: totalGeneralUsd
        },
        estadisticas: {
            segmentos: path.length - 1,
            transportadores: transportadores.size
        }
    };
}

// Mostrar resultados
function displayResults(result) {
    const resultsCard = document.getElementById('resultsCard');
    const resultsContent = document.getElementById('resultsContent');

    let html = `
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">
                    <i class="fas fa-route me-2"></i>${result.origen} → ${result.destino}
                </h6>
                <small class="text-muted">${result.porcentaje}% | TRM: $${result.dolar.toLocaleString()}</small>
            </div>
        </div>
        
        <!-- Resumen Principal -->
        <div class="row g-2 mb-3">
            <div class="col-6">
                <div class="result-item text-center">
                    <div class="result-label">Total COP</div>
                    <div class="result-value">$${parseFloat(result.totales.cop).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</div>
                </div>
            </div>
            <div class="col-6">
                <div class="result-item text-center">
                    <div class="result-label">Total USD</div>
                    <div class="result-value">$${parseFloat(result.totales.usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                </div>
            </div>
        </div>
        
        <!-- Estadísticas -->
        <div class="row g-2 mb-3">
            <div class="col-4">
                <small class="text-muted">Segmentos</small><br>
                <strong>${result.estadisticas.segmentos}</strong>
            </div>
            <div class="col-4">
                <small class="text-muted">Transportadores</small><br>
                <strong>${result.estadisticas.transportadores}</strong>
            </div>
            <div class="col-4">
                <small class="text-muted">Ruta</small><br>
                <strong>${result.path.length - 1} tramos</strong>
            </div>
        </div>
        
        <!-- Transportadores -->
        <div class="mb-3">
            <small class="text-muted d-block mb-1">Transportadores:</small>
            ${result.transportadores.map(t =>
        `<span class="badge" style="background-color: ${TRANSPORTADOR_COLORS[t]}; color: ${t === 'PROMIORIENTE' ? 'black' : 'white'};">${t}</span>`
    ).join(' ')}
        </div>
        
        <!-- Desglose -->
        <div class="accordion accordion-flush" id="detailsAccordion">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#detailsCollapse">
                        <i class="fas fa-list me-2"></i>Ver Desglose Detallado
                    </button>
                </h2>
                <div id="detailsCollapse" class="accordion-collapse collapse" data-bs-parent="#detailsAccordion">
                    <div class="accordion-body p-2">
                        ${generateDetailedBreakdown(result)}
                    </div>
                </div>
            </div>
        </div>
    `;

    resultsContent.innerHTML = html;
    resultsCard.style.display = 'block';
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Generar desglose detallado
function generateDetailedBreakdown(result) {
    let html = `
        <!-- Desglose Completo -->
        <h6 class="mb-2"><i class="fas fa-table me-1"></i>Desglose Completo</h6>
        <div class="table-responsive">
            <table class="table table-sm table-striped">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Transportador</th>
                        <th>Fijos</th>
                        <th>Variables</th>
                        <th>AOM</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Mostrar todos los detalles de la estructura original
    result.detalles.forEach(detalle => {
        const isSubtotal = detalle.Tramo.includes('SUB TOTALES');
        const isFomento = detalle.Tramo.includes('fomento');
        const isImpuesto = detalle.Tramo.includes('Impuesto');
        const isTotal = detalle.Tramo.includes('TOTALES');
        const isUSD = detalle.Tramo === 'USD';

        let rowClass = '';
        if (isSubtotal) rowClass = 'table-warning';
        else if (isFomento || isImpuesto) rowClass = 'table-info';
        else if (isTotal) rowClass = 'table-success';
        else if (isUSD) rowClass = 'table-primary';

        html += `
            <tr class="${rowClass}">
                <td${isSubtotal || isTotal || isUSD ? ' style="font-weight: bold;"' : ''}>${detalle.Tramo}</td>
                <td>`;

        if (detalle.Transportador && detalle.Transportador !== '') {
            html += `<span class="badge" style="background-color: ${TRANSPORTADOR_COLORS[detalle.Transportador]}; color: ${detalle.Transportador === 'PROMIORIENTE' ? 'black' : 'white'}; font-size: 0.7rem;">${detalle.Transportador}</span>`;
        }

        const prefix = isUSD ? '$' : '$';
        const locale = isUSD ? 'en-US' : 'es-CO';

        html += `</td>
                <td${isSubtotal || isTotal || isUSD ? ' style="font-weight: bold;"' : ''}>${prefix}${parseFloat(detalle.Fijos).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
                <td${isSubtotal || isTotal || isUSD ? ' style="font-weight: bold;"' : ''}>${prefix}${parseFloat(detalle.Variables).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
                <td${isSubtotal || isTotal || isUSD ? ' style="font-weight: bold;"' : ''}>${prefix}${parseFloat(detalle.AOM).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
                <td${isSubtotal || isTotal || isUSD ? ' style="font-weight: bold;"' : ''}>${prefix}${parseFloat(detalle['Total Tramo']).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
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
}// Mostrar/ocultar loading
function showLoading(show) {
    if (show) {
        loadingModal.show();
    } else {
        loadingModal.hide();
    }
}

// Mostrar alerta
function showAlert(message, type = 'info') {
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto-remover después de 5 segundos
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