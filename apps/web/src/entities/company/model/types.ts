export type MemberRole = 'owner' | 'recruiter' | 'viewer';
export interface Company {
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
}
export interface CompanyInput {
  name: string;
  contactEmail: string;
  description?: string | null;
  inn?: string | null;
  contactUrl?: string | null;
}
