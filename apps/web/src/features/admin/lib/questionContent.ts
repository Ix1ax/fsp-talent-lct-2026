import type { QuestionFormValues } from '../model';

export const questionContent = (v: QuestionFormValues) => {
  const prompt: {
    text: string;
    code?: string;
    language?: string;
    options?: { id: string; text: string }[];
  } = { text: v.text };
  if (v.kind === 'code_reading') {
    prompt.code = v.code.trim();
    if (v.language.trim()) prompt.language = v.language.trim();
  }
  if (v.grading === 'choice') {
    prompt.options = v.options.map(({ id, text }) => ({
      id,
      text: text.trim(),
    }));
    return {
      prompt,
      grading_spec: {
        type: 'choice' as const,
        correct: v.options.filter((o) => o.correct).map((o) => o.id),
        multiple: v.multiple,
      },
    };
  }
  return {
    prompt,
    grading_spec: {
      type: 'text' as const,
      accepted: v.accepted
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      case_sensitive: v.case_sensitive,
    },
  };
};
