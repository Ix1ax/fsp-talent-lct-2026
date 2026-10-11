import { Controller } from 'react-hook-form';
import { LoaderCircleIcon } from 'lucide-react';

import {
  AsyncState,
  Button,
  FileInput,
  Input,
  Label,
  OptionSelect,
  Textarea,
} from '@/shared/ui';
import { type CompanyTask } from '@/entities/company-task';

import { useCompanyTaskCreateForm } from '../model';

interface CompanyTaskCreateFormProps {
  companyId: string;
  onCreated: (task: CompanyTask) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export const CompanyTaskCreateForm = ({
  companyId,
  onCreated,
  onCancel,
  onDirtyChange,
  onBusyChange,
}: CompanyTaskCreateFormProps) => {
  const { form, catalogs, selected, error, isSubmitting, errors, guard, save } =
    useCompanyTaskCreateForm({
      companyId,
      onCreated,
      onDirtyChange,
      onBusyChange,
    });
  return (
    <form
      onSubmit={(event) => void form.handleSubmit(save)(event)}
      className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="grid gap-2">
        <h2 className="text-xl font-semibold">Создать задание</h2>
        <p className="text-sm text-muted-foreground">
          Одна публикация на компанию в день по московскому времени. Квота общая
          для всех сотрудников. После публикации задание станет доступно
          кандидатам.
        </p>
      </div>
      <fieldset disabled={isSubmitting} className="grid min-w-0 gap-5">
        <div className="grid gap-2">
          <Label htmlFor="new-task-title">Название задания *</Label>
          <Input
            id="new-task-title"
            {...form.register('title')}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p role="alert" className="text-sm text-destructive">
              {errors.title.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-task-description">Описание</Label>
          <Textarea
            id="new-task-description"
            rows={4}
            {...form.register('description')}
          />
        </div>
        {catalogs.error && (
          <AsyncState
            error
            title="Не удалось загрузить справочники"
            description={catalogs.error}
            onRetry={catalogs.retry}
          />
        )}
        {catalogs.loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Загружаем специализации и грейды…
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(['specializationId', 'gradeId'] as const).map((name) => {
            const items =
              name === 'specializationId'
                ? catalogs.data?.specializations
                : catalogs.data?.grades;
            return (
              <div className="flex min-w-0 flex-col gap-2" key={name}>
                <Label htmlFor={`new-task-${name}`}>
                  {name === 'specializationId' ? 'Специализация' : 'Грейд'}
                </Label>
                <OptionSelect
                  id={`new-task-${name}`}
                  disabled={isSubmitting || !catalogs.data}
                  value={selected[name] ?? ''}
                  options={[
                    { value: '', label: 'Не указано' },
                    ...(items ?? []).map((item) => ({
                      value: String(item.id),
                      label: item.name,
                    })),
                  ]}
                  onValueChange={(value) =>
                    form.setValue(name, value, { shouldDirty: true })
                  }
                />
              </div>
            );
          })}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-task-deadline">Принимать решения до</Label>
          <Input
            id="new-task-deadline"
            type="datetime-local"
            {...form.register('deadlineAt')}
            aria-invalid={!!errors.deadlineAt}
          />
          <p className="text-sm text-muted-foreground">
            Необязательно. Время в вашем часовом поясе.
          </p>
          {errors.deadlineAt && (
            <p role="alert" className="text-sm text-destructive">
              {errors.deadlineAt.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-task-file">Файл условия *</Label>
          <Controller
            name="file"
            control={form.control}
            render={({ field }) => (
              <FileInput
                id="new-task-file"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                fileName={field.value?.name ?? null}
                accept=".pdf,.jpg,.jpeg,.png,.zip,.txt,.md"
                disabled={isSubmitting}
                onChange={(event) => field.onChange(event.target.files?.[0])}
                aria-invalid={!!errors.file}
                aria-describedby="new-task-file-help new-task-file-error"
              />
            )}
          />
          <p id="new-task-file-help" className="text-sm text-muted-foreground">
            До 10 МиБ: PDF, JPEG, PNG, ZIP, TXT или Markdown. Изображения — до 4
            Мп. ZIP — до 1000 записей и 100 МиБ суммарного размера. Текст —
            UTF-8 без NUL. Содержимое проверяется при загрузке.
          </p>
          {errors.file && (
            <p
              id="new-task-file-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.file.message}
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <LoaderCircleIcon
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {isSubmitting ? 'Публикуем…' : 'Опубликовать задание'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => guard(onCancel)}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
};
