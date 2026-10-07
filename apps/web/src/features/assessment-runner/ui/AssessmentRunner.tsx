import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { formatDuration } from '@/shared/utils';
import type { AssessmentAttempt } from '@/entities/assessment';

import { useAssessmentRunner } from '../model';
import { QuestionAnswerForm } from './QuestionAnswerForm';

interface AssessmentRunnerProps {
  initialAttempt: AssessmentAttempt;
}

export const AssessmentRunner = ({ initialAttempt }: AssessmentRunnerProps) => {
  const { attempt, remaining, busy, error, queue, update, finish } =
    useAssessmentRunner(initialAttempt);

  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);

  const questions = [...attempt.questions].sort(
    (a, b) => a.position - b.position,
  );
  const question = questions[index];
  const answered = questions.filter((item) => {
    const saved = queue.get(item.id)?.saved;
    return !!(saved?.selected?.length || saved?.text?.trim());
  }).length;

  const navigate = (next: number) => {
    if (question) void queue.flush(question.id);
    setIndex(next);
  };

  if (attempt.result)
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          {attempt.result.passed ? 'Тест пройден' : 'Тест не пройден'}
        </h2>
        <p>
          Результат: {attempt.result.scorePercent}%. Проходной балл:{' '}
          {attempt.result.passScore}%.
        </p>
      </section>
    );

  return (
    <>
      <div className="flex flex-wrap justify-between gap-3">
        <p role="timer" aria-label="Оставшееся время">
          Осталось {formatDuration(remaining)}
        </p>
        <p>
          Сохранено ответов: {answered} из {questions.length}
        </p>
      </div>
      <progress
        className="h-2 w-full"
        value={answered}
        max={Math.max(1, questions.length)}
        aria-label="Прогресс ответов"
      />
      {error && <p role="alert">{error}</p>}
      <nav aria-label="Задания" className="flex flex-wrap gap-2">
        {questions.map((item, position) => (
          <Button
            key={item.id}
            variant={position === index ? 'default' : 'outline'}
            aria-current={position === index ? 'step' : undefined}
            disabled={busy}
            onClick={() => navigate(position)}
          >
            {item.position}
          </Button>
        ))}
      </nav>
      {question && (
        <Card>
          <CardHeader>
            <CardTitle>Задание {question.position}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-col gap-5">
            <p className="whitespace-pre-wrap wrap-anywhere">
              {question.prompt.text}
            </p>
            {question.prompt.code && (
              <pre className="overflow-x-auto rounded bg-muted p-3">
                <code>{question.prompt.code}</code>
              </pre>
            )}
            <QuestionAnswerForm
              key={question.id}
              question={question}
              state={queue.get(question.id)!}
              disabled={busy || remaining === 0}
              onChange={(answer) => update(question.id, answer)}
              onSave={() => queue.flush(question.id)}
            />
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        <Button
          variant="outline"
          disabled={index === 0 || busy}
          onClick={() => navigate(index - 1)}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          disabled={index >= questions.length - 1 || busy}
          onClick={() => navigate(index + 1)}
        >
          Далее
        </Button>
      </div>
      <Button
        disabled={busy || remaining === 0}
        onClick={() => setConfirm(true)}
      >
        Завершить тест
      </Button>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Завершить тест?</DialogTitle>
            <DialogDescription>
              Без сохранённого ответа: {questions.length - answered}. Перед
              завершением отправим все текущие ответы. После отправки изменить
              их нельзя.
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
