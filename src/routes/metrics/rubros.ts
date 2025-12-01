import { Router } from 'express';
import { RubrosMetricsController } from '../../controllers/metrics/rubros/RubrosMetricsController';

const router = Router();
const controller = new RubrosMetricsController();

/**
 * @swagger
 * tags:
 *   name: Métricas - Rubros
 *   description: Endpoints de métricas relacionadas con categorías/rubros de servicios
 */

/**
 * @swagger
 * /api/metrica/rubros/ingresos-por-categoria:
 *   get:
 *     summary: Ingresos totales por categoría (rubro)
 *     description: Retorna los ingresos totales agrupados por categoría (rubro) para el período seleccionado, con comparación respecto al período anterior y datos históricos para visualización
 *     tags: [Métricas - Rubros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hoy, ultimos_7_dias, ultimos_30_dias, ultimo_ano, personalizado]
 *         description: Período de tiempo a consultar
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
 *       - in: query
 *         name: zona
 *         schema:
 *           type: string
 *         description: Filtrar por zona específica
 *       - in: query
 *         name: metodo
 *         schema:
 *           type: string
 *         description: Filtrar por método de pago específico
 *       - in: query
 *         name: minMonto
 *         schema:
 *           type: number
 *         description: Filtrar por monto mínimo
 *       - in: query
 *         name: maxMonto
 *         schema:
 *           type: number
 *         description: Filtrar por monto máximo
 *     responses:
 *       200:
 *         description: Ingresos por categoría con comparación temporal
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
 *                     total:
 *                       type: object
 *                       properties:
 *                         ingresos_actuales:
 *                           type: number
 *                           description: Total de ingresos en el período actual
 *                           example: 125000.50
 *                         ingresos_anteriores:
 *                           type: number
 *                           description: Total de ingresos en el período anterior
 *                           example: 98500.25
 *                         cambio:
 *                           type: number
 *                           description: Cambio absoluto entre períodos
 *                           example: 26500.25
 *                         cambio_tipo:
 *                           type: string
 *                           enum: [absoluto, porcentaje]
 *                           example: absoluto
 *                         cambio_estado:
 *                           type: string
 *                           enum: [positivo, negativo]
 *                           example: positivo
 *                     categorias:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_rubro:
 *                             type: number
 *                             example: 1
 *                           nombre_rubro:
 *                             type: string
 *                             example: Plomería
 *                           ingresos_actuales:
 *                             type: number
 *                             example: 45000.00
 *                           ingresos_anteriores:
 *                             type: number
 *                             example: 38000.00
 *                           cambio:
 *                             type: number
 *                             example: 7000.00
 *                           cambio_tipo:
 *                             type: string
 *                             enum: [absoluto, porcentaje]
 *                             example: absoluto
 *                           cambio_estado:
 *                             type: string
 *                             enum: [positivo, negativo]
 *                             example: positivo
 *                           datos_historicos:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 date:
 *                                   type: string
 *                                   example: "1/11"
 *                                 value:
 *                                   type: number
 *                                   example: 5200.50
 *                     periodo:
 *                       type: object
 *                       properties:
 *                         tipo:
 *                           type: string
 *                           example: ultimos_30_dias
 *                         fecha_inicio:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-10-27T00:00:00.000Z"
 *                         fecha_fin:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-11-26T23:59:59.999Z"
 *       400:
 *         description: Parámetros inválidos
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
 *                   example: El parámetro period es requerido
 *                 error:
 *                   type: string
 *       401:
 *         description: No autorizado
 */
router.get('/ingresos-por-categoria', controller.getIngresosPorCategoria.bind(controller));

export default router;
