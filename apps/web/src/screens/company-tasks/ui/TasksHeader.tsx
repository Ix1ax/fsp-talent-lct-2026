import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, PageHeader } from '@/shared/ui';

interface TasksHeaderProps {
  title: string;
  history: boolean;
  detail: boolean;
}

export const TasksHeader = ({ title, history, detail }: TasksHeaderProps) => {
  if (detail) {
    return (
      <nav
        aria-label="Навигация задания"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE_TASKS}>
            <ArrowLeftIcon aria-hidden="true" />
            Все задания
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}>
            Мои решения
          </Link>
        </Button>
      </nav>
    );
  }

  return (
    <PageHeader>
      <PageHeader.Row>
        <PageHeader.Content>
          <PageHeader.Title>{title}</PageHeader.Title>
          <PageHeader.Description>
            Решайте практические задания компаний и получайте обратную связь от
            работодателей.
          </PageHeader.Description>
        </PageHeader.Content>
        <PageHeader.Actions>
          <Button asChild variant="outline">
            <Link href={STATIC_ROUTES.CANDIDATE}>
              <ArrowLeftIcon aria-hidden="true" />В кабинет
            </Link>
          </Button>
        </PageHeader.Actions>
      </PageHeader.Row>
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
    </PageHeader>
  );
};
