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
        <span className="lg:hidden">{item.shortLabel}</span>
        <span className="max-lg:hidden">{item.label}</span>
      </>
    ) : (
      item.label
    )}
  </>
);
