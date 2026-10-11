'use client';

import { useEffect, useRef, useState } from 'react';

import { useDebounce } from '@/shared/hooks';
import { searchCatalogSkills, type Skill } from '@/entities/catalog';

type Result = {
  q: string;
  items: Skill[];
  error: string;
};

export const useSkillSearch = (value: string) => {
  const [result, setResult] = useState<Result>();
  const request = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const { debounce, cancel } = useDebounce(
    async (q: string, version: number) => {
      const controller = new AbortController();
      request.current = controller;
      try {
        const page = await searchCatalogSkills(q, 20, 0, controller.signal);
        if (version === revision.current && !controller.signal.aborted)
          setResult({ q, items: page.items, error: '' });
      } catch {
        if (version === revision.current && !controller.signal.aborted)
          setResult({
            q,
            items: [],
            error: 'Подсказки недоступны. Добавьте навык по названию.',
          });
      }
    },
    400,
  );

  useEffect(() => {
    const version = ++revision.current;
    request.current?.abort();
    cancel();
    const q = value.trim();
    if (q) debounce(q, version);
    return () => {
      request.current?.abort();
      cancel();
    };
  }, [value, debounce, cancel]);

  const q = value.trim();
  const current = q && result?.q === q ? result : undefined;
  return {
    items: current?.items ?? [],
    loading: !!q && !current,
    error: current?.error ?? '',
  };
};
