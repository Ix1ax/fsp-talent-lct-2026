export type OfferStatus =
  'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
export type OfferDecision = Extract<OfferStatus, 'accepted' | 'rejected'>;

export type IncomingOffer = {
  id: string;
  companyId: string;
  candidateId: string;
  createdBy: string;
  needId: string | null;
  companyName: string;
  title: string;
  description: string;
  salaryFromRub: number;
  salaryToRub: number;
  contactEmail: string;
  contactUrl: string | null;
  status: OfferStatus;
  createdAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
};
