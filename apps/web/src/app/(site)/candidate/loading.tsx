import { Skeleton } from '@/shared/ui';

export default function Loading() {
  return (
    <main
      className="container-page page-rhythm flex flex-1 flex-col gap-8"
      role="status"
      aria-label="Загрузка кабинета"
      aria-busy="true"
    >
      <span className="sr-only">Загружаем кабинет…</span>
      <div aria-hidden="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="bg-foreground/10 h-8 w-48 max-w-full sm:h-9" />
        <Skeleton className="bg-foreground/10 h-24 w-full sm:h-12" />
      </div>
      <div
        aria-hidden="true"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-40 min-w-0 flex-col gap-3 rounded-xl border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="bg-foreground/10 h-4 w-16" />
              <Skeleton className="bg-foreground/10 size-4" />
            </div>
            <Skeleton className="bg-foreground/10 h-7 w-32 max-w-full" />
            <Skeleton className="bg-foreground/10 h-10 w-full" />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col items-start gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="grid w-full max-w-md gap-2">
          <Skeleton className="bg-foreground/10 h-6 w-44 max-w-full" />
          <Skeleton className="bg-foreground/10 h-5 w-full" />
        </div>
        <Skeleton className="bg-foreground/10 h-12 w-48 max-w-full shrink-0" />
      </div>
    </main>
  );
}
