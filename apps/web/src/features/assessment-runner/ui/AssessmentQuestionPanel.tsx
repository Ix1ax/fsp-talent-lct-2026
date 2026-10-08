import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageTransition,
} from '@/shared/ui';
import type {
  AssessmentAnswer,
  AssessmentQuestion,
} from '@/entities/assessment';

import type { AnswerState } from '../model';
import { QuestionAnswerForm } from './QuestionAnswerForm';

interface AssessmentQuestionPanelProps {
  question: AssessmentQuestion;
  state: AnswerState;
  index: number;
  questionCount: number;
  busy: boolean;
  locked: boolean;
  onChange: (answer: AssessmentAnswer) => void;
  onSave: () => Promise<boolean>;
  onNavigate: (index: number) => void;
  onReview: () => void;
}

export const AssessmentQuestionPanel = ({
  question,
  state,
  index,
  questionCount,
  busy,
  locked,
  onChange,
  onSave,
  onNavigate,
  onReview,
}: AssessmentQuestionPanelProps) => (
  <PageTransition transitionKey={question.id} distance={0} className="min-w-0">
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          Задание {question.position} из {questionCount}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <p className="whitespace-pre-wrap wrap-anywhere">
          {question.prompt.text}
        </p>
        {question.prompt.code && (
          <pre
            tabIndex={0}
            aria-label="Код задания"
            className="max-w-full overflow-x-auto rounded bg-muted p-3 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <code>{question.prompt.code}</code>
          </pre>
        )}
        <QuestionAnswerForm
          key={question.id}
          question={question}
          state={state}
          disabled={busy || locked}
          onChange={onChange}
          onSave={onSave}
        />
        <div className="grid grid-cols-2 gap-3 border-t pt-5 sm:flex sm:justify-between">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={index === 0 || busy}
            onClick={() => onNavigate(index - 1)}
          >
            <ArrowLeftIcon aria-hidden="true" />
            Назад
          </Button>
          {index < questionCount - 1 ? (
            <Button
              className="min-h-11"
              disabled={busy}
              onClick={() => onNavigate(index + 1)}
            >
              Далее
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          ) : (
            <Button
              className="h-auto min-h-11 whitespace-normal"
              disabled={busy || locked}
              onClick={onReview}
            >
              Проверить ответы
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  </PageTransition>
);
