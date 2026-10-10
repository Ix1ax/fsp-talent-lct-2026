'use client';

import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { useAsyncMutation } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import {
  AsyncState,
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
  RemoteState,
  toast,
} from '@/shared/ui';
import { formatDate, formatSalaryRange } from '@/shared/utils';
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
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-3 text-sm">
              Статус
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
            <Button
              variant="outline"
              disabled={mutation.pending || remote.loading}
              onClick={remote.retry}
            >
              Обновить статусы
            </Button>
          </div>
          <RemoteState {...remote} />
          {remote.data && (
            <>
              {remote.data.items.length ? (
                remote.data.items.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-2 rounded-lg border p-4"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Кандидат {item.candidateId.slice(0, 8)} ·{' '}
                      {STATUS[item.status]} · {formatDate(item.createdAt)}
                    </p>
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
                ))
              ) : (
                <AsyncState
                  title="Предложений пока нет"
                  description="Откройте профиль в банке кандидатов или подборке потребности и предложите работу."
                />
              )}
              <PageControls
                offset={offset}
                count={remote.data.items.length}
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
                    Контакты откроются после принятия предложения кандидатом.
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
