import { clientApi } from '@/shared/api/client';

import type { SkillsPage } from '../model';

export const searchCatalogSkills = async (
  q: string,
  limit: number = 20,
  offset: number = 0,
  signal?: AbortSignal,
): Promise<SkillsPage> => {
  const { data } = await clientApi.get<SkillsPage>('/v1/catalogs/skills', {
    params: { q, limit, offset },
    signal,
  });

  return data;
};
