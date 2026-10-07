import { clientApi } from '@/shared/api/client';

import type { CandidateConsent, CandidateConsents } from '../model';

type GeneralConsentInput = {
  kind: 'processing' | 'publication';
  policyVersion: string;
  companyId?: never;
};

type CompanyConsentInput = {
  kind: 'ats_transfer';
  policyVersion: string;
  companyId: string;
};

export type GrantConsentInput = GeneralConsentInput | CompanyConsentInput;

type GeneralRevokeConsentInput = {
  kind: 'processing' | 'publication';
  companyId?: never;
};

type CompanyRevokeConsentInput = {
  kind: 'ats_transfer';
  companyId: string;
};

export type RevokeConsentInput =
  GeneralRevokeConsentInput | CompanyRevokeConsentInput;

export const getCandidateConsents = async (): Promise<CandidateConsents> => {
  const { data } = await clientApi.get<CandidateConsents>('/v1/me/consents', {
    headers: { 'Cache-Control': 'no-store' },
  });
  return data;
};

export const grantCandidateConsent = async (
  input: GrantConsentInput,
): Promise<CandidateConsent> => {
  const { data } = await clientApi.post<CandidateConsent>(
    '/v1/me/consents',
    input,
  );
  return data;
};

export const revokeCandidateConsent = async (
  input: RevokeConsentInput,
): Promise<void> => {
  await clientApi.delete(`/v1/me/consents/${input.kind}`, {
    params:
      input.kind === 'ats_transfer'
        ? { companyId: input.companyId }
        : undefined,
  });
};
