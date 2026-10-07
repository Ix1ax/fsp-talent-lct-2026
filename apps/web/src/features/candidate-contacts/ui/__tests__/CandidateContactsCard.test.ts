import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { CandidateConsents } from '@/entities/candidate-consent';

import { CandidateContactsCard } from '../CandidateContactsCard';

const contacts = {
  fullName: 'Private Person',
  email: 'private@example.com',
  phone: '+79991234567',
  telegram: '@private_person',
  updatedAt: '2026-10-07T00:00:00Z',
};
const render = (consents: CandidateConsents, saved = contacts) =>
  renderToString(
    createElement(CandidateContactsCard, {
      contacts: saved,
      consents,
      defaultEmail: 'account@example.com',
      busy: false,
      onBusyChange: () => {},
      onContactsChange: () => {},
      onConsentRequired: async () => {},
    }),
  );
const consent = {
  id: 'consent',
  kind: 'processing' as const,
  policyVersion: 'v1',
  companyId: null,
  grantedAt: '2026-10-07T00:00:00Z',
  revokedAt: null,
};

describe('private contacts access', () => {
  it('does not render private values without processing consent', () => {
    const html = render({ currentPolicyVersion: 'v1', items: [] });
    for (const value of Object.values(contacts)) {
      expect(html).not.toContain(value);
    }
    expect(html).not.toContain('<input');
    expect(html).toContain('href="#consents"');
  });

  it('renders the four editable fields with active processing consent', () => {
    const html = render({ currentPolicyVersion: 'v1', items: [consent] });
    expect(html).not.toContain('href="#consents"');
    for (const name of ['fullName', 'email', 'phone', 'telegram']) {
      expect(html).toContain(`name="${name}"`);
    }
  });

  it('does not grant access for revoked processing or publication alone', () => {
    const html = render({
      currentPolicyVersion: 'v1',
      items: [
        { ...consent, revokedAt: '2026-10-07T01:00:00Z' },
        { ...consent, id: 'publication', kind: 'publication' },
      ],
    });
    expect(html).not.toContain('<input');
    expect(html).not.toContain(contacts.email);
  });
});
