import { Router } from 'express';
import * as askController from './ask.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  askController.ask
);

export default router;
