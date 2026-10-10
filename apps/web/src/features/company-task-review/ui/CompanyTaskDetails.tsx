import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, DownloadIcon, LoaderCircleIcon } from 'lucide-react';

import { ApiError } from '@/shared/api';
import { useAsyncMutation, useRemoteData } from '@/shared/hooks';
import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  RemoteState,
  toast,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import type { Catalogs } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import {
  closeCompanyTask,
  type CompanyTask,
  downloadCompanyTask,
  getCompanyTask,
} from '@/entities/company-task';

import { canReviewTaskSubmission } from '../lib';
import { CompanyTaskSubmissions } from './CompanyTaskSubmissions';

interface CompanyTaskDetailsProps {
  company: Company;
  taskId: string;
  catalogs: Catalogs;
  onBack: () => void;
  onTaskChange: (task: CompanyTask) => void;
  onOpenCandidate: (candidateId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export const CompanyTaskDetails = ({
  company,
  taskId,
  catalogs,
  onBack,
  onTaskChange,
  onOpenCandidate,
  onDirtyChange,
  onBusyChange,
}: CompanyTaskDetailsProps) => {
  const load = useCallback(
    (signal: AbortSignal) => getCompanyTask(company.id, taskId, signal),
    [company.id, taskId],
  );
  const remote = useRemoteData(load);
  const task = remote.data;
  const mutation = useAsyncMutation();
  const [action, setAction] = useState<'download' | 'close' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const busy = mutation.pending || reviewBusy;
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => () => request.current?.abort(), []);

  const download = async () => {
    if (!task || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setAction('download');
    try {
      await mutation.run(async () => {
        const blob = await downloadCompanyTask(
          company.id,
          task.id,
          controller.signal,
        );
        controller.signal.throwIfAborted();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = task.file.originalName;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } catch (error) {
      if (
        !controller.signal.aborted &&
        error instanceof ApiError &&
        error.status === 404
      )
        remote.retry();
    } finally {
      if (!controller.signal.aborted) setAction(null);
    }
  };

  const close = async () => {
    if (!task || busy) return false;
    const controller = new AbortController();
    request.current = controller;
    setAction('close');
    try {
      await mutation.run(async () => {
        const updated = await closeCompanyTask(
          company.id,
          task.id,
          controller.signal,
        );
        controller.signal.throwIfAborted();
        remote.updateData(() => updated);
        onTaskChange(updated);
        toast.success('Приём решений закрыт');
      });
      return true;
    } catch {
      return false;
    } finally {
      if (!controller.signal.aborted) setAction(null);
    }
  };

  return (
    <div className="grid min-w-0 gap-5">
      <Button
        variant="ghost"
        className="justify-self-start"
        disabled={busy}
        onClick={onBack}
      >
        <ArrowLeftIcon /> Все задания компании
      </Button>
      <RemoteState {...remote} />
      {task && (
        <>
          <article className="grid min-w-0 gap-5 rounded-xl border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant={task.status === 'open' ? 'success' : 'secondary'}>
                {task.status === 'open' ? 'Приём открыт' : 'Приём завершён'}
              </Badge>
              {task.moderationStatus === 'hidden' && (
                <Badge variant="outline">Скрыто модератором</Badge>
              )}
              {catalogs.specializations.find(
                (item) => item.id === task.specializationId,
              )?.name && (
                <Badge variant="outline">
                  {
                    catalogs.specializations.find(
                      (item) => item.id === task.specializationId,
                    )?.name
                  }
                </Badge>
              )}
              {catalogs.grades.find((item) => item.id === task.gradeId)
                ?.name && (
                <Badge variant="outline">
                  {
                    catalogs.grades.find((item) => item.id === task.gradeId)
                      ?.name
                  }
                </Badge>
              )}
            </div>
            <h2 className="break-words text-xl font-semibold">{task.title}</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">
              {task.description || 'Условие задания — в приложенном файле.'}
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Опубликовано</dt>
                <dd className="mt-1">{formatDate(task.publishedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Срок приёма решений</dt>
                <dd className="mt-1">
                  {task.deadlineAt
                    ? formatDate(task.deadlineAt)
                    : 'Без ограничения'}
                </dd>
              </div>
            </dl>
            {task.status === 'closed' && (
              <p className="text-sm text-muted-foreground">
                Новые решения не принимаются. Условие и ранее отправленные
                работы доступны для просмотра и проверки.
              </p>
            )}
            <div className="grid gap-3 border-t pt-4">
              <p className="break-all text-sm text-muted-foreground">
                {task.file.originalName} ·{' '}
                {(task.file.sizeBytes / 1024).toLocaleString('ru-RU', {
                  maximumFractionDigits: 1,
                })}{' '}
                КиБ
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void download()}
                >
                  {action === 'download' ? (
                    <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <DownloadIcon />
                  )}
                  {action === 'download' ? 'Скачиваем…' : 'Скачать условие'}
                </Button>
                {task.status === 'open' &&
                  canReviewTaskSubmission(company.memberRole) && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        mutation.clearError();
                        setConfirm(true);
                      }}
                    >
                      Закрыть приём решений
                    </Button>
                  )}
              </div>
            </div>
            {mutation.error && !confirm && (
              <p role="alert" className="text-sm text-destructive">
                {mutation.error}
              </p>
            )}
          </article>
          <CompanyTaskSubmissions
            company={company}
            task={task}
            onOpenCandidate={onOpenCandidate}
            onDirtyChange={onDirtyChange}
            onBusyChange={setReviewBusy}
          />
          {confirm && (
            <ConfirmDeleteDialog
              title="Закрыть приём решений?"
              description={`Кандидаты больше не смогут отправлять решения задания «${task.title}». Вы сможете скачать условие и проверить уже полученные работы. Открыть приём повторно нельзя.`}
              confirmLabel="Закрыть приём"
              busyLabel="Закрываем…"
              busy={busy}
              error={mutation.error}
              onConfirm={close}
              onClose={() => setConfirm(false)}
            />
          )}
        </>
      )}
    </div>
  );
};
