# Formato de Datos para Gráficos desde el Backend

Este documento describe el formato que debe usar el backend para enviar datos de gráficos al frontend.

## 📊 Estructura General de Respuesta

Todas las respuestas del backend deben seguir este formato base:

```json
{
  "success": true,
  "data": {
    "value": 50,                    // Valor actual (número)
    "change": 10,                   // Cambio respecto al período anterior (número)
    "changeType": "porcentaje",     // "porcentaje" | "absoluto"
    "changeStatus": "positivo",     // "positivo" | "negativo"
    "chartData": [...]              // Array opcional con datos del gráfico (ver abajo)
  }
}
```

## 📈 Formato para Gráficos de Línea/Área

Para métricas que deben mostrar gráficos de línea o área, el backend debe incluir `chartData` con este formato:

### Estructura de datos:

```json
{
  "success": true,
  "data": {
    "value": 150,
    "change": 15,
    "changeType": "porcentaje",
    "changeStatus": "positivo",
    "chartData": [
      {
        "date": "2025-01-01",      // Fecha en formato YYYY-MM-DD o timestamp ISO
        "value": 120               // Valor numérico para ese día
      },
      {
        "date": "2025-01-02",
        "value": 135
      },
      {
        "date": "2025-01-03",
        "value": 142
      }
      // ... más puntos
    ]
  }
}
```

### Campos requeridos:

- **`date`** (string): Fecha en formato `YYYY-MM-DD` o timestamp ISO 8601
  - Alternativa: puede usar `time` en lugar de `date` (ambos son soportados)
- **`value`** (number): Valor numérico para ese punto en el tiempo

### Ejemplo de endpoint:

```typescript
// GET /api/metrica/pagos/exitosos?period=ultimos_30_dias
{
  "success": true,
  "data": {
    "value": 98.7,
    "change": 0.8,
    "changeType": "absoluto",
    "changeStatus": "positivo",
    "chartData": [
      { "date": "2025-01-01", "value": 97.5 },
      { "date": "2025-01-02", "value": 98.2 },
      { "date": "2025-01-03", "value": 98.9 },
      { "date": "2025-01-04", "value": 98.7 }
    ]
  }
}
```

## 🕯️ Formato para Gráficos de Velas (Candlestick)

Para métricas que deben mostrar gráficos de velas, el backend puede usar dos formatos:

### Opción 1: Datos Completos (OHLC) - Recomendado

Para datos con variación diaria completa (apertura, cierre, máximo, mínimo):

### Estructura de datos:

```json
{
  "success": true,
  "data": {
    "value": 125,
    "change": 5,
    "changeType": "porcentaje",
    "changeStatus": "positivo",
    "chartData": [
      {
        "date": "2025-01-01",      // Fecha en formato YYYY-MM-DD
        "open": 100,               // Valor de apertura
        "close": 105,              // Valor de cierre
        "high": 108,               // Valor máximo
        "low": 95                  // Valor mínimo
      },
      {
        "date": "2025-01-02",
        "open": 105,
        "close": 101,
        "high": 109,
        "low": 99
      }
      // ... más velas
    ]
  }
}
```

### Campos requeridos:

- **`date`** (string): Fecha en formato `YYYY-MM-DD`
  - Alternativa: puede usar `time` en lugar de `date`
- **`open`** (number): Valor de apertura del período
- **`close`** (number): Valor de cierre del período
- **`high`** (number): Valor máximo del período
- **`low`** (number): Valor mínimo del período

### Opción 2: Datos Simples (Solo Valor) - Alternativa

Si solo tienes un valor por fecha (sin apertura/cierre), puedes usar el mismo formato que un gráfico de línea. El componente detectará automáticamente que es un dato simple y simulará las velas:

```json
{
  "success": true,
  "data": {
    "value": 125,
    "change": 5,
    "changeType": "porcentaje",
    "changeStatus": "positivo",
    "chartData": [
      { "date": "2025-01-01", "value": 100 },
      { "date": "2025-01-02", "value": 105 },
      { "date": "2025-01-03", "value": 110 }
    ]
  }
}
```

**Cómo funciona:**
- El componente detecta automáticamente si los datos tienen `value` pero no tienen `open`, `close`, `high`, `low`
- Genera velas simuladas:
  - `open` = valor anterior (o el mismo si es el primero)
  - `close` = valor actual
  - `high` y `low` = valor ± 3% de variación
- El tooltip mostrará solo el valor original (no los valores simulados)

### Ejemplo de endpoint con datos completos:

```typescript
// GET /api/metrica/prestadores/registrados?period=ultimos_30_dias
{
  "success": true,
  "data": {
    "value": 12,
    "change": 2,
    "changeType": "absoluto",
    "changeStatus": "positivo",
    "chartData": [
      { "date": "2025-01-01", "open": 8, "close": 10, "high": 11, "low": 7 },
      { "date": "2025-01-02", "open": 10, "close": 9, "high": 12, "low": 8 },
      { "date": "2025-01-03", "open": 9, "close": 12, "high": 13, "low": 9 }
    ]
  }
}
```

### Ejemplo de endpoint con datos simples:

```typescript
// GET /api/metrica/prestadores/registrados?period=ultimos_30_dias
{
  "success": true,
  "data": {
    "value": 12,
    "change": 2,
    "changeType": "absoluto",
    "changeStatus": "positivo",
    "chartData": [
      { "date": "2025-01-01", "value": 8 },
      { "date": "2025-01-02", "value": 10 },
      { "date": "2025-01-03", "value": 9 }
    ]
  }
}
```

## 🔄 Procesamiento en el Frontend

El frontend procesará automáticamente estos datos:

1. **Extracción**: Los datos vienen en `response.data.data` o `response.data`
2. **Formato**: Si existe `chartData`, se usa directamente
3. **Renderizado**: 
   - Si `metric.toggleChartKind === 'line'` o `'area'` → `AreaResponsiveContainer`
   - Si `metric.toggleChartKind === 'candlestick'` → `CandlestickChart`

### Mapeo en `metricsRegistry.js`:

```javascript
{
  id: 'mi-metrica',
  type: 'card',
  allowToggleToChart: true,
  toggleChartKind: 'line',  // o 'candlestick'
  hasRealService: true,
  serviceConfig: {
    serviceName: 'getMiMetrica',
    serviceModule: 'miService',
    valueFormatter: (data) => `${data.value}%`,
    changeFormatter: (data) => {
      const sign = data.changeStatus === 'positivo' ? '+' : '-';
      return `${sign}${Math.abs(data.change)}%`;
    },
    // Opcional: formateador personalizado para chartData
    chartDataFormatter: (data) => data.chartData || []
  }
}
```

## 📝 Ejemplo de Implementación en el Backend (TypeScript)

```typescript
// En tu controller
public async getMiMetrica(req: Request, res: Response): Promise<void> {
  try {
    const periodType = this.parsePeriodParams(req);
    const dateRanges = DateRangeService.getPeriodRanges(periodType);

    // Obtener valor actual
    const currentValue = await this.calculateValue(dateRanges.startDate, dateRanges.endDate);
    const previousValue = await this.calculateValue(dateRanges.previousStartDate, dateRanges.previousEndDate);

    // Calcular métrica base
    const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');

    // Obtener datos históricos para el gráfico
    const chartData = await this.getHistoricalData(dateRanges.startDate, dateRanges.endDate);
    // chartData debe ser: [{ date: '2025-01-01', value: 100 }, ...]

    res.status(200).json({
      success: true,
      data: {
        ...metric,
        chartData  // Agregar datos del gráfico
      }
    });
  } catch (error) {
    await this.handleError(res, error, 'getMiMetrica');
  }
}

// Para gráficos de velas
public async getMiMetricaCandlestick(req: Request, res: Response): Promise<void> {
  try {
    // ... calcular métrica base ...

    // Obtener datos históricos con OHLC (Open, High, Low, Close)
    const chartData = await this.getHistoricalOHLCData(dateRanges.startDate, dateRanges.endDate);
    // chartData debe ser: [{ date: '2025-01-01', open: 100, close: 105, high: 108, low: 95 }, ...]

    res.status(200).json({
      success: true,
      data: {
        ...metric,
        chartData
      }
    });
  } catch (error) {
    await this.handleError(res, error, 'getMiMetricaCandlestick');
  }
}
```

## ⚠️ Notas Importantes

1. **Campo `chartData` es opcional**: Si no se incluye, el frontend generará datos mock basados en el valor actual
2. **Orden de datos**: Los datos deben estar ordenados cronológicamente (del más antiguo al más reciente)
3. **Fechas**: Usar formato `YYYY-MM-DD` para consistencia
4. **Tipos numéricos**: Todos los valores deben ser números, no strings
5. **Mínimo de puntos**: Se recomienda al menos 7-12 puntos de datos para gráficos legibles
6. **Agregación temporal**: Para períodos largos, agregar datos por día/semana/mes según corresponda

## 🔍 Validación

El backend debería validar:
- Que `chartData` sea un array
- Que cada elemento tenga los campos requeridos
- Que las fechas estén en formato válido
- Que los valores sean números válidos

## 📌 Ejemplos por Tipo de KPI

### KPI de Volumen (usar línea):
```json
{
  "chartData": [
    { "date": "2025-01-01", "value": 120 },
    { "date": "2025-01-02", "value": 135 },
    { "date": "2025-01-03", "value": 142 }
  ]
}
```

### KPI con Variación Diaria (usar velas con datos completos):
```json
{
  "chartData": [
    { "date": "2025-01-01", "open": 100, "close": 105, "high": 108, "low": 95 },
    { "date": "2025-01-02", "open": 105, "close": 101, "high": 109, "low": 99 }
  ]
}
```

### KPI con Solo Valores (usar velas con datos simples):
```json
{
  "chartData": [
    { "date": "2025-01-01", "value": 100 },
    { "date": "2025-01-02", "value": 105 },
    { "date": "2025-01-03", "value": 101 }
  ]
}
```
**Nota:** El frontend simulará automáticamente las velas basándose en los valores.

### KPI de Tasa/Porcentaje (usar línea):
```json
{
  "chartData": [
    { "date": "2025-01-01", "value": 97.5 },
    { "date": "2025-01-02", "value": 98.2 },
    { "date": "2025-01-03", "value": 98.9 }
  ]
}
```

