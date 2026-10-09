import { SPECIALIZATIONS } from '@/shared/contants';
import { Badge } from '@/shared/ui';

import type { CatalogItem } from '../model/types';

interface SpecializationBadgeProps {
  specialization?: CatalogItem;
  grade?: CatalogItem;
  active?: boolean;
}

export const SpecializationBadge = ({
  specialization,
  grade,
  active,
}: SpecializationBadgeProps) => (
  <span
    className="inline-flex shrink-0 overflow-hidden rounded-sm"
    aria-label={`${specialization?.name ?? 'Специализация не выбрана'}, ${grade?.name ?? 'любой грейд'}`}
  >
    <Badge
      className={
        active
          ? 'h-6 rounded-none font-mono text-[11px]'
          : 'h-6 rounded-none bg-caption font-mono text-[11px] text-primary-foreground'
      }
    >
      {specialization
        ? (SPECIALIZATIONS[specialization.code] ?? specialization.name)
        : '—'}
    </Badge>
    <Badge className="h-6 rounded-none bg-foreground font-mono text-xs text-background">
      {grade?.name ?? 'любой'}
    </Badge>
  </span>
);
