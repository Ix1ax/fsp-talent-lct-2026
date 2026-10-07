import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import {
  type CandidateConsents,
  hasActiveConsent,
  type RevokeConsentInput,
} from '@/entities/candidate';

import { CONSENT_LABELS } from '../constants';
import { useCandidateConsents } from '../model';
import { ConsentGrantDialog } from './ConsentGrantDialog';
import { ConsentHistory } from './ConsentHistory';
import { ConsentRevokeDialog } from './ConsentRevokeDialog';

interface CandidateConsentsCardProps {
  consents: CandidateConsents;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onConsentsChange: (consents: CandidateConsents) => void;
  onRevoked: (input: RevokeConsentInput) => void;
  onRefreshProfile: (signal?: AbortSignal) => Promise<void>;
}

export const CandidateConsentsCard = (props: CandidateConsentsCardProps) => {
  const { consents, busy } = props;
  const {
    history,
    historyLoading,
    historyError,
    loadHistory,
    retrySync,
    syncError,
    message,
    pending,
    grant,
    revoke,
  } = useCandidateConsents(props);
  const [grantKind, setGrantKind] = useState<'processing' | 'publication'>();
  const [revokeInput, setRevokeInput] = useState<RevokeConsentInput>();
  const [showHistory, setShowHistory] = useState(false);
  const disabled = busy || pending;

  return (
    <Card id="consents">
      <CardHeader>
        <CardTitle>Согласия</CardTitle>
        <CardDescription>
          Версия политики: {consents.currentPolicyVersion}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(['processing', 'publication'] as const).map((kind) => {
          const active = hasActiveConsent(consents, kind);
          return (
            <div
              key={kind}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{CONSENT_LABELS[kind]}</p>
                <Badge
                  variant={active ? 'secondary' : 'outline'}
                  className="self-start"
                >
                  {active ? 'Действует' : 'Не дано'}
                </Badge>
              </div>
              {active ? (
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => setRevokeInput({ kind })}
                >
                  Отозвать
                </Button>
              ) : (
                <Button
                  disabled={disabled || !consents.currentPolicyVersion}
                  onClick={() => setGrantKind(kind)}
                >
                  Ознакомиться и дать согласие
                </Button>
              )}
            </div>
          );
        })}
        <p className="text-sm text-muted-foreground">
          Для создания профиля нужно согласие на обработку. Для публикации нужны
          оба согласия; статус поиска вы выбираете отдельно.
        </p>
        {!consents.currentPolicyVersion && (
          <p role="alert" className="text-sm text-destructive">
            Версия политики недоступна. Обновите данные.
          </p>
        )}
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        {syncError && (
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-sm text-destructive">
              {syncError}
            </p>
            <Button
              variant="outline"
              disabled={disabled || historyLoading}
              onClick={() => void retrySync()}
              className="self-start"
            >
              Повторить обновление данных
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          disabled={disabled || historyLoading}
          aria-expanded={showHistory}
          aria-controls="consent-history"
          className="self-start"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) void loadHistory();
          }}
        >
          {showHistory ? 'Скрыть историю' : 'История согласий'}
        </Button>
        {showHistory && (
          <ConsentHistory
            history={history}
            error={historyError}
            loading={historyLoading}
            busy={disabled}
            onRefresh={loadHistory}
          />
        )}
      </CardContent>
      {grantKind && (
        <ConsentGrantDialog
          key={`${grantKind}-${consents.currentPolicyVersion}`}
          kind={grantKind}
          policyVersion={consents.currentPolicyVersion}
          busy={disabled}
          onConfirm={() => grant(grantKind)}
          onClose={() => setGrantKind(undefined)}
        />
      )}
      {revokeInput && (
        <ConsentRevokeDialog
          input={revokeInput}
          busy={disabled}
          onConfirm={() => revoke(revokeInput)}
          onClose={() => setRevokeInput(undefined)}
        />
      )}
    </Card>
  );
};
