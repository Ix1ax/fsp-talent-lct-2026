import { Card, CardContent, CardHeader, Skeleton } from '@/shared/ui';

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:px-6 sm:py-10"
      role="status"
      aria-label="Загрузка профиля"
      aria-busy="true"
    >
      <span className="sr-only">Загружаем профиль…</span>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-9 w-52 max-w-full" />
        <Skeleton className="h-5 w-48 max-w-full" />
        <Skeleton className="h-12 w-full max-w-2xl sm:h-6" />
      </div>
      <div
        aria-hidden="true"
        className="grid gap-2 rounded-lg border border-border bg-card p-4 sm:p-5"
      >
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="h-10 w-full max-w-lg sm:h-5" />
      </div>
      <div
        aria-hidden="true"
        className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]"
      >
        <div className="grid min-w-0 gap-3">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-11 w-full sm:hidden" />
          <div className="hidden grid-cols-3 gap-1 sm:grid lg:grid-cols-1">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="flex min-h-11 items-center px-3 py-3">
                <Skeleton className="h-5 w-32 max-w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid min-w-0 gap-5">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-56 max-w-full" />
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-3">
                <Skeleton className="size-36 rounded-full" />
                <Skeleton className="h-5 w-64 max-w-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="grid gap-2">
                    <Skeleton className="h-5 w-32 max-w-full" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-28 w-full" />
              </div>
              <Skeleton className="h-11 w-48 max-w-full" />
            </CardContent>
          </Card>
          <div className="grid gap-3 border-t border-border pt-5">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 w-48 max-w-[60%]" />
            </div>
            <Skeleton className="mx-auto h-10 w-full max-w-lg sm:h-5" />
          </div>
        </div>
      </div>
    </main>
  );
}
