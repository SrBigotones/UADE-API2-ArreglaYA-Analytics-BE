-- Script para marcar eventos como no procesados para reprocesamiento
-- Ejecutar DESPUÉS de deployar los fixes en EventNormalizationService.ts

-- ============================================
-- OPCIÓN 1: Reprocesar TODOS los eventos fallidos (156 eventos)
-- ============================================
-- UPDATE events SET processed = false WHERE processed = false;
-- (Ya están en false, no hace falta)


-- ============================================
-- OPCIÓN 2: Reprocesar solo los eventos que ahora deberían funcionar
-- ============================================

-- 1. Todos los eventos de payments (90 eventos) - ahora funcionarán con el fix de topico
UPDATE events 
SET processed = false 
WHERE topico = 'payment' AND processed = false;

-- Verificar cuántos se marcarán:
SELECT 
    topico,
    evento,
    COUNT(*) as eventos_a_reprocesar
FROM events
WHERE topico = 'payment' AND processed = false
GROUP BY topico, evento;


-- 2. Eventos de solicitud.cancelada (4 eventos) - ahora funcionarán con el fix de routing
UPDATE events 
SET processed = false 
WHERE topico = 'solicitud' AND evento = 'cancelada' AND processed = false;

-- Verificar:
SELECT COUNT(*) as solicitudes_canceladas_a_reprocesar
FROM events
WHERE topico = 'solicitud' AND evento = 'cancelada' AND processed = false;


-- 3. Eventos de solicitud.creada fallidos (20 eventos) - ahora manejarán habilidad_id no numérico
UPDATE events 
SET processed = false 
WHERE topico = 'solicitud' AND evento = 'creada' AND processed = false;

-- Verificar:
SELECT COUNT(*) as solicitudes_creadas_a_reprocesar
FROM events
WHERE topico = 'solicitud' AND evento = 'creada' AND processed = false;


-- 4. Eventos de prestador.modificacion fallidos (2 eventos)
UPDATE events 
SET processed = false 
WHERE topico = 'prestador' AND evento = 'modificacion' AND processed = false;


-- ============================================
-- VERIFICAR RESUMEN ANTES DE REPROCESAR
-- ============================================

SELECT 
    'ANTES DE REPROCESAR' as etapa,
    COUNT(*) FILTER (WHERE processed = false) as pendientes,
    COUNT(*) FILTER (WHERE processed = true) as procesados,
    COUNT(*) as total
FROM events;

SELECT 
    topico,
    evento,
    COUNT(*) FILTER (WHERE processed = false) as pendientes,
    COUNT(*) FILTER (WHERE processed = true) as procesados
FROM events
WHERE processed = false
GROUP BY topico, evento
ORDER BY pendientes DESC;


-- ============================================
-- DESPUÉS DE EJECUTAR EL REPROCESS ENDPOINT
-- Ejecutar estas queries para verificar
-- ============================================

/*
SELECT 
    'DESPUÉS DE REPROCESAR' as etapa,
    COUNT(*) FILTER (WHERE processed = false) as pendientes,
    COUNT(*) FILTER (WHERE processed = true) as procesados,
    COUNT(*) as total
FROM events;

SELECT 
    topico,
    evento,
    COUNT(*) FILTER (WHERE processed = false) as aun_pendientes,
    COUNT(*) FILTER (WHERE processed = true) as procesados
FROM events
GROUP BY topico, evento
ORDER BY aun_pendientes DESC;

-- Verificar tablas normalizadas
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
*/
