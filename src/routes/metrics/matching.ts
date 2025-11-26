import { Router } from 'express';
import { MatchingMetricsController } from '../../controllers/metrics/matching/MatchingMetricsController';

const router = Router();
const controller = new MatchingMetricsController();

/**
 * @swagger
 * tags:
 *   name: Métricas - Matching
 *   description: Endpoints de métricas relacionadas con matching y cotizaciones
 */

/**
 * @swagger
 * /api/metrica/matching/tiempo-promedio:
 *   get:
 *     summary: Tiempo promedio de matching
 *     description: Retorna el tiempo promedio que toma hacer el matching entre solicitud y prestador
 *     tags: [Métricas - Matching]
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
 *         description: Tiempo promedio de matching
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/tiempo-promedio', controller.getTiempoPromedioMatching.bind(controller));

/**
 * @swagger
 * /api/metrica/matching/cotizaciones/conversion-aceptada:
 *   get:
 *     summary: Conversión a cotización aceptada (%)
 *     description: Retorna el porcentaje de cotizaciones aceptadas sobre el total de cotizaciones emitidas
 *     tags: [Métricas - Matching]
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
 *         description: Conversión a cotización aceptada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/cotizaciones/conversion-aceptada', controller.getConversionCotizacionAceptada.bind(controller));

/**
 * @swagger
 * /api/metrica/matching/solicitudes/pendientes:
 *   get:
 *     summary: Solicitudes pendientes (sin aceptar ni rechazar)
 *     description: Retorna el número de solicitudes que no han sido aceptadas ni rechazadas
 *     tags: [Métricas - Matching]
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
 *         description: Solicitudes pendientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/solicitudes/pendientes', controller.getSolicitudesPendientes.bind(controller));

// Rutas legacy
/**
 * @swagger
 * /api/metrica/matching/conversion:
 *   get:
 *     summary: Conversión de matching (legacy)
 *     description: Endpoint legacy - usar /api/metrica/matching/cotizaciones/conversion-aceptada en su lugar
 *     tags: [Métricas - Matching]
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
 *         description: Conversión a cotización aceptada
 */
router.get('/conversion', controller.getMatchingConversion.bind(controller));

export default router;
