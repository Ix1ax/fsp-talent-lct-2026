import { ChevronRightIcon } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import type { AssessmentQuestion } from '@/entities/assessment';

import type { QuestionProgress } from '../model';

interface AssessmentAnswerReviewProps {
  questions: AssessmentQuestion[];
  progress: QuestionProgress[];
  completed: number;
  unanswered: number;
  disabled: boolean;
  onSelect: (index: number) => void;
  onFinish: () => void;
}

const STATUS_LABELS: Record<QuestionProgress, string> = {
  complete: 'Готово',
  empty: 'Без ответа',
  draft: 'Ответ выбран',
  pending: 'Не сохранён',
  saving: 'Сохраняется…',
};

export const AssessmentAnswerReview = ({
  questions,
  progress,
  completed,
  unanswered,
  disabled,
  onSelect,
  onFinish,
}: AssessmentAnswerReviewProps) => (
  <Card className="min-w-0">
    <CardHeader>
      <CardTitle>Проверьте ответы</CardTitle>
      <p className="text-sm text-muted-foreground">
        Готово: {completed} из {questions.length}. Без ответа: {unanswered}.
        Можно вернуться к любому заданию. После завершения ответы изменить
        нельзя.
      </p>
    </CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-5">
      <ul className="divide-y divide-border">
        {questions.map((question, index) => (
          <li key={question.id}>
            <Button
              variant="ghost"
              className="grid h-auto min-h-12 w-full min-w-0 grid-cols-[minmax(0,1fr)_16px] gap-3 px-2 py-3 text-left whitespace-normal"
              disabled={disabled}
              onClick={() => onSelect(index)}
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span>Задание {question.position}</span>
                <Badge
                  variant={
                    progress[index] === 'complete' ? 'success' : 'outline'
                  }
                >
                  {STATUS_LABELS[progress[index]]}
                </Badge>
              </span>
              <ChevronRightIcon aria-hidden="true" className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        className="min-h-11 self-end"
        disabled={disabled}
        onClick={onFinish}
      >
        Завершить тест
      </Button>
    </CardContent>
  </Card>
);
