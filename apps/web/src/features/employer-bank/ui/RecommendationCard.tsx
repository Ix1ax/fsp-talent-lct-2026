import type { ReactNode } from 'react';
import { ChevronDownIcon, MapPinIcon, WalletIcon } from 'lucide-react';

import { TIMEZONE_LABELS } from '@/shared/contants';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import type { Recommendation } from '@/entities/employer-need';

import { formatUnknownConditions } from '../lib';
import {
  CriteriaPills,
  MATCH_CONDITION_LABELS,
  SkillPills,
} from './MatchCriteria';
import { MatchScoreRing } from './MatchScoreRing';

interface RecommendationCardProps {
  candidate: Recommendation;
  catalogs: Catalogs;
  position: number;
  heading?: string;
  onOpen?: () => void;
}

interface MetricProps {
  label: string;
  value: ReactNode;
  muted?: boolean;
}

const Metric = ({ label, value, muted }: MetricProps) => {
  return (
    <div className="grid gap-0.5 border-l border-border pl-3 first:border-0 first:pl-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-sm font-semibold tabular-nums',
          muted && 'font-normal text-muted-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
};

const formatPercent = (value: number | null | undefined, empty: string) =>
  value === null || value === undefined ? empty : `${Math.round(value)}%`;

const formatYears = (months: number) => {
  const years = Math.round((months / 12) * 10) / 10;
  return years ? `${years.toLocaleString('ru-RU')} г.` : 'нет';
};

export const RecommendationCard = ({
  candidate,
  catalogs,
  position,
  heading,
  onOpen,
}: RecommendationCardProps) => {
  const location = [
    candidate.city,
    candidate.timezone
      ? (TIMEZONE_LABELS[candidate.timezone] ?? candidate.timezone)
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const formats = catalogs.workFormats
    .filter((format) => candidate.workFormatIds.includes(format.id))
    .map((format) => format.name)
    .join(', ');
  const conditions = [
    formats || 'Формат не указан',
    candidate.salaryMinRub !== null
      ? `от ${new Intl.NumberFormat('ru-RU').format(candidate.salaryMinRub)} ₽/мес`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const unknownConditions = formatUnknownConditions(
    candidate.unknownConditions,
    MATCH_CONDITION_LABELS,
    candidate.skills,
  );

  return (
    <article className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm sm:p-6">
      <header className="flex items-start gap-4">
        {candidate.matchScore !== undefined && (
          <div className="grid shrink-0 justify-items-center gap-1">
            <MatchScoreRing value={candidate.matchScore} />
            <span className="text-xs text-muted-foreground">Совпадение</span>
          </div>
        )}
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h3 className="text-lg leading-tight font-semibold">
            {heading ?? `Кандидат ${position}`}
          </h3>
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">
              {location || 'Город и пояс не указаны'}
            </span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-sm">
            <WalletIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="truncate">{conditions}</span>
          </p>
        </div>
        {onOpen && (
          <Button variant="outline" className="max-sm:hidden" onClick={onOpen}>
            Открыть профиль
          </Button>
        )}
      </header>

      <dl className="grid max-w-xl grid-cols-3 gap-4">
        <Metric
          label="Тест"
          value={formatPercent(candidate.testScorePercent, 'не пройден')}
          muted={!candidate.testScorePercent}
        />
        <Metric
          label="Навыки"
          value={formatPercent(candidate.skillMatchScore, 'не заданы')}
          muted={
            candidate.skillMatchScore === null ||
            candidate.skillMatchScore === undefined
          }
        />
        <Metric
          label="Опыт"
          value={formatYears(candidate.experienceMonths)}
          muted={!candidate.experienceMonths}
        />
      </dl>

      {Boolean(candidate.criteria?.length || candidate.skills?.length) && (
        <div className="grid gap-3">
          {candidate.criteria?.length ? (
            <CriteriaPills criteria={candidate.criteria} />
          ) : null}
          {candidate.skills?.length ? (
            <SkillPills skills={candidate.skills} />
          ) : null}
        </div>
      )}

      {candidate.reasons.length > 0 && (
        <details className="group rounded-lg border border-border/70 px-3 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
            Почему такая оценка
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="grid gap-1.5 pb-3 text-sm text-muted-foreground">
            {candidate.reasons.map((reason, index) => (
              <li
                key={`${index}-${reason}`}
                className="flex gap-2 before:mt-2 before:size-1 before:shrink-0 before:rounded-full before:bg-muted-foreground/60"
              >
                {reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(unknownConditions || onOpen) && (
        <footer
          className={cn(
            'flex flex-wrap items-center justify-between gap-3',
            !unknownConditions && 'sm:hidden',
          )}
        >
          {unknownConditions && (
            <p className="text-xs text-muted-foreground">
              Нет данных для сравнения: {unknownConditions}
            </p>
          )}
          {onOpen && (
            <Button className="w-full sm:hidden" onClick={onOpen}>
              Открыть профиль
            </Button>
          )}
        </footer>
      )}
    </article>
  );
};
