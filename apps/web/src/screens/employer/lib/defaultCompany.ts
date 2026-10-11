import type { Company } from '@/entities/company';

/** Компания по умолчанию: сначала активная подтверждённая, затем любая активная. */
export const getDefaultCompanyId = (companies: Company[] | null | undefined) =>
  companies?.find(
    (company) =>
      company.status !== 'blocked' && company.verificationStatus === 'verified',
  )?.id ??
  companies?.find((company) => company.status !== 'blocked')?.id ??
  companies?.[0]?.id ??
  '';
