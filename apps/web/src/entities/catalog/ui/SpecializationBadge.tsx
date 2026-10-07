import { Badge } from '@/shared/ui';

import type { CatalogItem } from '../model/types';
const abbreviations: Record<string, string> = {
  frontend: 'FE',
  backend: 'BE',
  mobile: 'MOB',
  qa: 'QA',
  data: 'DATA',
  devops: 'OPS',
};
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
        ? (abbreviations[specialization.code] ?? specialization.name)
        : '—'}
    </Badge>
    <Badge className="h-6 bg-foreground font-mono text-[11px] text-primary-foreground dark:text-background">
      {grade?.name ?? 'любой'}
    </Badge>
  </span>
);
