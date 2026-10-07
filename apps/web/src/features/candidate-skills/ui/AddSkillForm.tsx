import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { Button, Input, Label } from '@/shared/ui';
import type { ClaimedLevel } from '@/entities/candidate-skill';

import { skillSchema } from '../constants';
import { useSkillSearch } from '../model';
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
  const search = useSkillSearch(name);
  const [selectedId, setSelectedId] = useState<string>();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={form.handleSubmit(async (values) => {
        if (disabled) return;
        if (await onAdd(values.name, values.claimedLevel, selectedId)) {
          form.reset();
          setSelectedId(undefined);
        }
      })}
    >
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3">
        <Label htmlFor="candidate-skill-name">Найти или предложить навык</Label>
        <Input
          id="candidate-skill-name"
          placeholder="Например, Go или Svelte"
          aria-invalid={!!form.formState.errors.name}
          aria-describedby={
            form.formState.errors.name ? 'candidate-skill-error' : undefined
          }
          {...form.register('name', {
            onChange: () => setSelectedId(undefined),
          })}
        />
        {form.formState.errors.name && (
          <p
            id="candidate-skill-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.name.message}
          </p>
        )}
        {!selectedId && search.loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Поиск навыков…
          </p>
        )}
        {!selectedId && search.error && (
          <p role="alert" className="text-sm text-muted-foreground">
            {search.error}
          </p>
        )}
        {!selectedId && search.items.length > 0 && (
          <ul
            aria-label="Навыки из справочника"
            className="flex max-h-48 flex-col gap-1 overflow-y-auto"
          >
            {search.items.map((skill) => (
              <li key={skill.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal text-left [overflow-wrap:anywhere]"
                  disabled={disabled}
                  onClick={() => {
                    form.setValue('name', skill.name, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setSelectedId(skill.id);
                  }}
                >
                  {skill.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">Самооценка</span>
          <Controller
            name="claimedLevel"
            control={form.control}
            render={({ field }) => (
              <SkillLevelSelect
                value={field.value}
                disabled={disabled}
                label="Самооценка нового навыка"
                onChange={field.onChange}
              />
            )}
          />
          <Button type="submit" disabled={disabled}>
            Добавить навык
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          1 — начальный уровень, 5 — высокий. Неизвестный навык отправится на
          модерацию. До 50 навыков и 20 новых предложений в сутки.
        </p>
      </fieldset>
    </form>
  );
};
