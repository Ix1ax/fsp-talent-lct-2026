import { RefreshCwIcon } from 'lucide-react';

import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
import { Badge, Button, RecordItem, RemoteState } from '@/shared/ui';
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
}: ConsentHistoryProps) => {
  return (
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
      <RemoteState
        loading={loading}
        error={error}
        retry={() => void onRefresh()}
        retryDisabled={busy}
        loadingLabel="Загрузка истории согласий"
        errorTitle="Не удалось загрузить историю согласий"
        loadingContent={
          <p className="text-sm text-muted-foreground">Загрузка истории…</p>
        }
        empty={history?.items.length === 0}
        emptyTitle="Согласий пока нет."
      />
      {history && history.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {history.items.map((consent) => (
            <RecordItem key={consent.id}>
              <RecordItem.Header>
                <RecordItem.Content>
                  <RecordItem.Heading>
                    <RecordItem.Title>
                      {CONSENT_LABELS[consent.kind]}
                    </RecordItem.Title>
                    <Badge variant={consent.revokedAt ? 'outline' : 'success'}>
                      {consent.revokedAt ? 'Отозвано' : 'Действует'}
                    </Badge>
                  </RecordItem.Heading>
                  <RecordItem.Subtitle>
                    {consent.companyId
                      ? `Компания: ${consent.companyId}`
                      : undefined}
                  </RecordItem.Subtitle>
                  <RecordItem.Meta>
                    <>
                      Версия {consent.policyVersion} · дано{' '}
                      {formatDate(consent.grantedAt)} UTC
                      {consent.revokedAt &&
                        ` · отозвано ${formatDate(consent.revokedAt)} UTC`}
                    </>
                  </RecordItem.Meta>
                </RecordItem.Content>
              </RecordItem.Header>
            </RecordItem>
          ))}
        </ul>
      )}
    </section>
  );
};
