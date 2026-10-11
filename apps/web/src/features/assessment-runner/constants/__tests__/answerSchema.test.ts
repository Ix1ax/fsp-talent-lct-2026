import { describe, expect, it } from 'vitest';

import type { AssessmentQuestion } from '@/entities/assessment';

import { createAnswerSchema } from '../answerSchema';

const question: AssessmentQuestion = {
  id: 'q',
  position: 1,
  multiple: false,
  skillId: 'skill',
  difficulty: 1,
  answer: null,
  prompt: {
    text: 'Prompt',
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
  },
};

describe('answer validation', () => {
  it('rejects unknown options and multiple choices on single choice questions', () => {
    const schema = createAnswerSchema(question);
    expect(schema.safeParse({ selected: ['unknown'], text: '' }).success).toBe(
      false,
    );
    expect(schema.safeParse({ selected: ['a', 'b'], text: '' }).success).toBe(
      false,
    );
    expect(schema.safeParse({ selected: ['a'], text: '' }).success).toBe(true);
  });
  it('allows multiple choices and enforces text length', () => {
    const schema = createAnswerSchema({ ...question, multiple: true });
    expect(schema.safeParse({ selected: ['a', 'b'], text: '' }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ selected: [], text: 'a'.repeat(501) }).success,
    ).toBe(false);
  });
});
