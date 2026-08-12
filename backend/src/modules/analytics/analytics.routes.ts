import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';

const router = Router();

// Secure all endpoints under tenancy context
router.use(authenticate);
router.use(requireRole(['ADMIN', 'STAFF']));

router.get('/summary', analyticsController.getSummary);
router.get('/expenses-by-category', analyticsController.getCategoryExpenses);
router.get('/inventory-valuation', analyticsController.getValuation);

export default router;
