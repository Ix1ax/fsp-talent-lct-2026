import type { SkillsSearchQuery } from '@/entities/catalog/api';
import type { Catalogs, Skill } from '@/entities/catalog/model';

import { CatalogsSection } from './CatalogsSection';
import { SkillsSection } from './SkillsSection';

interface GuidesPageProps {
  catalogs?: Catalogs;
  skills?: Skill[];
  query: SkillsSearchQuery;
}

export const GuidesPage = ({ catalogs, skills, query }: GuidesPageProps) => {
  return (
    <main className="mx-auto flex max-w-285 flex-col gap-10 px-8 py-10 max-md:px-5">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-[2px] text-brand-soft uppercase">
          Гайды
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Справочник
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Специализации, уровни, форматы работы и навыки, которые используются
          на платформе.
        </p>
      </header>
      <CatalogsSection catalogs={catalogs} />
      <SkillsSection skills={skills} query={query} />
    </main>
  );
};
