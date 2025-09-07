import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';

const router = Router();
const metricsController = new MetricsController();

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Obtener todas las métricas
 *     description: Obtiene una lista paginada de todas las métricas con filtros opcionales
 *     tags: [Metrics]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de elementos por página
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de métrica
 *         example: "total_users"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Filtrar por período
 *         example: "daily"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para filtrar
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para filtrar
 *     responses:
 *       200:
 *         description: Lista de métricas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Metric'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', metricsController.getAllMetrics.bind(metricsController));

/**
 * @swagger
 * /api/metrics/users/summary:
 *   get:
 *     summary: Métricas de usuarios
 *     description: Obtiene un resumen de las métricas relacionadas con usuarios
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserMetrics'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/summary', metricsController.getUserMetrics.bind(metricsController));

/**
 * @swagger
 * /api/metrics/services/summary:
 *   get:
 *     summary: Métricas de servicios
 *     description: Obtiene un resumen de las métricas relacionadas con servicios
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas de servicios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceMetrics'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/services/summary', metricsController.getServiceMetrics.bind(metricsController));

/**
 * @swagger
 * /api/metrics/requests/summary:
 *   get:
 *     summary: Métricas de solicitudes
 *     description: Obtiene un resumen de las métricas relacionadas con solicitudes
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas de solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RequestMetrics'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/requests/summary', metricsController.getRequestMetrics.bind(metricsController));

/**
 * @swagger
 * /api/metrics/payments/summary:
 *   get:
 *     summary: Métricas de pagos
 *     description: Obtiene un resumen de las métricas relacionadas con pagos y facturación
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas de pagos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMetrics'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/payments/summary', metricsController.getPaymentMetrics.bind(metricsController));

/**
 * @swagger
 * /api/metrics/providers/summary:
 *   get:
 *     summary: Métricas de prestadores
 *     description: Obtiene un resumen de las métricas relacionadas con prestadores de servicios
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas de prestadores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProviderMetrics'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/providers/summary', metricsController.getProviderMetrics.bind(metricsController));

/**
 * @swagger
 * /api/metrics/{name}:
 *   get:
 *     summary: Obtener métrica específica
 *     description: Obtiene métricas filtradas por nombre específico
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de la métrica
 *         example: "total_users"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Filtrar por período
 *         example: "daily"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para filtrar
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para filtrar
 *     responses:
 *       200:
 *         description: Métricas encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Metric'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:name', metricsController.getMetricByName.bind(metricsController));

export default router;
