# Mapas de Calor - ArreglaYA Analytics

Este directorio contiene ejemplos de implementación para los nuevos endpoints de mapas de calor.

## Endpoints Disponibles

### 1. Mapa de Calor de Pedidos
- **URL:** `GET /api/metrica/pedidos/mapa-calor`
- **Descripción:** Obtiene datos de mapa de calor para visualizar la distribución geográfica de pedidos
- **Parámetros:**
  - `period` (requerido): `hoy`, `ultimos_7_dias`, `ultimos_30_dias`, `ultimo_ano`, `personalizado`
  - `startDate` (opcional): Fecha de inicio para período personalizado
  - `endDate` (opcional): Fecha de fin para período personalizado

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "lat": -34.6037,
        "lon": -58.3816,
        "intensity": 15
      }
    ],
    "totalPoints": 25,
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-07T23:59:59.999Z"
    }
  }
}
```

### 2. Tipos de Prestadores por Zonas
- **URL:** `GET /api/metrica/prestadores/zonas`
- **Descripción:** Obtiene la distribución de tipos de prestadores por ubicación geográfica
- **Parámetros:** Mismos que el endpoint anterior

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "lat": -34.6037,
        "lon": -58.3816,
        "providerType": "plomero",
        "count": 5,
        "zoneName": "Buenos Aires"
      }
    ],
    "totalProviders": 150,
    "providerTypes": ["plomero", "electricista", "carpintero"],
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-07T23:59:59.999Z"
    }
  }
}
```

## Ejemplos de Implementación

### 1. HTML + JavaScript (Leaflet)
- **Archivo:** `leaflet-heatmap-example.html`
- **Descripción:** Ejemplo completo con HTML, CSS y JavaScript usando Leaflet y Leaflet.heat
- **Uso:** Abrir directamente en el navegador

### 2. React Component
- **Archivo:** `ReactHeatmapComponent.jsx`
- **Descripción:** Componente React reutilizable para integrar en aplicaciones React
- **Dependencias necesarias:**
  ```bash
  npm install leaflet leaflet.heat
  ```

## Estructura de Datos Esperada

Los endpoints esperan que los eventos en la base de datos contengan información de ubicación en el campo `cuerpo` del evento. Se buscan coordenadas en las siguientes ubicaciones:

### Para Pedidos (orders.created):
```json
{
  "cuerpo": {
    "latitude": -34.6037,
    "longitude": -58.3816
  }
}
```

O alternativamente:
```json
{
  "cuerpo": {
    "location": {
      "latitude": -34.6037,
      "longitude": -58.3816
    }
  }
}
```

### Para Prestadores (service.providers.created):
```json
{
  "cuerpo": {
    "latitude": -34.6037,
    "longitude": -58.3816,
    "providerType": "plomero"
  }
}
```

## Configuración de Zonas Geográficas

El sistema incluye una configuración básica de zonas geográficas para Argentina:
- Buenos Aires: lat -35.0 a -34.0, lon -59.0 a -58.0
- Córdoba: lat -32.0 a -31.0, lon -65.0 a -64.0
- Rosario: lat -33.0 a -32.0, lon -61.0 a -60.0
- Mendoza: lat -33.0 a -32.0, lon -69.0 a -68.0
- Tucumán: lat -27.0 a -26.0, lon -66.0 a -65.0

## Instalación y Uso

### Backend
1. Los endpoints ya están implementados en el controlador `MetricsController`
2. Las rutas están registradas en `/api/metrica/`
3. La documentación Swagger está disponible en `/api-docs`

### Frontend
1. Para HTML: Abrir `leaflet-heatmap-example.html` en el navegador
2. Para React: Importar `ReactHeatmapComponent.jsx` en tu aplicación

### Dependencias Frontend
```bash
# Para React
npm install leaflet leaflet.heat

# Para HTML (CDN ya incluido en el ejemplo)
# No se requieren instalaciones adicionales
```

## Notas Importantes

1. **Coordenadas:** El sistema valida que las coordenadas estén en rangos válidos (lat: -90 a 90, lon: -180 a 180)
2. **Rendimiento:** Para grandes volúmenes de datos, considera implementar paginación o filtros adicionales
3. **Geocodificación:** La función `getZoneName` es básica; para producción considera usar una API de geocodificación inversa
4. **CORS:** Asegúrate de configurar CORS correctamente si el frontend está en un dominio diferente

## Personalización

### Colores del Mapa de Calor
```javascript
const heatLayer = L.heatLayer(heatData, {
  radius: 25,
  blur: 15,
  maxZoom: 17,
  max: 1.0,
  gradient: {
    0.4: 'blue',
    0.6: 'cyan',
    0.7: 'lime',
    0.8: 'yellow',
    1.0: 'red'
  }
});
```

### Colores de Prestadores
```javascript
const colors = {
  'plomero': 'blue',
  'electricista': 'red',
  'carpintero': 'green',
  'pintor': 'orange',
  'albañil': 'purple',
  'unknown': 'gray'
};
```
