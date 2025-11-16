import { Router } from 'express';
import { CatalogoController } from '../controllers/CatalogoController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const catalogoController = new CatalogoController();

/**
 * @swagger
 * /api/catalogo/rubros:
 *   get:
 *     summary: Obtener lista de rubros
 *     description: Retorna la lista completa de rubros/categorías disponibles ordenados alfabéticamente
 *     tags: [Catalogo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de rubros obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 48
 *                       nombre:
 *                         type: string
 *                         example: "Sistemas"
 *                 total:
 *                   type: integer
 *                   example: 15
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/rubros', authenticateToken, catalogoController.getRubros.bind(catalogoController));

/**
 * @swagger
 * /api/catalogo/zonas:
 *   get:
 *     summary: Obtener lista de zonas
 *     description: Retorna la lista de zonas únicas (DISTINCT) extraídas de la tabla de relación prestador-zona, ordenadas alfabéticamente. Solo incluye zonas activas.
 *     tags: [Catalogo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de zonas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 64
 *                       nombre:
 *                         type: string
 *                         example: "Agronomía"
 *                 total:
 *                   type: integer
 *                   example: 25
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/zonas', authenticateToken, catalogoController.getZonas.bind(catalogoController));

export default router;

