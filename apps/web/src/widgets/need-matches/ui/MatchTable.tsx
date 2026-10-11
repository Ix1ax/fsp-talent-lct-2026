'use client';
import { PageControls } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import { getRecommendations } from '@/entities/employer-need';

import { useNeedMatches } from '../model';
import { MatchTableContent } from './MatchTableContent';

/** Пояснение к режиму подбора — только когда он отличается от обычного. */
const getMatchingModeNote = (mode: string) =>
  mode === 'conditions_only'
    ? 'Подбор только по условиям работы — навыки не сравнивались.'
    : null;

const CRITERIA_LABELS: Record<string, string> = {
  specialization: 'специализация',
  grade: 'грейд',
  skills: 'навыки',
  work_format: 'формат работы',
  salary: 'зарплата',
  city: 'город',
  timezone: 'часовой пояс',
};

interface MatchingNoteProps {
  mode: string;
  unassessed: string[];
}

const MatchingNote = ({ mode, unassessed }: MatchingNoteProps) => {
  const note = getMatchingModeNote(mode);
  if (!note && unassessed.length === 0) return null;
  return (
    <p className="px-5 pt-4 text-sm text-muted-foreground">
      {note}{' '}
      {unassessed.length > 0 &&
        `Не оценены: ${unassessed.map((criterion) => CRITERIA_LABELS[criterion] ?? criterion).join(', ')}.`}
    </p>
  );
};

interface MatchTableProps {
  companyId: string;
  needId: string;
  catalogs: Catalogs;
  load?: typeof getRecommendations;
  onOpenCandidate?: (id: string) => void;
}

export const MatchTable = ({
  companyId,
  needId,
  catalogs,
  load = getRecommendations,
  onOpenCandidate,
}: MatchTableProps) => {
  const { data, error, offset, setOffset, retry } = useNeedMatches(
    companyId,
    needId,
    load,
  );

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-label="Подборка кандидатов"
    >
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold">
          Подборка кандидатов {data ? `· ${data.total}` : ''}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Сходство с требованиями потребности по квалификации и условиям работы.
        </p>
      </div>
      <MatchTableContent
        data={data}
        error={error}
        offset={offset}
        retry={retry}
        catalogs={catalogs}
        onOpenCandidate={onOpenCandidate}
      />
      {data && (
        <div className="p-4">
          <PageControls
            offset={offset}
            count={data.items.length}
            limit={data.limit}
            total={data.total}
            onPage={setOffset}
          />
        </div>
      )}
      {data && data.total > 0 && (
        <MatchingNote
          mode={data.matchingMode}
          unassessed={data.unassessedCriteria}
        />
      )}
      <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        Профили обезличены. Оценка совпадения показывает сходство с
        требованиями, а не вероятность найма.
      </p>
    </section>
  );
};
