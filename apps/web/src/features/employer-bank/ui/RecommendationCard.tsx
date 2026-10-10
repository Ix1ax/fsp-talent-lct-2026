import { TIMEZONE_LABELS } from '@/shared/contants';
import { Button } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import type { Recommendation } from '@/entities/employer-need';

interface RecommendationCardProps {
  candidate: Recommendation;
  catalogs: Catalogs;
  position: number;
  onOpen?: () => void;
}

const CONDITIONS: Record<string, string> = {
  work_format: 'формат работы',
  specialization: 'специализация',
  grade: 'грейд',
  skills: 'навыки',
  salary: 'зарплата',
  city: 'город',
  timezone: 'часовой пояс',
};

export const RecommendationCard = ({
  candidate,
  catalogs,
  position,
  onOpen,
}: RecommendationCardProps) => {
  const location = [
    candidate.city,
    candidate.timezone
      ? `Часовой пояс: ${TIMEZONE_LABELS[candidate.timezone] ?? candidate.timezone}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const formats = catalogs.workFormats
    .filter((format) => candidate.workFormatIds.includes(format.id))
    .map((format) => format.name)
    .join(', ');
  const unknownConditions = candidate.unknownConditions
    .map((condition) => CONDITIONS[condition] ?? condition)
    .join(', ');

  return (
    <article className="grid min-w-0 gap-3 rounded-xl border border-border bg-card p-5 xl:grid-cols-[150px_minmax(0,1fr)] xl:p-6">
      <div>
        <p className="text-base font-semibold">Кандидат {position}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {location || 'Город и пояс не указаны'}
        </p>
      </div>
      <div className="grid gap-2">
        {candidate.matchScore !== undefined && (
          <p className="font-medium">
            Совпадение с требованиями: {candidate.matchScore}%
          </p>
        )}
        {candidate.testScorePercent !== undefined && (
          <p className="text-sm text-muted-foreground">
            Результат теста:{' '}
            {candidate.testScorePercent === null
              ? 'нет подтверждения'
              : `${candidate.testScorePercent}%`}
          </p>
        )}
        {candidate.skillMatchScore !== undefined && (
          <p className="text-sm text-muted-foreground">
            Совпадение навыков:{' '}
            {candidate.skillMatchScore === null
              ? 'требования не заданы'
              : `${candidate.skillMatchScore}%`}
          </p>
        )}
        {candidate.criteria?.map((item) => (
          <p key={item.code} className="text-sm text-muted-foreground">
            {CONDITIONS[item.code] ?? item.code}:{' '}
            {
              {
                matched: 'совпадает',
                mismatched: 'не совпадает',
                partial: 'частичное совпадение',
                unknown: 'нет данных',
              }[item.status]
            }
          </p>
        ))}
        {candidate.skills?.map((skill) => (
          <p key={skill.id} className="text-sm">
            {skill.name}:{' '}
            {
              {
                test: 'подтверждён тестом',
                claimed: 'заявлен кандидатом',
                missing: 'нет данных',
              }[skill.source]
            }
            {skill.required ? ' · обязательный' : ''}
          </p>
        ))}
        {candidate.reasons.length ? (
          <ul className="list-inside list-disc space-y-1 text-sm">
            {candidate.reasons.map((reason, index) => (
              <li key={`${index}-${reason}`}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Совпадения не подтверждены</p>
        )}
        {candidate.unknownConditions.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Не указаны: {unknownConditions}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {formats || 'Формат не указан'}
          {candidate.salaryMinRub !== null
            ? ` · от ${new Intl.NumberFormat('ru-RU').format(candidate.salaryMinRub)} ₽/мес`
            : ''}
        </p>
        {onOpen && (
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={onOpen}
          >
            Открыть профиль
          </Button>
        )}
      </div>
    </article>
  );
};
