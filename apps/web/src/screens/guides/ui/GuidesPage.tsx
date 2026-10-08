import { FadeIn } from '@/shared/ui';
import type { Catalogs, Skill, SkillsSearchQuery } from '@/entities/catalog';

import { CatalogsSection } from './CatalogsSection';
import { SkillsSection } from './SkillsSection';

interface GuidesPageProps {
  catalogs?: Catalogs;
  skills?: Skill[];
  query: SkillsSearchQuery;
  skillsError?: string;
}

export const GuidesPage = ({
  catalogs,
  skills,
  query,
  skillsError,
}: GuidesPageProps) => {
  return (
    <main className="mx-auto flex w-full max-w-285 flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <FadeIn className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Справочник
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Здесь можно посмотреть специализации, грейды и форматы работы, которые
          доступны при заполнении профиля и потребности команды, а также найти
          нужный навык.
        </p>
      </FadeIn>
      <CatalogsSection catalogs={catalogs} />
      <SkillsSection skills={skills} query={query} error={skillsError} />
    </main>
  );
};
