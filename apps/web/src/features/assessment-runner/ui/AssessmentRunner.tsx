import { useState } from 'react';
import Link from 'next/link';
import { CheckIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FadeIn,
} from '@/shared/ui';
import { formatDuration } from '@/shared/utils';
import type { AssessmentAttempt } from '@/entities/assessment';

import { useAssessmentNavigation, useAssessmentRunner } from '../model';
import { AssessmentAnswerReview } from './AssessmentAnswerReview';
import { AssessmentFocusWarning } from './AssessmentFocusWarning';
import { AssessmentQuestionPanel } from './AssessmentQuestionPanel';
import { AssessmentResultCard } from './AssessmentResultCard';

interface AssessmentRunnerProps {
  initialAttempt: AssessmentAttempt;
}

export const AssessmentRunner = ({ initialAttempt }: AssessmentRunnerProps) => {
  const {
    attempt,
    remaining,
    busy,
    error,
    queue,
    update,
    finish,
    locked,
    consentBlocked,
    refreshResult,
    resultLoading,
    violations,
    storageError,
    limitReached,
    forceFinish,
  } = useAssessmentRunner(initialAttempt);

  const [confirm, setConfirm] = useState(false);
  const {
    questions,
    question,
    index,
    reviewing,
    progress,
    completed,
    unanswered,
    navigate,
    reviewAnswers,
    invalidate,
  } = useAssessmentNavigation({
    questions: attempt.questions,
    queue,
    busy,
    locked,
  });

  if (attempt.result)
    return (
      <FadeIn distance={0}>
        <AssessmentResultCard result={attempt.result} />
      </FadeIn>
    );

  return (
    <>
      <AssessmentFocusWarning violations={violations} />
      {storageError && (
        <p role="alert" className="text-sm text-muted-foreground">
          {storageError}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Не переключайте вкладку и не сворачивайте окно: первый уход —
        предупреждение, второй — автоматическое завершение теста.
      </p>
      {limitReached && (
        <div role="alert" className="flex flex-col gap-3">
          <p>Повторный уход со страницы. Тест завершается автоматически.</p>
          {error && !busy && (
            <Button
              onClick={() => void forceFinish()}
              disabled={consentBlocked}
            >
              Повторить завершение
            </Button>
          )}
        </div>
      )}
      <section
        aria-label="Ход теста"
        className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-x-6 gap-y-2 tabular-nums">
            <p
              role="timer"
              aria-label="Оставшееся время"
              className="font-medium"
            >
              Осталось {formatDuration(remaining)}
            </p>
            <p className="text-sm text-muted-foreground">
              Готово: {completed} из {questions.length}
            </p>
          </div>
          {!reviewing && (
            <Button
              variant="ghost"
              className="min-h-11 text-muted-foreground"
              disabled={busy || locked}
              onClick={() => setConfirm(true)}
            >
              Завершить досрочно
            </Button>
          )}
        </div>
        <progress
          className="h-2 w-full overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
          value={completed}
          max={Math.max(1, questions.length)}
          aria-label="Завершённые задания"
        />
        <p className="text-xs text-muted-foreground">
          Задание засчитывается после перехода дальше и сохранения ответа.
        </p>
      </section>
      {error && <p role="alert">{error}</p>}
      {consentBlocked && (
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE}>Настроить согласия</Link>
        </Button>
      )}
      {locked && !consentBlocked && !limitReached && (
        <div className="flex flex-col gap-3">
          <p role="status">
            Ответы больше не принимаются. Итог рассчитывается по сохранённым
            ответам.
          </p>
          <Button
            variant="outline"
            disabled={resultLoading}
            onClick={() => void refreshResult()}
          >
            {resultLoading ? 'Получаем итог…' : 'Получить итог'}
          </Button>
        </div>
      )}
      {!reviewing && (
        <nav aria-label="Задания" className="flex flex-wrap gap-2">
          {questions.map((item, position) => (
            <Button
              key={item.id}
              className="h-11 w-14 shrink-0 px-2"
              aria-label={`Задание ${item.position}${progress[position] === 'complete' ? ', готово' : ''}`}
              variant={position === index ? 'default' : 'outline'}
              aria-current={position === index ? 'step' : undefined}
              disabled={busy}
              onClick={() => navigate(position)}
            >
              {item.position}
              {progress[position] === 'complete' && (
                <CheckIcon aria-hidden="true" className="size-3.5" />
              )}
            </Button>
          ))}
        </nav>
      )}
      {reviewing && (
        <FadeIn distance={0}>
          <AssessmentAnswerReview
            questions={questions}
            progress={progress}
            completed={completed}
            unanswered={unanswered}
            disabled={busy || locked}
            onSelect={navigate}
            onFinish={() => setConfirm(true)}
          />
        </FadeIn>
      )}
      {!reviewing && question && (
        <AssessmentQuestionPanel
          question={question}
          state={queue.get(question.id)!}
          index={index}
          questionCount={questions.length}
          busy={busy}
          locked={locked}
          onChange={(answer) => {
            invalidate(question.id);
            update(question.id, answer);
          }}
          onSave={() =>
            locked ? Promise.resolve(false) : queue.flush(question.id)
          }
          onNavigate={navigate}
          onReview={reviewAnswers}
        />
      )}
      <Dialog
        open={confirm && !locked}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>
              {reviewing ? 'Завершить тест?' : 'Завершить тест досрочно?'}
            </DialogTitle>
            <DialogDescription>
              Без ответа: {unanswered}. Перед завершением отправим все текущие
              ответы. После отправки изменить их нельзя.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Отмена
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                void finish().then((done) => {
                  if (done) setConfirm(false);
                });
              }}
            >
              {busy ? 'Отправляем…' : 'Завершить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
