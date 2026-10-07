export type ConsentKind = 'processing' | 'publication' | 'ats_transfer';

export type CandidateConsent = {
  id: string;
  kind: ConsentKind;
  policyVersion: string;
  companyId: string | null;
  grantedAt: string;
  revokedAt: string | null;
};

export type CandidateConsents = {
  currentPolicyVersion: string;
  items: CandidateConsent[];
};
