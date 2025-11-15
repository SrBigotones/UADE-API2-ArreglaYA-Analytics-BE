import { Router } from 'express';
import { PagosMetricsController } from '../../controllers/metrics/pagos/PagosMetricsController';

const router = Router();
const controller = new PagosMetricsController();

/**
 * @swagger
 * tags:
 *   name: Métricas - Pagos
 *   description: Endpoints de métricas relacionadas con pagos y facturación
 */

/**
 * @swagger
 * /api/metrica/pagos/tasa-exito:
 *   get:
 *     summary: Tasa de éxito de pagos (%)
 *     description: Retorna el porcentaje de pagos aprobados sobre el total de pagos procesados
 *     tags: [Métricas - Pagos]
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
 *         description: Tasa de éxito de pagos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/tasa-exito', controller.getTasaExitoPagos.bind(controller));

/**
 * @swagger
 * /api/metrica/pagos/distribucion-metodos:
 *   get:
 *     summary: Distribución por métodos de pago
 *     description: Retorna la cantidad de pagos agrupados por método de pago
 *     tags: [Métricas - Pagos]
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
 *         description: Distribución por métodos de pago
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PieMetricResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/distribucion-metodos', controller.getDistribucionMetodosPago.bind(controller));

/**
 * @swagger
 * /api/metrica/pagos/distribucion-eventos:
 *   get:
 *     summary: Distribución por tipo de evento de pago
 *     description: Retorna la cantidad de pagos agrupados por estado (aprobado, rechazado, pendiente)
 *     tags: [Métricas - Pagos]
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
 *         description: Distribución por tipo de evento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PieMetricResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/distribucion-eventos', controller.getDistribucionEventosPago.bind(controller));

/**
 * @swagger
 * /api/metrica/pagos/tiempo-procesamiento:
 *   get:
 *     summary: Tiempo promedio de procesamiento de pagos (minutos)
 *     description: Retorna el tiempo promedio en minutos que toma procesar un pago desde su creación hasta su captura
 *     tags: [Métricas - Pagos]
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
 *         description: Tiempo promedio de procesamiento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/tiempo-procesamiento', controller.getTiempoProcesamientoPagos.bind(controller));

/**
 * @swagger
 * /api/metrica/pagos/ingreso-ticket:
 *   get:
 *     summary: Ingreso bruto y ticket medio (ARS)
 *     description: Retorna el ingreso bruto total y el ticket medio de pagos aprobados
 *     tags: [Métricas - Pagos]
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
 *         description: Ingreso bruto y ticket medio
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
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/ingreso-ticket', controller.getIngresoTicket.bind(controller));

// Rutas legacy
/**
 * @swagger
 * /api/metrica/pagos/exitosos:
 *   get:
 *     summary: Pagos exitosos (legacy)
 *     description: Endpoint legacy - usar /api/metrica/pagos/tasa-exito en su lugar
 *     tags: [Métricas - Pagos]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *     responses:
 *       200:
 *         description: Tasa de éxito de pagos
 */
router.get('/exitosos', controller.getPagosExitosos.bind(controller));

/**
 * @swagger
 * /api/metrica/pagos/distribucion:
 *   get:
 *     summary: Distribución de pagos (legacy)
 *     description: Endpoint legacy - usar /api/metrica/pagos/distribucion-eventos en su lugar
 *     tags: [Métricas - Pagos]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *     responses:
 *       200:
 *         description: Distribución de pagos
 */
router.get('/distribucion', controller.getPagosDistribucion.bind(controller));

/**
 * @swagger
 * /api/metrica/pagos/tiempoProcesamiento:
 *   get:
 *     summary: Tiempo de procesamiento (legacy)
 *     description: Endpoint legacy - usar /api/metrica/pagos/tiempo-procesamiento en su lugar
 *     tags: [Métricas - Pagos]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *     responses:
 *       200:
 *         description: Tiempo de procesamiento
 */
router.get('/tiempoProcesamiento', controller.getPagosTiempoProcesamiento.bind(controller));

export default router;

