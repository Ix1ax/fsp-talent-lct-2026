import type { MemberRole } from './types';

export type CompanyVerification = {
  companyId: string;
  status: 'unverified' | 'pending' | 'verified' | 'rejected';
  version: number;
  requestedAt: string | null;
  reviewedAt: string | null;
  reason: string | null;
  documentIds: string[];
};

export type TeamRole = Exclude<MemberRole, 'owner'>;
export type CompanyMember = {
  companyId: string;
  userId: string;
  role: MemberRole;
  status: 'active' | 'inactive';
  joinedAt: string;
};
export type CompanyInvitation = {
  id: string;
  companyId: string;
  email: string;
  role: TeamRole;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  token?: string;
};
export type CompanyFilePurpose = 'company_document' | 'company_logo';
export type CompanyFile = {
  id: string;
  purpose: CompanyFilePurpose;
  originalName: string;
  mediaType: string;
  sizeBytes: number;
  checksumSha256: string;
  status: 'pending' | 'ready' | 'deleting' | 'deleted';
  createdAt: string;
};
export const MEMBER_ROLE_LABELS = {
  owner: 'Владелец',
  recruiter: 'Рекрутер',
  viewer: 'Наблюдатель',
};
export const VERIFICATION_LABELS: Record<string, string> = {
  unverified: 'Не проверена',
  pending: 'На проверке',
  verified: 'Проверена',
  rejected: 'Проверка отклонена',
};
