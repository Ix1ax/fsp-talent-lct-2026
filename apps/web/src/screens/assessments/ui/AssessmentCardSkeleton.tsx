import { Skeleton } from '@/shared/ui';

/** Повторяет карточку теста: название, три показателя, статус и кнопку. */
export const AssessmentCardSkeleton = () => {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6">
      <Skeleton className="h-6 w-56 max-w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="grid gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
};
