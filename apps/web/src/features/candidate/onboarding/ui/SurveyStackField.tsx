import { type Ref, useEffect, useState } from 'react';

import { Combobox, FieldMessage, Label } from '@/shared/ui';
import { searchCatalogSkills, type Skill } from '@/entities/catalog';

interface SurveyStackFieldProps {
  id: string;
  inputRef?: Ref<HTMLButtonElement>;
  value: string;
  disabled: boolean;
  error?: string;
  savedLabel?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}
export const SurveyStackField = ({
  id,
  inputRef,
  value,
  disabled,
  error,
  savedLabel,
  onChange,
  onBlur,
}: SurveyStackFieldProps) => {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{
    search: string;
    items: Skill[];
    error: string;
  }>();
  const current = result?.search === search ? result : undefined;
  const items = current?.items ?? [];
  const loading = !current;
  const loadError = current?.error ?? '';
  const [selected, setSelected] = useState<Skill>();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void searchCatalogSkills(search.trim(), 20, 0, controller.signal)
          .then((page) => {
            if (!controller.signal.aborted)
              setResult({ search, items: page.items, error: '' });
          })
          .catch(() => {
            if (!controller.signal.aborted)
              setResult({
                search,
                items: [],
                error:
                  'Не удалось загрузить стеки. Измените запрос, чтобы повторить поиск.',
              });
          });
      },
      search ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);
  const selectedLabel = selected?.id === value ? selected.name : savedLabel;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Основной стек</Label>
      <Combobox
        ref={inputRef}
        id={id}
        value={value}
        options={items.map((skill) => ({
          value: skill.id,
          label: skill.name,
          keywords: skill.aliases,
        }))}
        selectedLabel={value ? selectedLabel : undefined}
        onValueChange={(next) => {
          setSelected(items.find((skill) => skill.id === next));
          onChange(next);
        }}
        onBlur={onBlur}
        onSearchChange={setSearch}
        disabled={disabled}
        placeholder="Найдите и выберите стек"
        searchPlaceholder="Поиск стека, например Go"
        emptyMessage={loading ? 'Загружаем…' : 'Стек не найден.'}
        aria-invalid={!!error}
        aria-describedby={`${id}-error ${id}-hint`}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Выберите навык из справочника, по которому хотите пройти тест.
      </p>
      <FieldMessage id={`${id}-error`} message={error} />
      {loadError && (
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      )}
    </div>
  );
};
