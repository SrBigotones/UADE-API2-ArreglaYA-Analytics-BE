import { Router } from 'express';
import { SolicitudesController } from '../../controllers/metrics/SolicitudesController';

const router = Router();
const solicitudesController = new SolicitudesController();

// ========== 📱 APP DE BÚSQUEDA Y SOLICITUDES ==========

/**
 * @swagger
 * /api/metrica/solicitudes/volumen:
 *   get:
 *     summary: Volumen de demanda (N° de solicitudes creadas)
 *     description: Obtiene el número de solicitudes creadas en el período especificado
 *     tags: [📱 Búsqueda y Solicitudes]
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
 *         description: Fecha de inicio (requerido si period=personalizado)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (requerido si period=personalizado)
 *     responses:
 *       200:
 *         description: Volumen de demanda obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 *       400:
 *         description: Error en parámetros
 *       401:
 *         description: No autenticado
 */
router.get('/solicitudes/volumen', solicitudesController.getVolumenDemanda.bind(solicitudesController));

/**
 * @swagger
 * /api/metrica/solicitudes/tasa-cancelacion:
 *   get:
 *     summary: Tasa de cancelación de solicitudes (%)
 *     description: Obtiene el porcentaje de solicitudes canceladas respecto al total
 *     tags: [📱 Búsqueda y Solicitudes]
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
 *         description: Tasa de cancelación obtenida exitosamente
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
router.get('/solicitudes/tasa-cancelacion', solicitudesController.getTasaCancelacionSolicitudes.bind(solicitudesController));

/**
 * @swagger
 * /api/metrica/solicitudes/tiempo-primera-cotizacion:
 *   get:
 *     summary: Tiempo a primera cotización (horas)
 *     description: Obtiene el tiempo promedio hasta recibir la primera cotización
 *     tags: [📱 Búsqueda y Solicitudes]
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
router.get('/solicitudes/tiempo-primera-cotizacion', solicitudesController.getTiempoPrimeraCotizacion.bind(solicitudesController));

/**
 * @swagger
 * /api/metrica/cotizaciones/conversion-aceptada:
 *   get:
 *     summary: Conversión a cotización aceptada (%)
 *     description: Obtiene el porcentaje de cotizaciones aceptadas respecto al total
 *     tags: [📱 Búsqueda y Solicitudes]
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
 *         description: Tasa de conversión obtenida exitosamente
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
router.get('/cotizaciones/conversion-aceptada', solicitudesController.getConversionCotizacionAceptada.bind(solicitudesController));

export default router;

