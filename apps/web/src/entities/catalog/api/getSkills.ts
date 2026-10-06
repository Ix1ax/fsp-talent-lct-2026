import 'server-only';

import { publicServerApi } from '@/shared/api/server';
import type { SkillsPage } from '@/entities/catalog/model';

export interface SkillsSearchQuery {
  q?: string;
}

export interface SkillsQuery extends SkillsSearchQuery {
  limit: number;
  offset: number;
}

export const getSkills = async (query: SkillsQuery): Promise<SkillsPage> => {
  const { data } = await publicServerApi.get<SkillsPage>(
    '/v1/catalogs/skills',
    {
      params: query,
    },
  );

  return data;
};
