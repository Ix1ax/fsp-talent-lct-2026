import { z } from 'zod';

import { operationConfig, type OperationSection } from './operations';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Максимум ${max} символов`)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v),
      'Недопустимые символы',
    );
const uuid = z.union([z.literal(''), z.uuid('Введите корректный UUID')]);
const catalogId = z
  .string()
  .refine(
    (v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 32767),
    'Выберите значение из справочника',
  );
export const operationFiltersSchema = z.object({
  q: text(200),
  status: z.string(),
  access_status: z.union([z.literal(''), z.enum(['active', 'blocked'])]),
  role: z.union([z.literal(''), z.enum(['candidate', 'employer', 'admin'])]),
  company_id: uuid,
  candidate_id: uuid,
  specialization_id: catalogId,
  grade_id: catalogId,
});
export type OperationFilterValues = z.infer<typeof operationFiltersSchema>;
export const getOperationFilters = (
  section: OperationSection,
  params: URLSearchParams,
): OperationFilterValues => {
  const config = operationConfig[section];
  const allowedStatus = config.statuses.some(
    (status) => status === params.get('status'),
  );
  return {
    q: config.search ? (params.get('q') ?? '') : '',
    status: allowedStatus ? params.get('status')! : '',
    access_status:
      section === 'companies'
        ? (params.get('access_status') ?? '').replace(/^all$/, '')
        : '',
    role: section === 'users' ? (params.get('role') ?? '') : '',
    company_id: config.company ? (params.get('company_id') ?? '') : '',
    candidate_id: config.candidate ? (params.get('candidate_id') ?? '') : '',
    specialization_id: config.category
      ? (params.get('specialization_id') ?? '')
      : '',
    grade_id: config.category ? (params.get('grade_id') ?? '') : '',
  } as OperationFilterValues;
};
export const getOperationOffset = (params: URLSearchParams) => {
  const value = params.get('offset') ?? '0';
  return /^\d+$/.test(value) && Number(value) <= 10000 ? Number(value) : 0;
};
export const operationDecisionSchema = z.object({ reason: text(2000) });
const auditDateTime = z
  .string()
  .refine(
    (value) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value) &&
        Number.isFinite(Date.parse(`${value}+03:00`))),
    'Укажите дату и время',
  );
export const auditPeriodSchema = z
  .object({
    from: z.union([z.literal(''), z.iso.datetime({ offset: true })]),
    to: z.union([z.literal(''), z.iso.datetime({ offset: true })]),
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      Date.parse(value.from) <= Date.parse(value.to),
    { path: ['to'], message: 'Конец периода должен быть не раньше начала' },
  );
export const auditFiltersSchema = z
  .object({
    source: z.union([
      z.literal(''),
      z.enum(['operations', 'catalogs', 'assessments', 'admins', 'activity']),
    ]),
    actor_id: uuid,
    entity_type: text(64),
    entity_id: text(128),
    action: text(64),
    from: auditDateTime,
    to: auditDateTime,
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      Date.parse(`${value.from}+03:00`) <= Date.parse(`${value.to}+03:00`),
    { path: ['to'], message: 'Конец периода должен быть не раньше начала' },
  );
export type AuditFilterValues = z.infer<typeof auditFiltersSchema>;
