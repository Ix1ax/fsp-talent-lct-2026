import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircleIcon, SaveIcon } from 'lucide-react';

import { ApiError, getApiErrorMessage } from '@/shared/api';
import { CANDIDATE_DATA_UPDATED_EVENT } from '@/shared/contants';
import { useFormUnsavedChanges } from '@/shared/hooks';
import {
  Button,
  FadeIn,
  FieldMessage,
  Input,
  Label,
  OptionSelect,
  Textarea,
  toast,
} from '@/shared/ui';
import {
  type CandidateSurvey,
  putCandidateSurvey,
} from '@/entities/candidate/profile';
import type { Catalogs } from '@/entities/catalog';

import {
  parseSoftSkills,
  type SurveyFormValues,
  surveySchema,
} from '../constants';
import { SurveyStackField } from './SurveyStackField';

interface CandidateSurveyFormProps {
  survey: CandidateSurvey | null;
  catalogs: Catalogs;
  stackName?: string | null;
  onSaved: () => void;
}
export const CandidateSurveyForm = ({
  survey,
  catalogs,
  stackName,
  onSaved,
}: CandidateSurveyFormProps) => {
  const id = useId();
  const [error, setError] = useState('');
  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      stackSkillId: survey?.stackSkillId ?? '',
      industry: survey?.industry ?? '',
      specializationId: survey?.specializationId ?? 0,
      gradeId: survey?.gradeId ?? 0,
      softSkills: survey?.softSkills.join('\n') ?? '',
    },
  });
  const { markSaved } = useFormUnsavedChanges(form);
  const { errors, isSubmitting } = form.formState;
  const save = async (values: SurveyFormValues) => {
    setError('');
    try {
      const saved = await putCandidateSurvey({
        ...values,
        softSkills: parseSoftSkills(values.softSkills),
      });
      form.reset({ ...saved, softSkills: saved.softSkills.join('\n') });
      markSaved();
      window.dispatchEvent(new Event(CANDIDATE_DATA_UPDATED_EVENT));
      toast.success('Опрос сохранён');
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === 'consent_required'
          ? 'Для сохранения нужно согласие на обработку данных. Настройте его в разделе «Согласия».'
          : getApiErrorMessage(cause),
      );
    }
  };
  return (
    <form
      onSubmit={(event) => void form.handleSubmit(save)(event)}
      className="grid gap-6"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Controller
          name="stackSkillId"
          control={form.control}
          render={({ field }) => (
            <SurveyStackField
              inputRef={field.ref}
              id={`${id}-stack`}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isSubmitting}
              error={errors.stackSkillId?.message}
              savedLabel={
                stackName ||
                (survey?.stackSkillId
                  ? 'Сохранённый стек — выберите, чтобы изменить'
                  : undefined)
              }
            />
          )}
        />
        <div className="grid content-start gap-2">
          <Label htmlFor={`${id}-industry`}>Отрасль</Label>
          <Input
            id={`${id}-industry`}
            placeholder="Например, финтех или образование"
            maxLength={200}
            disabled={isSubmitting}
            aria-invalid={!!errors.industry}
            aria-describedby={`${id}-industry-hint ${id}-industry-error`}
            {...form.register('industry')}
          />
          <p
            id={`${id}-industry-hint`}
            className="text-xs text-muted-foreground"
          >
            Сфера бизнеса, в которой хотите работать. Например, финансы,
            медицина или образование.
          </p>
          <FieldMessage
            id={`${id}-industry-error`}
            message={errors.industry?.message}
          />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`${id}-specialization`}>Специализация</Label>
          <Controller
            name="specializationId"
            control={form.control}
            render={({ field }) => (
              <OptionSelect
                {...field}
                id={`${id}-specialization`}
                onValueChange={(value) => field.onChange(Number(value))}
                options={catalogs.specializations.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                disabled={isSubmitting}
                aria-invalid={!!errors.specializationId}
                aria-describedby={`${id}-specialization-error`}
              />
            )}
          />
          <FieldMessage
            id={`${id}-specialization-error`}
            message={errors.specializationId?.message}
          />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`${id}-grade`}>Предполагаемый уровень</Label>
          <Controller
            name="gradeId"
            control={form.control}
            render={({ field }) => (
              <OptionSelect
                {...field}
                id={`${id}-grade`}
                onValueChange={(value) => field.onChange(Number(value))}
                options={catalogs.grades.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                disabled={isSubmitting}
                aria-invalid={!!errors.gradeId}
                aria-describedby={`${id}-grade-error`}
              />
            )}
          />
          <FieldMessage
            id={`${id}-grade-error`}
            message={errors.gradeId?.message}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-soft`}>
          Софт-скиллы{' '}
          <span className="font-normal text-muted-foreground">
            · необязательно
          </span>
        </Label>
        <Textarea
          id={`${id}-soft`}
          rows={5}
          placeholder={'Командная работа\nПланирование задач'}
          disabled={isSubmitting}
          aria-invalid={!!errors.softSkills}
          aria-describedby={`${id}-soft-hint ${id}-soft-error`}
          {...form.register('softSkills')}
        />
        <p id={`${id}-soft-hint`} className="text-xs text-muted-foreground">
          Каждый навык с новой строки. До 20 навыков, по 100 символов.
        </p>
        <FieldMessage
          id={`${id}-soft-error`}
          message={errors.softSkills?.message}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Изменение опроса не меняет уже подтверждённую категорию.
      </p>
      {error && (
        <FadeIn>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </FadeIn>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full sm:w-auto sm:justify-self-start"
      >
        {isSubmitting ? (
          <LoaderCircleIcon
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <SaveIcon aria-hidden="true" />
        )}
        {isSubmitting ? 'Сохраняем…' : 'Сохранить опрос'}
      </Button>
    </form>
  );
};
