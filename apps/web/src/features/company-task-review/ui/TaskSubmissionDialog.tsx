import { useCallback, useState } from 'react';

import { useUnsavedGuard } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import {
  AsyncState,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import type { Company } from '@/entities/company';
import {
  getCompanyTaskSubmission,
  type TaskSubmission,
} from '@/entities/company-task';

import { canReviewTaskSubmission, getTaskReviewError } from '../lib';
import { CompanyTaskSkeleton } from './CompanyTaskSkeleton';
import { TaskReviewForm } from './TaskReviewForm';
import { TaskSolutionDownload } from './TaskSolutionDownload';

interface TaskSubmissionDialogProps {
  company: Company;
  taskId: string;
  submissionId: string;
  onClose: () => void;
  onReviewed: (submission: TaskSubmission) => void;
  onUnavailable: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export const TaskSubmissionDialog = ({
  company,
  taskId,
  submissionId,
  onClose,
  onReviewed,
  onUnavailable,
  onDirtyChange,
  onBusyChange,
}: TaskSubmissionDialogProps) => {
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const { guard } = useUnsavedGuard(dirty, busy);

  const load = useCallback(
    async (signal: AbortSignal) => {
      try {
        return await getCompanyTaskSubmission(
          company.id,
          taskId,
          submissionId,
          signal,
        );
      } catch (error) {
        throw new Error(getTaskReviewError(error));
      }
    },
    [company.id, taskId, submissionId],
  );

  const query = useRemoteData(load);
  const dirtyChanged = useCallback(
    (value: boolean) => {
      setDirty(value);
      onDirtyChange(value);
    },
    [onDirtyChange],
  );

  const busyChanged = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange(value);
    },
    [onBusyChange],
  );

  const unavailable = () => {
    query.retry();
    onUnavailable();
  };

  const submission = query.data;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) guard(onClose);
      }}
    >
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Решение кандидата</DialogTitle>
          <DialogDescription>
            {submission?.taskTitle ??
              'Файл, результат проверки и комментарий кандидату.'}
          </DialogDescription>
        </DialogHeader>
        {query.loading && <CompanyTaskSkeleton detail />}
        {query.error && (
          <AsyncState
            error
            title="Решение недоступно"
            description={query.error}
            onRetry={query.retry}
          />
        )}
        {submission && (
          <div className="grid min-w-0 gap-5">
            <div className="grid gap-2">
              <Badge
                variant={
                  submission.status === 'reviewed' ? 'success' : 'secondary'
                }
                className="justify-self-start"
              >
                {submission.status === 'reviewed'
                  ? 'Проверено'
                  : 'Ожидает проверки'}
              </Badge>
              <p className="break-all text-sm text-muted-foreground">
                ID профиля: {submission.candidateId}
              </p>
              <p className="text-sm text-muted-foreground">
                Отправлено: {formatDate(submission.submittedAt)}
              </p>
            </div>
            <TaskSolutionDownload
              companyId={company.id}
              taskId={taskId}
              submission={submission}
              onUnavailable={unavailable}
            />
            {submission.status === 'reviewed' && (
              <div className="grid gap-3 rounded-lg bg-muted p-4">
                <h3 className="font-semibold">Результат проверки</h3>
                {submission.score !== null && (
                  <p className="text-2xl font-semibold">
                    {submission.score}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      из 100
                    </span>
                  </p>
                )}
                {submission.feedback && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {submission.feedback}
                  </p>
                )}
                {submission.reviewedAt && (
                  <p className="text-sm text-muted-foreground">
                    Проверено: {formatDate(submission.reviewedAt)}
                  </p>
                )}
              </div>
            )}
            {canReviewTaskSubmission(company.memberRole) ? (
              <TaskReviewForm
                key={submission.id}
                submission={submission}
                companyId={company.id}
                taskId={taskId}
                onReviewed={(saved) => {
                  query.updateData(() => saved);
                  onReviewed(saved);
                }}
                onUnavailable={unavailable}
                onDirtyChange={dirtyChanged}
                onBusyChange={busyChanged}
              />
            ) : (
              <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                Наблюдатель может просматривать и скачивать решения. Оценку и
                комментарий сохраняют владелец и рекрутер.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
