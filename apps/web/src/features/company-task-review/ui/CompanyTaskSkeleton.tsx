import { RemoteState, Skeleton } from '@/shared/ui';

interface CompanyTaskSkeletonProps {
  detail?: boolean;
  tasks?: boolean;
}

export const CompanyTaskSkeleton = ({
  detail = false,
  tasks = false,
}: CompanyTaskSkeletonProps) => {
  return (
    <RemoteState
      loading
      loadingLabel="Загружаем задания и решения…"
      loadingContent={
        <div
          className={`grid gap-3 motion-reduce:[&_[data-slot=skeleton]]:animate-none ${tasks ? 'md:grid-cols-2' : ''}`}
        >
          {Array.from({ length: detail ? 1 : 4 }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border bg-card p-5"
            >
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-10 w-40" />
              {detail && <Skeleton className="h-48 w-full" />}
            </div>
          ))}
        </div>
      }
    />
  );
};
