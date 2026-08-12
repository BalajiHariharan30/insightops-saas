import { Router } from 'express';
import * as orgController from './organization.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validation';
import * as orgValidation from './organization.validation';

const router = Router();

// Global organization routes (Requires authenticating the user)
router.post(
  '/',
  authenticate,
  validate(orgValidation.createOrgSchema),
  orgController.createOrg
);

router.get(
  '/',
  authenticate,
  orgController.listUserOrgs
);

// Tenancy organization routes (Requires active membership in current context organization)
router.get(
  '/members',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  orgController.listMembers
);

router.get(
  '/audit-logs',
  authenticate,
  requireRole(['ADMIN']),
  orgController.listAuditLogs
);

router.post(
  '/members',
  authenticate,
  requireRole(['ADMIN']),
  validate(orgValidation.inviteMemberSchema),
  orgController.invite
);

router.put(
  '/members/:memberId',
  authenticate,
  requireRole(['ADMIN']),
  validate(orgValidation.updateMemberRoleSchema),
  orgController.updateRole
);

router.delete(
  '/members/:memberId',
  authenticate,
  requireRole(['ADMIN']),
  validate(orgValidation.removeMemberSchema),
  orgController.remove
);

export default router;
