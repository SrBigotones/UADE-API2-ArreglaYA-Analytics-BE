import { Router } from 'express';
import { FeatureFlagController } from '../controllers/FeatureFlagController';

const router = Router();
const featureFlagController = new FeatureFlagController();

// GET /api/internal/feature-flags - Listar todos los feature flags
router.get('/', featureFlagController.getAllFlags.bind(featureFlagController));

// POST /api/internal/feature-flags/toggle - Toggle de un feature flag
router.post('/toggle', featureFlagController.toggleFlag.bind(featureFlagController));

export default router;

