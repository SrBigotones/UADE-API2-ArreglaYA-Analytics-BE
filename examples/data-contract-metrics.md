### Contrato de Datos - Métricas Matching

Basado en el formato existente de endpoints de métricas (`CardMetricResponse`).

#### 1) Tasa de Conversión de Matching a Cotización Aceptada
- URL: `GET /api/metrica/matching/conversion`
- Query params: `period` (requerido), `startDate`, `endDate` (si `period=personalizado`)
- Response:
```json
{
  "success": true,
  "data": {
    "value": 75.5,
    "change": 10.2,
    "changeType": "absoluto",
    "changeStatus": "positivo"
  }
}
```
- Semántica:
  - `value`: porcentaje de conversión [0-100] del período actual.
  - `change`: diferencia absoluta vs. período anterior (en puntos porcentuales).
  - `changeType`: siempre `absoluto` (porque `value` ya es %).
  - `changeStatus`: `positivo` si `change >= 0`, `negativo` en caso contrario.

#### 2) Tiempo Promedio de Matching a Cotización (Lead Time)
- URL: `GET /api/metrica/matching/lead-time`
- Query params: mismos que arriba
- Response:
```json
{
  "success": true,
  "data": {
    "value": 12.3,
    "change": 2.1,
    "changeType": "absoluto",
    "changeStatus": "negativo"
  }
}
```
- Semántica:
  - `value`: minutos promedio desde `Solicitud Creada` hasta `Cotización Emitida` del período actual.
  - `change`: diferencia absoluta vs. período anterior (en minutos).
  - `changeType`: `absoluto`.
  - `changeStatus`: `positivo` si el valor aumentó (peor), `negativo` si disminuyó (mejor). El frontend puede invertir color si prefiere.

#### Eventos fuente en BD
- `Solicitud Creada` (creación)
- `Cotización Emitida` (fin lead time)
- `Cotización Aceptada` y `Cotización Rechazada` (estados finales para conversión)
Relación por `correlationId` (mismo ID entre eventos del mismo flujo).

#### Notas
- Si no hay pares completos en el período, `value` es 0.
- Para conversión se consideran sólo flujos que llegaron a estado final (aceptada o rechazada) dentro del período.


