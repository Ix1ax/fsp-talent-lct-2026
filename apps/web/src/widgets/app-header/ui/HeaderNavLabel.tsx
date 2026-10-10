import type { HeaderNavItem } from '../model';

interface HeaderNavLabelProps {
  item: HeaderNavItem;
}

/** Иконка и подпись пункта; во второй строке шапки — короткая подпись. */
export const HeaderNavLabel = ({ item }: HeaderNavLabelProps) => (
  <>
    <item.icon aria-hidden="true" />
    {item.shortLabel ? (
      <>
        <span data-header-label="" className="lg:hidden">
          {item.shortLabel}
        </span>
        <span data-header-label="" className="max-lg:hidden">
          {item.label}
        </span>
      </>
    ) : (
      <span data-header-label="">{item.label}</span>
    )}
  </>
);
