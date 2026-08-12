/**
 * Authentication API Tests
 * Tests: POST /register, POST /login, POST /refresh, GET /me, POST /logout
 */
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../modules/users/user.model';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationMember } from '../modules/organizations/member.model';

const request = supertest(app);

const VALID_USER = {
  name: 'Balaji',
  email: 'balaji@insightops.in',
  password: 'StrongPass@123',
};

beforeEach(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
});

describe('🔐 Auth — POST /api/v1/auth/register', () => {
  it('registers a new user and returns 201 with accessToken', async () => {
    const res = await request.post('/api/v1/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(VALID_USER.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 409 Conflict when registering duplicate email', async () => {
    await request.post('/api/v1/auth/register').send(VALID_USER);
    const res = await request.post('/api/v1/auth/register').send(VALID_USER);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is too weak (< 8 chars)', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      ...VALID_USER,
      password: '123',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when email is invalid format', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      ...VALID_USER,
      email: 'not-an-email',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(400);
  });
});

describe('🔐 Auth — POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request.post('/api/v1/auth/register').send(VALID_USER);
  });

  it('logs in with correct credentials and returns accessToken + organizations', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.organizations).toBeInstanceOf(Array);
    expect(res.body.data.organizations.length).toBeGreaterThan(0);
    expect(res.body.data.organizations[0].organization._id).toBeDefined();
  });

  it('sets httpOnly jid cookie on successful login', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.headers['set-cookie']).toBeDefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toContain('jid=');
    expect(cookie).toContain('HttpOnly');
  });

  it('returns 401 with wrong password', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: VALID_USER.email,
      password: 'WrongPassword@999',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with non-existent email', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: 'ghost@insightops.in',
      password: VALID_USER.password,
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when email field is empty', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: '',
      password: VALID_USER.password,
    });

    expect(res.status).toBe(400);
  });
});

describe('🔐 Auth — GET /api/v1/auth/me', () => {
  let accessToken: string;

  beforeEach(async () => {
    await request.post('/api/v1/auth/register').send(VALID_USER);
    const loginRes = await request.post('/api/v1/auth/login').send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });
    accessToken = loginRes.body.data.accessToken;
  });

  it('returns current user profile with valid Bearer token', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(VALID_USER.email);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('returns 401 without Authorization header', async () => {
    const res = await request.get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid/expired token', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });
});

describe('🔐 Auth — POST /api/v1/auth/logout', () => {
  it('returns 200 on logout', async () => {
    await request.post('/api/v1/auth/register').send(VALID_USER);

    const res = await request.post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
