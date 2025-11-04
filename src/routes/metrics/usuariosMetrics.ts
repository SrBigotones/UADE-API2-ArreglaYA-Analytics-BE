import { Router } from 'express';
import { UsuariosController } from '../../controllers/metrics/UsuariosController';

const router = Router();
const usuariosController = new UsuariosController();

// ========== 👥 USUARIOS Y ROLES ==========

/**
 * @swagger
 * /api/metrica/usuarios/nuevos-clientes:
 *   get:
 *     summary: Nuevos clientes registrados
 *     description: Obtiene el número de nuevos clientes registrados en el período
 *     tags: [👥 Usuarios y Roles]
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
 *         description: Número de nuevos clientes obtenido exitosamente
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
router.get('/usuarios/nuevos-clientes', usuariosController.getNuevosClientes.bind(usuariosController));

/**
 * @swagger
 * /api/metrica/usuarios/nuevos-prestadores:
 *   get:
 *     summary: Nuevos prestadores registrados
 *     description: Obtiene el número de nuevos prestadores registrados en el período
 *     tags: [👥 Usuarios y Roles]
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
 *         description: Número de nuevos prestadores obtenido exitosamente
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
router.get('/usuarios/nuevos-prestadores', usuariosController.getNuevosPrestadoresUsuarios.bind(usuariosController));

/**
 * @swagger
 * /api/metrica/usuarios/nuevos-administradores:
 *   get:
 *     summary: Nuevos administradores registrados
 *     description: Obtiene el número de nuevos administradores registrados en el período
 *     tags: [👥 Usuarios y Roles]
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
 *         description: Número de nuevos administradores obtenido exitosamente
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
router.get('/usuarios/nuevos-administradores', usuariosController.getNuevosAdministradores.bind(usuariosController));

/**
 * @swagger
 * /api/metrica/usuarios/tasa-roles-activos:
 *   get:
 *     summary: Tasa de roles activos (%)
 *     description: Obtiene el porcentaje de usuarios activos y su distribución por rol
 *     tags: [👥 Usuarios y Roles]
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
 *         description: Tasa de roles activos y distribución obtenidos exitosamente
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
 */
router.get('/usuarios/tasa-roles-activos', usuariosController.getTasaRolesActivos.bind(usuariosController));

export default router;

