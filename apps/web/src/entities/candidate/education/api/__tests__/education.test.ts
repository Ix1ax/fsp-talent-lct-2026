import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCandidateEducation,
  deleteCandidateEducation,
  getCandidateEducations,
  saveCandidateEducation,
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
  level: 'secondary',
  institution: 'Школа',
  specialty: '',
  graduationYear: 2100,
};
const wireInput = {
  level: 'secondary',
  institution: 'Школа',
  specialty: '',
  graduation_year: 2100,
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

describe('candidate education API', () => {
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
    expect(await getCandidateEducations(signal)).toEqual({
      items: ['second', 'first'].map((id) => ({
        ...input,
        id,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      })),
    });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/me/education',
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
    expect(await getCandidateEducations()).toEqual({ items: [] });
  });

  it('creates using the full snake_case body and normalizes the created record', async () => {
    expect(await addCandidateEducation(input)).toEqual({
      ...input,
      id: 'record',
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({ method: 'post', url: '/v1/me/education' });
    expect(JSON.parse(config.data)).toEqual(wireInput);
  });

  it('replaces the complete record including empty fields using an encoded ID', async () => {
    expect(await saveCandidateEducation('record/id', input)).toMatchObject(
      input,
    );
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({
      method: 'put',
      url: '/v1/me/education/record%2Fid',
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
      deleteCandidateEducation('record/id'),
    ).resolves.toBeUndefined();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'delete',
      url: '/v1/me/education/record%2Fid',
    });
  });

  it.each([
    [400, 'validation_error', () => saveCandidateEducation('record', input)],
    [404, 'education_not_found', () => deleteCandidateEducation('record')],
    [404, 'profile_not_found', () => getCandidateEducations()],
    [409, 'limit_reached', () => addCandidateEducation(input)],
    [503, 'candidate_unavailable', () => getCandidateEducations()],
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
