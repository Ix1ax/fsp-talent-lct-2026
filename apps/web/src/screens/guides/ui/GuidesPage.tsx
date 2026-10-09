import { PageHeader } from '@/shared/ui';
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
    <main className="container-page page-rhythm flex flex-1 flex-col gap-8">
      <PageHeader
        eyebrow="Для кандидатов и работодателей"
        title="Справочник"
        description="Специализации, грейды и форматы работы, которые доступны при заполнении профиля и потребности команды, а также поиск навыка."
      />
      <CatalogsSection catalogs={catalogs} />
      <SkillsSection skills={skills} query={query} error={skillsError} />
    </main>
  );
};
