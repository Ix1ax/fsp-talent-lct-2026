import { useState } from 'react';
import Link from 'next/link';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui';
import {
  AdminApiError,
  adminRequest,
  adminSchemas,
  queryString,
} from '@/entities/admin';
import {
  ErrorNotice,
  Status,
  TemplateEditor,
  useAdminMutation,
  useAdminQuery,
  useAdminSession,
} from '@/features/admin';

interface TemplateDetailsProps {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}
export const TemplateDetails = ({
  id,
  onClose,
  onSaved,
}: TemplateDetailsProps) => {
  const { session } = useAdminSession();
  const detail = useAdminQuery(
    `/assessments/templates/${id}`,
    adminSchemas.template,
  );
  const refresh = () => {
    detail.reload();
    onSaved();
  };
  const mutation = useAdminMutation(refresh);
  const [copying, setCopying] = useState(false);
  const [confirm, setConfirm] = useState<'publish' | 'archive' | null>(null);
  const template = detail.data;
  if (copying && template)
    return (
      <TemplateEditor
        template={template}
        onClose={() => setCopying(false)}
        onSaved={refresh}
      />
    );
  const shortages =
    mutation.error instanceof AdminApiError ? mutation.error.shortages : [];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        showCloseButton={!mutation.busy}
      >
        <DialogTitle>
          Состав теста{template && ` · v${template.version}`}
        </DialogTitle>
        <DialogDescription>
          {template?.stack_name ?? 'Шаблон теста'}
        </DialogDescription>
        <ErrorNotice error={detail.error} />
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={mutation.busy}
                onClick={() => setCopying(true)}
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
                  variant="destructive"
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
              <div className="grid gap-3 border bg-muted p-4">
                <p className="text-sm">
                  {confirm === 'publish'
                    ? 'Опубликовать шаблон? Предыдущий опубликованный шаблон этого стека, специализации и грейда будет архивирован.'
                    : 'Архивировать шаблон? Восстановление не предусмотрено, предыдущая версия не опубликуется автоматически.'}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={mutation.busy}
                    onClick={() =>
                      void mutation.run(async () => {
                        await adminRequest(
                          session!.access_token,
                          `/assessments/templates/${id}/${confirm}`,
                          adminSchemas.template,
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
            {template.blueprint?.map((row) => {
              const shortage = shortages.find(
                (s) =>
                  s.skill_id === row.skill_id &&
                  s.difficulty === row.difficulty,
              );
              const required = shortage?.required ?? row.question_count;
              const available = shortage?.available ?? row.available;
              const missing = Math.max(0, required - available);
              return (
                <div
                  key={`${row.skill_id}:${row.difficulty}`}
                  className="grid gap-2 border p-4"
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
                    className="text-sm text-brand-text"
                  >
                    Открыть подходящие задания →
                  </Link>
                </div>
              );
            })}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
