import { z } from 'zod';

import type { PreviewAnswer } from '../model';
import { adminRequest } from './adminRequest';
import { previewSchema } from './previewSchemas';

const path = (id: string) => `/assessments/previews/${encodeURIComponent(id)}`;
export const startAdminPreview = (
  token: string,
  templateId: string,
  key: string,
) =>
  adminRequest(
    token,
    `/assessments/templates/${encodeURIComponent(templateId)}/previews`,
    previewSchema,
    { method: 'POST', headers: { 'Idempotency-Key': key } },
  );
export const getAdminPreview = (
  token: string,
  id: string,
  signal?: AbortSignal,
) => adminRequest(token, path(id), previewSchema, { signal });
export const saveAdminPreviewAnswer = (
  token: string,
  id: string,
  questionId: string,
  answer: PreviewAnswer,
) =>
  adminRequest(
    token,
    `${path(id)}/answers/${encodeURIComponent(questionId)}`,
    z.undefined(),
    { method: 'PUT', body: answer },
  );
export const submitAdminPreview = (token: string, id: string) =>
  adminRequest(token, `${path(id)}/submit`, previewSchema, { method: 'POST' });
export const deleteAdminPreview = (token: string, id: string) =>
  adminRequest(token, path(id), z.undefined(), { method: 'DELETE' });
