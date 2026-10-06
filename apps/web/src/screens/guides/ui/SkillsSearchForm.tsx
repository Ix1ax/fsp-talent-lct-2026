import { Button, Input } from '@/shared/ui';
import type { SkillsSearchQuery } from '@/entities/catalog';

interface SkillsSearchFormProps {
  query: SkillsSearchQuery;
}

export const SkillsSearchForm = ({ query }: SkillsSearchFormProps) => {
  return (
    <form
      action="/guides"
      method="get"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-56 flex-1 flex-col gap-2">
        <label htmlFor="skill-search" className="text-sm font-medium">
          Найти навык
        </label>
        <Input
          id="skill-search"
          name="q"
          type="search"
          defaultValue={query.q ?? ''}
          placeholder="Например, golang"
          className="h-9"
        />
      </div>
      <Button type="submit" size="lg">
        Искать
      </Button>
    </form>
  );
};
