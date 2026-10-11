import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';

export const CandidateDevelopmentLinks = () => {
  return (
    <>
      <nav aria-label="Развитие и достижения" className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE_SURVEY}>
            Направление и уровень
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE_FSP}>Достижения ФСП</Link>
        </Button>
      </nav>
      <div className="flex flex-col items-start gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-medium">Подтвердите навыки</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Пройдите тесты по выбранному стеку и уровню.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
            Перейти к тестам
            <ArrowRightIcon />
          </Link>
        </Button>
      </div>
    </>
  );
};
