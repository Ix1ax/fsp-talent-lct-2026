import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { InfoIcon, LoaderCircleIcon, UploadIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  Button,
  Checkbox,
  FileInput,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui';
import { getCandidateFullProfileClient } from '@/entities/candidate';
import {
  type CompanyTask,
  submitTaskSolution,
  type TaskSubmission,
} from '@/entities/company-task';

import { type SolutionFormValues, solutionSchema } from '../constants';
import { isTaskOpen, taskErrorMessage } from '../lib';

interface TaskSolutionFormProps {
  task: CompanyTask;
  onSubmitted: (submission: TaskSubmission) => void;
}
export const TaskSolutionForm = ({
  task,
  onSubmitted,
}: TaskSolutionFormProps) => {
  const form = useForm<SolutionFormValues>({
    resolver: zodResolver(solutionSchema),
    defaultValues: { confirmed: false },
  });
  const [error, setError] = useState('');
  const [prerequisite, setPrerequisite] = useState<
    'profile' | 'consents' | null
  >(null);

  const locked = useRef(false);

  const send = async ({ file }: SolutionFormValues) => {
    if (locked.current) return;
    locked.current = true;
    setError('');
    setPrerequisite(null);
    try {
      if (!isTaskOpen(task)) {
        setError('Приём решений завершён.');
        return;
      }
      const full = await getCandidateFullProfileClient();
      if (!full.profile) {
        setPrerequisite('profile');
        return;
      }
      const active = full.consents.items.filter(
        (consent) => !consent.revokedAt && !consent.companyId,
      );
      if (
        !['processing', 'publication'].every((kind) =>
          active.some((consent) => consent.kind === kind),
        )
      ) {
        setPrerequisite('consents');
        return;
      }
      onSubmitted(await submitTaskSolution(task.id, file));
    } catch (cause) {
      setError(taskErrorMessage(cause));
    } finally {
      locked.current = false;
    }
  };

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(send)(event)}
      className="space-y-6 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <UploadIcon aria-hidden="true" className="size-5 text-primary" />
          Ваше решение
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Один окончательный ответ на задание. После отправки заменить файл
          нельзя.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="solution-file">Файл решения</Label>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label="О выборе файла решения"
              >
                <InfoIcon aria-hidden="true" className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              sideOffset={6}
              className="motion-reduce:animate-none"
            >
              Выберите один файл с готовым решением. До отправки его можно
              заменить.
            </TooltipContent>
          </Tooltip>
        </div>
        <Controller
          control={form.control}
          name="file"
          render={({ field }) => (
            <FileInput
              id="solution-file"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              fileName={field.value?.name ?? null}
              accept=".pdf,.jpg,.jpeg,.png,.zip,.txt,.md"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!form.formState.errors.file}
              aria-describedby="solution-file-help solution-file-error"
              onChange={(event) => {
                field.onChange(event.target.files?.[0]);
                form.setValue('confirmed', false, { shouldDirty: true });
              }}
            />
          )}
        />
        <p id="solution-file-help" className="text-sm text-muted-foreground">
          До 10 МиБ: PDF, JPEG, PNG, ZIP, TXT или Markdown. Изображения — до 4
          мегапикселей. ZIP — до 1000 файлов и 100 МиБ суммарного размера. Текст
          — UTF-8.
        </p>
        <p
          id="solution-file-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {form.formState.errors.file?.message}
        </p>
      </div>
      <div>
        <label className="flex items-start gap-3 rounded-lg bg-muted p-4 text-sm leading-relaxed">
          <Controller
            control={form.control}
            name="confirmed"
            render={({ field }) => (
              <Checkbox
                className="mt-1"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={form.formState.isSubmitting}
                aria-invalid={!!form.formState.errors.confirmed}
                aria-describedby="solution-confirm-error"
              />
            )}
          />
          Я проверил(а) файл и готов(а) отправить окончательное решение.
        </label>
        <p
          id="solution-confirm-error"
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {form.formState.errors.confirmed?.message}
        </p>
      </div>
      {prerequisite && (
        <div role="alert" className="space-y-2 text-sm">
          <p>
            {prerequisite === 'profile'
              ? 'Сначала создайте профиль кандидата.'
              : 'Для отправки нужны согласия на обработку данных и публикацию профиля. Открывать профиль для поиска не требуется.'}
          </p>
          <Button asChild variant="outline">
            <Link
              href={
                prerequisite === 'profile'
                  ? STATIC_ROUTES.CANDIDATE_PROFILE
                  : STATIC_ROUTES.CANDIDATE_CONSENTS
              }
            >
              {prerequisite === 'profile'
                ? 'Создать профиль'
                : 'Настроить согласия'}
            </Link>
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <LoaderCircleIcon
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            )}
            {form.formState.isSubmitting ? 'Отправляем…' : 'Отправить решение'}
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="motion-reduce:animate-none">
          Отправить окончательное решение работодателю. После отправки заменить
          файл нельзя.
        </TooltipContent>
      </Tooltip>
    </form>
  );
};
