import 'server-only';

import type { Skill } from '@/entities/catalog';

import { getSkills, type SkillsSearchQuery } from './getSkills';

export const getAllSkills = async (
  query: SkillsSearchQuery,
): Promise<Skill[]> => {
  const skills: Skill[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const page = await getSkills({ ...query, limit, offset });
    skills.push(...page.items);

    if (page.items.length < limit) return skills;
    offset += page.items.length;
  }
};
