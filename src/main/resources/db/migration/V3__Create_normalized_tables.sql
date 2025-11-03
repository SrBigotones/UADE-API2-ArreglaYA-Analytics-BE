-- ==============================================
-- MIGRACIÓN V3: Crear tablas normalizadas para KPIs
-- ==============================================

-- 1. Tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario BIGINT PRIMARY KEY,
    rol VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL, -- 'activo' / 'baja' / 'rechazado'
    timestamp TIMESTAMP NOT NULL,
    ubicacion VARCHAR(100), -- ciudad o provincia (solo para prestadores)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_estado ON usuarios (rol, estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios (estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_timestamp ON usuarios (timestamp);
CREATE INDEX IF NOT EXISTS idx_usuarios_ubicacion ON usuarios (ubicacion);

-- 2. Tabla servicios
CREATE TABLE IF NOT EXISTS servicios (
    id_servicio BIGINT PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para servicios
CREATE INDEX IF NOT EXISTS idx_servicios_id_usuario ON servicios (id_usuario);
CREATE INDEX IF NOT EXISTS idx_servicios_activo ON servicios (activo);
CREATE INDEX IF NOT EXISTS idx_servicios_timestamp ON servicios (timestamp);

-- 3. Tabla solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud BIGINT PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    id_prestador BIGINT,
    estado VARCHAR(20) NOT NULL, -- 'creada' / 'cancelada' / 'aceptada' / 'rechazada'
    zona VARCHAR(100),
    timestamp TIMESTAMP NOT NULL,
    es_critica BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para solicitudes
CREATE INDEX IF NOT EXISTS idx_solicitudes_id_usuario ON solicitudes (id_usuario);
CREATE INDEX IF NOT EXISTS idx_solicitudes_id_prestador ON solicitudes (id_prestador);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes (estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_zona ON solicitudes (zona);
CREATE INDEX IF NOT EXISTS idx_solicitudes_timestamp ON solicitudes (timestamp);
CREATE INDEX IF NOT EXISTS idx_solicitudes_es_critica ON solicitudes (es_critica);

-- 4. Tabla cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
    id_cotizacion BIGINT PRIMARY KEY,
    id_solicitud BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    id_prestador BIGINT NOT NULL,
    estado VARCHAR(20) NOT NULL, -- 'emitida' / 'aceptada' / 'rechazada' / 'expirada'
    monto DECIMAL(12,2),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para cotizaciones
CREATE INDEX IF NOT EXISTS idx_cotizaciones_id_solicitud ON cotizaciones (id_solicitud);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_id_usuario ON cotizaciones (id_usuario);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_id_prestador ON cotizaciones (id_prestador);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones (estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_timestamp ON cotizaciones (timestamp);

-- 5. Tabla habilidades
CREATE TABLE IF NOT EXISTS habilidades (
    id_usuario BIGINT NOT NULL,
    id_habilidad BIGINT NOT NULL,
    nombre_habilidad VARCHAR(100) NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_habilidad)
);

-- Índices para habilidades
CREATE INDEX IF NOT EXISTS idx_habilidades_id_usuario ON habilidades (id_usuario);
CREATE INDEX IF NOT EXISTS idx_habilidades_id_habilidad ON habilidades (id_habilidad);
CREATE INDEX IF NOT EXISTS idx_habilidades_nombre ON habilidades (nombre_habilidad);

-- 6. Tabla zonas
CREATE TABLE IF NOT EXISTS zonas (
    id_usuario BIGINT NOT NULL,
    id_zona BIGINT NOT NULL,
    nombre_zona VARCHAR(100) NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_zona)
);

-- Índices para zonas
CREATE INDEX IF NOT EXISTS idx_zonas_id_usuario ON zonas (id_usuario);
CREATE INDEX IF NOT EXISTS idx_zonas_id_zona ON zonas (id_zona);
CREATE INDEX IF NOT EXISTS idx_zonas_nombre ON zonas (nombre_zona);

-- 7. Tabla pagos
CREATE TABLE IF NOT EXISTS pagos (
    id_pago BIGINT PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    id_prestador BIGINT,
    id_solicitud BIGINT,
    monto_total DECIMAL(12,2) NOT NULL,
    moneda VARCHAR(10) NOT NULL DEFAULT 'ARS',
    metodo VARCHAR(50),
    estado VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' / 'approved' / 'rejected' / 'expired' / 'refunded'
    timestamp_creado TIMESTAMP NOT NULL,
    timestamp_actual TIMESTAMP NOT NULL,
    captured_at TIMESTAMP,
    refund_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_pagos_id_usuario ON pagos (id_usuario);
CREATE INDEX IF NOT EXISTS idx_pagos_id_prestador ON pagos (id_prestador);
CREATE INDEX IF NOT EXISTS idx_pagos_id_solicitud ON pagos (id_solicitud);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos (estado);
CREATE INDEX IF NOT EXISTS idx_pagos_timestamp_creado ON pagos (timestamp_creado);
CREATE INDEX IF NOT EXISTS idx_pagos_metodo ON pagos (metodo);

-- Comentarios para documentación
COMMENT ON TABLE usuarios IS 'Tabla normalizada de usuarios para KPIs rápidos';
COMMENT ON TABLE servicios IS 'Tabla normalizada de servicios para KPIs rápidos';
COMMENT ON TABLE solicitudes IS 'Tabla normalizada de solicitudes para KPIs rápidos';
COMMENT ON TABLE cotizaciones IS 'Tabla normalizada de cotizaciones para KPIs rápidos';
COMMENT ON TABLE habilidades IS 'Tabla normalizada de habilidades para KPIs rápidos';
COMMENT ON TABLE zonas IS 'Tabla normalizada de zonas para KPIs rápidos';
COMMENT ON TABLE pagos IS 'Tabla normalizada de pagos para KPIs rápidos';

