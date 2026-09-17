// ===== MAPA INTERACTIVO - LEAFLET =====

// Variables globales del mapa
let map = null;
let layerGroups = {};
let routeLayer = null;
let markersLayer = null;
let routeSegmentElements = new Map();

// Inicialización del mapa
window.addEventListener('geam-data-loaded', function () {
    initializeMap();
});
if (window.NETWORK_DATA) {
    initializeMap();
}

// Inicializar mapa
function initializeMap() {
    console.log('🗺️ Inicializando mapa...');

    // Crear mapa centrado en Colombia
    map = L.map('map').setView([4.5709, -74.2973], 6);
    window.map = map;
    window.__GEAM_MAP__ = map;

    // Añadir capa base OpenStreetMap sin clave
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Inicializar capas por transportador
    initializeLayers();

    // Cargar red de gasoductos
    loadNetworkOnMap();

    console.log('✅ Mapa inicializado correctamente');
}

// Inicializar capas por transportador
function initializeLayers() {
    layerGroups = {
        'tgi': L.layerGroup().addTo(map),
        'promigas': L.layerGroup().addTo(map),
        'promioriente': L.layerGroup().addTo(map),
        'conexión especial': L.layerGroup().addTo(map)
    };

    // Capa para la ruta actual
    routeLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    window.markersLayer = markersLayer;
    window.layerGroups = layerGroups;
}

function routeKey(from, to) {
    return `${from}|${to}`;
}

function clearRouteFocus() {
    routeSegmentElements.forEach(segment => segment.element?.classList.remove('ruta__tramo--enfocado'));
    document.querySelectorAll('.desglose__fila[aria-current="true"]').forEach(row => row.removeAttribute('aria-current'));
}

function focusRouteSegment(from, to, source) {
    clearRouteFocus();
    const segment = routeSegmentElements.get(routeKey(from, to));
    const row = [...document.querySelectorAll('.desglose__fila[data-route-from]')].find(item =>
        item.dataset.routeFrom === from && item.dataset.routeTo === to);
    if (segment) {
        segment.element?.classList.add('ruta__tramo--enfocado');
        segment.layer.openTooltip();
    }
    if (row && source === 'map') row.setAttribute('aria-current', 'true');
    if (row && source === 'row') row.setAttribute('aria-current', 'true');
}

function bindRouteInteractions() {
    document.querySelectorAll('.desglose__fila[data-route-from]').forEach(row => {
        row.addEventListener('pointerenter', () => focusRouteSegment(row.dataset.routeFrom, row.dataset.routeTo, 'row'));
        row.addEventListener('focusin', () => focusRouteSegment(row.dataset.routeFrom, row.dataset.routeTo, 'row'));
        row.addEventListener('pointerleave', clearRouteFocus);
        row.addEventListener('focusout', event => {
            if (!row.contains(event.relatedTarget)) clearRouteFocus();
        });
    });
}

// Cargar red de gasoductos en el mapa
function loadNetworkOnMap() {
    const nodePositions = {};

    (window.TOPOLOGIA_NODOS || []).forEach(function (n) {
        if (n.lat != null && n.lon != null) {
            nodePositions[n.nombre] = [n.lat, n.lon];
        }
    });

    // Crear líneas de conexión con puntos intermedios
    NETWORK_DATA.forEach(item => {
        if (item.Origen === 'Estampilla') return;

        const origenPos = nodePositions[item.Origen];
        const destinoPos = nodePositions[item.Destino];

        if (origenPos && destinoPos) {
            const color = TRANSPORTADOR_COLORS[item.Transportador] || '#666666';
            const transportador = item.Transportador.toLowerCase();

            // Crear coordenadas de la línea con puntos intermedios
            const lineCoordinates = [origenPos];

            // Buscar puntos intermedios para este segmento
            const segmentKey1 = `${item.Origen}-${item.Destino}`;
            const segmentKey2 = `${item.Destino}-${item.Origen}`;

            let intermediatePoints = null;
            if (INTERMEDIATE_NODES && INTERMEDIATE_NODES[segmentKey1]) {
                intermediatePoints = INTERMEDIATE_NODES[segmentKey1];
            } else if (INTERMEDIATE_NODES && INTERMEDIATE_NODES[segmentKey2]) {
                // Si está en dirección inversa, invertir los puntos
                intermediatePoints = [...INTERMEDIATE_NODES[segmentKey2]].reverse();
            }

            // Agregar puntos intermedios si existen
            if (intermediatePoints) {
                intermediatePoints.forEach(point => {
                    lineCoordinates.push([point.lat, point.lon]);
                });
            }

            lineCoordinates.push(destinoPos);

            // Crear línea con puntos intermedios o directa
            const line = L.polyline(lineCoordinates, {
                color: color,
                weight: 3,
                opacity: 1,
                className: 'red--secundaria'
            });

            // Popup con información — costo bajo demanda
            const hasIntermediatePoints = intermediatePoints && intermediatePoints.length > 0;
            const tramoId = item.id;

            const popupContent = document.createElement('div');
            popupContent.className = 'popup-content';
            popupContent.innerHTML = `
                <h6 class="mb-2">
                    ${item.Origen} → ${item.Destino}
                    ${hasIntermediatePoints ? '<i class="fas fa-bezier-curve text-success ms-1" title="Ruta optimizada"></i>' : ''}
                </h6>
                <p class="mb-1"><strong>Transportador:</strong>
                    <span class="badge" style="background-color: ${color}; color: ${item.Transportador === 'PROMIORIENTE' ? 'black' : 'white'};">
                        ${item.Transportador}
                    </span>
                </p>
                <p class="mb-0 text-center"><strong>Costo:</strong> <span class="tramo-costo">Cargando…</span></p>
            `;

            line.bindPopup(popupContent);

            line.on('popupopen', function () {
                var costoEl = popupContent.querySelector('.tramo-costo');
                fetch(window.API_BASE_URL + '/tramos/' + tramoId + '/costo')
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        costoEl.textContent = '$' + Number(data.costo).toLocaleString('es-CO', { maximumFractionDigits: 2 });
                    })
                    .catch(function () {
                        costoEl.textContent = 'No disponible';
                    });
            });

            // Añadir a la capa correspondiente
            if (layerGroups[transportador]) {
                layerGroups[transportador].addLayer(line);
                const lineElement = line.getElement();
                lineElement?.classList.add('red--secundaria');
                lineElement?.setAttribute('data-network-segment', 'true');
                lineElement?.setAttribute('data-route-segment', 'false');
            }
        }
    });

    // Añadir marcadores de nodos principales
    addNodeMarkers(nodePositions);

    // Contar segmentos con puntos intermedios
    let segmentsWithPoints = 0;
    let totalSegments = 0;

    NETWORK_DATA.forEach(item => {
        if (item.Origen === 'Estampilla') return;
        totalSegments++;

        const segmentKey1 = `${item.Origen}-${item.Destino}`;
        const segmentKey2 = `${item.Destino}-${item.Origen}`;

        if (INTERMEDIATE_NODES && (INTERMEDIATE_NODES[segmentKey1] || INTERMEDIATE_NODES[segmentKey2])) {
            segmentsWithPoints++;
        }
    });

    console.log(`🗺️ Red cargada: ${Object.keys(nodePositions).length} nodos, ${totalSegments} segmentos`);
    console.log(`🎯 Puntos intermedios: ${segmentsWithPoints}/${totalSegments} segmentos optimizados`);
}

// Crear icono personalizado para nodos
function createNodeIcon(type = 'station', color = '#9ca3af') {
    const iconMap = {
        'station': 'fas fa-gas-pump',
        'terminal': 'fas fa-industry',
        'connection': 'fas fa-project-diagram',
        'city': 'fas fa-city',
        'ballenas': 'fas fa-ship',
        'origin': 'fas fa-play-circle',
        'destination': 'fas fa-flag-checkered'
    };

    const icon = iconMap[type] || 'fas fa-circle';

    return L.divIcon({
        html: `<div style="
            background-color: ${color};
            width: 15px;
            height: 15px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 8px;
        "><i class="${icon}"></i></div>`,
        className: 'custom-node-marker',
        iconSize: [15, 15],
        iconAnchor: [7.5, 7.5],
        popupAnchor: [0, -7.5]
    });
}

// Añadir marcadores de nodos
function addNodeMarkers(nodePositions) {
    // Usar color gris claro por defecto para todos los nodos
    const defaultColor = '#9ca3af';

    Object.entries(nodePositions).forEach(([nodeName, position]) => {
        // Determinar tipo de nodo basado en el nombre
        let nodeType = 'station';
        const nameLower = nodeName.toLowerCase();

        if (nameLower.includes('ballenas') || nameLower.includes('ballena')) {
            nodeType = 'ballenas';
        } else if (nameLower.includes('terminal') || nameLower.includes('gtl') || nameLower.includes('planta')) {
            nodeType = 'terminal';
        } else if (['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena', 'bucaramanga'].includes(nameLower)) {
            nodeType = 'city';
        } else if (nameLower.includes('compres') || nameLower.includes('estacion')) {
            nodeType = 'station';
        } else {
            nodeType = 'connection';
        }

        const marker = L.marker(position, {
            icon: createNodeIcon(nodeType, defaultColor)
        });

        marker.bindPopup(`
            <div class="popup-content">
                <h6 class="mb-1"><i class="${nodeType === 'city' ? 'fas fa-city' : 'fas fa-gas-pump'} me-2"></i>${nodeName.replace(/_/g, ' ')}</h6>
                <small class="text-muted">
                    ${nodeType === 'city' ? 'Ciudad' :
                nodeType === 'terminal' ? 'Terminal' :
                    nodeType === 'ballenas' ? 'Terminal Marítima' :
                        nodeType === 'connection' ? 'Punto de Conexión' : 'Estación de Gas'}
                </small>
            </div>
        `);

        // Añadir a capa de marcadores
        markersLayer.addLayer(marker);
    });
}

// Actualizar ruta en el mapa
function updateMapRoute(routeResult) {
    if (!routeResult || !routeResult.success) return;

    console.log('🗺️ Actualizando ruta en mapa:', routeResult.path);

    // Limpiar ruta anterior
    routeLayer.clearLayers();
    routeSegmentElements.clear();
    clearRouteFocus();

    // Recopilar posiciones de nodos
    const nodePositions = {};
    (window.TOPOLOGIA_NODOS || []).forEach(function (n) {
        if (n.lat != null && n.lon != null) {
            nodePositions[n.nombre] = [n.lat, n.lon];
        }
    });

    const routeCoordinates = [];

    // Un tramo calculado conserva su geometría y transportador propios.
    for (let i = 0; i < routeResult.path.length - 1; i++) {
        const origen = routeResult.path[i];
        const destino = routeResult.path[i + 1];
        const item = NETWORK_DATA.find(segment =>
            (segment.Origen === origen && segment.Destino === destino) ||
            (segment.Origen === destino && segment.Destino === origen));
        const segmentKey1 = `${origen}-${destino}`;
        const segmentKey2 = `${destino}-${origen}`;
        let intermediatePoints = null;

        if (INTERMEDIATE_NODES && INTERMEDIATE_NODES[segmentKey1]) {
            intermediatePoints = INTERMEDIATE_NODES[segmentKey1];
        } else if (INTERMEDIATE_NODES && INTERMEDIATE_NODES[segmentKey2]) {
            intermediatePoints = [...INTERMEDIATE_NODES[segmentKey2]].reverse();
        }

        const coordinates = [nodePositions[origen]];
        if (intermediatePoints) {
            intermediatePoints.forEach(point => coordinates.push([point.lat, point.lon]));
        }
        coordinates.push(nodePositions[destino]);
        if (!item || coordinates.some(point => !point)) continue;
        routeCoordinates.push(...coordinates);

        const color = TRANSPORTADOR_COLORS[item.Transportador] || '#666666';
        const routeLine = L.polyline(coordinates, {
            color,
            weight: 4,
            opacity: 0.8,
            className: 'ruta__tramo'
        });
        const flowLine = L.polyline(coordinates, {
            color: '#ffffff',
            weight: 2,
            opacity: 0.85,
            className: 'ruta__flujo'
        });

        routeLayer.addLayer(routeLine);
        routeLayer.addLayer(flowLine);
        const routeLineElement = routeLine.getElement();
        const detail = routeResult.detalles.find(item => item.Tramo === `${origen} - ${destino}` || item.Tramo === `${destino} - ${origen}`);
        routeLine.bindTooltip(`${origen} → ${destino}: ${formatRouteValue(detail?.['Total Tramo'])}`, { sticky: true });
        routeSegmentElements.set(routeKey(origen, destino), { layer: routeLine, element: routeLineElement });
        routeLine.on('mouseover', () => focusRouteSegment(origen, destino, 'map'));
        routeLine.on('mouseout', clearRouteFocus);
        routeLineElement?.setAttribute('data-network-segment', 'true');
        routeLineElement?.setAttribute('data-route-segment', 'true');
        routeLineElement?.setAttribute('data-route-from', origen);
        routeLineElement?.setAttribute('data-route-to', destino);
        routeLineElement?.setAttribute('pathLength', '1');
        routeLineElement?.style.setProperty('--ruta-delay', `${i * 160}ms`);
    }

    bindRouteInteractions();

    if (routeCoordinates.length > 1) {

        // Marcadores de origen y destino
        const origenPos = nodePositions[routeResult.origen];
        const destinoPos = nodePositions[routeResult.destino];

        if (origenPos) {
            const origenMarker = L.marker(origenPos, {
                icon: createCustomIcon('#10b981', 'fas fa-play')
            });
            origenMarker.bindPopup(`
                <div class="popup-content">
                    <h6 class="mb-1"><i class="fas fa-play text-success me-1"></i>Origen</h6>
                    <p class="mb-0"><strong>${routeResult.origen.replace(/_/g, ' ')}</strong></p>
                </div>
            `);
            routeLayer.addLayer(origenMarker);
        }

        if (destinoPos) {
            const destinoMarker = L.marker(destinoPos, {
                icon: createCustomIcon('#dc2626', 'fas fa-flag-checkered')
            });
            destinoMarker.bindPopup(`
                <div class="popup-content">
                    <h6 class="mb-1"><i class="fas fa-flag-checkered text-danger me-1"></i>Destino</h6>
                    <p class="mb-0"><strong>${routeResult.destino.replace(/_/g, ' ')}</strong></p>
                </div>
            `);
            routeLayer.addLayer(destinoMarker);
        }

        // Ajustar vista del mapa a la ruta
        const bounds = L.latLngBounds(routeCoordinates);
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            map.flyToBounds(bounds, { duration: 0.6, padding: [20, 20] });
        } else {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }
}

function formatRouteValue(value) {
    return value == null ? 'Valor no disponible' : '$' + Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

// Crear icono personalizado
function createCustomIcon(color, iconClass) {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div style="
                background-color: ${color};
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 2px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
                <i class="${iconClass}" style="color: white; font-size: 10px;"></i>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

// Alternar visibilidad de capas
function toggleLayer(transportador) {
    const layer = layerGroups[transportador.toLowerCase()];

    if (!layer) return;

    if (map.hasLayer(layer)) {
        map.removeLayer(layer);
        console.log(`🙈 Capa ${transportador} ocultada`);
    } else {
        map.addLayer(layer);
        console.log(`👁️ Capa ${transportador} mostrada`);
    }

    // Actualizar estado visual del botón
    updateLayerButton(transportador, map.hasLayer(layer));
}

// Actualizar estado visual del botón de capa
function updateLayerButton(transportador, isVisible) {
    const buttons = document.querySelectorAll(`button[onclick="toggleLayer('${transportador.toLowerCase()}')"]`);

    buttons.forEach(button => {
        if (isVisible) {
            button.classList.remove('btn-outline-secondary', 'btn-outline-info', 'btn-outline-warning');

            switch (transportador.toLowerCase()) {
                case 'tgi':
                    button.classList.add('btn-secondary');
                    break;
                case 'promigas':
                    button.classList.add('btn-info');
                    break;
                case 'promioriente':
                    button.classList.add('btn-warning');
                    break;
            }
        } else {
            button.classList.remove('btn-secondary', 'btn-info', 'btn-warning');

            switch (transportador.toLowerCase()) {
                case 'tgi':
                    button.classList.add('btn-outline-secondary');
                    break;
                case 'promigas':
                    button.classList.add('btn-outline-info');
                    break;
                case 'promioriente':
                    button.classList.add('btn-outline-warning');
                    break;
            }
        }
    });
}

// Exportar funciones para uso global
window.updateMapRoute = updateMapRoute;
window.toggleLayer = toggleLayer;
