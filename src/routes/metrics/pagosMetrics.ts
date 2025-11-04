import { Router } from 'express';
import { PagosController } from '../../controllers/metrics/PagosController';

const router = Router();
const pagosController = new PagosController();

// ========== 💳 PAGOS Y FACTURACIÓN ==========

/**
 * @swagger
 * /api/metrica/pagos/tasa-exito:
 *   get:
 *     summary: Tasa de éxito de pagos (%)
 *     description: Obtiene el porcentaje de pagos exitosos respecto al total
 *     tags: [💳 Pagos y Facturación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Tasa de éxito obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 */
router.get('/pagos/tasa-exito', pagosController.getTasaExitoPagos.bind(pagosController));

/**
 * @swagger
 * /api/metrica/pagos/distribucion-metodos:
 *   get:
 *     summary: Distribución por métodos de pago
 *     description: Obtiene la distribución de pagos por método utilizado
 *     tags: [💳 Pagos y Facturación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Distribución obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PieMetricResponse'
 */
router.get('/pagos/distribucion-metodos', pagosController.getDistribucionMetodosPago.bind(pagosController));

/**
 * @swagger
 * /api/metrica/pagos/distribucion-eventos:
 *   get:
 *     summary: Distribución por tipo de evento de pago (%)
 *     description: Obtiene la distribución de eventos de pago (aprobado, rechazado, expirado, pendiente)
 *     tags: [💳 Pagos y Facturación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Distribución de eventos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PieMetricResponse'
 */
router.get('/pagos/distribucion-eventos', pagosController.getDistribucionEventosPago.bind(pagosController));

/**
 * @swagger
 * /api/metrica/pagos/tiempo-procesamiento:
 *   get:
 *     summary: Tiempo promedio de procesamiento de pagos (minutos)
 *     description: Obtiene el tiempo promedio que tarda el procesamiento de un pago
 *     tags: [💳 Pagos y Facturación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Tiempo promedio obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 */
router.get('/pagos/tiempo-procesamiento', pagosController.getTiempoProcesamientoPagos.bind(pagosController));

/**
 * @swagger
 * /api/metrica/pagos/ingreso-ticket:
 *   get:
 *     summary: Ingreso bruto y ticket medio (ARS)
 *     description: Obtiene el ingreso bruto total y el ticket promedio de los pagos
 *     tags: [💳 Pagos y Facturación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Ingreso bruto y ticket medio obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ingresoBruto:
 *                       $ref: '#/components/schemas/CardMetricResponse'
 *                     ticketMedio:
 *                       $ref: '#/components/schemas/CardMetricResponse'
 */
router.get('/pagos/ingreso-ticket', pagosController.getIngresoTicket.bind(pagosController));

export default router;

