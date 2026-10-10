import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';

interface TasksShellProps {
  children: ReactNode;
  title: string;
  history?: boolean;
  detail?: boolean;
}

export const TasksShell = ({
  children,
  title,
  history = false,
  detail = false,
}: TasksShellProps) => {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {detail ? (
        <nav
          aria-label="Навигация задания"
          className="flex items-center justify-between gap-4 border-b pb-5"
        >
          <Link
            href={STATIC_ROUTES.CANDIDATE_TASKS}
            className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Все задания
          </Link>
          <Button asChild variant="ghost">
            <Link href={STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}>
              Мои решения
            </Link>
          </Button>
        </nav>
      ) : (
        <>
          <Link
            href={STATIC_ROUTES.CANDIDATE}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Мой кабинет
          </Link>
          <header className="space-y-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="max-w-2xl text-muted-foreground">
              Решайте практические задания компаний и получайте обратную связь
              от работодателей.
            </p>
          </header>
          <nav aria-label="Задания компаний" className="flex flex-wrap gap-2">
            <Button asChild variant={history ? 'outline' : 'default'}>
              <Link
                href={STATIC_ROUTES.CANDIDATE_TASKS}
                aria-current={history ? undefined : 'page'}
              >
                Все задания
              </Link>
            </Button>
            <Button asChild variant={history ? 'default' : 'outline'}>
              <Link
                href={STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}
                aria-current={history ? 'page' : undefined}
              >
                Мои решения
              </Link>
            </Button>
          </nav>
        </>
      )}
      {children}
    </main>
  );
};
