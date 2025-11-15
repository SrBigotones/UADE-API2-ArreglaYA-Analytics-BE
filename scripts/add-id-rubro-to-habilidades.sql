-- Script para agregar la columna id_rubro a la tabla habilidades
-- Este campo existe en el core y debería estar sincronizado

-- Agregar columna id_rubro
ALTER TABLE habilidades 
ADD COLUMN id_rubro BIGINT NULL AFTER nombre_habilidad;

-- Crear índice para mejorar el rendimiento de filtros por rubro
CREATE INDEX idx_habilidades_id_rubro ON habilidades(id_rubro);

-- Comentario sobre la columna
ALTER TABLE habilidades 
MODIFY COLUMN id_rubro BIGINT NULL COMMENT 'FK a la tabla rubros del core (catalogo.rubro)';

SELECT 'Columna id_rubro agregada exitosamente a la tabla habilidades' as resultado;

