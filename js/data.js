// ===== DATOS EXACTOS DEL JSON ORIGINAL =====
// Copiado directamente de _json/tramos.json

const NETWORK_DATA = [
    { "Origen": "Ballenas_tgi", "Destino": "Barranca", "Fijos": 3163.3123287671, "Variables": 4857.0, "AOM": 2172.6054794521, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Ballenas_tgi - Barranca", "Origen_Lat": 11.6956609534, "Origen_Long": -72.7239558294, "Destino_Lat": 10.95672, "Destino_Long": -72.79456 },
    { "Origen": "Barranca", "Destino": "Sebastopol", "Fijos": 1456.5589041096, "Variables": 3259.0, "AOM": 523.2082191781, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Barranca - Sebastopol", "Origen_Lat": 10.95672, "Origen_Long": -72.79456, "Destino_Lat": 6.481174, "Destino_Long": -74.409284 },
    { "Origen": "Barrancabermeja", "Destino": "Payoa", "Fijos": 1456.5589041096, "Variables": 3259.0, "AOM": 523.2082191781, "Tipo": "Punto", "Transportador": "PROMIORIENTE", "Tramo": "Barrancabermeja - Payoa", "Origen_Lat": 7.1136111491, "Origen_Long": -73.8584239239, "Destino_Lat": 7.262425529, "Destino_Long": -73.396404161 },
    { "Origen": "Payoa", "Destino": "Bucaramanga", "Fijos": 1456.5589041096, "Variables": 3259.0, "AOM": 523.2082191781, "Tipo": "Punto", "Transportador": "PROMIORIENTE", "Tramo": "Payoa - Bucaramanga", "Origen_Lat": 7.262425529, "Origen_Long": -73.396404161, "Destino_Lat": 7.0884626531, "Destino_Long": -73.1342231796 },
    { "Origen": "Sebastopol", "Destino": "Transmetano", "Fijos": 0.00001, "Variables": 0.00001, "AOM": 0.0, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Sebastopol - Transmetano", "Origen_Lat": 6.481174, "Origen_Long": -74.409284, "Destino_Lat": 6.5364942427, "Destino_Long": -75.0779327697 },
    { "Origen": "Transmetano", "Destino": "Donmatias", "Fijos": 0.00001, "Variables": 0.00001, "AOM": 0.0, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Transmetano - Donmatias", "Origen_Lat": 6.5364942427, "Origen_Long": -75.0779327697, "Destino_Lat": 6.5013942951, "Destino_Long": -75.3729306812 },
    { "Origen": "Donmatias", "Destino": "Barbosa", "Fijos": 0.00001, "Variables": 0.00001, "AOM": 0.0, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Donmatias - Barbosa", "Origen_Lat": 6.5013942951, "Origen_Long": -75.3729306812, "Destino_Lat": 6.4355359867, "Destino_Long": -75.3297882668 },
    { "Origen": "Barbosa", "Destino": "Girardota", "Fijos": 0.00001, "Variables": 0.00001, "AOM": 0.0, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Barbosa - Girardota", "Origen_Lat": 6.4355359867, "Origen_Long": -75.3297882668, "Destino_Lat": 6.3821246106, "Destino_Long": -75.4449953984 },
    { "Origen": "Girardota", "Destino": "Bello", "Fijos": 0.00001, "Variables": 0.00001, "AOM": 0.0, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Girardota - Bello", "Origen_Lat": 6.3821246106, "Origen_Long": -75.4449953984, "Destino_Lat": 6.3397268616, "Destino_Long": -75.559720481 },
    { "Origen": "Bello", "Destino": "Medellin", "Fijos": 5254.295304, "Variables": 6590.0, "AOM": 839.9753425, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Bello - Medellin", "Origen_Lat": 6.3397268616, "Origen_Long": -75.559720481, "Destino_Lat": 6.2456765117, "Destino_Long": -75.5722851265 },
    { "Origen": "Sebastopol", "Destino": "Vasconia", "Fijos": 594.7068493151, "Variables": 1800.0, "AOM": 150.6054794521, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Sebastopol - Vasconia", "Origen_Lat": 6.481174, "Origen_Long": -74.409284, "Destino_Lat": 6.065833, "Destino_Long": -74.558611 },
    { "Origen": "Vasconia", "Destino": "Mariquita", "Fijos": 1415.2767123288, "Variables": 2127.0, "AOM": 391.9479452055, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Vasconia - Mariquita", "Origen_Lat": 6.065833, "Origen_Long": -74.558611, "Destino_Lat": 5.1995043, "Destino_Long": -74.9258032 },
    { "Origen": "Mariquita", "Destino": "Gualanday", "Fijos": 4920.9068493151, "Variables": 5223.0, "AOM": 963.2821917808, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Mariquita - Gualanday", "Origen_Lat": 5.1995043, "Origen_Long": -74.9258032, "Destino_Lat": 4.2815697321, "Destino_Long": -75.0231792615 },
    { "Origen": "Gualanday", "Destino": "Neiva", "Fijos": 17883.1506849315, "Variables": 19908.0, "AOM": 2319.7835616438, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Gualanday - Neiva", "Origen_Lat": 4.2815697321, "Origen_Long": -75.0231792615, "Destino_Lat": 2.9353899743, "Destino_Long": -75.2797708372 },
    { "Origen": "Gualanday", "Destino": "Montañuelo", "Fijos": 0.0, "Variables": 0.0, "AOM": 0.0, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Gualanday - Montañuelo", "Origen_Lat": 4.2815697321, "Origen_Long": -75.0231792615, "Destino_Lat": 4.2057735318, "Destino_Long": -75.1271002733 },
    { "Origen": "Mariquita", "Destino": "Pereira", "Fijos": 1777.0794520548, "Variables": 2853.0, "AOM": 1343.7726027397, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Mariquita - Pereira", "Origen_Lat": 4.2057735318, "Origen_Long": -75.1271002733, "Destino_Lat": 4.8124943333, "Destino_Long": -75.6938669085 },
    { "Origen": "Pereira", "Destino": "Armenia", "Fijos": 627.5808219178, "Variables": 1063.0, "AOM": 461.3589041096, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Pereira - Armenia", "Origen_Lat": 4.8124943333, "Origen_Long": -75.6938669085, "Destino_Lat": 4.5374788926, "Destino_Long": -75.6826106025 },
    { "Origen": "Armenia", "Destino": "Cali", "Fijos": 1447.7123287671, "Variables": 2547.0, "AOM": 1034.1232876712, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Armenia - Cali", "Origen_Lat": 4.5374788926, "Origen_Long": -75.6826106025, "Destino_Lat": 3.5245696094, "Destino_Long": -76.4980644951 },
    { "Origen": "Cali", "Destino": "Acopi", "Fijos": 1447.7123287671, "Variables": 2547.0, "AOM": 1034.1232876712, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Cali - Acopi", "Origen_Lat": 3.5245696094, "Origen_Long": -76.4980644951, "Destino_Lat": 3.4924677063, "Destino_Long": -76.5229724074 },
    { "Origen": "Vasconia", "Destino": "La Belleza", "Fijos": 1595.8904109589, "Variables": 2407.0, "AOM": 275.2630136986, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Vasconia - La Belleza", "Origen_Lat": 6.065833, "Origen_Long": -74.558611, "Destino_Lat": 5.8562231944, "Destino_Long": -73.9660706557 },
    { "Origen": "La Belleza", "Destino": "Cogua", "Fijos": 1072.7342465753, "Variables": 1461.0, "AOM": 190.704109589, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "La Belleza - Cogua", "Origen_Lat": 5.8562231944, "Origen_Long": -73.9660706557, "Destino_Lat": 5.0606237025, "Destino_Long": -73.9770726291 },
    { "Origen": "Cogua", "Destino": "Sabana", "Fijos": 0.0, "Variables": 0.0, "AOM": 0.0, "Tipo": "Intermedio", "Transportador": "TGI", "Tramo": "Cogua - Sabana", "Origen_Lat": 5.0606237025, "Origen_Long": -73.9770726291, "Destino_Lat": null, "Destino_Long": null },
    { "Origen": "La Belleza", "Destino": "Porvenir", "Fijos": 2993.3726027397, "Variables": 4205.0, "AOM": 626.7452054795, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "La Belleza - Porvenir", "Origen_Lat": 5.8562231944, "Origen_Long": -73.9660706557, "Destino_Lat": 5.1664406381, "Destino_Long": -72.3837192658 },
    { "Origen": "Porvenir", "Destino": "Cusiana", "Fijos": 273.9726027397, "Variables": 382.0, "AOM": 42.6465753425, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Porvenir - Cusiana", "Origen_Lat": 5.1664406381, "Origen_Long": -72.3837192658, "Destino_Lat": 5.0050800744, "Destino_Long": -72.709926323 },
    { "Origen": "Cusiana", "Destino": "Apiay", "Fijos": 1900.6219178082, "Variables": 1965.0, "AOM": 864.6219178082, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Cusiana - Apiay", "Origen_Lat": 5.0050800744, "Origen_Long": -72.709926323, "Destino_Lat": 4.0876333461, "Destino_Long": -73.5730822566 },
    { "Origen": "Apiay", "Destino": "Villavicencio", "Fijos": 1542.8767123288, "Variables": 1666.0, "AOM": 360.2794520548, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Apiay - Villavicencio", "Origen_Lat": 4.0876333461, "Origen_Long": -73.5730822566, "Destino_Lat": 4.1449597548, "Destino_Long": -73.6354967975 },
    { "Origen": "Apiay", "Destino": "Usme", "Fijos": 2128.0849315068, "Variables": 2127.0, "AOM": 881.1479452055, "Tipo": "Punto", "Transportador": "TGI", "Tramo": "Apiay - Usme", "Origen_Lat": 4.0876333461, "Origen_Long": -73.5730822566, "Destino_Lat": 4.510986527, "Destino_Long": -74.1094519788 },
    { "Origen": "Ballenas_prom", "Destino": "La Mami", "Fijos": 746.9762786322, "Variables": 1219.7798632709, "AOM": 283.2501435727, "Tipo": "Punto", "Transportador": "PROMIGAS", "Tramo": "Ballenas_prom - La Mami", "Origen_Lat": 11.6956609534, "Origen_Long": -72.7239558294, "Destino_Lat": 11.494248331, "Destino_Long": -72.8898337418 },
    { "Origen": "La Mami", "Destino": "Barranquilla", "Fijos": 1320.9236117808, "Variables": 2030.7595785274, "AOM": 281.6522093389, "Tipo": "Punto", "Transportador": "PROMIGAS", "Tramo": "La Mami - Barranquilla", "Origen_Lat": 11.2390965087, "Origen_Long": -74.1295847838, "Destino_Lat": 10.9505373563, "Destino_Long": -74.7593397553 },
    { "Origen": "Barranquilla", "Destino": "Cartagena", "Fijos": 750.4040688149, "Variables": 865.176367302, "AOM": 434.5181150368, "Tipo": "Punto", "Transportador": "PROMIGAS", "Tramo": "Barranquilla - Cartagena", "Origen_Lat": 10.9505373563, "Origen_Long": -74.7593397553, "Destino_Lat": 10.41602484, "Destino_Long": -75.4389749841 },
    { "Origen": "Cartagena", "Destino": "Sincelejo", "Fijos": 2127.12308916, "Variables": 2537.2293158283, "AOM": 253.2533281119, "Tipo": "Punto", "Transportador": "PROMIGAS", "Tramo": "Cartagena - Sincelejo", "Origen_Lat": 10.41602484, "Origen_Long": -75.4389749841, "Destino_Lat": 9.3066733902, "Destino_Long": -75.3706265923 },
    { "Origen": "Cartagena", "Destino": "Red Mamonal", "Fijos": 146.1716062723, "Variables": 161.4267328221, "AOM": 47.8959249441, "Tipo": "Punto", "Transportador": "PROMIGAS", "Tramo": "Cartagena - Red Mamonal", "Origen_Lat": 10.41602484, "Origen_Long": -75.4389749841, "Destino_Lat": 10.3129106337, "Destino_Long": -75.4831512893 },
    { "Origen": "Sincelejo", "Destino": "La Creciente", "Fijos": 915.4021986675, "Variables": 914.7446788324, "AOM": 154.9765735468, "Tipo": "Punto", "Transportador": "PROMIGAS", "Tramo": "Sincelejo - La Creciente", "Origen_Lat": 9.3066733902, "Origen_Long": -75.3706265923, "Destino_Lat": 9.4114755248, "Destino_Long": -75.0948556416 },
    { "Origen": "Sincelejo", "Destino": "Jobo", "Fijos": 1706.7157008453, "Variables": 1802.5051515609, "AOM": 909.5348863707, "Tipo": "Punto", "Transportador": "PROMIGAS", "Tramo": "Sincelejo - Jobo", "Origen_Lat": 9.3066733902, "Origen_Long": -75.3706265923, "Destino_Lat": 8.8055586357, "Destino_Long": -75.2601061452 },
    // Conexiones especiales 
    { "Origen": "Ballenas_tgi", "Destino": "Ballenas_prom", "Fijos": 0, "Variables": 0, "AOM": 0, "Tipo": "Conexión", "Transportador": "Conexión Especial", "Tramo": "Conexión Especial", "Origen_Lat": 11.6956609534, "Origen_Long": -72.7239558294, "Destino_Lat": 11.6956609534, "Destino_Long": -72.7239558294 },
    { "Origen": "Ballenas_prom", "Destino": "Ballenas_tgi", "Fijos": 0, "Variables": 0, "AOM": 0, "Tipo": "Conexión", "Transportador": "Conexión Especial", "Tramo": "Conexión Especial", "Origen_Lat": 11.6956609534, "Origen_Long": -72.7239558294, "Destino_Lat": 11.6956609534, "Destino_Long": -72.7239558294 }
];

// Estampillas exactas del JSON original  
const ESTAMPILLAS = {
    "TGI": { "Fijos": 514.895890411, "Variables": 730.0, "AOM": 143.5397260274 },
    "PROMIGAS": { "Fijos": 830.7279288551, "Variables": 1217.9600763099, "AOM": 92.4901872274 },
    "PROMIORIENTE": { "Fijos": 514.895890411, "Variables": 730.0, "AOM": 143.5397260274 } // Mismas que TGI según original
};

// Configuración de colores por transportador
const TRANSPORTADOR_COLORS = {
    'TGI': '#808080',        // Gris
    'PROMIGAS': '#0066ff',   // Azul
    'PROMIORIENTE': '#ffff00' // Amarillo
};

// Lista de nodos únicos - extraídos del JSON original
const NODES = [
    'Acopi', 'Apiay', 'Armenia', 'Ballenas_prom', 'Ballenas_tgi', 'Barbosa',
    'Barranca', 'Barrancabermeja', 'Barranquilla', 'Bello', 'Bucaramanga',
    'Cali', 'Cartagena', 'Cogua', 'Cusiana', 'Donmatias', 'Girardota',
    'Gualanday', 'Jobo', 'La Belleza', 'La Creciente', 'La Mami',
    'Mariquita', 'Medellin', 'Montañuelo', 'Neiva', 'Payoa', 'Pereira',
    'Porvenir', 'Red Mamonal', 'Sabana', 'Sebastopol', 'Sincelejo',
    'Transmetano', 'Usme', 'Vasconia', 'Villavicencio'
];

// Rutas predefinidas ORIGINALES del sistema
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

// Puntos intermedios para trazado de rutas suavizadas
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

// Función para obtener nodos de origen disponibles
function getOriginNodes() {
    const allNodes = new Set();
    NETWORK_DATA.forEach(item => {
        if (item.Origen && item.Origen !== 'Estampilla') {
            allNodes.add(item.Origen);
        }
        if (item.Destino) {
            allNodes.add(item.Destino);
        }
    });
    const result = Array.from(allNodes).sort();
    console.log('🔍 TODOS los nodos de origen encontrados:', result);
    return result;
}

// Función para obtener TODOS los nodos de destino disponibles
function getAllDestinationNodes() {
    console.log('🎯 Obteniendo TODOS los nodos de destino (incluyendo terminales como Jobo)');

    // Obtener TODOS los nodos únicos (tanto orígenes como destinos)
    const allNodes = new Set();

    NETWORK_DATA.forEach(item => {
        if (item.Origen && item.Origen !== 'Estampilla') {
            allNodes.add(item.Origen);
        }
        if (item.Destino) {
            allNodes.add(item.Destino);
        }
    });

    const result = Array.from(allNodes).sort();
    console.log('🎯 TODOS los nodos de destino:', result);
    return result;
}

// Función para obtener nodos de destino disponibles desde un origen (DEPRECATED - usar getAllDestinationNodes)
function getDestinationNodes(origen) {
    console.log('⚠️ getDestinationNodes está deprecated, usando getAllDestinationNodes');
    return getAllDestinationNodes();
}

// Función para obtener información de un nodo
function getNodeInfo(nodeName) {
    const connections = NETWORK_DATA.filter(item =>
        item.Origen === nodeName || item.Destino === nodeName
    );

    if (connections.length === 0) return null;

    // Obtener coordenadas del nodo
    let lat, lng;
    const asOrigin = connections.find(item => item.Origen === nodeName);
    const asDestination = connections.find(item => item.Destino === nodeName);

    if (asOrigin) {
        lat = asOrigin.Origen_Lat;
        lng = asOrigin.Origen_Long;
    } else if (asDestination) {
        lat = asDestination.Destino_Lat;
        lng = asDestination.Destino_Long;
    }

    return {
        name: nodeName,
        lat: lat,
        lng: lng,
        connections: connections.length
    };
}

// Exportar datos para uso global
window.NETWORK_DATA = NETWORK_DATA;
window.ESTAMPILLAS = ESTAMPILLAS;
window.TRANSPORTADOR_COLORS = TRANSPORTADOR_COLORS;
window.NODES = NODES;
window.PREDEFINED_ROUTES = PREDEFINED_ROUTES;
window.INTERMEDIATE_NODES = INTERMEDIATE_NODES;
window.getOriginNodes = getOriginNodes;
window.getAllDestinationNodes = getAllDestinationNodes;
window.getDestinationNodes = getDestinationNodes;
window.getNodeInfo = getNodeInfo;

console.log('✅ Datos originales cargados correctamente:', {
    tramos: NETWORK_DATA.length,
    nodos: NODES.length,
    transportadores: Object.keys(TRANSPORTADOR_COLORS),
    estampillas: Object.keys(ESTAMPILLAS),
    rutasPredefinidas: PREDEFINED_ROUTES.length
});