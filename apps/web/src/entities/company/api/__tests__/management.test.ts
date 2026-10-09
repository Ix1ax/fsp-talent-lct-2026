import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clientApi } from '@/shared/api/client';

import {
  acceptCompanyInvitation,
  deleteCompanyFile,
  downloadCompanyFile,
  getCompanyMembers,
  updateCompanyMember,
  uploadCompanyFile,
} from '../management';

vi.mock('@/shared/api/client', () => ({
  clientApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
describe('company management transport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(clientApi.post).mockResolvedValue({ data: {} });
    vi.mocked(clientApi.get).mockResolvedValue({ data: {} });
    vi.mocked(clientApi.patch).mockResolvedValue({ data: {} });
    vi.mocked(clientApi.delete).mockResolvedValue({ status: 204 });
  });
  it('sends exactly one file and purpose without a manual multipart header', async () => {
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    await uploadCompanyFile('company', file, 'company_logo');
    const [, body, config] = vi.mocked(clientApi.post).mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect([...form.keys()]).toEqual(['file', 'purpose']);
    expect(form.get('purpose')).toBe('company_logo');
    expect(form.getAll('file')).toHaveLength(1);
    expect(config).toEqual({ timeout: 60000 });
  });
  it('downloads authenticated blobs and tolerates a bodyless 204', async () => {
    const signal = new AbortController().signal;
    await downloadCompanyFile('company', 'file', signal);
    expect(clientApi.get).toHaveBeenCalledWith(
      '/v1/companies/company/files/file/download',
      { responseType: 'blob', signal },
    );
    await expect(deleteCompanyFile('company', 'file')).resolves.toBeUndefined();
  });
  it('uses local user IDs for role changes, keeps pagination and accepts only the invitation token', async () => {
    await getCompanyMembers('company', 40);
    expect(clientApi.get).toHaveBeenCalledWith(
      '/v1/companies/company/members',
      { params: { limit: 20, offset: 40 }, signal: undefined },
    );
    await updateCompanyMember('company', 'local-user', 'viewer');
    expect(clientApi.patch).toHaveBeenCalledWith(
      '/v1/companies/company/members/local-user',
      { role: 'viewer' },
    );
    await acceptCompanyInvitation('invitation-token');
    expect(clientApi.post).toHaveBeenCalledWith(
      '/v1/company-invitations/accept',
      { token: 'invitation-token' },
    );
  });
});
