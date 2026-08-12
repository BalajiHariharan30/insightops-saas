import { Router } from 'express';
import * as scheduleController from './schedule.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validation';
import * as scheduleValidation from './schedule.validation';

const router = Router();

// Secure all endpoints under tenancy check
router.use(authenticate);

router.post(
  '/',
  requireRole(['ADMIN']), // Only admins can create shifts
  validate(scheduleValidation.createScheduleSchema),
  scheduleController.create
);

router.get(
  '/',
  requireRole(['ADMIN', 'STAFF']),
  validate(scheduleValidation.getSchedulesQuerySchema),
  scheduleController.list
);

router.post(
  '/availability',
  requireRole(['ADMIN', 'STAFF']), // Employees can configure availability
  validate(scheduleValidation.setAvailabilitySchema),
  scheduleController.updateAvailability
);

router.get(
  '/availability/:userId',
  requireRole(['ADMIN', 'STAFF']),
  scheduleController.getAvailability
);

router.get(
  '/:scheduleId',
  requireRole(['ADMIN', 'STAFF']),
  scheduleController.get
);

router.put(
  '/:scheduleId',
  requireRole(['ADMIN']), // Only admins can modify shifts
  validate(scheduleValidation.updateScheduleSchema),
  scheduleController.update
);

router.delete(
  '/:scheduleId',
  requireRole(['ADMIN']), // Only admins can delete shifts
  scheduleController.remove
);

export default router;
