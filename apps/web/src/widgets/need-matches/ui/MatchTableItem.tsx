import type { Catalogs } from '@/entities/catalog';
import type { Recommendation } from '@/entities/employer-need';

interface MatchTableItemProps {
  candidate: Recommendation;
  catalogs: Catalogs;
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
}: MatchTableItemProps) => {
  const location = [candidate.city, candidate.timezone]
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
        <p className="font-mono text-sm font-medium">
          Профиль · {candidate.id.slice(0, 8)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {location || 'Город и пояс не указаны'}
        </p>
      </div>
      <div className="grid gap-1.5">
        <p className="text-[13px]">
          {candidate.reasons.join(' · ') || 'Совпадения не подтверждены'}
        </p>
        {candidate.unknownConditions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Неизвестно: {unknownConditions}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formats || 'Формат не указан'}
          {candidate.salaryMinRub !== null
            ? ` · от ${new Intl.NumberFormat('ru-RU').format(candidate.salaryMinRub)} ₽/мес`
            : ''}
        </p>
      </div>
    </article>
  );
};
