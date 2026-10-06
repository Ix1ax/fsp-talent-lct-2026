import type { Skill, SkillsSearchQuery } from '@/entities/catalog';

import { SkillsResults } from './SkillsResults';
import { SkillsSearchForm } from './SkillsSearchForm';

interface SkillsSectionProps {
  skills?: Skill[];
  query: SkillsSearchQuery;
}

export const SkillsSection = ({ skills, query }: SkillsSectionProps) => {
  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="flex flex-col gap-4 scroll-mt-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="skills-title" className="text-xl font-semibold">
          Навыки
        </h2>
        <p className="text-sm text-muted-foreground">
          Поиск по названию, коду и синонимам.
        </p>
      </div>
      <SkillsSearchForm query={query} />
      <SkillsResults skills={skills} query={query} />
    </section>
  );
};
