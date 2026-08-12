import { Router } from 'express';
import * as inventoryController from './inventory.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validation';
import * as inventoryValidation from './inventory.validation';

const router = Router();

// Secure all routes in this namespace under tenant authentication
router.use(authenticate);

router.post(
  '/',
  requireRole(['ADMIN']), // Only admins can create new items
  validate(inventoryValidation.createItemSchema),
  inventoryController.createItem
);

router.get(
  '/',
  requireRole(['ADMIN', 'STAFF']),
  inventoryController.listItems
);

router.get(
  '/transactions',
  requireRole(['ADMIN', 'STAFF']),
  inventoryController.getTransactions
);

router.get(
  '/:itemId',
  requireRole(['ADMIN', 'STAFF']),
  inventoryController.getItem
);

router.put(
  '/:itemId',
  requireRole(['ADMIN']), // Only admins can edit details
  validate(inventoryValidation.updateItemSchema),
  inventoryController.updateItem
);

router.post(
  '/:itemId/adjust',
  requireRole(['ADMIN', 'STAFF']), // staff can adjust inventory levels
  validate(inventoryValidation.adjustStockSchema),
  inventoryController.adjustItemStock
);

export default router;
