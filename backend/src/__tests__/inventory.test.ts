/**
 * Inventory API Tests
 * Tests: GET /inventory, POST /inventory, POST /inventory/:id/adjust
 */
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../modules/users/user.model';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationMember } from '../modules/organizations/member.model';
import { InventoryItem } from '../modules/inventory/inventory.model';

const request = supertest(app);

const TEST_USER = {
  name: 'Inventory Test User',
  email: 'inventory@insightops.in',
  password: 'TestPass@456',
};

let accessToken: string;
let organizationId: string;

beforeAll(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
  await InventoryItem.deleteMany({});

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

const SAMPLE_ITEM = {
  sku: 'TEST-ITEM-001',
  name: 'Test Laptop',
  category: 'Electronics',
  quantity: 50,
  unitCost: 45000,
  sellingPrice: 65000,
  reorderPoint: 10,
  supplier: 'Test Supplier Ltd.',
};

describe('📦 Inventory — GET /api/v1/inventory', () => {
  it('returns 200 with empty items array when no items exist', async () => {
    const res = await request
      .get('/api/v1/inventory')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toBeInstanceOf(Array);
  });

  it('returns 401 without Authorization token', async () => {
    const res = await request.get('/api/v1/inventory');
    expect(res.status).toBe(401);
  });

  it('returns 403 without x-organization-id header', async () => {
    const res = await request
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});

describe('📦 Inventory — POST /api/v1/inventory', () => {
  beforeEach(async () => {
    await InventoryItem.deleteMany({});
  });

  it('creates a new inventory item and returns 201', async () => {
    const res = await request
      .post('/api/v1/inventory')
      .set(authHeaders())
      .send(SAMPLE_ITEM);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('TEST-ITEM-001');
    expect(res.body.data.status).toBe('IN_STOCK');
    expect(res.body.data.organizationId).toBeDefined();
  });

  it('auto-sets status to LOW_STOCK when quantity <= reorderPoint', async () => {
    const res = await request
      .post('/api/v1/inventory')
      .set(authHeaders())
      .send({ ...SAMPLE_ITEM, sku: 'LOW-001', quantity: 5, reorderPoint: 10 });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('LOW_STOCK');
  });

  it('auto-sets status to OUT_OF_STOCK when quantity is 0', async () => {
    const res = await request
      .post('/api/v1/inventory')
      .set(authHeaders())
      .send({ ...SAMPLE_ITEM, sku: 'OOS-001', quantity: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OUT_OF_STOCK');
  });

  it('returns 409 when creating item with duplicate SKU', async () => {
    await request.post('/api/v1/inventory').set(authHeaders()).send(SAMPLE_ITEM);
    const res = await request.post('/api/v1/inventory').set(authHeaders()).send(SAMPLE_ITEM);

    expect(res.status).toBe(409);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request
      .post('/api/v1/inventory')
      .set(authHeaders())
      .send({ name: 'Missing Fields Item' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when price is negative', async () => {
    const res = await request
      .post('/api/v1/inventory')
      .set(authHeaders())
      .send({ ...SAMPLE_ITEM, sku: 'NEG-001', sellingPrice: -100 });

    expect(res.status).toBe(400);
  });
});

describe('📦 Inventory — POST /api/v1/inventory/:id/adjust', () => {
  let itemId: string;

  beforeEach(async () => {
    await InventoryItem.deleteMany({});
    const res = await request
      .post('/api/v1/inventory')
      .set(authHeaders())
      .send(SAMPLE_ITEM);
    itemId = res.body.data._id;
  });

  it('restocks item quantity with INCOMING adjustment', async () => {
    const res = await request
      .post(`/api/v1/inventory/${itemId}/adjust`)
      .set(authHeaders())
      .send({ quantity: 20, type: 'INCOMING' });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(70);
    expect(res.body.data.status).toBe('IN_STOCK');
  });

  it('deducts item quantity with OUTGOING adjustment', async () => {
    const res = await request
      .post(`/api/v1/inventory/${itemId}/adjust`)
      .set(authHeaders())
      .send({ quantity: -10, type: 'OUTGOING' });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(40);
  });

  it('returns 404 for non-existent item ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request
      .post(`/api/v1/inventory/${fakeId}/adjust`)
      .set(authHeaders())
      .send({ quantity: 5, type: 'INCOMING' });

    expect(res.status).toBe(404);
  });
});
