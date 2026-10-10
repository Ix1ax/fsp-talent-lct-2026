import { useEffect, useRef, useState } from 'react';
import { LoaderCircleIcon } from 'lucide-react';

import { ApiError } from '@/shared/api';
import { Button } from '@/shared/ui';
import {
  downloadCompanyTaskSolution,
  type TaskSubmission,
} from '@/entities/company-task';

import { getTaskReviewError } from '../lib';

interface TaskSolutionDownloadProps {
  companyId: string;
  taskId: string;
  submission: TaskSubmission;
  onUnavailable: () => void;
}

export const TaskSolutionDownload = ({
  companyId,
  taskId,
  submission,
  onUnavailable,
}: TaskSolutionDownloadProps) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      request.current?.abort();
    };
  }, []);

  const download = async () => {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError('');
    const controller = new AbortController();
    request.current = controller;

    try {
      const blob = await downloadCompanyTaskSolution(
        companyId,
        taskId,
        submission.id,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = submission.file.originalName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(getTaskReviewError(cause));
      if (cause instanceof ApiError && cause.status === 404) onUnavailable();
    } finally {
      locked.current = false;
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return (
    <div className="grid justify-items-start gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => void download()}
      >
        {pending && (
          <LoaderCircleIcon
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        )}
        {pending ? 'Скачиваем…' : 'Скачать решение'}
      </Button>
      <p className="break-all text-sm text-muted-foreground">
        {submission.file.originalName} ·{' '}
        {(submission.file.sizeBytes / 1024).toLocaleString('ru-RU', {
          maximumFractionDigits: 1,
        })}{' '}
        КиБ
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
