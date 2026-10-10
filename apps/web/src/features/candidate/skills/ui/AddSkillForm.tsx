import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { CANDIDATE_ELEMENT_IDS, STATIC_ROUTES } from '@/shared/contants';
import { useFormUnsavedChanges } from '@/shared/hooks';
import { Button, Input, Label } from '@/shared/ui';
import type { ClaimedLevel } from '@/entities/candidate';

import { skillSchema, useSkillAutocomplete } from '../model';
import { SkillLevelSelect } from './SkillLevelSelect';

type Values = z.infer<typeof skillSchema>;
interface AddSkillFormProps {
  disabled: boolean;
  onAdd: (name: string, level: ClaimedLevel, id?: string) => Promise<boolean>;
}
export const AddSkillForm = ({ disabled, onAdd }: AddSkillFormProps) => {
  const form = useForm<Values>({
    resolver: zodResolver(skillSchema),
    defaultValues: { name: '', claimedLevel: 1 },
  });
  const name = useWatch({ control: form.control, name: 'name' });
  const error = form.formState.errors.name?.message;
  const autocomplete = useSkillAutocomplete({
    name,
    disabled,
    error,
    onSelect: (skill) =>
      form.setValue('name', skill.name, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });
  const {
    selectedId,
    listId,
    open,
    activeSkill,
    activeIndex,
    hint,
    items,
    selectSkill,
  } = autocomplete;
  const unsaved = useFormUnsavedChanges(form, {
    preserveWithin: useMemo(
      () => [
        STATIC_ROUTES.CANDIDATE,
        STATIC_ROUTES.CANDIDATE_CONSENTS,
        STATIC_ROUTES.CANDIDATE_PROFILE,
        STATIC_ROUTES.CANDIDATE_CONTACTS,
        STATIC_ROUTES.CANDIDATE_EXPERIENCE,
        STATIC_ROUTES.CANDIDATE_EDUCATION,
        STATIC_ROUTES.CANDIDATE_SKILLS,
        STATIC_ROUTES.CANDIDATE_READINESS,
      ],
      [],
    ),
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={form.handleSubmit(async (values) => {
        if (disabled) return;
        if (await onAdd(values.name, values.claimedLevel, selectedId)) {
          unsaved.markSaved();
          form.reset();
          autocomplete.reset();
        }
      })}
    >
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3">
        <Label htmlFor={CANDIDATE_ELEMENT_IDS.skills.name}>
          Найти или предложить навык
        </Label>
        <div className="relative">
          <Input
            id={CANDIDATE_ELEMENT_IDS.skills.name}
            placeholder="Например, Go или Svelte"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              activeSkill ? `${listId}-${activeSkill.id}` : undefined
            }
            aria-invalid={!!error}
            aria-describedby={CANDIDATE_ELEMENT_IDS.skills.hint}
            {...form.register('name', { onChange: autocomplete.onQueryChange })}
            onFocus={autocomplete.onFocus}
            onBlur={(event) => {
              void form.register('name').onBlur(event);
              autocomplete.onBlur();
            }}
            onKeyDown={autocomplete.onKeyDown}
          />
          {open && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Навыки из справочника"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto border border-border bg-popover p-1 shadow-popover"
            >
              {items.map((skill, index) => (
                <li key={skill.id} role="presentation">
                  <Button
                    id={`${listId}-${skill.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    tabIndex={-1}
                    variant={index === activeIndex ? 'secondary' : 'ghost'}
                    className="h-auto min-h-11 w-full justify-start py-3 text-left whitespace-normal [overflow-wrap:anywhere]"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => selectSkill(skill)}
                  >
                    {skill.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p
          id={CANDIDATE_ELEMENT_IDS.skills.hint}
          aria-live="polite"
          className={`min-h-10 text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {hint}
        </p>
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-2">
            <Label htmlFor={CANDIDATE_ELEMENT_IDS.skills.level}>
              Самооценка
            </Label>
            <Controller
              name="claimedLevel"
              control={form.control}
              render={({ field }) => (
                <SkillLevelSelect
                  id={CANDIDATE_ELEMENT_IDS.skills.level}
                  value={field.value}
                  disabled={disabled}
                  label="Самооценка нового навыка"
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <Button
            type="submit"
            className="h-11"
            disabled={disabled || !name.trim()}
          >
            Добавить навык
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          1 — начальный уровень, 5 — высокий. Новый навык отправится на
          проверку. До 50 навыков и 20 новых предложений в сутки.
        </p>
      </fieldset>
    </form>
  );
};
