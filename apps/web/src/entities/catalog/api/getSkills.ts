import 'server-only';

import { publicServerApi } from '@/shared/api/server';
import type { SkillsPage } from '@/entities/catalog/model';

export type SkillsSearchQuery = {
  q?: string;
};

export type SkillsQuery = SkillsSearchQuery & {
  limit: number;
  offset: number;
};

export const getSkills = async (
  query: SkillsQuery,
  signal?: AbortSignal,
): Promise<SkillsPage> => {
  const { data } = await publicServerApi.get<SkillsPage>(
    '/v1/catalogs/skills',
    {
      params: query,
      signal,
    },
  );

  return data;
};
