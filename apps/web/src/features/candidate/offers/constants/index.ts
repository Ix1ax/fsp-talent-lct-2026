import type { OfferStatus } from '@/entities/candidate-offers';

export const OFFER_STATUS = {
  sent: 'Новое',
  viewed: 'Просмотрено',
  accepted: 'Принято',
  rejected: 'Отклонено',
} satisfies Record<OfferStatus, string>;

export const OFFER_CARD_STYLES = {
  sent: 'border-primary/50 bg-linear-to-br from-primary/12 via-card to-(--brand-red)/6 shadow-sm',
  viewed:
    'border-primary/30 bg-linear-to-br from-primary/6 via-card to-card shadow-xs',
  accepted: 'border-success/35 bg-linear-to-br from-success-soft to-card',
  rejected: 'border-border bg-muted/40 opacity-80',
} satisfies Record<OfferStatus, string>;
