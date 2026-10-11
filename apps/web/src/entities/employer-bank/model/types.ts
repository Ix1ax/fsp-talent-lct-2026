export type CandidateCategory = {
  specializationId: number;
  gradeId: number;
  stackSkillId: string | null;
  stackName: string | null;
};
export type CandidateInteraction = {
  hasOffer: boolean;
  viewed: boolean;
  lastViewedAt: string | null;
  lastOfferedAt: string | null;
  nextAvailableAt: string | null;
};
export type BankCandidate = {
  id: string;
  city: string | null;
  timezone: string | null;
  experienceMonths: number;
  salaryMinRub: number | null;
  searchStatus: 'open' | 'passive';
  workFormatIds: number[];
  category: CandidateCategory | null;
  declaredCategory: CandidateCategory | null;
  gradeStatus: 'confirmed' | 'unconfirmed';
  achievementsCount: number;
  fspBonus: number;
};
export type BankCandidateDetails = BankCandidate & {
  qualifications: (CandidateCategory & {
    specialization: string;
    grade: string;
    confirmedAt: string;
  })[];
  skills: {
    id: string;
    code: string;
    name: string;
    claimedLevel: number | null;
    verifiedLevel: number | null;
    source: 'claimed' | 'test';
  }[];
  assessment: { scorePercent: number; confirmedAt: string } | null;
  experience: { startedOn: string; endedOn: string | null }[];
  education: { level: string; graduationYear: number }[];
  achievements: {
    id: string;
    eventName: string;
    discipline: string;
    occurredOn: string;
    result: string;
    place: number | null;
  }[];
};
export type OfferStatus =
  'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
export type CandidateOffer = {
  candidateId: string;
  needId: string | null;
  title: string;
  description: string;
  salaryFromRub: number;
  salaryToRub: number;
  contactEmail: string;
  contactUrl: string | null;
  id: string;
  companyId: string;
  companyName: string;
  createdBy: string;
  status: OfferStatus;
  createdAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
};
export type CandidateOfferContacts = {
  fullName: string;
  email: string;
  phone: string | null;
  telegram: string | null;
};
