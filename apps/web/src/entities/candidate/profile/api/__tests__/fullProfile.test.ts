import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCandidateSkill,
  deleteCandidateSkill,
  getCandidateConsents,
  getCandidateContacts,
  getCandidateSkills,
  grantCandidateConsent,
  revokeCandidateConsent,
  saveCandidateContacts,
  saveCandidateSkill,
} from '@/entities/candidate';

import { getCandidateFullProfileClient } from '../fullProfile';
import { getCandidateFullProfile } from '../server';

const { adapter } = vi.hoisted(() => ({ adapter: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/client', async () => {
  const { createApi, attachErrorInterceptor } =
    await import('@/shared/api/base');
  const clientApi = createApi({ adapter });
  attachErrorInterceptor(clientApi);
  return { clientApi };
});
vi.mock('@/shared/api/server', async () => {
  const { createApi, attachErrorInterceptor } =
    await import('@/shared/api/base');
  const serverApi = createApi({ adapter });
  attachErrorInterceptor(serverApi);
  return { serverApi };
});

const fullProfile = {
  profile: null,
  contacts: null,
  consents: {
    current_policy_version: 'v2',
    items: [{ kind: 'processing', company_id: null, revoked_at: null }],
  },
  skills: [
    { skill_id: 'skill', claimed_level: 3, source: 'claimed', confidence: 0.3 },
  ],
  category: null,
  achievements: [],
  readiness: {
    percent: 25,
    ready_to_publish: false,
    items: [
      {
        code: 'consent_processing',
        title: 'Обработка',
        done: true,
        required: true,
      },
    ],
  },
};

beforeEach(() => {
  adapter.mockReset();
  adapter.mockImplementation(async (config) => ({
    data: fullProfile,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
});

describe('full candidate profile and related APIs', () => {
  it.each([getCandidateFullProfileClient, getCandidateFullProfile])(
    'normalizes the full response without treating a missing profile as an error',
    async (getFullProfile) => {
      expect(await getFullProfile()).toMatchObject({
        profile: null,
        contacts: null,
        consents: { currentPolicyVersion: 'v2', items: [{ revokedAt: null }] },
        skills: [{ skillId: 'skill', claimedLevel: 3, confidence: 0.3 }],
        readiness: { readyToPublish: false, percent: 25 },
      });
      expect(adapter.mock.calls[0][0]).toMatchObject({
        method: 'get',
        url: '/v1/me/profile/full',
        headers: { 'Cache-Control': 'no-store' },
      });
    },
  );

  it('keeps existing profile and private contacts in the response', async () => {
    adapter.mockImplementationOnce(async (config) => ({
      data: {
        ...fullProfile,
        profile: { id: 'profile', experience_months: 16 },
        contacts: {
          full_name: 'Иван',
          email: 'user@example.com',
          updated_at: 'now',
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    expect(await getCandidateFullProfileClient()).toMatchObject({
      profile: { id: 'profile', experienceMonths: 16 },
      contacts: {
        fullName: 'Иван',
        email: 'user@example.com',
        updatedAt: 'now',
      },
    });
  });

  it('sends the policy version without a company for general consent', async () => {
    await grantCandidateConsent({ kind: 'processing', policyVersion: 'v2' });
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({ method: 'post', url: '/v1/me/consents' });
    expect(JSON.parse(config.data)).toEqual({
      kind: 'processing',
      policy_version: 'v2',
    });
  });

  it('sends the company for ATS transfer consent', async () => {
    await grantCandidateConsent({
      kind: 'ats_transfer',
      policyVersion: 'v2',
      companyId: 'company',
    });
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      kind: 'ats_transfer',
      policy_version: 'v2',
      company_id: 'company',
    });
  });

  it('uses company_id only for ATS consent revocation and accepts 204', async () => {
    adapter.mockImplementation(async (config) => ({
      data: undefined,
      status: 204,
      statusText: 'No content',
      headers: {},
      config,
    }));
    await expect(
      revokeCandidateConsent({ kind: 'processing' }),
    ).resolves.toBeUndefined();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: '/v1/me/consents/processing',
    });
    expect(adapter.mock.calls[0][0].params).toBeUndefined();
    await revokeCandidateConsent({
      kind: 'ats_transfer',
      companyId: 'company',
    });
    expect(adapter.mock.calls[1][0]).toMatchObject({
      method: 'delete',
      url: '/v1/me/consents/ats_transfer',
      params: { company_id: 'company' },
    });
  });

  it('reads private contacts and consents without cache reuse', async () => {
    await getCandidateContacts();
    await getCandidateConsents();
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      '/v1/me/contacts',
      '/v1/me/consents',
    ]);
    for (const [config] of adapter.mock.calls)
      expect(config.headers['Cache-Control']).toBe('no-store');
  });

  it('replaces the complete contacts object including cleared strings', async () => {
    await saveCandidateContacts({
      fullName: 'Иван',
      email: 'user@example.com',
      phone: '',
      telegram: '',
    });
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({ method: 'put', url: '/v1/me/contacts' });
    expect(JSON.parse(config.data)).toEqual({
      full_name: 'Иван',
      email: 'user@example.com',
      phone: '',
      telegram: '',
    });
  });

  it('adds a named skill without client-supplied source, confidence or moderation', async () => {
    await addCandidateSkill({ name: 'Svelte', claimedLevel: 5 });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'post',
      url: '/v1/me/skills',
    });
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      name: 'Svelte',
      claimed_level: 5,
    });
  });

  it('reads skills and saves a level by encoded skill ID', async () => {
    await getCandidateSkills();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/me/skills',
    });
    await saveCandidateSkill('skill/id', { claimedLevel: 2 });
    expect(adapter.mock.calls[1][0]).toMatchObject({
      method: 'put',
      url: '/v1/me/skills/skill%2Fid',
    });
    expect(JSON.parse(adapter.mock.calls[1][0].data)).toEqual({
      claimed_level: 2,
    });
  });

  it('deletes a skill without parsing a 204 response', async () => {
    adapter.mockImplementationOnce(async (config) => ({
      data: undefined,
      status: 204,
      statusText: 'No content',
      headers: {},
      config,
    }));
    await expect(deleteCandidateSkill('skill')).resolves.toBeUndefined();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'delete',
      url: '/v1/me/skills/skill',
    });
  });

  it('preserves consent error codes for the future UI', async () => {
    adapter.mockImplementationOnce(
      async (config: InternalAxiosRequestConfig) => {
        throw new AxiosError('Conflict', undefined, config, undefined, {
          data: {
            error: { code: 'policy_outdated', message: 'Версия устарела' },
          },
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config,
        });
      },
    );
    await expect(
      grantCandidateConsent({ kind: 'publication', policyVersion: 'v1' }),
    ).rejects.toMatchObject({ status: 409, code: 'policy_outdated' });
  });
});
