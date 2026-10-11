import { clientApi } from '@/shared/api/client';

import type { CandidateContacts } from '../model';

export type SaveCandidateContactsInput = {
  fullName: string;
  email: string;
  phone: string;
  telegram: string;
};

export const getCandidateContacts = async (): Promise<CandidateContacts> => {
  const { data } = await clientApi.get<CandidateContacts>('/v1/me/contacts', {
    headers: { 'Cache-Control': 'no-store' },
  });

  return data;
};

export const saveCandidateContacts = async (
  input: SaveCandidateContactsInput,
): Promise<CandidateContacts> => {
  const { data } = await clientApi.put<CandidateContacts>(
    '/v1/me/contacts',
    input,
  );

  return data;
};
