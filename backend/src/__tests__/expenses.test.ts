/**
 * Expenses API Tests
 * Tests: GET /expenses, POST /expenses, PUT /expenses/:id (approve/reject)
 */
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../modules/users/user.model';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationMember } from '../modules/organizations/member.model';
import Expense from '../modules/expenses/expense.model';

const request = supertest(app);

const TEST_USER = {
  name: 'Expense Test Admin',
  email: 'expenses@insightops.in',
  password: 'ExpTest@789',
};

let accessToken: string;
let organizationId: string;

beforeAll(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
  await Expense.deleteMany({});

  const regRes = await request.post('/api/v1/auth/register').send(TEST_USER);
  accessToken = regRes.body.data.accessToken;

  const orgRes = await request
    .get('/api/v1/organizations')
    .set('Authorization', `Bearer ${accessToken}`);

  organizationId = orgRes.body.data[0]?.organization?._id;
});

const authHeaders = () => ({
  Authorization: `Bearer ${accessToken}`,
  'x-organization-id': organizationId,
});

const SAMPLE_EXPENSE = {
  vendor: 'AWS India Pvt Ltd',
  vendorGSTIN: '29AABCW1234F1Z5',
  category: 'Software & SaaS',
  amount: 12500,
  date: new Date().toISOString().split('T')[0],
  description: 'Monthly cloud hosting bill',
  gstType: 'IGST',
  gstRate: 18,
  gstAmount: 2250,
  upiTransactionId: 'UPI2024081200001',
};

describe('💰 Expenses — GET /api/v1/expenses', () => {
  it('returns 200 with paginated items', async () => {
    const res = await request
      .get('/api/v1/expenses')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('nextCursor');
  });

  it('returns 401 without auth token', async () => {
    const res = await request.get('/api/v1/expenses');
    expect(res.status).toBe(401);
  });

  it('returns 403 without organization header', async () => {
    const res = await request
      .get('/api/v1/expenses')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe('💰 Expenses — POST /api/v1/expenses', () => {
  beforeEach(async () => {
    await Expense.deleteMany({});
  });

  it('creates expense with all India-specific fields and returns 201', async () => {
    const res = await request
      .post('/api/v1/expenses')
      .set(authHeaders())
      .send(SAMPLE_EXPENSE);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vendor).toBe('AWS India Pvt Ltd');
    expect(res.body.data.amount).toBe(12500);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.gstType).toBe('IGST');
    expect(res.body.data.gstRate).toBe(18);
    expect(res.body.data.upiTransactionId).toBe('UPI2024081200001');
  });

  it('creates expense without GST fields (No GST case)', async () => {
    const res = await request
      .post('/api/v1/expenses')
      .set(authHeaders())
      .send({
        vendor: 'Local Stationery Shop',
        category: 'Office Supplies',
        amount: 500,
        date: new Date().toISOString().split('T')[0],
        gstType: 'NONE',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.gstType).toBe('NONE');
  });

  it('returns 400 when amount is missing', async () => {
    const res = await request
      .post('/api/v1/expenses')
      .set(authHeaders())
      .send({ vendor: 'Test', category: 'Software & SaaS', date: '2024-01-01' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when amount is zero or negative', async () => {
    const res = await request
      .post('/api/v1/expenses')
      .set(authHeaders())
      .send({ ...SAMPLE_EXPENSE, amount: 0 });

    expect(res.status).toBe(400);
  });
});

describe('💰 Expenses — PUT /api/v1/expenses/:id (Approve/Reject)', () => {
  let expenseId: string;

  beforeEach(async () => {
    await Expense.deleteMany({});
    const res = await request
      .post('/api/v1/expenses')
      .set(authHeaders())
      .send(SAMPLE_EXPENSE);
    expenseId = res.body.data._id;
  });

  it('admin can approve a PENDING expense', async () => {
    const res = await request
      .put(`/api/v1/expenses/${expenseId}`)
      .set(authHeaders())
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('admin can reject a PENDING expense', async () => {
    const res = await request
      .put(`/api/v1/expenses/${expenseId}`)
      .set(authHeaders())
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
  });

  it('returns 404 for non-existent expense ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request
      .put(`/api/v1/expenses/${fakeId}`)
      .set(authHeaders())
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(404);
  });
});
