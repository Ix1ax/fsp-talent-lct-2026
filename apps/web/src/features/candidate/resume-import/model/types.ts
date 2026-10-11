import type { ResumeImportResult } from '@/entities/candidate';

import type { ContactsFormValues } from '../../contacts';
import type { ProfileFormValues } from '../../profile';

export type AppliedResume = {
  id: string;
  result: ResumeImportResult;
  profile: { id: string; values: Partial<ProfileFormValues> };
  contacts: { id: string; values: Partial<ContactsFormValues> };
};

export type ResumeCurrentDraft = {
  profile: Record<string, unknown>;
  contacts: Record<string, unknown>;
};

export type ResumeFieldChange = {
  label: string;
  previous: unknown;
  next: unknown;
};

export type ResumeRecordStatus = {
  savedId?: string;
  error?: string;
  dismissed?: boolean;
};
