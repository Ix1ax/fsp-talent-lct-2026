import type { Skill, SkillsSearchQuery } from '@/entities/catalog';

import { getEmptySkillsMessage } from '../lib';
import { SkillCard } from './SkillCard';

interface SkillsResultsProps {
  skills?: Skill[];
  query: SkillsSearchQuery;
}

export const SkillsResults = ({ skills, query }: SkillsResultsProps) => {
  if (!skills) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-border bg-card p-4 text-muted-foreground"
      >
        Не удалось загрузить навыки. Обновите страницу и попробуйте ещё раз.
      </p>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        {getEmptySkillsMessage(query)}
      </div>
    );
  }

  return (
    <ul className="grid gap-3 auto-rows-fr sm:grid-cols-2">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </ul>
  );
};
