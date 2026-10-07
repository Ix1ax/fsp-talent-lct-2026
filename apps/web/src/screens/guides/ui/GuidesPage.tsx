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
    <main className="mx-auto flex w-full max-w-285 flex-1 flex-col gap-10 px-5 py-8 md:px-8 md:py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Справочник
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Здесь можно посмотреть специализации, грейды и форматы работы, которые
          доступны при заполнении профиля и потребности команды, а также найти
          нужный навык.
        </p>
      </header>
      <CatalogsSection catalogs={catalogs} />
      <SkillsSection skills={skills} query={query} error={skillsError} />
    </main>
  );
};
