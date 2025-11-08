import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware';
import solicitudesRoutes from './solicitudes';
import pagosRoutes from './pagos';
import usuariosRoutes from './usuarios';
import matchingRoutes from './matching';
import prestadoresRoutes from './prestadores';

const router = Router();

// Proteger TODAS las rutas de métricas - solo usuarios ADMIN autenticados
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   - name: Métricas - Solicitudes
 *     description: Métricas relacionadas con solicitudes y pedidos
 *   - name: Métricas - Pagos
 *     description: Métricas relacionadas con pagos y facturación
 *   - name: Métricas - Usuarios
 *     description: Métricas relacionadas con usuarios y roles
 *   - name: Métricas - Matching
 *     description: Métricas relacionadas con matching y cotizaciones
 *   - name: Métricas - Prestadores
 *     description: Métricas relacionadas con prestadores y servicios
 * 
 * components:
 *   schemas:
 *     CardMetricResponse:
 *       type: object
 *       description: Respuesta estándar de métrica tipo tarjeta con comparación temporal
 *       properties:
 *         value:
 *           type: number
 *           description: Valor actual de la métrica
 *           example: 150
 *         change:
 *           type: number
 *           description: Cambio respecto al período anterior
 *           example: 25
 *         changeType:
 *           type: string
 *           enum: [porcentaje, absoluto]
 *           description: Tipo de cambio (porcentaje o valor absoluto)
 *           example: porcentaje
 *         changeStatus:
 *           type: string
 *           enum: [positivo, negativo]
 *           description: Si el cambio es positivo o negativo
 *           example: positivo
 *         chartData:
 *           type: array
 *           description: Datos históricos para visualización
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 example: "1/11"
 *               value:
 *                 type: number
 *                 example: 125
 *     PieMetricResponse:
 *       type: object
 *       description: Respuesta de métrica tipo distribución/torta
 *       additionalProperties:
 *         type: number
 *       example:
 *         APROBADO: 850
 *         RECHAZADO: 45
 *         PENDIENTE: 105
 */

// Organizar rutas por categoría
router.use('/solicitudes', solicitudesRoutes);
router.use('/pagos', pagosRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/matching', matchingRoutes);
router.use('/prestadores', prestadoresRoutes);

// Ruta legacy de prestadores en usuarios (para mantener compatibilidad)
import { UsuariosMetricsController } from '../../controllers/metrics/usuarios/UsuariosMetricsController';
const usuariosController = new UsuariosMetricsController();
router.get('/prestadores/registrados', usuariosController.getPrestadoresRegistrados.bind(usuariosController));

// Rutas legacy de cotizaciones (mapear a matching)
router.use('/cotizaciones', matchingRoutes);

// Rutas legacy de servicios (mapear a prestadores)
router.use('/servicios', prestadoresRoutes);

// Rutas legacy de pedidos (mapear a solicitudes)
router.use('/pedidos', solicitudesRoutes);

export default router;

