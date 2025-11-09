import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const adminController = new AdminController();

/**
 * IMPORTANTE: Todos los endpoints administrativos requieren autenticación
 * Estos endpoints deben estar protegidos adicionalmente en producción
 */

/**
 * @swagger
 * /api/admin/migrate/all:
 *   post:
 *     summary: Migrar todos los eventos históricos
 *     description: Migra todos los eventos de la tabla events a las tablas normalizadas
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 default: 1000
 *                 description: Tamaño del lote para procesar
 *     responses:
 *       200:
 *         description: Migración completada exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error en la migración
 */
router.post('/migrate/all', authenticateToken, adminController.migrateAllEvents.bind(adminController));

/**
 * @swagger
 * /api/admin/migrate/from-date:
 *   post:
 *     summary: Migrar eventos desde una fecha
 *     description: Migra eventos desde una fecha específica a las tablas normalizadas
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromDate
 *             properties:
 *               fromDate:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha desde la cual migrar (formato ISO)
 *               batchSize:
 *                 type: integer
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Migración completada exitosamente
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error en la migración
 */
router.post('/migrate/from-date', authenticateToken, adminController.migrateFromDate.bind(adminController));

/**
 * @swagger
 * /api/admin/migrate/unprocessed:
 *   post:
 *     summary: Migrar eventos no procesados
 *     description: Migra solo los eventos que no han sido procesados aún
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Migración completada exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error en la migración
 */
router.post('/migrate/unprocessed', authenticateToken, adminController.migrateUnprocessed.bind(adminController));

/**
 * @swagger
 * /api/admin/reprocess-events:
 *   post:
 *     summary: Reprocesar eventos existentes
 *     description: Renormaliza eventos que ya fueron procesados. Útil después de actualizar la lógica de normalización.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *                 description: Tipo de evento a reprocesar (user, payment, solicitud, etc.)
 *                 example: user
 *               squad:
 *                 type: string
 *                 description: Filtrar por squad específico
 *                 example: users
 *               limit:
 *                 type: integer
 *                 default: 100
 *                 description: Cantidad máxima de eventos a reprocesar
 *               markAsUnprocessed:
 *                 type: boolean
 *                 default: false
 *                 description: Si true, solo marca eventos como no procesados sin reprocesarlos inmediatamente
 *     responses:
 *       200:
 *         description: Reprocesamiento completado exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error en el reprocesamiento
 */
router.post('/reprocess-events', authenticateToken, adminController.reprocessEvents.bind(adminController));

export default router;
