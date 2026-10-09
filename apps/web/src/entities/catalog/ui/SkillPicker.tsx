'use client';

import { useState } from 'react';

import { Button, Combobox } from '@/shared/ui';

import { loadSkillSearch, useSkillSearch } from '../model';

interface SkillPickerProps {
  value: string;
  disabled?: boolean;
  emptyLabel?: string;
  onValueChange: (value: string) => void;
}
export const SkillPicker = ({
  value,
  disabled,
  emptyLabel = 'Любой',
  onValueChange,
}: SkillPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = useSkillSearch(
    loadSkillSearch,
    query,
    value ? [value] : [],
    open && !disabled,
  );
  const selected = search.skills.find((skill) => skill.id === value);
  return (
    <div className="grid gap-2">
      <Combobox
        value={value}
        disabled={disabled}
        selectedLabel={value ? selected?.name : emptyLabel}
        onValueChange={onValueChange}
        onOpenChange={setOpen}
        onSearchChange={setQuery}
        searchPlaceholder="Поиск навыка"
        emptyMessage={search.loading ? 'Загружаем…' : 'Навыки не найдены'}
        options={[
          { value: '', label: emptyLabel },
          ...search.items.map((skill) => ({
            value: skill.id,
            label: skill.name,
          })),
        ]}
      />
      {open && search.error && (
        <div role="alert" className="text-sm text-destructive">
          {search.error}
          <Button type="button" variant="link" onClick={search.retry}>
            Повторить загрузку навыков
          </Button>
        </div>
      )}
    </div>
  );
};
