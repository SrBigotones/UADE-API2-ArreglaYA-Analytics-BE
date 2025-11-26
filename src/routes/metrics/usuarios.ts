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
 * /api/metrica/usuarios/nuevas-bajas:
 *   get:
 *     summary: Nuevas bajas de usuarios
 *     description: Retorna el número de usuarios que se dieron de baja en el período especificado
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
 *         description: Nuevas bajas de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricSuccessResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/nuevas-bajas', controller.getNuevasBajas.bind(controller));

/**
 * @swagger
 * /api/metrica/usuarios/tasa-roles-activos:
 *   get:
 *     summary: Tasa de roles inactivos (%)
 *     description: Retorna el porcentaje de usuarios inactivos sobre el total de usuarios y su distribución por rol
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
 *         description: Tasa de roles inactivos y distribución
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
 *                     tasaInactivos:
 *                       $ref: '#/components/schemas/CardMetricResponse'
 *                     distribucionPorRol:
 *                       $ref: '#/components/schemas/PieMetricResponse'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/tasa-roles-activos', controller.getTasaRolesActivos.bind(controller));

/**
 * @swagger
 * /api/metrica/usuarios/distribucion-por-rol:
 *   get:
 *     summary: Distribución por rol histórico
 *     description: Retorna la distribución de usuarios por rol sin filtro de periodo (histórico)
 *     tags: [Métricas - Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribución por rol histórico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PieMetricResponse'
 *       401:
 *         description: No autorizado
 */
router.get('/distribucion-por-rol', controller.getDistribucionPorRol.bind(controller));

/**
 * @swagger
 * /api/metrica/usuarios/totales:
 *   get:
 *     summary: Usuarios totales (histórico)
 *     description: Retorna el total de usuarios sin filtro de periodo (histórico)
 *     tags: [Métricas - Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total de usuarios histórico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CardMetricResponse'
 *       401:
 *         description: No autorizado
 */
router.get('/totales', controller.getUsuariosTotales.bind(controller));

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
