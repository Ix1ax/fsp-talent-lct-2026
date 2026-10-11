import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, PageHeader } from '@/shared/ui';

export const AssessmentsHeader = () => {
  return (
    <PageHeader>
      <PageHeader.Row>
        <PageHeader.Content>
          <PageHeader.Title>Тестирование</PageHeader.Title>
          <PageHeader.Description>
            Подтвердите навыки и грейд. Результаты проверяются автоматически.
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
    </PageHeader>
  );
};
