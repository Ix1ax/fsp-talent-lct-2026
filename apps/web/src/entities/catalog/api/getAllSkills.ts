import 'server-only';

import { ApiError } from '@/shared/api/errors';
import type { Skill } from '@/entities/catalog';

import { getSkills, type SkillsSearchQuery } from './getSkills';

export const getAllSkills = async (
  query: SkillsSearchQuery,
): Promise<Skill[]> => {
  if (query.q && (Array.from(query.q).length > 100 || query.q.includes('\0'))) {
    throw new ApiError(
      400,
      'Строка поиска не должна превышать 100 символов и содержать нулевой символ.',
      'validation_error',
    );
  }
  const skills: Skill[] = [];
  const limit = 100;
  let offset = 0;
  const signal = AbortSignal.timeout(30_000);

  while (true) {
    const page = await getSkills({ ...query, limit, offset }, signal);
    skills.push(...page.items);

    if (page.items.length < limit) return skills;
    offset += page.items.length;
  }
};
