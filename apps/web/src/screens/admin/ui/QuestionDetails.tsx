import { useState } from 'react';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { useGuardedRouter } from '@/shared/hooks';
import { Button } from '@/shared/ui';
import { adminRequest, adminSchemas, kindLabels } from '@/entities/admin';
import {
  AdminConfirmDialog,
  AdminPanel,
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
  const router = useGuardedRouter();
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
    <AdminPanel>
      <h1 className="text-2xl font-semibold">Карточка задания</h1>
      <p className="text-sm text-muted-foreground">
        {question
          ? `${question.skill_name} · Сложность ${question.difficulty} · ${kindLabels[question.kind]}`
          : 'Загружаем версии…'}
      </p>
      <ErrorNotice error={detail.error} onRetry={detail.reload} />
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
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="outline"
              disabled={mutation.busy || !question.active}
              onClick={() =>
                router.push(DYNAMIC_ROUTES.ADMIN_QUESTION(id, 'edit'))
              }
            >
              Создать новую версию
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={mutation.busy || !question.active}
              onClick={() => setConfirm('archive')}
            >
              Архивировать задание
            </Button>
          </div>
          {confirm !== null && (
            <AdminConfirmDialog
              title={
                confirm === 'archive'
                  ? 'Архивировать задание?'
                  : `Опубликовать v${confirm}?`
              }
              description={
                confirm === 'archive'
                  ? 'Задание станет недоступным для новых тестов. Восстановление не предусмотрено.'
                  : 'Предыдущая опубликованная версия будет архивирована.'
              }
              busy={mutation.busy}
              error={mutation.error}
              destructive={confirm === 'archive'}
              onClose={() => setConfirm(null)}
              onConfirm={async () => {
                await mutation.run(async () => {
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
                });
              }}
            />
          )}
          {question.versions?.map((version) => (
            <section
              key={version.version}
              className="grid min-w-0 gap-3 rounded-lg border p-4"
            >
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
                <pre
                  tabIndex={0}
                  aria-label="Код задания"
                  className="min-w-0 max-w-full overflow-x-auto rounded-md bg-muted p-3 text-xs focus-visible:outline-2 focus-visible:outline-ring"
                >
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
    </AdminPanel>
  );
};
