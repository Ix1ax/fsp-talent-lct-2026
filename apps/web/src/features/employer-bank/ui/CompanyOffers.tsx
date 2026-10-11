'use client';

import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { useAsyncMutation } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  OptionSelect,
  PageControls,
  RefreshButton,
  RemoteState,
  toast,
} from '@/shared/ui';
import { formatDate, formatSalaryRange } from '@/shared/utils';
import {
  formatOfferWaiting,
  getOfferWaitingDays,
  isOfferStale,
  OFFER_STALE_DAYS,
} from '@/entities/candidate-offers';
import type { Company } from '@/entities/company';
import type {
  CandidateOfferContacts,
  EmployerBankApi,
  OfferStatus,
} from '@/entities/employer-bank';

interface CompanyOffersProps {
  company: Company;
  api: EmployerBankApi;
  onBusyChange: (value: boolean) => void;
}

const STATUS = {
  sent: 'Отправлено',
  viewed: 'Просмотрено',
  accepted: 'Принято',
  rejected: 'Отклонено',
  expired: 'Истекло',
};

export const CompanyOffers = ({
  company,
  api,
  onBusyChange,
}: CompanyOffersProps) => {
  const [status, setStatus] = useState<OfferStatus | undefined>();
  const [offset, setOffset] = useState(0);
  const [id, setId] = useState('');
  const [contacts, setContacts] = useState<CandidateOfferContacts | null>(null);
  const mutation = useAsyncMutation();

  useEffect(() => {
    onBusyChange(mutation.pending);
    return () => onBusyChange(false);
  }, [mutation.pending, onBusyChange]);

  const load = useCallback(
    (signal: AbortSignal) =>
      api.getCompanyOffers(company.id, status, offset, signal),
    [api, company.id, status, offset],
  );

  const detailLoad = useCallback(
    (signal: AbortSignal) =>
      id ? api.getCompanyOffer(company.id, id, signal) : Promise.resolve(null),
    [api, company.id, id],
  );

  const remote = useRemoteData(load);
  const detail = useRemoteData(detailLoad);

  const offer = detail.data;

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Предложения кандидатам</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-3 text-sm sm:flex-none">
              <span className="max-sm:sr-only">Статус</span>
              <OptionSelect
                aria-label="Статус предложений"
                disabled={mutation.pending}
                value={status ?? ''}
                onValueChange={(value) => {
                  setStatus(value ? (value as OfferStatus) : undefined);
                  setOffset(0);
                }}
                options={[
                  { value: '', label: 'Все предложения' },
                  ...Object.entries(STATUS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            </label>
            <RefreshButton
              label="Обновить статусы"
              loading={remote.loading}
              disabled={mutation.pending || remote.loading}
              onClick={remote.retry}
            />
          </div>
          <RemoteState
            {...remote}
            empty={remote.data?.items.length === 0}
            emptyTitle="Предложений пока нет"
            emptyDescription="Откройте профиль в банке кандидатов или подборке потребности и предложите работу."
          />
          {remote.data && (
            <>
              {remote.data.items.map((item) => {
                const waitingDays = getOfferWaitingDays(item);
                const stale = isOfferStale(waitingDays);
                return (
                  <article
                    key={item.id}
                    className="grid gap-2 rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      {stale && (
                        <Badge variant="outline" className="text-warning">
                          Давно без ответа
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Кандидат {item.candidateId.slice(-8)} ·{' '}
                      {STATUS[item.status]} · {formatDate(item.createdAt)}
                      {waitingDays !== null &&
                        ` · ждёт ответа ${formatOfferWaiting(waitingDays)}`}
                    </p>
                    {stale && (
                      <p className="text-xs text-muted-foreground">
                        Кандидат не отвечает больше {OFFER_STALE_DAYS} дней —
                        посмотрите других кандидатов в подборке потребности.
                      </p>
                    )}
                    <p className="text-sm">
                      {formatSalaryRange(item.salaryFromRub, item.salaryToRub)}
                    </p>
                    <Button
                      variant="outline"
                      className="justify-self-start"
                      onClick={() => {
                        setId(item.id);
                        setContacts(null);
                        mutation.clearError();
                      }}
                    >
                      Открыть предложение
                    </Button>
                  </article>
                );
              })}
              <PageControls
                offset={offset}
                count={remote.data.items.length}
                hasMore={remote.data.hasMore}
                pending={mutation.pending}
                onPage={setOffset}
              />
            </>
          )}
        </CardContent>
      </Card>
      {id && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !mutation.pending) {
              setId('');
              setContacts(null);
            }
          }}
        >
          <DialogContent
            className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
            showCloseButton={!mutation.pending}
          >
            <DialogHeader>
              <DialogTitle>{offer?.title ?? 'Предложение'}</DialogTitle>
              <DialogDescription>
                Условия, сохранённые на момент отправки.
              </DialogDescription>
            </DialogHeader>
            <RemoteState {...detail} />
            {offer && (
              <div className="grid gap-4">
                <p className="text-sm">
                  {offer.companyName} · {STATUS[offer.status]}
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {offer.description}
                </p>
                <p className="font-medium">
                  {formatSalaryRange(offer.salaryFromRub, offer.salaryToRub)}
                </p>
                <p className="break-all text-sm">
                  Контакт работодателя: {offer.contactEmail}
                </p>
                {offer.contactUrl && (
                  <p className="break-all text-sm">{offer.contactUrl}</p>
                )}
                {offer.status === 'accepted' &&
                  company.memberRole !== 'viewer' && (
                    <div className="grid gap-3 border-t pt-4">
                      <Button
                        disabled={mutation.pending}
                        onClick={() => {
                          setContacts(null);
                          void mutation
                            .run(async () =>
                              setContacts(
                                await api.getOfferContacts(
                                  company.id,
                                  offer.id,
                                ),
                              ),
                            )
                            .catch((error: unknown) => {
                              toast.error(getApiErrorMessage(error));
                            });
                        }}
                      >
                        {mutation.pending
                          ? 'Получаем контакты…'
                          : 'Получить контакты кандидата'}
                      </Button>
                      {contacts && (
                        <div className="grid gap-2 text-sm">
                          <p className="font-medium">{contacts.fullName}</p>
                          <p className="break-all">{contacts.email}</p>
                          <p>{contacts.phone ?? 'Телефон не указан'}</p>
                          <p>{contacts.telegram ?? 'Telegram не указан'}</p>
                        </div>
                      )}
                      {mutation.error && (
                        <p role="alert" className="text-sm text-destructive">
                          {mutation.error}
                        </p>
                      )}
                    </div>
                  )}
                {offer.status !== 'accepted' && (
                  <p className="text-sm text-muted-foreground">
                    {offer.status === 'expired'
                      ? 'Срок предложения истёк. Контакты кандидата недоступны.'
                      : 'Контакты откроются после принятия предложения кандидатом.'}
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
