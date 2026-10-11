import { clientApi } from '@/shared/api';

import type { ResumeImportResult } from '../model';

export const importCandidateResume = async (
  file: File,
  signal?: AbortSignal,
): Promise<ResumeImportResult> => {
  const body = new FormData();
  body.append('file', file);
  const { data } = await clientApi.post<ResumeImportResult>(
    '/v1/me/profile/import/resume',
    body,
    { signal, timeout: 60_000 },
  );
  return data;
};
