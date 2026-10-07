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
    className="inline-flex shrink-0"
    aria-label={`${specialization?.name ?? 'Специализация не выбрана'}, ${grade?.name ?? 'любой грейд'}`}
  >
    <Badge
      className={
        active
          ? 'h-6 font-mono text-[11px]'
          : 'h-6 bg-caption font-mono text-[11px] text-primary-foreground'
      }
    >
      {specialization
        ? (SPECIALIZATIONS[specialization.code] ?? specialization.name)
        : '—'}
    </Badge>
    <Badge className="h-6 bg-foreground font-mono text-[11px] text-primary-foreground">
      {grade?.name ?? 'любой'}
    </Badge>
  </span>
);
