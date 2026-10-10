import { RefreshCwIcon } from 'lucide-react';

import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
import { Badge, Button, RecordItem } from '@/shared/ui';
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
    id={CANDIDATE_ELEMENT_IDS.consents.history}
    aria-label="История согласий"
    className="flex flex-col gap-3"
  >
    <Button
      variant="outline"
      size="sm"
      disabled={busy || loading}
      onClick={() => void onRefresh()}
      className="self-start"
    >
      <RefreshCwIcon aria-hidden="true" />
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
          <RecordItem
            key={consent.id}
            title={CONSENT_LABELS[consent.kind]}
            badges={
              <Badge variant={consent.revokedAt ? 'outline' : 'success'}>
                {consent.revokedAt ? 'Отозвано' : 'Действует'}
              </Badge>
            }
            meta={
              <>
                Версия {consent.policyVersion} · дано{' '}
                {formatDate(consent.grantedAt)} UTC
                {consent.revokedAt &&
                  ` · отозвано ${formatDate(consent.revokedAt)} UTC`}
              </>
            }
            subtitle={
              consent.companyId ? `Компания: ${consent.companyId}` : undefined
            }
          />
        ))}
      </ul>
    )}
  </section>
);
