import { Router } from 'express';
import * as reportController from './report.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';

const router = Router();

// Secure all endpoints under tenancy context
router.use(authenticate);

router.post(
  '/',
  requireRole(['ADMIN']), // Only admins can trigger report compilation
  reportController.create
);

router.get(
  '/',
  requireRole(['ADMIN', 'STAFF']),
  reportController.list
);

router.get(
  '/:reportId',
  requireRole(['ADMIN', 'STAFF']),
  reportController.get
);

export default router;
