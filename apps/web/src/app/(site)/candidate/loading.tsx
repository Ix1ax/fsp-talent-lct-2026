import { Skeleton } from '@/shared/ui';

export default function Loading() {
  return (
    <main
      className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10"
      aria-label="Загрузка профиля"
      aria-busy="true"
    >
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-48 w-full" />
    </main>
  );
}
