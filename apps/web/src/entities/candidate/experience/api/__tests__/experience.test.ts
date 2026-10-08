import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCandidateExperience,
  deleteCandidateExperience,
  getCandidateExperiences,
  saveCandidateExperience,
} from '@/entities/candidate';

const { adapter } = vi.hoisted(() => ({ adapter: vi.fn() }));
vi.mock('@/shared/api/client', async () => {
  const { createApi, attachErrorInterceptor } =
    await import('@/shared/api/base');
  const clientApi = createApi({ adapter });
  attachErrorInterceptor(clientApi);
  return { clientApi };
});

const input = {
  company: 'LazurMedia',
  position: 'PHP-программист',
  startedOn: '2022-11',
  endedOn: null,
  description: '',
};
const wireInput = {
  company: 'LazurMedia',
  position: 'PHP-программист',
  started_on: '2022-11',
  ended_on: null,
  description: '',
};
const record = {
  ...wireInput,
  id: 'record',
  created_at: '2026-10-07T22:01:20.960Z',
  updated_at: '2026-10-07T22:01:20.960Z',
};

beforeEach(() => {
  adapter.mockReset();
  adapter.mockImplementation(async (config) => ({
    data: record,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
});

describe('candidate experience API', () => {
  it('reads an uncached list and preserves server order while normalizing fields', async () => {
    adapter.mockImplementationOnce(async (config) => ({
      data: {
        items: [
          { ...record, id: 'second' },
          { ...record, id: 'first' },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const signal = new AbortController().signal;
    expect(await getCandidateExperiences(signal)).toEqual({
      items: ['second', 'first'].map((id) => ({
        ...input,
        id,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      })),
    });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/me/experience',
      headers: { 'Cache-Control': 'no-store' },
      signal,
    });
  });

  it('returns an empty list without inventing records', async () => {
    adapter.mockImplementationOnce(async (config) => ({
      data: { items: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    expect(await getCandidateExperiences()).toEqual({ items: [] });
  });

  it('creates using the full snake_case body and normalizes the created record', async () => {
    expect(await addCandidateExperience(input)).toEqual({
      ...input,
      id: 'record',
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({ method: 'post', url: '/v1/me/experience' });
    expect(JSON.parse(config.data)).toEqual(wireInput);
  });

  it('replaces the complete record including empty fields using an encoded ID', async () => {
    expect(await saveCandidateExperience('record/id', input)).toMatchObject(
      input,
    );
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({
      method: 'put',
      url: '/v1/me/experience/record%2Fid',
    });
    expect(JSON.parse(config.data)).toEqual(wireInput);
  });

  it('deletes by encoded ID and accepts a 204 response without data', async () => {
    adapter.mockImplementationOnce(async (config) => ({
      data: undefined,
      status: 204,
      statusText: 'No Content',
      headers: {},
      config,
    }));
    await expect(
      deleteCandidateExperience('record/id'),
    ).resolves.toBeUndefined();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'delete',
      url: '/v1/me/experience/record%2Fid',
    });
  });

  it.each([
    [400, 'validation_error', () => saveCandidateExperience('record', input)],
    [404, 'experience_not_found', () => deleteCandidateExperience('record')],
    [404, 'profile_not_found', () => getCandidateExperiences()],
    [409, 'limit_reached', () => addCandidateExperience(input)],
    [503, 'candidate_unavailable', () => getCandidateExperiences()],
  ])('preserves API error %s %s', async (status, code, request) => {
    adapter.mockImplementationOnce(
      async (config: InternalAxiosRequestConfig) => {
        throw new AxiosError('Request failed', undefined, config, undefined, {
          data: { error: { code, message: 'Ошибка API' } },
          status,
          statusText: 'Error',
          headers: {},
          config,
        });
      },
    );
    await expect(request()).rejects.toMatchObject({
      status,
      code,
      message: 'Ошибка API',
    });
  });
});
