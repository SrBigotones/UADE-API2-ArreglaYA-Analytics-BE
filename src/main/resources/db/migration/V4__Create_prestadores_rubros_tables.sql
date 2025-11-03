-- Migración V4: Crear tablas de prestadores y rubros
-- Fecha: 2025-01-XX
-- Descripción: Tablas para soportar KPIs de catálogo de servicios y prestadores

-- Tabla prestadores
CREATE TABLE IF NOT EXISTS prestadores (
    id_prestador BIGINT PRIMARY KEY,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    timestamp TIMESTAMP NOT NULL,
    perfil_completo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para prestadores
CREATE INDEX IF NOT EXISTS idx_prestadores_estado ON prestadores(estado);
CREATE INDEX IF NOT EXISTS idx_prestadores_timestamp ON prestadores(timestamp);
CREATE INDEX IF NOT EXISTS idx_prestadores_perfil_completo ON prestadores(perfil_completo);
CREATE INDEX IF NOT EXISTS idx_prestadores_estado_perfil ON prestadores(estado, perfil_completo);

-- Tabla rubros
CREATE TABLE IF NOT EXISTS rubros (
    id_rubro BIGINT PRIMARY KEY,
    nombre_rubro VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para rubros
CREATE INDEX IF NOT EXISTS idx_rubros_nombre ON rubros(nombre_rubro);

-- Comentarios en las tablas
COMMENT ON TABLE prestadores IS 'Almacena información de prestadores de servicios. Eventos fuente: prestador.alta, prestador.baja, prestador.modificacion';
COMMENT ON COLUMN prestadores.id_prestador IS 'ID único del prestador';
COMMENT ON COLUMN prestadores.nombre IS 'Nombre del prestador';
COMMENT ON COLUMN prestadores.apellido IS 'Apellido del prestador';
COMMENT ON COLUMN prestadores.estado IS 'Estado del prestador: activo, baja';
COMMENT ON COLUMN prestadores.timestamp IS 'Timestamp del evento que generó este registro';
COMMENT ON COLUMN prestadores.perfil_completo IS 'Indica si el perfil del prestador está completo (tiene nombre, apellido, foto, zonas, habilidades)';

COMMENT ON TABLE rubros IS 'Almacena información de rubros/categorías de servicios. Eventos fuente: rubro.alta, rubro.modificacion, rubro.baja';
COMMENT ON COLUMN rubros.id_rubro IS 'ID único del rubro';
COMMENT ON COLUMN rubros.nombre_rubro IS 'Nombre del rubro/categoría de servicio';

