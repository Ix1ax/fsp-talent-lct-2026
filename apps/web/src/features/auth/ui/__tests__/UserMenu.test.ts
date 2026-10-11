import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { APP_HEADER_ELEMENT_IDS } from '@/shared/contants';
import type { SessionUser } from '@/entities/session';

import { UserMenu } from '../UserMenu';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../model', () => ({ useAccountAvatar: () => undefined }));

const user: SessionUser = {
  id: 'user',
  sub: 'subject',
  email: 'me@example.com',
  emailVerified: true,
  role: 'candidate',
  status: 'active',
};

describe('UserMenu trigger ID', () => {
  it('keeps the header trigger ID stable across different render prefixes', () => {
    for (const identifierPrefix of ['server-', 'client-']) {
      const html = renderToString(
        createElement(UserMenu, {
          user,
          triggerId: APP_HEADER_ELEMENT_IDS.accountMenuTrigger,
        }),
        { identifierPrefix },
      );
      expect(html).toContain(
        `id="${APP_HEADER_ELEMENT_IDS.accountMenuTrigger}"`,
      );
      expect(html).toContain('aria-haspopup="menu"');
    }
  });

  it('preserves the default Radix ID in other menus', () => {
    const html = renderToString(createElement(UserMenu, { user }));
    expect(html).toMatch(/id="radix-[^"]+"/);
    expect(html).not.toContain(
      `id="${APP_HEADER_ELEMENT_IDS.accountMenuTrigger}"`,
    );
  });
});
