import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CandidateProfileForm } from '../CandidateProfileForm';

vi.mock('@/entities/candidate-profile/api', () => ({
  createCandidateProfile: vi.fn(),
  getCandidateProfileClient: vi.fn(),
  updateCandidateProfile: vi.fn(),
}));

describe('CandidateProfileForm', () => {
  it('renders nested fields with the explicit form control', () => {
    const html = renderToString(
      createElement(CandidateProfileForm, {
        busy: false,
        consents: { currentPolicyVersion: 'v1', items: [] },
        onConsentRequired: vi.fn(),
        onBusyChange: vi.fn(),
        onProfileChange: vi.fn(),
        workFormats: [{ id: 1, code: 'remote', name: 'Удалённо' }],
      }),
    );
    expect(html).toContain('profile-timezone');
    expect(html).toContain('Не указан');
    expect(html).toContain('Удалённо');
    expect(html).toContain('Создать профиль');
  });
});
