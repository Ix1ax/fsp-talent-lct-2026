import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, PageHeader } from '@/shared/ui';

interface CandidatePageHeaderProps {
  title: string;
  description: string;
  /** Кнопка «В кабинет»; у редактора профиля её нет. */
  back?: boolean;
}

/** Статичная шапка страницы кандидата: видна сразу, в том числе в скелетоне загрузки. */
export const CandidatePageHeader = ({
  title,
  description,
  back = true,
}: CandidatePageHeaderProps) => {
  return (
    <PageHeader>
      <PageHeader.Row>
        <PageHeader.Content>
          <PageHeader.Title>{title}</PageHeader.Title>
          <PageHeader.Description>{description}</PageHeader.Description>
        </PageHeader.Content>
        {back && (
          <PageHeader.Actions>
            <Button asChild variant="outline">
              <Link href={STATIC_ROUTES.CANDIDATE}>
                <ArrowLeftIcon aria-hidden="true" />В кабинет
              </Link>
            </Button>
          </PageHeader.Actions>
        )}
      </PageHeader.Row>
    </PageHeader>
  );
};
