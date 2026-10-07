import type { SkillsSearchQuery } from '@/entities/catalog/api';

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

const firstValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export const parseSkillsQuery = (params: SearchParams): SkillsSearchQuery => ({
  q: firstValue(params.q)?.trim() || undefined,
});
