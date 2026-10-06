import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCandidateProfile,
  deleteCandidateAvatar,
  getCandidateAvatar,
  getCandidateProfileClient,
  updateCandidateProfile,
  uploadCandidateAvatar,
} from '../profile';

const { adapter } = vi.hoisted(() => ({ adapter: vi.fn() }));
vi.mock('@/shared/api/client', async () => {
  const { createApi, attachErrorInterceptor } =
    await import('@/shared/api/base');
  const clientApi = createApi({ adapter });
  attachErrorInterceptor(clientApi);
  return { clientApi };
});

const responseProfile = {
  id: 'profile',
  avatar_file_id: null,
  headline: null,
  summary: null,
  city: null,
  timezone: null,
  experience_months: 0,
  salary_min_rub: null,
  search_status: 'hidden',
  work_format_ids: [],
  updated_at: '2026-10-06T00:00:00Z',
};

beforeEach(() => {
  adapter.mockReset();
  adapter.mockImplementation(async (config) => ({
    data: responseProfile,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
});

describe('candidate profile API', () => {
  it('reads and normalizes the profile', async () => {
    expect(await getCandidateProfileClient()).toMatchObject({
      avatarFileId: null,
      experienceMonths: 0,
      searchStatus: 'hidden',
    });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/me/profile',
    });
  });
  it('creates using snake_case JSON', async () => {
    await createCandidateProfile({
      headline: null,
      summary: null,
      city: null,
      timezone: null,
      experienceMonths: 0,
      salaryMinRub: 0,
      searchStatus: 'hidden',
      workFormatIds: [1],
    });
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe('post');
    expect(JSON.parse(config.data)).toMatchObject({
      experience_months: 0,
      salary_min_rub: 0,
      work_format_ids: [1],
    });
  });
  it('patches only provided fields including explicit null and empty array', async () => {
    await updateCandidateProfile({ headline: null, workFormatIds: [] });
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe('patch');
    expect(JSON.parse(config.data)).toEqual({
      headline: null,
      work_format_ids: [],
    });
  });
  it('uploads a single multipart file without converting FormData', async () => {
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });
    await uploadCandidateAvatar(file);
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({
      method: 'put',
      url: '/v1/me/profile/avatar',
    });
    expect(config.data).toBeInstanceOf(FormData);
    expect(Array.from(config.data.keys())).toEqual(['file']);
    expect(config.data.get('file')).toBe(file);
  });
  it('returns the authenticated binary response unchanged', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    adapter.mockImplementationOnce(async (config) => ({
      data: blob,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    expect(await getCandidateAvatar()).toBe(blob);
    expect(adapter.mock.calls[0][0]).toMatchObject({
      responseType: 'blob',
      url: '/v1/me/profile/avatar',
    });
  });
  it('decodes a JSON error returned as a Blob', async () => {
    adapter.mockImplementationOnce(
      async (config: InternalAxiosRequestConfig) => {
        throw new AxiosError('Not found', undefined, config, undefined, {
          data: new Blob([
            JSON.stringify({
              error: { code: 'avatar_not_found', message: 'Нет аватара' },
            }),
          ]),
          status: 404,
          statusText: 'Not found',
          headers: {},
          config,
        });
      },
    );
    await expect(getCandidateAvatar()).rejects.toMatchObject({
      status: 404,
      code: 'avatar_not_found',
      message: 'Нет аватара',
    });
  });
  it('deletes without parsing a 204 body', async () => {
    adapter.mockImplementationOnce(async (config) => ({
      data: undefined,
      status: 204,
      statusText: 'No content',
      headers: {},
      config,
    }));
    await expect(deleteCandidateAvatar()).resolves.toBeUndefined();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'delete',
      url: '/v1/me/profile/avatar',
    });
  });
});
