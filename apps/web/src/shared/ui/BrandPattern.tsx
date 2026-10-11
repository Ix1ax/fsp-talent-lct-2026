import { cn } from '@/shared/lib/utils';

interface BrandPatternProps {
  /** Позиционирование слоя. По умолчанию растягивается на родителя. */
  className?: string;
}

/** Фирменный фон: размытая сетка знаков Скаута, едва заметная. */
export const BrandPattern = ({ className }: BrandPatternProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      <div className="absolute -inset-2 bg-[url('/brand/scout-mark-on-light.svg')] bg-size-[300px_350px] bg-repeat opacity-[0.035] blur-[3px] dark:hidden" />
      <div className="absolute -inset-2 hidden bg-[url('/brand/scout-mark.svg')] bg-size-[300px_350px] bg-repeat opacity-[0.015] blur-[3px] dark:block" />
    </div>
  );
};
