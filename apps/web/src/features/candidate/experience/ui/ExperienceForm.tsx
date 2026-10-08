import { useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, Switch, Textarea } from '@/shared/ui';
import type {
  CandidateExperience,
  SaveCandidateExperienceInput,
} from '@/entities/candidate';

import { toExperienceFormValues, toExperienceInput } from '../lib';
import { type ExperienceFormValues, experienceSchema } from '../model';

interface ExperienceFormProps {
  record?: CandidateExperience;
  disabled: boolean;
  busy: boolean;
  error?: string;
  onSave: (
    input: SaveCandidateExperienceInput,
    id?: string,
  ) => Promise<boolean>;
  onClose: () => void;
}

const fields = [
  {
    key: 'company',
    label: 'Компания',
    type: 'text',
    placeholder: 'Название компании',
  },
  {
    key: 'position',
    label: 'Должность',
    type: 'text',
    placeholder: 'Например, PHP-программист',
  },
  {
    key: 'startedOn',
    label: 'Месяц начала',
    type: 'month',
    placeholder: 'ГГГГ-ММ',
  },
  {
    key: 'endedOn',
    label: 'Месяц окончания',
    type: 'month',
    placeholder: 'ГГГГ-ММ',
  },
] as const;

export const ExperienceForm = ({
  record,
  disabled,
  busy,
  error,
  onSave,
  onClose,
}: ExperienceFormProps) => {
  const prefix = useId();
  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: toExperienceFormValues(record),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const current = useWatch({ control: form.control, name: 'current' });
  const errors = form.formState.errors;

  return (
    <form
      noValidate
      className="flex flex-col gap-5 rounded-lg border border-border p-4 sm:p-5"
      onSubmit={form.handleSubmit(async (values) => {
        if (!disabled && (await onSave(toExperienceInput(values), record?.id)))
          onClose();
      })}
    >
      <h3 className="text-lg font-medium">
        {record ? 'Редактирование места работы' : 'Новое место работы'}
      </h3>
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">Сведения о месте работы</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const id = `${prefix}-${field.key}`;
            const inactive = field.key === 'endedOn' && current;
            return (
              <div key={field.key} className="flex min-w-0 flex-col gap-2">
                <label htmlFor={id} className="text-sm font-medium">
                  {field.label}
                </label>
                <Input
                  id={id}
                  {...form.register(field.key)}
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled={disabled || inactive}
                  autoFocus={field.key === 'company'}
                  aria-invalid={!inactive && !!errors[field.key]}
                  aria-describedby={
                    !inactive && errors[field.key] ? `${id}-error` : undefined
                  }
                  className="min-h-11 min-w-0"
                />
                {!inactive && errors[field.key] && (
                  <p id={`${id}-error`} className="text-sm text-destructive">
                    {errors[field.key]?.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <label
          htmlFor={`${prefix}-current`}
          className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium"
        >
          <Switch
            id={`${prefix}-current`}
            checked={current}
            disabled={disabled}
            onCheckedChange={(checked) => {
              form.setValue('current', checked, { shouldDirty: true });
              if (checked) form.clearErrors('endedOn');
            }}
          />
          Работаю здесь сейчас
        </label>
        <p className="text-sm text-muted-foreground">
          Укажите месяц и год. Для текущего места работы дата окончания не
          нужна.
        </p>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${prefix}-description`}
            className="text-sm font-medium"
          >
            Описание работы{' '}
            <span className="font-normal text-muted-foreground">
              (необязательно)
            </span>
          </label>
          <Textarea
            id={`${prefix}-description`}
            {...form.register('description')}
            rows={5}
            placeholder="Расскажите о задачах, технологиях и результатах"
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? `${prefix}-description-error` : undefined
            }
          />
          {errors.description && (
            <p
              id={`${prefix}-description-error`}
              className="text-sm text-destructive"
            >
              {errors.description.message}
            </p>
          )}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={disabled}>
          {busy ? 'Сохранение…' : 'Сохранить место работы'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={onClose}
        >
          Отменить изменения
        </Button>
      </div>
    </form>
  );
};
