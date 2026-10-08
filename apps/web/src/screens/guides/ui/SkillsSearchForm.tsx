'use client';

import { useEffect, useRef, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useSearch } from '@/shared/hooks';
import { Button, Input } from '@/shared/ui';
import type { SkillsSearchQuery } from '@/entities/catalog';

interface SkillsSearchFormProps {
  query: SkillsSearchQuery;
}

export const SkillsSearchForm = ({ query }: SkillsSearchFormProps) => {
  const router = useRouter();
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

  const clearSearch = () => {
    searchNow('');
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        searchNow(value);
      }}
      aria-busy={isPending}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-0 basis-56 flex-1 flex-col gap-2">
        <label htmlFor="skill-search" className="text-sm font-medium">
          Найти навык
        </label>
        <Input
          id="skill-search"
          name="q"
          type="search"
          maxLength={100}
          value={value}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Например, golang"
          className="h-12 text-base"
        />
      </div>
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={clearSearch}
        disabled={!value && !query.q && !isPending}
      >
        Очистить
      </Button>
    </form>
  );
};
