import { PageHeader, PageWrapper } from '@/shared/ui';
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
    <PageWrapper>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Content>
            <PageHeader.Title>Справочник</PageHeader.Title>
            <PageHeader.Description>
              Специализации, грейды и форматы работы, которые доступны при
              заполнении профиля и потребности команды, а также поиск навыка.
            </PageHeader.Description>
          </PageHeader.Content>
        </PageHeader.Row>
      </PageHeader>
      <CatalogsSection catalogs={catalogs} />
      <SkillsSection skills={skills} query={query} error={skillsError} />
    </PageWrapper>
  );
};
