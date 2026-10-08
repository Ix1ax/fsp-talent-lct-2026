import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import { Button, Card } from '@/shared/ui';
import {
  loadTemplatePreview,
  type Template,
  type TemplatePreview as PreviewData,
} from '@/entities/admin';

import {
  getPreviewResult,
  isPreviewAnswerCorrect,
  type PreviewAnswer,
} from '../lib';
import { useAdminSession } from '../model';
import { ErrorNotice } from './Common';
import { PreviewQuestionBody } from './PreviewQuestionBody';

interface TemplatePreviewProps {
  template: Template;
}
const emptyAnswer: PreviewAnswer = { selected: [], text: '' };
const hasAnswer = (answer?: PreviewAnswer) =>
  !!answer && (answer.selected.length > 0 || !!answer.text.trim());
export const TemplatePreview = ({ template }: TemplatePreviewProps) => {
  const { session } = useAdminSession();
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PreviewAnswer>>({});
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void loadTemplatePreview(session.access_token, template, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err);
      });
    return () => controller.abort();
  }, [revision, session, template]);
  const retry = () => {
    setData(null);
    setError(null);
    setRevision((v) => v + 1);
  };
  const restart = () => {
    setAnswers({});
    setIndex(0);
    setFinished(false);
    setConfirmFinish(false);
  };
  const question = data?.questions[index];
  const answer = question ? (answers[question.id] ?? emptyAnswer) : emptyAnswer;
  const answered =
    data?.questions.filter((q) => hasAnswer(answers[q.id])).length ?? 0;
  const result = data ? getPreviewResult(data.questions, answers) : null;
  const update = (next: PreviewAnswer) => {
    if (question) setAnswers((values) => ({ ...values, [question.id]: next }));
  };
  return (
    <Card className="min-w-0 gap-5 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">
        Предпросмотр теста · {template.stack_name ?? 'Без стека'} · v
        {template.version}
      </h1>
      <p className="text-sm text-muted-foreground">
        Пробное прохождение без таймера и сохранения результатов кандидата.
        Лимит настоящего теста: {template.time_limit_sec / 60} мин.
      </p>
      <ErrorNotice error={error} />
      {!!error && (
        <Button variant="outline" onClick={retry}>
          Повторить загрузку
        </Button>
      )}
      {!data && !error && <p role="status">Собираем опубликованные задания…</p>}
      {data && (
        <>
          {data.shortages.length > 0 && (
            <div
              role="status"
              className="border border-warning/30 bg-warning-soft p-3 text-sm text-warning"
            >
              Доступен неполный тест: загружено {data.questions.length} из{' '}
              {template.blueprint?.reduce(
                (sum, r) => sum + r.question_count,
                0,
              )}{' '}
              заданий.{' '}
              {data.shortages
                .map(
                  (s) =>
                    `${template.blueprint?.find((r) => r.skill_id === s.skill_id)?.skill_name ?? s.skill_id}, сложность ${s.difficulty}: ${s.available} из ${s.required}`,
                )
                .join('; ')}
              .
            </div>
          )}
          {!data.questions.length && (
            <p className="py-8 text-center text-muted-foreground">
              Нет опубликованных заданий для предпросмотра. Добавьте и
              опубликуйте задания в банке.
            </p>
          )}
          {data.questions.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  Вопрос {index + 1} из {data.questions.length}
                </span>
                <span className="text-muted-foreground">
                  Отвечено {answered} из {data.questions.length}
                </span>
              </div>
              <nav
                aria-label="Вопросы предпросмотра"
                className="flex min-h-9 flex-wrap gap-2"
              >
                {data.questions.map((q, i) => (
                  <Button
                    key={q.id}
                    size="sm"
                    className="w-14 shrink-0"
                    variant={i === index ? 'default' : 'outline'}
                    aria-label={`Вопрос ${i + 1}${hasAnswer(answers[q.id]) ? ', есть ответ' : ''}`}
                    aria-current={i === index ? 'step' : undefined}
                    onClick={() => setIndex(i)}
                  >
                    {i + 1}
                    <Check
                      className={
                        hasAnswer(answers[q.id]) ? 'size-3' : 'invisible size-3'
                      }
                    />
                  </Button>
                ))}
              </nav>
              {question && (
                <>
                  <PreviewQuestionBody
                    question={question}
                    answer={answer}
                    finished={finished}
                    onChange={update}
                  />
                  {finished && (
                    <div
                      className={`border p-3 text-sm ${isPreviewAnswerCorrect(question, answers[question.id]) ? 'border-success/30 bg-success-soft text-success' : 'border-warning/30 bg-warning-soft text-warning'}`}
                    >
                      <p className="font-medium">
                        {isPreviewAnswerCorrect(question, answers[question.id])
                          ? 'Верно'
                          : 'Неверно или нет ответа'}
                      </p>
                      <p className="mt-1">
                        Правильный ответ:{' '}
                        {question.version.grading_spec.type === 'text'
                          ? question.version.grading_spec.accepted?.join(' / ')
                          : question.version.prompt.options
                              ?.filter((o) =>
                                question.version.grading_spec.correct?.includes(
                                  o.id,
                                ),
                              )
                              .map((o) => o.text)
                              .join('; ')}
                      </p>
                    </div>
                  )}
                </>
              )}
              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => setIndex((v) => v - 1)}
                >
                  <ChevronLeft />
                  Назад
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={index >= data.questions.length - 1}
                    onClick={() => setIndex((v) => v + 1)}
                  >
                    Далее
                    <ChevronRight />
                  </Button>
                  <Button
                    disabled={finished}
                    onClick={() => {
                      if (answered < data.questions.length)
                        setConfirmFinish(true);
                      else setFinished(true);
                    }}
                  >
                    Завершить
                  </Button>
                </div>
              </div>
              {finished && result && (
                <div className="grid gap-3 border bg-muted p-4">
                  <h3 className="text-lg font-semibold">
                    Предварительный результат: {result.percent}%
                  </h3>
                  <p>
                    Правильных ответов: {result.correct} из{' '}
                    {data.questions.length}. Порог шаблона:{' '}
                    {template.pass_score}%.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Локальная проверка по ответам и весам заданий. Итог
                    настоящего прохождения рассчитывает сервер.
                    {data.shortages.length > 0 &&
                      ' Здесь оценена только доступная часть теста.'}
                  </p>
                  <Button
                    variant="outline"
                    className="justify-self-start"
                    onClick={restart}
                  >
                    <RotateCcw />
                    Пройти заново
                  </Button>
                </div>
              )}
              {confirmFinish && (
                <div className="grid gap-3 border bg-muted p-4">
                  <p>
                    Осталось без ответа: {data.questions.length - answered}.
                    Завершить предпросмотр?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        setFinished(true);
                        setConfirmFinish(false);
                      }}
                    >
                      Завершить и проверить
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmFinish(false)}
                    >
                      Продолжить отвечать
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
};
