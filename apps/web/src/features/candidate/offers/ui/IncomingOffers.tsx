'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { useRemoteData } from '@/shared/hooks';
import {
  AsyncState,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FadeIn,
  OptionSelect,
  PageHeader,
  RefreshButton,
  Stagger,
  StaggerItem,
} from '@/shared/ui';
import { PageControls, RemoteState } from '@/shared/ui';
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
    <main className="container-page page-rhythm grid flex-1 content-start gap-8">
      <PageHeader
        title="Входящие предложения"
        description="Посмотрите условия работодателей и ответьте на предложение."
        actions={
          <Button asChild variant="outline">
            <Link href={STATIC_ROUTES.CANDIDATE}>Мой кабинет</Link>
          </Button>
        }
      />
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
            <RemoteState {...remote} />
            {remote.data && (
              <>
                {remote.data.items.length ? (
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
    </main>
  );
};
