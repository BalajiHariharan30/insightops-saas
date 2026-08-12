import { Request, Response, NextFunction } from 'express';
import { stripe, PLANS } from '../../infrastructure/stripe/stripe.client';
import { config } from '../../config';

// POST /api/v1/billing/checkout
// Creates a Stripe Checkout Session and returns the URL
export async function createCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { plan } = req.body;
    const userId = req.user!.id;
    const userEmail = (req.user as any).email;

    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) {
      return res.status(400).json({ success: false, error: { message: 'Invalid plan selected' } });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      metadata: { userId: userId.toString(), plan },
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `InsightOps ${planConfig.name}`,
              description: planConfig.description,
              images: [],
            },
            unit_amount: planConfig.priceINR,
            recurring: { interval: planConfig.interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${config.FRONTEND_URL}/billing?success=true&plan=${plan}`,
      cancel_url: `${config.FRONTEND_URL}/billing?cancelled=true`,
      billing_address_collection: 'auto',
    });

    return res.status(200).json({
      success: true,
      data: { checkoutUrl: session.url, sessionId: session.id },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/v1/billing/status
// Returns the current user's billing/subscription status
export async function getBillingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userEmail = (req.user as any).email;

    // Find customers by email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      return res.status(200).json({
        success: true,
        data: { status: 'FREE', plan: null, currentPeriodEnd: null },
      });
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(200).json({
        success: true,
        data: { status: 'FREE', plan: null, currentPeriodEnd: null },
      });
    }

    const sub = subscriptions.data[0] as any;
    return res.status(200).json({
      success: true,
      data: {
        status: 'ACTIVE',
        plan: sub.metadata?.plan || 'UNKNOWN',
        subscriptionId: sub.id,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/v1/billing/portal
// Creates a Stripe Customer Portal session for managing subscription
export async function createPortalSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userEmail = (req.user as any).email;

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'No billing account found' } });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${config.FRONTEND_URL}/billing`,
    });

    return res.status(200).json({ success: true, data: { portalUrl: session.url } });
  } catch (error) {
    return next(error);
  }
}

// POST /api/v1/billing/webhook
// Handles Stripe webhook events
export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;
  try {
    if (webhookSecret && webhookSecret !== 'whsec_placeholder' && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('✅ Stripe: Checkout completed', event.data.object.id);
      break;
    case 'customer.subscription.deleted':
      console.log('⚠️ Stripe: Subscription cancelled', event.data.object.id);
      break;
    case 'invoice.payment_failed':
      console.log('❌ Stripe: Payment failed', event.data.object.id);
      break;
  }

  return res.status(200).json({ received: true });
}
