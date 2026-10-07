import { beforeEach, describe, expect, it, vi } from 'vitest';

import Page from '../page';

const mocks = vi.hoisted(() => ({
  getFullProfile: vi.fn(),
  getCatalogs: vi.fn(),
  requireRole: vi.fn(),
}));
vi.mock('@/entities/candidate/profile/api/server', () => ({
  getCandidateFullProfile: mocks.getFullProfile,
}));
vi.mock('@/entities/catalog/api/server', () => ({
  getCatalogs: mocks.getCatalogs,
}));
vi.mock('@/entities/session/api/server', () => ({
  requireRole: mocks.requireRole,
}));
vi.mock('@/screens/candidate', () => ({ CandidateHomePage: () => null }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({
    id: 'user',
    role: 'candidate',
    email: 'user@example.com',
  });
  mocks.getCatalogs.mockResolvedValue({
    workFormats: [{ id: 1, name: 'Офис' }],
  });
  mocks.getFullProfile.mockResolvedValue({
    profile: null,
    contacts: null,
    skills: [],
    consents: {},
    readiness: {},
  });
});

describe('candidate page loading', () => {
  it('passes the full response to the cabinet and allows creating a missing profile', async () => {
    const page = await Page();
    expect(mocks.getFullProfile).toHaveBeenCalledOnce();
    expect(page.props.initialFullProfile).toMatchObject({
      profile: null,
      contacts: null,
    });
    expect(page.props.loadError).toBeUndefined();
    expect(page.props.workFormats).toEqual([{ id: 1, name: 'Офис' }]);
  });

  it('keeps loading existing profiles when catalogs are unavailable', async () => {
    mocks.getFullProfile.mockResolvedValue({ profile: { id: 'profile' } });
    mocks.getCatalogs.mockRejectedValue(new Error('catalogs unavailable'));
    const page = await Page();
    expect(page.props.initialFullProfile.profile.id).toBe('profile');
    expect(page.props.workFormats).toBeUndefined();
    expect(page.props.loadError).toBeUndefined();
  });

  it('shows a retry state instead of creation when the full profile request fails', async () => {
    mocks.getFullProfile.mockRejectedValue(new Error('profile unavailable'));
    const page = await Page();
    expect(page.props.initialFullProfile).toBeUndefined();
    expect(page.props.loadError).toContain('Не удалось загрузить профиль');
  });
});
