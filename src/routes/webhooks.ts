import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { authenticateToken } from '../middleware/authMiddleware';
import { verifyWebhookSignature } from '../middleware/webhookAuth';

const router = Router();
const webhookController = new WebhookController();

/**
 * @swagger
 * /api/webhooks/core-hub:
 *   post:
 *     summary: Recibir eventos del Core Hub
 *     description: Endpoint específico para recibir eventos del sistema Core Hub
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId:
 *                 type: string
 *                 format: uuid
 *               destination:
 *                 type: object
 *                 properties:
 *                   channel:
 *                     type: string
 *                   routingKey:
 *                     type: string
 *               payload:
 *                 type: object
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Evento del Core Hub procesado exitosamente
 *       401:
 *         description: Firma de webhook inválida
 *       500:
 *         description: Error interno del servidor
 */
// POST de Core Hub debe ser PÚBLICO (para recibir eventos externos)
// La validación de firma está deshabilitada por defecto (ver webhookAuth middleware)
router.post('/core-hub', verifyWebhookSignature, webhookController.handleCoreHubWebhook.bind(webhookController));

/**
 * @swagger
 * /api/webhooks/subscription-status:
 *   get:
 *     summary: Estado de las suscripciones
 *     description: Obtiene el estado actual de las suscripciones al Core Hub
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de las suscripciones
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
 *                     initialized:
 *                       type: boolean
 *                     subscriptionCount:
 *                       type: integer
 *                     activeSubscriptions:
 *                       type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: No autenticado
 */
router.get('/subscription-status', authenticateToken, webhookController.getSubscriptionStatus.bind(webhookController));

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: Obtener eventos
 *     description: Obtiene una lista de eventos con filtros y paginación
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de elementos por página
 *       - in: query
 *         name: squad
 *         schema:
 *           type: string
 *         description: Filtrar por squad
 *         example: "Usuarios y Roles"
 *       - in: query
 *         name: topico
 *         schema:
 *           type: string
 *         description: Filtrar por tópico
 *         example: "User Management"
 *       - in: query
 *         name: evento
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de evento
 *         example: "Usuario Creado"
 *       - in: query
 *         name: processed
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado de procesamiento
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filtrar por fuente del evento
 *         example: "core-hub"
 *       - in: query
 *         name: messageId
 *         schema:
 *           type: string
 *         description: Filtrar por ID de mensaje del Core Hub
 *       - in: query
 *         name: correlationId
 *         schema:
 *           type: string
 *         description: Filtrar por ID de correlación
 *     responses:
 *       200:
 *         description: Lista de eventos
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
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     pages:
 *                       type: integer
 *                       example: 15
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticateToken, webhookController.getEvents.bind(webhookController));

export default router;
