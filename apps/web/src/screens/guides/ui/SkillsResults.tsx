'use client';

import { useRouter } from 'next/navigation';

import { FadeIn, RemoteState } from '@/shared/ui';
import type { Skill, SkillsSearchQuery } from '@/entities/catalog';

import { getEmptySkillsMessage } from '../lib';
import { SkillCard } from './SkillCard';

interface SkillsResultsProps {
  skills?: Skill[];
  query: SkillsSearchQuery;
  error?: string;
}

export const SkillsResults = ({ skills, query, error }: SkillsResultsProps) => {
  const router = useRouter();
  if (!skills || skills.length === 0) {
    return (
      <RemoteState
        loading={false}
        error={!skills ? (error ?? 'Не удалось загрузить навыки.') : ''}
        errorTitle="Не удалось загрузить навыки"
        retry={() => router.refresh()}
        empty={skills?.length === 0}
        emptyTitle="Навыки не найдены"
        emptyDescription={getEmptySkillsMessage(query)}
      />
    );
  }

  return (
    <FadeIn key={query.q ?? ''} distance={0}>
      <ul className="grid gap-3 auto-rows-fr sm:grid-cols-2">
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </ul>
    </FadeIn>
  );
};
