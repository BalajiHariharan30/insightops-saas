import { z } from 'zod';

export const createOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters'),
    slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes'),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Must be a valid email address'),
    role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    memberId: z.string().min(1, 'Member ID parameter is required'),
  }),
  body: z.object({
    role: z.enum(['ADMIN', 'STAFF']),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    memberId: z.string().min(1, 'Member ID parameter is required'),
  }),
});
