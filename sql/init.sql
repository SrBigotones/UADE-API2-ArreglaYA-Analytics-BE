-- ==============================================
-- SCRIPT COMPLETO PARA ARREGLA YA METRICS
-- ==============================================

-- 1. Remover tablas existentes si existen
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- 2. Asegurarse que la extensión UUID está instalada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tablas
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    value NUMERIC(15,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    period VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT now(),
    metadata JSON,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad VARCHAR(100) NOT NULL,
    topico VARCHAR(100) NOT NULL,
    evento VARCHAR(100) NOT NULL,
    cuerpo JSON NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT now(),
    processed BOOLEAN NOT NULL DEFAULT false,
    "messageId" VARCHAR(255),
    "correlationId" VARCHAR(255),
    source VARCHAR(50) DEFAULT 'unknown',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 3. Crear índices exactamente como los genera TypeORM
CREATE INDEX "IDX_e3e40a120bb80f206b54b89624" ON metrics (name, period);
CREATE INDEX "IDX_dc6f197424b326d462eb953eca" ON metrics ("timestamp");

CREATE INDEX "IDX_5869ae2b93f42ad3e2954e4d8d" ON events (squad, topico, evento);
CREATE INDEX "IDX_b5a6ad5d1dc980d07d07969525" ON events ("timestamp");
CREATE INDEX "IDX_368e57abf7d068b15886972fa7" ON events (processed);
CREATE INDEX "IDX_a47f9d401b39cc1f8758025b18" ON events ("messageId");
CREATE INDEX "IDX_cd2c98dd2b4216e70c4385669f" ON events ("correlationId");
CREATE INDEX "IDX_cb1b45b0a16c1b5c5a685aec5b" ON events (source);

-- 4. Insertar datos de prueba
-- Eventos de usuarios (últimos 30 días)
INSERT INTO events (squad, topico, evento, cuerpo, timestamp, "correlationId") VALUES
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_001", "email": "juan.perez@email.com", "name": "Juan Pérez", "role": "customer"}', NOW() - INTERVAL '1 day', 'user_001'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_002", "email": "maria.garcia@email.com", "name": "María García", "role": "customer"}', NOW() - INTERVAL '2 days', 'user_002'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_003", "email": "carlos.lopez@email.com", "name": "Carlos López", "role": "customer"}', NOW() - INTERVAL '3 days', 'user_003'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_004", "email": "ana.martinez@email.com", "name": "Ana Martínez", "role": "customer"}', NOW() - INTERVAL '5 days', 'user_004'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_005", "email": "luis.rodriguez@email.com", "name": "Luis Rodríguez", "role": "customer"}', NOW() - INTERVAL '7 days', 'user_005'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_006", "email": "sofia.hernandez@email.com", "name": "Sofía Hernández", "role": "customer"}', NOW() - INTERVAL '10 days', 'user_006'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_007", "email": "diego.torres@email.com", "name": "Diego Torres", "role": "customer"}', NOW() - INTERVAL '15 days', 'user_007'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_008", "email": "laura.jimenez@email.com", "name": "Laura Jiménez", "role": "customer"}', NOW() - INTERVAL '20 days', 'user_008'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_009", "email": "pablo.morales@email.com", "name": "Pablo Morales", "role": "customer"}', NOW() - INTERVAL '25 days', 'user_009'),
('Usuarios y Roles', 'User Management', 'users.created', '{"userId": "user_010", "email": "carmen.vargas@email.com", "name": "Carmen Vargas", "role": "customer"}', NOW() - INTERVAL '30 days', 'user_010');

-- Eventos de prestadores (últimos 30 días)
INSERT INTO events (squad, topico, evento, cuerpo, timestamp, "correlationId") VALUES
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_001", "name": "Plomería Express", "category": "plomeria", "rating": 4.8, "location": "Buenos Aires"}', NOW() - INTERVAL '1 day', 'prov_001'),
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_002", "name": "Electricidad Total", "category": "electricidad", "rating": 4.5, "location": "Córdoba"}', NOW() - INTERVAL '3 days', 'prov_002'),
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_003", "name": "Pintura Pro", "category": "pintura", "rating": 4.7, "location": "Rosario"}', NOW() - INTERVAL '5 days', 'prov_003'),
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_004", "name": "Gas Seguro", "category": "gas", "rating": 4.9, "location": "Mendoza"}', NOW() - INTERVAL '8 days', 'prov_004'),
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_005", "name": "Mantenimiento Plus", "category": "mantenimiento", "rating": 4.6, "location": "La Plata"}', NOW() - INTERVAL '12 days', 'prov_005'),
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_006", "name": "Jardinería Verde", "category": "jardineria", "rating": 4.4, "location": "Tucumán"}', NOW() - INTERVAL '18 days', 'prov_006'),
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_007", "name": "Carpintería Artesanal", "category": "carpinteria", "rating": 4.8, "location": "Salta"}', NOW() - INTERVAL '22 days', 'prov_007'),
('Catálogo de servicios y Prestadores', 'Service Management', 'service.providers.created', '{"providerId": "prov_008", "name": "Limpieza Profesional", "category": "limpieza", "rating": 4.3, "location": "Mar del Plata"}', NOW() - INTERVAL '28 days', 'prov_008');

-- Eventos de pagos (últimos 30 días)
INSERT INTO events (squad, topico, evento, cuerpo, timestamp, "correlationId") VALUES
-- Pagos creados
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_001", "amount": 250.00, "currency": "ARS", "userId": "user_001", "serviceId": "serv_001"}', NOW() - INTERVAL '1 day', 'pay_001'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_002", "amount": 180.00, "currency": "ARS", "userId": "user_002", "serviceId": "serv_002"}', NOW() - INTERVAL '2 days', 'pay_002'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_003", "amount": 320.00, "currency": "ARS", "userId": "user_003", "serviceId": "serv_003"}', NOW() - INTERVAL '3 days', 'pay_003'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_004", "amount": 150.00, "currency": "ARS", "userId": "user_004", "serviceId": "serv_004"}', NOW() - INTERVAL '4 days', 'pay_004'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_005", "amount": 280.00, "currency": "ARS", "userId": "user_005", "serviceId": "serv_005"}', NOW() - INTERVAL '5 days', 'pay_005'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_006", "amount": 200.00, "currency": "ARS", "userId": "user_006", "serviceId": "serv_006"}', NOW() - INTERVAL '6 days', 'pay_006'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_007", "amount": 350.00, "currency": "ARS", "userId": "user_007", "serviceId": "serv_007"}', NOW() - INTERVAL '7 days', 'pay_007'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_008", "amount": 120.00, "currency": "ARS", "userId": "user_008", "serviceId": "serv_008"}', NOW() - INTERVAL '8 days', 'pay_008'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_009", "amount": 400.00, "currency": "ARS", "userId": "user_009", "serviceId": "serv_009"}', NOW() - INTERVAL '9 days', 'pay_009'),
('Pagos y Facturación', 'Payment Processing', 'payment.created', '{"paymentId": "pay_010", "amount": 220.00, "currency": "ARS", "userId": "user_010", "serviceId": "serv_010"}', NOW() - INTERVAL '10 days', 'pay_010'),

-- Pagos aprobados
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_001", "amount": 250.00, "currency": "ARS", "userId": "user_001", "approvedAt": "2023-12-01T10:30:00Z"}', NOW() - INTERVAL '1 day' + INTERVAL '5 minutes', 'pay_001'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_002", "amount": 180.00, "currency": "ARS", "userId": "user_002", "approvedAt": "2023-12-02T14:20:00Z"}', NOW() - INTERVAL '2 days' + INTERVAL '3 minutes', 'pay_002'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_003", "amount": 320.00, "currency": "ARS", "userId": "user_003", "approvedAt": "2023-12-03T09:15:00Z"}', NOW() - INTERVAL '3 days' + INTERVAL '7 minutes', 'pay_003'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_004", "amount": 150.00, "currency": "ARS", "userId": "user_004", "approvedAt": "2023-12-04T16:45:00Z"}', NOW() - INTERVAL '4 days' + INTERVAL '2 minutes', 'pay_004'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_005", "amount": 280.00, "currency": "ARS", "userId": "user_005", "approvedAt": "2023-12-05T11:30:00Z"}', NOW() - INTERVAL '5 days' + INTERVAL '4 minutes', 'pay_005'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_006", "amount": 200.00, "currency": "ARS", "userId": "user_006", "approvedAt": "2023-12-06T13:20:00Z"}', NOW() - INTERVAL '6 days' + INTERVAL '6 minutes', 'pay_006'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_007", "amount": 350.00, "currency": "ARS", "userId": "user_007", "approvedAt": "2023-12-07T08:10:00Z"}', NOW() - INTERVAL '7 days' + INTERVAL '8 minutes', 'pay_007'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_008", "amount": 120.00, "currency": "ARS", "userId": "user_008", "approvedAt": "2023-12-08T15:25:00Z"}', NOW() - INTERVAL '8 days' + INTERVAL '3 minutes', 'pay_008'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_009", "amount": 400.00, "currency": "ARS", "userId": "user_009", "approvedAt": "2023-12-09T12:40:00Z"}', NOW() - INTERVAL '9 days' + INTERVAL '5 minutes', 'pay_009'),
('Pagos y Facturación', 'Payment Processing', 'payment.approved', '{"paymentId": "pay_010", "amount": 220.00, "currency": "ARS", "userId": "user_010", "approvedAt": "2023-12-10T17:15:00Z"}', NOW() - INTERVAL '10 days' + INTERVAL '4 minutes', 'pay_010'),

-- Pagos rechazados
('Pagos y Facturación', 'Payment Processing', 'payment.rejected', '{"paymentId": "pay_011", "amount": 300.00, "currency": "ARS", "userId": "user_001", "reason": "Insufficient funds", "rejectedAt": "2023-12-11T10:00:00Z"}', NOW() - INTERVAL '11 days' + INTERVAL '2 minutes', 'pay_011'),
('Pagos y Facturación', 'Payment Processing', 'payment.rejected', '{"paymentId": "pay_012", "amount": 180.00, "currency": "ARS", "userId": "user_002", "reason": "Invalid card", "rejectedAt": "2023-12-12T14:30:00Z"}', NOW() - INTERVAL '12 days' + INTERVAL '1 minute', 'pay_012'),
('Pagos y Facturación', 'Payment Processing', 'payment.rejected', '{"paymentId": "pay_013", "amount": 250.00, "currency": "ARS", "userId": "user_003", "reason": "Card expired", "rejectedAt": "2023-12-13T09:45:00Z"}', NOW() - INTERVAL '13 days' + INTERVAL '3 minutes', 'pay_013'),

-- Pagos expirados
('Pagos y Facturación', 'Payment Processing', 'payment.expired', '{"paymentId": "pay_014", "amount": 200.00, "currency": "ARS", "userId": "user_004", "expiredAt": "2023-12-14T23:59:59Z"}', NOW() - INTERVAL '14 days' + INTERVAL '30 minutes', 'pay_014'),
('Pagos y Facturación', 'Payment Processing', 'payment.expired', '{"paymentId": "pay_015", "amount": 350.00, "currency": "ARS", "userId": "user_005", "expiredAt": "2023-12-15T23:59:59Z"}', NOW() - INTERVAL '15 days' + INTERVAL '45 minutes', 'pay_015');

-- Eventos de solicitudes
INSERT INTO events (squad, topico, evento, cuerpo, timestamp, "correlationId") VALUES
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_001", "userId": "user_001", "serviceType": "plomeria", "description": "Fuga de agua en cocina", "urgency": "high"}', NOW() - INTERVAL '1 day', 'req_001'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_002", "userId": "user_002", "serviceType": "electricidad", "description": "Instalación de ventilador", "urgency": "medium"}', NOW() - INTERVAL '2 days', 'req_002'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_003", "userId": "user_003", "serviceType": "pintura", "description": "Pintar habitación", "urgency": "low"}', NOW() - INTERVAL '3 days', 'req_003'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_004", "userId": "user_004", "serviceType": "gas", "description": "Revisión de calefón", "urgency": "high"}', NOW() - INTERVAL '4 days', 'req_004'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_005", "userId": "user_005", "serviceType": "mantenimiento", "description": "Mantenimiento general", "urgency": "medium"}', NOW() - INTERVAL '5 days', 'req_005'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_006", "userId": "user_006", "serviceType": "jardineria", "description": "Corte de césped", "urgency": "low"}', NOW() - INTERVAL '6 days', 'req_006'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_007", "userId": "user_007", "serviceType": "carpinteria", "description": "Reparación de mueble", "urgency": "medium"}', NOW() - INTERVAL '7 days', 'req_007'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_008", "userId": "user_008", "serviceType": "limpieza", "description": "Limpieza profunda", "urgency": "low"}', NOW() - INTERVAL '8 days', 'req_008'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_009", "userId": "user_009", "serviceType": "plomeria", "description": "Instalación de grifo", "urgency": "medium"}', NOW() - INTERVAL '9 days', 'req_009'),
('App de búsqueda y solicitudes', 'Request Management', 'requests.created', '{"requestId": "req_010", "userId": "user_010", "serviceType": "electricidad", "description": "Reparación de toma", "urgency": "high"}', NOW() - INTERVAL '10 days', 'req_010');

-- Métricas calculadas para diferentes períodos
INSERT INTO metrics (name, value, unit, period, timestamp) VALUES
-- Métricas de usuarios
('total_users', 1500, 'count', 'incremental', NOW()),
('new_users_today', 25, 'count', 'daily', NOW()),
('new_users_this_week', 150, 'count', 'weekly', NOW()),
('new_users_this_month', 600, 'count', 'monthly', NOW()),

-- Métricas de prestadores
('total_providers', 200, 'count', 'incremental', NOW()),
('new_providers_today', 3, 'count', 'daily', NOW()),
('new_providers_this_week', 18, 'count', 'weekly', NOW()),
('new_providers_this_month', 75, 'count', 'monthly', NOW()),

-- Métricas de pagos
('total_payments', 600, 'count', 'incremental', NOW()),
('successful_payments', 550, 'count', 'incremental', NOW()),
('failed_payments', 50, 'count', 'incremental', NOW()),
('total_revenue', 150000, 'currency', 'incremental', NOW()),
('average_payment_amount', 250, 'currency', 'incremental', NOW()),

-- Métricas de solicitudes
('total_requests', 800, 'count', 'incremental', NOW()),
('pending_requests', 50, 'count', 'incremental', NOW()),
('completed_requests', 700, 'count', 'incremental', NOW()),
('cancelled_requests', 50, 'count', 'incremental', NOW()),
('average_response_time', 2.5, 'minutes', 'incremental', NOW()),

-- Métricas de servicios
('total_services', 500, 'count', 'incremental', NOW()),
('active_services', 450, 'count', 'incremental', NOW()),
('average_rating', 4.5, 'rating', 'incremental', NOW());

-- 5. Marcar eventos como procesados
UPDATE events SET processed = TRUE;

-- 6. Verificar los datos
SELECT 'Events by Squad and Event' as info;
SELECT squad, evento, COUNT(*) as total FROM events GROUP BY squad, evento ORDER BY squad, evento;

SELECT 'Metrics Summary' as info;
SELECT name, value, unit, period FROM metrics ORDER BY name;

SELECT 'Payment Status Distribution' as info;
SELECT evento, COUNT(*) as total FROM events WHERE topico = 'Payment Processing' GROUP BY evento;