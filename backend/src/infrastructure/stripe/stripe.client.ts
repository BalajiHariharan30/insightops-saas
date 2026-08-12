import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-07-29.dahlia' as any,
});

// Plan definitions for InsightOps India
export const PLANS = {
  STARTER: {
    name: 'Starter',
    priceINR: 99900, // ₹999 in paise
    description: 'Perfect for small teams',
    features: ['1 Organization', '5 Team Members', 'Inventory Management', 'Expense Tracking', 'Basic Reports'],
    interval: 'month' as const,
  },
  PROFESSIONAL: {
    name: 'Professional',
    priceINR: 299900, // ₹2,999 in paise
    description: 'For growing businesses',
    features: ['3 Organizations', '25 Team Members', 'All Starter Features', 'AI Assistant', 'AI Reports', 'Priority Support'],
    interval: 'month' as const,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceINR: 799900, // ₹7,999 in paise
    description: 'Full-scale operations',
    features: ['Unlimited Organizations', 'Unlimited Members', 'All Pro Features', 'GST Filing Assistant', 'Custom Integrations', 'Dedicated Support'],
    interval: 'month' as const,
  },
};
