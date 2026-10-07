import { Skeleton } from '@/shared/ui';

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8 sm:px-6 sm:py-10"
      aria-label="Загрузка профиля"
      aria-busy="true"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-48 max-w-full" />
        <Skeleton className="h-12 w-full sm:h-6" />
      </div>
      <Skeleton className="h-44 w-full sm:h-36" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-48 w-full" />
    </main>
  );
}
