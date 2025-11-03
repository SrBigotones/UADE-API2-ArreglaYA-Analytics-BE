import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const metricsController = new MetricsController();

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
 *         change:
 *           type: number
 *         changeType:
 *           type: string
 *           enum: [porcentaje, absoluto]
 *         changeStatus:
 *           type: string
 *           enum: [positivo, negativo]
 *     PieMetricResponse:
 *       type: object
 *       additionalProperties:
 *         type: number
 */

// ========== 📱 APP DE BÚSQUEDA Y SOLICITUDES ==========

router.get('/solicitudes/volumen', metricsController.getVolumenDemanda.bind(metricsController));
router.get('/solicitudes/tasa-cancelacion', metricsController.getTasaCancelacionSolicitudes.bind(metricsController));
router.get('/solicitudes/tiempo-primera-cotizacion', metricsController.getTiempoPrimeraCotizacion.bind(metricsController));
router.get('/cotizaciones/conversion-aceptada', metricsController.getConversionCotizacionAceptada.bind(metricsController));

// ========== 💳 PAGOS Y FACTURACIÓN ==========

router.get('/pagos/tasa-exito', metricsController.getTasaExitoPagos.bind(metricsController));
router.get('/pagos/distribucion-metodos', metricsController.getDistribucionMetodosPago.bind(metricsController));
router.get('/pagos/distribucion-eventos', metricsController.getDistribucionEventosPago.bind(metricsController));
router.get('/pagos/tiempo-procesamiento', metricsController.getTiempoProcesamientoPagos.bind(metricsController));
router.get('/pagos/ingreso-ticket', metricsController.getIngresoTicket.bind(metricsController));

// ========== 👥 USUARIOS Y ROLES ==========

router.get('/usuarios/nuevos-clientes', metricsController.getNuevosClientes.bind(metricsController));
router.get('/usuarios/nuevos-prestadores', metricsController.getNuevosPrestadoresUsuarios.bind(metricsController));
router.get('/usuarios/nuevos-administradores', metricsController.getNuevosAdministradores.bind(metricsController));
router.get('/usuarios/tasa-roles-activos', metricsController.getTasaRolesActivos.bind(metricsController));

// ========== 🔄 MATCHING Y AGENDA ==========

router.get('/matching/tiempo-promedio', metricsController.getTiempoPromedioMatching.bind(metricsController));
router.get('/cotizaciones/pendientes', metricsController.getCotizacionesPendientes.bind(metricsController));
router.get('/prestadores/tiempo-respuesta', metricsController.getTiempoRespuestaPrestador.bind(metricsController));
router.get('/cotizaciones/tasa-expiracion', metricsController.getTasaCotizacionesExpiradas.bind(metricsController));

// ========== ENDPOINTS LEGACY (compatibilidad) ==========

router.get('/usuarios/creados', metricsController.getUsuariosCreados.bind(metricsController));
router.get('/prestadores/registrados', metricsController.getPrestadoresRegistrados.bind(metricsController));
router.get('/pagos/exitosos', metricsController.getPagosExitosos.bind(metricsController));
router.get('/pagos/tiempoProcesamiento', metricsController.getPagosTiempoProcesamiento.bind(metricsController));
router.get('/matching/conversion', metricsController.getMatchingConversion.bind(metricsController));
router.get('/matching/lead-time', metricsController.getMatchingLeadTime.bind(metricsController));
router.get('/pedidos/mapa-calor', metricsController.getPedidosMapaCalor.bind(metricsController));
router.get('/prestadores/zonas', metricsController.getPrestadoresZonas.bind(metricsController));

// ========== 📋 CATÁLOGO DE SERVICIOS Y PRESTADORES ==========

router.get('/prestadores/nuevos-registrados', metricsController.getNuevosPrestadoresRegistrados.bind(metricsController));
router.get('/prestadores/total-activos', metricsController.getTotalPrestadoresActivos.bind(metricsController));
router.get('/prestadores/win-rate-rubro', metricsController.getWinRatePorRubro.bind(metricsController));
router.get('/solicitudes/mapa-calor', metricsController.getMapaCalorPedidos.bind(metricsController));
router.get('/servicios/distribucion', metricsController.getDistribucionServicios.bind(metricsController));

export default router;
