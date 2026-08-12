/**
 * Organizations API Tests
 * Tests: GET /organizations, POST /organizations, GET /organizations/members
 */
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../modules/users/user.model';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationMember } from '../modules/organizations/member.model';

const request = supertest(app);

const ADMIN_USER = {
  name: 'Org Admin User',
  email: 'orgadmin@insightops.in',
  password: 'OrgAdmin@123',
};

let accessToken: string;
let organizationId: string;

beforeAll(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});

  const regRes = await request.post('/api/v1/auth/register').send(ADMIN_USER);
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

describe('🏢 Organizations — GET /api/v1/organizations', () => {
  it('returns list of organizations user belongs to', async () => {
    const res = await request
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);

    const membership = res.body.data[0];
    expect(membership.role).toBe('ADMIN');
    expect(membership.organization).toBeDefined();
    expect(membership.organization._id).toBeDefined();
    expect(membership.organization.name).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await request.get('/api/v1/organizations');
    expect(res.status).toBe(401);
  });
});

describe('🏢 Organizations — POST /api/v1/organizations', () => {
  it('creates a new organization for authenticated user', async () => {
    const res = await request
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Second Test Org', slug: 'second-test-org-unique' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Second Test Org');
    expect(res.body.data.slug).toBe('second-test-org-unique');
  });

  it('returns 409 when slug is already taken', async () => {
    await request
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Duplicate Slug Org', slug: 'already-taken-slug' });

    const res = await request
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Another Org Same Slug', slug: 'already-taken-slug' });

    expect(res.status).toBe(409);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ slug: 'no-name-org' });

    expect(res.status).toBe(400);
  });
});

describe('🏢 Organizations — GET /organizations/members', () => {
  it('returns member list for organization admin', async () => {
    const res = await request
      .get('/api/v1/organizations/members')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);

    const adminMember = res.body.data.find(
      (m: any) => m.role === 'ADMIN'
    );
    expect(adminMember).toBeDefined();
  });

  it('returns 403 without organization header', async () => {
    const res = await request
      .get('/api/v1/organizations/members')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});
