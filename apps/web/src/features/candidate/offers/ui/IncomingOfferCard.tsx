import type { MouseEvent } from 'react';
import { ArrowRightIcon, Building2Icon, SparklesIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { formatDate, formatSalaryRange } from '@/shared/utils';
import {
  formatOfferWaiting,
  getOfferWaitingDays,
  type IncomingOffer,
  isOfferStale,
} from '@/entities/candidate-offers';

import { OFFER_CARD_STYLES } from '../constants';
import { OfferStatusBadge } from './OfferStatusBadge';

interface IncomingOfferCardProps {
  offer: IncomingOffer;
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
}

const isAwaiting = (offer: IncomingOffer) =>
  offer.status === 'sent' || offer.status === 'viewed';

/**
 * Карточка предложения. Ожидающие ответа — яркие, с фирменным градиентом
 * и главной кнопкой; принятые — зелёные; отклонённые — приглушённые.
 */
export const IncomingOfferCard = ({
  offer,
  onOpen,
}: IncomingOfferCardProps) => {
  const awaiting = isAwaiting(offer);
  const waitingDays = getOfferWaitingDays(offer);

  return (
    <article
      className={cn(
        'relative isolate grid min-w-0 gap-4 overflow-hidden rounded-2xl border p-5 wrap-anywhere sm:p-6',
        OFFER_CARD_STYLES[offer.status],
      )}
    >
      {offer.status === 'sent' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 rounded-full bg-primary/15 blur-3xl"
        />
      )}
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold',
            awaiting
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {offer.companyName.trim().slice(0, 1).toLocaleUpperCase('ru') || (
            <Building2Icon className="size-5" />
          )}
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <h2 className="text-lg leading-snug font-semibold">{offer.title}</h2>
          <p className="text-sm text-muted-foreground">
            {offer.companyName} · {formatDate(offer.createdAt)}
          </p>
          {waitingDays !== null && (
            <p
              className={cn(
                'text-xs',
                isOfferStale(waitingDays)
                  ? 'font-medium text-warning'
                  : 'text-muted-foreground',
              )}
            >
              Работодатель ждёт ответа {formatOfferWaiting(waitingDays)}
            </p>
          )}
        </div>
        <OfferStatusBadge status={offer.status} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p
          className={cn(
            'text-xl font-semibold tabular-nums sm:text-2xl',
            awaiting && 'text-brand-text',
            offer.status === 'accepted' && 'text-success',
          )}
        >
          {formatSalaryRange(offer.salaryFromRub, offer.salaryToRub)}
        </p>
        <Button
          variant={awaiting ? 'default' : 'outline'}
          onClick={onOpen}
          className="max-sm:w-full"
        >
          {awaiting ? (
            <>
              <SparklesIcon aria-hidden="true" />
              Посмотреть и ответить
            </>
          ) : (
            <>
              Посмотреть условия
              <ArrowRightIcon aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </article>
  );
};
