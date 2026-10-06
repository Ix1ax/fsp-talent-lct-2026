import { Skeleton } from '@/shared/ui';

export default function Loading() {
  return (
    <main
      className="mx-auto flex max-w-285 flex-col gap-8 px-8 py-10 max-md:px-5"
      aria-label="Загрузка справочника"
    >
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-44" />
    </main>
  );
}
