import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { CANDIDATE_DRAFT_ROUTES } from '@/shared/contants';
import { useFormUnsavedChanges } from '@/shared/hooks';
import { Button, Input, Label } from '@/shared/ui';
import type { ClaimedLevel, ResumeSkill } from '@/entities/candidate';

import { SkillLevelSelect, skillSchema } from '../../skills';

interface ResumeSkillFormProps {
  skill: ResumeSkill;
  disabled: boolean;
  error?: string;
  onSave: (name: string, level: ClaimedLevel) => Promise<boolean>;
  onDismiss: () => void;
}

export const ResumeSkillForm = ({
  skill,
  disabled,
  error,
  onSave,
  onDismiss,
}: ResumeSkillFormProps) => {
  const prefix = useId();

  const form = useForm<z.infer<typeof skillSchema>>({
    resolver: zodResolver(skillSchema),
    defaultValues: { name: skill.name, claimedLevel: 1 },
  });
  const unsaved = useFormUnsavedChanges(form, {
    preserveWithin: CANDIDATE_DRAFT_ROUTES,
    initialDraft: true,
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
      onSubmit={form.handleSubmit(async (values) => {
        if (await onSave(values.name, values.claimedLevel)) {
          form.reset(values);
          unsaved.markSaved();
        }
      })}
    >
      <fieldset disabled={disabled} className="flex flex-col gap-3">
        <Label htmlFor={`${prefix}-name`}>Навык из резюме</Label>
        <Input
          id={`${prefix}-name`}
          {...form.register('name')}
          aria-invalid={!!form.formState.errors.name}
          aria-describedby={
            form.formState.errors.name ? `${prefix}-error` : undefined
          }
        />
        {form.formState.errors.name && (
          <p id={`${prefix}-error`} role="alert">
            {form.formState.errors.name.message}
          </p>
        )}
        <Label htmlFor={`${prefix}-level`}>Проверьте самооценку</Label>
        <Controller
          name="claimedLevel"
          control={form.control}
          render={({ field }) => (
            <SkillLevelSelect
              id={`${prefix}-level`}
              value={field.value}
              disabled={disabled}
              label="Самооценка навыка из резюме"
              onChange={field.onChange}
            />
          )}
        />
        <p className="text-sm text-muted-foreground">
          Резюме не содержит самооценки для сервиса. Выберите уровень от 1 до 5.
        </p>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Сохранить навык</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => unsaved.discard(onDismiss)}
          >
            Убрать из черновика
          </Button>
        </div>
      </fieldset>
    </form>
  );
};
