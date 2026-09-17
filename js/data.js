// ===== DATOS DESDE LA API =====

const PREDEFINED_ROUTES = [
    { origen: 'Jobo', destino: 'La Mami', label: 'Jobo → La Mami' },
    { origen: 'Jobo', destino: 'Cartagena', label: 'Jobo → Cartagena' },
    { origen: 'Jobo', destino: 'Ballenas_prom', label: 'Jobo → Ballenas_prom' },
    { origen: 'Jobo', destino: 'Sebastopol', label: 'Jobo → Sebastopol' },
    { origen: 'Cartagena', destino: 'Vasconia', label: 'Cartagena → Vasconia' },
    { origen: 'Cartagena', destino: 'Sebastopol', label: 'Cartagena → Sebastopol' },
    { origen: 'La Mami', destino: 'Barranquilla', label: 'La Mami → Barranquilla' },
    { origen: 'La Mami', destino: 'Cartagena', label: 'La Mami → Cartagena' },
    { origen: 'Cusiana', destino: 'Transmetano', label: 'Cusiana → Transmetano' },
    { origen: 'Cusiana', destino: 'Porvenir', label: 'Cusiana → Porvenir' },
    { origen: 'Sebastopol', destino: 'Medellin', label: 'Medellin' },
    { origen: 'Barrancabermeja', destino: 'Bucaramanga', label: 'Promioriente' }
];

const INTERMEDIATE_NODES = {
    "Barranquilla-La Mami": [
        { lat: 10.976351219572305, lon: -74.4978695786078 },
        { lat: 10.9705799302616, lon: -74.37361335855348 },
        { lat: 10.990608408602645, lon: -74.28639479571576 },
        { lat: 11.019489435301825, lon: -74.20398532289543 }
    ],
    "La Mami-Ballenas_prom": [
        { lat: 11.233334032040187, lon: -73.71664574363813 },
        { lat: 11.235087276825253, lon: -73.56702156631384 },
        { lat: 11.253332633360642, lon: -73.34962710541369 },
        { lat: 11.397725596830796, lon: -73.11174465471267 },
        { lat: 11.6956, lon: -72.7239 }
    ],
    "Barranca-Sebastopol": [
        { lat: 10.046665862735678, lon: -73.23761255265457 },
        { lat: 8.41492071811435, lon: -73.71831441504497 },
        { lat: 7.11361114914423, lon: -73.85842392390673 }
    ]
};

window.PREDEFINED_ROUTES = PREDEFINED_ROUTES;
window.INTERMEDIATE_NODES = INTERMEDIATE_NODES;

async function initData() {
    try {
        const base = window.API_BASE_URL;

        const [nodosRes, topologiaRes] = await Promise.all([
            fetch(base + '/nodos'),
            fetch(base + '/topologia')
        ]);

        const nodosData = await nodosRes.json();
        const topologia = await topologiaRes.json();

        window.NODES = nodosData.nodos;
        window.TOPOLOGIA_NODOS = topologia.nodos;

        window.TRANSPORTADOR_COLORS = {
            TGI: '#5a6b7d',
            PROMIGAS: '#0a6ed1',
            PROMIORIENTE: '#b06a00',
            'Conexión Especial': '#0f8a5f'
        };

        window.NETWORK_DATA = topologia.tramos.map(function (t) {
            return {
                id: t.id,
                Origen: t.origen,
                Destino: t.destino,
                Tipo: t.tipo,
                Transportador: t.transportador,
                Tramo: t.origen + ' - ' + t.destino
            };
        });

        window.dispatchEvent(new Event('geam-data-loaded'));

        console.log('✅ Datos cargados desde API:', {
            nodos: window.NODES.length,
            tramos: window.NETWORK_DATA.length,
            transportadores: Object.keys(window.TRANSPORTADOR_COLORS)
        });
    } catch (err) {
        console.error('Error cargando datos:', err);
        var aviso = document.createElement('div');
        aviso.className = 'alert alert-danger position-fixed';
        aviso.style.cssText = 'top:20px;left:50%;transform:translateX(-50%);z-index:9999;';
        aviso.textContent = 'Error al cargar datos de la red de gasoductos. Verifique que el servicio esté disponible.';
        document.body.appendChild(aviso);
    }
}

function getOriginNodes() {
    return (window.NODES || []).slice().sort();
}

function getAllDestinationNodes() {
    return (window.NODES || []).slice().sort();
}

function getDestinationNodes(origen) {
    console.log('⚠️ getDestinationNodes está deprecated, usando getAllDestinationNodes');
    return getAllDestinationNodes();
}

function getNodeInfo(nodeName) {
    var tramos = (window.NETWORK_DATA || []).filter(function (item) {
        return item.Origen === nodeName || item.Destino === nodeName;
    });
    if (tramos.length === 0) return null;
    return {
        name: nodeName,
        connections: tramos.length
    };
}

window.getOriginNodes = getOriginNodes;
window.getAllDestinationNodes = getAllDestinationNodes;
window.getDestinationNodes = getDestinationNodes;
window.getNodeInfo = getNodeInfo;
window.initData = initData;

initData();
