import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { Company } from '@/entities/company';

import type { EmployerGateway } from '../../lib/gateway';
import { EmployerCompanyProfile } from '../EmployerCompanyProfile';

const company: Company = {
  id: 'company',
  name: 'Команда',
  contactEmail: 'hr@example.org',
  contactUrl: 'https://example.org/careers',
  description: '<script>example</script>\nВторая строка',
  inn: null,
  logoFileId: null,
  verificationStatus: 'verified',
  memberRole: 'owner',
  createdAt: '2026-10-09T10:00:00Z',
};
const render = (patch: Partial<Company> = {}) =>
  renderToString(
    createElement(EmployerCompanyProfile, {
      company: { ...company, ...patch },
      api: {} as EmployerGateway,
      catalogs: { specializations: [], grades: [], workFormats: [] },
      skills: [],
      revision: 0,
      visible: false,
      busy: false,
      dirty: false,
      error: '',
      onSave: vi.fn(async () => company),
      onDirtyChange: vi.fn(),
      onEdit: vi.fn(),
      onCompanies: vi.fn(),
      onVacancies: vi.fn(),
      onOpenNeed: vi.fn(),
    }),
  );

describe('company profile viewing', () => {
  it('starts in view mode and offers editing to the owner', () => {
    const html = render();
    expect(html).toContain('Редактировать');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
    expect(html).toContain('mailto:hr@example.org');
    expect(html).toContain('&lt;script&gt;example&lt;/script&gt;');
    expect(html).not.toContain('<script>example');
  });
  it.each(['viewer', 'recruiter'] as const)(
    'lets %s view the company without offering profile editing',
    (memberRole) => {
      const html = render({ memberRole });
      expect(html).not.toContain('Редактировать');
      expect(html).toContain('О компании');
      expect(html).toContain('hr@example.org');
    },
  );
  it('does not turn unsafe or credential-bearing company URLs into links', () => {
    for (const contactUrl of [
      'javascript:alert(1)',
      'https://user:secret@example.org',
    ]) {
      const html = render({ contactUrl });
      expect(html).not.toContain(contactUrl);
      expect(html).toContain('Сайт и контакты');
    }
    expect(render()).toContain('href="https://example.org/careers"');
  });
});
