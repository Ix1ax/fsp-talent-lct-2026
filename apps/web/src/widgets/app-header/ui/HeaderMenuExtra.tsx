import { HeaderNavLink, ThemeMenuItem } from '@/shared/ui';

import { GUIDES_NAV_ITEM } from '../model';
import { HeaderNavLabel } from './HeaderNavLabel';

/** Нижний блок меню-бургера: на телефоне справочник и тема убраны из шапки сюда. */
export const HeaderMenuExtra = () => (
  <>
    <HeaderNavLink href={GUIDES_NAV_ITEM.href} preserveDraft>
      <HeaderNavLabel item={GUIDES_NAV_ITEM} />
    </HeaderNavLink>
    <ThemeMenuItem />
  </>
);
