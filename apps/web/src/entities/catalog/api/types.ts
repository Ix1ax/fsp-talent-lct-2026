export type SkillsSearchQuery = {
  q?: string;
};

export type SkillsQuery = SkillsSearchQuery & {
  limit: number;
  offset: number;
};
