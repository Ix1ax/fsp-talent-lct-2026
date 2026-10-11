import { ArrowLeftIcon, DownloadIcon, LoaderCircleIcon } from 'lucide-react';

import { Badge, Button, ConfirmDeleteDialog, RemoteState } from '@/shared/ui';
import { formatDate, formatFileSize } from '@/shared/utils';
import { type Catalogs } from '@/entities/catalog';
import { type Company } from '@/entities/company';
import { type CompanyTask } from '@/entities/company-task';

import { canReviewTaskSubmission } from '../lib';
import { useCompanyTaskDetails } from '../model';
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
  const {
    remote,
    task,
    mutation,
    action,
    confirm,
    setConfirm,
    setReviewBusy,
    busy,
    download,
    close,
  } = useCompanyTaskDetails({ company, taskId, onTaskChange, onBusyChange });
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
                {task.file.originalName} · {formatFileSize(task.file.sizeBytes)}
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
