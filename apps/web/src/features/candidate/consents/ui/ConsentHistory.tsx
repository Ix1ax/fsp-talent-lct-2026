import { Button } from '@/shared/ui';
import type { CandidateConsents } from '@/entities/candidate';

import { CONSENT_LABELS } from '../model';

interface ConsentHistoryProps {
  history?: CandidateConsents;
  error: string;
  loading: boolean;
  busy: boolean;
  onRefresh: () => Promise<void>;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
};

export const ConsentHistory = ({
  history,
  error,
  loading,
  busy,
  onRefresh,
}: ConsentHistoryProps) => (
  <section
    id="consent-history"
    aria-label="История согласий"
    className="flex flex-col gap-3"
  >
    <Button
      variant="outline"
      disabled={busy || loading}
      onClick={() => void onRefresh()}
      className="self-start"
    >
      Обновить историю
    </Button>
    {loading && (
      <p role="status" className="text-sm text-muted-foreground">
        Загрузка истории…
      </p>
    )}
    {error && (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )}
    {history?.items.length === 0 && (
      <p className="text-sm text-muted-foreground">Согласий пока нет.</p>
    )}
    {history && history.items.length > 0 && (
      <ul className="flex flex-col gap-3">
        {history.items.map((consent) => (
          <li
            key={consent.id}
            className="rounded-lg border border-border p-3 text-sm"
          >
            <p className="font-medium">{CONSENT_LABELS[consent.kind]}</p>
            <p className="mt-1 text-muted-foreground">
              Версия: {consent.policyVersion}. Дано:{' '}
              {formatDate(consent.grantedAt)} UTC.
            </p>
            {consent.revokedAt ? (
              <p className="text-muted-foreground">
                Отозвано: {formatDate(consent.revokedAt)} UTC.
              </p>
            ) : (
              <p className="text-muted-foreground">Действует</p>
            )}
            {consent.companyId && (
              <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                Компания: {consent.companyId}
              </p>
            )}
          </li>
        ))}
      </ul>
    )}
  </section>
);
