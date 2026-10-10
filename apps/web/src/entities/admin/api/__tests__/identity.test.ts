import { expect, it } from 'vitest';

import {
  adminAuditEventSchema,
  adminCompanyMemberSchema,
  adminOperationsSchemas,
  adminUserSchema,
} from '../operationsSchemas';

const identity = {
  full_name: null,
  full_name_source: null,
  email: null,
  contact_email: null,
  identity_updated_at: null,
};
const user = {
  ...identity,
  id: 'user-id',
  role: 'employer',
  status: 'active',
  blocked_reason: null,
  blocked_at: null,
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
  candidate_profile_id: null,
  search_status: null,
};
it('accepts identities that have not yet synchronized and discards private fields outside the admin contract', () => {
  expect(
    adminUserSchema.parse({
      ...user,
      phone: 'private-phone',
      oidc_subject: 'private-subject',
    }),
  ).toEqual(user);
  expect(
    adminUserSchema.parse({
      ...user,
      full_name: 'Иван Петров',
      full_name_source: 'candidate_contacts',
      email: 'account@example.test',
      contact_email: 'other@example.test',
    }),
  ).toMatchObject({
    full_name: 'Иван Петров',
    email: 'account@example.test',
    contact_email: 'other@example.test',
  });
  expect(
    adminUserSchema.safeParse({
      ...user,
      full_name_source: 'verified_document',
    }).success,
  ).toBe(false);
});
it('keeps account blocking independent of company membership and verification', () => {
  const member = adminCompanyMemberSchema.parse({
    ...identity,
    company_id: 'company-id',
    user_id: 'user-id',
    role: 'recruiter',
    status: 'active',
    joined_at: user.created_at,
    user_role: 'employer',
    user_status: 'blocked',
    user_blocked_reason: 'Нарушение',
    user_blocked_at: user.updated_at,
  });
  expect(member.status).toBe('active');
  expect(member.user_status).toBe('blocked');
  const companies = adminOperationsSchemas.userCompanies.parse({
    items: [
      {
        company_id: 'company-id',
        company_name: 'Компания',
        company_status: 'blocked',
        verification_status: 'verified',
        role: 'owner',
        status: 'inactive',
        joined_at: user.created_at,
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  });
  expect(companies.items[0]).toMatchObject({
    company_status: 'blocked',
    verification_status: 'verified',
    status: 'inactive',
  });
});
it('accepts system audit entries without an account identity', () => {
  expect(
    adminAuditEventSchema.parse({
      actor_email: null,
      actor_name: null,
      actor_id: null,
      actor_kind: 'system',
      source: 'activity',
      id: 'event-id',
      action: 'maintenance',
      entity_type: 'user',
      entity_id: null,
      old_status: null,
      new_status: null,
      reason: null,
      created_at: user.created_at,
    }).actor_id,
  ).toBeNull();
});
