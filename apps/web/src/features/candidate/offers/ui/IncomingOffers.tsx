'use client';

import { useCallback, useRef, useState } from 'react';

import { useRemoteData } from '@/shared/hooks';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FadeIn,
  OptionSelect,
  PageControls,
  RefreshButton,
  RemoteState,
  Skeleton,
  Stagger,
  StaggerItem,
} from '@/shared/ui';
import {
  getIncomingOffers,
  type IncomingOffer,
  type OfferStatus,
} from '@/entities/candidate-offers';

import { OFFER_STATUS } from '../constants';
import { updateIncomingOffersPage } from '../model';
import { IncomingOfferCard } from './IncomingOfferCard';
import { IncomingOfferDialog } from './IncomingOfferDialog';

const FADE_IN_DELAY = 0.025;

export const IncomingOffers = () => {
  const [status, setStatus] = useState<OfferStatus>();
  const [offset, setOffset] = useState(0);
  const [id, setId] = useState('');

  const load = useCallback(
    (signal: AbortSignal) => getIncomingOffers(status, offset, signal),
    [status, offset],
  );

  const remote = useRemoteData(load);
  const { updateData } = remote;
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLDivElement | null>(null);

  const updateOffer = useCallback(
    (offer: IncomingOffer) => {
      updateData((page) => updateIncomingOffersPage(page, offer, status));
    },
    [updateData, status],
  );

  const restoreFocus = useCallback((event: Event) => {
    event.preventDefault();
    const target = opener.current?.isConnected
      ? opener.current
      : heading.current;
    target?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="grid content-start gap-8">
      <FadeIn delay={FADE_IN_DELAY}>
        <Card>
          <CardHeader>
            <CardTitle ref={heading} tabIndex={-1}>
              Предложения работодателей
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
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
              <RefreshButton
                loading={remote.loading}
                disabled={remote.loading}
                onClick={remote.retry}
              />
            </div>
            <RemoteState
              {...remote}
              loadingLabel="Загружаем предложения"
              loadingContent={
                <div className="grid gap-4">
                  {Array.from({ length: 2 }, (_, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:p-6"
                    >
                      <Skeleton className="h-5 w-40 max-w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              }
              empty={remote.data?.items.length === 0}
              emptyTitle={
                status
                  ? 'Нет предложений с этим статусом'
                  : 'Предложений пока нет'
              }
              emptyDescription="Здесь появятся предложения работодателей. Для их получения нужен профиль кандидата."
            />
            {remote.data && (
              <>
                {
                  <Stagger
                    key={`${status ?? 'all'}:${offset}`}
                    interval={0.01}
                    className="grid gap-4"
                  >
                    {remote.data.items.map((offer) => (
                      <StaggerItem key={offer.id}>
                        <IncomingOfferCard
                          offer={offer}
                          onOpen={(event) => {
                            opener.current = event.currentTarget;
                            setId(offer.id);
                          }}
                        />
                      </StaggerItem>
                    ))}
                  </Stagger>
                }
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
      </FadeIn>
      {id && (
        <IncomingOfferDialog
          key={id}
          id={id}
          onClose={() => setId('')}
          onUpdate={updateOffer}
          onCloseAutoFocus={restoreFocus}
        />
      )}
    </div>
  );
};
