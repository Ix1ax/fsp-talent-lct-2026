import { expect, it, vi } from 'vitest';

import AdminSectionPage from '../page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('404');
  },
}));
vi.mock('@/screens/admin', () => ({
  AccountsPage: vi.fn(),
  AuditPage: vi.fn(),
  CatalogsPage: vi.fn(),
  ModerationPage: vi.fn(),
  OperationsPage: vi.fn(),
  QuestionsPage: vi.fn(),
  StatisticsPage: vi.fn(),
  TemplatesPage: vi.fn(),
}));
it.each([
  'catalogs',
  'moderation',
  'questions',
  'templates',
  'admins',
  'overview',
  'audit',
  'companies',
  'users',
  'needs',
  'offers',
  'tasks',
  'attempts',
])('renders only a registered section: %s', async (section) => {
  const element = await AdminSectionPage({
    params: Promise.resolve({ section }),
  });
  expect(typeof element.props.children.type).toBe('function');
});
it.each(['unknown', 'constructor', 'toString', '__proto__', 'hasOwnProperty'])(
  'returns 404 for %s',
  async (section) => {
    await expect(
      AdminSectionPage({ params: Promise.resolve({ section }) }),
    ).rejects.toThrow('404');
  },
);
