import { Router } from 'express';
import * as alertController from './alert.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';

const router = Router();

// Secure all endpoints under tenancy context
router.use(authenticate);
router.use(requireRole(['ADMIN', 'STAFF']));

router.get('/', alertController.list);
router.put('/:alertId/dismiss', alertController.dismiss);

export default router;
