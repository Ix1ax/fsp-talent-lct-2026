import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import type { AssessmentQuestion } from '@/entities/assessment';

interface AssessmentQuestionCardProps {
  question: AssessmentQuestion;
}

export const AssessmentQuestionCard = ({
  question,
}: AssessmentQuestionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Задание {question.position}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
          {question.prompt.text}
        </p>
        {question.prompt.code && (
          <pre
            tabIndex={0}
            aria-label="Код задания"
            className="mt-3 overflow-x-auto rounded bg-muted p-3"
          >
            <code>{question.prompt.code}</code>
          </pre>
        )}
      </CardContent>
    </Card>
  );
};
