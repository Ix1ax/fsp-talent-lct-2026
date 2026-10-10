import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import type { AvailableAssessment } from '@/entities/assessment';
import type { Catalogs } from '@/entities/catalog';

import { getAssessmentReasonText, getAssessmentTitle } from '../lib';

interface AvailableAssessmentCardProps {
  test: AvailableAssessment;
  catalogs?: Catalogs;
  disabled: boolean;
  onSelect: (test: AvailableAssessment) => void;
}

export const AvailableAssessmentCard = ({
  test,
  catalogs,
  disabled,
  onSelect,
}: AvailableAssessmentCardProps) => {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="wrap-anywhere">
          {getAssessmentTitle(test, catalogs)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {test.confirmed && (
          <Badge variant="secondary">Уровень подтверждён</Badge>
        )}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Задания</dt>
            <dd className="mt-1 font-medium">{test.questionCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Время</dt>
            <dd className="mt-1 font-medium">
              {Math.ceil(test.timeLimitSec / 60)} мин
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Проходной балл</dt>
            <dd className="mt-1 font-medium">{test.passScore}%</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          {getAssessmentReasonText(test)}
        </p>
        {test.reason === 'consent_required' && (
          <Link href={STATIC_ROUTES.CANDIDATE} className="text-sm underline">
            Настроить согласия
          </Link>
        )}
        <Button
          className="h-auto min-h-11 w-full whitespace-normal sm:w-auto sm:self-start"
          disabled={!test.canStart || disabled}
          onClick={() => onSelect(test)}
        >
          Начать тест
        </Button>
      </CardContent>
    </Card>
  );
};
