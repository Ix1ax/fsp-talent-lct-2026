export type MemberRole = 'owner' | 'recruiter' | 'viewer';

export type Company = {
  id: string;
  name: string;
  description: string | null;
  inn: string | null;
  contactEmail: string;
  contactUrl: string | null;
  logoFileId: string | null;
  verificationStatus: string;
  createdAt: string;
  memberRole: MemberRole;
  /** Доступ к платформе; заблокированная компания недоступна для работы. */
  status?: 'active' | 'blocked';
};

export type CompanyInput = {
  name: string;
  contactEmail: string;
  description?: string | null;
  inn?: string | null;
  contactUrl?: string | null;
};
