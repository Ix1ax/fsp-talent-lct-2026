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
import type { Catalogs, Skill } from '@/entities/catalog';

import { getAssessmentReasonText, getAssessmentTitle } from '../lib';

interface AvailableAssessmentCardProps {
  test: AvailableAssessment;
  catalogs?: Catalogs;
  skills?: Skill[];
  disabled: boolean;
  onSelect: (test: AvailableAssessment) => void;
}

export const AvailableAssessmentCard = ({
  test,
  catalogs,
  skills = [],
  disabled,
  onSelect,
}: AvailableAssessmentCardProps) => {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="wrap-anywhere">
          {getAssessmentTitle(test, catalogs, skills)}
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
        {/* Статус слева, главное действие справа — как в карточках предложений. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">
              {getAssessmentReasonText(test)}
            </p>
            {test.reason === 'consent_required' && (
              <Link
                href={STATIC_ROUTES.CANDIDATE}
                className="text-sm underline"
              >
                Настроить согласия
              </Link>
            )}
          </div>
          <Button
            className="h-auto min-h-11 w-full shrink-0 whitespace-normal sm:w-auto"
            disabled={!test.canStart || disabled}
            onClick={() => onSelect(test)}
          >
            Начать тест
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
