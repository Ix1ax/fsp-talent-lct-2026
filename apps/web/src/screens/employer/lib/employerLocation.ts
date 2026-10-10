import { DYNAMIC_ROUTES, STATIC_ROUTES } from '@/shared/contants';

import type { EmployerSection } from '../constants';

export type EmployerSearchParams = Record<
  string,
  string | string[] | undefined
>;

export const getEmployerReturnPath = (
  section: EmployerSection,
  params: EmployerSearchParams,
) => {
  const query = new URLSearchParams();
  for (const key of ['company', 'tab', 'offset', 'need', 'token']) {
    if (key === 'token' && section !== 'invitation') continue;
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }
  const pathname =
    section === 'overview'
      ? STATIC_ROUTES.EMPLOYER
      : DYNAMIC_ROUTES.EMPLOYER(section);
  return `${pathname}${query.size ? `?${query}` : ''}`;
};

export const getEmployerHref = (
  section: EmployerSection,
  companyId: string,
  search: string,
) => {
  const query = new URLSearchParams(search);
  if (query.get('company') !== companyId) {
    query.delete('need');
    query.delete('offset');
  }
  if (companyId) query.set('company', companyId);
  else query.delete('company');
  return getEmployerReturnPath(section, Object.fromEntries(query));
};
