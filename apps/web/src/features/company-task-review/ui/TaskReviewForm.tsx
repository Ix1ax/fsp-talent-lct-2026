import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError } from '@/shared/api';
import { Button, Input, Label, Textarea, toast } from '@/shared/ui';
import {
  reviewCompanyTaskSubmission,
  type TaskSubmission,
} from '@/entities/company-task';

import { type TaskReviewFormValues, taskReviewSchema } from '../constants';
import {
  getTaskReviewError,
  getTaskReviewInput,
  getTaskReviewValues,
} from '../lib';

interface TaskReviewFormProps {
  submission: TaskSubmission;
  companyId: string;
  taskId: string;
  onReviewed: (submission: TaskSubmission) => void;
  onUnavailable: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export const TaskReviewForm = ({
  submission,
  companyId,
  taskId,
  onReviewed,
  onUnavailable,
  onDirtyChange,
  onBusyChange,
}: TaskReviewFormProps) => {
  const form = useForm<TaskReviewFormValues>({
    resolver: zodResolver(taskReviewSchema),
    defaultValues: getTaskReviewValues(submission),
  });
  const [error, setError] = useState('');
  const locked = useRef(false);
  const { isDirty, isSubmitting } = form.formState;

  useEffect(() => {
    onDirtyChange(isDirty);
    return () => onDirtyChange(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onBusyChange(isSubmitting);
    return () => onBusyChange(false);
  }, [isSubmitting, onBusyChange]);

  const save = async (values: TaskReviewFormValues) => {
    if (locked.current) return;
    locked.current = true;
    setError('');
    try {
      const saved = await reviewCompanyTaskSubmission(
        companyId,
        taskId,
        submission.id,
        getTaskReviewInput(values),
      );
      form.reset(getTaskReviewValues(saved));
      onReviewed(saved);
      toast.success('Проверка сохранена. Кандидат увидит результат.');
    } catch (cause) {
      setError(getTaskReviewError(cause));
      if (cause instanceof ApiError && cause.status === 404) onUnavailable();
    } finally {
      locked.current = false;
    }
  };

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(save)(event)}
      className="grid gap-5 border-t pt-5"
    >
      <div className="grid gap-1.5">
        <h3 className="font-semibold">Проверка решения</h3>
        <p className="text-sm text-muted-foreground">
          Оценка и комментарий будут доступны кандидату.
        </p>
      </div>
      {submission.status === 'reviewed' && (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Повторное сохранение заменит оценку и комментарий. Если очистить поле,
          его прежнее значение удалится.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="review-score">Оценка из 100</Label>
        <Input
          id="review-score"
          type="number"
          min={0}
          max={100}
          step={1}
          inputMode="numeric"
          disabled={isSubmitting}
          aria-invalid={!!form.formState.errors.score}
          aria-describedby="review-score-error"
          {...form.register('score')}
        />
        {form.formState.errors.score && (
          <p
            id="review-score-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.score.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="review-feedback">Комментарий</Label>
        <Textarea
          id="review-feedback"
          rows={5}
          maxLength={5000}
          disabled={isSubmitting}
          aria-invalid={!!form.formState.errors.feedback}
          aria-describedby="review-feedback-help review-feedback-error"
          {...form.register('feedback')}
        />
        <p id="review-feedback-help" className="text-sm text-muted-foreground">
          Можно сохранить только оценку или только комментарий. До 5000
          символов.
        </p>
        {form.formState.errors.feedback && (
          <p
            id="review-feedback-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.feedback.message}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="justify-self-start"
      >
        {isSubmitting ? 'Сохраняем…' : 'Сохранить проверку'}
      </Button>
    </form>
  );
};
