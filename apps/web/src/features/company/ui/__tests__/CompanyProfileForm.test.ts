import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { Company } from '@/entities/company';

import { CompanyProfileForm } from '../CompanyProfileForm';

const company: Company = {
  id: 'company',
  name: 'Команда',
  contactEmail: 'hr@example.org',
  contactUrl: null,
  description: null,
  inn: null,
  logoFileId: null,
  verificationStatus: 'verified',
  memberRole: 'owner',
  createdAt: '',
};
const render = (memberRole: Company['memberRole']) =>
  renderToString(
    createElement(CompanyProfileForm, {
      company: { ...company, memberRole },
      pending: false,
      error: '',
      onSave: vi.fn(async () => company),
      onSaved: vi.fn(),
      onDirtyChange: vi.fn(),
    }),
  );
describe('company profile access', () => {
  it('allows an owner to save and keeps verification read-only', () => {
    const html = render('owner');
    expect(html).toContain('Сохранить изменения');
    expect(html).toContain('Проверена');
    expect(html).not.toContain('name="verificationStatus"');
  });
  it.each(['recruiter', 'viewer'] as const)(
    'does not offer profile mutations to %s',
    (role) => {
      const html = render(role);
      expect(html).toContain('disabled=""');
      expect(html).not.toContain('Сохранить изменения');
    },
  );
});
