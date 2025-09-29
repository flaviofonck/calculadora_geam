// ===== MAPA INTERACTIVO - LEAFLET =====

// Variables globales del mapa
let map = null;
let layerGroups = {};
let routeLayer = null;
let markersLayer = null;

// Inicialización del mapa
document.addEventListener('DOMContentLoaded', function () {
    initializeMap();
});

// Inicializar mapa
function initializeMap() {
    console.log('🗺️ Inicializando mapa...');

    // Crear mapa centrado en Colombia
    map = L.map('map').setView([4.5709, -74.2973], 6);

    // Añadir capa base de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
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
        'promioriente': L.layerGroup().addTo(map)
    };

    // Capa para la ruta actual
    routeLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

// Cargar red de gasoductos en el mapa
function loadNetworkOnMap() {
    const nodePositions = {};

    // Recopilar posiciones de todos los nodos
    NETWORK_DATA.forEach(item => {
        if (item.Origen_Lat && item.Origen_Long) {
            nodePositions[item.Origen] = [item.Origen_Lat, item.Origen_Long];
        }
        if (item.Destino_Lat && item.Destino_Long) {
            nodePositions[item.Destino] = [item.Destino_Lat, item.Destino_Long];
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
                opacity: 0.7
            });

            // Popup con información
            const hasIntermediatePoints = intermediatePoints && intermediatePoints.length > 0;
            const totalCost = (Number(item.Fijos || 0) + Number(item.Variables || 0) + Number(item.AOM || 0));

            line.bindPopup(`
                <div class="popup-content">
                    <h6 class="mb-2">
                        ${item.Origen} → ${item.Destino}
                        ${hasIntermediatePoints ? '<i class="fas fa-bezier-curve text-success ms-1" title="Ruta optimizada"></i>' : ''}
                    </h6>
                    <p class="mb-1"><strong>Transportador:</strong> 
                        <span class="badge" style="background-color: ${color}; color: ${item.Transportador === 'PROMIORIENTE' ? 'black' : 'white'};">
                            ${item.Transportador}
                        </span>
                    </p>
                    <div class="row g-1">
                        <div class="col-4"><small><strong>Fijos:</strong><br>$${item.Fijos?.toLocaleString('es-CO', { maximumFractionDigits: 2 }) || '0'}</small></div>
                        <div class="col-4"><small><strong>Variables:</strong><br>$${item.Variables?.toLocaleString('es-CO', { maximumFractionDigits: 2 }) || '0'}</small></div>
                        <div class="col-4"><small><strong>AOM:</strong><br>$${item.AOM?.toLocaleString('es-CO', { maximumFractionDigits: 2 }) || '0'}</small></div>
                    </div>
                    <hr class="my-2">
                    <p class="mb-0 text-center"><strong>Total Base:</strong> $${totalCost.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p>
                </div>
            `);

            // Añadir a la capa correspondiente
            if (layerGroups[transportador]) {
                layerGroups[transportador].addLayer(line);
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

    // Recopilar posiciones de nodos
    const nodePositions = {};
    NETWORK_DATA.forEach(item => {
        if (item.Origen_Lat && item.Origen_Long) {
            nodePositions[item.Origen] = [item.Origen_Lat, item.Origen_Long];
        }
        if (item.Destino_Lat && item.Destino_Long) {
            nodePositions[item.Destino] = [item.Destino_Lat, item.Destino_Long];
        }
    });

    // Crear línea de ruta con puntos intermedios
    const routeCoordinates = [];

    // Procesar cada segmento de la ruta
    for (let i = 0; i < routeResult.path.length - 1; i++) {
        const origen = routeResult.path[i];
        const destino = routeResult.path[i + 1];

        // Agregar punto de origen
        if (nodePositions[origen]) {
            routeCoordinates.push(nodePositions[origen]);
        }

        // Buscar puntos intermedios para este segmento
        const segmentKey1 = `${origen}-${destino}`;
        const segmentKey2 = `${destino}-${origen}`; // Intentar en ambas direcciones

        let intermediatePoints = null;
        if (INTERMEDIATE_NODES && INTERMEDIATE_NODES[segmentKey1]) {
            intermediatePoints = INTERMEDIATE_NODES[segmentKey1];
        } else if (INTERMEDIATE_NODES && INTERMEDIATE_NODES[segmentKey2]) {
            // Si está en dirección inversa, invertir los puntos
            intermediatePoints = [...INTERMEDIATE_NODES[segmentKey2]].reverse();
        }

        // Agregar puntos intermedios si existen
        if (intermediatePoints) {
            console.log(`🗺️ Usando puntos intermedios para ${origen} → ${destino}:`, intermediatePoints.length);
            intermediatePoints.forEach(point => {
                routeCoordinates.push([point.lat, point.lon]);
            });
        }
    }

    // Agregar el último nodo de destino
    const lastNode = routeResult.path[routeResult.path.length - 1];
    if (nodePositions[lastNode]) {
        routeCoordinates.push(nodePositions[lastNode]);
    }

    if (routeCoordinates.length > 1) {
        // Línea principal de la ruta con puntos intermedios
        const routeLine = L.polyline(routeCoordinates, {
            color: '#ff0000',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 5'
        });

        routeLine.bindPopup(`
            <div class="popup-content">
                <h6 class="mb-2">Ruta Calculada</h6>
                <p class="mb-1"><strong>${routeResult.origen} → ${routeResult.destino}</strong></p>
                <p class="mb-1">Segmentos: ${routeResult.estadisticas.segmentos}</p>
                <p class="mb-0">Total: $${routeResult.totales.cop.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP</p>
            </div>
        `);

        routeLayer.addLayer(routeLine);

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
        map.fitBounds(bounds, { padding: [20, 20] });
    }
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