import { describe, expect, it } from 'vitest';

import type { PreviewQuestion } from '@/entities/admin';

import { getPreviewResult, isPreviewAnswerCorrect } from '../previewResult';

const question: PreviewQuestion = {
  id: 'one',
  skillName: 'TypeScript',
  difficulty: 1,
  weight: 1,
  version: {
    version: 1,
    status: 'published',
    created_at: '',
    published_at: '',
    prompt: { text: 'Question' },
    grading_spec: { type: 'choice', correct: ['a', 'b'], multiple: true },
  },
};
describe('admin preview answers', () => {
  it('requires the exact choice set, regardless of order', () => {
    expect(
      isPreviewAnswerCorrect(question, { selected: ['b', 'a'], text: '' }),
    ).toBe(true);
    expect(
      isPreviewAnswerCorrect(question, { selected: ['a'], text: '' }),
    ).toBe(false);
    expect(
      isPreviewAnswerCorrect(question, { selected: ['a', 'b', 'c'], text: '' }),
    ).toBe(false);
    expect(isPreviewAnswerCorrect(question)).toBe(false);
  });
  it('trims text and respects case sensitivity and accepted alternatives', () => {
    const textQuestion = {
      ...question,
      version: {
        ...question.version,
        grading_spec: { type: 'text' as const, accepted: ['const', 'let'] },
      },
    };
    expect(
      isPreviewAnswerCorrect(textQuestion, { text: ' CONST ', selected: [] }),
    ).toBe(true);
    expect(
      isPreviewAnswerCorrect(
        {
          ...textQuestion,
          version: {
            ...textQuestion.version,
            grading_spec: {
              ...textQuestion.version.grading_spec,
              case_sensitive: true,
            },
          },
        },
        { text: 'CONST', selected: [] },
      ),
    ).toBe(false);
    expect(
      isPreviewAnswerCorrect(textQuestion, { text: '   ', selected: [] }),
    ).toBe(false);
  });
  it('weights the local estimate and counts unanswered questions as incorrect', () => {
    const questions = [question, { ...question, id: 'two', weight: 3 }];
    expect(
      getPreviewResult(questions, { one: { selected: ['a', 'b'], text: '' } }),
    ).toEqual({ correct: 1, percent: 25 });
    expect(getPreviewResult([], {})).toEqual({ correct: 0, percent: 0 });
  });
});
