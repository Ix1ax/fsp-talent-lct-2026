import { useState } from 'react';
import { ChevronDownIcon, HistoryIcon } from 'lucide-react';

import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
import {
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

import { useCandidateConsents } from '../model';
import { ConsentGrantDialog } from './ConsentGrantDialog';
import { ConsentHistory } from './ConsentHistory';
import { ConsentOption } from './ConsentOption';
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
    <Card id={CANDIDATE_ELEMENT_IDS.consents.section}>
      <CardHeader>
        <CardTitle>Согласия и видимость профиля</CardTitle>
        <CardDescription>
          Для заполнения профиля нужно согласие на обработку данных. Публикацию
          вы разрешаете отдельно и можете отложить.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          {(['processing', 'publication'] as const).map((kind) => (
            <ConsentOption
              key={kind}
              kind={kind}
              active={hasActiveConsent(consents, kind)}
              disabled={disabled}
              policyAvailable={!!consents.currentPolicyVersion}
              onGrant={() => setGrantKind(kind)}
              onRevoke={() => setRevokeInput({ kind })}
            />
          ))}
        </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-expanded={showHistory}
            aria-controls={CANDIDATE_ELEMENT_IDS.consents.history}
            className="-ml-3"
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) void loadHistory();
            }}
          >
            <HistoryIcon aria-hidden="true" />
            {showHistory ? 'Скрыть историю согласий' : 'История согласий'}
            <ChevronDownIcon
              aria-hidden="true"
              className={showHistory ? 'rotate-180' : undefined}
            />
          </Button>
          <p className="text-xs text-muted-foreground">
            Версия политики: {consents.currentPolicyVersion}
          </p>
        </div>
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
          error={message}
          onConfirm={() => grant(grantKind)}
          onClose={() => setGrantKind(undefined)}
        />
      )}
      {revokeInput && (
        <ConsentRevokeDialog
          input={revokeInput}
          busy={disabled}
          error={message}
          onConfirm={() => revoke(revokeInput)}
          onClose={() => setRevokeInput(undefined)}
        />
      )}
    </Card>
  );
};
