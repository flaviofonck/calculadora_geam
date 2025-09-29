# 🚀 Calculadora de Rutas de Gasoductos - Versión Lite

**Versión estática completamente independiente para servidores web estáticos**

## ✨ Características

- 🌐 **100% Cliente**: HTML + CSS + JavaScript puro
- 📱 **Responsive**: Funciona en móviles, tablets y desktop
- 🗺️ **Mapa Interactivo**: Leaflet.js con red de gasoductos
- 📊 **Cálculos Precisos**: Algoritmo de rutas con costos reales
- 🎨 **UI Moderna**: Bootstrap 5 + Font Awesome
- ⚡ **Sin Dependencias**: No requiere servidor backend

## 🏗️ Estructura del Proyecto

```
calculator-lite/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos personalizados
├── js/
│   ├── data.js         # Datos de la red de gasoductos
│   ├── calculator.js   # Lógica de cálculo
│   └── map.js          # Mapa interactivo
└── README.md           # Esta documentación
```

## 🚀 Instalación y Uso

### Opción 1: Servidor Web Local
```bash
# Copiar archivos a tu servidor web
cp -r calculator-lite/* /var/www/html/

# O usar servidor HTTP simple de Python
cd calculator-lite
python -m http.server 8000
```

### Opción 2: Hosting Estático
Subir la carpeta completa a:
- **GitHub Pages**
- **Netlify**
- **Vercel**
- **Firebase Hosting**
- **Amazon S3**
- **Any static hosting**

### Opción 3: Abrir Directamente
Simplemente abrir `index.html` en cualquier navegador moderno.

## 🔧 Configuración

### Actualizar Datos de la Red
Editar `js/data.js`:
```javascript
const NETWORK_DATA = [
    // Agregar/modificar conexiones
    {
        "Origen": "NuevoNodo1",
        "Destino": "NuevoNodo2", 
        "Fijos": 1000.0,
        "Variables": 1500.0,
        "AOM": 200.0,
        "Transportador": "TGI",
        "Origen_Lat": 4.5,
        "Origen_Long": -74.0,
        "Destino_Lat": 5.0,
        "Destino_Long": -75.0
    }
];
```

### Personalizar Estampillas
Modificar en `js/data.js`:
```javascript
const ESTAMPILLAS = {
    "TGI": {"Fijos": 514.90, "Variables": 730.0, "AOM": 143.54},
    "PROMIGAS": {"Fijos": 830.73, "Variables": 1217.96, "AOM": 92.49},
    "NUEVO_TRANSPORTADOR": {"Fijos": 600.0, "Variables": 800.0, "AOM": 100.0}
};
```

### Cambiar Colores
Editar en `js/data.js`:
```javascript
const TRANSPORTADOR_COLORS = {
    'TGI': '#808080',           // Gris
    'PROMIGAS': '#0066ff',      // Azul
    'PROMIORIENTE': '#ffff00'   // Amarillo
};
```

## 📊 Funcionalidades

### Cálculo de Rutas
- **Algoritmo BFS**: Encuentra la ruta más corta
- **Costos por segmento**: Fijos, Variables, AOM
- **Estampillas**: Por transportador
- **Impuestos**: Fomento (3%) + Impuesto (6%)
- **Conversión USD**: Con TRM configurable

### Mapa Interactivo
- **Capas por transportador**: TGI, PROMIGAS, PROMIORIENTE
- **Visualización de ruta**: Línea destacada con marcadores
- **Popups informativos**: Costos y detalles de cada tramo
- **Controles de capa**: Mostrar/ocultar transportadores

### Rutas Predefinidas
```javascript
const PREDEFINED_ROUTES = [
    { origen: 'Sebastopol', destino: 'Medellin', label: 'Sebastopol → Medellín' },
    { origen: 'Ballenas_tgi', destino: 'Barranquilla', label: 'Ballenas → Barranquilla' }
    // Agregar más rutas...
];
```

## 🎨 Personalización Visual

### Tema y Colores
Editar `css/style.css`:
```css
:root {
    --primary-color: #0d6efd;    /* Color principal */
    --tgi-color: #808080;        /* Color TGI */
    --promigas-color: #0066ff;   /* Color PROMIGAS */
    --promioriente-color: #ffff00; /* Color PROMIORIENTE */
}
```

### Logo y Branding
En `index.html`:
```html
<a class="navbar-brand d-flex align-items-center" href="#">
    <img src="logo.png" alt="Logo" height="30" class="me-2">
    <strong>Tu Empresa</strong>
</a>
```

## 📱 Responsive Design

La aplicación está optimizada para:
- **Desktop**: Layout de 2 columnas con mapa grande
- **Tablet**: Adaptación automática del layout
- **Mobile**: Diseño vertical, mapa compacto

## 🔍 Debugging

### Console Logs
Abrir DevTools (F12) para ver:
```
✅ Datos de la red cargados: {tramos: 33, nodos: 37, transportadores: 3}
🚀 Inicializando Calculadora de Rutas Lite...
📋 Formulario inicializado
🗺️ Inicializando mapa...
```

### Errores Comunes
1. **CORS Issues**: Usar servidor HTTP, no file://
2. **Datos incompletos**: Verificar latitudes/longitudes
3. **Rutas no encontradas**: Revisar conectividad en datos

## 🚀 Optimizaciones

### CDN Links
Todos los recursos externos usan CDN:
- Bootstrap 5.3.0
- Font Awesome 6.4.0
- Leaflet 1.9.4

### Performance
- Datos pre-calculados
- Lazy loading de detalles
- Algoritmo BFS optimizado

## 📈 Extensiones Posibles

### Nuevas Funcionalidades
```javascript
// Agregar en calculator.js
function calculateMultipleRoutes(origins, destinations) {
    // Cálculo de múltiples rutas
}

function exportResults(format = 'json') {
    // Exportar resultados
}

function saveRoutePreference(routeData) {
    // Guardar en localStorage
}
```

### Integración con APIs
```javascript
// Ejemplo de integración con API externa
async function getTRMFromAPI() {
    const response = await fetch('https://api.trm.com/current');
    return response.json();
}
```

## 📄 Licencia

Este es un proyecto derivado de la calculadora principal GEAM.
Mantiene toda la lógica de cálculo y datos originales.

## 🆘 Soporte

Para problemas o mejoras:
1. Revisar console del navegador
2. Verificar integridad de datos
3. Comprobar compatibilidad del navegador

---

**🎉 ¡Calculadora Lite lista para usar!**  
*Versión completamente independiente y portátil*