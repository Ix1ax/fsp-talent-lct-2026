import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button, PageTransition } from '@/shared/ui';
import { AdminApiError, type Template } from '@/entities/admin';

import { useServerPreview } from '../model/useServerPreview';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { AdminPanel } from './AdminPanel';
import { ErrorNotice } from './Common';
import { PreviewQuestionBody } from './PreviewQuestionBody';
import { PreviewResultSummary } from './PreviewResultSummary';

interface TemplatePreviewProps {
  template: Template;
}
export const TemplatePreview = ({ template }: TemplatePreviewProps) => {
  const state = useServerPreview(template.id);
  const [index, setIndex] = useState(0);
  const [confirmation, setConfirmation] = useState<'submit' | 'delete' | null>(
    null,
  );
  const { data, error, busy } = state;
  const question = data?.questions[index];
  const dirty = !!question && state.dirty.some((q) => q.id === question.id);
  const closed =
    !!data && (data.status !== 'in_progress' || state.seconds === 0);
  const answered = data?.questions.filter((q) => q.answer !== null).length ?? 0;
  const missing =
    error instanceof AdminApiError && error.code === 'preview_not_found';
  return (
    <AdminPanel>
      <h1 className="text-2xl font-semibold wrap-anywhere">
        Предпросмотр теста · {template.stack_name ?? 'Без стека'} · v
        {data?.template_version ?? template.version}
      </h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        Пробное прохождение с серверной проверкой. Ответы сохраняются после
        нажатия «Сохранить ответ». Результаты кандидатов не затрагиваются.
      </p>
      <ErrorNotice error={error} />
      {error instanceof AdminApiError && error.shortages.length > 0 && (
        <ul className="grid gap-2 text-sm">
          {error.shortages.map((s) => (
            <li key={`${s.skill_id}-${s.difficulty}`}>
              {template.blueprint?.find((r) => r.skill_id === s.skill_id)
                ?.skill_name ?? s.skill_id}
              , сложность {s.difficulty}: доступно {s.available}, нужно{' '}
              {s.required}.{' '}
              <Link
                className="underline"
                href={`/admin/questions?skill_id=${s.skill_id}&difficulty=${s.difficulty}`}
              >
                Открыть банк заданий
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!data && (
        <div className="grid justify-items-start gap-3">
          <p className="text-sm">
            Лимит: {template.time_limit_sec / 60} мин. После запуска таймер идёт
            даже при закрытой странице.
          </p>
          <Button
            disabled={busy}
            onClick={() => {
              if (missing) state.forgetMissing();
              void state.start();
            }}
          >
            {busy
              ? 'Загружаем…'
              : error && !missing
                ? 'Повторить запрос'
                : 'Начать пробное прохождение'}
          </Button>
        </div>
      )}
      {data && (
        <>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>
              Вопрос {index + 1} из {data.questions.length} · Сохранено{' '}
              {answered}
            </span>
            <span role="timer">
              {data.status === 'in_progress'
                ? `Осталось ${Math.floor(state.seconds / 60)}:${String(state.seconds % 60).padStart(2, '0')}`
                : 'Прохождение завершено'}
            </span>
          </div>
          <nav
            aria-label="Вопросы предпросмотра"
            className="flex flex-wrap gap-2"
          >
            {data.questions.map((q, i) => (
              <Button
                key={q.id}
                size="sm"
                className="w-14 shrink-0"
                variant={i === index ? 'default' : 'outline'}
                aria-label={`Вопрос ${i + 1}${q.answer ? ', сохранён ответ' : ''}`}
                aria-current={i === index ? 'step' : undefined}
                disabled={busy}
                onClick={() => setIndex(i)}
              >
                {i + 1}
                <Check className={q.answer ? 'size-3' : 'invisible size-3'} />
              </Button>
            ))}
          </nav>
          {question && (
            <>
              <PageTransition
                transitionKey={question.id}
                distance={0}
                className="min-w-0"
              >
                <PreviewQuestionBody
                  question={question}
                  answer={state.drafts[question.id] ?? question.answer ?? {}}
                  finished={closed || busy}
                  onChange={(answer) => state.update(question.id, answer)}
                />
              </PageTransition>
              {!closed && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={busy || !dirty}
                    onClick={() => void state.save(question.id)}
                  >
                    Сохранить ответ
                  </Button>
                  {dirty && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => state.discard(question.id)}
                    >
                      Отменить изменения
                    </Button>
                  )}
                  <span role="status" className="text-sm text-muted-foreground">
                    {dirty
                      ? 'Изменения не сохранены'
                      : question.answer
                        ? 'Ответ сохранён'
                        : 'Можно пропустить вопрос'}
                  </span>
                </div>
              )}
            </>
          )}
          <PreviewResultSummary preview={data} questionId={question?.id} />
          <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                variant="outline"
                className="h-11"
                disabled={busy || index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ChevronLeft />
                Назад
              </Button>
              <Button
                variant="outline"
                className="h-11"
                disabled={busy || index >= data.questions.length - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                Далее
                <ChevronRight />
              </Button>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void state.refresh()}
              >
                Обновить состояние
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmation('delete')}
              >
                Удалить предпросмотр
              </Button>
              {data.status === 'in_progress' && (
                <Button
                  disabled={busy || state.dirty.length > 0}
                  onClick={() => setConfirmation('submit')}
                >
                  Завершить тест
                </Button>
              )}
            </div>
          </div>
          {state.dirty.length > 0 && !closed && (
            <p className="text-sm text-muted-foreground">
              Перед завершением сохраните или отмените изменения (
              {state.dirty.length}). При истечении времени учитываются только
              сохранённые ответы.
            </p>
          )}
          {confirmation && (
            <AdminConfirmDialog
              title={
                confirmation === 'delete'
                  ? 'Удалить предпросмотр?'
                  : 'Завершить тест?'
              }
              description={
                confirmation === 'delete'
                  ? 'Это пробное прохождение и его ответы будут удалены. После удаления можно начать новое.'
                  : `Без сохранённого ответа: ${data.questions.length - answered}. После завершения изменить ответы нельзя.`
              }
              busy={busy}
              error={error}
              destructive={confirmation === 'delete'}
              onClose={() => setConfirmation(null)}
              onConfirm={async () => {
                const done =
                  confirmation === 'delete'
                    ? await state.remove()
                    : await state.submit();
                if (done) {
                  if (confirmation === 'delete') setIndex(0);
                  setConfirmation(null);
                }
              }}
            />
          )}
        </>
      )}
    </AdminPanel>
  );
};
