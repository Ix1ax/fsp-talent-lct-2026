import { normalizePage } from '@/shared/api';
import { clientApi } from '@/shared/api/client';
import type { Page } from '@/shared/api/types';

import {
  type CompanyFile,
  type CompanyFilePurpose,
  type CompanyInvitation,
  type CompanyMember,
  type TeamRole,
} from '../model';

const path = (id: string) => `/v1/companies/${id}`;

export const getCompanyFiles = async (
  id: string,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<Page<CompanyFile>>(`${path(id)}/files`, {
    params: { limit: 21, offset },
    signal,
  });

  return normalizePage(data);
};
export const uploadCompanyFile = async (
  id: string,
  file: File,
  purpose: CompanyFilePurpose,
) => {
  const body = new FormData();
  body.append('file', file);
  body.append('purpose', purpose);

  const { data } = await clientApi.post<CompanyFile>(
    `${path(id)}/files`,
    body,
    {
      timeout: 60_000,
    },
  );

  return data;
};
export const downloadCompanyFile = async (
  id: string,
  fileId: string,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<Blob>(
    `${path(id)}/files/${fileId}/download`,
    {
      responseType: 'blob',
      signal,
    },
  );

  return data;
};
export const deleteCompanyFile = async (id: string, fileId: string) => {
  await clientApi.delete(`${path(id)}/files/${fileId}`);
};
export const getCompanyMembers = async (
  id: string,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<Page<CompanyMember>>(
    `${path(id)}/members`,
    {
      params: { limit: 21, offset },
      signal,
    },
  );

  return normalizePage(data);
};
export const updateCompanyMember = async (
  id: string,
  userId: string,
  role: TeamRole,
) => {
  const { data } = await clientApi.patch<CompanyMember>(
    `${path(id)}/members/${userId}`,
    {
      role,
    },
  );

  return data;
};
export const disableCompanyMember = async (id: string, userId: string) => {
  await clientApi.delete(`${path(id)}/members/${userId}`);
};
export const getCompanyInvitations = async (
  id: string,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<Page<CompanyInvitation>>(
    `${path(id)}/invitations`,
    {
      params: { limit: 21, offset },
      signal,
    },
  );

  return normalizePage(data);
};
export const createCompanyInvitation = async (
  id: string,
  input: { email: string; role: TeamRole },
) => {
  const { data } = await clientApi.post<CompanyInvitation>(
    `${path(id)}/invitations`,
    input,
  );

  return data;
};
export const revokeCompanyInvitation = async (
  id: string,
  invitationId: string,
) => {
  await clientApi.delete(`${path(id)}/invitations/${invitationId}`);
};
export const acceptCompanyInvitation = async (token: string) => {
  const { data } = await clientApi.post<CompanyMember>(
    '/v1/company-invitations/accept',
    {
      token,
    },
  );

  return data;
};

export {
  getCompanyVerification,
  requestCompanyVerification,
} from './verification';
