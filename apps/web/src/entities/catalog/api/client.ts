import { clientApi } from '@/shared/api/client';

import type { Catalogs, Skill, SkillsPage } from '../model';

export const getClientCatalogs = async (signal?: AbortSignal) => {
  const { data } = await clientApi.get<Catalogs>('/v1/catalogs', { signal });
  return data;
};

export const getClientSkills = async (
  q: string,
  signal?: AbortSignal,
): Promise<Skill[]> => {
  const items: Skill[] = [];

  for (let offset = 0; offset <= 10000; offset += 100) {
    const { data } = await clientApi.get<SkillsPage>('/v1/catalogs/skills', {
      params: { q: q || undefined, limit: 100, offset },
      signal,
    });

    items.push(...data.items);

    if (data.items.length < 100) return items;
  }

  throw new Error('Слишком много навыков. Уточните поиск.');
};

export { searchCatalogSkills } from './searchCatalogSkills';
