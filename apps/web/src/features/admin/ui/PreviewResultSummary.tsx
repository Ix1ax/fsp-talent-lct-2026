import type { Preview } from '@/entities/admin';

interface PreviewResultSummaryProps {
  preview: Preview;
  questionId?: string;
}
export const PreviewResultSummary = ({
  preview,
  questionId,
}: PreviewResultSummaryProps) => {
  const result = preview.result;
  if (!result) return null;
  const review = result.questions.find((q) => q.id === questionId);
  const question = preview.questions.find((q) => q.id === questionId);
  const correct = review?.correct_answer;
  const answer =
    correct?.type === 'text'
      ? correct.accepted?.join(' / ')
      : question?.prompt.options
          ?.filter((o) => correct?.correct?.includes(o.id))
          .map((o) => o.text)
          .join('; ');
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border bg-muted p-4 wrap-anywhere">
      <h2 className="text-lg font-semibold">
        Результат: {result.score_percent}% ·{' '}
        {result.passed ? 'Тест пройден' : 'Тест не пройден'}
      </h2>
      <p className="text-sm">
        {preview.status === 'expired' ? 'Время вышло. ' : ''}Правильных ответов:{' '}
        {result.correct_count} из {result.question_count}. Без ответа:{' '}
        {result.unanswered_count}. Порог: {result.pass_score}%.
      </p>
      <ul className="grid gap-1 text-sm">
        {result.skills.map((skill) => (
          <li key={skill.skill_id}>
            {preview.questions.find((q) => q.skill_id === skill.skill_id)
              ?.skill_name ?? skill.skill_id}
            : {skill.percent}%
          </li>
        ))}
      </ul>
      {review && (
        <div className="border-t pt-3 text-sm">
          <p className="font-medium">
            Текущий вопрос:{' '}
            {review.correct
              ? 'верно'
              : review.answered
                ? 'неверно'
                : 'без ответа'}
          </p>
          <p>Правильный ответ: {answer}</p>
        </div>
      )}
    </div>
  );
};
