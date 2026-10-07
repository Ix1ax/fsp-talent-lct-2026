import { TIMEZONE_LABELS } from '@/shared/contants';
import type { Catalogs } from '@/entities/catalog';
import type { Recommendation } from '@/entities/employer-need';

interface MatchTableItemProps {
  candidate: Recommendation;
  catalogs: Catalogs;
  position: number;
}

const CONDITIONS: Record<string, string> = {
  work_format: 'формат работы',
  salary: 'зарплата',
  city: 'город',
  timezone: 'часовой пояс',
};

export const MatchTableItem = ({
  candidate,
  catalogs,
  position,
}: MatchTableItemProps) => {
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
    <article className="grid gap-3 border-b border-border p-4 xl:grid-cols-[150px_1fr] xl:px-5">
      <div>
        <p className="text-base font-semibold">Кандидат {position}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {location || 'Город и пояс не указаны'}
        </p>
      </div>
      <div className="grid gap-2">
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
      </div>
    </article>
  );
};
