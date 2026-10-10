'use client';
import { useEffect, useId, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/Command';
import { MetaLabel } from '@/shared/ui/MetaLabel';
import {
  type EmployerNeed,
  NEED_STATUS_LABELS,
} from '@/entities/employer-need';

import {
  filterSearchNeeds,
  loadSearchNeeds,
  type NeedsSearchApi,
} from '../lib';

interface EmployerSearchProps {
  api: NeedsSearchApi;
  companyId: string;
  revision: number;
  disabled?: boolean;
  onSelect: (need: EmployerNeed) => void;
}
export const EmployerSearch = ({
  api,
  companyId,
  revision,
  disabled,
  onSelect,
}: EmployerSearchProps) => {
  const resultsId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{
    key: string;
    items?: EmployerNeed[];
    error?: string;
  }>({ key: '' });
  const key = `${companyId}:${revision}`;
  const requested = open && query.trim().length >= 2 && !!companyId;
  const loaded = state.key === key && (!!state.items || !!state.error);
  useEffect(() => {
    if (!requested || loaded) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadSearchNeeds(api, companyId, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) setState({ key, items });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({ key, error: getApiErrorMessage(error) });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, companyId, key, requested, loaded]);
  const results =
    state.key === key ? filterSearchNeeds(state.items ?? [], query) : [];
  return (
    <Command
      shouldFilter={false}
      className="relative w-full min-w-0 overflow-visible rounded-lg border border-input bg-muted transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 [&>div]:border-b-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <CommandInput
        asChild
        value={query}
        onValueChange={setQuery}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        disabled={disabled || !companyId}
        aria-label="Поиск потребностей компании"
        placeholder="Поиск потребностей"
        className="h-10 text-sm"
      >
        <input
          role="combobox"
          aria-controls={resultsId}
          aria-expanded={requested}
        />
      </CommandInput>
      <div id={resultsId}>
        {requested && (
          <CommandList
            label="Результаты поиска потребностей"
            className="absolute top-full right-0 z-40 mt-2 max-h-80 w-full min-w-72 overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-popover"
          >
            <p
              className="border-b border-border px-3 py-2 text-xs text-muted-foreground"
              role="status"
            >
              {!loaded
                ? 'Поиск во всех статусах…'
                : (state.error ??
                  `${results.length} найдено · выбранная компания`)}
            </p>
            {loaded && state.error && (
              <CommandItem
                value="retry-search"
                onSelect={() => setState({ key: '' })}
              >
                Повторить поиск
              </CommandItem>
            )}
            {loaded && !state.error && !results.length && (
              <p className="p-3 text-sm text-muted-foreground">
                Потребности не найдены
              </p>
            )}
            {results.map((need) => (
              <CommandItem
                key={need.id}
                value={need.id}
                className="flex-col items-start gap-1 rounded-md px-3 [overflow-wrap:anywhere]"
                onSelect={() => {
                  setOpen(false);
                  setQuery('');
                  onSelect(need);
                }}
              >
                <MetaLabel>{NEED_STATUS_LABELS[need.status]}</MetaLabel>
                <span>{need.title}</span>
              </CommandItem>
            ))}
          </CommandList>
        )}
      </div>
    </Command>
  );
};
