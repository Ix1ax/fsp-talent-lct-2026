import { useCallback, useEffect, useRef } from 'react';
import {
  CircleDashedIcon,
  CircleXIcon,
  ClockIcon,
  ShieldCheckIcon,
} from 'lucide-react';

import { ApiError } from '@/shared/api';
import { useAsyncMutation, useRemoteData } from '@/shared/hooks';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  RemoteState,
  toast,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import { type Company, VERIFICATION_LABELS } from '@/entities/company';

import type { CompanyManagementApi } from '../model';

interface CompanyVerificationCardProps {
  company: Company;
  api: CompanyManagementApi;
  active: boolean;
  documentRevision?: number;
  pending: boolean;
  onCompanyChange: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}

export const CompanyVerificationCard = ({
  company,
  api,
  active,
  documentRevision = 0,
  pending,
  onCompanyChange,
  onBusyChange,
}: CompanyVerificationCardProps) => {
  const load = useCallback(
    (signal: AbortSignal) => api.getCompanyVerification(company.id, signal),
    [api, company.id],
  );
  const remote = useRemoteData(load, documentRevision, active);
  const mutation = useAsyncMutation();
  const verification = remote.data;
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const busy = pending || mutation.pending;
  const canRequest =
    company.memberRole === 'owner' &&
    (verification?.status === 'unverified' ||
      verification?.status === 'rejected');

  const statusView = {
    unverified: { variant: 'secondary', icon: CircleDashedIcon },
    pending: { variant: 'secondary', icon: ClockIcon },
    verified: { variant: 'success', icon: ShieldCheckIcon },
    rejected: { variant: 'destructive', icon: CircleXIcon },
  } as const;
  const status = statusView[verification?.status ?? 'unverified'];

  const requestLabel =
    verification?.status === 'rejected'
      ? 'Отправить повторно'
      : 'Отправить на проверку';

  const act = async (submit: boolean) => {
    if (busy) return;
    const controller = new AbortController();
    request.current = controller;
    onBusyChange(true);
    try {
      await mutation.run(async () => {
        const next = submit
          ? await api.requestCompanyVerification(company.id, controller.signal)
          : await api.getCompanyVerification(company.id, controller.signal);
        controller.signal.throwIfAborted();
        remote.updateData(() => next);
        if (submit) toast.success('Заявка отправлена на проверку');
        await onCompanyChange();
      });
    } catch (error) {
      if (
        !controller.signal.aborted &&
        error instanceof ApiError &&
        error.status === 409
      )
        remote.retry();
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="size-5 text-primary" /> Проверка компании
        </CardTitle>
        <CardDescription>
          Подтвердите реквизиты компании. Проверка не ограничивает работу в
          кабинете.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RemoteState {...remote} />
        {verification && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge
                variant={status.variant}
                className={
                  verification.status === 'pending'
                    ? 'bg-accent text-brand-text'
                    : undefined
                }
              >
                <status.icon aria-hidden="true" />
                {VERIFICATION_LABELS[verification.status]}
              </Badge>
              <Button
                variant="outline"
                disabled={busy || remote.loading}
                onClick={() => void act(false)}
              >
                Обновить статус
              </Button>
            </div>
            {verification.status === 'pending' && (
              <p className="text-sm text-muted-foreground">
                Заявка у модератора. После рассмотрения здесь появится
                результат.
              </p>
            )}
            {verification.reason && (
              <p className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 text-sm [overflow-wrap:anywhere]">
                Комментарий модератора: {verification.reason}
              </p>
            )}
            <div className="grid gap-2 text-sm text-muted-foreground">
              {verification.requestedAt && (
                <div>
                  Заявка отправлена: {formatDate(verification.requestedAt)}
                </div>
              )}
              {verification.reviewedAt && (
                <div>Рассмотрена: {formatDate(verification.reviewedAt)}</div>
              )}
              {verification.documentIds.length > 0 && (
                <div>
                  Документов в заявке: {verification.documentIds.length}
                </div>
              )}
            </div>
            {company.memberRole === 'owner' ? (
              canRequest && (
                <div className="grid gap-3 rounded-xl border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Укажите ИНН в профиле и загрузите ниже хотя бы один документ
                    компании. В заявку попадут готовые документы; логотип не
                    учитывается.
                  </p>
                  {!company.inn && (
                    <p className="text-sm text-destructive">
                      Для отправки заявки добавьте ИНН в профиле компании.
                    </p>
                  )}
                  <Button
                    className="justify-self-start"
                    disabled={busy || remote.loading || !company.inn}
                    onClick={() => void act(true)}
                  >
                    {mutation.pending ? 'Отправляем…' : requestLabel}
                  </Button>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Отправить заявку на проверку может владелец компании.
              </p>
            )}
          </>
        )}
        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
