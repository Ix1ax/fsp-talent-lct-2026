import type { SkillsSearchQuery } from '@/entities/catalog';

export const getEmptySkillsMessage = (query: SkillsSearchQuery): string => {
  if (query.q) return `По запросу «${query.q}» навыки не найдены.`;

  return 'Навыков пока нет.';
};
