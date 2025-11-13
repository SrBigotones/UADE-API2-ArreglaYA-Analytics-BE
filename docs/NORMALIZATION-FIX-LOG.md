# Fix de Normalización de Eventos - Log de Cambios

**Fecha**: 13 Noviembre 2025  
**Branch**: develop  
**Estado DB antes del fix**: 298 eventos procesados, 156 pendientes, solo 21 usuarios normalizados

---

## 🐛 Problemas Identificados

### 1. **Eventos de Payments NUNCA se procesaban (90 eventos)**

**Causa raíz**: El router de eventos buscaba la palabra "payment" en el campo `evento`, pero:
- `topico = 'payment'`
- `evento = 'created'` ❌ NO contiene "payment"
- `evento = 'status_updated'` ❌ NO contiene "payment"
- `evento = 'method_selected'` ❌ NO contiene "payment"

**Impacto**: 
- 72 `payment.created` sin procesar
- 12 `payment.status_updated` sin procesar
- 6 `payment.method_selected` sin procesar
- **Total: 0 registros en tabla `pagos`**

### 2. **Eventos de solicitud.cancelada NUNCA se procesaban (4 eventos)**

**Causa raíz**: El router buscaba `evento.includes('solicitud')` pero el evento es `'cancelada'`

**Impacto**: 4 eventos sin procesar, solicitudes canceladas no se reflejaban en analytics

### 3. **Algunos eventos de solicitud.creada fallaban (20 de 48)**

**Causa raíz**: Algunos eventos tienen `habilidad_id: "HAB_002"` (string no numérico) y `extractBigInt()` intentaba parsearlo

**Impacto**: 20 solicitudes sin normalizar

### 4. **Lógica de routing inconsistente**

**Problema**: El orden de los `if/else` hacía que algunos eventos no matchearan correctamente porque se evaluaba el nombre del evento antes que el tópico

---

## ✅ Soluciones Aplicadas

### Fix 1: Cambio de Estrategia de Routing en `normalizeEvent()`

**ANTES:**
```typescript
if (evento.includes('payment') || evento.includes('pago')) {
  await this.processPaymentEvent(event);
}
```

**DESPUÉS:**
```typescript
const topico = event.topico.toLowerCase();

// Filtrar por TOPICO primero (más confiable)
if (topico === 'payment') {
  await this.processPaymentEvent(event);
}
else if (topico === 'solicitud' || evento.includes('solicitud') || ...) {
  await this.processRequestEvent(event);
}
```

**Beneficios**:
- ✅ Routing basado en `topico` (campo controlado, siempre presente)
- ✅ Fallback a `evento` cuando sea necesario
- ✅ Más robusto ante cambios en nombres de eventos

### Fix 2: Mejorar `extractBigInt()` para filtrar strings no numéricos

**ANTES:**
```typescript
if (typeof value === 'string') {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}
```

**DESPUÉS:**
```typescript
if (typeof value === 'string') {
  // Si contiene letras o guiones bajos, no es un ID numérico válido
  if (/[a-zA-Z_]/.test(value)) {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}
```

**Beneficios**:
- ✅ Rechaza strings como "HAB_002", "USER_123", etc.
- ✅ Evita warnings innecesarios en logs
- ✅ Acepta solo strings numéricos puros ("123", "9999")

### Fix 3: Agregar logs con topico para debugging

```typescript
logger.info(`🔄 NORMALIZATION | eventId: ${event.id} | topico: ${topico} | evento: ${evento}`);
```

---

## 📊 Resultados Esperados Después del Reprocesamiento

### Eventos que deberían procesarse:

| Tipo Evento | Total | Procesados | Pendientes | Esperado después |
|-------------|-------|------------|------------|------------------|
| `payment.created` | 72 | 0 | 72 | ✅ 72 procesados |
| `payment.status_updated` | 12 | 0 | 12 | ✅ 12 procesados |
| `payment.method_selected` | 6 | 0 | 6 | ✅ 6 procesados |
| `solicitud.cancelada` | 4 | 0 | 4 | ✅ 4 procesados |
| `solicitud.creada` | 48 | 28 | 20 | ✅ 48 procesados |
| `prestador.modificacion` | 20 | 18 | 2 | ✅ 20 procesados |

### Tablas Normalizadas Esperadas:

| Tabla | Antes | Después Esperado |
|-------|-------|------------------|
| `usuarios` | 21 | ~55 (44 created + 11 updated) |
| `solicitudes` | 0 | ~48 (creadas) + ~42 (solicitado) = ~90 |
| `cotizaciones` | 0 | ~26 (matching.emitida) |
| `pagos` | 0 | ~72 (payments.created) |
| `prestadores` | 0 | ~30 (alta + modificacion) |
| `servicios` | 0 | Depende de eventos procesados |
| `rubros` | 0 | 24 (rubro.alta) |

---

## 🚀 Pasos para Aplicar el Fix

### 1. Deploy del código actualizado

```bash
# Verificar cambios
git status

# Commit
git add src/services/EventNormalizationService.ts
git commit -m "fix: corregir routing de eventos y manejo de IDs no numéricos

- Cambiar routing de eventos para usar topico primero
- Filtrar strings no numéricos en extractBigInt
- Agregar logs con topico para debugging
- Fixes para payments, solicitud.cancelada y solicitud.creada"

# Push
git push origin develop
```

### 2. Ejecutar SQL para preparar reprocesamiento

```bash
# Conectar a DB
psql -h <host> -U <user> -d arregla_ya_analytics_stage

# Ejecutar script (opcional, los eventos ya están en false)
\i scripts/mark-events-for-reprocessing.sql
```

### 3. Reprocesar eventos

**Opción A - Endpoint Admin:**
```bash
curl -X POST http://localhost:3000/api/admin/reprocess-events
```

**Opción B - SQL directo:**
```sql
-- Ver eventos pendientes
SELECT COUNT(*) FROM events WHERE processed = false;

-- El sistema debería reprocesarlos automáticamente
-- o llamar al endpoint de admin
```

### 4. Verificar resultados

```sql
-- Conteo de eventos
SELECT 
    COUNT(*) FILTER (WHERE processed = false) as pendientes,
    COUNT(*) FILTER (WHERE processed = true) as procesados,
    COUNT(*) as total
FROM events;

-- Tablas normalizadas
SELECT 
    'usuarios' as tabla, COUNT(*) as registros FROM usuarios
UNION ALL
SELECT 'solicitudes', COUNT(*) FROM solicitudes
UNION ALL
SELECT 'cotizaciones', COUNT(*) FROM cotizaciones
UNION ALL
SELECT 'pagos', COUNT(*) FROM pagos
UNION ALL
SELECT 'prestadores', COUNT(*) FROM prestadores
UNION ALL
SELECT 'servicios', COUNT(*) FROM servicios
UNION ALL
SELECT 'rubros', COUNT(*) FROM rubros;
```

---

## 📝 Archivos Modificados

1. ✅ `src/services/EventNormalizationService.ts`
   - Método `normalizeEvent()` - Routing por topico
   - Método `extractBigInt()` - Filtro de strings no numéricos

2. ✅ `scripts/mark-events-for-reprocessing.sql` - Script de preparación

3. ✅ `docs/NORMALIZATION-FIX-LOG.md` - Esta documentación

---

## ⚠️ Consideraciones

- **No se perdió data**: Los eventos están en la DB, solo no se procesaron
- **Idempotencia**: El código usa `upsert()`, reprocesar es seguro
- **Performance**: 156 eventos es una cantidad manejable
- **Monitoreo**: Revisar logs para confirmar que todos se procesan correctamente

---

## 🔍 Debugging Post-Deploy

Si después del reprocesamiento siguen habiendo eventos fallidos:

```sql
-- Ver eventos que siguen fallando
SELECT 
    squad,
    topico,
    evento,
    COUNT(*) as cantidad,
    array_agg(id ORDER BY timestamp DESC LIMIT 3) as sample_ids
FROM events
WHERE processed = false
GROUP BY squad, topico, evento
ORDER BY cantidad DESC;

-- Inspeccionar un evento específico
SELECT * FROM events WHERE id = '<event_id>';
```

Y revisar logs de la aplicación para ver el stack trace del error.
