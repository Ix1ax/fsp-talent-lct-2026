import { Skeleton } from '@/shared/ui';

import type { EmployerSection } from '../constants';

const SECTION_TITLES: Partial<Record<EmployerSection, string[]>> = {
  documents: ['Проверка компании', 'Документы и логотип'],
  team: ['Сотрудники компании', 'Приглашения'],
  profile: ['Профиль компании'],
  vacancies: ['Потребности компании'],
  candidates: ['Банк соискателей'],
  offers: ['Предложения кандидатам'],
  tasks: ['Задания компании'],
};

interface EmployerWorkspaceSkeletonProps {
  section: EmployerSection;
}

/** Only unknown data is masked; panels retain the shape of the selected section. */
export const EmployerWorkspaceSkeleton = ({
  section,
}: EmployerWorkspaceSkeletonProps) => {
  const titles = SECTION_TITLES[section];
  if (!titles) {
    return (
      <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
        {[0, 1].map((item) => (
          <div key={item} className="grid gap-5 rounded-xl border bg-card p-6">
            <Skeleton className="size-12 rounded-xl" />
            <Skeleton className="h-6 w-48 max-w-full" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-10 w-44 max-w-full" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {titles.map((title) => (
        <section
          key={title}
          className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="grid gap-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </section>
      ))}
    </div>
  );
};
