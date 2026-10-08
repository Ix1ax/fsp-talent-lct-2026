import type { PreviewQuestion } from '@/entities/admin';

export type PreviewAnswer = { selected: string[]; text: string };
export const isPreviewAnswerCorrect = (
  question: PreviewQuestion,
  answer?: PreviewAnswer,
) => {
  if (!answer) return false;
  const grading = question.version.grading_spec;
  if (grading.type === 'choice') {
    const expected = new Set(grading.correct ?? []);
    const actual = new Set(answer.selected);
    return (
      expected.size > 0 &&
      actual.size === expected.size &&
      [...actual].every((id) => expected.has(id))
    );
  }
  const normalize = (value: string) => {
    const trimmed = value.trim();
    return grading.case_sensitive ? trimmed : trimmed.toLowerCase();
  };
  const text = normalize(answer.text);
  return (
    text.length > 0 &&
    (grading.accepted ?? []).some((value) => normalize(value) === text)
  );
};
export const getPreviewResult = (
  questions: PreviewQuestion[],
  answers: Record<string, PreviewAnswer>,
) => {
  const correct = questions.filter((q) =>
    isPreviewAnswerCorrect(q, answers[q.id]),
  );
  const totalWeight = questions.reduce((sum, q) => sum + q.weight, 0);
  const earnedWeight = correct.reduce((sum, q) => sum + q.weight, 0);
  return {
    correct: correct.length,
    percent:
      totalWeight > 0
        ? Math.round((earnedWeight / totalWeight) * 10000) / 100
        : 0,
  };
};
