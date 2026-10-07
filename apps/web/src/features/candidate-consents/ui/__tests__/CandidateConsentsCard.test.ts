import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CandidateConsents } from '@/entities/candidate';

import { CandidateConsentsCard } from '../CandidateConsentsCard';

const { grant, revoke, getHistory } = vi.hoisted(() => ({
  grant: vi.fn(),
  revoke: vi.fn(),
  getHistory: vi.fn(),
}));

vi.mock('@/entities/candidate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/candidate')>()),
  grantCandidateConsent: grant,
  revokeCandidateConsent: revoke,
  getCandidateConsents: getHistory,
}));

const render = (consents: CandidateConsents) =>
  renderToString(
    createElement(CandidateConsentsCard, {
      consents,
      busy: false,
      onBusyChange: vi.fn(),
      onConsentsChange: vi.fn(),
      onRevoked: vi.fn(),
      onRefreshProfile: vi.fn(),
    }),
  );

beforeEach(() => vi.clearAllMocks());

describe('candidate consents card', () => {
  it('offers explicit consent actions without granting consent on render', () => {
    const html = render({ currentPolicyVersion: 'v2', items: [] });
    expect(html).toContain('v2');
    expect(html).toContain('Обработка персональных данных');
    expect(html).toContain('Публикация профиля');
    expect(html.match(/Ознакомиться и дать согласие/g)).toHaveLength(2);
    expect(grant).not.toHaveBeenCalled();
    expect(getHistory).not.toHaveBeenCalled();
  });
  it('offers withdrawal for active consents and regrant for revoked consents', () => {
    const html = render({
      currentPolicyVersion: 'v2',
      items: [
        {
          id: 'processing',
          kind: 'processing',
          policyVersion: 'v1',
          companyId: null,
          grantedAt: 'now',
          revokedAt: null,
        },
        {
          id: 'publication',
          kind: 'publication',
          policyVersion: 'v1',
          companyId: null,
          grantedAt: 'now',
          revokedAt: 'revoked',
        },
      ],
    });
    expect(html.match(/>Отозвать</g)).toHaveLength(1);
    expect(html.match(/Ознакомиться и дать согласие/g)).toHaveLength(1);
    expect(revoke).not.toHaveBeenCalled();
  });

  it('disables granting consent when the policy version is unavailable', () => {
    const html = render({ currentPolicyVersion: '', items: [] });
    expect(html).toContain('Версия политики недоступна');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
