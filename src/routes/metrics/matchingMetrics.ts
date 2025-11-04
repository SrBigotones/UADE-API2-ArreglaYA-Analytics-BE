import { Router } from 'express';
import { MatchingController } from '../../controllers/metrics/MatchingController';

const router = Router();
const matchingController = new MatchingController();

// ========== 🔄 MATCHING Y AGENDA ==========

/**
 * @swagger
 * /api/metrica/matching/tiempo-promedio:
 *   get:
 *     summary: Tiempo promedio de matching
 *     description: Obtiene el tiempo promedio desde la solicitud hasta el matching
 *     tags: [🔄 Matching y Agenda]
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
 *         description: Tiempo promedio de matching obtenido exitosamente
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
router.get('/matching/tiempo-promedio', matchingController.getTiempoPromedioMatching.bind(matchingController));

/**
 * @swagger
 * /api/metrica/cotizaciones/pendientes:
 *   get:
 *     summary: Cotizaciones pendientes
 *     description: Obtiene el número de cotizaciones que están pendientes de respuesta
 *     tags: [🔄 Matching y Agenda]
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
 *         description: Número de cotizaciones pendientes obtenido exitosamente
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
router.get('/cotizaciones/pendientes', matchingController.getCotizacionesPendientes.bind(matchingController));

/**
 * @swagger
 * /api/metrica/prestadores/tiempo-respuesta:
 *   get:
 *     summary: Tiempo promedio de respuesta del prestador
 *     description: Obtiene el tiempo promedio que tarda un prestador en responder
 *     tags: [🔄 Matching y Agenda]
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
 *         description: Tiempo promedio de respuesta obtenido exitosamente
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
router.get('/prestadores/tiempo-respuesta', matchingController.getTiempoRespuestaPrestador.bind(matchingController));

/**
 * @swagger
 * /api/metrica/cotizaciones/tasa-expiracion:
 *   get:
 *     summary: Tasa de cotizaciones expiradas (%)
 *     description: Obtiene el porcentaje de cotizaciones que expiraron sin respuesta
 *     tags: [🔄 Matching y Agenda]
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
 *         description: Tasa de expiración obtenida exitosamente
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
router.get('/cotizaciones/tasa-expiracion', matchingController.getTasaCotizacionesExpiradas.bind(matchingController));

export default router;

