import { Router } from 'express';
import { exportAuditCsv } from './audit.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// GET /api/v1/audit/export?from=2024-01-01&to=2024-12-31
// Downloads a CSV of all audit log events for the active organization
router.get('/export', authenticate, exportAuditCsv);

export default router;
