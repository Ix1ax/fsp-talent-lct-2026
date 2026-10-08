import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Card } from '@/shared/ui';
import { adminRequest, adminSchemas, kindLabels } from '@/entities/admin';
import {
  ErrorNotice,
  Status,
  useAdminMutation,
  useAdminQuery,
  useAdminSession,
} from '@/features/admin';

interface QuestionDetailsProps {
  id: string;
  onSaved: () => void;
}
export const QuestionDetails = ({ id, onSaved }: QuestionDetailsProps) => {
  const { session } = useAdminSession();
  const router = useRouter();
  const detail = useAdminQuery(
    `/assessments/questions/${id}`,
    adminSchemas.question,
  );
  const refresh = () => {
    detail.reload();
    onSaved();
  };
  const mutation = useAdminMutation(refresh);
  const [confirm, setConfirm] = useState<number | 'archive' | null>(null);
  const question = detail.data;
  return (
    <Card className="min-w-0 gap-5 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Карточка задания</h1>
      <p className="text-sm text-muted-foreground">
        {question
          ? `${question.skill_name} · Сложность ${question.difficulty} · ${kindLabels[question.kind]}`
          : 'Загружаем версии…'}
      </p>
      <ErrorNotice error={detail.error} />
      <ErrorNotice error={mutation.error} />
      {question && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Status value={question.active ? 'active' : 'archived'} />
            <span className="text-sm">
              Последняя: v{question.latest_version} · Опубликована:{' '}
              {question.published_version
                ? `v${question.published_version}`
                : 'нет'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={mutation.busy || !question.active}
              onClick={() => router.push(`/admin/questions/${id}/edit`)}
            >
              Создать новую версию
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.busy || !question.active}
              onClick={() => setConfirm('archive')}
            >
              Архивировать задание
            </Button>
          </div>
          {confirm !== null && (
            <div className="grid gap-3 border bg-muted p-4">
              <p className="text-sm">
                {confirm === 'archive'
                  ? 'Архивировать задание? Оно станет недоступным для новых тестов. Восстановление не предусмотрено.'
                  : `Опубликовать v${confirm}? Предыдущая опубликованная версия будет архивирована.`}
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={mutation.busy}
                  onClick={() =>
                    void mutation.run(async () => {
                      if (confirm === 'archive')
                        await adminRequest(
                          session!.access_token,
                          `/assessments/questions/${id}/archive`,
                          adminSchemas.question,
                          { method: 'POST' },
                        );
                      else
                        await adminRequest(
                          session!.access_token,
                          `/assessments/questions/${id}/versions/${confirm}/publish`,
                          adminSchemas.version,
                          { method: 'POST' },
                        );
                      setConfirm(null);
                      refresh();
                    })
                  }
                >
                  Подтвердить
                </Button>
                <Button
                  variant="outline"
                  disabled={mutation.busy}
                  onClick={() => setConfirm(null)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
          {question.versions?.map((version) => (
            <section key={version.version} className="grid gap-3 border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Версия {version.version}</h3>
                  <Status value={version.status} />
                </div>
                {version.status === 'draft' && question.active && (
                  <Button
                    size="sm"
                    disabled={mutation.busy}
                    onClick={() => setConfirm(version.version)}
                  >
                    Опубликовать
                  </Button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm wrap-anywhere">
                {version.prompt.text}
              </p>
              {version.prompt.code && (
                <pre className="min-w-0 overflow-x-auto bg-muted p-3 text-xs">
                  <code>{version.prompt.code}</code>
                </pre>
              )}
              {version.prompt.options?.map((option) => (
                <p
                  key={option.id}
                  className={`text-sm ${version.grading_spec.correct?.includes(option.id) ? 'text-success' : ''}`}
                >
                  {option.id}. {option.text}
                  {version.grading_spec.correct?.includes(option.id) && ' ✓'}
                </p>
              ))}
              {version.grading_spec.type === 'text' && (
                <p className="text-sm text-success">
                  Ответы: {version.grading_spec.accepted?.join(' / ')} ·{' '}
                  {version.grading_spec.case_sensitive
                    ? 'Регистр учитывается'
                    : 'Без учёта регистра'}
                </p>
              )}
              <p className="text-xs text-caption">
                Создана {new Date(version.created_at).toLocaleString('ru-RU')}
              </p>
            </section>
          ))}
        </>
      )}
    </Card>
  );
};
