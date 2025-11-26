-- =====================================================
-- Migración: Cambiar PK de cotizaciones de 'id' a 'id_cotizacion'
-- =====================================================
-- Fecha: 2025-11-25
-- Descripción: 
--   - Elimina el campo 'id' autoincremental
--   - Usa 'id_cotizacion' como PK directamente
--   - Agrega campo 'timestamp_creacion' para preservar fecha original
--   - Genera IDs temporales negativos para cotizaciones sin id_cotizacion
-- =====================================================

BEGIN;

-- Paso 1: Verificar datos existentes
SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT id_cotizacion) as unicos_con_id,
    SUM(CASE WHEN id_cotizacion IS NULL THEN 1 ELSE 0 END) as null_count
FROM cotizaciones;

-- Paso 2: Crear nueva tabla con la estructura correcta
CREATE TABLE cotizaciones_new (
    id_cotizacion BIGINT PRIMARY KEY,
    id_solicitud BIGINT NOT NULL,
    id_usuario BIGINT,
    id_prestador BIGINT NOT NULL,
    estado VARCHAR(20) NOT NULL,
    monto DECIMAL(12, 2),
    timestamp_creacion TIMESTAMP NOT NULL,  -- Nueva columna: fecha original de creación
    timestamp TIMESTAMP NOT NULL,           -- Fecha de última actualización
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paso 3: Crear índices en la nueva tabla
CREATE INDEX idx_cotizaciones_new_id_solicitud ON cotizaciones_new(id_solicitud);
CREATE INDEX idx_cotizaciones_new_id_usuario ON cotizaciones_new(id_usuario);
CREATE INDEX idx_cotizaciones_new_id_prestador ON cotizaciones_new(id_prestador);
CREATE INDEX idx_cotizaciones_new_estado ON cotizaciones_new(estado);
CREATE INDEX idx_cotizaciones_new_timestamp ON cotizaciones_new(timestamp);
CREATE INDEX idx_cotizaciones_new_timestamp_creacion ON cotizaciones_new(timestamp_creacion);
CREATE INDEX idx_cotizaciones_new_composite ON cotizaciones_new(id_solicitud, id_prestador);

-- Paso 4: Migrar datos existentes
-- Para registros CON id_cotizacion válido
INSERT INTO cotizaciones_new (
    id_cotizacion,
    id_solicitud,
    id_usuario,
    id_prestador,
    estado,
    monto,
    timestamp_creacion,
    timestamp,
    created_at,
    updated_at
)
SELECT 
    id_cotizacion,
    id_solicitud,
    id_usuario,
    id_prestador,
    estado,
    monto,
    timestamp as timestamp_creacion,  -- Usar timestamp actual como creación (mejor que nada)
    timestamp,
    created_at,
    updated_at
FROM cotizaciones
WHERE id_cotizacion IS NOT NULL
ON CONFLICT (id_cotizacion) DO UPDATE SET
    estado = EXCLUDED.estado,
    monto = EXCLUDED.monto,
    timestamp = EXCLUDED.timestamp,
    updated_at = EXCLUDED.updated_at;

-- Para registros SIN id_cotizacion (generar ID temporal negativo)
INSERT INTO cotizaciones_new (
    id_cotizacion,
    id_solicitud,
    id_usuario,
    id_prestador,
    estado,
    monto,
    timestamp_creacion,
    timestamp,
    created_at,
    updated_at
)
SELECT 
    -(id_solicitud * 1000000 + id_prestador) as id_cotizacion,  -- ID temporal negativo
    id_solicitud,
    id_usuario,
    id_prestador,
    estado,
    monto,
    timestamp as timestamp_creacion,
    timestamp,
    created_at,
    updated_at
FROM cotizaciones
WHERE id_cotizacion IS NULL
ON CONFLICT (id_cotizacion) DO NOTHING;  -- Evitar duplicados

-- Paso 5: Renombrar tablas
ALTER TABLE cotizaciones RENAME TO cotizaciones_old_backup;
ALTER TABLE cotizaciones_new RENAME TO cotizaciones;

-- Paso 6: Verificar migración
SELECT 
    'Migración completada' as status,
    COUNT(*) as total_cotizaciones,
    SUM(CASE WHEN id_cotizacion < 0 THEN 1 ELSE 0 END) as ids_temporales,
    SUM(CASE WHEN id_cotizacion > 0 THEN 1 ELSE 0 END) as ids_reales
FROM cotizaciones;

-- Paso 7: (OPCIONAL) Eliminar tabla backup después de verificar
-- DROP TABLE cotizaciones_old_backup;

COMMIT;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Esta migración preserva todos los datos existentes
-- 2. Las cotizaciones sin id_cotizacion reciben IDs negativos: -(solicitud * 1000000 + prestador)
-- 3. El campo timestamp_creacion se inicializa con el timestamp actual (ya que no teníamos este dato antes)
-- 4. La tabla antigua se guarda como cotizaciones_old_backup por si necesitas revertir
-- 5. Después de verificar que todo funciona, puedes eliminar la tabla backup
-- =====================================================

