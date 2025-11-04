import { Router } from 'express';
import { LegacyController } from '../../controllers/metrics/LegacyController';

const router = Router();
const legacyController = new LegacyController();

// ========== ENDPOINTS LEGACY (compatibilidad) ==========
// Estos endpoints se mantienen para compatibilidad con versiones anteriores
// Se recomienda usar los nuevos endpoints organizados por squad

router.get('/usuarios/creados', legacyController.getUsuariosCreados.bind(legacyController));
router.get('/prestadores/registrados', legacyController.getPrestadoresRegistrados.bind(legacyController));
router.get('/pagos/exitosos', legacyController.getPagosExitosos.bind(legacyController));
router.get('/pagos/tiempoProcesamiento', legacyController.getPagosTiempoProcesamiento.bind(legacyController));
router.get('/matching/conversion', legacyController.getMatchingConversion.bind(legacyController));
router.get('/matching/lead-time', legacyController.getMatchingLeadTime.bind(legacyController));
router.get('/pedidos/mapa-calor', legacyController.getPedidosMapaCalor.bind(legacyController));
router.get('/prestadores/zonas', legacyController.getPrestadoresZonas.bind(legacyController));

export default router;

