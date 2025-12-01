-- ============================================================
-- EJECUTAR MANUALMENTE: Conversión de TIMESTAMP a TIMESTAMPTZ
-- ============================================================
-- Este script convierte todas las columnas timestamp a timestamptz
-- asumiendo que los datos actuales están en UTC
-- ============================================================

-- 1. TABLA: events
ALTER TABLE events 
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC';

ALTER TABLE events
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE events
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';

-- 2. TABLA: usuarios
ALTER TABLE usuarios
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- 3. TABLA: solicitudes
ALTER TABLE solicitudes
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE solicitudes
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE solicitudes
  ALTER COLUMN fecha_confirmacion TYPE TIMESTAMPTZ USING fecha_confirmacion AT TIME ZONE 'UTC';

-- 4. TABLA: pagos
ALTER TABLE pagos
  ALTER COLUMN timestamp_creado TYPE TIMESTAMPTZ USING timestamp_creado AT TIME ZONE 'UTC';

ALTER TABLE pagos
  ALTER COLUMN timestamp_actual TYPE TIMESTAMPTZ USING timestamp_actual AT TIME ZONE 'UTC';

ALTER TABLE pagos
  ALTER COLUMN captured_at TYPE TIMESTAMPTZ USING 
    CASE WHEN captured_at IS NULL THEN NULL ELSE captured_at AT TIME ZONE 'UTC' END;

ALTER TABLE pagos
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE pagos
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 5. TABLA: prestadores
ALTER TABLE prestadores
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC';

ALTER TABLE prestadores
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE prestadores
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 6. TABLA: servicios
ALTER TABLE servicios
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC';

ALTER TABLE servicios
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE servicios
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 7. TABLA: habilidades
ALTER TABLE habilidades
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE habilidades
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 8. TABLA: zonas
ALTER TABLE zonas
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE zonas
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 9. TABLA: rubros
ALTER TABLE rubros
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE rubros
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 10. TABLA: cotizaciones
ALTER TABLE cotizaciones
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE cotizaciones
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC';

ALTER TABLE cotizaciones
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 11. TABLA: feature_flags
ALTER TABLE feature_flags
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE feature_flags
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Registrar la migración manualmente
INSERT INTO migration_history (version, description) 
VALUES ('V5', 'V5__Fix_timestamp_columns_to_timestamptz.sql - EJECUTADO MANUALMENTE');

-- ============================================================
-- RESULTADO: Todas las columnas ahora son TIMESTAMPTZ
-- ============================================================

