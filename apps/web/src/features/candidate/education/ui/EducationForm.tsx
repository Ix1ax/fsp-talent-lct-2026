import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Button,
  FieldMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import {
  type CandidateEducation,
  EDUCATION_LEVELS,
  type SaveCandidateEducationInput,
} from '@/entities/candidate';

import { toEducationFormValues, toEducationInput } from '../lib';
import {
  EDUCATION_FIELDS,
  EDUCATION_LEVEL_LABELS,
  type EducationFormValues,
  educationSchema,
  GRADUATION_YEAR_MAX,
  GRADUATION_YEAR_MIN,
} from '../model';

interface EducationFormProps {
  initialValues?: EducationFormValues;
  record?: CandidateEducation;
  disabled: boolean;
  busy: boolean;
  error?: string;
  onSave: (input: SaveCandidateEducationInput, id?: string) => Promise<boolean>;
  onClose: () => void;
}

export const EducationForm = ({
  record,
  initialValues,
  disabled,
  busy,
  error,
  onSave,
  onClose,
}: EducationFormProps) => {
  const prefix = useId();
  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: initialValues ?? toEducationFormValues(record),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const errors = form.formState.errors;

  return (
    <form
      noValidate
      className="flex w-full min-w-0 flex-col gap-5 overflow-hidden rounded-lg border border-border p-4 sm:p-5"
      onSubmit={form.handleSubmit(async (values) => {
        if (!disabled && (await onSave(toEducationInput(values), record?.id)))
          onClose();
      })}
    >
      <h3 className="text-lg font-medium">
        {record ? 'Редактирование образования' : 'Новая запись об образовании'}
      </h3>
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">Сведения об образовании</legend>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${prefix}-level`} className="text-sm font-medium">
            Уровень образования
          </label>
          <Controller
            control={form.control}
            name="level"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  ref={field.ref}
                  id={`${prefix}-level`}
                  onBlur={field.onBlur}
                  className="h-11! w-full min-w-0"
                  aria-invalid={!!errors.level}
                  aria-describedby={
                    errors.level ? `${prefix}-level-error` : undefined
                  }
                >
                  <SelectValue placeholder="Выберите уровень" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {EDUCATION_LEVEL_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldMessage
            id={`${prefix}-level-error`}
            message={errors.level?.message}
          />
        </div>
        {EDUCATION_FIELDS.map((field) => {
          const id = `${prefix}-${field.key}`;
          const isYear = field.key === 'graduationYear';
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
                autoFocus={!initialValues && field.key === 'institution'}
                aria-invalid={!!errors[field.key]}
                aria-describedby={
                  [
                    isYear ? `${id}-hint` : '',
                    errors[field.key] ? `${id}-error` : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                className={
                  isYear ? 'min-h-11 w-full sm:w-40' : 'min-h-11 min-w-0'
                }
                {...(isYear
                  ? {
                      min: GRADUATION_YEAR_MIN,
                      max: GRADUATION_YEAR_MAX,
                      step: 1,
                      inputMode: 'numeric' as const,
                    }
                  : {})}
              />
              {isYear && (
                <p id={`${id}-hint`} className="text-sm text-muted-foreground">
                  Если ещё учитесь, укажите планируемый год окончания.
                </p>
              )}
              <FieldMessage
                id={`${id}-error`}
                message={errors[field.key]?.message}
              />
            </div>
          );
        })}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Button type="submit" size="lg" disabled={disabled}>
          {busy ? 'Сохранение…' : 'Сохранить образование'}
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
