import type { AssessmentQuestion } from '@/entities/assessment';

import { AssessmentQuestionCard } from './AssessmentQuestionCard';

interface AssessmentQuestionsProps {
  questions: AssessmentQuestion[];
}

export const AssessmentQuestions = ({
  questions,
}: AssessmentQuestionsProps) => {
  return (
    <>
      {[...questions]
        .sort((a, b) => a.position - b.position)
        .map((question) => (
          <AssessmentQuestionCard key={question.id} question={question} />
        ))}
    </>
  );
};
