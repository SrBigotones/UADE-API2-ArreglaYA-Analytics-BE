import { Router } from 'express';
import { CatalogoController } from '../../controllers/metrics/CatalogoController';

const router = Router();
const catalogoController = new CatalogoController();

// ========== 📋 CATÁLOGO DE SERVICIOS Y PRESTADORES ==========

/**
 * @swagger
 * /api/metrica/prestadores/nuevos-registrados:
 *   get:
 *     summary: Nuevos prestadores registrados
 *     description: Obtiene el número de nuevos prestadores que se registraron en el período
 *     tags: [📋 Catálogo de Servicios]
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
 *         description: Número de prestadores nuevos obtenido exitosamente
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
router.get('/prestadores/nuevos-registrados', catalogoController.getNuevosPrestadoresRegistrados.bind(catalogoController));

/**
 * @swagger
 * /api/metrica/prestadores/total-activos:
 *   get:
 *     summary: Total de prestadores activos
 *     description: Obtiene el número total de prestadores activos en la plataforma
 *     tags: [📋 Catálogo de Servicios]
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
 *         description: Total de prestadores activos obtenido exitosamente
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
router.get('/prestadores/total-activos', catalogoController.getTotalPrestadoresActivos.bind(catalogoController));

/**
 * @swagger
 * /api/metrica/prestadores/win-rate-rubro:
 *   get:
 *     summary: Win Rate por rubro (%)
 *     description: Obtiene el porcentaje de cotizaciones ganadas (aceptadas) por rubro
 *     tags: [📋 Catálogo de Servicios]
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
 *         description: Win rate obtenido exitosamente
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
router.get('/prestadores/win-rate-rubro', catalogoController.getWinRatePorRubro.bind(catalogoController));

/**
 * @swagger
 * /api/metrica/solicitudes/mapa-calor:
 *   get:
 *     summary: Mapa de calor de pedidos
 *     description: Obtiene la distribución geográfica de las solicitudes
 *     tags: [📋 Catálogo de Servicios]
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
 *         description: Mapa de calor obtenido exitosamente
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
 *                           intensity:
 *                             type: number
 *                     totalPoints:
 *                       type: integer
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 */
router.get('/solicitudes/mapa-calor', catalogoController.getMapaCalorPedidos.bind(catalogoController));

/**
 * @swagger
 * /api/metrica/servicios/distribucion:
 *   get:
 *     summary: Distribución de servicios
 *     description: Obtiene la distribución de servicios solicitados por tipo
 *     tags: [📋 Catálogo de Servicios]
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
 *         description: Distribución de servicios obtenida exitosamente
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
router.get('/servicios/distribucion', catalogoController.getDistribucionServicios.bind(catalogoController));

export default router;

