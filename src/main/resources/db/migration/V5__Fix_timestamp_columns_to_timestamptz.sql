-- ============================================================
-- Migración V5: Convertir todas las columnas TIMESTAMP a TIMESTAMPTZ
-- ============================================================
-- 
-- PROBLEMA: Las columnas timestamp fueron creadas como TIMESTAMP (sin timezone)
-- pero TypeORM espera TIMESTAMPTZ. Esto causa que los timestamps se guarden
-- y lean sin conversión de timezone.
--
-- SOLUCIÓN: Convertir todas las columnas a TIMESTAMPTZ asumiendo que los
-- datos existentes están en UTC.
--
-- IMPORTANTE: Esta migración asume que todos los timestamps actuales
-- están guardados en UTC y los convierte correctamente a TIMESTAMPTZ.
-- ============================================================

-- 1. TABLA: events
ALTER TABLE events 
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';

COMMENT ON COLUMN events.timestamp IS 'Timestamp del evento (TIMESTAMPTZ en UTC)';
COMMENT ON COLUMN events."createdAt" IS 'Fecha de creación del registro (TIMESTAMPTZ)';
COMMENT ON COLUMN events."updatedAt" IS 'Fecha de última actualización (TIMESTAMPTZ)';

-- 2. TABLA: usuarios
ALTER TABLE usuarios
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- Agregar columna fecha_baja si no existe (algunos entornos pueden no tenerla)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'usuarios' AND column_name = 'fecha_baja') THEN
        ALTER TABLE usuarios ADD COLUMN fecha_baja TIMESTAMPTZ;
        COMMENT ON COLUMN usuarios.fecha_baja IS 'Fecha de baja del usuario (TIMESTAMPTZ)';
    ELSE
        ALTER TABLE usuarios ALTER COLUMN fecha_baja TYPE TIMESTAMPTZ USING fecha_baja AT TIME ZONE 'UTC';
    END IF;
END $$;

-- updated_at puede no existir en la migración original
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'usuarios' AND column_name = 'updated_at') THEN
        ALTER TABLE usuarios ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    END IF;
END $$;

COMMENT ON COLUMN usuarios.created_at IS 'Fecha de creación (TIMESTAMPTZ)';

-- 3. TABLA: solicitudes
ALTER TABLE solicitudes
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Agregar fecha_confirmacion si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'solicitudes' AND column_name = 'fecha_confirmacion') THEN
        ALTER TABLE solicitudes ADD COLUMN fecha_confirmacion TIMESTAMPTZ;
        COMMENT ON COLUMN solicitudes.fecha_confirmacion IS 'Fecha de confirmación del match (TIMESTAMPTZ)';
    ELSE
        ALTER TABLE solicitudes ALTER COLUMN fecha_confirmacion TYPE TIMESTAMPTZ USING fecha_confirmacion AT TIME ZONE 'UTC';
    END IF;
END $$;

COMMENT ON COLUMN solicitudes.created_at IS 'Fecha de creación (TIMESTAMPTZ)';
COMMENT ON COLUMN solicitudes.updated_at IS 'Fecha de actualización (TIMESTAMPTZ)';

-- 4. TABLA: pagos
ALTER TABLE pagos
  ALTER COLUMN timestamp_creado TYPE TIMESTAMPTZ USING timestamp_creado AT TIME ZONE 'UTC',
  ALTER COLUMN timestamp_actual TYPE TIMESTAMPTZ USING timestamp_actual AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- captured_at puede tener NULL values
DO $$ 
BEGIN
    ALTER TABLE pagos 
      ALTER COLUMN captured_at TYPE TIMESTAMPTZ 
      USING CASE 
        WHEN captured_at IS NULL THEN NULL 
        ELSE captured_at AT TIME ZONE 'UTC' 
      END;
END $$;

COMMENT ON COLUMN pagos.timestamp_creado IS 'Timestamp de creación del pago (TIMESTAMPTZ)';
COMMENT ON COLUMN pagos.timestamp_actual IS 'Timestamp de última actualización (TIMESTAMPTZ)';
COMMENT ON COLUMN pagos.captured_at IS 'Timestamp de captura del pago aprobado (TIMESTAMPTZ)';

-- 5. TABLA: prestadores
ALTER TABLE prestadores
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

COMMENT ON COLUMN prestadores.timestamp IS 'Timestamp del evento (TIMESTAMPTZ)';

-- 6. TABLA: servicios
ALTER TABLE servicios
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- timestamp field en servicios
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'servicios' AND column_name = 'timestamp') THEN
        ALTER TABLE servicios ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC';
    END IF;
END $$;

-- 7. TABLA: habilidades
ALTER TABLE habilidades
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 8. TABLA: zonas
ALTER TABLE zonas
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 9. TABLA: rubros
ALTER TABLE rubros
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- 10. TABLA: metrics (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'metrics') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'metrics' AND column_name = 'timestamp') THEN
            ALTER TABLE metrics ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'metrics' AND column_name = 'createdAt') THEN
            ALTER TABLE metrics ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'metrics' AND column_name = 'updatedAt') THEN
            ALTER TABLE metrics ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';
        END IF;
    END IF;
END $$;

-- 11. TABLA: feature_flags (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feature_flags' AND column_name = 'created_at') THEN
            ALTER TABLE feature_flags ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feature_flags' AND column_name = 'updated_at') THEN
            ALTER TABLE feature_flags ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
        END IF;
    END IF;
END $$;

-- ============================================================
-- RESULTADO:
-- Todas las columnas timestamp ahora son TIMESTAMPTZ y contienen
-- timestamps en UTC con timezone information.
-- 
-- PostgreSQL ahora puede:
-- 1. Guardar timestamps con timezone explícito
-- 2. Convertir automáticamente según el timezone de la sesión
-- 3. Comparar fechas correctamente respetando timezones
-- ============================================================

