import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/shared/ui';
import type {
  CandidateFullProfile,
  CandidateProfile,
} from '@/entities/candidate';
import type { SessionUser } from '@/entities/session';

import { CandidateHomePage } from '../CandidateHomePage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/candidate/consents',
}));
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
    createElement(
      TooltipProvider,
      null,
      createElement(CandidateHomePage, { user, initialFullProfile }),
    ),
  );

const existingProfile: CandidateProfile = {
  id: 'profile',
  avatarFileId: null,
  headline: null,
  summary: null,
  city: null,
  timezone: null,
  experienceMonths: 0,
  salaryMinRub: null,
  searchStatus: 'hidden',
  workFormatIds: [],
  updatedAt: '',
};

describe('candidate profile steps', () => {
  it('places navigation before the form and offers continuation after processing consent', () => {
    const html = render();
    expect(html.indexOf('aria-label="Разделы профиля"')).toBeLessThan(
      html.indexOf('name="headline"'),
    );
    expect(html).toContain('Перейти к профилю');
    expect(html).toContain('Сохранить и продолжить');
    expect(html).toContain('Публикацию можно разрешить позже');
  });
  it('keeps inactive forms mounted so switching steps can preserve drafts', () => {
    const html = render();
    expect(html.match(/<section hidden=""/g)).toHaveLength(6);
    expect(html).toContain('name="headline"');
    expect(html).toContain('name="fullName"');
    expect(html).toContain('id="candidate-skill-name"');
    expect(html).toContain('Опыт работы');
    expect(html).toContain('Образование');
    expect(html).toContain(
      'Сначала создайте профиль, чтобы добавлять опыт работы.',
    );
    expect(html).not.toContain('>Пропустить<');
  });
  it('displays server readiness independently from navigation progress', () => {
    const html = render();
    expect(html.replace(/<!--.*?-->/g, '')).toContain('25%');
    expect(html).toContain('Согласие на публикацию');
    expect(html).toContain('Не выполнено');
    expect(html).toContain('aria-label="Разделы профиля"');
    expect(html).toContain('aria-label="Готовность профиля по данным сервера"');
  });
  it.each([
    ['open', 'Активно ищу'],
    ['passive', 'Рассматриваю предложения'],
    ['hidden', 'Профиль скрыт'],
  ] as const)(
    'shows the saved search status %s and an edit action',
    (searchStatus, label) => {
      const html = render({
        ...full,
        profile: { ...existingProfile, searchStatus },
      });
      expect(html).toContain(`<span class="block font-medium">${label}</span>`);
      expect(html).toContain('Изменить статус поиска');
      expect(html).not.toContain('Выберите статус поиска');
    },
  );
  it('shows profile creation links for both career sections before a profile exists', () => {
    const html = render();
    expect(html).toContain(
      'Сначала создайте профиль, чтобы добавлять образование.',
    );
    expect(html.match(/>Перейти к профилю</g)).toHaveLength(3);
    expect(html).not.toContain('>Добавить место работы<');
    expect(html).not.toContain('>Добавить образование<');
  });
  it('offers career sections with an existing profile and revoked processing', () => {
    const html = render({
      ...full,
      profile: existingProfile,
      consents: { ...full.consents, items: [] },
    });
    expect(html).toContain('Добавить место работы');
    expect(html).toContain('Добавить образование');
    expect(html).not.toContain('Сначала создайте профиль, чтобы добавлять');
    expect(html).not.toContain('name="fullName"');
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
