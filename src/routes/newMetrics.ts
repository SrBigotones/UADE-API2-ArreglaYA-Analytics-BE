import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';

const router = Router();
const newMetricsController = new MetricsController();

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

/**
 * @swagger
 * /api/metrica/pedidos/mapa-calor:
 *   get:
 *     summary: Mapa de calor de pedidos por ubicación
 *     description: Obtiene datos de mapa de calor para visualizar la distribución geográfica de pedidos
 *     tags: [Mapas de Calor]
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
 *         description: Datos del mapa de calor de pedidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                             description: Latitud
 *                             example: -34.6037
 *                           lon:
 *                             type: number
 *                             description: Longitud
 *                             example: -58.3816
 *                           intensity:
 *                             type: number
 *                             description: Intensidad del punto de calor
 *                             example: 15
 *                     totalPoints:
 *                       type: number
 *                       description: Total de puntos en el mapa
 *                       example: 25
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Error en los parámetros de entrada
 */
router.get('/pedidos/mapa-calor', newMetricsController.getPedidosMapaCalor.bind(newMetricsController));

/**
 * @swagger
 * /api/metrica/prestadores/zonas:
 *   get:
 *     summary: Tipos de prestadores por zonas geográficas
 *     description: Obtiene la distribución de tipos de prestadores por ubicación geográfica
 *     tags: [Mapas de Calor]
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
 *         description: Datos de tipos de prestadores por zonas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                             description: Latitud
 *                             example: -34.6037
 *                           lon:
 *                             type: number
 *                             description: Longitud
 *                             example: -58.3816
 *                           providerType:
 *                             type: string
 *                             description: Tipo de prestador
 *                             example: "plomero"
 *                           count:
 *                             type: number
 *                             description: Cantidad de prestadores de este tipo en la zona
 *                             example: 5
 *                           zoneName:
 *                             type: string
 *                             description: Nombre de la zona geográfica
 *                             example: "Buenos Aires"
 *                     totalProviders:
 *                       type: number
 *                       description: Total de prestadores
 *                       example: 150
 *                     providerTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Lista de tipos de prestadores únicos
 *                       example: ["plomero", "electricista", "carpintero"]
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Error en los parámetros de entrada
 */
router.get('/prestadores/zonas', newMetricsController.getPrestadoresZonas.bind(newMetricsController));

/**
 * @swagger
 * /api/metrica/matching/conversion:
 *   get:
 *     summary: Tasa de conversión de Matching a Cotización Aceptada
 *     description: Porcentaje de cotizaciones emitidas que terminaron en una cotización aceptada
 *     tags: [Matching]
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
 *         description: Tasa de conversión de matching
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
router.get('/matching/conversion', newMetricsController.getMatchingConversion.bind(newMetricsController));

/**
 * @swagger
 * /api/metrica/matching/lead-time:
 *   get:
 *     summary: Tiempo promedio de Matching a Cotización
 *     description: Minutos promedio desde la solicitud creada hasta la primera cotización emitida
 *     tags: [Matching]
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
 *         description: Lead time de matching a cotización
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
router.get('/matching/lead-time', newMetricsController.getMatchingLeadTime.bind(newMetricsController));

export default router;
