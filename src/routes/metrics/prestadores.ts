import { Router } from 'express';
import { PrestadoresMetricsController } from '../../controllers/metrics/prestadores/PrestadoresMetricsController';

const router = Router();
const controller = new PrestadoresMetricsController();

/**
 * @swagger
 * tags:
 *   name: Métricas - Prestadores
 *   description: Endpoints de métricas relacionadas con prestadores y servicios
 */

/**
 * @swagger
 * /api/metrica/prestadores/nuevos-registrados:
 *   get:
 *     summary: Nuevos prestadores registrados
 *     description: Retorna el número de nuevos prestadores activos registrados en el período especificado
 *     tags: [Métricas - Prestadores]
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
 *         description: Nuevos prestadores registrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/nuevos-registrados', controller.getNuevosPrestadoresRegistrados.bind(controller));

/**
 * @swagger
 * /api/metrica/prestadores/total-activos:
 *   get:
 *     summary: Total de prestadores activos
 *     description: Retorna el número total de prestadores que están actualmente activos en la plataforma
 *     tags: [Métricas - Prestadores]
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
 *         description: Total de prestadores activos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/total-activos', controller.getTotalPrestadoresActivos.bind(controller));

/**
 * @swagger
 * /api/metrica/prestadores/win-rate-rubro:
 *   get:
 *     summary: Win Rate por rubro (%)
 *     description: Retorna el porcentaje de cotizaciones ganadas (aceptadas) sobre el total de cotizaciones emitidas
 *     tags: [Métricas - Prestadores]
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
 *         description: Win Rate por rubro
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/win-rate-rubro', controller.getWinRatePorRubro.bind(controller));

/**
 * @swagger
 * /api/metrica/prestadores/servicios/distribucion:
 *   get:
 *     summary: Distribución de servicios
 *     description: Retorna la distribución de solicitudes agrupadas por tipo de servicio/habilidad
 *     tags: [Métricas - Prestadores]
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
 *         description: Distribución de servicios
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
router.get('/servicios/distribucion', controller.getDistribucionServicios.bind(controller));

/**
 * @swagger
 * /api/metrica/prestadores/servicios/distribucion-por-rubro:
 *   get:
 *     summary: Distribución de prestadores por rubro
 *     description: Retorna la cantidad de prestadores que ofrecen servicios en cada rubro
 *     tags: [Métricas - Prestadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, historico, personalizado]
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
 *       - in: query
 *         name: zona
 *         schema:
 *           type: string
 *         description: Filtrar por zona geográfica (nombre)
 *     responses:
 *       200:
 *         description: Distribución de prestadores por rubro
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
router.get('/servicios/distribucion-por-rubro', controller.getDistribucionServiciosPorRubro.bind(controller));

/**
 * @swagger
 * /api/metrica/prestadores/zonas:
 *   get:
 *     summary: Prestadores por zona (legacy)
 *     description: Retorna información sobre la distribución geográfica de prestadores y sus habilidades
 *     tags: [Métricas - Prestadores]
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
 *         description: Prestadores por zona
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: number
 *                           lon:
 *                             type: number
 *                           providerType:
 *                             type: string
 *                           count:
 *                             type: number
 *                           zoneName:
 *                             type: string
 *                     totalProviders:
 *                       type: number
 *                     providerTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/zonas', controller.getPrestadoresZonas.bind(controller));

/**
 * @swagger
 * /api/metrica/prestadores/registrados:
 *   get:
 *     summary: Prestadores registrados (legacy)
 *     description: Endpoint legacy - usar /api/metrica/prestadores/nuevos-registrados en su lugar
 *     tags: [Métricas - Prestadores]
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
 *         description: Prestadores por zona
 */
router.get('/registrados', controller.getPrestadoresZonas.bind(controller));

export default router;
