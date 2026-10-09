'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { useRemoteData } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import {
  AsyncState,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  OptionSelect,
} from '@/shared/ui';
import { PageControls, RemoteState } from '@/shared/ui';
import { formatDate, formatSalaryRange } from '@/shared/utils';
import {
  getIncomingOffers,
  type OfferStatus,
} from '@/entities/candidate-offers';

import { OFFER_CARD_STYLES, OFFER_STATUS } from '../constants';
import { IncomingOfferDialog } from './IncomingOfferDialog';
import { OfferStatusBadge } from './OfferStatusBadge';

export const IncomingOffers = () => {
  const [status, setStatus] = useState<OfferStatus>();
  const [offset, setOffset] = useState(0);
  const [id, setId] = useState('');

  const load = useCallback(
    (signal: AbortSignal) => getIncomingOffers(status, offset, signal),
    [status, offset],
  );

  const remote = useRemoteData(load);

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <header className="grid gap-3">
        <Link
          href={STATIC_ROUTES.CANDIDATE}
          className="text-sm text-muted-foreground underline"
        >
          Мой кабинет
        </Link>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Входящие предложения
        </h1>
        <p className="text-muted-foreground">
          Посмотрите условия работодателей и ответьте на предложение.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Предложения работодателей</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <OptionSelect
              aria-label="Статус предложений"
              value={status ?? ''}
              onValueChange={(value) => {
                setStatus(value ? (value as OfferStatus) : undefined);
                setOffset(0);
              }}
              options={[
                { value: '', label: 'Все предложения' },
                ...Object.entries(OFFER_STATUS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <Button
              variant="outline"
              disabled={remote.loading}
              onClick={remote.retry}
            >
              Обновить
            </Button>
          </div>
          <RemoteState {...remote} />
          {remote.data && (
            <>
              {remote.data.items.length ? (
                remote.data.items.map((offer) => (
                  <article
                    key={offer.id}
                    className={cn(
                      'grid min-w-0 gap-3 rounded-lg border p-4 wrap-anywhere',
                      OFFER_CARD_STYLES[offer.status],
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="min-w-0 flex-1 font-medium">
                        {offer.title}
                      </h2>
                      <OfferStatusBadge status={offer.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {offer.companyName} · {formatDate(offer.createdAt)}
                    </p>
                    <p className="text-sm">
                      {formatSalaryRange(
                        offer.salaryFromRub,
                        offer.salaryToRub,
                      )}
                    </p>
                    <Button
                      variant="outline"
                      className="justify-self-start"
                      onClick={() => setId(offer.id)}
                    >
                      Посмотреть условия
                    </Button>
                  </article>
                ))
              ) : (
                <AsyncState
                  title={
                    status
                      ? 'Нет предложений с этим статусом'
                      : 'Предложений пока нет'
                  }
                  description="Здесь появятся предложения работодателей. Для их получения нужен профиль кандидата."
                />
              )}
              <PageControls
                offset={offset}
                count={remote.data.items.length}
                total={remote.data.total}
                pending={remote.loading}
                onPage={setOffset}
              />
            </>
          )}
        </CardContent>
      </Card>
      {id && (
        <IncomingOfferDialog
          key={id}
          id={id}
          onClose={() => {
            setId('');
            remote.retry();
          }}
          onUpdate={remote.retry}
        />
      )}
    </main>
  );
};
