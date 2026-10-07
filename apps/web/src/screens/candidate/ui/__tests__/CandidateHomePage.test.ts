import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { CandidateFullProfile } from '@/entities/candidate-profile';
import type { SessionUser } from '@/entities/session';

import { CandidateHomePage } from '../CandidateHomePage';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const user: SessionUser = {
  id: 'user',
  sub: 'subject',
  email: 'me@example.com',
  emailVerified: true,
  role: 'candidate',
  status: 'active',
};
const full: CandidateFullProfile = {
  profile: null,
  contacts: null,
  skills: [],
  category: null,
  achievements: [],
  consents: {
    currentPolicyVersion: 'v1',
    items: [
      {
        id: 'consent',
        kind: 'processing',
        policyVersion: 'v1',
        companyId: null,
        grantedAt: '',
        revokedAt: null,
      },
    ],
  },
  readiness: {
    percent: 25,
    readyToPublish: false,
    items: [
      {
        code: 'consent_publication',
        title: 'Согласие на публикацию',
        done: false,
        required: true,
      },
    ],
  },
};
const render = (initialFullProfile = full) =>
  renderToString(
    createElement(CandidateHomePage, { user, initialFullProfile }),
  );

describe('candidate profile steps', () => {
  it('keeps inactive forms mounted so switching steps can preserve drafts', () => {
    const html = render();
    expect(html.match(/role="tabpanel"/g)).toHaveLength(5);
    expect(
      html.match(
        /data-state="inactive" data-orientation="horizontal" role="tabpanel"/g,
      ),
    ).toHaveLength(4);
    expect(html).toContain('name="headline"');
    expect(html).toContain('name="fullName"');
    expect(html).toContain('id="candidate-skill-name"');
    expect(html).toContain('data-[state=inactive]:hidden');
    expect(html).not.toContain('>Пропустить<');
  });
  it('displays server readiness independently from navigation progress', () => {
    const html = render();
    expect(html.replace(/<!--.*?-->/g, '')).toContain('25%');
    expect(html).toContain('Согласие на публикацию');
    expect(html).toContain('Не выполнено');
    expect(html).toContain('aria-label="Шаги настройки профиля"');
    expect(html).toContain('aria-label="Готовность профиля по данным сервера"');
  });
  it('does not render private contact fields when processing is revoked', () => {
    const html = render({
      ...full,
      consents: { ...full.consents, items: [] },
      contacts: {
        fullName: 'Private',
        email: 'private@example.com',
        phone: null,
        telegram: null,
        updatedAt: '',
      },
    });
    expect(html).not.toContain('name="fullName"');
    expect(html).not.toContain('private@example.com');
    expect(html).toContain('Перейти к согласиям');
  });
});
