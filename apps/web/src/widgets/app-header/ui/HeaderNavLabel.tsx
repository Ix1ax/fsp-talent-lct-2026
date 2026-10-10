import type { HeaderNavItem } from '../model';

interface HeaderNavLabelProps {
  item: HeaderNavItem;
}

/**
 * Иконка и подпись пункта. Короткую подпись шапка показывает до 2xl,
 * меню-бургер — всегда полную. Какую скрыть, решает контейнер.
 */
export const HeaderNavLabel = ({ item }: HeaderNavLabelProps) => (
  <>
    <item.icon aria-hidden="true" />
    {item.shortLabel ? (
      <>
        <span data-label-short="">{item.shortLabel}</span>
        <span data-label-full="">{item.label}</span>
      </>
    ) : (
      <span>{item.label}</span>
    )}
  </>
);
