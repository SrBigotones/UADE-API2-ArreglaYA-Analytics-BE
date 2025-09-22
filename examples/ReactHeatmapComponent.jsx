import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat/dist/leaflet-heat.css';

// Importar el plugin de heat (necesitarás instalarlo: npm install leaflet.heat)
// import 'leaflet.heat';

const HeatmapComponent = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  
  const [dataType, setDataType] = useState('pedidos');
  const [period, setPeriod] = useState('ultimos_7_dias');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Inicializar el mapa
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([-34.6037, -58.3816], 10);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);
    }
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Función para cargar datos desde la API
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = `http://localhost:3000/api/metrica/${dataType === 'pedidos' ? 'pedidos/mapa-calor' : 'prestadores/zonas'}?period=${period}`;
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        displayData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`Error al cargar datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar los datos en el mapa
  const displayData = (data) => {
    clearMap();
    
    if (dataType === 'pedidos') {
      displayHeatmap(data);
    } else {
      displayProviderZones(data);
    }
  };

  // Función para mostrar mapa de calor de pedidos
  const displayHeatmap = (data) => {
    if (data.data.length === 0) return;
    
    const heatData = data.data.map(point => [point.lat, point.lon, point.intensity]);
    
    heatLayerRef.current = L.heatLayer(heatData, {
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
    }).addTo(mapInstance.current);
    
    // Ajustar vista del mapa
    if (heatData.length > 0) {
      const group = new L.featureGroup();
      heatData.forEach(([lat, lon]) => {
        group.addLayer(L.marker([lat, lon]));
      });
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Función para mostrar prestadores por zonas
  const displayProviderZones = (data) => {
    if (data.data.length === 0) return;
    
    markersLayerRef.current = L.layerGroup().addTo(mapInstance.current);
    
    const colors = {
      'plomero': 'blue',
      'electricista': 'red',
      'carpintero': 'green',
      'pintor': 'orange',
      'albañil': 'purple',
      'unknown': 'gray'
    };
    
    data.data.forEach(zone => {
      const color = colors[zone.providerType] || 'gray';
      
      const marker = L.circleMarker([zone.lat, zone.lon], {
        radius: Math.max(5, Math.min(20, zone.count * 2)),
        fillColor: color,
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
      });
      
      marker.bindPopup(`
        <strong>Zona:</strong> ${zone.zoneName || 'Sin nombre'}<br>
        <strong>Tipo:</strong> ${zone.providerType}<br>
        <strong>Cantidad:</strong> ${zone.count}
      `);
      
      markersLayerRef.current.addLayer(marker);
    });
    
    // Ajustar vista del mapa
    if (data.data.length > 0) {
      const group = new L.featureGroup();
      data.data.forEach(zone => {
        group.addLayer(L.marker([zone.lat, zone.lon]));
      });
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Función para limpiar el mapa
  const clearMap = () => {
    if (heatLayerRef.current) {
      mapInstance.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    
    if (markersLayerRef.current) {
      mapInstance.current.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }
  };

  return (
    <div className="heatmap-container">
      <div className="controls">
        <div className="control-group">
          <label htmlFor="dataType">Tipo de datos:</label>
          <select 
            id="dataType" 
            value={dataType} 
            onChange={(e) => setDataType(e.target.value)}
          >
            <option value="pedidos">Pedidos</option>
            <option value="prestadores">Prestadores por Zonas</option>
          </select>
        </div>
        
        <div className="control-group">
          <label htmlFor="period">Período:</label>
          <select 
            id="period" 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="hoy">Hoy</option>
            <option value="ultimos_7_dias">Últimos 7 días</option>
            <option value="ultimos_30_dias">Últimos 30 días</option>
            <option value="ultimo_ano">Último año</option>
          </select>
        </div>
        
        <button onClick={loadData} disabled={loading}>
          {loading ? 'Cargando...' : 'Cargar Datos'}
        </button>
        
        <button onClick={clearMap}>
          Limpiar Mapa
        </button>
      </div>
      
      <div ref={mapRef} className="map" style={{ height: '600px', width: '100%' }} />
      
      <div className="info">
        {error && <div className="error">Error: {error}</div>}
        {data && (
          <div className="data-info">
            <h3>Información del Mapa</h3>
            <p><strong>Tipo:</strong> {dataType === 'pedidos' ? 'Pedidos' : 'Prestadores por Zonas'}</p>
            <p><strong>Período:</strong> {data.period.startDate} - {data.period.endDate}</p>
            <p><strong>Total de puntos:</strong> {data.totalPoints || data.data.length}</p>
            {dataType === 'prestadores' && data.providerTypes && (
              <p><strong>Tipos de prestadores:</strong> {data.providerTypes.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatmapComponent;
