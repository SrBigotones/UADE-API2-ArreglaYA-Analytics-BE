import { Router } from 'express';
import { SolicitudesMetricsController } from '../../controllers/metrics/solicitudes/SolicitudesMetricsController';

const router = Router();
const controller = new SolicitudesMetricsController();

/**
 * @swagger
 * tags:
 *   name: Métricas - Solicitudes
 *   description: Endpoints de métricas relacionadas con solicitudes y pedidos
 */

/**
 * @swagger
 * /api/metrica/solicitudes/volumen:
 *   get:
 *     summary: Volumen de demanda (N° de solicitudes creadas)
 *     description: Retorna el número de solicitudes creadas en el período especificado con comparación del período anterior
 *     tags: [Métricas - Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *         description: Período de tiempo para la métrica
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (requerido si period es 'personalizado')
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (requerido si period es 'personalizado')
 *     responses:
 *       200:
 *         description: Métrica de volumen de demanda
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
 */
router.get('/volumen', controller.getVolumenDemanda.bind(controller));

/**
 * @swagger
 * /api/metrica/solicitudes/tasa-cancelacion:
 *   get:
 *     summary: Tasa de cancelación de solicitudes (%)
 *     description: Retorna el porcentaje de solicitudes canceladas respecto al total de solicitudes creadas
 *     tags: [Métricas - Solicitudes]
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
 *         description: Tasa de cancelación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/tasa-cancelacion', controller.getTasaCancelacionSolicitudes.bind(controller));

/**
 * @swagger
 * /api/metrica/solicitudes/tiempo-primera-cotizacion:
 *   get:
 *     summary: Tiempo promedio a primera cotización (horas)
 *     description: Retorna el tiempo promedio en horas desde que se crea una solicitud hasta que recibe la primera cotización
 *     tags: [Métricas - Solicitudes]
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
 *         description: Tiempo promedio a primera cotización
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/tiempo-primera-cotizacion', controller.getTiempoPrimeraCotizacion.bind(controller));

/**
 * @swagger
 * /api/metrica/solicitudes/mapa-calor:
 *   get:
 *     summary: Mapa de calor de solicitudes
 *     description: Retorna datos geográficos de solicitudes para visualización en mapa de calor
 *     tags: [Métricas - Solicitudes]
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
 *         description: Datos de mapa de calor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/HeatmapResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/mapa-calor', controller.getMapaCalorPedidos.bind(controller));

// Rutas legacy
/**
 * @swagger
 * /api/metrica/solicitudes/pedidos/mapa-calor:
 *   get:
 *     summary: Mapa de calor de pedidos (legacy)
 *     description: Endpoint legacy - usar /api/metrica/solicitudes/mapa-calor en su lugar
 *     tags: [Métricas - Solicitudes]
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
 *         description: Datos de mapa de calor
 */
router.get('/pedidos/mapa-calor', controller.getPedidosMapaCalor.bind(controller));

export default router;

