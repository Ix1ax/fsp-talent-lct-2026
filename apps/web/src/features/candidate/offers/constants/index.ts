import type { OfferStatus } from '@/entities/candidate-offers';

export const OFFER_STATUS = {
  sent: 'Новое',
  viewed: 'Просмотрено',
  accepted: 'Принято',
  rejected: 'Отклонено',
} satisfies Record<OfferStatus, string>;

export const OFFER_CARD_STYLES = {
  sent: 'border-primary/40 bg-primary/5',
  viewed: 'border-border bg-card',
  accepted: 'border-success/30 bg-card',
  rejected: 'border-border bg-muted/30',
} satisfies Record<OfferStatus, string>;
