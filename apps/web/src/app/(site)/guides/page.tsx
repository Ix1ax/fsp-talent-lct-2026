import type { Metadata } from 'next';

import { ApiError } from '@/shared/api/errors';
import { getAllSkills, getCatalogs } from '@/entities/catalog/api';
import { GuidesPage, parseSkillsQuery } from '@/screens/guides';

export const metadata: Metadata = {
  title: 'Гайды и справочники · ФСП',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const query = parseSkillsQuery(await searchParams);
  const [catalogsResult, skillsResult] = await Promise.allSettled([
    getCatalogs(),
    getAllSkills(query),
  ]);

  let skillsError: string | undefined;
  if (
    skillsResult.status === 'rejected' &&
    skillsResult.reason instanceof ApiError &&
    skillsResult.reason.status === 400
  ) {
    skillsError = skillsResult.reason.message;
  }

  return (
    <GuidesPage
      catalogs={
        catalogsResult.status === 'fulfilled' ? catalogsResult.value : undefined
      }
      skills={
        skillsResult.status === 'fulfilled' ? skillsResult.value : undefined
      }
      query={query}
      skillsError={skillsError}
    />
  );
}
