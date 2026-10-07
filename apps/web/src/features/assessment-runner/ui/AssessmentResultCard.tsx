import Link from 'next/link';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import type { AssessmentResult } from '@/entities/assessment';

import { useAssessmentResultSync } from '../model';
interface AssessmentResultCardProps {
  result: AssessmentResult;
}
export const AssessmentResultCard = ({ result }: AssessmentResultCardProps) => {
  const { syncError, retrySync } = useAssessmentResultSync(result);
  return (
    <section
      className="flex flex-col gap-5"
      aria-labelledby="assessment-result-title"
    >
      <Card>
        <CardHeader>
          <CardTitle id="assessment-result-title">
            {result.passed ? 'Тест пройден' : 'Тест не пройден'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-3xl font-semibold">{result.scorePercent}%</p>
          <p>Проходной балл: {result.passScore}%</p>
          {result.category && (
            <p>
              Подтверждённая категория:{' '}
              <strong>
                {result.category.specialization} · {result.category.grade}
              </strong>
            </p>
          )}
          {result.retryAt && (
            <p>Пересдача доступна {formatDate(result.retryAt)}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Доступность следующего грейда проверяется в списке тестов.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Результаты по навыкам</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {result.skills.map((skill) => (
              <li
                key={skill.skillId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 wrap-anywhere">
                  <p className="font-medium">{skill.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Результат: {skill.percent}%
                  </p>
                </div>
                {skill.confirmed ? (
                  <Badge>Подтверждённый уровень: {skill.level}/5</Badge>
                ) : (
                  <Badge variant="outline">Не подтверждён</Badge>
                )}
              </li>
            ))}
          </ul>
          {!result.skills.length && <p>Результатов по навыкам нет.</p>}
        </CardContent>
      </Card>
      {syncError && (
        <div role="alert">
          <p>{syncError}</p>
          <Button variant="outline" onClick={retrySync}>
            Повторить обновление
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/candidate">Посмотреть профиль</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/candidate/assessments">К списку тестов</Link>
        </Button>
      </div>
    </section>
  );
};
