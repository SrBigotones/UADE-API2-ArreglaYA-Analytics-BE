import { Router } from 'express';
import { UsuariosMetricsController } from '../../controllers/metrics/usuarios/UsuariosMetricsController';

const router = Router();
const controller = new UsuariosMetricsController();

/**
 * @swagger
 * tags:
 *   name: Métricas - Usuarios
 *   description: Endpoints de métricas relacionadas con usuarios y roles
 */

/**
 * @swagger
 * /api/metrica/usuarios/nuevos-clientes:
 *   get:
 *     summary: Nuevos clientes registrados
 *     description: Retorna el número de nuevos usuarios con rol 'customer' registrados en el período especificado
 *     tags: [Métricas - Usuarios]
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
 *       - in: query
 *         name: zona
 *         schema:
 *           type: string
 *         description: Filtrar por zona (opcional)
 *     responses:
 *       200:
 *         description: Nuevos clientes registrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/nuevos-clientes', controller.getNuevosClientes.bind(controller));

/**
 * @swagger
 * /api/metrica/usuarios/nuevos-prestadores:
 *   get:
 *     summary: Nuevos prestadores registrados
 *     description: Retorna el número de nuevos usuarios con rol 'prestador' registrados en el período especificado
 *     tags: [Métricas - Usuarios]
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
 *       - in: query
 *         name: zona
 *         schema:
 *           type: string
 *         description: Filtrar por zona (opcional)
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
router.get('/nuevos-prestadores', controller.getNuevosPrestadoresUsuarios.bind(controller));

/**
 * @swagger
 * /api/metrica/usuarios/nuevos-administradores:
 *   get:
 *     summary: Nuevos administradores registrados
 *     description: Retorna el número de nuevos usuarios con rol 'admin' registrados en el período especificado
 *     tags: [Métricas - Usuarios]
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
 *       - in: query
 *         name: zona
 *         schema:
 *           type: string
 *         description: Filtrar por zona (opcional)
 *     responses:
 *       200:
 *         description: Nuevos administradores registrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/nuevos-administradores', controller.getNuevosAdministradores.bind(controller));

/**
 * @swagger
 * /api/metrica/usuarios/tasa-roles-activos:
 *   get:
 *     summary: Tasa de roles activos (%)
 *     description: Retorna el porcentaje de usuarios activos sobre el total de usuarios y su distribución por rol
 *     tags: [Métricas - Usuarios]
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
 *         description: Tasa de roles activos y distribución
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
 *                     tasaActivos:
 *                       $ref: '#/components/schemas/CardMetricResponse'
 *                     distribucionPorRol:
 *                       $ref: '#/components/schemas/PieMetricResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/tasa-roles-activos', controller.getTasaRolesActivos.bind(controller));

// Rutas legacy
/**
 * @swagger
 * /api/metrica/usuarios/creados:
 *   get:
 *     summary: Usuarios creados (legacy)
 *     description: Endpoint legacy - usar /api/metrica/usuarios/nuevos-clientes en su lugar
 *     tags: [Métricas - Usuarios]
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
 *         description: Nuevos clientes registrados
 */
router.get('/creados', controller.getUsuariosCreados.bind(controller));

export default router;
