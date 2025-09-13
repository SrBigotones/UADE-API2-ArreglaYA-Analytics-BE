import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { webhookValidation } from '../middleware/validation';

const router = Router();
const webhookController = new WebhookController();

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Recibir eventos del Core Hub
 *     description: Endpoint para recibir eventos webhooks del sistema principal de ArreglaYA
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookPayload'
 *           example:
 *             queue: "user-events"
 *             event:
 *               squad: "Usuarios y Roles"
 *               topico: "User Management"
 *               evento: "Usuario Creado"
 *               cuerpo:
 *                 userId: "123"
 *                 email: "user@example.com"
 *                 name: "Juan Pérez"
 *     responses:
 *       200:
 *         description: Evento procesado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Event processed successfully"
 *                 eventId:
 *                   type: string
 *                   format: uuid
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', webhookValidation, webhookController.handleWebhook.bind(webhookController));

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
router.post('/core-hub', webhookController.handleCoreHubWebhook.bind(webhookController));

/**
 * @swagger
 * /api/webhooks/subscription-status:
 *   get:
 *     summary: Estado de las suscripciones
 *     description: Obtiene el estado actual de las suscripciones al Core Hub
 *     tags: [Webhooks]
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
 */
router.get('/subscription-status', webhookController.getSubscriptionStatus.bind(webhookController));

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: Obtener eventos
 *     description: Obtiene una lista de eventos con filtros y paginación
 *     tags: [Webhooks]
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
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', webhookController.getEvents.bind(webhookController));

export default router;
