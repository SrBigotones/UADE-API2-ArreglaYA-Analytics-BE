import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';

const router = Router();
const metricsController = new MetricsController();

// Get all metrics
router.get('/', metricsController.getAllMetrics.bind(metricsController));

// Get specific metric by name
router.get('/:name', metricsController.getMetricByName.bind(metricsController));

// Get user metrics
router.get('/users/summary', metricsController.getUserMetrics.bind(metricsController));

// Get service metrics
router.get('/services/summary', metricsController.getServiceMetrics.bind(metricsController));

// Get request metrics
router.get('/requests/summary', metricsController.getRequestMetrics.bind(metricsController));

// Get payment metrics
router.get('/payments/summary', metricsController.getPaymentMetrics.bind(metricsController));

// Get provider metrics
router.get('/providers/summary', metricsController.getProviderMetrics.bind(metricsController));

export default router;
