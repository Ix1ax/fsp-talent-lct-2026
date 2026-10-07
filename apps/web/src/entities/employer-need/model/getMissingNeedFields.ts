import type { NeedInput } from './types';
export const getMissingNeedFields = (need: NeedInput): string[] =>
  [
    !need.title.trim() && 'название',
    !need.description.trim() && 'описание задач',
    !need.specializationId && 'специализация',
    !need.skills.length && 'навыки',
    !need.workFormatIds.length && 'формат работы',
  ].filter((label): label is string => !!label);
