import { Router } from 'express';
import * as billingController from './billing.controller';
import { authenticate } from '../../middleware/auth.middleware';
import express from 'express';

const router = Router();

// Webhook must use raw body — register BEFORE express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

// All other billing routes require authentication
router.get('/status', authenticate, billingController.getBillingStatus);
router.post('/checkout', authenticate, billingController.createCheckoutSession);
router.post('/portal', authenticate, billingController.createPortalSession);

export default router;
