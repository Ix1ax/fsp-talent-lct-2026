import { Skeleton } from '@/shared/ui';

export default function Loading() {
  return (
    <main
      className="container-page page-rhythm flex flex-1 flex-col gap-8"
      aria-label="Загрузка справочника"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64 sm:h-9 max-w-full" />
        <Skeleton className="h-16 w-full max-w-2xl sm:h-12" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-56 max-w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </main>
  );
}
