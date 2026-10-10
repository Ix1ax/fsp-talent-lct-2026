import type { TaskSubmission } from '@/entities/company-task';
import { downloadMyTaskSolution } from '@/entities/company-task';

import { TaskFileDownload } from './TaskFileDownload';

interface SubmissionResultProps {
  submission: TaskSubmission;
}

export const SubmissionResult = ({ submission }: SubmissionResultProps) => {
  return (
    <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">
          {submission.status === 'reviewed'
            ? 'Результат проверки'
            : 'Решение отправлено'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {submission.status === 'reviewed'
            ? 'Работодатель проверил ваше решение.'
            : 'Ожидает проверки работодателем. Заменить отправленный файл нельзя.'}
        </p>
      </div>
      {submission.score !== null && (
        <p className="text-2xl font-semibold">
          {submission.score}{' '}
          <span className="text-base font-normal text-muted-foreground">
            из 100
          </span>
        </p>
      )}
      {submission.feedback && (
        <div>
          <h3 className="font-medium">Комментарий работодателя</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">
            {submission.feedback}
          </p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Отправлено: {new Date(submission.submittedAt).toLocaleString('ru-RU')}
      </p>
      {submission.reviewedAt && (
        <p className="text-sm text-muted-foreground">
          Проверено: {new Date(submission.reviewedAt).toLocaleString('ru-RU')}
        </p>
      )}
      <TaskFileDownload
        name={submission.file.originalName}
        load={() => downloadMyTaskSolution(submission.id)}
      />
    </section>
  );
};
