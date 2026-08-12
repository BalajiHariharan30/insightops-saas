import supertest from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../modules/users/user.model';
import { Organization } from '../../modules/organizations/organization.model';
import { OrganizationMember } from '../../modules/organizations/member.model';

export const TEST_USER = {
  name: 'Test Admin',
  email: 'test@insightops.com',
  password: 'Test@Password123',
};

export interface AuthContext {
  accessToken: string;
  organizationId: string;
  userId: string;
}

export async function createAuthContext(app: any): Promise<AuthContext> {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});

  const request = supertest(app);

  const res = await request
    .post('/api/v1/auth/register')
    .send({
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

  if (res.status !== 201) {
    throw new Error(`Failed to create test user: ${JSON.stringify(res.body)}`);
  }

  const accessToken: string = res.body.data.accessToken;
  const userId: string = res.body.data.user._id || res.body.data.user.id;

  const orgRes = await request
    .get('/api/v1/organizations')
    .set('Authorization', `Bearer ${accessToken}`);

  const orgId = orgRes.body.data[0]?.organization?._id || '';

  return { accessToken, organizationId: orgId, userId };
}

export async function seedAdminUser() {
  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  const user = await User.create({
    name: TEST_USER.name,
    email: TEST_USER.email,
    passwordHash,
    isVerified: true,
  });

  const org = await Organization.create({
    name: 'Test Organization',
    slug: 'test-org',
  });

  await OrganizationMember.create({
    userId: user._id,
    organizationId: org._id,
    role: 'ADMIN',
    status: 'ACTIVE',
  });

  return { user, org };
}
