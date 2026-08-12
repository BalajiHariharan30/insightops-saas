/**
 * Billing API Tests
 * Tests: GET /billing/status, POST /billing/checkout
 */
import supertest from 'supertest';
import mongoose from 'mongoose';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_mock_session_id',
          url: 'https://checkout.stripe.com/pay/cs_test_mock',
        }),
      },
    },
    customers: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    subscriptions: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://billing.stripe.com/p/session/test_mock',
        }),
      },
    },
  }));
});

import app from '../app';
import { User } from '../modules/users/user.model';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationMember } from '../modules/organizations/member.model';

const request = supertest(app);

const TEST_USER = {
  name: 'Billing Test User',
  email: 'billing@insightops.in',
  password: 'BillTest@321',
};

let accessToken: string;

beforeAll(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});

  const regRes = await request.post('/api/v1/auth/register').send(TEST_USER);
  accessToken = regRes.body.data.accessToken;
});

describe('💳 Billing — GET /api/v1/billing/status', () => {
  it('returns FREE status for new user (no Stripe subscription)', async () => {
    const res = await request
      .get('/api/v1/billing/status')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('FREE');
    expect(res.body.data.plan).toBeNull();
  });

  it('returns 401 without auth token', async () => {
    const res = await request.get('/api/v1/billing/status');
    expect(res.status).toBe(401);
  });
});

describe('💳 Billing — POST /api/v1/billing/checkout', () => {
  it('creates Stripe checkout session for STARTER plan', async () => {
    const res = await request
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'STARTER' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.checkoutUrl).toBeDefined();
    expect(res.body.data.checkoutUrl).toContain('stripe.com');
    expect(res.body.data.sessionId).toBeDefined();
  });

  it('creates Stripe checkout session for PROFESSIONAL plan', async () => {
    const res = await request
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'PROFESSIONAL' });

    expect(res.status).toBe(200);
    expect(res.body.data.checkoutUrl).toBeDefined();
  });

  it('creates Stripe checkout session for ENTERPRISE plan', async () => {
    const res = await request
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'ENTERPRISE' });

    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid plan name', async () => {
    const res = await request
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'INVALID_PLAN' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 without auth token', async () => {
    const res = await request
      .post('/api/v1/billing/checkout')
      .send({ plan: 'STARTER' });

    expect(res.status).toBe(401);
  });
});
