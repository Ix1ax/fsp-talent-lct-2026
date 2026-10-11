import { CheckIcon, ClockIcon, EyeIcon, MailIcon, XIcon } from 'lucide-react';

import { Badge } from '@/shared/ui';
import type { OfferStatus } from '@/entities/candidate-offers';

import { OFFER_STATUS } from '../constants';

const STATUS_PRESENTATION = {
  sent: { variant: 'default', icon: MailIcon },
  viewed: { variant: 'outline', icon: EyeIcon },
  accepted: { variant: 'success', icon: CheckIcon },
  rejected: { variant: 'secondary', icon: XIcon },
  expired: { variant: 'secondary', icon: ClockIcon },
} as const;

interface OfferStatusBadgeProps {
  status: OfferStatus;
}
export const OfferStatusBadge = ({ status }: OfferStatusBadgeProps) => {
  const { variant, icon: Icon } = STATUS_PRESENTATION[status];
  return (
    <Badge variant={variant} className="h-6 gap-1.5 rounded-md px-2.5">
      <Icon aria-hidden="true" />
      {OFFER_STATUS[status]}
    </Badge>
  );
};
