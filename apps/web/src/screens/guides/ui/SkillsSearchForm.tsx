'use client';

import { useEffect, useRef, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SearchIcon } from 'lucide-react';

import { useGuardedRouter, useSearch } from '@/shared/hooks';
import { Input } from '@/shared/ui';
import type { SkillsSearchQuery } from '@/entities/catalog';

interface SkillsSearchFormProps {
  query: SkillsSearchQuery;
}

export const SkillsSearchForm = ({ query }: SkillsSearchFormProps) => {
  const router = useGuardedRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const requestedQuery = useRef(query.q ?? '');

  const search = (input: string) => {
    const q = input.trim();
    requestedQuery.current = q;

    const params = new URLSearchParams(searchParams.toString());

    if (q) params.set('q', q);
    else params.delete('q');

    const currentQuery = searchParams.get('q') ?? '';

    if (q === currentQuery) return;
    const queryString = params.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => router.replace(href, { scroll: false }));
  };

  const {
    value,
    onSearch,
    setValue,
    cancel: cancelSearch,
    searchNow,
  } = useSearch(query.q ?? '', search);

  useEffect(() => {
    const nextQuery = query.q ?? '';

    if (nextQuery !== requestedQuery.current) {
      cancelSearch();
      requestedQuery.current = nextQuery;
      setValue(nextQuery);
    }
  }, [query.q, cancelSearch, setValue]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        searchNow(value);
      }}
      aria-busy={isPending}
      className="flex min-w-0 flex-col gap-2"
    >
      <label htmlFor="skill-search" className="text-sm font-medium">
        Найти навык
      </label>
      {/* Очистка — встроенным крестиком поля поиска, отдельная кнопка не нужна. */}
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="skill-search"
          name="q"
          type="search"
          maxLength={100}
          value={value}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Например, golang"
          className="h-12 pl-12 text-base"
        />
      </div>
    </form>
  );
};
