import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';

// Importar routers por squad
import solicitudesMetrics from './metrics/solicitudesMetrics';
import pagosMetrics from './metrics/pagosMetrics';
import usuariosMetrics from './metrics/usuariosMetrics';
import matchingMetrics from './metrics/matchingMetrics';
import catalogoMetrics from './metrics/catalogoMetrics';
import legacyMetrics from './metrics/legacyMetrics';

const router = Router();

// Proteger TODAS las rutas de métricas - solo usuarios ADMIN autenticados
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     CardMetricResponse:
 *       type: object
 *       properties:
 *         value:
 *           type: number
 *           description: Valor actual de la métrica
 *         change:
 *           type: number
 *           description: Cambio respecto al período anterior
 *         changeType:
 *           type: string
 *           enum: [porcentaje, absoluto]
 *           description: Tipo de cambio
 *         changeStatus:
 *           type: string
 *           enum: [positivo, negativo]
 *           description: Estado del cambio
 *         chartData:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               value:
 *                 type: number
 *     PieMetricResponse:
 *       type: object
 *       additionalProperties:
 *         type: number
 *       description: Distribución de valores por categoría
 */

// Montar routers por squad
router.use('/', solicitudesMetrics);  // 📱 Búsqueda y Solicitudes
router.use('/', pagosMetrics);        // 💳 Pagos y Facturación
router.use('/', usuariosMetrics);     // 👥 Usuarios y Roles
router.use('/', matchingMetrics);     // 🔄 Matching y Agenda
router.use('/', catalogoMetrics);     // 📋 Catálogo de Servicios
router.use('/', legacyMetrics);       // Legacy endpoints

export default router;
