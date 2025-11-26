-- Migración: Cambiar Primary Key de Solicitudes y eliminar campos redundantes
-- Ejecutar con precaución - este script modifica la estructura de la tabla solicitudes

BEGIN;

-- Paso 1: Eliminar constraint del PK anterior (id autoincremental)
ALTER TABLE solicitudes DROP CONSTRAINT IF EXISTS "PK_solicitudes";

-- Paso 2: Eliminar la columna id autoincremental
ALTER TABLE solicitudes DROP COLUMN IF EXISTS id;

-- Paso 3: Eliminar columna timestamp (redundante con created_at)
ALTER TABLE solicitudes DROP COLUMN IF EXISTS timestamp;

-- Paso 4: Agregar nueva Primary Key en id_solicitud
ALTER TABLE solicitudes ADD PRIMARY KEY (id_solicitud);

-- Paso 5: Agregar columna fecha_confirmacion si no existe
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_confirmacion TIMESTAMP NULL;

-- Paso 6: Agregar columna prestador_asignado (booleano para tracking de asignación)
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS prestador_asignado BOOLEAN NOT NULL DEFAULT FALSE;

-- Paso 7: Actualizar prestador_asignado para solicitudes existentes con prestador
UPDATE solicitudes SET prestador_asignado = TRUE WHERE id_prestador IS NOT NULL;

-- Paso 8: Crear índices útiles
CREATE INDEX IF NOT EXISTS idx_solicitudes_created_at ON solicitudes(created_at);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_solicitudes_prestador ON solicitudes(id_prestador);
CREATE INDEX IF NOT EXISTS idx_solicitudes_zona ON solicitudes(zona);
CREATE INDEX IF NOT EXISTS idx_solicitudes_es_critica ON solicitudes(es_critica);
CREATE INDEX IF NOT EXISTS idx_solicitudes_prestador_asignado ON solicitudes(prestador_asignado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_confirmacion ON solicitudes(fecha_confirmacion) WHERE fecha_confirmacion IS NOT NULL;

-- Paso 9: Verificar resultado
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'solicitudes'
ORDER BY ordinal_position;

COMMIT;

-- Rollback si hay error: ROLLBACK;

