import { Router } from 'express';
import * as expenseController from './expense.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validation';
import * as expenseValidation from './expense.validation';

const router = Router();

// Secure all endpoints under organization tenancy context
router.use(authenticate);

router.post(
  '/',
  requireRole(['ADMIN', 'STAFF']), // Both roles can submit expenses
  validate(expenseValidation.createExpenseSchema),
  expenseController.create
);

router.get(
  '/',
  requireRole(['ADMIN', 'STAFF']),
  validate(expenseValidation.getExpensesQuerySchema),
  expenseController.list
);

router.get(
  '/:expenseId',
  requireRole(['ADMIN', 'STAFF']),
  expenseController.get
);

router.put(
  '/:expenseId',
  requireRole(['ADMIN', 'STAFF']), // controller enforces that only ADMIN can change status
  validate(expenseValidation.updateExpenseSchema),
  expenseController.update
);

router.delete(
  '/:expenseId',
  requireRole(['ADMIN']), // Only admins can delete expenses
  expenseController.remove
);

export default router;
