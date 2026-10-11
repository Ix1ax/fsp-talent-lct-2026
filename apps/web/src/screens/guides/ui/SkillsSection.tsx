'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { RemoteStateSkeleton } from '@/shared/ui';
import type { Skill } from '@/entities/catalog';

import { filterSkills, parseSkillsQuery } from '../model';
import { SkillsResults } from './SkillsResults';
import { SkillsSearchForm } from './SkillsSearchForm';

interface SkillsSectionProps {
  skills?: Skill[];
  error?: string;
}

interface SkillsSearchProps {
  skills?: Skill[];
  error?: string;
}

// Запрос берётся из адреса в браузере: сама страница статична и
// пересобирается раз в час, поиск по навыкам — без обращения к серверу.
const SkillsSearch = ({ skills, error }: SkillsSearchProps) => {
  const searchParams = useSearchParams();
  const query = parseSkillsQuery({ q: searchParams.get('q') ?? undefined });
  return (
    <>
      <SkillsSearchForm query={query} />
      <SkillsResults
        skills={skills && filterSkills(skills, query.q)}
        query={query}
        error={error}
      />
    </>
  );
};

export const SkillsSection = ({ skills, error }: SkillsSectionProps) => {
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
      <Suspense fallback={<RemoteStateSkeleton />}>
        <SkillsSearch skills={skills} error={error} />
      </Suspense>
    </section>
  );
};
