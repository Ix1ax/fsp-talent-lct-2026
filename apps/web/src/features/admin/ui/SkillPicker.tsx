import { useId, useState } from 'react';

import { Combobox, Label } from '@/shared/ui';
import { type CatalogItem } from '@/entities/admin';

import { useAdminSkillSearch } from '../model';
import { ErrorNotice } from './ErrorNotice';

interface SkillPickerProps {
  value: string;
  onChange: (value: string) => void;
  items?: CatalogItem[];
  approvedOnly?: boolean;
  excludeId?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
}
export const SkillPicker = ({
  value,
  onChange,
  items = [],
  approvedOnly = false,
  excludeId,
  label = 'Навык',
  disabled,
  error,
}: SkillPickerProps) => {
  const id = useId();
  const [query, setQuery] = useState('');
  const search = useAdminSkillSearch(query.trim(), value);
  const selected = search.selected ?? items.find((item) => item.id === value);
  const unavailable =
    selected &&
    (selected.active === false ||
      (approvedOnly && selected.moderation_status !== 'approved'));
  let selectedLabel: string | undefined;
  if (value) {
    selectedLabel = selected?.name ?? `Навык ${value}`;
    if (unavailable) selectedLabel += ' (недоступен)';
  }
  const choices = search.items.filter(
    (item) =>
      item.id !== excludeId &&
      (!approvedOnly ||
        (item.active !== false && item.moderation_status === 'approved')),
  );
  return (
    <div
      data-admin-field
      className="grid min-w-0 content-start gap-1.5 text-sm [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:min-w-0 [&_button[role=combobox]]:text-base [&_button[role=combobox]>span]:min-w-0 [&_button[role=combobox]>span]:flex-1 [&_button[role=combobox]>span]:text-left sm:[&_button[role=combobox]]:text-sm"
    >
      <Label htmlFor={id} className="min-h-5 leading-5">
        {label}
      </Label>
      <Combobox
        id={id}
        options={choices.map((item) => ({
          value: item.id,
          label: `${item.name}${item.active === false ? ' (архив)' : ''}`,
          keywords: [item.code, ...(item.aliases ?? [])],
        }))}
        value={value}
        selectedLabel={selectedLabel}
        onValueChange={onChange}
        onSearchChange={setQuery}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={`${id}-feedback`}
        placeholder="Выберите навык"
        searchPlaceholder="Поиск навыка на сервере…"
        emptyMessage={
          search.loading ? 'Ищем навыки…' : 'Ничего не найдено. Уточните поиск.'
        }
      />
      <div id={`${id}-feedback`} className="grid min-h-4 content-start gap-1.5">
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Показано до 50 навыков. Для других значений уточните поиск.
        </p>
        <ErrorNotice error={search.error} onRetry={search.retry} />
      </div>
    </div>
  );
};
