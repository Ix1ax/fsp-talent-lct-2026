import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/shared/ui';
import {
  AdminApiError,
  adminRequest,
  adminSchemas,
  queryString,
} from '@/entities/admin';
import {
  AdminConfirmDialog,
  AdminPanel,
  ErrorNotice,
  Status,
  useAdminMutation,
  useAdminQuery,
  useAdminSession,
} from '@/features/admin';

interface TemplateDetailsProps {
  id: string;
  onSaved: () => void;
}
export const TemplateDetails = ({ id, onSaved }: TemplateDetailsProps) => {
  const { session } = useAdminSession();
  const router = useRouter();
  const detail = useAdminQuery(
    `/assessments/templates/${id}`,
    adminSchemas.template,
  );
  const refresh = () => {
    detail.reload();
    onSaved();
  };
  const mutation = useAdminMutation(refresh);
  const [confirm, setConfirm] = useState<'publish' | 'archive' | null>(null);
  const template = detail.data;
  const shortages =
    mutation.error instanceof AdminApiError ? mutation.error.shortages : [];
  return (
    <AdminPanel>
      <h1 className="text-2xl font-semibold">
        Состав теста{template && ` · v${template.version}`}
      </h1>
      <p className="text-sm text-muted-foreground">
        {template?.stack_name ?? 'Шаблон теста'}
      </p>
      <ErrorNotice error={detail.error} onRetry={detail.reload} />
      <ErrorNotice error={mutation.error} />
      {template && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Status value={template.status} />
            <span className="text-sm">
              {template.time_limit_sec / 60} мин · Проходной балл{' '}
              {template.pass_score}% · Вопросов:{' '}
              {template.blueprint?.reduce((n, r) => n + r.question_count, 0)}
            </span>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              disabled={mutation.busy || !template.blueprint?.length}
              onClick={() => router.push(`/admin/templates/${id}/preview`)}
            >
              Предпросмотр теста
            </Button>
            <Button
              variant="outline"
              disabled={mutation.busy}
              onClick={() => router.push(`/admin/templates/${id}/edit`)}
            >
              Создать новую версию
            </Button>
            {template.status === 'draft' && (
              <Button
                disabled={mutation.busy || !template.stack_skill_id}
                onClick={() => setConfirm('publish')}
              >
                Опубликовать
              </Button>
            )}
            {template.status !== 'archived' && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={mutation.busy}
                onClick={() => setConfirm('archive')}
              >
                В архив
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={mutation.busy || detail.loading}
              onClick={detail.reload}
            >
              Обновить доступность
            </Button>
          </div>
          {!template.stack_skill_id && (
            <p className="text-sm text-warning">
              У старого шаблона отсутствует стек. Создайте новую версию и
              выберите основной навык.
            </p>
          )}
          {confirm && (
            <AdminConfirmDialog
              title={
                confirm === 'publish'
                  ? 'Опубликовать шаблон?'
                  : 'Архивировать шаблон?'
              }
              description={
                confirm === 'publish'
                  ? 'Предыдущий опубликованный шаблон этого стека, специализации и грейда будет архивирован.'
                  : 'Восстановление не предусмотрено, предыдущая версия не опубликуется автоматически.'
              }
              busy={mutation.busy}
              error={mutation.error}
              destructive={confirm === 'archive'}
              onClose={() => setConfirm(null)}
              onConfirm={async () => {
                await mutation.run(async () => {
                  await adminRequest(
                    session!.access_token,
                    `/assessments/templates/${id}/${confirm}`,
                    adminSchemas.template,
                    { method: 'POST' },
                  );
                  setConfirm(null);
                  refresh();
                });
              }}
            />
          )}
          {template.blueprint?.map((row) => {
            const shortage = shortages.find(
              (s) =>
                s.skill_id === row.skill_id && s.difficulty === row.difficulty,
            );
            const required = shortage?.required ?? row.question_count;
            const available = shortage?.available ?? row.available;
            const missing = Math.max(0, required - available);
            return (
              <div
                key={`${row.skill_id}:${row.difficulty}`}
                className="grid min-w-0 gap-2 rounded-lg border p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-medium">{row.skill_name}</h3>
                  <span className="text-sm text-muted-foreground">
                    Сложность {row.difficulty} · Вес {row.weight}
                  </span>
                </div>
                <p
                  className={`text-sm ${missing ? 'text-warning' : 'text-success'}`}
                >
                  Нужно {required} · Доступно {available}
                  {missing > 0 && ` · Не хватает ${missing}`}
                </p>
                <Link
                  href={`/admin/questions?${queryString({ skill_id: row.skill_id, difficulty: row.difficulty, active: 'true', status: 'published' })}`}
                  className="flex min-h-11 items-center text-sm text-brand-text underline-offset-4 hover:underline"
                >
                  Открыть подходящие задания →
                </Link>
              </div>
            );
          })}
        </>
      )}
    </AdminPanel>
  );
};
