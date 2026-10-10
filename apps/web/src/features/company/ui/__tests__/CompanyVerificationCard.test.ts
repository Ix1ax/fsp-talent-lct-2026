import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Company,
  CompanyManagementApi,
  CompanyVerification,
} from '@/entities/company';

const remote = vi.hoisted(() => ({ data: {} as CompanyVerification }));
vi.mock('@/shared/hooks', () => ({
  useRemoteData: () => ({
    data: remote.data,
    loading: false,
    error: '',
    retry: vi.fn(),
    updateData: vi.fn(),
  }),
  useAsyncMutation: () => ({
    pending: false,
    error: '',
    run: vi.fn(),
    clearError: vi.fn(),
  }),
}));

import { CompanyVerificationCard } from '../CompanyVerificationCard';

const company: Company = {
  id: 'company',
  name: 'QA',
  inn: 'test-inn',
  description: null,
  contactEmail: 'qa@example.test',
  contactUrl: null,
  logoFileId: null,
  verificationStatus: 'unverified',
  createdAt: '2026-10-10T12:00:00Z',
  memberRole: 'owner',
};
const render = (patch: Partial<Company> = {}) =>
  renderToStaticMarkup(
    createElement(CompanyVerificationCard, {
      company: { ...company, ...patch },
      api: {} as CompanyManagementApi,
      active: true,
      pending: false,
      onCompanyChange: vi.fn(),
      onBusyChange: vi.fn(),
    }),
  );
beforeEach(() => {
  remote.data = {
    companyId: 'company',
    status: 'unverified',
    version: 0,
    requestedAt: null,
    reviewedAt: null,
    reason: null,
    documentIds: [],
  };
});

describe('company verification access and states', () => {
  it.each(['recruiter', 'viewer'] as const)(
    'lets %s see the result without submitting an application',
    (memberRole) => {
      const html = render({ memberRole });
      expect(html).toContain('Обновить статус');
      expect(html).toContain('Отправить заявку на проверку может владелец');
      expect(html).not.toContain('Отправить на проверку');
    },
  );
  it('requires INN before the owner can submit', () => {
    expect(render()).toMatch(/<button[^>]*>Отправить на проверку/);
    expect(render({ inn: null })).toMatch(
      /<button[^>]*disabled[^>]*>Отправить на проверку/,
    );
  });
  it.each(['pending', 'verified'] as const)(
    'does not offer another application while %s',
    (status) => {
      remote.data = { ...remote.data, status };
      expect(render()).not.toContain('Отправить на проверку');
      expect(render()).not.toContain('Отправить повторно');
    },
  );
  it('shows and escapes the rejection reason and allows the owner to resubmit', () => {
    remote.data = {
      ...remote.data,
      status: 'rejected',
      reason: '<script>reason</script>',
      documentIds: ['doc'],
    };
    const html = render();
    expect(html).toContain('Отправить повторно');
    expect(html).toContain('&lt;script&gt;reason&lt;/script&gt;');
    expect(html).not.toContain('<script>reason</script>');
    expect(html).toContain('Документов в заявке: 1');
  });
});
