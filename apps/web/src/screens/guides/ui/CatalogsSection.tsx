import { Stagger, StaggerItem } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';

import { CatalogCard } from './CatalogCard';

interface CatalogsSectionProps {
  catalogs?: Catalogs;
}

export const CatalogsSection = ({ catalogs }: CatalogsSectionProps) => {
  return (
    <section aria-labelledby="catalogs-title" className="flex flex-col gap-4">
      <h2 id="catalogs-title" className="text-xl font-semibold">
        Основные справочники
      </h2>

      {catalogs ? (
        <Stagger
          interval={0.04}
          className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <StaggerItem className="min-w-0">
            <CatalogCard
              title="Специализации"
              items={catalogs.specializations}
            />
          </StaggerItem>
          <StaggerItem className="min-w-0">
            <CatalogCard
              title="Грейды"
              items={[...catalogs.grades].sort((a, b) => a.rank - b.rank)}
            />
          </StaggerItem>
          <StaggerItem className="min-w-0">
            <CatalogCard title="Форматы работы" items={catalogs.workFormats} />
          </StaggerItem>
        </Stagger>
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-border bg-card p-4 text-muted-foreground"
        >
          Не удалось загрузить справочники. Обновите страницу и попробуйте ещё
          раз.
        </p>
      )}
    </section>
  );
};
