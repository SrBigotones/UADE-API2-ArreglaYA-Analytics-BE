import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { webhookValidation } from '../middleware/validation';

const router = Router();
const webhookController = new WebhookController();

// Webhook endpoint for receiving events from Core Hub
router.post('/', webhookValidation, webhookController.handleWebhook.bind(webhookController));

// Get events with filtering and pagination
router.get('/', webhookController.getEvents.bind(webhookController));

export default router;
