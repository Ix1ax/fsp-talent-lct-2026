import { describe, expect, it, vi } from 'vitest';

import { clientApi } from '@/shared/api/client';

import { getBankCandidates, getNeedCandidates } from '../index';

vi.mock('@/shared/api/client', () => ({ clientApi: { get: vi.fn() } }));

describe('need selection uses server matching', () => {
  it('requests all need requirements with manual filters, pagination and cancellation', async () => {
    const signal = new AbortController().signal;
    const page = {
      items: [],
      total: 0,
      needId: 'need',
      matchingMode: 'similarity',
    };
    vi.mocked(clientApi.get).mockResolvedValue({ data: page });
    await expect(
      getNeedCandidates(
        'company',
        'need',
        {
          specializationId: 2,
          skillId: 'react',
          verifiedSkillOnly: true,
          workFormatIds: [1, 3],
          experienceMinMonths: 0,
          salaryMaxRub: 0,
        },
        40,
        signal,
      ),
    ).resolves.toBe(page);
    expect(clientApi.get).toHaveBeenLastCalledWith(
      '/v1/companies/company/needs/need/candidates',
      {
        params: expect.objectContaining({
          specializationId: 2,
          skillId: 'react',
          verifiedSkillOnly: true,
          workFormatIds: '1,3',
          experienceMinMonths: 0,
          salaryMaxRub: 0,
          limit: 20,
          offset: 40,
        }),
        signal,
      },
    );
    await getBankCandidates('company', {}, 0, signal);
    expect(clientApi.get).toHaveBeenLastCalledWith(
      '/v1/companies/company/candidates',
      { params: expect.objectContaining({ limit: 20, offset: 0 }), signal },
    );
  });
});
