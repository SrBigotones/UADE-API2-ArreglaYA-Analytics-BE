BEGIN;

-- Paso 1: Verificar datos existentes
SELECT 
    COUNT(*) as total_usuarios,
    SUM(CASE WHEN estado = 'baja' THEN 1 ELSE 0 END) as usuarios_baja,
    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as usuarios_activos
FROM usuarios;

-- Paso 2: Agregar nueva columna fecha_baja
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_baja TIMESTAMP NULL;

-- Paso 3: Poblar fecha_baja para usuarios que ya están de baja
-- Usamos timestamp como referencia (es lo mejor que tenemos para datos históricos)
UPDATE usuarios
SET fecha_baja = timestamp
WHERE estado = 'baja' AND fecha_baja IS NULL;

-- Paso 4: Eliminar índice sobre timestamp
DROP INDEX IF EXISTS idx_usuarios_timestamp;

-- Paso 5: Crear índice sobre created_at (si no existe)
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON usuarios(created_at);

-- Paso 6: Crear índice sobre fecha_baja (para consultas de usuarios dados de baja)
CREATE INDEX IF NOT EXISTS idx_usuarios_fecha_baja ON usuarios(fecha_baja) WHERE fecha_baja IS NOT NULL;

-- Paso 7: Eliminar columnas redundantes
ALTER TABLE usuarios DROP COLUMN IF EXISTS timestamp;
ALTER TABLE usuarios DROP COLUMN IF EXISTS updated_at;

-- Paso 8: Verificar migración
SELECT 
    'Migración completada' as status,
    COUNT(*) as total_usuarios,
    SUM(CASE WHEN estado = 'baja' AND fecha_baja IS NOT NULL THEN 1 ELSE 0 END) as bajas_con_fecha,
    SUM(CASE WHEN estado = 'baja' AND fecha_baja IS NULL THEN 1 ELSE 0 END) as bajas_sin_fecha,
    SUM(CASE WHEN estado = 'activo' AND fecha_baja IS NULL THEN 1 ELSE 0 END) as activos_ok
FROM usuarios;

-- Paso 9: Verificar que la columna created_at existe y tiene datos
SELECT 
    MIN(created_at) as fecha_primer_usuario,
    MAX(created_at) as fecha_ultimo_usuario,
    COUNT(*) as total_con_created_at
FROM usuarios
WHERE created_at IS NOT NULL;

COMMIT;

