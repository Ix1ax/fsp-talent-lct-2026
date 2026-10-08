import { describe, expect, it } from 'vitest';

import type { AdminSession } from '@/entities/admin';

import { getAdminQueryState } from '../getAdminQueryState';

const session = { access_token: 'test-token' } as AdminSession;
const data = { items: ['record'] };
const result = {
  path: '/catalogs/skills',
  revision: 0,
  session,
  data,
  error: null,
};

describe('admin query state', () => {
  it('keeps data visible during a refresh of the same resource', () => {
    expect(getAdminQueryState(result, result.path, 1, session)).toEqual({
      data,
      error: null,
      loading: true,
    });
  });
  it('does not expose previous records under new filters', () => {
    expect(
      getAdminQueryState(result, '/catalogs/skills?q=new', 0, session),
    ).toEqual({ data: null, error: null, loading: true });
  });
  it('does not expose another session’s cached data', () => {
    expect(getAdminQueryState(result, result.path, 0, { ...session })).toEqual({
      data: null,
      error: null,
      loading: true,
    });
  });
  it('keeps records when refresh fails and hides the old error on retry', () => {
    const failed = { ...result, revision: 1, error: new Error('Offline') };
    expect(getAdminQueryState(failed, result.path, 1, session)).toEqual({
      data,
      error: failed.error,
      loading: false,
    });
    expect(getAdminQueryState(failed, result.path, 2, session)).toEqual({
      data,
      error: null,
      loading: true,
    });
  });
});
