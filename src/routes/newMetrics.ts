import { Router } from 'express';
import { NewMetricsController } from '../controllers/NewMetricsController';

const router = Router();
const newMetricsController = new NewMetricsController();

/**
 * @swagger
 * components:
 *   schemas:
 *     CardMetricResponse:
 *       type: object
 *       properties:
 *         value:
 *           type: number
 *           description: Valor principal de la métrica
 *           example: 234
 *         change:
 *           type: number
 *           description: Cambio respecto al período anterior
 *           example: 28
 *         changeType:
 *           type: string
 *           enum: [porcentaje, absoluto]
 *           description: Tipo de cambio
 *           example: "porcentaje"
 *         changeStatus:
 *           type: string
 *           enum: [positivo, negativo]
 *           description: Estado del cambio
 *           example: "positivo"
 *     PieMetricResponse:
 *       type: object
 *       additionalProperties:
 *         type: number
 *       example:
 *         APROBADO: 62
 *         RECHAZADO: 18
 *         EXPIRADO: 9
 *         PENDIENTE: 11
 *     PeriodParams:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *           description: Tipo de período
 *           example: "ultimos_7_dias"
 *         startDate:
 *           type: string
 *           format: date
 *           description: Fecha de inicio (requerida para período personalizado)
 *           example: "2023-01-01"
 *         endDate:
 *           type: string
 *           format: date
 *           description: Fecha de fin (requerida para período personalizado)
 *           example: "2023-01-31"
 */

/**
 * @swagger
 * /api/metrica/usuarios/creados:
 *   get:
 *     summary: Métricas de usuarios creados
 *     description: Obtiene el número de usuarios creados en un período con comparación al período anterior
 *     tags: [Nuevas Métricas]
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *         description: Período de tiempo a analizar
 *         example: "ultimos_7_dias"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (solo para período personalizado)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (solo para período personalizado)
 *     responses:
 *       200:
 *         description: Métrica de usuarios creados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 *       400:
 *         description: Error en los parámetros de entrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El parámetro period es requerido"
 *                 error:
 *                   type: string
 */
router.get('/usuarios/creados', newMetricsController.getUsuariosCreados.bind(newMetricsController));

/**
 * @swagger
 * /api/metrica/prestadores/registrados:
 *   get:
 *     summary: Métricas de prestadores registrados
 *     description: Obtiene el número de prestadores registrados en un período con comparación al período anterior
 *     tags: [Nuevas Métricas]
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *         description: Período de tiempo a analizar
 *         example: "ultimos_7_dias"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (solo para período personalizado)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (solo para período personalizado)
 *     responses:
 *       200:
 *         description: Métrica de prestadores registrados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 *       400:
 *         description: Error en los parámetros de entrada
 */
router.get('/prestadores/registrados', newMetricsController.getPrestadoresRegistrados.bind(newMetricsController));

/**
 * @swagger
 * /api/metrica/pagos/exitosos:
 *   get:
 *     summary: Tasa de éxito de pagos
 *     description: Obtiene la tasa de éxito de pagos como porcentaje (pagos aprobados / total pagos completados)
 *     tags: [Nuevas Métricas]
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *         description: Período de tiempo a analizar
 *         example: "ultimos_7_dias"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (solo para período personalizado)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (solo para período personalizado)
 *     responses:
 *       200:
 *         description: Tasa de éxito de pagos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 *       400:
 *         description: Error en los parámetros de entrada
 */
router.get('/pagos/exitosos', newMetricsController.getPagosExitosos.bind(newMetricsController));

/**
 * @swagger
 * /api/metrica/pagos/distribucion:
 *   get:
 *     summary: Distribución de pagos por estado
 *     description: Obtiene la distribución de pagos por estado (APROBADO, RECHAZADO, EXPIRADO, PENDIENTE)
 *     tags: [Nuevas Métricas]
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *         description: Período de tiempo a analizar
 *         example: "ultimos_7_dias"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (solo para período personalizado)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (solo para período personalizado)
 *     responses:
 *       200:
 *         description: Distribución de pagos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PieMetricResponse'
 *       400:
 *         description: Error en los parámetros de entrada
 */
router.get('/pagos/distribucion', newMetricsController.getPagosDistribucion.bind(newMetricsController));

/**
 * @swagger
 * /api/metrica/pagos/tiempoProcesamiento:
 *   get:
 *     summary: Tiempo promedio de procesamiento de pagos
 *     description: Obtiene el tiempo promedio de procesamiento de pagos en minutos
 *     tags: [Nuevas Métricas]
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *         description: Período de tiempo a analizar
 *         example: "ultimos_7_dias"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (solo para período personalizado)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (solo para período personalizado)
 *     responses:
 *       200:
 *         description: Tiempo promedio de procesamiento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 *       400:
 *         description: Error en los parámetros de entrada
 */
router.get('/pagos/tiempoProcesamiento', newMetricsController.getPagosTiempoProcesamiento.bind(newMetricsController));

export default router;
